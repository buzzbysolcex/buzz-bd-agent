---
name: security-scan
description: Run BuzzShield crypto-native security scanner on your agent configuration. 47 rules across secrets, wallets, agents, contracts, and infrastructure.
---

# /security-scan — BuzzShield Scanner

Crypto-native security audit for agent configurations.

## Usage
```
/security-scan                  # Quick scan (secrets + wallet safety)
/security-scan --deep           # Full scan (all 47 rules)
/security-scan --fix            # Auto-fix safe issues
/security-scan --report md      # Generate HSaaS-grade markdown report
```

## What It Scans
- **Secrets**: 14 patterns (private keys, API tokens, server IPs)
- **Wallet Safety**: 9 patterns (unprotected transfers, drain attacks)
- **Agent Config**: 12 patterns (permissions, trust gates, cron limits)
- **Contracts**: 7 patterns (ownership, reentrancy, verification)
- **Infrastructure**: 5 patterns (SSH keys, Docker, rate limiting)

## Exclusions (known false positives)
These paths contain detection PATTERNS, not actual secrets. Skip from secret scans:
- `hooks/scripts/post-edit-lint.js` — regex patterns for detecting secrets
- `hooks/scripts/pre-bash-guard.js` — regex patterns for blocking commands
- `buzz-surpass/hooks/scripts/*` — source copies of above
- `.claude/skills/buzzshield/SKILL.md` — documents detection patterns
- `.github/workflows/deploy.yml` — server IP needed for SSH deploy (known exception)

When running grep-based scans, exclude these with: `--exclude=post-edit-lint.js --exclude=pre-bash-guard.js`

## Output
Graded A-F. Exit code 2 on CRITICAL findings for CI/CD gates.
CRITICAL = must fix before deployment.
HIGH = should fix before production.
MEDIUM = improvement opportunity.
