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
   2B. **Re-enable ultracode effort** — after the launch command and any settings-dialog "Continue", and BEFORE pasting the resume prompt: run `/effort` to re-enable ultracode (xhigh + dynamic workflow orchestration). Effort is session-only and resets to `high` on every restart, so run this first — the resume work then executes under ultracode rather than plain `high`.
3. Verify Telegram two-way
4. Full startup read sequence (14 files + 18 rules)
5. v9 module verification (mailbox, task-dag, crons, events, flags)
   5B. Context optimization verification (rule #18 + CLAUDE.md hygiene)
6. State verification (Docker, SQLite, .env)
7. HeyAnon/Phantom MCP re-auth
8. `/effort` — re-enable ultracode (see Step 2B; effort resets to `high` each restart, so this is a manual re-set, not an automatic one)
9. Wiki check (see below — Apr 9 2026 addition)
10. Detach tmux

Note: SessionStart hook automates steps 4-7 automatically. Step 2B / Step 8 (`/effort`) is session-only and CANNOT be set by the hook — it must be run manually each restart (the hook only prints a reminder).

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
