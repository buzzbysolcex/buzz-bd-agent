---
paths: ["**/auth*", "**/security*", "**/wallet*", "**/.env*", "**/credential*"]
---

# Security Rules

- NEVER share listing fees ($5K) or commission ($1K) publicly
- NEVER log private keys or API secrets
- NEVER reveal Hetzner IP in ANY public content
- All API endpoints require X-API-Key header
- UFW: 22/80/443 only — all else DENIED
- SSH: key-only auth, no passwords
- transfer_tokens + buy_token = REQUIRE Ogie approval via Telegram
- Discord bot token, Firecrawl key, Moltbook key = NEVER in Git
- HEYANON WALLET KEYS:
  - Location: /home/claude-code/.env.heyanon (chmod 600)
  - NEVER log, print, echo, or transmit private keys or seed phrase
  - NEVER include in git commits, War Room messages, tweets, or logs
  - File permissions must remain 600 (owner read/write only)
  - READ ops autonomous. WRITE/TRANSFER requires CEO approval.
  - Compromise protocol: if keys exposed, Ogie must transfer all funds immediately
