---
name: trust
description: View and manage trust gate levels. 5-level graduated autonomy system with on-chain reputation feedback.
---

# /trust — Trust Gate Manager

Graduated autonomy system for Buzz operations.

## Usage
```
/trust status                   # Show current trust level + history
/trust promote                  # Request promotion (system recommends, Ogie confirms)
/trust audit                    # Show trust audit trail
```

## Trust Levels
| Level | Name | What Buzz Can Do |
|-------|------|-----------------|
| 0 | FULL_APPROVAL | Nothing without Ogie's explicit approval |
| 1 | BASIC | Score + scan autonomously, outreach needs approval |
| 2 | OUTREACH | Send templated emails (CC Ogie), transactions need approval |
| 3 | ADVANCED | BLOCK auto-rejects, WARN/ALLOW need approval |
| 4 | AUTO_85 | Score >=85 auto-allows, rest needs approval |

Current: **Level 0 — FULL_APPROVAL** (earning autonomy)
Any complaint → instant reset to Level 0.
