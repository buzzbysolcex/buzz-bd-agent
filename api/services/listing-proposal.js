/**
 * Listing Proposal Generator — Cyberpunk Terminal Style
 * Generates self-contained HTML proposals for token listings
 *
 * Part of MiroFish Stage 1 MVP — Buzz BD Agent v7.5.4
 * No external dependencies — inline CSS, fully screenshottable
 */

function generateProposal(reportData) {
  const { token, scan, score, safety, simulation, ev } = reportData;

  const ticker = token?.ticker || token?.symbol || 'UNKNOWN';
  const chain = token?.chain || 'solana';
  const tokenScore = score?.score || token?.score || 0;
  const recommendation = simulation?.recommendation || ev?.decision || 'PENDING';
  const evValue = ev?.ev || 0;
  const probability = simulation?.probability || 0;
  const confidence = simulation?.confidence || 0;

  // Build clusters display
  const clusters = simulation?.clusters || {};

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BUZZ LISTING PROPOSAL — ${escapeHtml(ticker)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0a0a;
    color: #00ff41;
    font-family: 'Courier New', monospace;
    line-height: 1.6;
    padding: 20px;
    position: relative;
    overflow-x: hidden;
  }
  /* Hex grid overlay */
  body::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px
    );
    pointer-events: none;
    z-index: 0;
  }
  /* Scanline animation */
  body::after {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: rgba(0,255,65,0.15);
    animation: scanline 8s linear infinite;
    pointer-events: none;
    z-index: 1000;
  }
  @keyframes scanline {
    0% { top: 0; }
    100% { top: 100vh; }
  }
  .container { max-width: 800px; margin: 0 auto; position: relative; z-index: 1; }
  .header {
    border: 1px solid #00ff41;
    padding: 20px;
    margin-bottom: 20px;
    text-align: center;
    position: relative;
  }
  .header h1 { color: #00d4ff; font-size: 24px; margin-bottom: 10px; }
  .header .ticker { color: #ff00ff; font-size: 36px; font-weight: bold; }
  .section {
    border: 1px solid #333;
    padding: 15px;
    margin-bottom: 15px;
    background: rgba(0,255,65,0.02);
  }
  .section-title {
    color: #00d4ff;
    font-size: 14px;
    margin-bottom: 10px;
    border-bottom: 1px solid #333;
    padding-bottom: 5px;
  }
  .section-title::before { content: '> '; color: #00ff41; }
  .cursor { animation: blink 1s step-end infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .metric { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1a1a1a; }
  .metric-label { color: #888; }
  .metric-value { color: #00ff41; font-weight: bold; }
  .bullish { color: #00ff41; }
  .bearish { color: #ff4444; }
  .neutral { color: #ffaa00; }
  .monitor { color: #ffaa00; }
  .recommendation {
    text-align: center;
    padding: 20px;
    margin: 20px 0;
    border: 2px solid;
    font-size: 24px;
    font-weight: bold;
  }
  .recommendation.LIST { border-color: #00ff41; color: #00ff41; background: rgba(0,255,65,0.1); }
  .recommendation.REJECT { border-color: #ff4444; color: #ff4444; background: rgba(255,68,68,0.1); }
  .recommendation.MONITOR { border-color: #ffaa00; color: #ffaa00; background: rgba(255,170,0,0.1); }
  .recommendation.PENDING { border-color: #555; color: #555; background: rgba(85,85,85,0.1); }
  .cluster-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
  .cluster-card { border: 1px solid #333; padding: 10px; }
  .cluster-name { color: #ff00ff; font-weight: bold; margin-bottom: 5px; }
  .ev-display { text-align: center; padding: 15px; border: 1px solid #00d4ff; margin: 15px 0; }
  .ev-value { font-size: 32px; font-weight: bold; }
  .ev-positive { color: #00ff41; }
  .ev-negative { color: #ff4444; }
  .cta {
    text-align: center;
    padding: 20px;
    margin-top: 20px;
    border: 1px solid #ff00ff;
    background: rgba(255,0,255,0.05);
  }
  .cta a { color: #ff00ff; text-decoration: none; }
  .footer { text-align: center; color: #555; margin-top: 20px; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div style="color:#555;font-size:12px;">BUZZ BD AGENT v7.6.0 | MiroFish Stage 1</div>
    <h1>LISTING PROPOSAL<span class="cursor">_</span></h1>
    <div class="ticker">$${escapeHtml(ticker)}</div>
    <div style="color:#888;margin-top:5px;">Chain: ${escapeHtml(chain.toUpperCase())} | Generated: ${new Date().toISOString().split('T')[0]}</div>
  </div>

  <div class="section">
    <div class="section-title">SCAN_DATA</div>
    ${buildScanSection(scan, token)}
  </div>

  <div class="section">
    <div class="section-title">SAFETY_CHECK</div>
    ${buildSafetySection(safety)}
  </div>

  <div class="section">
    <div class="section-title">BUZZ_SCORE</div>
    <div class="metric"><span class="metric-label">Composite Score</span><span class="metric-value">${tokenScore}/100</span></div>
    <div class="metric"><span class="metric-label">Verdict</span><span class="metric-value">${tokenScore >= 85 ? 'HOT' : tokenScore >= 70 ? 'QUALIFIED' : tokenScore >= 50 ? 'WATCH' : 'SKIP'}</span></div>
  </div>

  <div class="section">
    <div class="section-title">MIROFISH_SIMULATION</div>
    <div class="metric"><span class="metric-label">Agents Dispatched</span><span class="metric-value">${simulation?.agents_count || 20}</span></div>
    <div class="metric"><span class="metric-label">Probability</span><span class="metric-value">${Math.round((probability || 0) * 100)}%</span></div>
    <div class="metric"><span class="metric-label">Confidence</span><span class="metric-value">${Math.round((confidence || 0) * 100)}%</span></div>
    <div class="cluster-grid">
      ${Object.entries(clusters).map(([name, c]) => `
      <div class="cluster-card">
        <div class="cluster-name">${getClusterEmoji(name)} ${escapeHtml(name.toUpperCase())}</div>
        <div class="metric"><span class="metric-label">Consensus</span><span class="metric-value ${(c.consensus || '').toLowerCase()}">${escapeHtml(c.consensus || 'N/A')}</span></div>
        <div class="metric"><span class="metric-label">Bullish</span><span class="metric-value">${c.bullish || 0}/${c.total || 0}</span></div>
      </div>`).join('')}
    </div>
  </div>

  <div class="ev-display">
    <div style="color:#00d4ff;font-size:14px;">EXPECTED VALUE ANALYSIS</div>
    <div class="ev-value ${evValue >= 0 ? 'ev-positive' : 'ev-negative'}">EV = ${evValue >= 0 ? '+' : ''}$${evValue}</div>
    <div style="color:#888;font-size:12px;margin-top:5px;">${escapeHtml(ev?.formula || '')}</div>
  </div>

  <div class="recommendation ${escapeHtml(recommendation)}">
    RECOMMENDATION: ${escapeHtml(recommendation)} ${recommendation === 'LIST' ? '&#10003;' : recommendation === 'MONITOR' ? '&#8987;' : recommendation === 'REJECT' ? '&#10007;' : '&#8230;'}
  </div>

  ${simulation?.key_risk ? `<div class="section"><div class="section-title">KEY_RISKS</div><div style="color:#ff4444;">${escapeHtml(simulation.key_risk)}</div></div>` : ''}
  ${simulation?.key_signal ? `<div class="section"><div class="section-title">KEY_SIGNALS</div><div style="color:#00ff41;">${escapeHtml(simulation.key_signal)}</div></div>` : ''}

  <div class="cta">
    <div style="color:#ff00ff;font-size:18px;margin-bottom:10px;">INTERESTED IN LISTING?</div>
    <div style="color:#ccc;">DM @HidayahAnka1 for listing opportunities on @SolCex_Exchange</div>
  </div>

  <div class="footer">
    Powered by Buzz BD Agent | 24 Intel Sources | MiroFish Simulation Engine | Financial Datasets MCP<br>
    SolCex Exchange | ${new Date().toISOString()}
  </div>
</div>
</body>
</html>`;

  return {
    html,
    metadata: {
      ticker,
      chain,
      score: tokenScore,
      ev: evValue,
      recommendation,
      probability,
      confidence,
      generated_at: new Date().toISOString()
    }
  };
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getClusterEmoji(name) {
  const map = {
    degen: '&#127920;',      // slot machine
    whale: '&#128011;',      // whale
    institutional: '&#127974;', // bank
    community: '&#128101;'   // people
  };
  return map[name] || '&#128202;'; // chart
}

function buildScanSection(scan, token) {
  if (!scan && !token) return '<div style="color:#888;">No scan data available</div>';
  const d = scan || token || {};
  return `
    <div class="metric"><span class="metric-label">Name</span><span class="metric-value">${escapeHtml(d.name || d.ticker || 'N/A')}</span></div>
    <div class="metric"><span class="metric-label">Market Cap</span><span class="metric-value">${d.market_cap ? '$' + Number(d.market_cap).toLocaleString() : 'N/A'}</span></div>
    <div class="metric"><span class="metric-label">Liquidity</span><span class="metric-value">${d.liquidity_usd ? '$' + Number(d.liquidity_usd).toLocaleString() : 'N/A'}</span></div>
    <div class="metric"><span class="metric-label">24h Volume</span><span class="metric-value">${d.volume_24h ? '$' + Number(d.volume_24h).toLocaleString() : 'N/A'}</span></div>
    <div class="metric"><span class="metric-label">Price Change 24h</span><span class="metric-value">${d.price_change_24h ? d.price_change_24h + '%' : 'N/A'}</span></div>
  `;
}

function buildSafetySection(safety) {
  if (!safety) return '<div style="color:#888;">No safety data available</div>';
  return `
    <div class="metric"><span class="metric-label">Safety Score</span><span class="metric-value">${safety.score || safety.safety_score || 'N/A'}/100</span></div>
    <div class="metric"><span class="metric-label">Mint Authority</span><span class="metric-value">${safety.mint_revoked ? '&#10003; Disabled' : '&#9888; Active'}</span></div>
    <div class="metric"><span class="metric-label">LP Lock</span><span class="metric-value">${safety.lp_locked ? '&#10003; Locked' : '&#9888; Not Locked'}</span></div>
  `;
}

module.exports = { generateProposal };
