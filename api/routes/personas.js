/**
 * Persona Routes — Hedge Brain persona signal endpoints
 *
 * GET /api/v1/personas/signals/:address    → All persona signals for a token
 * GET /api/v1/personas/consensus/:address  → Aggregated consensus for a token
 * GET /api/v1/personas/stats              → Persona accuracy stats
 *
 * Buzz BD Agent v7.4.0 | Hedge Brain — Section 12
 */

const express = require('express');
const router = express.Router();

module.exports = function createPersonaRoutes(db) {
  // ─── GET /signals/:address — All persona signals for a token ───
  router.get('/signals/:address', (req, res) => {
    const { address } = req.params;
    const { chain } = req.query;

    try {
      let query = 'SELECT * FROM persona_signals WHERE token_address = ?';
      const params = [address];

      if (chain) {
        query += ' AND chain = ?';
        params.push(chain);
      }

      query += ' ORDER BY scored_at DESC';

      const signals = db.prepare(query).all(...params);
      res.json({
        token: address,
        chain: chain || 'all',
        count: signals.length,
        signals,
      });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /consensus/:address — Aggregated consensus ────────────
  router.get('/consensus/:address', (req, res) => {
    const { address } = req.params;
    const { chain } = req.query;

    try {
      let query = `
        SELECT * FROM persona_signals
        WHERE token_address = ?
      `;
      const params = [address];

      if (chain) {
        query += ' AND chain = ?';
        params.push(chain);
      }

      // Get latest signal per persona
      query += ' ORDER BY scored_at DESC';

      const allSignals = db.prepare(query).all(...params);

      // Deduplicate: latest per persona
      const latestByPersona = {};
      for (const s of allSignals) {
        if (!latestByPersona[s.persona_name]) {
          latestByPersona[s.persona_name] = s;
        }
      }

      const personas = Object.values(latestByPersona);
      const bullish = personas.filter(p => p.signal === 'bullish').length;
      const bearish = personas.filter(p => p.signal === 'bearish').length;
      const neutral = personas.filter(p => p.signal === 'neutral').length;

      // Weighted consensus score
      const weights = {
        'degen-agent': 0.15,
        'whale-agent': 0.25,
        'institutional-agent': 0.35,
        'community-agent': 0.25,
      };

      let weightedScore = 0;
      let totalWeight = 0;
      for (const p of personas) {
        const w = weights[p.persona_name] || 0.25;
        weightedScore += (p.raw_score || 0) * w;
        totalWeight += w;
      }
      if (totalWeight > 0 && totalWeight < 1.0) {
        weightedScore = weightedScore / totalWeight;
      }
      weightedScore = Math.round(weightedScore * 100) / 100;

      // BD recommendation (consensus-driven)
      let recommendation = 'skip';
      if (bullish >= 3 && weightedScore >= 75) {
        recommendation = 'outreach_now';
      } else if (bullish >= 2 && weightedScore >= 60) {
        recommendation = 'monitor';
      }

      res.json({
        token: address,
        chain: chain || 'all',
        consensus: {
          bullish,
          bearish,
          neutral,
          total: personas.length,
          weighted_score: weightedScore,
          recommendation,
        },
        personas: personas.map(p => ({
          name: p.persona_name,
          signal: p.signal,
          confidence: p.confidence,
          score: p.raw_score,
          reasoning: p.reasoning,
          model: p.model_used,
          scored_at: p.scored_at,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /stats — Persona accuracy stats ──────────────────────
  router.get('/stats', (req, res) => {
    try {
      const personaNames = ['degen-agent', 'whale-agent', 'institutional-agent', 'community-agent'];
      const stats = {};

      for (const name of personaNames) {
        const total = db.prepare(
          'SELECT COUNT(*) as count FROM persona_signals WHERE persona_name = ?'
        ).get(name);

        const bullish = db.prepare(
          "SELECT COUNT(*) as count FROM persona_signals WHERE persona_name = ? AND signal = 'bullish'"
        ).get(name);

        const avgConfidence = db.prepare(
          'SELECT AVG(confidence) as avg FROM persona_signals WHERE persona_name = ?'
        ).get(name);

        const avgScore = db.prepare(
          'SELECT AVG(raw_score) as avg FROM persona_signals WHERE persona_name = ?'
        ).get(name);

        stats[name] = {
          total_signals: total.count,
          bullish_count: bullish.count,
          bullish_rate: total.count > 0
            ? Math.round((bullish.count / total.count) * 10000) / 100
            : 0,
          avg_confidence: Math.round((avgConfidence.avg || 0) * 1000) / 1000,
          avg_score: Math.round((avgScore.avg || 0) * 100) / 100,
        };
      }

      res.json({ personas: stats });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  return router;
};
