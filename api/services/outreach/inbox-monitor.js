// Inbox Monitor — detects replies to outreach emails
// Feature flag: INBOX_MONITOR
// Runs as dynamic cron: every 30 minutes, maxRuns: none (persistent via feature flag)

const { google } = require("googleapis");
const { getDB } = require("../../db");
const { emit } = require("../events/event-bus");
const mailbox = require("../mailbox/mailbox");
const { feature } = require("../../lib/feature-flags");
const { markReply } = require("./outreach-engine");

function db() {
  return getDB();
}

function initInboxMonitor() {
  db()
    .prepare(
      `
    CREATE TABLE IF NOT EXISTS inbox_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outreach_id INTEGER,
      from_email TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      snippet TEXT NOT NULL DEFAULT '',
      gmail_message_id TEXT NOT NULL UNIQUE,
      sentiment TEXT DEFAULT 'unknown'
        CHECK(sentiment IN ('interested','not_interested','questions','spam','unknown')),
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (outreach_id) REFERENCES outreach_queue(id)
    )
  `,
    )
    .run();
}

// Check Gmail inbox for replies to sent outreach
async function checkInbox(oauth2Client) {
  if (!feature("INBOX_MONITOR"))
    return { checked: false, reason: "flag disabled" };

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Search for replies in last 2 hours
  const twoHoursAgo = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000);

  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: `is:inbox after:${twoHoursAgo}`,
      maxResults: 20,
    });

    const messages = response.data.messages || [];
    let newReplies = 0;

    for (const msg of messages) {
      // Check if already processed
      const existing = db()
        .prepare("SELECT id FROM inbox_replies WHERE gmail_message_id = ?")
        .get(msg.id);
      if (existing) continue;

      // Get message details
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "In-Reply-To"],
      });

      const headers = detail.data.payload?.headers || [];
      const from = headers.find((h) => h.name === "From")?.value || "";
      const subject = headers.find((h) => h.name === "Subject")?.value || "";
      const snippet = detail.data.snippet || "";

      // Match to outreach by sender email
      const fromEmail = from.match(/<(.+)>/) ? from.match(/<(.+)>/)[1] : from;
      const outreach = db()
        .prepare(
          `
        SELECT id, token_address FROM outreach_queue
        WHERE contact_email = ? AND status = 'SENT'
        ORDER BY sent_at DESC LIMIT 1
      `,
        )
        .get(fromEmail);

      if (outreach) {
        // New reply to our outreach!
        db()
          .prepare(
            `
          INSERT OR IGNORE INTO inbox_replies
            (outreach_id, from_email, subject, snippet, gmail_message_id)
          VALUES (?, ?, ?, ?, ?)
        `,
          )
          .run(outreach.id, fromEmail, subject, snippet, msg.id);

        markReply(outreach.id);
        newReplies++;

        emit("outreach-engine", "outreach.reply", {
          outreachId: outreach.id,
          fromEmail,
          subject,
          snippet: snippet.substring(0, 200),
          tokenAddress: outreach.token_address,
        });

        // PRIORITY War Room alert
        mailbox.send("inbox-monitor", "bd-agent", "ALERT", {
          type: "OUTREACH_REPLY",
          priority: "HIGH",
          outreachId: outreach.id,
          fromEmail,
          subject,
          snippet: snippet.substring(0, 200),
          message: `REPLY DETECTED from ${fromEmail}: "${snippet.substring(0, 100)}..."`,
        });
      }
    }

    return { checked: true, messagesScanned: messages.length, newReplies };
  } catch (error) {
    console.error("[inbox-monitor] Error:", error.message);
    return { checked: false, error: error.message };
  }
}

module.exports = { initInboxMonitor, checkInbox };
