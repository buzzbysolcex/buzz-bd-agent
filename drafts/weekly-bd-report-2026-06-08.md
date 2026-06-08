BUZZ WEEKLY BD REPORT
Week of June 8, 2026 | Week 16
Published by Buzz BD Agent | buzzbd.ai
===================================
DATA SOURCE: LIVE from production API (02:18 UTC Jun 8)

## PIPELINE FUNNEL (2,373 tokens — LIVE)

| Stage       | Count | Avg Score | Notes                                   |
| ----------- | ----- | --------- | --------------------------------------- |
| discovered  | 444   | 36        | Raw DexScreener/ARIA intake             |
| scanned     | 0     | --        | No tokens at scan stage                 |
| scored      | 1,911 | 6         | 11-rule engine + calibration active     |
| prospect    | 16    | 5         | Calibrated down — most at score 0       |
| contacted   | 0     | --        | BANANAS31 + $COW no longer in contacted |
| negotiating | 0     | --        | No active negotiations                  |
| approved    | 0     | --        | Pending first deal closure              |
| listed      | 0     | --        | Target: first ZHC listing               |
| rejected    | 2     | --        | Phantoms + failed security              |

Total pipeline: 2,373 tokens (UP from 1,044 in Week 15 — +127% growth!)
Added in last 24h: 42 (ARIA intake is ACTIVE and running)
Conversion to prospect: 0.67% (16/2,373)

By chain: Solana 2,294 (96.7%) | BSC 49 | Base 26 | Arbitrum 2 | Ethereum 1 | XRPL 1

CRITICAL FINDING: Pipeline has MORE THAN DOUBLED since Week 15.
ARIA automated intake is working. Calibration is aggressive —
avg scored token is 6/100. Most prospects calibrated to 0.

## TOP 5 PROSPECTS (Live Data — Sorted by Score)

| #   | Token  | Chain    | Score | Calibrated | Key Issue                         |
| --- | ------ | -------- | ----- | ---------- | --------------------------------- |
| 1   | PIPPIN | Solana   | 85    | dual-gate  | PHANTOM — rejected, no DEX pairs  |
| 2   | MAGA   | Solana   | 0     | calibrated | Was 59 -> 0 (liq/pumpfun penalty) |
| 3   | OBC    | Solana   | 0     | calibrated | Was 54 -> 0 (mcap floor + liq)    |
| 4   | TEPE   | Solana   | 0     | calibrated | Was 52 -> 0 (mcap floor penalty)  |
| 5   | PENIS  | Ethereum | 0     | calibrated | Was 55 -> 0 (mcap floor + liq)    |

All 16 prospect-stage tokens are calibrated to score 0.
PIPPIN (score 85) is a PHANTOM — already rejected.
The prospect pipeline is effectively EMPTY of actionable tokens.

## BSC 80+ TOKENS (ION BSC Search)

ION BSC was NOT found in the live pipeline. BSC tokens scoring 80+:

| Token     | Chain | Score | Stage      | Status                              |
| --------- | ----- | ----- | ---------- | ----------------------------------- |
| COW       | BSC   | 84    | discovered | Address "not_confirmed", phantom    |
| wkeyDAO2  | BSC   | 83    | scored     | Cal: 88->83, TOO RISKY (Go+ issues) |
| BANANAS31 | BSC   | 95    | scored     | Cal: 95->75 (FDV gap 99%)           |
| VELO      | BSC   | 95    | scored     | Cal: 95->80 (concentration 75%)     |

## ION BSC STATUS (Primary Prospect)

- ION BSC: NOT IN PIPELINE (confirmed via live API query)
- Previous reports cited score 83 — this may have been from memory
  or an earlier state before a pipeline reset/migration
- Contact @0xDeployer (Bankr partner) status: UNCHANGED
- Outreach: NOT SENT

IMPORTANT: If ION BSC was ever a real prospect, it has been lost
from the pipeline. Needs re-scoring and re-entry if still viable.

## SIMULATION VERDICTS

Simulation endpoint `/api/v1/simulate-listing/results` returns 404.
Route may have been renamed or removed in a recent deploy.

Historical (from cached data):
| Token | Engine | Agents | Waves | Final Belief | Verdict |
| ------ | -------- | ------ | ----- | ------------ | ------- |
| Nasdog | MiroFish | 10,000 | 4 | 0.765 | BULLISH |

MicroBuzz v2 (500-agent hybrid) available but unused.

## PIPELINE VELOCITY (Week 16: Jun 2 - Jun 8)

New tokens ingested: ~294+ (2,373 - 1,044 baseline, actual intake higher)
Stage movements (prospect->contacted): ZERO
ARIA cron: ACTIVE (42 tokens in last 24h)

The pipeline IS growing — ARIA intake is working.
But zero tokens advance past scored/prospect stage.
Calibration is extremely aggressive: avg score 6/100.

## STALLED ANALYSIS

The calibration engine is doing its job too well:

- 1,911 scored tokens averaging 6/100
- 16 prospect tokens averaging 5/100 (all calibrated to 0)
- Zero tokens qualify for BD Sweet Spot after calibration
- Penalties crushing everything: mcap_floor, liq_penalty, pumpfun_penalty

This is not a BD execution problem — it's a CALIBRATION problem.
The scoring engine may be too aggressive, or the token mix
(96.7% Solana pump.fun tokens) is inherently low-quality.

## BD ACTION ITEMS (Priority Order — REVISED)

1. [CRITICAL] CALIBRATION AUDIT — MOST URGENT
   Avg score 6/100 across 1,911 tokens. Every prospect at 0.
   Either calibration is too aggressive or the intake mix needs
   diversifying beyond Solana pump.fun tokens.
   Review: mcap_floor, liq_penalty, pumpfun_penalty thresholds.

2. [CRITICAL] ION BSC — RESOLVE STATUS
   Token not in pipeline. Was it lost in migration?
   Re-score if still viable. Contact @0xDeployer still known.

3. [HIGH] DIVERSIFY INTAKE SOURCES
   96.7% Solana, mostly pump.fun. Add BSC/ETH/Base sources.
   The pipeline needs higher-quality token candidates.

4. [HIGH] FIX PROSPECT STAGE CLASSIFICATION
   16 tokens at "prospect" with score 0 should be rejected.
   Stage classification is not reflecting calibrated scores.

5. [HIGH] VERIFY SIMULATION ENDPOINT
   /api/v1/simulate-listing/results returns 404.
   Route may need re-registration or rename.

6. [MEDIUM] BANANAS31 + $COW — CLOSE DEAD DEALS
   Both now at "scored" stage (demoted from contacted).
   77+ days since outreach. No response. Mark rejected.

7. [MEDIUM] wkeyDAO2 (BSC, 83) — INVESTIGATE
   Second-highest BSC token. Previously flagged TOO RISKY.
   Go+ issues + 3.99% sell tax. Verify current status.

## REVENUE CONTEXT

- Total revenue: ~270K sats (~$192)
- Listing revenue: $0 (zero deals closed in 16 weeks)
- Pipeline -> revenue gap: 2,373 tokens scored, 0 listed
- Weekly revenue change: FLAT (7th consecutive flat week)
- The bottleneck has SHIFTED: from BD execution to
  calibration being too aggressive for the token mix

## WEEK-OVER-WEEK TREND (Updated with LIVE data)

| Metric             | W14 (May 25) | W15 (Jun 1) | W16 (Jun 8) | Trend       |
| ------------------ | ------------ | ----------- | ----------- | ----------- |
| Tokens in pipeline | 1,044+       | 1,044+      | 2,373       | UP +127%    |
| Tokens added/24h   | ?            | ?           | 42          | ACTIVE      |
| Scored tokens      | 1,044+       | 1,044+      | 1,911       | UP +83%     |
| Prospects          | 5            | 5           | 16          | UP (but 0s) |
| Contacted          | 2            | 2           | 0           | DOWN        |
| Listed             | 0            | 0           | 0           | FLAT        |
| Avg scored score   | ?            | ?           | 6/100       | LOW         |
| ION BSC in pipe    | Yes (83)     | Yes (83)    | NOT FOUND   | LOST        |
| Revenue            | ~$192        | ~$192       | ~$192       | FLAT        |

First trend change in 7 weeks: pipeline is GROWING.
But calibration is choking every token to near-zero scores.

## WEEKLY SUMMARY

Week 16 reveals a fundamentally different picture than previous reports:

1. PIPELINE IS ALIVE: 2,373 tokens (up 127% from 1,044). ARIA intake
   added 42 tokens in the last 24h alone. The growth problem is solved.

2. CALIBRATION IS THE BOTTLENECK: Avg score 6/100 across 1,911 scored
   tokens. All 16 prospects calibrated to 0. The scoring engine is so
   aggressive that no token can survive to BD stage.

3. ION BSC IS MISSING: Not in the pipeline. Previous reports may have
   been working from stale/cached data. Needs investigation.

4. STAGE CLASSIFICATION IS BROKEN: 16 tokens at "prospect" with
   score 0 should be rejected. Stage doesn't reflect calibrated score.

The narrative shifts from "BD won't execute" to "calibration won't
let anything through." The pipeline infrastructure works. The intake
works. The calibration needs tuning.

MINIMUM VIABLE ACTIONS THIS WEEK:

1. Calibration threshold audit (mcap_floor, liq, pumpfun penalties)
2. ION BSC: locate or re-score
3. Clean up prospect stage (reject score-0 tokens)
4. Add non-Solana intake sources (BSC, ETH, Base)
5. Fix /simulate-listing/results 404

---

Buzz BD Agent | SolCex Exchange | buzzbd.ai
2,373 tokens scored | 11 rules | On-chain verified (Base + Solana)
BuzzShield V6 | 859 programs monitored | 9 vuln reports filed
Report generated: 2026-06-08 (LIVE data from production API)
