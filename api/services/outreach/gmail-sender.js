// Gmail OAuth Sender — proven since Feb 4, 2026
// Sends from buzzbysolcex@gmail.com
// CC always: dino@solcex.cc + ogie.solcexexchange@gmail.com
// Uses refresh token stored in .env (GMAIL_REFRESH_TOKEN)
// Refresh token is PERMANENT — no expiry (proven over 2 months)
// v9.1: HTML emails with professional signature

const { google } = require('googleapis');
const { feature } = require('../../lib/feature-flags');

const GMAIL_CONFIG = {
  from: process.env.GMAIL_ADDRESS || 'buzzbysolcex@gmail.com',
  cc: ['dino@solcex.cc', 'ogie.solcexexchange@gmail.com'],
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  refreshToken: process.env.GMAIL_REFRESH_TOKEN,
};

const SIGNATURE_HTML = `
<div style="font-family: Arial, sans-serif; margin-top: 30px; border-top: 2px solid #f0b429; padding-top: 15px;">
  <table cellpadding="0" cellspacing="0" style="font-size: 14px;">
    <tr>
      <td style="padding-right: 15px; vertical-align: top;">
        <img src="https://api.buzzbd.ai/static/buzz-logo.png"
             alt="Buzz BD Agent" width="60" height="60"
             style="border-radius: 8px;" />
      </td>
      <td style="vertical-align: top;">
        <div style="font-size: 16px; font-weight: bold; color: #1a1a2e;">Ogie</div>
        <div style="font-size: 13px; color: #27ae60; font-weight: bold;">Business Development Lead</div>
        <div style="font-size: 12px; color: #666;">SolCex Exchange — Solana-Native CEX</div>
      </td>
    </tr>
  </table>
  <div style="margin-top: 10px; font-size: 12px; color: #555; line-height: 1.6;">
    🌐 <a href="https://solcex.cc" style="color: #2980b9;">solcex.cc</a><br>
    📧 buzzbysolcex@gmail.com<br>
    💬 Telegram: <a href="https://t.me/Ogie2" style="color: #2980b9;">@Ogie2</a><br>
    𝕏 <a href="https://x.com/SolCex_Exchange" style="color: #2980b9;">@SolCex_Exchange</a> | <a href="https://x.com/BuzzBySolCex" style="color: #2980b9;">@BuzzBySolCex</a>
  </div>
  <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #888;">
    <strong style="color: #666;">ON-CHAIN VERIFIED</strong><br>
    🐝 Powered by Buzz BD Agent — <a href="https://eips.ethereum.org/EIPS/eip-8004" style="color: #2980b9;">ERC-8004 #25045</a><br>
    ⛓ Ethereum #25045 | Base #17483<br>
    📊 31 Intelligence Sources | 100-Point Scoring Algorithm | 19 Chains<br>
    🔧 Running on Hetzner CPX62 Infrastructure
  </div>
</div>`;

let oauth2Client = null;

function initGmail() {
  if (!GMAIL_CONFIG.clientId || !GMAIL_CONFIG.clientSecret || !GMAIL_CONFIG.refreshToken) {
    console.warn('[gmail-sender] Gmail credentials not configured — email outreach disabled');
    return false;
  }
  oauth2Client = new google.auth.OAuth2(
    GMAIL_CONFIG.clientId,
    GMAIL_CONFIG.clientSecret,
    'http://localhost'
  );
  oauth2Client.setCredentials({ refresh_token: GMAIL_CONFIG.refreshToken });
  console.log('[gmail-sender] Gmail OAuth initialized for', GMAIL_CONFIG.from);
  return true;
}

// Build RFC 2822 HTML email with signature and CC
function buildRawEmail(to, subject, bodyText, cc = []) {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
      ${bodyText.split('\n').map(line => line.trim() ? `<p style="margin: 0 0 10px 0;">${line}</p>` : '').join('')}
    </div>
    ${SIGNATURE_HTML}
  `;
  const allCc = [...GMAIL_CONFIG.cc, ...cc].filter(Boolean);
  const lines = [
    `From: Buzz BD Agent <${GMAIL_CONFIG.from}>`,
    `To: ${to}`,
    allCc.length > 0 ? `Cc: ${allCc.join(', ')}` : '',
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody
  ].filter(Boolean);

  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send an email via Gmail API
// Set skipFlagCheck=true for direct test sends
async function sendEmail(to, subject, body, { skipFlagCheck = false } = {}) {
  if (!skipFlagCheck && !feature('AUTO_OUTREACH')) {
    return { sent: false, error: 'AUTO_OUTREACH flag disabled' };
  }
  if (!oauth2Client) {
    const initialized = initGmail();
    if (!initialized) return { sent: false, error: 'Gmail not configured' };
  }

  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const raw = buildRawEmail(to, subject, body);
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });
    return { sent: true, messageId: result.data.id };
  } catch (error) {
    // Handle token refresh on 401
    if (error.code === 401) {
      try {
        await oauth2Client.refreshAccessToken();
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const raw = buildRawEmail(to, subject, body);
        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw }
        });
        return { sent: true, messageId: result.data.id };
      } catch (retryError) {
        return { sent: false, error: `Gmail auth retry failed: ${retryError.message}` };
      }
    }
    return { sent: false, error: `Gmail send failed: ${error.message}` };
  }
}

module.exports = { initGmail, sendEmail, SIGNATURE_HTML };
