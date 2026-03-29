// Shared BuzzBD card styles — EXACT match to buzzbd.ai
// Colors: --g:#00ff41, --bg:#0a0a0f, --card:#111118, --border:#1a1a22
// Font: JetBrains Mono (Google Fonts)

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  :root { --g:#00ff41; --bg:#0a0a0f; --card:#111118; --border:#1a1a22; --y:#ffaa00; --r:#ff0040; --b:#4488ff; }
  body {
    background: var(--bg);
    color: #c0c0c0;
    font-family: 'JetBrains Mono', monospace;
    width: 1200px; height: 675px;
    position: relative; overflow: hidden;
  }
  /* Scanline — EXACT from buzzbd.ai */
  body::after {
    content: ''; position: fixed; top: 0; left: 0;
    width: 100%; height: 100%; pointer-events: none;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px);
    z-index: 9999;
  }
  /* Hex grid — matched to buzzbd.ai proposal page */
  .hex-bg {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%; opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='70' viewBox='0 0 60 70' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20V50L30 65L5 50V20z' fill='none' stroke='%2300ff41' stroke-width='0.5'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0;
  }
  /* Glow orb */
  .glow {
    position: absolute; top: -100px; right: -100px;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(0,255,65,0.06), transparent 70%);
    pointer-events: none; z-index: 0;
  }
  /* Container */
  .container { padding: 40px 50px; position: relative; z-index: 1; height: 100%; }
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .bee { font-size: 56px; filter: drop-shadow(0 0 20px rgba(0,255,65,0.5)); }
  .brand-text { font-size: 13px; color: #666; letter-spacing: 3px; text-transform: uppercase; text-shadow: 0 0 10px rgba(0,255,65,0.2); }
  /* Titles */
  h1 { font-size: 30px; color: var(--g); letter-spacing: 3px; font-weight: 700; text-shadow: 0 0 30px rgba(0,255,65,0.15); margin-bottom: 4px; }
  h1 .white { color: #fff; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 22px; letter-spacing: 1px; }
  /* Stat boxes — GLOW */
  .stats { display: flex; gap: 14px; margin-bottom: 20px; }
  .stat {
    background: var(--card); border: 1px solid var(--border); border-radius: 8px;
    padding: 14px 16px; text-align: center; flex: 1;
    box-shadow: 0 0 12px rgba(0,255,65,0.08);
    transition: border-color 0.2s;
  }
  .stat:hover { border-color: var(--g); }
  .stat .num { font-size: 26px; font-weight: 700; color: var(--g); line-height: 1; text-shadow: 0 0 20px rgba(0,255,65,0.3); }
  .stat .label { font-size: 9px; color: #666; margin-top: 5px; text-transform: uppercase; letter-spacing: 1.5px; }
  /* Content */
  .content { font-size: 14px; color: #c0c0c0; line-height: 1.7; margin-bottom: 14px; }
  .cta { color: var(--r); font-size: 16px; font-weight: 700; text-shadow: 0 0 15px rgba(255,0,64,0.2); }
  /* Tags */
  .tag { display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 600; margin-right: 6px; }
  .tag-live { background: #003300; color: var(--g); }
  .tag-warn { background: #332200; color: var(--y); }
  .tag-alert { background: #330000; color: var(--r); }
  .tag-info { background: #001133; color: var(--b); }
  /* Footer bar — gradient top border */
  .footer {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 12px 50px; display: flex; justify-content: space-between;
    color: #444; font-size: 11px; z-index: 1;
    border-top: 1px solid var(--border);
    background: linear-gradient(180deg, transparent, rgba(0,255,65,0.02));
  }
  /* Table */
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 12px; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
  td { padding: 8px 12px; font-size: 13px; color: #c0c0c0; border-bottom: 1px solid #0d0d14; }
  /* Metrics grid */
  .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 40px; }
  .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .metric-label { font-size: 13px; color: #888; }
  .metric-value { font-size: 13px; font-weight: 700; }
  /* Detail items */
  .detail-item { font-size: 14px; color: #c0c0c0; line-height: 2; padding-left: 20px; position: relative; }
  .detail-item::before { content: '>'; position: absolute; left: 0; color: var(--g); }
  /* Signal header */
  .signal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .signal-num { font-size: 13px; color: #666; }
  .body { font-size: 15px; color: #c0c0c0; line-height: 1.7; max-width: 900px; margin-bottom: 20px; }
  .source { font-size: 12px; color: #444; }
`;

module.exports = { BASE_CSS };
