# Stall watchdog — install options

Two equivalent ways to run the **independent** monitor. It MUST be a process
separate from `claude-code.service` (the main loop that can stall).

## Option A — user crontab (DEFAULT; no sudo, active now)

This is what's live. Matches the existing `memory-watchdog.sh` pattern.

```cron
# Buzz stall watchdog — independent stall monitor, every 10 min
*/10 * * * * /home/claude-code/buzz-workspace/scripts/infra/stall-watchdog.sh
```

crond spawns it fresh each tick, so a frozen session cannot take it down.

## Option B — systemd timer (needs passwordless sudo; not yet enabled)

Preferred if/when root is available. System-level, survives reboot via `Persistent=true`.

```bash
sudo cp buzz-stall-watchdog.service buzz-stall-watchdog.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now buzz-stall-watchdog.timer
systemctl list-timers | grep stall     # verify NEXT/LAST
```

To migrate A→B: remove the crontab line, then enable the timer (don't run both).

## Tunables (env, read by stall-check.py)

| var                   | default | meaning                                             |
| --------------------- | ------- | --------------------------------------------------- |
| `STALL_THRESHOLD_SEC` | 2700    | heartbeat staleness that counts as stalled (45m)    |
| `PARK_GRACE_SEC`      | 2700    | slack after a parked task's `resume_at` (45m)       |
| `RE_ALERT_SEC`        | 3600    | re-alert cadence while still stalled (60m)          |
| `WARROOM_DRY_RUN`     | 0       | 1 = evaluate + log only, do not page (self-test)    |

Set in the cron line (`STALL_THRESHOLD_SEC=1800 /path/stall-watchdog.sh`) or the
systemd unit (`Environment=STALL_THRESHOLD_SEC=1800`).
