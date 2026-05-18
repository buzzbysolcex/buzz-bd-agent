/**
 * Helius WebSocket — Real-time Solana transaction monitoring
 * Endpoint: wss://mainnet.helius-rpc.com/?api-key={KEY}
 * Monitors wallet addresses from pipeline for real-time events
 */

const WebSocket = require("ws");

const HELIUS_API_KEY =
  process.env.HELIUS_API_KEY || "e4b461c1-9cf2-420e-b6dd-7a837a074355";
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

let ws = null;
let reconnectAttempts = 0;
let subscriptionId = null;
let watchedAccounts = [];
let status = {
  connected: false,
  lastEvent: null,
  eventCount: 0,
  reconnects: 0,
  watchedAccounts: 0,
};

function getDb() {
  return require("../db").getDB();
}

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS helius_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signature TEXT,
      account TEXT,
      event_type TEXT,
      slot INTEGER,
      raw_data JSON,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_helius_account ON helius_events(account);
    CREATE INDEX IF NOT EXISTS idx_helius_sig ON helius_events(signature);
  `);
}

function connect() {
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  )
    return;

  console.log(`[helius-ws] Connecting to Helius Solana mainnet...`);
  ws = new WebSocket(HELIUS_WS_URL);

  ws.on("open", () => {
    console.log("[helius-ws] Connected to Solana mainnet");
    status.connected = true;
    reconnectAttempts = 0;

    // Subscribe to watched accounts if any
    if (watchedAccounts.length > 0) {
      subscribeAccounts(watchedAccounts);
    }
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // Handle subscription confirmation
      if (msg.result !== undefined && msg.id) {
        subscriptionId = msg.result;
        console.log(`[helius-ws] Subscription confirmed: ${subscriptionId}`);
        return;
      }

      // Handle account notifications
      if (msg.method === "accountNotification" && msg.params) {
        const data = msg.params.result;
        const db = getDb();
        db.prepare(
          `
          INSERT INTO helius_events (account, event_type, slot, raw_data)
          VALUES (?, 'accountChange', ?, ?)
        `,
        ).run(
          msg.params.subscription || "",
          data?.context?.slot || 0,
          JSON.stringify(data).slice(0, 10000), // cap at 10KB
        );
        status.eventCount++;
        status.lastEvent = new Date().toISOString();
      }

      // Handle log notifications
      if (msg.method === "logsNotification" && msg.params) {
        const data = msg.params.result;
        const sig = data?.value?.signature || "";
        const db = getDb();
        db.prepare(
          `
          INSERT INTO helius_events (signature, event_type, slot, raw_data)
          VALUES (?, 'logs', ?, ?)
        `,
        ).run(
          sig,
          data?.context?.slot || 0,
          JSON.stringify(data?.value || {}).slice(0, 10000),
        );
        status.eventCount++;
        status.lastEvent = new Date().toISOString();
      }
    } catch (err) {
      // Ignore parse errors
    }
  });

  ws.on("close", (code) => {
    console.log(`[helius-ws] Disconnected (${code}). Reconnecting...`);
    status.connected = false;
    subscriptionId = null;
    scheduleReconnect();
  });

  ws.on("error", (err) => {
    console.error(`[helius-ws] Error: ${err.message}`);
    status.connected = false;
  });
}

function subscribeAccounts(accounts) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  accounts.forEach((account, i) => {
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: i + 1,
        method: "accountSubscribe",
        params: [account, { encoding: "jsonParsed", commitment: "confirmed" }],
      }),
    );
  });

  console.log(`[helius-ws] Subscribed to ${accounts.length} accounts`);
  status.watchedAccounts = accounts.length;
}

function addAccount(account) {
  if (!watchedAccounts.includes(account)) {
    watchedAccounts.push(account);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: watchedAccounts.length,
          method: "accountSubscribe",
          params: [
            account,
            { encoding: "jsonParsed", commitment: "confirmed" },
          ],
        }),
      );
    }
  }
}

function scheduleReconnect() {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000);
  reconnectAttempts++;
  status.reconnects++;
  console.log(
    `[helius-ws] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})`,
  );
  setTimeout(connect, delay);
}

function getStatus() {
  return {
    ...status,
    wsState: ws
      ? ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][ws.readyState]
      : "NOT_INITIALIZED",
    subscriptionId,
    watchedAccounts: watchedAccounts.length,
    reconnectAttempts,
  };
}

function init() {
  ensureTable();
  connect();
  console.log("[helius-ws] Service initialized");
}

module.exports = { init, connect, addAccount, subscribeAccounts, getStatus };
