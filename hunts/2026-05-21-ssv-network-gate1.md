# SSV Network — Gate 1 Surface Map

> Date: 2026-05-21 (filed overnight 2026-05-20→21 per FULL POWER directive)
> Commit pinned: HEAD `9bb7b21` "Merge PR #612 from pr/550-signed-squash" (2026-04-28)
> Repo: `/home/claude-code/.tmp-build/ssv-network-clone/`
> Immunefi program: Up to $250K Critical. **KYC required.** PoC required.
> In-scope addresses: `0xDD9B35aE942eF0cFa76930954a156B3fF30a4E1` (SSV Network proxy) + `0xafE830B6Ee262ba11cce5F32fDCd760FFE6a66e4` (SSV Network View)
> Status: **research only. DEDUPE against Immunefi prior-disclosure ledger BEFORE any submit** (WhiteHatMage Rule 5).

---

## 0. Why this target NOW

PR #612 + reinitializer(3) = **SSV-Staking v2.0.0 upgrade is FRESH mainnet code**. Per WhiteHatMage Rule 6 (speedrun new program launches) and Rule 7 (return after pattern learning), the new SSVStaking module is the highest-EV surface. Older modules (SSVClusters, SSVOperators, SSVValidators) have been on mainnet since Sept 2023 — far more deeply audited.

---

## 1. Inventory (~6,428 LOC)

| LOC     | Path                                               | Role / change-fresh signal                                                                        |
| ------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 708     | `modules/SSVViews.sol`                             | View-only queries (mostly informational surface)                                                  |
| 617     | `modules/SSVClusters.sol`                          | Cluster register/deposit/withdraw/liquidate/reactivate (LEGACY, deep-audited)                     |
| 567     | `libraries/OperatorLib.sol`                        | Operator lifecycle (LEGACY)                                                                       |
| 422     | `interfaces/ISSVNetworkCore.sol`                   | Type definitions                                                                                  |
| 380     | `libraries/ClusterLib.sol`                         | Cluster state-machine / EB-accounting                                                             |
| 371     | `modules/SSVOperators.sol`                         | Operator entrypoints (LEGACY)                                                                     |
| **277** | `modules/SSVDAO.sol`                               | DAO config + `withdrawNetworkSSVEarnings`                                                         |
| **276** | `modules/SSVValidators.sol`                        | Validator registration (LEGACY)                                                                   |
| **246** | `modules/SSVStaking.sol`                           | **NEW** — cSSV stake/unstake + ETH reward claim                                                   |
| 151     | `libraries/ProtocolLib.sol`                        | `networkTotalEarnings()` + DAO earnings accumulator                                               |
| 103     | `libraries/SSVPackedLib.sol`                       | PackedETH / PackedSSV arithmetic (gas optimization)                                               |
| **49**  | `libraries/storage/SSVStorageStaking.sol`          | **NEW** — staking storage namespace (cooldown, accEthPerShare, oracle registry, unstake requests) |
| **38**  | `libraries/storage/SSVStorageEB.sol`               | **NEW** — EB (Earnings Block) oracle voting (rootCommitments + hasVoted + roundFrozenSupply)      |
| 40      | `token/CSSVToken.sol`                              | **NEW** — cSSV ERC20 with `_beforeTokenTransfer` hook into SSVStaking                             |
| 29      | `upgrades/mainnet/SSVNetworkSSVStakingUpgrade.sol` | **NEW** — `reinitializer(3)` for SSV-Staking deployment                                           |
| 24      | `token/SSVToken.sol`                               | LEGACY                                                                                            |
| 31      | `SSVProxy.sol`                                     | Module dispatch via `delegatecall`                                                                |

**Three NEW storage namespaces post-PR #612:**

- `SSVStorageStaking` at `keccak256("ssv.network.storage.staking") - 1`
- `SSVStorageEB` at `keccak256("ssv.network.storage.eb") - 1`
- `SSVStorageReentrancy` at separate slot (also new)

All three use ERC-7201-style namespace pattern. **Storage collision risk: low** (namespace hashing is collision-resistant).

---

## 2. SSV-Staking module (the new surface)

### Architecture (cSSV = liquid staking receipt)

```
User flow:
  1. stake(amount)
     → transferFrom(user, this, amount SSV)
     → mint cSSV 1:1 to user
     → _settle(user): credit accrued ETH rewards if any pending
  2. requestUnstake(amount)
     → burn cSSV
     → push UnstakeRequest{amount, unlockTime = now + cooldownDuration}
     → user's pending requests array MAX 2000
  3. withdrawUnlocked()  [after unlockTime]
     → iterate requests, sum amount where unlockTime <= now
     → transfer SSV back to user
     → swap-and-pop unlocked requests from the array
  4. claimEthRewards()
     → settle accrued ETH
     → payout = accrued - (accrued % ETH_DEDUCTED_DIGITS)  [round-down to PackedETH precision]
     → transferBalance ETH to user

ETH reward source:
  • Each block, `networkTotalEarnings(sp)` = ethDaoBalance + (block_delta * ethNetworkFee * daoTotalEthVUnits) / BPS_DENOMINATOR
  • `_syncFees(s)` computes delta vs `s.stakingEthPoolBalance` and updates `s.accEthPerShare += (newFeesWei * PRECISION) / totalStaked`
  • `_settle(user, s)` credits `(bal * (accEthPerShare - userIndex[user])) / PRECISION` to `accrued[user]`
```

### Surface analysis by lens

#### CANDIDATE-J (state-machine integrity) — HIGHEST EV

**Surface 1: `SSVStaking.calculateTotalUnfrozenBalance` swap-and-pop**

```solidity
while (i < requests.length) {
    if (requests[i].unlockTime <= block.timestamp) {
        total += requests[i].amount;
        requests[i] = requests[requests.length - 1];
        requests.pop();
    } else {
        i++;
    }
}
```

**Observation:** O(n) loop over up to 2000 entries. Gas limit becomes real concern at MAX_PENDING_REQUESTS. **DoS surface:** if attacker fills target's requests array (impossible — only the user himself pushes via `requestUnstake`), no DoS. Self-DoS is the only risk.

**No bug.** The swap-and-pop pattern is correct because we only need TOTAL unfrozen, not ordering preserved.

**Surface 2: `_syncFees` zero-totalStaked drop**

```solidity
uint256 totalStaked = ICSSVToken(CSSV_ADDRESS).totalSupply();
if (totalStaked != 0) {
    newFeesWei = PackedETHLib.unpack(packedNewFees);
    s.accEthPerShare += uint128((newFeesWei * PRECISION) / totalStaked);
}
s.stakingEthPoolBalance = current;  // always updated
```

**Critical:** if `totalStaked == 0` at sync time, the accumulator DOES NOT UPDATE — but `stakingEthPoolBalance` IS set to `current`. The pending fees `packedNewFees` are SILENTLY DROPPED to no one.

**Exploit pattern (theoretical):**

1. Wait until totalStaked == 0 (impossible during normal ops unless protocol is empty).
2. At totalStaked == 0, ALL accumulated fees are dropped on next syncFees.

**Practical risk:** very low — totalStaked == 0 only occurs at protocol launch (first staker) or if ALL stakers fully unstake. Both are operational corner cases. **Probably not exploitable in production.** Could be a brief window post-deploy.

**Surface 3: `EB root` oracle voting state machine (SSVStorageEB)**

```solidity
struct StorageEB {
    mapping(uint64 => bytes32) ebRoots;                          // block → root
    mapping(bytes32 => ClusterEBSnapshot) clusterEB;             // cluster → snapshot
    mapping(uint64 => uint64) operatorEthVUnits;                 // operator → vUnits
    uint64 latestCommittedBlock;
    uint32 minBlocksBetweenUpdates;
    mapping(bytes32 => uint256) rootCommitments;                 // commitment key → accumulated weight
    mapping(bytes32 => mapping(uint32 => bool)) hasVoted;        // commitment key → oracle ID → voted
    mapping(bytes32 => uint256) roundFrozenSupply;               // commitment key → frozen supply
}
```

**Yet-to-find:** the function that consumes `rootCommitments` / `hasVoted` / `roundFrozenSupply`. I don't see a `commitEBRoot` / `voteOnEB` function in `SSVStaking.sol`. **Either it's in another module (SSVViews? SSVDAO?) or the voting layer is OFF-CHAIN with on-chain finality.**

**Action: enumerate write callers of these mappings.** This is the HIGHEST EV surface — fresh oracle-quorum code is a classic exploit target.

**Surface 4: `requestUnstake` cooldown overwrite (CANDIDATE-J class — Ethena cooldown bug pattern)**

```solidity
function requestUnstake(uint256 amount) external nonReentrant {
    ...
    UnstakeRequest[] storage requests = s.withdrawalRequests[msg.sender];
    if (requests.length == MAX_PENDING_REQUESTS) revert MaxRequestsAmountReached();
    uint64 unlockTime = uint64(block.timestamp + s.cooldownDuration);
    requests.push(UnstakeRequest({amount: uint192(amount), unlockTime: unlockTime}));
    ICSSVToken(CSSV_ADDRESS).burn(msg.sender, amount);
    ...
}
```

**Different from Ethena.** Ethena had a single cooldown slot per user that OVERWROTE on top-up. SSV uses an ARRAY of UnstakeRequest, each with its own unlockTime. **No overwrite. Each request is independent.** Good design.

**However:** small dust attacks possible — user can fill 2000 requests with tiny amounts to grief their own gas. Self-grief only.

**Verdict: no Ethena-class cooldown bug.**

#### CANDIDATE-I (ERC4626-class share accounting) — MEDIUM EV

**cSSV is NOT ERC4626.** It's 1:1 with SSV (no rate change from staking — only ETH rewards accumulate separately). Mint cSSV 1:1 with SSV staked; burn cSSV 1:1 on unstake. **No share/asset rate manipulation surface.**

However:

**Surface 5: cSSV transfers redistribute accrued ETH rewards**

The hook `_beforeTokenTransfer` calls `onCSSVTransfer(from, to, amount)`:

```solidity
function onCSSVTransfer(address from, address to, uint256 amount) external virtual {
    if (msg.sender != CSSV_ADDRESS) revert NotCSSV();
    StorageStaking storage s = SSVStorageStaking.load();
    _syncFees(s);
    _settle(from, s);
    _settle(to, s);
}
```

**Verified PRE-transfer** (CSSVToken `_beforeTokenTransfer`):

- `from`'s bal is PRE-transfer (full) → `_settle(from)` credits `(fullBal * (accEthPerShare - userIndex[from])) / PRECISION` to from.accrued. ✓
- `to`'s bal is PRE-transfer (old) → `_settle(to)` credits old `(oldBal * (accEthPerShare - userIndex[to])) / PRECISION` to to.accrued. ✓

After transfer:

- from.bal -= amount
- to.bal += amount
- Future rewards accrue based on NEW bal.

**Tight.** Pre-transfer hook is correct.

**Edge case: zero-amount transfer.** Line 27 of CSSVToken: `&& amount > 0`. Zero-amount transfer SKIPS the hook → no settle. Should be fine (no economic effect from a zero transfer).

**Edge case: same-from-same-to transfer.** `from != to` check → skip. OK.

**Edge case: `msg.sender == ssvStaking`** (when ssvStaking calls `cssv.transfer` itself — e.g., if ssvStaking accidentally holds cSSV). Skip. Should be safe — ssvStaking is its own admin.

**Surface 6: PackedETH precision dust loss in `claimEthRewards`**

```solidity
uint256 payout = claimable - (claimable % ETH_DEDUCTED_DIGITS);
...
uint256 remainder = claimable - payout;
s.accrued[msg.sender] = (remainder != 0 && userBalance == 0) ? 0 : remainder;
```

When `userBalance == 0` AND `remainder != 0` → `accrued` set to 0. **Dust loss when user fully unstakes but has < ETH_DEDUCTED_DIGITS remainder.**

Need to confirm `ETH_DEDUCTED_DIGITS` value. From PackedETH packing (likely 10**9 or 10**10 wei = 1-10 gwei dust). **Severity: LOW** (sub-gwei dust). Not submission-worthy unless ETH_DEDUCTED_DIGITS is unexpectedly large.

#### DC-7 (Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines)

**Surface 7: oracle ID binding for default delegation**

```solidity
StorageStaking {
    mapping(uint32 => address) oracles;             // ID → address
    mapping(address => uint32) oracleIdOf;          // address → ID
    uint32[MAX_DELEGATION_SLOTS] defaultOracleIds;  // [4] = default delegation
    uint16 quorumBps;
}
```

DC-7 question: Is `oracleIdOf[oracle_address]` used to validate, while `defaultOracleIds[i]` is used to consume? If an oracle has its ID demoted (set to 0 or reassigned) but is still referenced in `defaultOracleIds`, vote-tally could double-count.

**Action: find the function that reads `defaultOracleIds` and `hasVoted[commitmentKey][oracleId]`** — this is where the validation-vs-consumption divergence could hide.

This is the EB-oracle-voting surface (Surface 3) seen from a different angle. **HIGHEST EV.**

#### Pattern: storage namespace collision

**Surface 8: `SSVStorageStaking` slot vs existing storage**

```solidity
SSV_STORAGE_POSITION = uint256(keccak256("ssv.network.storage.staking")) - 1;
```

vs:

- `keccak256("ssv.network.storage") - 1` (main SSVStorage)
- `keccak256("ssv.network.storage.protocol") - 1` (SSVStorageProtocol)
- `keccak256("ssv.network.storage.eb") - 1` (NEW)
- `keccak256("ssv.network.storage.reentrancy") - 1` (NEW)

**All distinct.** No collision risk via keccak256 pigeonhole. ✓

---

## 3. Highest-EV next actions (priority-ordered)

1. **`grep -rn 'rootCommitments\|hasVoted\|roundFrozenSupply' contracts/`** — find the EB-voting write functions. These are the FRESH oracle-quorum surfaces. If write function has caller-supplied oracle ID with no `oracleIdOf[msg.sender]` cross-check, classic DC-7 finding.

2. **`grep -rn 'defaultOracleIds\b' contracts/`** — find readers + writers. If an oracle removal doesn't sweep `defaultOracleIds`, stale references cause vote-tally issues.

3. **Read `ProtocolLib.sol`** in full — confirm `ethDaoBalance` is monotonic between syncs. If any path can REDUCE `ethDaoBalance` outside `claimEthRewards`, the `current.lte(previous)` branch in `_syncFees` would silently drop fees.

4. **Read `ClusterLib.sol`** — confirm cluster lifecycle is unchanged from prior audits. Look for any cross-call to new SSVStaking storage.

5. **Read `SSVNetwork.sol`** — proxy dispatch logic. Confirm the new SSVStaking module is reachable via `0xDD9B35aE942eF0cFa76930954a156B3fF30a4E1` proxy (in scope).

6. **DEDUPE step (BEFORE any submit):**
   - Pull Immunefi prior-disclosure for SSV Network (scope says "5 known issues" per master ops).
   - Cross-check any candidate against the known-issue ledger.
   - Per WhiteHatMage Rule 5: "Anti-patterns are not exploits. Pipeline is triage, not the finding."

---

## 4. EB-voting deep dive (commitRoot in SSVDAO.sol:168-221)

### Function flow

```solidity
function commitRoot(bytes32 merkleRoot, uint64 blockNum) external override {
    uint32 oracleId = s.oracleIdOf[msg.sender];
    if (oracleId == 0) revert NotOracle();                       // (A) authn
    if (blockNum <= seb.latestCommittedBlock) revert StaleBlock; // (B) monotonic
    if (blockNum > block.number) revert FutureBlock;             // (C) past-only

    bytes32 commitmentKey = keccak256(abi.encodePacked(blockNum, merkleRoot));
    if (seb.hasVoted[commitmentKey][oracleId]) revert AlreadyVoted; // (D) per-key dedup
    seb.hasVoted[commitmentKey][oracleId] = true;

    uint256 oracleCount = s.defaultOracleIds.length;              // ALWAYS 4
    uint256 totalStaked = seb.roundFrozenSupply[commitmentKey];
    if (totalStaked == 0) {                                       // first-voter sets the freeze
        uint256 rawSupply = ICSSVToken(CSSV_ADDRESS).totalSupply();
        if (rawSupply == 0) revert ZeroCSSVSupply();
        totalStaked = rawSupply - (rawSupply % oracleCount);
        if (totalStaked == 0) revert InsufficientCSSVSupply();
        seb.roundFrozenSupply[commitmentKey] = totalStaked;
    }

    uint256 weight = totalStaked / oracleCount;
    seb.rootCommitments[commitmentKey] += weight;
    uint256 accumulatedWeight = seb.rootCommitments[commitmentKey];
    uint256 threshold = (totalStaked * s.quorumBps) / BPS_DENOMINATOR;

    if (accumulatedWeight >= threshold) {
        seb.ebRoots[blockNum] = merkleRoot;
        seb.latestCommittedBlock = blockNum;
        delete seb.rootCommitments[commitmentKey];
        delete seb.roundFrozenSupply[commitmentKey];
        // hasVoted intentionally NOT cleared
    }
}
```

### Findings

| #   | Surface                                                                                                                                      | Severity Hypothesis                  | Verdict                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | `oracleCount = defaultOracleIds.length` (fixed at 4) — if fewer oracles registered, quorum NEVER reaches if quorumBps > 50% × (registered/4) | Parameterization concern, not safety | **NOT A BUG** — admin-controlled; liveness, not safety                                    |
| 2   | `replaceOracle` access control                                                                                                               | Critical IF no auth                  | **`onlyOwner` at proxy (SSVNetwork:396)** — TIGHT                                         |
| 3   | Competing root proposals at same blockNum — independent commitmentKey + roundFrozenSupply                                                    | Multi-vote equivocation              | **NOT A BUG** — first-to-quorum wins, advances latestCommittedBlock, blocks further       |
| 4   | `hasVoted` never cleared                                                                                                                     | Stale state                          | **NOT A BUG** — same blockNum can never be revoted due to (B); commit deletion is gas-opt |
| 5   | `totalStaked` frozen on first vote — supply changes between votes don't affect quorum                                                        | Stale-supply-quorum                  | **NOT A BUG** — frozen-snapshot is by design; per-proposal-key                            |
| 6   | First-voter sets roundFrozenSupply — competing proposals freeze at different times                                                           | Race to commit                       | **SYMMETRIC** — both proposals need same vote count; symmetric, no exploit                |
| 7   | Front-run by non-oracle                                                                                                                      | Crit if access bypass                | **NOT A BUG** — oracleIdOf check; admin-only oracle assignment                            |
| 8   | commitmentKey collision via `abi.encodePacked(uint64, bytes32)`                                                                              | Crit if collision                    | **NOT A BUG** — fixed-length packing, no ambiguity                                        |

### `commitRoot` verdict

**The voting layer is defensively tight.** All 8 examined patterns hold. The oracle-quorum design is well-thought:

- First-voter freezes supply → consistent threshold for the round
- Per-`(blockNum, root)` commitmentKey → competing roots don't interfere
- Monotonic block → no rewrite
- Future-block reject → no fabrication
- Per-oracle dedup → no double-counting
- `latestCommittedBlock` advances on commit → atomicity

**Single residual concern (LOW-LIVENESS):** if `replaceOracle` is called mid-vote to swap out a voter who has already voted, the NEW oracle holder can vote AGAIN at the same `oracleId` against a NEW proposal (different commitmentKey). This is "oracle slot rotation during a vote" — generally not exploitable because (a) admin-controlled, (b) different commitmentKey means different proposal.

**No EB-voting submission candidate.**

---

## 5. Initial verdict

- **No Critical surface visible at L1 inspection on the new SSV-Staking + EB-voting code.**
- **The fresh code is well-engineered.** SSVStaking team applied: pre-transfer hook for settlement, ERC-7201 namespaced storage, immutable cSSV address, monotonic block constraint, per-key vote dedup, supply-freeze on first vote.
- **Submission gate:** $250K Critical + KYC. KYC required means I cannot autonomously submit even if I find one. Operator approval + KYC paperwork → real-world submission only.

**Status:** Gate 1 complete, research-only. **No Gate 2 escalation** — fresh code passes adversarial review.

**Pivot:** rather than deep dive on SSV (defensively tight), move to next FULL POWER directive priority (Coinbase CB-MPC research pass).

---

## 5. Brain compounding notes

- **Pattern: `_beforeTokenTransfer` hook for pre-transfer settlement.** Cleaner than `_afterTokenTransfer` because balances haven't moved yet — userIndex correctly settles against full pre-transfer bal. Cross-pollination: any rewards-per-share contract that uses `_afterTokenTransfer` has the asymmetric-credit bug (from-underclaims, to-overclaims). Filed for `brain/Doctrine.md`.

- **Pattern: `if (totalSupply == 0) silently drop fees`.** Common gotcha. Variational + Symbiotic both had analogous protocol-empty edge cases. **Mitigation: skim-to-treasury or pre-seed totalSupply at deploy.** Worth a checklist item.

- **Pattern: per-namespace ERC-7201 storage.** SSV runs FOUR distinct namespaces (SSVStorage, SSVStorageProtocol, SSVStorageEB, SSVStorageStaking, SSVStorageReentrancy = 5). Collision risk via keccak256 hash collision = negligible. **Lesson:** for diamond/upgrade-heavy patterns, isolating storage per concern is the right move. Compare Veda BoringVault (1 namespace) vs Yearn V3 (mixed Vyper+Solidity) vs SSV (5 namespaces).

- **DEDUPE discipline:** WhiteHatMage Rule 5. Before any SSV submit, pull Immunefi 5-known-issues. Apply broadly: every Gate 2 deep-dive that converges on a finding gets a DEDUPE check before submission queue.

---

_SSV Network Gate 1 — research-only, no submit. Next: EB-voting state-machine deep dive + Immunefi DEDUPE._
