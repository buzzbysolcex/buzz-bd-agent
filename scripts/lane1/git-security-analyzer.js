#!/usr/bin/env node
/**
 * BuzzShield Lane1 — Git Security Analyzer
 *
 * Pashov ADOPT A1 (per brain/Competitive-Intel.md 2026-05-23, Ogie msg 7589 item 5).
 * Mirrors Pashov skills `x-ray/scripts/analyze_git_security.py` 7-section output, but
 * implemented as Node (consistent with Buzz lane1/scripts/v6 toolchain — no Python
 * dependency added).
 *
 * Emits a 7-section JSON describing the git-history attack-surface dimension of a
 * scan target. Output feeds Standing-Intake Protocol Step 5 Gate 1 surface map +
 * audit-methodology-v2 Layer 0 (pre-Layer-1).
 *
 * Sections:
 *   1. fix_candidates           — commits with security/hotfix/CVE keywords + file diffs
 *   2. dangerous_area_changes   — commits touching critical-region files (mint/burn/migrate/...)
 *   3. late_changes             — commits in last 30 days touching critical-region files
 *   4. audit_age                — audits/ dir mtime vs HEAD commit time, days-since
 *   5. untouched_critical       — critical-region files with no commits in 90+ days
 *   6. revert_history           — commits with "Revert" in message
 *   7. author_distribution      — top 10 authors by commit count + LOC change
 *
 * USAGE:
 *   node git-security-analyzer.js <repo-path> [--output <json-path>] [--max-commits N]
 *
 * @version 1.0 — 2026-05-23 (Pashov ADOPT A1 wire-in, brain sovereign)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ============================================================================
// CONFIG
// ============================================================================

const FIX_KEYWORDS = /\b(fix|patch|hotfix|security|cve|vuln|exploit|bug|audit|disclos)/i;
const DANGEROUS_AREA_REGEX = /(mint|burn|migrate|upgradeTo|setOwner|setAdmin|setCurator|delegateCall|delegatecall|selfdestruct|emergency|pause|init|withdraw|liquidate|swap|borrow|repay|deposit)/i;
const REVERT_REGEX = /^Revert\b|"Revert\b/i;
const LATE_CHANGE_WINDOW_DAYS = 30;
const UNTOUCHED_THRESHOLD_DAYS = 90;
const DEFAULT_MAX_COMMITS = 5000;
const MAX_FILE_DIFFS_PER_COMMIT = 20;

// ============================================================================
// GIT HELPERS
// ============================================================================

function git(repo, args) {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
  } catch (e) {
    return '';
  }
}

function isGitRepo(repo) {
  const out = git(repo, ['rev-parse', '--git-dir']);
  return out.trim().length > 0;
}

function daysBetween(tsA, tsB) {
  return Math.round((tsA - tsB) / 86400);
}

function nowEpoch() {
  return Math.floor(Date.now() / 1000);
}

// ============================================================================
// SECTION 1 — fix_candidates
// ============================================================================

function extractFixCandidates(repo, maxCommits) {
  const log = git(repo, [
    'log',
    `-${maxCommits}`,
    '--pretty=format:%H%x09%at%x09%an%x09%s',
  ]).trim();

  if (!log) return [];

  const candidates = [];
  for (const line of log.split('\n')) {
    const [sha, ts, author, ...subjectParts] = line.split('\t');
    const subject = subjectParts.join('\t');
    if (!sha || !FIX_KEYWORDS.test(subject)) continue;

    // Get list of files changed (truncate diff body — too large)
    const filesRaw = git(repo, [
      'show',
      '--stat',
      '--format=',
      '--name-only',
      sha,
    ]).trim();
    const files = filesRaw.split('\n').filter(Boolean).slice(0, MAX_FILE_DIFFS_PER_COMMIT);

    candidates.push({
      sha,
      ts: parseInt(ts, 10),
      iso: new Date(parseInt(ts, 10) * 1000).toISOString(),
      author,
      subject: subject.slice(0, 200),
      files,
      file_count: files.length,
      touches_dangerous: files.some((f) => DANGEROUS_AREA_REGEX.test(f)),
    });
  }
  return candidates;
}

// ============================================================================
// SECTION 2 — dangerous_area_changes
// ============================================================================

function extractDangerousAreaChanges(repo, maxCommits) {
  const log = git(repo, [
    'log',
    `-${maxCommits}`,
    '--pretty=format:%H%x09%at%x09%an%x09%s',
    '--name-only',
  ]).trim();

  if (!log) return [];

  // Parse commits + their files (git log --name-only intersperses)
  const commits = [];
  let current = null;
  for (const line of log.split('\n')) {
    if (line.includes('\t')) {
      // Header line
      if (current) commits.push(current);
      const [sha, ts, author, ...subj] = line.split('\t');
      current = {
        sha,
        ts: parseInt(ts, 10),
        author,
        subject: subj.join('\t').slice(0, 200),
        files: [],
      };
    } else if (line.trim() && current) {
      current.files.push(line.trim());
    }
  }
  if (current) commits.push(current);

  // Filter to commits that touched a dangerous-area filename
  return commits
    .filter((c) =>
      c.files.some((f) => DANGEROUS_AREA_REGEX.test(f) && /\.(sol|rs|vy|cairo|move|go)$/i.test(f))
    )
    .map((c) => ({
      sha: c.sha,
      iso: new Date(c.ts * 1000).toISOString(),
      author: c.author,
      subject: c.subject,
      dangerous_files: c.files.filter(
        (f) => DANGEROUS_AREA_REGEX.test(f) && /\.(sol|rs|vy|cairo|move|go)$/i.test(f)
      ).slice(0, MAX_FILE_DIFFS_PER_COMMIT),
    }))
    .slice(0, 200);
}

// ============================================================================
// SECTION 3 — late_changes (window: LATE_CHANGE_WINDOW_DAYS)
// ============================================================================

function extractLateChanges(repo, dangerousAreaChanges) {
  const cutoff = nowEpoch() - LATE_CHANGE_WINDOW_DAYS * 86400;
  return dangerousAreaChanges
    .filter((c) => {
      const ts = Math.floor(new Date(c.iso).getTime() / 1000);
      return ts >= cutoff;
    })
    .map((c) => ({ ...c, days_ago: daysBetween(nowEpoch(), Math.floor(new Date(c.iso).getTime() / 1000)) }));
}

// ============================================================================
// SECTION 4 — audit_age
// ============================================================================

function extractAuditAge(repo) {
  // SSV Network Gate 1 2026-05-25 surfaced audit_age.present:false on SSV repo
  // because audits live at contracts/audits/ not root audits/. Ogie msg 7736
  // approved fallback walk across common nested locations.
  const auditPaths = [
    'audits', 'audit', 'Audits', 'audits/',
    'contracts/audits', 'contracts/audit',
    'audit-reports', 'audit_reports', 'audits-reports',
    'docs/audits', 'docs/audit',
    'security/audits', 'security/audit',
    'reports/audits', 'reports/audit',
  ];
  let auditDir = null;
  for (const p of auditPaths) {
    const full = path.join(repo, p);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      auditDir = full;
      break;
    }
  }
  if (!auditDir) {
    return { present: false, reason: 'no audits/ directory found (searched: audits, contracts/audits, docs/audits, security/audits, reports/audits, audit-reports)' };
  }

  // Walk dir, find most recent file mtime
  let newestMtime = 0;
  let newestFile = null;
  const files = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const st = fs.statSync(full);
        files.push({ path: full, mtime: st.mtimeMs / 1000 });
        if (st.mtimeMs / 1000 > newestMtime) {
          newestMtime = st.mtimeMs / 1000;
          newestFile = full;
        }
      }
    }
  }
  walk(auditDir);

  const headTsRaw = git(repo, ['log', '-1', '--pretty=format:%at']).trim();
  const headTs = parseInt(headTsRaw, 10) || nowEpoch();

  const filesSorted = files
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 10)
    .map((f) => ({
      relpath: path.relative(repo, f.path),
      iso: new Date(f.mtime * 1000).toISOString(),
      days_old: daysBetween(nowEpoch(), f.mtime),
    }));

  return {
    present: true,
    audit_dir: path.relative(repo, auditDir),
    file_count: files.length,
    newest_audit_file: newestFile ? path.relative(repo, newestFile) : null,
    newest_audit_iso: newestFile ? new Date(newestMtime * 1000).toISOString() : null,
    head_commit_iso: new Date(headTs * 1000).toISOString(),
    days_since_newest_audit: newestFile ? daysBetween(nowEpoch(), newestMtime) : null,
    days_between_newest_audit_and_head: newestFile ? daysBetween(headTs, newestMtime) : null,
    recent_audit_files: filesSorted,
  };
}

// ============================================================================
// SECTION 5 — untouched_critical
// ============================================================================

function extractUntouchedCritical(repo) {
  // Find all *.sol|*.rs|*.vy|*.cairo|*.move|*.go files matching dangerous-area filename
  const filesRaw = git(repo, ['ls-files']).trim();
  if (!filesRaw) return [];
  const candidates = filesRaw
    .split('\n')
    .filter((f) => DANGEROUS_AREA_REGEX.test(f) && /\.(sol|rs|vy|cairo|move|go)$/i.test(f));

  const cutoff = nowEpoch() - UNTOUCHED_THRESHOLD_DAYS * 86400;
  const untouched = [];
  for (const f of candidates) {
    const lastTouchRaw = git(repo, ['log', '-1', '--pretty=format:%at', '--', f]).trim();
    const lastTouch = parseInt(lastTouchRaw, 10);
    if (!lastTouch) continue;
    if (lastTouch < cutoff) {
      untouched.push({
        file: f,
        last_touch_iso: new Date(lastTouch * 1000).toISOString(),
        days_untouched: daysBetween(nowEpoch(), lastTouch),
      });
    }
  }
  return untouched
    .sort((a, b) => b.days_untouched - a.days_untouched)
    .slice(0, 50);
}

// ============================================================================
// SECTION 6 — revert_history
// ============================================================================

function extractRevertHistory(repo, maxCommits) {
  const log = git(repo, [
    'log',
    `-${maxCommits}`,
    '--pretty=format:%H%x09%at%x09%an%x09%s',
  ]).trim();
  if (!log) return [];

  const reverts = [];
  for (const line of log.split('\n')) {
    const [sha, ts, author, ...subjectParts] = line.split('\t');
    const subject = subjectParts.join('\t');
    if (!sha || !REVERT_REGEX.test(subject)) continue;
    reverts.push({
      sha,
      iso: new Date(parseInt(ts, 10) * 1000).toISOString(),
      author,
      subject: subject.slice(0, 200),
    });
  }
  return reverts.slice(0, 100);
}

// ============================================================================
// SECTION 7 — author_distribution
// ============================================================================

function extractAuthorDistribution(repo, maxCommits) {
  const log = git(repo, [
    'log',
    `-${maxCommits}`,
    '--pretty=format:%an',
  ]).trim();
  if (!log) return [];

  const counts = new Map();
  for (const author of log.split('\n')) {
    if (!author) continue;
    counts.set(author, (counts.get(author) || 0) + 1);
  }

  // Get LOC changes per author via shortlog
  const locByAuthor = new Map();
  const shortlog = git(repo, ['log', `-${maxCommits}`, '--numstat', '--pretty=format:__AUTHOR__%an']).trim();
  if (shortlog) {
    let curAuthor = null;
    let curIns = 0;
    let curDel = 0;
    const flush = () => {
      if (curAuthor) {
        const prev = locByAuthor.get(curAuthor) || { insertions: 0, deletions: 0 };
        locByAuthor.set(curAuthor, {
          insertions: prev.insertions + curIns,
          deletions: prev.deletions + curDel,
        });
      }
      curIns = 0;
      curDel = 0;
    };
    for (const line of shortlog.split('\n')) {
      if (line.startsWith('__AUTHOR__')) {
        flush();
        curAuthor = line.slice('__AUTHOR__'.length);
      } else if (/^\d+\t\d+\t/.test(line)) {
        const [ins, del] = line.split('\t');
        curIns += parseInt(ins, 10) || 0;
        curDel += parseInt(del, 10) || 0;
      }
    }
    flush();
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([author, commit_count]) => ({
      author,
      commit_count,
      insertions: (locByAuthor.get(author) || {}).insertions || 0,
      deletions: (locByAuthor.get(author) || {}).deletions || 0,
    }));
}

// ============================================================================
// MAIN
// ============================================================================

function analyze(repo, opts) {
  if (!fs.existsSync(repo)) {
    throw new Error(`repo path does not exist: ${repo}`);
  }
  if (!isGitRepo(repo)) {
    throw new Error(`not a git repo: ${repo}`);
  }

  const maxCommits = opts.maxCommits || DEFAULT_MAX_COMMITS;

  const headSha = git(repo, ['rev-parse', 'HEAD']).trim();
  const headTsRaw = git(repo, ['log', '-1', '--pretty=format:%at']).trim();
  const headIso = new Date(parseInt(headTsRaw, 10) * 1000).toISOString();
  const totalCommitsRaw = git(repo, ['rev-list', '--count', 'HEAD']).trim();
  const totalCommits = parseInt(totalCommitsRaw, 10) || 0;

  const fix_candidates = extractFixCandidates(repo, maxCommits);
  const dangerous_area_changes = extractDangerousAreaChanges(repo, maxCommits);
  const late_changes = extractLateChanges(repo, dangerous_area_changes);
  const audit_age = extractAuditAge(repo);
  const untouched_critical = extractUntouchedCritical(repo);
  const revert_history = extractRevertHistory(repo, maxCommits);
  const author_distribution = extractAuthorDistribution(repo, maxCommits);

  return {
    schema: 'buzz-git-security-analyzer-v1',
    generated_at: new Date().toISOString(),
    repo: path.resolve(repo),
    head_sha: headSha,
    head_iso: headIso,
    total_commits: totalCommits,
    commits_analyzed: Math.min(totalCommits, maxCommits),
    sections: {
      fix_candidates: {
        count: fix_candidates.length,
        items: fix_candidates,
      },
      dangerous_area_changes: {
        count: dangerous_area_changes.length,
        items: dangerous_area_changes,
      },
      late_changes: {
        count: late_changes.length,
        window_days: LATE_CHANGE_WINDOW_DAYS,
        items: late_changes,
      },
      audit_age,
      untouched_critical: {
        count: untouched_critical.length,
        threshold_days: UNTOUCHED_THRESHOLD_DAYS,
        items: untouched_critical,
      },
      revert_history: {
        count: revert_history.length,
        items: revert_history,
      },
      author_distribution: {
        count: author_distribution.length,
        items: author_distribution,
      },
    },
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--output' || a === '-o') {
      args.output = argv[++i];
    } else if (a === '--max-commits') {
      args.maxCommits = parseInt(argv[++i], 10);
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function usage() {
  process.stderr.write(
    `Usage: git-security-analyzer.js <repo-path> [--output <json-path>] [--max-commits N]\n` +
    `\n` +
    `Emits 7-section JSON for git-history attack-surface analysis.\n` +
    `Sections: fix_candidates, dangerous_area_changes, late_changes, audit_age,\n` +
    `          untouched_critical, revert_history, author_distribution\n`
  );
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || args._.length < 1) {
    usage();
    process.exit(args.help ? 0 : 2);
  }
  const repo = args._[0];

  let result;
  try {
    result = analyze(repo, { maxCommits: args.maxCommits });
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    process.exit(1);
  }

  const out = JSON.stringify(result, null, 2);

  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, out);
    process.stderr.write(`wrote ${args.output} (${out.length} bytes)\n`);
  } else {
    process.stdout.write(out + '\n');
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyze };
