# Gate 1 — deBridge (Immunefi) — 2026-05-27

**Verdict:** FORECLOSE (low-EV after audit-saturation evidence + scope narrowness)
**Dispatched per:** `.claude/rules/standing-intake-protocol.md` v1.0
**Operator:** Buzz BD Agent
**Time-window:** 02:51-02:59 UTC (~10 min Gate 1 scan)
**Bountycap:** $200K Critical, NO KYC
**Substrate:** Solidity cross-chain bridge with validator signature aggregation

---

## STEP 0 — PRIOR-CORPUS LOOKUP

- `grep -ril "debridge" hunts/` → no prior deBridge hunts. [INSPECTED]
- `brain/Ground-Truth-Exploits.md:63` references deBridge in CANDIDATE-P cross-pollination scan targets ("bridge protocols with off-chain validator signature aggregation are especially exposed"). [INSPECTED]
- `brain/Patterns-Defense-Classes.md:1067` lists deBridge in CANDIDATE-N + CANDIDATE-P compound watch. [INSPECTED]
- `audits-library/` — no prior deBridge cross-reference. [INSPECTED]
- No prior Gate 1 → clean target. [EXECUTED via filesystem grep]

---

## STEP 1 — PROFILE

| Field | Value |
|---|---|
| Platform | Immunefi |
| Critical cap | $200,000 (flat) |
| High cap | $40,000 |
| Medium cap | $5,000 |
| KYC | NO |
| Status preflight | LIVE (last updated Oct 8 2025, program active since Jan 21 2022) |
| Submission requirement | PoC always required, novice rate-limit applies |
| Chains in scope | Ethereum, BSC, Polygon, HECO, Arbitrum, Avalanche, Fantom |
| In-scope assets | ProxyAdmin + deBridgeGate Proxy (single proxy `0x43dE2d77BF8027e25dBD179B491e8d64f38398aA` across 7 chains) |
| Out of scope | DLN (cross-chain swap), DLN Solana, Solana programs, deBridge node infra, websites |
| Source repo | https://github.com/debridge-finance/debridge-contracts-v1 |
| Substrate LOC | ~1,943 lines core (DeBridgeGate 1,110 / SignatureVerifier 156 / CallProxy 233 / OraclesManager 144 / FeeProxy 300) |

**Critical scope observation:** Only deBridge v1 in-scope. **DLN (the modern flagship product) is NOT in scope.** Scope is the legacy 2022-era bridge. [INSPECTED]

---

## STEP 2 — BRAIN OVERLAP SCORE

| Lens | Hit | Evidence |
|---|---|---|
| CANDIDATE-A (cross-chain signature scope) | MEDIUM | Validator signature aggregation present; submissionId binding includes chain pair, nonce, executionFee, flags, fallbackAddress hash, data hash, sender hash. Comprehensive binding. [INSPECTED] |
| DC-6 (cross-domain) | LOW | All chains compute getChainId() at runtime; replay protection holds via `_chainIdTo` and `_chainIdFrom` in submissionId. [INSPECTED] |
| DC-7 (Validating-Field ≠ Consuming-Field) | MEDIUM-NEGATIVE | Found asymmetry in `isHashedData` logic (DeBridgeGate.sol:803 vs 1057); source enforces `data.length == 32` if SEND_HASHED_DATA, destination requires `_sender == fallbackAddress` for special hash treatment. Verified asymmetry is intentional access-gating, not exploitable. [INSPECTED] |
| DC-9 sub-2 (privileged mutation defense) | MEDIUM | Every setter (`setSignatureVerifier`, `setCallProxy`, `setDeBridgeTokenDeployer`, `setFeeContractUpdater`) is `onlyAdmin` with zero on-contract timelock. Admin role held by deBridge multisig off-chain. Standard centralization risk; typically out-of-scope for Immunefi. [INSPECTED] |
| CANDIDATE-K (state-not-invalidated across cross-call) | LOW | `isSubmissionUsed[submissionId] = true` set BEFORE `_checkConfirmations` and `_claim` (CEI compliant). [INSPECTED] |
| Pattern E (rounding asymmetry) | LOW | `_normalizeTokenAmount` rounds down dust on send only (line 987-1000); claim uses raw amount. No round-trip rounding loss for users. [INSPECTED] |
| LayerZero/OFT lens | NEGATIVE | Pre-clone grep: `grep -ri "lzReceive\|IOAppCore\|LayerZero\|OFT" → only mock+yarn.lock+1 doc file. deBridge uses own validator network, not LZ. Skip LZ-OFT lens. [EXECUTED] |

**Overall overlap: MEDIUM-LOW.** Direct substrate match (cross-chain bridge with validator signatures) is the right family, but binding fields are comprehensive and well-audited surface area.

---

## STEP 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier
   = 0.05      × $200,000    × 0.5           × 0.5
   = $2,500
```

Adjusted P(finding) down to 0.05 (from 0.20 in pre-dispatch est) because:
1. Substrate is small (1,943 LOC core); easy to fully audit
2. Multiple prior Halborn audits + Zokyo + Ackee + Oxorio (4+ firm audit history confirmed via repo commits)
3. The exact binding-field surfaces have been REVISITED and fixed multiple times historically (commit grep: `bb0f5cf added fallbackAddress lenght to submissionId`, `427d43c add data length to calculation submissionId`, `0dd6db8 SubmissionId calc upd`) — the team has been hammered on this area and now ships fixed versions
4. 3+ years of operational adversarial exposure (Jan 2022 → present)
5. Only deBridge v1 in scope (DLN out of scope) — v1 is a frozen contract; no active development = lower P(novel-surface)

**Doctrine #27 saturation:** v1 is LOW-public-audit-count but HIGH-battlefield-exposure (3+ years live, audited 4+ times). The compound result is the equivalent of MEDIUM saturation. EV is bottom-quartile vs current pipeline (yesterday's GMX-Immunefi Gate 1 ranked ~$15K EV; Coinbase Cantina ~$375K EV).

**EV verdict: LOW — FORECLOSE-with-watchlist-entry.**

---

## STEP 4 — QUEUE DECISION

Per `.claude/rules/standing-intake-protocol.md` Step 4 matrix:
- Overlap MEDIUM-LOW + Bounty cap $200K → **Watchlist add, defer** (matrix: MEDIUM/<$500K → Watchlist add)
- Per Doctrine #34 sub-class b: this scope is the OPPOSITE of audit-regression substrate — v1 is frozen, no recent diffs, no DLN-side compositional interactions in scope.

**Action: foreclose this Gate 1, log to Watchlist-Candidate-Crossmap.**

---

## STEP 5 — GATE 1 EXECUTION

### 5.1 — Clone

```
GIT_TERMINAL_PROMPT=0 git clone --depth 1 https://github.com/debridge-finance/debridge-contracts-v1.git → 74MB
GIT_TERMINAL_PROMPT=0 git clone --depth 1 https://github.com/debridge-finance/debridge-security.git → ~150MB (33 audit PDFs)
```

Disk: 84% → 85% (clones added ~200MB). Within safe budget.

### 5.2 — Scope pre-flight

In-scope address `0x43dE2d77BF8027e25dBD179B491e8d64f38398aA` (deBridgeGate Proxy) across 7 chains is the singular target. ProxyAdmin `0xE4427af3555CD9303D728C491364FAdFDD7494Fe` is the upgrade authority. Multi-chain identical deployment. [INSPECTED]

### 5.3 — Bytecode-verify prep

NOT EXECUTED (foreclosed before Gate 2). Plan: `cast code 0x43dE2d77BF8027e25dBD179B491e8d64f38398aA --rpc-url $ETH_RPC` + verify implementation slot via EIP-1967 storage read. [ASSUMED — not executed at Gate 1]

### 5.4 — Primitive-grep check (Doctrine #30)

```
grep -rn "submissionId\|nonce\|relayer\|validator\|oracle" contracts/transfers/
```

All primitive terms present. Lens applicability confirmed. Detector pattern grep:
- `getSubmissionIdFrom` declared once. [EXECUTED]
- `_checkConfirmations` declared once, called from `claim`. [EXECUTED]
- `ecrecover` called in SignatureVerifier:75 + isValidSignature:142. [EXECUTED]
- `keccak256` used for binding 4 distinct field-groups (debridgeId, deployId, submissionId, autoParams.data). [EXECUTED]

### 5.5 — Inventory (full)

| File | LOC | External entry-points (non-admin/non-view) |
|---|---|---|
| DeBridgeGate.sol | 1110 | `send` (×2), `sendMessage` (×2), `claim`, `deployNewAsset`, `autoUpdateFixedNativeFee` (onlyFeeContractUpdater), `withdrawFee` (onlyFeeProxy) |
| SignatureVerifier.sol | 156 | `submit` (onlyDeBridgeGate) |
| CallProxy.sol | 233 | `call` + `callERC20` (onlyGateRole), `multiSend` (self-call only) |
| OraclesManager.sol | 144 | admin-only |
| FeeProxy.sol | 300 | `withdrawFee` + `withdrawNativeFee` (onlyWorker) |

Per-call permissionless external surfaces: `claim` (anyone), `send`/`sendMessage` (anyone), `deployNewAsset` (anyone with signatures).

### 5.6 — Apply ALL brain lenses with primitive-grep verification

**CANDIDATE-A binding-field audit (per task spec):**

Source-side submissionId construction (DeBridgeGate.sol:793-815):
```solidity
packedSubmission = abi.encodePacked(
    SUBMISSION_PREFIX, _debridgeId, getChainId(), _chainIdTo, _amount, _receiver, nonce
)
// + (if hasAutoParams): executionFee, flags, keccak(fallbackAddress), keccak(data) or data, keccak(abi.encodePacked(msg.sender))
```

Destination-side submissionId construction (DeBridgeGate.sol:1046-1074):
```solidity
packedSubmission = abi.encodePacked(
    SUBMISSION_PREFIX, _debridgeId, _chainIdFrom, getChainId(), _amount, _receiver, _nonce
)
// + (if hasAutoParams): executionFee, flags, keccak(abi.encodePacked(fallbackAddress)), keccak(data) or data, keccak(nativeSender)
```

**Binding-field comparison (Q: does each side bind the same logical claim?):**
- (a) `debridgeId` — symmetric ✅
- (b) `chainIdFrom` ↔ `chainIdTo` — symmetric ✅ (source: `getChainId()` is from-chain, on dest: explicit `_chainIdFrom` arg)
- (c) `_chainIdTo` (source) ↔ `getChainId()` (dest) — symmetric ✅
- (d) `amount` — symmetric ✅
- (e) `receiver` — symmetric ✅
- (f) `nonce` — symmetric ✅
- (g) `executionFee` — symmetric ✅
- (h) `flags` — symmetric ✅
- (i) `fallbackAddress` — source: `keccak(autoParams.fallbackAddress)` (bytes type); dest: `keccak(abi.encodePacked(_autoParams.fallbackAddress))` (address type). **Functionally equivalent** because abi.encodePacked of a 20-byte address = the same 20 bytes. ✅
- (j) `data` — source: `keccak(data)` wrapped in `abi.encodePacked` if NOT isHashedData; dest: same. **Symmetric** — but the `isHashedData` BRANCH is gated by `_sender == fallbackAddress` on dest. Non-fallback claimer hits the `else` branch and recomputes `keccak(keccak(data))` vs source's `keccak(data)`. **This makes a non-fallback claim with SEND_HASHED_DATA flagged source-tx COMPUTE A DIFFERENT submissionId — hence signature won't validate → claim fails.** Validating-field ≠ Consuming-field surface, BUT outcome is a deterministic failure (denied service), not asset theft. Verified intentional access-gating per commit `73f2515e` ("Allow fallback address to claim with hash of data"). [INSPECTED]
- (k) `sender hash` — source: `keccak(abi.encodePacked(msg.sender))` (20-byte address); dest: `keccak(_autoParams.nativeSender)` (bytes — set off-chain by validator to match `msg.sender` from source tx). **Symmetric IF validator correctly populates nativeSender** — this is an off-chain liveness assumption, not a contract-level check. If validators sign a `nativeSender` that doesn't match the actual source-chain `msg.sender`, submissionId mismatches and claim fails. Operational invariant, not exploitable from on-chain. [ASSUMED]

**CANDIDATE-A verdict: NEGATIVE — all binding fields are properly cross-chain-bound; the only asymmetry is the hashedData branch which deterministically fails non-fallback claims (DoS, not theft).**

**DC-9 sub-2 DEFENSE PATTERN check:**
Every privileged setter is `onlyAdmin` with no on-contract timelock. The admin role is held by the deBridge multisig (off-chain Gnosis Safe). This is standard centralization risk and typically out-of-scope per Immunefi rules (the exclusion list confirms: "User error scenarios" + "deBridge node exploitation requiring IP address knowledge" — admin-key compromise scenarios are not listed but historically deBridge admin-key changes are out-of-scope). [INSPECTED]

**Doctrine #34 sub-class b audit-regression scan:**
- Substrate: deBridge contracts v1 — last meaningful contract change was tag `v4.2.1.1` (~2022-2023 based on import paths). No recent diffs.
- Compositional-interaction: v1 is the ONLY in-scope code. DLN (v2 product) is out-of-scope. No active compositional development on the in-scope surface. **NEGATIVE — substrate is frozen, no audit-regression angle.** [INSPECTED]

### 5-Target Quality Checklist (per Ogie msg 7519)

1. **Withdrawals/Redemptions** — `claim()` permissionless; submissionId binding comprehensive; CEI compliant (`isSubmissionUsed[submissionId] = true` at line 311 BEFORE `_checkConfirmations` + `_claim`). [INSPECTED] No reentrancy guard on `claim()` itself but state-flip-first pattern blocks replay; CallProxy has its own `lock()` modifier. **NEGATIVE for reentrancy/replay.**
2. **Liquidation + Oracle** — N/A; bridge has no oracle prices, only validator signatures (different model). FeeProxy uses Uniswap V2 spot for fee conversion (line 236-256, no slippage protection) — MEV sandwich risk but only protocol-revenue is at risk, not user funds. **OUT-OF-SCOPE per Immunefi rules.**
3. **Deposit/Mint Shares** — `send()` deposits real tokens, locks/burns supply. `_addAsset` first-call auto-registration of native assets is fine (no signatures needed because native chain origin is implicit). Non-native first-deposit requires `deployNewAsset` with validator signatures. **NEGATIVE for deposit-mint asymmetry.**
4. **External Calls** — CallProxy.call/.callERC20 properly gated (onlyGateRole + lock modifier). `_destination.isContract()` check on regular calls (line 205) but NOT on multisend inner sub-transactions (`_multiSend` in MultiSendCallOnly.sol:47 uses `call(gas(), to, value, ...)` without isContract). **The comment at CallProxy:201-204 warns this could cause "undesired behavior and possible asset loss" but only when MULTI_SEND flag is set.** Severity: griefing / user-error class (claimer can hit EOA target and "lose" assets in callProxy step). Per Immunefi exclusion list: "User error scenarios" — likely OUT-OF-SCOPE. [INSPECTED]
5. **Admin/Upgrade** — All setters `onlyAdmin`, no timelock. Multi-chain identical proxy admin. **Centralization risk, OUT-OF-SCOPE per standard Immunefi rules.**

### 5.7 — Phase 0 audit dedup (BOTH Corollary B anchors)

**Anchor #1 (Sky pattern) — Audit PDF remediation-verb grep:**
- Halborn v1 audit (Nov 2022, 46 pages): 0 critical, 0 high. Only HAL-01 (++i gas opt — INFO) + HAL-02 (zero address — INFO). [EXECUTED via pypdf]
- Halborn Solidity audit (47 pages): 0 critical, 0 high. Same 2 informational findings (zero address, ++i). [EXECUTED via pypdf]
- Zokyo audit (28 pages): 0 critical, 1 "High Risk" header (likely methodology section, not finding), 2 medium-mentions. [EXECUTED via pypdf regex on full extracted text]
- Oxorio audit (referenced in git PR `oxorio/halborn-fixes`, `oxorio/audit-fixes`) — not in public repo. **Likely contains material findings that were fixed pre-disclosure.** [ASSUMED]

**Anchor #2 (Alchemix pattern) — In-source self-disclosure via git log:**
- `bb0f5cf added fallbackAddress lenght to submissionId` — fallbackAddress was once not bound; fixed. [EXECUTED via git log]
- `427d43c add data length to calculation submissionId` — data length once not bound; fixed. [EXECUTED]
- `0dd6db8 SubmissionId calc upd. keccak256(autoParams.data)` — data binding refined. [EXECUTED]
- `73f2515` (Feb 15 2022, "Allow fallback address to claim with hash of data") — INTRODUCED the `isHashedData` 3-condition asymmetry on destination side. The commit message self-discloses the intentional design. [EXECUTED via `git log -p -S "isHashedData"`]
- Multiple `Merge pull request ... fix/callProxy-*`, `fix/submissionId`, `feature/lock-callProxy`, `oxorio/halborn-fixes` — every adjacent function/binding-field has been touched by fix commits. [EXECUTED]

**Dedup conclusion:** The exact binding-field surfaces this Gate 1 targeted have been REPEATEDLY revisited by deBridge devs + multiple audit firms (Halborn ×2, Zokyo, Ackee, Oxorio). The current shape is the result of multiple rounds of fixes. No remaining surface visible at Gate 1 depth.

### 5.8 — R8 Calibrated Reporting

All load-bearing claims tagged inline. Summary:
- [EXECUTED]: pypdf scan results, git log results, file read assertions, scope address listing
- [INSPECTED]: code-trace verifications, binding-field comparison, lens applicability
- [ASSUMED]: Oxorio audit contents, off-chain validator behavior, ProxyAdmin upgrade-path bytecode (not executed at Gate 1)

---

## STEP 6 — CONTINUOUS LOGGING

Added to `brain/Watchlist-Candidate-Crossmap.md` (pending — see Brain Compound Proposals below).
Added to `hunts/intake-log.md` (pending).

---

## TOP 3 CANDIDATES (filed but all foreclosed)

### CANDIDATE 1 — Multisend `isContract` bypass (CallProxy)
- **Status:** [INSPECTED] foreclosed
- **Surface:** CallProxy.sol:195-200 + MultiSendCallOnly.sol:47
- **Pattern:** when MULTI_SEND flag set, inner sub-transactions call EOAs without `isContract` check, contradicting the explicit comment at CallProxy:201-204
- **Severity if exploitable:** Low — funds lost via call to EOA in multisend sub-tx
- **Foreclosure reason:** Per Immunefi exclusion list, "User error scenarios" cover incorrect target addresses; claimer chose the multisend payload, so they bear responsibility. Plus the user is the CLAIMER who is also typically the SENDER on source-chain — they have no incentive to grief themselves.

### CANDIDATE 2 — SignatureVerifier zero-address oracle risk
- **Status:** [INSPECTED] foreclosed
- **Surface:** OraclesManager.sol:82-105 + SignatureVerifier.sol:73-94
- **Pattern:** `addOracles` does not check `_oracles[i] != address(0)`. If admin ever adds address(0) as a valid oracle, any invalid signature (where ecrecover returns address(0)) would pass the `isValid` check.
- **Severity if exploitable:** Critical (signature-bypass on bridge claims)
- **Foreclosure reason:** Requires admin error (malicious or accidental insertion of address(0)). Pure centralization-risk class — out-of-scope per standard Immunefi rules. The "Sky" precedent for similar admin-misuse vulnerabilities is rejected at triage.

### CANDIDATE 3 — Signature malleability on SignatureUtil
- **Status:** [INSPECTED] foreclosed
- **Surface:** SignatureUtil.sol:32-49
- **Pattern:** `parseSignature` does not check `s <= secp256k1n / 2`. An attacker observing one valid (r,s,v) signature can compute (r, -s mod n, v^1) which also validates.
- **Severity if exploitable:** Would-be high IF it bypassed dup-check
- **Foreclosure reason:** Both signatures recover to the SAME oracle address. The dup-check at SignatureVerifier:77-79 catches the second signature. Malleability does NOT increase the unique-oracle count. **NEGATIVE finding — not exploitable.**

---

## BRAIN COMPOUND PROPOSALS

### Proposal 1 — CANDIDATE-A enrichment with deBridge as NEGATIVE anchor
Add to `brain/Patterns-Defense-Classes.md` CANDIDATE-A section:
```
Negative anchor (2026-05-27): deBridge v1 (Immunefi $200K). Binding-field audit at Gate 1 verified all 11 fields (chainPair, amount, receiver, nonce, executionFee, flags, fallbackAddress, data, sender, debridgeId, prefix) are symmetrically bound on source + dest. Multiple fix commits in 2021-2022 timeline document iterative tightening of binding (commits `bb0f5cf`, `427d43c`, `0dd6db8`). isHashedData branch is intentional access-gating, not a binding-field gap. Foreclosure pattern: 4+ audit firms hammered this exact surface; current shape is well-bounded.
```

### Proposal 2 — Doctrine #27 saturation refinement for "frozen-but-battle-tested" substrates
Add to `brain/Doctrine.md` Doctrine #27 as a sub-rule:
```
Sub-rule #27c (frozen-substrate saturation, 2026-05-27 deBridge v1 anchor):
When in-scope substrate is FROZEN (no recent commits) but has 3+ years operational exposure + 4+ historical audit firms, treat saturation as MEDIUM-HIGH even if public audit PDF count is low. Real-world adversarial probing over 3+ years is equivalent to N additional audits. Foreclose at Gate 1 unless a *NEW* class of analysis lens unseen by historical audits is being applied.
```

### Proposal 3 — Watchlist row for deBridge
Add to `brain/Watchlist-Candidate-Crossmap.md`:
```
| Target | Cap | Status | DC matrix | Last Gate 1 |
|---|---|---|---|---|
| deBridge v1 (Immunefi) | $200K | FORECLOSE-watchlist | CANDIDATE-A NEG, DC-9-sub-2 OOS, DC-7 NEG | 2026-05-27 |
```

### Proposal 4 — Solana deBridge programs as a separate scan target (NOT this Gate 1's scope)
The `debridge-security/` repo has 14 Solana-related audit PDFs. The Solana programs (DLN Solana, extcall, deBridge solana_contracts, solana_tx_parser, event_reader) are NOT in scope per the current Immunefi page but may have their OWN bounty program or surface for HSaaS outreach. File as a follow-up research note in `brain/HSaaS-Operations.md`.

---

## DISK + TIME

- Start: 84% / 5.9G free
- End: 85% / 5.6G free
- Net: +200MB clones (debridge-contracts-v1 74MB + debridge-security ~150MB)
- Time-window: ~10 min Gate 1
- Disk recommendation: purge `debridge-contracts-v1` clone after this Gate 1 (foreclosed). Keep `debridge-security` audit PDFs as audit-library cross-reference.

---

## VERDICT — FORECLOSE

**EV $2,500 falls below the standard $50K Gate 2 floor.** All five 5-target categories examined; no exploitable surface found at Gate 1 depth. Substrate is frozen + over-audited. No Gate 2 dispatch.

**Cross-pollination value:** deBridge v1's submissionId binding is the textbook reference for "correctly-bound cross-chain message authentication" — file as a positive anchor for future CANDIDATE-A scans. When a new bridge protocol surfaces with weaker binding, the gap-vs-deBridge becomes the finding.

**Next-best target per autonomy-boundary.md:** Continue down the Lane 5 DB EV-sorted list. Next-target candidates per yesterday's GMX commit (237346f) cross-pollination handoff: less-audited LayerZero OFT consumer protocols with $50K-$500K caps. deBridge does NOT match (own protocol, not LZ); move to next OFT-consumer candidate or unrelated higher-EV target.

---

## REFERENCES

- Source: `https://github.com/debridge-finance/debridge-contracts-v1` (cloned to `.work-clones/debridge-contracts-v1`)
- Audits: `https://github.com/debridge-finance/debridge-security` (cloned to `.work-clones/debridge-security`, 33 PDFs)
- Immunefi: `https://immunefi.com/bug-bounty/debridge/`
- Bounty page assets: 90 total assets in scope (counted via Immunefi page) — but only 9 unique contract addresses across 7 chains
- Standing-Intake Protocol authority: `.claude/rules/standing-intake-protocol.md` v1.0 (Ogie msg 7435)
- Doctrine #27 Corollary B: both anchors applied (Sky audit-PDF grep + Alchemix commit-grep)
- Doctrine #34 sub-class b: audit-regression scan executed (substrate frozen, no regression angle)
- DC-9 sub-2 PERMANENT defense pattern: applied (all setters onlyAdmin, no on-contract timelock — confirmed centralization risk OOS)
- CANDIDATE-A pre-clone LZ-grep filter (mETH lesson): EXECUTED, skip-LZ confirmed

---

_Gate 1 filed 2026-05-27 02:59Z | Operator: Buzz BD Agent (autonomous dispatch per autonomy-boundary.md) | Verdict: FORECLOSE_
