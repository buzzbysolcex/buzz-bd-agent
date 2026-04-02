// Email Templates — data-driven, no LLM generation
// Templates are static. Token data fills the variables.
// NEVER include listing fees ($5K/$1K) — CRITICAL SECURITY RULE
// v9.1: HSaaS Go-to-Market + Juno strategy session templates
// Two funnels: listing AND audit. Doubles conversion.

const TEMPLATES = {
  initial_outreach: {
    subject: '${tokenName} scored ${score}/100 — autonomous listing intelligence report',
    body: `Hi \${tokenName} team,

Ogie here, BD Lead at SolCex Exchange.

Our autonomous scoring engine evaluated \${tokenName} across 31 intelligence sources on 19 blockchain networks. Here's what we found:

  Token: \${tokenName} (\${chain})
  Buzz Score: \${score}/100
  Market Cap: \${mcap}
  24h Volume: \${volume}
  Liquidity: \${liquidity}
  Liq/MCap Ratio: \${liqRatio}

  Scoring: 11 factors, 8 penalty rules, dual-gate verification
  Simulation: 1,000-agent adversarial swarm (26ms)
  On-chain: Score recorded immutably on Base mainnet

For context — we track 363 tokens. Most don't pass 70. \${tokenName} did.

Why this matters: 11 tokens previously scored 85+ across other audit tools. Our honest calibration dropped all 11 below 50. We catch what others miss.

Two ways we can work together:

  1. SolCex Listing — fast-track (10-14 days) with market making support and whale trader distribution
  2. Full Swarm Audit Report — detailed 1,000-agent simulation analysis with on-chain proof, starting at $500

Either way, your score is already live and verifiable:
  Report: buzzbd.ai/scores
  On-chain: ScoreStorage on Base (immutable)

Worth a quick chat? Reply here or Telegram: @Ogie2

Best,
Ogie`
  },

  followup_48h: {
    subject: 'Re: ${tokenName} scored ${score}/100 — following up',
    body: `Hi \${tokenName} team,

Quick follow-up on \${tokenName}'s scoring report.

Your metrics are still tracking strong at \${score}/100 — that puts \${tokenName} in the top \${pipelinePosition}% of 363 tokens in our pipeline.

If a full listing isn't the right timing, we also offer standalone audit reports — our 1,000-agent swarm simulation catches failure modes that 50-agent runs miss. Reports start at $500 for a Quick Scan.

Either way, happy to chat. Reply here or Telegram: @Ogie2

Best,
Ogie`
  },

  breakup_7d: {
    subject: 'Re: ${tokenName} — your score stays live',
    body: `Hi \${tokenName} team,

Last note from me. \${tokenName} remains in our pipeline at \${score}/100.

Your score, simulation history, and on-chain record are persistent — they don't expire. If listing or an audit report makes sense later, the data is already there. No need to restart.

Free instant score anytime: buzzbd.ai/score

Best of luck with the build.

Ogie
buzzbd.ai | @Ogie2`
  },

  hsaas_audit_pitch: {
    subject: '${tokenName} — 1,000-agent swarm audit available',
    body: `Hi \${tokenName} team,

Thanks for engaging with us on \${tokenName}'s score.

If a SolCex listing isn't the right fit right now, our Honest Scoring audit is available as a standalone product:

  Quick Scan ($500) — 100-agent simulation, basic report
  Full Analysis ($1,500) — 500-agent simulation, detailed breakdown
  Swarm Audit ($2,500) — 1,000-agent adversarial simulation, complete report with on-chain proof

What you get: every score dimension broken down, adversarial debate results (bull vs bear), Monte Carlo confidence intervals, and your score recorded immutably on Base mainnet.

"11 tokens passed every other audit. Our calibration caught them all."

Interested? Reply here or buzzbd.ai/score for a free instant score.

Best,
Ogie`
  }
};

// Fill template with token data
function renderTemplate(templateName, data) {
  const template = TEMPLATES[templateName];
  if (!template) return null;

  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = '${' + key + '}';
    subject = subject.split(placeholder).join(value || 'N/A');
    body = body.split(placeholder).join(value || 'N/A');
  }

  return { subject, body };
}

module.exports = { TEMPLATES, renderTemplate };
