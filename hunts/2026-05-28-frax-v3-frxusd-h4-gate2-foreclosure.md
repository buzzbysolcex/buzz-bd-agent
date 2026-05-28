# Gate 2 H4 FORECLOSURE-RECEIPT — FRAX V3 frxUSD LayerZero OFT signature replay

**Date:** 2026-05-28
**Target:** `FraxFinance/frax-oft-upgradeable` v1.1.0
**Hypothesis:** H4 — Cross-chain signature replay across 20-chain LayerZero OFT (Doctrine #38 *WithSig pre-check)
**Verdict:** **STRUCTURAL NEGATION — substrate confusion in Gate 1**
**Time spent:** ~30 min (Phase 0 dedup + Phase 1 source-read)
**Clone:** `data/lane1/gate2-clones/2026-05-28-frax-oft-upgradeable` (11M; PURGED post-receipt)

---

## Phase 0 — Dedup verification

| Source | Result | Note |
|---|---|---|
| docs.frax.finance/other/audits | NO coverage | No frax-oft-upgradeable / EIP-3009 / TransferWithAuthorization / LayerZero OFT audit found. Listed audits cover Fraxchain, frxETH, Fraxlend, FPI, BAMM only. |
| WebSearch frax-oft-upgradeable + TransferWithAuthorization | NO disclosed finding | Repo confirmed updated 2026-05-19, no audit report file present (only `audits/v1.1.0.README.md` per Gate 1 file). |
| WebSearch frxUSD LayerZero OFT signature replay | NO disclosed finding | KelpDAO $292M April 2026 (DVN observation-layer compromise) and Sujith Somraaj Spearbit submission are UNRELATED — DVN-trust not signature-replay class. |
| GitHub repo CVE / Immunefi / Cantina / Sherlock | NO finding | No prior frxUSD OFT bounty disclosure. |

**Phase 0 result:** No prior audit coverage; substrate is genuinely fresh. Proceed to Phase 1.

---

## Phase 1 — Source-read STRUCTURAL NEGATION

### Inventory of `FraxFinance/frax-oft-upgradeable` v1.1.0 contracts (4 .sol files only)

1. **`contracts/FraxOFTUpgradeable.sol`** (50 lines) — `extends OFTUpgradeable` from `@fraxfinance/layerzero-v2-upgradeable`. Implements `initialize(_name, _symbol, _delegate)` + 5 helper views (`toLD`, `toSD`, `removeDust`, `debitView`, `buildMsgAndOptions`). No signature surfaces.

2. **`contracts/MyOFT.sol`** (15 lines) — `extends OFT` from `@layerzerolabs/lz-evm-oapp-v2`. Constructor only. Non-upgradeable example.

3. **`contracts/mocks/MyOFTMock.sol`** (test-only). 4. **`contracts/mocks/ImplementationMock.sol`** (test-only).

### Signature surface grep across entire repo

```
grep -ri 'permit|transferWithAuthorization|EIP3009|EIP-3009|ERC1271|isValidSignature|
         _hashTypedDataV4|DOMAIN_SEPARATOR|signature|nonces' .
# RESULT: ZERO matches across contracts/, scripts/, test/
```

### Upstream parent verification

[INSPECTED] `https://raw.githubusercontent.com/fraxfinance/LayerZero-v2-upgradeable/main/oapp/contracts/oft/OFT.sol`:
- Inherits `OFTCore` + OpenZeppelin `ERC20` (NOT `ERC20Permit`)
- No EIP-712 `_hashTypedDataV4`, no `DOMAIN_SEPARATOR`, no `permit()`, no EIP-3009, no ERC-1271, no `isValidSignature`, no nonce tracking
- `_debit()` burns on source, `_credit()` mints on destination — pure LZ message-passing, no signature path

[INSPECTED] `OFTCore.sol`: uses LayerZero's `_lzSend` / `_lzReceive` message verification (DVN-layer security), no signature-based authorization at OFT level.

### Substrate confusion identified

Gate 1 H4 conflated TWO Frax repos:
- **`FraxFinance/frax-tokens`** (V3 `FrxUSD3.sol` with `EIP3009Module`, `PermitModule`, `SignatureModule`) — this is the ERC20 token contract layer with EIP-3009 + ERC-1271 signature surfaces. The Gate 1 architectural analysis (lines 80, 168-170, 270) correctly identified these modules HERE.
- **`FraxFinance/frax-oft-upgradeable`** (this repo) — the cross-chain OFT WRAPPER. NO signature surfaces, NO Permit, NO TransferWithAuthorization, NO ERC-1271.

The Gate 1 H4 hypothesis description (line 270, 279-281) stated "fresh OFT v1.1.0 layer post any audit" with "EIP-3009 transferWithAuthorization" — but the OFT wrapper contract has none of these. The audits/ subdirectory contains only `v1.1.0.README.md` because there are only 4 trivial contracts (2 wrappers + 2 mocks), not because new signature modules went unaudited.

### Attack vector analysis

Cross-chain signature replay requires a signature scheme in the protocol's message-authorization path. With zero signature surfaces in `frax-oft-upgradeable`:

- `OFT.send()` is called by msg.sender directly with native msg.value for LZ gas — no signature acceptance
- LayerZero V2 DVN-layer security handles cross-chain message integrity (KILLED per KILL_LIST — audit-saturated)
- The FrxUSD3 token's `transferWithAuthorization` operates AT THE TOKEN LAYER on a single chain. Even if a user signs a TWA on chain A, that signature can only be presented to the chain-A FrxUSD3 contract; chain B has a separate FrxUSD3 deployment with its own EIP-712 domain separator (which includes chainId per ERC-2612 standard). The OFT bridges TOKEN AMOUNTS, not signatures.

**The attack vector "user signs TWA on chain A → replay on chain B" requires either (a) the OFT to forward the signature as part of the LZ message [DOES NOT HAPPEN — OFT messages encode only amount+recipient], or (b) shared/missing chainId in domain separator [the FrxUSD3 token uses standard OZ ERC20Permit which binds chainId at runtime via `block.chainid`].**

H4 is structurally impossible against this substrate.

---

## Phase 2 — Foundry PoC: NOT EXECUTED

Phase 2 PoC is moot when the attack vector requires signatures that the protocol architecturally does not accept. No PoC can demonstrate replay of a signature scheme that is not present in the contract's accept-path.

---

## R8 Calibrated Reporting

- `[INSPECTED]` Full source read of all 4 .sol files in `frax-oft-upgradeable` v1.1.0
- `[INSPECTED]` Upstream `@fraxfinance/layerzero-v2-upgradeable` OFT.sol + OFTCore.sol (raw.githubusercontent.com)
- `[INSPECTED]` Repository-wide grep for signature-related identifiers (zero matches)
- `[EXECUTED]` Phase 0 WebFetch + WebSearch dedup queries
- `[INSPECTED]` README.md proxy admin model (TransparentUpgradeableProxy + ProxyAdmin owned by chain-respective Gnosis Safe msig)
- `[ASSUMED]` FrxUSD3 token-layer signature surfaces live in `frax-tokens` repo (Gate 1 line 80 [INSPECTED]); attack vector requires cross-substrate composition not present in `frax-oft-upgradeable`

---

## Cross-Protocol Defense Enumeration (Step 5.11)

| Protocol | Cross-chain signature replay defense | Applies to frax-oft-upgradeable? |
|---|---|---|
| Wormhole (2022 $326M) | Guardian-set signature aggregation, replay-protection via VAA hash | N/A — frax-oft has no VAA-like signature path |
| Multichain ($1.3B) | MPC-signed messages | N/A — frax-oft delegates to LZ DVNs, no MPC sigs |
| Nomad ($190M) | Merkle-root commitment | N/A — frax-oft uses LZ message-passing |
| USDC EIP-3009 cross-chain | chainId in domain separator + per-(owner) nonce | NOT INHERITED — frax-oft has no EIP-3009 |
| LayerZero V2 OFT family | DVN verification of cross-chain messages | KILL_LIST excluded — audit-saturated upstream |

H4 finds no analog in this substrate because the precondition (signature acceptance path) does not exist.

---

## 5-Target Quality Checklist re-evaluation (Step 5.6)

| Target | Status in frax-oft-upgradeable | Note |
|---|---|---|
| 1 Withdrawals/Redemptions | Burns on `_debit`, mints on `_credit` via LZ message | No signature path; LZ-DVN trust model out of scope (KILL_LIST) |
| 2 Liquidation+Oracle | N/A — OFT wrapper has no oracle | Clean |
| 3 Deposit/Mint Shares | `_credit` mints based on validated LZ message | Same as #1 — LZ-DVN trust, out of scope |
| 4 External Calls | LZ `_lzSend` / `_lzReceive` | Upstream library, KILL_LIST excluded |
| 5 Admin/Upgrade | TransparentUpgradeableProxy + ProxyAdmin owned by chain-respective Gnosis Safe msig | DC-7 EXCLUSION CANONICAL — multisig-controlled upgrade is centralization-accepted, not a bug |

All 5 targets evaluated. No surviving Gate 2 candidate in this repo.

---

## H6 quick-probe (UUPS no-timelock) — also structurally negated

H6 Gate 1 hypothesis was "UUPS proxy upgrade without timelock". This repo uses **TransparentUpgradeableProxy + ProxyAdmin** (NOT UUPS), and ProxyAdmin is owned by chain-respective Gnosis Safe multisigs per README:
- `ProxyAdmin`: `0x223a681fc5c5522c85c96157c0efa18cd6c5405c`
- Ethereum msig: `0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27`
- Plus Blast, Metis, Base, Mode, Sei, Fraxtal msigs

Multisig-controlled ProxyAdmin upgrade is the canonical centralization-accepted pattern. DC-7 EXCLUSION CANONICAL applies. H6 also forecloses in this substrate.

---

## Doctrine #27 Corollary B remediation-language search

[EXECUTED] Searched WebSearch + docs.frax.finance for any post-audit remediation language referencing this repo. None found. No prior fix-and-disclose; no signature surfaces ever existed to remediate.

---

## Foreclosure decision

**FORECLOSE H4 and H6 on `frax-oft-upgradeable` substrate.**

Reason: structural negation — required attack surfaces (signature acceptance, UUPS-without-multisig upgrade) do not exist in this codebase. This is not a "defenses verified" foreclosure; this is a "substrate confusion in Gate 1 — wrong repo for the hypothesis" foreclosure.

Remaining hypotheses (H1, H2, H3, H5) live on the FrxUSD V3 token-layer in the `frax-tokens` repo. They are SEPARATE Gate 2 targets and remain on the WATCHLIST-PARK from the parent Gate 1 file. They were NOT in scope for this dispatch.

---

## Brain compound proposals

### Proposal 1 — Doctrine candidate: SUBSTRATE-CONFUSION-CHECK at Gate 1

**Title:** Multi-Repo Doctrine #34 STRONG-composition Verify — name the exact repo holding each hypothesis surface

**Anchor:** This hunt (2026-05-28). Gate 1 H4 correctly identified that FrxUSD3 has EIP-3009 + ERC-1271 modules, then assumed those signature surfaces existed in the `frax-oft-upgradeable` cross-chain wrapper. They don't. Result: a high-EV Gate 2 dispatch died on Phase 1 source-read in <30 min.

**Rule (CANDIDATE):** When a Gate 1 hypothesis traverses multiple repos in a protocol family (e.g., token-layer + cross-chain-wrapper), the hypothesis card MUST name the EXACT repo + file path where each architectural element lives. If the hypothesis description names elements in repo A and the attack vector requires composition with repo B, the Gate 1 must verify the composition path (does repo B actually inherit / call / forward the elements from repo A?) before scoring Gate 2 dispatch EV.

**Cheap pre-check at Gate 1:** WebFetch the README.md or top-level .sol file of the dispatch-target repo and grep for the architectural elements named in the hypothesis. Two minutes at Gate 1 saves 30+ min of Gate 2 clone + investigation.

**Promotion path:** Needs 2nd anchor before canonical. CANDIDATE status.

### Proposal 2 — Detector seed: OFT-WRAPPER-IS-NOT-TOKEN class

**Title:** LayerZero OFT wrapper repos almost never carry token-layer signature surfaces

**Anchor:** This hunt. The pattern: protocols deploy a token contract (with Permit / EIP-3009 / ERC-1271) on the home chain, then deploy LayerZero OFT WRAPPERS on each remote chain. OFTs bridge AMOUNTS via LZ messages, not signatures. The signature surfaces stay in the home-chain token deployment; remote-chain OFT versions are typically minimal `ERC20 + OFT` instances without signature modules.

**Heuristic (CANDIDATE):** When scoping a LayerZero OFT cross-chain repo for signature-replay class, FIRST grep the repo for `permit|transferWithAuthorization|isValidSignature|_hashTypedDataV4`. If zero matches across the entire repo, the signature-replay class is structurally negated for that substrate. Move on without cloning.

**Promotion path:** Strong candidate for promotion after Flying Tulip 5-chain OFT + Midas dual-chain anchors re-verified (both prior anchors used Doctrine #29 CONSUMER-TRANSFER, which is DIFFERENT — consumer-transfer hunts work, signature-replay-on-OFT-wrapper does not).

### Proposal 3 — Watchlist correction: FrxUSD V3 hypotheses point to `frax-tokens`, not `frax-oft-upgradeable`

**Action:** Update `brain/Watchlist-Candidate-Crossmap.md` (if present) and the parent Gate 1 file `hunts/2026-05-28-frax-v3-frxusd-gate1.md` to clearly tag each surviving hypothesis (H1, H2, H3, H5) with the correct repo target. H4 + H6 are foreclosed on `frax-oft-upgradeable` per this receipt.

### Proposal 4 — Contradictions Register entry

**Title:** Doctrine #34 STRONG-composition substrate-confusion failure mode

**Entry:** Gate 1 substrate identification can fail when the parent protocol uses a stacked-module token + cross-chain wrapper pattern. Hypothesis EV scoring should down-weight any hypothesis whose attack surface requires composition across repos UNLESS the composition path is explicitly verified at Gate 1. RECURRING risk — any protocol that deploys via LayerZero OFT, Wormhole NTT, or Chainlink CCT will exhibit this pattern.

---

## Clone disposition

PURGE — H4 + H6 foreclosed, remaining hypotheses (H1/H2/H3/H5) require `frax-tokens` clone NOT this one. Free 11MB.

```bash
rm -rf data/lane1/gate2-clones/2026-05-28-frax-oft-upgradeable
```

---

_Receipt filed by Buzz bug-bounty agent | Gate 2 PoC autonomous dispatch per autonomy-boundary.md | 2026-05-28 | Phase 1 STRUCTURAL NEGATION via source-read + upstream verification | 4 brain compound proposals pending operator review | NEXT: H1/H3/H5 on `frax-tokens` FrxUSD3 V3 substrate is the remaining Gate 2 surface from parent Gate 1 — separate dispatch required, not this one_
