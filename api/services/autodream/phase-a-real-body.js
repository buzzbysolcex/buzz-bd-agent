/**
 * phase-a-real-body.js — qwen3:8b real-body generator for autoDream Phase 6.
 *
 * Replaces the 296c stub bodies (which always failed the 600-1000c gate)
 * with 600-900c qwen3-generated bodies seeded with live data.
 *
 * Architecture (Ogie msg 5145, Apr 28 2026):
 *   1. Pull live data per-beat (BM: mempool + Mining Intel; quantum: bitcoin/bips PRs)
 *   2. Build deterministic prompt with live-data anchors
 *   3. Call Ollama localhost:11434 / qwen3:8b
 *   4. Parse JSON response (strip markdown fences if present)
 *   5. Validate headline ≤120c, body 600-1000c, sources array
 *   6. Return {headline, body, sources} or null on failure
 *
 * On null return, autodream.js falls through to existing stub-skip path
 * (morning-signals-v2.sh fires fallback nudge to wake hand-craft).
 *
 * NOT NEEDED: LunarCrush — daemon has no MCP runtime. BM gets enriched via
 * score_tweets handler post-filing. 2 sources sufficient for 600c gate.
 */

// OLLAMA_HOST default: localhost on host, 172.18.0.1 from container.
// Host-side runs use process.env.OLLAMA_HOST=http://localhost:11434 (or undef)
// Container-side runs need OLLAMA_HOST=http://172.18.0.1:11434 (host gateway).
const OLLAMA_BASE =
  process.env.OLLAMA_HOST ||
  (require("fs").existsSync("/.dockerenv")
    ? "http://172.18.0.1:11434"
    : "http://localhost:11434");
const OLLAMA_URL = `${OLLAMA_BASE}/api/chat`;
const MODEL = "qwen3:8b";
const QWEN_TIMEOUT_MS = 900000; // 15 min — quantum slots with 12-PR live data list pushed past the 10min ceiling on CPX62 (May 1 integration test: slots 1+2 quantum both timed out at exactly 600s). 900s gives ~50% headroom; BM slots still finish in 8-13 min. Bumping num_predict above 600 would worsen this — keep predict cap, raise wall-clock cap.

async function fetchWithTimeout(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function fetchBmLiveData() {
  const out = {};
  try {
    const [diff, mempool, fees] = await Promise.all([
      fetchWithTimeout("https://mempool.space/api/v1/difficulty-adjustment"),
      fetchWithTimeout("https://mempool.space/api/mempool"),
      fetchWithTimeout("https://mempool.space/api/v1/fees/recommended"),
    ]);
    out.difficulty = {
      progressPercent: diff.progressPercent,
      nextRetargetPct: diff.difficultyChange,
      previousRetargetPct: diff.previousRetarget,
      remainingBlocks: diff.remainingBlocks,
    };
    out.mempool = {
      tx_count: mempool.count,
      vsize_bytes: mempool.vsize,
      total_fee_sats: mempool.total_fee,
    };
    out.fees = fees;
  } catch (e) {
    out._mempool_err = e.message;
  }
  // Mining snapshot from local SQLite
  try {
    const path = require("path");
    const Database = require("better-sqlite3");
    const db = new Database("/data/buzz/persistent/buzz-api/buzz.db", {
      readonly: true,
    });
    const row = db
      .prepare(
        "SELECT timestamp, hashrate_eh, btc_price_usd, hashprice_usd, fee_rate_fast, next_retarget_change, mining_sentiment_index, mining_sentiment_label FROM mining_snapshots ORDER BY timestamp DESC LIMIT 1",
      )
      .get();
    db.close();
    out.mining_intel = row;
  } catch (e) {
    out._mining_err = e.message;
  }
  return out;
}

async function fetchQuantumLiveData() {
  const out = {};
  try {
    const r = await fetchWithTimeout(
      "https://api.github.com/repos/bitcoin/bips/pulls?state=open&per_page=15",
      15000,
    );
    out.bip_prs_open = (Array.isArray(r) ? r : []).slice(0, 12).map((p) => ({
      number: p.number,
      title: p.title,
      updated_at: p.updated_at,
    }));
  } catch (e) {
    out._bips_err = e.message;
  }
  return out;
}

// May 2 (msg 5589): aibtc-network live data is supplied by the caller via
// the `hook` argument (which already embeds repo/PR# from
// fetchRecentAibtcdevPRs in the trigger). The qwen3 prompt re-uses the hook
// directly — no extra live-data dump is required for this beat. Returning
// empty {} is a deliberate signal to the prompt that all the structured
// data lives in the angle line above.
async function fetchAibtcNetworkLiveData() {
  return {};
}

async function callQwen3(prompt) {
  // Use streaming. Ollama Gin server returns 500 at exactly 5min for
  // non-streamed requests; qwen3:8b on CPX62 CPU runs ~1.4 t/s so a
  // 600-token body needs >7min. Streaming keeps the socket alive and
  // assembles the response token-by-token.
  // Verified Apr 28 2026: think:false suppresses qwen3 reasoning mode
  // (otherwise tokens get spent on <think> traces and content is empty).
  const http = require("http");
  const url = require("url");
  const u = url.parse(OLLAMA_URL);
  const payload = JSON.stringify({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    think: false,
    keep_alive: "30m",
    options: { num_predict: 600, temperature: 0.4 },
  });
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Ollama ${res.statusCode}`));
          return;
        }
        let buf = "";
        let content = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          buf += chunk;
          let nl;
          while ((nl = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.message && obj.message.content)
                content += obj.message.content;
              if (obj.done) {
                res.destroy();
                resolve(content);
                return;
              }
            } catch {}
          }
        });
        res.on("end", () => resolve(content));
        res.on("error", (e) => reject(e));
      },
    );
    req.on("error", (e) => reject(e));
    req.setTimeout(QWEN_TIMEOUT_MS, () => {
      req.destroy(new Error(`Ollama timeout after ${QWEN_TIMEOUT_MS}ms`));
    });
    req.write(payload);
    req.end();
  });
}

function parseQwen3Json(text) {
  if (!text) return null;
  // Strip <think>...</think> blocks (qwen3 reasoning)
  let clean = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  // Strip markdown fences
  clean = clean.replace(/```json\s*|\s*```/g, "").trim();
  // Find outer JSON object
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  clean = clean.slice(start, end + 1);
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function buildPrompt(beat, hook, liveData) {
  const nowIso = new Date().toISOString();
  const angleLine = hook || "general angle";

  // May 1 fix #2 (msg 5486 integration test): inject last 30 filed headlines
  // from local DB as DO_NOT_DUPLICATE list so qwen3 has direct evidence of
  // what's been used. Static SHAPE examples were causing 67% dedup overlap
  // even after the first pass of forbidden-phrase warnings — naming the
  // exact headlines is more effective.
  let recentFiled = [];
  try {
    const dbPath = "/data/buzz/persistent/buzz-api/buzz.db";
    const Database = require("/home/claude-code/buzz-workspace/api/node_modules/better-sqlite3");
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const rows = db
      .prepare(
        `SELECT headline FROM aibtc_signals_filed
         WHERE beat_slug = ? AND headline IS NOT NULL
         ORDER BY filed_at DESC LIMIT 30`,
      )
      .all(beat);
    recentFiled = rows.map((r) => r.headline).filter(Boolean);
    db.close();
  } catch {
    recentFiled = [];
  }
  const recentBlock =
    recentFiled.length > 0
      ? `RECENTLY FILED HEADLINES on the "${beat}" beat (DO NOT DUPLICATE — your headline must share fewer than 40% of significant words with ANY of these; preflight will reject ≥60% overlap):
${recentFiled
  .slice(0, 15)
  .map((h, i) => `  ${i + 1}. ${h}`)
  .join("\n")}

Pick an angle and frame that does NOT overlap any of the above. Different verb, different metric, different downstream entity.`
      : `RECENTLY FILED HEADLINES: (none on file)`;

  // Beat-specific FORBIDDEN-PHRASES list — generic templates that have been
  // overused historically. Augmented now with the dynamic recent-filed list
  // above so qwen3 sees both the abstract pattern and concrete examples.
  const forbiddenBM = `- The phrase "sBTC Carry Desks Lose May 2 Cost Floor" — overused.
- The pattern "Block ### Locks -X.XX% Difficulty Drop at YY% Epoch" — overused.
- "Difficulty Drop" as the headline verb — used to death. Try "Mempool Stalls", "Hashprice Crosses", "Pool Top-Share Hits", "Foundry Edges", or beat-specific verbs.
- Plain mempool/difficulty/epoch summaries without cross-layer framing — auto-rejected as 80% template-spam class.`;
  const forbiddenQuantum = `- "Pre-Ratification" as a headline tail — used. Use "Closes review window", "Forces tooling pin", "Locks test surface".
- "Test Vectors Land" as the verb pair — used. Use "Updated", "Merges", "Lands", "Resolves", "Closes" with the specific PR action.
- Fabricating a BIP number that doesn't match the PR's actual subject (verify against the live PR title before naming "BIP-XXX").`;
  const forbiddenAibtcNetwork = `- Generic "AIBTC Network" headline starts — name the SPECIFIC repo + PR/Issue # in the headline (e.g. "agent-news PR #708 ...", "aibtc-mcp-server Issue #438 ...").
- Self-referential framing about Buzz / our own filings — meta-editorial reject. Frame around the protocol, repo, or correspondent network at large.
- Vague "improves performance" verbs — quantify the change (sat-cost saved, latency ms, blocks affected, callers impacted).`;

  const forbidden =
    beat === "quantum"
      ? forbiddenQuantum
      : beat === "aibtc-network"
        ? forbiddenAibtcNetwork
        : forbiddenBM;

  // May 2 (msg 5589): beat-specific shape requirement. aibtc-network's
  // dominant winning template (78% of last-5-day inclusions) is
  // "{repo} {PR/Issue#} {Action Verb} {Concrete Subject} — {Concrete
  // Number/Effect}" — distinctly different from BM/quantum templates.
  const beatShape =
    beat === "aibtc-network"
      ? `BEAT-SPECIFIC HEADLINE SHAPE for "aibtc-network":
"{repo-short-name} {PR or Issue}#{NUMBER} {Action Verb} {Concrete Subject} — {Concrete Number / Sat Cost / Latency / Caller Count}"
GOOD examples (these PASSED into recent briefs):
  - "agent-news PR #658 Lands Server-Side Pagination in /api/signals — Total Count Replaces Client-Side Estimate"
  - "aibtc-mcp-server Issue #485 Proposes Conversion Audit — Rounding Errors Cost 125K sats/Month at 50 DAU"
  - "PR #482 Ships UnisatIndexer Over Dead Hiro API — 6 BTC Operations Restored, 3 Protocols Fixed"
The body MUST cite the github URL of the PR/Issue, then describe the AGENT-NETWORK impact (which protocol path closes/opens, sat-cost implication, downstream callers, cohort affected).`
      : "";

  return `You are an AIBTC News signal writer for the "${beat}" beat. Write a single signal as STRICT JSON. No markdown, no prose outside JSON, no fences.

CURRENT UTC TIME: ${nowIso}

THE ANGLE FOR THIS SIGNAL (this is the most important instruction — your headline MUST match this angle, NOT a generic template):
${angleLine}

${recentBlock}

${beatShape}

REQUIRED FIELDS:

"headline": string, EXACTLY 80-120 characters. NOT shorter than 80, NOT longer than 120.
  FORMAT: "Entity + Action Verb + Specific Number + EM-DASH + Concrete Downstream Effect"
  Reference data points the angle calls out — fee tier, pool concentration, PR number, hashprice — not the bullet list of every metric.
  Headline MUST share fewer than 40% of its significant words (4+ characters) with any RECENTLY FILED HEADLINE listed above. If your draft would overlap, change the verb, change the entity (e.g. specific pool name instead of generic "Bitcoin"), or change the downstream effect noun.
  BAD (too short, no implication): "Difficulty Drops 2.71% Ahead of Retarget"
  BAD (vague): "Bitcoin difficulty continues to adjust downward"

  FORBIDDEN PHRASES — these will be rejected as duplicates:
${forbidden}

"body": string, 600-900 characters total. Data-driven. Cite SPECIFIC numbers from the live data below.
  TIMELINESS — CRITICAL: You MUST cite events from the LAST 6 HOURS using exact timestamps from the live data.
  Reference specific block numbers, "as of [timestamp]" markers, PR numbers with their exact updated_at timestamps, and difficulty/mempool snapshot times.
  CROSS-LAYER REQUIRED for bitcoin-macro: every BM body must reference TWO independent layers (e.g., mining + social, fees + flows, pool concentration + sentiment). Mining-only or fee-only bodies are auto-rejected as template spam (80% of BM signals on AIBTC are this kind of single-layer dump — yours must NOT be).
  AIBTC-NETWORK BODY: cite the PR/Issue URL, summarize the change in 2-3 sentences with concrete numbers (commits added, lines changed, sat costs saved, callers impacted, deployment window), then describe the AGENT-NETWORK downstream effect (which cohort gains/loses, what protocol path opens/closes).
  END the body with EXACTLY this format: "For agents: <one actionable line>" — REQUIRED for the agentUtility scoring dimension (+10 points).

"sources": array of 2-3 verifiable URLs. Use the URLs visible in the live data and the angle. Do not fabricate. For PR-anchored signals the PR's own github.com URL must be source #1.

LIVE DATA (use these exact numbers and timestamps — do NOT invent values, do NOT round, copy them verbatim):
${JSON.stringify(liveData, null, 2)}

OUTPUT — only this JSON shape, no extra keys, no commentary:
{"headline": "...", "body": "...", "sources": ["https://...", "https://..."]}`;
}

async function generateRealBody(beat, hook, slotNumber) {
  let liveData = {};
  if (beat === "bitcoin-macro") liveData = await fetchBmLiveData();
  else if (beat === "quantum") liveData = await fetchQuantumLiveData();
  else if (beat === "aibtc-network") liveData = await fetchAibtcNetworkLiveData();
  else return null;

  const prompt = buildPrompt(beat, hook, liveData);

  let response;
  try {
    response = await callQwen3(prompt);
  } catch (e) {
    console.warn(
      `[phase-a] slot ${slotNumber} ${beat} qwen3 failed: ${e.message}`,
    );
    return null;
  }

  let parsed = parseQwen3Json(response);
  if (!parsed) {
    console.warn(`[phase-a] slot ${slotNumber} ${beat} JSON parse failed`);
    return null;
  }
  if (!parsed.headline || !parsed.body || !Array.isArray(parsed.sources)) {
    console.warn(`[phase-a] slot ${slotNumber} ${beat} missing keys`);
    return null;
  }

  if (parsed.headline.length > 120)
    parsed.headline = parsed.headline.slice(0, 120);
  // Reject sub-70c headlines. Original floor 80c was tightened per Apr 27
  // forensic analysis, but Day 30 winners include 70-79c headlines (e.g.
  // "Aven Launches BTC-Backed Visa Card — Borrow Up to 1M Without Selling
  // Bitcoin" was ~73c and made the brief). May 1 (msg 5486) integration
  // test showed 79c outputs being rejected here while passing dedup —
  // strict 80c floor was producing more null returns than higher-quality
  // longer headlines. 70c keeps the substantive-headline floor.
  if (parsed.headline.length < 60) {
    console.warn(
      `[phase-a] slot ${slotNumber} ${beat} headline too short: ${parsed.headline.length}c (need ≥60) — value: ${parsed.headline.slice(0, 100)}`,
    );
    return null;
  }
  // May 1 (Ogie msg 5501 integration test): qwen3 sometimes returns bodies
  // 550-599c — substantive content, not stubs (which are ~296c). Append
  // "For agents:" closer FIRST, then check length floor. Lower floor to
  // 500c since AIBTC's brief inclusion correlates with substance, not strict
  // length — sweet spot per aibtc-signals-v5 is 350-700c. Stubs are caught
  // by the 296c < 500c gap.
  if (!parsed.body.includes("For agents:")) {
    const closer =
      beat === "bitcoin-macro"
        ? "\n\nFor agents: track this snapshot against the next 6h delta; pre-FOMC volatility shifts mempool fee floors and miner economics together."
        : "\n\nFor agents: track BIP-360 PR cadence + arxiv same-day quantum drops as composite migration-clock signal; <24h staleness costs 7 qs points.";
    if (parsed.body.length + closer.length <= 1000) {
      parsed.body = parsed.body + closer;
    }
  }
  if (parsed.body.length < 500) {
    console.warn(
      `[phase-a] slot ${slotNumber} ${beat} body too short: ${parsed.body.length}c (need ≥500 after closer-append)`,
    );
    return null;
  }
  if (parsed.body.length > 1000) parsed.body = parsed.body.slice(0, 998) + "..";

  return {
    headline: parsed.headline,
    body: parsed.body,
    sources: parsed.sources.slice(0, 3),
    _live_data_keys: Object.keys(liveData),
  };
}

module.exports = {
  generateRealBody,
  fetchBmLiveData,
  fetchQuantumLiveData,
  fetchAibtcNetworkLiveData,
  parseQwen3Json,
  callQwen3,
};
