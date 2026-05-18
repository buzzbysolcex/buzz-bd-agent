# HeyAnon MCP — Brain #2

## Architecture

Conversational MCP: 22 tools, 51 protocols, 18 chains.
One `ask` tool routes to all protocols internally.
Buzz decides WHAT. HeyAnon decides HOW.

## Connection

- Endpoint: process.env.HEYANON_ENDPOINT
- Auth: process.env.HEYANON_API_KEY (JWT, never in git)
- Protocol: Streamable HTTP MCP (SSE + JSON-RPC)

## Feature Flags

- HEYANON_MCP: true (read-only intelligence)
- HEYANON_EXEC: false (no swaps/bridges/transfers)

## Tools (22)

ping, get_api_key_setup_url, email_login, wallet_list, is_account_locked,
unlock, ask, clear, isProcessing, abort, projects, scheduled_task_list,
scheduled_task_get, scheduled_task_delete, portfolio_tokens,
portfolio_transactions, portfolio_defi, portfolio_cex, background_task_list,
background_task, background_task_confirm, background_task_delete

## Danger Zones

- NEVER log JWT token
- Graceful degradation: if HeyAnon is down, scoring continues without it
- Rate limit: respect HeyAnon's rate limits
- HEYANON_EXEC must stay false until Ogie explicitly approves execution
