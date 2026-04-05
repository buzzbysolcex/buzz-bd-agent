---
description: "Security rules for crypto agent operations — secrets, transactions, trust"
alwaysApply: true
---

# Security Rules

## Secrets
- NEVER log, print, commit, or transmit private keys
- NEVER hardcode API keys — use environment variables
- NEVER expose server IPs in public content — use domain names
- NEVER include .env files in git commits

## Operations
- ALL financial transactions require human approval
- ALL outreach emails CC the operator
- Template-only for automated sends — no LLM-generated email bodies
- Max 10 outreach emails per day

## Trust Gates
- Current trust level determines autonomy scope
- ANY complaint triggers instant reset to Level 0
- Trust promotion requires system recommendation + human confirmation
