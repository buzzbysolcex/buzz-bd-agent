# Enzyme Onyx (protocol-onyx) — Immunefi FORECLOSURE (NEGATE)

- **Date:** 2026-06-20 (Opus 4.8, /loop P4 hunt tick 1) — the FIRST genuinely-fresh survivor after a long dry-pool stretch.
- **Target:** Enzyme Onyx — `github.com/enzymefinance/protocol-onyx` (commit 2026-05-13, ~6,117 LOC, Solidity, foundry).
- **Program:** Immunefi `immunefi.com/bug-bounty/enzyme-onyx` — Critical **$200K** (10% funds, $20K floor), **no-KYC**, Primacy of Impact. Live 2025-09-04, scope updated 2026-06-17.
- **Selection:** corrected recency-first scorer (Doctrine #70 code-recency) — GATE-0 PASS as genuinely-fresh (commit 2026-05-13) + **LIGHTLY-audited (ChainSecurity ONLY)** + in-capability + no-prior-hunt. Broke the fresh-but-saturated pattern (Royco 5 / Notional 9 audits).
- **Verdict:** **NEGATE** — operator-custodial-by-design (Doctrine #66). 0 candidates / 0 survivors (5 finders + completeness-critic, the critic independently traced & CONFIRMED — not an over-dismissal).

## Why NEGATE despite fresh + only-1-audit-firm
The decisive structural fact: **the share price the issuance queues + SyncDepositHandler settle against is a STORED admin-updated var (`ValuationHandler.lastShareValue`, returned by `getSharePrice`), NOT `balanceOf`/`totalAssets`-derived.** Consequences:
- **CANDIDATE-I (ERC-4626/7540 inflation/donation) structurally immune** — a donation to Shares does not move the price. AND explicitly **accepted-risk**: `Shares.sol:26-29` + CS-ONYX-011 ("Onyx intentionally does not protect against inflation/donation/low-shares-supply attack vectors") = KNOWN-NEGATE.
- **Pattern-E rounding** is uniform FLOOR-toward-the-vault in both deposit + redeem directions (`ValueHelpersLib`) → no attacker-favoring asymmetry.
- **Every value-moving / price-setting write is `onlyAdminOrOwner` or `onlyFeeHandler`** (executeDeposit/RedeemRequests, updateShareValue, setAssetRate, claimFees, addItem/addAsset/addCall).
- The genuinely-permissionless surface — `SyncDepositHandler.deposit`, `requestDeposit/redeem`, `cancel*`, `OpenAccessLimitedCallForwarder.executeCalls`, public factory `deployProxy`/init — each resolves to: (a) transacts only at an **admin-chosen price / admin-allowlisted selector**, (b) **atomic factory init** closing front-run (`SharesDeployer` + `ComponentBeaconProxy` + per-`msg.sender`-namespaced CREATE2 init-arg-bound), or (c) a **self-call / router / handler caller-gate** a naive grep misreads as permissionless (`WalletsManager.processMessageData msg.sender==this`; `FeeHandler.settleDynamicFees msg.sender==ValuationHandler`; `CreWorkflowConsumer.onReport msg.sender==KeystoneForwarder`).
- The 2 highest-EV net-new ideas (SyncDepositHandler first-deposit/staleness arbitrage; CRE permissionless-init front-run) are **pre-covered in the in-repo ChainSecurity QA** (Gate-0 KNOWN).

## Corpus (Gate-0 Step 4.5) — ChainSecurity only, but THOROUGH
~25-29 known issues across the main Dec-2025 audit (1 Crit/1 High/1 Med — all FIXED: CS-ONYX-001 FeeHandler downcast theft, -002 redeem exit-fee totalSupply inflation, -005 perf-fee HWM) + the May-2026 CCIP-wallet audit (4 info) + 2 QA passes (SyncDepositHandler, AddressList/TransferValidator/DepositQueue — explicitly NON-comprehensive). 10/29 entries = accepted-risk/OOS (inflation, 11-point admin assumptions, FoT/rebasing). Appended to `data/lane1/gate0/known-issues.json` key `enzyme-onyx`.

## FLAG rubric
in-scope ✓ · not-known: mostly known/accepted · **permissionless ✗** (all value-writes role-gated; price admin-set) · direct-PRINCIPAL-loss ✗ · realizable>floor ✓ · fresh-code ✓ · [INSPECTED] · PoC-moves-funds ✗ → **NO FLAG. NEGATE.**

## Lens banked → Doctrine #72 (custody-model GATE-0 check). FORECLOSE-to-watchlist (re-eligible if a permissionless settlement/keeper role is ever added). Clone purgeable.
