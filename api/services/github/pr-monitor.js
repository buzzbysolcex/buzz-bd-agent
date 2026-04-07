/**
 * GitHub PR Monitor — Permanent autonomous monitoring
 * Watches tracked PRs/issues for new comments and review requests.
 * Reports to War Room with draft replies. NEVER auto-posts.
 *
 * Feature flag: GITHUB_MONITOR
 * Cron: every 6 hours via dynamic_crons
 * PAT location: /home/claude-code/.env.github
 */

const fs = require('fs');
const { getDB } = require('../../db');
const { feature } = require('../../lib/feature-flags');

function db() { return getDB(); }

// Load PAT from env file (set by server.js startup)
function getPAT() {
  if (process.env.GITHUB_PAT) return process.env.GITHUB_PAT;
  const paths = ['/data/.env.github', '/home/claude-code/.env.github'];
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const envContent = fs.readFileSync(p, 'utf8');
      const match = envContent.match(/GITHUB_PAT=(.+)/);
      if (match) {
        process.env.GITHUB_PAT = match[1].trim();
        return process.env.GITHUB_PAT;
      }
    } catch (e) {}
  }
  return null;
}

/**
 * Initialize github_monitor table (idempotent)
 */
function initGithubMonitor() {
  db().exec(`
    CREATE TABLE IF NOT EXISTS github_monitor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo TEXT NOT NULL,
      pr_number INTEGER NOT NULL,
      last_comment_id INTEGER DEFAULT 0,
      last_checked TEXT,
      tracking_since TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(repo, pr_number)
    );
    CREATE INDEX IF NOT EXISTS idx_gh_monitor_checked ON github_monitor(last_checked);
  `);
}

/**
 * Add a PR/issue to the watch list
 */
function trackPR(repo, prNumber) {
  db().prepare(
    'INSERT OR IGNORE INTO github_monitor (repo, pr_number) VALUES (?, ?)'
  ).run(repo, prNumber);
  return { tracking: `${repo}#${prNumber}` };
}

/**
 * Get all tracked PRs
 */
function getTrackedPRs() {
  return db().prepare('SELECT * FROM github_monitor ORDER BY repo, pr_number').all();
}

/**
 * Fetch issue comments for a PR (issue comments, not review comments)
 */
async function fetchPRComments(repo, prNumber, sinceId = 0) {
  const pat = getPAT();
  if (!pat) return { error: 'no_pat' };

  try {
    const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments?per_page=100`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'BuzzBD-PR-Monitor'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) return { error: `github_api_${res.status}` };

    const comments = await res.json();
    // Filter to comments newer than last seen
    const newComments = comments.filter(c => c.id > sinceId);
    return { ok: true, total: comments.length, new: newComments };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Check all tracked PRs for new activity
 * Returns array of { repo, pr_number, new_comments }
 */
async function checkAllTracked() {
  if (!feature('GITHUB_MONITOR')) return { skipped: true, reason: 'flag_disabled' };

  const tracked = getTrackedPRs();
  const findings = [];

  for (const pr of tracked) {
    const result = await fetchPRComments(pr.repo, pr.pr_number, pr.last_comment_id);

    if (result.error) {
      findings.push({ repo: pr.repo, pr_number: pr.pr_number, error: result.error });
      continue;
    }

    if (result.new.length > 0) {
      // Filter out our own comments (BuzzBySolCex)
      const externalComments = result.new.filter(c =>
        c.user && c.user.login.toLowerCase() !== 'buzzbysolcex'
      );

      if (externalComments.length > 0) {
        findings.push({
          repo: pr.repo,
          pr_number: pr.pr_number,
          new_comments: externalComments.map(c => ({
            id: c.id,
            user: c.user.login,
            created_at: c.created_at,
            body_preview: (c.body || '').slice(0, 300),
            html_url: c.html_url
          }))
        });
      }

      // Update last_comment_id to highest seen (even if from us, to skip next time)
      const maxId = Math.max(...result.new.map(c => c.id));
      db().prepare(
        'UPDATE github_monitor SET last_comment_id = ?, last_checked = datetime(?) WHERE id = ?'
      ).run(maxId, 'now', pr.id);
    } else {
      db().prepare(
        'UPDATE github_monitor SET last_checked = datetime(?) WHERE id = ?'
      ).run('now', pr.id);
    }
  }

  return { ok: true, tracked: tracked.length, findings };
}

/**
 * Format a finding for War Room delivery
 */
function formatForWarRoom(finding) {
  const lines = [`[GITHUB] New activity on ${finding.repo} PR #${finding.pr_number}:`];
  for (const c of finding.new_comments) {
    lines.push(`  - ${c.user} at ${c.created_at}`);
    lines.push(`    "${c.body_preview.slice(0, 200)}..."`);
    lines.push(`    ${c.html_url}`);
  }
  lines.push('Draft reply ready — approve to post?');
  return lines.join('\n');
}

module.exports = {
  initGithubMonitor,
  trackPR,
  getTrackedPRs,
  fetchPRComments,
  checkAllTracked,
  formatForWarRoom,
  getPAT
};
