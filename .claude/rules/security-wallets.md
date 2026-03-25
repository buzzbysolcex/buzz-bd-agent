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
