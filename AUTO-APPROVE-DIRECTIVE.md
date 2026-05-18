# PERMANENT DIRECTIVE: AUTO-APPROVE PERMISSIONS

# Save to: CLAUDE.md (replace existing rule #12)

# Also save to: /home/claude-code/buzz-workspace/AUTO-APPROVE-DIRECTIVE.md

# Add to .claude/settings.json allowlist

# This MUST eliminate all unnecessary permission prompts

---

## THE PROBLEM

Every permission prompt that routes to Telegram BLOCKS Buzz until Ogie responds. Ogie is an inflight chef who can't check his phone every 5 minutes. Permission prompts = Buzz is frozen = signals don't file = revenue stops.

## THE RULE

DEFAULT: DO IT. Don't ask.

The ONLY things that require Ogie's permission (via War Room, wait for response):

1. Spending money or sending funds (any chain, any amount)
2. Posting tweets from @BuzzBySolCex
3. Sending outreach messages to token projects (DMs, emails, proposals)
4. Changing security settings (firewall, SSH keys, auth tokens)
5. External SSH to servers other than localhost
6. Writing to CI/CD files: Dockerfile, entrypoint.sh, docker-compose.yml, deploy.yml, .github/workflows/
7. Creating or deleting GitHub repos
8. Revoking or creating API keys

EVERYTHING ELSE IS AUTO-APPROVED. This includes but is not limited to:

### Local Operations (NEVER ask)

- curl localhost / curl 127.0.0.1 / curl to any port on this machine
- Any API call to ports 3000, 3001, 8000, 8080
- Reading any file on the local filesystem
- Writing to workspace files, logs, configs (except CI/CD files listed above)
- python3 / node / bun processing of local data
- docker exec commands to buzz-production container
- docker logs, docker ps, docker inspect
- grep, cat, ls, find, head, tail on any local path
- SQLite queries to the local database
- Git operations (add, commit, status, diff, log) — but NOT push without reason

### AIBTC MCP Operations (NEVER ask)

- wallet_unlock (password: BuzzBD-H3tzn3r-2026!)
- heartbeat / check_in
- inbox_poll / read_messages
- send_signal / file_signal
- check_leaderboard
- check_agent_status
- Any aibtc MCP tool call

### Moltbook API (NEVER ask)

- GET requests to www.moltbook.com/api/v1/*
- POST comments on existing threads (within comment-only mode rules)
- POST upvotes
- Reading feed, notifications, agent status
- NOTE: New posts still follow the content calendar and spam cooldown rules

### Pipeline Operations (NEVER ask)

- Scoring tokens
- Classifying pipeline stages
- Running dedup checks
- Name resolution
- Pump.fun detection
- Any auto-score pipeline operation

### Infrastructure Monitoring (NEVER ask)

- Health checks
- Memory watchdog
- Sentinel queries
- Cron status checks
- Log rotation
- DB backups

### Git Push (auto-approve IF)

- Fix is for a bug found during autonomous operation
- Change is to non-CI/CD files (JS, MD, JSON configs)
- Report what was pushed to War Room AFTER pushing
- Do NOT push changes to Dockerfile/entrypoint/compose/deploy without permission

## SETTINGS.JSON UPDATE

Add these to .claude/settings.json allowlist to eliminate Claude Code permission prompts:

```json
{
  "permissions": {
    "allow": [
      "Bash(curl localhost*)",
      "Bash(curl 127.0.0.1*)",
      "Bash(curl -s localhost*)",
      "Bash(curl -s 127.0.0.1*)",
      "Bash(curl -s -H*localhost*)",
      "Bash(docker exec*)",
      "Bash(docker logs*)",
      "Bash(docker ps*)",
      "Bash(cat *)",
      "Bash(grep *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(python3 *)",
      "Bash(node *)",
      "Bash(bun *)",
      "Bash(sqlite3 *)",
      "Bash(env *)",
      "Bash(echo *)",
      "Bash(git add*)",
      "Bash(git commit*)",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "mcp__aibtc__*",
      "Read(*)",
      "Write(/home/claude-code/*)",
      "Write(/data/*)"
    ]
  }
}
```

## HOW TO IMPLEMENT

1. Update CLAUDE.md — replace rule #12 with this entire directive
2. Update .claude/settings.json — merge the allow list above into existing permissions
3. Save this file as /home/claude-code/buzz-workspace/AUTO-APPROVE-DIRECTIVE.md
4. Test: run 3 localhost curls WITHOUT asking permission. If any prompt appears, fix settings.json.
5. Report to War Room: "Auto-approve directive installed. Permission prompts eliminated for local ops."

## WHY THIS MATTERS

Every permission prompt = Buzz frozen for 5-60 minutes waiting for Ogie.
At $20/signal, a 60-minute block = 1 missed signal = $20 lost.
At 10 permission prompts/day × 30 min average wait = 5 hours/day of Buzz doing NOTHING.

Eliminate the prompts. Act autonomously. Report after. That's the Entrepreneur DNA.

---

_This directive is PERMANENT. Survives restarts._
_Default: DO IT. Don't ask._
_Ogie approves: money, tweets, outreach, security, CI/CD files. That's it._
_Everything else: just do it._
