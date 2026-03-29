# BUZZBD DISCORD SERVER PLAN
## Post-Sprint Implementation | Day 42+
## Bismillah

---

## Phase 1 (Post-Sprint Week 1): Webhook Bridge

### Server Setup
- Create BuzzBD Discord server
- Channel structure:

**Getting Started:**
- #welcome — Server intro, what BuzzBD does, how scoring works
- #how-it-works — Scoring methodology, dual-gate, ELS-1 overview
- #faq — Common questions about listing process

**Listing Intelligence:**
- #weekly-report — Sunday Listing Intelligence Report (auto-posted)
- #token-scores — ARIA discovery results, pipeline updates
- #market-intel — AIBTC signal approvals, market observations

**For Projects:**
- #get-listed — Listing application flow, CTA
- #listing-status — Public tracking of listing pipeline
- #support — Project support channel

**For Builders:**
- #els-1 — ELS-1 standard discussion, spec feedback
- #api-access — Buzz API documentation, integration help
- #open-source — Open-source contributions, Agent Skills

**Community:**
- #general — General discussion
- #announcements — Major milestones, deploys, partnerships

### Webhook Integration
- Set up Discord webhooks for: #weekly-report, #token-scores, #market-intel, #announcements
- Bridge Telegram War Room -> Discord webhooks via simple HTTP POST
- Auto-post triggers:
  - Sunday report published -> #weekly-report
  - AIBTC signal approved -> #market-intel
  - ARIA discovery scan results -> #token-scores
  - Contract deployed / major milestone -> #announcements
- Effort: 2 hours

---

## Phase 2 (Week 2): Discord.js Bot

### Bot Commands
| Command | Description | API Endpoint |
|---------|-------------|--------------|
| !score <token> | Pipeline score lookup | GET /api/v1/scores/components/:address |
| !apply | Listing application flow | Interactive flow -> buzz@buzzbd.ai |
| !report | Latest Sunday report | Link to buzzbd.ai/report |
| !status | Pipeline stats (tokens tracked, HOT count) | GET /api/v1/health |
| !aria | Latest ARIA feed | GET /api/v1/aria/feed |
| !simulate <token> | Run MiroFish simulation | POST /api/v1/simulate-listing |

### Architecture
- discord.js v14 running on Hetzner (alongside Buzz)
- Connects to Buzz API at localhost:3000
- Uses BUZZ_API_ADMIN_KEY for authenticated endpoints
- Lightweight: single file, no database needed
- Process managed by systemd or tmux

### Effort: 2-3 days

---

## Phase 3 (Week 3-4): Community Growth

### Distribution
- Add Discord invite link to:
  - buzzbd.ai landing page
  - buzzbd.ai/proposal
  - buzzbd.ai/report
  - @BuzzBySolCex Twitter bio
  - /agent JSON-LD endpoint
  - AIBTC agent profile description

### Cross-Promotion
- Post invite in AIBTC Discord #general
- Post invite in IZHC Discord #collab
- MiroFish simulation results posted to #token-scores
- Weekly highlights from ARIA discoveries

### Role System
| Role | Criteria |
|------|----------|
| Verified Project | Token submitted for evaluation |
| Listed on SolCex | Token passed 70+ and listed |
| Builder | Contributing to ELS-1 or open-source |
| Correspondent | AIBTC news correspondent |
| Community | General member |

---

## AIBTC Discord Engagement (parallel)

Buzz participates in AIBTC Discord as a recognized builder:
- #ship-it: Post deployments (ARIA, contracts, browser scripts)
- #dev-corner: Technical content (GeckoTerminal approach, contact screener, honest scoring)
- #general: Community engagement, help other agents
- Goal: BD/listing intelligence expert reputation

---

## Alignment with Roadmap

| Phase | Discord Role |
|-------|-------------|
| Phase 1: Revenue | Inbound funnel for listing clients via #get-listed |
| Phase 2: ARIA | ARIA discoveries auto-posted to #token-scores |
| Phase 3: MiroFish | Simulation results posted to community |
| Frontier Hackathon | Discord community as proof of traction |
| Phase 4: BaaS | Discord as customer support channel for x402 buyers |

---

## Technical Requirements

- Discord bot token (Ogie creates via Discord Developer Portal)
- Webhook URLs for each auto-post channel
- discord.js v14 + Node.js (already on Hetzner)
- No additional cost (Discord is free)

---

*Discord is the inbound funnel. Twitter is the megaphone. Telegram is the War Room.*
*Three platforms, three purposes, one pipeline.*
