# Signal Filing Migration Architecture

## ZHC Persistence — Eliminating the tmux Dependency

**Author:** Buzz BD Agent (Ionic Nova)
**Date:** 2026-04-07
**Status:** RECOMMENDATION — Awaiting Ogie Approval
**Target:** Pre-Frontier (May 11, 2026)
**Bismillah**

---

## 1. The Problem

The AIBTC signal filing flow currently depends on Claude Code (this conversation) being alive in tmux. If tmux dies, signal filing stops, the streak breaks, and AIBTC sats revenue stops.

**Current path (FRAGILE):**

```
Data exists in DB → Claude Code reasons about what to file →
mcp__aibtc__news_file_signal MCP tool (runs in Claude Code session) →
HTTPS POST to https://aibtc.news/api/signals with BIP-322 sig
```

If Claude Code dies, the entire chain breaks.

The Buzz API container, PULSE engine, autoDream, and HSaaS all run inside Docker independently of tmux. They survive any host-level disruption. Only the signal filing chain depends on the Claude Code MCP layer.

This is the **last persistence gap** in the ZHC architecture.

---

## 2. PHASE 1: Current State Map

### 2.1 Signal Filing Flow (Exact Path)

**Step 1 — Data assembly (currently in Claude Code reasoning)**

- Claude Code reads recent activity from the Buzz API (`/api/v1/intel/*`, `/api/v1/aria/*`, `/api/v1/scoring/*`)
- Claude Code synthesizes a story (headline, body, sources, tags) — this is where natural-language reasoning lives
- Claude Code calls `mcp__aibtc__news_check_status` to verify wallet state and remaining slots

**Step 2 — Wallet unlock**

- `mcp__aibtc__wallet_unlock` with password from `/data/.env.aibtc` or `/home/claude-code/.env.aibtc`
- The MCP server holds the unlocked WIF in process memory inside the Claude Code session

**Step 3 — MCP tool call**

- `mcp__aibtc__news_file_signal` — passes structured payload to MCP server
- MCP server signs `POST /api/signals:<unix_timestamp>` with BIP-322 simple
- MCP server posts to `https://aibtc.news/api/signals` with three headers:
  - `X-BTC-Address: bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze`
  - `X-BTC-Signature: <base64 BIP-322 sig>`
  - `X-BTC-Timestamp: <unix seconds>`

**Step 4 — Local recording**

- After successful MCP call, signal-tracker (api/services/signals/signal-tracker.js) records to `aibtc_signals_filed` table
- Emits `signal.filed` event to event bus
- PULSE picks this up to satisfy streak protection check

### 2.2 MCP Dependency Analysis

| Component                      | Where it lives                        | Dies if tmux dies? |
| ------------------------------ | ------------------------------------- | ------------------ |
| Claude Code session            | Host tmux                             | YES                |
| MCP server (@aibtc/mcp-server) | Spawned by Claude Code as stdio child | YES                |
| Wallet unlock state            | MCP server process memory             | YES                |
| BIP-322 signing logic          | MCP server                            | YES                |
| AIBTC API endpoint             | aibtc.news (external)                 | NO                 |

**Critical finding:** The MCP layer adds ZERO security (the AIBTC API is publicly callable with BIP-322 sig from anyone holding the WIF). It only adds:

1. Convenience for Claude Code natural language calling
2. Encrypted wallet storage at `~/.aibtc/`
3. Schema validation

**None of these require Claude Code.** Any process with the WIF can sign and post.

### 2.3 Streak Mechanics

- AIBTC streak = consecutive Pacific dates with ≥1 approved signal
- Minimum viable signal: ANY signal that gets approved (1 per day satisfies streak)
- Signal must be on a beat the agent has joined
- Daily cap: 6 filings per day, 30 approved per day (network-wide cap)
- Approval is editorial — quality matters but rejected signals do NOT break streak (a filed-but-rejected signal still counts as filing activity, but only an APPROVED signal extends the streak)

**Current PULSE streak protection** (api/services/pulse/pulse-engine.js:162-185):

```js
if (ctx.hour_utc >= 14 && ctx.hour_utc <= 16) {
  const hasSignalToday =
    ctx.recent_event_types.includes("signal.filed") ||
    ctx.recent_event_types.includes("signal.approved");
  if (!hasSignalToday) {
    if (ctx.hour_utc >= 15) {
      return {
        type: "ACT",
        reason: "STREAK CRITICAL",
        action: "streak-protection",
      };
    }
    // 14:00 = warning, 15:00+ = critical
  }
}
```

PULSE only EMITS streak warnings — it cannot file signals itself today. The fix moves the actual filing capability into the container.

### 2.4 Data Dependencies

| Data source                        | Container-accessible?               | Used in signal?                   |
| ---------------------------------- | ----------------------------------- | --------------------------------- |
| pipeline_tokens (598 tokens)       | YES                                 | YES (token scoring signals)       |
| token_scores (272 entries)         | YES                                 | YES                               |
| shield_stats / drain_patterns (23) | YES                                 | YES (security beat signals)       |
| pulse_state (tick history)         | YES                                 | YES (infrastructure beat signals) |
| dream_log (autoDream cycles)       | YES                                 | YES (infrastructure beat signals) |
| ARIA discoveries                   | YES                                 | YES (token discovery signals)     |
| AIBTC inbox messages               | NO (requires news_check_status MCP) | Optional                          |
| Live Twitter trends                | NO (requires Claude reasoning)      | Optional                          |
| Cross-agent reputation             | YES (via reputation_get_summary)    | Optional                          |

**Conclusion:** The container has access to enough data to file high-quality signals on infrastructure, security, agent-skills, and agent-economy beats WITHOUT Claude Code reasoning. Quality may be lower than human-curated Claude signals, but they will satisfy streak protection.

---

## 3. PHASE 2: Options Mapped

### Option A — Container HTTP Relay (RECOMMENDED)

**Architecture:** Direct HTTPS to AIBTC API from inside the Buzz container using `bip322-js` to sign locally. No MCP, no Claude, no Anthropic.

**Implementation:**

1. Install `bip322-js` package in container
2. Export wallet WIF once (via existing MCP `wallet_export`), store at `/data/.env.aibtc` as `AIBTC_BTC_WIF`
3. New service: `api/services/signals/aibtc-direct-filer.js`
4. New PULSE action: `streak-protection-emergency-file` — calls aibtc-direct-filer when no signal by 15:00 UTC
5. Reuses existing `signal-tracker.js` for event emission and DB recording

**Code complexity:** ~80 lines for the filer + ~20 lines for PULSE wiring

**Auth model:**

- BIP-322 signing of `POST /api/signals:<unix_timestamp>` with WIF from env
- No password unlock needed (raw WIF, not encrypted keystore)
- WIF stored at `/data/.env.aibtc`, chmod 600, gitignored

**Risks:**

- WIF in plaintext on disk (mitigated by chmod 600 + Hetzner FDE + .env.\* in gitignore)
- AIBTC API rate-limit (1 signal/hour, 6/day) — already handled by current logic
- bip322-js library trust — pure JS, audited, used in production by other projects

**Pros:**

- Zero dependency on Claude Code
- Zero LLM cost
- Deterministic, debuggable, testable
- Survives any restart at any layer
- Fastest to ship

**Cons:**

- Container-generated signal content has lower editorial quality than Claude reasoning
- Mitigated by hybrid approach (Option C)

### Option B — Pure MCP Client in Container

**Architecture:** Spawn `@aibtc/mcp-server` as a stdio child inside the Buzz container using `@modelcontextprotocol/sdk` Node client. Call MCP tools directly via JSON-RPC, no LLM.

**Implementation:**

1. Install `@modelcontextprotocol/sdk` and `@aibtc/mcp-server` in container Dockerfile
2. New service: `api/services/signals/mcp-client-filer.js`
3. Mount `~/.aibtc/` as Docker volume for wallet persistence
4. Container calls `wallet_unlock` on startup, holds session, calls `news_file_signal`

**Code complexity:** ~150 lines (more than Option A due to session management)

**Pros:**

- Same code path as current MCP layer (no schema drift)
- Wallet stays in encrypted keystore (no plaintext WIF)
- Future-compatible with new MCP tools

**Cons:**

- More moving parts (MCP child process inside container)
- Requires Dockerfile changes + npm install
- Session reconnect logic if MCP child dies
- More attack surface (MCP server process)

### Option C — Hybrid (RECOMMENDED FINAL ARCHITECTURE)

**Architecture:** Two-tier system

- **Tier 1 (PRIMARY):** Claude Code files quality signals during interactive sessions (current path, unchanged)
- **Tier 2 (BACKUP):** Container files emergency heartbeat signals via Option A when Claude Code is dark for >X hours

**Handoff protocol:**

1. Claude Code emits `signal.filed` event to bus on every successful filing (already wired)
2. PULSE checks event log every tick during 14:00-16:00 UTC window
3. If no `signal.filed` event between 00:00 UTC and 15:00 UTC, PULSE triggers `streak-protection-emergency-file` action
4. The action calls a container-side service (Option A) that files a heartbeat signal
5. Container signal uses real container data (latest scoring run, drain pattern stats, PULSE infrastructure metrics)
6. Heartbeat signal emits its own `signal.filed` event to record success

**Heartbeat signal template (infrastructure beat):**

```
Headline: "Buzz Pipeline Day {N}: {X} tokens scored, {Y} drain patterns active, PULSE tick {Z}"
Body: "Container heartbeat signal from Buzz BD Agent (Ionic Nova). Pipeline stats from the last 24h: {scoring summary}. Shield monitoring {N} drain patterns ({M} active scans). PULSE engine has executed {tick_count} ticks since last restart, current load {pct}%. autoDream last consolidated {records} records on {date}. This signal is filed by the container streak protection layer to maintain editorial continuity when the primary reasoning agent is offline. Quality signals will resume on next session."
Sources: [
  { url: "https://buzzbd.ai/scores", title: "Buzz token leaderboard" },
  { url: "https://github.com/buzzbysolcex/buzz-bd-agent", title: "Buzz BD Agent repo" }
]
Tags: ["agents", "infrastructure", "automation", "monitoring", "buzz"]
```

**Pros of hybrid:**

- Quality preserved when Claude Code is alive (90% of the time)
- Streak ALWAYS protected by container fallback
- Clean handoff via event bus (no race conditions)
- Heartbeat signals are honest infrastructure reports — not spam, not low-effort
- Container heartbeats demonstrate the autonomous architecture (meta-signal value)

**Cons:**

- Slightly more complex than pure container-only
- Requires PULSE engine update + new container service

### Option D — Claude Agent SDK

**Architecture:** Run `@anthropic-ai/claude-agent-sdk` in a Docker container. Spawns a Claude process that handles MCP tool calls.

**Status:** GA, released, working today.

**Pros:**

- Closest to current behavior (Claude reasoning preserved)
- Official Anthropic support
- Future-compatible with all Claude features

**Cons:**

- LLM cost per signal (paid via Anthropic API key, separate from current Claude Code Pro Max subscription)
- Requires API key + billing setup
- Adds Anthropic API dependency
- Heavier than direct HTTP (entire Claude Code subprocess)
- Doesn't solve the underlying gap — still depends on Anthropic infrastructure
- For deterministic schema-known calls (signal filing), it's overkill

---

## 4. PHASE 3: Recommendation

### 4.1 Option Scoring

| Option                           | Complexity (1-10) | Reliability (1-10) | Build time (hrs) | External deps                                | Risk    |
| -------------------------------- | ----------------- | ------------------ | ---------------- | -------------------------------------------- | ------- |
| A — HTTP relay                   | 2                 | 9                  | 4                | bip322-js                                    | Low     |
| B — MCP client in container      | 5                 | 7                  | 12               | @aibtc/mcp-server, @modelcontextprotocol/sdk | Medium  |
| **C — Hybrid (A + Claude Code)** | **3**             | **10**             | **6**            | **bip322-js**                                | **Low** |
| D — Agent SDK                    | 6                 | 8                  | 16               | @anthropic-ai/claude-agent-sdk + API billing | Medium  |

### 4.2 Final Recommendation: **OPTION C — HYBRID**

**Why C beats pure A:**

- Preserves quality signals from Claude Code reasoning when this conversation is alive
- Container handles only the streak emergency case (15:00 UTC backup)
- Best of both worlds: editorial quality + persistence guarantee

**Why C beats B:**

- No need to maintain MCP server inside container
- Lower attack surface
- Same outcome with fewer moving parts

**Why C beats D:**

- No Anthropic API billing
- No dependency on Anthropic infrastructure for streak protection
- Container-side filer is portable to any deployment

### 4.3 Migration Plan

**Phase 1 — Build (Day 1-2):**

1. Export wallet WIF via existing `mcp__aibtc__wallet_export` to `/data/.env.aibtc` (`AIBTC_BTC_WIF=L1...`)
2. Add `bip322-js` to api/package.json
3. Create `api/services/signals/aibtc-direct-filer.js` with `fileSignalDirect()` function
4. Create `api/services/signals/heartbeat-template.js` with `buildHeartbeatSignal()` from container data
5. Add `feature` flag `STREAK_EMERGENCY_FILER=false` (start disabled)

**Phase 2 — Wire (Day 2-3):**

1. Update PULSE engine to call `fileSignalDirect()` when streak-protection action fires
2. Add idempotency: check `aibtc_signals_filed` table before emergency file (no double-fires)
3. Add `signal.filed.emergency` event type to distinguish from quality signals
4. Add unit tests with mocked AIBTC API responses

**Phase 3 — Test (Day 3-4):**

1. Set `STREAK_EMERGENCY_FILER=true`
2. Manually trigger `fileSignalDirect()` via new admin route `POST /api/v1/signals/file-direct`
3. Verify signal lands in AIBTC feed
4. Test rollback: disable flag, confirm Claude Code path still works

**Phase 4 — Parallel run (Day 4-7):**

1. Both Claude Code and container can file signals
2. Monitor for collisions (rate limit, duplicate filings)
3. Refine heartbeat template based on first week of approvals/rejections
4. Tune emergency trigger time (15:00 UTC vs 14:30 UTC vs 15:30 UTC)

**Phase 5 — Production (Day 7+):**

1. Document the dual-path in CLAUDE.md
2. Add to startup audit checklist
3. Monitor weekly: which path filed, approval rate per path
4. If container heartbeats consistently get approved, consider expanding container-side filing capability

### 4.4 What Needs Ogie Approval vs What I Can Wire Autonomously

**Needs Ogie approval:**

1. Exporting the wallet WIF to plaintext on disk (security tradeoff — even though chmod 600 + gitignore)
2. Setting `STREAK_EMERGENCY_FILER=true` (production cutover)
3. The first emergency-filed signal (sanity check before automated runs)
4. Heartbeat template language (editorial tone, what stats to expose publicly)

**Can wire autonomously:**

1. Creating the service files (no production impact while flag is false)
2. Adding `bip322-js` dependency
3. Wiring PULSE event handlers (idempotent, behind flag)
4. Adding the admin route
5. Writing unit tests
6. Documentation

### 4.5 Frontier Timeline

- **Today (Apr 7):** Architecture doc complete, awaiting approval
- **Apr 7-9 (3 days):** Build + wire (Phases 1-2) — flag stays false
- **Apr 9-11 (3 days):** Test + parallel run (Phases 3-4)
- **Apr 11+ (until May 11):** Production hardening + monitoring
- **May 11 (Frontier):** Demo "true ZHC: Buzz files signals 24/7 even if the operator's laptop dies"

This gives us **34 days** of runway between target completion and Frontier — plenty of margin.

---

## 5. Open Questions

1. **WIF export safety:** Is plaintext WIF on Hetzner acceptable, or do we want a sealed-key approach (e.g. age-encrypted file decrypted on startup with a Docker secret)?
2. **Heartbeat editorial quality:** Will AIBTC editors approve container-generated signals consistently? First week of parallel run will tell.
3. **Trigger time:** 15:00 UTC = 7:00 AM Pacific = late at night for many editors. Should we file earlier (e.g. 12:00 UTC) when editor approval velocity is higher?
4. **Future expansion:** Once container can file signals, should it ALSO file quality signals (taking primary role)? Or keep human-curated as primary forever?

---

## 6. References

- AIBTC API docs (machine-readable): https://aibtc.news/llms.txt
- AIBTC News repo: https://github.com/aibtcdev/agent-news
- AIBTC MCP server: https://github.com/aibtcdev/aibtc-mcp-server
- BIP-322 spec: https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki
- bip322-js library: https://github.com/ACken2/bip322-js
- Anthropic Agent SDK (TypeScript): https://github.com/anthropics/claude-agent-sdk-typescript
- MCP client SDK: https://github.com/modelcontextprotocol/typescript-sdk

---

**Bismillah. Awaiting Ogie approval to proceed with Phase 1 build.**

— Buzz BD Agent (Ionic Nova) | Apr 7, 2026 | v9.3
