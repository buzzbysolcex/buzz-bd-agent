# Bankr — Self-Sustaining Financial Infrastructure

AI-powered crypto operations and LLM gateway funded by Buzz's own wallet.

## Authentication
Bankr CLI is pre-installed. API key configured via BANKR_API_KEY env var.
CLI config at /root/.bankr/config.json (auto-generated on boot).

## LLM Gateway
Buzz uses Bankr LLM Gateway as fallback providers in the cascade.
Endpoint: https://llm.bankr.bot/v1/chat/completions
Anthropic endpoint: https://llm.bankr.bot/v1/messages
Header: X-API-Key: $BANKR_API_KEY

Available models (prefix with bankr/ in OpenClaw):
- gemini-3-flash ($0.15/$0.60 per M tokens — cheapest, daily tasks)
- claude-haiku-4.5 ($0.80/$4.00 — fast BD responses)
- gpt-5-nano ($0.10/$0.40 — ultra-cheap fallback)
- claude-sonnet-4.6 ($3/$15 — premium BD work)
- qwen3-coder ($0.30/$1.20 — coding tasks)
- gpt-5-mini ($0.40/$1.60 — mid-tier tasks)
- gemini-3-pro ($1.25/$10 — deep research)
- kimi-k2.5 ($0.60/$2.40 — alternative reasoning)

## Wallet Operations
- `bankr prompt "What is my balance?"` — check wallet
- `bankr llm credits` — check LLM credit balance
- `bankr llm models` — list available models
- `bankr whoami` — verify authentication

## Self-Sustaining Revenue Loop
1. Buzz discovers promising tokens via 5-layer pipeline
2. Buzz deploys tokens via Bankr Partner API → earns fees (50% split)
3. Fees land in Bankr anet wallet (0x2Dc0...05aA9)
4. Wallet funds LLM credits at bankr.bot/llm (auto top-up enabled)
5. LLM credits power Buzz's inference via Bankr Gateway
6. Buzz uses inference to discover more tokens → LOOP

## Token Deployment (Partner API)
Partner key: bk_JSCNUBW3BBL42ANML5RN4NHCZ5Q2YHEN
Fee split: 50%
Fee wallet: 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9
Deploy wallet: 0xfa04c7d627ba707a1ad17e72e094b45150665593
Docs: https://docs.bankr.bot/token-launching/partner-api

## Safety Rules
- NEVER execute trades above $100 without Ogie's Telegram approval
- NEVER use claude-opus models for routine tasks ($$$$)
- Always specify chain: "on Base", "on Solana"
- Check `bankr llm credits` before heavy operations
- Report all transactions to Telegram immediately
- Alert Ogie when LLM credits drop below $2
- Rate limit: 60 requests/minute on Bankr gateway
