#!/usr/bin/env node
/**
 * Buzz BD Agent — PostToolUse:Edit Lint
 * Auto-checks JavaScript files after editing.
 * Warns about console.log, exposed secrets, missing error handling.
 */

const fs = require('fs');
const input = JSON.parse(process.env.TOOL_INPUT || '{}');
const filePath = input.file_path || '';

if (!filePath || !fs.existsSync(filePath)) process.exit(0);

const content = fs.readFileSync(filePath, 'utf8');
const warnings = [];

// Check for console.log (should use logger)
const consoleLogs = (content.match(/console\.log/g) || []).length;
if (consoleLogs > 0) {
  warnings.push(`${consoleLogs} console.log statement(s) — use structured logger`);
}

// Check for hardcoded secrets
const secretPatterns = [
  { pattern: /['"]sk-[a-zA-Z0-9]{48}['"]/, label: 'API key' },
  { pattern: /['"]0x[a-fA-F0-9]{64}['"]/, label: 'Private key' },
  { pattern: /['"]ghp_[a-zA-Z0-9]{36}['"]/, label: 'GitHub token' },
  { pattern: /204\.168\.137\.253/, label: 'Server IP' },
];

for (const { pattern, label } of secretPatterns) {
  if (pattern.test(content)) {
    warnings.push(`⛔ Hardcoded ${label} detected — use env var`);
  }
}

// Check for missing error handling in async
if (content.includes('async') && !content.includes('try') && !content.includes('catch')) {
  warnings.push('Async function without try/catch — add error handling');
}

if (warnings.length > 0) {
  console.error(`[PostEdit] ${filePath}:`);
  warnings.forEach(w => console.error(`  ⚠️ ${w}`));
}
