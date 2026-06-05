# Flagged-Cluster Registry (ALLEGED — listing-screening tripwire)

> Authority: Ogie msg (2026-06-05). Purpose: convert third-party investigations into a permanent **auto-HOLD tripwire** for the SolCex listing lane. Any future listing prospect touching a cluster (same launchpad, founder-handle, project, or fund-source address) **auto-flags for elevated human scrutiny — never auto-advance.**
>
> ## ⛔ DISCIPLINE (non-negotiable — Doctrine #55, #56)
>
> - Every entry is an **ALLEGATION flagged by a third party**, NOT a Buzz finding and NOT adjudicated fact. Default `verification_status: alleged/unverified`.
> - Buzz records **public identifiers (project names, ticker, launchpad domain, on-chain addresses) for MATCHING only.** Buzz makes **NO determination of any individual's conduct** and does not restate named-person accusations as fact.
> - **Legal on-chain / OSINT only.** No stolen documents, no "any-means" bounties, no solicitation of insider material — full stop.
> - These flags **route a prospect to human review.** They are **never published** by Buzz as an accusation.
> - A flag is for SCRUTINY, not exclusion. Promotion `alleged → confirmed` requires independent verification + operator sign-off (record the evidence + date).

## Registry schema (per entry)

`cluster_id · status · source(attributed+dated+link) · projects · launchpad · fund-source identifiers · founder-handle(alleged) · match-keys · notes`

---

### CLUSTER-001 — "Gems-launchpad / DOP-TOMI fund-source" cluster

- **verification_status:** `alleged/unverified` (Buzz has NOT independently confirmed any claim below)
- **source:** ZachXBT community alert on Rain Protocol (RAIN), ~June 2026 [attributed; transcribe exact URL + cited addresses from the public post via legal OSINT before address-matching goes live — addresses NOT yet recorded here]
- **flagged projects (alleged association, for match-only):** Rain Protocol / **RAIN** (~$8.8B mcap, prediction market, Arbitrum), **DOP**, **TOMI**, **Sirin Labs**; alleged upcoming: **Kai Platform** (presale). Also CEX-tier-cited by source: M, RIVER, RAVE.
- **launchpad (alleged):** `Gems[.]vip` — alleged to host multiple flagged projects (F4 launchpad-clustering).
- **DAT red flag (alleged):** a Nasdaq-listed DAT (**Enlivex**) announced a large treasury strategy with no peer comps (Kalshi/Polymarket) (F3).
- **alleged manipulation tells (per source, unverified):** self-referential/illiquid TVL ~$27M on Arbitrum = the project's own native token, ~$1M annual fees (F2); concentrated Uni-V3 LP + spot transfers obfuscated via the launchpad hot wallet (F7); deployer funds allegedly trace via a launchpad hot wallet (Gems) + shared CEX-deposit addresses to DOP/TOMI, with near-simultaneous dust-transfer timestamp linking (F5/F6); same-operator reuse across projects (F8).
- **founder-handle (alleged, MATCH-KEY only — NO conduct determination by Buzz):** source alleges a shared operator across DOP/TOMI/Sirin Labs previously named in crypto-fraud matters. Buzz records this as a **match-key for screening**, attributes it to ZachXBT, and makes **no finding** about the individual.
- **match-keys (auto-HOLD on any hit in a listing prospect):** ticker∈{RAIN,DOP,TOMI,SRN,KAI,M,RIVER,RAVE} · launchpad=`gems.vip` · project-name∈{Rain Protocol,DOP,tomi,Sirin Labs,Kai Platform,Enlivex} · [on-chain fund-source addresses — TBD, transcribe from source].
- **notes:** CEX cautionary anchor — ZachXBT downgraded **Kraken S→B** for listing M/RAIN/RIVER/RAVE without due diligence. Doctrine #53.

---

## §6 — CROSS-POLLINATION (current SolCex pipeline + Buzz prospects vs this registry)

**Scan 2026-06-05 (HONEST, no manufactured hits):** queried `pipeline_tokens` (2,285 tokens) + brain prospect refs against CLUSTER-001 match-keys (project names / tickers / launchpad). **NO MATCH** — the only substring hits were coincidental ("brainrot" ≠ RAIN; brain "ZachXBT" refs are unrelated THORChain/EIP-7702 defensive-intel). **No current SolCex listing prospect or Buzz token-list touches CLUSTER-001.** Clean seed, zero current exposure. Re-run this scan on every new listing intake (the registry is a forward tripwire).

_Cross-ref `brain/intel/token-fraud-redflags.md` (§1 signals + §3 wiring), Doctrine #53–#56._
