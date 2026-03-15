const https = require("https");
const Database = require("better-sqlite3");
const BAGS_API_KEY = process.env.BAGS_API_KEY || "";
const BASE_URL = "public-api-v2.bags.fm";
const DB_PATH = "/data/buzz-api/buzz.db";

function bagsGet(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: BASE_URL, path: "/api/v1" + path, method: "GET",
      headers: { "x-api-key": BAGS_API_KEY, "Content-Type": "application/json" } };
    const req = https.request(opts, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    req.end();
  });
}

async function scanBagsPools() {
  console.log("[bags-scanner] Starting Bags pool scan...");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode=WAL");
  db.exec("CREATE TABLE IF NOT EXISTS bags_tokens (token_mint TEXT PRIMARY KEY, name TEXT, symbol TEXT, description TEXT, image TEXT, twitter TEXT, website TEXT, status TEXT, dbc_config_key TEXT, dbc_pool_key TEXT, damm_v2_pool_key TEXT, lifetime_fees_sol REAL DEFAULT 0, creator_wallet TEXT, creator_username TEXT, bags_score INTEGER DEFAULT 0, source TEXT DEFAULT bags, scanned_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  try {
    var now = new Date().toISOString();
    var poolsRes = await bagsGet("/solana/bags/pools");
    if (!poolsRes.success) { db.close(); return { error: "pools_failed" }; }
    var pools = poolsRes.response || [];
    console.log("[bags-scanner] Fetched " + pools.length + " pools");
    var feedRes = await bagsGet("/token-launch/feed");
    var feedTokens = (feedRes.success ? feedRes.response : []) || [];
    console.log("[bags-scanner] Fetched " + feedTokens.length + " feed tokens");
    var feedMap = {};
    feedTokens.forEach(function(t) { if (t.tokenMint) feedMap[t.tokenMint] = t; });
    var upsert = db.prepare("INSERT INTO bags_tokens (token_mint, name, symbol, description, image, twitter, website, status, dbc_config_key, dbc_pool_key, damm_v2_pool_key, scanned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(token_mint) DO UPDATE SET name=COALESCE(excluded.name, bags_tokens.name), symbol=COALESCE(excluded.symbol, bags_tokens.symbol), status=COALESCE(excluded.status, bags_tokens.status), dbc_config_key=COALESCE(excluded.dbc_config_key, bags_tokens.dbc_config_key), dbc_pool_key=COALESCE(excluded.dbc_pool_key, bags_tokens.dbc_pool_key), damm_v2_pool_key=COALESCE(excluded.damm_v2_pool_key, bags_tokens.damm_v2_pool_key), scanned_at=excluded.scanned_at");
    var tx = db.transaction(function(items) {
      var count = 0;
      items.forEach(function(pool) {
        var feed = feedMap[pool.tokenMint] || {};
        upsert.run(pool.tokenMint, feed.name||null, feed.symbol||null, feed.description||null, feed.image||null, feed.twitter||null, feed.website||null, feed.status||null, pool.dbcConfigKey||null, pool.dbcPoolKey||null, pool.dammV2PoolKey||null, now);
        count++;
      });
      return count;
    });
    var upserted = tx(pools);
    console.log("[bags-scanner] Upserted " + upserted + " tokens");
    var stats = db.prepare("SELECT COUNT(*) as total, COUNT(CASE WHEN name IS NOT NULL THEN 1 END) as with_metadata FROM bags_tokens").get();
    db.close();
    var result = { pools: pools.length, feed: feedTokens.length, upserted: upserted, total: stats.total, withMetadata: stats.with_metadata };
    console.log("[bags-scanner] Complete:", JSON.stringify(result));
    return result;
  } catch (err) {
    console.error("[bags-scanner] Error:", err.message);
    db.close();
    return { error: err.message };
  }
}
module.exports = { scanBagsPools, bagsGet };
if (require.main === module) { scanBagsPools().then(function(r) { console.log(JSON.stringify(r, null, 2)); }); }
