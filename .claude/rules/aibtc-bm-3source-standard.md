# Rule: AIBTC bitcoin-macro signals — 3-source standard

> Applies when: drafting any AIBTC signal with `beat: bitcoin-macro`.
> Authority: Ogie msg 5089, Apr 27 2026. Permanent. Approved smoke-test reference msg 5088.

---

## THE RULE

Every bitcoin-macro signal MUST pull live data at filing time from all three sources before drafting:

1. **mempool.space** — `/api/v1/difficulty-adjustment`, `/api/v1/mining/pools/24h`, `/api/v1/fees/recommended`
2. **Mining Intel #34** — latest row from `mining_snapshots` table (refreshed every 6h via data-crons cron)
3. **LunarCrush #37** — `mcp__claude_ai_LunarCrush__Topic` query for "bitcoin"

Stale data = automatic rejection. If any source is unreachable at filing time, halt the signal and reroll (skip slot or pivot to quantum).

---

## TEMPLATE STRUCTURE (≤120c headline / 600-1000c body)

```
HEADLINE: <one-sentence hook tying mining and social layers, ≤120c>

BODY:
<one-sentence framing that names the divergence/convergence>.

MINING (Mining Intel #34): <hashrate EH/s>, <retarget % next>, <hashprice $>,
<sentiment idx + label>, <pool velocity stats>, <fee tier sat/vB>.

SOCIAL (LunarCrush #37): <BTC social dominance %>, <sentiment %>,
<top themes split>.

<one paragraph of analysis: divergence/convergence interpretation, historical
pattern callback, near-term thesis>.

For agents: <position bias>, <confirmation trigger>, <risk-management cue>.
```

---

## SOURCES BLOCK (required, append to signal payload)

```
1. mempool.space/api/v1/difficulty-adjustment (live <HH:MM>Z)
2. Buzz Mining Intel #34 — mining_snapshots row id <N> (<HH:MM:SS>Z)
3. lunarcrush.com/topic/bitcoin (LunarCrush #37, <HH:MM>Z)
```

Title each source ≤150c per `reference_aibtc_source_title_cap`.

---

## QS TARGETS

- Cutoff model active: top 10 per beat at 14:00 UTC.
- 3 unique data sources + agentUtility line + novel divergence angle = qs 85+ target.
- File before 13:59 UTC. No exceptions.

---

## PIVOT RULE

If divergence in the prior day's draft has resolved (mining sentiment normalized, or social dominance reverted), pivot the angle — same 3-source structure, new framing (e.g. miner capitulation bottom, social FOMO peak, fee-spike capitulation).

Same template, fresh thesis. Never recycle a stale narrative.

---

## DIFFERENTIATION RULE (Apr 30 2026, Ogie msg 5402)

BM beat is **80% template spam** (mempool/epoch dupes from competitors). Our BM signals MUST stand out:

DO file:

- Mining sentiment divergence (Mining Intel #34 vs LunarCrush social)
- Hashprice / hashrate / pool velocity anomalies tied to social-layer signals
- Fee-tier spikes contextualized with on-chain demand drivers
- Cross-layer (miner ↔ social ↔ derivatives) interpretive angles

DO NOT file:

- Plain mempool.space mempool-size summaries
- Plain difficulty-adjustment recap ("X% retarget in N blocks")
- Plain epoch boundary notes
- Anything that reads like a mempool/epoch dump without divergence framing

Self-check before filing BM: does the headline reference **two layers** (mining + social, mining + derivatives, hashrate + sentiment, etc.)? If not, the draft fails the differentiation test — reroll or skip slot.

Acceptance rate target on BM: improve from ~0.3% baseline by avoiding template-spam class entirely.

---

## REFERENCE

Approved smoke-test (template anchor): War Room msg 5088, Apr 27 13:01Z. Mining sentiment BEARISH (-47) divergence vs LunarCrush BTC social dominance 27.8% (1Y high).

---

_Rule: aibtc-bm-3source-standard | v1.0 | Apr 27 2026 (Ogie msg 5089)_
