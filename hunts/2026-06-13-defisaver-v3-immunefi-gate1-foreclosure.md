# DeFi Saver V3 — Immunefi Gate-1/Gate-2 FORECLOSURE (NEGATE)

- **Date:** 2026-06-13 (Opus 4.8, ultracode/xhigh; P4 hunt-loop tick 1)
- **Target:** DeFi Saver V3 contracts — `github.com/defisaver/defisaver-v3-contracts`
- **Program:** Immunefi `immunefi.com/bug-bounty/defisaver` — Critical up to **$350K** (10% of funds affected, **$50K min floor**), High flat $30K, Medium flat $10K. **no-KYC. Primacy of Rules.** Solidity 0.8.24. Live since 2021-04-21, scope last updated **2025-09-24**.
- **Selection:** corrected recency-first scorer #1 (THIN, realizable_ev ~$26.5K). No prior Buzz hunt, no ledger entry.
- **Verdict:** **NEGATE** — clean operator-custodial-style foreclosure for permissionless direct-loss. 0 candidates / 0 survivors across 11 lenses + 2 separate-context completeness passes. NO PoC warranted (nothing permissionless to move funds).

## GATE-0 (PASS → proceeded to full audit)
- bounty-live ✓ · dedup (no prior hunt / no ledger) ✓ · realizable-EV ($50K floor min, $350K cap) ✓ · egress N/A (direct-loss program, not a recovery bounty, Doctrine #62 n/a).
- **Doctrine #65 recency-risk (5-yr-old protocol) MITIGATED at GATE-0:** scope re-added 2025-09-24 (whole repo ex-mocks/views), EIP-7702 app support Aug-2025, fresh Aave V4 adapters, latest commit 2026-06-09. Genuine fresh surface → not a manufactured mature-target; full audit justified.

## Known-issues corpus (Step 4.5 dedup — 4 in-repo audit PDFs, 32 findings)
- **0 Critical/High in any audit** (Dedaub Strategies Jan-2022, Dedaub Safe-Update Feb-2024, Optimum TxSaver Jun-2024, Optimum BytesTransientStorage Apr-2024).
- **ACCEPTED / won't-fix (treat as OOS known):** oracle/price STALENESS everywhere (L2 sequencer-uptime M1, TokenPriceHelper staleness M2, LiquityRatioHelper L3, Chainlink no-freshness A4); LlamaLendSwapper reentrancy RESOLVED (nonReentrant); TxSaver fee double-charge/evasion (#04/#05) backend-enforced OOS; TempStorage control-flow-hijack assessed safe under EOA-bot assumption; admin centralization (DFSRegistry no-min-waitperiod, AdminAuth fund-retrieval/selfdestruct, whitelisted-bot trust, smart-wallet no-direct-custody).

## Architecture (the foreclosure spine) — [INSPECTED]
Actions + `RecipeExecutor` run via **DELEGATECALL in the user wallet's storage context** (DSProxy | DSAProxy | SFProxy | Safe). Two execution entries:
1. **Manual** `executeRecipe` — owner-gated → self-inflicted only.
2. **Automation** Bot → `StrategyExecutor.executeStrategy` → `BotAuth.isApproved` (**DFS-centralized**) + `keccak256(_sub)==strategySubHash` (full sub pinned) + `isEnabled` + `ProxyAuth/SafeModuleAuth.callExecute` (`onlyExecutor`) → wallet delegatecall `executeRecipeFromStrategy`.
- The **only free (non-hash-pinned) caller input** on the automation path is bot-supplied `_triggerCallData` + `_actionsCallData`; `paramMapping` decides bot-supplied vs `_sub.subData`-pinned vs return-value params. But the **caller must be a BotAuth-approved (centralized) bot** → any trigger/checker/paramMapping imperfection is at-worst a DFS bot mis-fire ⇒ operator-trust (**Doctrine #66/#61**).

## Audit coverage (2 rounds, 14 agents, separate-context)
**Round 1 (6 lenses):** strategy-auth · EIP-7702/wallet-confusion · DC-5 sig-replay · FL/exchange-slippage · fresh-adapters A (eulerV2/morpho-blue/pendle/fluid/renzo/etherfi) · fresh-adapters B (sky/liquityV2/summerfi/lsv/llamalend/merkel/insta). → **0 candidates.** Completeness critic flagged uncovered triggers/checkers/legacy-adapters/L2.
**Round 2 (5 gap lenses):** triggers (38) · checkers (18) · residual-approval + legacy `*WithSig` · strategy/bundle registration · L2 variants. → **0 candidates.**

### Examined & FORECLOSED [INSPECTED]
- `RecipeExecutor` both paths; `_checkTriggers→updateSubData` runs in victim's own delegatecall context (msg.sender==walletAddr ⇒ `onlySubOwner` self, not poisonable); `executeActionsFromFL` only reachable inside the closed `_givePermissionTo` FL-window for that one FL action.
- `SubStorage` mutators all `onlySubOwner`; `subscribeToStrategy` records a hash keyed to msg.sender (no foreign effect).
- `ActionBase.executeAction/Direct` public but **harmless by design** — direct call on the action singleton has `address(this)`=empty singleton (no victim funds/approvals).
- `TokenUtils.pullTokensIfNeeded` (`safeTransferFrom(_from,address(this),..)`) drains only if a victim left a **standing ERC20 approval to a stateless singleton** — repo-wide grep found **ZERO** such patterns. Residual-approval class structurally foreclosed.
- `*WithSig`/permit (AaveV3/V4, Spark, MorphoBlueSetAuth, PermitToken) consume the **user's own EIP-712/2612 sig** (no new authority); PermitToken nonce check blocks front-run grief.
- Strategy/Bundle registration `onlyAuthCreators` (openToPublic=false); even if opened, a malicious strategy is inert unless a victim subscribes AND a DFS bot executes it against the victim's own paramMapping ⇒ operator-trust.
- Triggers (38): `isTriggered` reads pinned `_subData`, not bot `_callData`; imperfection = bot mis-fire (operator-trust); staleness = accepted-OOS.
- Checkers (18): `CHECK_ACTION` self-guards on `address(this)`; defeating one = self-harm only.
- L2 variants: same BotAuth + subDataHash + onlySubOwner invariants.
- **Deepest near-miss — legacy `utils/transient/TransientStorage.sol`:** a **PERSISTENT, permissionlessly-writable** `mapping(string=>bytes32)` (NOT EIP-1153) holding ratio start-values cross-tx. Saved because the paired ratio Trigger **writes the fresh value at recipe-start in the SAME tx, clobbering any attacker pre-seed before the Check reads it** (automation path); manual path the Check is a self-guard. Newer code uses true-transient `TransientStorageCancun`. → no foreign victim. [INSPECTED]

### Still-unexamined (structurally foreclosed, disclosed for honesty) [ASSUMED]
Line-by-line internal arithmetic of ~150 individual adapter actions (aaveV3/V4, compound(V2/V3), mcd, curveusd, uniswap, yearn, lido, etherfi, renzo, morpho-blue, eulerV2, fluid, pendle, sky, liquity(V2), spark, llamalend, lsv, summerfi). The delegatecall + no-standing-singleton-approval invariant forecloses the permissionless-direct-loss class for the whole set — any residual bug is self-inflicted or bot-only UNLESS it (a) creates a standing singleton approval or (b) exposes a non-ActionBase public mutator on shared state; neither found in targeted greps. TxSaverExecutor/DFSExchangeWithTxSaver internals (gated at entry); DFSRegistry timelock (admin/accepted-OOS).

## FLAG rubric check
in-scope ✓ · not-known ✓ · not-dup ✓ · **permissionless ✗** · **direct-loss-to-victim ✗** · realizable>floor ✓ · [EXECUTED] n/a · PoC-moves-funds ✗ → **NO FLAG. NEGATE.**

## Lenses banked → Doctrine #68 (operator-custodial-recipe-executor class). Clone purgeable.
