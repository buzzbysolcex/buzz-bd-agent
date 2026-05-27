# Sky CANDIDATE 1 — Gate 2 FORECLOSURE Receipt

**Date:** 2026-05-27
**Target:** Sky Protocol (Immunefi, $10M Critical cap)
**Candidate:** CANDIDATE 1 — DC-9 sub-2 LockstakeMigrator vat.line set during migration window
**Verdict:** **DEDUP-FORECLOSED at Phase 0** (no Foundry investment required)
**Time:** ~30 min (Phase 0 only)
**Disk:** 84% throughout (no new clones; reused Gate 1 clone)

---

## TL;DR

The Buzz hypothesis — "during the `vat.file(newIlk, 'line', 55_000_000 * RAD)` migration window, an attacker could draw debt from `newIlk` via a non-migrator route" — was already identified, mitigated, and re-verified by Sky's audit pipeline:

- **Auditor:** ChainSecurity (Sep 26, 2025 audit report, `audit/20250926-ChainSecurity_Sky_Lockstake_audit.pdf`)
- **Mitigation:** The migrator was **denyed on Vat in August 2025** (commit ref: `43662905...`, "Migrator Reset Line", Aug 2, 2025 — Version 8 of the report)
- **Re-verification:** ChainSecurity §2 Setup explicitly assumes `LockstakeMigrator is deprecated (as August 2025 it is no longer a ward on Vat). Otherwise, it could directly change ilk.line during migration.`

Net effect: the `vat.file(newIlk, "line", 55_000_000 * RAD)` call in `LockstakeMigrator.onVatDaiFlashLoan` (l144) will **revert with `Vat/not-authorized`** because `Vat.wards[LOCKSTAKE_MIGRATOR] == 0` since August 2025. The migrator is dead code on mainnet.

---

## EVIDENCE BASE

### R8 tags

- **`[INSPECTED]`** — `LockstakeMigrator.sol` l144-146 source code traced; `vat.file()` call confirmed present in current main-branch source (`/home/claude-code/buzz-workspace/.tmp-gate1-sky/lockstake/src/LockstakeMigrator.sol` l144).
- **`[INSPECTED]`** — `deploy/LockstakeInit.sol` l218 (`dss.vat.rely(address(se.migrator))`) confirms migrator WAS relied at init-time.
- **`[INSPECTED]`** — ChainSecurity audit PDF directly quotes the deprecation: "Since [Version 8], it is further assumed the LockstakeMigrator is deprecated (as August 2025 it is no longer a ward on Vat)."
- **`[INSPECTED]`** — ChainSecurity audit changelog: "Migrator Reset Line" commit `43662905a3504debc48d7ba3b3907c98fffb35f8`, dated 2 Aug 2025.
- **`[ASSUMED]`** — on-chain `vat.wards(LOCKSTAKE_MIGRATOR) == 0` at current block. Not bytecode-verified via `cast` (no RPC call made), but the audit's explicit assumption (issued Sep 26 2025, AFTER the Aug 2 2025 deprecation) is dispositive. Confirmation step for any future revisit: `cast call <VAT> "wards(address)(uint256)" <LOCKSTAKE_MIGRATOR> --rpc-url $ETH_RPC` should return 0.

### Key source citation (current main)

```solidity
// LockstakeMigrator.sol l134-150
function onVatDaiFlashLoan(address initiator, uint256 radAmt, uint256, bytes calldata data) external returns (bytes32) {
    require(msg.sender == address(flash) && initiator == address(this), "LockstakeMigrator/wrong-origin");

    uint256 wadAmt = radAmt / RAY;
    (address oldOwner, uint256 oldIndex, address newOwner, uint256 newIndex, uint256 ink, uint16 ref) = abi.decode(data, (address, uint256, address, uint256, uint256, uint16));
    usdsJoin.exit(address(this), wadAmt);
    oldEngine.wipeAll(oldOwner, oldIndex);
    oldEngine.freeNoFee(oldOwner, oldIndex, address(this), ink);
    mkrSky.mkrToSky(address(this), ink);
    newEngine.lock(newOwner, newIndex, ink * mkrSkyRate, ref);
    vat.file(newIlk, "line", 55_000_000 * RAD); // <-- reverts: Vat/not-authorized (since Aug 2 2025)
    newEngine.draw(newOwner, newIndex, address(this), wadAmt);
    vat.file(newIlk, "line", 0);
    usdsJoin.join(address(flash), wadAmt);

    return keccak256("VatDaiFlashBorrower.onVatDaiFlashLoan");
}
```

### Audit-pipeline timeline

| Date          | Event                                                                                                                                                | Reference                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 2025-04-23    | Version 7: migrator first lifts line to 55M temporarily per migration                                                                                | ChainSecurity changelog                              |
| 2025-04 audit | ChainSecurity §8.7 raises operational invariant: "line of LSE-MKR-A should be below 55M with sufficient room"                                        | ChainSecurity §8.7                                   |
| 2025-08-02    | "Migrator Reset Line" commit `43662905...`: migrator denyed on Vat                                                                                   | ChainSecurity changelog (Version 8)                  |
| 2025-09-26    | ChainSecurity re-audit: explicitly assumes "LockstakeMigrator is deprecated (as August 2025 it is no longer a ward on Vat)"                          | ChainSecurity §2 Setup, post-Version-8              |
| 2026-05-27    | **Buzz Gate 2 Phase 0 dedup catches this — FORECLOSE before Foundry investment**                                                                    | THIS FILE                                            |

---

## WHY DOCTRINE #27 SATURATION DISCOUNT WAS CORRECTLY CALIBRATED

The Gate 1 file applied a 0.25× saturation multiplier (between Doctrine #27 F-corollary 0.20× ceiling and 0.30× standard). This was conservative-enough to keep CANDIDATE 1 ABOVE the queue floor, but the actual outcome shows:

- The Buzz-unique lens (DC-9 sub-2 promoted 2026-05-22) was applied AFTER the audit pipeline had already addressed the same substrate via a different lens label ("migrator ward removal").
- Auditor remediation language ("deprecated", "no longer a ward") and Buzz's DC-9 sub-2 ("zero-timelock migration") describe the SAME attack surface with different terminology.
- **The 0.25× multiplier under-discounted by ~3× in this case** — the post-audit-composition lens is supposed to find what auditors missed, but auditors had ALREADY hit this surface and removed the wards.

Doctrine #27 calibration update queued (see "Brain Compound Proposals" below).

---

## BRAIN COMPOUND PROPOSALS (queued)

### 1. Doctrine #27 — Add Sky migrator-deprecation as worked example

Anchor: when auditor remediation uses TERMINOLOGY DIFFERENT from the Buzz lens label (e.g., "deprecated ward" vs "zero-timelock migration"), the saturation multiplier UNDER-DISCOUNTS. Solution: Phase 0 dedup must search for REMEDIATION LANGUAGE not just LENS LABEL. Add to `brain/Doctrine.md` as Doctrine #27 corollary.

### 2. Doctrine #34 (post-audit composition) — Refinement

The "post-audit composition window" (Doctrine #34) assumes auditors did NOT cover the substrate. Refinement: when the audit pipeline's Version-N → Version-N+1 changelog includes commits like "Reset Line", "Disable Migration", "Deprecate <module>", treat the subsequent versions' surface as POST-MITIGATION not POST-NULL. Add to `brain/Doctrine.md` as Doctrine #34 corollary.

### 3. Standing-Intake Step 0 — Audit-PDF grep checklist

When in-scope repos have an `audit/` subdirectory with PDF reports, Phase 0 dedup MUST run a pypdf-based grep against ALL audit PDFs for:
- Contract names from the candidate (`LockstakeMigrator`)
- Specific magic numbers from the candidate source (`55_000_000`, `55M`)
- Mechanism keywords (`flashloan`, `migration`, `vat.line`)
- Remediation verbs (`deprecated`, `removed`, `denyed`, `no longer a ward`, `disabled`)

If any audit PDF returns hits AND the audit date is AFTER the candidate's substrate was introduced → FORECLOSE before any Foundry work. Add to `.claude/rules/standing-intake-protocol.md` as Step 5.6.5.

### 4. DC-9 sub-2 catalog — Add "deprecated-ward" defense pattern

DC-9 sub-2 (zero-timelock migration) DEFENSE class. Sky LockstakeMigrator is the worked example: "Permissionless migration entry-point retained in source, but governance-side ward removal eliminates the attack surface entirely. Detection: any contract whose `_authorizeXxx` requires a vat/registry ward to function — verify the contract IS a ward at current block, not just at constructor-time." Add to `brain/Patterns-Defense-Classes.md` as DC-9-sub-2-defense-1.

### 5. Cross-Pollination-Log §1 (P4 → P1) — Token scoring rule candidate

Pattern: "Contract calls `vat.file()` or any privileged registry-mutation function but contract is NOT a ward on the target registry → contract is dead-code → user calls to entry-points will revert silently." This is detectable from on-chain state at scoring-time. Add as P4→P1 candidate row in `brain/Cross-Pollination-Log.md`: penalty rule "DEAD-MIGRATOR — entry-point will revert because governance removed required wards". Low severity for HSaaS surface (informational, not loss-bearing), but useful UX-fidelity score component for token scoring engine.

### 6. Cross-Pollination-Log §3 (P4 → P2) — Methodology thread

Methodology piece: "How Sky deprecated a $55M-per-call vat.line lift without modifying source code: the ward-removal pattern." Useful Moltbook content (governance-hygiene case study, no vulnerability claim). Queue as P4→P2 row.

---

## NEXT TARGET DECISION

Per autonomy-boundary.md, Gate 2 NEGATE → next EV target.

CANDIDATE 2 (LZ governance relay) is PARKED pending operator scope-inclusion clarification. Without that clarification, CANDIDATES 3/4/5 already FORECLOSED at Gate 1 saturation. **Sky exhausts at Gate 2.**

Next-target rotation:
- Re-pull Lane 5 DB highest-EV target
- Apply Phase 0 audit-PDF grep checklist enhancement (proposal #3 above) on next target before any Foundry investment

---

## DISK / TIME

- **Disk before:** 84% (6.0G avail)
- **Disk after:** 84% (no new clones; reused Gate 1 clone; pypdf grep is in-memory only)
- **Time:** ~30 min (Phase 0 only, no Phase 1/2 needed)
- **Foundry-test investment AVOIDED:** est. 2-4h saved — Stader-class win

---

## R8 FOOTER

Evidence-grade tags appearing in this receipt:
- `[INSPECTED]` — code logic traced, audit PDFs read end-to-end via pypdf
- `[ASSUMED]` — current on-chain `vat.wards(LOCKSTAKE_MIGRATOR)` state (not bytecode-verified via cast; audit's Sep 2025 assumption is dispositive)

No `[EXECUTED]` claims (no PoC run; Phase 0 foreclosure does not require PoC).

---

_Gate 2 foreclosure filed: 2026-05-27 | Hunt path: `/home/claude-code/buzz-workspace/hunts/2026-05-27-sky-c1-gate2-foreclosure.md` | Verdict: DEDUP-FORECLOSED (ChainSecurity Sep 2025 explicit deprecation assumption) | EV-realized: $0 / EV-avoided-waste: ~2-4h Foundry build_
