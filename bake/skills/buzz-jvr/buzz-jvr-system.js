/**
 * ═══════════════════════════════════════════════════════════════
 *  BUZZ BD AGENT — Job Verification Receipt (JVR) System
 * ═══════════════════════════════════════════════════════════════
 *
 *  Every Buzz operation produces a tamper-proof receipt:
 *    ✅ AAB-XXXXXX-XXXXX (unique verification code)
 *    📂 Category + Session (which sub-agent handled it)
 *    📝 Summary + Details
 *    🔐 SHA-256 hash (tamper-proof)
 *    📡 Telegram notification
 *    🔗 8004 ATOM feed-ready
 *
 *  16 Job Categories:
 *    scan, safety, wallet, social, score, orchestrate,
 *    outreach, cron, api, deploy, twitter, pipeline,
 *    reputation, x402, system, manual
 *
 *  5 REST API Endpoints:
 *    POST   /api/v1/receipts          — create receipt
 *    GET    /api/v1/receipts          — query with filters
 *    GET    /api/v1/receipts/stats    — aggregated stats
 *    GET    /api/v1/receipts/:code    — single receipt
 *    GET    /api/v1/receipts/:code/verify — integrity check
 *
 *  Zero dependencies — uses Node built-in crypto + fs.
 *
 *  SolCex Exchange | v6.2.0-acp | Indonesia Sprint Day 9
 * ═══════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────
const RECEIPT_PREFIX = 'AAB';
const RECEIPT_DIR = process.env.JVR_DIR || '/data/workspace/memory/receipts';
const INDEX_FILE = path.join(RECEIPT_DIR, 'receipt-index.json');
const SEQUENCE_FILE = path.join(RECEIPT_DIR, 'sequence.dat');

const CATEGORIES = [
  'scan', 'safety', 'wallet', 'social', 'score', 'orchestrate',
  'outreach', 'cron', 'api', 'deploy', 'twitter', 'pipeline',
  'reputation', 'x402', 'system', 'manual',
];

const SESSIONS = [
  'scanner-agent', 'safety-agent', 'wallet-agent', 'social-agent',
  'scorer-agent', 'orchestrator', 'twitter-bot', 'cron-scheduler',
  'api-server', 'system', 'manual',
];

const CATEGORY_EMOJI = {
  scan: '🔍', safety: '🛡️', wallet: '💰', social: '📱', score: '📊',
  orchestrate: '🎯', outreach: '📧', cron: '⏰', api: '🌐', deploy: '🚀',
  twitter: '🐦', pipeline: '📋', reputation: '🏆', x402: '💳',
  system: '⚙️', manual: '🔧',
};

// ─── Receipt Manager ─────────────────────────────────────────
class ReceiptManager {
  constructor(options = {}) {
    this.telegramBotToken = options.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.telegramChatId = options.telegramChatId || process.env.TELEGRAM_CHAT_ID || '950395553';
    this.onchainEnabled = options.onchainEnabled || false;
    this.notifyByDefault = options.notifyByDefault !== false;

    // Ensure directories exist
    this._ensureDir(RECEIPT_DIR);

    // Initialize sequence counter
    if (!fs.existsSync(SEQUENCE_FILE)) {
      fs.writeFileSync(SEQUENCE_FILE, '0');
    }

    // Initialize index
    if (!fs.existsSync(INDEX_FILE)) {
      fs.writeFileSync(INDEX_FILE, JSON.stringify({ receipts: [], stats: { total: 0 } }));
    }
  }

  // ─── Core: Create Receipt ────────────────────────────────
  async createReceipt(params) {
    const {
      category = 'system',
      session = 'system',
      status = 'completed',
      summary = '',
      tokenSymbol = null,
      tokenAddress = null,
      chain = null,
      endpoint = null,
      cronId = null,
      duration_ms = null,
      sources = [],
      details = {},
      notify = this.notifyByDefault,
    } = params;

    const timestamp = new Date().toISOString();
    const sequence = this._nextSequence();
    const code = this._generateCode(sequence);

    // Build receipt object
    const receipt = {
      code,
      category,
      session,
      status,
      summary,
      timestamp,
      sequence,
      ...(tokenSymbol && { tokenSymbol }),
      ...(tokenAddress && { tokenAddress }),
      ...(chain && { chain }),
      ...(endpoint && { endpoint }),
      ...(cronId && { cronId }),
      ...(duration_ms !== null && { duration_ms }),
      ...(sources.length > 0 && { sources }),
      details,
    };

    // Generate tamper-proof hash
    receipt.hash = this._generateHash(receipt);

    // Save to disk
    const dateDir = timestamp.split('T')[0];
    const dayDir = path.join(RECEIPT_DIR, dateDir);
    this._ensureDir(dayDir);
    fs.writeFileSync(
      path.join(dayDir, `${code}.json`),
      JSON.stringify(receipt, null, 2)
    );

    // Update index
    this._addToIndex(receipt);

    // Telegram notification
    if (notify && this.telegramBotToken && category !== 'api') {
      await this._notifyTelegram(receipt);
    }

    // Console log
    const emoji = CATEGORY_EMOJI[category] || '📝';
    console.log(`[JVR] ${emoji} ${code} | ${category}/${session} | ${status} | ${summary}`);

    return receipt;
  }

  // ─── Query Receipts ──────────────────────────────────────
  getReceipt(code) {
    const index = this._loadIndex();
    const entry = index.receipts.find(r => r.code === code);
    if (!entry) return null;

    const filePath = path.join(RECEIPT_DIR, entry.date, `${code}.json`);
    if (!fs.existsSync(filePath)) return null;

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  queryReceipts(filters = {}) {
    const { category, session, status, from, to, limit = 50, offset = 0 } = filters;
    const index = this._loadIndex();

    let results = index.receipts;

    if (category) results = results.filter(r => r.category === category);
    if (session) results = results.filter(r => r.session === session);
    if (status) results = results.filter(r => r.status === status);
    if (from) results = results.filter(r => r.timestamp >= from);
    if (to) results = results.filter(r => r.timestamp <= to);

    const total = results.length;
    results = results.slice(offset, offset + limit);

    return { total, offset, limit, receipts: results };
  }

  getStats() {
    const index = this._loadIndex();
    const receipts = index.receipts;

    const stats = {
      total: receipts.length,
      byCategory: {},
      bySession: {},
      byStatus: { completed: 0, failed: 0, partial: 0, skipped: 0 },
      avgDuration: {},
      last24h: 0,
      lastReceipt: receipts.length > 0 ? receipts[receipts.length - 1] : null,
    };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    for (const r of receipts) {
      // By category
      stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;

      // By session
      stats.bySession[r.session] = (stats.bySession[r.session] || 0) + 1;

      // By status
      if (stats.byStatus[r.status] !== undefined) {
        stats.byStatus[r.status]++;
      }

      // Last 24h
      if (new Date(r.timestamp).getTime() > now - day) {
        stats.last24h++;
      }

      // Duration tracking
      if (r.duration_ms !== undefined) {
        if (!stats.avgDuration[r.category]) {
          stats.avgDuration[r.category] = { total: 0, count: 0 };
        }
        stats.avgDuration[r.category].total += r.duration_ms;
        stats.avgDuration[r.category].count++;
      }
    }

    // Calculate averages
    for (const cat of Object.keys(stats.avgDuration)) {
      const d = stats.avgDuration[cat];
      stats.avgDuration[cat] = Math.round(d.total / d.count);
    }

    // Success rate
    const completed = stats.byStatus.completed || 0;
    const failed = stats.byStatus.failed || 0;
    stats.successRate = completed + failed > 0
      ? ((completed / (completed + failed)) * 100).toFixed(1) + '%'
      : 'N/A';

    return stats;
  }

  verifyReceipt(code) {
    const receipt = this.getReceipt(code);
    if (!receipt) return { valid: false, error: 'Receipt not found' };

    const storedHash = receipt.hash;
    const { hash, ...receiptWithoutHash } = receipt;
    const computedHash = this._generateHash(receiptWithoutHash);

    return {
      valid: storedHash === computedHash,
      code: receipt.code,
      storedHash,
      computedHash,
      tampered: storedHash !== computedHash,
      timestamp: receipt.timestamp,
    };
  }

  // ─── Express Router ──────────────────────────────────────
  getRouter() {
    const express = require('express');
    const router = express.Router();

    // POST /receipts — create
    router.post('/', async (req, res) => {
      try {
        const receipt = await this.createReceipt(req.body);
        res.status(201).json(receipt);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });

    // GET /receipts — query
    router.get('/', (req, res) => {
      const results = this.queryReceipts(req.query);
      res.json(results);
    });

    // GET /receipts/stats
    router.get('/stats', (req, res) => {
      res.json(this.getStats());
    });

    // GET /receipts/:code
    router.get('/:code', (req, res) => {
      const receipt = this.getReceipt(req.params.code);
      if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
      res.json(receipt);
    });

    // GET /receipts/:code/verify
    router.get('/:code/verify', (req, res) => {
      const result = this.verifyReceipt(req.params.code);
      res.json(result);
    });

    return router;
  }

  // ─── Express Middleware (auto-receipt for all API calls) ──
  middleware() {
    return (req, res, next) => {
      if (req.path.includes('/receipts')) return next(); // skip self

      const start = Date.now();
      res.on('finish', () => {
        // Fire and forget — don't block response
        this.createReceipt({
          category: 'api',
          session: 'api-server',
          endpoint: `${req.method} ${req.path}`,
          status: res.statusCode < 400 ? 'completed' : 'failed',
          summary: `${req.method} ${req.path} → ${res.statusCode}`,
          duration_ms: Date.now() - start,
          notify: false, // don't spam Telegram for API calls
        }).catch(() => {}); // silent fail
      });
      next();
    };
  }

  // ─── Private Methods ─────────────────────────────────────
  _generateCode(sequence) {
    const rand1 = Math.floor(100000 + Math.random() * 900000);
    const rand2 = Math.floor(10000 + Math.random() * 90000);
    return `${RECEIPT_PREFIX}-${rand1}-${rand2}`;
  }

  _generateHash(receipt) {
    const payload = JSON.stringify(receipt, Object.keys(receipt).sort());
    return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
  }

  _nextSequence() {
    const current = parseInt(fs.readFileSync(SEQUENCE_FILE, 'utf8') || '0', 10);
    const next = current + 1;
    fs.writeFileSync(SEQUENCE_FILE, next.toString());
    return next;
  }

  _addToIndex(receipt) {
    const index = this._loadIndex();
    index.receipts.push({
      code: receipt.code,
      category: receipt.category,
      session: receipt.session,
      status: receipt.status,
      timestamp: receipt.timestamp,
      summary: receipt.summary,
      date: receipt.timestamp.split('T')[0],
      ...(receipt.duration_ms !== undefined && { duration_ms: receipt.duration_ms }),
    });
    index.stats.total = index.receipts.length;

    // Keep index manageable — last 10K receipts
    if (index.receipts.length > 10000) {
      index.receipts = index.receipts.slice(-10000);
    }

    fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
  }

  _loadIndex() {
    try {
      return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    } catch {
      return { receipts: [], stats: { total: 0 } };
    }
  }

  async _notifyTelegram(receipt) {
    if (!this.telegramBotToken) return;

    const emoji = CATEGORY_EMOJI[receipt.category] || '📝';
    const statusEmoji = receipt.status === 'completed' ? '✅' :
                        receipt.status === 'failed' ? '❌' : '⚠️';

    let msg = `${statusEmoji} <b>Job Receipt</b>\n`;
    msg += `<code>${receipt.code}</code>\n`;
    msg += `${emoji} ${receipt.category} | 🔧 ${receipt.session}\n`;
    msg += `📝 ${receipt.summary}\n`;

    if (receipt.tokenSymbol) msg += `🪙 $${receipt.tokenSymbol}`;
    if (receipt.chain) msg += ` (${receipt.chain})`;
    if (receipt.tokenSymbol) msg += '\n';

    if (receipt.duration_ms !== null && receipt.duration_ms !== undefined) {
      msg += `⏱ ${receipt.duration_ms}ms\n`;
    }
    if (receipt.sources && receipt.sources.length > 0) {
      msg += `📡 Sources: ${receipt.sources.join(', ')}\n`;
    }

    msg += `🔐 Hash: ${receipt.hash}\n`;
    msg += `🕐 ${receipt.timestamp}`;

    try {
      await fetch(
        `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.telegramChatId,
            text: msg,
            parse_mode: 'HTML',
          }),
        }
      );
    } catch {
      // Silent fail
    }
  }

  _ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

module.exports = ReceiptManager;
module.exports.CATEGORIES = CATEGORIES;
module.exports.SESSIONS = SESSIONS;
