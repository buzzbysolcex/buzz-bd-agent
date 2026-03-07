/**
 * Strategic Orchestrator Skill — OpenClaw Integration
 * 
 * This skill hooks into the existing orchestrator's post-scan flow.
 * After the 5 sub-agents complete their parallel evaluation,
 * this module takes their combined output and runs it through
 * the Decision Engine + Playbook Engine.
 * 
 * Wiring: Orchestrator dispatches 5 sub-agents → results collected →
 *         THIS MODULE runs → produces strategic decision → executes action
 * 
 * Part of Buzz BD Agent v7.0
 */

const ContextEngine = require('/opt/buzz-api/lib/context-engine');
const DecisionEngine = require('/opt/buzz-api/lib/decision-engine');
const PlaybookEngine = require('/opt/buzz-api/lib/playbook-engine');

// These get initialized on first call (lazy loading)
let contextEngine = null;
let decisionEngine = null;
let playbookEngine = null;
let initialized = false;

/**
 * Initialize engines with database connection
 * Called once on first invocation
 */
function initialize(db, llmCaller) {
  if (initialized) return;
  
  contextEngine = new ContextEngine(db);
  decisionEngine = new DecisionEngine(db, contextEngine, { llmCaller });
  playbookEngine = new PlaybookEngine(db);
  
  // Register playbook action handlers
  registerActionHandlers(playbookEngine);
  
  initialized = true;
  console.log('[StrategicOrchestrator] Initialized with Decision + Playbook + Context engines');
}

/**
 * Register action handlers for playbook state transitions
 * These connect playbook actions to actual system operations
 */
function registerActionHandlers(engine) {
  
  // PB-001: Dedup check
  engine.registerAction('check_duplicate', async (instance, ctx) => {
    // Check if token already exists in pipeline
    // This would query the pipeline_tokens table
    return { duplicate: false }; // Placeholder — wire to actual DB check
  });

  // PB-001: Dispatch sub-agents
  engine.registerAction('dispatch_sub_agents', async (instance, ctx) => {
    // This triggers the existing sessions_spawn mechanism
    console.log(`[PB-001] Dispatching 5 sub-agents for ${instance.token_ticker || instance.token_address}`);
    return { dispatched: true, agents: 5 };
  });

  // PB-002: Find contact info
  engine.registerAction('find_contact_info', async (instance, ctx) => {
    // Pull from social-agent output (stored in context_data)
    const socialData = JSON.parse(instance.context_data || '{}');
    const contact = socialData.contact_info || null;
    return { contact };
  });

  // PB-002: Generate outreach email
  engine.registerAction('generate_outreach_email', async (instance, ctx) => {
    console.log(`[PB-002] Generating outreach email for ${instance.token_ticker}`);
    return { template: 'initial', generated: true };
  });

  // PB-002: Send via Gmail OAuth
  engine.registerAction('send_via_gmail_oauth', async (instance, ctx) => {
    console.log(`[PB-002] Sending outreach via Gmail for ${instance.token_ticker}`);
    // This would call the gmail-outreach skill
    return { sent: true, method: 'gmail_oauth' };
  });

  // PB-002: Send follow-up
  engine.registerAction('send_follow_up_email', async (instance, ctx) => {
    console.log(`[PB-002] Sending follow-up for ${instance.token_ticker}`);
    return { sent: true, template: 'follow_up' };
  });

  // PB-002: Send breakup
  engine.registerAction('send_breakup_email', async (instance, ctx) => {
    console.log(`[PB-002] Sending breakup email for ${instance.token_ticker}`);
    return { sent: true, template: 'breakup' };
  });

  // PB-003: Parse reply sentiment
  engine.registerAction('parse_reply_sentiment', async (instance, ctx) => {
    console.log(`[PB-003] Parsing reply for ${instance.token_ticker}`);
    return { sentiment: 'positive' }; // Would use LLM to classify
  });

  // PB-003: Generate deal sheet
  engine.registerAction('generate_deal_sheet', async (instance, ctx) => {
    console.log(`[PB-003] Generating deal sheet for ${instance.token_ticker}`);
    return { deal_sheet_generated: true };
  });

  // PB-003: Escalate for approval
  engine.registerAction('escalate_for_approval', async (instance, ctx) => {
    console.log(`[PB-003] Escalating ${instance.token_ticker} to Ogie for listing approval`);
    // Send Telegram notification to Ogie
    return { escalated: true, notified: 'telegram' };
  });

  // PB-004: Generate listing announcement
  engine.registerAction('generate_listing_tweet_and_email', async (instance, ctx) => {
    console.log(`[PB-004] Generating listing announcement for ${instance.token_ticker}`);
    return { tweet_drafted: true, email_drafted: true };
  });

  // Generic: Archive token
  engine.registerAction('archive_token', async (instance, ctx) => {
    console.log(`[Archive] ${instance.token_ticker} archived as SKIP`);
    return { archived: true };
  });

  // Generic: Archive cold
  engine.registerAction('archive_cold', async (instance, ctx) => {
    console.log(`[Archive] ${instance.token_ticker} archived as COLD, revisit in 30 days`);
    return { archived: true, revisit_days: 30 };
  });

  // Generic: Set rescan timer
  engine.registerAction('set_rescan_timer', async (instance, ctx) => {
    const hours = ctx.rescan_hours || 48;
    console.log(`[Watch] ${instance.token_ticker} scheduled for rescan in ${hours}h`);
    return { rescan_scheduled: true, rescan_hours: hours };
  });
}

/**
 * MAIN ENTRY POINT: Process sub-agent results through strategic layer
 * 
 * Call this after all 5 sub-agents have completed their evaluation.
 * 
 * @param {Object} db - SQLite database connection
 * @param {Function} llmCaller - Function to call MiniMax M2.5
 * @param {Object} tokenData - Token identification
 * @param {Object} subAgentOutputs - Combined outputs from 5 agents
 * @returns {Object} Strategic decision + any playbook actions triggered
 */
async function processTokenEvaluation(db, llmCaller, tokenData, subAgentOutputs) {
  // Lazy init
  initialize(db, llmCaller);

  const { tokenAddress, chain, tokenTicker } = tokenData;
  const startTime = Date.now();

  // Extract key metrics from sub-agent outputs
  const score = subAgentOutputs.scorer?.score || subAgentOutputs.scorer?.final_score || 0;
  const safetyStatus = subAgentOutputs.safety?.safety_status || 'UNKNOWN';
  
  // Determine current pipeline stage
  let pipelineStage = 'scored'; // Default after sub-agents complete
  try {
    const existing = db.prepare(
      'SELECT stage FROM pipeline_tokens WHERE token_address = ? AND chain = ?'
    ).get(tokenAddress, chain);
    if (existing) pipelineStage = existing.stage;
  } catch {}

  // Run Decision Engine
  const decision = await decisionEngine.decide({
    tokenAddress,
    chain,
    tokenTicker,
    score,
    safetyStatus,
    pipelineStage,
    subAgentOutputs
  });

  // If decision triggers a playbook, start it
  let playbookResult = null;
  if (decision.playbook && decision.autoExecute) {
    try {
      const instance = playbookEngine.start(
        decision.playbook,
        tokenAddress,
        chain,
        tokenTicker,
        `strategic-orchestrator:${decision.logId}`
      );
      
      // Advance to first action state
      playbookResult = await playbookEngine.advance(instance.id, null, {
        score,
        safetyStatus,
        subAgentOutputs
      });
    } catch (err) {
      console.error(`[StrategicOrchestrator] Playbook start failed: ${err.message}`);
      playbookResult = { error: err.message };
    }
  }

  // Update pipeline stage if decision warrants it
  if (decision.action === 'IMMEDIATE_OUTREACH' || decision.action === 'QUEUE_PRIORITY') {
    try {
      db.prepare(`
        UPDATE pipeline_tokens SET stage = 'prospect', updated_at = datetime('now')
        WHERE token_address = ? AND chain = ?
      `).run(tokenAddress, chain);
    } catch {}
  } else if (decision.action === 'SKIP') {
    try {
      db.prepare(`
        UPDATE pipeline_tokens SET stage = 'rejected', updated_at = datetime('now')
        WHERE token_address = ? AND chain = ?
      `).run(tokenAddress, chain);
    } catch {}
  }

  const result = {
    tokenAddress,
    chain,
    tokenTicker,
    score,
    safetyStatus,
    decision: {
      type: decision.type,
      action: decision.action,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      escalateToOgie: decision.escalateToOgie,
      ruleUsed: decision.ruleId
    },
    playbook: playbookResult,
    processingMs: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };

  console.log(`[StrategicOrchestrator] ${tokenTicker || tokenAddress} → ${decision.type} (confidence: ${decision.confidence}%, ${Date.now() - startTime}ms)`);

  return result;
}

/**
 * Process outreach follow-ups (called by cron)
 * Checks all active outreach sequences for overdue follow-ups
 */
async function processOutreachFollowups(db, llmCaller) {
  initialize(db, llmCaller);

  try {
    const overdueSequences = db.prepare(`
      SELECT os.*, pi.token_ticker, pi.chain
      FROM outreach_sequences os
      LEFT JOIN playbook_instances pi ON os.playbook_instance_id = pi.id
      WHERE os.is_active = 1 
      AND os.next_action_at < datetime('now')
      AND os.reply_received = 0
    `).all();

    const results = [];
    for (const seq of overdueSequences) {
      const hoursSinceContact = Math.floor(
        (Date.now() - new Date(seq.last_sent_at || seq.created_at).getTime()) / (1000 * 60 * 60)
      );

      const decision = await decisionEngine.decide({
        tokenAddress: seq.token_address,
        chain: seq.chain,
        tokenTicker: seq.token_ticker,
        score: 70, // Assume qualified since they were already contacted
        safetyStatus: 'PASS',
        pipelineStage: 'contacted',
        hoursSinceContact,
        replyReceived: false
      });

      results.push({
        sequenceId: seq.id,
        tokenTicker: seq.token_ticker,
        hoursSinceContact,
        decision: decision.type
      });
    }

    return { processed: results.length, results };
  } catch (err) {
    console.error(`[StrategicOrchestrator] Follow-up processing failed: ${err.message}`);
    return { error: err.message };
  }
}

module.exports = {
  processTokenEvaluation,
  processOutreachFollowups,
  initialize
};
