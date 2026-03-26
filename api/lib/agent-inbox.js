/**
 * Agent Inbox — ClawTeam Pattern 2
 * v8.2.0 | Structured inter-agent messaging with audit trail
 * Maps to: all 12 DNA v2.0 agents
 */

const VALID_AGENTS = [
  'signal-writer', 'signal-reviewer', 'signal-editor',
  'pipeline-scanner', 'pipeline-scorer', 'pipeline-verifier',
  'bd-proposer', 'bd-follower',
  'moltbook-commenter', 'twitter-drafter',
  'system-auditor', 'war-room-reporter',
  'brain', 'sentinel', 'chain-executor', 'ogie', 'all'
];

class AgentInbox {
  constructor(db, activityBoard, telegramNotify) {
    this.db = db;
    this.activityBoard = activityBoard;
    this.telegramNotify = telegramNotify;
  }

  send(fromAgent, toAgent, messageType, { subject, body, priority = 'normal', chain_id, token_address, token_name } = {}) {
    if (!VALID_AGENTS.includes(fromAgent) && !VALID_AGENTS.includes('all')) {
      throw new Error(`Invalid from_agent: ${fromAgent}`);
    }
    if (!VALID_AGENTS.includes(toAgent)) {
      throw new Error(`Invalid to_agent: ${toAgent}`);
    }

    const result = this.db.prepare(`
      INSERT INTO agent_inbox (from_agent, to_agent, message_type, chain_id, token_address, token_name, subject, body, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(fromAgent, toAgent, messageType, chain_id || null, token_address || null, token_name || null, subject || null, body, priority);

    if (this.activityBoard) {
      this.activityBoard.log('inbox_message', fromAgent, token_address, token_name, chain_id,
        JSON.stringify({ to: toAgent, type: messageType, priority }));
    }

    if ((toAgent === 'ogie' || priority === 'high') && messageType === 'approval_request' && this.telegramNotify) {
      try {
        this.telegramNotify(`[AGENT INBOX] ${fromAgent} → ${toAgent}\nType: ${messageType}\nSubject: ${subject || 'N/A'}\n${body.substring(0, 200)}`);
      } catch (e) {
        console.error(`[AgentInbox] Telegram notify error: ${e.message}`);
      }
    }

    return { id: result.lastInsertRowid, from: fromAgent, to: toAgent, type: messageType };
  }

  getInbox(agent, { status, type, limit = 20 } = {}) {
    let sql = `SELECT * FROM agent_inbox WHERE (to_agent = ? OR to_agent = 'all')`;
    const params = [agent];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (type) {
      sql += ` AND message_type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 WHEN 'low' THEN 2 END, created_at DESC LIMIT ?`;
    params.push(limit);

    return this.db.prepare(sql).all(...params);
  }

  updateStatus(id, status, actionedBy) {
    const updates = { status };
    if (status === 'read') {
      this.db.prepare(`UPDATE agent_inbox SET status = ?, read_at = datetime('now') WHERE id = ?`).run(status, id);
    } else if (status === 'actioned') {
      this.db.prepare(`UPDATE agent_inbox SET status = ?, actioned_at = datetime('now'), actioned_by = ? WHERE id = ?`).run(status, actionedBy || null, id);
    } else {
      this.db.prepare(`UPDATE agent_inbox SET status = ? WHERE id = ?`).run(status, id);
    }
    return { id, status };
  }

  getStats() {
    const byAgent = this.db.prepare(`
      SELECT to_agent, status, COUNT(*) as count
      FROM agent_inbox
      GROUP BY to_agent, status
    `).all();

    const byType24h = this.db.prepare(`
      SELECT message_type, COUNT(*) as count
      FROM agent_inbox
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY message_type
    `).all();

    return { by_agent: byAgent, by_type_24h: byType24h };
  }
}

module.exports = AgentInbox;
