# ADR-001: Akash to Hetzner Migration

**Date:** March 21, 2026 (Sprint Day 34)
**Status:** Accepted
**Decision:** Migrate all services from Akash Network to Hetzner CX43

**Context:**
Akash deployments had variable pricing, slow deploy cycles, and required managing multiple SDLs.
Docker Compose added complexity without benefit for a single-server architecture.

**Decision:**
- Single Hetzner CX43 server ($9.99/mo, 16GB RAM, 8 vCPU)
- ah-managed containers (Docker Compose retired)
- Claude Code Opus 4.6 running 24/7 in tmux
- All services on one machine: API :3000, Honcho :8000, Sentinel :3001

**Consequences:**
- Cost: stable $9.99/mo (was variable ~$10-15/mo across Akash)
- Deploy speed: git push -> CI/CD -> live in 7 minutes (was 15-20 min)
- Simplicity: one server, one SSH, one set of logs
- Risk: single point of failure (mitigated by SQLite WAL backups)
