# Token-Fraud / Listing-Manipulation Red-Flag Taxonomy (BD-Screening)

> Authority: Ogie msg (2026-06-05), token-fraud compound. **Type: BD-screening / listing-intelligence — NOT a vuln-hunting detector.**
> Source event: ZachXBT community alert on Rain Protocol (RAIN), ~June 2026. **ALLEGATION, not adjudicated fact.**
> Primary beneficiary: the SolCex listing pipeline (reputational + regulatory protection).
> **Legal on-chain / OSINT ONLY.** No engagement with stolen-document solicitations or "any-means" bounties (Doctrine #56).
> **Allegation-discipline (Doctrine #55):** attribute named claims to source, label `alleged / flagged for scrutiny`, verify before asserting; never republish a third party's named-person/named-project accusation as Buzz's own finding.

---

## §1 — RED-FLAG TAXONOMY (each = a listing-screening SCORING SIGNAL)

| #   | Signal                            | Tell (legal, OSINT-checkable)                                                                               | Buzz can check today?                                               |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| F1  | **Mkt-cap / traction divergence** | high FDV or mcap vs negligible users, fees, real product                                                    | ✅ (mcap-vs-fees, DexScreener)                                      |
| F2  | **Self-referential / fake TVL**   | TVL composed of the project's OWN illiquid token                                                            | ✅ (TVL-composition check)                                          |
| F3  | **DAT / treasury without comps**  | large treasury announcement with no peer benchmark (Kalshi/Polymarket) to justify size                      | ✅ (OSINT, manual)                                                  |
| F4  | **Launchpad clustering**          | one launchpad repeatedly hosting flagged projects                                                           | ✅ (registry match, §2)                                             |
| F5  | **Fund-source overlap**           | deployer funds trace to shared CEX-deposit addresses / hot wallets tied to prior failed projects            | ⚠️ PARTIAL (registry address-match ✅; full multi-hop trace ✗ — §4) |
| F6  | **Address-linking tells**         | near-simultaneous dust transfers between otherwise-unrelated addresses; obfuscation via a common hot wallet | ⚠️ PARTIAL (single-hop ✅; clustering ✗ — §4)                       |
| F7  | **LP-based price manipulation**   | concentrated Uni V3 LP + spot transfers routed through a hot wallet                                         | ⚠️ PARTIAL (LP-concentration ✅; routing-trace ✗)                   |
| F8  | **Founder / team reuse**          | same operators across multiple failed / fraud-linked projects                                               | ✅ (registry name-match, §2)                                        |

## §3 — SCREENING-WORKFLOW INTEGRATION (the protective payload)

Wire §1 + the §2 registry into the SolCex listing-screening pipeline (`bd-screening` skill, 100-pt engine) as **auto-flags / score penalties / mandatory-HOLD triggers**. **Extend, do NOT duplicate** the existing rules (FDV-gap penalty, ghost/phantom exclusion, liquidity cross-ref).

- **NEW penalties (additive to the engine):** F2 self-referential-TVL = **−25 + auto-HOLD** (a project whose TVL is its own token is structurally fake-liquidity). F1 mcap/traction divergence = −15. F3 DAT-without-comps = −10 (flag). F7 LP-concentration = −10.
- **NEW auto-HOLD triggers (never auto-advance):** (a) any match to a §2 flagged-cluster address / launchpad / founder-name; (b) **≥ 3 red-flags** from F1–F8 on one prospect. → **HOLD + mandatory human review.**
- These extend the existing instant-kill / safety-fail layer; they do not replace it. A HOLD is a _route-to-human_, not a published accusation.

**Doctrine anchor (#53 LISTING-INTEGRITY):** a CEX that lists a manipulated / fraud-linked token inherits the reputational + regulatory hit. ZachXBT downgraded **Kraken S→B** for listing low-quality manipulated tokens (M, RAIN, RIVER, RAVE) without due diligence — the cautionary case. **SolCex is FinCEN-MSB-registered — the stakes are real.** Screening is a moat, not a formality.

## §4 — FORENSIC RECALL HEURISTICS — honest grade: RECALL, capability-gated

**What Buzz CAN do now (legal, today):** DexScreener liquidity / TVL-composition check (is the TVL the project's own token? F2), contract verification, mkt-cap-vs-fees divergence (F1), **§2 registry address/launchpad/founder match** (F4/F8 + single-hop F5/F6), Uni-V3 LP-concentration read (F7).

**What Buzz CANNOT do at ZachXBT grade:** full fund-source tracing through **CEX-deposit clustering + multi-hop obfuscation**. That needs an **address-intelligence data layer** (e.g., Arkham / Nansen / Chainalysis-class) — **NOT wired today.** Logged as Open-Q (#46) build-decision.

**No capability inflation:** Buzz surfaces recall signals + registry matches and **routes the deep trace to a human/analyst.** Buzz does NOT claim ZachXBT-grade investigation capability.

## §7 — GATE

Codify §1–§3 + §5 NOW (free, compounds, directly protects the listing lane). **Deep forensic tracing (§4) stays CODIFIED-NOT-OPERATIONAL** until the address-intel layer build-decision is made (Open-Q #46). The §2 registry + §1 single-hop/composition checks ARE operational today and wire into screening immediately.

**Honest capability read:** today Buzz can reliably catch F1/F2/F3/F4/F8 (divergence, fake-TVL, no-comps, registry/launchpad/founder match) and partially F5/F6/F7 (single-hop only). It CANNOT reproduce ZachXBT's CEX-cluster fund-source trace without an address-intel subscription. The registry (§2) is the highest-leverage cheap win — it converts one investigator's work into a permanent auto-HOLD tripwire for the whole listing lane.

_Cross-ref `brain/intel/flagged-clusters.md` (§2 registry), `.claude/skills/bd-screening/SKILL.md` (the engine), Doctrine #53–#56, `brain/Open-Questions-Tracker.md` #46._
