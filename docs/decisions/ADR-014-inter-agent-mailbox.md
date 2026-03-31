# ADR-014: Inter-Agent Mailbox System

**Date:** March 31, 2026
**Status:** Accepted
**Decision:** Implement async message passing between Buzz agents using SendMessageTool pattern from Claude Code architecture.

**Context:** Claude Code source leak (Mar 31) revealed inter-agent mailbox with async delivery. Buzz has 12 agents that currently operate independently. Mailbox enables coordination.

**Consequences:** 5 new tables, 23 new endpoints. Feature-gated. Circuit breaker at 100 unacked. 24h auto-expire.
