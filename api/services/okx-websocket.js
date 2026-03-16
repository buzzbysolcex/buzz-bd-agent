/**
 * OKX Public WebSocket — Real-time ticker data
 * Endpoint: wss://ws.okx.com:8443/ws/v5/public (free, no auth)
 * Stores live tickers in okx_live_tickers SQLite table
 */

const WebSocket = require('ws');

const OKX_WS_URL = 'wss://ws.okx.com:8443/ws/v5/public';
const PING_INTERVAL = 25000; // OKX requires ping < 30s
const BASE_INSTRUMENTS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT', 'XRP-USDT'];

let ws = null;
let pingTimer = null;
let reconnectAttempts = 0;
let subscribedInstruments = [...BASE_INSTRUMENTS];
let status = { connected: false, lastMessage: null, messageCount: 0, reconnects: 0, subscribedCount: 0 };

function getDb() {
  // Lazy require to avoid circular deps — server.js initializes DB first
  return require('../db').getDB();
}

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS okx_live_tickers (
      instId TEXT PRIMARY KEY,
      last REAL,
      bid REAL,
      ask REAL,
      vol24h REAL,
      high24h REAL,
      low24h REAL,
      ts TEXT,
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  console.log(`[okx-ws] Connecting to ${OKX_WS_URL}...`);
  ws = new WebSocket(OKX_WS_URL);

  ws.on('open', () => {
    console.log('[okx-ws] Connected');
    status.connected = true;
    reconnectAttempts = 0;
    startPing();
    subscribe(subscribedInstruments);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // Handle subscription confirmations
      if (msg.event === 'subscribe') {
        status.subscribedCount++;
        return;
      }

      // Handle pong
      if (msg.op === 'pong' || raw.toString() === 'pong') return;

      // Handle ticker data
      if (msg.data && msg.arg && msg.arg.channel === 'tickers') {
        const db = getDb();
        const upsert = db.prepare(`
          INSERT INTO okx_live_tickers (instId, last, bid, ask, vol24h, high24h, low24h, ts, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(instId) DO UPDATE SET
            last=excluded.last, bid=excluded.bid, ask=excluded.ask,
            vol24h=excluded.vol24h, high24h=excluded.high24h, low24h=excluded.low24h,
            ts=excluded.ts, updated_at=datetime('now')
        `);

        for (const d of msg.data) {
          upsert.run(
            d.instId,
            parseFloat(d.last) || 0,
            parseFloat(d.bidPx) || 0,
            parseFloat(d.askPx) || 0,
            parseFloat(d.vol24h) || 0,
            parseFloat(d.high24h) || 0,
            parseFloat(d.low24h) || 0,
            d.ts || ''
          );
          status.messageCount++;
          status.lastMessage = new Date().toISOString();
        }
      }
    } catch (err) {
      // Ignore parse errors for pong frames
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[okx-ws] Disconnected (${code}). Reconnecting...`);
    status.connected = false;
    stopPing();
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.error(`[okx-ws] Error: ${err.message}`);
    status.connected = false;
  });
}

function subscribe(instruments) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  // OKX allows max 240 subscriptions per connection
  // Subscribe in batches of 20
  const args = instruments.map(id => ({ channel: 'tickers', instId: id }));

  for (let i = 0; i < args.length; i += 20) {
    const batch = args.slice(i, i + 20);
    ws.send(JSON.stringify({ op: 'subscribe', args: batch }));
  }

  console.log(`[okx-ws] Subscribed to ${instruments.length} instruments`);
  status.subscribedCount = instruments.length;
}

function addInstrument(instId) {
  if (!subscribedInstruments.includes(instId)) {
    subscribedInstruments.push(instId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'tickers', instId }] }));
    }
  }
}

function startPing() {
  stopPing();
  pingTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send('ping');
    }
  }, PING_INTERVAL);
}

function stopPing() {
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
}

function scheduleReconnect() {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000); // max 60s
  reconnectAttempts++;
  status.reconnects++;
  console.log(`[okx-ws] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})`);
  setTimeout(connect, delay);
}

function getStatus() {
  return {
    ...status,
    wsState: ws ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][ws.readyState] : 'NOT_INITIALIZED',
    subscribedInstruments: subscribedInstruments.length,
    reconnectAttempts
  };
}

function init() {
  ensureTable();
  connect();
  console.log('[okx-ws] Service initialized');
}

module.exports = { init, connect, subscribe, addInstrument, getStatus };
