/**
 * Activity Board — ClawTeam Pattern 3
 * v8.2.0 | Real-time pipeline activity feed
 * Maps to: system-auditor + war-room-reporter agents
 */

class ActivityBoard {
  constructor(db) {
    this.db = db;
  }

  log(eventType, agent, tokenAddress, tokenName, chainId, details) {
    try {
      this.db
        .prepare(
          `
        INSERT INTO activity_log (event_type, agent, token_address, token_name, chain_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          eventType,
          agent,
          tokenAddress || null,
          tokenName || null,
          chainId || null,
          details || null,
        );
    } catch (e) {
      console.error(`[ActivityBoard] log error: ${e.message}`);
    }
  }

  getActivity({ hours = 24, agent, eventType, limit = 50 } = {}) {
    let sql = `SELECT * FROM activity_log WHERE created_at > datetime('now', ?)`;
    const params = [`-${hours} hours`];

    if (agent) {
      sql += ` AND agent = ?`;
      params.push(agent);
    }
    if (eventType) {
      sql += ` AND event_type = ?`;
      params.push(eventType);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    return this.db.prepare(sql).all(...params);
  }

  getSummary(hours = 24) {
    const timeFilter = `-${hours} hours`;

    const pipeline = this.db
      .prepare(
        `
      SELECT event_type, COUNT(*) as count
      FROM activity_log
      WHERE created_at > datetime('now', ?) AND event_type IN ('discovery', 'scored', 'verified', 'opus_override')
      GROUP BY event_type
    `,
      )
      .all(timeFilter);

    const signals = this.db
      .prepare(
        `
      SELECT event_type, COUNT(*) as count
      FROM activity_log
      WHERE created_at > datetime('now', ?) AND event_type IN ('signal_filed', 'signal_approved', 'signal_rejected')
      GROUP BY event_type
    `,
      )
      .all(timeFilter);

    const chains = this.db
      .prepare(
        `
      SELECT event_type, COUNT(*) as count
      FROM activity_log
      WHERE created_at > datetime('now', ?) AND event_type IN ('chain_started', 'chain_completed', 'chain_failed')
      GROUP BY event_type
    `,
      )
      .all(timeFilter);

    const social = this.db
      .prepare(
        `
      SELECT event_type, COUNT(*) as count
      FROM activity_log
      WHERE created_at > datetime('now', ?) AND event_type IN ('tweet_posted', 'tweet_drafted', 'moltbook_posted')
      GROUP BY event_type
    `,
      )
      .all(timeFilter);

    const system = this.db
      .prepare(
        `
      SELECT event_type, COUNT(*) as count
      FROM activity_log
      WHERE created_at > datetime('now', ?) AND event_type IN ('cron_executed', 'alert_fired')
      GROUP BY event_type
    `,
      )
      .all(timeFilter);

    const recent = this.db
      .prepare(
        `
      SELECT * FROM activity_log
      WHERE created_at > datetime('now', ?)
      ORDER BY created_at DESC LIMIT 10
    `,
      )
      .all(timeFilter);

    const toMap = (rows) => {
      const m = {};
      for (const r of rows) m[r.event_type] = r.count;
      return m;
    };

    return {
      hours,
      pipeline: toMap(pipeline),
      signals: toMap(signals),
      chains: toMap(chains),
      social: toMap(social),
      system: toMap(system),
      recent,
    };
  }
}

module.exports = ActivityBoard;
