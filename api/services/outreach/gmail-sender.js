// Gmail OAuth Sender — proven since Feb 4, 2026
// Sends from buzzbysolcex@gmail.com
// CC always: dino@solcex.cc + ogie.solcexexchange@gmail.com
// Uses refresh token stored in .env (GMAIL_REFRESH_TOKEN)
// Refresh token is PERMANENT — no expiry (proven over 2 months)

const { google } = require('googleapis');
const { feature } = require('../../lib/feature-flags');

const GMAIL_CONFIG = {
  from: process.env.GMAIL_ADDRESS || 'buzzbysolcex@gmail.com',
  cc: ['dino@solcex.cc', 'ogie.solcexexchange@gmail.com'],
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  refreshToken: process.env.GMAIL_REFRESH_TOKEN,
};

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

// Build RFC 2822 email with CC
function buildRawEmail(to, subject, body, cc = []) {
  const allCc = [...GMAIL_CONFIG.cc, ...cc].filter(Boolean);
  const lines = [
    `From: Buzz BD Agent <${GMAIL_CONFIG.from}>`,
    `To: ${to}`,
    allCc.length > 0 ? `Cc: ${allCc.join(', ')}` : '',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body
  ].filter(Boolean);

  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send an email via Gmail API
async function sendEmail(to, subject, body) {
  if (!feature('AUTO_OUTREACH')) {
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

module.exports = { initGmail, sendEmail };
