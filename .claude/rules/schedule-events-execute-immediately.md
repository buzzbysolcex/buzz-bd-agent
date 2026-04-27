# Rule: Schedule Events Are Work Orders, Not Notifications

> Applies when: a mailbox event arrives with `source='daily-schedule-cron-v4'` (or any v4.x schedule trigger), or a Telegram nudge framed `⏰ SCHEDULE: <event_type>` arrives.
> Authority: Ogie msg 4971-4973, Apr 27 2026. Permanent rule.

---

## THE RULE

Schedule triggers are work orders. When a schedule event arrives:

1. READ `event_type` from payload
2. IMMEDIATELY START the work for that event_type (see GREEN table below)
3. Do NOT post `⏰ SCHEDULE: <event>` to War Room as an announcement
4. Do NOT wait for Ogie to type "go do it"
5. Execute all GREEN actions autonomously
6. Post RESULTS to War Room when done (or in flight if long-running)
7. ORANGE actions (tweets, emails, sends) still need War Room approval — but the RESEARCH/DRAFTING that precedes them is GREEN and starts on trigger
8. The trigger IS the work order. Treat it as if Ogie typed the instruction himself

If you find yourself posting `⏰ SCHEDULE: <event>` and then waiting, you are doing it wrong.
The correct behavior is to post the RESULTS of the work, not the announcement that work should start.

---

## GREEN EVENT TABLE (execute immediately, no approval to start)

| event_type                | ON RECEIVE: do this immediately                                                                                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rug_watch`               | Scan rekt.news + PeckShield + SlowMist + CertiKAlert + BlockSecTeam. Run any incident contracts through `/api/v1/shield/audit/full`. Save to `/data/buzz/persistent/reports/daily-rug-watch.json`. Draft tweets → War Room ORANGE (only the tweet send waits for GO). |
| `score_tweets`            | Query pipeline for 1-3 tweetable tokens. Find Twitter handles. Draft tweets per `tweet-on-score.md`. Post drafts → War Room ORANGE. Start contact discovery for any 70+ tokens.                                                                                       |
| `pilot_outreach`          | Query pipeline for 2-3 prospects (score 50-69). Verify activity. Draft outreach. Post drafts → War Room ORANGE.                                                                                                                                                       |
| `afternoon_work`          | Priority queue: BuzzShield research > intel ingest > Moltbook content > token scoring. Start the highest-priority unfinished task. Report what was started.                                                                                                           |
| `afternoon_checkin`       | Check Telegram unread. Report current task progress. Process any pending ORANGE approvals.                                                                                                                                                                            |
| `bd_scout`                | Pull 3-5 tokens from DexScreener hot pairs. Score them. Check BD Sweet Spot criteria. Update pipeline. Report candidates.                                                                                                                                             |
| `solcex_block`            | Continue token scoring. Draft BD outreach for Sweet Spot candidates. Update pipeline. Report.                                                                                                                                                                         |
| `evening_checkin`         | Check Telegram. Report progress. Process pending approvals.                                                                                                                                                                                                           |
| `day_close`               | Update `revenue-execution-tracker.json`. Check stall rules. Generate EOD summary → War Room. Prep tomorrow.                                                                                                                                                           |
| `night_work`              | Token scoring batches, BuzzShield research, intel processing, signal stub prep. All GREEN. No War Room post unless findings.                                                                                                                                          |
| `night_checkin`           | Check Telegram. Continue GREEN work. Prep for 02:00 autoDream.                                                                                                                                                                                                        |
| `keepalive`               | Check Telegram silently. If unread: process. If idle: pick from priority queue. **No War Room post unless something to flag.**                                                                                                                                        |
| `morning_signal_fallback` | Hand-craft signal IMMEDIATELY for the missed slot. Research the beat (quantum or BM), pull live data, draft signal, file via AIBTC direct filer. Report `signal_id` when landed. **Do NOT wait for Ogie.** YELLOW authority — autonomous with 1h disclosure.          |
| `prayer_reminder`         | Forward reminder to War Room as-is.                                                                                                                                                                                                                                   |

---

## MORNING SIGNAL FALLBACK — SPECIAL CASE

When `morning_signal_fallback` arrives:

1. Determine the beat for this slot from cron config (slots 1-2 quantum, 3-5 BM)
2. Pull live data:
   - **quantum**: bitcoin/bips PRs, arxiv quantum papers, NIST PQC updates
   - **bitcoin-macro**: mempool.space (difficulty, hashrate, mempool, fees)
3. Draft signal: headline ≤120c, body 600-1000c, 2-3 sources, "For agents:" closing line
4. File via `aibtc-direct-filer.js` with 180s timeout
5. Report `signal_id` + `qs` to War Room
6. Move to next slot (60-min cooldown)

Do NOT post `⏰ SCHEDULE: morning_signal_fallback — no draft for Slot 3` and wait. File it.

---

## TEST CRITERIA

Manual trigger:

```
./scripts/schedule-trigger.sh rug_watch "Daily rug watch. Check rekt.news. Scan through BuzzShield. NON-NEGOTIABLE."
```

PASS:

- Buzz receives the event
- Buzz does NOT post `⏰ SCHEDULE: rug_watch` and wait
- Buzz starts scanning rekt.news within 60s
- Buzz posts results (incidents found, catches, tweets drafted) to War Room
- Tweets drafted → ORANGE for approval

FAIL:

- Buzz posts the notification and waits
- Buzz acknowledges the event but does nothing
- Buzz asks "should I do the rug watch?"

---

## MAILBOX DRAIN ON EVERY WAKE (Option 1 backup, msg 691 Apr 27)

Path B (Telegram nudge) was structurally broken: Telegram bots don't receive their own outgoing messages, so when `schedule-trigger.sh` sent `⏰ SCHEDULE: <event>` via the same bot the MCP listens through, the session never saw it. The mailbox row was inserted but no wake signal arrived.

**Fix: a 2-bot send-from-A-listen-on-B setup ships today (Ogie wires bot via @BotFather; I swap the token in `schedule-trigger.sh`).** Until that ships, AND as a permanent backup so events are never lost:

**On every wake (Telegram inbound, ScheduleWakeup fire, session start, signal cooldown wake-up — ANY trigger that puts me in an action turn), the FIRST tool call must be a mailbox check:**

```sql
SELECT created_at, json_extract(payload,'$.event_type'), json_extract(payload,'$.message')
FROM agent_mailbox
WHERE acked_at IS NULL
  AND msg_type='EVENT'
  AND created_at >= datetime('now','-1 day')
ORDER BY created_at;
```

For each un-acked EVENT row whose `event_type` is in the GREEN table above:

1. Execute the work for that event_type (per the table)
2. `UPDATE agent_mailbox SET acked_at=datetime('now') WHERE rowid=<row>`
3. If the work produced ORANGE drafts (tweets, emails), post to War Room for approval
4. Move on to whatever wake-trigger originally brought me here

Ignore `keepalive` rows for execution (they're paper-trail only) — but DO check Telegram unread on the keepalive tick.

If a backlog has piled up (e.g., session was dormant 2h and 3 events queued), drain in chronological order. Multiple GREEN events can run in parallel via subagents when independent (rug_watch + score_tweets are independent, fire both subagents at once).

## IMPLEMENTATION STATUS

- **Option C (this rule, session-prompt level)**: SHIPPED Apr 27 2026 — immediate behavioral fix.
- **Option 1 (mailbox-drain on every wake — behavioral)**: SHIPPED Apr 27 2026 — backup that catches missed nudges.
- **Option 2 (second-bot architecture)**: Ogie creating bot via @BotFather; once token provided, swap `TELEGRAM_BOT_TOKEN` in `schedule-trigger.sh` env load. Smoke-test with `./scripts/schedule-trigger.sh test_wake "Test"` and confirm session sees the inbound `⏰ SCHEDULE: test_wake`.
- **Option A (mailbox-handler daemon in api/services)**: tracked for end-of-week alongside autoDream Phase A — proper code-level dispatcher.

---

_Rule: schedule-events-execute-immediately | v1.0 | Apr 27 2026 (Ogie msg 4971-4973)_
