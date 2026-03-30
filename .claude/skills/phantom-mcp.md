# SKILL: Phantom MCP — Wallet Operations + ARIA Data Source
# Location: .claude/skills/phantom-mcp.md
# Intel Source #31 | 4 chains | 5 wallet tools | Buzz-controlled wallet
# Created: March 30, 2026 (Post-Sprint)
# History: Registered Feb 18, 2026 (Conway research session)
#          Integration planned Mar 10-11, 2026 (Sprint Day 22)
#          Never wired into Hetzner — completing now

---

## OVERVIEW

Phantom MCP gives Buzz direct wallet control across Solana, Ethereum,
Bitcoin, and Sui. Unlike HeyAnon (read-only DeFi aggregation), Phantom
enables Buzz to HOLD, SIGN, and TRANSFER — making it both a data source
AND an execution layer.

Registered as "Buzz by SolCex" on Phantom Portal.
App ID: be4a0179-1113-416b-a6e6-45a09191f407

## CONNECTION

```
Package: @phantom/mcp-server (npm)
App ID: be4a0179-1113-416b-a6e6-45a09191f407
Auth: SSO (Google/Apple) — one-time browser auth, session persists
Session: ~/.phantom-mcp/session.json (persistent)
Env vars needed:
  PHANTOM_APP_ID=be4a0179-1113-416b-a6e6-45a09191f407
  PHANTOM_CLIENT_SECRET=<from Phantom Portal>
  PHANTOM_ORG_ID=<from Phantom Portal>
  PHANTOM_API_PRIVATE_KEY=<from Phantom Portal API Keys>
```

## 5 MCP TOOLS

| Tool | Function | ARIA Use | BD Use |
|------|----------|----------|--------|
| `get_wallet_addresses` | View addresses across chains | Portfolio data source | Proof of holdings |
| `sign_transaction` | Sign arbitrary TX | — | On-chain BD actions |
| `transfer_tokens` | Build + sign + submit transfers | — | Listing fee collection |
| `buy_token` | Fetch swap quote + optional execute | Token price verification | Due diligence positions |
| `sign_message` | Sign UTF-8 messages | — | Identity verification |

## SUPPORTED NETWORKS (CAIP-2 format)

| Chain | Network ID | ARIA Relevance |
|-------|-----------|----------------|
| Solana Mainnet | solana:mainnet | PRIMARY — SolCex native chain |
| Ethereum Mainnet | eip155:1 | ERC-8004 identity chain |
| Bitcoin | bip122:000000000019d6689c085ae165831e93 | AIBTC signal context |
| Sui | sui:mainnet | Emerging chain coverage |

## ARIA INTEGRATION — DATA SOURCE

### What Phantom Adds to ARIA That Others Don't:

```
ARIA Layer 1: CHAIN-NATIVE
  ├── DexScreener (pairs, liquidity)
  ├── CoinGecko (price, MCap)
  ├── Bags.fm (Solana launchpad)
  ├── Colosseum (hackathon projects)
  └── Phantom MCP ← NEW (wallet balances, swap quotes, token verification)

ARIA Layer 2: AGGREGATION
  └── HeyAnon MCP (18 chains DeFi + CeFi)

ARIA Layer 3: ENRICHMENT
  ├── dev-browser (contact screening)
  └── GeckoTerminal (circulating MCap)
```

### Phantom as Price Verification Source:
```javascript
// Use buy_token with execute=false to get LIVE swap quotes
// This gives Buzz real-time Solana DEX pricing from Phantom's aggregator
const quote = await phantom.getSwapQuote(tokenAddress, 0.01);
// Returns: inputAmount, outputAmount, priceImpact, route
// Compare against DexScreener + CoinGecko for tri-source verification
```

### Phantom as Balance Verification:
```javascript
// Verify token holder claims during BD outreach
const wallets = await phantom.getWalletAddresses('solana:mainnet');
// Check if token project's claimed treasury actually holds what they say
```

### Phantom as Identity Proof:
```javascript
// Sign messages to prove Buzz controls the wallet
const signature = await phantom.signMessage(
  'Buzz BD Agent verifying wallet ownership for SolCex Exchange listing',
  'solana:mainnet'
);
// Use in BD proposals: "Wallet verified via Phantom-signed message"
```

## INTEGRATION MODULE

File: `api/services/phantom-bridge.js`

```javascript
// Core functions:
async function getWalletAddresses(networkId) // Multi-chain addresses
async function getSwapQuote(tokenAddress, amount) // Price verification (NO execute)
async function signMessage(message, networkId) // Identity proof
async function transferTokens(to, amount, networkId) // REQUIRES APPROVAL
async function getPhantomStatus() // Connection health

// SAFETY: All transfer/execution functions require Ogie Telegram approval
// SAFETY: buy_token only used with execute=false (quote mode)
// SAFETY: Logged in phantom_transactions table with JVR receipts
```

## ENDPOINTS

```
GET /api/v1/phantom/status — Connection + session health
GET /api/v1/phantom/wallets — All wallet addresses
GET /api/v1/phantom/wallets/:network — Chain-specific addresses
GET /api/v1/phantom/quote/:token — Swap quote (no execute)
POST /api/v1/phantom/sign-message — Sign message (identity proof)
POST /api/v1/phantom/transfer — Transfer tokens (REQUIRES APPROVAL)
```

## DATABASE TABLE

```sql
CREATE TABLE IF NOT EXISTS phantom_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,           -- 'transfer', 'swap', 'sign', 'quote'
  network TEXT DEFAULT 'solana:mainnet',
  to_address TEXT,
  amount TEXT,
  token TEXT,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending', -- pending/approved/executed/failed
  approval_required BOOLEAN DEFAULT 1,
  approved_by TEXT,
  receipt_id TEXT,               -- links to JVR receipt (BZZ-)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  executed_at DATETIME
);
```

## SAFETY RULES (NON-NEGOTIABLE)

1. **NEVER auto-execute transfers** — ALL fund movements require Ogie
   Telegram approval via War Room
2. **buy_token QUOTE ONLY** — execute=false always. Never auto-buy tokens.
3. **sign_message OK for identity** — Buzz can auto-sign identity verification
   messages (non-financial)
4. **get_wallet_addresses OK** — READ operations are always safe
5. **Daily transfer limit** — $100 max without explicit CEO override
6. **Every transaction logged** — phantom_transactions table + JVR receipts
7. **Session security** — session.json in persistent storage, never committed to git

## SETUP SEQUENCE

### Phase 1: Auth (requires Ogie's Mac — one time)
```bash
# On Ogie's Mac (has browser for SSO):
npx @phantom/mcp-server
# → Opens browser → Google/Apple SSO login
# → Creates ~/.phantom-mcp/session.json
# → Copy session.json to Hetzner persistent storage
```

### Phase 2: Server Integration
```bash
# On Hetzner:
cd /opt/buzz-api
npm install @phantom/mcp-server
# Add env vars to .env
# Create phantom-bridge.js
# Create phantom-routes.js
# Create phantom_transactions table
# Wire into server.js
```

### Phase 3: ARIA Wiring
```bash
# Add Phantom as price verification source in aria-enricher.js
# Add swap quote comparison to tri-source verification
# Wire wallet addresses into BD outreach templates
```

## COMBINED INTEL SOURCES (Post-Integration)

| # | Source | Type | Chains | Role |
|---|--------|------|--------|------|
| 1-22 | Existing sources | Various | Various | Current pipeline |
| 23 | CoinGecko | REST | Multi | Price, MCap |
| 24-28 | Jupiter, DexScreener, etc | REST | Various | DEX data |
| 29 | Colosseum Copilot | REST | N/A | Hackathon projects |
| **30** | **HeyAnon MCP** | **MCP** | **18 chains** | **DeFi + CeFi aggregation** |
| **31** | **Phantom MCP** | **MCP** | **4 chains** | **Wallet ops + price verification** |

Total: 31 intel sources. Two MCP connections.
Combined chain coverage: 18+ chains (HeyAnon) + wallet control (Phantom).

## SYNERGY: HEYANON + PHANTOM

```
HeyAnon: "What DeFi positions exist for TOKEN_X across 18 chains?"
  → READ: lending, LP, staking, perps data

Phantom: "What is the live swap quote for TOKEN_X on Solana?"
  → READ: real-time DEX price from Phantom's aggregator

Together: Complete picture — DeFi depth (HeyAnon) + execution price (Phantom)
  → ARIA Depth Score becomes even more accurate
  → Signal Factory has both cross-chain AND Solana-native data
```

## BD EXECUTION FLOW (Future — Phase 3+)

```
1. ARIA discovers token → scores 85+ (HOT)
2. BD Screening passes → PROCEED verdict
3. Buzz signs identity message via Phantom (proof of agent)
4. Outreach to project with signed verification
5. Project agrees to listing
6. Buzz creates ListingEscrow deposit via Phantom transfer
7. Ogie approves via Telegram
8. Fee collected → listing confirmed
9. BuzzReputation records outcome on-chain
```

---

*Intel Source #31 | Phantom MCP | Wallet + Data + Execution*
*App ID: be4a0179-1113-416b-a6e6-45a09191f407*
*Registered Feb 18 | Completing integration post-sprint*
*Safety first: every transfer needs Ogie's thumbs up* 🐝
