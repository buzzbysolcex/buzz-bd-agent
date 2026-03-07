/**
 * Playbook Engine — State machines for BD workflow automation
 * 
 * PB-001: Token Discovery → Qualification
 * PB-002: Outreach Sequence
 * PB-003: Negotiation Support
 * PB-004: Post-Listing Lifecycle
 * 
 * Part of Buzz BD Agent v7.0 — Strategic Orchestrator Layer
 */

// ─── PLAYBOOK DEFINITIONS ───

const PLAYBOOKS = {
  'PB-001': {
    name: 'Token Discovery → Qualification',
    states: ['DISCOVERED', 'DEDUP_CHECK', 'SCANNING', 'SCORED', 'PROSPECT', 'WATCH', 'SKIP'],
    transitions: {
      'DISCOVERED': { next: 'DEDUP_CHECK', action: 'check_duplicate' },
      'DEDUP_CHECK': { 
        next: { 
          duplicate: 'SKIP',
          unique: 'SCANNING' 
        }, 
        action: 'dispatch_sub_agents' 
      },
      'SCANNING': { next: 'SCORED', action: 'wait_for_agents' },
      'SCORED': {
        next: {
          hot: 'PROSPECT',        // score 85-100
          qualified: 'PROSPECT',  // score 70-84
          watch: 'WATCH',         // score 50-69
          skip: 'SKIP'            // score 0-49
        },
        action: 'evaluate_score'
      },
      'PROSPECT': { next: null, action: 'trigger_pb002', terminal: false, chains_to: 'PB-002' },
      'WATCH': { next: null, action: 'set_rescan_timer', terminal: false },
      'SKIP': { next: null, action: 'archive_token', terminal: true }
    }
  },

  'PB-002': {
    name: 'Outreach Sequence',
    states: ['PROSPECT', 'CONTACT_SEARCH', 'CONTACT_FOUND', 'COMPOSING', 'CONTACTED', 'FOLLOW_UP', 'BREAKUP', 'COLD', 'NEGOTIATING'],
    transitions: {
      'PROSPECT': { next: 'CONTACT_SEARCH', action: 'find_contact_info' },
      'CONTACT_SEARCH': {
        next: {
          found: 'CONTACT_FOUND',
          not_found: 'COLD'
        },
        action: 'search_email_twitter_telegram'
      },
      'CONTACT_FOUND': { next: 'COMPOSING', action: 'generate_outreach_email' },
      'COMPOSING': { next: 'CONTACTED', action: 'send_via_gmail_oauth' },
      'CONTACTED': {
        next: {
          reply: 'NEGOTIATING',
          no_reply_48h: 'FOLLOW_UP',
          no_reply_96h: 'BREAKUP',
          no_reply_144h: 'COLD'
        },
        action: 'monitor_inbox'
      },
      'FOLLOW_UP': { next: 'CONTACTED', action: 'send_follow_up_email' },
      'BREAKUP': { next: 'COLD', action: 'send_breakup_email' },
      'COLD': { next: null, action: 'archive_cold', terminal: true },
      'NEGOTIATING': { next: null, action: 'trigger_pb003', terminal: false, chains_to: 'PB-003' }
    }
  },

  'PB-003': {
    name: 'Negotiation Support',
    states: ['NEGOTIATING', 'REPLY_ANALYSIS', 'POSITIVE', 'QUESTIONS', 'PUSHBACK', 'NEGATIVE', 'DEAL_SHEET', 'APPROVED', 'REJECTED'],
    transitions: {
      'NEGOTIATING': { next: 'REPLY_ANALYSIS', action: 'parse_reply_sentiment' },
      'REPLY_ANALYSIS': {
        next: {
          positive: 'POSITIVE',
          questions: 'QUESTIONS',
          pushback: 'PUSHBACK',
          negative: 'NEGATIVE'
        },
        action: 'classify_intent'
      },
      'POSITIVE': { next: 'DEAL_SHEET', action: 'generate_deal_sheet' },
      'QUESTIONS': { next: 'NEGOTIATING', action: 'auto_answer_from_listing_package' },
      'PUSHBACK': { next: 'NEGOTIATING', action: 'escalate_to_ogie_with_brief' },
      'NEGATIVE': { next: 'REJECTED', action: 'archive_rejected' },
      'DEAL_SHEET': { next: 'APPROVED', action: 'escalate_for_approval' },
      'APPROVED': { next: null, action: 'trigger_pb004', terminal: false, chains_to: 'PB-004' },
      'REJECTED': { next: null, action: 'log_rejection_reason', terminal: true }
    }
  },

  'PB-004': {
    name: 'Post-Listing Lifecycle',
    states: ['LISTED', 'ANNOUNCEMENT', 'MONITORING', 'UPSELL', 'WARNING', 'STABLE'],
    transitions: {
      'LISTED': { next: 'ANNOUNCEMENT', action: 'generate_listing_tweet_and_email' },
      'ANNOUNCEMENT': { next: 'MONITORING', action: 'start_performance_tracking' },
      'MONITORING': {
        next: {
          success: 'UPSELL',
          warning: 'WARNING',
          stable: 'STABLE'
        },
        action: 'check_performance_metrics'
      },
      'UPSELL': { next: 'STABLE', action: 'suggest_market_making_whale_airdrop' },
      'WARNING': { next: 'MONITORING', action: 'alert_ogie_lp_drain_or_volume_crash' },
      'STABLE': { next: null, action: 'routine_monitoring', terminal: true }
    }
  }
};

// ─── PLAYBOOK ENGINE CLASS ───

class PlaybookEngine {
  constructor(db) {
    this.db = db;
    this.actionHandlers = {};
  }

  /**
   * Register an action handler
   * @param {string} actionName - e.g., 'send_via_gmail_oauth'
   * @param {Function} handler - async function(instance, context) => result
   */
  registerAction(actionName, handler) {
    this.actionHandlers[actionName] = handler;
  }

  /**
   * Start a new playbook instance
   */
  start(playbookType, tokenAddress, chain, tokenTicker, triggeredBy = 'decision-engine') {
    const playbook = PLAYBOOKS[playbookType];
    if (!playbook) throw new Error(`Unknown playbook: ${playbookType}`);

    const initialState = playbook.states[0];
    const now = new Date().toISOString();

    try {
      const result = this.db.prepare(`
        INSERT INTO playbook_instances 
        (playbook_type, token_address, chain, token_ticker, current_state, 
         state_history, context_data, started_at, updated_at, triggered_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        playbookType,
        tokenAddress,
        chain,
        tokenTicker || null,
        initialState,
        JSON.stringify([{ state: initialState, at: now, reason: 'Playbook started' }]),
        '{}',
        now, now,
        triggeredBy
      );

      console.log(`[PlaybookEngine] Started ${playbookType} for ${tokenTicker || tokenAddress} (ID: ${result.lastInsertRowid})`);

      return {
        id: result.lastInsertRowid,
        playbookType,
        tokenAddress,
        chain,
        currentState: initialState,
        startedAt: now
      };
    } catch (err) {
      console.error(`[PlaybookEngine] Failed to start ${playbookType}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Advance a playbook instance to the next state
   */
  async advance(instanceId, transitionKey = null, context = {}) {
    const instance = this._getInstance(instanceId);
    if (!instance) throw new Error(`Playbook instance ${instanceId} not found`);
    if (!instance.is_active) throw new Error(`Playbook instance ${instanceId} is already completed`);

    const playbook = PLAYBOOKS[instance.playbook_type];
    const transition = playbook.transitions[instance.current_state];

    if (!transition) {
      throw new Error(`No transition defined from state ${instance.current_state} in ${instance.playbook_type}`);
    }

    // Determine next state
    let nextState;
    if (typeof transition.next === 'string') {
      nextState = transition.next;
    } else if (typeof transition.next === 'object' && transition.next !== null) {
      if (!transitionKey) throw new Error(`Transition key required for branching state ${instance.current_state}`);
      nextState = transition.next[transitionKey];
      if (!nextState) throw new Error(`Invalid transition key '${transitionKey}' for state ${instance.current_state}`);
    } else {
      // Terminal or chaining state
      nextState = null;
    }

    // Execute action handler if registered
    let actionResult = null;
    if (transition.action && this.actionHandlers[transition.action]) {
      try {
        actionResult = await this.actionHandlers[transition.action](instance, context);
      } catch (err) {
        console.error(`[PlaybookEngine] Action ${transition.action} failed: ${err.message}`);
        actionResult = { error: err.message };
      }
    }

    const now = new Date().toISOString();
    const history = JSON.parse(instance.state_history || '[]');
    history.push({
      from: instance.current_state,
      to: nextState || (transition.chains_to ? `→ ${transition.chains_to}` : 'TERMINAL'),
      at: now,
      key: transitionKey,
      action: transition.action,
      actionResult: actionResult ? (actionResult.error ? 'FAILED' : 'OK') : 'NO_HANDLER'
    });

    const isTerminal = transition.terminal === true;
    const isChaining = !!transition.chains_to;

    // Update the instance
    try {
      this.db.prepare(`
        UPDATE playbook_instances 
        SET current_state = ?, state_history = ?, context_data = ?,
            updated_at = ?, completed_at = ?, is_active = ?
        WHERE id = ?
      `).run(
        nextState || instance.current_state,
        JSON.stringify(history),
        JSON.stringify({ ...JSON.parse(instance.context_data || '{}'), ...context }),
        now,
        isTerminal ? now : null,
        isTerminal ? 0 : 1,
        instanceId
      );
    } catch (err) {
      console.error(`[PlaybookEngine] Failed to update instance ${instanceId}: ${err.message}`);
      throw err;
    }

    const result = {
      instanceId,
      playbookType: instance.playbook_type,
      previousState: instance.current_state,
      currentState: nextState || instance.current_state,
      transitionKey,
      actionExecuted: transition.action,
      actionResult,
      isTerminal,
      chainsTo: transition.chains_to || null,
      updatedAt: now
    };

    // Auto-chain to next playbook if defined
    if (isChaining && transition.chains_to) {
      result.chainedInstance = this.start(
        transition.chains_to,
        instance.token_address,
        instance.chain,
        instance.token_ticker,
        `${instance.playbook_type}:${instanceId}`
      );
    }

    return result;
  }

  /**
   * Get a playbook instance by ID
   */
  _getInstance(instanceId) {
    try {
      return this.db.prepare('SELECT * FROM playbook_instances WHERE id = ?').get(instanceId);
    } catch {
      return null;
    }
  }

  /**
   * Get active playbook instances for a token
   */
  getActiveForToken(tokenAddress, chain) {
    try {
      return this.db.prepare(`
        SELECT * FROM playbook_instances 
        WHERE token_address = ? AND chain = ? AND is_active = 1
        ORDER BY started_at DESC
      `).all(tokenAddress, chain);
    } catch {
      return [];
    }
  }

  /**
   * Get all active playbook instances
   */
  getActive(playbookType = null) {
    try {
      if (playbookType) {
        return this.db.prepare(`
          SELECT * FROM playbook_instances 
          WHERE is_active = 1 AND playbook_type = ?
          ORDER BY updated_at DESC
        `).all(playbookType);
      }
      return this.db.prepare(`
        SELECT * FROM playbook_instances WHERE is_active = 1 ORDER BY updated_at DESC
      `).all();
    } catch {
      return [];
    }
  }

  /**
   * Get playbook definition (for API/documentation)
   */
  getDefinition(playbookType) {
    return PLAYBOOKS[playbookType] || null;
  }

  /**
   * Get all playbook definitions
   */
  getAllDefinitions() {
    return Object.entries(PLAYBOOKS).map(([id, pb]) => ({
      id,
      name: pb.name,
      states: pb.states,
      stateCount: pb.states.length,
      transitions: Object.keys(pb.transitions).length
    }));
  }

  /**
   * Get playbooks that need attention (stuck, overdue, etc.)
   */
  getStuckInstances(staleHours = 24) {
    try {
      return this.db.prepare(`
        SELECT * FROM playbook_instances 
        WHERE is_active = 1 
        AND updated_at < datetime('now', '-' || ? || ' hours')
        ORDER BY updated_at ASC
      `).all(staleHours);
    } catch {
      return [];
    }
  }
}

// Export both the engine and the definitions
module.exports = PlaybookEngine;
module.exports.PLAYBOOKS = PLAYBOOKS;
