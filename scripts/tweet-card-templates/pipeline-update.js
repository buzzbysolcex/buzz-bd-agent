// Pipeline Update Card — ARIA discovery results
// Customize: DISCOVERED, QUALIFIED, SCORED, NEW_TOKENS

const SCAN_TITLE = "ARIA DISCOVERY SCAN";
const SCAN_DATE = "March 29, 2026 | 06:00 UTC";
const STATS = [
  { num: "42", label: "Discovered" },
  { num: "8", label: "Qualified" },
  { num: "3", label: "Scored 50+" },
  { num: "0", label: "HOT (85+)" }
];
const NEW_TOKENS = [
  { name: "TOKEN_A", chain: "solana", score: "62", status: "WATCH" },
  { name: "TOKEN_B", chain: "base", score: "58", status: "WATCH" },
  { name: "TOKEN_C", chain: "eth", score: "45", status: "SKIP" }
];

const page = await browser.getPage("pipeline-card");
await page.setViewportSize({ width: 1200, height: 675 });
await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;600;700&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:#00ff88;font-family:'JetBrains Mono',monospace;width:1200px;height:675px;position:relative;overflow:hidden}body::after{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px);pointer-events:none;z-index:100}.hex-bg{position:absolute;top:0;left:0;width:100%;height:100%;opacity:0.06;background-image:url("data:image/svg+xml,%3Csvg width='60' height='70' viewBox='0 0 60 70' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20V50L30 65L5 50V20z' fill='none' stroke='%2300ff88' stroke-width='0.5'/%3E%3C/svg%3E");pointer-events:none}.glow{position:absolute;top:-80px;right:-80px;width:400px;height:400px;background:radial-gradient(circle,rgba(0,255,136,0.08),transparent 70%);pointer-events:none}.container{padding:40px 50px;position:relative;z-index:1}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.brand{display:flex;align-items:center;gap:12px}.bee{font-size:48px;filter:drop-shadow(0 0 15px rgba(0,255,136,0.4))}.brand-text{font-family:'Space Grotesk',sans-serif;font-size:14px;color:#666;letter-spacing:2px;text-transform:uppercase}h1{font-family:'Space Grotesk',sans-serif;font-size:30px;color:#fff;margin-bottom:6px}h1 span{color:#00ff88}.subtitle{font-size:14px;color:#666;margin-bottom:20px}.stats{display:flex;gap:16px;margin-bottom:24px}.stat{background:#0d0d14;border:1px solid #1a1a28;border-radius:8px;padding:12px 16px;text-align:center;flex:1}.stat .num{font-size:24px;font-weight:700;color:#00ff88;line-height:1}.stat .label{font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:1px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 12px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1a1a28}td{padding:8px 12px;font-size:14px;color:#c8c8d4;border-bottom:1px solid #0d0d14}.tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700}.tag-watch{background:rgba(255,152,0,0.15);color:#ff9800;border:1px solid rgba(255,152,0,0.3)}.tag-skip{background:rgba(97,97,97,0.15);color:#999;border:1px solid rgba(97,97,97,0.3)}.footer{position:absolute;bottom:25px;left:50px;right:50px;display:flex;justify-content:space-between;color:#444;font-size:12px;z-index:1}
</style></head><body>
<div class="hex-bg"></div><div class="glow"></div>
<div class="container">
  <div class="header"><div></div><div class="brand"><span class="brand-text">BUZZ BD AGENT</span><span class="bee">🐝</span></div></div>
  <h1>ARIA <span>DISCOVERY SCAN</span></h1>
  <div class="subtitle">${SCAN_DATE}</div>
  <div class="stats">${STATS.map(s => `<div class="stat"><div class="num">${s.num}</div><div class="label">${s.label}</div></div>`).join('')}</div>
  <table>
    <tr><th>Token</th><th>Chain</th><th>Score</th><th>Status</th></tr>
    ${NEW_TOKENS.map(t => `<tr><td style="color:#fff;font-weight:700">${t.name}</td><td>${t.chain}</td><td style="color:#00ff88">${t.score}</td><td><span class="tag tag-${t.status.toLowerCase()}">${t.status}</span></td></tr>`).join('')}
  </table>
</div>
<div class="footer"><span>ARIA v2 | 29 sources | Tri-source verified</span><span>🐝 buzzbd.ai/report | @BuzzBySolCex</span></div>
</body></html>`);
await new Promise(r => setTimeout(r, 2000));
const buf = await page.screenshot();
const path = await saveScreenshot(buf, "pipeline-update-card.png");
console.log("Saved: " + path);
