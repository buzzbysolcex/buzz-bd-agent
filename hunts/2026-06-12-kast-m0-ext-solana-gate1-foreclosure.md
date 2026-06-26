# Gate-1 Foreclosure — KAST / M0 solana-m-extensions (Immunefi, Solana) — 2026-06-12

> Ogie msg 8250 (P4 REDIRECT, Solana-first). FIRST Solana audit. Step-0 harness proven, target-specific build proven. Auto-mode ANALYSIS-ONLY. Bismillah.

## SELECTION (Doctrine #65 recency + density, within Ogie's named Solana set)
Triage: onre (substantively foreclosed 2026-05-27, static HEAD — SKIP) · paradex (Starknet/**Cairo** — out of Anchor harness, [INSPECT]-only — SKIP) · kamino (clean but most-combed $1.5M — DEFER per Ogie) · **KAST = PICK** (freshest dedup-clean PoC-feasible Solana target: live 2026-04-20, Rust/Anchor, M0 `solana-m-extensions`).

## STEP-0 HARNESS (the [EXECUTED] gate)
- Generic: `anchor init` → BPF build → solana-test-validator → default test PASSED (real tx sig). solana-cli 4.0.1 + anchor 0.31.0 + cargo/rustc 1.94.
- **Target-specific `[EXECUTED]`:** `cargo build-sbf` on `m_ext` (scaled-ui variant) → `m_ext.so` (467KB) compiled clean in 64s despite the repo targeting solana 2.1.0 (we run 4.0.1). PoC build→load→run is feasible for THIS target.

## GATE-0 → PASS (with honest density caveat)
- bounty-live ✅ ACTIVE 2026-04-20 · dedup CLEAN (no prior Buzz hunt, not in ledger) · no live audit-contest ✅ · PoC-feasible ✅ ([EXECUTED]) · realizable-EV: Critical = 10% FaR, **MIN $21K floor, MAX $50K** — a real permissionless fund-loss clears the floor.
- **Density caveat:** 5 in-repo audits (Halborn ×2, OtterSec, Adevar ×2) + 5 disclosed known-issues (off-by-one multiplier conversions / retroactive fee / yield-loss-on-removal / mint-authority conflicts / unsupported mint-extensions) → hunted **net-new only**.
- Scope: `m_ext` (M-extension token, feature variants no-yield/scaled-ui/crank/wm) + `ext_swap` (1:1 swap between whitelisted extensions), ~4123 Rust LOC.

## AUDIT — 4 angles + 2-skeptic adversarial verify + completeness critic (separate contexts)
**19 raw candidates → 0 permissionless / 0 net-new survivor → NEGATE.** Critic independently re-read all 23 instructions + Monte-Carlo'd 2M (m_index, ext_index, amount) tuples on the rounding.

**The decisive structural facts:**
1. **The conversion library is round-DOWN-everywhere.** wrap AND unwrap both call `amount_to_principal_down` for BOTH the M leg and the ext leg → a wrap↔unwrap round-trip nets exactly 0 M (same amount, same index, same fn) and can only shed flooring dust. ext_swap::swap passes the **identical `amount`** to both CPI legs (unwrap-from-A then wrap-into-B) → intermediate M conserved to the unit; A→B→A only loses dust. The brain hypothesis "unwrap uses `principal_to_amount_UP`" was traced **FALSE** at the action site (webfetch-direction-error discipline held). The only `_up` calls (`claim_fees` required-collateral) raise the bar conservatively + are admin-gated. `[INSPECTED]` + 2M-tuple Monte-Carlo worst-case user gain = 0.
2. **m_ext wrap/unwrap are `wrap_authorities`-GATED (admin-managed allowlist), NOT permissionless.** The only fully-permissionless instructions are `scaled_ui::sync` (idempotent/monotonic/bounded — benign), `crank::remove_orphaned_earner` (admin-gated `!is_active` precondition), and `ext_swap::swap/wrap/unwrap` (whitelist-gated + value-conserving). The permissionless fund-extraction surface is structurally closed (Doctrine #59).
3. **CANDIDATE-K (f64 in `calculate_new_index` `powf`) NEGATES on Solana.** Every f64→u64 step is `.floor()/.trunc()` → biases the ext index DOWNWARD (vault-conservative, holders get slightly less — never over-credit); the ~1e-16 error floored can't compound into insolvency; the `require!` block enforces monotonic+bounded (≤100×); **BPF has no hardware FPU → f64 is softfloat-emulated → deterministic across validators in-consensus** (no cross-validator divergence). Not amplifiable via permissionless `sync` (early-returns when index unchanged; advance driven by external M-mint multiplier).
4. **No first-depositor/empty-vault inflation seam.** `initialize` sets `last_ext_index = 1.0` and requires `ext_mint.supply == 0`; the index is sourced from the external M-mint scaled-ui multiplier, **NEVER from a vault-balance/supply ratio** → the classic share-inflation vector is absent. (Solana analog of the BENQI seeded-market NEGATE.)
5. **Crank/earn:** all triggers privileged (earn_authority/admin/earn_manager) OR match disclosed known-issues; `claim_for` bounded by an enforced collateral invariant (`ext_supply+rewards ≤ ext_collateral`) + `AlreadyClaimed` + monotonic-index double-claim guard.
6. **Account-validation/CPI/DC-8:** the one structural anomaly (ext_swap stores `WhitelistedExtension.{mint,token_program}` but `swap/wrap/unwrap` re-check only `program_id`, not the stored mint) is **closed downstream** — `from_global/to_global` are PDA-derived (`seeds::program`) and m_ext's `Wrap/Unwrap` enforce `has_one=m_mint` + `has_one=ext_mint`, forcing user-supplied mints to equal the genuine per-program globals. Dead-field hardening note, impact=none.

## INFO-LEVEL HARDENING NOTES (net-new, NOT bankable — not submitted)
- **ext_swap dead-field re-validation gap:** `WhitelistedExtension.{mint, token_program}` stored but never re-checked in swap/wrap/unwrap (only `program_id`). Closed downstream by m_ext `has_one` → no impact today; defense-in-depth wart.
- **add_earner slot-squat griefing:** `add_earner` (earn_manager-gated, so trigger is privileged) has a no-user-consent slot-squat shape. Privileged trigger → OOS.
(Both could be a goodwill/hardening disclosure if Ogie wants; neither is a permissionless fund-loss. Operator-decide.)

## VERDICT — NEGATE (not submitted). No net-new permissionless fund-loss clears the $21K floor.
First Solana audit: harness + target build proven [EXECUTED]-capable, full pipeline run, honest 0/19. Well-audited target; disclosed known-issues + the round-DOWN-everywhere + authority-gated-mint architecture cover the surface.

## LENSES BANKED → Doctrine #67 (Solana share/index-token audit lenses)
1. **f64 in a Solana program is softfloat-emulated (no BPF FPU) → deterministic across validators in-consensus** — CANDIDATE-K's *cross-validator-divergence* sub-angle NEGATES on Solana by construction; only an *amplifiable, user-favorable-direction* f64 error banks, and a `.floor()`-ed (vault-conservative) f64 isn't it. Check the rounding DIRECTION of the f64→int step, not just "f64 is present."
2. **A round-DOWN-everywhere conversion library makes wrap/unwrap (and same-`amount` CPI-composed swap) round-trips net-zero by construction** — confirm BOTH legs call the down-rounding fn with the SAME index, and that any `_up` usage only raises a collateral/required bar (conservative). Then the Pattern-E extraction loop NEGATES.
3. **An index/multiplier sourced from an EXTERNAL mint (Token2022 scaled-UI) or a stored monotonic scalar — NOT from a vault-balance/supply ratio — has no first-depositor inflation seam** (Solana analog of the seeded-market lens; cross-ref BENQI #64, Ankr #63).
4. **In M0/Token-extension wrappers, the user-facing mint/burn (wrap/unwrap) is commonly `wrap_authorities`-allowlist-gated** — so the permissionless surface collapses to sync (benign) + the swap-router (value-conserving). Census the in-handler allowlist gate, not just the Anchor Accounts struct (Doctrine #59 at the handler level).
