# BUZZ BROWSER-USE DEPLOYMENT
## Installed: Day 39 | March 27, 2026

## Installation
- browser-use v0.12.5 (pip --user)
- uv/uvx v0.11.2 (for browser management)
- Connects to existing headless Chrome/146 on port 9222
- All commands use: --cdp-url http://localhost:9222

## War Room Commands
- /browse <url> — Open, screenshot, send to War Room, close
- /scrape <url> — Open, extract state/elements, keep session
- /click <index> — Click element, screenshot result
- /browser-status — Chrome memory, active sessions
- /browser-close — Close all sessions

## Crons
- #29: dexscreener-visual-scan (every 4h) — Solana trending screenshot
- #30: virtuals-daily-check (daily 08:00 UTC) — ACP status screenshot

## Safety Rules (PERMANENT)
1. NEVER expose browser externally — localhost only
2. NEVER store credentials in commands — use env vars
3. NEVER automate financial transactions without Ogie approval
4. ALL screenshots route through War Room
5. Close sessions after use
6. Max 3 concurrent sessions
7. Screenshots in /tmp/
8. Chrome memory > 2GB = close tabs + report

## Memory
Chrome baseline: ~1.2GB with 1 page loaded
browser-use adds ~0 overhead (CDP commands only)

## Virtuals ACP Findings
- Create Agent / Build / Prototypes pages require wallet connect
- Public pages: ACP Overview, Scan, Agents, Transactions tabs
- Buyer registration needs browser wallet extension or WalletConnect
- ACP CLI is the better path for agent management
