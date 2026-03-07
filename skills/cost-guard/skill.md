# Cost Guard — Daily Budget Enforcement Skill
# Drop into: /opt/buzz-workspace-skills/cost-guard/skill.md
# Wired to: orchestrator pre-dispatch hook

---

## Purpose

Enforce a daily MiniMax spend cap. When exceeded, auto-route all remaining
calls through Bankr LLM Gateway (GPT-5 Nano / Haiku 4.5) until UTC midnight reset.

## Configuration

```
DAILY_MINIMAX_CAP_USD=10.00
THROTTLE_MODEL=bankr/gpt-5-nano
FALLBACK_MODEL=bankr/claude-haiku-4.5
ALERT_THRESHOLD_PCT=70
ALERT_TELEGRAM_CHAT=950395553
```

## Logic

### Pre-Dispatch Check (runs BEFORE every LLM call)

```
1. Read /data/workspace/memory/cost-tracker.json
2. If today's date != tracker.date → reset counter to 0.00
3. If tracker.daily_total >= DAILY_MINIMAX_CAP_USD:
   a. Route call to THROTTLE_MODEL (Bankr)
   b. Log: "COST_GUARD: MiniMax cap reached ($X.XX/$10.00), routing to Bankr"
   c. Return Bankr response
4. If tracker.daily_total >= (DAILY_MINIMAX_CAP_USD * ALERT_THRESHOLD_PCT / 100):
   a. Send ONE Telegram alert (if not already sent today):
      "⚠️ COST GUARD: MiniMax daily spend at $X.XX / $10.00 (70% threshold)"
   b. Continue with MiniMax (not yet over cap)
5. Proceed with MiniMax call
```

### Post-Response Hook (runs AFTER every MiniMax call)

```
1. Estimate cost from response headers or token counts:
   - input_tokens * $0.0003 / 1000 (chatcompletion input)
   - output_tokens * $0.0015 / 1000 (chatcompletion output)
   - cache_create_tokens * $0.000375 / 1000
   - cache_read_tokens * $0.00003 / 1000
2. Add estimated cost to tracker.daily_total
3. Write updated tracker to /data/workspace/memory/cost-tracker.json
4. Log to /data/logs/cost-guard.log
```

## cost-tracker.json Schema

```json
{
  "date": "2026-03-07",
  "daily_total": 7.42,
  "calls_minimax": 34,
  "calls_bankr_fallback": 0,
  "alert_70pct_sent": true,
  "alert_cap_sent": false,
  "hourly_breakdown": {
    "00": 0.31,
    "01": 0.28,
    "06": 1.24,
    "12": 2.89
  },
  "by_agent": {
    "orchestrator": 3.21,
    "scanner-agent": 1.08,
    "safety-agent": 0.92,
    "wallet-agent": 0.44,
    "social-agent": 0.89,
    "scorer-agent": 0.88
  }
}
```

## REST API Integration

Wire cost-tracker.json data into existing REST API endpoints:

### PATCH: /api/v1/costs/summary
```javascript
// In costs.js route handler:
app.get('/api/v1/costs/summary', auth, (req, res) => {
  const tracker = JSON.parse(fs.readFileSync('/data/workspace/memory/cost-tracker.json', 'utf8'));
  res.json({
    date: tracker.date,
    daily_total: tracker.daily_total,
    daily_cap: 10.00,
    remaining: Math.max(0, 10.00 - tracker.daily_total),
    pct_used: ((tracker.daily_total / 10.00) * 100).toFixed(1),
    throttled: tracker.daily_total >= 10.00,
    calls_minimax: tracker.calls_minimax,
    calls_bankr: tracker.calls_bankr_fallback
  });
});
```

### PATCH: /api/v1/costs/by-agent
```javascript
app.get('/api/v1/costs/by-agent', auth, (req, res) => {
  const tracker = JSON.parse(fs.readFileSync('/data/workspace/memory/cost-tracker.json', 'utf8'));
  res.json({
    period: tracker.date,
    agents: Object.entries(tracker.by_agent || {}).map(([name, cost]) => ({
      name, cost: cost.toFixed(4)
    }))
  });
});
```

## Sentinel Integration

Add to Sentinel's sweep:
```
GET /api/v1/costs/summary
→ If pct_used > 90%: MEDIUM alert
→ If throttled == true: INFO log (expected behavior)
→ If daily_total > 15.00 AND NOT throttled: HIGH alert (guard failed)
```

## JVR Receipt

Every time cost guard triggers throttle:
```
Category: system
Action: cost_guard_throttle
Details: "Daily cap $10.00 reached at HH:MM UTC. Routed to bankr/gpt-5-nano."
```

---

## Implementation Notes

This skill works at the OpenClaw orchestrator level. The key integration point
is the `sessions_spawn` call — before the orchestrator dispatches to MiniMax,
it checks cost-tracker.json and decides whether to use MiniMax or Bankr.

For the orchestrator's own calls (the main MiniMax M2.5 brain), the cost guard
should still allow MiniMax up to the cap, but sub-agent dispatch should
ALWAYS prefer Bankr/GPT-5-Nano regardless of cap status (this is the biggest
cost savings — sub-agents don't need a 229B param model).

### Priority Routing After Cost Guard

| Agent | Default Model | After Cap |
|-------|--------------|-----------|
| Orchestrator | MiniMax M2.5 | bankr/gpt-5-nano |
| scanner-agent | bankr/gpt-5-nano | bankr/gpt-5-nano (no change) |
| safety-agent | bankr/gpt-5-nano | bankr/gpt-5-nano (no change) |
| wallet-agent | bankr/gpt-5-nano | bankr/gpt-5-nano (no change) |
| social-agent | bankr/gpt-5-nano | bankr/gpt-5-nano (no change) |
| scorer-agent | bankr/gpt-5-nano | bankr/gpt-5-nano (no change) |

**Key insight:** If sub-agents already route through Bankr, the ONLY MiniMax
consumer is the orchestrator itself. This means the $10/day cap primarily
governs orchestrator reasoning calls.

---

*Cost Guard Skill v1.0 | Sprint Day 13 | "Cost Disciplined."*
