/**
 * Moltbook PULSE Integration — Platform engagement via tick system
 * Feature-gated: PULSE_MOLTBOOK
 *
 * Actions:
 * - Comment scanner: every ACT tick (check our posts for unanswered comments)
 * - Feed scanner: every 3rd ACT tick (find relevant posts to engage)
 * - Agent discovery: every 5th ACT tick (find complementary agents)
 *
 * Limits: max 5 comments/day, max 2 posts/day, max 3 upvotes/tick
 * All actions logged to observation_log for autoDream review
 */

const { feature } = require("../../lib/feature-flags");
const { getDB } = require("../../db");
const { emit } = require("../events/event-bus");
const mailbox = require("../mailbox/mailbox");

function db() {
  return getDB();
}

const MOLTBOOK_API = "https://www.moltbook.com/api/v1";
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

/**
 * Initialize persistent tables — survives reboots
 */
function initMoltbookPulse() {
  db().exec(`CREATE TABLE IF NOT EXISTS moltbook_engagement_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target_post_id TEXT,
    target_agent TEXT,
    service_promoted INTEGER,
    content TEXT,
    response_code INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db().exec(`CREATE TABLE IF NOT EXISTS moltbook_pulse_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  const seed = db().prepare(
    "INSERT OR IGNORE INTO moltbook_pulse_state (key, value) VALUES (?, ?)",
  );
  seed.run("act_tick_count", "0");
  seed.run("comments_today", "0");
  seed.run("posts_today", "0");
  seed.run("last_comment_check", "");
  seed.run("last_feed_scan", "");
  seed.run("last_agent_scan", "");
  seed.run("daily_reset_date", new Date().toISOString().split("T")[0]);

  console.log("[PULSE_MOLTBOOK] Tables initialized, state persisted");
}

function getState(key) {
  const row = db()
    .prepare("SELECT value FROM moltbook_pulse_state WHERE key = ?")
    .get(key);
  return row ? row.value : null;
}

function setState(key, value) {
  db()
    .prepare(
      "INSERT OR REPLACE INTO moltbook_pulse_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
    )
    .run(key, String(value));
}

function logEngagement(
  action,
  targetPostId,
  targetAgent,
  servicePromoted,
  content,
  responseCode,
) {
  db()
    .prepare(
      "INSERT INTO moltbook_engagement_log (action, target_post_id, target_agent, service_promoted, content, response_code) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      action,
      targetPostId,
      targetAgent,
      servicePromoted,
      content,
      responseCode,
    );
}

const SERVICE_PROMOTION_MAP = {
  token: ["Token Scorer", "MiroFish 10K Sim"],
  scoring: ["Token Scorer", "MiroFish 10K Sim"],
  exchange: ["CEX Gap Analysis", "DeFi Safety Audit"],
  listing: ["CEX Gap Analysis", "DeFi Safety Audit"],
  defi: ["Yield Comparison", "Yield Drop Protection"],
  yield: ["Yield Comparison", "Yield Drop Protection"],
  "smart money": ["Smart Money Tracker"],
  whale: ["Smart Money Tracker"],
  rug: ["PumpFun Creator Intel", "DeFi Safety Audit"],
  scam: ["PumpFun Creator Intel", "DeFi Safety Audit"],
  agent: ["ERC-8004 Reputation", "Full Pipeline"],
  infrastructure: ["ERC-8004 Reputation", "Full Pipeline"],
  trading: ["Score-to-Swap", "Perps Trading"],
  swap: ["Score-to-Swap"],
  lp: ["Meteora LP", "LST Staking"],
  staking: ["LST Staking", "Lending Router"],
  lending: ["Lending Router"],
};

function resetDailyCounters() {
  const today = new Date().toISOString().split("T")[0];
  if (getState("daily_reset_date") !== today) {
    setState("comments_today", "0");
    setState("posts_today", "0");
    setState("daily_reset_date", today);
  }
}

function getDailyCommentCount() {
  return parseInt(getState("comments_today") || "0");
}

async function moltbookFetch(path) {
  const res = await fetch(`${MOLTBOOK_API}${path}`, {
    headers: { Authorization: `Bearer ${MOLTBOOK_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Comment Scanner — check our posts for unanswered comments
 * Runs every ACT tick
 */
async function scanComments() {
  if (!feature("PULSE_MOLTBOOK")) return null;
  resetDailyCounters();
  if (getDailyCommentCount() >= 5)
    return { action: "skip", reason: "daily comment limit (5) reached" };

  try {
    const submolts = [
      "listing-strategy",
      "crypto-history",
      "crypto",
      "general",
    ];
    let newComments = 0;

    for (const submolt of submolts.slice(0, 2)) {
      const data = await moltbookFetch(
        `/submolts/${submolt}/posts?sort=new&limit=5`,
      );
      if (!data || !data.posts) continue;

      for (const post of data.posts) {
        if (
          post.comment_count > 0 &&
          post.author_id === "c606278b-365f-473e-9203-3a517042a641"
        ) {
          newComments += post.comment_count;
        }
      }
    }

    if (newComments > 0) {
      mailbox.send("pulse-moltbook", "war-room-reporter", "ALERT", {
        type: "MOLTBOOK_COMMENTS",
        count: newComments,
        message: `${newComments} unanswered comments on Moltbook posts`,
      });
      emit("pulse-moltbook", "moltbook.comment.new", { count: newComments });
    }

    return { action: "comment_scan", comments_found: newComments };
  } catch (err) {
    return { action: "comment_scan", error: err.message };
  }
}

/**
 * Feed Scanner — find relevant posts to engage with
 * Runs every 3rd ACT tick
 */
async function scanFeeds(tickCount) {
  if (!feature("PULSE_MOLTBOOK")) return null;
  if (tickCount % 3 !== 0) return null;
  resetDailyCounters();
  if (getDailyCommentCount() >= 5) return null;

  try {
    const feeds = ["general", "crypto", "agents"];
    let relevant = [];

    for (const submolt of feeds) {
      const data = await moltbookFetch(
        `/posts?submolt=${submolt}&sort=new&limit=10`,
      );
      if (!data || !data.posts) continue;

      for (const post of data.posts) {
        if (post.author_id === "c606278b-365f-473e-9203-3a517042a641") continue;
        const content = (post.title + " " + (post.content || "")).toLowerCase();

        for (const [keyword, services] of Object.entries(
          SERVICE_PROMOTION_MAP,
        )) {
          if (content.includes(keyword)) {
            relevant.push({
              post_id: post.id,
              title: post.title,
              submolt,
              matched_keyword: keyword,
              services,
            });
            break;
          }
        }
      }
    }

    if (relevant.length > 0) {
      mailbox.send("pulse-moltbook", "war-room-reporter", "EVENT", {
        type: "MOLTBOOK_RELEVANT_POSTS",
        count: relevant.length,
        posts: relevant.slice(0, 3),
        message: `${relevant.length} relevant Moltbook posts found for service promotion`,
      });
      emit("pulse-moltbook", "moltbook.service.promoted", {
        count: relevant.length,
      });
    }

    return { action: "feed_scan", relevant_found: relevant.length };
  } catch (err) {
    return { action: "feed_scan", error: err.message };
  }
}

/**
 * Agent Discovery — find complementary agents on Moltbook
 * Runs every 5th ACT tick
 */
async function discoverAgents(tickCount) {
  if (!feature("PULSE_MOLTBOOK")) return null;
  if (tickCount % 5 !== 0) return null;

  try {
    const data = await moltbookFetch("/posts?submolt=agents&sort=new&limit=10");
    if (!data || !data.posts) return { action: "agent_discovery", found: 0 };

    let agents = [];
    for (const post of data.posts) {
      if (post.author_id === "c606278b-365f-473e-9203-3a517042a641") continue;
      const content = (post.title + " " + (post.content || "")).toLowerCase();
      if (
        content.includes("agent") ||
        content.includes("autonomous") ||
        content.includes("ai")
      ) {
        agents.push({
          post_id: post.id,
          title: post.title,
          author: post.author?.name || "unknown",
        });
      }
    }

    if (agents.length > 0) {
      emit("pulse-moltbook", "moltbook.agent.found", {
        count: agents.length,
        agents: agents.slice(0, 3),
      });
    }

    return { action: "agent_discovery", found: agents.length };
  } catch (err) {
    return { action: "agent_discovery", error: err.message };
  }
}

/**
 * Run all Moltbook PULSE actions for a given tick
 */
async function runMoltbookTick(tickCount) {
  if (!feature("PULSE_MOLTBOOK")) return null;

  const results = {};
  results.comments = await scanComments();
  results.feeds = await scanFeeds(tickCount);
  results.agents = await discoverAgents(tickCount);

  return results;
}

module.exports = {
  initMoltbookPulse,
  runMoltbookTick,
  scanComments,
  scanFeeds,
  discoverAgents,
};
