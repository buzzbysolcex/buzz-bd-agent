---
name: reboot
description: Execute Buzz reboot recovery procedure. Automated via SessionStart hook but can be triggered manually if hooks fail.
---

# /reboot — Manual Recovery

Run the full reboot recovery procedure manually.

## Usage
```
/reboot                         # Full 9-step recovery
/reboot --quick                 # Steps 4-5B only (skip SSH/tmux)
/reboot --verify                # Verify all systems without recovery
```

## Recovery Steps
1. Check tmux session exists
2. Start Claude Code with --dangerously-skip-permissions + --channels
3. Verify Telegram two-way
4. Full startup read sequence (14 files + 18 rules)
5. v9 module verification (mailbox, task-dag, crons, events, flags)
5B. Context optimization verification (rule #18 + CLAUDE.md hygiene)
6. State verification (Docker, SQLite, .env)
7. HeyAnon/Phantom MCP re-auth
8. /effort high
9. Detach tmux

Note: SessionStart hook automates steps 4-8 automatically.
