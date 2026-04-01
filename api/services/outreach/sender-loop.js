// Sender Loop — runs every 60 seconds, picks up ready emails, sends via Gmail
// Integrates: outreach engine + trust gates + wallet guard + gmail sender
// Feature flag: AUTO_OUTREACH
// Registered in server.js as setInterval (survives within process, re-registers on reboot)

const { feature } = require('../../lib/feature-flags');
const { getReadyToSend, markSent, markFailed } = require('./outreach-engine');
const { sendEmail } = require('./gmail-sender');
const { evaluate } = require('../guard/wallet-guard');
const { recordSuccess, recordFailure } = require('../trust/trust-gates');

let senderInterval = null;

function startSenderLoop() {
  if (senderInterval) clearInterval(senderInterval);

  senderInterval = setInterval(async () => {
    if (!feature('AUTO_OUTREACH')) return;

    const ready = getReadyToSend();
    for (const outreach of ready) {
      try {
        // Wallet Guard check (if enabled)
        if (feature('WALLET_GUARD')) {
          const guard = await evaluate({
            type: 'outreach',
            target: outreach.contact_email,
            context: {
              tokenAddress: outreach.token_address,
              chain: outreach.chain,
              trustAction: outreach.trust_action
            },
            agent: 'bd-agent'
          });

          if (guard.decision === 'BLOCK') {
            markFailed(outreach.id, `Wallet Guard BLOCKED: ${guard.reason}`);
            recordFailure();
            continue;
          }
          if (guard.decision === 'WARN' && !guard.bypassed) {
            // Don't send — wait for human review
            continue;
          }
        }

        // Send via Gmail
        const result = await sendEmail(
          outreach.contact_email,
          outreach.subject,
          outreach.body
        );

        if (result.sent) {
          markSent(outreach.id);
          recordSuccess();
          console.log(`[sender-loop] Sent outreach #${outreach.id} to ${outreach.contact_email}`);
        } else {
          markFailed(outreach.id, result.error);
          recordFailure();
          console.error(`[sender-loop] Failed outreach #${outreach.id}: ${result.error}`);
        }
      } catch (error) {
        markFailed(outreach.id, error.message);
        recordFailure();
        console.error(`[sender-loop] Error on outreach #${outreach.id}:`, error.message);
      }
    }
  }, 60 * 1000); // Every 60 seconds

  console.log('[sender-loop] Started (60s interval)');
}

function stopSenderLoop() {
  if (senderInterval) {
    clearInterval(senderInterval);
    senderInterval = null;
  }
}

module.exports = { startSenderLoop, stopSenderLoop };
