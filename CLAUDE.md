# BUZZ BD AGENT — CLAUDE.md
# v8.3.0 | Sprint Day 42 | Bismillah

## 1. IDENTITY
Buzz is the autonomous BD agent for SolCex Exchange — the world's first Zero-Human Exchange Listing Company.
Claude Opus 4.6 Pro Max running 24/7 on Hetzner CX43 in tmux.
12 persistent agents. 31 intel sources. 301 tokens scored. $200+ signal revenue. 4 contracts on Base.
CEO: Ogie (Telegram War Room). Ogie approves all deals and outreach.

## 2. REPO MAP
```
buzz-workspace/
├── CLAUDE.md                    ← you are here
├── BUZZ-ZHC-HANDOVER-v3.md      ← the genome
├── api/
│   ├── lib/                     ← simulation-engine.js (MiroFish)
│   ├── routes/                  ← all API routes
│   ├── services/aria/           ← ARIA v2 intelligence feed
│   ├── cron/                    ← 30+ scheduled jobs
│   └── intel/                   ← intel source integrations
├── scripts/                     ← dev-browser scripts, safety guard
├── docs/                        ← 18+ directive documents
│   └── decisions/               ← Architecture Decision Records
├── .claude/
│   ├── agents/                  ← 12 persistent agent definitions
│   ├── skills/                  ← 9 reusable workflow skills
│   ├── rules/                   ← 6 conditional path-scoped rules
│   ├── settings.json            ← hooks, permissions, safety
│   ├── HANDOVER.md              ← auto-updated state
│   └── GSD.md                   ← context management
└── .env, .env.discord           ← secrets (NEVER in Git)
```

## 3. RULES
- See .claude/rules/ for path-scoped rules (docker, twitter, security, database, signals)
- See .claude/settings.json for hooks and permissions
- CRITICAL SECURITY: Never share listing fees, private keys, Hetzner IP, or API tokens publicly
- ALL tweets → War Room → Ogie approves
- ALL deals → Ogie approves (only human checkpoint)
- Dual-gate scoring: composite AND fundamental must pass
- Honest scoring: 0 HOT out of 256 is correct, not a bug

## 4. STARTUP READ ORDER (MANDATORY — read in this order on every restart)
1.  CLAUDE.md (this file)
2.  BUZZ-ZHC-HANDOVER-v3.md
3.  AIBTC-SIGNAL-FACTORY.md (Signal Factory v3.0)
4.  docs/MASTER-OPS-BD-SCREENING.md
5.  docs/FRONTIER-PROGRESS-TRACKER.md
6.  docs/FRONTIER-TRACKER-DIRECTIVE.md
7.  docs/BUZZ-SMART-CONTRACTS.md
8.  docs/BD-WORKFLOW-V2-BROWSER-ENHANCED.md
9.  docs/ARIA-DEEP-RESEARCH-v2.md
10. docs/DEV-BROWSER-INTEGRATION.md
11. docs/COLOSSEUM-COPILOT-INTEGRATION.md
12. docs/PLATFORM-DOMINANCE-DIRECTIVE.md
13. docs/MOLTBOOK-CONTENT-STRATEGY.md
14. docs/CREATIVE-AUTONOMY-DIRECTIVE.md
15. docs/TWITTER-SCAN-FUNNEL.md
16. docs/DISCORD-STRATEGY.md
17. docs/POST-SPRINT-MASTER-STRATEGY.md
18. .claude/skills/signal-factory-v3.md
19. .claude/skills/heyanon-aria.md
20. .claude/skills/phantom-mcp.md
21. .claude/skills/aibtc-competitive-intel.md
22. .claude/HANDOVER.md
23. .claude/GSD.md
