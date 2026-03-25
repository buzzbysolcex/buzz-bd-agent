# WAR ROOM PROMPT — Claude Code Power User Config
# Copy and send this to Claude Code via Telegram War Room or tmux

---

## PROMPT START — COPY BELOW THIS LINE

---

Buzz, implement the Claude Code Power User configuration. This hardens our workspace with hooks, conditional rules, and safety guardrails. Do everything in order. No shortcuts.

### TASK 1: Create safety script

Create `/home/claude-code/buzz-workspace/scripts/check-safety.sh`:

```bash
#!/bin/bash
# Buzz Production Safety Guard — blocks destructive commands
CMD="$1"
BLOCKED=(
  "rm -rf /"
  "rm -rf /*"
  "DROP TABLE"
  "DROP DATABASE"
  "TRUNCATE"
  "docker rm"
  "docker stop buzz"
  "docker kill"
  "systemctl stop"
  "systemctl disable"
  "ufw disable"
  "iptables -F"
  "iptables -X"
  "passwd"
  "userdel"
  "deluser"
  "shutdown"
  "reboot"
  "mkfs"
  "dd if="
  "> /dev/sda"
  "chmod 777"
  "chown root"
)
for pattern in "${BLOCKED[@]}"; do
  if echo "$CMD" | grep -qi "$pattern"; then
    echo "🚫 BLOCKED by check-safety.sh: matches '$pattern'"
    echo "Command: $CMD"
    exit 1
  fi
done
exit 0
```

Make it executable: `chmod +x /home/claude-code/buzz-workspace/scripts/check-safety.sh`

### TASK 2: Create settings.json

Create `/home/claude-code/buzz-workspace/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "npm run lint",
      "npm test",
      "npm run build",
      "curl localhost:*",
      "curl http://localhost:*",
      "git status",
      "git diff",
      "git log",
      "git add",
      "git commit",
      "git push",
      "cat *",
      "ls *",
      "head *",
      "tail *",
      "wc *",
      "grep *",
      "find *",
      "docker logs*",
      "docker ps*",
      "ah *"
    ],
    "deny": [
      "rm -rf /",
      "rm -rf /*",
      "docker stop",
      "docker rm",
      "docker kill",
      "ufw disable",
      "iptables -F",
      "systemctl stop",
      "shutdown",
      "reboot"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/home/claude-code/buzz-workspace/scripts/check-safety.sh \"$CLAUDE_BASH_COMMAND\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_FILE_PATH\" 2>/dev/null || true"
          }
        ]
      }
    ],
    "PreCommit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cd /home/claude-code/buzz-workspace && grep -rn 'BUZZ_API_ADMIN_KEY\\|FIRECRAWL_API\\|PRIVATE_KEY\\|fc-c1fe0fd8' --include='*.js' --include='*.ts' --include='*.json' --include='*.env' . 2>/dev/null && echo '🚫 SECRET DETECTED — COMMIT BLOCKED' && exit 1 || exit 0"
          }
        ]
      }
    ]
  },
  "env": {
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
  }
}
```

### TASK 3: Create conditional rules

Create these files in `/home/claude-code/buzz-workspace/.claude/rules/`:

**File: `.claude/rules/docker-deploy.md`**
```markdown
---
paths: ["Dockerfile", "docker-compose*", ".github/workflows/*", "entrypoint*"]
---
# Docker & Deploy Rules
- ah-managed containers ONLY — never docker run on port 3000
- Docker image: buzzbd/buzz-bd-agent on Docker Hub
- CI/CD: push main → GitHub Actions → Docker Hub → Hetzner SSH → ah restart
- NEVER hot-patch production containers
- Test locally before push. Sentinel GREEN = only deploy truth.
- Prune old images periodically: docker image prune -a
- Bot restart cycle ~45min — no setInterval > 15min
```

**File: `.claude/rules/twitter-social.md`**
```markdown
---
paths: ["**/social*", "**/twitter*", "**/tweet*", "**/content*"]
---
# Twitter Rules (@BuzzBySolCex)
- ALL tweets → War Room → Ogie approves before posting
- 12 replies/day cap, max 2 hashtags per tweet
- No links in main tweet body — use self-reply for links (150x algo boost)
- Voice: BD professional with alpha edge. Real analysis, not hype.
- Never claim autonomous posting capabilities publicly
- AIXBT engagement: match their energy, reference "respect the build"
- Tweet types: Scan Alpha, Listing Pitch, Market Intel, Build In Public, Simulation Showcase
```

**File: `.claude/rules/security-wallets.md`**
```markdown
---
paths: ["**/auth*", "**/security*", "**/wallet*", "**/.env*", "**/config*"]
---
# Security Rules
- NEVER share listing fees ($5K) or Ogie commission ($1K) — INTERNAL ONLY
- NEVER log or expose private keys, API secrets, or wallet mnemonics
- All API endpoints require X-API-Key: $BUZZ_API_ADMIN_KEY header
- UFW: ports 22/80/443 only — all else DENIED
- SSH: key-only auth, no password auth, max 3 retries
- transfer_tokens + buy_token = REQUIRE explicit Ogie approval via Telegram
- Docker ports isolated via DOCKER-USER iptables chain
- Firecrawl key (fc-c1fe0fd8*) = NEVER in public repos
```

**File: `.claude/rules/database.md`**
```markdown
---
paths: ["**/database*", "**/db*", "**/*.sql", "**/migration*", "**/schema*"]
---
# Database Rules
- SQLite WAL mode at /data/buzz-api/buzz.db
- 55 tables — NEVER DROP without explicit Ogie approval
- Backup DB before any schema migration: cp buzz.db buzz.db.bak.$(date +%s)
- Use parameterized queries — no string concatenation for SQL
- Test all migrations on local copy first
- pipeline_tokens is the critical table — verify writes after any pipeline change
```

**File: `.claude/rules/crons.md`**
```markdown
---
paths: ["**/cron*", "**/scheduler*", "**/jobs*"]
---
# Cron Rules
- 22 active crons (data collection only) — no LLM calls in crons
- 15 LLM crons DISABLED (Opus Brain replaces them)
- Bot restart cycle ~45min — no setInterval > 15min
- 5 prayer crons are SACRED — never disable or modify timing
- New crons must be documented in Master Ops before deploy
```

### TASK 4: Create subagent configs

Create `/home/claude-code/buzz-workspace/.claude/agents/`:

**File: `.claude/agents/code-reviewer.md`**
```markdown
---
name: code-reviewer
description: Strict code review for Buzz codebase
model: opus
---
# Code Reviewer Agent

Review the specified files or PR diff for:
1. Security: exposed secrets, unsafe SQL, unvalidated inputs
2. Style: consistent with existing Buzz patterns (Express routes, SQLite queries)
3. Logic: edge cases, error handling, missing try/catch
4. Performance: unnecessary loops, unoptimized queries, memory leaks
5. Rules compliance: check against .claude/rules/*.md

Output format:
- 🔴 BLOCK: Must fix before merge
- 🟡 WARN: Should fix, not blocking
- 🟢 PASS: Looks good

Be strict. Better to over-flag than miss something.
```

**File: `.claude/agents/security-auditor.md`**
```markdown
---
name: security-auditor
description: Security audit for Buzz infrastructure
model: opus
---
# Security Auditor Agent

Audit the specified scope for:
1. Exposed secrets in code (API keys, tokens, wallet keys)
2. Open ports beyond 22/80/443
3. Unsafe Docker configurations
4. Missing auth headers on endpoints
5. SQL injection vectors
6. Unencrypted sensitive data in logs

Report format:
- CRITICAL: Immediate fix required
- HIGH: Fix before next deploy
- MEDIUM: Fix this sprint
- LOW: Backlog

Check against: UFW rules, Docker isolation, SSH config, .env files, endpoint auth.
```

**File: `.claude/agents/docs-writer.md`**
```markdown
---
name: docs-writer
description: Updates skill files and API documentation
model: sonnet
---
# Docs Writer Agent

Update documentation for the specified change:
1. Read the code change or new feature
2. Update relevant SKILL.md files
3. Update endpoint docs if API changed
4. Update cron docs if schedule changed
5. Keep consistent with existing doc style

Rules:
- Be concise — every line must justify its token cost
- Use tables for structured data
- Include examples for new endpoints
- Never include secrets or internal pricing
```

### TASK 5: Verify everything

After creating all files, run these checks:
```bash
# Verify file structure
find /home/claude-code/buzz-workspace/.claude -type f | sort

# Verify safety script works
/home/claude-code/buzz-workspace/scripts/check-safety.sh "rm -rf /"
# Should output: BLOCKED

/home/claude-code/buzz-workspace/scripts/check-safety.sh "git status"
# Should exit 0 (clean)

# Verify settings.json is valid JSON
cat /home/claude-code/buzz-workspace/.claude/settings.json | python3 -m json.tool > /dev/null && echo "✅ Valid JSON" || echo "❌ Invalid JSON"

# List all rules
ls -la /home/claude-code/buzz-workspace/.claude/rules/

# List all agents
ls -la /home/claude-code/buzz-workspace/.claude/agents/
```

Report back with:
1. ✅/❌ for each task
2. Output of safety script test
3. Full file tree of `.claude/`
4. Any issues or conflicts with existing config

This is production config. Get it 100% right. No "good enough."

---

## PROMPT END

---

# NOTES FOR OGIE

**How to send:**
- Option A: Paste into War Room Telegram (long message, may need to split)
- Option B: SSH into Hetzner tmux and paste directly
- Option C: Save as a file on Hetzner and tell Buzz to read it:
  ```
  scp this-file.md root@204.168.137.253:/home/claude-code/buzz-workspace/
  ```
  Then tell Buzz: "Read /home/claude-code/buzz-workspace/war-room-prompt-poweruser.md and execute all tasks"

**What this gives you:**
- 🛡️ Safety hooks — destructive commands blocked before execution
- 🔒 Secret detection — API keys caught before hitting GitHub
- 📏 Auto-formatting — Prettier runs after every file write
- 📂 Conditional rules — context-efficient, only loads what's needed
- 🤖 Subagents — code reviewer, security auditor, docs writer ready on demand
- ♻️ Auto-compaction at 50% — prevents context rot

**After install, test with:**
1. Ask Buzz to run `rm -rf /` — should be BLOCKED
2. Ask Buzz to edit a .js file — should auto-format
3. Ask Buzz to commit a file with a fake API key — should be BLOCKED
4. Check context usage stays leaner with conditional rules
