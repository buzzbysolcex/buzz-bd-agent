# Token Scoring Doctrine — Pillar 1 Brain

**Purpose:** Operating doctrine for the 100-point token scoring engine. Same structure as `brain/Doctrine.md` but for scoring rules — every rug catch becomes a worked example, every false positive becomes a calibration note, every bug-research finding becomes a candidate penalty rule.

**Authority:** Created 2026-05-27 as Pillar 1 Obsidian Mind component (Ogie Four-Pillar Brain Extension directive). Companion to `brain/Token-Rug-Patterns.md` (catalog of the 11 rules) and `brain/Deployer-Crossref.md` (cross-pillar index).

**Canonical engine:** `npm-scorer/lib/scorer.js` (11 rules) + `api/services/agents/scorer.js` (full pipeline with instant-kills + Hedge Brain).

**Versioning:** v1.0 = seed doctrine. Every rug catch / false positive / Pillar 4 cross-feed produces a new entry.

---

## Doctrine T-1 — Instant-kill rules must remain rare and well-justified

**Statement.** Instant-kill scoring rules (those that return −100 and short-circuit further evaluation) are the engine's hardest commitments. They reflect deterministic disqualification — patterns whose presence GUARANTEES the token cannot be a viable scoring candidate regardless of other factors.

Current instant-kills:
- **STABLECOIN_EXCLUSION** — token symbol matches major stablecoin list. Justification: stablecoins are peg-targeting, not appreciation-targeting; they don't fit the scoring rubric.
- **GHOST_TOKEN** — `txns24h < 10 AND volume24h < 1000`. Justification: no real activity = no market signal to score.

**Why scarcity matters.** Every instant-kill removes a token from human review. False positives are silent — operator never sees them. Therefore: instant-kill must be (a) deterministic, (b) reversible by user override, (c) explainable in one sentence.

**Promotion path.** A new instant-kill requires: 50+ confirmed-correct application examples, 0 confirmed false positives, operator approval. Per `.claude/rules/autonomy-boundary.md` §"Adjusting scoring rules", removing or adding an instant-kill is operator-flagged.

---

## Doctrine T-2 — Penalty weights must reflect realistic dollar-loss expectation

**Statement.** Each penalty rule's point deduction should correlate with the dollar-loss-per-incident the pattern predicts. A −15 penalty implies the pattern, when triggered, predicts roughly 15% expected loss-of-position relative to baseline.

**Current calibration (v1.0):**

| Rule | Penalty | Implied loss expectation |
|---|---|---|
| FDV_GAP_PENALTY (>5x) | −15 | Large insider supply unlocks ≈ 15-30% dilution shock |
| FDV_GAP_PENALTY (>3x) | −8 | Moderate insider supply ≈ 8-15% dilution risk |
| CONTRADICTORY_AUDIT | −20 | Source conflict ≈ 20% probability the worse claim is correct |
| SECURITY_PENALTY (honeypot) | −50 | Honeypot = total loss-of-principal risk |
| SECURITY_PENALTY (>2 flags) | −25 | Multiple flags = compounding risk |
| LIQUIDITY_CROSSREF (<10K) | −20 | Low liquidity = high slippage + manipulation risk |
| VOLUME_THRESHOLD (<5K) | −15 | Low volume = inactive market, illiquid exit |
| GHOST_VOLUME (wash trading) | −20 | Wash trading = volume metric is fake, real liquidity unknown |
| CTO_FLAG | −10 | Community takeover = no team accountability for code, latent bugs unpatched |
| VOLUME_LIQUIDITY_RATIO (>10x) | −15 | V/L spike = pump or wash trading |

**Recalibration trigger.** If a rule's anchor list (per `Token-Rug-Patterns.md`) shows >10% false positive rate over 50+ applications, propose weight adjustment. Operator approves weight changes.

---

## Doctrine T-3 — Hedge Brain personas resolve scoring ambiguity, not override deterministic rules

**Statement.** The 4-persona Hedge Brain debate (Degen / Whale / Institutional / Community) is invoked AFTER the 11 rules execute, never before. Personas weight the final classification (HOT / QUALIFIED / WATCH / SKIP) when the raw score lands near a band boundary (e.g., 69/70 or 84/85). Personas DO NOT override instant-kills or penalty calculations.

**Persona weights (v1.0 — calibration pending real data):**
- **Degen** — favors high-volume + high-volatility + meme-narrative tokens (+5 boost if narrative-fit)
- **Whale** — favors high-liquidity + low-FDV-gap + token-distribution-spread (−5 if concentrated)
- **Institutional** — favors clean-audit + age > 90d + multi-chain deployment (+3 if audit-clean)
- **Community** — favors active Twitter/Telegram + CTO transparency + non-team-doxxed-positive (−5 if CTO with no contract changes)

Persona invocation logged for audit. Persona overrides logged separately.

---

## Doctrine T-4 — Cross-pillar penalty rules (Pillar 4 → Pillar 1)

**Statement.** When Pillar 4 bug research confirms an exploit pattern AT THE CONTRACT LEVEL, that pattern can produce a new Pillar 1 penalty rule IF the pattern is detectable from on-chain/DexScreener data without source-code inspection.

**Examples of cross-pollination candidates (v1.0, pending implementation):**

| Pillar 4 finding | Pillar 1 penalty rule candidate | Detectability |
|---|---|---|
| DC-9 sub-1 unchecked-mint | "Owner can mint unlimited supply" — query token's owner permissions on-chain | DexScreener does not expose; needs Etherscan source check |
| DC-9 sub-3 upgradeable-hook-no-timelock | "Upgradeable proxy with no timelock" — query proxy admin slot | Etherscan source + storage slot read |
| DC-12 oracle staleness | "Oracle-dependent without staleness check" — detect by source-grep | Source-level only; not Pillar 1 candidate (too expensive per-scan) |
| CANDIDATE-T approval drain | "Router approval drainable" — detect by approval-pattern recognition | On-chain via approval events; queryable |
| TRP-3 Ghost Token + DC-13 honeypot | "Honeypot mechanism with mint disabled" — direct GoPlus/RugCheck integration | Already covered by SECURITY_PENALTY but weight could increase |

**Promotion path:** every Pillar 4 Gate 2 CONFIRM should be evaluated for this list. If a candidate is detectable on-chain, propose new TRP-N rule. Operator approves.

---

## Doctrine T-5 — Market-condition reliability degradation

**Statement.** Some scoring signals are reliable in calm markets but break in extreme conditions (memecoin mania, broad rug season, post-incident panic). Track these conditional degradations.

**Known degradations (v1.0):**

- **VOLUME_THRESHOLD** unreliable in launch-day windows (first 4h post-deploy) — high volume from sniping bots ≠ organic demand. Mitigation: AGE_BONUS already gates against this (no bonus until day 90).
- **LIQUIDITY_CROSSREF** unreliable when DexScreener lags chain reorgs — temporary spikes/drops in pool liquidity. Mitigation: triple-verification rule (per `BUZZ_RULES.md` #1) reads liquidity from 3 sources.
- **CTO_FLAG** unreliable when project intentionally rebrands but retains original team — false CTO flag from auto-detector. Mitigation: operator override available.
- **GHOST_VOLUME** unreliable on BSC during peak meme cycles — many tokens have legitimately concentrated trader bases that mimic wash trading. Mitigation: cross-reference with social signal (Twitter mention frequency).

**Maintenance.** When a false positive is identified, append to this section with: rule, market condition, mitigation strategy, anchor count.

---

## Doctrine T-6 — Triple verification is non-negotiable (per BUZZ_RULES.md #1)

**Statement.** No score surfaces without 3 independent verifications: DexScreener + CoinGecko + Internal DB. Contract address is primary key — never name/symbol. Chain mismatch = instant QUARANTINE.

**Why this is doctrine, not just a rule.** Single-source data is hostile to scoring discipline. A liquidity number from one API can be off by 10x; a price from one source can lag by minutes. Three-source verification is the scoring engine's INDIVIDUAL-TRUST-CRITICAL discipline analog to Pillar 4's R8 evidence-grade tagging.

**Worked example (v1.0 placeholder):** When score-tweets are generated, the v2.2 liquidity floor check ($50K) must use the lowest of the three sources (not the highest, not the average) — anti-manipulation default.

---

## Doctrine T-7 — Pillar 1 ↔ Pillar 4 escalation triggers

**Statement.** Three escalation triggers from Pillar 1 to Pillar 4 emergency Gate 1 dispatch:

1. **Serial rug-deployer** — deployer address has 3+ tokens scored <30 (via `brain/Deployer-Crossref.md` promotion to ELEVATED) AND deployer has admin authority on ANY Lane 5-scoped contract → emergency Pillar 4 Gate 1.
2. **Contradiction-pattern flag** — token scoring TRP-4 (contradictory audit) where the conflicting source is an audit firm Buzz has prior anchor confidence in → enhanced Phase 0 dedup pass before any Lane 5 cross-reference.
3. **Cross-deployer overlap** — Lane 5 scope-target's admin wallet shows TRP-3/5/9 flags on its other deployed tokens → flag protocol governance risk to Pillar 4 surface map (5-target checklist Admin/Upgrade slot).

These triggers fire at Pillar 1 cron output. Pillar 4 receives the escalation as a NEW Gate 1 candidate, queue-priority HIGH.

---

## Doctrine T-8 — Scoring is descriptive, not advisory

**Statement.** Per BUZZ_RULES.md and `tweet-on-score.md` v2.2, scoring outputs are DATA, not RECOMMENDATIONS. Every published score must include the NFA (not financial advice) framing. This is doctrine, not just legal cover.

**Why this is doctrine.** A 100/100 score is not "buy this token." It is "this token passed honest calibration on 31 sources with 1000-agent swarm verification." Same for low scores — a 12/100 is not "sell" — it is "this token failed N rules; here's which ones." The reader makes their own choice.

**Operational implication.** Every cross-pillar feed must preserve descriptive framing. A Pillar 4 confirmed exploit feeding back to Pillar 1 as a new penalty rule is FACTUAL CALIBRATION, not policy advice.

---

---

## Doctrine T-4 cross-pillar clarification — Notification-hook tokens are NOT automatically penalized

**Pillar:** P1 (token scoring) ← cross-pollination from P4 DISC-020 closure
**Anchored:** 2026-05-28 — DISC-020 Filecoin #79987 CLOSED NOT-A-BUG productive closure

**Rule:** When applying a Doctrine T-4 penalty derived from a Pillar 4 defense pattern, check whether the candidate token's "callback" / "notification hook" / "event listener" surface controls economic state OR is merely informational.

- **Notification-hook tokens with INFORMATIONAL hooks** (events emitted for off-chain observers; return values logged but not consumed for authorization) → NO penalty. The hook is descriptive metadata, not an exploit primitive.
- **Notification-hook tokens with AUTHORIZATION hooks** (callback return values consumed by transfer/mint/burn/credit logic; receiver-controlled state mutation) → apply Doctrine T-4 penalty per the matched P4 defense pattern.

**Cross-reference:** Doctrine #39 CANDIDATE in `brain/Doctrine.md` (Notification Path ≠ Authorization Path) + DC-13 sub-pattern 5 in `brain/Patterns-Defense-Classes.md` (notification-callback-informational-only Phase 0 FORECLOSE gate).

**Operational implication:** When the scoring engine flags a token for "has callback hook / notification mechanism", run a Phase 0 check on the hook's economic-outcome path before adding a penalty. If informational-only, no penalty applies even if the surface SHAPE matches a P4 attack-class pattern.

**Anchor:** DISC-020 Filecoin FIP-0109 — the `notify` field shape matched a callback-attestation pattern, but the authorization path (`batch_claim_allocations` to verified registry actor) was separate; FIL+ economic outcome controlled by the authorization path independently. Same shape, opposite outcome.

---

_Brain Token Scoring Doctrine | v1.1 | 2026-05-28 | 8 doctrines + T-4 cross-pillar clarification (notification-vs-authorization-path check before applying P4-derived penalty). Cross-pillar entry from DISC-020 productive closure. Cross-references: `brain/Token-Rug-Patterns.md`, `brain/Deployer-Crossref.md`, `brain/Doctrine.md` Doctrine #39 CANDIDATE, `brain/Patterns-Defense-Classes.md` DC-13 sub-5, `BUZZ_RULES.md`._
