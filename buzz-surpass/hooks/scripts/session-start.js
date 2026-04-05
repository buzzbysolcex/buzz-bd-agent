#!/usr/bin/env node
/**
 * Buzz BD Agent — SessionStart Hook
 * Replaces manual reboot recovery Steps 4-5B
 *
 * What it does:
 * 1. Verifies CLAUDE.md version (must say v9.2)
 * 2. Checks CONTEXT HYGIENE section exists
 * 3. Verifies context-optimization rule (#18)
 * 4. Checks Docker containers are running
 * 5. Verifies feature flags file exists
 * 6. Outputs state summary for context window
 * 7. Reminds to run /effort high
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = process.env.BUZZ_WORKSPACE || '/home/claude-code/buzz-workspace';

function check(label, fn) {
  try {
    const result = fn();
    console.log(`  ✅ ${label}: ${result || 'OK'}`);
    return true;
  } catch (e) {
    console.error(`  ❌ ${label}: ${e.message}`);
    return false;
  }
}

function main() {
  console.log('[SessionStart] Buzz BD Agent v9.2 — Auto-Recovery');
  console.log('─'.repeat(50));

  let passed = 0;
  let total = 0;

  // 1. CLAUDE.md version check
  total++;
  if (check('CLAUDE.md version', () => {
    const content = fs.readFileSync(path.join(WORKSPACE, 'CLAUDE.md'), 'utf8');
    if (!content.includes('v9.2')) throw new Error('Not v9.2 — check CLAUDE.md');
    return 'v9.2';
  })) passed++;

  // 2. Context Hygiene section
  total++;
  if (check('Context Hygiene section', () => {
    const content = fs.readFileSync(path.join(WORKSPACE, 'CLAUDE.md'), 'utf8');
    if (!content.includes('CONTEXT HYGIENE')) throw new Error('Missing CONTEXT HYGIENE section');
    return 'Present';
  })) passed++;

  // 3. Context optimization rule
  total++;
  if (check('context-optimization.md (rule #18)', () => {
    const rulePath = path.join(WORKSPACE, '.claude/rules/context-optimization.md');
    if (!fs.existsSync(rulePath)) throw new Error('Rule file missing');
    return 'Present';
  })) passed++;

  // 4. Docker containers
  total++;
  if (check('Docker containers', () => {
    const output = execSync('docker ps --format "{{.Names}}" 2>/dev/null || echo "NONE"').toString().trim();
    if (output === 'NONE' || output === '') throw new Error('No containers running');
    return output.split('\n').length + ' containers';
  })) passed++;

  // 5. Feature flags
  total++;
  if (check('feature-flags.js', () => {
    const flagPath = path.join(WORKSPACE, 'api/lib/feature-flags.js');
    if (!fs.existsSync(flagPath)) throw new Error('Feature flags file missing');
    const content = fs.readFileSync(flagPath, 'utf8');
    const trueCount = (content.match(/:\s*true/g) || []).length;
    const falseCount = (content.match(/:\s*false/g) || []).length;
    return `${trueCount} TRUE, ${falseCount} FALSE`;
  })) passed++;

  // 6. SQLite DB
  total++;
  if (check('SQLite database', () => {
    const dbPath = path.join(WORKSPACE, 'api/buzz.db');
    if (!fs.existsSync(dbPath)) throw new Error('Database file missing');
    const output = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM sqlite_master WHERE type='table'" 2>/dev/null`).toString().trim();
    return `${output} tables`;
  })) passed++;

  // 7. .env file
  total++;
  if (check('.env file', () => {
    const envPath = path.join(WORKSPACE, '.env');
    if (!fs.existsSync(envPath)) throw new Error('.env missing');
    return 'Present';
  })) passed++;

  console.log('─'.repeat(50));
  console.log(`[SessionStart] ${passed}/${total} checks passed`);

  if (passed === total) {
    console.log('[SessionStart] ✅ All systems nominal');
  } else {
    console.error('[SessionStart] ⚠️ Some checks failed — review above');
  }

  console.log('');
  console.log('[SessionStart] 📋 REMEMBER: Run /effort high for this session');
  console.log('[SessionStart] 📋 Current trust level: 0 (FULL_APPROVAL)');
}

main();
