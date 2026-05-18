# MASTER OPS UPDATE — JUPITER INTEGRATION + PIPELINE CORRECTIONS

## Merges: Cowork Pipeline Audit + Jupiter Deep Scrape + BD Screening Workflow

## For Buzz Claude Code — Execute all tasks

## Day 39 | March 28, 2026 | Bismillah 🤲

---

## HEADLINE: Jupiter Recovered 2 Lost Tokens. Pipeline Needs Major Correction.

The Cowork audits exposed critical issues AND opportunities:

- **3 data sources** now confirmed (DexScreener + DexTools + Jupiter)
- **2 phantom tokens recovered** (Max at $524.09, BANANA at $0.096 — both on Solana via Jupiter)
- **PIPPIN already listed on SolCex** — validates our scoring (it identified a real listing target)
- **BANANAS31 drops from 95 to ~55** after real circulating cap + security penalties
- **Only Jupiter catches Token2022 tokens** (Max uses this standard)

---

## TASK 1: UPDATE DATA SOURCE HIERARCHY (Permanent)

Replace the old evidence tier system with this:

```
BUZZ EVIDENCE TIERS v2.0 — DATA SOURCE HIERARCHY

TIER 1 (weight 1.0) — Primary Truth:
├── DexTools — Circulating MCap, supply data, holder distribution, DEXTscore
├── Jupiter  — Solana token existence, pricing, route quality, organic score
└── On-chain — Contract verification, holder data, tx history (direct RPC)

TIER 2 (weight 0.6) — Cross-Verification:
├── DexScreener — Multi-chain pairs, security audits (Go+, TS, QI, Honeypot)
├── CoinGecko  — Market data, exchange listings, project info
└── Jupiter /recent — New Solana token detection

TIER 3 (weight 0.3) — Supplementary:
├── CoinMarketCap — Aggregated (often shows FDV as MCap — unreliable)
├── Social signals — Twitter, Telegram, community metrics
└── News/rumors — Unverified claims, paid promotions

CHAIN-SPECIFIC RULES:
- Solana tokens → Jupiter is PRIMARY source (catches tokens DS/DT miss)
- BSC tokens → DexTools is PRIMARY (best circulating supply data)
- ETH tokens → DexScreener + DexTools (both reliable)
- Multi-chain → Cross-verify across all available sources
```

---

## TASK 2: INTEGRATE JUPITER API INTO BUZZ (5 Actions — P0)

### Action 1: Register API Key

```
URL: https://portal.jup.ag
Register for API key (x-api-key header)
Store in .env as JUPITER_API_KEY
DO NOT commit key to git — .env only
```

### Action 2: Install `integrating-jupiter` Skill

```bash
# Check if jup-ag/agent-skills has an installable package
# The skill is MIT licensed — can be imported directly
# Add to Buzz's skill library alongside DexScreener skill
```

### Action 3: Add Jupiter Token Search to pipeline-scanner

```javascript
// New intel source: Jupiter Token Search
// Endpoint: GET https://api.jup.ag/tokens/v1/search?query={tokenName}
// Headers: { "x-api-key": process.env.JUPITER_API_KEY }
// Returns: token metadata, mint address, organic score
//
// USE CASE: When DexScreener returns "not found" for Solana tokens,
// fall back to Jupiter. This catches Token2022 tokens and new launches.

// Also add: GET https://api.jup.ag/tokens/v1/recent
// USE CASE: Detect new Solana token launches for pipeline discovery
// Run on cron: every 4 hours alongside DexScreener scan

// Also add: GET https://api.jup.ag/tokens/v1/content/cooking
// USE CASE: Find trending/"cooking" Solana tokens
```

### Action 4: Add Jupiter Price API to pipeline-verifier

```javascript
// Cross-verification price check
// Endpoint: GET https://api.jup.ag/price/v3?ids={mintAddress}
// Headers: { "x-api-key": process.env.JUPITER_API_KEY }
// Returns: price in USD
//
// USE CASE: Third price data point for Solana tokens
// DexScreener price vs DexTools price vs Jupiter price
// If all 3 agree within 5%: HIGH CONFIDENCE
// If any differs >10%: FLAG for investigation
```

### Action 5: Add Jupiter Organic Score to Scoring

```
Jupiter provides an "organic score" per token:
- PIPPIN scored 87 (high quality signal)
- TRUMP scored 81

INTEGRATION:
- Pull organic score via token search
- Add as supplementary data to pipeline-scorer
- Weight: +5 composite if organic score > 80
- Weight: +0 if score 50-79
- Weight: -5 if score < 50 (quality concern)
- Weight: N/A if no Jupiter score available (Solana only)
```

---

## TASK 3: PIPELINE CORRECTIONS (Execute Now)

### 3A: Remove from Pipeline

```
REMOVE (auto-exclude rules triggered):
- EURC: Stablecoin (new rule: auto-exclude known stablecoins)
- MEMECARD: Ghost token (2 holders, $0 volume — rule: <10 holders = exclude)
- POOPALIEN: Phantom (not found on any source — rule: require valid pair URL)
```

### 3B: Re-Score with Corrected Data

```
BANANAS31 (BSC):
  OLD: Score 95 (using $137M FDV as MCap)
  CORRECTIONS:
    - Use DexTools circ MCap: $1.37M (not $137M)
    - Wallet penalty: -20 (99% FDV gap, >90% threshold)
    - Security penalty: -25 (Token Sniffer 0/100)
  NEW SCORE: ~50-55 (was 95)
  CLASSIFICATION: POTENTIAL* (investigate TS 0/100 before outreach)
  BD STATUS: Outreach PAUSED until security contradiction resolved

TRUMP (SOL):
  OLD: Score 95
  CORRECTIONS:
    - Wallet penalty: -15 (77% FDV gap)
    - Jupiter score: 81 (no adjustment, within range)
  NEW SCORE: ~80 (was 95)
  CLASSIFICATION: TOO BIG ($629M, 19+ exchanges)
  BD STATUS: Monitor only

VELO (BSC):
  OLD: Score 95
  CORRECTIONS:
    - Security penalty: -25 (Token Sniffer 0/100)
    - Liquidity flag: DS shows $55K vs DT shows $615K (10x difference)
    - Contradictory audits: TS 0/100 but DEXTscore 99 — use lower
  NEW SCORE: ~70 (was 95)
  CLASSIFICATION: TOO BIG + audit contradiction
  BD STATUS: Investigate TS vs DEXTscore before any action

wkeyDAO2 (BSC):
  OLD: Score 88
  CORRECTIONS:
    - Security penalty: -30 (Go+ 5 issues)
    - Tax penalty: -20 (3.99% sell tax)
    - DEXTscore penalty: -15 (score 47)
  NEW SCORE: ~25-30 (was 88)
  CLASSIFICATION: TOO RISKY
  BD STATUS: Remove from BD targets

Max (SOL — RECOVERED via Jupiter):
  OLD: DATA MISSING (not found)
  NEW DATA: Found on Jupiter at $524.09, Token2022 standard
  ACTION: Full scoring needed — run through all 5 layers
  NOTE: Token2022 standard may have unique characteristics

BANANA (SOL — RECOVERED via Jupiter):
  OLD: DATA MISSING (not found)
  NEW DATA: Found on Jupiter at $0.096
  ACTION: Full scoring needed — run through all 5 layers
  NOTE: Different from BANANAS31 on BSC — verify this is a separate token
```

### 3C: Updated Pipeline Health

```
BEFORE corrections:
  Total: 195 tokens
  HOT (85+): 10
  Top tokens: BANANAS31(95), TRUMP(95), VELO(95), Max(95), BANANA(95)...

AFTER corrections:
  Total: 192 (removed EURC, MEMECARD, POOPALIEN)
  Tokens re-scored: 5
  Tokens recovered: 2 (Max, BANANA via Jupiter)
  Actual HOT (85+): TBD after re-scoring
  PIPPIN: Confirmed BD SWEET SPOT (already on SolCex — validates pipeline)

  HONEST ASSESSMENT: Our "10 HOT tokens" list was inflated.
  After corrections, true HOT count may be 3-5.
  This is better for credibility — quality over quantity.
```

---

## TASK 4: UPDATE MASTER OPS BD SCREENING WORKFLOW

Add Jupiter as Phase 1.3 in the screening workflow:

```
PHASE 1: DUAL-SOURCE → TRI-SOURCE VERIFICATION

Step 1.1: DexScreener Pull (all chains)
Step 1.2: DexTools Pull (all chains — circulating supply priority)
Step 1.3: Jupiter Pull (Solana tokens ONLY) ← NEW
  - Token search: existence + organic score
  - Price API: cross-verification
  - /recent: new token detection
  - Cooking: trending tokens
Step 1.4: FDV Gap Check (compare all sources)
Step 1.5: Auto-Exclusion Rules
```

Update pipeline-scanner intel sources:

```
INTEL SOURCES: 25 → 28 (add 3 Jupiter sources)
  #26: Jupiter Token Search (Solana token verification)
  #27: Jupiter /recent (new Solana launches)
  #28: Jupiter /cooking (trending Solana tokens)
```

---

## TASK 5: SUNDAY REPORT CORRECTIONS

The buzzbd.ai/report.html needs to reflect corrected scores:

```
CRITICAL: Do NOT publish the Sunday report with inflated scores.
BANANAS31 at "95" when it's really ~55 = credibility disaster.

Actions for Sunday report:
1. Use CORRECTED scores, not pipeline raw scores
2. Add FDV gap disclosure column (show circ MCap vs FDV)
3. Add security flag column (Token Sniffer score)
4. Remove EURC, MEMECARD, POOPALIEN from Top 20
5. Add recovered tokens (Max, BANANA) if scoring supports it
6. PIPPIN note: "Already listed on SolCex" (validates methodology)
7. Be honest about corrections: "Scores adjusted after tri-source verification"
```

Update the Twitter thread drafts:

```
ORIGINAL hook: "Top 20 tokens ranked. BANANAS31 is #1 at 95/100"
CORRECTED hook: "We scored 192 tokens. Then we audited our own scores.
Here's what tri-source verification revealed — and why most
'market cap' numbers are wrong. Thread 🧵"

The correction IS the story. Honesty > inflated numbers.
This positions Buzz as more rigorous than competitors.
```

---

## TASK 6: UPDATE BD OUTREACH

### BANANAS31 Follow-Up — PAUSE

```
STATUS: PAUSED pending security investigation
REASON: Token Sniffer 0/100 needs resolution before we feature
them in the report or continue outreach.
If TS 0/100 is a false positive (Go+ and QuickIntel both clean),
we can resume. But need to investigate first.
```

### VELO, Max, BANANA Outreach — HOLD

```
VELO: Hold until TS vs DEXTscore contradiction resolved
Max: Hold until full 5-layer scoring complete with Jupiter data
BANANA (SOL): Hold until full scoring + verify distinct from BANANAS31
```

### PIPPIN — Already on SolCex

```
Not a BD target (already listed). But USE as case study:
"PIPPIN scored 85/100 in our pipeline and is now listed on SolCex.
Our scoring methodology identified a real listing target."
This goes in the Sunday report as validation.
```

### New BD Targets Needed

```
After corrections, we need to find NEW tokens that pass the
updated screening workflow. Actions:

1. Run Jupiter /recent to find new Solana launches
2. Run Jupiter /cooking to find trending Solana tokens
3. Re-scan pipeline for tokens scoring 70-84 with clean security
4. Apply full tri-source verification
5. Identify 5 new BD SWEET SPOT candidates by Sunday
```

---

## TASK 7: COMMIT + DEPLOY

```bash
cd /home/claude-code/buzz-workspace

# Save Master Ops BD Screening Workflow
# (if not already in docs/)
cp docs/MASTER-OPS-BD-SCREENING.md docs/MASTER-OPS-BD-SCREENING.md.bak
# Update with Jupiter integration additions

# Update pipeline-scanner with Jupiter sources
# Update pipeline-verifier with Jupiter price cross-check
# Update pipeline-scorer with FDV gap penalties + security penalties

git add docs/MASTER-OPS-BD-SCREENING.md
git add .claude/agents/pipeline-scanner.md
git add .claude/agents/pipeline-verifier.md
git add .claude/agents/pipeline-scorer.md
git commit -m "feat: Jupiter integration + pipeline corrections

- Add Jupiter as Tier 1 Solana data source (3 new intel sources)
- Recovered 2 lost tokens: Max ($524, Token2022), BANANA ($0.096)
- 8 new scoring rules: FDV gap penalties, security penalties, auto-exclusions
- Removed EURC (stablecoin), MEMECARD (ghost), POOPALIEN (phantom)
- Re-scored: BANANAS31 95→55, TRUMP 95→80, VELO 95→70, wkeyDAO2 88→30
- Data source hierarchy v2.0: DexTools+Jupiter (T1), DexScreener (T2), CMC (T3)
- PIPPIN validated: scored 85, already listed on SolCex (methodology works)
- Evidence tiers updated with tri-source verification"

git push origin main
```

---

## TASK 8: WAR ROOM REPORT

```
🔬 PIPELINE AUDIT COMPLETE — Jupiter Integrated

CORRECTIONS APPLIED:
- BANANAS31: 95 → ~55 (99% FDV gap + TS 0/100)
- TRUMP: 95 → ~80 (77% FDV gap, TOO BIG regardless)
- VELO: 95 → ~70 (TS 0/100, audit contradiction)
- wkeyDAO2: 88 → ~30 (5 Go+ issues, 3.99% sell tax)

TOKENS RECOVERED (via Jupiter):
- Max: $524.09 on Solana (Token2022) — needs full scoring
- BANANA: $0.096 on Solana — needs full scoring

TOKENS REMOVED:
- EURC (stablecoin), MEMECARD (ghost), POOPALIEN (phantom)

VALIDATION:
- PIPPIN scored 85 → already listed on SolCex ✅
- Pipeline methodology WORKS when data sources are accurate

NEW DATA SOURCES: +3 (Jupiter Search, /recent, /cooking)
Total intel sources: 28

PIPELINE: 195 → 192 tokens (3 removed)
TRUE HOT COUNT: TBD after re-scoring (was 10, likely 3-5)

Sunday report will use CORRECTED scores.
The correction IS the credibility story.

Next: Register Jupiter API key, find 5 new BD sweet spot tokens.
Bismillah 🤲
```

---

## SUMMARY: What Changed

| Before Audit             | After Audit                                |
| ------------------------ | ------------------------------------------ |
| 2 data sources (DS + DT) | 3 data sources (DS + DT + Jupiter)         |
| 10 HOT tokens at 85+     | ~3-5 after corrections                     |
| BANANAS31 #1 at 95       | BANANAS31 ~55 (security + FDV)             |
| 3 "lost" Solana tokens   | 2 recovered via Jupiter                    |
| No FDV gap checking      | Permanent penalty system                   |
| No security scoring      | 6 security penalty rules                   |
| No auto-exclusions       | Stablecoins, ghosts, phantoms auto-removed |
| Pipeline inflated        | Pipeline honest                            |

**The pipeline is now MORE credible, not less.**
Fewer HOT tokens, but the ones that remain are REAL.

_Bismillah_ 🤲
