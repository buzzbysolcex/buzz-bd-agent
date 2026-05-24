# Lane 1.5 — Deployment-Dependent Vulnerability Hunting

> Initialized 2026-05-15 from CG-#23 build + L1b-1089 Reserve survey (ROUTE_B_ALL_SAFE).
> Methodology proven end-to-end against the Reserve Curve read-only reentrancy class.

---

## The thesis

Pattern-matching detectors (Layer 1-4) miss vulnerabilities where the code looks fine in isolation but the bug lives in **deployment configuration**. The L1b-1089 finding revealed the class:

- `CurveStableCollateral.sol:185` calls `get_virtual_price()` WITHOUT a `claim_admin_fees()` precall
- In isolation this is a read-only reentrancy vector against any Curve pool that involves ETH or WETH
- BUT: the comment at `PoolTokens.sol:12` documents the defense as deployer-applied — "use with ETH / WETH pools"
- The vulnerability is real ONLY IF a live deployment uses this collateral class with an ETH/WETH pool AND doesn't have the defense

Pattern-matching can't reach this. The code is correct. The vulnerability is in deployment config.

---

## The two-stage methodology

### Stage 1 — Protocol Documentation Scan

Scan target repo for documented deployment-time defenses:

- Comment patterns: `// use with X`, `// must apply X`, `// trusted deployer`, `// recommended for X`
- NatSpec: `@custom:security`, `@dev` with deployment keywords
- Doc text: README/Markdown mentioning deployment requirements

Filter noise via:

- Test/example/SPDX/OZ-import exclusion
- Real-condition keyword requirement (eth/weth/pool/admin/oracle/etc.)
- Function-context extraction (which function does the comment describe?)

Output: ranked list of `{defense_id, defense_signature, conditions, references}`.

### Stage 2 — Deployment Survey

For each documented defense + a Skeptic-surviving finding tagged DEPLOYMENT_DEPENDENT:

1. **Enumerate live deployments** — parse address manifests (Reserve: `scripts/addresses/*.json`), or query on-chain registries.
2. **Per-deployment defense check** — for each deployment, determine whether the defense's `condition` applies (e.g., "ETH/WETH pool" → JSON-RPC `eth_call coins(uint256)` on the pool).
3. **Per-deployment defense application check** — does the deployment's collateral class actually apply the defense? Trace inheritance, grep source for canonical or NG-variant defense patterns.
4. **Vulnerability matrix** — `{deployment, condition_applies, defense_applied, verdict: SAFE | DEPLOYMENT_DEPENDENT | REAL_FINDING}`.

Output route:

- **ROUTE A** — at least one deployment has `condition_applies=true AND defense_applied=false` → REAL FINDING, HOLD for operator
- **ROUTE B** — all deployments either don't need the defense OR apply it → DEPLOYMENT_DEPENDENT class confirmed, no live violation
- **ROUTE C** — data gaps preventing verdict → surface gaps + park for next cycle

---

## Validated test case (2026-05-15)

**Target:** Reserve Protocol
**Finding:** L1b-1089 — `CurveRecursiveCollateral.sol:177` / `CurveStableCollateral.sol:185` missing `claim_admin_fees()` precall before `get_virtual_price()`
**Outcome:** ROUTE_B_ALL_SAFE

Pipeline ran end-to-end via `buzzshield-deployment-classifier.js` + `buzzshield-deployment-survey.js`. 14 Curve deployments surveyed:

- 12 stable-only pools → defense not required → SAFE
- 1 ETH-involved pool (cvxETHPlusETH / ETHPLUS_BP / ETH+/WETH composition) → defense applied via NG-variant `IERC20(curvePool).totalSupply()` precall in `CurveAppreciatingRTokenFiatCollateral.sol` → SAFE
- 2 metapool deployments → pool address not resolvable in v1 → manually confirmed SAFE in ground-truth

Methodology output matched the manual ground-truth survey at `2026-05-15-reserve-rtoken-survey-l1b-1089.md` exactly.

---

## When Lane 1.5 applies

Look for these signals during V6 standard/deep audit:

1. A Pattern D `state_after_external_call` finding survives Skeptic with a confident ACCEPT
2. The flagged file has a sibling comment in the same Curve/oracle/AMM plugin directory referencing "deployer must" / "use with X" / "trusted deployer"
3. The protocol has a versioned deployment manifest (`scripts/addresses/`, `deployments/`, on-chain registry)

These three signals together = a Lane 1.5 candidate. The classifier runs end-to-end in ~2-5 minutes on a typical protocol; cost is low, upside is the first REAL finding from documentation-defense class.

---

## What Lane 1.5 does NOT cover

- Cross-contract config that lives entirely on-chain (no source-level documentation)
- Defenses applied by upstream protocols (Curve's NG variant lives in Curve, not the consumer)
- Trust-assumption violations that aren't documented in source

For these classes: build separate methodology. Lane 1.5 v1 is anchored on **source-documented** defenses.

---

## Build artifacts

- `/home/claude-code/.tmp-build/v6/buzzshield-deployment-classifier.js` — Stage 1
- `/home/claude-code/.tmp-build/v6/buzzshield-deployment-survey.js` — Stage 2 (Reserve-specific 2a + generic 2b + Reserve-tuned 2c + 2d)
- `/home/claude-code/.tmp-regression/test-cg23-stage1-classifier.js` — Stage 1 regression (5/5 pass)
- `/data/buzz/persistent/buzz-api/ground-truth/2026-05-15-cg23-l1b-1089-survey-clean.md` — first survey ground truth
- `/data/buzz/persistent/buzz-api/ground-truth/2026-05-15-cg23-survey-output.json` — per-deployment JSON

---

## Next protocol targets

When the next deployment-dependent candidate surfaces, generalize:

- Address-manifest parser: extend to Hardhat (`deployments/*.json`), Foundry (`broadcast/*.json`), and on-chain registries (e.g., Aave PoolAddressesProvider).
- Defense-condition interpreter: tokenize the condition string into a check-spec (e.g., "ETH/WETH pool" → `coins[i] in {WETH_set}`; "non-zero initial supply" → `totalSupply() > 0` at block N).
- Output-route formatter: ROUTE A surface to operator with PoC outline + 5-gate Gate 1-3 pre-pass.

---

_Lane 1.5 Deployment Hunting | v1.0 | 2026-05-15 (CG-#23 build complete, methodology validated against Reserve L1b-1089)_
