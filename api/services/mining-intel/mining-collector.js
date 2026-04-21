/**
 * Mining Collector — mempool.space data pipeline + pool scoring
 * Intel Source #35: mempool.space (FREE, no API key)
 * PULSE priority 6c: every 360 ticks (~6hr)
 * Collects network snapshots + per-pool health scores
 */

const { getDB } = require("../../db");
const { feature } = require("../../lib/feature-flags");

const MEMPOOL = "https://mempool.space/api";
const TOP_POOLS = [
  "foundryusa",
  "antpool",
  "f2pool",
  "viaBTC",
  "binancepool",
  "marapool",
  "luxor",
  "sbicrypto",
  "btccom",
  "braiinspool",
  "poolin",
  "emcd",
  "secpool",
  "ocean",
  "ultimus",
];

async function fetchJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

// ── POOL HEALTH SCORING (100-point system) ──

function calculatePoolHealthScore(pool) {
  let score = 0;

  // 1. HASHRATE SHARE (30 points)
  const share = pool.hashrate_share || 0;
  if (share > 0.15) score += 30;
  else if (share > 0.08) score += 25;
  else if (share > 0.03) score += 20;
  else if (share > 0.01) score += 10;
  else score += 5;

  // 2. SHARE VELOCITY (20 points)
  const velocity = pool.share_velocity || 0;
  if (velocity > 0.02) score += 20;
  else if (velocity > 0.005) score += 15;
  else if (velocity > -0.005) score += 10;
  else if (velocity > -0.02) score += 5;

  // 3. FEE EFFICIENCY (20 points)
  const feeEff = pool.fee_efficiency || 1;
  if (feeEff > 1.1) score += 20;
  else if (feeEff > 1.0) score += 15;
  else if (feeEff > 0.9) score += 10;
  else score += 5;

  // 4. BLOCK FULLNESS (15 points)
  const emptyRate = pool.empty_block_rate || 0;
  if (emptyRate < 0.01) score += 15;
  else if (emptyRate < 0.05) score += 10;
  else if (emptyRate < 0.1) score += 5;

  // 5. CONSISTENCY (15 points)
  const expectedBlocks = (pool.hashrate_share || 0) * 144;
  const actualBlocks = pool.block_count_24h || 0;
  const consistency = expectedBlocks > 0 ? actualBlocks / expectedBlocks : 0;
  if (consistency > 0.9 && consistency < 1.1) score += 15;
  else if (consistency > 0.7) score += 10;
  else score += 5;

  score = Math.min(score, 100);
  const tier =
    score >= 80
      ? "APEX"
      : score >= 60
        ? "STRONG"
        : score >= 40
          ? "STABLE"
          : score >= 20
            ? "DECLINING"
            : "DORMANT";

  return { score, tier };
}

// ── MINING SENTIMENT INDEX (-100 to +100) ──

function calculateMiningSentimentIndex(pools, snapshot) {
  let bullish = 0;
  let bearish = 0;

  pools.forEach((p) => {
    if ((p.share_velocity || 0) > 0.005) bullish++;
    else if ((p.share_velocity || 0) < -0.005) bearish++;
  });

  if ((snapshot.hashrate_change_24h || 0) > 0.02) bullish += 3;
  else if ((snapshot.hashrate_change_24h || 0) < -0.02) bearish += 3;

  if ((snapshot.hashprice_usd || 0) > 60) bullish += 2;
  else if ((snapshot.hashprice_usd || 0) < 40) bearish += 2;

  if ((snapshot.next_retarget_change || 0) > 0) bullish += 1;
  else bearish += 1;

  if ((snapshot.fee_rate_fast || 0) > 50) bullish += 1;
  if ((snapshot.mempool_vsize_mb || 0) > 100) bullish += 1;

  const total = bullish + bearish;
  const index = total > 0 ? Math.round(((bullish - bearish) / total) * 100) : 0;

  return {
    index,
    label: index > 30 ? "BULLISH" : index > -30 ? "NEUTRAL" : "BEARISH",
    bullish_signals: bullish,
    bearish_signals: bearish,
    pools_growing: pools.filter((p) => (p.share_velocity || 0) > 0.005).length,
    pools_declining: pools.filter((p) => (p.share_velocity || 0) < -0.005)
      .length,
  };
}

// ── NETWORK SNAPSHOT COLLECTION ──

async function collectNetworkSnapshot() {
  const [hashrate, diffAdj, fees, mempool, rewardStats, prices] =
    await Promise.all([
      fetchJSON(`${MEMPOOL}/v1/mining/hashrate/1m`),
      fetchJSON(`${MEMPOOL}/v1/difficulty-adjustment`),
      fetchJSON(`${MEMPOOL}/v1/fees/recommended`),
      fetchJSON(`${MEMPOOL}/mempool`),
      fetchJSON(`${MEMPOOL}/v1/mining/reward-stats/100`),
      fetchJSON(`${MEMPOOL}/v1/prices`),
    ]);

  const currentHashrate = hashrate.currentHashrate || 0;
  const hashrateEH = currentHashrate / 1e18;
  const difficulty = hashrate.currentDifficulty || 0;
  const btcPrice = prices.USD || 0;

  // Hashprice: revenue per TH/s/day
  // Approximation: (block_reward + avg_fees) * 144 * btc_price / (hashrate_TH)
  const blockReward = (rewardStats.totalReward || 0) / 1e8 / 100;
  const blockFees = (rewardStats.totalFee || 0) / 1e8 / 100;
  const hashrateTH = currentHashrate / 1e12;
  const dailyRevenue = (blockReward + blockFees) * 144 * btcPrice;
  const hashprice = hashrateTH > 0 ? dailyRevenue / hashrateTH : 0;

  // Hashrate 24h change (from hashrate history)
  const hrHistory = hashrate.hashrates || [];
  let hrChange24h = 0;
  if (hrHistory.length >= 2) {
    const latest = hrHistory[hrHistory.length - 1].avgHashrate || 0;
    const prev = hrHistory[Math.max(0, hrHistory.length - 8)].avgHashrate || 1;
    hrChange24h = (latest - prev) / prev;
  }

  return {
    hashrate_eh: Math.round(hashrateEH * 100) / 100,
    difficulty,
    block_height: 0, // filled from pool data
    btc_price_usd: btcPrice,
    hashprice_usd: Math.round(hashprice * 100) / 100,
    fee_rate_fast: fees.fastestFee || 0,
    fee_rate_medium: fees.halfHourFee || 0,
    fee_rate_slow: fees.economyFee || 0,
    mempool_tx_count: mempool.count || 0,
    mempool_vsize_mb: Math.round(((mempool.vsize || 0) / 1e6) * 100) / 100,
    avg_block_reward: Math.round(blockReward * 1e8) / 1e8,
    avg_block_fees: Math.round(blockFees * 1e8) / 1e8,
    blocks_since_retarget: diffAdj.progressPercent
      ? Math.round((diffAdj.progressPercent / 100) * 2016)
      : 0,
    next_retarget_change: diffAdj.difficultyChange || 0,
    hashrate_change_24h: Math.round(hrChange24h * 10000) / 10000,
  };
}

// ── POOL DATA COLLECTION ──

async function collectPoolData() {
  // Get all pools ranked by 1w blocks
  const poolsData = await fetchJSON(`${MEMPOOL}/v1/mining/pools/1w`);
  const allPools = poolsData.pools || [];
  const totalBlocks1w = poolsData.blockCount || 1;

  // Get network-avg fee from recent reward stats
  const rewardStats = await fetchJSON(`${MEMPOOL}/v1/mining/reward-stats/100`);
  const networkAvgFee = (rewardStats.totalFee || 0) / 1e8 / 100;

  // Collect details for top pools
  const poolResults = [];

  for (const slug of TOP_POOLS) {
    const poolEntry = allPools.find(
      (p) =>
        p.slug === slug || p.name?.toLowerCase().includes(slug.toLowerCase()),
    );
    if (!poolEntry) continue;

    try {
      const [detail, hrData, blocks] = await Promise.all([
        fetchJSON(`${MEMPOOL}/v1/mining/pool/${poolEntry.slug}`).catch(
          () => null,
        ),
        fetchJSON(`${MEMPOOL}/v1/mining/pool/${poolEntry.slug}/hashrate`).catch(
          () => [],
        ),
        fetchJSON(`${MEMPOOL}/v1/mining/pool/${poolEntry.slug}/blocks`).catch(
          () => [],
        ),
      ]);

      // Calculate share velocity from hashrate history
      let shareVelocity = 0;
      const hrArray = Array.isArray(hrData) ? hrData : hrData?.hashrates || [];
      if (hrArray.length >= 2) {
        const latest = hrArray[hrArray.length - 1]?.share || 0;
        const weekAgo =
          hrArray[Math.max(0, hrArray.length - 8)]?.share || latest;
        shareVelocity = latest - weekAgo;
      }
      const latestShare =
        hrArray.length > 0 ? hrArray[hrArray.length - 1]?.share || 0 : 0;

      // Fee efficiency from recent blocks
      const recentBlocks = Array.isArray(blocks) ? blocks.slice(0, 20) : [];
      let avgFee = 0;
      let avgTx = 0;
      if (recentBlocks.length > 0) {
        const totalFees = recentBlocks.reduce(
          (s, b) => s + (b.extras?.totalFees || 0) / 1e8,
          0,
        );
        avgFee = totalFees / recentBlocks.length;
        avgTx =
          recentBlocks.reduce((s, b) => s + (b.tx_count || 0), 0) /
          recentBlocks.length;
      }
      const feeEfficiency = networkAvgFee > 0 ? avgFee / networkAvgFee : 1;

      // Empty block rate
      const emptyRate =
        poolEntry.blockCount > 0
          ? (poolEntry.emptyBlocks || 0) / poolEntry.blockCount
          : 0;

      const poolData = {
        slug: poolEntry.slug,
        name: poolEntry.name,
        link: poolEntry.link || null,
        block_count_24h: detail?.blockCount?.["24h"] || 0,
        block_count_1w: detail?.blockCount?.["1w"] || poolEntry.blockCount || 0,
        block_count_1m: detail?.blockCount?.all || 0,
        block_share_24h: detail?.blockShare?.["24h"] || 0,
        block_share_1w:
          detail?.blockShare?.["1w"] || poolEntry.blockCount / totalBlocks1w,
        block_share_1m: detail?.blockShare?.all || 0,
        empty_blocks: poolEntry.emptyBlocks || 0,
        empty_block_rate: Math.round(emptyRate * 10000) / 10000,
        hashrate_share: Math.round(latestShare * 10000) / 10000,
        share_velocity: Math.round(shareVelocity * 10000) / 10000,
        avg_fee_per_block: Math.round(avgFee * 1e8) / 1e8,
        fee_efficiency: Math.round(feeEfficiency * 1000) / 1000,
        avg_tx_per_block: Math.round(avgTx),
      };

      // Score the pool
      const { score, tier } = calculatePoolHealthScore(poolData);
      poolData.pool_health_score = score;
      poolData.pool_tier = tier;

      // Pool sentiment
      if (shareVelocity > 0.005) {
        poolData.sentiment = "BULLISH";
        poolData.sentiment_reason = `Growing: +${(shareVelocity * 100).toFixed(2)}% share velocity`;
      } else if (shareVelocity < -0.005) {
        poolData.sentiment = "BEARISH";
        poolData.sentiment_reason = `Declining: ${(shareVelocity * 100).toFixed(2)}% share velocity`;
      } else {
        poolData.sentiment = "NEUTRAL";
        poolData.sentiment_reason = "Stable share position";
      }

      poolResults.push(poolData);
    } catch (err) {
      console.error(`[MINING] Failed to collect ${slug}: ${err.message}`);
    }
  }

  return poolResults;
}

// ── PERSIST TO DATABASE ──

function saveNetworkSnapshot(snapshot) {
  const db = getDB();
  db.prepare(
    `
    INSERT INTO mining_snapshots (
      hashrate_eh, difficulty, block_height, btc_price_usd, hashprice_usd,
      fee_rate_fast, fee_rate_medium, fee_rate_slow,
      mempool_tx_count, mempool_vsize_mb,
      avg_block_reward, avg_block_fees,
      blocks_since_retarget, next_retarget_change, hashrate_change_24h,
      total_pools_tracked, mining_sentiment_index, mining_sentiment_label
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `,
  ).run(
    snapshot.hashrate_eh,
    snapshot.difficulty,
    snapshot.block_height,
    snapshot.btc_price_usd,
    snapshot.hashprice_usd,
    snapshot.fee_rate_fast,
    snapshot.fee_rate_medium,
    snapshot.fee_rate_slow,
    snapshot.mempool_tx_count,
    snapshot.mempool_vsize_mb,
    snapshot.avg_block_reward,
    snapshot.avg_block_fees,
    snapshot.blocks_since_retarget,
    snapshot.next_retarget_change,
    snapshot.hashrate_change_24h,
    snapshot.total_pools_tracked || 0,
    snapshot.mining_sentiment_index || 0,
    snapshot.mining_sentiment_label || "NEUTRAL",
  );
}

function savePoolData(pools) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO mining_pools (
      slug, name, link,
      block_count_24h, block_count_1w, block_count_1m,
      block_share_24h, block_share_1w, block_share_1m,
      empty_blocks, empty_block_rate,
      hashrate_share, share_velocity,
      avg_fee_per_block, fee_efficiency, avg_tx_per_block,
      pool_health_score, pool_tier,
      sentiment, sentiment_reason
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const histStmt = db.prepare(`
    INSERT OR REPLACE INTO mining_pool_history (date, slug, hashrate_share, block_count, empty_block_rate, fee_efficiency, pool_health_score)
    VALUES (date('now'), ?, ?, ?, ?, ?, ?)
  `);

  for (const p of pools) {
    stmt.run(
      p.slug,
      p.name,
      p.link,
      p.block_count_24h,
      p.block_count_1w,
      p.block_count_1m,
      p.block_share_24h,
      p.block_share_1w,
      p.block_share_1m,
      p.empty_blocks,
      p.empty_block_rate,
      p.hashrate_share,
      p.share_velocity,
      p.avg_fee_per_block,
      p.fee_efficiency,
      p.avg_tx_per_block,
      p.pool_health_score,
      p.pool_tier,
      p.sentiment,
      p.sentiment_reason,
    );
    histStmt.run(
      p.slug,
      p.hashrate_share,
      p.block_count_1w,
      p.empty_block_rate,
      p.fee_efficiency,
      p.pool_health_score,
    );
  }
}

// ── FULL COLLECTION PIPELINE ──

async function runFullCollection() {
  if (!feature("MINING_INTEL")) {
    return { success: false, error: "MINING_INTEL disabled" };
  }

  const startMs = Date.now();

  // Collect network + pools in parallel
  const [snapshot, pools] = await Promise.all([
    collectNetworkSnapshot(),
    feature("MINING_POOLS") ? collectPoolData() : Promise.resolve([]),
  ]);

  // Calculate sentiment
  const sentiment = calculateMiningSentimentIndex(pools, snapshot);
  snapshot.total_pools_tracked = pools.length;
  snapshot.mining_sentiment_index = sentiment.index;
  snapshot.mining_sentiment_label = sentiment.label;

  // Persist
  if (feature("MINING_SNAPSHOTS")) {
    saveNetworkSnapshot(snapshot);
  }
  if (feature("MINING_POOLS") && pools.length > 0) {
    savePoolData(pools);
  }

  const durationMs = Date.now() - startMs;

  return {
    success: true,
    duration_ms: durationMs,
    network: {
      hashrate_eh: snapshot.hashrate_eh,
      btc_price: snapshot.btc_price_usd,
      hashprice: snapshot.hashprice_usd,
      fee_fast: snapshot.fee_rate_fast,
      next_retarget: snapshot.next_retarget_change,
    },
    pools: {
      tracked: pools.length,
      apex: pools.filter((p) => p.pool_tier === "APEX").length,
      strong: pools.filter((p) => p.pool_tier === "STRONG").length,
      stable: pools.filter((p) => p.pool_tier === "STABLE").length,
      declining: pools.filter((p) => p.pool_tier === "DECLINING").length,
    },
    sentiment,
  };
}

module.exports = {
  runFullCollection,
  collectNetworkSnapshot,
  collectPoolData,
  calculatePoolHealthScore,
  calculateMiningSentimentIndex,
  saveNetworkSnapshot,
  savePoolData,
};
