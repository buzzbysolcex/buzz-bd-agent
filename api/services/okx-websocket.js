/**
 * OKX Public WebSocket — Real-time ticker data
 * Endpoint: wss://ws.okx.com:8443/ws/v5/public (free, no auth)
 * Stores live tickers in okx_live_tickers SQLite table
 */

const WebSocket = require("ws");

const OKX_WS_URL = "wss://ws.okx.com:8443/ws/v5/public";
const PING_INTERVAL = 25000; // OKX requires ping < 30s
const BASE_INSTRUMENTS = [
  "BTC-USDT",
  "ETH-USDT",
  "SOL-USDT",
  "BNB-USDT",
  "XRP-USDT",
];

let ws = null;
let pingTimer = null;
let reconnectAttempts = 0;
let subscribedInstruments = [...BASE_INSTRUMENTS];
let status = {
  connected: false,
  lastMessage: null,
  messageCount: 0,
  reconnects: 0,
  subscribedCount: 0,
};

function getDb() {
  // Lazy require to avoid circular deps — server.js initializes DB first
  return require("../db").getDB();
}

function ensureTable() {
  const db = getDb();
  // Match existing schema: snake_case columns from prior deployment
  db.exec(`
    CREATE TABLE IF NOT EXISTS okx_live_tickers (
      inst_id TEXT PRIMARY KEY,
      last_price REAL,
      bid_px REAL,
      ask_px REAL,
      bid_sz REAL,
      ask_sz REAL,
      vol_24h REAL,
      vol_ccy_24h REAL,
      high_24h REAL,
      low_24h REAL,
      open_24h REAL,
      ts INTEGER,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function connect() {
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  )
    return;

  console.log(`[okx-ws] Connecting to ${OKX_WS_URL}...`);
  ws = new WebSocket(OKX_WS_URL);

  ws.on("open", () => {
    console.log("[okx-ws] Connected");
    status.connected = true;
    reconnectAttempts = 0;
    startPing();
    subscribe(subscribedInstruments);
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // Handle subscription confirmations
      if (msg.event === "subscribe") {
        status.subscribedCount++;
        return;
      }

      // Handle pong
      if (msg.op === "pong" || raw.toString() === "pong") return;

      // Handle ticker data
      if (msg.data && msg.arg && msg.arg.channel === "tickers") {
        const db = getDb();
        const upsert = db.prepare(`
          INSERT INTO okx_live_tickers (inst_id, last_price, bid_px, ask_px, bid_sz, ask_sz, vol_24h, vol_ccy_24h, high_24h, low_24h, open_24h, ts, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(inst_id) DO UPDATE SET
            last_price=excluded.last_price, bid_px=excluded.bid_px, ask_px=excluded.ask_px,
            bid_sz=excluded.bid_sz, ask_sz=excluded.ask_sz,
            vol_24h=excluded.vol_24h, vol_ccy_24h=excluded.vol_ccy_24h,
            high_24h=excluded.high_24h, low_24h=excluded.low_24h, open_24h=excluded.open_24h,
            ts=excluded.ts, updated_at=CURRENT_TIMESTAMP
        `);

        for (const d of msg.data) {
          upsert.run(
            d.instId,
            parseFloat(d.last) || 0,
            parseFloat(d.bidPx) || 0,
            parseFloat(d.askPx) || 0,
            parseFloat(d.bidSz) || 0,
            parseFloat(d.askSz) || 0,
            parseFloat(d.vol24h) || 0,
            parseFloat(d.volCcy24h) || 0,
            parseFloat(d.high24h) || 0,
            parseFloat(d.low24h) || 0,
            parseFloat(d.open24h) || 0,
            parseInt(d.ts) || 0,
          );
          status.messageCount++;
          status.lastMessage = new Date().toISOString();
        }
      }
    } catch (err) {
      // Ignore parse errors for pong frames
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`[okx-ws] Disconnected (${code}). Reconnecting...`);
    status.connected = false;
    stopPing();
    scheduleReconnect();
  });

  ws.on("error", (err) => {
    console.error(`[okx-ws] Error: ${err.message}`);
    status.connected = false;
  });
}

function subscribe(instruments) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  // OKX allows max 240 subscriptions per connection
  // Subscribe in batches of 20
  const args = instruments.map((id) => ({ channel: "tickers", instId: id }));

  for (let i = 0; i < args.length; i += 20) {
    const batch = args.slice(i, i + 20);
    ws.send(JSON.stringify({ op: "subscribe", args: batch }));
  }

  console.log(`[okx-ws] Subscribed to ${instruments.length} instruments`);
  status.subscribedCount = instruments.length;
}

function addInstrument(instId) {
  if (!subscribedInstruments.includes(instId)) {
    subscribedInstruments.push(instId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          op: "subscribe",
          args: [{ channel: "tickers", instId }],
        }),
      );
    }
  }
}

function startPing() {
  stopPing();
  pingTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, PING_INTERVAL);
}

function stopPing() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function scheduleReconnect() {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000); // max 60s
  reconnectAttempts++;
  status.reconnects++;
  console.log(
    `[okx-ws] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})`,
  );
  setTimeout(connect, delay);
}

function getStatus() {
  return {
    ...status,
    wsState: ws
      ? ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][ws.readyState]
      : "NOT_INITIALIZED",
    subscribedInstruments: subscribedInstruments.length,
    reconnectAttempts,
  };
}

function init() {
  ensureTable();
  connect();
  console.log("[okx-ws] Service initialized");
}

module.exports = { init, connect, subscribe, addInstrument, getStatus };
