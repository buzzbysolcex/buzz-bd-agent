# Buzz Cost Optimization — v6.3.6 Implementation
## MiniMax Billing Analysis & Fixes | Mar 7, 2026

---

## SITUATION

| Metric | Value |
|--------|-------|
| **Billing period** | Mar 1–6, 2026 (6 days) |
| **Total MiniMax spend** | $80.94 |
| **Daily average** | $13.49/day |
| **Projected monthly** | $404.71/mo |
| **Master Ops budget** | $48/mo |
| **Overshoot** | 8.4x over budget |
| **MiniMax balance** | $236.68 |
| **Days remaining at current burn** | ~18 days (runs out Mar 25) |
| **Days remaining if optimized** | ~30 days (survives sprint) |

---

## ROOT CAUSE ANALYSIS

### Problem 1: Cache-Create Hemorrhage (31.5% of total spend)

MiniMax charges for three API types:
- **cache-create** — Creating/storing new cached context ($0.375/M tokens)
- **cache-read** — Reusing cached context ($0.03/M tokens) ← 12.5x cheaper
- **chatcompletion** — Actual inference ($0.30/M input + $1.50/M output)

**Current cache efficiency: 8.1x create-to-read cost ratio.**

| Date | cache-create | cache-read | Ratio | Reuse% |
|------|-------------|------------|-------|--------|
| Mar 1 | $2.03 | $0.38 | 5.3x | 70.2% |
| Mar 2 | $4.28 | $0.50 | 8.5x | 59.5% |
| Mar 3 | $1.77 | $0.53 | 3.3x | 78.9% |
| Mar 4 | $1.33 | $0.21 | 6.4x | 66.3% |
| Mar 5 | $3.67 | $0.79 | 4.6x | 73.0% |
| **Mar 6** | **$12.46** | **$0.75** | **16.7x** | **42.9%** |

**What happened Mar 6?** Cache reuse dropped to 42.9% while cache-create cost 16.7x more than cache-read. This means Buzz was creating fresh contexts for almost every call instead of reusing cached system prompts. Likely cause: container restart or OpenClaw session reset cleared all cached contexts.

**Fix:** Use MiniMax's `cache_id` / prompt caching headers to pin the system prompt + directive as a persistent cached prefix. Every cron should reuse this cached prefix instead of resending the full directive.

### Problem 2: Massive Input:Output Ratio (344:1 on Mar 6)

| Date | Chat Input Tokens | Chat Output Tokens | Ratio |
|------|-------------------|-------------------|-------|
| Mar 1 | 24.5M | 141K | 174:1 |
| Mar 2 | 17.7M | 91K | 195:1 |
| Mar 3 | 19.4M | 129K | 150:1 |
| Mar 5 | 36.8M | 157K | 234:1 |
| **Mar 6** | **62.5M** | **181K** | **344:1** |

Buzz sends ~62.5M input tokens on a busy day to generate just 181K output tokens. That's the full directive + all skills + pipeline data on EVERY sub-agent call.

**Fix:** Sub-agents should receive ONLY their slice:
- scanner-agent: L1 sources config + scan parameters (~2K tokens)
- safety-agent: L2 config + RugCheck/DFlow params (~1.5K tokens)
- wallet-agent: Helius/Allium config (~1K tokens)
- social-agent: Grok/Serper/ATV config (~1.5K tokens)
- scorer-agent: Scoring rubric + sub-agent results (~3K tokens)

Total per sub-agent: 1-3K instead of the full ~50K+ system prompt.

### Problem 3: No Cost Tracking in REST API

The `/costs/summary` endpoint returns 404. `/costs/by-model` and `/costs/by-agent` return empty arrays. Buzz has no internal cost awareness — it can't self-throttle.

---

## THREE IMPLEMENTATION FILES

### File 1: `cost-guard-skill.md` (NEW SKILL)
Drop into `/opt/buzz-workspace-skills/cost-guard/` in Docker image.
Gives Buzz a daily cost budget with auto-throttle to Bankr when exceeded.

### File 2: `sub-agent-context-slim.md` (SKILL PATCH)
Modifies the orchestrator's sub-agent dispatch to send trimmed context per agent role.

### File 3: `entrypoint-cache-patch.sh` (ENTRYPOINT ADDITION)
Adds MiniMax cache pinning to entrypoint.sh so the system prompt is cached once on boot and reused by all crons.

---

## PROJECTED SAVINGS

| Optimization | Weekly Savings | Monthly Impact |
|-------------|---------------|----------------|
| Cache reuse 50%→80% | ~$12.77 | -$63.85 |
| Context trim 60% for sub-agents | ~$20.90 | -$104.48 |
| **Combined** | **~$33.67** | **-$168.33** |
| **New projected monthly** | | **~$236/mo** |
| **MiniMax $236.68 lasts** | | **~30 days** |

---

## PRIORITY AFTER v6.3.6

1. Wire cost logging into REST API (`cost_log` table) so Sentinel can monitor spend
2. Add daily cost cap alert → Telegram when daily spend exceeds $10
3. Explore MiniMax prompt caching API for persistent system prompt caching
4. Long-term: move sub-agents fully to Bankr/GPT-5-Nano (zero MiniMax cost for sub-agents)

---

*Sprint Day 13 | Jakarta WIB | Cost Disciplined.*
