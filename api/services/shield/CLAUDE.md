# Buzz Shield — Agent Security Intelligence

## Purpose

Pre-action intelligence for AI agents. Scores programs, matches drain patterns,
generates verdicts (SAFE/CAUTION/WARNING/DANGER) before agents execute on-chain.

## Architecture

- shield-schema.js — 5 tables (shield_scans, drain_patterns, program_risk_cache, shield_reports, shield_stats)
- shield-service.js — Core engine: program scoring, pattern matching, verdict generation
- drain-patterns-seed.js — 20 initial drain patterns from DeepMind, Blockaid, Blowfish, on-chain analysis
- Routes in api/routes/shield-routes.js

## Feature Flags (all start FALSE)

- SHIELD_ENGINE — master switch
- SHIELD_FREE_TIER — free endpoints
- SHIELD_PAID_TIER — x402 endpoints (Phase 2)
- SHIELD_PROGRAM_SCORER — program risk scoring
- SHIELD_PATTERN_MATCHER — drain pattern matching
- SHIELD_INSTRUCTION_SCANNER — Solana tx parser (Phase 2)
- SHIELD_COMMUNITY_REPORTS — accept drain reports
- SHIELD_MIROFISH_TRIGGER — auto-trigger sim for high-value scans (Phase 3)
- SHIELD_WALLET_GUARD_LINK — feed into Wallet Guard (Phase 3)
- SHIELD_ON_CHAIN — on-chain receipts (Phase 4)

## Endpoints

- GET /shield/health/:walletAddress — wallet exposure summary (free)
- GET /shield/program/:programId — program risk score (free)
- GET /shield/patterns — known drain pattern feed (free)
- GET /shield/stats — aggregate stats (free)

## Integration Points

- PULSE: health monitored every 100 ticks
- autoDream: pattern database updates in consolidation phase
- Scoring Engine: shared deployer analysis
- Wallet Guard: Shield DANGER → auto-BLOCK (Phase 3)
- MiroFish: high-value scan trigger (Phase 3)

## Danger Zones

- NEVER flip SHIELD_PAID_TIER without x402 integration tested
- NEVER flip SHIELD_WALLET_GUARD_LINK without Aldo coordination
- Pattern seed data is initial — updates come via autoDream + community reports
- Receipt hashes must be deterministic (same input = same hash)
