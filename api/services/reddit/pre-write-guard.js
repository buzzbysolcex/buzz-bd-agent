/**
 * Reddit pre-write guard — §5.9 of v3.1-FINAL.
 *
 * Before any Reddit comment/post is written, this guard checks:
 *   1. brand-adjacency (against /data/config/reddit-brand-keywords.json)
 *   2. 30-day rolling brand-adjacent ratio on the account
 *      — personal accounts: hard cap 10%
 *      — brand accounts:    hard cap 5%
 *   3. karma floor per subreddit (§5.9.3 defaults here;
 *      overridable via subreddit-rules digest)
 *   4. subreddit rules digest: exists + mtime ≤ 90 days
 *
 * Returns { allow, reasons, brand_flagged, ratio_30d, projected_ratio,
 *           karma_floor, digest_age_days, digest_path, digest_hash }
 *
 * This module only READS reddit_action — it never writes. Callers log
 * the action after the Reddit API call returns, using the schema from
 * migration 030.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getDB } = require("../../db");

const BRAND_KEYS_PATHS = [
  "/data/config/reddit-brand-keywords.json",
  "/data/buzz/persistent/config/reddit-brand-keywords.json",
];

const DIGEST_DIRS = ["/data/directives", "/data/buzz/persistent/directives"];

const DIGEST_FRESH_DAYS = 90;
const BRAND_ACCOUNTS = new Set([
  "u/BuzzBySolCex",
  "u/BuzzShield",
  "u/SkillBTC",
]);
const PERSONAL_RATIO_CAP = 0.1; // 10%
const BRAND_RATIO_CAP = 0.05; // 5%
const DEFAULT_KARMA_FLOOR = 50;

let _brandCache = null;
let _brandCacheMtime = 0;

function loadBrandKeywords() {
  for (const p of BRAND_KEYS_PATHS) {
    try {
      const stat = fs.statSync(p);
      if (_brandCache && stat.mtimeMs === _brandCacheMtime) return _brandCache;
      const raw = fs.readFileSync(p, "utf8");
      _brandCache = JSON.parse(raw);
      _brandCacheMtime = stat.mtimeMs;
      return _brandCache;
    } catch {
      /* try next */
    }
  }
  return null;
}

function detectBrandMention(content, kw) {
  if (!content || !kw) return { flagged: false, terms: [] };
  const low = content.toLowerCase();
  const hits = [];

  for (const t of kw.brand_terms || []) {
    if (t && low.includes(String(t).toLowerCase())) hits.push(t);
  }
  for (const u of kw.brand_urls || []) {
    if (u && low.includes(String(u).toLowerCase())) hits.push(u);
  }
  for (const p of kw.brand_phrases || []) {
    if (p && low.includes(String(p).toLowerCase())) hits.push(p);
  }
  return { flagged: hits.length > 0, terms: Array.from(new Set(hits)) };
}

function rolling30dRatio(db, account_handle, includeNewAction) {
  // Count brand-adjacent / total for the account in the last 30 days.
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(COALESCE(contains_brand_mention, 0)) AS brand
       FROM reddit_action
       WHERE account_handle = ?
         AND posted_timestamp >= datetime('now', '-30 days')`,
    )
    .get(account_handle);

  const total = (row && row.total) || 0;
  const brand = (row && row.brand) || 0;

  const total1 = total + 1;
  const brand1 = brand + (includeNewAction ? 1 : 0);
  return {
    existing: total === 0 ? 0 : brand / total,
    projected: brand1 / total1,
    counts: { total, brand },
  };
}

function findDigest(subreddit) {
  const safe = String(subreddit || "").replace(/[^\w-]/g, "_");
  for (const d of DIGEST_DIRS) {
    const p = path.join(d, `subreddit-rules-${safe}.md`);
    try {
      const stat = fs.statSync(p);
      const raw = fs.readFileSync(p, "utf8");
      const hash = crypto
        .createHash("sha256")
        .update(raw)
        .digest("hex")
        .slice(0, 16);
      const ageMs = Date.now() - stat.mtimeMs;
      return { path: p, ageDays: ageMs / (1000 * 60 * 60 * 24), hash };
    } catch {
      /* try next */
    }
  }
  return null;
}

function defaultKarmaFloor(subreddit) {
  const map = {
    "r/solana": 100,
    "r/cryptocurrency": 100,
    "r/localllama": 50,
    "r/claudeai": 25,
  };
  return map[String(subreddit || "").toLowerCase()] ?? DEFAULT_KARMA_FLOOR;
}

function checkWriteAllowed({
  account_handle,
  subreddit,
  content,
  action_type = "comment",
  current_karma = 0,
  deps = {},
} = {}) {
  const db = deps.db || getDB();
  const reasons = [];
  let allow = true;

  if (!account_handle) {
    return { allow: false, reasons: ["missing_account_handle"] };
  }
  if (!subreddit) {
    return { allow: false, reasons: ["missing_subreddit"] };
  }

  const kw = loadBrandKeywords();
  if (!kw) {
    return { allow: false, reasons: ["no_brand_keyword_config"] };
  }

  const brand = detectBrandMention(content, kw);

  const ratio = rolling30dRatio(db, account_handle, brand.flagged);

  const isBrandAccount = BRAND_ACCOUNTS.has(account_handle);
  const cap = isBrandAccount ? BRAND_RATIO_CAP : PERSONAL_RATIO_CAP;
  if (brand.flagged && ratio.projected > cap) {
    allow = false;
    reasons.push(
      `brand_ratio_exceeded:projected=${ratio.projected.toFixed(3)} cap=${cap}`,
    );
  }

  const karmaFloor = defaultKarmaFloor(subreddit);
  if (typeof current_karma === "number" && current_karma < karmaFloor) {
    allow = false;
    reasons.push(
      `karma_below_floor:karma=${current_karma} floor=${karmaFloor}`,
    );
  }

  const dig = findDigest(subreddit);
  if (!dig) {
    allow = false;
    reasons.push(`missing_subreddit_digest:${subreddit}`);
  } else if (dig.ageDays > DIGEST_FRESH_DAYS) {
    allow = false;
    reasons.push(
      `stale_subreddit_digest:age=${dig.ageDays.toFixed(1)}d max=${DIGEST_FRESH_DAYS}d`,
    );
  }

  return {
    allow,
    reasons,
    brand_flagged: brand.flagged,
    brand_terms: brand.terms,
    ratio_30d: ratio.existing,
    projected_ratio: ratio.projected,
    counts_30d: ratio.counts,
    cap,
    is_brand_account: isBrandAccount,
    karma_floor: karmaFloor,
    current_karma,
    digest_age_days: dig ? dig.ageDays : null,
    digest_path: dig ? dig.path : null,
    digest_hash: dig ? dig.hash : null,
    action_type,
  };
}

module.exports = {
  checkWriteAllowed,
  detectBrandMention,
  rolling30dRatio,
  findDigest,
  defaultKarmaFloor,
  loadBrandKeywords,
  _testOverridePaths(brandPaths, digestDirs) {
    // For tests only.
    if (Array.isArray(brandPaths)) {
      BRAND_KEYS_PATHS.length = 0;
      BRAND_KEYS_PATHS.push(...brandPaths);
    }
    if (Array.isArray(digestDirs)) {
      DIGEST_DIRS.length = 0;
      DIGEST_DIRS.push(...digestDirs);
    }
    _brandCache = null;
    _brandCacheMtime = 0;
  },
};
