#!/usr/bin/env node
/**
 * Buzz Token Scorer CLI
 * Score any crypto token from your terminal.
 *
 * Usage:
 *   npx @buzzbd/scorer PEPE
 *   npx @buzzbd/scorer 0x6982508145454Ce325dDbE47a25d4ec3d2311933
 *   npx @buzzbd/scorer PEPE --chain base --json
 *   npx @buzzbd/scorer --leaderboard
 *
 * Built by a chef. Zero LLM cost.
 */

const { scoreToken, fetchLeaderboard } = require('../lib/scorer');

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const AMBER = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[90m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
${CYAN}╔══════════════════════════════════════════════════╗${NC}
${CYAN}║${NC}  ${BOLD}BUZZ TOKEN SCORER${NC} — v9.2                        ${CYAN}║${NC}
${CYAN}║${NC}  11 rules. Zero LLM cost. Instant scoring.       ${CYAN}║${NC}
${CYAN}╚══════════════════════════════════════════════════╝${NC}

${BOLD}Usage:${NC}
  buzz-score PEPE                       Score by symbol
  buzz-score 0x6982...                  Score by contract address
  buzz-score PEPE --chain base          Specify chain
  buzz-score PEPE --json                JSON output
  buzz-score --leaderboard              Top 20 tokens
  buzz-score --leaderboard --top 50     Top N tokens

${BOLD}Scoring Rules:${NC}
  FDV_GAP_PENALTY, STABLECOIN_EXCLUSION, GHOST_TOKEN,
  CONTRADICTORY_AUDIT, SECURITY_PENALTY, LIQUIDITY_CROSSREF,
  AGE_BONUS, VOLUME_THRESHOLD, GHOST_VOLUME, CTO_FLAG,
  VOLUME_LIQUIDITY_RATIO

${BOLD}Score Bands:${NC}
  ${RED}0-49${NC}  REJECTED    ${AMBER}50-69${NC}  COLD
  ${GREEN}70-84${NC}  WARM        ${CYAN}85-100${NC} HOT

${DIM}API:   https://api.buzzbd.ai/api/score/{address}${NC}
${DIM}Web:   https://buzzbd.ai/score${NC}
${DIM}Docs:  https://buzzbd.ai${NC}
${DIM}Built by a chef. Kitchen runs itself. Bismillah 🤲${NC}
`);
  process.exit(0);
}

// Parse arguments
const opts = {
  token: null,
  chain: null,
  json: args.includes('--json'),
  leaderboard: args.includes('--leaderboard'),
  top: 20,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--chain' && args[i + 1]) {
    opts.chain = args[i + 1];
    i++;
  } else if (args[i] === '--top' && args[i + 1]) {
    opts.top = parseInt(args[i + 1], 10);
    i++;
  } else if (!args[i].startsWith('--')) {
    opts.token = args[i];
  }
}

async function main() {
  try {
    if (opts.leaderboard) {
      const data = await fetchLeaderboard(opts.top);
      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        printLeaderboard(data);
      }
      return;
    }

    if (!opts.token) {
      console.error(`${RED}Error: No token specified${NC}`);
      console.error(`Usage: buzz-score PEPE`);
      process.exit(1);
    }

    console.log(`${DIM}Scoring ${opts.token}...${NC}`);
    const result = await scoreToken(opts.token, opts.chain);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printScore(result);
    }
  } catch (error) {
    console.error(`${RED}Error: ${error.message}${NC}`);
    process.exit(1);
  }
}

function getScoreColor(score) {
  if (score >= 85) return CYAN;
  if (score >= 70) return GREEN;
  if (score >= 50) return AMBER;
  return RED;
}

function getClassification(score) {
  if (score >= 85) return 'HOT';
  if (score >= 70) return 'WARM';
  if (score >= 50) return 'COLD';
  return 'REJECTED';
}

function printScore(result) {
  const color = getScoreColor(result.score);
  const classification = result.classification || getClassification(result.score);

  console.log('');
  console.log(`${CYAN}═══════════════════════════════════════${NC}`);
  console.log(`  ${BOLD}${result.token || result.name}${NC} ${DIM}(${result.chain || 'unknown'})${NC}`);
  console.log(`${CYAN}═══════════════════════════════════════${NC}`);
  console.log(`  Score:          ${color}${BOLD}${result.score}/100${NC} ${color}${classification}${NC}`);

  if (result.breakdown) {
    const b = result.breakdown;
    console.log(`  Liquidity:      ${b.liquidity?.value || 'N/A'} (${b.liquidity?.score || '-'}/100)`);
    console.log(`  Volume 24h:     ${b.volume_24h?.value || 'N/A'} (${b.volume_24h?.score || '-'}/100)`);
    console.log(`  Security:       ${b.security?.score || '-'}/100`);
    console.log(`  Deployer:       ${b.deployer?.identity || 'ANON'} (${b.deployer?.score || '-'}/100)`);
    console.log(`  Age:            ${b.age_days || 'N/A'} days`);
    console.log(`  FDV Gap:        ${b.fdv_gap || 'N/A'}x`);
  }

  if (result.flags && result.flags.length > 0) {
    console.log(`  ${RED}Flags:          ${result.flags.join(', ')}${NC}`);
  }

  if (result.rules_triggered && result.rules_triggered.length > 0) {
    console.log(`  ${DIM}Rules:          ${result.rules_triggered.join(', ')}${NC}`);
  }

  console.log(`  ${DIM}LLM cost:       $0.00${NC}`);
  console.log(`  ${DIM}Scored at:       ${result.scored_at || new Date().toISOString()}${NC}`);
  console.log(`${CYAN}═══════════════════════════════════════${NC}`);
  console.log('');
}

function printLeaderboard(data) {
  console.log('');
  console.log(`${CYAN}╔═══════════════════════════════════════════════════╗${NC}`);
  console.log(`${CYAN}║${NC}  ${BOLD}BUZZ LEADERBOARD${NC} — Top ${data.length} Tokens               ${CYAN}║${NC}`);
  console.log(`${CYAN}╚═══════════════════════════════════════════════════╝${NC}`);
  console.log('');
  console.log(`  ${DIM}#   Token            Chain     Score  Class${NC}`);
  console.log(`  ${DIM}${'─'.repeat(50)}${NC}`);

  data.forEach((t, i) => {
    const color = getScoreColor(t.score);
    const rank = String(i + 1).padStart(3);
    const name = (t.token || t.name || 'Unknown').padEnd(16);
    const chain = (t.chain || '???').padEnd(9);
    const score = String(t.score).padStart(3);
    const cls = getClassification(t.score);
    console.log(`  ${rank}  ${name} ${chain} ${color}${score}${NC}    ${color}${cls}${NC}`);
  });

  console.log('');
  console.log(`  ${DIM}Full leaderboard: https://buzzbd.ai/scores${NC}`);
  console.log('');
}

main();
