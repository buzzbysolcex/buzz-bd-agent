/**
 * Discord INTEL ingest — 5-min poll on #intel-zachxbt.
 *
 * For each new message in the inbox channel since last poll:
 *   1. Extract URLs, wallet addresses (ETH/Base, Solana, Bitcoin),
 *      @mentions, $tickers, protocol names.
 *   2. Lightweight cross-reference against pipeline_tokens (by
 *      contract address) + intel_blacklist_wallets.
 *   3. Write claim_audit row (claim_type='discord_intel_ingest').
 *   4. Write autodream_intel_ingest row via autodream.intelIngest().
 *   5. Post structured summary to #intel-triaged via discord-notify.
 *   6. If cross-ref hit, emit INTEL_ACTION_REQUIRED event for
 *      future #intel-actioned router.
 *   7. Advance discord_intel_state.last_seen_message_id.
 *
 * Wave 1: ONLY polls 'intel.zachxbt'. lookonchain/defi-alerts/raw
 * added in Phase 1b.2 after 7 days of clean Wave 1 operation.
 *
 * Gated by DISCORD_OPS_DASHBOARD via discord-notify.send — the poll
 * itself still runs but every posted summary is a no-op when flag
 * is false. DB writes still happen (safe, they're local-only).
 *
 * Per Ogie msg 3898 / Commit 3. Phase 1b Wave 1.
 */

const crypto = require("crypto");

const CHANNEL_KEYS_WAVE_1 = [
  "intel.zachxbt",
  "intel.lookonchain",
  "intel.defi-alerts",
];
const DISCORD_API = "https://discord.com/api/v10";
const USER_AGENT =
  "Buzz-BD-Agent (https://buzzbd.ai, discord-intel-ingest/1.0)";

// ---------- Entity extraction ----------

const URL_REGEX = /https?:\/\/[^\s<>()"']+/g;
const ETH_REGEX = /\b0x[a-fA-F0-9]{40}\b/g;
// Solana base58: 32-44 chars, base58 alphabet (no 0/O/I/l)
const SOLANA_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
const BTC_BECH32_REGEX = /\bbc1[a-z0-9]{25,59}\b/g;
const BTC_P2PKH_P2SH_REGEX = /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g;
const MENTION_REGEX = /@([A-Za-z0-9_]{2,32})/g;
const TICKER_REGEX = /\$([A-Z][A-Z0-9]{1,9})\b/g;

function _matches(s, re) {
  const out = [];
  if (!s) return out;
  const m = s.match(re);
  if (!m) return out;
  for (const x of m) if (!out.includes(x)) out.push(x);
  return out;
}

function extractEntities(content) {
  const urls = _matches(content, URL_REGEX);
  const eth = _matches(content, ETH_REGEX);
  const btc = [
    ..._matches(content, BTC_BECH32_REGEX),
    ..._matches(content, BTC_P2PKH_P2SH_REGEX),
  ];
  // Solana regex catches ETH addresses too (base58 superset of hex) — exclude
  // anything already matched as ETH or BTC.
  const solCandidates = _matches(content, SOLANA_REGEX);
  const taken = new Set([...eth, ...btc]);
  const solana = solCandidates.filter((c) => !taken.has(c) && !/^0x/.test(c));
  const mentions = _matches(content, MENTION_REGEX).map((m) =>
    m.replace(/^@/, ""),
  );
  const tickers = _matches(content, TICKER_REGEX).map((t) =>
    t.replace(/^\$/, ""),
  );

  return {
    urls,
    wallets: { eth, solana, bitcoin: btc },
    mentions,
    tickers,
  };
}

// ---------- Cross-reference ----------

function crossRef(db, entities) {
  const hits = { pipeline_tokens: [], blacklist_wallets: [] };

  const allAddrs = [
    ...entities.wallets.eth,
    ...entities.wallets.solana,
    ...entities.wallets.bitcoin,
  ];

  if (allAddrs.length === 0) return hits;

  // pipeline_tokens (table may or may not exist in all envs — graceful)
  try {
    const placeholders = allAddrs.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT token_address, chain, ticker FROM pipeline_tokens
         WHERE lower(token_address) IN (${placeholders})`,
      )
      .all(...allAddrs.map((a) => a.toLowerCase()));
    hits.pipeline_tokens = rows;
  } catch {
    /* table missing — skip */
  }

  // intel_blacklist_wallets
  try {
    const placeholders = allAddrs.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT address, chain, reason FROM intel_blacklist_wallets
         WHERE lower(address) IN (${placeholders})`,
      )
      .all(...allAddrs.map((a) => a.toLowerCase()));
    hits.blacklist_wallets = rows;
  } catch {
    /* table missing — skip */
  }

  return hits;
}

// ---------- State table ----------

function initIntelState(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS discord_intel_state (
      channel_key TEXT PRIMARY KEY,
      last_seen_message_id TEXT,
      last_polled_at TEXT,
      total_messages_ingested INTEGER DEFAULT 0,
      total_cross_ref_hits INTEGER DEFAULT 0,
      last_error TEXT
    )
  `);
}

function getChannelState(db, channelKey) {
  db.prepare(
    `INSERT OR IGNORE INTO discord_intel_state (channel_key) VALUES (?)`,
  ).run(channelKey);
  return db
    .prepare(
      `SELECT last_seen_message_id, total_messages_ingested, total_cross_ref_hits
       FROM discord_intel_state WHERE channel_key = ?`,
    )
    .get(channelKey);
}

function updateChannelState(
  db,
  channelKey,
  lastId,
  deltaIngested,
  deltaHits,
  errMsg,
) {
  db.prepare(
    `UPDATE discord_intel_state
     SET last_seen_message_id = COALESCE(?, last_seen_message_id),
         last_polled_at = datetime('now'),
         total_messages_ingested = total_messages_ingested + ?,
         total_cross_ref_hits = total_cross_ref_hits + ?,
         last_error = ?
     WHERE channel_key = ?`,
  ).run(lastId, deltaIngested, deltaHits, errMsg || null, channelKey);
}

// ---------- Discord fetch ----------

async function fetchNewMessages(channelId, afterId) {
  const query = afterId ? `?after=${afterId}&limit=50` : `?limit=10`; // first poll: small sample to avoid flood
  const url = `${DISCORD_API}/channels/${channelId}/messages${query}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`discord GET ${res.status}: ${text.slice(0, 200)}`);
  }
  const messages = await res.json();
  // Discord returns newest-first; reverse to process oldest-first so cursor
  // advances monotonically.
  return messages.slice().reverse();
}

function renderTriagedSummary(msg, entities, hits, claimAuditId, ingestId) {
  const ts = msg.timestamp ? msg.timestamp.slice(0, 19).replace("T", " ") : "";
  const lines = [
    `SOURCE: ZachXBT (via Ogie forward at ${ts} UTC)`,
    `URL: ${entities.urls[0] || "(none)"}`,
    `EXTRACTED ENTITIES:`,
    `  - wallets: eth=${entities.wallets.eth.length || "none"} sol=${entities.wallets.solana.length || "none"} btc=${entities.wallets.bitcoin.length || "none"}${
      entities.wallets.eth.length +
        entities.wallets.solana.length +
        entities.wallets.bitcoin.length >
      0
        ? " → " +
          [
            ...entities.wallets.eth.map((a) => `ETH:${a.slice(0, 10)}...`),
            ...entities.wallets.solana.map((a) => `SOL:${a.slice(0, 10)}...`),
            ...entities.wallets.bitcoin.map((a) => `BTC:${a.slice(0, 10)}...`),
          ].join(", ")
        : ""
    }`,
    `  - tokens: ${entities.tickers.length ? entities.tickers.map((t) => "$" + t).join(", ") : "none"}`,
    `  - protocols: ${entities.mentions.length ? entities.mentions.map((m) => "@" + m).join(", ") : "none"}`,
    `CROSS-REF HITS:`,
    `  - pipeline_tokens: ${hits.pipeline_tokens.length ? hits.pipeline_tokens.map((r) => `${r.ticker || r.token_address.slice(0, 10)} (${r.chain})`).join(", ") : "none"}`,
    `  - intel_blacklist_wallets: ${hits.blacklist_wallets.length ? hits.blacklist_wallets.map((r) => `${r.address.slice(0, 10)}... (${r.reason || "?"})`).join(", ") : "none"}`,
    `CLAIM_AUDIT: row_id #${claimAuditId ?? "?"}`,
    `AUTODREAM_INGEST: row_id #${ingestId ?? "?"}`,
    `STATUS: ${hits.pipeline_tokens.length + hits.blacklist_wallets.length > 0 ? "needs_action" : "triaged"}`,
  ];
  return lines.join("\n");
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// ---------- Main ingest flow ----------

async function ingestMessage(msg, deps, channelKey = "intel.zachxbt") {
  const { feature } = require("../../lib/feature-flags");
  const { db, discord, autodream, eventBus } = deps;
  const channelSlug = channelKey.replace(/^intel\./, "");
  const sourceTag = `discord-intel-${channelSlug}`;

  const extractOn = feature("DISCORD_INTEL_EXTRACT");
  const entities = extractOn
    ? extractEntities(msg.content || "")
    : { urls: [], wallets: { eth: [], solana: [], bitcoin: [] }, mentions: [], tickers: [] };
  const hits = extractOn
    ? crossRef(db, entities)
    : { pipeline_tokens: [], blacklist_wallets: [] };
  const hasHits =
    hits.pipeline_tokens.length + hits.blacklist_wallets.length > 0;
  const triagedStatus = hasHits ? "needs_action" : "triaged";

  // claim_audit row first — referenced from the ingest row + triaged post.
  let claimAuditId = null;
  try {
    const row = db
      .prepare(
        `INSERT INTO claim_audit (claim_type, claim_subject, payload,
                                  directive_source, outcome, notes)
         VALUES ('discord_intel_ingest', ?, ?, ?, ?, ?)`,
      )
      .run(
        `intel-${channelSlug} msg ${msg.id}`,
        JSON.stringify({ entities, hits }),
        `discord-channel:intel-${channelSlug};discord-msg:${msg.id}`,
        triagedStatus,
        `hash=${sha256Hex(msg.content || "").slice(0, 16)} url=${entities.urls[0] || ""}`,
      );
    claimAuditId = row.lastInsertRowid;
  } catch (err) {
    console.error(
      `[discord-intel-ingest] claim_audit write failed: ${err.message}`,
    );
  }

  // autodream intel ingest row.
  let ingestId = null;
  try {
    const res = autodream.intelIngest(
      {
        source: sourceTag,
        source_ref_id: msg.id,
        raw_payload: msg.content || "",
        extracted_entities: entities,
        cross_ref_hits: hits,
        triaged_status: triagedStatus,
        claim_audit_id: claimAuditId,
      },
      { db },
    );
    ingestId = res.id;
  } catch (err) {
    console.error(
      `[discord-intel-ingest] autodream ingest failed: ${err.message}`,
    );
  }

  // Post structured summary to #intel-triaged.
  let triagedMsgId = null;
  try {
    const summary = renderTriagedSummary(
      msg,
      entities,
      hits,
      claimAuditId,
      ingestId,
    );
    const res = await discord.send("intel.output.triaged", summary, {
      reason: "discord-intel-ingest",
    });
    if (res.sent && Array.isArray(res.messageIds) && res.messageIds.length) {
      triagedMsgId = res.messageIds[0];
      if (ingestId) {
        try {
          autodream.updateTriagedMessage(ingestId, triagedMsgId, { db });
        } catch {
          /* non-fatal */
        }
      }
    }
  } catch (err) {
    console.error(`[discord-intel-ingest] triaged post failed: ${err.message}`);
  }

  // Emit INTEL_ACTION_REQUIRED on cross-ref hit.
  if (hasHits && eventBus && typeof eventBus.emit === "function") {
    try {
      eventBus.emit("discord-intel-ingest", "intel.action_required", {
        source: sourceTag,
        hit_type: hits.blacklist_wallets.length
          ? "blacklist_wallet"
          : "pipeline_token",
        hit_record_id: claimAuditId,
        triaged_message_id: triagedMsgId,
        intel_ingest_id: ingestId,
      });
    } catch (err) {
      console.error(`[discord-intel-ingest] event emit failed: ${err.message}`);
    }
  }

  return {
    msg_id: msg.id,
    entities_count:
      entities.urls.length +
      entities.wallets.eth.length +
      entities.wallets.solana.length +
      entities.wallets.bitcoin.length +
      entities.mentions.length +
      entities.tickers.length,
    hits_count: hits.pipeline_tokens.length + hits.blacklist_wallets.length,
    claim_audit_id: claimAuditId,
    ingest_id: ingestId,
    triaged_msg_id: triagedMsgId,
    triaged_status: triagedStatus,
  };
}

async function pollChannel(channelKey, deps) {
  const { db, discord } = deps;
  const channels = discord.loadChannels();
  if (!channels) return { error: "no_config" };

  const channelId = discord.resolveChannelId(
    "intel.inbox." + channelKey.replace("intel.", ""),
    channels,
  );
  if (!channelId) return { error: "no_channel_id", channelKey };

  initIntelState(db);
  const state = getChannelState(db, channelKey);

  let messages;
  try {
    messages = await fetchNewMessages(
      channelId,
      state.last_seen_message_id || null,
    );
  } catch (err) {
    updateChannelState(db, channelKey, null, 0, 0, err.message.slice(0, 500));
    return { error: "fetch_failed", detail: err.message };
  }

  if (!messages.length) {
    updateChannelState(db, channelKey, null, 0, 0, null);
    return { processed: 0 };
  }

  let processed = 0;
  let hitDelta = 0;
  let lastId = state.last_seen_message_id || null;

  for (const msg of messages) {
    // Skip messages authored by the bot itself (don't re-ingest our own stubs).
    if (msg.author && msg.author.id === process.env.DISCORD_BOT_APP_ID) {
      lastId = msg.id;
      continue;
    }
    // Skip system/join messages (type != 0).
    if (msg.type !== undefined && msg.type !== 0) {
      lastId = msg.id;
      continue;
    }
    const res = await ingestMessage(msg, deps, channelKey);
    processed++;
    hitDelta += res.hits_count > 0 ? 1 : 0;
    lastId = msg.id;
  }

  updateChannelState(db, channelKey, lastId, processed, hitDelta, null);
  return { processed, channelKey, lastId };
}

async function pollOnce(deps = {}) {
  const { feature } = require("../../lib/feature-flags");
  if (!feature("DISCORD_INTEL_INGEST")) {
    return { skipped: true, reason: "DISCORD_INTEL_INGEST_off" };
  }
  const db = deps.db || require("../../db").getDB();
  const discord = deps.discord || require("../../lib/discord-notify");
  const autodream = deps.autodream || require("../autodream/autodream");
  let eventBus;
  try {
    eventBus = deps.eventBus || require("../events/event-bus");
  } catch {
    eventBus = null;
  }

  const resolvedDeps = { db, discord, autodream, eventBus };
  const results = [];
  for (const channelKey of CHANNEL_KEYS_WAVE_1) {
    results.push(await pollChannel(channelKey, resolvedDeps));
  }
  return { results };
}

let _interval = null;

function start(deps = {}, intervalMs = 5 * 60 * 1000) {
  if (_interval) return { already_running: true };
  pollOnce(deps).catch((err) =>
    console.error(`[discord-intel-ingest] initial poll err: ${err.message}`),
  );
  _interval = setInterval(() => {
    pollOnce(deps).catch((err) =>
      console.error(`[discord-intel-ingest] poll err: ${err.message}`),
    );
  }, intervalMs);
  return { started: true, interval_ms: intervalMs };
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  return { stopped: true };
}

module.exports = {
  CHANNEL_KEYS_WAVE_1,
  extractEntities,
  crossRef,
  initIntelState,
  getChannelState,
  ingestMessage,
  pollChannel,
  pollOnce,
  start,
  stop,
  renderTriagedSummary,
};
