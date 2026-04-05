/**
 * Buzz Shield — API Routes
 * Phase 1: Free tier endpoints (rate limited, no auth required for public endpoints)
 */

const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');
const { feature } = require('../lib/feature-flags');
const { getDB } = require('../db');
const {
  scoreProgramRisk,
  matchDrainPatterns,
  generateVerdict,
  recordScan,
  getShieldStats
} = require('../services/shield/shield-service');
const { verifyPriceIntegrity, getSupportedSymbols } = require('../services/shield/pyth-oracle-verify');
const crypto = require('crypto');

// Middleware: check master switch
function shieldEnabled(req, res, next) {
  if (!feature('SHIELD_ENGINE')) {
    return res.status(503).json({ error: 'shield_disabled', message: 'Buzz Shield is not active yet' });
  }
  next();
}

// GET /shield/stats — aggregate stats (public, no auth)
router.get('/stats', shieldEnabled, (req, res) => {
  const stats = getShieldStats(getDB());
  res.json(stats);
});

// GET /shield/patterns — known drain pattern feed (public, no auth)
router.get('/patterns', shieldEnabled, (req, res) => {
  if (!feature('SHIELD_PATTERN_MATCHER')) {
    return res.status(503).json({ error: 'patterns_disabled' });
  }

  const patterns = getDB().prepare(
    'SELECT pattern_id, name, description, severity, source, confirmed, first_seen, last_seen, match_count FROM drain_patterns WHERE active = 1 ORDER BY severity, match_count DESC'
  ).all();

  res.json({
    patterns,
    total_patterns: patterns.length,
    last_updated: new Date().toISOString()
  });
});

// GET /shield/program/:programId — program risk score (public, no auth)
router.get('/program/:programId', shieldEnabled, (req, res) => {
  if (!feature('SHIELD_PROGRAM_SCORER')) {
    return res.status(503).json({ error: 'scorer_disabled' });
  }

  const { programId } = req.params;
  const chain = req.query.chain || 'solana';
  const startMs = Date.now();

  const programData = scoreProgramRisk(getDB(), programId, chain);
  const patternMatches = matchDrainPatterns(getDB(), programId);
  const verdict = generateVerdict(
    programData ? programData.risk_score : null,
    patternMatches,
    programData ? programData.deployer_trust : null
  );

  const scanId = `shield_prog_${crypto.randomUUID()}`;
  const scanDuration = Date.now() - startMs;

  const result = {
    program: programId,
    chain,
    risk_score: programData ? programData.risk_score : null,
    verified: programData ? !!programData.verified : null,
    immutable: programData ? !!programData.immutable : null,
    deploy_date: programData ? programData.deploy_date : null,
    deployer: programData ? programData.deployer_address : null,
    flags: programData && programData.flags ? JSON.parse(programData.flags) : [],
    pattern_matches: patternMatches,
    verdict,
    scan_id: scanId,
    scanned_at: new Date().toISOString()
  };

  // Record scan
  recordScan(getDB(), {
    scan_id: scanId,
    scan_type: 'program',
    requester: req.headers['x-agent-id'] || req.ip,
    target: programId,
    chain,
    verdict,
    program_score: programData ? programData.risk_score : null,
    pattern_matches: patternMatches,
    explanation: `Program scan: ${verdict}`,
    scan_duration_ms: scanDuration,
    paid: false,
    created_at: new Date().toISOString()
  });

  res.json(result);
});

// GET /shield/health/:walletAddress — wallet exposure summary (public, no auth)
router.get('/health/:walletAddress', shieldEnabled, (req, res) => {
  if (!feature('SHIELD_FREE_TIER')) {
    return res.status(503).json({ error: 'free_tier_disabled' });
  }

  const { walletAddress } = req.params;
  const chain = req.query.chain || 'solana';

  // Phase 1: return skeleton with scan record
  // Phase 2+: wire to Helius for real wallet data
  const scanId = `shield_health_${crypto.randomUUID()}`;

  const result = {
    wallet: walletAddress,
    chain,
    verdict: 'CAUTION',
    exposure: {
      total_value_usd: null,
      connected_dapps: null,
      risky_approvals: null,
      programs_interacted: null
    },
    recommendations: [
      'Full wallet analysis requires Helius integration (Phase 2)',
      'Check program risk scores individually via /shield/program/:programId'
    ],
    scan_id: scanId,
    scanned_at: new Date().toISOString()
  };

  recordScan(getDB(), {
    scan_id: scanId,
    scan_type: 'wallet',
    requester: req.headers['x-agent-id'] || req.ip,
    target: walletAddress,
    chain,
    verdict: 'CAUTION',
    explanation: 'Phase 1 skeleton — full wallet analysis in Phase 2',
    scan_duration_ms: 1,
    paid: false,
    created_at: new Date().toISOString()
  });

  res.json(result);
});

// POST /shield/patterns/add — add new pattern (admin only)
router.post('/patterns/add', apiKeyAuth, (req, res) => {
  const { pattern_id, name, description, instruction_sequence, program_addresses, severity, source } = req.body;
  if (!pattern_id || !name || !severity) {
    return res.status(400).json({ error: 'missing_fields', message: 'pattern_id, name, severity required' });
  }

  getDB().prepare(`
    INSERT OR IGNORE INTO drain_patterns
    (pattern_id, name, description, instruction_sequence, program_addresses, severity, source, first_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(pattern_id, name, description,
    JSON.stringify(instruction_sequence || []),
    JSON.stringify(program_addresses || []),
    severity, source || 'manual');

  res.json({ success: true, pattern_id });
});

// GET /shield/scans/recent — recent scans (admin only)
router.get('/scans/recent', apiKeyAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const scans = getDB().prepare(
    'SELECT scan_id, scan_type, target, chain, verdict, program_score, scan_duration_ms, created_at FROM shield_scans ORDER BY id DESC LIMIT ?'
  ).all(limit);
  res.json(scans);
});

// GET /shield/oracle/verify/:symbol/:price — Pyth oracle price verification (public)
router.get('/oracle/verify/:symbol/:price', shieldEnabled, async (req, res) => {
  const { symbol, price } = req.params;
  const claimedPrice = parseFloat(price);

  if (isNaN(claimedPrice) || claimedPrice <= 0) {
    return res.status(400).json({ error: 'invalid_price', message: 'Price must be a positive number' });
  }

  const result = await verifyPriceIntegrity(symbol, claimedPrice);
  res.json(result);
});

// GET /shield/oracle/symbols — list supported Pyth symbols (public)
router.get('/oracle/symbols', shieldEnabled, (req, res) => {
  res.json({ symbols: getSupportedSymbols(), source: 'pyth_hermes_v2', intel_source: 33 });
});

// GET /shield/info — product page data (public, no auth)
router.get('/info', shieldEnabled, (req, res) => {
  const stats = getShieldStats(getDB());

  res.json({
    product: 'Buzz Shield',
    tagline: 'Agent Security Intelligence',
    motto: 'Security before performance. Intelligence before execution.',
    version: '1.5',
    stats,
    tiers: {
      free: {
        price: '$0',
        features: ['Wallet health check (10/day)', 'Public pattern feed', 'Shield stats', 'Public leaderboard'],
        cta: 'Start scanning free'
      },
      pro: {
        price: '$99/month or $0.10/scan (x402)',
        features: ['Full deep scan (100/day)', 'All 23+ patterns', 'Address poisoning detection', 'Temporal analysis', 'Token score API', 'Email alerts on DANGER'],
        cta: 'Upgrade to Pro'
      },
      business: {
        price: '$499/month or $0.05/scan (x402)',
        features: ['Everything in Pro', 'MiroFish simulation (100 agents)', 'Cross-chain bridge verification', 'Wallet Guard integration', 'Custom patterns (up to 10)', 'Weekly threat briefing', '1,000 scans/day'],
        cta: 'Contact for Business'
      },
      enterprise: {
        price: '$2,500/month (custom)',
        features: ['Everything in Business', 'MiroFish swarm (1K-10K agents)', 'Anomaly detection engine', 'Unlimited scans', 'Full BD screening pipeline', 'On-call incident response', 'Quarterly security audit', 'White-label option'],
        cta: 'Contact for Enterprise'
      }
    },
    trust_stack: [
      'ATV.eth identity verification',
      'BuzzShield drain pattern scan (23+ patterns)',
      '11-rule honest scoring engine',
      'MiroFish swarm simulation (1K-10K agents)',
      'Wallet Guard execution gate (BLOCK/WARN/ALLOW)',
      'BuzzReputation on-chain verification'
    ],
    research: {
      adr: 'ADR-025',
      deepmind_coverage: '4/6 categories covered (was 3/6)',
      sources: 'DeepMind, Anthropic SCONE-bench, Drift $270M, Blockaid, OWASP Agentic AI 2026',
      gap_analysis: '15 vectors identified, 3 P0 implemented'
    },
    links: {
      scan: 'https://buzzbd.ai/score',
      leaderboard: 'https://buzzbd.ai/scores',
      api: 'https://api.buzzbd.ai/api/v1/shield',
      github: 'https://github.com/buzzbysolcex/buzz-bd-agent'
    }
  });
});

module.exports = router;
