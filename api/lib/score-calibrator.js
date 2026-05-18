/**
 * Score Calibrator — Post-sync score adjustment
 * Applies mcap floor and liquidity penalty to pipeline scores.
 *
 * Rules:
 * - MCap < $100K: score capped at 50
 * - MCap $100K-$1M: score capped at 75
 * - Liquidity < $50K: score penalty -30
 * - Liquidity $50K-$100K: score penalty -20
 * - Liquidity $100K-$500K: score penalty -10
 * - Pump.fun tokens (address ends in 'pump'): additional -10 penalty
 */
const { getDB } = require("../db");
const https = require("https");

function fetchDexScreener(address) {
  return new Promise((resolve) => {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const pairs = parsed.pairs || [];
          if (pairs.length === 0) return resolve(null);
          // Use highest liquidity pair
          const best = pairs.sort(
            (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0),
          )[0];
          resolve({
            mcap: best.fdv || best.marketCap || 0,
            liquidity: best.liquidity?.usd || 0,
            volume24h: best.volume?.h24 || 0,
            priceUsd: parseFloat(best.priceUsd || 0),
          });
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function calibrateScores() {
  const db = getDB();
  const tokens = db
    .prepare(
      "SELECT id, address, chain, ticker, score FROM pipeline_tokens WHERE score IS NOT NULL AND score > 0",
    )
    .all();

  console.log(
    `[calibrator] Starting calibration for ${tokens.length} tokens...`,
  );

  let adjusted = 0;
  let unchanged = 0;
  let errors = 0;

  for (const token of tokens) {
    try {
      // Rate limit: 300ms between DexScreener calls
      await new Promise((r) => setTimeout(r, 300));

      const data = await fetchDexScreener(token.address);
      if (!data) {
        errors++;
        continue;
      }

      let newScore = token.score;
      const penalties = [];

      // MCap floor
      if (data.mcap < 100000) {
        newScore = Math.min(newScore, 50);
        penalties.push(`mcap_floor_50 (mcap=$${Math.round(data.mcap)})`);
      } else if (data.mcap < 1000000) {
        newScore = Math.min(newScore, 75);
        penalties.push(`mcap_floor_75 (mcap=$${Math.round(data.mcap)})`);
      }

      // Liquidity penalty
      if (data.liquidity < 50000) {
        newScore = Math.max(0, newScore - 30);
        penalties.push(`liq_penalty_-30 (liq=$${Math.round(data.liquidity)})`);
      } else if (data.liquidity < 100000) {
        newScore = Math.max(0, newScore - 20);
        penalties.push(`liq_penalty_-20 (liq=$${Math.round(data.liquidity)})`);
      } else if (data.liquidity < 500000) {
        newScore = Math.max(0, newScore - 10);
        penalties.push(`liq_penalty_-10 (liq=$${Math.round(data.liquidity)})`);
      }

      // Pump.fun penalty
      if (token.address.toLowerCase().endsWith("pump")) {
        newScore = Math.max(0, newScore - 10);
        penalties.push("pumpfun_penalty_-10");
      }

      // RULE 9: Ghost volume penalty (tokens nobody trades have no BD value)
      if (data.volume24h !== undefined) {
        if (data.volume24h < 5000) {
          newScore = Math.max(0, newScore - 15);
          penalties.push(
            `ghost_volume_-15 (vol=$${Math.round(data.volume24h)})`,
          );
        } else if (data.volume24h < 10000) {
          newScore = Math.max(0, newScore - 10);
          penalties.push(
            `ghost_volume_-10 (vol=$${Math.round(data.volume24h)})`,
          );
        }
      }
      if (data.txns24h !== undefined && data.txns24h < 100) {
        newScore = Math.max(0, newScore - 5);
        penalties.push(`low_txns_-5 (txns=${data.txns24h})`);
      }

      // RULE 10: CTO flag (community takeover = post-rug shell pattern)
      const desc =
        (token.name || "").toLowerCase() +
        " " +
        (token.notes || "").toLowerCase();
      if (
        desc.includes("community takeover") ||
        desc.includes("devs dumped") ||
        desc.includes("abandoned by dev")
      ) {
        newScore = Math.max(0, newScore - 15);
        penalties.push("cto_shell_-15");
      }

      // RULE 11: Volume/liquidity ratio (dead utilization check)
      if (data.volume24h !== undefined && data.liquidity > 0) {
        const vlRatio = data.volume24h / data.liquidity;
        if (vlRatio < 0.05) {
          newScore = Math.max(0, newScore - 5);
          penalties.push(`dead_util_-5 (v/l=${vlRatio.toFixed(3)})`);
        }
      }

      // Ensure score stays in 0-100 range
      newScore = Math.max(0, Math.min(100, Math.round(newScore)));

      if (newScore !== token.score) {
        db.prepare(
          "UPDATE pipeline_tokens SET score = ?, notes = COALESCE(notes, '') || ? WHERE id = ?",
        ).run(
          newScore,
          ` | calibrated: ${token.score}->${newScore} [${penalties.join(", ")}]`,
          token.id,
        );
        console.log(
          `[calibrator] ${token.ticker}: ${token.score} -> ${newScore} [${penalties.join(", ")}]`,
        );
        adjusted++;
      } else {
        unchanged++;
      }
    } catch (e) {
      console.error(`[calibrator] Error on ${token.ticker}: ${e.message}`);
      errors++;
    }
  }

  console.log(
    `[calibrator] Done: ${adjusted} adjusted, ${unchanged} unchanged, ${errors} errors`,
  );
  return { adjusted, unchanged, errors, total: tokens.length };
}

module.exports = { calibrateScores, fetchDexScreener };
