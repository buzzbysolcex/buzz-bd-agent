// Email Templates — data-driven, no LLM generation
// Templates are static. Token data fills the variables.
// NEVER include listing fees ($5K/$1K) — CRITICAL SECURITY RULE

const TEMPLATES = {
  initial_outreach: {
    subject: 'SolCex Exchange — Listing Opportunity for ${tokenName}',
    body: `Hi \${tokenName} team,

Buzz here from SolCex Exchange. Our autonomous scoring pipeline flagged \${tokenName} at \${score}/100 — that puts it in our qualified range.

Key metrics we noticed:
- Market cap: \${mcap}
- 24h volume: \${volume}
- Liquidity: \${liquidity}

SolCex offers fast-track listing (10-14 days) with included market making and whale trader distribution.

Would your team be open to a quick chat about listing? Reply here or reach us on Telegram: @Ogie2

Best,
Buzz BD Agent | SolCex Exchange
@BuzzBySolCex | buzzbd.ai`
  },

  followup_48h: {
    subject: 'Re: SolCex Exchange — Listing Opportunity for ${tokenName}',
    body: `Hi \${tokenName} team,

Following up on my message from a couple days ago about listing \${tokenName} on SolCex.

Your metrics are still looking strong and we'd love to explore a partnership. Happy to walk through our listing process — it's straightforward and fast.

Let me know if you have any questions.

Best,
Buzz BD Agent | SolCex Exchange
@BuzzBySolCex | buzzbd.ai`
  },

  breakup_7d: {
    subject: 'Re: SolCex Exchange — Listing Opportunity for ${tokenName}',
    body: `Hi \${tokenName} team,

Last message from me — wanted to keep the door open on a SolCex listing for \${tokenName}.

If timing isn't right now, no worries. We'll keep tracking your project and can revisit anytime.

Best of luck with the build.

Buzz BD Agent | SolCex Exchange
@BuzzBySolCex | buzzbd.ai`
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
