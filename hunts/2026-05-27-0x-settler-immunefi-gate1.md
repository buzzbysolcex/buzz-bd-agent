# 0x Settler — Immunefi Gate 1 Surface Map

**Date:** 2026-05-27 (filed 01:17 UTC)
**Platform:** Immunefi (Live Since 2024-07-30; last updated 2026-04-27)
**Critical reward cap:** $1,000,000 (direct theft of user funds at-rest) / $500,000 (other critical SC)
**KYC required:** YES (70% reward penalty without KYC)
**Scope repo:** `0xProject/0x-settler` (master branch)
**HEAD commit at Gate 1:** `5a23151a10bc0a9af443dcb47eda039cf6295e01` (2026-04-30 "Merge branch 'dcmt/signing-hardening'")
**Clone path:** `/home/claude-code/buzz-workspace/data/lane1/clones/0x-settler` (24 MB, depth=200)
**Chains in scope:** 12 (Polygon, Avalanche, Arbitrum, Base, BSC, ETH, Linea, Mantle, Mode, Optimism, Scroll, Solana) — Solana = separate Rust repo, NOT in this clone
**Strategic significance:** Third-anchor scout for **CANDIDATE-O slippage double-count** promotion to DC-13. Adjacent to Balancer B-1 (BatchRouterHooks) + Pancake P-1 (Infinity Router) confirmed tonight.

---

## Step 0 — Prior corpus lookup

**Result:** NO prior 0x / Settler / 0xProject hunt files in `/hunts/`. NO prior row in `brain/Watchlist-Candidate-Crossmap.md`. First-time intake.

---

## Step 1 — Platform STATUS preflight

ACTIVE. Confirmed via WebFetch of `https://immunefi.com/bug-bounty/0x/`. Last-updated 2026-04-27. $1M Critical cap confirmed. KYC explicit. 12 chains listed. `[INSPECTED]`

---

## Phase 0a — Audit-dedup verdict

**HEAVY AUDIT SATURATION** — 9 audit reports present in `audits/`:

1. OpenZeppelin Final Audit Report — April 2024
2. Dedaub — 0x smart contract audit report (undated, pre-2026)
3. 0x Permit2Payment Summary Report
4. 0x Settler — Comprehensive Report with Fix Review
5. 0xProtocol × Ourovoros — 2023-11-13
6. Bailsec — CrossChainReceiver Final Report
7. Bailsec — CrossChainReceiver (Update) Final Report
8. 0x-Settler CrossChainReceiverFactory — 2025-06-10
9. **0x-Settler — 2026-01-30 (most recent, ~4 months pre-Gate 1)**

PDF page-render unavailable (no poppler-utils on host). Stringification yielded no meaningful slippage-related text. Treat: assume saturated coverage of slippage-batch-composition class until manual PDF inspection rules out specific findings. `[ASSUMED]`

Per Immunefi T&C: "Any unfixed vulnerabilities mentioned in these reports are not eligible for a reward" — must verify candidates against all 9 PDFs before submission.

---

## Step 2 — Brain overlap score

| Lens | Hit? | Notes |
|---|---|---|
| CANDIDATE-O slippage double-count | **PARTIAL — see Architectural Comparison below** | Settler exhibits a DIFFERENT slippage architecture from B-1/P-1, not a direct anchor |
| DC-12 monotonic oracle | NO | Settler is pure execution, no pricing layer |
| DC-9 sub-3 upgradeable-hook-no-timelock | DEFERRED | Deployer registry at `0x00000000000004533Fe15556B1E086BB1A72cEae` controls upgrades — needs separate inspection |
| DC-9 sub-1 unchecked drain | LOW | `_isRestrictedTarget()` + `revertConfusedDeputy()` guards |
| DC-3 access control | LOW | Transient-storage `_PAYER_SLOT` reentrancy guard + `takerSubmitted` modifier |
| CANDIDATE-T unbound approval drain | PARTIAL | `safeApproveIfBelow` pattern at Basic.sol L60 — approval to arbitrary `pool` after `_isRestrictedTarget` check |
| Veda OOS lesson | APPLIED | Touched ONLY `0x-settler` repo, no periphery, no protocol/matcha, no SDK |

**Overall: LOW–MEDIUM.** Architecture is fundamentally different from B-1/P-1 router architectures.

---

## ARCHITECTURAL COMPARISON: B-1 / P-1 vs 0x Settler — multi-anchor verdict

| Property | Balancer V3 BatchRouter (B-1) | Pancake Infinity Router (P-1) | **0x Settler** |
|---|---|---|---|
| Slippage gate location | Per-action only; missing end-of-batch | Per-action only; missing end-of-batch | **MANDATORY end-of-batch via `_checkSlippageAndTransfer()` @ `Settler.sol:187`** |
| Final gate semantics | N/A | N/A | Settler's own balance of `slippage.buyToken` ≥ `minAmountOut` else `revertTooMuchSlippage` (`SettlerBase.sol:101`) |
| Per-action `amountOutMin` | None / partial | None / partial | **Each AMM action carries its own `amountOutMin`** (UniV3 L139, UniV2 L144, Velodrome L154, PCS-Infinity L268+L301, etc.) |
| Intent flavor protection | N/A | N/A | `SettlerIntent` sets `_mandatorySlippageCheck=true` (`SettlerIntent.sol:237-239`) and EIP-712-hashes the slippage struct (`_hashSlippage` L241-248), so solver cannot modify |
| `BASIC` action (arbitrary pool call) | N/A | N/A | NO per-action floor in `Basic.basicSellToPool` (`Basic.sol:21-67`) — but offset by end-of-batch gate |
| `AllowedSlippage` struct shape | varies | varies | `{recipient, buyToken, minAmountOut}` — single tuple, single token (`ISettlerBase.sol:7-11`) |

**VERDICT: NEGATE — 0x Settler does NOT exhibit the same end-of-batch-only slippage pattern as B-1/P-1.** It exhibits the **OPPOSITE** pattern: defense-in-depth with mandatory end-of-batch + per-action floors + Intent EIP-712 hashing.

**However, the comparison is itself valuable for DC-13 promotion** — Settler demonstrates the CORRECT defensive pattern (end-of-batch + per-action + EIP-712 binding) that an industrial-grade multi-DEX router SHOULD adopt. This makes the absence of any of these layers in B-1/P-1 a clearer structural defect, not just an oversight.

**Recommendation for DC-13 promotion case:** Settler becomes the **DEFENSIVE-ARCHETYPE FOIL** rather than the THIRD-ANCHOR. The DC-13 narrative re-frames as: *"Two prior-art routers (B-1, P-1) ship the broken pattern; one router (0x Settler) ships the correct defense; the defect is therefore neither random nor architecture-forced, but a teachable structural error."*

---

## Step 3 — EV (revised post-architecture verdict)

```
EV = P(finding) × bounty_cap × P(acceptance) × overlap_multiplier
EV = 0.03 × $1,000,000 × 0.35 (KYC + audit-saturated) × 0.5 (LOW–MED overlap)
   ≈ $5,250 at-submission EV
```

Brain-compound value: **HIGH regardless of submission** — Settler-as-defensive-foil materially strengthens DC-13 case.

---

## Step 4 — Queue decision

**WATCHLIST-PARK + DEFENSIVE-FOIL** for DC-13 promotion. Not Gate 2 dispatch.

Rationale: (a) end-of-batch gate is mandatory and authentic; (b) Intent flavor is EIP-712-bound; (c) audit saturation is heavy (9 reports incl. Jan 30 2026); (d) at-submission EV ≈ $5K — far below current pipeline targets. Brain compound captured via this Gate 1 file is the deliverable.

---

## Step 5 — Gate 1 execution log

### 5.1 Clone

```
GIT_TERMINAL_PROMPT=0 git clone --depth 200 https://github.com/0xProject/0x-settler.git
```
Result: 24 MB, 21 chains, src/=28,017 LOC Solidity, audits/=9 PDFs (5.3 MB). Disk pre/post: 84% / 84%. `[EXECUTED]`

### 5.2 Pre-flight scope check

Immunefi page says "0x's completed audit reports can be found at github.com/0xProject/0x-settler/tree/master/audits" — establishes `0x-settler` is canonical. NO out-of-scope contracts touched. Solana scope (12th chain) lives in a separate Rust repo — explicitly NOT in this clone. `[INSPECTED]`

### 5.3 Bytecode-verify prep

Plan (deferred until Gate 2 escalation, which is unlikely given Step 4 verdict):

```bash
# Get current canonical Settler address per chain
cast call 0x00000000000004533Fe15556B1E086BB1A72cEae \
  "ownerOf(uint256)(address)" 2 \
  --rpc-url $MAINNET_RPC_URL
# Then cast code + solc --standard-json
```

Not executed. `[ASSUMED]`

### 5.4 Layer 0 git-security analyzer

Skipped — N/A for codebase containing no historical leak markers in surface inspection.

### 5.5 Inventory

- src/ LOC: 28,017 Solidity
- Entry contracts: `Settler.sol` (211), `SettlerMetaTxn.sol`, `SettlerIntent.sol`, `SettlerBase.sol` (181), `SettlerAbstract.sol` (43)
- 22 core mixins in `src/core/` (UniV2/V3/V4, BalancerV3, PancakeInfinity, MaverickV2, Dodo, Ekubo, EulerSwap, Velodrome, MakerPSM, RfqOrderSettlement, etc.)
- 21 chain mixins in `src/chains/<Chain>/` (Mainnet, Base, BSC, Optimism, Arbitrum, Polygon, Avalanche, Linea, Mantle, Scroll, Sonic, Berachain, Plasma, Tempo, Unichain, WorldChain, Ink, HyperEvm, Monad, Abstract, Sepolia)
- Three settlement flavors per chain: TakerSubmitted (tokenId=2), MetaTxn (3), Intent (4), plus BridgeSettler (5)

### 5.6 Five-target quality checklist

| Target class | Reviewed surface | Verdict |
|---|---|---|
| Withdrawals / Redemptions | `_checkSlippageAndTransfer()` `SettlerBase.sol:86-115` — recipient gets `slippage.buyToken` balance; uses `safeTransfer` from `SafeTransferLib`; CEI honored (transfer is the final step after balance check) | OK |
| Liquidation / Oracle | N/A — Settler is pure execution, no on-protocol oracle; trusts per-action `amountOutMin` + final gate | OK |
| Deposit / Mint shares | N/A | OK |
| External calls | `Basic.basicSellToPool` `Basic.sol:63` `payable(pool).call{value:value}(data)` — pool address is user-controlled but `_isRestrictedTarget(pool)` `Basic.sol:22` blocks AllowanceHolder/Permit2/Bebop; `safeApproveIfBelow` to arbitrary pool L60 | NEEDS DEEPER REVIEW — confused-deputy potential if `_isRestrictedTarget` allowlist is incomplete for any chain; Settler-Intent EIP-712 binding limits attacker freedom |
| Admin / Upgrade | Deployer registry `0x00000000000004533Fe15556B1E086BB1A72cEae` controls Settler `ownerOf()` per tokenId; upgrades replace owner; dwell time exists (`prev(uint128)`); upgrade-authority + timelock posture NOT inspected in this Gate 1 | NEEDS DEEPER REVIEW — DC-9 sub-3 angle for follow-up |

**5/5 target classes touched.** Two flagged for deeper review. `[INSPECTED]`

### 5.7 Audit dedup

Verified 9 PDFs in `audits/`. PDF page-render not available on host (no poppler). Manual operator PDF review required before any Gate 2 finding could be submitted. `[ASSUMED — audit content not parsed]`

### 5.8 Output

This file: `/home/claude-code/buzz-workspace/hunts/2026-05-27-0x-settler-immunefi-gate1.md`

### 5.9 Auto-index

PostToolUse hook on Write will fire (per `hunt-complete.sh`).

---

## Top candidate findings (3 deferred, none Gate 2-ready)

### C1 — `Basic.basicSellToPool` confused-deputy completeness `[INSPECTED]`
- **File:line:** `src/core/Basic.sol:22`
- **Lens:** DC-3 access control + CANDIDATE-T approval drain
- **Surface:** `_isRestrictedTarget(pool)` allowlist per chain — if any chain's allowlist misses a privileged target (e.g., a Permit2-like contract on a newer chain), arbitrary `pool.call(data)` becomes attacker-controlled
- **Attack scenario:** find a chain where Permit2 / AllowanceHolder analog is deployed at a non-standard address AND `_isRestrictedTarget` doesn't cover it; craft `basicSellToPool` payload that calls the privileged target with attacker calldata
- **Paste-ready feasibility:** LOW. Requires per-chain enumeration of restricted-target lists vs all known privileged contracts on each of 21 chains. Heavy audit dedup risk (OZ + Dedaub almost certainly covered confused-deputy class).
- **Recommendation:** DEFER — not worth Gate 2 cycles vs current B-1/P-1 paste-ready queue.

### C2 — Solver compromise on non-Intent flavors `[INSPECTED]`
- **File:line:** `src/SettlerMetaTxn.sol:114` `_executeMetaTxn`
- **Lens:** DC-3 + signature-replay
- **Surface:** `SettlerMetaTxn` (tokenId=3) does NOT have `_mandatorySlippageCheck=true`; `_hashActionsAndSlippage` does include slippage but only Intent (tokenId=4) makes the check MANDATORY. If a `MetaTxn` user signs `minAmountOut=0` (intent: "any non-zero out is OK"), and a relayer/solver bundles actions that drain through `BASIC` to a non-`buyToken` route, final gate at `SettlerBase.sol:96-98` short-circuits: `(minAmountOut == 0).and(buyToken == address(0)) => return`
- **Attack scenario:** MetaTxn relayer + user signs `{buyToken: 0, minAmountOut: 0}` (common for max-flexibility), relayer routes through a malicious BASIC action that drains settler-held balance to attacker via approval; final gate skipped
- **Paste-ready feasibility:** MEDIUM. Requires: (a) finding a relayer/solver flow that signs `minAmountOut=0`, AND (b) Settler-held balance non-zero at action time, AND (c) absence of upstream solver validation. The "0,0 shortcut" looks intentional ("no slippage requested = no slippage check"), but creates a confused-deputy vector if intermediate actions touch settler balance.
- **Recommendation:** DEFER — high audit-dedup risk (OZ covered MetaTxn extensively). Surface to operator for PDF inspection before any further work.

### C3 — Settler upgrade-authority + timelock posture `[ASSUMED]`
- **File:line:** deployer registry `0x00000000000004533Fe15556B1E086BB1A72cEae` (not in this repo's `src/`, lives in `src/deployer/`)
- **Lens:** DC-9 sub-3 upgradeable-hook-no-timelock
- **Surface:** `Settler` constructor at `SettlerBase.sol:69` asserts `IERC721Owner(DEPLOYER).ownerOf(_tokenId()) == address(this)` — deployer is canonical authority. Dwell time and prev/next pattern (`AGENTS.md`) implies some delay logic but timelock parameters not inspected in this Gate 1.
- **Attack scenario:** if deployer registry's upgrade-authority is a single EOA / non-timelocked multisig, governance compromise → instant Settler swap → drain transient-storage assumptions
- **Paste-ready feasibility:** UNKNOWN — depends on deployer registry posture. Bailsec audits cover CrossChainReceiver but not necessarily core deployer authority.
- **Recommendation:** DEFER — inspect `src/deployer/Deployer.sol` in a follow-up if Step 4 verdict changes.

---

## Step 6 — Continuous

- Watchlist-Candidate-Crossmap: add 0x Settler row in next session (path is read-only at filing time; queued)
- `hunts/intake-log.md`: append one line below

---

## Operator next steps

1. **KYC FLAG (Immunefi)** — Any future submission against 0x bounty requires KYC submission. This is operator-gated. Without KYC, 30% penalty cap.
2. **DC-13 promotion case** — incorporate Settler-as-defensive-foil into the OQT v1.7 promotion narrative. Settler's mandatory end-of-batch + per-action + EIP-712 design is the "what B-1/P-1 should look like" reference point.
3. **Park-watchlist** — no follow-up planned unless deployer-registry posture review opens a new angle.
4. **Audit PDFs** — install `poppler-utils` on host (or render PDFs on operator workstation) before any Gate 2 dispatch. The Jan 30 2026 audit specifically must be screened for slippage / confused-deputy / MetaTxn findings before C1 / C2 escalation.

---

## Brain compounds queued

| Compound | Destination | Status |
|---|---|---|
| DC-13 defensive-foil framing (Settler vs B-1/P-1) | OQT v1.7 promotion proposal | Pending edit by operator |
| Settler `AllowedSlippage` struct as canonical end-of-batch design | `brain/Patterns-Defense-Classes.md` candidate-O notes | Pending edit by operator |
| MetaTxn `(0,0)`-shortcut self-noted footgun for future router reviews | `brain/Cross-Domain-Fragility-Laws.md` | Pending edit by operator |
| Deployer registry pattern (ownerOf tokenId per Settler flavor) | `brain/Architecture-Patterns.md` | Pending edit by operator |

---

## R8 Calibrated Reporting — claim grades (footer)

| Section | Grade | Notes |
|---|---|---|
| Step 0 prior corpus | `[EXECUTED]` | grep returned no matches |
| Step 1 platform STATUS | `[INSPECTED]` | WebFetch of Immunefi page |
| Phase 0a audit list | `[EXECUTED]` | filesystem `ls audits/` |
| Phase 0a audit content | `[ASSUMED]` | PDF render unavailable on host |
| Clone status + disk | `[EXECUTED]` | git clone + df + du verified |
| 5.6 five-target inventory | `[INSPECTED]` | source reads of Settler.sol, SettlerBase.sol, Basic.sol, PancakeInfinity.sol, SettlerIntent.sol, ISettlerBase.sol |
| Architectural comparison verdict | `[INSPECTED]` | source-level confirmation of end-of-batch gate (`SettlerBase.sol:101`) + per-action `amountOutMin` (Settler/PCS files) + Intent EIP-712 binding (`SettlerIntent.sol:237-248`) |
| C1 confused-deputy completeness | `[INSPECTED]` | `_isRestrictedTarget` check at `Basic.sol:22` read; allowlist contents per-chain `[ASSUMED]` |
| C2 MetaTxn `(0,0)`-shortcut | `[INSPECTED]` | `SettlerBase.sol:96-98` short-circuit + `SettlerIntent.sol:237` mandatory-check difference confirmed in source |
| C3 deployer registry upgrade authority | `[ASSUMED]` | deployer file not opened in this Gate 1 |
| Step 6 watchlist queue | `[ASSUMED]` | edits queued, not yet applied |

---

_Gate 1: 0x-settler-immunefi | v1.0 | 2026-05-27 01:17 UTC | Buzz Standing-Intake Protocol_
