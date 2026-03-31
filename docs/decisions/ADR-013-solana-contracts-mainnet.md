# ADR-009: Solana Smart Contracts — Mainnet Direct via Anchor

**Status:** ACCEPTED
**Date:** Mar 30, 2026
**Sprint:** Day 42+ (Post-Sprint Phase 1)
**Deciders:** Ogie (CEO), Claude Opus (Strategy)

---

## Context

Buzz has 4 smart contracts on Base mainnet (ScoreStorage, ListingOracle, ListingEscrow, BuzzReputation). Colosseum Frontier hackathon (Apr 6 — May 11) is Solana-focused. ARIA scans 301 Solana tokens. SolCex is Solana-first exchange. Pipeline is Solana-native but on-chain proof layer is Base-only.

Judges may view Base-only contracts as "not Solana-native enough." Additionally, HSaaS (Honest Scoring as a Service) needs Solana on-chain proof for Solana-native customers.

## Decision

Deploy ScoreStorage and ListingOracle to **Solana mainnet** using **Anchor framework (Rust)** — Path A (native Solana programs). Skip devnet — go mainnet directly, same pattern as Base contracts.

### Why mainnet direct:
- Base contracts went straight to mainnet (Day 39-42). Same pattern.
- Devnet scores mean nothing to Frontier judges — they check Solana Explorer for real TXs.
- Cost is low: ~2-5 SOL for ScoreStorage (~$300-700, refundable on program close).
- Real transactions = real credibility for HSaaS customers.
- Test locally with `anchor test` (spins up local validator). No devnet detour needed.
- HeyAnon SOL wallet (BNS48CGg...Zn9A) is the active Solana wallet with keys in .env.heyanon.
- Lobster wallet (5iC7p...mo5Jp) is DEAD — private key wiped. Do NOT reference.

### Why Anchor (Path A) over alternatives:
- **Solang (Path B) rejected:** Compiles Solidity → Solana but judges won't view it as native. Compiler is newer, less battle-tested. Storage model mismatch requires restructuring anyway.
- **Neon EVM (Path C) rejected:** Runs EVM inside Solana. Not native at all. Colosseum will not count this.
- **Anchor is the standard:** Leading Solana framework. IDL generation. Verifiable builds. Full ecosystem composability.

## Consequences

### Positive
- Dual-chain proof: scores on Base AND Solana mainnet
- Frontier judges see native Solana programs
- HSaaS serves both EVM and Solana customers
- 8004 Solana identity ties to on-chain reputation
- Transaction costs: ~$0.00025 per score write (cheaper than Base)

### Negative
- Rust learning curve — Claude Code handles this, not a blocker
- ~2-5 SOL deployment cost per program (refundable)
- Maintain contracts on 2 chains — Buzz API writes to both
- Keypair management for Solana deployer wallet

### Requirements
- Install Rust + Solana CLI + Anchor on Hetzner CX43
- Use HeyAnon SOL wallet (BNS48CGg2mgP7sdBY4VVTiDyK6jVqRBi9Y71jqhxZn9A) as deployer — export keypair from .env.heyanon
- Lobster wallet (5iC7p...mo5Jp) is DEAD — private key wiped, do NOT reference
- Exported keypair stored as .solana-deployer.json (chmod 600, gitignored, NEVER committed)
- CI/CD updated to build and test Anchor programs
- Buzz API updated: score writes → Base + Solana dual-write
- /agent endpoint updated with Solana program IDs

## Priority

1. **ScoreStorage** — MVP. PDA per token. Owner-gated write. Public read. (Day 43-45)
2. **ListingOracle** — Paid query layer via CPI. SOL payment gate. (Day 46-47)
3. ListingEscrow — SPL Token deposits. Phase 2.
4. BuzzReputation — Agent prediction tracking. Phase 2.

---

*ADR-009 | v8.3.0+ | Solana mainnet via Anchor | Frontier alignment*
*Approved by Ogie | Bismillah* 🤲
