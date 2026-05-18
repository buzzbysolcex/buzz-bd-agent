/**
 * Financial Datasets Sync Cron — runs every 4 hours
 * Pulls prices for pipeline tokens with stage scored/prospect and score >= 70
 * Uses startup+15min pattern to avoid boot congestion.
 *
 * Buzz BD Agent v7.6.0 | MiroFish Integration
 */

const { getDB } = require("../db");
const { getCryptoPrice } = require("../intel/financial-datasets-mcp");

const SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const STARTUP_DELAY_MS = 15 * 60 * 1000; // 15 minutes after boot

let syncTimer = null;

async function syncPrices() {
  const db = getDB();
  console.log(
    "[FinDatasets Sync] Starting price sync for qualified pipeline tokens...",
  );

  let tokens;
  try {
    tokens = db
      .prepare(
        `SELECT address, ticker, chain, score FROM pipeline_tokens
       WHERE stage IN ('scored', 'prospect') AND score >= 70 AND ticker IS NOT NULL`,
      )
      .all();
  } catch (e) {
    console.error("[FinDatasets Sync] DB query failed:", e.message);
    return;
  }

  if (!tokens.length) {
    console.log("[FinDatasets Sync] No qualified tokens to sync");
    return;
  }

  console.log(`[FinDatasets Sync] Syncing prices for ${tokens.length} tokens`);

  let synced = 0;
  let failed = 0;

  for (const token of tokens) {
    if (!token.ticker) continue;

    try {
      const price = await getCryptoPrice(token.ticker);
      if (price) {
        db.prepare(
          `INSERT OR REPLACE INTO financial_datasets_cache (ticker, data_type, data, fetched_at, expires_at)
           VALUES (?, 'price', ?, datetime('now'), datetime('now', '+5 minutes'))`,
        ).run(token.ticker, JSON.stringify(price));
        synced++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
      console.error(`[FinDatasets Sync] ${token.ticker} failed:`, e.message);
    }

    // Rate limit: 200ms between calls
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(
    `[FinDatasets Sync] Complete: ${synced} synced, ${failed} failed out of ${tokens.length} tokens`,
  );
}

function start() {
  console.log(
    `[FinDatasets Sync] Scheduled — first run in ${STARTUP_DELAY_MS / 60000}min, then every ${SYNC_INTERVAL_MS / 3600000}h`,
  );

  setTimeout(() => {
    syncPrices().catch((e) =>
      console.error("[FinDatasets Sync] Error:", e.message),
    );
    syncTimer = setInterval(() => {
      syncPrices().catch((e) =>
        console.error("[FinDatasets Sync] Error:", e.message),
      );
    }, SYNC_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

function stop() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

module.exports = { start, stop, syncPrices };
