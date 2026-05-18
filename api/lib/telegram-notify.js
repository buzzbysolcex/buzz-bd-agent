/**
 * Telegram Notification Helper — War Room + Ogie DM
 *
 * Centralized Telegram sender that routes messages to:
 *   1. Ogie DM (TELEGRAM_CHAT_ID) — ALWAYS (existing behavior)
 *   2. War Room group (WAR_ROOM_CHAT_ID) — for non-sensitive messages
 *
 * Usage:
 *   const { sendTelegram } = require('./telegram-notify');
 *   await sendTelegram(message);                        // sends to both
 *   await sendTelegram(message, { sensitive: true });   // Ogie DM only
 *   await sendTelegram(message, { parseMode: 'HTML' }); // custom parse mode
 */

const OGIE_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "950395553";
const WAR_ROOM_CHAT_ID = process.env.WAR_ROOM_CHAT_ID || "-1003701758077";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Send a Telegram message to Ogie DM and optionally to War Room group.
 *
 * @param {string} message - The message text to send
 * @param {Object} [options={}]
 * @param {boolean} [options.sensitive=false] - If true, only send to Ogie DM (skip War Room)
 * @param {string} [options.parseMode='Markdown'] - Telegram parse mode ('Markdown' or 'HTML')
 * @param {boolean} [options.disablePreview=false] - Disable link previews
 * @returns {Object} { dm: {sent, message_id?, error?}, warRoom: {sent, message_id?, error?, skipped?} }
 */
async function sendTelegram(message, options = {}) {
  const {
    sensitive = false,
    parseMode = "Markdown",
    disablePreview = false,
  } = options;

  const result = { dm: { sent: false }, warRoom: { sent: false } };

  if (!BOT_TOKEN) {
    result.dm.reason = "missing_bot_token";
    result.warRoom.reason = "missing_bot_token";
    return result;
  }

  // 1. ALWAYS send to Ogie DM (primary — never skip)
  if (OGIE_CHAT_ID) {
    result.dm = await _sendToChat(
      OGIE_CHAT_ID,
      message,
      parseMode,
      disablePreview,
    );
  } else {
    result.dm = { sent: false, reason: "missing_chat_id" };
  }

  // 2. Send to War Room group (unless sensitive)
  if (sensitive) {
    result.warRoom = {
      sent: false,
      skipped: true,
      reason: "sensitive_content",
    };
  } else if (WAR_ROOM_CHAT_ID) {
    try {
      result.warRoom = await _sendToChat(
        WAR_ROOM_CHAT_ID,
        message,
        parseMode,
        disablePreview,
      );
    } catch (err) {
      // War Room failures must NEVER break the primary notification flow
      result.warRoom = { sent: false, error: err.message };
      console.error(
        `[telegram-notify] War Room send failed (non-fatal): ${err.message}`,
      );
    }
  } else {
    result.warRoom = { sent: false, reason: "missing_war_room_chat_id" };
  }

  return result;
}

/**
 * Internal: send a message to a single chat ID
 */
async function _sendToChat(chatId, message, parseMode, disablePreview) {
  try {
    const body = {
      chat_id: chatId,
      text: message,
      parse_mode: parseMode,
    };
    if (disablePreview) {
      body.disable_web_page_preview = true;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      },
    );

    const data = await response.json();
    return { sent: !!data.ok, message_id: data.result?.message_id };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

module.exports = { sendTelegram, _sendToChat };
