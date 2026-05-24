# People

## Core: Ogie (CEO, chef, Jeddah, AST, decides everything), Claude Opus 4.7 (brain), Buzz (agent)

## Partners: Noah AI/Plena (shield dApp), Aldo/@AIxAION (Wallet Guard), Pashov (MIT tools), Rising Leviathan (aibtc publisher)

## Contacts: Josip Volarevic (2x Colosseum winner), Paarugsethi (Frontier judge), Austin Griffith (ETHSkills), Vitto Rivabella (ERC-8004), Gary Palmer Jr (ATV)

## Gold: Toly reviewed PR #79. SEAL 911/Alex routed us to correct platforms.

## Closed: CometBFT (no more reports)

## HackenProof: 80 rep (profile complete 2026-05-08 by Ogie) — need 1 accepted High for 130+ rep. Public programs are all zero-rep eligible NOW; rep ladder unlocks 120-gated invitation programs (Sui $500K / KiiChain $10K). Next target: Aurora Web ($100K, zero-rep public, NEAR/EVM web+API). Queue after dYdX scan completes.

## Competitive intel — Pashov Discord (added 2026-05-11)

### 0xfirefist [PAG]

- Role: dedicated maintainer of `pashov/skills` repo; v3 (solidity-auditor) "incoming, soon" per Pashov
- Why it matters: closest peer to BuzzShield's detector pack — per-session AI advantage possible but lacks compounding brain / no cross-pollination
- Tracking: monitor pashov/skills releases, especially v3 solidity-auditor diff vs our #143/#159/#167/#142a/#142b/#178 detectors
- Threat tier: HIGH

### Antics [PAG]

- Role: Immunefi hunter building triage rulebook; Rust skill with e2e testing
- Loss: account closed-to-confirmed ratio (manual triage discipline angle)
- Why it matters: triage problem = publishable advantage for Buzz (our three-gate vs community manual rulebooks)
- Potential future community contributor (Lane 3 visibility, possibly Lane 2 if Rust-skill audit fits)
- Threat tier: LOW (collaborative-adjacent, not competitor)

### forefy

- Role: forefy.com/benchmarks operator; AI-triage 6-rule source (already in our #130 AI-Triage Simulator)
- Why it matters: opportunity — submit BuzzShield V6 to forefy benchmarks when scan results justify; credibility in Pashov's own community
- Tracking: monitor forefy benchmarks release cadence; queue submission after Hyperlane scan + 2+ verified findings
- Threat tier: LOW (benchmarker, not competitor; opportunity)

### Jason

- Role: forking ityfuzz (LLM + fuzzing hybrid)
- Why it matters: hybrid LLM+fuzzing class is adjacent to L1d Phase 4 + L4 Skeptic stack; monitor for technique we can absorb
- Threat tier: MEDIUM

### 0xShaedyW (Sir M. Shades)

- Role: compiled 2026 hack data → 58% unaudited stat
- Why it matters: data source for HSaaS marketing copy + landing page (Lane 2 fuel)
- Tracking: monitor for fresh data drops; cite "58% unaudited" with attribution
- Threat tier: NONE (data source, asset)

### blocksurfing [PAG]

- Role: building Clawbada (agent-first game on Base)
- Why it matters: potential HSaaS prospect if Base contracts reach commercial scale ($500K+ mcap, identifiable team, treasury)
- Tracking: monitor Clawbada launch + commercial scale; pitch when threshold met
- Threat tier: NONE (prospect, not competitor)

## Competitive threat ranking (refreshed 2026-05-11)

1. **pashov/skills v3 (solidity-auditor)** — closest peer, per-session AI advantage possible. No compounding brain = no cross-pollination = no surface-coverage moat. Maintained by 0xfirefist. ETA "soon".
2. **Cantina Apex** — private tooling, smaller models, cheaper. Hari says "not opus 4.7 nor gpt 5.5." Performance unknown; price-aggressive entrant.
3. **Certora static analysis** — rounding-errors-only; narrow scope; not a generalist competitor.

## Positioning risks (Pashov's "AI spam" tweet, market sentiment)

NEVER position Buzz as "AI solves security." Always lead with methodology, doctrines, ground truth, detectors. Doctrine #19 (methodology-as-product) + Doctrine #12 (static analyzer framing) are the correct defenses. AI is the engine; methodology is the moat.

## AIBTC contacts

### Opal Gorilla

- BTC: bc1q73ffx0fwtdvxhs6cfr5hguxsa3pasyg0txyae8
- STX: SP1EANQEQRHFYP4WHR1PHWDV25NAKGK143WV42ZN8
- Role: aibtc-network senior contributor, Editorial DRI (PAUSED 04-29 pending #654)
- Reputation tier: high
- Relationship status: warm, joint #675 v2 co-author (secret-mars endorsed §3+§4 at 2026-04-30T20:48Z)
- Active threads: #675 v2 Discussions-as-distribution (joint co-authored)
- Last contact (us → them): 2026-04-30T20:26Z (joint v2 ship msg) — 9 days
- Last contact (them → us): 2026-05-07T13:24Z (pause-mode update + v5-ship-status implicit ask) — 2 days unanswered
- Prior them → us: 2026-05-03T08:26Z (T+3d secret-mars endorsement update) — 6 days unanswered
- Re-engagement triggers: DRI seat reopens; v5 ship lands; Publisher 0-reply past T+30 → joint escalation
- Tone preference: mirror-grace, honest-shift, no-overclaim
- Value: gave us §3+§4 wedge endorsed by secret-mars
- DO NOT: pretend to still be hot on aibtc-network beat when focus shifted to BM/quantum/security research; he'll see through it
- Strategic context as of 2026-05-10: EIC trial ended #818 (04-29 thru 05-07), funding model under rebuild. Re-engagement triggers updated: (1) rebuild seat lands → ping me, decide v675 home; (2) v5 ships independent → cross-link with diff; (3) no rebuild in 30d → close v2 thread cleanly with postmortem.

### Other AIBTC peer threads (active per inbox 2026-05-09 21:50Z, all subject to triage tomorrow 09:30 UTC cron)

- Pure Cass / Orbital Kaia / Frosty Narwhal / Eclipse Luna / Steady Wisp / Tiny Marten / Solemn Kael
- All initial-contact tier so far; 5 of these received Buzz autonomous welcome msgs 2026-04-24
- Detail entries to be added after first substantive triage pass

## Primary Competitive Benchmark — AI-Led Bug Hunting (added 2026-05-13)

### GregoAI (@therealgregoai) — THREAT TIER: APEX

- **Stealth → public**: founded 2026 (~2 years stealth), launched publicly mid-May 2026
- **Founders**:
  - @0xriptide — security researcher, Arbitrum bridge bug hunter (400 ETH bounty), top-50 Immunefi
  - @0xitsgreg — built the reasoning system (CTO equivalent)
- **Capital signal**: $250K bounty live on HackenProof — the largest ever for an AI-discovered vulnerability
- **Method (claimed)**: "Deep Invariant Analysis" — traces logic across 7+ layers, sub-agent parallel exploration, sandbox PoC generation
- **Claimed finds**: vulnerabilities in Ethereum, Lido, Chainlink, Aave, Uniswap, Polygon — protocols that had been audited multiple times
- **Quote**: "There's a cognitive limit to how deep any human auditor can trace. About 4-5 levels. Most critical bugs live below that ceiling."
- **Why it matters**: GregoAI is the FIRST verified AI-led bounty operation at our scale of ambition. Not a peer — a benchmark we explicitly catch up to or differentiate from.
- **Our gap**: invariant analysis at 7+ layer depth. Currently we have Pattern A-H heuristic detectors (Phase 4 paired analysis, Phase 6 reentrancy, etc.) + Skeptic adversarial verification. We DON'T have multi-level invariant trace + symbolic execution at the depth they claim. Month 2-3 build target.
- **Our edge**:
  1. **Compounding brain** — `brain/` persistent memory across sessions. GregoAI presumably has institutional knowledge but no public artifact like our memory system.
  2. **Detector permanence** — every confirmed bug becomes a new detector, so future scans automatically catch the class. GregoAI's findings are one-off (no public detector library mentioned).
  3. **Scale curve** — they find $250K bounty per AI-discovered bug; we find many smaller findings + the detector compounds. At scale, compounding may win even on smaller-per-bug economics.
- **Strategic implication**: NOT Pashov anymore as primary benchmark. Pashov is human-led (with AI assist). GregoAI is AI-led with human pilot. Different category, different roadmap.
- **Tracking**: monitor @therealgregoai + @0xriptide + @0xitsgreg posts, monitor HackenProof $250K bounty status. Their first AI-discovered submission on a major protocol will be a public Doctrine event.
- **Narrative frame (strengthens chef story)**: GregoAI is CEO + CTO + security team + 2 years of runway. We are 1 chef + 3 months. The chef narrative DOESN'T weaken on comparison — it strengthens. The asymmetry is the point.

### AISLE — THREAT TIER: APEX (different domain, same class)

- **Track record**: 12/12 OpenSSL zero-days discovered by AI, 5 curl CVEs (3 of 6 in curl 8.18.0 release alone)
- **Method**: full-loop system — scanning → analysis → triage → exploit → patch generation → verification. Humans are "high-level pilots," don't do the discovery.
- **Why it matters**: AISLE proves the AI-led discovery thesis at production scale in C codebases (OpenSSL/curl). Crypto/Solidity is a different surface but the same architectural pattern applies.
- **Our positioning**:
  - AISLE is OS-security domain (no overlap with our bounty market) so NOT a direct competitor
  - But AISLE is a proof-of-concept for the model we're building in crypto: AI-led, full-loop, humans-as-pilots
  - Strategic citation: when pitching investors / partners, AISLE is the validation that the approach works
- **Tracking**: monitor AISLE blog / arXiv for methodology papers; watch for any crypto-domain expansion announcement
- **Strategic note**: if AISLE ever pivots to smart-contract audit, threat tier elevates to direct competitor. Currently they're proof-of-thesis.

### Competitive landscape summary (2026-05-13)

| Competitor | Domain         | Method              | Bounty scale (claimed) | Our threat tier |
| ---------- | -------------- | ------------------- | ---------------------- | --------------- |
| Pashov     | Solidity audit | Human + AI tools    | $5K-50K typical        | MED (peer)      |
| GregoAI    | Solidity audit | AI-led, invariant   | $250K headline         | **APEX**        |
| AISLE      | OS security    | AI-led, full-loop   | N/A (CVE-class)        | APEX (model)    |
| Buzz (us)  | Solidity audit | Heuristic + Skeptic | TBD                    | —               |

**Pillar gap analysis:**

- **Detection breadth**: Pashov ~equal, GregoAI ~deeper (claims invariant trace), AISLE not comparable
- **Permanence**: ONLY Buzz has compounding detector library (Doctrine #19) as a feature
- **Brain persistence**: ONLY Buzz has `brain/` memory across sessions as a public artifact
- **Track record**: Pashov has years, GregoAI has 2 years stealth + first bounty pending, AISLE has 12/12 OpenSSL. Buzz has 3 months operational + 0 verified bounty submissions.

**Roadmap implication (Month 2-3):**

1. Invariant analysis capability — bridge the GregoAI gap. Spec lift from `audit-methodology-v2.md` Phase 12 (Economic Invariants) into a deeper multi-step trace. Possibly LLM-augmented at Phase 8 access-control + Phase 12 invariants.
2. First verified bounty submission (Day 14+) — close the track-record gap. Hyperbridge re-scan post-Phase-4a-emit-fix is the highest-EV candidate.
3. Continue compounding brain advantage — every scan adds detectors, every detector compounds. By Month 6, advantage becomes structural.
