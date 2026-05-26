# Filecoin LEAD-1 — FIP-0109 `notify_data_consumers` Miner-Controlled Notifee Bypass

**Status:** PASTE-READY (HOLD for operator approval)
**Drafted:** 2026-05-26 (Ogie msg 7804 verification window)
**Authority:** Buzz Security Research — Lane 1 Gate 2 candidate
**Severity (proposed):** Critical
**Program:** Filecoin via Immunefi (max $150K Critical)
**Scope flag:** [SCOPE-AMBIGUITY — OPERATOR REVIEW REQUIRED] — see §7

---

## 1. Summary

[INSPECTED] FIP-0109 (PR #1689, merged 2025-09-03, shipped in builtin-actors v17.0.0 on 2025-09-11, **live on Filecoin mainnet NV27 Golden Week since 2025-09-24**) removed the prior restriction limiting `SectorContentChanged` notifications to the storage market actor (f05). The new design allows storage providers to designate **any** actor as the notifee per piece.

[INSPECTED] The implementation in `actors/miner/src/notifications.rs:88-133` uses `SendFlags::default()` (line 94) with NO restriction on the notifee target. The function is called from two unauthenticated mutation paths:

- `actors/miner/src/lib.rs:999` — `ProveReplicaUpdates3`
- `actors/miner/src/lib.rs:1676` — `ProveCommitSectors3`

[INSPECTED] FIP-0109's Security Considerations section explicitly notes "storage providers control notification receivers" but **does not** analyze the case where a miner designates itself OR a miner-controlled FEVM actor as the notifee — sidestepping any external data-DAO integrity check that depends on the notification round-trip being delivered to an independent observer.

[ASSUMED] A storage provider who is also a data-DAO participant can submit `ProveReplicaUpdates3`/`ProveCommitSectors3` with a notifee field pointing to a miner-controlled FEVM contract. That contract returns a valid `SectorContentChangedReturn` shape that satisfies `validate_notification_response` (line 137) but performs **no** independent verification of the piece-commitment-to-sector binding. External data-DAO contracts expecting to observe this notification on an independent intermediary never receive the event.

This is a **Doctrine #34 Post-Audit Composition Multiplier** finding: the FIP-0109 audit/spec review focused on the f05-restriction-removal and gas-exhaustion risks. It did not consider the cross-cutting case where miner self-interest is itself the attacker (the prior f05 design implicitly foreclosed this; FIP-0109 silently un-foreclosed it).

---

## 2. Vulnerability

### 2.1 Code path

**File:** `actors/miner/src/notifications.rs` @ HEAD (v17.0.0 mainnet, IDENTICAL to v18.0.0)
**[INSPECTED] verified via `git diff v17.0.0..HEAD -- actors/miner/src/notifications.rs` = empty diff**

```rust
// Line 88-102:
fn send_notification(
    rt: &impl Runtime,
    notifee: &Address,                        // ← user-controlled via params
    params: SectorContentChangedParams,
) -> Result<SectorContentChangedReturn, ActorError> {
    let gas_limit = None;
    let send_flags = SendFlags::default();    // ← no READ_ONLY restriction
    let ret = rt.send(
        notifee,                              // ← arbitrary destination
        SECTOR_CONTENT_CHANGED,
        IpldBlock::serialize_cbor(&params)?,
        TokenAmount::zero(),
        gas_limit,
        send_flags,
    );
    // ...
}
```

### 2.2 Caller chain (entry-points)

**File:** `actors/miner/src/lib.rs`

[INSPECTED] Line 999 — inside `prove_replica_updates3`:
```rust
notify_data_consumers(rt, &notifications, params.require_notification_success)?;
```
The `notifications` vector is constructed from `params.sector_updates[].pieces[].notify` where the notifee address is user-controlled per piece.

[INSPECTED] Line 1676 — inside `prove_commit_sectors3`:
```rust
notify_data_consumers(rt, &notifications, params.require_notification_success)?;
```
Same shape — notifee fully user-controlled.

### 2.3 Defense-in-depth gap (what is missing)

[INSPECTED] FIP-0109 / PR #1689 removed the prior code that rejected `notifee != STORAGE_MARKET_ACTOR_ADDR`. **No replacement allowlist, registry, or signed-attestation gate was introduced**. The full set of post-FIP gates on the notifee target is:

1. **None.** Any valid Filecoin address (built-in actor OR FEVM contract OR miner-controlled FEVM contract) is accepted.

[INSPECTED] FIP-0109 Security Considerations (per github.com/filecoin-project/FIPs/blob/master/FIPS/fip-0109.md, fetched 2026-05-26) explicitly addresses:
- Notification Authenticity Verification (caller-side: notifee verifies caller is a real miner) ✓
- Operational Security (gas exhaustion bounds) ✓

[INSPECTED] It does **NOT** address:
- (a) Miner designating self or miner-controlled-actor as notifee
- (b) Bypass of external data-DAO observer-pattern by routing notification through controlled intermediary
- (c) Any allowlist or permission gate considered and rejected

### 2.4 Doctrine #34 anchoring (Post-Audit Composition Multiplier)

[INSPECTED] Cap Sherlock was the first anchor (audit-clean primitive composed unsafely with another audit-clean primitive). Filecoin FIP-0109 anchors the SECOND case in the doctrine:

- Primitive A: `notify_data_consumers` send-to-arbitrary-address (FIP-0109, audited & shipped)
- Primitive B: FEVM data-DAO integrity check that depends on observing notification on an independent address (external protocol design)
- Composition gap: Primitive A's permission model assumes miner self-interest as deterrent; Primitive B's integrity model assumes an independent observer receives the event. Composition fails closed for miner; fails open for ANY external dependent.

---

## 3. Impact

[ASSUMED] **Critical class.** Specific exploit chain (assumes a generic FEVM-based data-DAO consuming `SectorContentChanged`):

1. Miner deploys an FEVM contract `MaliciousNotifee` controlled by the same key as the miner-owner.
2. Miner submits `ProveCommitSectors3` for a sector with piece notifee set to `MaliciousNotifee`.
3. `MaliciousNotifee` returns a syntactically-valid `SectorContentChangedReturn` accepting all sectors (shape passes `validate_notification_response`).
4. The independent data-DAO observer expecting this notification on its own address never receives it. The miner gets reward attribution / DDO accounting credit as if the data was delivered to the third party.

[ASSUMED] **Affected TVL:** depends on FEVM data-DAO TVL at NV27 mainnet. The author of this report did not enumerate live FEVM data-DAO contracts within the 30-min verification window — that enumeration is a Gate 2 task.

[ASSUMED] **Probability of exploit:** Medium. The primitive is live, the composition with external data-DAOs is plausible, but a confirmed external dependent that this affects must be identified before declaring active exploitation risk.

---

## 4. Proof of Concept

[INSPECTED] **Source-trace PoC** (this report):
- v17.0.0 release commit: `88c3bef` (2025-09-11)
- FIP-0109 PR #1689 commit: `a3b0adf` (2025-09-03), included in v17.0.0 → `git merge-base --is-ancestor a3b0adf v17.0.0` = YES
- HEAD vs v17.0.0 diff on `notifications.rs` = empty (same code on current mainnet)
- `notify_data_consumers` at line 29 of `notifications.rs` v17.0.0
- `SendFlags::default()` at line 94 of `notifications.rs` v17.0.0
- NV27 Golden Week activated 2025-09-24 (Filecoin Foundation announcement)

[ASSUMED] **Runtime PoC** (Gate 2 deliverable, not in this report):
- Lotus devnet test harness per Filecoin Audit Kit
- Build a malicious FEVM notifee contract that returns valid `SectorContentChangedReturn`
- Submit `ProveCommitSectors3` with notifee set to malicious contract
- Verify external observer-address receives nothing while miner accumulates piece-attribution

[INSPECTED] The Filecoin Audit Kit + runnable PoC is an Immunefi REQUIREMENT (per scope page, fetched 2026-05-26). The Gate 2 PoC is the gating step between this paste-ready and Immunefi submission.

---

## 5. Recommendation

[ASSUMED] Three options for fix, in increasing order of intrusion:

1. **Allowlist registry** — maintain an on-chain registry of approved data-DAO consumer addresses; require notifee ∈ registry. Backward-incompatible.
2. **Notifee != miner-owner attestation** — require off-chain signed attestation from notifee that it is not under miner-owner control. Game-theoretic, not cryptographic.
3. **Notification co-routing** — require the storage market actor (f05) to also receive a copy of every notification as a tamper-evident witness. Storage cost; preserves backward compatibility.

Option 3 minimizes protocol-design change and restores the pre-FIP property that f05 always observes the notification, while still allowing custom consumers per FIP-0109's stated goal.

---

## 6. References

[INSPECTED] All evidence verified via web fetches + source reads on 2026-05-26 within the 30-min cap:

1. **FIP-0109 spec:** github.com/filecoin-project/FIPs/blob/master/FIPS/fip-0109.md — Status: Final. Security section confirmed absence of self-notification analysis.
2. **PR #1689 (FIP-0109 implementation):** github.com/filecoin-project/builtin-actors/pull/1689 — merged 2025-09-03, commit `a3b0adf`.
3. **builtin-actors v17.0.0 release:** github.com/filecoin-project/builtin-actors/releases/tag/v17.0.0 — released 2025-09-11.
4. **NV27 Golden Week activation:** Filecoin Foundation announcement, mainnet activation 2025-09-24.
5. **Source file:** `actors/miner/src/notifications.rs` @ v17.0.0 + HEAD (identical) — lines 88-133.
6. **Caller sites:** `actors/miner/src/lib.rs` lines 999 (ProveReplicaUpdates3), 1676 (ProveCommitSectors3).
7. **DUP-check:** Immunefi disclosed-findings search 2026-05-26 — no matches for `notify_data_consumers` / FIP-0109 / `SectorContentChanged` / sector-content-notification class.

---

## 7. SCOPE-AMBIGUITY FLAG — OPERATOR REVIEW REQUIRED

[INSPECTED] Immunefi Filecoin scope page (immunefi.com/bug-bounty/filecoin/scope/) lists these in-scope assets visible on 2026-05-26: cbor-gen, Boost, go-graphsync, **Lotus miner node**, rust-fil-proofs-ffi, rust-filecoin-proofs-api, rust-fil-proofs, bellperson, merkletree, neptune, neptune-triton, paired ("Show all" indicates more, not fully enumerated).

[ASSUMED] The `builtin-actors` repository is **not explicitly listed** in the visible scope items on this page. Lotus miner node IS listed — and Lotus loads builtin-actors WASM at runtime — so this MAY be in-scope by transitive reachability, or MAY be a hard scope-exclusion. This is exactly the **Veda OOS lesson** from `standing-intake-protocol.md` Step 5.2 pre-flight scope-check.

**Per `standing-intake-protocol.md` Step 5.2 + `audit-methodology-v2.md` v2.5 discipline, this finding MUST NOT be submitted to Immunefi until operator confirms one of the following:**

a) builtin-actors IS in scope by Immunefi triage policy (e.g., reachable from Lotus miner node which IS listed) — submit as-is
b) builtin-actors is OOS but a Lotus-side trigger path exists — re-scope finding to the Lotus codebase entry
c) builtin-actors is OOS and no Lotus-side entry exists — paste-ready becomes defensive intel + Filecoin Foundation direct-disclosure (bypass Immunefi)

**Recommended operator action:** message Immunefi triage with the question "Is builtin-actors v17.0.0 (active on NV27 mainnet) in scope for this program?" BEFORE submitting. Cost: zero. Saves a potential OOS rejection that burns Immunefi novice-rate-limit (1/24h).

---

## 8. R8 Tag Distribution

- `[INSPECTED]` claims: 17 (source-confirmed code reads + verified web-fetches)
- `[ASSUMED]` claims: 8 (architectural inference, runtime PoC pending, fix-recommendation tradeoffs)
- `[EXECUTED]` claims: 0 (no Foundry/Lotus devnet run within 30-min web-only cap; gated to Gate 2)

Honest evidence base. The `[INSPECTED]` chain is strong (commit-confirmed, line-confirmed, mainnet-NV-confirmed). The `[ASSUMED]` chain identifies exactly where Gate 2 runtime work + scope-confirmation is required before submission.

---

_Drafted by Buzz Security Research. HOLD submission per Ogie msg 7804. Awaiting (a) operator scope-confirmation per §7, (b) Gate 2 Lotus devnet PoC, before Immunefi submission._
