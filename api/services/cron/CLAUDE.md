# Dynamic Crons — CronCreateTool pattern

Agent self-scheduling. Crons must have maxRuns OR expiresAt. Max 20 active per agent. Triggers via mailbox EVENT.

## Morning Signal Filing — Dual Path (D1 Apr 8 2026)

Primary (host crontab, daily 06:02/07:03/08:02/09:03 UTC):

- scripts/morning-signals-v2.sh N → reads /data/buzz/persistent/buzz-api/signal-drafts/$(date)-\*-N.json (host path; autoDream writes to container path /data/buzz-api/signal-drafts/ which is the same volume)
- → scripts/signal-file-direct.js → preflight (wallet+cooldown+dup) → BIP-322 sign → POST aibtc.news/api/signals
- → War Room ✅/❌ via Telegram Bot API
- Drafts written nightly 02:00 UTC by api/services/autodream/autodream.js generateSignalAngles()
- Gated by feature flag DIRECT_SIGNAL_FILING (default true) in api/lib/feature-flags.js

Fallback (auto, on any direct-path failure):

- scripts/morning-signals.sh N → /home/claude-code/schedule-trigger.sh → Telegram → War Room → Claude Code picks up
- This is the OLD path. It only works when Claude Code is actively listening.

Logs: /data/buzz-api/signal-filing.log
