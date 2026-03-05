/**
 * Buzz BD Agent — Health Routes
 * Public endpoints, no auth required
 * 
 * GET /api/v1/health              → Overall health
 * GET /api/v1/health/openclaw     → OpenClaw gateway status
 * GET /api/v1/health/bankr        → Bankr LLM Gateway status
 * GET /api/v1/health/db           → Database health
 * GET /api/v1/health/agents       → Sub-agent health summary
 */

const express = require('express');
const router = express.Router();
const http = require('http');
const { getDB } = require('../db');

const OPENCLAW_PORT = process.env.OPENCLAW_PORT || 18789;
const BUZZ_VERSION = '6.1.1';
const API_VERSION = '1.0.0';

// ─── GET /health ─────────────────────────────────────
router.get('/', async (req, res) => {
  const startTime = Date.now();

  const checks = {
    api: { status: 'ok' },
    database: checkDatabase(),
    openclaw: await checkOpenClaw(),
  };

  const allOk = Object.values(checks).every(c => c.status === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    version: {
      buzz: BUZZ_VERSION,
      api: API_VERSION,
      openclaw: '2026.3.1'
    },
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    response_ms: Date.now() - startTime,
    checks
  });
});

// ─── GET /health/openclaw ────────────────────────────
router.get('/openclaw', async (req, res) => {
  const result = await checkOpenClaw();
  res.status(result.status === 'ok' ? 200 : 503).json(result);
});

// ─── GET /health/db ──────────────────────────────────
router.get('/db', (req, res) => {
  const result = checkDatabase();
  res.status(result.status === 'ok' ? 200 : 503).json(result);
});

// ─── GET /health/agents ──────────────────────────────
router.get('/agents', (req, res) => {
  try {
    const db = getDB();
    const agents = db.prepare(
      'SELECT name, status, last_heartbeat, last_error FROM agents'
    ).all();

    const summary = {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      idle: agents.filter(a => a.status === 'idle').length,
      error: agents.filter(a => a.status === 'error').length,
      agents
    };

    res.json({ status: summary.error === 0 ? 'ok' : 'degraded', ...summary });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ─── Helper: Check OpenClaw Gateway ──────────────────
function checkOpenClaw() {
  return new Promise((resolve) => {
    const req = http.get(
      `http://127.0.0.1:${OPENCLAW_PORT}/health`,
      { timeout: 3000 },
      (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => {
          resolve({
            status: resp.statusCode === 200 ? 'ok' : 'error',
            port: OPENCLAW_PORT,
            http_status: resp.statusCode
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({
        status: 'error',
        port: OPENCLAW_PORT,
        message: err.message
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'error', port: OPENCLAW_PORT, message: 'timeout' });
    });
  });
}

// ─── Helper: Check Database ──────────────────────────
function checkDatabase() {
  try {
    const db = getDB();
    const row = db.prepare("SELECT datetime('now') as now").get();
    const tables = db.prepare(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE '_%'"
    ).get();
    return {
      status: 'ok',
      tables: tables.count,
      server_time: row.now
    };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

module.exports = router;
