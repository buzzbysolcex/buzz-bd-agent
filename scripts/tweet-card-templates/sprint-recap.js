// Sprint Recap Card — summary with key metrics
// Customize: SPRINT_DAY, METRICS

const SPRINT_TITLE = "SPRINT COMPLETE";
const SPRINT_SUBTITLE = "42 Days | Feb 18 — Mar 31, 2026";
const METRICS = [
  { label: "Tokens Scored", value: "256", color: "#00ff88" },
  { label: "HOT Qualified", value: "0 (honest)", color: "#ff6b6b" },
  { label: "Signal Revenue", value: "$125+", color: "#00ff88" },
  { label: "Signal Streak", value: "7 days", color: "#00ccff" },
  { label: "Contracts Deployed", value: "1 (Base)", color: "#00ff88" },
  { label: "Intel Sources", value: "29", color: "#00ccff" },
  { label: "ARIA Endpoints", value: "5 live", color: "#00ff88" },
  { label: "MiroFish Agents", value: "50", color: "#00ccff" }
];

const page = await browser.getPage("sprint-recap");
await page.setViewportSize({ width: 1200, height: 675 });
await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;600;700&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:#00ff88;font-family:'JetBrains Mono',monospace;width:1200px;height:675px;position:relative;overflow:hidden}body::after{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px);pointer-events:none;z-index:100}.hex-bg{position:absolute;top:0;left:0;width:100%;height:100%;opacity:0.06;background-image:url("data:image/svg+xml,%3Csvg width='60' height='70' viewBox='0 0 60 70' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20V50L30 65L5 50V20z' fill='none' stroke='%2300ff88' stroke-width='0.5'/%3E%3C/svg%3E");pointer-events:none}.glow{position:absolute;top:-80px;right:-80px;width:400px;height:400px;background:radial-gradient(circle,rgba(0,255,136,0.08),transparent 70%);pointer-events:none}.container{padding:40px 50px;position:relative;z-index:1}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px}.brand{display:flex;align-items:center;gap:12px}.bee{font-size:48px;filter:drop-shadow(0 0 15px rgba(0,255,136,0.4))}.brand-text{font-family:'Space Grotesk',sans-serif;font-size:14px;color:#666;letter-spacing:2px;text-transform:uppercase}h1{font-family:'Space Grotesk',sans-serif;font-size:34px;color:#fff;margin-bottom:4px}h1 span{color:#00ff88}.subtitle{font-size:14px;color:#666;margin-bottom:22px}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px 40px}.metric{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a28}.metric-label{font-size:14px;color:#888}.metric-value{font-size:14px;font-weight:700}.footer{position:absolute;bottom:25px;left:50px;right:50px;display:flex;justify-content:space-between;color:#444;font-size:12px;z-index:1}
</style></head><body>
<div class="hex-bg"></div><div class="glow"></div>
<div class="container">
  <div class="header"><div></div><div class="brand"><span class="brand-text">BUZZ BD AGENT</span><span class="bee">🐝</span></div></div>
  <h1>${SPRINT_TITLE.replace('COMPLETE','<span>COMPLETE</span>')}</h1>
  <div class="subtitle">${SPRINT_SUBTITLE}</div>
  <div class="metrics">
    ${METRICS.map(m => `<div class="metric"><span class="metric-label">${m.label}</span><span class="metric-value" style="color:${m.color}">${m.value}</span></div>`).join('')}
  </div>
</div>
<div class="footer"><span>Built by a chef with zero CS degree</span><span>🐝 buzzbd.ai/report | @BuzzBySolCex</span></div>
</body></html>`);
await new Promise(r => setTimeout(r, 2000));
const buf = await page.screenshot();
const path = await saveScreenshot(buf, "sprint-recap-card.png");
console.log("Saved: " + path);
