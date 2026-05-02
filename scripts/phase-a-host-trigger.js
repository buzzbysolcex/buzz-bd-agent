#!/usr/bin/env node
/**
 * phase-a-host-trigger.js — host-side Phase 6 + Phase A draft generator.
 *
 * Replaces the broken container-side autoDream Phase 6 (which has been
 * writing 0 drafts every morning for 7+ days due to 296c stub bodies
 * failing the 600c gate). Runs from host where Ollama is reachable on
 * 127.0.0.1:11434 and the workspace has better-sqlite3 installed.
 *
 * Cron: 0 2 * * * /home/claude-code/buzz-workspace/scripts/phase-a-host-trigger.js
 *
 * Output: 5 fileable JSON drafts at
 *   /data/buzz/persistent/buzz-api/signal-drafts/${date}-${beat}-${slot}.json
 *
 * morning-signals-v2.sh slot N picks up ${date}-*-${N}.json and BIP-322
 * files via aibtc-direct-filer. No fallback nudge needed when Phase A
 * succeeds.
 *
 * Run modes:
 *   node phase-a-host-trigger.js              # run all 5 slots, write drafts
 *   node phase-a-host-trigger.js --dry-run    # generate but don't write
 *   node phase-a-host-trigger.js --slot 3     # single slot test
 */

const fs = require("fs");
const path = require("path");
const phaseA = require("../api/services/autodream/phase-a-real-body");

const DRAFT_DIR = "/data/buzz/persistent/buzz-api/signal-drafts";
const LOG_PATH = "/data/buzz/persistent/buzz-api/phase-a.log";

// SLOT_BEATS mirrors api/services/autodream/autodream.js — keep in sync if
// the canonical sequence changes. v4.0 mix (Apr 25 inclusion-timing pivot):
// 2 quantum + 3 BM, slots 1-5.
const SLOT_BEATS = [
  "quantum",
  "quantum",
  "bitcoin-macro",
  "bitcoin-macro",
  "bitcoin-macro",
];

// Static fallback labels — used only if the live fetch returns nothing.
// Live data anchors take precedence (see fetchLiveAnchors below).
const BM_FALLBACK_ANGLES = [
  "fee market: sat/vB tiers vs mempool depth",
  "pool concentration: top-3 share vs hashrate decline",
  "difficulty/hashrate: retarget % vs miner sentiment",
];
const QUANTUM_FALLBACK_ANGLES = [
  "NIST PQC milestone, BIP-360 draft update, or Shor/Grover academic result",
  "ECDSA exposure counter on live Stacks blocks, sBTC quantum-risk pairing",
];

// May 1 fix (Ogie msg 5478): the ORIGINAL static angles produced
// duplicate signals two nights running (verified May 1 04:02Z + 05:04Z
// PREFLIGHT_FAIL with 100% overlap on "Block 947200 -3.30% Difficulty
// Drop at 79% Epoch"). qwen3 sees the same hook → produces same
// headline. Fix: stamp today's specific live data points into the
// hook so qwen3 has different anchors each night.
const FETCH_TIMEOUT_MS = 8000;

async function fetchRecentQuantumPRs(slotsNeeded = 2) {
  const cap = (s) => String(s || "").slice(0, 200);
  try {
    const r = await fetch(
      "https://api.github.com/repos/bitcoin/bips/pulls?state=all&sort=updated&direction=desc&per_page=20",
      {
        headers: {
          "User-Agent": "buzz-phase-a",
          Accept: "application/vnd.github+json",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!r.ok) return [];
    let prs = await r.json();
    if (!Array.isArray(prs)) return [];

    // May 1 (Ogie msg 5501 integration test): keep only quantum-relevant
    // BIPs in candidate pool. bitcoin/bips also touches non-quantum topics
    // (mnemonic encoding, fee estimation, etc.); filing about those under
    // the quantum beat scores beatRelevance=0. Whitelist by keyword.
    const QUANTUM_KEYWORDS =
      /\b(bip[\s-]*(36[01]|451)|p2qrh|p2mr|p2qr|post[\s-]*quantum|quantum|pqc|fips[\s-]*20[34]|lamport|winternitz|ml[\s-]*(dsa|kem)|sphincs|kyber|dilithium|shor|grover|qrng|qkd|ecdlp|secp256k1.{0,40}quantum|schnorr.{0,40}quantum)\b/i;
    prs = prs.filter((p) => QUANTUM_KEYWORDS.test(p.title || ""));

    // exclude PRs already covered in last 30 quantum headlines. Slot 1
    // retest produced "BIP451 PR #2150 Closes 5 Commits…" which dedup-
    // overlapped 70% with Day 30's already filed signal. Same PR = same
    // dedup hit. Filter the candidate list before slot assignment.
    try {
      const Database = require("/home/claude-code/buzz-workspace/api/node_modules/better-sqlite3");
      const db = new Database("/data/buzz/persistent/buzz-api/buzz.db", {
        readonly: true,
        fileMustExist: true,
      });
      const recent = db
        .prepare(
          `SELECT headline FROM aibtc_signals_filed
           WHERE beat_slug='quantum' AND headline IS NOT NULL
           ORDER BY filed_at DESC LIMIT 30`,
        )
        .all()
        .map((r) => r.headline);
      db.close();
      const coveredPRs = new Set();
      for (const h of recent) {
        const m = h.match(/(?:PR\s*#?|#)(\d{3,5})/gi) || [];
        for (const tok of m) {
          const num = (tok.match(/\d+/) || [])[0];
          if (num) coveredPRs.add(num);
        }
      }
      if (coveredPRs.size > 0) {
        prs = prs.filter((p) => !coveredPRs.has(String(p.number)));
      }
    } catch {
      // best-effort — if DB read fails, fall through with unfiltered list
    }

    // May 1 (Ogie msg 5497 fix #3 + msg 5501 integration test): 6h cutoff
    // for freshness with cascading fallbacks. After PR exclusion above,
    // fresh-6h pool may be empty (today's filed signals cover all recent
    // PRs). Fall through 6h → 24h → 7d, picking the earliest tier that
    // satisfies slotsNeeded. Caller still gets `updated_at` field so it
    // can warn/lower expectations when staleness >24h.
    const cutoffMs6h = Date.now() - 6 * 60 * 60 * 1000;
    const cutoffMs24h = Date.now() - 24 * 60 * 60 * 1000;
    const cutoffMs14d = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const fresh6h = prs.filter((p) => {
      const t = p.updated_at ? new Date(p.updated_at).getTime() : 0;
      return t >= cutoffMs6h;
    });
    const fresh24h = prs.filter((p) => {
      const t = p.updated_at ? new Date(p.updated_at).getTime() : 0;
      return t >= cutoffMs24h;
    });
    const fresh14d = prs.filter((p) => {
      const t = p.updated_at ? new Date(p.updated_at).getTime() : 0;
      return t >= cutoffMs14d;
    });
    let useList;
    if (fresh6h.length >= slotsNeeded) useList = fresh6h;
    else if (fresh24h.length >= slotsNeeded) useList = fresh24h;
    else if (fresh14d.length > 0) useList = fresh14d;
    else useList = prs;
    return useList.slice(0, slotsNeeded).map((pr) => ({
      number: pr.number,
      title: cap(pr.title || ""),
      url: pr.html_url,
      state: pr.state,
      merged: !!pr.merged_at,
      updated_at: pr.updated_at,
    }));
  } catch (e) {
    return [];
  }
}

async function fetchRecentBMData() {
  try {
    const [diff, fees, mempool, blocks, pools] = await Promise.allSettled([
      fetch("https://mempool.space/api/v1/difficulty-adjustment", {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("https://mempool.space/api/v1/fees/recommended", {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("https://mempool.space/api/mempool", {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("https://mempool.space/api/v1/blocks", {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("https://mempool.space/api/v1/mining/pools/24h", {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }).then((r) => (r.ok ? r.json() : null)),
    ]);
    const out = {};
    if (diff.status === "fulfilled" && diff.value) {
      const d = diff.value;
      out.difficulty = {
        progressPercent: Number(d.progressPercent || 0).toFixed(2),
        difficultyChange: Number(d.difficultyChange || 0).toFixed(2),
        remainingBlocks: d.remainingBlocks,
      };
    }
    if (fees.status === "fulfilled" && fees.value) {
      out.fees = {
        fastest: fees.value.fastestFee,
        halfHour: fees.value.halfHourFee,
        hour: fees.value.hourFee,
        economy: fees.value.economyFee,
        minimum: fees.value.minimumFee,
      };
    }
    if (mempool.status === "fulfilled" && mempool.value) {
      out.mempool = {
        unconfirmed: mempool.value.count,
        vsize_mb: Number(((mempool.value.vsize || 0) / 1_000_000).toFixed(1)),
      };
    }
    if (blocks.status === "fulfilled" && Array.isArray(blocks.value)) {
      out.tip_height = blocks.value[0]?.height;
    }
    if (pools.status === "fulfilled" && pools.value) {
      const p = pools.value.pools || [];
      const total = p.reduce((s, x) => s + (x.blockCount || 0), 0) || 1;
      out.pools_24h = {
        total_blocks: total,
        top: p.slice(0, 3).map((x) => ({
          name: x.name,
          blocks: x.blockCount,
          pct: Number(((100 * x.blockCount) / total).toFixed(1)),
        })),
      };
    }
    return out;
  } catch (e) {
    return null;
  }
}

function buildLiveBmHook(bmLive, subAngle, slot) {
  if (!bmLive) return null;
  if (subAngle === 0 && bmLive.fees) {
    const f = bmLive.fees;
    return `slot ${slot} angle: fee market — fees ${f.fastest}/${f.halfHour}/${f.hour}/${f.economy}/${f.minimum} sat/vB; mempool ${bmLive.mempool?.unconfirmed ?? "?"} txs / ${bmLive.mempool?.vsize_mb ?? "?"} MB; tip block #${bmLive.tip_height ?? "?"}. Cross-layer: fee tier vs demand-side queue depth or vs LN flows.`;
  }
  if (subAngle === 1 && bmLive.pools_24h) {
    const t = bmLive.pools_24h.top || [];
    const t1 = t[0],
      t2 = t[1],
      t3 = t[2];
    return `slot ${slot} angle: pool concentration — ${bmLive.pools_24h.total_blocks} blocks 24h: ${t1?.name} ${t1?.blocks}(${t1?.pct}%), ${t2?.name} ${t2?.blocks}(${t2?.pct}%), ${t3?.name} ${t3?.blocks}(${t3?.pct}%). Cross-layer: pool concentration vs hashrate change vs sentiment index.`;
  }
  if (bmLive.difficulty) {
    const d = bmLive.difficulty;
    return `slot ${slot} angle: difficulty/hashrate — next retarget ${d.difficultyChange}% in ${d.remainingBlocks} blocks (${d.progressPercent}% epoch); tip block #${bmLive.tip_height ?? "?"}. Cross-layer: difficulty change vs hashprice vs miner sentiment.`;
  }
  return null;
}

function buildLiveQuantumHook(pr, slot) {
  if (!pr) return null;
  const stateTag = pr.merged ? "merged" : pr.state;
  return `slot ${slot} angle: bitcoin/bips PR #${pr.number} (${stateTag}, updated ${(pr.updated_at || "").slice(0, 10)}): ${pr.title}. Pull live discussion + diff from ${pr.url}; frame quantum/PQ implication of the change. Cite PR URL plus at least one NIST/IETF/arxiv/eprint.iacr.org corroborating source.`;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const slotArg = args.indexOf("--slot");
const onlySlot = slotArg !== -1 ? parseInt(args[slotArg + 1], 10) : null;

function log(line) {
  try {
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${line}\n`);
  } catch {}
  console.log(line);
}

async function generateSlot(slotNumber, beat, hookAngle) {
  const hook = `Research prompt for morning rewrite (slot ${slotNumber}, angle: ${hookAngle}): prefer concrete numeric deltas over narrative. Sources must be primary chain-data APIs, GitHub URLs, or arxiv/IACR.`;

  log(`[slot ${slotNumber} ${beat}] generating real body via qwen3...`);
  const t0 = Date.now();
  const real = await phaseA.generateRealBody(beat, hook, slotNumber);
  const dt = Math.round((Date.now() - t0) / 1000);

  if (!real) {
    log(
      `[slot ${slotNumber} ${beat}] ❌ generateRealBody returned null (${dt}s)`,
    );
    return {
      slot: slotNumber,
      beat,
      ok: false,
      reason: "qwen3-null",
      elapsed_s: dt,
    };
  }

  // Build payload matching aibtc-direct-filer schema
  const payload = {
    beat_slug: beat,
    headline: real.headline,
    body: real.body,
    sources: real.sources.map((url) => ({
      title: typeof url === "string" ? url.slice(0, 150) : "phase-a source",
      url: typeof url === "string" ? url : "",
    })),
    tags: [beat, "phase-a"],
    disclosure:
      "Draft body generated by qwen3:8b (Phase A host-side) at 02:00 UTC. Live data: mempool.space, Mining Intel #34, GitHub bitcoin/bips. Direct filing via bip322-js.",
    generated_at: new Date().toISOString(),
    generated_by: "phase-a-qwen3-host",
    filed: false,
    draft_index: slotNumber,
    elapsed_s: dt,
  };

  // Filename pattern morning-signals-v2.sh expects: ${date}-${beat}-${slot}.json.
  // Date derivation: if it's currently >= 22:00 UTC, use TOMORROW's date so
  // drafts are ready for the 00:02Z slot 1 cron (host trigger runs at 23:55Z
  // by cron — Day 29 lesson: 01:55Z is too late, slots 1+2 already fired).
  const now = new Date();
  const dayOffset = now.getUTCHours() >= 22 ? 1 : 0;
  const targetDay = new Date(now.getTime() + dayOffset * 86400000);
  const today = targetDay.toISOString().slice(0, 10);
  const filename = `${today}-${beat}-${slotNumber}.json`;
  const fpath = path.join(DRAFT_DIR, filename);

  if (dryRun) {
    log(
      `[slot ${slotNumber} ${beat}] DRY RUN — would write ${fpath} (body=${real.body.length}c, headline=${real.headline.length}c, ${dt}s)`,
    );
    return {
      slot: slotNumber,
      beat,
      ok: true,
      body_len: real.body.length,
      elapsed_s: dt,
      dry_run: true,
    };
  }

  if (!fs.existsSync(DRAFT_DIR)) {
    fs.mkdirSync(DRAFT_DIR, { recursive: true });
  }
  fs.writeFileSync(fpath, JSON.stringify(payload, null, 2));
  log(
    `[slot ${slotNumber} ${beat}] ✅ wrote ${filename} (body=${real.body.length}c, headline=${real.headline.length}c, ${dt}s)`,
  );
  return {
    slot: slotNumber,
    beat,
    ok: true,
    body_len: real.body.length,
    headline_len: real.headline.length,
    elapsed_s: dt,
    filename,
  };
}

async function ollamaHealthCheck() {
  // May 1 (Ogie msg 5501 integration test): runner can degrade silently
  // — /api/ps responds fine, but /api/generate hangs even on tiny prompts
  // when prior canceled requests left context state corrupted. Pre-flight
  // a minimal generate; if it times out, kill the runner so `ollama serve`
  // spawns a fresh one before any slot starts.
  const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://localhost:11434";
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "qwen3:8b",
        prompt: "reply with: ok",
        stream: false,
        think: false,
        options: { num_predict: 5 },
      }),
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const dt = Math.round((Date.now() - t0) / 1000);
    log(
      `ollama health: ok (${dt}s, response="${(j.response || "").slice(0, 20)}")`,
    );
    return true;
  } catch (e) {
    const dt = Math.round((Date.now() - t0) / 1000);
    log(`ollama health: FAILED (${dt}s) — ${e.message}. Restarting runner.`);
    // Kill the runner process; `ollama serve` will spawn a fresh one on the
    // next request. pkill returns exit 1 when no match — wrap in try so a
    // benign non-match doesn't fail the whole pre-flight.
    const { execSync } = require("child_process");
    try {
      execSync("/usr/bin/pkill -f 'ollama runner'", { stdio: "ignore" });
      log(`ollama runner killed; serve will respawn on next request`);
    } catch (kerr) {
      log(
        `ollama runner kill: nothing matched (already dead, or pkill missing) — proceeding anyway`,
      );
    }
    await new Promise((r) => setTimeout(r, 3000));
    return false;
  }
}

async function main() {
  log(`phase-a-host-trigger starting | dryRun=${dryRun} onlySlot=${onlySlot}`);

  // Ollama pre-flight (msg 5501): if runner is hung, kill+respawn before
  // generating any slots. Without this, a single bad request can cascade
  // into 5/5 slot failures — verified in May 1 integration test.
  await ollamaHealthCheck();

  // May 1 fix (msg 5478): pre-fetch live anchors so each slot's hook
  // is anchored to today's specific data point (PR #, fee tier, pool
  // share, difficulty %). Fallback to static angles only if fetch fails.
  const quantumSlotCount = SLOT_BEATS.filter((b) => b === "quantum").length;
  const [quantumPRs, bmLive] = await Promise.all([
    fetchRecentQuantumPRs(quantumSlotCount),
    fetchRecentBMData(),
  ]);
  log(
    `live anchors: ${quantumPRs.length} quantum PRs (#${quantumPRs.map((p) => p.number).join(",#") || "none"}), bm=${bmLive ? "ok" : "null"} (${bmLive?.fees ? "fees" : ""}${bmLive?.pools_24h ? "/pools" : ""}${bmLive?.difficulty ? "/diff" : ""})`,
  );

  const results = [];
  let bmIdx = 0;
  let qIdx = 0;

  for (let i = 0; i < SLOT_BEATS.length; i++) {
    const slot = i + 1;
    if (onlySlot !== null && slot !== onlySlot) continue;
    const beat = SLOT_BEATS[i];
    let angle;
    if (beat === "bitcoin-macro") {
      const subAngle = bmIdx % 3; // rotate fee/pool/difficulty sub-angles
      const liveHook = buildLiveBmHook(bmLive, subAngle, slot);
      angle =
        liveHook || BM_FALLBACK_ANGLES[subAngle % BM_FALLBACK_ANGLES.length];
      bmIdx++;
    } else if (beat === "quantum") {
      const pr = quantumPRs[qIdx];
      const liveHook = buildLiveQuantumHook(pr, slot);
      angle =
        liveHook ||
        QUANTUM_FALLBACK_ANGLES[qIdx % QUANTUM_FALLBACK_ANGLES.length];
      qIdx++;
    } else {
      angle = "general research prompt";
    }
    // May 2 (Ogie msg 5555 fix #3): per-slot Ollama health ping. Pre-flight
    // at startup is necessary but not sufficient — runner can degrade between
    // slots (May 1 integration test failure mode). Ping before EACH slot;
    // kill+respawn if stale. 5 healthy slots > 3 fast slots + 2 timeouts.
    if (i > 0) {
      await ollamaHealthCheck();
    }
    try {
      const r = await generateSlot(slot, beat, angle);
      results.push(r);
    } catch (e) {
      log(`[slot ${slot} ${beat}] threw: ${e.message}`);
      results.push({ slot, beat, ok: false, reason: e.message });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  log(
    `phase-a-host-trigger complete | ${ok}/${results.length} slots generated`,
  );
  console.log(
    JSON.stringify(
      { summary: { ok, total: results.length }, results },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((e) => {
  log(`FATAL: ${e.message}`);
  console.error(e);
  process.exit(1);
});
