/**
 * Pipeline SSE Stream — Real-time pipeline events to mobile app
 *
 * GET /api/v1/pipeline/stream
 * Content-Type: text/event-stream
 *
 * Events:
 *   progress  → agent started/running
 *   persona   → persona agent completed with signal
 *   complete  → final score + BD action decision
 *   error     → agent failure
 *
 * Buzz BD Agent v7.4.0 | Hedge Brain — Section 14
 */

const express = require('express');
const router = express.Router();

// Connected SSE clients
const clients = new Set();

// ─── GET /stream — SSE endpoint ─────────────────────
router.get('/stream', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({
    message: 'Pipeline stream connected',
    timestamp: new Date().toISOString(),
  })}\n\n`);

  // Register client
  const client = { id: Date.now(), res };
  clients.add(client);
  console.log(`[SSE] Client connected: ${client.id} (total: ${clients.size})`);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
    console.log(`[SSE] Client disconnected: ${client.id} (total: ${clients.size})`);
  });
});

// ─── GET /stream/clients — Connected client count ───
router.get('/stream/clients', (req, res) => {
  res.json({
    connected_clients: clients.size,
    timestamp: new Date().toISOString(),
  });
});

// ═════════════════════════════════════════════════════
// Broadcast functions (called by orchestrator/agents)
// ═════════════════════════════════════════════════════

/**
 * Broadcast an SSE event to all connected clients
 * @param {string} event - Event type: progress, persona, complete, error
 * @param {object} data - Event payload
 */
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify({
    ...data,
    timestamp: new Date().toISOString(),
  })}\n\n`;

  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

/**
 * Emit agent progress event
 */
function emitProgress(agentName, tokenAddress, status) {
  broadcast('progress', {
    agent: agentName,
    token: tokenAddress,
    status, // 'started' | 'running' | 'completed'
  });
}

/**
 * Emit persona signal event
 */
function emitPersonaSignal(personaName, tokenAddress, signal, confidence, score) {
  broadcast('persona', {
    persona: personaName,
    token: tokenAddress,
    signal,      // 'bullish' | 'bearish' | 'neutral'
    confidence,
    score,
  });
}

/**
 * Emit pipeline completion event
 */
function emitComplete(tokenAddress, chain, finalScore, verdict, bdAction, personaConsensus) {
  broadcast('complete', {
    token: tokenAddress,
    chain,
    score: finalScore,
    verdict,
    bd_action: bdAction,
    persona_consensus: personaConsensus,
  });
}

/**
 * Emit error event
 */
function emitError(agentName, tokenAddress, error) {
  broadcast('error', {
    agent: agentName,
    token: tokenAddress,
    error,
  });
}

module.exports = router;
module.exports.broadcast = broadcast;
module.exports.emitProgress = emitProgress;
module.exports.emitPersonaSignal = emitPersonaSignal;
module.exports.emitComplete = emitComplete;
module.exports.emitError = emitError;
