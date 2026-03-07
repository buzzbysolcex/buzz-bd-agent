/**
 * Unit Tests — Strategic Orchestrator v7.0
 * 
 * Tests Decision Engine rules matching, Playbook Engine state machines,
 * and Context Engine assembly. Uses in-memory SQLite for isolation.
 * 
 * Run: npx jest api/__tests__/strategic.test.js
 */

const Database = require('better-sqlite3');
const path = require('path');

// Point to local config for tests
process.env.BUZZ_CONFIG_DIR = path.join(__dirname, '../../config');

const DecisionEngine = require('../lib/decision-engine');
const PlaybookEngine = require('../lib/playbook-engine');
const ContextEngine = require('../lib/context-engine');

let db;

// ─── SETUP / TEARDOWN ───

beforeAll(() => {
  // In-memory SQLite for test isolation
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');

  // Create the strategic tables (from migration 010)
  const migration = require('../migrations/010-strategic');
  migration.up(db);

  // Create pipeline_tokens table (mock of existing table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      ticker TEXT,
      stage TEXT DEFAULT 'discovered',
      score INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
});

afterAll(() => {
  db.close();
});

// ─── DECISION ENGINE TESTS ───

describe('DecisionEngine', () => {
  let engine;

  beforeAll(() => {
    const contextEngine = new ContextEngine(db);
    engine = new DecisionEngine(db, contextEngine);
  });

  test('should load decision rules from config', () => {
    expect(engine.rules.length).toBeGreaterThan(0);
    expect(engine.globalConstraints).toBeDefined();
    expect(engine.globalConstraints.max_active_outreach).toBe(10);
  });

  test('HOT token (score 85+, safety PASS) → IMMEDIATE_OUTREACH', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xHOT_TOKEN',
      chain: 'solana',
      tokenTicker: 'HOT',
      score: 92,
      safetyStatus: 'PASS',
      pipelineStage: 'scored',
      subAgentOutputs: { scanner: {}, safety: { safety_status: 'PASS' } }
    });

    expect(decision.type).toBe('IMMEDIATE_OUTREACH');
    expect(decision.ruleId).toBe('R001');
    expect(decision.autoExecute).toBe(true);
    expect(decision.escalateToOgie).toBe(false);
    expect(decision.confidence).toBe(90);
    expect(decision.playbook).toBe('PB-002');
  });

  test('QUALIFIED token (score 70-84, safety PASS) → QUEUE_PRIORITY', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xQUAL_TOKEN',
      chain: 'base',
      tokenTicker: 'QUAL',
      score: 75,
      safetyStatus: 'PASS',
      pipelineStage: 'scored'
    });

    expect(decision.type).toBe('QUEUE_PRIORITY');
    expect(decision.ruleId).toBe('R002');
    expect(decision.autoExecute).toBe(true);
  });

  test('QUALIFIED but safety WARN → INVESTIGATE + escalate', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xWARN_TOKEN',
      chain: 'bsc',
      tokenTicker: 'WARN',
      score: 78,
      safetyStatus: 'WARN',
      pipelineStage: 'scored'
    });

    expect(decision.type).toBe('INVESTIGATE');
    expect(decision.ruleId).toBe('R003');
    expect(decision.escalateToOgie).toBe(true);
    expect(decision.autoExecute).toBe(false);
  });

  test('WATCH token (score 50-69) → WATCH_48H', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xWATCH_TOKEN',
      chain: 'solana',
      tokenTicker: 'WATCH',
      score: 58,
      safetyStatus: 'PASS',
      pipelineStage: 'scored'
    });

    expect(decision.type).toBe('WATCH_48H');
    expect(decision.ruleId).toBe('R004');
    expect(decision.autoExecute).toBe(true);
  });

  test('LOW score (<50) → SKIP', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xLOW_TOKEN',
      chain: 'solana',
      tokenTicker: 'LOW',
      score: 35,
      safetyStatus: 'PASS',
      pipelineStage: 'scored'
    });

    expect(decision.type).toBe('SKIP');
    expect(decision.ruleId).toBe('R005');
  });

  test('Safety FAIL at any score → SKIP (priority 0 rule)', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xFAIL_TOKEN',
      chain: 'bsc',
      tokenTicker: 'FAIL',
      score: 95, // High score but safety FAIL
      safetyStatus: 'FAIL',
      pipelineStage: 'scored'
    });

    expect(decision.type).toBe('SKIP');
    expect(decision.ruleId).toBe('R006');
  });

  test('No reply after 48h → FOLLOW_UP', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xNOREPLY',
      chain: 'solana',
      tokenTicker: 'NOREPLY',
      score: 75,
      safetyStatus: 'PASS',
      pipelineStage: 'contacted',
      hoursSinceContact: 52,
      replyReceived: false
    });

    expect(decision.type).toBe('FOLLOW_UP');
    expect(decision.ruleId).toBe('R007');
  });

  test('No reply after 96h → BREAKUP', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xBREAKUP',
      chain: 'base',
      tokenTicker: 'BREAKUP',
      score: 75,
      safetyStatus: 'PASS',
      pipelineStage: 'contacted',
      hoursSinceContact: 100,
      replyReceived: false
    });

    expect(decision.type).toBe('BREAKUP');
    expect(decision.ruleId).toBe('R008');
  });

  test('Price drop >40% → PAUSE_OUTREACH', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xDROP',
      chain: 'solana',
      tokenTicker: 'DROP',
      score: 80,
      safetyStatus: 'PASS',
      pipelineStage: 'contacted',
      priceChange24h: -55
    });

    expect(decision.type).toBe('PAUSE_OUTREACH');
    expect(decision.escalateToOgie).toBe(true);
  });

  test('Reply received → ESCALATE_NEGOTIATION', async () => {
    const decision = await engine.decide({
      tokenAddress: '0xREPLY',
      chain: 'base',
      tokenTicker: 'REPLY',
      score: 80,
      safetyStatus: 'PASS',
      pipelineStage: 'contacted',
      replyReceived: true
    });

    expect(decision.type).toBe('ESCALATE_NEGOTIATION');
    expect(decision.escalateToOgie).toBe(true);
    expect(decision.playbook).toBe('PB-003');
  });

  test('Decisions are logged to database', async () => {
    // After all the tests above, we should have logged decisions
    const history = engine.getHistory(10);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].token_address).toBeDefined();
    expect(history[0].decision_type).toBeDefined();
    expect(history[0].reasoning).toBeDefined();
  });

  test('Analytics returns valid metrics', () => {
    const analytics = engine.getAnalytics();
    expect(analytics.total_decisions).toBeGreaterThan(0);
    expect(analytics.by_type).toBeDefined();
    expect(analytics.escalation_rate).toBeDefined();
  });
});

// ─── PLAYBOOK ENGINE TESTS ───

describe('PlaybookEngine', () => {
  let engine;

  beforeAll(() => {
    engine = new PlaybookEngine(db);
    
    // Register a simple test handler
    engine.registerAction('check_duplicate', async () => ({ duplicate: false }));
    engine.registerAction('dispatch_sub_agents', async () => ({ dispatched: true }));
    engine.registerAction('archive_token', async () => ({ archived: true }));
  });

  test('should return all playbook definitions', () => {
    const defs = engine.getAllDefinitions();
    expect(defs.length).toBe(4);
    expect(defs.map(d => d.id)).toEqual(['PB-001', 'PB-002', 'PB-003', 'PB-004']);
  });

  test('PB-001 definition has correct states', () => {
    const def = engine.getDefinition('PB-001');
    expect(def.name).toBe('Token Discovery → Qualification');
    expect(def.states).toContain('DISCOVERED');
    expect(def.states).toContain('SCORED');
    expect(def.states).toContain('PROSPECT');
  });

  test('should start a PB-001 instance', () => {
    const instance = engine.start('PB-001', '0xTEST_TOKEN', 'solana', 'TEST', 'unit-test');
    
    expect(instance.id).toBeDefined();
    expect(instance.playbookType).toBe('PB-001');
    expect(instance.currentState).toBe('DISCOVERED');
    expect(instance.startedAt).toBeDefined();
  });

  test('should advance PB-001 from DISCOVERED to DEDUP_CHECK', async () => {
    const instance = engine.start('PB-001', '0xADV_TOKEN', 'base', 'ADV', 'unit-test');
    const result = await engine.advance(instance.id);

    expect(result.previousState).toBe('DISCOVERED');
    expect(result.currentState).toBe('DEDUP_CHECK');
    expect(result.actionExecuted).toBe('check_duplicate');
  });

  test('should advance PB-001 from DEDUP_CHECK to SCANNING (unique token)', async () => {
    const instance = engine.start('PB-001', '0xUNIQ', 'solana', 'UNIQ', 'unit-test');
    await engine.advance(instance.id); // DISCOVERED → DEDUP_CHECK
    const result = await engine.advance(instance.id, 'unique'); // DEDUP_CHECK → SCANNING

    expect(result.currentState).toBe('SCANNING');
  });

  test('should track active playbooks for a token', () => {
    const active = engine.getActiveForToken('0xTEST_TOKEN', 'solana');
    expect(active.length).toBeGreaterThan(0);
  });

  test('should get all active playbook instances', () => {
    const all = engine.getActive();
    expect(all.length).toBeGreaterThan(0);
  });

  test('should filter active by playbook type', () => {
    const pb001 = engine.getActive('PB-001');
    pb001.forEach(i => expect(i.playbook_type).toBe('PB-001'));
  });

  test('should reject invalid playbook type', () => {
    expect(() => engine.start('PB-999', '0x', 'solana', 'X')).toThrow('Unknown playbook');
  });

  test('should require transition key for branching states', async () => {
    const instance = engine.start('PB-001', '0xBRANCH', 'bsc', 'BRANCH', 'unit-test');
    await engine.advance(instance.id); // → DEDUP_CHECK (branching state)
    
    // Advance without key should throw
    await expect(engine.advance(instance.id)).rejects.toThrow('Transition key required');
  });
});

// ─── CONTEXT ENGINE TESTS ───

describe('ContextEngine', () => {
  let engine;

  beforeAll(() => {
    engine = new ContextEngine(db);
  });

  test('should assemble context for a token', () => {
    const result = engine.assemble({
      tokenAddress: '0xCONTEXT_TEST',
      chain: 'solana',
      pipelineStage: 'scored',
      score: 75,
      subAgentOutputs: { scanner: { ticker: 'TEST' } }
    });

    expect(result.contextBlock).toBeDefined();
    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.fromCache).toBe(false);
  });

  test('should return cached context on second call', () => {
    // First call
    engine.assemble({
      tokenAddress: '0xCACHE_TEST',
      chain: 'base',
      pipelineStage: 'scored',
      score: 60,
      subAgentOutputs: null
    });

    // Second call should be cached
    const result = engine.assemble({
      tokenAddress: '0xCACHE_TEST',
      chain: 'base',
      pipelineStage: 'scored',
      score: 60,
      subAgentOutputs: null
    });

    expect(result.fromCache).toBe(true);
  });

  test('should invalidate cache for a token', () => {
    engine.assemble({
      tokenAddress: '0xINVALIDATE',
      chain: 'bsc',
      pipelineStage: 'scored',
      score: 80,
      subAgentOutputs: null
    });

    engine.invalidateToken('0xINVALIDATE', 'bsc');

    const result = engine.assemble({
      tokenAddress: '0xINVALIDATE',
      chain: 'bsc',
      pipelineStage: 'scored',
      score: 80,
      subAgentOutputs: null
    });

    expect(result.fromCache).toBe(false);
  });

  test('should include listing package for outreach stages', () => {
    const result = engine.assemble({
      tokenAddress: '0xOUTREACH',
      chain: 'solana',
      pipelineStage: 'prospect',
      score: 85,
      subAgentOutputs: null
    });

    expect(result.contextBlock).toContain('Listing Package');
  });

  test('should NOT include listing package for non-outreach stages', () => {
    // Clear cache first
    engine.invalidateToken('0xNON_OUTREACH', 'solana');
    
    const result = engine.assemble({
      tokenAddress: '0xNON_OUTREACH',
      chain: 'solana',
      pipelineStage: 'scored',
      score: 60,
      subAgentOutputs: null
    });

    expect(result.contextBlock).not.toContain('Listing Package');
  });

  test('cleanup removes expired cache entries', () => {
    // Insert an expired entry manually
    db.prepare(`
      INSERT INTO context_cache (token_address, chain, context_hash, assembled_context, token_count, expires_at)
      VALUES ('0xEXPIRED', 'solana', 'abc123', 'old context', 100, datetime('now', '-1 hour'))
    `).run();

    const cleaned = engine.cleanupCache();
    expect(cleaned).toBeGreaterThanOrEqual(1);
  });
});

// ─── MIGRATION TESTS ───

describe('Migration 010', () => {
  test('strategic_decisions table exists with correct columns', () => {
    const info = db.prepare("PRAGMA table_info(strategic_decisions)").all();
    const cols = info.map(c => c.name);
    expect(cols).toContain('token_address');
    expect(cols).toContain('chain');
    expect(cols).toContain('decision_type');
    expect(cols).toContain('reasoning');
    expect(cols).toContain('confidence');
    expect(cols).toContain('playbook_id');
  });

  test('playbook_instances table exists', () => {
    const info = db.prepare("PRAGMA table_info(playbook_instances)").all();
    const cols = info.map(c => c.name);
    expect(cols).toContain('playbook_type');
    expect(cols).toContain('current_state');
    expect(cols).toContain('state_history');
    expect(cols).toContain('is_active');
  });

  test('outreach_sequences table exists', () => {
    const info = db.prepare("PRAGMA table_info(outreach_sequences)").all();
    const cols = info.map(c => c.name);
    expect(cols).toContain('sequence_type');
    expect(cols).toContain('next_action_at');
    expect(cols).toContain('reply_received');
  });

  test('chain CHECK constraint works', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO strategic_decisions (token_address, chain, decision_type, reasoning, action_taken)
        VALUES ('0x', 'ethereum', 'TEST', 'test', 'test')
      `).run();
    }).toThrow();
  });

  test('valid chains accepted', () => {
    for (const chain of ['solana', 'base', 'bsc']) {
      expect(() => {
        db.prepare(`
          INSERT INTO strategic_decisions (token_address, chain, decision_type, reasoning, action_taken)
          VALUES ('0xCHAIN_TEST_${chain}', ?, 'TEST', 'test', 'test')
        `).run(chain);
      }).not.toThrow();
    }
  });
});
