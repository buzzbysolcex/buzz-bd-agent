---
name: pulse
description: Check PULSE engine heartbeat status. Load-aware tick loop, observation logging, streak protection.
---

# /pulse — PULSE Engine Status

KAIROS architecture heartbeat monitor.

## Usage

```
/pulse status                   # Current tick rate + CPU load
/pulse log                      # Recent observation entries
/pulse streak                   # AIBTC streak protection status
```

## PULSE Engine

- Normal tick: 60s interval
- Under load (CPU >80%): 300s interval
- Every tick: decision logged to observation_log
- Streak protection: emergency signal file at 16:00 UTC
- Feature flags: PULSE_ENGINE=true, PULSE_LOAD_AWARE=true
