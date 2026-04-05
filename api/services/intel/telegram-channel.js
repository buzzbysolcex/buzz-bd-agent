/**
 * Telegram Channel Intel — Intel Source #34
 * Passive threat intelligence from public Telegram channels (ZachXBT etc.)
 * Forward-to-intake pattern: Ogie forwards messages → Buzz polls intake channel
 *
 * CONSTRAINTS:
 * - READ-ONLY: never posts, reacts, or joins external channels
 * - Public channels only
 * - Rate limit: poll max once per 300s
 * - No full message text stored (summary only, max 500 chars)
 * - Attribution required on downstream use
 * - Feature-flagged: TELEGRAM_CHANNEL_INTEL
 */

const { feature } = require('../../lib/feature-flags');
const { getDB } = require('../../db');
const { emit } = require('../events/event-bus');
function db() { return getDB(); }

// Wallet address regex patterns
const WALLET_PATTERNS = {
  evm: /0x[a-fA-F0-9]{40}/g,
  solana: /[1-9A-HJ-NP-Za-km-z]{32,44}/g,
  bitcoin: /(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}/g
};

/**
 * Initialize tables (idempotent)
 */
function initTelegramIntelTables() {
  db().exec(`
    CREATE TABLE IF NOT EXISTS intel_telegram_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_handle TEXT UNIQUE NOT NULL,
      channel_name TEXT,
      intel_source_id INTEGER NOT NULL,
      intake_chat_id TEXT,
      poll_interval_seconds INTEGER DEFAULT 300,
      last_message_id INTEGER DEFAULT 0,
      last_polled_at TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS intel_telegram_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      telegram_message_id INTEGER NOT NULL,
      message_date TEXT,
      entry_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      extracted_wallets TEXT,
      extracted_projects TEXT,
      extracted_chains TEXT,
      severity TEXT DEFAULT 'medium',
      scoring_applied BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(channel_id, telegram_message_id),
      FOREIGN KEY (channel_id) REFERENCES intel_telegram_channels(id)
    );

    CREATE TABLE IF NOT EXISTS intel_blacklist_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      chain TEXT,
      source_entry_id INTEGER NOT NULL,
      reason TEXT,
      flagged_at TEXT DEFAULT (datetime('now')),
      UNIQUE(wallet_address, chain),
      FOREIGN KEY (source_entry_id) REFERENCES intel_telegram_entries(id)
    );
  `);
}

/**
 * Extract wallet addresses from text
 */
function extractWallets(text) {
  const wallets = [];
  for (const [chain, pattern] of Object.entries(WALLET_PATTERNS)) {
    const matches = text.match(pattern) || [];
    for (const addr of matches) {
      // Filter out false positives (too short for Solana, common hex strings)
      if (chain === 'solana' && addr.length < 32) continue;
      if (chain === 'evm' && addr === '0x0000000000000000000000000000000000000000') continue;
      wallets.push({ address: addr, chain });
    }
  }
  return wallets;
}

/**
 * Extract project names from investigation text (heuristic)
 */
function extractProjects(text) {
  // Look for $TICKER patterns and @handle patterns
  const tickers = text.match(/\$[A-Z]{2,10}/g) || [];
  const handles = text.match(/@[A-Za-z0-9_]{3,30}/g) || [];
  return { tickers, handles };
}

/**
 * Classify entry type from message content
 */
function classifyEntryType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('rug') || lower.includes('rugpull') || lower.includes('rug pull')) return 'rug_pull';
  if (lower.includes('scam') || lower.includes('fraud')) return 'scam';
  if (lower.includes('hack') || lower.includes('exploit') || lower.includes('drain')) return 'exploit';
  if (lower.includes('phishing') || lower.includes('phish')) return 'phishing';
  if (lower.includes('wash') || lower.includes('fake volume')) return 'wash_trading';
  if (lower.includes('insider') || lower.includes('front-run')) return 'insider_trading';
  return 'investigation';
}

/**
 * Determine severity from content signals
 */
function classifySeverity(text, walletCount) {
  if (walletCount >= 5) return 'critical';
  const lower = text.toLowerCase();
  if (lower.includes('million') || lower.includes('$1m') || lower.includes('hack')) return 'critical';
  if (lower.includes('scam') || lower.includes('rug')) return 'high';
  if (lower.includes('suspicious') || lower.includes('warning')) return 'medium';
  return 'low';
}

/**
 * Parse an investigation message into structured intel
 */
function parseInvestigationMessage(messageText) {
  const wallets = extractWallets(messageText);
  const projects = extractProjects(messageText);
  const entryType = classifyEntryType(messageText);
  const severity = classifySeverity(messageText, wallets.length);

  // Summary: max 500 chars, our words only (no full message storage)
  const summary = `${entryType.toUpperCase()}: ${wallets.length} wallet(s) flagged. ` +
    `Projects: ${projects.tickers.join(', ') || 'none identified'}. ` +
    `Severity: ${severity}.`;

  return {
    entry_type: entryType,
    summary: summary.slice(0, 500),
    wallets,
    projects,
    severity
  };
}

/**
 * Register a new intel channel
 */
function registerChannel(handle, name, intelSourceId, intakeChatId) {
  db().prepare(`
    INSERT OR IGNORE INTO intel_telegram_channels
    (channel_handle, channel_name, intel_source_id, intake_chat_id)
    VALUES (?, ?, ?, ?)
  `).run(handle, name, intelSourceId, intakeChatId);
}

/**
 * Process a new intel entry: store, extract wallets, update blacklist, emit events
 */
function processIntelEntry(channelId, telegramMessageId, messageDate, parsed) {
  // Insert entry
  const result = db().prepare(`
    INSERT OR IGNORE INTO intel_telegram_entries
    (channel_id, telegram_message_id, message_date, entry_type, summary,
     extracted_wallets, extracted_projects, extracted_chains, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    channelId, telegramMessageId, messageDate,
    parsed.entry_type, parsed.summary,
    JSON.stringify(parsed.wallets.map(w => w.address)),
    JSON.stringify(parsed.projects),
    JSON.stringify([...new Set(parsed.wallets.map(w => w.chain))]),
    parsed.severity
  );

  if (result.changes === 0) return null; // duplicate

  const entryId = result.lastInsertRowid;

  // Add wallets to blacklist
  for (const wallet of parsed.wallets) {
    db().prepare(`
      INSERT OR IGNORE INTO intel_blacklist_wallets
      (wallet_address, chain, source_entry_id, reason)
      VALUES (?, ?, ?, ?)
    `).run(wallet.address, wallet.chain, entryId, parsed.summary.slice(0, 200));
  }

  // Emit events
  emit('intel-telegram', 'intel.telegram.new', {
    entry_id: entryId,
    type: parsed.entry_type,
    severity: parsed.severity,
    wallets_flagged: parsed.wallets.length
  });

  // Cross-reference pipeline tokens
  const pipelineHits = crossReferencePipeline(parsed.wallets);
  if (pipelineHits.length > 0) {
    emit('intel-telegram', 'intel.blacklist.match', {
      entry_id: entryId,
      pipeline_tokens_affected: pipelineHits
    });
  }

  return { entryId, walletsAdded: parsed.wallets.length, pipelineHits };
}

/**
 * Cross-reference wallets against pipeline tokens
 */
function crossReferencePipeline(wallets) {
  const hits = [];
  for (const wallet of wallets) {
    try {
      const tokens = db().prepare(
        'SELECT id, ticker, name, address FROM pipeline_tokens WHERE address = ?'
      ).all(wallet.address);
      hits.push(...tokens.map(t => ({ ...t, flagged_wallet: wallet.address })));
    } catch (e) { /* pipeline_tokens may not have this column */ }
  }
  return hits;
}

/**
 * Get blacklist stats
 */
function getBlacklistStats() {
  const total = db().prepare('SELECT COUNT(*) as c FROM intel_blacklist_wallets').get();
  const channels = db().prepare('SELECT COUNT(*) as c FROM intel_telegram_channels WHERE status = ?').get('active');
  const entries = db().prepare('SELECT COUNT(*) as c FROM intel_telegram_entries').get();
  return {
    blacklisted_wallets: total?.c || 0,
    active_channels: channels?.c || 0,
    total_entries: entries?.c || 0
  };
}

module.exports = {
  initTelegramIntelTables,
  extractWallets,
  parseInvestigationMessage,
  registerChannel,
  processIntelEntry,
  crossReferencePipeline,
  getBlacklistStats
};
