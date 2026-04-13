# SolCex BD Pipeline — Weekly Report

## Week 8 | April 7–13, 2026 | buzzbd.ai

---

## 1. Pipeline Funnel (598 Tokens Tracked)

| Stage       | Count (est.) | Avg Score | Notes                                 |
| ----------- | ------------ | --------- | ------------------------------------- |
| Discovered  | ~340         | —         | Auto-ingested from 23 intel sources   |
| Scanned     | ~150         | —         | 5-agent safety + market scan complete |
| Scored      | ~95          | ~42       | 11-factor composite + dual-gate       |
| Prospect    | 5            | 83–95     | Top-tier candidates for outreach      |
| Contacted   | 2            | 84–95     | BANANAS31 + $COW — awaiting response  |
| Negotiating | 1            | —         | ELS-1_SPEC (warm interested)          |
| Approved    | 0            | —         | —                                     |
| Listed      | 0            | —         | Pipeline honest: zero listings yet    |
| Rejected    | ~5           | —         | Phantom/honeypot auto-rejected        |

**Growth:** +344 tokens vs Week 6 (254 → 598). 23 intel sources feeding pipeline 24/7.

---

## 2. Top 5 HOT Tokens (Pipeline Score)

| #   | Token     | Chain  | Score                      | Simulation           | Status                  | Blocker                                                                  |
| --- | --------- | ------ | -------------------------- | -------------------- | ----------------------- | ------------------------------------------------------------------------ |
| 1   | BALLWARS  | Solana | 95                         | Not run              | Scored                  | Needs Phase 2 security deep dive                                         |
| 2   | BANANAS31 | BSC    | 95 (raw) / 55 (calibrated) | EV $3,240 (78% conf) | Contacted — NO RESPONSE | FDV gap 99%, Token Sniffer 0/100. Wallet Guard: BLOCK                    |
| 3   | Max       | Solana | 95                         | Not run              | Scored                  | Needs dual-source verification                                           |
| 4   | TRUMP     | Solana | 95 (raw) / 56 (calibrated) | Not run              | Scored                  | High social / weak safety. Too Big?                                      |
| 5   | VELO      | BSC    | 95 (raw) / 60 (calibrated) | Not run              | Scored                  | Audit contradiction: Token Sniffer 0 vs DEXTscore 99. Wallet Guard: WARN |

**Calibration note:** Raw pipeline scores (95) differ significantly from post-calibration honest scores. Dual-gate verification + 8 penalty rules drop most to WATCH (50–69) range.

---

## 3. MiroFish Simulation Results

**Nasdog (Solana)** — Full 10K-agent swarm simulation (4 waves):

| Wave | Agents | Rounds | Final Belief | Consensus | LLM Calls | Time  |
| ---- | ------ | ------ | ------------ | --------- | --------- | ----- |
| 1    | 2,500  | 10     | 0.620        | BULLISH   | —         | —     |
| 2    | 2,500  | 10     | 0.665        | BULLISH   | 36        | 4.9h  |
| 3    | 2,500  | 10     | 0.696        | BULLISH   | 76        | 15.9h |
| 4    | 2,500  | 10     | 0.765        | BULLISH   | 96        | 15.8h |

Cluster beliefs (Wave 4 final):

- Degen: 1.000 (max conviction)
- Community: 0.756
- Market Dynamics: 0.714
- Whale: 0.692
- Institutional: 0.664

**Verdict:** Strong BULLISH convergence across all clusters over 40 rounds. Even institutional (most conservative) reached 0.664. No other tokens have been simulated this week.

---

## 4. Pipeline Velocity

| Metric                | This Week | Notes                                 |
| --------------------- | --------- | ------------------------------------- |
| New tokens discovered | ~344      | Week 6→8 growth                       |
| Tokens scored         | ~95 total | Dual-gate reducing HOT to 0           |
| Stage advances        | 0         | No tokens moved to new stages         |
| Outreach sent         | 0 new     | Last outreach: March 23 (3 weeks ago) |
| Responses received    | 0         | BANANAS31 + $COW both no_response     |
| Listings completed    | 0         | Pipeline honest: zero                 |

**Velocity assessment:** STALLED. Discovery engine is healthy (598 tokens), but scoring calibration + dual-gate means 0 HOT tokens. No outreach sent in 3 weeks. Contacted tokens unresponsive.

---

## 5. Stalled Tokens (Scored But Not Advancing)

| Token     | Chain  | Score | Stalled Since | Reason                                                    |
| --------- | ------ | ----- | ------------- | --------------------------------------------------------- |
| $SAT      | Solana | 68    | Mar 30+       | Highest calibrated score but below 70 QUALIFIED threshold |
| PIPPIN    | Solana | 63    | Mar 30+       | Already listed elsewhere. Post-listing tracking only      |
| VELO      | BSC    | 60    | Mar 30+       | Audit contradiction blocks Phase 5 outreach               |
| TRUMP     | Solana | 56    | Mar 30+       | Weak safety score prevents BD classification              |
| BANANAS31 | BSC    | 55    | Mar 23        | 99% FDV gap, Token Sniffer 0. Wallet Guard BLOCKS         |

**Root cause:** Honest calibration is working correctly — no token genuinely qualifies as HOT (85+). The pipeline is filtering properly, but this means zero BD deal flow.

---

## 6. ION BSC — Primary Prospect Status

| Field           | Value                                              |
| --------------- | -------------------------------------------------- |
| Token           | ION                                                |
| Chain           | BSC                                                |
| Score           | 83 (QUALIFIED)                                     |
| BD Prospect Day | 32                                                 |
| Contact Channel | @0xDeployer (Bankr partner — warm intro available) |
| Phase Status    | Phase 3 — BD Readiness Classification              |
| Blocker         | Needs Phase 4 contact screening + Phase 5 outreach |
| Simulation      | NOT RUN — should be triggered (score 70-84 = R002) |

**ION is the single best prospect in the pipeline.** Score 83 is the highest QUALIFIED token. Warm intro channel via @0xDeployer (Bankr partner). Day 32 without outreach execution.

**ACTION REQUIRED:**

1. Run MiroFish simulation on ION (R002 mandates simulation for 70-84)
2. Execute Phase 4 contact screening via GSD browser
3. Draft outreach email (CC Ogie + Dino)
4. Submit to War Room for approval

---

## 7. BD Action Items

| Priority | Action                                             | Token        | Deadline            |
| -------- | -------------------------------------------------- | ------------ | ------------------- |
| P0       | Run simulation on ION BSC (score 83)               | ION          | ASAP                |
| P0       | Execute Phase 4-5 BD sequence on ION               | ION          | This week           |
| P1       | Follow up on BANANAS31 (3 weeks no response)       | BANANAS31    | Overdue             |
| P1       | Follow up on $COW (3 weeks no response)            | $COW         | Overdue             |
| P2       | Resolve VELO audit contradiction                   | VELO         | Before any outreach |
| P2       | Re-score BALLWARS + Max with full calibration      | BALLWARS/Max | This week           |
| P3       | Check ELS-1_SPEC warm interested status            | ELS-1_SPEC   | Follow up           |
| P3       | Investigate why $SAT (68) can't clear 70 threshold | $SAT         | Review scoring      |

---

## 8. System Health

- API: Healthy (135 endpoints, 102 tables)
- PULSE engine: Active (load-aware ticking)
- MiroFish: Operational (10K-agent capacity)
- Wallet Guard: Live (3-state evaluation working)
- BuzzShield: Active (23 drain patterns)
- Signal Filing: Streak active
- Crons: 45 scheduled jobs running

---

_Report generated Apr 13, 2026 by Buzz BD Agent | Data from HANDOVER (Apr 7) + local sources_
_598 tokens | 23 intel sources | 5 chains | 15 scoring rules | Dual-gate verified_
_buzzbd.ai | @BuzzBySolCex | Bismillah_
