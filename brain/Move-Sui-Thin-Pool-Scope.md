# Move/Sui — Thin-Pool VM Scope (SCOPING ONLY — do NOT build until reviewed)

> Ogie msg 8108 TASK 5. Deliverable = scope doc. ONE VM at a time; Clarity harness was stood up this week — do not start Move until this is greenlit. Selector = Doctrine #45 (audit/competition-density).

## Why Move/Sui is the best generalization of the Clarity edge

- **Thin auditor pool** (vs EVM's saturation): Move auditors are few (OtterSec, MoveBit, Zellic, Asymmetric). Search ground-truth: _"Scallop had audits from OtterSec and MoveBit but those reviews missed the edge case an attacker exploited"_ — exactly Doctrine #45 (thin-pool audits miss things → high-p for the first competent reader).
- **Large TVL + active bounties:** Suilend + NAVI are the top Sui TVL; Sui Protocol bounty = $1M (HackenProof) + Immunefi. Real W.
- **Move's object/resource model** is unfamiliar to most EVM researchers → competition-density is structurally low even on funded targets. This is the edge.

## Harness needed (the Gate-2 [EXECUTED] path)

- **Primary: `sui move test`** — Move's native unit-test framework (local, no network), the clarinet-sdk-simnet equivalent. Runs Move modules + `#[test]` functions deterministically. Sufficient for pure-logic findings (share accounting, liquidation math, CLMM tick math) — the bulk of our arsenal.
- **Install:** the `sui` CLI binary (Rust build, `cargo install --git ... sui` or a release binary) — ~30-60min + disk (FLAG vs the 87% disk ceiling — pairs with the Task-1 Hetzner-volume rec). No bitcoin/devnet needed for unit tests.
- **Signing/PoC differences vs EVM/Clarity** (the learning cost, like the Clarity signMessageHashRsv discovery): Move uses an **object-centric model** (owned/shared objects, the `TxContext`, `&mut` references, the one-time-witness pattern, `public entry fun`). PoC = a `#[test]` module that constructs the protocol's objects via test-scenario (`sui::test_scenario`) and drives entry functions. No secp256k1-signature gymnastics (Move auth is object-ownership + capabilities, not signatures) → arguably SIMPLER PoC auth than the Arkadiko oracle.
- **Integration tier (optional, heavier):** `sui-test-validator` local network for cross-object/shared-object-contention findings; defer unless a finding needs it.

## Gate-0 corpus sources (build-on-engagement)

- In-repo `/audits` (OtterSec / MoveBit / Zellic reports — acknowledged/accepted findings).
- HackenProof Sui Protocol + Immunefi/Cantina per-protocol program pages (OOS + known + previously-reported).
- Sui **Move Prover** specs in-repo (`spec { }` blocks = the team's own proven invariants = the foreclosure set, like Arkadiko's operating_conditions.md).
- Sui framework `SECURITY` + the Move bytecode-verifier known-limitations.

## 3-5 candidate first targets — ranked by density selector (ascending = top)

| Rank | Target                     | Type           | Audit/competition density                                         | Arsenal fit                                             | Why                                                                                |
| ---- | -------------------------- | -------------- | ----------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1    | **Bucket Protocol (BUCK)** | CDP stablecoin | LOW (thin — verify audit count + bounty at scope)                 | CDP/liquidation/oracle (Granite/Arkadiko lenses) DIRECT | CDP = our hottest lending arsenal; smaller than NAVI/Suilend → thinner competition |
| 2    | **Suilend**                | lending        | MED (has own bounty; Solend-port = some prior-art)                | ERC4626-analog share + liquidation 3-guard              | funded bounty, "prevent theft/freeze" scope; lending arsenal                       |
| 3    | **NAVI**                   | lending + LST  | MED-HIGH (largest TVL = most competition)                         | LST share + lending                                     | high W but higher competition; opportunistic-leaning                               |
| 4    | **Scallop**                | lending        | OPPORTUNISTIC (just exploited $142k flash-loan → now scrutinized) | flash-loan invariant                                    | post-exploit scrutiny ↑; only on a fresh-diff signal                               |
| 5    | **Cetus / Turbos / Kriya** | CLMM/CLOB DEX  | OPPORTUNISTIC (Cetus $220M exploit May-2025 → max scrutiny)       | CANDIDATE-D CLMM tick (Bitflow-DLMM-adjacent)           | CLMM tick-math fits, but Cetus is now the most-watched Sui contract                |

**Default first target if greenlit: Bucket Protocol** (thinnest + direct CDP arsenal fit) — pending Step-1 scope/bounty/audit-count verify.

## Effort estimate

- **~1-2 days for the first target** (mirrors the Clarity harness stand-up this week): install `sui` CLI (~1h) → learn `test_scenario` object-construction idioms (~half-day, the real cost) → first Gate-0 corpus build + a harness-validation `#[test]` (deploy + drive one entry fn) → then Gate-1 on Bucket. Subsequent targets: near-zero marginal tooling (same pattern as Clarity Bitflow→Arkadiko).
- **Disk:** `sui` binary + a cloned Move repo ~ a few hundred MB → pairs with the Task-1 Hetzner-volume recommendation; do not provision the harness onto the 87%-full root without the volume.

## STATUS: SCOPED — STOPPED. Awaiting Ogie's go before building. (Doctrine #45 + [[reference_clarity_poc_harness]] for the analogous harness recipe.)
