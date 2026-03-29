// Score Card — token scores + pipeline stats
// Usage: dev-browser --headless --timeout 15 < scripts/tweet-card-templates/score-card.js
// Customize: TOKENS, STATS before running

const TITLE = "BUZZ SCORING ENGINE";
const SUBTITLE = "Week 6 Intelligence Report";
const TOKENS = "$SAT 68 · PIPPIN 63 · VELO 60 · TRUMP 56 · BANANAS31 55";
const STATS = [
  { num: "256", label: "Tokens Scored" },
  { num: "0", label: "HOT (85+)" },
  { num: "29", label: "Intel Sources" },
  { num: "$125", label: "Signal Revenue" },
  { num: "7", label: "Day Streak" }
];

const page = await browser.getPage("score-card");
await page.setViewportSize({ width: 1200, height: 675 });
await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;600;700&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:#00ff41;font-family:'JetBrains Mono',monospace;width:1200px;height:675px;position:relative;overflow:hidden}body::after{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,65,0.015) 2px,rgba(0,255,65,0.015) 4px);pointer-events:none;z-index:100}.hex-bg{position:absolute;top:0;left:0;width:100%;height:100%;opacity:0.06;background-image:url("data:image/svg+xml,%3Csvg width='60' height='70' viewBox='0 0 60 70' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20V50L30 65L5 50V20z' fill='none' stroke='%2300ff41' stroke-width='0.5'/%3E%3C/svg%3E");pointer-events:none;z-index:0}.glow{position:absolute;top:-80px;right:-80px;width:400px;height:400px;background:radial-gradient(circle,rgba(0,255,136,0.08),transparent 70%);pointer-events:none}.container{padding:40px 50px;position:relative;z-index:1}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.brand{display:flex;align-items:center;gap:12px}.bee{filter:drop-shadow(0 0 20px rgba(0,255,65,0.5))}.brand-text{font-family:'Space Grotesk',sans-serif;font-size:14px;color:#666;letter-spacing:3px;text-transform:uppercase;text-shadow:0 0 10px rgba(0,255,65,0.2)}h1{font-family:'Space Grotesk',sans-serif;font-size:32px;color:#fff;margin-bottom:6px}h1 span{color:#00ff41}.subtitle{font-size:14px;color:#666;margin-bottom:24px}.stats{display:flex;gap:16px;margin-bottom:22px}.stat{background:#0d0d14;border:1px solid #1a1a28;border-radius:8px;padding:14px 18px;box-shadow:0 0 12px rgba(0,255,65,0.08);text-align:center;flex:1}.stat .num{font-size:26px;font-weight:700;color:#00ff41;line-height:1;text-shadow:0 0 20px rgba(0,255,65,0.3)}.stat .label{font-size:10px;color:#666;margin-top:5px;text-transform:uppercase;letter-spacing:1px}.content{font-size:14px;color:#c8c8d4;line-height:1.8;margin-bottom:16px}.cta{color:#ff6b6b;font-size:17px;font-weight:700}.footer{position:absolute;bottom:25px;left:50px;right:50px;display:flex;justify-content:space-between;color:#444;font-size:11px;z-index:1;border-top:1px solid #1a1a22;background:linear-gradient(180deg,transparent,rgba(0,255,65,0.02))}
</style></head><body>
<div class="hex-bg"></div><div class="glow"></div>
<div class="container">
  <div class="header"><div></div><div class="brand"><span class="brand-text">BUZZ BD AGENT</span><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14/assets/svg/1f41d.svg" class="bee" width="56" height="56"></div></div>
  <h1>${TITLE.replace('SCORING ENGINE','<span>SCORING ENGINE</span>')}</h1>
  <div class="subtitle">${SUBTITLE}</div>
  <div class="stats">${STATS.map(s => `<div class="stat"><div class="num">${s.num}</div><div class="label">${s.label}</div></div>`).join('')}</div>
  <div class="content" style="margin-bottom:10px">Top 5: ${TOKENS}</div>
  <div style="display:flex;gap:20px;margin-bottom:14px;font-size:12px">
    <div style="flex:1;background:#0d0d14;border:1px solid #1a1a28;border-radius:6px;padding:10px 14px">
      <div style="color:#666;margin-bottom:6px;font-size:10px;letter-spacing:1px;text-transform:uppercase">Dual-Gate Verification</div>
      <div style="color:#00ff41">Fundamentals ≥ 42/70 AND Market ≥ 18/30</div>
    </div>
    <div style="flex:1;background:#0d0d14;border:1px solid #1a1a28;border-radius:6px;padding:10px 14px">
      <div style="color:#666;margin-bottom:6px;font-size:10px;letter-spacing:1px;text-transform:uppercase">8 Screening Rules</div>
      <div style="color:#c0c0c0">FDV gap · Honeypot · Liquidity · Stablecoin · Phantom · Security</div>
    </div>
  </div>
  <div class="cta">If your project scores 70+, we want to talk.</div>
</div>
<div class="footer"><span>ScoreStorage: 0xbf81...388Fb (Base) · Tri-source verified</span><span>buzzbd.ai/report | @BuzzBySolCex</span></div>
</body></html>`);
await new Promise(r => setTimeout(r, 2000));
const buf = await page.screenshot();
const path = await saveScreenshot(buf, "score-card.png");
console.log("Saved: " + path);
