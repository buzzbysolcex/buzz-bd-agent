# Buzz Crypto BD — Claude Code Plugin + Framework

**The production-grade crypto BD agent intelligence system.** Token scoring, wallet guard, BD screening, swarm simulation, and security scanning — installable in 2 minutes.

> Built by a chef with no CS background. 81 tables. 200+ endpoints. 12 agents. $200+ revenue. $0/day LLM cost.

---

## Quick Start

```bash
# Option 1: Plugin install (recommended)
/plugin marketplace add BuzzBySolCex/buzz-crypto-bd
/plugin install buzz-crypto-bd@buzz-crypto-bd

# Option 2: Manual install
git clone https://github.com/BuzzBySolCex/buzz-crypto-bd.git
cd buzz-crypto-bd
./install.sh full              # Everything
./install.sh scorer            # Token scorer only
./install.sh guard             # Wallet guard only
./install.sh screening         # BD screening only

# Option 3: npm CLI
npx @buzzbd/scorer PEPE
```

---

## What's Inside

```
buzz-crypto-bd/
├── .claude-plugin/           # Plugin manifests
│   ├── plugin.json           # Component registry (12 agents, 4 skills, 15 commands)
│   └── marketplace.json      # Marketplace catalog
│
├── skills/                   # Installable skills
│   ├── token-scorer/         # 11-rule scoring engine ($0 LLM cost)
│   ├── wallet-guard/         # 3-state BLOCK/WARN/ALLOW governance
│   ├── bd-screening/         # 7-phase pipeline from discovery to outreach
│   └── buzzshield/           # 47-rule crypto security scanner
│
├── commands/                 # 15 slash commands
│   ├── scan.md               # /scan — Score token by address/symbol
│   ├── score.md              # /score — Quick cached score lookup
│   ├── simulate.md           # /simulate — MiroFish swarm simulation
│   ├── screen.md             # /screen — Full BD screening pipeline
│   ├── outreach.md           # /outreach — Email-first BD outreach
│   ├── signal.md             # /signal — AIBTC signal filing
│   ├── deploy.md             # /deploy — Smart contract deployment
│   ├── guard.md              # /guard — Wallet transaction evaluation
│   ├── trust.md              # /trust — Trust gate management
│   ├── dream.md              # /dream — autoDream consolidation
│   ├── pulse.md              # /pulse — PULSE heartbeat status
│   ├── streak.md             # /streak — AIBTC streak monitor
│   ├── leaderboard.md        # /leaderboard — Token rankings
│   ├── security-scan.md      # /security-scan — BuzzShield scanner
│   └── reboot.md             # /reboot — Manual recovery procedure
│
├── hooks/                    # Automated Claude Code hooks
│   ├── hooks.json            # Hook definitions (auto-loaded by Claude Code)
│   └── scripts/
│       ├── session-start.js  # Auto-recovery on session start
│       ├── session-stop.js   # State preservation on session end
│       ├── pre-bash-guard.js # Dangerous command blocking
│       └── post-edit-lint.js # Auto-lint + secret detection
│
├── rules/                    # Always-follow guidelines
│   ├── common/
│   │   ├── security.md       # Secrets, transactions, trust
│   │   └── context-optimization.md  # Subagent mandate, ultrathink
│   └── crypto/
│       └── wallet-safety.md  # Wallet Guard rules, key management
│
├── framework/                # Open-source reactive layer
│   ├── README.md             # Framework documentation
│   └── autodream-v2.js       # Pattern extraction + instinct system
│
├── npm-package/              # @buzzbd/scorer CLI
│   ├── package.json
│   ├── bin/cli.js            # npx @buzzbd/scorer PEPE
│   ├── lib/scorer.js         # 11-rule scoring engine
│   ├── index.js
│   └── README.md
│
├── install.sh                # One-command installer
└── README.md                 # This file
```

---

## The 7 Moves (vs Everything Claude Code)

| Move | What | Status |
|------|------|--------|
| 1. Plugin Packaging | .claude-plugin/ + install.sh + marketplace | ✅ Built |
| 2. BuzzShield | 47-rule crypto security scanner | ✅ Built |
| 3. hooks.json | Auto-recovery, bash guard, lint, state save | ✅ Built |
| 4. Slash Commands | 15 commands for all Buzz operations | ✅ Built |
| 5. npm Package | @buzzbd/scorer CLI + library | ✅ Built |
| 6. autoDream v2 | Pattern extraction + instinct system | ✅ Built |
| 7. Framework | Open-source reactive layer for crypto agents | ✅ Built |

---

## Why Buzz > ECC

| Dimension | Everything Claude Code | Buzz Crypto BD |
|-----------|----------------------|----------------|
| Nature | Toolkit (meta-tooling) | Product (live system) |
| Revenue | GitHub Sponsors | $200+ AIBTC + x402 micropayments |
| On-chain | None | 5 contracts (4 Base + 1 Solana) |
| Simulation | None | MiroFish 1000-10K agent swarm |
| Intel | MCP configs | 32 live connectors across 19 chains |
| Scoring | None | 11 rules, $0 LLM cost |
| Trust | Full trust assumed | 5-level graduated autonomy |
| Cost | User pays Claude API | $0/day LLM (qwen3:8b + Pro Max) |
| Narrative | Dev built by a dev | **Agent built by a chef** |

---

## Links

- **Live**: https://buzzbd.ai
- **Score**: https://buzzbd.ai/score
- **Leaderboard**: https://buzzbd.ai/scores
- **API**: https://api.buzzbd.ai
- **Twitter**: [@BuzzBySolCex](https://twitter.com/BuzzBySolCex)
- **npm**: [@buzzbd/scorer](https://www.npmjs.com/package/@buzzbd/scorer)

---

*v9.2 | 81 tables | 200+ endpoints | 12 agents | 32 intel sources | $200+ revenue*
*Built by a chef. Kitchen runs itself. Bismillah 🤲*
