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
const QWEN_TIMEOUT_MS = 600000; // 10 min — qwen3:8b on CPX62 CPU runs ~1.4 t/s, 600 tokens ≈ 7-8 min

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
  return `You are an AIBTC News signal writer for the "${beat}" beat. Write a single signal as STRICT JSON. No markdown, no prose outside JSON, no fences.

CURRENT UTC TIME: ${nowIso}

REQUIRED FIELDS:

"headline": string, EXACTLY 80-120 characters. NOT shorter than 80, NOT longer than 120.
  FORMAT: "Block/Entity + Action Verb + Specific Number + EM-DASH + Concrete Downstream Effect"
  GOOD EXAMPLE (110c): "Block 947200 Locks -2.71% Difficulty Drop at 79% Epoch — sBTC Carry Desks Lose May 2 Cost Floor"
  GOOD EXAMPLE (95c): "BIP-360 PR #2102 Test Vectors Land at 14:30Z — P2QRH Three-Leaf MAST Path Closes Pre-Ratification"
  BAD (40c, too short, no implication): "Difficulty Drops 2.71% Ahead of Retarget"
  BAD (vague): "Bitcoin difficulty continues to adjust downward"

"body": string, 600-900 characters total. Data-driven. Cite SPECIFIC numbers from the live data below.
  TIMELINESS — CRITICAL: You MUST cite events from the LAST 6 HOURS using exact timestamps from the live data.
  Signals citing events older than 24 hours score timeliness=8 instead of 15. That -7 point gap is the difference
  between brief inclusion (175k sats) and rejection (0 sats). Reference specific block numbers, "as of [timestamp]" markers,
  PR numbers with their exact updated_at timestamps, and difficulty/mempool snapshot times.
  END the body with EXACTLY this format: "For agents: <one actionable line>" — REQUIRED for the agentUtility scoring dimension (+10 points).

"sources": array of 2-3 verifiable URLs. Use the URLs visible in the live data. Do not fabricate.

RESEARCH ANGLE:
${hook}

LIVE DATA (use these exact numbers and timestamps — do NOT invent values, do NOT round, copy them verbatim):
${JSON.stringify(liveData, null, 2)}

OUTPUT — only this JSON shape, no extra keys, no commentary:
{"headline": "...", "body": "...", "sources": ["https://...", "https://..."]}`;
}

async function generateRealBody(beat, hook, slotNumber) {
  let liveData = {};
  if (beat === "bitcoin-macro") liveData = await fetchBmLiveData();
  else if (beat === "quantum") liveData = await fetchQuantumLiveData();
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
  // Reject sub-80c headlines — they fail the brief-floor pattern (winners
  // average 80-110c per Apr 27 forensic analysis, qs=93+ floor).
  if (parsed.headline.length < 80) {
    console.warn(
      `[phase-a] slot ${slotNumber} ${beat} headline too short: ${parsed.headline.length}c (need ≥80)`,
    );
    return null;
  }
  if (parsed.body.length < 600) {
    console.warn(
      `[phase-a] slot ${slotNumber} ${beat} body too short: ${parsed.body.length}c (need ≥600)`,
    );
    return null;
  }
  // Enforce "For agents:" line — agentUtility scoring dimension (+10
  // points). qwen3 sometimes drops it; append if missing.
  if (!parsed.body.includes("For agents:")) {
    const closer =
      beat === "bitcoin-macro"
        ? "\n\nFor agents: track this snapshot against the next 6h delta; pre-FOMC volatility shifts mempool fee floors and miner economics together."
        : "\n\nFor agents: track BIP-360 PR cadence + arxiv same-day quantum drops as composite migration-clock signal; <24h staleness costs 7 qs points.";
    if (parsed.body.length + closer.length <= 1000) {
      parsed.body = parsed.body + closer;
    }
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
  parseQwen3Json,
  callQwen3,
};
