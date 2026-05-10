/* eslint-disable no-console */
/**
 * BuzzShield — Proxy Admin Scanner (shared library) v1.0
 *
 * Pure-Node, zero-deps. Used by:
 *   - buzzshield-159-ha4-detector.js (single-EOA proxy admin, no timelock)
 *   - buzzshield-143-wasabi-detector.js (UUPS + AccessControl with single admin)
 *
 * Provides:
 *   - walkSolidityFiles(root, opts)          - file discovery (HE-03b safe)
 *   - parseSolidityFile(src)                 - lightweight AST extraction
 *   - extractContracts(src)                  - contract-level structure
 *   - extractInheritance(contractSrc)        - parent contracts list
 *   - extractImports(src)                    - import lines
 *   - extractInitializerBody(contractSrc)    - find initialize() body
 *   - extractConstructorBody(contractSrc)    - find constructor body
 *   - findGrantRoleCalls(body)               - _grantRole / _setupRole sites
 *   - findTransferOwnershipCalls(body)       - transferOwnership chain
 *   - detectTimelock(src, contractSrc)       - timelock signature check
 *   - detectMultisig(src)                    - Safe / Gnosis / multi-sig hints
 *   - detectUUPSPattern(src, parents)        - UUPSUpgradeable inheritance
 *   - detectAccessControlPattern(src,parents)- AccessControl(Upgradeable)
 *   - detectTransparentProxyPattern(src)     - TransparentUpgradeableProxy
 *   - rpcGetStorageAt(rpcUrl, addr, slot)    - on-chain EIP-1967 read
 *   - rpcGetCode(rpcUrl, addr)               - is-EOA check
 *   - EIP1967_ADMIN_SLOT, EIP1967_IMPL_SLOT  - canonical slot constants
 *
 * Conventions match buzzshield-cosmos-bech32-canon-detector.js (#165).
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

// ---------------------------------------------------------------------------
// Constants — EIP-1967 storage slots
// ---------------------------------------------------------------------------

// keccak256("eip1967.proxy.admin") - 1
const EIP1967_ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
// keccak256("eip1967.proxy.implementation") - 1
const EIP1967_IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
// keccak256("eip1967.proxy.beacon") - 1
const EIP1967_BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

// ---------------------------------------------------------------------------
// File discovery (HE-03b compliant)
// ---------------------------------------------------------------------------

const HE_03B_ALWAYS_EXCLUDE = new Set([
  "certora",
  "mocks",
  "mock",
  "lib",
  "forge-std",
]);

const VENDOR_EXCLUDE = new Set([
  "node_modules",
  ".git",
  "target",
  "build",
  "dist",
  "out",
  "cache",
  "artifacts",
]);

const SOL_EXT_RE = /\.sol$/;
const TEST_NAME_RE = /\.t\.sol$|\.test\.sol$|test\/|tests\//i;

function walkSolidityFiles(root, opts = {}) {
  const out = [];
  const stack = [path.resolve(root)];
  const includeTests = !!opts.includeTests;
  const includePeriphery = !!opts.includePeriphery;
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (HE_03B_ALWAYS_EXCLUDE.has(e.name)) continue;
      if (VENDOR_EXCLUDE.has(e.name)) continue;
      const full = path.join(cur, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile() && SOL_EXT_RE.test(e.name)) {
        if (!includeTests && TEST_NAME_RE.test(full)) continue;
        out.push(full);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Comment stripping (preserves line numbers)
// ---------------------------------------------------------------------------

function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  let inStr = false;
  let inSingleStr = false;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (!inStr && !inSingleStr && c === "/" && c2 === "/") {
      while (i < n && src[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }
    if (!inStr && !inSingleStr && c === "/" && c2 === "*") {
      out += "  ";
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        out += src[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) {
        out += "  ";
        i += 2;
      }
      continue;
    }
    if (!inSingleStr && c === '"') {
      if (inStr && src[i - 1] === "\\") {
        let bs = 0;
        let k = i - 1;
        while (k >= 0 && src[k] === "\\") {
          bs++;
          k--;
        }
        if (bs % 2 === 0) inStr = !inStr;
      } else {
        inStr = !inStr;
      }
    } else if (!inStr && c === "'") {
      if (inSingleStr && src[i - 1] === "\\") {
        let bs = 0;
        let k = i - 1;
        while (k >= 0 && src[k] === "\\") {
          bs++;
          k--;
        }
        if (bs % 2 === 0) inSingleStr = !inSingleStr;
      } else {
        inSingleStr = !inSingleStr;
      }
    }
    out += c;
    i++;
  }
  return out;
}

function findMatchingBrace(src, openIdx) {
  let depth = 0;
  let inStr = false;
  let inSingle = false;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (!inStr && !inSingle) {
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return i;
      } else if (c === '"') inStr = true;
      else if (c === "'") inSingle = true;
    } else if (inStr && c === '"') {
      let bs = 0;
      let k = i - 1;
      while (k >= 0 && src[k] === "\\") {
        bs++;
        k--;
      }
      if (bs % 2 === 0) inStr = false;
    } else if (inSingle && c === "'") {
      let bs = 0;
      let k = i - 1;
      while (k >= 0 && src[k] === "\\") {
        bs++;
        k--;
      }
      if (bs % 2 === 0) inSingle = false;
    }
  }
  return -1;
}

function findMatchingParen(src, openIdx) {
  let depth = 0;
  let inStr = false;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (!inStr) {
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth === 0) return i;
      } else if (c === '"') inStr = true;
    } else if (c === '"') {
      let bs = 0;
      let k = i - 1;
      while (k >= 0 && src[k] === "\\") {
        bs++;
        k--;
      }
      if (bs % 2 === 0) inStr = false;
    }
  }
  return -1;
}

function lineNumber(src, idx) {
  let line = 1;
  for (let i = 0; i < idx && i < src.length; i++) {
    if (src[i] === "\n") line++;
  }
  return line;
}

// ---------------------------------------------------------------------------
// Solidity parsing — contract-level
// ---------------------------------------------------------------------------

// Match: contract|abstract contract|interface|library Foo is Bar, Baz {
const CONTRACT_DECL_RE =
  /\b(contract|abstract\s+contract|interface|library)\s+(\w+)(?:\s+is\s+([^\{]+))?\s*\{/g;

function extractContracts(src) {
  const stripped = stripComments(src);
  const out = [];
  let m;
  CONTRACT_DECL_RE.lastIndex = 0;
  while ((m = CONTRACT_DECL_RE.exec(stripped)) !== null) {
    const kind = m[1].replace(/\s+/g, " ").trim();
    const name = m[2];
    const inheritsRaw = m[3] || "";
    const realOpen = m.index + m[0].length - 1; // last char is '{'
    const closeBrace = findMatchingBrace(stripped, realOpen);
    if (closeBrace === -1) continue;
    const body = stripped.slice(realOpen + 1, closeBrace);
    out.push({
      kind,
      name,
      inherits: parseInheritance(inheritsRaw),
      body,
      bodyStart: realOpen + 1,
      bodyEnd: closeBrace,
      declStart: m.index,
      line: lineNumber(stripped, m.index),
    });
  }
  return out;
}

function parseInheritance(s) {
  if (!s.trim()) return [];
  const out = [];
  // Split on top-level commas (handle generics like A(uint256))
  const parts = [];
  let depth = 0;
  let buf = "";
  for (const c of s) {
    if (c === "(") depth++;
    else if (c === ")") depth--;
    if (c === "," && depth === 0) {
      parts.push(buf);
      buf = "";
    } else buf += c;
  }
  if (buf.trim()) parts.push(buf);
  for (const p of parts) {
    const m = p.trim().match(/^(\w+)/);
    if (m) out.push(m[1]);
  }
  return out;
}

function extractImports(src) {
  const stripped = stripComments(src);
  const out = [];
  const re = /import\s+(?:\{([^}]*)\}\s+from\s+)?["']([^"']+)["'];?/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const named = m[1]
      ? m[1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const path = m[2];
    out.push({ named, path });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Function-level extraction inside a contract body
// ---------------------------------------------------------------------------

const FUNC_DECL_RE =
  /\b(function|constructor|modifier|receive|fallback)\s*(\w*)\s*\(([^)]*)\)\s*([^{;]*)(\{|;)/g;

function extractFunctions(contractBody) {
  const out = [];
  let m;
  FUNC_DECL_RE.lastIndex = 0;
  while ((m = FUNC_DECL_RE.exec(contractBody)) !== null) {
    const kind = m[1];
    const name =
      m[2] ||
      (kind === "constructor"
        ? "constructor"
        : kind === "receive"
          ? "receive"
          : kind === "fallback"
            ? "fallback"
            : "");
    const paramsRaw = m[3];
    const modifiersRaw = m[4] || "";
    const opener = m[5];
    const sigStart = m.index;
    if (opener === ";") {
      // abstract / interface declaration
      out.push({
        kind,
        name,
        paramsRaw,
        modifiersRaw,
        body: "",
        bodyStart: -1,
        bodyEnd: -1,
        sigStart,
        abstract: true,
        line: lineNumber(contractBody, sigStart),
      });
      continue;
    }
    const realOpen = m.index + m[0].length - 1;
    const closeBrace = findMatchingBrace(contractBody, realOpen);
    if (closeBrace === -1) continue;
    const body = contractBody.slice(realOpen + 1, closeBrace);
    out.push({
      kind,
      name,
      paramsRaw,
      modifiersRaw,
      body,
      bodyStart: realOpen + 1,
      bodyEnd: closeBrace,
      sigStart,
      abstract: false,
      line: lineNumber(contractBody, sigStart),
    });
  }
  return out;
}

// Find initialize function (or any function with the `initializer` modifier)
function findInitializers(contractBody) {
  const fns = extractFunctions(contractBody);
  const out = [];
  for (const fn of fns) {
    if (fn.abstract) continue;
    if (fn.kind !== "function") continue;
    const isInitName = /^initialize/i.test(fn.name);
    const hasInitMod =
      /\binitializer\b/.test(fn.modifiersRaw) ||
      /\breinitializer\s*\(/.test(fn.modifiersRaw) ||
      /\bonlyInitializing\b/.test(fn.modifiersRaw);
    if (isInitName || hasInitMod) out.push(fn);
  }
  return out;
}

function findConstructor(contractBody) {
  const fns = extractFunctions(contractBody);
  return fns.find((f) => f.kind === "constructor") || null;
}

// ---------------------------------------------------------------------------
// Pattern detection helpers
// ---------------------------------------------------------------------------

function findGrantRoleCalls(body) {
  // _grantRole(ROLE, addr); _setupRole(ROLE, addr); grantRole(ROLE, addr) (admin-only)
  const out = [];
  const re = /\b(_grantRole|_setupRole|grantRole)\s*\(/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const openParen = m.index + m[0].length - 1;
    const closeParen = findMatchingParen(body, openParen);
    if (closeParen === -1) continue;
    const args = body.slice(openParen + 1, closeParen);
    const parts = splitTopLevelComma(args).map((s) => s.trim());
    if (parts.length < 2) continue;
    out.push({
      fn: m[1],
      role: parts[0],
      addr: parts[1],
      idx: m.index,
      line: lineNumber(body, m.index),
    });
  }
  return out;
}

function findTransferOwnershipCalls(body) {
  const out = [];
  const re = /\b(transferOwnership|_transferOwnership)\s*\(/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const openParen = m.index + m[0].length - 1;
    const closeParen = findMatchingParen(body, openParen);
    if (closeParen === -1) continue;
    const arg = body.slice(openParen + 1, closeParen).trim();
    out.push({
      fn: m[1],
      addr: arg,
      idx: m.index,
      line: lineNumber(body, m.index),
    });
  }
  return out;
}

function splitTopLevelComma(s) {
  const out = [];
  let depth = 0;
  let buf = "";
  let inStr = false;
  for (const c of s) {
    if (!inStr) {
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") depth--;
      else if (c === '"') inStr = true;
    } else if (c === '"') inStr = false;
    if (c === "," && depth === 0 && !inStr) {
      out.push(buf);
      buf = "";
    } else buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

// ---------------------------------------------------------------------------
// High-level pattern detectors
// ---------------------------------------------------------------------------

const UUPS_HINTS = [
  /\bUUPSUpgradeable\b/,
  /\bIERC1822Proxiable\b/,
  /\b_authorizeUpgrade\b/,
  /\bproxiableUUID\b/,
];

const ACCESS_CONTROL_HINTS = [
  /\bAccessControl(?:Upgradeable|Enumerable|Defaultable)?\b/,
  /\bDEFAULT_ADMIN_ROLE\b/,
];

const TIMELOCK_HINTS = [
  /\bTimelockController\b/,
  /\bTimelock\b/,
  /\bMinDelay\b/i,
];

const SAFE_HINTS = [
  /\bGnosisSafe\b/i,
  /\bSafe\b(?!Cast|Math|ERC20|TransferLib)/,
  /\bMultisig\b/i,
  /\bMultiSig\b/,
];

const TRANSPARENT_PROXY_HINTS = [
  /\bTransparentUpgradeableProxy\b/,
  /\bProxyAdmin\b/,
  /\bERC1967Proxy\b/,
];

function detectUUPSPattern(src, contracts) {
  const stripped = stripComments(src);
  let hits = 0;
  for (const re of UUPS_HINTS) if (re.test(stripped)) hits++;
  // Also: any contract inherits UUPSUpgradeable
  let inheritsUUPS = false;
  for (const c of contracts) {
    if (c.inherits.some((p) => /UUPSUpgradeable|ERC1822Proxiable/.test(p))) {
      inheritsUUPS = true;
      break;
    }
  }
  return {
    detected: hits >= 1 || inheritsUUPS,
    inheritsUUPS,
    hintHits: hits,
  };
}

function detectAccessControlPattern(src, contracts) {
  const stripped = stripComments(src);
  let hits = 0;
  for (const re of ACCESS_CONTROL_HINTS) if (re.test(stripped)) hits++;
  let inheritsAC = false;
  for (const c of contracts) {
    if (
      c.inherits.some((p) =>
        /AccessControl(?:Upgradeable|Enumerable|Defaultable)?/.test(p),
      )
    ) {
      inheritsAC = true;
      break;
    }
  }
  return {
    detected: hits >= 1 || inheritsAC,
    inheritsAC,
    hintHits: hits,
  };
}

function detectTimelock(src) {
  const stripped = stripComments(src);
  for (const re of TIMELOCK_HINTS) {
    if (re.test(stripped)) return { detected: true };
  }
  return { detected: false };
}

function detectMultisig(src) {
  const stripped = stripComments(src);
  for (const re of SAFE_HINTS) {
    if (re.test(stripped)) return { detected: true };
  }
  return { detected: false };
}

function detectTransparentProxyPattern(src, contracts) {
  const stripped = stripComments(src);
  let hits = 0;
  for (const re of TRANSPARENT_PROXY_HINTS) if (re.test(stripped)) hits++;
  let inheritsTP = false;
  for (const c of contracts) {
    if (
      c.inherits.some((p) =>
        /TransparentUpgradeableProxy|ProxyAdmin|ERC1967Proxy/.test(p),
      )
    ) {
      inheritsTP = true;
      break;
    }
  }
  return {
    detected: hits >= 1 || inheritsTP,
    inheritsTP,
    hintHits: hits,
  };
}

// ---------------------------------------------------------------------------
// _authorizeUpgrade analysis (UUPS)
// ---------------------------------------------------------------------------

function findAuthorizeUpgrade(contractBody) {
  const fns = extractFunctions(contractBody);
  return (
    fns.find((f) => f.kind === "function" && f.name === "_authorizeUpgrade") ||
    null
  );
}

// Inspect _authorizeUpgrade modifiers/body for the gating mechanism.
// Returns: { gatingType: 'onlyRole' | 'onlyOwner' | 'timelock' | 'unguarded' | 'unknown',
//            roleArg: <string?>, hasMultisig: bool, hasTimelock: bool }
function analyzeAuthorizeUpgrade(authFn) {
  if (!authFn) return { gatingType: "missing" };
  const mods = authFn.modifiersRaw;
  const body = authFn.body;
  if (/\bonlyOwner\b/.test(mods)) {
    return { gatingType: "onlyOwner", roleArg: null };
  }
  const orMatch = mods.match(/\bonlyRole\s*\(\s*([^)]+)\s*\)/);
  if (orMatch) {
    return { gatingType: "onlyRole", roleArg: orMatch[1].trim() };
  }
  // Check body for require/_checkRole
  if (/\b_checkRole\s*\(/.test(body)) {
    const m = body.match(/_checkRole\s*\(\s*([^,)]+)/);
    return { gatingType: "onlyRole", roleArg: m ? m[1].trim() : null };
  }
  if (/\bhasRole\s*\(/.test(body) || /\brequire\s*\(/.test(body)) {
    return { gatingType: "require_check" };
  }
  if (!body.trim()) return { gatingType: "unguarded" };
  return { gatingType: "unknown" };
}

// ---------------------------------------------------------------------------
// Address literal classification
// ---------------------------------------------------------------------------

const HEX_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

function classifyAdminExpression(expr) {
  const e = expr.trim();
  if (HEX_ADDR_RE.test(e)) return { kind: "literal_eoa_or_contract", addr: e };
  if (e === "msg.sender") return { kind: "msg_sender" };
  if (e === "tx.origin") return { kind: "tx_origin" };
  if (/^address\s*\(\s*0\s*\)$/.test(e)) return { kind: "zero_address" };
  if (/^address\s*\(\s*this\s*\)$/.test(e)) return { kind: "self" };
  // address(timelock) / address(<param>)
  const castM = e.match(/^address\s*\(\s*(\w+)\s*\)$/);
  if (castM) return { kind: "address_cast", inner: castM[1] };
  // bare identifier (param or state var)
  if (/^\w+$/.test(e)) return { kind: "identifier", name: e };
  return { kind: "complex", raw: e };
}

// ---------------------------------------------------------------------------
// On-chain RPC helpers (for #159 EIP-1967 mode)
// ---------------------------------------------------------------------------

function rpcCall(rpcUrl, body, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(rpcUrl);
    } catch (e) {
      return reject(new Error("invalid rpc url: " + rpcUrl));
    }
    const lib = urlObj.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        method: "POST",
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
        path: urlObj.pathname + (urlObj.search || ""),
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          try {
            const parsed = JSON.parse(text);
            if (parsed.error)
              return reject(
                new Error("rpc error: " + JSON.stringify(parsed.error)),
              );
            resolve(parsed.result);
          } catch (e) {
            reject(
              new Error(
                "rpc parse: " + e.message + " body=" + text.slice(0, 200),
              ),
            );
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("rpc timeout " + timeoutMs + "ms"));
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function rpcGetStorageAt(rpcUrl, address, slot, blockTag = "latest") {
  return rpcCall(rpcUrl, {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getStorageAt",
    params: [address, slot, blockTag],
  });
}

async function rpcGetCode(rpcUrl, address, blockTag = "latest") {
  return rpcCall(rpcUrl, {
    jsonrpc: "2.0",
    id: 2,
    method: "eth_getCode",
    params: [address, blockTag],
  });
}

// Storage slot returns 32-byte value; admin address is in the low 20 bytes.
function storageValueToAddress(hex32) {
  if (typeof hex32 !== "string") return null;
  let s = hex32.toLowerCase();
  if (s.startsWith("0x")) s = s.slice(2);
  if (s.length < 40) return null;
  // Take the LAST 40 hex chars
  const addr = "0x" + s.slice(-40);
  if (addr === "0x" + "0".repeat(40)) return null;
  return addr;
}

// ---------------------------------------------------------------------------
// Convenience: read EIP-1967 admin slot + classify
// ---------------------------------------------------------------------------

async function readEIP1967AdminOnChain(rpcUrl, proxyAddr, opts = {}) {
  const slotValue = await rpcGetStorageAt(
    rpcUrl,
    proxyAddr,
    EIP1967_ADMIN_SLOT,
  );
  const adminAddr = storageValueToAddress(slotValue);
  if (!adminAddr) {
    return {
      proxy_address: proxyAddr,
      admin_address: null,
      admin_type: "Unknown",
      slot_value: slotValue,
      reason: "admin_slot_zero",
    };
  }
  // Check whether admin has bytecode (contract vs EOA)
  let code = null;
  try {
    code = await rpcGetCode(rpcUrl, adminAddr);
  } catch (e) {
    code = null;
  }
  const isContract = code && code !== "0x" && code.length > 2;
  let adminType = "EOA";
  let timelockDelaySeconds = null;
  if (isContract) {
    adminType = "Unknown";
    // Try TimelockController.getMinDelay() — selector 0xb1c5f427
    try {
      const callRes = await rpcCall(rpcUrl, {
        jsonrpc: "2.0",
        id: 3,
        method: "eth_call",
        params: [
          { to: adminAddr, data: "0xb1c5f427" }, // getMinDelay()
          "latest",
        ],
      });
      if (callRes && callRes !== "0x" && callRes.length >= 66) {
        const delay = parseInt(callRes.slice(2), 16);
        if (Number.isFinite(delay) && delay > 0) {
          adminType = "TimelockController";
          timelockDelaySeconds = delay;
        }
      }
    } catch {
      /* ignore */
    }
    // If still Unknown — try Safe.getThreshold() + Safe.VERSION()
    if (adminType === "Unknown") {
      try {
        const thr = await rpcCall(rpcUrl, {
          jsonrpc: "2.0",
          id: 4,
          method: "eth_call",
          params: [
            { to: adminAddr, data: "0xe75235b8" }, // getThreshold()
            "latest",
          ],
        });
        if (thr && thr !== "0x" && thr.length >= 66) {
          const t = parseInt(thr.slice(2), 16);
          if (t >= 1 && t < 100) adminType = "Safe";
        }
      } catch {
        /* ignore */
      }
    }
    if (adminType === "Unknown") adminType = "Contract";
  }
  return {
    proxy_address: proxyAddr,
    admin_address: adminAddr,
    admin_type: adminType,
    timelock_delay_seconds: timelockDelaySeconds,
    is_contract: !!isContract,
    code_size_bytes: isContract ? (code.length - 2) / 2 : 0,
    slot_value: slotValue,
  };
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

module.exports = {
  // constants
  EIP1967_ADMIN_SLOT,
  EIP1967_IMPL_SLOT,
  EIP1967_BEACON_SLOT,
  // discovery
  walkSolidityFiles,
  // parsing
  stripComments,
  findMatchingBrace,
  findMatchingParen,
  lineNumber,
  extractContracts,
  extractImports,
  extractFunctions,
  findInitializers,
  findConstructor,
  parseInheritance,
  splitTopLevelComma,
  // pattern primitives
  findGrantRoleCalls,
  findTransferOwnershipCalls,
  findAuthorizeUpgrade,
  analyzeAuthorizeUpgrade,
  classifyAdminExpression,
  // high-level pattern detection
  detectUUPSPattern,
  detectAccessControlPattern,
  detectTimelock,
  detectMultisig,
  detectTransparentProxyPattern,
  // RPC helpers
  rpcCall,
  rpcGetStorageAt,
  rpcGetCode,
  storageValueToAddress,
  readEIP1967AdminOnChain,
};
