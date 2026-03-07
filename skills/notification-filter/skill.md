# Notification Filter — Telegram vs Silent Routing
# Drop into: /opt/buzz-workspace-skills/notification-filter/skill.md
# Wired to: orchestrator post-action hook

---

## Purpose

Route orchestrator events to Telegram (Ogie sees it) or JVR-only (silent).
Ogie cares about MONEY, PIPELINE MOVEMENT, and PRAYER. Everything else is noise.

## Configuration

```
TELEGRAM_CHAT_ID=950395553
DEDUP_WINDOW_MINUTES=60
```

## Decision Logic

```
on_event(event):
  1. Check dedup: same event type + same token within 60 min → SILENT
  2. Match against SEND rules (first match wins)
  3. If no SEND match → SILENT
  4. Exception: prayer_reminder → ALWAYS SEND, skip dedup
```

---

## SEND — Telegram + JVR

### Pipeline & Outreach

| Rule | Condition | Message |
|------|-----------|---------|
| S-01 | token_scored, score 85-100 | `🔥 HOT: $TICKER on $CHAIN, score XX. IMMEDIATE outreach triggered.` |
| S-02 | token_scored, score 70-84 | `✅ QUALIFIED: $TICKER on $CHAIN, score XX. Ready for outreach.` |
| S-03 | pipeline_stage_change | `🔄 $TICKER: $FROM → $TO ($CHAIN)` |
| S-04 | outreach_sent | `📧 Outreach sent: $TICKER → $EMAIL` |
| S-05 | reply_received | `📬 URGENT Reply from $TICKER team! Review now.` |
| S-06 | followup_due | `⏰ Follow-up due: $TICKER, XXh since contact` |
| S-07 | negotiation_update | `🤝 Negotiation: $TICKER — $SUMMARY` |
| S-08 | token_listed | `🎉 LISTED: $TICKER on SolCex!` |

### Revenue

| Rule | Condition | Message |
|------|-----------|---------|
| S-09 | acp_purchase | `💰 ACP: $OFFERING purchased ($AMOUNT USDC)` |
| S-10 | bankr_token_deployed | `💰 Bankr deploy: $TICKER — partner fee earned` |
| S-11 | x402_payment | `💰 x402 payment received: $AMOUNT` |

### Cost & System

| Rule | Condition | Message |
|------|-----------|---------|
| S-12 | cost_guard_throttle | `⚠️ Cost Guard: $10 cap reached. Routing to Bankr until midnight UTC.` |
| S-13 | cost_guard_warning (70%) | `⚠️ Cost Guard: $XX.XX / $10.00 (70% threshold)` |
| S-14 | sentinel_high_alert | `🚨 Sentinel HIGH: $SUMMARY` |
| S-15 | emergency (SOS/stop/compromise) | `🚨 EMERGENCY: $DETAILS` |

### Personal

| Rule | Condition | Message |
|------|-----------|---------|
| S-16 | prayer_reminder | `🕌 $PRAYER — $TIME WIB` |
| S-17 | morning_reminder | `☀️ Sprint briefing: $SUMMARY` |
| S-18 | evening_review | `🌙 Sprint review: $SUMMARY` |

**S-16 (prayer) bypasses dedup. Always sends.**

---

## SILENT — JVR Log Only

| Rule | Condition |
|------|-----------|
| Q-01 | scan_completed, max score < 70 |
| Q-02 | token_scored, score < 70 (WATCH/SKIP) |
| Q-03 | health_check, heartbeat, agent_health, api_health |
| Q-04 | cron_completed |
| Q-05 | moltbook_post, molten_post, moltbook_routine |
| Q-06 | molten_match_check (routine) |
| Q-07 | volume_alert, liquidity_alert, mint_alert, holder_alert (actionable == false) |
| Q-08 | pipeline_check, changes_count == 0 |
| Q-09 | backup_completed |
| Q-10 | twitter_bot_activity (routine posts, replies) |
| Q-11 | dedup hit (same event+token within 60 min) |

---

## Dedup

```
Key: "${event.type}:${event.data.token_address || event.type}"
TTL: 60 minutes
Storage: in-memory map, cleared on restart

Exception: prayer_reminder — never deduped
Re-notify when: score changes by >=5 points OR stage advances
```

---

## Event Schema

```json
{
  "type": "string",
  "timestamp": "ISO8601 UTC",
  "source": "string",
  "data": {
    "ticker": "string",
    "chain": "solana|base|bsc",
    "score": 0,
    "address": "string"
  },
  "severity": "info|low|medium|high|critical",
  "actionable": true
}
```

## JVR Receipt

Every event logs a JVR receipt:

```
Category: notification
Action: telegram_sent | silent_logged
Rule: S-XX | Q-XX
Details: "${event.type}: ${summary}"
```

---

*Notification Filter Skill v1.0 | "Signal over noise."*
