/**
 * Strategy Routes — 8 REST endpoints for the Strategic Orchestrator
 * 
 * POST /api/v1/strategy/decide        — Submit sub-agent outputs, get strategic decision
 * GET  /api/v1/strategy/playbook/:id   — Get playbook instance state
 * POST /api/v1/strategy/playbook/:id/advance — Advance playbook to next state
 * GET  /api/v1/strategy/context/:token — Get assembled context for a token
 * GET  /api/v1/strategy/rules          — List all decision rules
 * PUT  /api/v1/strategy/rules          — Update decision rules
 * GET  /api/v1/strategy/history        — Decision history with reasoning
 * GET  /api/v1/strategy/analytics      — Decision quality metrics
 * 
 * Part of Buzz BD Agent v7.0 — Strategic Orchestrator Layer
 */

const express = require('express');
const router = express.Router();

module.exports = function(db, { decisionEngine, playbookEngine, contextEngine }) {

  // ─── POST /strategy/decide ───
  // Submit sub-agent outputs and get a strategic decision
  router.post('/decide', async (req, res) => {
    try {
      const {
        tokenAddress, chain, tokenTicker, score,
        safetyStatus, pipelineStage, subAgentOutputs,
        hoursSinceContact, replyReceived, priceChange24h
      } = req.body;

      // Validation
      if (!tokenAddress || !chain || score === undefined || !safetyStatus || !pipelineStage) {
        return res.status(400).json({
          error: 'Missing required fields: tokenAddress, chain, score, safetyStatus, pipelineStage',
          code: 'MISSING_FIELDS'
        });
      }

      if (!['solana', 'base', 'bsc'].includes(chain)) {
        return res.status(400).json({ error: 'Invalid chain. Must be: solana, base, bsc', code: 'INVALID_CHAIN' });
      }

      const decision = await decisionEngine.decide({
        tokenAddress, chain, tokenTicker, score,
        safetyStatus, pipelineStage, subAgentOutputs,
        hoursSinceContact, replyReceived, priceChange24h
      });

      // If decision triggers a playbook and auto-execute is on, start it
      if (decision.playbook && decision.autoExecute) {
        try {
          const pbInstance = playbookEngine.start(
            decision.playbook,
            tokenAddress,
            chain,
            tokenTicker,
            `decision:${decision.logId}`
          );
          decision.playbookInstance = pbInstance;
        } catch (pbErr) {
          decision.playbookError = pbErr.message;
        }
      }

      res.json({
        success: true,
        decision,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error(`[Strategy] /decide error: ${err.message}`);
      res.status(500).json({ error: err.message, code: 'DECISION_ERROR' });
    }
  });

  // ─── GET /strategy/playbook/:id ───
  // Get current state of a playbook instance
  router.get('/playbook/:id', (req, res) => {
    try {
      const instance = db.prepare('SELECT * FROM playbook_instances WHERE id = ?').get(req.params.id);
      if (!instance) return res.status(404).json({ error: 'Playbook instance not found', code: 'NOT_FOUND' });

      // Parse JSON fields
      instance.state_history = JSON.parse(instance.state_history || '[]');
      instance.context_data = JSON.parse(instance.context_data || '{}');

      // Get playbook definition
      const definition = playbookEngine.getDefinition(instance.playbook_type);

      res.json({
        instance,
        definition: definition ? { name: definition.name, states: definition.states } : null,
        availableTransitions: definition?.transitions[instance.current_state] || null
      });
    } catch (err) {
      res.status(500).json({ error: err.message, code: 'PLAYBOOK_ERROR' });
    }
  });

  // ─── POST /strategy/playbook/:id/advance ───
  // Advance playbook to next state
  router.post('/playbook/:id/advance', async (req, res) => {
    try {
      const { transitionKey, context } = req.body;
      const result = await playbookEngine.advance(
        parseInt(req.params.id),
        transitionKey || null,
        context || {}
      );

      res.json({
        success: true,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(400).json({ error: err.message, code: 'ADVANCE_ERROR' });
    }
  });

  // ─── GET /strategy/context/:token ───
  // Get assembled context for a token (for debugging/inspection)
  router.get('/context/:token', async (req, res) => {
    try {
      const { chain, stage, score } = req.query;
      if (!chain) return res.status(400).json({ error: 'chain query param required', code: 'MISSING_CHAIN' });

      const context = await contextEngine.assemble({
        tokenAddress: req.params.token,
        chain,
        pipelineStage: stage || 'scored',
        score: parseInt(score) || 50,
        subAgentOutputs: null
      });

      res.json({
        tokenAddress: req.params.token,
        chain,
        estimatedTokens: context.estimatedTokens,
        fromCache: context.fromCache || false,
        systemPromptLength: context.systemPrompt?.length || 0,
        contextBlockLength: context.contextBlock?.length || 0,
        // Don't return full context in API (could be large), just metadata
        contextPreview: context.contextBlock?.substring(0, 500) + '...'
      });
    } catch (err) {
      res.status(500).json({ error: err.message, code: 'CONTEXT_ERROR' });
    }
  });

  // ─── GET /strategy/rules ───
  // List all decision rules
  router.get('/rules', (req, res) => {
    try {
      const rules = db.prepare('SELECT * FROM decision_rules ORDER BY priority ASC').all();
      
      // If DB is empty, return from engine's loaded config
      if (rules.length === 0) {
        return res.json({
          source: 'config_file',
          rules: decisionEngine.rules,
          constraints: decisionEngine.globalConstraints
        });
      }

      res.json({
        source: 'database',
        count: rules.length,
        rules
      });
    } catch (err) {
      res.status(500).json({ error: err.message, code: 'RULES_ERROR' });
    }
  });

  // ─── PUT /strategy/rules ───
  // Update decision rules (Ogie only — checked via API key)
  router.put('/rules', (req, res) => {
    try {
      const { rules } = req.body;
      if (!Array.isArray(rules)) {
        return res.status(400).json({ error: 'rules must be an array', code: 'INVALID_FORMAT' });
      }

      // Upsert each rule into database
      const upsert = db.prepare(`
        INSERT INTO decision_rules (id, name, priority, condition_json, action, playbook, 
                                     description, auto_execute, escalate_to_ogie, enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name, priority = excluded.priority, condition_json = excluded.condition_json,
          action = excluded.action, playbook = excluded.playbook, description = excluded.description,
          auto_execute = excluded.auto_execute, escalate_to_ogie = excluded.escalate_to_ogie,
          enabled = excluded.enabled, updated_at = datetime('now')
      `);

      const upsertMany = db.transaction((rules) => {
        for (const rule of rules) {
          upsert.run(
            rule.id, rule.name, rule.priority || 5,
            JSON.stringify(rule.condition), rule.action,
            rule.playbook || null, rule.description || null,
            rule.auto_execute ? 1 : 0, rule.escalate_to_ogie ? 1 : 0,
            rule.enabled !== false ? 1 : 0
          );
        }
      });

      upsertMany(rules);

      // Reload rules in engine
      decisionEngine.reloadRules();

      res.json({ success: true, updated: rules.length, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: err.message, code: 'RULES_UPDATE_ERROR' });
    }
  });

  // ─── GET /strategy/history ───
  // Decision history with reasoning
  router.get('/history', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = parseInt(req.query.offset) || 0;
      const chain = req.query.chain;
      const type = req.query.type;

      let query = 'SELECT * FROM strategic_decisions WHERE 1=1';
      const params = [];

      if (chain) { query += ' AND chain = ?'; params.push(chain); }
      if (type) { query += ' AND decision_type = ?'; params.push(type); }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const decisions = db.prepare(query).all(...params);
      const total = db.prepare('SELECT COUNT(*) as count FROM strategic_decisions').get();

      res.json({
        decisions,
        total: total.count,
        limit,
        offset,
        hasMore: offset + limit < total.count
      });
    } catch (err) {
      res.status(500).json({ error: err.message, code: 'HISTORY_ERROR' });
    }
  });

  // ─── GET /strategy/analytics ───
  // Decision quality metrics
  router.get('/analytics', (req, res) => {
    try {
      const analytics = decisionEngine.getAnalytics();

      // Add playbook stats
      const activePlaybooks = db.prepare(`
        SELECT playbook_type, COUNT(*) as count 
        FROM playbook_instances WHERE is_active = 1 
        GROUP BY playbook_type
      `).all();

      const completedPlaybooks = db.prepare(`
        SELECT playbook_type, COUNT(*) as count 
        FROM playbook_instances WHERE is_active = 0 
        GROUP BY playbook_type
      `).all();

      const stuckPlaybooks = playbookEngine.getStuckInstances(24);

      analytics.playbooks = {
        active: activePlaybooks,
        completed: completedPlaybooks,
        stuck_24h: stuckPlaybooks.length
      };

      // Outreach stats
      try {
        const outreach = db.prepare(`
          SELECT sequence_type, COUNT(*) as count, 
                 SUM(reply_received) as replies
          FROM outreach_sequences 
          GROUP BY sequence_type
        `).all();
        analytics.outreach = outreach;
      } catch {}

      res.json(analytics);
    } catch (err) {
      res.status(500).json({ error: err.message, code: 'ANALYTICS_ERROR' });
    }
  });

  return router;
};
