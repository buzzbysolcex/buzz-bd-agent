# Deployer Cross-Reference — Cross-Pillar Compound

**Purpose:** Cross-reference deployer wallets across Pillar 1 (token scoring) and Pillar 4 (bug research). When a token-scoring rug flag fires on a deployer who ALSO deployed contracts in active Lane 5 bounty scope, this file is the single index that surfaces the cross-pillar signal.

**Authority:** Created 2026-05-27 as Phase 1 of Four-Pillar Loop (Ogie operator directive). Companion to `brain/Token-Rug-Patterns.md`.

**Maintenance rule:** every Pillar 1 cycle that produces a token with `deployer_address != null` MUST check this index. Every Pillar 4 Gate 1 surface map that records a deployer address MUST file the row here. Cron-wired Phase 1 (not yet — manual maintenance v1.0).

**Versioning:** v1.0 = schema definition + 5 seed-rows extracted from existing brain compounds. v1.1+ = automated cron-population.

---

## Schema

Each row is a deployer wallet with cross-pillar provenance. Same wallet may appear in multiple Pillar contexts.

```
| deployer_address | chain | pillar1_tokens | pillar1_avg_score | pillar4_protocols | risk_class | first_seen | last_seen | notes |
```

**Field definitions:**

- `deployer_address` — EOA or contract-factory address that deployed the relevant contracts. EOA only (not router/factory unless verified-as-attacker)
- `chain` — primary chain (ETH/BSC/Solana/Base/Arbitrum/etc); if multi-chain, list all comma-separated
- `pillar1_tokens` — count of tokens scored against this deployer; bracketed if explicit list available
- `pillar1_avg_score` — mean Buzz score across pillar1_tokens; lower = more rug-pattern flags
- `pillar4_protocols` — Lane 5 scope protocols where this deployer has authority (admin/multisig/owner role); empty if none
- `risk_class` — one of: `CLEAN` (no rug flags, no admin authority on bounty targets), `WATCH` (one signal present), `ELEVATED` (multiple signals or admin authority + scored tokens), `ESCALATE` (any rug-flagged token + Lane 5 admin authority)
- `first_seen` / `last_seen` — date this address was observed in Pillar 1 or Pillar 4 context
- `notes` — free-text for cross-pillar context

---

## Risk-class promotion rules

- Single rug flag (TRP-5 ≥ −25 / TRP-3 ghost / TRP-9 wash) on a token deployed by address X → X gets `WATCH`
- 3+ tokens deployed by X all score <30 → X gets `ELEVATED` (serial rug-deployer)
- X is a multi-sig signer or owner on ANY Lane 5 in-scope contract AND X deployed ≥ 1 rug-flagged token → X gets `ESCALATE` (single-point-of-compromise + behavioral-risk signal)
- X is in Lane 5 scope-target's admin role AND no other signal → X is `CLEAN` (default for bounty-target admins)
- Promotion to ESCALATE triggers immediate Pillar 4 Gate 1 priority lift (skip queue, dispatch within same cycle)

---

## Initial cross-reference seed rows (v1.0 — extracted from brain compounds)

The deployer addresses in the bug-research target lane are CLEAN-by-default (legitimate protocol admins). They're listed here as the index baseline; cross-pillar rug-flag matching is the operational query.

| deployer_address | chain | pillar1_tokens | pillar1_avg_score | pillar4_protocols | risk_class | first_seen | last_seen | notes |
|---|---|---|---|---|---|---|---|---|
| (Balancer V3 deployer EOA — bytecode-verify pending operator RPC) | ETH | 0 | n/a | balancer-v3 | CLEAN | 2026-05-26 | 2026-05-27 | Deployed BatchRouter `0x136f1E…78d1` per B-1 Gate 2 paste-ready |
| (Stader Manager EOA — checksum lookup pending) | ETH | 0 | n/a | staderforeth (PARKED) | CLEAN | 2026-05-27 | 2026-05-27 | Deployed StaderStakePoolsManager + StaderOracle; Stader Gate 2 foreclosed via dedup, no risk-class change |
| (Olympus V3 multi-sig — operator scope-verify pending) | ETH+Arbitrum+Optimism+Polygon+Avalanche+Fantom+Boba | 0 | n/a | olympus | CLEAN | 2026-05-26 | 2026-05-26 | BLVaultLido + ConvertibleDepositFacility owners; canonical Doctrine #29 v1.1 PRESENT anchor |
| (Lista DAO Moolah deployer — to be extracted from clone git-log) | BSC+Base | 0 | n/a | listadao | WATCH | 2026-05-27 | 2026-05-27 | DEFAULT_ADMIN_ROLE has unchecked `emergencyWithdraw` (G2-LISTA-3 `[EXECUTED]`); admin compromise = full broker drain. Elevation pending Gate 2 disposition |
| (rhino.fi DVF deployer — operator confirms via Etherscan) | ETH+Base+10+ L2s | 0 | n/a | rhinofi | CLEAN | 2026-05-26 | 2026-05-26 | Frozen-substrate active-product = Doctrine #37 Sub-Type B anchor |

---

## Operational query examples

**Query 1 — Pillar 1 → Pillar 4 escalation:**

```
For every Pillar 1 token scored <30 in the past 24h:
  WHERE deployer_address appears in this file's pillar4_protocols column
  → flag for emergency Gate 1 dispatch
```

**Query 2 — Pillar 4 → Pillar 1 enrichment:**

```
For every Pillar 4 Gate 1 paste-ready dispatch:
  Extract the protocol's admin/multisig wallet addresses
  Look up each address's Pillar 1 history
  If any address has deployed ≥1 token scored <30 → flag risk_class as ELEVATED
```

**Query 3 — Recurring deployer pattern:**

```
SELECT deployer_address, COUNT(*) as token_count
WHERE pillar1_avg_score < 30
GROUP BY deployer_address
HAVING token_count >= 3
→ surface to operator as "serial rug-deployer" promotion candidate
```

---

## Cron-wire (Phase 1 task, not yet built)

The Phase 1 scoring-cron output handler should:

1. After every token scoring event, extract `deployer_address` from the on-chain deployment trace (DexScreener `creator` field OR direct `eth_getTransactionByHash` against the deployment tx)
2. Check this file for an existing row matching the deployer
3. If matched: update `pillar1_tokens` count, `pillar1_avg_score`, `last_seen`. Re-evaluate risk_class per promotion rules. If risk_class changes to ELEVATED or ESCALATE, surface to War Room.
4. If new: append a new row with default `CLEAN` risk_class.

After every Pillar 4 Gate 1 brain-proposal-applied event:

1. Extract any deployer / admin / multisig address from the paste-ready or scope-verify
2. Append to this file with `pillar4_protocols` populated, default `CLEAN` risk_class
3. Re-evaluate cross-pillar if Pillar 1 records exist

The wire-up is operator-greenlit (per `four-pillar-loop.md` Phase 1 build list); script implementation pending an idle cycle. Until then, this file is **manually appended** during brain compound cycles.

---

## Cross-pillar audit log

| date | event | action |
|---|---|---|
| 2026-05-27 | File created | Seed rows from Balancer / Stader / Olympus / Lista / rhino.fi Gate 1+2 hunts |

(Appended every time risk_class changes or a new escalation fires.)

---

_Brain Deployer Cross-Reference | v1.0 | 2026-05-27 | 5 seed rows, all CLEAN by default. Cron-wire pending. The cross-pillar match query is the operational value._
