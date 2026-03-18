/**
 * Simulation Report — MiroFish Stage 1
 * GET /api/v1/simulation-report/:token
 *
 * Returns a self-contained cyberpunk HTML report for the latest simulation
 * of the given token (by ticker or address).
 *
 * Public endpoint — no auth required for viewing reports.
 *
 * Buzz BD Agent | MiroFish MVP
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

/**
 * Verdict label from pipeline score
 */
function scoreVerdict(score) {
  if (score >= 85) return 'HOT';
  if (score >= 70) return 'QUALIFIED';
  if (score >= 50) return 'WATCH';
  return 'SKIP';
}

/**
 * Decision color helper
 */
function decisionColor(decision) {
  const d = (decision || '').toUpperCase();
  if (d === 'LIST') return '#00ff41';
  if (d === 'MONITOR') return '#ffff00';
  return '#ff0040';
}

/**
 * Build the cyberpunk HTML report
 */
function buildReport(sim) {
  const ticker = sim.ticker || 'UNKNOWN';
  const chain = sim.chain || 'solana';
  const score = sim.score || 0;
  const verdict = scoreVerdict(score);
  const agentsCount = sim.agents_count || 0;
  const probability = sim.probability || 0;
  const confidence = sim.confidence || 0;
  const ev = sim.ev || 0;
  const recommendation = (sim.recommendation || 'REJECT').toUpperCase();
  const recColor = decisionColor(recommendation);
  const bullish = sim.bullish_count || 0;
  const neutral = sim.neutral_count || 0;
  const bearish = sim.bearish_count || 0;
  const keyRisk = sim.key_risk || 'None identified';
  const keySignal = sim.key_signal || 'None identified';
  const createdAt = sim.created_at || new Date().toISOString();

  // Parse cluster data
  let clusters = {};
  try {
    clusters = {
      degen: JSON.parse(sim.cluster_degen || 'null'),
      whale: JSON.parse(sim.cluster_whale || 'null'),
      institutional: JSON.parse(sim.cluster_institutional || 'null'),
      community: JSON.parse(sim.cluster_community || 'null'),
    };
  } catch {}

  function clusterHTML(name, data) {
    if (!data) return '';
    const b = data.bullish || 0;
    const n = data.neutral || 0;
    const be = data.bearish || 0;
    const total = b + n + be || 1;
    const consensus = data.consensus || (b > be ? 'bullish' : be > b ? 'bearish' : 'mixed');
    const consColor = consensus === 'bullish' ? '#00ff41' : consensus === 'bearish' ? '#ff0040' : '#ffff00';
    const bPct = Math.round((b / total) * 100);
    const nPct = Math.round((n / total) * 100);
    const bePct = 100 - bPct - nPct;

    return `
      <div class="cluster-card">
        <div class="cluster-name">${name.toUpperCase()}</div>
        <div class="cluster-bar">
          <div class="bar-bullish" style="width:${bPct}%"></div>
          <div class="bar-neutral" style="width:${nPct}%"></div>
          <div class="bar-bearish" style="width:${bePct}%"></div>
        </div>
        <div class="cluster-counts">
          <span class="c-bullish">${b} bullish</span>
          <span class="c-neutral">${n} neutral</span>
          <span class="c-bearish">${be} bearish</span>
        </div>
        <div class="cluster-consensus" style="color:${consColor}">${consensus.toUpperCase()}</div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BUZZ SIMULATION REPORT | ${ticker}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0a0a;
    color: #c0c0c0;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }
  body::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px
    );
    pointer-events: none;
    z-index: 1000;
    animation: scanline 8s linear infinite;
  }
  @keyframes scanline {
    0% { transform: translateY(0); }
    100% { transform: translateY(100px); }
  }
  body::after {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9z' fill='%2300ff41' fill-opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 999;
  }
  .container { max-width: 900px; margin: 0 auto; padding: 30px 20px; position: relative; z-index: 1; }
  .header {
    text-align: center;
    padding: 30px 0 20px;
    border-bottom: 1px solid #00ff4133;
    margin-bottom: 30px;
  }
  .header h1 {
    color: #00d4ff;
    font-size: 1.6em;
    letter-spacing: 4px;
    text-shadow: 0 0 20px #00d4ff44;
    margin-bottom: 8px;
  }
  .header .token-info {
    color: #ff00ff;
    font-size: 1.2em;
    text-shadow: 0 0 10px #ff00ff44;
  }
  .header .chain-badge {
    display: inline-block;
    background: #ff00ff22;
    border: 1px solid #ff00ff55;
    padding: 2px 10px;
    border-radius: 3px;
    font-size: 0.7em;
    margin-left: 8px;
    color: #ff00ff;
  }
  .section {
    background: #111;
    border: 1px solid #222;
    border-left: 3px solid #00d4ff;
    padding: 20px;
    margin-bottom: 20px;
    border-radius: 0 4px 4px 0;
  }
  .section h2 {
    color: #00d4ff;
    font-size: 0.9em;
    letter-spacing: 2px;
    margin-bottom: 15px;
    text-transform: uppercase;
  }
  .metric-row { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px; }
  .metric {
    flex: 1;
    min-width: 120px;
    text-align: center;
    padding: 10px;
    background: #0a0a0a;
    border: 1px solid #1a1a1a;
    border-radius: 4px;
  }
  .metric .label { color: #666; font-size: 0.7em; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
  .metric .value { color: #00ff41; font-size: 1.4em; font-weight: 700; }
  .metric .value.cyan { color: #00d4ff; }
  .metric .value.magenta { color: #ff00ff; }
  .ev-formula {
    background: #0a0a0a;
    padding: 15px;
    border-radius: 4px;
    text-align: center;
    margin-bottom: 15px;
    border: 1px solid #1a1a1a;
  }
  .ev-formula code { color: #00d4ff; font-size: 0.85em; }
  .ev-value {
    text-align: center;
    font-size: 2em;
    font-weight: 700;
    padding: 10px 0;
  }
  .ev-positive { color: #00ff41; text-shadow: 0 0 20px #00ff4144; }
  .ev-negative { color: #ff0040; text-shadow: 0 0 20px #ff004044; }
  .clusters { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  @media (max-width: 600px) { .clusters { grid-template-columns: 1fr; } }
  .cluster-card {
    background: #0a0a0a;
    border: 1px solid #1a1a1a;
    padding: 12px;
    border-radius: 4px;
  }
  .cluster-name { color: #00d4ff; font-size: 0.75em; letter-spacing: 2px; margin-bottom: 8px; }
  .cluster-bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
    background: #1a1a1a;
  }
  .bar-bullish { background: #00ff41; }
  .bar-neutral { background: #ffff00; }
  .bar-bearish { background: #ff0040; }
  .cluster-counts { font-size: 0.65em; display: flex; gap: 10px; margin-bottom: 5px; }
  .c-bullish { color: #00ff41; }
  .c-neutral { color: #ffff00; }
  .c-bearish { color: #ff0040; }
  .cluster-consensus { font-size: 0.75em; font-weight: 700; }
  .decision-banner {
    text-align: center;
    padding: 25px;
    margin: 25px 0;
    border: 2px solid;
    border-radius: 6px;
    font-size: 2.5em;
    font-weight: 700;
    letter-spacing: 6px;
    text-transform: uppercase;
  }
  .signals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  @media (max-width: 600px) { .signals-grid { grid-template-columns: 1fr; } }
  .signal-card {
    background: #0a0a0a;
    border: 1px solid #1a1a1a;
    padding: 15px;
    border-radius: 4px;
  }
  .signal-card h3 { font-size: 0.75em; letter-spacing: 1px; margin-bottom: 8px; }
  .signal-card.risk h3 { color: #ff0040; }
  .signal-card.signal h3 { color: #00ff41; }
  .signal-card p { color: #999; font-size: 0.8em; line-height: 1.5; }
  .footer {
    text-align: center;
    padding: 30px 0 10px;
    border-top: 1px solid #00ff4133;
    margin-top: 30px;
  }
  .footer .powered { color: #444; font-size: 0.7em; letter-spacing: 1px; margin-bottom: 10px; }
  .footer .cta {
    color: #ff00ff;
    font-size: 0.8em;
    text-shadow: 0 0 10px #ff00ff33;
    margin-top: 10px;
  }
  .timestamp { color: #333; font-size: 0.65em; text-align: center; margin-top: 10px; }
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <h1>BUZZ SIMULATION REPORT</h1>
    <div class="token-info">
      $${ticker} <span class="chain-badge">${chain.toUpperCase()}</span>
    </div>
  </div>

  <div class="section">
    <h2>// Pipeline Score</h2>
    <div class="metric-row">
      <div class="metric">
        <div class="label">Score</div>
        <div class="value cyan">${score}</div>
      </div>
      <div class="metric">
        <div class="label">Verdict</div>
        <div class="value" style="color:${score >= 85 ? '#00ff41' : score >= 70 ? '#00d4ff' : score >= 50 ? '#ffff00' : '#ff0040'}">${verdict}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>// Simulation Results</h2>
    <div class="metric-row">
      <div class="metric">
        <div class="label">Agents</div>
        <div class="value">${agentsCount}</div>
      </div>
      <div class="metric">
        <div class="label">Probability</div>
        <div class="value">${(probability * 100).toFixed(1)}%</div>
      </div>
      <div class="metric">
        <div class="label">Confidence</div>
        <div class="value cyan">${(confidence * 100).toFixed(1)}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>// Expected Value (EV)</h2>
    <div class="ev-formula">
      <code>EV = P(success) &times; reward &minus; P(failure) &times; cost = ${(probability * 100).toFixed(1)}% &times; gain &minus; ${((1 - probability) * 100).toFixed(1)}% &times; loss</code>
    </div>
    <div class="ev-value ${ev >= 0 ? 'ev-positive' : 'ev-negative'}">
      EV: ${ev >= 0 ? '+' : ''}${typeof ev === 'number' ? ev.toFixed(2) : ev}
    </div>
  </div>

  <div class="section">
    <h2>// Cluster Breakdown</h2>
    <div class="clusters">
      ${clusterHTML('degen', clusters.degen)}
      ${clusterHTML('whale', clusters.whale)}
      ${clusterHTML('institutional', clusters.institutional)}
      ${clusterHTML('community', clusters.community)}
    </div>
  </div>

  <div class="decision-banner" style="color:${recColor}; border-color:${recColor}; text-shadow: 0 0 30px ${recColor}44; background: ${recColor}08;">
    ${recommendation}
  </div>

  <div class="section">
    <h2>// Signals &amp; Risks</h2>
    <div class="signals-grid">
      <div class="signal-card risk">
        <h3>KEY RISKS</h3>
        <p>${keyRisk}</p>
      </div>
      <div class="signal-card signal">
        <h3>KEY SIGNALS</h3>
        <p>${keySignal}</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>// Agent Consensus</h2>
    <div class="metric-row">
      <div class="metric">
        <div class="label">Bullish</div>
        <div class="value" style="color:#00ff41">${bullish}</div>
      </div>
      <div class="metric">
        <div class="label">Neutral</div>
        <div class="value" style="color:#ffff00">${neutral}</div>
      </div>
      <div class="metric">
        <div class="label">Bearish</div>
        <div class="value" style="color:#ff0040">${bearish}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="powered">Powered by MiroFish Stage 1 | Buzz BD Agent | 23 Intel Sources</div>
    <div class="cta">DM @HidayahAnka1 for listing opportunities on @SolCex_Exchange</div>
  </div>

  <div class="timestamp">Generated: ${createdAt}</div>

</div>
</body>
</html>`;
}

// GET /api/v1/simulation-report/:token
router.get('/:token', (req, res) => {
  try {
    const db = getDB();
    const token = req.params.token;

    // Look up by ticker or address (case-insensitive for ticker)
    let sim = db.prepare(
      'SELECT * FROM listing_simulations WHERE UPPER(ticker) = UPPER(?) ORDER BY id DESC LIMIT 1'
    ).get(token);

    if (!sim) {
      sim = db.prepare(
        'SELECT * FROM listing_simulations WHERE token_address = ? ORDER BY id DESC LIMIT 1'
      ).get(token);
    }

    if (!sim) {
      return res.status(404).json({
        success: false,
        error: 'No simulation found for this token',
        token,
        hint: 'Run POST /api/v1/simulate/simulate-listing first'
      });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buildReport(sim));
  } catch (err) {
    console.error('[simulation-report] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
