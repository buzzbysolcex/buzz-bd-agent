#!/usr/bin/env node
/**
 * Buzz BD Agent — PreToolUse:Bash Guard
 * Blocks commands that could expose secrets or damage state.
 * Exit code 2 = block the command.
 */

const input = JSON.parse(process.env.TOOL_INPUT || '{}');
const command = input.command || '';

const BLOCKED_PATTERNS = [
  // Secret exposure
  { pattern: /cat\s+\.env/i, reason: 'Reading .env file — use env var references instead' },
  { pattern: /echo\s+\$.*(?:KEY|SECRET|TOKEN|PASSWORD|PRIVATE)/i, reason: 'Echoing secret environment variable' },
  { pattern: /curl.*(?:api[_-]?key|secret|token|password)/i, reason: 'Sending secrets via curl' },
  { pattern: /printenv|env\s*$/i, reason: 'Dumping all environment variables' },

  // Infrastructure exposure
  { pattern: /204\.168\.137\.253/i, reason: 'Server IP in command — use domain names' },

  // Database destruction
  { pattern: /DROP\s+TABLE/i, reason: 'DROP TABLE — requires manual execution' },
  { pattern: /DELETE\s+FROM\s+(?!observation_log|outreach_queue)/i, reason: 'DELETE FROM critical table — check with Ogie' },
  { pattern: /TRUNCATE/i, reason: 'TRUNCATE — requires manual execution' },

  // Docker destruction
  { pattern: /docker\s+(?:rm|rmi)\s+-f/i, reason: 'Force-removing Docker resources' },
  { pattern: /docker\s+system\s+prune\s+-a/i, reason: 'Pruning ALL Docker resources (use -f only)' },

  // File destruction
  { pattern: /rm\s+-rf\s+(?:\/|~|\$HOME)/i, reason: 'Recursive delete on root/home' },
  { pattern: /rm\s+-rf\s+(?:api|\.claude|hooks|\.env)/i, reason: 'Deleting critical project files' },

  // Git force operations
  { pattern: /git\s+push\s+--force/i, reason: 'Force push — use --force-with-lease' },
  { pattern: /git\s+reset\s+--hard/i, reason: 'Hard reset — verify with Ogie first' },
];

for (const { pattern, reason } of BLOCKED_PATTERNS) {
  if (pattern.test(command)) {
    console.error(`[BashGuard] ⛔ BLOCKED: ${reason}`);
    console.error(`[BashGuard] Command: ${command.substring(0, 100)}...`);
    process.exit(2);
  }
}

// Warn but allow
const WARN_PATTERNS = [
  { pattern: /npm\s+publish/i, reason: 'Publishing to npm — verify package name and scope' },
  { pattern: /git\s+push/i, reason: 'Git push — ensure CI/CD is GREEN' },
  { pattern: /docker\s+build/i, reason: 'Docker build — check Dockerfile changes' },
  { pattern: /ah\s+restart/i, reason: 'Restarting container — check port conflicts' },
];

for (const { pattern, reason } of WARN_PATTERNS) {
  if (pattern.test(command)) {
    console.error(`[BashGuard] ⚠️ WARNING: ${reason}`);
  }
}
