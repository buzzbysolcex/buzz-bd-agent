# Trapped-Funds Failure-Class Taxonomy (Lane-4 Phase-0)

> Ogie msg 8132 (2026-06-03). **Whitehat taxonomy — maps HOW funds get stuck (failure CLASSES), NOT which contracts to drain.**
> GUARDRAIL (non-negotiable, by construction): NO list of specific live contracts with extractable funds appears here.
> RECOVERABLE-BY-ANYONE classes are described as a CLASS only — never enumerated as targets. Any recovery ACTION is
> gated to Phase-2+ (data infra + VERIFIED rightful owner + authorization + legal grounding). Self-draining "abandoned"
> funds = theft = brand suicide. Codified directly (no qwen) from public post-mortems + the Lane-B ingestion. Disk-safe.

## Recoverability legend

- **PERMANENT-LOCK** — nobody (incl. owner) can recover → $0, dead end. Monetization: NONE.
- **RECOVERABLE-BY-OWNER** — a privileged egress exists; needs the key-holder. Monetization: legit recovery-service / finder's-fee, gated on owner-contact + authorization.
- **RECOVERABLE-BY-ANYONE [DANGER]** — a permissionless egress path exists. Whitehat rescue-and-RETURN only, never self-drain. Monetization: coordinated whitehat (reputation; voluntary project bounty at most).

---

## EVM CLASSES (ETH + BNB share the model)

### C1 — Bricked / killable library (delegatecall to a selfdestructable/uninitialized lib)

1. **Mechanism:** a contract holds funds but delegatecalls its logic to a library; the library is left uninitialized (or has a public `kill`/`selfdestruct`), and anyone initializes-then-destroys it → every dependent wallet's logic is gone → funds frozen.
2. **Recoverability:** PERMANENT-LOCK (the logic the egress relied on no longer exists; no redeploy can restore the destroyed library at the same address without identical init).
3. **Authorization:** none — irreversible once the lib is destroyed.
4. **Monetization:** none.
5. **Historical:** Parity multisig freeze (Nov 2017) — ~513K ETH frozen across ~580 wallets via `WalletLibrary` selfdestruct.
6. **Chain scope:** EVM-specific (delegatecall-to-library + SELFDESTRUCT semantics). No clean Solana analogue (no delegatecall; program upgrade-authority is the closest, see C10).

- **Lane-1 hunting value: HIGH** — an uninitialized delegatecall library / public selfdestruct is a findable LIVE bug → disclose to the project for a bounty (Critical). **Lane-4: dead end (permanent).**

### C2 — No-egress / missing-withdraw

1. **Mechanism:** contract accepts ETH/tokens (`receive`/`fallback`/`deposit`) but has NO withdraw/sweep function (or the only path is unreachable).
2. **Recoverability:** PERMANENT-LOCK if non-upgradeable; RECOVERABLE-BY-OWNER if behind a proxy the admin can upgrade.
3. **Authorization:** proxy admin (if upgradeable); else nobody.
4. **Monetization:** none if locked; BY-OWNER finder's-fee if an upgradeable admin can be reached.
5. **Historical:** numerous small contracts; the canonical teaching case is the "payable contract with no withdraw" pattern.
6. **Chain scope:** EVM (a payable contract w/o withdraw). Solana analogue = C10 (PDA holding lamports with no withdraw instruction).

- **Lane-1: HIGH** — a payable surface with no egress is a findable LIVE freeze-of-funds bug → bounty (often High: "permanent freezing of funds"). **Lane-4: mostly dead end.**

### C3 — Stuck tokens / wrong-recipient (incl. tokens sent to the token contract itself)

1. **Mechanism:** ERC-20s transferred to a contract that doesn't account for them (no `rescueToken`), or to the **token's own contract address** (a classic fat-finger sink), or to a contract that only handles ETH.
2. **Recoverability:** RECOVERABLE-BY-OWNER if a `rescueERC20`/`sweep` (onlyOwner) exists; PERMANENT-LOCK otherwise.
3. **Authorization:** the contract owner (if a rescue fn exists).
4. **Monetization:** BY-OWNER recovery-service (help the project add/call a rescue) — legit, gated on the project's authorization.
5. **Historical:** millions in tokens sent to token contracts (e.g. large sums sent to the USDT/various token addresses); many projects add `rescueToken` post-incident.
6. **Chain scope:** EVM. Solana analogue = SPL sent to a wrong/missing ATA (C11).

- **Lane-1: MEDIUM** — "no token-rescue function" is a hygiene finding (low-medium). **Lane-4: BY-OWNER recovery path exists where a rescue fn is present.**

### C4 — Abandoned-admin / lost-key

1. **Mechanism:** a privileged egress (withdraw/upgrade) EXISTS but the admin key is lost, abandoned, or the team is gone.
2. **Recoverability:** RECOVERABLE-BY-OWNER in principle, but the owner is unreachable → effectively PERMANENT until the key resurfaces.
3. **Authorization:** the (missing) key-holder.
4. **Monetization:** none if the key is truly lost; if merely abandoned (owner reachable), a recovery-service finder's-fee — but proving rightful ownership + reaching them is the hard, legal-heavy part.
5. **Historical:** countless abandoned 2020-21 farm/fork projects with onlyOwner treasuries.
6. **Chain scope:** both (EVM onlyOwner / Solana upgrade-authority or PDA-authority).

- **Lane-1: LOW** (key-management is operational, not a code bug). **Lane-4: the core of the "recovery business" — but owner-identification + legal is the bottleneck.**

### C5 — Paused-no-unpause

1. **Mechanism:** `pause()` exists with no `unpause`, or `unpause` is behind a lost/abandoned admin → funds frozen in a paused contract.
2. **Recoverability:** PERMANENT-LOCK (no unpause) or RECOVERABLE-BY-OWNER (unpause behind a reachable admin).
3. **Authorization:** pause-admin.
4. **Monetization:** BY-OWNER if admin reachable; else none.
5. **Historical:** several paused bridges/farms post-incident never resumed.
6. **Chain scope:** EVM (Pausable pattern). Solana: a program flag + no toggle ix.

- **Lane-1: MEDIUM** — "pause without unpause" is a findable freeze bug. **Lane-4: BY-OWNER where unpause exists.**

### C6 — Orphaned escrow / failed-migration / expired-claim

1. **Mechanism:** ICO/escrow with no release path; a v1→v2 migration that strands v1-locked funds; an airdrop/claim with a hard expiry after which unclaimed funds have no sweep.
2. **Recoverability:** PERMANENT-LOCK (no release) or RECOVERABLE-BY-OWNER (a treasury/sweep admin).
3. **Authorization:** escrow/migration admin if present.
4. **Monetization:** BY-OWNER recovery-service (reunite a migration's stranded users) — legit but infra+legal heavy.
5. **Historical:** numerous 2017-18 ICO escrows; failed bridge migrations.
6. **Chain scope:** both.

- **Lane-1: MEDIUM** — expired-claim-with-no-sweep / migration-strand is findable. **Lane-4: BY-OWNER where a sweep exists.**

### C7 — Locked-by-vesting/math-bug

1. **Mechanism:** vesting/cliff/release math has an overflow, division-by-zero, or off-by-one that makes the release/claim function REVERT forever (funds mathematically unreleasable).
2. **Recoverability:** PERMANENT-LOCK if non-upgradeable; BY-OWNER if upgradeable.
3. **Authorization:** none (math is broken) unless upgradeable.
4. **Monetization:** none if locked.
5. **Historical:** several vesting contracts with revert-on-release bugs (small amounts, frequently).
6. **Chain scope:** both (arithmetic).

- **Lane-1: HIGH** — a release function that reverts under reachable inputs = permanent-freeze bug → bounty. **Lane-4: mostly dead end.**

### C8 — Selfdestruct / CREATE2-orphaned

1. **Mechanism:** funds sent to a contract AFTER `selfdestruct` (now an EOA-less sink); or funds sent to a **counterfactual CREATE2 address** whose init code was never (or can no longer be) deployed.
2. **Recoverability:** CREATE2-orphan = RECOVERABLE-BY-ANYONE-WHO-HOLDS-THE-INIT-CODE (if the exact init code + salt is known, the predicted address can be deployed-to + funds swept) → effectively BY-OWNER (the init-code holder); post-selfdestruct sink = PERMANENT-LOCK.
3. **Authorization:** the holder of the matching CREATE2 init code + salt.
4. **Monetization:** BY-OWNER (init-code holder), niche.
5. **Historical:** post-EIP-6780 selfdestruct semantics changed; pre-6780 selfdestruct sinks are permanent.
6. **Chain scope:** EVM-specific (CREATE2 + SELFDESTRUCT).

- **Lane-1: LOW-MEDIUM** (niche). **Lane-4: niche BY-OWNER.**

---

## SOLANA CLASSES (PDA / ATA / rent model — where EVM classes do/don't map)

### C10 — Stuck SOL in a PDA with no withdraw instruction

1. **Mechanism:** lamports accumulate in a Program-Derived Address that the program has NO instruction to transfer out of (the program never `**lamports.borrow_mut()`-debits the PDA / no withdraw ix).
2. **Recoverability:** PERMANENT-LOCK unless the program's **upgrade authority** ships an upgrade adding a withdraw ix → then RECOVERABLE-BY-OWNER (upgrade-authority holder). Immutable program (upgrade-authority renounced) = PERMANENT.
3. **Authorization:** program upgrade-authority (if not renounced).
4. **Monetization:** BY-OWNER (help the team ship a withdraw-ix upgrade) — legit.
5. **Historical:** common in early Anchor programs that collect fees into a PDA without a sweep ix.
6. **Chain scope:** Solana. Maps to EVM C2 (no-egress) but the recovery lever is _program upgrade_, not _proxy upgrade_.

- **Lane-1: HIGH** — "PDA accrues lamports, no withdraw ix" is a findable freeze bug → disclose. **Lane-4: BY-OWNER iff upgrade-authority live.**

### C11 — SPL sent to a missing / wrong ATA

1. **Mechanism:** SPL tokens transferred to an Associated Token Account that doesn't exist yet, or to the wrong owner's ATA.
2. **Recoverability:** RECOVERABLE-BY-OWNER — the ATA _owner_ controls it; a missing ATA can be created + the tokens are then accessible to the rightful owner. Wrong-owner ATA = recoverable only by that (wrong) owner's goodwill.
3. **Authorization:** the ATA owner (the wallet the ATA derives from).
4. **Monetization:** minimal (the owner already controls it; it's a UX recovery, not a finder's-fee).
5. **Historical:** routine SPL fat-finger; usually self-recoverable.
6. **Chain scope:** Solana-specific (ATA derivation). Loosely maps to EVM C3 (wrong-recipient).

- **Lane-1: LOW** (UX, not a protocol bug). **Lane-4: BY-OWNER, low value.**

### C12 — Unreclaimed rent (un-closed accounts)

1. **Mechanism:** rent-exempt lamports sit in accounts that are never `close`d (close-account reclaims the rent-deposit to a designated recipient).
2. **Recoverability:** RECOVERABLE-BY-OWNER — the account authority can `close` it + reclaim rent to a chosen recipient. Orphaned (authority gone) = stranded.
3. **Authorization:** the account's close-authority.
4. **Monetization:** negligible per-account (rent is small); aggregate-scale only.
5. **Historical:** ubiquitous (every un-closed temp account).
6. **Chain scope:** Solana-specific (rent model). No EVM analogue (EVM has no rent).

- **Lane-1: LOW**. **Lane-4: BY-OWNER, dust-scale.**

---

## SUMMARY + HONEST BUSINESS READ

**Class count: 11** (C1-C8 EVM + C10-C12 Solana; C9 = the RECOVERABLE-BY-ANYONE _meta-class_, described but never enumerated).

**PERMANENT-LOCK (dead ends, $0):** C1 (Parity-class), C2/C7 (non-upgradeable), C5 (no-unpause), C8 (post-selfdestruct), and the renounced-authority variants of C10. → The _famous_ stuck funds (Parity 513K ETH) are overwhelmingly here. **Not monetizable.**

**Legit RECOVERABLE-BY-OWNER monetization path:** C3 (rescue-fn present), C4 (abandoned-but-reachable), C5/C6 (admin reachable), C10 (upgrade-authority live), C11/C12 (owner exists). → Finder's-fee / recovery-service, but EVERY one is gated on (a) identifying the rightful owner, (b) reaching them, (c) authorization + legal grounding, (d) on-chain detection infra (paid APIs — Phase-2).

**RECOVERABLE-BY-ANYONE [DANGER]:** whitehat rescue-and-return ONLY. No self-drain (= theft). Monetization ≈ reputation + maybe a voluntary project bounty. Never enumerated here.

**Honest read — is a recovery BUSINESS worth the Phase-2 infra+legal lift?** Marginal as a standalone business: the high-$ cases are PERMANENT-LOCK (dead), the BY-OWNER cases need heavy owner-identification + legal + paid-API infra for thin/uncertain finder's-fees, and BY-ANYONE is whitehat-charity. **The taxonomy's real, immediate value is CROSS-LANE → Lane-1:** classes C1/C2/C7/C10 (killable-library, no-egress, vesting-revert-lock, PDA-no-withdraw) are **findable freeze-of-funds bugs in LIVE protocols** → disclose to the project for a bounty (often Critical/High "permanent freezing of funds"). **Recommendation: harvest this taxonomy as Lane-1 hunting detectors NOW (free, immediate-EV); defer the recovery-business (Lane-4 Phase-2) until the infra+legal lift is justified by a concrete reachable-owner + authorized case — do not build it speculatively.** Cross-ref [[Patterns-Defense-Classes]] (no-egress/freeze detectors) + the autonomy-boundary Scout guardrail.

---

## RECOVERY BUSINESS — PARKED (Ogie msg 8136). Do NOT build speculatively.
The Lane-4 recovery business is deferred (honest read above: high-$ cases are PERMANENT-LOCK; BY-OWNER needs heavy owner-ID + legal + paid-API infra for thin finder's-fees).
**REVISIT-TRIGGER (all must hold before any Phase-2 build):** a CONCRETE RECOVERABLE-BY-OWNER case with (1) an IDENTIFIED rightful owner, (2) who is REACHABLE, (3) who AUTHORIZES the recovery, AND (4) a finder's-fee large enough to justify the data-infra + legal lift. Until all four hold, no recovery infra is built. (RECOVERABLE-BY-ANYONE never triggers a business — whitehat rescue-and-return only.)

## HARVESTED → LANE-1 DETECTORS (Ogie msg 8136, shipped 2026-06-03)
The findable freeze-of-funds classes are now automated detectors in `.tmp-build/v6/buzz-detectors/` (wired into `buzzshield-semgrep.js` DEFAULT_PACKS, auto-apply every scan), severity-tagged `freeze-of-funds:true` / HIGH-CRITICAL so the pipeline surfaces them high-priority:
- **C1 killable-library** → `buzz-c1-killable-library-freeze` (PRECISE — selfdestruct/suicide match; CRITICAL).
- **C2 no-egress** → `buzz-c2-no-egress-freeze` (RECALL — ETH-intake flag, analyst confirms no-withdraw; HIGH).
- **C7 vesting-revert** → `buzz-c7-vesting-release-revert-freeze` (RECALL — division-in-release-math flag; HIGH).
- **C10 Solana PDA-no-withdraw** → `buzz-c10-solana-pda-no-withdraw-freeze` (RECALL, generic-mode — lamports-IN flag, analyst confirms a withdraw ix; HIGH). semgrep-Rust couldn't express the no-withdraw-ix negative precisely.
Each has a positive+negative regression fixture in `buzz-detectors/regression/`. These find a BUG CLASS in a TARGET protocol's code → disclose to that protocol for a bounty (Lane 1). NOT chain-scanners for drainable funds.
