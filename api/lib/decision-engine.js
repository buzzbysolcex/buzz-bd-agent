/**
 * Decision Engine — Rules-based + LLM-augmented strategic decision maker
 * 
 * Evaluates sub-agent outputs against decision rules, then optionally
 * calls MiniMax M2.5 for edge cases not covered by rules.
 * 
 * Part of Buzz BD Agent v7.0 — Strategic Orchestrator Layer
 */

const fs = require('fs');
const path = require('path');

const CONFIG_BASE = process.env.BUZZ_CONFIG_DIR || '/opt/buzz-config';

class DecisionEngine {
  constructor(db, contextEngine, options = {}) {
    this.db = db;
    this.contextEngine = contextEngine;
    this.rules = [];
    this.globalConstraints = {};
    this.llmCaller = options.llmCaller || null; // Function to call MiniMax M2.5
    this._loadRules();
  }

  /**
   * Load decision rules from config file + database
   */
  _loadRules() {
    try {
      const configPath = path.join(CONFIG_BASE, 'decision-rules.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      this.rules = config.rules.filter(r => r.id); // Ensure valid rules
      this.globalConstraints = config.global_constraints || {};
      console.log(`[DecisionEngine] Loaded ${this.rules.length} rules, ${Object.keys(this.globalConstraints).length} constraints`);
    } catch (err) {
      console.error(`[DecisionEngine] Failed to load rules: ${err.message}`);
      this.rules = [];
    }
  }

  /**
   * Match a token evaluation against decision rules
   * Returns the highest-priority matching rule
   */
  _matchRules(evaluation) {
    const { score, safetyStatus, pipelineStage, hoursSinceContact, replyReceived, priceChange24h } = evaluation;

    const matches = this.rules.filter(rule => {
      const c = rule.condition;

      // Score range check
      if (c.score_min !== undefined && score < c.score_min) return false;
      if (c.score_max !== undefined && score > c.score_max) return false;

      // Safety status check
      if (c.safety_status && c.safety_status !== '*' && c.safety_status !== safetyStatus) return false;

      // Pipeline stage check
      if (c.pipeline_stage) {
        if (c.pipeline_stage !== '*') {
          if (Array.isArray(c.pipeline_stage)) {
            if (!c.pipeline_stage.includes(pipelineStage)) return false;
          } else if (c.pipeline_stage !== pipelineStage) {
            return false;
          }
        }
      }

      // Time-based checks (for outreach follow-ups)
      if (c.hours_since_contact_min !== undefined) {
        if (!hoursSinceContact || hoursSinceContact < c.hours_since_contact_min) return false;
      }
      if (c.hours_since_contact_max !== undefined) {
        if (hoursSinceContact > c.hours_since_contact_max) return false;
      }

      // Reply check
      if (c.reply_received !== undefined) {
        if (c.reply_received !== replyReceived) return false;
      }

      // Price change check
      if (c.price_change_24h_max !== undefined) {
        if (!priceChange24h || priceChange24h > c.price_change_24h_max) return false;
      }

      // Terms agreed check
      if (c.terms_agreed !== undefined) {
        if (c.terms_agreed !== evaluation.termsAgreed) return false;
      }

      return true;
    });

    // Sort by priority (lower number = higher priority)
    matches.sort((a, b) => a.priority - b.priority);

    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Check global constraints before executing a decision
   */
  _checkConstraints(action) {
    const constraints = this.globalConstraints;
    const violations = [];

    if (action === 'IMMEDIATE_OUTREACH' || action === 'QUEUE_PRIORITY' || action === 'FOLLOW_UP') {
      // Check max active outreach
      try {
        const row = this.db.prepare(
          'SELECT COUNT(*) as count FROM outreach_sequences WHERE is_active = 1'
        ).get();
        if (row.count >= (constraints.max_active_outreach || 10)) {
          violations.push(`Active outreach at capacity (${row.count}/${constraints.max_active_outreach})`);
        }
      } catch {}

      // Check max emails per day
      try {
        const row = this.db.prepare(`
          SELECT COUNT(*) as count FROM outreach_sequences 
          WHERE last_sent_at > datetime('now', '-1 day')
        `).get();
        if (row.count >= (constraints.max_emails_per_day || 5)) {
          violations.push(`Daily email limit reached (${row.count}/${constraints.max_emails_per_day})`);
        }
      } catch {}
    }

    return violations;
  }

  /**
   * MAIN METHOD: Make a strategic decision
   * 
   * @param {Object} evaluation - Token evaluation data
   * @param {string} evaluation.tokenAddress - Contract address
   * @param {string} evaluation.chain - Chain (solana, base, bsc)
   * @param {string} evaluation.tokenTicker - Token symbol
   * @param {number} evaluation.score - 0-100 score from scorer-agent
   * @param {string} evaluation.safetyStatus - PASS, WARN, or FAIL
   * @param {string} evaluation.pipelineStage - Current pipeline stage
   * @param {Object} evaluation.subAgentOutputs - Raw outputs from 5 agents
   * @param {number} [evaluation.hoursSinceContact] - Hours since last contact
   * @param {boolean} [evaluation.replyReceived] - Whether a reply was received
   * @param {number} [evaluation.priceChange24h] - 24h price change percentage
   * @returns {Object} Decision result
   */
  async decide(evaluation) {
    const startTime = Date.now();

    // Step 1: Try rules-based matching
    const matchedRule = this._matchRules(evaluation);

    let decision;

    if (matchedRule) {
      // Step 2a: Rule matched — check constraints
      const constraintViolations = this._checkConstraints(matchedRule.action);

      if (constraintViolations.length > 0) {
        // Constraints violated — queue instead of executing
        decision = {
          type: matchedRule.action + '_QUEUED',
          ruleId: matchedRule.id,
          ruleName: matchedRule.name,
          reasoning: `Rule ${matchedRule.id} matched (${matchedRule.description}) but constraints violated: ${constraintViolations.join('; ')}. Queued for later execution.`,
          action: 'QUEUE',
          playbook: matchedRule.playbook,
          autoExecute: false,
          escalateToOgie: true,
          confidence: 70,
          constraintViolations
        };
      } else {
        // All clear — execute
        decision = {
          type: matchedRule.action,
          ruleId: matchedRule.id,
          ruleName: matchedRule.name,
          reasoning: matchedRule.description,
          action: matchedRule.action,
          playbook: matchedRule.playbook,
          autoExecute: matchedRule.auto_execute,
          escalateToOgie: matchedRule.escalate_to_ogie,
          confidence: 90,
          constraintViolations: []
        };
      }
    } else {
      // Step 2b: No rule matched — use LLM for edge case reasoning
      if (this.llmCaller) {
        decision = await this._llmDecide(evaluation);
      } else {
        // No LLM available — escalate to Ogie
        decision = {
          type: 'ESCALATE_UNKNOWN',
          ruleId: null,
          ruleName: null,
          reasoning: 'No matching rule found and LLM caller not available. Escalating to Ogie.',
          action: 'ESCALATE',
          playbook: null,
          autoExecute: false,
          escalateToOgie: true,
          confidence: 30,
          constraintViolations: []
        };
      }
    }

    // Step 3: Log the decision
    const logEntry = this._logDecision(evaluation, decision, Date.now() - startTime);

    return {
      ...decision,
      logId: logEntry?.id,
      processingMs: Date.now() - startTime,
      tokenAddress: evaluation.tokenAddress,
      chain: evaluation.chain,
      tokenTicker: evaluation.tokenTicker,
      score: evaluation.score,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * LLM-based decision for edge cases
   */
  async _llmDecide(evaluation) {
    try {
      // Assemble context (async for Supermemory recall)
      const context = await this.contextEngine.assemble({
        tokenAddress: evaluation.tokenAddress,
        chain: evaluation.chain,
        pipelineStage: evaluation.pipelineStage,
        score: evaluation.score,
        subAgentOutputs: evaluation.subAgentOutputs
      });

      // Call MiniMax M2.5 via the provided llmCaller function
      const prompt = `You are the Buzz Strategic Orchestrator. Analyze this token evaluation and make a decision.

${context.contextBlock}

## Token Under Evaluation
- Address: ${evaluation.tokenAddress}
- Chain: ${evaluation.chain}
- Ticker: ${evaluation.tokenTicker || 'UNKNOWN'}
- Score: ${evaluation.score}/100
- Safety: ${evaluation.safetyStatus}
- Pipeline Stage: ${evaluation.pipelineStage}

No existing rule matches this case. Analyze the sub-agent outputs and provide your decision in this EXACT JSON format:
{
  "decision": "ACTION_NAME",
  "reasoning": "2-3 sentences explaining why",
  "next_action": "Specific next step",
  "escalate": true/false,
  "confidence": 0-100
}`;

      const response = await this.llmCaller(context.systemPrompt, prompt);
      
      // Parse LLM response
      const parsed = JSON.parse(response);

      return {
        type: parsed.decision || 'ESCALATE',
        ruleId: null,
        ruleName: 'LLM_REASONING',
        reasoning: parsed.reasoning || 'LLM decision (no rule matched)',
        action: parsed.next_action || parsed.decision || 'ESCALATE',
        playbook: null,
        autoExecute: false, // LLM decisions always require confirmation
        escalateToOgie: parsed.escalate !== false, // Default to escalate
        confidence: parsed.confidence || 50,
        constraintViolations: [],
        llmGenerated: true
      };
    } catch (err) {
      console.error(`[DecisionEngine] LLM decision failed: ${err.message}`);
      return {
        type: 'ESCALATE_LLM_ERROR',
        ruleId: null,
        ruleName: null,
        reasoning: `LLM reasoning failed (${err.message}). Escalating to Ogie.`,
        action: 'ESCALATE',
        playbook: null,
        autoExecute: false,
        escalateToOgie: true,
        confidence: 20,
        constraintViolations: [],
        llmGenerated: false,
        error: err.message
      };
    }
  }

  /**
   * Log decision to database
   */
  _logDecision(evaluation, decision, processingMs) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO strategic_decisions
        (token_address, chain, token_ticker, decision_type, rule_id, reasoning,
         action_taken, playbook_id, confidence, escalated_to_ogie, sub_agent_outputs,
         score, safety_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        evaluation.tokenAddress,
        evaluation.chain,
        evaluation.tokenTicker || null,
        decision.type,
        decision.ruleId || null,
        decision.reasoning,
        decision.action,
        decision.playbook || null,
        decision.confidence,
        decision.escalateToOgie ? 1 : 0,
        evaluation.subAgentOutputs ? JSON.stringify(evaluation.subAgentOutputs) : null,
        evaluation.score,
        evaluation.safetyStatus
      );

      // Capture decision to Supermemory (fire-and-forget, non-blocking)
      const captureText = `Decision: ${decision.type} for ${evaluation.tokenTicker || evaluation.tokenAddress} on ${evaluation.chain}. Score: ${evaluation.score}. Safety: ${evaluation.safetyStatus}. Reasoning: ${decision.reasoning}`;
      this.contextEngine.captureToSupermemory(captureText, {
        token_address: evaluation.tokenAddress,
        chain: evaluation.chain,
        decision_type: decision.type,
        score: evaluation.score
      }).catch(() => {}); // Swallow errors — non-critical

      return { id: result.lastInsertRowid };
    } catch (err) {
      console.error(`[DecisionEngine] Failed to log decision: ${err.message}`);
      return null;
    }
  }

  /**
   * Get decision history for analytics
   */
  getHistory(limit = 50, offset = 0) {
    try {
      return this.db.prepare(`
        SELECT * FROM strategic_decisions 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    } catch {
      return [];
    }
  }

  /**
   * Get decision analytics
   */
  getAnalytics() {
    try {
      const total = this.db.prepare('SELECT COUNT(*) as count FROM strategic_decisions').get();
      const byType = this.db.prepare(`
        SELECT decision_type, COUNT(*) as count, AVG(confidence) as avg_confidence
        FROM strategic_decisions GROUP BY decision_type ORDER BY count DESC
      `).all();
      const escalated = this.db.prepare(
        'SELECT COUNT(*) as count FROM strategic_decisions WHERE escalated_to_ogie = 1'
      ).get();
      const rulesUsed = this.db.prepare(`
        SELECT rule_id, COUNT(*) as times_used FROM strategic_decisions 
        WHERE rule_id IS NOT NULL GROUP BY rule_id ORDER BY times_used DESC
      `).all();

      return {
        total_decisions: total.count,
        by_type: byType,
        escalation_rate: total.count > 0 ? (escalated.count / total.count * 100).toFixed(1) + '%' : '0%',
        rules_usage: rulesUsed,
        generated_at: new Date().toISOString()
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  /**
   * Reload rules from config file
   */
  reloadRules() {
    this._loadRules();
    return { loaded: this.rules.length };
  }
}

module.exports = DecisionEngine;
