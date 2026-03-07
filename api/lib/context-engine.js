/**
 * Context Engine — Assembles relevant context for Strategic Orchestrator LLM calls
 * 
 * Instead of loading ALL context every time (which would blow the token budget),
 * this engine selects relevant docs based on the current task.
 * Target: ≤8K tokens per assembled context.
 * 
 * Part of Buzz BD Agent v7.0 — Strategic Orchestrator Layer
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Config paths (Docker: /opt/buzz-config/, local dev: ./config/)
const CONFIG_BASE = process.env.BUZZ_CONFIG_DIR || '/opt/buzz-config';
const DATA_BASE = process.env.BUZZ_DATA_DIR || '/data';

// Sensitive data patterns — NEVER capture to Supermemory
const SENSITIVE_PATTERNS = [
  /commission/i,
  /\$1K/i,
  /\$1,000/i,
  /5K\s*USDT/i,
  /listing\s*fee/i,
  /api[_-]?key\s*[:=]\s*\S+/i,
  /private[_-]?key\s*[:=]\s*\S+/i,
  /wallet[_-]?key\s*[:=]\s*\S+/i,
  /secret\s*[:=]\s*\S+/i,
  /Bearer\s+\S{20,}/i,
  /sk[-_][a-zA-Z0-9]{20,}/i,
  /sm_[a-zA-Z0-9_]{20,}/i
];

class ContextEngine {
  constructor(db) {
    this.db = db;
    this._cache = {};
    this._configCache = {};
    this._supermemoryKey = process.env.SUPERMEMORY_OPENCLAW_API_KEY || null;
  }

  /**
   * Load a config file (JSON or Markdown), with caching
   */
  _loadConfig(filename) {
    if (this._configCache[filename]) return this._configCache[filename];
    
    const filepath = path.join(CONFIG_BASE, filename);
    try {
      const raw = fs.readFileSync(filepath, 'utf8');
      const data = filename.endsWith('.json') ? JSON.parse(raw) : raw;
      this._configCache[filename] = data;
      return data;
    } catch (err) {
      console.warn(`[ContextEngine] Could not load ${filename}: ${err.message}`);
      return null;
    }
  }

  /**
   * Get pipeline history for a specific token from SQLite
   */
  _getTokenHistory(tokenAddress, chain) {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM strategic_decisions 
        WHERE token_address = ? AND chain = ?
        ORDER BY created_at DESC 
        LIMIT 10
      `).all(tokenAddress, chain);
      return rows;
    } catch {
      return [];
    }
  }

  /**
   * Get pipeline entry for token
   */
  _getPipelineEntry(tokenAddress, chain) {
    try {
      const row = this.db.prepare(`
        SELECT * FROM pipeline_tokens 
        WHERE token_address = ? AND chain = ?
      `).get(tokenAddress, chain);
      return row;
    } catch {
      return null;
    }
  }

  /**
   * Get recent similar tokens (same chain, similar score range)
   */
  _getSimilarTokens(chain, score, limit = 3) {
    try {
      const rows = this.db.prepare(`
        SELECT token_ticker, token_address, score, decision_type, reasoning
        FROM strategic_decisions
        WHERE chain = ? AND score BETWEEN ? AND ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(chain, Math.max(0, score - 15), Math.min(100, score + 15), limit);
      return rows;
    } catch {
      return [];
    }
  }

  /**
   * Get active outreach sequences count
   */
  _getActiveOutreachCount() {
    try {
      const row = this.db.prepare(`
        SELECT COUNT(*) as count FROM outreach_sequences WHERE is_active = 1
      `).get();
      return row?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Check context cache
   */
  _getCachedContext(tokenAddress, chain) {
    try {
      const row = this.db.prepare(`
        SELECT assembled_context, context_hash FROM context_cache
        WHERE token_address = ? AND chain = ? AND expires_at > datetime('now')
        ORDER BY created_at DESC LIMIT 1
      `).get(tokenAddress, chain);
      return row;
    } catch {
      return null;
    }
  }

  /**
   * Store assembled context in cache
   */
  _cacheContext(tokenAddress, chain, context, tokenCount) {
    const hash = crypto.createHash('sha256').update(context).digest('hex').slice(0, 16);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h TTL
    
    try {
      this.db.prepare(`
        INSERT INTO context_cache (token_address, chain, context_hash, assembled_context, token_count, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(tokenAddress, chain, hash, context, tokenCount, expiresAt);
    } catch (err) {
      console.warn(`[ContextEngine] Cache write failed: ${err.message}`);
    }
  }

  /**
   * MAIN METHOD: Assemble context for a strategic decision
   * 
   * @param {Object} params
   * @param {string} params.tokenAddress - Token contract address
   * @param {string} params.chain - Chain (solana, base, bsc)
   * @param {string} params.pipelineStage - Current pipeline stage
   * @param {number} params.score - Token score (0-100)
   * @param {Object} params.subAgentOutputs - Combined output from 5 sub-agents
   * @returns {Object} { systemPrompt, contextBlock, estimatedTokens }
   */
  async assemble({ tokenAddress, chain, pipelineStage, score, subAgentOutputs }) {
    // Check cache first
    const cached = this._getCachedContext(tokenAddress, chain);
    if (cached) {
      return {
        systemPrompt: this._loadConfig('master-ops-context.md') || '',
        contextBlock: cached.assembled_context,
        estimatedTokens: Math.ceil(cached.assembled_context.length / 4),
        fromCache: true
      };
    }

    const blocks = [];

    // 1. ALWAYS include: Master ops context (system prompt)
    const masterOps = this._loadConfig('master-ops-context.md');

    // 2. ALWAYS include: Decision rules
    const rules = this._loadConfig('decision-rules.json');
    if (rules) {
      // Only include relevant rules based on pipeline stage
      const relevantRules = rules.rules.filter(r => {
        const cond = r.condition;
        if (cond.pipeline_stage === '*') return true;
        if (Array.isArray(cond.pipeline_stage)) return cond.pipeline_stage.includes(pipelineStage);
        return cond.pipeline_stage === pipelineStage;
      });
      blocks.push(`## Applicable Decision Rules\n${JSON.stringify(relevantRules, null, 2)}`);
    }

    // 3. ALWAYS include: Scoring rubric (condensed)
    const rubric = this._loadConfig('scoring-rubric.json');
    if (rubric) {
      const verdictKey = Object.keys(rubric.verdicts).find(k => {
        const v = rubric.verdicts[k];
        return score >= v.min && score <= v.max;
      });
      blocks.push(`## Score Context\nScore: ${score}/100 | Verdict: ${verdictKey} | Action: ${rubric.verdicts[verdictKey]?.action}`);
    }

    // 4. CONDITIONAL: Token pipeline history (if exists)
    const history = this._getTokenHistory(tokenAddress, chain);
    if (history.length > 0) {
      const historyStr = history.map(h => 
        `- ${h.created_at}: ${h.decision_type} (score: ${h.score}) — ${h.reasoning?.slice(0, 100)}`
      ).join('\n');
      blocks.push(`## Previous Decisions for This Token\n${historyStr}`);
    }

    // 5. CONDITIONAL: Pipeline entry
    const pipelineEntry = this._getPipelineEntry(tokenAddress, chain);
    if (pipelineEntry) {
      blocks.push(`## Current Pipeline Status\nStage: ${pipelineEntry.stage} | Last Updated: ${pipelineEntry.updated_at}`);
    }

    // 6. CONDITIONAL: Similar tokens for pattern matching
    if (score && chain) {
      const similar = this._getSimilarTokens(chain, score);
      if (similar.length > 0) {
        const simStr = similar.map(s => 
          `- ${s.token_ticker}: score ${s.score} → ${s.decision_type}`
        ).join('\n');
        blocks.push(`## Similar Recent Tokens\n${simStr}`);
      }
    }

    // 7. CONDITIONAL: Active outreach count (capacity check)
    const activeOutreach = this._getActiveOutreachCount();
    blocks.push(`## Outreach Capacity\nActive sequences: ${activeOutreach}/10 | Available slots: ${10 - activeOutreach}`);

    // 7b. CONDITIONAL: Supermemory semantic recall
    if (this._supermemoryKey) {
      const ticker = subAgentOutputs?.scanner?.ticker || subAgentOutputs?.scorer?.ticker || '';
      const recallQuery = `${ticker} ${chain} token evaluation listing`.trim();
      const memories = await this._recallFromSupermemory(recallQuery);
      if (memories && memories.length > 0) {
        const memStr = memories.map(m =>
          `- [${m.created_at || 'unknown'}] ${(m.content || '').slice(0, 200)}`
        ).join('\n');
        blocks.push(`## Supermemory Recall (${memories.length} results)\n${memStr}`);
      }
    }

    // 8. ALWAYS include: Sub-agent outputs (the main input)
    if (subAgentOutputs) {
      blocks.push(`## Sub-Agent Analysis Results\n${JSON.stringify(subAgentOutputs, null, 2)}`);
    }

    // 9. CONDITIONAL: Listing package (only for outreach-related stages)
    if (['prospect', 'contacted', 'negotiating'].includes(pipelineStage)) {
      const listing = this._loadConfig('listing-package.json');
      if (listing) {
        blocks.push(`## SolCex Listing Package\n${JSON.stringify(listing.listing_package, null, 2)}`);
      }
    }

    // Assemble final context
    const contextBlock = blocks.join('\n\n---\n\n');
    const estimatedTokens = Math.ceil(contextBlock.length / 4); // rough estimate

    // Cache it (2h TTL)
    this._cacheContext(tokenAddress, chain, contextBlock, estimatedTokens);

    return {
      systemPrompt: masterOps || '',
      contextBlock,
      estimatedTokens,
      fromCache: false
    };
  }

  /**
   * Recall semantically relevant memories from Supermemory
   * @param {string} query - Search query
   * @returns {Array} Array of memory objects, or empty array on failure
   */
  async _recallFromSupermemory(query) {
    if (!this._supermemoryKey) return [];
    const startTime = Date.now();
    try {
      const res = await fetch('https://api.supermemory.ai/v3/memories/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._supermemoryKey}`
        },
        body: JSON.stringify({
          query,
          limit: 5,
          container_tags: ['buzz_bd_agent']
        })
      });
      if (!res.ok) {
        console.warn(`[Supermemory] Recall HTTP ${res.status} (${Date.now() - startTime}ms)`);
        return [];
      }
      const data = await res.json();
      console.log(`[Supermemory] Recall: ${(data.results || []).length} results (${Date.now() - startTime}ms)`);
      return data.results || [];
    } catch (err) {
      console.warn(`[Supermemory] Recall failed: ${err.message} (${Date.now() - startTime}ms)`);
      return [];
    }
  }

  /**
   * Capture text to Supermemory for future semantic recall
   * Blocks sensitive data (commission, fees, API keys, wallet keys)
   * @param {string} text - Text to capture
   * @param {Object} metadata - Additional metadata
   */
  async captureToSupermemory(text, metadata = {}) {
    if (!this._supermemoryKey) return;

    // Security filter: block sensitive data
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(text)) {
        console.log('[Supermemory] BLOCKED: Sensitive data');
        return;
      }
    }

    try {
      const res = await fetch('https://api.supermemory.ai/v3/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._supermemoryKey}`
        },
        body: JSON.stringify({
          content: text,
          container_tags: ['buzz_bd_agent'],
          metadata
        })
      });
      if (!res.ok) {
        console.warn(`[Supermemory] Capture HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[Supermemory] Capture failed: ${err.message}`);
    }
  }

  /**
   * Clear expired cache entries (called by cron)
   */
  cleanupCache() {
    try {
      const result = this.db.prepare(`
        DELETE FROM context_cache WHERE expires_at < datetime('now')
      `).run();
      return result.changes;
    } catch {
      return 0;
    }
  }

  /**
   * Invalidate cache for a specific token (after pipeline change)
   */
  invalidateToken(tokenAddress, chain) {
    try {
      this.db.prepare(`
        DELETE FROM context_cache WHERE token_address = ? AND chain = ?
      `).run(tokenAddress, chain);
    } catch {}
  }

  /**
   * Reload config files (after update)
   */
  reloadConfigs() {
    this._configCache = {};
    console.log('[ContextEngine] Config cache cleared, will reload on next access');
  }
}

module.exports = ContextEngine;
