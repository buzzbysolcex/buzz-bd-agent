// Milestone Card — deployment/achievement announcements
// Customize: MILESTONE_TITLE, MILESTONE_DETAILS, MILESTONE_TAG

const MILESTONE_TITLE = "ARIA v2 DEPLOYED";
const MILESTONE_DETAILS = [
  "4 service modules: discovery, normalizer, filter, enricher",
  "5 REST endpoints behind apiKeyAuth",
  "Multi-source parallel scan (DexScreener + Jupiter + CoinGecko)",
  "BD Sweet Spot filter: $500K-$50M MCap, >$100K liquidity"
];
const MILESTONE_TAG = "SHIPPED";
const MILESTONE_DATE = "March 29, 2026";

const page = await browser.getPage("milestone-card");
await page.setViewportSize({ width: 1200, height: 675 });
await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;600;700&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:#00ff41;font-family:'JetBrains Mono',monospace;width:1200px;height:675px;position:relative;overflow:hidden}body::after{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,65,0.015) 2px,rgba(0,255,65,0.015) 4px);pointer-events:none;z-index:100}.hex-bg{position:absolute;top:0;left:0;width:100%;height:100%;opacity:0.06;background-image:url("data:image/svg+xml,%3Csvg width='60' height='70' viewBox='0 0 60 70' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20V50L30 65L5 50V20z' fill='none' stroke='%2300ff41' stroke-width='0.5'/%3E%3C/svg%3E");pointer-events:none}.glow{position:absolute;top:-80px;right:-80px;width:400px;height:400px;background:radial-gradient(circle,rgba(0,255,136,0.08),transparent 70%);pointer-events:none}.container{padding:40px 50px;position:relative;z-index:1}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.brand{display:flex;align-items:center;gap:12px}.bee{filter:drop-shadow(0 0 20px rgba(0,255,65,0.5))}.brand-text{font-family:'Space Grotesk',sans-serif;font-size:14px;color:#666;letter-spacing:3px;text-transform:uppercase;text-shadow:0 0 10px rgba(0,255,65,0.2)}h1{font-family:'Space Grotesk',sans-serif;font-size:36px;color:#fff;margin-bottom:6px}h1 span{color:#00ff41}.tag{display:inline-block;padding:4px 14px;border-radius:4px;font-size:13px;font-weight:700;margin-bottom:20px}.tag-green{background:rgba(0,255,136,0.15);color:#00ff41;border:1px solid rgba(0,255,136,0.3)}.subtitle{font-size:14px;color:#666;margin-bottom:24px}.details{margin-top:15px}.detail-item{font-size:15px;color:#c8c8d4;line-height:2.2;padding-left:20px;position:relative}.detail-item::before{content:'>';position:absolute;left:0;color:#00ff41}.footer{position:absolute;bottom:25px;left:50px;right:50px;display:flex;justify-content:space-between;color:#444;font-size:11px;z-index:1;border-top:1px solid #1a1a22;background:linear-gradient(180deg,transparent,rgba(0,255,65,0.02))}
</style></head><body>
<div class="hex-bg"></div><div class="glow"></div>
<div class="container">
  <div class="header"><div></div><div class="brand"><span class="brand-text">BUZZ BD AGENT</span><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14/assets/svg/1f41d.svg" class="bee" width="56" height="56"></div></div>
  <span class="tag tag-green">${MILESTONE_TAG}</span>
  <h1>${MILESTONE_TITLE}</h1>
  <div class="subtitle">${MILESTONE_DATE}</div>
  <div class="details">
    ${MILESTONE_DETAILS.map(d => `<div class="detail-item">${d}</div>`).join('')}
  </div>
</div>
<div class="footer"><span>Zero-Human Exchange Listing Company</span><span>🐝 buzzbd.ai/report | @BuzzBySolCex</span></div>
</body></html>`);
await new Promise(r => setTimeout(r, 2000));
const buf = await page.screenshot();
const path = await saveScreenshot(buf, "milestone-card.png");
console.log("Saved: " + path);
