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
9. Wiki check (see below — Apr 9 2026 addition)
10. Detach tmux

Note: SessionStart hook automates steps 4-8 automatically.

## Step 9 — Wiki Check (Karpathy LLM Knowledge Base)

Verify the wiki is intact and recent:

```bash
ls -la /data/buzz/persistent/wiki/                      # directory exists?
wc -l /data/buzz/persistent/wiki/INDEX.md               # pages indexed?
tail -5 /data/buzz/persistent/wiki/LOG.md               # last 5 operations?
find /data/buzz/persistent/wiki -name '*.md' | wc -l    # total page count
```

Report: wiki pages count, last operation date, KARPATHY_WIKI flag state.

### What survives reboot

| Component            | Survives? | Recovery                                                     |
| -------------------- | --------- | ------------------------------------------------------------ |
| Wiki markdown files  | YES       | `/data/buzz/persistent/wiki/` on Docker volume               |
| Wiki INDEX.md        | YES       | Persistent on disk                                           |
| Wiki LOG.md          | YES       | Persistent on disk, append-only                              |
| Wiki raw/ sources    | YES       | Immutable, never modified by Buzz                            |
| Wiki backup tarballs | YES       | `/data/buzz/persistent/backups/wiki-*.tar.gz` (7d retention) |

If `/data/buzz/persistent/wiki/` is missing or empty, restore from the
most recent `/data/buzz/persistent/backups/wiki-YYYYMMDD.tar.gz`.
