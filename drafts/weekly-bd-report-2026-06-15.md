# BUZZ WEEKLY BD REPORT — Week 17

**Week of 2026-06-15 | buzzbd.ai**
**Data source: LIVE from production API (SSH via GitHub Actions run #3)**

---

## PIPELINE FUNNEL (2,626 tokens scored)

**Added 24h: 45** | Pipeline grew 152% since W16 (1,044 -> 2,626)

| Stage       | Count | Avg Score | Notes              |
| ----------- | ----- | --------- | ------------------ |
| discovered  | 532   | 35        | Awaiting scan      |
| scanned     | 0     | —         |                    |
| scored      | 2,076 | 7         | Bulk of pipeline   |
| prospect    | 16    | 5         | See top 5 below    |
| contacted   | 0     | —         | ZERO outreach sent |
| negotiating | 0     | —         |                    |
| approved    | 0     | —         |                    |
| listed      | 0     | —         | **STILL ZERO**     |
| rejected    | 2     | —         |                    |

**By Chain:** Solana 2,542 (96.8%) | BSC 50 | Base 30 | Arbitrum 2 | Ethereum 1 | XRPL 1

---

## TOP PROSPECTS (from prospect stage, 16 total)

1. **PIPPIN** (SOL) — 85/100 — _phantom token, 0 DEX pairs, flagged for rejection_
2. **MAGA** (SOL) — scored 0/100 — Make Aliens Great Again, full breakdown available
   - Safety: 100 (mint revoked), Wallet: 50, Social: 75, Scorer: 70
3. Additional 14 prospects at prospect stage (avg score 5 — most need rescore)

**Critical Issue:** Most prospect-stage tokens have stale or phantom data. The "16 prospects" number is misleading — many are phantom tokens that should be rejected.

---

## SIMULATION VERDICTS

- **Nasdog** (SOL, MiroFish 10K, 4 waves): **BULLISH** — consensus strengthened
  - W1: 0.620 -> W2: 0.665 -> W3: 0.696 -> W4: 0.765
  - All 5 clusters bullish. Institutional: 0.664
- **Simulation API endpoint:** Route `/api/v1/simulate-listing/results` returns 404 — **endpoint broken or renamed**
- MicroBuzz v2 (500-agent): available but **UNUSED 10+ weeks**
- No new simulations run since last report

---

## ION BSC STATUS (Primary Prospect, Score 83)

**ION NOT FOUND in BSC 80+ query results.** Only 4 BSC tokens with score 80+ returned:

| Token     | Score | Stage      | Notes                               |
| --------- | ----- | ---------- | ----------------------------------- |
| COW       | 84    | discovered | Address unconfirmed, dual-gate FAIL |
| wkeyDAO2  | 83    | scored     | 3.99% sell tax, TOO RISKY           |
| BANANAS31 | 95    | scored     | FDV gap 99%, 84d stalled            |
| VELO      | 95    | scored     | Top-10 concentration 75%            |

**ION may have been rescored below 80, removed, or uses a different ticker in the database.** Requires manual investigation via:

```
docker exec buzz-production curl -s "http://127.0.0.1:3000/api/v1/pipeline?search=ION&chain=bsc"
```

**Previous status:** Score 83 | Stage: prospect | Contact: @0xDeployer (Bankr partner) | 49+ days waiting

---

## PIPELINE VELOCITY: ZERO (8th consecutive week)

- No stage movements
- No outreach emails sent (contacted: 0)
- No simulations run on prospects
- No score tweets published
- No new scoring calibration

### STALLED TOKENS (all 72+ days at prospect/scored, no action)

| Token     | Chain | Raw Score | Calibrated | Stall Days | Status          |
| --------- | ----- | --------- | ---------- | ---------- | --------------- |
| BALLWARS  | SOL   | 95\*      | ~65        | 72+        | Stalled         |
| Max       | SOL   | 95\*      | ~65        | 72+        | Stalled         |
| TRUMP     | SOL   | 95\*      | 56         | 72+        | Stalled         |
| VELO      | BSC   | 95        | 80         | 72+        | Stalled         |
| BANANAS31 | BSC   | 95        | ~55        | 84         | DEAD (no reply) |
| $COW      | BSC   | 84        | —          | 84         | DEAD (no reply) |

---

## WEEK-OVER-WEEK TREND

```
                  W15      W16      W17       TREND
Tokens scored:  1,044+   1,044+   2,626      UP (+152%)
Prospects:         5        5       16        UP (but mostly phantoms)
Contacted:         2        2        0        WORSE (dropped to 0!)
Listed:            0        0        0        FLAT
Stage moves:       0        0        0        FLAT
ION outreach:   NONE     NONE     NONE       FLAT (7 wks)
Dead deal age:   70d      77d      84d       WORSE
Revenue:        $192     $192     $192       FLAT
```

**Note:** Pipeline growth (1,044 -> 2,626) is positive but doesn't translate to BD progress without outreach execution. The contacted count DROPPED from 2 to 0, which is worse than flat.

---

## BD ACTION ITEMS (Priority Order)

### 1. [CRITICAL — 7 WKS OVERDUE] ION BSC Investigation + Outreach

- ION missing from BSC 80+ query — investigate if rescored/removed
- If still viable: Score 83, @0xDeployer contact, zero blockers. **SEND NOW.**
- 49+ days since first flagged as #1 priority

### 2. [CRITICAL — 7 WKS OVERDUE] Close Dead Deals

- BANANAS31 + $COW: 84 days, no response. **Mark REJECTED.**
- Free contacted slots for fresh outreach

### 3. [CRITICAL — NEW] Fix Contacted Count Regression

- W16 showed 2 contacted, W17 shows 0 — data may have been reset
- Investigate what happened to contacted-stage tokens

### 4. [HIGH — 12 WKS OVERDUE] Calibration Audit

- Pipeline raw 95 vs calibrated ~60. Can't do honest BD on uncalibrated scores.

### 5. [HIGH] Prospect Stage Cleanup

- 16 tokens at prospect but most are phantom/stale (avg score 5)
- Clean up, reject phantoms, rescore viable ones

### 6. [HIGH] Run MicroBuzz v2 Simulation

- Top prospects with ZERO simulation data
- MicroBuzz v2 available but unused 10+ weeks

### 7. [HIGH] Fix Simulation Results Endpoint

- `/api/v1/simulate-listing/results` returns 404
- Data may still be in DB but route is broken

### 8. [MEDIUM] Publish Score Tweets

- Infrastructure ready. Zero tweets published.

### 9. [MEDIUM] Fresh DexScreener Sweep

- Pipeline grew to 2,626 but scoring avg is 7 — most are low quality
- Need targeted sweep for 85+ candidates

---

## REVENUE

- Total: ~270K sats (~$192)
- Listing revenue: $0
- 17 weeks. 2,626 tokens scored. 0 listed. $0 listing revenue.

---

## TELEGRAM DELIVERY STATUS

**FAILED** — `TELEGRAM_BOT_TOKEN` secret in GitHub Actions returned "Unauthorized" on all 4 message parts. The bot token needs to be updated in GitHub repository settings > Secrets > `TELEGRAM_BOT_TOKEN`.

Previous W16 delivery (June 8) succeeded with this same secret, so the token may have been rotated or expired.

---

## INFRASTRUCTURE NOTES

- Production server: responding (SSH step succeeded in 3s)
- Docker container `buzz-production`: running
- API endpoints: responsive (stats, pipeline, prospects all returned data)
- Simulation endpoint: **BROKEN** (returns 404)
- Pipeline data: growing (45 tokens/day intake)
- Scoring engine: running but avg score 7 suggests most are auto-scored low

---

_Buzz BD Agent | SolCex Exchange | buzzbd.ai_
_2,626 tokens scored | 11 rules | On-chain verified_
_BuzzShield V6 | 859 programs monitored_
_Report generated: Week 17, June 15 2026_
_Data source: GitHub Actions run #3 (27519880817)_
