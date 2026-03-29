// Shared BuzzBD card styles — import into all templates
// Usage: const { BASE_CSS } = require('./base-styles');

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background:#0a0a0f;
    color:#00ff88;
    font-family:'JetBrains Mono',monospace;
    width:1200px; height:675px;
    position:relative; overflow:hidden;
  }
  /* Scanline overlay */
  body::after {
    content:''; position:absolute; top:0; left:0;
    width:100%; height:100%;
    background:repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px);
    pointer-events:none; z-index:100;
  }
  /* Hex grid background */
  .hex-bg {
    position:absolute; top:0; left:0;
    width:100%; height:100%; opacity:0.06;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='70' viewBox='0 0 60 70' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20V50L30 65L5 50V20z' fill='none' stroke='%2300ff88' stroke-width='0.5'/%3E%3C/svg%3E");
    pointer-events:none; z-index:0;
  }
  /* Glow effect */
  .glow {
    position:absolute; top:-80px; right:-80px;
    width:400px; height:400px;
    background:radial-gradient(circle,rgba(0,255,136,0.08),transparent 70%);
    pointer-events:none; z-index:0;
  }
  /* Container */
  .container { padding:40px 50px; position:relative; z-index:1; }
  /* Header with bee */
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
  .brand { display:flex; align-items:center; gap:12px; }
  .bee { font-size:48px; filter:drop-shadow(0 0 15px rgba(0,255,136,0.4)); }
  .brand-text { font-family:'Space Grotesk',sans-serif; font-size:14px; color:#666; letter-spacing:2px; text-transform:uppercase; }
  /* Title */
  h1 { font-family:'Space Grotesk',sans-serif; font-size:32px; color:#fff; margin-bottom:6px; }
  h1 span { color:#00ff88; }
  .subtitle { font-size:14px; color:#666; margin-bottom:24px; }
  /* Stat boxes */
  .stats { display:flex; gap:16px; margin-bottom:22px; }
  .stat { background:#0d0d14; border:1px solid #1a1a28; border-radius:8px; padding:14px 18px; text-align:center; flex:1; }
  .stat .num { font-size:26px; font-weight:700; color:#00ff88; line-height:1; }
  .stat .label { font-size:10px; color:#666; margin-top:5px; text-transform:uppercase; letter-spacing:1px; }
  /* Content */
  .content { font-size:14px; color:#c8c8d4; line-height:1.8; margin-bottom:16px; }
  .cta { color:#ff6b6b; font-size:17px; font-weight:700; }
  .accent { color:#00ff88; }
  .cyan { color:#00ccff; }
  .orange { color:#ff6b35; }
  /* Footer */
  .footer {
    position:absolute; bottom:25px; left:50px; right:50px;
    display:flex; justify-content:space-between; color:#444; font-size:12px; z-index:1;
  }
  /* Tag/badge */
  .tag { display:inline-block; padding:3px 10px; border-radius:4px; font-size:11px; font-weight:700; margin-right:8px; }
  .tag-green { background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3); }
  .tag-red { background:rgba(255,68,68,0.15); color:#ff4444; border:1px solid rgba(255,68,68,0.3); }
  .tag-cyan { background:rgba(0,204,255,0.15); color:#00ccff; border:1px solid rgba(0,204,255,0.3); }
  .tag-orange { background:rgba(255,107,53,0.15); color:#ff6b35; border:1px solid rgba(255,107,53,0.3); }
`;

const HEADER_HTML = `
<div class="hex-bg"></div>
<div class="glow"></div>
<div class="container">
  <div class="header">
    <div></div>
    <div class="brand">
      <span class="brand-text">BUZZ BD AGENT</span>
      <span class="bee">🐝</span>
    </div>
  </div>
`;

const FOOTER_HTML = `
</div>
<div class="footer">
  <span>__LEFT__</span>
  <span>🐝 buzzbd.ai/report | @BuzzBySolCex</span>
</div>
`;

module.exports = { BASE_CSS, HEADER_HTML, FOOTER_HTML };
