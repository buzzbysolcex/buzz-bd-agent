# 🐝 BUZZ TWITTER BOT v2.3 — Claude Code Build Spec
## Sprint Day 5 — February 28, 2026

---

## OVERVIEW

Upgrade twitter-bot.js from v2.2 to v2.3 with three goals:
1. **Bug Fixes** — Ticker collision and chain mismatch in DexScreener search
2. **L5 SmartMoneyAgent** — Nansen x402 integration for Smart Money intelligence
3. **Factor 11** — New scoring factor (Smart Money Signal) bringing total to 110 → normalized to 100

**Source file:** `twitter-bot.js` (currently v2.2, ~795 lines, pure Node.js, zero dependencies)
**Location on Akash:** `/opt/buzz-scripts/twitter-bot.js`
**Dev workflow:** Edit locally → Docker build → GHCR push → Akash SDL update

---

## PART 1: BUG FIXES

### Bug 1: Ticker Collision ($PIPPIN → $AI)

**Problem:** When searching DexScreener by ticker (e.g., "PIPPIN"), the API returns multiple tokens across chains. Current code sorts by liquidity and picks the top pair — but the highest-liquidity pair may be a DIFFERENT token with a similar name.

**Root cause:** `l1_tokenAgent()` sorts all pairs by `liquidity.usd` descending and takes `[0]`. When searching "PIPPIN", DexScreener returned an $AI token pair with higher liquidity.

**Fix:** After DexScreener returns pairs, prefer **exact symbol match** before falling back to highest liquidity.

```javascript
// CURRENT (broken):
const pair = res.data.pairs.sort((a, b) =>
  (parseFloat(b.liquidity?.usd || 0)) - (parseFloat(a.liquidity?.usd || 0))
)[0];

// FIXED:
const pairs = res.data.pairs;

// Step 1: Try exact symbol match (case-insensitive)
const exactMatches = pairs.filter(p =>
  p.baseToken?.symbol?.toUpperCase() === query.toUpperCase()
);

// Step 2: Sort candidates by liquidity
const candidates = exactMatches.length > 0 ? exactMatches : pairs;
const pair = candidates.sort((a, b) =>
  (parseFloat(b.liquidity?.usd || 0)) - (parseFloat(a.liquidity?.usd || 0))
)[0];
```

### Bug 2: Chain Mismatch ($BNKR ETH vs Base)

**Problem:** $BNKR has pairs on both ETH and Base. The ETH pair has higher liquidity ($11.3M) but zero volume, while the Base pair is the "real" one with active trading. Sorting by liquidity picks the wrong chain.

**Fix:** When multiple exact matches exist across chains, prefer pairs with **non-zero volume** over zero-volume pairs with higher liquidity. Also prefer the chain with highest volume, not highest liquidity.

```javascript
// After finding exact matches, prefer pairs with volume
if (candidates.length > 1) {
  const withVolume = candidates.filter(p =>
    parseFloat(p.volume?.h24 || 0) > 0 ||
    parseFloat(p.volume?.h6 || 0) > 0 ||
    parseFloat(p.volume?.h1 || 0) > 0
  );
  if (withVolume.length > 0) {
    // Sort by 24h volume descending (active trading = real pair)
    candidates = withVolume;
  }
}
// Then sort by volume first, liquidity as tiebreaker
const pair = candidates.sort((a, b) => {
  const volA = parseFloat(a.volume?.h24 || 0);
  const volB = parseFloat(b.volume?.h24 || 0);
  if (volA > 0 || volB > 0) return volB - volA; // prefer volume
  return (parseFloat(b.liquidity?.usd || 0)) - (parseFloat(a.liquidity?.usd || 0));
})[0];
```

### Bug 3: Volume Still Showing $0

**Problem:** v2.2 added volume fallback (extrapolate from h6/h1 if h24=0), but some pairs still show $0 because the fallback only checks `pair.volume?.h24` — if the volume object itself is null/undefined, it fails silently.

**Fix:** Add null safety to volume extraction:

```javascript
let vol24h = parseFloat(pair.volume?.h24 || 0);
if (vol24h === 0) {
  const vol6h = parseFloat(pair.volume?.h6 || 0);
  const vol1h = parseFloat(pair.volume?.h1 || 0);
  if (vol6h > 0) vol24h = vol6h * 4;
  else if (vol1h > 0) vol24h = vol1h * 24;
}
// Also check txns as volume proxy — if txns exist but vol=0, flag it
if (vol24h === 0 && ((pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0)) > 10) {
  log('  [L1] ⚠ Volume=0 but has txns — DexScreener may be delayed');
}
```

---

## PART 2: L5 SMART MONEY AGENT (Nansen x402)

### Architecture

```
EXISTING FLOW:
Tweet "scan $TICKER" → L1 → L2 → L3 → L4 → Reply + TG notify

NEW FLOW (v2.3):
Tweet "scan $TICKER" → L1 → L2 → L3 → L4 → [IF score >= 65] → L5 → Adjust score → Reply + TG notify
```

### New Environment Variables (add to SDL)

```
NANSEN_X402_ENABLED=true
NANSEN_X402_WALLET_KEY=<anet_private_key>    # User adds this themselves
NANSEN_SCORE_THRESHOLD=65                     # Minimum L4 score to trigger L5
NANSEN_DAILY_BUDGET_CENTS=50                  # Max daily spend in cents ($0.50)
```

### L5 SmartMoneyAgent Function

```javascript
// =============================================================================
// L5 — SMART MONEY AGENT (Nansen x402 — Pay-per-call)
// Only triggered for tokens scoring >= NANSEN_SCORE_THRESHOLD
// Pays USDC on Base from NANSEN_X402_WALLET_KEY
// =============================================================================

const NANSEN_ENABLED = process.env.NANSEN_X402_ENABLED === 'true';
const NANSEN_THRESHOLD = parseInt(process.env.NANSEN_SCORE_THRESHOLD || '65');
const NANSEN_DAILY_BUDGET = parseInt(process.env.NANSEN_DAILY_BUDGET_CENTS || '50');
const NANSEN_DAILY_SPEND_FILE = `${DATA_DIR}/nansen-daily-spend.json`;

function getNansenDailySpend() {
  const d = loadJSON(NANSEN_DAILY_SPEND_FILE, { date: '', cents: 0 });
  const today = new Date().toISOString().slice(0, 10);
  return d.date === today ? d : { date: today, cents: 0 };
}

function addNansenSpend(cents) {
  const d = getNansenDailySpend();
  d.cents += cents;
  saveJSON(NANSEN_DAILY_SPEND_FILE, d);
  return d.cents;
}

async function l5_smartMoneyAgent(l1, currentScore) {
  if (!NANSEN_ENABLED) {
    log('  [L5] ⏭ Nansen x402 disabled');
    return null;
  }
  
  if (currentScore < NANSEN_THRESHOLD) {
    log(`  [L5] ⏭ Score ${currentScore} below threshold ${NANSEN_THRESHOLD}`);
    return null;
  }

  const dailySpend = getNansenDailySpend();
  if (dailySpend.cents >= NANSEN_DAILY_BUDGET) {
    log(`  [L5] ⏭ Daily budget exhausted (${dailySpend.cents}¢ / ${NANSEN_DAILY_BUDGET}¢)`);
    return null;
  }

  log(`  [L5 SmartMoneyAgent] Nansen x402 lookup (score=${currentScore})...`);

  const smData = {
    smHolders: 0,
    netFlow: 0,      // positive = accumulating, negative = dumping
    topBuyers: [],
    topSellers: [],
    signal: 'UNKNOWN',
    cost: 0,         // cents spent
  };

  // Determine chain for Nansen
  const nansenChain = l1.chain === 'solana' ? 'solana'
    : l1.chain === 'base' ? 'base'
    : l1.chain === 'ethereum' ? 'ethereum'
    : null;

  if (!nansenChain) {
    log(`  [L5] ⚠ Chain ${l1.chain} not supported by Nansen`);
    return smData;
  }

  // --- Call 1: Smart Money Holdings ($0.05 = 5¢) ---
  try {
    const holdingsRes = await nansenX402Call(
      'https://api.nansen.ai/api/v1/smart-money/holdings',
      { chains: [nansenChain], token_address: l1.ca }
    );
    if (holdingsRes) {
      smData.smHolders = holdingsRes.total_holders || holdingsRes.count || 0;
      smData.cost += 5;
      addNansenSpend(5);
      log(`  [L5] SM Holdings: ${smData.smHolders} holders`);
    }
  } catch (e) {
    log(`  [L5] ⚠ SM Holdings failed: ${e.message}`);
  }

  // --- Call 2: Smart Money Net Flow ($0.05 = 5¢) ---
  try {
    const flowRes = await nansenX402Call(
      'https://api.nansen.ai/api/v1/smart-money/netflow',
      { chains: [nansenChain], token_address: l1.ca }
    );
    if (flowRes) {
      smData.netFlow = flowRes.net_flow || flowRes.netflow || 0;
      smData.cost += 5;
      addNansenSpend(5);
      log(`  [L5] SM Net Flow: ${smData.netFlow > 0 ? '+' : ''}${smData.netFlow}`);
    }
  } catch (e) {
    log(`  [L5] ⚠ SM Net Flow failed: ${e.message}`);
  }

  // --- Call 3: Who Bought/Sold ($0.01 = 1¢) ---
  try {
    const whoRes = await nansenX402Call(
      'https://api.nansen.ai/api/v1/tgm/who-bought-sold',
      { token_address: l1.ca }
    );
    if (whoRes) {
      smData.topBuyers = (whoRes.buyers || []).slice(0, 3);
      smData.topSellers = (whoRes.sellers || []).slice(0, 3);
      smData.cost += 1;
      addNansenSpend(1);
      log(`  [L5] Who Bought/Sold: ${smData.topBuyers.length}B / ${smData.topSellers.length}S`);
    }
  } catch (e) {
    log(`  [L5] ⚠ Who Bought/Sold failed: ${e.message}`);
  }

  // Determine signal
  if (smData.netFlow > 0 && smData.smHolders > 5) {
    smData.signal = 'STRONG_ACCUMULATE';
  } else if (smData.netFlow > 0) {
    smData.signal = 'ACCUMULATE';
  } else if (smData.smHolders > 0 && smData.netFlow === 0) {
    smData.signal = 'HOLD';
  } else if (smData.netFlow < 0) {
    smData.signal = 'DUMPING';
  } else {
    smData.signal = 'NO_DATA';
  }

  log(`  [L5] ✅ Signal: ${smData.signal} (cost: $${(smData.cost / 100).toFixed(2)})`);
  return smData;
}
```

### x402 Payment Helper

```javascript
// x402 payment flow for Nansen
// 1. Send request → get 402 with payment details
// 2. Sign USDC payment on Base
// 3. Retry with payment receipt
async function nansenX402Call(url, body) {
  // Step 1: Initial request (will return 402)
  const initial = await safeReq({
    hostname: new URL(url).hostname,
    path: new URL(url).pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(body))
    }
  }, JSON.stringify(body));

  if (!initial) return null;

  // If 200, great (maybe Nansen changed to free tier?)
  if (initial.status === 200) return initial.data;

  // If not 402, it's an error
  if (initial.status !== 402) {
    log(`  [L5] Nansen returned ${initial.status}, expected 402`);
    return null;
  }

  // Step 2: Parse 402 payment details from response
  // x402 returns payment info in the response body or headers
  const paymentDetails = initial.data;
  
  // Step 3: Sign payment using ethers/viem (need to add to container)
  // NOTE: This requires the x402 npm package or manual USDC transfer signing
  // For v2.3 MVP, we can use the x402-client package
  //
  // The x402 flow:
  // - Parse payment recipient + amount from 402 response
  // - Create EIP-712 typed data for USDC permit/transfer
  // - Sign with NANSEN_X402_WALLET_KEY
  // - Retry original request with X-PAYMENT header containing signed receipt
  
  // PLACEHOLDER: Implement with x402 npm package
  // const { createX402Client } = require('x402-client');
  // const client = createX402Client({ privateKey: process.env.NANSEN_X402_WALLET_KEY });
  // return await client.post(url, body);
  
  log('  [L5] ⚠ x402 payment signing not yet implemented (needs x402-client package)');
  return null;
}
```

**IMPORTANT FOR CLAUDE CODE:** The x402 payment signing is the hardest part. Options:
1. **x402 npm package** (`npm install x402-client`) — simplest, handles all payment signing
2. **Manual ethers.js** — sign EIP-712 USDC permit, more control but more code
3. **Corbits/Faremeter SDK** — open-source x402 framework

Recommend option 1 (x402-client). Add to `package.json` and Dockerfile `npm install`.

---

## PART 3: FACTOR 11 — SMART MONEY SCORING

### Updated Scoring Agent (v2.3)

Add Factor 11 after existing 10 factors. Normalize total from 110 max to 100.

```javascript
// Factor 11: Smart Money Signal (0-10) — only populated for 65+ tokens
if (l5Data && l5Data.signal !== 'NO_DATA') {
  switch (l5Data.signal) {
    case 'STRONG_ACCUMULATE':
      factors.smartMoney = 10;
      break;
    case 'ACCUMULATE':
      factors.smartMoney = 7;
      break;
    case 'HOLD':
      factors.smartMoney = 5;
      break;
    case 'DUMPING':
      factors.smartMoney = 2;
      break;
    default:
      factors.smartMoney = 3;
  }
} else {
  factors.smartMoney = 0; // Not scored (below threshold or disabled)
}

// Total: if L5 was triggered, max = 110 → normalize to 100
const total = Object.values(factors).reduce((s, v) => s + v, 0);
const maxPossible = factors.smartMoney > 0 ? 110 : 100;
const normalized = Math.round((total / maxPossible) * 100);
const capped = Math.min(100, Math.max(0, normalized));
```

### Updated Grade Thresholds (unchanged)

```
A: 80+ | B: 65-79 | C: 50-64 | D: 35-49 | F: <35
```

---

## PART 4: UPDATED TWITTER REPLY FORMAT

Add Smart Money signal to the 280-char reply when L5 is triggered:

```javascript
function buildReply(l1, l2, l3, scoring, l5Data) {
  // ... existing code ...
  
  // Add SM signal if available (between score and CA)
  if (l5Data && l5Data.signal !== 'NO_DATA' && l5Data.signal !== 'UNKNOWN') {
    const smEmoji = l5Data.signal.includes('ACCUMULATE') ? '🟢'
      : l5Data.signal === 'HOLD' ? '🟡'
      : '🔴';
    t += `${smEmoji} SM: ${l5Data.signal.replace('_', ' ')}\n`;
  }
  
  // ... rest of reply ...
}
```

### Updated Telegram Notification

Add L5 section to Buzz's Telegram report:

```javascript
// In notifyBuzz(), add after L4 section:
if (l5Data && l5Data.signal !== 'NO_DATA') {
  msg += `━━ L5 SmartMoneyAgent ━━\n`;
  msg += `Signal: ${l5Data.signal}\n`;
  msg += `SM Holders: ${l5Data.smHolders}\n`;
  msg += `Net Flow: ${l5Data.netFlow > 0 ? '+' : ''}${l5Data.netFlow}\n`;
  if (l5Data.topBuyers.length > 0) {
    msg += `Top Buyers: ${l5Data.topBuyers.map(b => b.label || b.address?.slice(0,8)).join(', ')}\n`;
  }
  msg += `Cost: $${(l5Data.cost / 100).toFixed(2)}\n\n`;
}
```

---

## PART 5: PIPELINE CHANGES

### Updated runScanPipeline()

```javascript
async function runScanPipeline(query) {
  // ... existing L1-L4 ...
  
  // L5: Smart Money (conditional on score)
  let l5Data = null;
  if (NANSEN_ENABLED && scoring.score >= NANSEN_THRESHOLD) {
    l5Data = await l5_smartMoneyAgent(l1, scoring.score);
    
    // Adjust score if L5 data available
    if (l5Data && l5Data.signal !== 'NO_DATA') {
      // Recalculate with Factor 11
      scoring = l4_scoringAgent(l1, l2, l3, l5Data); // Pass l5Data
    }
  }
  
  const reply = buildReply(l1, l2, l3, scoring, l5Data);
  
  // ... save history with SM data ...
  saveScanHistory({
    symbol: l1.symbol, chain: l1.chain, ca: l1.ca,
    score: scoring.score, grade: scoring.grade, identity: l3.label,
    price: l1.price, fdv: l1.fdv, liq: l1.liq,
    smartMoney: l5Data?.signal || null,
    nansenCost: l5Data?.cost || 0,
  });

  return { l1, l2, l3, l5: l5Data, scoring, reply };
}
```

---

## PART 6: DOCKERFILE CHANGES

Add x402-client package to the Dockerfile:

```dockerfile
# After existing npm install openclaw:
RUN npm install -g x402-client || echo "[docker] x402-client install optional"
```

Or better: create a `package.json` in `/opt/buzz-scripts/` with the dependency.

---

## PART 7: SDL ENV VARS TO ADD

```yaml
# Nansen x402 Smart Money
- "NANSEN_X402_ENABLED=true"
- "NANSEN_X402_WALLET_KEY=ROTATE_ME"   # Ogie fills in anet private key
- "NANSEN_SCORE_THRESHOLD=65"
- "NANSEN_DAILY_BUDGET_CENTS=50"
```

---

## PART 8: FULL FUNCTION SIGNATURES (for Claude Code)

### Modified functions:
- `l1_tokenAgent(query)` — Add exact symbol match + volume-preferred sorting
- `l4_scoringAgent(l1, l2, l3, l5Data = null)` — Add optional l5Data param, Factor 11
- `buildReply(l1, l2, l3, scoring, l5Data = null)` — Add SM signal line
- `notifyBuzz(l1, l2, l3, scoring, tweetId, l5Data = null)` — Add L5 section
- `runScanPipeline(query)` — Add L5 call between L4 and reply

### New functions:
- `l5_smartMoneyAgent(l1, currentScore)` — Nansen x402 calls
- `nansenX402Call(url, body)` — x402 payment helper
- `getNansenDailySpend()` — Budget tracking
- `addNansenSpend(cents)` — Budget tracking

### New constants:
- `NANSEN_ENABLED` — from env
- `NANSEN_THRESHOLD` — from env
- `NANSEN_DAILY_BUDGET` — from env
- `NANSEN_DAILY_SPEND_FILE` — persistence file

---

## PART 9: TESTING CHECKLIST

After building, verify:

1. **Ticker collision fix**: Search "PIPPIN" → should return $PIPPIN (SOL), not $AI
2. **Chain mismatch fix**: Search "BNKR" → should return Base pair (with volume), not ETH pair
3. **Volume fix**: All scans show non-zero volume for active tokens
4. **L5 disabled path**: With `NANSEN_X402_ENABLED=false`, L5 is skipped, score unchanged
5. **L5 threshold**: Token scoring 40 → L5 not triggered. Token scoring 70 → L5 triggered
6. **L5 budget cap**: After daily budget exhausted, L5 stops but L1-L4 continue
7. **Factor 11 normalization**: Score with L5 data normalized to 100 (not 110)
8. **Reply format**: SM signal appears in Twitter reply when L5 data available
9. **TG notification**: L5 section appears in Telegram report
10. **Backward compatibility**: If Nansen API is down, everything still works (L1-L4 only)

---

## PART 10: FILE STRUCTURE

```
~/buzz-bd-agent/
├── twitter-bot.js          ← MODIFY THIS (v2.2 → v2.3)
├── package.json            ← NEW (add x402-client dependency)
├── Dockerfile              ← MODIFY (add npm install for package.json)
├── entrypoint.sh           ← NO CHANGE
└── skills/                 ← NO CHANGE
```

---

## KEY CONTEXT FOR CLAUDE CODE

- **No frameworks**: twitter-bot.js uses raw Node.js (https, http, crypto, fs). No Express, no Axios.
- **No external deps currently**: All HTTP calls use the built-in `httpReq()` / `safeReq()` helpers
- **x402-client is the ONLY new dependency** — everything else stays pure Node.js
- **OAuth 1.0a** is used for Twitter write (posting replies)
- **Bearer token** is used for Twitter read (fetching mentions)
- **The file runs as a standalone process** (PID 2 in the container, launched by entrypoint.sh)
- **Data persistence** goes to `/data/workspace/` (mounted volume on Akash)
- **Telegram bridge** sends full scan reports to Buzz's brain for context + memory
- **Never hardcode credentials** — always read from process.env

---

*Spec compiled: February 28, 2026 — Jakarta, Indonesia (Sprint Day 5)*
*"Smart Money follows the alpha. Buzz finds the alpha." 🐝*
