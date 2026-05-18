# Inter-Agent Mailbox

Pattern from Claude Code SendMessageTool. Async message passing between Buzz agents.

## Architecture

- SQLite table: agent_mailbox (from_agent, to_agent, msg_type, payload JSON)
- Types: ALERT, REQUEST, RESPONSE, EVENT
- Circuit breaker: 100 max unacked per agent
- Auto-expire: 24h default TTL
- Cleanup: daily maintenance deletes expired

## Endpoints (behind apiKeyAuth)

- POST /api/v1/mailbox/send
- GET /api/v1/mailbox/inbox/:agent
- POST /api/v1/mailbox/ack/:id
- POST /api/v1/mailbox/broadcast
- POST /api/v1/mailbox/cleanup

## Danger Zones

- Circuit breaker at 100 unacked — auto-expires oldest 10 if exceeded
- broadcast() hits all 12 agents — use sparingly
- Payload JSON max ~10KB recommended
