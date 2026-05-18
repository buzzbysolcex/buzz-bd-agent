# ADR-011: GSD-Browser Integration Alongside dev-browser

**Date:** March 31, 2026 (Sprint Day 42)
**Status:** Accepted
**Decision:** Add gsd-browser as primary browser automation tool for new tasks while keeping dev-browser for existing scripts.

**Context:**
Buzz uses two browser tools: dev-browser (QuickJS sandbox, ~10 commands, JavaScript)
and Browser Use CLI (Chrome/146, Python, screenshots). Both work but are limited.
GSD-Browser (github.com/gsd-build/gsd-browser) offers 63 commands in a single Rust binary.
Released v0.1.2 on March 30, 2026. MIT/Apache-2.0 licensed.

**Decision:**

- Install gsd-browser alongside dev-browser (do not replace)
- Use gsd-browser for ALL new browser automation tasks
- Keep dev-browser for existing scripts (contact screener, GeckoTerminal scraper)
- Update browser-research/SKILL.md from "Two Tools" to "Three Tools"
- Browser Use CLI remains for visual proof screenshots only

**Consequences:**

- Three browser tools coexist with clear use-case separation
- New tasks get 63 commands instead of ~10
- Network mocking enables rate-limit handling for DexScreener/CoinGecko
- Visual diff enables deploy verification for buzzbd.ai
- Declarative extraction replaces manual page.evaluate() for new tasks
- Daemon mode eliminates Chrome cold-start on repeated operations
- No disruption to existing working scripts
