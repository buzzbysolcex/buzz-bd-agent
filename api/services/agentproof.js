/**
 * AgentProof Telemetry Service
 * Agent #1718 on Avalanche C-Chain
 * API Key: stored in env AGENTPROOF_API_KEY
 * Tier: Pay-per-call ($0.05/call)
 * 
 * Reports task completion rates, uptime metrics, and scoring results
 * to AgentProof's trust verification system.
 * 
 * Sprint Day 9 — Wiring SDK telemetry
 */

const AGENTPROOF_BASE = 'https://oracle.agentproof.sh/api/v1';
const BUZZ_AGENT_ID = 1718;

/**
 * Report a completed task to AgentProof
 * Non-blocking — errors are logged but don't affect main flow
 */
async function reportToAgentProof({
  taskType,       // 'score_token', 'scan', 'outreach', etc.
  requestId,
  success,
  duration_ms,
  agentsCompleted,
  score,
  error
}) {
  const apiKey = process.env.AGENTPROOF_API_KEY;
  
  if (!apiKey) {
    console.log(`[agentproof] ⚠️ API key not configured — skipping telemetry`);
    return null;
  }

  try {
    const payload = {
      agent_id: BUZZ_AGENT_ID,
      task_type: taskType,
      request_id: requestId,
      status: success ? 'completed' : 'failed',
      duration_ms: duration_ms,
      metadata: {
        agents_completed: agentsCompleted || 0,
        agents_total: 5,
        score: score || null,
        error: error || null,
        version: '6.1.1',
        engine: '5-parallel-sub-agents',
        timestamp: new Date().toISOString()
      }
    };

    const res = await fetch(`${AGENTPROOF_BASE}/telemetry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Agent-ID': String(BUZZ_AGENT_ID)
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000) // 5s timeout — don't slow down main flow
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[agentproof] ✅ Telemetry reported: ${taskType} (${success ? 'success' : 'failure'})`);
      return data;
    } else {
      console.error(`[agentproof] ⚠️ HTTP ${res.status}: ${await res.text().catch(() => 'no body')}`);
      return null;
    }
  } catch (err) {
    console.error(`[agentproof] ❌ Telemetry failed:`, err.message);
    return null;
  }
}

/**
 * Report uptime heartbeat
 * Call this from a cron every 5 minutes
 */
async function reportHeartbeat() {
  const apiKey = process.env.AGENTPROOF_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${AGENTPROOF_BASE}/heartbeat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Agent-ID': String(BUZZ_AGENT_ID)
      },
      body: JSON.stringify({
        agent_id: BUZZ_AGENT_ID,
        status: 'online',
        version: '6.1.1',
        uptime_seconds: process.uptime ? Math.round(process.uptime()) : 0,
        services: {
          api: true,
          sub_agents: true,
          twitter_bot: true,
          telegram: true,
          crons: 40
        }
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      console.log(`[agentproof] 💓 Heartbeat sent`);
    }
    return res.ok;
  } catch (err) {
    console.error(`[agentproof] ❌ Heartbeat failed:`, err.message);
    return false;
  }
}

/**
 * Report aggregate stats (daily summary)
 * Call this from a daily cron
 */
async function reportDailyStats(stats) {
  const apiKey = process.env.AGENTPROOF_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${AGENTPROOF_BASE}/stats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Agent-ID': String(BUZZ_AGENT_ID)
      },
      body: JSON.stringify({
        agent_id: BUZZ_AGENT_ID,
        period: 'daily',
        date: new Date().toISOString().split('T')[0],
        metrics: {
          tokens_scored: stats.tokensScored || 0,
          avg_score: stats.avgScore || 0,
          avg_duration_ms: stats.avgDuration || 0,
          success_rate: stats.successRate || 0,
          hot_tokens: stats.hotTokens || 0,
          qualified_tokens: stats.qualifiedTokens || 0,
          api_calls: stats.apiCalls || 0,
          revenue_usd: stats.revenue || 0
        }
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      console.log(`[agentproof] 📊 Daily stats reported`);
    }
    return res.ok;
  } catch (err) {
    console.error(`[agentproof] ❌ Daily stats failed:`, err.message);
    return false;
  }
}

module.exports = { reportToAgentProof, reportHeartbeat, reportDailyStats };
