#!/usr/bin/env node
/**
 * fetch-immunefi-launchdates.js — durable RECENCY date overlay for the target scorer.
 * (Ogie msg 8278, 2026-06-13: "recency must key off listing-date + scope-last-updated, NOT scan-time").
 *
 * The program-monitor's listing fetch dropped these (launch:null). The Immunefi /bug-bounty/
 * listing page embeds, per program, both "launchDate" (listing date) and "updatedDate"
 * (scope last-updated) in escaped JSON. This pulls the LISTING page only (NOT the per-program
 * asset detail-crawl, which the operator said to leave) and writes a slug->dates overlay the
 * scorer's recency dimension reads.
 *
 * Read-only, public page, no creds. Run daily (cron) before the 05:00 scorer, or ad-hoc.
 *
 * Out: /data/buzz/persistent/reports/scale-monitors/immunefi-launchdates.json
 *      { "<slug>": { "launch": "YYYY-MM-DD", "updated": "YYYY-MM-DD" }, ..., "_fetched_at": ISO }
 */
'use strict';
const https = require('https');
const fs = require('fs');

const URL = 'https://immunefi.com/bug-bounty/';
const OUT = '/data/buzz/persistent/reports/scale-monitors/immunefi-launchdates.json';

function get(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'GET', timeout: 30000, headers: { 'User-Agent': 'buzz-launchdate-fetch' } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
    req.end();
  });
}

function extract(html) {
  const out = {};
  // embedded JSON uses escaped quotes: \"slug\":\"x\" ... \"launchDate\":\"..\" \"updatedDate\":\"..\"
  const re = /\\"slug\\":\\"([^"\\]+)\\"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1];
    const win = html.slice(m.index, m.index + 900);
    const ld = win.match(/\\"launchDate\\":\\"([^"\\]+)\\"/);
    const ud = win.match(/\\"updatedDate\\":\\"([^"\\]+)\\"/);
    if (ld || ud) {
      out[slug] = { launch: ld ? ld[1].slice(0, 10) : null, updated: ud ? ud[1].slice(0, 10) : null };
    }
  }
  return out;
}

(async () => {
  const html = await get(URL);
  if (!html || html.length < 5000) { console.error(`[launchdates] fetch failed (len=${html.length}) — keeping prior overlay`); process.exit(1); }
  const dates = extract(html);
  const n = Object.keys(dates).length;
  if (n < 50) { console.error(`[launchdates] only ${n} parsed — page shape changed? keeping prior overlay`); process.exit(1); }
  dates._fetched_at = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(dates, null, 0));
  console.log(`[launchdates] wrote ${n} slug->dates -> ${OUT}`);
})();
