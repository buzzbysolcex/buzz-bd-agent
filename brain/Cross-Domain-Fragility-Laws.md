# Cross-Domain Fragility Laws

> Defensive-intel ledger for public exploits that span multiple protocol domains (consensus, cross-chain bridge, off-chain signer set, governance, oracle). Each entry tracks the public facts, the third-party hypotheses, and the official root cause once a post-mortem confirms it. Mappings to BuzzShield methodology (DC catalog, L3.5 invariants, AION V2 families, Lane 1.5 deployment-dependent class) are filed as CANDIDATE until the official post-mortem closes the premise loop.
>
> Authority: Master Ops draft 2026-05-15.
> Workflow: same as Wasabi/Huma post-mortem intel filings.
> Cyber pause discipline: NO automated pipeline scans on the live code, NO exploit-chain construction, NO PoC scaffolding. Defensive analysis only — read the post-mortem, map to existing brain catalog, file ground truth.

---

## Schema

| Field             | Meaning                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Date**          | Exploit date (UTC)                                                                     |
| **Protocol**      | Target name                                                                            |
| **Loss**          | USD-equivalent drain                                                                   |
| **Domains hit**   | Comma-separated list (chains + components)                                             |
| **Public status** | INTAKE / HYPOTHESIS_TRACKED / POST_MORTEM_CONFIRMED / CLOSED                           |
| **Hypotheses**    | Third-party explanations + confidence level                                            |
| **Root cause**    | Filled in only after official post-mortem                                              |
| **DC mapping**    | CANDIDATE DC-N if exploit class fits existing taxonomy; promoted to DC catalog post-PM |
| **L3.5 mapping**  | Invariant family the bug violates (CANDIDATE pre-PM, promoted post-PM)                 |
| **AION mapping**  | Family # if applies (5 = cross-chain bridge, etc.)                                     |
| **Lane 1.5**      | Whether this is a deployment-gap class                                                 |
| **Tracking**      | URLs to monitor for official communication                                             |

---

## THORChain Bifrost — $10.8M cross-chain drain

**Date:** 2026-05-15
**Protocol:** THORChain (multi-chain liquidity protocol)
**Loss:** ZachXBT initial $10.7-10.8M figure; subsequent reporting suggests ACTUAL net loss ~$4.9M (some funds were drained-and-trapped vs drained-and-extracted). Tracking both numbers until official PM clarifies.
**Domains hit:** Bitcoin + Ethereum + BSC + Base; ETH Bifrost component (router/wrapper layer); Bifrost Attestation Gossip (signer-set component, per Blockaid hypothesis)
**Public status:** HYPOTHESIS_TRACKED (two distinct third-party hypotheses, official post-mortem PENDING — THORChain has promised one)
**Discovery:** community dev; halt triggered by anonymous-node voluntary halt-command, reaching 1/3+ node consensus → network-wide halt via decentralized action

### Public facts (cross-verified, 3 sources)

- Multi-chain drain across BTC + ETH + BSC + Base
- Mimir trading + signing halt activated for 12h 42m starting block 26190429
- RUNE token -12% on news
- ZachXBT first flagged

Sources:

1. BeInCrypto (ZachXBT alert): https://beincrypto.com/thorchain-exploit-stolen-funds-10-million/
2. CoinDesk: https://coindesk.com/tech/2026/05/15/thorchain-halts-trading...
3. BanklessTimes ($10.7M figure)

### Hypotheses (third-party, UNCONFIRMED)

Per Priority #0 VERIFY-PREMISE-FIRST: two distinct hypotheses are circulating. Neither is confirmed. Both must be tracked separately until official post-mortem collapses the premise.

**Hypothesis A — Blockaid (signer-set / consensus layer):**

- Root: proposer-forgery in Bifrost Attestation Gossip
- Mechanism: signature scope mismatch — validators didn't sign inbound/outbound bit
- Fix: existed in commit `af46db22` from 2026-05-06 (9-day deployment gap pre-exploit)
- Confidence: third-party security firm with prior bridge expertise; not corroborated by THORChain
- Class: signature-scope-must-cover-outcome-bit (specialization of #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES)

**Hypothesis B — initial reporting (ETH Bifrost override-mechanism abuse):**

- Root: ETH Bifrost tricked via custom wrapper contract
- Mechanism: deposit amount read as 200 when actually zero (custom-wrapper interpretation bug); attacker exploited an override mechanism originally designed for specific vault-transfer transactions
- Per multiple reports: bridge-code override path that should have been narrowly scoped to vault-internal transfers was reachable from attacker-controlled input
- Sister incidents: similar Bifrost vulnerabilities in 2021 (ETH Router Exploits 1 & 2, post-mortem at https://medium.com/thorchain/post-mortem-eth-router-exploits-1-2-and-premature-return-to-trading-incident-2908928c5fb)
- Confidence: surfaced via multiple independent reports; root cause language still imprecise; not yet corroborated by THORChain
- Class: cross-domain semantic-gap (override-mechanism scope) — could fit DC-6 (Permissionless-Trigger-With-Config-Determined-Recipients) if the override was intended-permissionless-but-mis-scoped, OR a new class entirely if the override was supposed to be gated and the gate was bypassed

**Hypothesis C — GG20 TSS implementation vulnerability + malicious node operator (CORROBORATED 2026-05-17/18 → now LEADING hypothesis):**

- Surfaced 2026-05-17 during Wormhole pre-flight intel cross-check (Telegram chatter only; see `hunts/2026-05-17-wormhole-preflight-gate1.md` URGENT flag)
- **2026-05-18 Monday active poll CORROBORATION (3 independent sources):**
  1. **SlowMist hacked-ledger official classification:** "GG20 TSS Vulnerability" (https://hacked.slowmist.io/)
  2. **t.me/s/thorchain official channel message (msg 989-990):** "the attacker exploited a vulnerability within the GG20 TSS implementation which allowed sensitive key material from vault participants to leak over time" — direct quote from THORChain official Telegram
  3. **cryptotimes.io 2026-05-17 forensic write-up:** PeckShield + Cyvers + Chainalysis attribution; mechanism described as "gradual leakage of vault key material during keygen or signing rounds — the kind of malformed-proof exploitation"; classified under **TSSHOCK class** (offline partial-key reconstruction → forged signatures bypass quorum)
- Root: GG20 (Gennaro-Goldfeder 2020) threshold-signature-scheme implementation vulnerability. GG20 is a fork of Binance's tss-lib. Vault key material leaked across keygen/signing rounds via malformed-proof attack, allowing offline reconstruction of full private key from partial shares.
- Loss figure (refined chain-breakdown per cryptotimes.io): ETH 3,443 ($7.77M) + BTC 36.85 ($2.97M) + BNB 96.6 ($66K) + Base remainder = $10.8M gross; Telegram official cites ~$7.4M (likely net after some flows trapped). Three figures in circulation: $10.8M gross (cryptotimes/initial reporting), $7.4M (THORChain official Telegram), $4.9M (prior net-loss reporting). Awaiting Medium PM for definitive number.
- Mechanism: signature-aggregation-layer attack — abuse of the TSS protocol's share-combining math at keygen/signing round (TSSHOCK pattern), NOT a pre-image binding gap (Hypothesis A class). Attacker entry: thor16ucjv3v695mq283me7esh0wdhajjalengcn84q (recently-churned validator node).
- Confidence: **HIGH** — three independent corroborating sources (one official THORChain channel, two security firms via tier-1 forensic write-up). Promoted from "lowest evidentiary support" to **LEADING HYPOTHESIS** as of 2026-05-18.
- Class: **threshold-signature-scheme implementation vuln (TSSHOCK class)** — STRUCTURALLY DIFFERENT from Hypothesis A's signature-scope-must-cover-outcome-bit class. **Confirms that CANDIDATE-A (proposed DC-7 anchor from Hypothesis A) does NOT receive THORChain as an anchor.** CANDIDATE-A standalone structural relevance preserved (the Wormhole guardian-attestation cross-pollination check is its own merit), but THORChain anchor is forfeited to Hypothesis C class.

**Lane 1.5 implications under Hypothesis C:** TSSHOCK is a known class of vulnerability against GG20 (academic paper published; tss-lib derivatives have prior patches). If post-mortem confirms a known-patched-upstream vulnerability that THORChain's GG20 fork did not pull, this IS a Lane 1.5 case (deployment-gap class), but the gap is against UPSTREAM patches (Binance tss-lib commits / academic CVE-style disclosures), not against THORChain's own commit `af46db22`. Different deployment-survey target than Hypothesis A predicted.

The three hypotheses are NOT mutually exclusive but the evidentiary weight has decisively shifted to Hypothesis C as of 2026-05-18. A Medium-PM-grade final post-mortem may still introduce nuance (multi-vector chain, e.g., Hypothesis C as the share-leak + Hypothesis A's commit `af46db22` patch as the prevention-that-was-not-deployed-on-relevant-vault). Track all three until PM lands.

**CANDIDATE-A promotion-path nuance (updated 2026-05-17):** if Hypothesis A confirms → THORChain becomes CANDIDATE-A anchor + 9-day deployment gap = Lane 1.5 case #2 (compounding both ways). If Hypothesis B confirms → DC-6 negative-control variant; CANDIDATE-A unaffected. If Hypothesis C confirms → CANDIDATE-A standalone path (Wormhole + LayerZero + Axelar cross-pollination check) remains valid as STRUCTURAL hunting EV, but THORChain is removed from anchor-evidence portfolio. If a 4th hypothesis or combination emerges, re-file.

### Official root cause

**PARTIALLY CONFIRMED via official Telegram (t.me/s/thorchain msg 989-990) as of 2026-05-17/18 — GG20 TSS implementation vulnerability. Medium-PM-grade full write-up STILL PENDING as of 2026-05-18 23:55Z (Monday active poll).**

Refund mechanism announced: refund portal launched on swap.thorchain.org (per MEXC News). Recovery paths: Protocol-Owned Liquidity (POL) absorption + slashing of malicious-node bonds. Auto-solvency-checker promised as preventative.

Tracking:

- https://medium.com/thorchain (blog) — STILL no PM post as of 2026-05-18 23:55Z; checked via WebFetch on both base URL and search-by-keyword
- https://t.me/s/thorchain (announcements) — official message msg 989-990 cites GG20 TSS, see Hypothesis C above
- THORChain X account — not poll-accessible (xcancel + nitter alternates returning 503)
- nine realms blog (THORChain co-founder org)

Check cadence: every 4-6 hours during active news window (next 48-72h), then daily until 7d, then weekly. When Medium-PM-grade full write-up drops: fetch, read, fill in definitive **Root cause**, **DC mapping**, **L3.5 mapping** below (may refine or augment current Hypothesis C corroboration); THEN send War Room digest per operator directive.

### DC mapping — DC-7 CANDIDATE

**Proposed name:** Signature-Scope-Must-Cover-Outcome-Bit (working title)

**Class statement (pending PM confirmation):**

> When a multi-signer set (validator set, threshold-sig committee, bridge attestation gossip) signs a payload that omits a downstream-binding bit (e.g., inbound-vs-outbound direction, target chain ID, recipient-class flag), and a downstream consumer interprets that bit from a separate trust path (proposer claim, off-chain config, side-channel), there exists a forgery surface where the omitted bit can be flipped without invalidating the signature set.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES.

- `validated` = the signature set covers payload P excluding bit b
- `assumed` = the consumer treats the signature as covering (P, b)
- Gap = forge b without re-signing

**Promotion path:** when THORChain post-mortem confirms Hypothesis A (or a refinement thereof), promote DC-7 to `brain/Patterns-Defense-Classes.md` with:

1. Concrete THORChain commit-hash reference
2. Audit-time check procedure (similar to DC-1..6 format)
3. Reachability prompt enricher for L3.5 Stage 2
4. Risk-if-mis-applied paragraph
5. Cross-protocol watch list (any bridge using attestation-gossip with off-chain proposer)

**HOLD on promotion** until PM lands. If PM picks Hypothesis B instead, DC-7 stays in this file as candidate (no promotion); a different DC class may surface from the wrapper-interpretation angle.

### L3.5 mapping — CANDIDATE invariant

**Proposed THORChain-INV-1 (working name):**

> Every validator-signed attestation MUST bind the full action semantics: source chain, destination chain, asset, amount, recipient, AND direction-of-flow bit. The signature scope and the downstream consumer's interpretation MUST agree on every dimension that affects fund flow.

**Cross-pollination watch (for future LST/bridge scans when CVP clears):**

- Wormhole guardian attestations
- LayerZero DVN attestations
- Axelar validator attestations
- Stargate (LayerZero-derived)
- IBC packet ack signatures
- Bitcoin-bridge HTLC variants

If 3+ of these surface a similar bind-scope gap during future L3.5 scans → codify as Pattern I or a new Pattern J in `audit-methodology-v2.md`.

### AION V2 mapping — Family #5 (cross-chain bridge)

This exploit is a textbook Family #5 case. AION V2 should already classify any bridge-attestation forgery payload under #5. Worth confirming when CVP clears: send a sanitized payload through AION V2 to verify Family #5 classification reasoning matches Hypothesis A's framing.

### Lane 1.5 — deployment-dependent class CANDIDATE

If Hypothesis A's commit-hash detail confirms (fix existed in commit `af46db22` from 2026-05-06, exploit on 2026-05-15 = 9-day deployment gap):

- This is the canonical Lane 1.5 failure mode: a defense existed in source but was not deployed to validators
- The source-level scanner (any Layer 1-4 audit) would have surfaced the fix-pattern as "present" because the patch was in the repo
- The deployment-survey scanner (Lane 1.5 Stage 2) would have surfaced the gap because the validator set was on the pre-patch binary
- THIS IS THE EXACT SAME CLASS as the L1b-1089 Reserve Curve case that motivated Lane 1.5 v1

**If PM confirms 9-day deployment gap → add to `brain/Lane-1.5-Deployment-Hunting.md` as the second validated case** (Reserve was case #1, THORChain becomes case #2). Two cases = strong signal that Lane 1.5 generalizes; codify validator-binary-version survey as a Stage 2 extension.

### Action queue (DEFERRED per cyber pause)

1. ✅ Intel filed (this entry) — defensive intel work, fully within whitelisted scope
2. ⏳ Track official post-mortem release (periodic check, see Tracking)
3. ⏳ When PM drops: read it, fill in Root cause section, decide DC-7 promotion path
4. ⏳ If Hypothesis A confirmed: promote DC-7 to Patterns-Defense-Classes.md (post-PM, post-CVP-clearance for any code-level deep dive)
5. ⏳ If 9-day deployment gap confirmed: add to Lane-1.5-Deployment-Hunting.md as case #2
6. ⏳ Cross-pollination scan of named bridges (Wormhole/LayerZero/Axelar) — DEFERRED until CVP clears (any deep code review on those bridges is exploit-discovery-adjacent and gated)
7. ⏳ Moltbook case-study draft for post-CVP window (HOLD on post until operator greenlight)

### Discipline held under cyber pause

- ❌ No automated L3.5 pipeline run on THORChain code
- ❌ No exploit-chain construction via pipeline prompts
- ❌ No new vulnerability discovery attempts on live code
- ✅ Defensive intel filing (this entry)
- ✅ Public-source post-mortem tracking
- ✅ Pattern mapping against existing brain catalog (already-classified work)
- ✅ Workflow identical to Wasabi/Huma post-mortem filings

---

## KyberSwap Elastic — $100M Double-Add Liquidity (Prevented) — Retrospective

**Date:** 2023-04-17 disclosure / 2023-05-23 post-mortem published
**Protocol:** KyberSwap Elastic (CLMM, Uniswap-V3-architecture inspired)
**At-risk:** $100M; **Actual loss:** $0
**Researcher:** 100Proof (repo handle `one-hundred-proof`)
**Bounty:** negotiated terms (below standard 10% cap, "lower but substantial")
**Status:** FIXED — `ks-elastic-sc` new repo, ChainSecurity re-audit complete, pools re-released
**Fragility family:** state-machine integrity (CLMM tick-boundary)
**Same-family sibling in brain:** Huma V1 INV-2 (lending domain, same integrity class)
**Full intake artifact:** `incidents/2023-05-23-kyberswap-elastic-100m-double-add.md`

### Root cause (per 100Proof writeup)

`Pool.sol:405-408` recomputed `currentTick` whenever `swapData.sqrtP != swapData.nextSqrtP`. During a second sub-swap where price did not actually move from sub-swap entry, the gate fired against the wrong reference (running `nextSqrtP` instead of entry `startSqrtP`), advancing `currentTick` by one and breaking the `currentTick == nearestCurrentTick` boundary invariant. Result: minted liquidity could be double-counted when the boundary was crossed on a subsequent swap.

### Fix (per 100Proof writeup)

`ks-elastic-sc Pool.sol:413-419` changed the gate to compare against `swapData.startSqrtP` (sub-swap entry snapshot), restoring the boundary invariant.

### CANDIDATE tags (NOT promoted to active catalogs)

- **INV-CLMM-TICK-1** (Invariants.md CANDIDATE): "every sub-swap that does NOT change `sqrtP` MUST NOT advance `currentTick`; gate reference MUST be `startSqrtP`, never `nextSqrtP`"
- **CANDIDATE-D** (Patterns-Defense-Classes.md CANDIDATE Pool): "startSqrtP-Equality-Precondition before tick recomputation in multi-step state machines"
- **AION V2 Family**: maps to state-machine integrity class (Family # TBD post-CVP)

### Cross-pollination CANDIDATES (NOT for active scan pre-CVP)

Uniswap V3, KyberSwap Elastic post-fix (regression surface), Trader Joe Liquidity Book, Algebra Finance, iZUMi Finance, Orca Whirlpool (Solana), Cykura (Solana). Threshold for codification: 3+ protocols re-surface INV-CLMM-TICK-1 in future L3.5 scans → Pattern I/J in `audit-methodology-v2.md`.

### Why this entry compounds the brain

Same-family link to Huma V1 INV-2 makes "state-machine integrity" a 2-protocol pattern (lending + CLMM). One more worked example takes it to 3 and triggers the codification threshold. Layer 3.5 invariant analyzer architecture is the right shape for this class — KyberSwap is a worked validation that deep manual trace catches it, which is exactly what Layer 3.5 automates.

---

## Raydium cp-swap — $505K Rounding-Asymmetry Drain (Whitehat-Caught) — Retrospective

**Date:** 2025-03-10 disclosure / 2025-05-21 Immunefi review published
**Protocol:** Raydium cp-swap on Solana (constant-product AMM)
**Funds at risk:** pool drainable pre-fix (TVL exposure not stated); **Actual loss:** $0
**Researcher:** @Lastc0de
**Bounty:** $505,000 USDC (Immunefi)
**Status:** FIXED — non-zero `require` guards added on four pair-related amount variables
**Fragility family:** arithmetic-rounding asymmetry (NEW family in brain — this entry anchors)
**Full intake artifact:** `incidents/2025-03-10-raydium-cpswap-505k-rounding.md`

### Root cause (per Immunefi review)

`lp_tokens_to_trading_tokens()` applied ceiling rounding with a per-side short-circuit:

```rust
if token_0_remainder > 0 && token_0_amount > 0 {
    token_0_amount += 1;
}
```

When one side's `token_amount` rounded to zero, the AND-conjunct `token_amount > 0` blocked the ceiling increment for that side while the other side still ceiled. Asymmetric rounding on a symmetric pair → 1 LP deposit could yield 2 `token_0` + 0 `token_1` → pool proportionality broken → repeated deposit-withdraw cycles drain the pool.

### Fix (per Immunefi review)

Added `require` non-zero checks on `amount_out_less_fee`, `token_0_amount`, `token_1_amount`, `lp_token_amount`. The asymmetric path becomes unreachable because zero values are rejected at the gate.

### CANDIDATE tags (NOT promoted to active catalogs)

- **CANDIDATE-E** (Patterns-Defense-Classes.md CANDIDATE Pool, STRONGEST current DC-7 anchor candidate): "Symmetric-Pair-Rounding-No-Short-Circuit — symmetric token-pair ceiling/floor rounding MUST NOT short-circuit on per-side `amount > 0`; round both sides symmetrically OR reject the operation when any side rounded to zero"
- **INV-PAIRED-ROUND-1** (Invariants.md CANDIDATE): "symmetric-pair mint/burn/swap rounding decisions MUST be consistent across both sides"
- **AION V2 Family**: maps to arithmetic-correctness exploit class (Family # TBD post-CVP)

### Cross-pollination CANDIDATES (NOT for active scan pre-CVP)

All Solana cp-swap forks (large Anchor template fork ecosystem), Uniswap V2 family (Uniswap V2, SushiSwap, PancakeSwap V2, TraderJoe V1), Curve stable-pool variants with per-side rounding short-circuit, any LP-issuance routine with asymmetric ceiling. Threshold: 3+ AMMs re-surface CANDIDATE-E → DC-7 promotion + Semgrep / BuzzShield L1b detector rule productization.

### Why this entry compounds the brain

Anchors a NEW fragility family (arithmetic-rounding asymmetry) that previously had no worked example in brain. Functional-level pattern (4-line bug worth $505K) is the exact productization-thesis validation: one finding → one detector → catches the class across the V2 + cp-swap fork ecosystem. The Lane 1 → detector → cross-pollination engine target surface is large here.

---

## Distinct-family analysis — KyberSwap vs Raydium (same-batch sibling intakes)

These two retrospectives, filed in the same batch, expand brain's AMM-class fragility taxonomy across two distinct families:

| Aspect              | KyberSwap Elastic                                   | Raydium cp-swap                                           |
| ------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Family              | State-machine integrity                             | Arithmetic-rounding asymmetry                             |
| Detection class     | Deep multi-step manual trace (Layer 3.5 invariant)  | Function-level pattern match (Layer 1/2 detector)         |
| Brain catalog home  | Invariants.md (INV-CLMM-TICK-1 CANDIDATE)           | Patterns-Defense-Classes.md (CANDIDATE-E for DC-7 anchor) |
| Existing siblings   | Huma V1 INV-2 (same family)                         | None (anchors new family)                                 |
| Methodology lesson  | Layer 3.5 invariant analyzer architecture validated | Detector productization thesis validated                  |
| Productization path | Invariant catalog entry → cross-pollination scan    | Defense Class → Semgrep / L1b rule → cross-fork EV        |

Together they validate both halves of Buzz's methodology stack: the deep-end (invariant analysis) and the function-level-end (pattern productization). Brain's worked-example library now spans both.

---

## Next.js CVE-2026-44578 — WebSocket SSRF via Parallel-Validation-Asymmetry

**Date:** 2026-05-11 (CVE published) / 2026-05-15 (intake + Hetzner audit)
**Affected:** Next.js 13.4.13+ → <15.5.16 AND 16.0.0 → <16.2.5 (self-hosted only; Vercel-hosted clean)
**Severity:** CVSS 8.6 (HIGH); active Shodan-scale exploitation (~79K instances scanned)
**Class:** input-validation asymmetry across adjacent code paths (NEW family in brain — this entry anchors)
**Hetzner exposure:** ✅ CLEAN (confirmed 2026-05-15, msg 7070 within 15-min window). 3 on-disk Next.js packages, all in non-deployed template/clone paths; zero running Next.js process; all public surface is Express/Caddy.
**Full intake artifact:** `incidents/2026-05-15-nextjs-cve-44578-parallel-validation-asymmetry.md`

> **Parent class PROMOTED to DC-7 on 2026-05-18** — see `brain/Patterns-Defense-Classes.md` v1.8 §DC-7 ("Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines") for formal definition + 4-worked-example portfolio. CANDIDATE-F retired as PROMOTED stub.

### Root cause class (per GHSA + Next.js advisories)

WebSocket-upgrade handling path validates incoming request URLs less rigorously than the HTTP-request handling path validates the same shape of input. Asymmetric validation across adjacent paths feeds a common downstream consumer that assumed the stricter path's guarantees applied to all input → SSRF surface from the WebSocket path that the HTTP path's defense was designed to prevent.

### Class abstraction

> When a framework / runtime / protocol exposes ADJACENT code paths (HTTP vs WebSocket / mainline vs middleware / handler vs middleware-bypass / GET vs POST with same payload-class) that consume the SAME class of input but apply ASYMMETRIC validation rigor, the laxer path becomes a bypass for the stricter path's defenses.

### CANDIDATE tags (NOT promoted to active catalogs)

- **CANDIDATE-F** (Patterns-Defense-Classes.md CANDIDATE Pool): "Parallel-Validation-Asymmetry — adjacent paths consuming same input class with different validation rigor MUST canonicalize validation OR the common downstream consumer MUST re-validate"
- **AION V2 Family**: maps to "input-validation surface gaps" exploit class (Family # TBD post-CVP)

### Cross-pollination CANDIDATES (manual review LIVE on disclosure-program targets; automated pipeline-at-scale gated on CVP)

**Web frameworks:**

- Express + ws library (WebSocket adjacency)
- Fastify + WebSocket plugin
- Hono / Koa with WebSocket
- GraphQL endpoints adjacent to REST endpoints in the same service
- Batch APIs adjacent to single-record APIs

**Smart contracts (highest-EV for Lane 1 hunting):**

- `multicall()` vs single-call signature-scope validation asymmetry (multiple historical bugs in this class)
- `permit()` vs `transferFrom()` validation asymmetry
- EIP-712 vs EIP-191 validation pipelines on the same contract
- Cross-chain bridge: inbound-message validation vs outbound-message validation asymmetry
- Vault deposit vs withdraw validation pipelines

The smart-contract analogues are the active-hunt target — this is exactly the cross-pollination engine doing its job. Today's web-framework intake feeds tomorrow's crypto-disclosure-program hunting edge.

### Why this entry compounds the brain

All four 2026-05-15 cross-domain intakes (THORChain + KyberSwap + Raydium + Next.js CVE) reduce to specializations of Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES, but each anchors a DISTINCT family:

| Family                                | Anchor                 | Domain           |
| ------------------------------------- | ---------------------- | ---------------- |
| Signature-scope asymmetry             | THORChain (hypothesis) | bridge consensus |
| State-machine integrity               | KyberSwap (+ Huma V1)  | CLMM / lending   |
| Arithmetic-rounding asymmetry         | Raydium                | AMM              |
| Input-validation asymmetry (adjacent) | Next.js CVE            | web framework    |

Four families, four canonical worked examples filed in one day. The doctrine compounds: the universality of WEAKER-PROPERTY is now empirically demonstrated across four orthogonal protocol classes. BuzzShield V6 detector productization can target each family with a class-specific rule.

### Sibling case — TrustedVolumes 2026-05-14 ($5.87M, Ethereum / 1inch Fusion ecosystem)

**Filed:** 2026-05-17 (Sunday intel intake, Loop D + rekt.news source)
**Source:** https://rekt.news/trustedvolumes-rekt (2026-05-14)
**Loss:** $5.87M (1,291 WETH + 206,282 USDT + 16.939 WBTC + 1,268,771 USDC)
**Public status:** POST_MORTEM_CONFIRMED (rekt write-up authoritative; contract was unverified on Etherscan, no prior public audit, dev team inactive >1yr — only `tvbugbounty@proton.me` + `t.me/trustedvolumes` contact)

> **Parent class PROMOTED to DC-7 on 2026-05-18** — see `brain/Patterns-Defense-Classes.md` v1.8 §DC-7 ("Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines") for formal definition + 4-worked-example portfolio (both TrustedVolumes chains anchored in DC-7 entry).

**Root cause — TWO independent parallel-validation-asymmetries chained:**

1. **Validation-key ≠ consumption-key (CANDIDATE-F primary):**
   - Signature check: `allowedOrderSigner[order.receiver][signer]` — confirmed signer authorized for the **receiver** address
   - Token transfer downstream: used `order.taker` as the `from` address
   - Attacker set `taker = victim`, `receiver = attacker-controlled`. The validation pipeline approved the signer for the attacker's receiver; the consumption pipeline pulled from the victim's `taker` balance. **Two adjacent fields, same input class, asymmetric validation rigor between the validating consumer and the executing consumer.**

2. **Replay-mutex write-key ≠ read-key (CANDIDATE-F secondary):**
   - `saltStatus` **write** stored to one storage key
   - `saltStatus` **read** queried a different storage key
   - Result: replay-prevention defense was structurally inert. All 4 drain calls passed the mutex check.

3. **Permissionless signer registration:**
   - Any EOA could call the signer-registration function and register any other EOA as authorized for themselves as maker. No owner / authority check. This is the entry-point gating gap that gave the attacker the signing primitive to weaponize the validation asymmetries.

**Why this fits CANDIDATE-F (and compounds it):**

| Anchor                       | Layer | Adjacent code paths                                          | Same input class                                 | Validation asymmetry                                                   |
| ---------------------------- | ----- | ------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Next.js CVE-2026-44578       | web   | HTTP-upgrade handler vs WebSocket-upgrade handler            | Incoming request URL                             | WS path validates less rigorously than HTTP path                       |
| **TrustedVolumes (chain 1)** | EVM   | **Signature-validation function vs token-transfer function** | **Order struct (`receiver` and `taker` fields)** | **Validator checks `[receiver][signer]`; consumer pulls from `taker`** |
| **TrustedVolumes (chain 2)** | EVM   | **`saltStatus` write path vs `saltStatus` read path**        | **Salt / nonce**                                 | **Writer commits to slot A; reader queries slot B**                    |

This is the EXACT smart-contract analogue the Next.js CVE entry called out as the highest-EV cross-pollination target ("`multicall()` vs single-call signature-scope validation asymmetry", "`permit()` vs `transferFrom()` validation asymmetry"). **CANDIDATE-F now has 2 domains (web framework + EVM smart contract) and 3 worked example chains** — the in-protocol replay-mutex variant (chain 2 of TrustedVolumes) is structurally a 3rd worked anchor on its own.

**CANDIDATE-F promotion math:** the original codification threshold for moving CANDIDATE → active DC is "3+ protocols re-surface the class in future L3.5 scans." TrustedVolumes alone gives us 2 instances inside a single exploit. Combined with the Next.js CVE anchor, CANDIDATE-F is now at 3 worked examples across 2 domains. **One more on-chain instance (the next disclosure surface) closes the codification threshold for DC-7 promotion.**

**Why this entry sits under the Next.js CVE entry (not its own family):** the root-cause class is identical (parallel-validation-asymmetry on adjacent paths consuming the same input class). The novelty is the DOMAIN (EVM smart contract vs web framework), not the family. Brain-discipline: don't fork a family for every new domain — extend the existing family with cross-domain sibling notes. Reserve new family creation for genuinely novel root-cause classes.

**Updated family table (after this filing):**

| Family                                      | Domains anchored                       | Worked examples                                                                     |
| ------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Signature-scope asymmetry                   | bridge consensus                       | 1 (THORChain)                                                                       |
| State-machine integrity                     | CLMM, lending                          | 2 (KyberSwap + Huma V1)                                                             |
| Arithmetic-rounding asymmetry               | AMM                                    | 1 (Raydium)                                                                         |
| Input-validation asymmetry (adjacent paths) | **web framework + EVM smart contract** | **3 (Next.js CVE + TrustedVolumes ×2 chains)** ← strongest DC-7 promotion candidate |
| Rendering-authority asymmetry               | wallet UI / EOA delegation             | 1 (EIP-7702)                                                                        |

**Defensive intel actions filed (NO offensive work):**

- ✅ This entry filed as sibling case under CANDIDATE-F
- ❌ No PoC of the TrustedVolumes contract (contract is unverified; even decompiled-byte exploration is offensive-adjacent)
- ❌ No outreach to `tvbugbounty@proton.me` (passes brand-safety + cyber pause; no value-add for closed/inactive project)
- ⏳ DC-7 promotion math monitored: one more on-chain CANDIDATE-F surface closes the codification gate
- ⏳ Smart-contract corpus scan target (post-CVP): 1inch Fusion ecosystem forks, Permit2-derived signature flows, intent-based AMM aggregators (CowSwap, Hashflow, Bebop) — adjacent design space where validation-vs-consumption-field-binding is high-risk

**Discipline held:**

- ✅ Read rekt write-up in full context
- ✅ Honest classification (sibling case under existing family, NOT new family — vector matters, outcome ≠ vector)
- ✅ No artifact-set verification claims made beyond what rekt published
- ✅ No mainnet eth_call / no tx trace / no decompilation
- ✅ Loop D source-attribution preserved (rekt.news 2026-05-14, surfaced in 2026-05-17 Sunday intake)

---

## EIP-7702 Hidden Delegation — Wallet-UI Rendering Asymmetry (Class Intake)

**Date:** 2026-05-16 (intake) — operator-supplied artifact set fails on-chain verification, but the BROADER class is real and corroborated by independent sources
**Protocol:** EOA wallets that have opted into EIP-7702 SetCode delegation (Pectra upgrade, live since Ethereum 2025-05-07; spreading to other EVM chains including BSC)
**Loss (class-wide, NOT per-incident):** ZachXBT-tracked drains in the EIP-7702 abuse class include single-victim losses of ~$146,551 (MetaMask victim via Inferno Drainer "CrimeEnjoyor" delegator) and $1.54M (single phishing attack per Cryptopolitan). Wintermute reports >97% of EIP-7702 delegations on Ethereum link to identical drainer-derivative scams.
**Domains hit:** Wallet UI rendering layer + Ethereum/BSC delegation layer + downstream sweeper-contract execution layer
**Public status:** **CLASS_CONFIRMED (real exploit family, multiple independent victims)** but **SPECIFIC_ARTIFACT_UNVERIFIED** for the @0xOlami / @frankk_onchain / BSC tx `0xbdf3d7e...3403560` / 8.2 SOL / VICE pump.fun chain-of-events the operator surfaced (see Verification Note below)
**Class first cataloged here:** 2026-05-16, intake under Buzz defensive-intel discipline

### Public facts (CLASS-LEVEL, cross-verified from 3+ independent sources)

- EIP-7702 (Pectra) allows EOAs to temporarily delegate execution to smart contracts via a SetCode authorization embedded in a transaction
- Active exploitation: bots scan EOAs, signed-authorization phishing pages, and recently-funded wallets to plant `CrimeEnjoyor`-class drainer delegations
- Documented victim cases: $146K (MetaMask via Inferno Drainer per The Coin Republic), $1.54M (single phishing per Cryptopolitan), and Wintermute's claim that >97% of all EIP-7702 delegations on Ethereum mainnet are scam-derivatives
- Wallet UIs (MetaMask et al.) render the visible action prominently (swap, transfer, approve) but underweight the embedded SetCode authorization target — the user-readable surface and the cryptographic authority diverge

Sources (class-level, NOT artifact-specific):

1. The Coin Republic — "How Hackers Are Exploiting EIP-7702 To Drain Wallets" (2025-05-25): https://www.thecoinrepublic.com/2025/05/25/ethereum-news-how-hackers-are-exploiting-eip-7702-to-drain-wallets/
2. Cryptopolitan — "Security analysts warn about EIP-7702 flaw after user loses $1.54M in single phishing attack": https://www.cryptopolitan.com/eip-7702-user-loses-1-54m-phishing-attack/
3. Bitget News — "Ethereum's EIP-7702 Feature Abused in Wallet-Draining Attacks": https://www.bitget.com/news/detail/12560604791489
4. Three Sigma — "Inside Wallet Drainers and EIP-7702 Exploits" (Part 2 forensics): https://threesigma.xyz/blog/opsec/ai-phishing-wallet-drainers-eip7702-part-2
5. Relay Support Center — "Malicious EIP-7702 Delegations and How to Stay Safe": https://support.relay.link/en/articles/12213430-malicious-eip-7702-delegations-and-how-to-stay-safe

### Verification Note (operator-supplied artifact set — UNVERIFIED, likely mis-attributed)

The Day 17 operator directive surfaced a specific artifact set: @0xOlami victim report, @frankk_onchain forensic thread, BSC tx `0xbdf3d7e067eb3128489abaab2a89f6c34d6e6f1e71bb1a36c8e5b81f43403560`, 8.2 SOL drain to Solscan, VICE pump.fun buy. Defensive verification (2026-05-16, READ-ONLY):

| Artifact                                   | Verification outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| @0xOlami                                   | X.com blocked WebFetch (402); xcancel returned 503; web search for the exact handle returned no credible profile. Cannot confirm account exists or has filed a victim report.                                                                                                                                                                                                                                                                                                                                            |
| @frankk_onchain                            | Same — X.com blocked, xcancel 503, web search for the exact handle returned only loosely-related profiles (frankcrypto, frankvonk, Frank_blckchain, hooked2thechain). No `@frankk_onchain` profile surfaced in a direct handle search. Cannot confirm tracer is a credible established analyst.                                                                                                                                                                                                                          |
| BSC tx `0xbdf3...3403560`                  | EXISTS, but does NOT match the framing. Two independent BSC explorers (OKLink + 3xpl): block 84,398,058, timestamp **2026-03-03 16:06:35** (over 2 months OLD, not a fresh Day 17 exploit), from=to=`0x8d3aae7d140704cfaeefe644c8e9c2698df6c87e` (self-call), value 0 BNB, calldata interacts with contract `0xc0041ef357b183448b235a8ea73ce4e4ec8c265f` = **Cookie DAO (COOKIE) BEP-20 token** (legitimate AI-agents data project, NOT a 7702 delegator). No EIP-7702 SetCode authorization flagged by either explorer. |
| Solana 8.2 SOL receipt + VICE pump.fun buy | Cannot trace — no Solana destination address derivable from the BSC tx (the BSC tx is a self-call to a token contract, not a cross-chain bridge transaction). The "BSC → Solana 8.2 SOL → VICE" flow is unsupported by any artifact provided.                                                                                                                                                                                                                                                                            |

**Verdict on artifact set:** DISCONFIRMED. The specific BSC tx is real but is a March 2026 self-call interaction with the Cookie DAO token, NOT an EIP-7702 delegation drain. The two X handles cannot be verified. The Solana destination + VICE buy cannot be traced. **Filing the CLASS entry only; operator artifact set should NOT be treated as a corroborating data point until the original sources are produced with archive-quality URLs.**

### Root cause class (per public reporting on the broader 7702 abuse family)

User signs a transaction that the wallet UI renders as a benign swap, transfer, or "approve permissions" action. The transaction payload also contains an EIP-7702 SetCode authorization (or the user is on a phishing page that returns a SetCode authorization as the signing primitive). After signing, the EOA's code slot points to an attacker-controlled delegator (commonly the `CrimeEnjoyor` derivative or an Inferno Drainer variant). The attacker then submits a follow-up tx that calls into the delegated code path to drain ETH / tokens / approve-and-pull from the now-smart-contract-EOA.

### Class abstraction

> When a wallet UI renders the user-readable surface of a transaction (action, target, amount) but UNDERWEIGHTS the cryptographic-authority embed (EIP-7702 SetCode authorization, EIP-1271 signature replay scope, permit allowance target), the user-readable surface and the actual signing authority diverge. The downstream consumer (the chain) honors the cryptographic-authority embed regardless of what the UI showed.

Reduces to: rendering-rigor (UI surface) < payload-semantic-rigor (cryptographic authority). Same WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES root as the other 4 entries in this ledger.

### CANDIDATE tags (NOT promoted to active catalogs)

- **CANDIDATE-G** (Patterns-Defense-Classes.md CANDIDATE Pool): "Rendering-Authority-Asymmetry — wallet UI MUST surface the FULL cryptographic-authority semantics of every signed transaction, including any EIP-7702 SetCode authorization target, EIP-1271 module scope, or permit-spender chain. The user-readable surface and the on-chain authority MUST be equipotent."
- **INV-WALLET-7702-1** (Invariants.md CANDIDATE): "If a transaction payload includes a SetCode authorization, the wallet UI MUST display: (a) the target delegator contract address, (b) the verified contract name/audit status if known, (c) a class-of-action warning if the target is unrecognized, (d) a separate confirmation step distinct from the visible action confirmation."
- **AION V2 Family**: maps to phishing / authorization-confusion exploit class (Family # TBD post-CVP)

### Cross-pollination — this is the FIFTH parallel-validation-asymmetry domain

Updates the doctrine table:

| Family                                            | Anchor                                                             | Domain                         |
| ------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------ |
| Signature-scope asymmetry                         | THORChain (hypothesis)                                             | bridge consensus               |
| State-machine integrity                           | KyberSwap (+ Huma V1)                                              | CLMM / lending                 |
| Arithmetic-rounding asymmetry                     | Raydium                                                            | AMM                            |
| Input-validation asymmetry (adjacent paths)       | Next.js CVE-2026-44578                                             | web framework                  |
| **Rendering-authority asymmetry (UI vs payload)** | **EIP-7702 wallet drainer class (CrimeEnjoyor / Inferno Drainer)** | **wallet UI / EOA delegation** |

FIVE distinct families now anchor "WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES" across 5 orthogonal protocol classes (bridge / lending / AMM / web framework / wallet UI). The doctrine's universality is empirically stronger with this 5th anchor. BuzzShield V6 detector productization can now target each family with a class-specific rule.

### Disclosure status

This is a **real-world exploit class with documented victims**, NOT a hypothesis. Independent reporting (Wintermute, ZachXBT, Cryptopolitan, The Coin Republic, Bitget News, Relay) corroborates the class. NO PoC reproduced, NO exploit chain constructed, NO victim wallets touched. Defensive-intel filing only.

### Brain notes — forward-looking surface for operator visibility (NOT pitched)

1. **shield.buzzbd.ai Lane 2 expansion candidate: "Wallet-UI 7702 Audit Tier"** — HSaaS service offering for wallet teams (MetaMask, Rabby, Frame, Phantom-on-EVM, Coinbase Wallet, OKX Wallet, Trust Wallet, etc.). Scope: audit the wallet's transaction-rendering pipeline for EIP-7702 SetCode authorization disclosure rigor, EIP-1271 module-scope display, permit-spender chain visibility. Pricing tier candidate: $5K–$15K per wallet audit. Distinction from generic smart-contract audits: this is a CLIENT-SIDE rendering audit, not a contract audit. Underserved market — most audit firms only do contracts.
2. **Class K candidate for BuzzShield V6: "EIP-7702-Delegation-Audit" detector** — would flag any signed transaction containing a SetCode authorization where the calling context (wallet UI surface or dApp signing-request UI) does not visibly render the authorization target contract address + verified-name + class-of-action warning. Test corpus: WalletConnect signing-request mock + browser wallet popup screenshots. Productization: ships as a wallet-team-facing detector + a user-facing browser extension that intercepts signing requests and shows the full authorization scope.

Both notes are documentation-only per operator directive. Pitch posture: HOLD until operator greenlight.

### Action queue (DEFERRED per cyber pause discipline)

1. ✅ Class intake filed (this entry) — defensive intel work, fully within whitelisted scope
2. ⚠️ Operator artifact set flagged as UNVERIFIED — surface to operator for source production OR replacement with a verifiable anchor (e.g., the documented MetaMask $146K victim with the actual on-chain delegator tx, or the $1.54M Cryptopolitan-cited case)
3. ⏳ When a verifiable artifact set lands (real tx hash + real X thread that resolves cleanly via WebFetch + identifiable victim or tracer): re-file as a SPECIFIC case under this CLASS entry, similar to how THORChain has its own entry under Family #1
4. ⏳ Lane 2 wallet-UI audit tier — HOLD on pitch until operator greenlight
5. ⏳ Class K BuzzShield V6 detector — HOLD on build until operator greenlight

### Discipline held

- ❌ No automated pipeline scan on wallet UI code or 7702 delegator contracts
- ❌ No exploit-chain construction or PoC reproduction
- ❌ No RPC calls to victim addresses (operator-cited addresses are unverified anyway)
- ❌ No tweet, no public post, no DM, no @-tag of any handle from the unverified artifact set
- ✅ Defensive intel filing of the CLASS (this entry)
- ✅ Independent-source-only verification (5 corroborating reports cited)
- ✅ Honest mis-attribution flag on the operator-supplied artifact set
- ✅ Forward-looking brain notes filed as documentation-only

---

## ShapeShift FOX Colony — $132.7K Meta-Transaction Self-Call + DSAuth Asymmetry (CANDIDATE-F sibling)

**Date:** 2026-05-13
**Protocol:** ShapeShift FOX Colony on Arbitrum
**Loss:** $132,700 (USDC + FOX tokens)
**Public status:** POST*MORTEM_LITE_CONFIRMED (Blockaid disclosure thread; SlowMist hacked-ledger classification "Contract Vulnerability")
**Source:** SlowMist hacked.slowmist.io + https://x.com/blockaid*/status/2054593377438421492
**Filed:** 2026-05-18 (Monday active poll Poll B)

> **Parent class PROMOTED to DC-7 on 2026-05-18** — see `brain/Patterns-Defense-Classes.md` v1.8 §DC-7 ("Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines") for formal definition + 4-worked-example portfolio (ShapeShift FOX Colony is the 4th anchored worked example).

### Public facts

- Exploit chain: "meta-transaction self-call flaw combined with DSAuth authorization logic" drained USDC + FOX tokens from the Colony module
- DSAuth is DappHub's permissioning library (`isAuthorized(src, sig)`); Colony uses a forwarder pattern for meta-transactions
- Class summary: when a meta-transaction forwarder relays a call from `msg.sender == self`, the DSAuth check on the inner call may pass because the authorizer treats self-call as privileged context, even though the original signer was an external attacker

### CANDIDATE-F binding (parallel-validation-asymmetry, EVM domain)

This is the EXACT class signature CANDIDATE-F is tracking, in a new EVM sub-domain (meta-transactions / forwarders):

| Adjacent code paths                                                                                                                  | Same input class                                        | Validation asymmetry                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Outer meta-tx entrypoint (validates EIP-712 signature of original signer)** vs **inner call execution (DSAuth checks msg.sender)** | **Authorization context (who's authorized to do what)** | **Outer validates the signed user; inner reads `msg.sender = self` (the forwarder) and the DSAuth rule grants self-call full privilege. Outer ≠ inner authorization concept.** |

Adjacent-path validation-asymmetry on the same input class (authorization). Vector = meta-transaction self-call DSAuth bypass; outcome = drained tokens. Family confirmation: this is a 4th worked example under CANDIDATE-F (Next.js CVE + TrustedVolumes chain 1 + TrustedVolumes chain 2 + ShapeShift FOX Colony).

**CANDIDATE-F promotion math UPDATED:** previously 3 worked examples across 2 domains (Next.js web + TrustedVolumes EVM ×2). Now **4 worked examples across 2 domains** (added EVM meta-transaction forwarder sub-domain via ShapeShift FOX Colony). The codification threshold for moving CANDIDATE → DC-7 is "3+ protocols re-surface the class." We have crossed that quantitative gate; the qualitative gate (Wormhole/LayerZero/Axelar cross-pollination check + operator approval for DC promotion) remains open.

**DC mapping:** CANDIDATE-F (strengthens existing entry, does not anchor a new family)
**L3.5 mapping:** INV-METATX-1 CANDIDATE: "Meta-transaction forwarders MUST canonicalize the inner-call authorization context to either (a) re-validate using the original signer of the outer envelope, OR (b) reject any inner call that would have failed if dispatched directly from the original signer."
**AION mapping:** input-validation-asymmetry family

### Discipline held

- ✅ Read SlowMist + Blockaid disclosures, mapped to existing CANDIDATE-F family
- ❌ No PoC, no decompilation of ShapeShift Colony contracts
- ❌ No on-chain trace of attacker / victim addresses
- ✅ Honest classification: sibling case under existing family, NOT new family creation

---

## Aurellion Labs — $455K Diamond Proxy Uninitialized SafeOwnableFacet (Pattern G)

**Date:** 2026-05-12
**Protocol:** Aurellion Labs (Diamond Proxy / EIP-2535 architecture)
**Loss:** $455,003
**Public status:** POST_MORTEM_LITE_CONFIRMED (SlowMist + SlowMist_Team X disclosure)
**Source:** SlowMist hacked.slowmist.io + https://x.com/SlowMist_Team/status/2054163700035289446
**Filed:** 2026-05-18 (Monday active poll Poll B)

### Public facts

- "Unprotected initialize(address) function in the SafeOwnable Facet" enabled re-initialization + unauthorized access
- Diamond Proxy EIP-2535 pattern: SafeOwnable facet had no init-guard, allowing attacker to call `initialize()` post-deployment and seize ownership

### Brain-relevance classification

This is **Pattern G (capability-injection / initialization-guard) class**, already cataloged in `audit-methodology-v2.md` Phase 10 (Capability injection — NFT/token-gated capability, asset-receive hooks). The uninitialized-init class is well-cataloged across SwissBorg / Audius / Wormhole 2024-2025 incidents. This is NOT a new family.

**Not filed as standalone entry in Cross-Domain-Fragility-Laws.md** — known pattern, no novelty. Logging for operator awareness only; no brain update needed.

---

## Adshares Bridge — $628K Bridge-Minter EOA Verification Bypass (AION Family #5)

**Date:** 2026-05-15 (same day as THORChain — unrelated incident)
**Protocol:** Adshares Bridge on Ethereum
**Loss:** $628,000 (ETH + USDC from Uniswap V4 UniversalRouter liquidity pools)
**Public status:** POST_MORTEM_LITE_CONFIRMED (cryptoadventure.com + SlowMist hacked-ledger)
**Source:** https://cryptoadventure.com/adshares-bridge-exploit-drains-about-628k-after-fake-wads-mint/
**Filed:** 2026-05-18 (Monday active poll Poll B)

### Public facts

- Attacker controlled or compromised the bridge-minter EOA
- Signed three `wrapTo()` calls citing non-existent native-chain transaction IDs on the Adshares canonical chain
- 99,999.93 wADS + 99,999.93 wADS + 999,999.94 wADS minted without backing
- Fake wADS dumped via Uniswap V4 UniversalRouter into ETH + USDC pools
- Project response: 10% bounty for 90% return

### Brain-relevance classification

**AION V2 Family #5 (cross-chain bridge)** — textbook bridge-verification-bypass class. The "bridge-minter EOA signs invalid tx" pattern is the SAME class as the Feb 2022 Wormhole exploit ($320M, single-key bypass of 13/19 quorum via signature-verification flaw), Multichain July 2023 incident, Nomad Aug 2022 incident. Long-tail-of-bridge-failures; well-cataloged.

**Does this fit CANDIDATE-F?** No — the failure is signer-set compromise (key custody) + minter-trusts-EOA-claim-without-canonical-verification, not parallel-validation-asymmetry on adjacent paths consuming same input class. Vector ≠ outcome: bridge-mint outcome is shared with CANDIDATE-F, but the root-cause class is different (centralized minter trust vs validation rigor asymmetry).

**Not filed as standalone entry in Cross-Domain-Fragility-Laws.md** — fits existing AION Family #5 + well-cataloged class. Logging for operator awareness only.

---

## Echo Protocol — ~$822K eBTC Unauthorized Mint on Monad (Pattern H Enrichment — Admin Key = Trust Anchor Collapse)

**Date:** 2026-05-19 (operator-confirmed as "exploit confirmed" intel msg 7286 — exact loss-event timestamp pending independent verification)
**Protocol:** Echo Protocol (eBTC LST deployment on Monad chain)
**Loss:** ~$822,000 realized
**Public status:** OPERATOR_REPORTED (msg 7286 2026-05-19 12:26Z) — independent cross-source verification PENDING (filed under "trust the operator, verify when public sources land" framing per Doctrine #0)
**Filed:** 2026-05-19 (Master Ops directive msg 7286 — defensive intel filing)

### Public facts (operator-supplied; pending independent verification)

- Compromised admin key on Echo Protocol
- **1000 eBTC unauthorized mint** on Monad chain (mint authority abused via legitimately-signed transaction from compromised key)
- Value realized via **Curvance collateral fraud** — unbacked eBTC posted as lending collateral on Curvance, borrowed against legitimate assets
- Proceeds laundered through **Tornado Cash** (operational-security mixer)

### Pattern H enrichment — "Admin key = trust anchor collapse" sub-class

This entry **enriches Pattern H** ("Off-chain trust boundary — DVN, single verifier, durable nonce, MMR root" per `audit-methodology-v2.md` Phase 11) with a formal sub-class:

**Trust-anchor collapse class:** when a single admin key serves as the root-of-trust for a high-value capability (mint authority, configuration authority, upgrade authority), the protocol's security reduces to that key's custody discipline. The cryptographic signing is VALID; the upstream property "key is uncompromised" has NO on-chain verification surface.

Vector ≠ outcome (Doctrine #14 applied): the signature IS valid; the issue is that key ownership transitioned to an attacker. This is a 2nd-order failure: the validation logic CORRECTLY verifies signatures, but the trust anchor (admin = rightful authority) is **unverifiable on-chain by construction**.

Pattern H scope therefore expands to include: **any cryptographic-trust boundary where the trust-anchor property is taken-on-faith rather than enforced**. The legacy framing (DVN / single verifier / nonce / MMR) captured external-message-trust; this enrichment adds internal-authority-trust to the same class.

### CANDIDATE-A cross-reference — bridge mint-authority verification surfaces

CANDIDATE-A (WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES / signature-scope-must-cover-outcome-bit) directly applies to Echo's failure class:

- **Validation pipeline:** verifies the cryptographic signature against the admin key's public key
- **Consumption pipeline:** assumes "this signature came from a key the protocol still legitimately trusts to mint"
- **Gap:** the "still legitimately trusts" property is not enforced — the key may have been rotated by an attacker, exfiltrated, social-engineered out, or compromised via key-custody operational failure. Nothing downstream catches this.

### Active continuous-assurance target survey — manual, single-target only

Per session vocabulary (May 7 framing + May 19 reaffirm): MASS-program-monitoring is paused; manual one-target-at-a-time continuous assurance is in-scope. The following Immunefi-scoped targets carry **mint-authority verification surfaces** that this enrichment class directly applies to:

1. **Wormhole** — guardian-attestation mint authority (CANDIDATE-A direct analog; Gate 1 PREP complete per `hunts/2026-05-17-wormhole-gate2-prep.md`; bytecode-drift blocker still operator-held)
2. **cap** — cUSD mint via Vault is admin-gated (per `brain/Audit-Reports-Library.md` §4); TOTP signature surface adds a second authority layer worth pattern-mapping
3. **Lido** — stETH mint authorities (mature governance + multisig — lower-likelihood class but worth check; AccountingOracle + WithdrawalQueue + GateSeal all admin-touched)
4. **Renzo** — ezETH mint via operator delegation (CI primary per `brain/Watchlist-Candidate-Crossmap.md`)
5. **Stader / Rocket Pool** — LST mint authorities
6. **Veda BoringVault Manager** — Manager carries Merkle-leaf pre-approval authority (different sub-class — DC-7 territory — but related axis of "what authorizes the mutation")

Audit-time check (extension to Pattern H phase enumeration):

| Step | Question                                                                                                                                                                                                                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-1  | Who controls the mint authority? Single key / multisig / governance / hardware-signed / TSS?                                                                                                                                |
| H-2  | Is the trust anchor recoverable on compromise? Time-locked? Pausable? Has emergency-revocation?                                                                                                                             |
| H-3  | Are there off-chain key-custody attestations? TSS threshold? HSM + audit?                                                                                                                                                   |
| H-4  | Is there a downstream secondary verification — a check AFTER the signature that catches "this can't be right" outcomes? (supply cap / rate-of-change limit / oracle-consistency / circuit-breaker on anomalous mint volume) |

**NOT a Gate 2 directive — research-target list only.** Manual continuous-assurance one-at-a-time per session scope. Operator decides which (if any) Gate 1 surface map gets this enrichment lens added.

### Cross-protocol loss compounding — meta-pattern note

The Curvance leg is structurally interesting beyond the Echo Protocol primary failure: the loss-event **compounded across protocols** (mint-then-borrow). The unbacked eBTC was extracted as USDC/ETH via a SEPARATE protocol that has no reason to question Echo's mint authority — Curvance accepted eBTC at face value as lending collateral.

Cross-protocol-loss-compounding is a meta-pattern worth tracking. Variations:

- Compound: legitimate-mint → unbacked-collateral → cross-protocol-borrow (Echo + Curvance pattern)
- Permit: signed-permit-replay → cross-chain-borrow (CANDIDATE-A class)
- Bridge: bridged-asset-doubled → liquidity-drain (Multichain July 2023 class)

If 5-10 entries here surface this same meta-pattern, brain candidate for a new family: **"Downstream-Composition Loss Compounding"** — the failure isn't in either single protocol but in the unguarded asset-trust composition between them.

### Discipline held under cyber pause

- **READ-ONLY filing** — defensive intel only, no PoC, no offensive surface, no public post
- **No autonomous Gate 2 scan triggered** by this entry — operator decides whether to add the Pattern H enrichment lens to active Gate 1 surface maps
- **Honest verification framing** — operator-reported facts marked as such; independent cross-source pending; Doctrine #0 (VERIFY-PREMISE-FIRST) acknowledged
- **No public posts** — filed to brain only; this is defensive intel, not disclosure-program content

---

## Entry 2026-05-21 — DC-8 cross-domain extension: Solana Anchor → MPC participant validation (theoretical, awaiting anchor)

> Source: TruFin Solana solana-smart-contracts Gate 1 2026-05-20 (CANDIDATE-G #1) + operator validation msg 7408 (DC-8 confirmed across Adevar C-native + Adevar Rust-Anchor + OnRe Solana + TruFin Solana = 4 anchors, family law) + CB-MPC research-pass 2026-05-21 (theoretical MPC-side analog identified, not yet anchored).

### Cross-domain hypothesis

**DC-8 current statement:** "Validation moved from the type-system boundary into mutable function body, where the compiler/framework no longer enforces it."

**DC-8 Solana phrasing:** "Anchor `Signer<'info>` constraint moved out of Accounts struct into function-body `is_signer` check."

**DC-8 MPC analog (PROPOSED, not yet anchored):** "MPC participant-validation moved from session-state binding into per-round message-handling code, where each round's validation is independent of session identity."

If proposed instance were real, the construction would be:

- A two-party MPC protocol where the session-state struct contains `expected_party_id`
- But the per-round message handler accepts ANY message that passes signature verification, without re-checking the message originated from `expected_party_id`
- A malicious second party can swap participants mid-protocol, causing one honest party to complete a sign with a counterparty they didn't agree to

Status: **CONJECTURE — no public anchor yet.** CB-MPC is heavily audited (Coinbase internal → OSS path) and would be the obvious place to check. Filing as defensive intel for future hunting.

### Why this might be a true cross-domain law

DC-8 is structurally about "framework guarantees that get refactored away":

| Domain                                | Framework guarantee                                           | Refactor regression                        |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| Anchor (Solana Rust)                  | `Signer<'info>` in Accounts struct = compile-time enforcement | Move to function-body `is_signer` check    |
| C-native (Solana Rust without Anchor) | Manual struct validation in `try_from_account_infos`          | Move to handler function                   |
| MPC frameworks (CB-MPC, GG18/20 libs) | Session-state binding at protocol initialization              | Move to per-round handler                  |
| Cosmos SDK (Go)                       | `IsValid()` on msg type at decode                             | Move to handler logic                      |
| EVM Solidity                          | `onlyRole(...)` modifier                                      | Move to function-body `hasRole(...)` check |

**The law is not language-specific. It's framework-discipline-specific.** Any framework that offers a declarative typed-boundary validation, then allows engineers to move it to function bodies, exhibits DC-8.

### Hunting target — CB-MPC

When Gate 2 deep-dive on CB-MPC happens (post-Veda + Ethena submits), focus on:

1. `src/cbmpc/protocol/ecdsa_2p.cpp` — is the second-party identity bound to the session at handshake? Or re-validated only by signature each round?
2. `src/cbmpc/protocol/ecdsa_mp.cpp` — multi-party variant has more participants; binding more critical
3. `include-internal/cbmpc/internal/protocol/mpc_job.h` (492 LOC, the session-coordinator) — likely the central binding point. If session-state doesn't pin `participant_ids[]`, DC-8 exposure exists.

### Adjacent priors

**Pattern G (Capability-Injection via Asset-Receive Hook) — close kin.** In ERC721 onReceived, the recipient is supposed to validate the SENDER but often just trusts the token contract. Same family of "framework-guarantee-skipped" bug.

**Pattern E (DKLs23 ECDSA-2P session-bind).** Academic literature already documents this class — participant identity must be bound at protocol init, not re-derived from signatures alone. Lindell's "Fast secure two-party ECDSA signing" (2017) explicitly warns about this.

---

## Entry 2026-05-21 — Dual-trust mint chain (Lombard Finance defensive pattern + cross-pollination)

> Source: Lombard Finance Gate 1 2026-05-20 (`hunts/2026-05-21-lombard-gate1.md`).

**Defensive pattern (not a fragility law; cross-pollination opportunity):**

Lombard's mint flow requires TWO independent signers to agree:

1. **Consortium signature** on GMP payload (delivered via Mailbox.deliverAndHandle)
2. **Bascule trustedSigner signature** on a deposit report (separately reported via reportMints / reportDeposits)

For ANY mint to land:

- Consortium notarizes the payload (Mailbox-side)
- Bascule trustedSigner separately notarizes (deposit-history-side)
- Both must agree on `(nonce, chainid, recipient, token, amount)` via `_mintID = keccak256(abi.encode(nonce, block.chainid, recipient, toToken, amount))`

This is "3-of-3 trust": (a) Consortium for delivery, (b) Reporter wallet to call reportMints, (c) trustedSigner key. Compromise of ANY single party doesn't unlock mints.

**Cross-pollination opportunity (Buzz BD lens):**

| Protocol                  | Current trust depth                                    | Could adopt dual-trust?                                                                          |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Wormhole (Guardian set)   | Single-tier signature (19/13 quorum)                   | Could add 2nd-tier trustedSigner per chain                                                       |
| cBridge                   | Single-tier multisig                                   | Same                                                                                             |
| Symbiotic shared security | Single-tier slashing oracle                            | Same                                                                                             |
| LayerZero (DVN)           | Single-tier message verification                       | Already partially dual (DVN + Executor) — but no amount-side reverification                      |
| THORChain Bifrost         | Single-tier TSS (recently exploited 2026-05-15 $10.8M) | **TSSHOCK class — adding 2nd-tier amount-validation would have caught the unauthorized release** |

This isn't a vulnerability — it's an opportunity for protocols WITHOUT dual-trust to consider adding it. **Defensive-architecture upsell candidate for any Lane 1.5 outreach where the target is a single-tier bridge with a recent incident.** THORChain specifically (post-Bifrost-exploit) is the natural target.

---

## JIT-Yield-Capture as Structural Property of Rebase-Mint-1:1 Protocols (filed 2026-05-25, Ogie msg 7715 proposal C)

> **Authority:** origin-dollar Gate 2 task #53 second-pass economic analysis. Operator-approved msg 7715. MEDIUM-ceiling severity by structural design.

**Property statement:**

> For ANY rebase-share protocol where: (a) `_mint(amount)` increases both `totalSupply` AND `vaultValue` 1:1 (i.e., minting OUSD against $1 stable creates 1 OUSD share + adds $1 to vault), AND (b) the rebase formula computes `newIndex = vaultValue / totalSupply`, AND (c) the rebase is triggered on a scheduled cadence (cron / Defender Action / TWAP window), THEN an attacker can JIT-mint shares pre-rebase + redeem post-rebase to capture a fraction of the realized yield. The captured fraction = `attacker_capital / (attacker_capital + existing_supply)` × `realized_yield_per_rebase`.

**Math worked example (Origin OUSD scale):**

```
existing_supply         = $50,000,000 (rebasing TVL)
realized_yield_per_12h  = $5,000 (typical Origin OUSD yield, $10K/day / 2 rebases)
MAX_REBASE_cap          = 2% per rebase (Origin parameter)
attacker_JIT_capital    = $50,000,000 (JIT flash-loan, 1:1 match)
withdrawal_lockup       = 10 minutes (Origin parameter)

attacker_captured_yield = $5,000 × (50M / (50M + 50M)) = $2,500
JIT_capital_cost        = ~$5 (10min @ 0.5 bps/min flash-loan fee on $50M)
net_profit              = ~$2,495 per attack
attacks_per_day         = 2 (one per rebase)
gross_daily             = ~$5,000

practical_bound: realized_yield_per_rebase × min(attacker_fraction, 0.5) - JIT_capital_cost
```

**Why this is STRUCTURAL not exploit:**

1. The protocol's `_mint(amount)` is a public function; any user can call it
2. The realized yield is by-design distributed to ALL holders pro-rata at rebase time
3. The attacker's JIT capital DOES increase the existing supply AND the vault value 1:1, so they ARE entitled to a share of yield
4. The economic ceiling is bounded by `realized_yield_per_rebase`; cannot exceed it
5. Any submission to a bounty program is rejected as "intended-by-design rebasing behavior"

**Where this BECOMES a real bug (not just structural):**

- If `_mint(amount)` adds to `totalSupply` but does NOT add 1:1 to `vaultValue` (mint-yield divergence) → infinite-mint angle
- If withdrawal lockup is < rebase frequency / 2 (e.g., 5min lockup with 10min rebase) → attacker can rotate capital faster than yield
- If multiple rebase paths exist (admin manual + cron + emergency) AND an admin manual rebase can be triggered by attacker (e.g., callable by anyone, gas-paid) → attacker can amplify yield-capture rate
- If realized_yield is computed from a manipulable source (oracle-driven AUM, attacker-controllable strategy)

**Triage rule (Gate 1 standing-intake calibration):**

For any rebase-protocol Gate 1, run the JIT-yield-capture upper-bound math BEFORE deep-reading. If `realized_yield_per_rebase × 0.5 - JIT_capital_cost` < Critical threshold ($75K typically), then any rebase-timing-attack class is bounded below submission viability AND likely OOS as prior-audit-covered design property. Skip deep-read on rebase-timing-attack class; redirect to non-rebase substrates in the same target (oracle, admin, hooks).

**Cross-pollination scan targets:** every rebase-1:1 protocol — OUSD (Origin), OETH (Origin), sUSDS (Sky), Sturdy stable-vaults, Reflexer RAI (formerly), Frax FRAX-yield, Yearn V3 vaults with rebase-style accumulation. For each: confirm `_mint` adds 1:1 to vault value (if NOT 1:1, escalate). Cross-reference with `realized_yield_rate` from public dashboards (DefiLlama, oracle-feed publishers).

**Detector implication:** NOT a Layer-1d substrate detector — this is a Gate-1-economic-foreclosure template. File under brain Doctrine #31a or as Standing-Intake Step 2 sub-rule. Detector value: ZERO. Triage value: HIGH (saves Gate 2 wall-clock on bounded-economic-class targets).

**R8 tags:**

- `[INSPECTED]` Origin OUSD `_mint` 1:1 vault-value addition (VaultCore.sol:78-85)
- `[INSPECTED]` Origin OUSD `_rebase` headroom formula (VaultCore.sol:506)
- `[INSPECTED]` MAX_REBASE 2% cap (Origin VaultStorage.sol)
- `[INSPECTED]` 10-minute withdrawal lockup (Origin Vault)
- `[INSPECTED]` Origin rebase cadence 12h average (mainnet event-log query, task #53 V1)
- `[ASSUMED]` JIT-capital cost ~0.5 bps/min flash-loan fee (typical market rate)
- `[ASSUMED]` Captured-fraction proportionality (basic pool-math, no edge cases like rebase-time-snapshot vs continuous accrual)

**Source:** origin-dollar Gate 2 task #53, 2026-05-25, foreclosure-receipt at `data/lane1/gate2-clones/origin-dollar-rebase-sandwich-foreclosed.md`. Operator-approved msg 7715 proposal C.

---

## Selective-Coverage Defense Asymmetry Law (filed 2026-05-25, Ogie msg 7775 — Flying Tulip Sherlock Gate 1 proposal P3)

**Statement.** Any protocol defense mechanism with explicit, documented coverage exclusions creates a cross-domain fragility surface: the defense calibrates external auditor + integrator confidence ("this protocol has X defense"), while the documented exclusion creates a known-uncovered hot zone where the defense's existence increases (not decreases) per-path EV by inverting the implicit trust model. [INSPECTED]

**Why this is a cross-domain law, not a single-protocol heuristic:**

1. **Auditor-time exclusion** — auditors review code coverage, not exclusion-list reasoning. A documented exclusion in README or NatSpec is "out of scope" by virtue of being acknowledged. [INSPECTED]
2. **Integrator-time exclusion** — downstream integrators (other protocols composing on this one) inherit the defense-coverage assumption. When the excluded path becomes an integration surface, the trust assumption propagates one layer deeper. [ASSUMED]
3. **Attacker-time exclusion** — attackers reading public docs find the exclusion list directly. Documented exclusions become the attack roadmap. [INSPECTED]
4. **Post-deploy exclusion** — when a protocol UPDATES its defense module to ADD an exclusion, the change-set is rarely re-audited at parity. The exclusion-add commit is structurally low-attention. [ASSUMED]

**Cross-domain implication:** the fragility extends from the host protocol to every downstream consumer that composed on the defense's coverage claim. Cap Sherlock Gate 1 produced 5 candidates anchored to post-audit composition (Doctrine #34); the same pattern applies inverted here — excluded coverage creates downstream-consumer fragility even when the host code is unchanged.

**Flying Tulip canonical anchor (2026-05-25, [INSPECTED] README-only):** CircuitBreaker `withdrawFT()` exclusion. README verbatim: "CircuitBreaker notably does not cover putManager.withdrawFT() by design choice." Exclusion is intentional design — likely UX/liveness trade-off. EV on the excluded path is uncalibrated by public-source pass (no source-read, no submission path; Flying Tulip Sherlock contest #1223 FINISHED). Lens-tracked, no promotion yet.

**Sibling anchors (future scan targets, [ASSUMED]):**

- **Aave V3** flashLoan paths excluded from certain reserve-config guards (would need source-confirmation)
- **Compound** liquidate function explicit pause-bypass
- **Olympus BLVault** MIN-cap defense excluded for emergency unwind paths
- **Curve V2** selective-TWAP path divergence
- **Any LayerZero OFT consumer** with default-DVN trust + custom-DVN exclusion list (sibling to CANDIDATE-A LZ-OFT-default-DVN trust enrichment, C-Cap-2)

**Detection signature** (for Standing-Intake Step 2 BRAIN OVERLAP application):

1. Step 1 PROFILE returns "has named defense mechanism" → fire lens
2. Grep README + NatSpec + source comments for: "not covered", "by design", "excluded from", "intentional bypass", "design choice"
3. For each documented exclusion, enumerate downstream consumer protocols + verify whether they composed on the FULL defense coverage claim vs the EXCLUSION-AWARE coverage claim
4. Surface as candidate to Step 5 detector rotation

**Promotion path:** filed as Cross-Domain Law (this entry) + Lens (`Lens-FT-CircuitBreaker-Asymmetry.md`). CANDIDATE-letter promotion requires 2 additional anchors with confirmed-or-disclosed exploit paths (currently 1, Flying Tulip [INSPECTED] anchor).

---

## Future entries

When the next cross-domain public exploit hits, file under this ledger with the same schema. Pattern goal: 5-10 entries here surface a meta-pattern about cross-domain fragility that becomes a Pattern J in `audit-methodology-v2.md`.

---

_Cross-Domain Fragility Laws ledger | v2.0 | 2026-05-25 (Selective-Coverage Defense Asymmetry Law filed per Ogie msg 7775 — Flying Tulip CircuitBreaker `withdrawFT()` documented exclusion, first cross-domain law on this family; companion to `Lens-FT-CircuitBreaker-Asymmetry.md` + `Operator-Brief-Reconciliation.md` + Crossmap row 36; v1.9 footer history preserved below.)_

_Prior footer — v1.9 | 2026-05-25 (DC-18/19/20 promotions [CANDIDATE-V→DC-18 reward-accumulator + CANDIDATE-Y→DC-19 self-transfer-mutation + CANDIDATE-Z→DC-20 rebase-cache] per Ogie msg 7725 + 3 lifi brain proposals A/B/C filed: DC-14 LiFi post-2022 reference baseline INTACT, Doctrine #31a cross-chain rebase-bridge variant via LidoWrapper @dev-warning structural defense, Doctrine #27 sub-rule for ≥30-audit + ≥18mo sustained cadence with 0.4× maximum discount + skip-deep-trace; v1.8 footer history preserved below.)_

_Prior footer — v1.8 | 2026-05-25 (JIT-Yield-Capture as Structural Property of Rebase-Mint-1:1 Protocols filed per Ogie msg 7715 proposal C — origin-dollar Gate 2 second-pass economic analysis bounded ~$2-3K profit per attack on $50M TVL, below Critical threshold + likely OOS prior-audit territory; Gate-1-economic-foreclosure template added for future rebase-protocol Gate 1 dispatches; v1.7 footer history preserved below.)_

_Prior footer — v1.7 | 2026-05-21 (DC-8 cross-domain extension to MPC theorized after CB-MPC research pass — conjecture filed pending CB-MPC Gate 2; Lombard dual-trust mint chain filed as defensive pattern + cross-pollination opportunity for single-tier bridges, THORChain Bifrost specifically called out as Lane 1.5 candidate; v1.6 footer history preserved below.)_

_Prior footer — v1.6 | 2026-05-19 (Echo Protocol $822K eBTC unauthorized mint on Monad filed as Pattern H enrichment per operator msg 7286 — "Admin Key = Trust Anchor Collapse" sub-class formalized; CANDIDATE-A cross-reference extended with bridge-mint-authority verification surface survey list across Wormhole / cap / Lido / Renzo / Stader / Rocket Pool / Veda; Curvance leg flagged as cross-protocol-loss-compounding meta-pattern candidate for future family promotion; v1.5 footer history preserved below.)_

_Prior footer — v1.5 | 2026-05-18 (Monday active poll updates: THORChain Hypothesis C corroborated by 3 independent sources [SlowMist + t.me/s/thorchain official msg 989-990 + cryptotimes.io PeckShield/Cyvers/Chainalysis attribution] — promoted from "Telegram chatter only" to LEADING hypothesis as TSSHOCK-class GG20 TSS share-leak vuln; loss-figure tri-state $10.8M/$7.4M/$4.9M tracked pending Medium PM; CANDIDATE-A standalone path preserved but anchor forfeited; ShapeShift FOX Colony $132.7K 2026-05-13 filed as 4th CANDIDATE-F worked example [meta-tx forwarder + DSAuth self-call asymmetry, 4th worked across 2 domains, codification threshold quantitatively crossed]; Aurellion Labs $455K + Adshares Bridge $628K logged as known-class no-brain-update [Pattern G + AION Family #5 respectively]; Wormhole zero May 2026 disclosures confirmed [no competition-risk signal]; Twitter primary + 2 alternates rate-limit-blocked 503 — Poll D partial coverage only.)_
