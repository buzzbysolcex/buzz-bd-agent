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
const BUZZ_VERSION = '7.5.0';
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
    alpha: true,
    phase0_features: ['learning-loop', 'skill-self-improvement', 'contact-intelligence'],
    endpoints: 91,
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
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'"
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


// ─── GET /health/storage ─────────────────────────────
// Sentinel monitoring: disk, pipeline, skills, crons
router.get('/storage', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const db = getDB();

  const result = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    disk: {},
    pipeline: {},
    skills: {},
    crons: {}
  };

  try {
    const { execSync } = require('child_process');
    const dfOut = execSync('df -k /data 2>/dev/null', {timeout: 2000}).toString().split('\n')[1];
    if (dfOut) {
      const parts = dfOut.trim().split(/\s+/);
      result.disk = {
        total_kb: parseInt(parts[1]),
        used_kb: parseInt(parts[2]),
        available_kb: parseInt(parts[3]),
        use_percent: parts[4]
      };
    }
  } catch (e) {
    result.disk = { error: e.message };
  }

  try {
    const pipelineDir = '/data/workspace/memory/pipeline';
    let files = [];
    if (fs.existsSync(pipelineDir)) {
      files = fs.readdirSync(pipelineDir).filter(f => f.endsWith('.json'));
    }
    const dbCount = db.prepare("SELECT count(*) as count FROM pipeline_tokens").get();
    const latestScan = files.includes('latest-scan.json')
      ? fs.statSync(path.join(pipelineDir, 'latest-scan.json')).mtime.toISOString()
      : null;
    result.pipeline = {
      files_on_disk: files.length,
      tokens_in_db: dbCount.count,
      in_sync: files.length > 0,
      latest_scan: latestScan,
      files: files.slice(0, 20)
    };
  } catch (e) {
    result.pipeline = { error: e.message };
    result.status = 'degraded';
  }

  try {
    const skillsDir = '/data/workspace/skills';
    const criticalSkills = [
      'buzz-pipeline-scan', 'orchestrator', 'master-ops',
      'twitter-poster', 'bankr', 'scorer-agent'
    ];
    const skillCheck = {};
    let missingCount = 0;
    if (fs.existsSync(skillsDir)) {
      const dirs = fs.readdirSync(skillsDir);
      for (const skill of criticalSkills) {
        const exists = dirs.includes(skill);
        skillCheck[skill] = exists ? 'ok' : 'missing';
        if (!exists) missingCount++;
      }
      skillCheck.total_skills = dirs.length;
    }
    result.skills = {
      critical_ok: missingCount === 0,
      missing_count: missingCount,
      checks: skillCheck
    };
    if (missingCount > 0) result.status = 'degraded';
  } catch (e) {
    result.skills = { error: e.message };
    result.status = 'degraded';
  }

  try {
    const recentCrons = db.prepare(`
      SELECT cron_id, status, created_at
      FROM cron_runs
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    const scanCrons = db.prepare(`
      SELECT cron_id, status, created_at
      FROM cron_runs
      WHERE cron_id LIKE '%scan%'
      ORDER BY created_at DESC
      LIMIT 4
    `).all();
    result.crons = {
      recent_runs: recentCrons,
      scan_crons: scanCrons,
      last_scan: scanCrons.length > 0 ? scanCrons[0].created_at : null
    };
  } catch (e) {
    result.crons = { error: e.message };
  }

  res.status(result.status === 'ok' ? 200 : 207).json(result);
});

module.exports = router;
