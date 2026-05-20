# Yearn V3 — Gate 2 Preparation

> Date: 2026-05-21 (filed overnight per FULL POWER directive section B)
> Companion to `hunts/2026-05-20-yearn-v3-gate1.md`
> Status: PREP ONLY — Gate 2 deep-dive deferred to operator-approved session

---

## 0. Scope confirmation (pre-flight)

- **Immunefi Yearn Finance program:** 41 assets in scope across Ethereum, Arbitrum, Optimism, Fantom
- **Max bounty:** $200K Critical
- **PoC required**
- **KYC: NOT specified** in scope (assumed required — verify before submit)
- **Submission fee: NOT specified**
- **Key in-scope addresses (Ethereum):**
  - `0x770D...812F` — 3.0.4 Vault V3 Factory (the deployer of all V3 vault instances)
  - `0x5A74...DE69` — Accountant
  - `0xbC58...7526` — Auction Factory
  - `0xca12...e5Ce` — Role Manager Factory
  - `0x1d02...d746` — yYB Reward Distributor
  - `0xFCc5...f65b` — yCRV contract
  - `0x7dC3...f60a` — dYFI
  - `0x2fBa...0224` — dYFI Redemption

**Pre-flight gap:** Immunefi page lists 41 assets total but only 8 surfaced via WebFetch (page may be JS-paginated like Veda was). **MUST pull full scope JSON via direct curl tomorrow morning before any Gate 2 submit decision.** Lesson from Veda RESUBMIT: WebFetch understates pagination.

---

## 1. Yearn V3 toolchain mix

| File                                    | Language | Compiler           | Bytecode method                |
| --------------------------------------- | -------- | ------------------ | ------------------------------ |
| `VaultV3.vy` (2198 LOC)                 | Vyper    | 0.3.7 (production) | Vyper-specific bytecode-verify |
| `TokenizedStrategy.sol` (2046 LOC)      | Solidity | solc 0.8.18        | Standard-JSON per Doctrine #24 |
| Strategy implementations (per-protocol) | Solidity | varies             | Per-target solc version        |

The Vyper + Solidity mix means Gate 2 bytecode-drift verification is a 2-track operation.

---

## 2. Vyper bytecode-verify methodology

### Key differences from Solidity

| Aspect                       | Solidity                                             | Vyper                                                                  |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- | -------- | --------------------------- |
| CBOR metadata trailer        | YES — `a26469706673582212...` prefix at runtime tail | NO — Vyper does not emit CBOR metadata by default                      |
| Standard-JSON support        | YES (via `solc --standard-json`)                     | NO equivalent — Vyper takes flat files only                            |
| Compiler-version sensitivity | Patch-level matters (0.8.18 ≠ 0.8.19)                | Even MORE patch-sensitive (0.3.7 vs 0.3.8 produces different bytecode) |
| Optimization flags           | `runs` + `viaIR` are bytecode-affecting              | `--optimize=gas                                                        | codesize | none` is bytecode-affecting |
| EVM version                  | `--evm-version` matters (cancun ≠ shanghai ≠ paris)  | Same — `--evm-version` matters                                         |

### The methodology

For any in-scope Vyper-compiled address (e.g., a V3 vault clone deployed by VaultV3Factory):

**Step 1 — Determine Vyper version + flags**

Etherscan UI usually shows the verification version (e.g., `vyper:0.3.7+commit.abc123`). If not visible:

```bash
# Etherscan API v2 contract metadata
curl "https://api.etherscan.io/api?module=contract&action=getsourcecode&address=$ADDR&apikey=$ETHERSCAN_KEY" | jq '.result[0].CompilerVersion'
```

**Step 2 — Pull on-chain bytecode**

```bash
cast code $ADDR --rpc-url $RPC_URL > /tmp/onchain.hex
```

**Step 3 — Pull and recompile source**

```bash
# Get source via Etherscan source dump
curl "https://api.etherscan.io/api?module=contract&action=getsourcecode&address=$ADDR&apikey=$ETHERSCAN_KEY" | jq -r '.result[0].SourceCode' > VaultV3.vy

# Or pull from Yearn GitHub pin
git -C yearn-vaults-v3 show $COMMIT_PIN:contracts/VaultV3.vy > VaultV3.vy

# Compile with EXACT Vyper version (use docker to pin patch)
docker run --rm -v $PWD:/code vyperlang/vyper:0.3.7 /code/VaultV3.vy \
    -f bytecode_runtime \
    --optimize gas \
    --evm-version paris \
    > /tmp/local.hex
```

**Step 4 — Compare**

Vyper has no CBOR metadata trailer, so the comparison is byte-for-byte WITHOUT stripping anything:

```bash
diff <(cat /tmp/onchain.hex | tr -d '\n' | tr 'A-F' 'a-f') \
     <(cat /tmp/local.hex   | tr -d '\n' | tr 'A-F' 'a-f')
```

If they match → on-chain bytecode reproduces from source. Gate 2 finding can be tied to the source.

If they differ → either (a) wrong Vyper version, (b) wrong optimization flag, (c) wrong EVM target version, (d) deployment uses a non-standard build (extra constructor args mixed into bytecode — Vyper doesn't append constructor args to runtime code, but Etherscan may store differently).

**Step 5 — Fall back to OZ verify-vyper**

If direct comparison fails after exhausting Step 4 perms, fall back to:

```bash
pip install vyper-verifier  # OZ-maintained
vyper-verifier --address $ADDR --source VaultV3.vy --version 0.3.7
```

This handles edge cases (immutables binding, factory-clone bytecode masking).

---

## 3. Vault V3 Factory verification (the entry point)

`0x770D...812F` is a Solidity FACTORY that deploys Vyper-compiled VaultV3 clones. The factory itself:

- Uses minimal-proxy (EIP-1167) clones OR direct CREATE2 of VaultV3 bytecode
- Each cloned vault inherits the SAME VaultV3.vy bytecode at deployment

**To find a real V3 vault address:**

```bash
# Pull all VaultV3 events from the factory
cast logs --from-block 18000000 --to-block latest \
    --address 0x770D...812F \
    --topic 0x<DeployedEventTopic> \
    --rpc-url $RPC_URL | jq '.[].address'
```

Then for each deployed vault, run the Vyper bytecode-verify methodology above.

**If clones use EIP-1167:** each clone's bytecode is `3d602d80600a3d3981f3...` proxy stub + the implementation address. Bytecode-verify is trivial (10-byte preamble + 20-byte address). The IMPLEMENTATION address is where the real verification matters.

---

## 4. Gate 2 prioritized findings (from Gate 1)

Per `hunts/2026-05-20-yearn-v3-gate1.md`, the top candidates for Gate 2 deep-dive:

1. **CANDIDATE-J: VaultV3 `_update_debt` state-machine integrity.** Verify the deposit-path doesn't skip unrealised-loss check. This is the highest-EV target — VaultV3.vy:\_update_debt is the central solvency invariant.

2. **CANDIDATE-I: TokenizedStrategy profit-unlock rate manipulation.** If `unlockedShares()` reads a manipulable timestamp/block, share-price during the unlock window can be gamed.

3. **Pattern A (Deposit-path missing unrealised-losses check).** Compare with the Indented PL Vault audit anchor. If VaultV3.deposit doesn't subtract pending losses before pricing shares, attacker can buy in at stale price during a known-loss window.

4. **14-role bitmask access control.** Verify no role bit reuse / misalignment. `ALL = 16383 = 0x3FFF = 14 bits` — confirm no role bit overlaps a different intent.

---

## 5. Pre-flight checklist for Gate 2 session

Before kicking off Gate 2 deep-dive:

- [ ] Pull full Yearn Immunefi scope JSON via curl-direct (lesson from Veda)
- [ ] Confirm exact Vyper version used for VaultV3 deployment (0.3.7 expected)
- [ ] Build Vyper docker image locally for reproducibility
- [ ] Confirm TokenizedStrategy.sol commit pin matches deployed bytecode (use Doctrine #24 standard-JSON)
- [ ] Run Layer 1 deep-scan on VaultV3.vy + TokenizedStrategy.sol (Phases 4/5/6 most relevant)
- [ ] Cross-reference Gate 1 findings against Immunefi prior-disclosure ledger (DEDUPE per WhiteHatMage Rule 5)
- [ ] Bytecode-verify TOP 3 production vault addresses for solvency-critical finding to ensure exploit applies to production
- [ ] Operator approval to enter Gate 2 (autonomous-gate per directive)

---

## 6. Risk notes

**Yearn V3 is one of the most-audited DeFi protocols on Ethereum.**

Major audits:

- Yearn V3 audits by yAudit (multiple)
- yAcademy
- Trail of Bits
- ChainSecurity (V3 launch audit)
- Bounty payouts since 2021: $244.5K total per Immunefi

This means easy bugs are gone. The bar is HIGH. CANDIDATE-J + CANDIDATE-I are non-trivial state-machine + share-accounting classes that even auditors miss — but the probability of finding fresh bug here is LOWER than at less-audited targets (Lombard fresh audit Halborn V2 5 days ago = LOW; SSV-Staking fresh upgrade 22 days ago = LOW; Yearn V3 6+ audits over 2 years = LOWEST).

**Decision rule:** Gate 2 on Yearn only if Layer 1 deep-scan surfaces a CANDIDATE-J / CANDIDATE-I lead that survives Skeptic adversarial review AND passes manual cross-check against known-issue ledger. Otherwise pivot to lower-audited surfaces.

---

_Yearn V3 Gate 2 prep — methodology + checklist filed. Gate 2 deep-dive deferred to operator-approved session._
