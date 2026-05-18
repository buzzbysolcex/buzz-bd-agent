# ADR-022: Solana Agent Skills Directory Integration

## Status: ACCEPTED

## Date: 2026-04-04

## Context

Solana Foundation launched solana.com/skills on April 4, 2026.
Buzz has been running .well-known/skills/ since Sprint Day 39 (March 28).
The Foundation's architecture matches ours.

## Decision

1. Create buzz-token-intelligence-skill repo (9 files)
2. Upgrade .well-known/skills/ to dynamic JSON v2 with live stats
3. Register as Service #22 in catalog, feature-flagged
4. PULSE monitors health every 100 ticks
5. Backup repo to /data/ for persistence
6. PR to solana-foundation: Ogie handles manually

## Persistence

- Source code: flag + catalog + route + PULSE (git → CI/CD)
- /data/: repo backup (Docker volume)
- buzzbd-site: static fallback JSON
- SQLite: observation_log

## Consequences

- First exchange listing intelligence skill in Solana ecosystem
- Distribution at protocol layer
- No marketplace cut — x402 direct
- Frontier differentiator before May 11
