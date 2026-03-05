# ENS Batch Resolution API - Technical Specification

**Version:** 2.0 (Complete Rewrite)  
**Date:** February 17, 2026  
**Status:** Production  
**Partners:** Agent Trust Vector (ATV) × Buzz BD Agent (SolCex)

---

## Overview

Resolve Ethereum addresses to ENS names and social profiles in batches of up to 100 addresses.

**Endpoint:** `GET /api/ens/batch-resolve`  
**Base URL:** `https://api.web3identity.com`  
**Performance:** Sub-second for cached data, typically under 2 seconds for cold lookups  
**Pricing:** 100 addresses/day free, $0.01 per batch after  

---

## API Reference

### Request

**Method:** GET only  
**Path:** `/api/ens/batch-resolve`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `addresses` | string | Yes | Comma-separated Ethereum addresses (1-100) |
| `include` | string | No | Fields to resolve: `name,avatar,twitter,github,discord,email,url` |

**Example:**
```
GET /api/ens/batch-resolve?addresses=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045,0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5
```

**With include parameter:**
```
GET /api/ens/batch-resolve?addresses=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&include=name,twitter,github
```

### `include` Parameter Behavior

**CRITICAL:** The `include` parameter controls what data is resolved:

- **`name`** - Required for ENS reverse lookup. Without this, `ens` will be `null`.
- **`avatar`** - Includes avatar URL in response
- **`twitter`** - Includes Twitter handle in `social` object
- **`github`** - Includes GitHub username in `social` object
- **`discord`** - Includes Discord handle in `social` object
- **`email`** - Includes email in `social` object (rarely set)
- **`url`** - Includes website URL in `social` object

**Default (if omitted):** `name,avatar,twitter,github,discord`

**Examples:**
```bash
# Just ENS name, no social data
?include=name

# ENS name + Twitter only
?include=name,twitter

# Full profile (same as default)
?include=name,avatar,twitter,github,discord
```

**Important:** If you omit `name`, the API will NOT perform reverse lookup and will return `ens: null` even if the address has an ENS name.

---

## Response Format

### Success Response (HTTP 200)

```json
{
  "addresses": [
    {
      "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      "ens": "vitalik.eth",
      "social": {
        "twitter": "VitalikButerin",
        "github": "vbuterin"
      },
      "avatar": "https://euc.li/vitalik.eth"
    },
    {
      "address": "0xb8c2c29ee19d8307cb7255e1cd9cbde883a267d5",
      "ens": "nick.eth",
      "social": {
        "twitter": "nicksdjohnson",
        "github": "arachnid",
        "discord": "nickjohnson#0001"
      },
      "avatar": "eip155:1/erc1155:0x495f947276749ce646f68ac8c248420045cb7b5e/8112316025873927737505937898915153732580103913704334048512380490797008551937"
    }
  ],
  "metadata": {
    "total": 2,
    "resolved": 2,
    "failed": 0,
    "noEns": 0,
    "cacheHits": 8,
    "cacheMisses": 2,
    "cacheHitRate": "80.0%",
    "processingTimeMs": 234,
    "phase": 2,
    "usage": {
      "tier": "free",
      "addressesUsed": 2,
      "totalToday": 15,
      "limit": 100,
      "remaining": 85,
      "resetsAt": "2026-02-18T00:00:00.000Z"
    }
  }
}
```

### Address Object Fields

| Field | Type | Always Present? | Description |
|-------|------|-----------------|-------------|
| `address` | string | Yes | Ethereum address (lowercase) |
| `ens` | string \| null | Yes | ENS name (null if no ENS or `name` not in include) |
| `social` | object | Yes | Social profiles (empty object if none) |
| `avatar` | string | No | Avatar URL (only if ENS exists AND `avatar` in include) |
| `error` | string | No | Error message (only if resolution failed) |

### Social Object

Contains only the fields requested via `include` parameter:

```json
{
  "twitter": "VitalikButerin",    // If include=twitter or default
  "github": "vbuterin",            // If include=github or default
  "discord": "vitalik#1234",       // If include=discord or default
  "email": "v@ethereum.org",       // If include=email (rarely set)
  "url": "https://vitalik.ca"      // If include=url (rarely set)
}
```

### Metadata Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total addresses in request |
| `resolved` | number | Addresses with ENS names found |
| `failed` | number | Addresses that failed to resolve |
| `noEns` | number | Valid addresses with no ENS |
| `cacheHits` | number | Lookups served from cache |
| `cacheMisses` | number | Lookups fetched from RPC |
| `cacheHitRate` | string | Cache efficiency percentage |
| `processingTimeMs` | number | Total processing time |
| `phase` | number | Implementation phase (always 2) |
| `usage` | object | Free tier usage information |
| `recommendation` | string | Performance tip (if batch > 50) |
| `warning` | string | Performance warning (if time > 10s) |

### Usage Object

| Field | Type | Description |
|-------|------|-------------|
| `tier` | string | `"free"` or `"paid"` |
| `addressesUsed` | number | Addresses consumed in this request |
| `totalToday` | number | Total addresses used today |
| `limit` | number | Daily limit (100 for free tier) |
| `remaining` | number | Addresses remaining today |
| `resetsAt` | string | ISO timestamp of next reset (00:00 UTC) |

---

## Error Responses

All errors return HTTP status code + JSON body with:

```json
{
  "error": true,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": "2026-02-17T12:34:56.789Z"
}
```

### Common Errors

| HTTP | Code | Example Message | Fix |
|------|------|-----------------|-----|
| 400 | `ERROR` | "Query parameter 'addresses' is required" | Add addresses parameter |
| 400 | `ERROR` | "Invalid Ethereum addresses: 0xinvalid" | Use valid 0x addresses |
| 400 | `ERROR` | "Maximum 100 addresses allowed per request. Requested: 150" | Reduce batch size |
| 402 | `PAYMENT_REQUIRED` | "Free tier limit exceeded..." | Use x402 payment |
| 429 | `RATE_LIMITED` | "Rate limit exceeded" | Slow down requests |
| 404 | `NOT_FOUND` | "Endpoint not found" | Check URL |
| 503 | `SERVICE_UNAVAILABLE` | "Upstream service unavailable" | Retry later |

**Note:** Most validation errors return generic `ERROR` code for security. Only specific codes like `PAYMENT_REQUIRED`, `RATE_LIMITED`, `NOT_FOUND` are returned as-is.

---

## Free Tier Limits

**Daily Quota:** 100 addresses per day (not requests - total addresses resolved)  
**Rate Limit:** 10 requests per minute  
**Resets:** Daily at 00:00 UTC  

### Understanding the Counting System

**IMPORTANT:** Free tier quota and payment use different counting:

| Metric | Free Tier Quota | Payment |
|--------|----------------|---------|
| **Counts** | Total addresses resolved | HTTP requests (batches) |
| **Limit** | 100 addresses/day | No limit (pay per request) |
| **Price** | Free | $0.01 per request |

**Examples:**

**Scenario A:** 10 requests × 10 addresses each
- **Requests:** 10 HTTP calls
- **Addresses used:** 100 total
- **Free tier:** Uses entire daily quota (100 addresses)
- **Cost:** $0.00 (all covered by free tier)

**Scenario B:** 20 requests × 10 addresses each
- **Requests:** 20 HTTP calls
- **Addresses used:** 200 total
- **Free tier:** Covers first 100 addresses (~first 10 requests)
- **Cost:** Remaining 10 requests × $0.01 = $0.10

**Scenario C:** 2 requests × 50 addresses each
- **Requests:** 2 HTTP calls
- **Addresses used:** 100 total
- **Free tier:** Uses entire daily quota
- **Cost:** $0.00

**Scenario D:** 30 requests × 50 addresses each
- **Requests:** 30 HTTP calls
- **Addresses used:** 1,500 total
- **Free tier:** Covers first 100 addresses (~first 2 requests)
- **Cost:** Remaining 28 requests × $0.01 = $0.28

**Key Insight:** Large batches are more cost-efficient because payment is per-request, not per-address.

### When Free Tier Exceeded (HTTP 402)

```json
{
  "error": true,
  "code": "PAYMENT_REQUIRED",
  "message": "Free tier limit exceeded. You have 7 addresses remaining today (93/100 used). This request requires 100 addresses.",
  "freeTier": {
    "limit": 100,
    "used": 93,
    "remaining": 7,
    "period": "day",
    "resetsAt": "2026-02-18T00:00:00.000Z"
  },
  "payment": {
    "required": true,
    "price": "$0.01",
    "pricePerBatch": "$0.01",
    "method": "x402",
    "scheme": "exact",
    "network": "eip155:8453",
    "asset": "USDC",
    "payTo": "0xF499102c8707c6501CaAdD2028c6DF1c6C6E813b",
    "facilitator": "https://api.cdp.coinbase.com/platform/v2/x402"
  },
  "timestamp": "2026-02-17T14:36:39.765Z"
}
```

**Payment Details:**
- **Price:** $0.01 USD per batch (flat fee, any batch size)
- **Method:** x402 payment via CDP facilitator
- **Network:** Base (Chain ID 8453)
- **Token:** USDC on Base
- **Flow:** CDP facilitator handles payment - see their documentation

---

## Integration Guide

### Basic JavaScript Example

```javascript
import axios from 'axios';

const API_BASE = 'https://api.web3identity.com';

async function resolveAddresses(addresses) {
  try {
    const response = await axios.get(`${API_BASE}/api/ens/batch-resolve`, {
      params: {
        addresses: addresses.join(','),
        // Using defaults: name,avatar,twitter,github,discord
      },
      timeout: 10000
    });

    // Parse results
    const results = {};
    for (const item of response.data.addresses) {
      results[item.address] = {
        ensName: item.ens,
        twitter: item.social?.twitter || null,
        github: item.social?.github || null,
        discord: item.social?.discord || null,
        avatar: item.avatar  // undefined if not present, which is fine
      };
    }

    return results;

  } catch (error) {
    if (error.response?.status === 402) {
      console.log('Payment required:', error.response.data.payment);
      // Handle x402 payment flow via CDP facilitator
    }
    throw error;
  }
}

// Usage
const deployers = [
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5'
];

const identities = await resolveAddresses(deployers);
console.log(identities);
```

### Custom Fields Example

```javascript
// Only resolve ENS names + Twitter (faster, smaller response)
const response = await axios.get(`${API_BASE}/api/ens/batch-resolve`, {
  params: {
    addresses: addresses.join(','),
    include: 'name,twitter'  // Minimal set
  }
});
```

### Error Handling

```javascript
async function safeResolve(addresses) {
  try {
    return await resolveAddresses(addresses);
  } catch (error) {
    if (error.response?.status === 402) {
      // Free tier exhausted - decide: wait or pay
      const resetTime = error.response.data.freeTier?.resetsAt;
      console.log('Free tier exhausted. Resets at:', resetTime);
      return null;
    }
    
    if (error.response?.status === 429) {
      // Rate limited - wait and retry
      await new Promise(resolve => setTimeout(resolve, 60000));
      return await resolveAddresses(addresses);
    }
    
    // Other errors - log and continue
    console.error('Resolution failed:', error.message);
    return null;
  }
}
```

---

## Performance Guidelines

### Batch Sizes

| Size | Use Case | Expected Latency | Recommendation |
|------|----------|------------------|----------------|
| 1-20 | Real-time | 50-300ms | ✅ Optimal for user-facing |
| 21-50 | Background | 300-800ms | ✅ Good balance |
| 51-100 | Bulk | 800-2000ms | ⚠️ May be slow, API may add `recommendation` field |

**Performance Warning:** Batches over 50 addresses receive a `metadata.recommendation` field suggesting smaller batches.

### Caching

- **Cache TTL:** 15 minutes
- **Cache hit rate:** Typically 60-90% for repeat addresses
- **Performance impact:** Cached lookups are ~50x faster

**Tip:** If checking same addresses repeatedly, cache hit rate will be high and latency will drop to <50ms.

---

## Buzz Integration Example

For Buzz BD Agent's token deployer scoring:

```javascript
async function enrichTokenDeployers(deployerAddresses) {
  // Use minimal fields for speed
  const response = await axios.get(
    'https://api.web3identity.com/api/ens/batch-resolve',
    {
      params: {
        addresses: deployerAddresses.join(','),
        include: 'name,twitter,github'  // Just what we need
      }
    }
  );

  // Calculate identity bonus for scoring
  let identityBonus = 0;
  
  for (const item of response.data.addresses) {
    if (item.ens && (item.social?.twitter || item.social?.github)) {
      // Verified identity: ENS + social proof
      identityBonus += 5;
    } else if (item.ens) {
      // ENS holder (no social verification)
      identityBonus += 3;
    }
    // No ENS: 0 points
  }
  
  return identityBonus;
}
```

**Buzz's Economics:**
- Baseline: 20-30 calls/day × 10-50 addresses = 200-1,500 addresses/day
- Free tier: 100 addresses/day (covers ~2-10 requests depending on batch size)
- Cost after free tier: $0.10-$0.28/day ($3.00-$8.40/month)

---

## Testing

### Test Addresses

```javascript
const TEST_ADDRESSES = {
  vitalik: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',  // vitalik.eth
  nick: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5',     // nick.eth
  none: '0x0000000000000000000000000000000000000000'      // No ENS
};
```

### Validation Script

```bash
# Test basic resolution
curl "https://api.web3identity.com/api/ens/batch-resolve?addresses=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

# Test include parameter
curl "https://api.web3identity.com/api/ens/batch-resolve?addresses=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&include=name,twitter"

# Test batch
curl "https://api.web3identity.com/api/ens/batch-resolve?addresses=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045,0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5"
```

---

## Service Details & Clarifications

### Rate Limiting

**Enforcement:** Per IP address (default) or per API key (if provided)  
**Limit:** 10 requests per minute  
**Behavior:** Request #11 within 60 seconds returns HTTP 429  
**Cooldown:** Wait until the 60-second window resets  
**Tracking:** Sliding window (not fixed intervals)

**Best Practice:** Space requests evenly to stay under limit. For high-volume use cases, contact us about dedicated API keys with higher limits.

### Cache Behavior

**Cache TTL:** 15 minutes for ENS data  
**Stale Data Risk:** ENS records updated during cache period won't reflect immediately  
**Cache Bypass:** Not currently supported - data may be up to 15 minutes old  
**Recommendation:** For time-sensitive data, factor in 15-minute staleness window

**Cache Invalidation:** Automatic after TTL expires. No manual invalidation endpoint available.

### Service Availability

**Status:** Production  
**Uptime Target:** Best-effort basis (see SLA link below)  
**Maintenance:** May occur without notice for critical updates  
**Status Page:** https://web3identity.com/status

**Downtime Handling:** Implement exponential backoff retry logic. See error handling examples in Integration Guide section.

### API Versioning

**Current Version:** 2.0  
**Versioning Strategy:** Breaking changes will be announced via:
- Email notification (if contact provided)
- Changelog updates
- Minimum 30 days notice for breaking changes

**Non-Breaking Changes:** May be deployed without notice (new optional fields, additional error codes, performance improvements)

### Data Accuracy

**Source:** ENS data is sourced from Ethereum mainnet via public RPC providers and cached for performance.

**Accuracy Disclaimer:** 
- ENS names are resolved from blockchain state and may be subject to network delays
- Social profiles (Twitter, GitHub, Discord) are self-reported by ENS name owners
- We do not verify the authenticity of social profile claims
- Data may be outdated by up to 15 minutes due to caching

**User Responsibility:** Users should implement their own verification for critical use cases.

### Security

**HTTPS Required:** All API requests must use HTTPS. HTTP requests will be rejected.  
**CORS Policy:** Permissive CORS for public endpoints. Restricted for payment-required endpoints.  
**Authentication:** Optional API keys available for rate limit increases and usage tracking.

---

## Legal & Terms

**SERVICE PROVIDED "AS-IS"**

This API is provided on an "as-is" and "as-available" basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, or non-infringement.

**DATA ACCURACY & THIRD-PARTY DATA**

ENS data is sourced from public Ethereum blockchain data and third-party RPC providers. Social profile data (Twitter, GitHub, Discord) is self-reported by ENS name owners and not verified by us. We make no representations or warranties regarding the accuracy, reliability, completeness, or timeliness of any data returned by this API. Users are solely responsible for verifying data accuracy for their use cases.

**LIMITATION OF LIABILITY**

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TECHNOREALISM, INC., ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
(i) YOUR USE OR INABILITY TO USE THE SERVICE;
(ii) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SERVERS AND/OR ANY PERSONAL INFORMATION STORED THEREIN;
(iii) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICE;
(iv) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE TRANSMITTED TO OR THROUGH THE SERVICE BY ANY THIRD PARTY;
(v) ANY ERRORS OR OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE INCURRED AS A RESULT OF THE USE OF ANY CONTENT MADE AVAILABLE VIA THE SERVICE; OR
(vi) ANY OTHER MATTER RELATING TO THE SERVICE.

**SERVICE AVAILABILITY**

We provide this API on a best-effort basis with no uptime guarantees, service level agreements, or availability commitments unless separately agreed in writing. The service may be interrupted, delayed, or unavailable due to maintenance, updates, third-party failures, network issues, or other circumstances beyond our control.

**PAYMENT TERMS**

**Pricing:** Current pricing is $0.01 USD per API request after free tier exhaustion. Pricing is subject to change with 30 days notice.

**Payment Method:** Payments are processed via CDP (Coinbase Developer Platform) facilitator using USDC on Base. We are not responsible for payment processing failures, blockchain network issues, or third-party payment provider unavailability.

**No Refunds:** All payments are final. No refunds for completed API requests.

**Failed Payments:** If payment authorization fails, the API request will be rejected with HTTP 402. We are not liable for losses resulting from failed payment processing.

**CHANGES TO SERVICE**

We reserve the right to modify, suspend, or discontinue the API, any features, pricing, rate limits, or these terms at any time with or without notice. For material changes affecting existing integrations, we will provide reasonable advance notice (typically 30 days) where feasible.

**ACCEPTABLE USE**

You agree NOT to:
- Use the API in any manner that could damage, disable, overburden, or impair our infrastructure
- Attempt to bypass rate limits or authentication mechanisms
- Scrape or systematically download large portions of ENS data for competing services
- Use the API for illegal purposes, fraud, harassment, or violations of third-party rights
- Resell raw API access without written permission (value-added services are permitted)

Violations may result in immediate API access termination without notice or refund.

**INTELLECTUAL PROPERTY**

API and documentation are proprietary to TechnoRealism, Inc. ENS data is public blockchain data. You may cache and use API responses for your application's purposes. You may not rebrand or resell the raw API service.

**INDEMNIFICATION**

You agree to indemnify and hold harmless TechnoRealism, Inc. and its affiliates from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising from your use of the API, violation of these terms, or infringement of any third-party rights.

**PRIVACY & DATA HANDLING**

**Logging:** We log IP addresses, timestamps, requested addresses, and response times for operational monitoring and abuse prevention.

**Retention:** Logs are retained for 90 days for debugging and security purposes, then deleted.

**Third-Party Sharing:** We do not sell or share user data. We may share aggregated, anonymized statistics.

**User Rights:** For data access, correction, or deletion requests, contact support@web3identity.com.

**Full Privacy Policy:** https://technorealism.com/privacy.html

**GOVERNING LAW & JURISDICTION**

This agreement shall be governed by and construed in accordance with the laws of the State of New York, United States, without regard to its conflict of law provisions. Any disputes arising from or relating to this agreement shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, with the arbitration venue located in New York.

**EXPORT COMPLIANCE**

You agree to comply with all applicable export and sanctions laws. You represent that you are not located in, under the control of, or a national or resident of any country subject to U.S. embargo or sanctions.

**MODIFICATIONS TO TERMS**

We may modify these terms at any time. Continued use of the API after changes constitutes acceptance of the modified terms.

**FULL TERMS OF SERVICE**

Complete Terms of Service: https://docs.web3identity.com/legal/terms  
Service Level Agreement: https://docs.web3identity.com/legal/sla  
Privacy Policy: https://technorealism.com/privacy.html

**CONTACT**

- **Legal inquiries:** support@web3identity.com  
- **Privacy inquiries:** support@web3identity.com  
- **Technical support:** support@web3identity.com  
- **Telegram:** @GaryPalmerJr

---

## Changelog

### Version 2.0 (2026-02-17)
- Complete rewrite based on actual API testing
- Fixed `include` parameter documentation
- Fixed error response formats
- Fixed payment flow documentation
- Removed fictional features (timeout parameter)
- Added comprehensive examples
- All claims verified against production API
- Added "Understanding the Counting System" clarification
- Fixed Buzz economics calculations
- Added comprehensive legal disclaimers and terms
- Added technical clarifications (rate limits, caching, versioning)
- Added business terms (SLA reference, acceptable use, payment terms)
- Added privacy and data handling disclosures
- Corrected contact emails (all inquiries → support@web3identity.com)
- Corrected jurisdiction (New York + Arbitration)
- Corrected legal/policy URLs (full paths: /legal/terms, /legal/sla, technorealism.com/privacy.html)
- Note: Legal docs reference non-existent emails; actual contact is support@ only
- Corrected legal entity name (ATV → TechnoRealism, Inc.)
- Removed invalid x402 documentation link from 402 response example
- Updated status page to canonical URL (web3identity.com/status)

---

## Support

- **Documentation:** https://docs.web3identity.com
- **Technical Support:** support@web3identity.com
- **Telegram:** @GaryPalmerJr

---

**Last Updated:** 2026-02-17  
**API Version:** 2.0  
**Verified:** All claims tested against production API
