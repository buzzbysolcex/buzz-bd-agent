# Discord Bot Backup Channel — Design

**Issue:** #2 — feat: add Discord bot to entrypoint as Telegram backup
**Date:** 2026-02-25
**Status:** Approved

## Problem

Buzz BD Agent communicates exclusively via Telegram. If Telegram is down or blocked, there is no backup channel. A Discord bot has already been registered (App ID: `1475792150380941372`) but is not wired into the system.

## Solution

Add Discord as a backup communication channel by adding a `discord` channel block to the OpenClaw config generated in `entrypoint.sh`. OpenClaw handles the Discord SDK internally, matching the existing Telegram pattern.

## Changes

### `entrypoint.sh`

1. Add conditional Discord channel block to the generated `openclaw.json`:
   - Only included when `DISCORD_BOT_TOKEN` env var is set
   - Contains `botToken` and `appId` fields
2. Add `DISCORD_BOT_TOKEN` to the ENV check log output

### No other files changed

- **Dockerfile**: No changes — OpenClaw handles Discord internally
- **Python code**: No changes — out of scope (DiscordBridge can be added later)

## Config Shape

When `DISCORD_BOT_TOKEN` is set:

```json
"channels": {
  "telegram": {
    "enabled": true,
    "dmPolicy": "open",
    "botToken": "<TELEGRAM_BOT_TOKEN>"
  },
  "discord": {
    "enabled": true,
    "botToken": "<DISCORD_BOT_TOKEN>",
    "appId": "1475792150380941372"
  }
}
```

When `DISCORD_BOT_TOKEN` is not set: config is unchanged (Telegram only).

## Graceful Degradation

Discord is a backup channel. Missing `DISCORD_BOT_TOKEN` produces a warning log but does not block startup. Telegram remains the primary channel.
