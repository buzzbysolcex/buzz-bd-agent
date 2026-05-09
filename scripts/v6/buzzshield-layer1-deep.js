#!/usr/bin/env node
/**
 * BuzzShield V6 — Layer 1 Deep (Consensus Analyzer v2)
 *
 * 12-phase deep analyzer that replaces regex-keyword Layer 1.
 * Every confirmed bug from the OKX/Drift/Arc/CometBFT/Sui sprint was a
 * RELATIONSHIP between two or more functions — not a keyword in one
 * function. This analyzer builds those relationships explicitly.
 *
 * Phases (sequential, each builds on prior output):
 *   1.  Inventory + AST map               (deterministic)
 *   2.  Entry-point enumeration           (deterministic)
 *   3.  State mutation tracking           (deterministic)
 *   4.  Paired function analysis (CORE)   (heuristic + Ollama optional)
 *   5.  Operation ordering (Pattern C)    (deterministic)
 *   6.  Reentrancy + callback             (deterministic)
 *   7.  Oracle + price feed (Pattern E/H) (deterministic)
 *   8.  Access control hierarchy          (heuristic + Ollama optional)
 *   9.  Signature + replay (Pattern F)    (deterministic)
 *   10. Capability injection (Pattern G)  (delegates to G-scanner)
 *   11. Off-chain trust boundary (H)      (deterministic)
 *   12. Economic invariants               (heuristic + Ollama optional)
 *
 * Usage:
 *   node buzzshield-layer1-deep.js --target <repo-path> [options]
 *
 * Options:
 *   --target <path>      Repo to scan (required)
 *   --language <lang>    Force language (auto-detected otherwise)
 *   --output <dir>       Where to write phase JSONs
 *   --ollama             Enable Ollama qwen3:14b for Phases 4/8/12
 *   --skip-phase <n,n>   Skip specific phases (e.g. --skip-phase 6,12)
 *   --max-pairs <n>      Cap on Phase 4 pair count (default 200)
 *   --verbose            Detailed output
 *
 * @version 1.0.0 — 2026-05-04 (Layer 1 v2 — consensus analyzer)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── CONFIG ─────────────────────────────────────────────────────────────────────

const CONFIG = {
  OLLAMA_URL: process.env.OLLAMA_URL || "http://localhost:11434",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen3:14b",
  MAX_PAIRS: 200,
  MAX_FILE_BYTES: 1_000_000,
  PER_LLM_TIMEOUT_MS: 30_000,
};

// ─── FILE DISCOVERY ─────────────────────────────────────────────────────────────

const HE_01_DIRS = new Set([
  "node_modules",
  "vendor",
  "target",
  "build",
  "dist",
  ".git",
  ".next",
  "out",
]);
const HE_03_PERIPHERY_DIRS = new Set([
  "test",
  "tests",
  "__tests__",
  "scripts",
  "script",
  "deploy",
  "deployments",
  "migrations",
  "periphery",
  "helpers",
  "utils",
  "ops",
  "tools",
  "examples",
]);
// HE-03b (#123, May 9 2026 — Symbiotic regression): unconditional excludes.
// FV harnesses, mock contracts, Foundry submodule deps. Mirrors the set in
// buzzshield-v6-pipeline.js. Never re-includable via --include-periphery.
const HE_03B_ALWAYS_EXCLUDE_DIRS = new Set([
  "certora",
  "mocks",
  "mock",
  "lib",
  "forge-std",
]);
const TEST_FILE_RE =
  /(?:_test\.go|\.test\.ts|\.spec\.ts|\.test\.js|\.spec\.js|^test_|_test\.py|\.t\.sol)$/;
// C/C++ tests are typically `test_*.c`, `*_test.c`, `bench_*.c`, `fuzz_*.c`
const C_TEST_FILE_RE =
  /^(?:test|bench|fuzz)_[^\/]+\.(?:c|cc|cpp|h|hpp)$|_(?:test|bench|fuzz)\.(?:c|cc|cpp|h|hpp)$/;

function discoverFiles(target, opts = {}) {
  const out = {
    solidity: [],
    rust: [],
    go: [],
    typescript: [],
    javascript: [],
    python: [],
    c: [],
    cpp: [],
  };
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (HE_01_DIRS.has(e.name)) continue;
        if (HE_03B_ALWAYS_EXCLUDE_DIRS.has(e.name)) continue; // HE-03b unconditional
        if (!opts.includePeriphery && HE_03_PERIPHERY_DIRS.has(e.name))
          continue;
        walk(full);
        continue;
      }
      if (TEST_FILE_RE.test(e.name)) continue;
      if (C_TEST_FILE_RE.test(e.name)) continue;
      const lower = e.name.toLowerCase();
      if (lower.endsWith(".sol")) out.solidity.push(full);
      else if (lower.endsWith(".rs")) out.rust.push(full);
      else if (lower.endsWith(".go")) out.go.push(full);
      else if (lower.endsWith(".ts")) out.typescript.push(full);
      else if (lower.endsWith(".js")) out.javascript.push(full);
      else if (lower.endsWith(".py")) out.python.push(full);
      else if (lower.endsWith(".c") || lower.endsWith(".h")) out.c.push(full);
      else if (
        lower.endsWith(".cc") ||
        lower.endsWith(".cpp") ||
        lower.endsWith(".cxx") ||
        lower.endsWith(".hpp") ||
        lower.endsWith(".hxx")
      )
        out.cpp.push(full);
    }
  }
  walk(target);
  return out;
}

function detectLanguage(files) {
  const ranked = Object.entries(files)
    .map(([k, v]) => [k, v.length])
    .sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || "unknown";
}

function readSafe(p) {
  try {
    const st = fs.statSync(p);
    if (st.size > CONFIG.MAX_FILE_BYTES) return null;
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function lineOf(code, idx) {
  let n = 1;
  for (let i = 0; i < idx; i++) if (code.charCodeAt(i) === 10) n++;
  return n;
}

function balancedExtract(code, openIdx, openCh, closeCh) {
  let d = 0;
  for (let i = openIdx; i < code.length; i++) {
    if (code[i] === openCh) d++;
    else if (code[i] === closeCh) {
      d--;
      if (d === 0) return code.slice(openIdx, i + 1);
    }
  }
  return null;
}

// ─── LANGUAGE EXTRACTORS ────────────────────────────────────────────────────────

/**
 * Extract Solidity functions. Returns:
 *   [{ name, file, line, visibility, modifiers, params, returns, body }]
 */
function extractSolidityFunctions(file, code) {
  const fns = [];
  const re =
    /(?:function|constructor|modifier|fallback|receive)\s+([A-Za-z_]\w*)?\s*\(([^)]*)\)\s*([^{;]*)(\{|;)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const name =
      m[1] ||
      (code.slice(m.index, m.index + 12).startsWith("constructor")
        ? "constructor"
        : code.slice(m.index, m.index + 8).startsWith("fallback")
          ? "fallback"
          : code.slice(m.index, m.index + 7).startsWith("receive")
            ? "receive"
            : null);
    if (!name) continue;
    const params = m[2].trim();
    const tail = m[3] || "";
    let visibility = "internal";
    if (/\bexternal\b/.test(tail)) visibility = "external";
    else if (/\bpublic\b/.test(tail)) visibility = "public";
    else if (/\bprivate\b/.test(tail)) visibility = "private";
    else if (/\binternal\b/.test(tail)) visibility = "internal";
    // Mutability extraction (view/pure/payable). Default = nonpayable.
    // Used by Phase 7 + Phase 12 + design-intent suppression to avoid flagging
    // read-only functions as state mutators.
    let mutability = "nonpayable";
    if (/\bview\b/.test(tail)) mutability = "view";
    else if (/\bpure\b/.test(tail)) mutability = "pure";
    else if (/\bpayable\b/.test(tail)) mutability = "payable";
    const modifiers = [];
    const modRe =
      /\b(only[A-Z]\w*|nonReentrant|whenNotPaused|whenPaused|onlyEndpoint|onlyOwner|onlyRole)\b/g;
    let mm;
    while ((mm = modRe.exec(tail)) !== null) modifiers.push(mm[1]);
    const returnsM = tail.match(/\breturns\s*\(([^)]*)\)/);
    const returns = returnsM ? returnsM[1].trim() : "";
    let body = "";
    if (m[4] === "{") {
      const ext = balancedExtract(code, code.indexOf("{", m.index), "{", "}");
      if (ext) body = ext;
    }
    fns.push({
      name,
      file,
      line: lineOf(code, m.index),
      visibility,
      modifiers,
      mutability,
      params,
      returns,
      body,
      language: "solidity",
    });
  }
  return fns;
}

/**
 * Extract Rust functions / instruction handlers.
 */
function extractRustFunctions(file, code) {
  const fns = [];
  const re =
    /(?:pub(?:\s*\([^)]+\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)\s*(?:<[^>]+>)?\s*\(([^)]*)\)\s*(?:->\s*([^\{]+))?\s*(\{)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const name = m[1];
    const params = m[2].trim();
    const ret = (m[3] || "").trim();
    const visMatch = code
      .slice(Math.max(0, m.index - 30), m.index)
      .match(/\bpub(?:\s*\([^)]+\))?\s*$/);
    const visibility = visMatch ? "pub" : "private";
    // Detect Anchor #[access_control] / #[account] above the fn
    const before = code.slice(Math.max(0, m.index - 400), m.index);
    const accessAttr = before.match(/#\[access_control\([^\]]+\)\]/);
    const isInstruction = /#\[derive\(Accounts\)\]|Context<[A-Z]/.test(params);
    const ext = balancedExtract(code, m.index + m[0].length - 1, "{", "}");
    fns.push({
      name,
      file,
      line: lineOf(code, m.index),
      visibility,
      modifiers: accessAttr ? [accessAttr[0]] : [],
      params,
      returns: ret,
      body: ext || "",
      anchor_instruction: isInstruction,
      language: "rust",
    });
  }
  return fns;
}

function extractGoFunctions(file, code) {
  const fns = [];
  const re =
    /func\s+(?:\(\s*\w+\s+\*?[A-Za-z_]\w*\s*\)\s+)?([A-Z][A-Za-z_]\w*|[a-z][A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:\(([^)]*)\)|([A-Za-z_]\w*[\s\*]*))?\s*(\{)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const name = m[1];
    const visibility = /^[A-Z]/.test(name) ? "public" : "package";
    const ext = balancedExtract(code, m.index + m[0].length - 1, "{", "}");
    fns.push({
      name,
      file,
      line: lineOf(code, m.index),
      visibility,
      modifiers: [],
      params: m[2].trim(),
      returns: (m[3] || m[4] || "").trim(),
      body: ext || "",
      language: "go",
    });
  }
  return fns;
}

function extractTSFunctions(file, code) {
  const fns = [];
  const re =
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)\s*(?:<[^>]+>)?\s*\(([^)]*)\)\s*(?::\s*([^\{]+))?\s*(\{)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const ext = balancedExtract(code, m.index + m[0].length - 1, "{", "}");
    fns.push({
      name: m[1],
      file,
      line: lineOf(code, m.index),
      visibility: /^export/.test(
        code.slice(Math.max(0, m.index - 7), m.index + 7),
      )
        ? "export"
        : "module",
      modifiers: [],
      params: m[2].trim(),
      returns: (m[3] || "").trim(),
      body: ext || "",
      language: "typescript",
    });
  }
  return fns;
}

// ─── C / C++ FUNCTION EXTRACTOR ─────────────────────────────────────────────────
//
// C function defs are deceptively hard to parse — return-type/qualifier/attribute
// tokens span multiple lines, function pointers nest parens, and macro-wrapped
// signatures (FD_FN_PURE, __attribute__((noreturn)), etc.) wrap the canonical form.
//
// Strategy: walk the source character-by-character at brace_depth 0, looking for
// `)\s*[ATTRS]\s*{`. The `)` closes a parameter list, the `{` opens the body.
// Walk back from `)` to the matching `(` (paren-balanced), then back over
// whitespace to capture the function name (the IDENT immediately preceding `(`),
// then back further to capture the prefix (return type + qualifiers + attrs),
// stopping at the previous `;`, `}` or start-of-file. Reject if the prefix
// contains `struct`/`union`/`enum`/`typedef` (those are type defs, not fn defs)
// or if the name is a control-flow keyword.

const C_CONTROL_KW = new Set([
  "if",
  "while",
  "for",
  "switch",
  "return",
  "sizeof",
  "typeof",
  "do",
  "else",
  "case",
  "default",
  "goto",
  "__typeof__",
  "__builtin_expect",
]);

function extractCFunctions(file, code) {
  // Strip comments + preprocessor + string literals — preserve length & line
  // breaks so byte offsets and lineOf() still resolve correctly.
  let src = code;
  src = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  src = src.replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
  // Multi-line `#define` macros use `\`-newline continuation. The naive
  // single-line regex only stripped the first line, leaving macro-body
  // braces in the source and breaking brace-depth tracking. Walk line by
  // line and continue stripping while the previous line ended with `\`.
  {
    const lines = src.split("\n");
    let inMacro = false;
    for (let li = 0; li < lines.length; li += 1) {
      const line = lines[li];
      if (!inMacro && /^[ \t]*#/.test(line)) inMacro = true;
      if (inMacro) {
        lines[li] = line.replace(/[^\n]/g, " ");
        if (!/\\\s*$/.test(line)) inMacro = false;
      }
    }
    src = lines.join("\n");
  }
  src = src.replace(/"(?:\\.|[^"\\])*"/g, (m) => m.replace(/[^\n]/g, " "));
  src = src.replace(/'(?:\\.|[^'\\])*'/g, (m) => m.replace(/[^\n]/g, " "));

  const fns = [];
  let braceDepth = 0;

  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (c === "{") {
      braceDepth += 1;
      continue;
    }
    if (c === "}") {
      braceDepth -= 1;
      continue;
    }
    if (c !== ")" || braceDepth !== 0) continue;

    // Peek ahead past whitespace + C attributes to look for `{`
    let j = i + 1;
    let bailout = 0;
    while (j < src.length && bailout < 1000) {
      const cc = src[j];
      if (/\s/.test(cc)) {
        j += 1;
        bailout += 1;
        continue;
      }
      if (cc === "{") break;
      // Identifier-style attribute: FD_FN_PURE, __attribute__((...)), etc.
      if (/[A-Za-z_]/.test(cc)) {
        let k = j;
        while (k < src.length && /\w/.test(src[k])) k += 1;
        while (k < src.length && /\s/.test(src[k])) k += 1;
        if (src[k] === "(") {
          let dd = 1;
          let kk = k + 1;
          while (kk < src.length && dd > 0) {
            if (src[kk] === "(") dd += 1;
            else if (src[kk] === ")") dd -= 1;
            kk += 1;
          }
          j = kk;
        } else {
          j = k;
        }
        bailout += 1;
        continue;
      }
      // Anything else (`;`, `=`, `,`, ...): not a function definition.
      break;
    }
    if (j >= src.length || src[j] !== "{") continue;
    const bodyStart = j;

    // Body via brace-matching
    let bd = 1;
    let bk = bodyStart + 1;
    while (bk < src.length && bd > 0) {
      if (src[bk] === "{") bd += 1;
      else if (src[bk] === "}") bd -= 1;
      bk += 1;
    }
    if (bd !== 0) continue;
    const bodyEnd = bk - 1;

    // Walk back from `)` to matching `(`
    let pdepth = 1;
    let p = i - 1;
    while (p >= 0 && pdepth > 0) {
      if (src[p] === ")") pdepth += 1;
      else if (src[p] === "(") pdepth -= 1;
      if (pdepth === 0) break;
      p -= 1;
    }
    if (p < 0) continue;
    const parenStart = p;
    const parenEnd = i;

    // Walk back over whitespace, then capture the IDENT name
    let q = parenStart - 1;
    while (q >= 0 && /\s/.test(src[q])) q -= 1;
    const nameEnd = q + 1;
    while (q >= 0 && /\w/.test(src[q])) q -= 1;
    const nameStart = q + 1;
    if (nameStart >= nameEnd) continue;
    const name = src.slice(nameStart, nameEnd);
    if (C_CONTROL_KW.has(name) || /^\d/.test(name)) continue;
    // The `)` we matched may have closed an attribute `__attribute__((...))`
    // or a Firedancer attribute macro `FD_FN_SECTION(...)` rather than a
    // function param list. Reject those by NAME and let the outer loop keep
    // scanning forward — the real function's `)` is still ahead.
    if (
      name === "__attribute__" ||
      /^FD_FN_/.test(name) ||
      /^_[A-Z]/.test(name) /* _Noreturn, _Alignas, etc. */
    ) {
      continue;
    }
    // It may also be a Firedancer source-macro call like `FD_MACRO_FN(some)`
    // followed immediately by another function definition. We can't tell
    // from the name alone (FD_MACRO_FN is not in our attribute patterns),
    // so we use a heuristic: if the captured "params" contain no commas,
    // type tokens, or `*` stars, it's almost certainly a macro call, not
    // a function-definition param list.
    const _params = src.slice(parenStart + 1, parenEnd).trim();
    const looksLikeParams =
      /[*,]|\b(const|void|char|int|long|short|unsigned|signed|float|double|struct|union|enum|uint\d+_t|int\d+_t|size_t|ulong|uint|ushort|uchar)\b/.test(
        _params,
      ) ||
      _params === "" ||
      _params === "void";
    if (!looksLikeParams) continue;

    // Walk back further for prefix — stop at `;` or `}` at top level
    let r = nameStart - 1;
    let lookback = 0;
    while (r >= 0 && lookback < 800) {
      const cr = src[r];
      if (cr === ";" || cr === "}") break;
      r -= 1;
      lookback += 1;
    }
    const prefix = src.slice(r + 1, nameStart).trim();
    // Reject: type definitions are not functions
    if (/\b(struct|union|enum|typedef)\b/.test(prefix)) continue;
    // C requires an explicit return type for definitions, even `void`
    if (prefix === "") continue;
    // Reject: things like `do { ... } while (...)` — `while ( ... ) {` would
    // have name == 'while' which is already filtered. But also reject if the
    // *function body* immediately follows another body (do-while), which we
    // can detect by the prefix collapsing to nothing meaningful.

    const isStatic = /\bstatic\b/.test(prefix);
    const isInline = /\binline\b/.test(prefix);
    const isExtern = /\bextern\b/.test(prefix);
    const visibility = isStatic ? "static" : isExtern ? "extern" : "external";

    const modifiers = [];
    const modRe =
      /\b(FD_FN_[A-Z_]+|__attribute__\s*\(\([^)]+\)\)|__noreturn__|__always_inline__)\b/g;
    let mm;
    while ((mm = modRe.exec(prefix)) !== null) modifiers.push(mm[1]);
    if (isInline) modifiers.push("inline");
    if (isStatic && !modifiers.includes("static")) modifiers.push("static");

    const params = src.slice(parenStart + 1, parenEnd).trim();
    const body = src.slice(bodyStart, bodyEnd + 1);
    const returns = prefix
      .replace(/\b(static|inline|extern|FD_FN_[A-Z_]+)\b/g, "")
      .replace(/__attribute__\s*\(\([^)]+\)\)/g, "")
      .trim();

    fns.push({
      name,
      file,
      line: lineOf(code, nameStart),
      visibility,
      modifiers,
      params,
      returns,
      body,
      language: "c",
    });

    // Advance past the body so we don't re-scan its `)` characters
    i = bodyEnd;
  }
  return fns;
}

function extractFunctions(file, code, language) {
  switch (language) {
    case "solidity":
      return extractSolidityFunctions(file, code);
    case "rust":
      return extractRustFunctions(file, code);
    case "go":
      return extractGoFunctions(file, code);
    case "typescript":
    case "javascript":
      return extractTSFunctions(file, code);
    case "c":
    case "cpp":
      return extractCFunctions(file, code);
    default:
      return [];
  }
}

// ─── PHASE 1: INVENTORY + AST MAP ──────────────────────────────────────────────

function runPhase1(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 1: Inventory + AST map...");
  const allFns = [];
  const stats = { files: 0, by_lang: {}, total_lines: 0 };
  const langKeys = [
    "solidity",
    "rust",
    "go",
    "typescript",
    "javascript",
    "python",
    "c",
    "cpp",
  ];
  for (const lang of langKeys) {
    const files = ctx.files[lang] || [];
    stats.by_lang[lang] = files.length;
    for (const f of files) {
      const code = readSafe(f);
      if (!code) continue;
      stats.files++;
      stats.total_lines += code.split("\n").length;
      const fns = extractFunctions(f, code, lang);
      for (const fn of fns) allFns.push(fn);
    }
  }
  ctx.functions = allFns;
  ctx.phases["1_inventory"] = {
    files: stats.files,
    functions: allFns.length,
    by_language: stats.by_lang,
    total_lines: stats.total_lines,
    elapsed_ms: Date.now() - t0,
  };
  ctx.log(
    `  → ${allFns.length} functions across ${stats.files} files in ${Date.now() - t0}ms`,
  );
}

// ─── PHASE 2: ENTRY-POINT ENUMERATION ──────────────────────────────────────────

const ACCESS_GATE_PATTERNS = [
  { re: /\bonly[A-Z]\w*\b/, kind: "role-modifier", rank: 4 },
  { re: /\bonlyOwner\b/, kind: "owner-only", rank: 5 },
  { re: /\bonlyEndpoint\b/, kind: "endpoint-only", rank: 5 },
  { re: /\bonlyRole\s*\(/, kind: "role-check", rank: 4 },
  { re: /\bhasRole\s*\(/, kind: "role-check", rank: 4 },
  { re: /\b_assertAuthorized\b/, kind: "authorize-assert", rank: 4 },
  {
    re: /\brequire\s*\(\s*msg\.sender\s*==\s*/,
    kind: "sender-eq-require",
    rank: 5,
  },
  { re: /\b#\[access_control\(/, kind: "anchor-access-control", rank: 4 },
  { re: /\bsigner\.is_signer\b/, kind: "solana-signer-check", rank: 3 },
  { re: /\b(?:ecrecover|ECDSA\.recover)\s*\(/, kind: "sig-gated", rank: 2 },
  { re: /\bnonReentrant\b/, kind: "reentrancy-guard", rank: 1 },
];

function classifyEntryPoint(fn) {
  const sig = fn.body || "";
  const mods = (fn.modifiers || []).join(" ");
  const all = mods + "\n" + sig.slice(0, 800);
  let bestRank = 0;
  let bestKind = "permissionless";
  for (const p of ACCESS_GATE_PATTERNS) {
    if (p.re.test(all)) {
      if (p.rank > bestRank) {
        bestRank = p.rank;
        bestKind = p.kind;
      }
    }
  }
  return { gate: bestKind, gate_rank: bestRank };
}

function isExternal(fn) {
  if (fn.language === "solidity")
    return fn.visibility === "external" || fn.visibility === "public";
  if (fn.language === "rust")
    return fn.visibility === "pub" || fn.anchor_instruction;
  if (fn.language === "go") return fn.visibility === "public";
  if (fn.language === "typescript" || fn.language === "javascript")
    return fn.visibility === "export";
  if (fn.language === "c" || fn.language === "cpp")
    return fn.visibility === "external";
  return false;
}

function runPhase2(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 2: Entry-point enumeration...");
  const entries = [];
  for (const fn of ctx.functions) {
    if (!isExternal(fn)) continue;
    const cls = classifyEntryPoint(fn);
    // attack-surface rank: permissionless > sig-gated > role-gated > admin-gated
    const surfaceRank =
      cls.gate_rank === 0
        ? 10
        : cls.gate_rank <= 2
          ? 7
          : cls.gate_rank === 3
            ? 5
            : cls.gate_rank === 4
              ? 3
              : 1;
    entries.push({
      name: fn.name,
      file: fn.file,
      line: fn.line,
      language: fn.language,
      access: cls.gate === "permissionless" ? "permissionless" : "gated",
      gate: cls.gate,
      gate_rank: cls.gate_rank,
      surface_rank: surfaceRank,
      modifiers: fn.modifiers || [],
    });
  }
  entries.sort((a, b) => b.surface_rank - a.surface_rank);
  ctx.entries = entries;
  ctx.phases["2_entry_points"] = {
    total: entries.length,
    permissionless: entries.filter((e) => e.access === "permissionless").length,
    gated: entries.filter((e) => e.access === "gated").length,
    top_20: entries.slice(0, 20),
    elapsed_ms: Date.now() - t0,
  };
  ctx.log(
    `  → ${entries.length} entry points (${ctx.phases["2_entry_points"].permissionless} permissionless) in ${Date.now() - t0}ms`,
  );
}

// ─── PHASE 3: STATE MUTATION TRACKING ──────────────────────────────────────────

const STATE_WRITE_PATTERNS = {
  solidity: [
    // assignment to state var (heuristic — leading identifier . field = ...)
    /([A-Za-z_]\w*(?:\.\w+)*)\s*(?:\+=|-=|=)\s*[^=]/g,
    /\bdelete\s+([A-Za-z_]\w*(?:\.\w+)*)/g,
    /\b(?:push|pop)\s*\(\s*\)/g,
  ],
  rust: [
    /([A-Za-z_]\w*(?:\.\w+)+)\s*=\s*[^=]/g,
    /\b(?:account|ctx)\.([A-Za-z_]\w*)\s*=/g,
  ],
  go: [/([A-Za-z_]\w*(?:\.\w+)+)\s*(?:\+=|-=|=)\s*[^=]/g],
  typescript: [/(?:this|state)\.([A-Za-z_]\w*)\s*(?:\+=|-=|=)\s*[^=]/g],
};

function extractWrites(fn) {
  const writes = new Set();
  const pats = STATE_WRITE_PATTERNS[fn.language] || [];
  const body = (fn.body || "").slice(0, 8000);
  for (const re of pats) {
    const r = new RegExp(re.source, re.flags);
    let m;
    while ((m = r.exec(body)) !== null) {
      const w = (m[1] || m[0]).trim();
      // filter local vars (no dot) in solidity to focus on state slots
      if (
        fn.language === "solidity" &&
        !w.includes(".") &&
        !w.startsWith("s_") &&
        !/^[A-Z_]+$/.test(w)
      )
        continue;
      if (w.length < 64) writes.add(w);
    }
  }
  return [...writes];
}

function runPhase3(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 3: State mutation tracking...");
  const mutations = [];
  const fieldToWriters = new Map();
  for (const fn of ctx.functions) {
    if (!fn.body) continue;
    const writes = extractWrites(fn);
    if (writes.length === 0) continue;
    mutations.push({ function: fn.name, file: fn.file, line: fn.line, writes });
    for (const w of writes) {
      if (!fieldToWriters.has(w)) fieldToWriters.set(w, []);
      fieldToWriters.get(w).push(fn.name);
    }
  }
  // Identify shared-state pairs (multiple writers per field)
  const sharedFields = [];
  for (const [field, writers] of fieldToWriters.entries()) {
    if (writers.length >= 2 && field.length < 60) {
      sharedFields.push({ field, writers: [...new Set(writers)] });
    }
  }
  // Sort: most-contended first
  sharedFields.sort((a, b) => b.writers.length - a.writers.length);
  ctx.mutations = mutations;
  ctx.shared_fields = sharedFields;
  ctx.phases["3_state_mutations"] = {
    mutators: mutations.length,
    shared_fields: sharedFields.length,
    top_shared: sharedFields.slice(0, 30),
    elapsed_ms: Date.now() - t0,
  };
  ctx.log(
    `  → ${mutations.length} mutators, ${sharedFields.length} shared-state fields in ${Date.now() - t0}ms`,
  );
}

// ─── PHASE 4: PAIRED FUNCTION ANALYSIS (CORE) ──────────────────────────────────

const SYMMETRIC_PAIRS = [
  ["borrow", "repay"],
  ["deposit", "withdraw"],
  ["lock", "unlock"],
  ["stake", "unstake"],
  ["mint", "burn"],
  ["open", "close"],
  ["enter", "exit"],
  ["lend", "redeem"],
  ["supply", "withdraw"],
  ["add", "remove"],
  ["create", "cancel"],
  ["register", "deregister"],
  ["provide", "withdraw"],
  ["issue", "redeem"],
];

function findFunctionByNameSubstring(fns, sub) {
  return fns.filter((f) => f.name && f.name.toLowerCase().includes(sub));
}

/**
 * 4a — Validation Coverage Asymmetry
 * For each sign/hash function, list fields included in encode/abi.encode.
 * For each verify/execute function, list fields read.
 * Delta = unprotected.
 */
function analyse4a(ctx) {
  const findings = [];
  const signers = ctx.functions.filter(
    (f) =>
      /^(hash|to_sign_bytes|signing_bytes|sign|digest|canonical|encode|getHash)$/i.test(
        f.name,
      ) ||
      (/\b(?:hash|sign|digest)\b/i.test(f.name) && f.name.length < 25),
  );
  const consumers = ctx.functions.filter((f) =>
    /^(assemble|build|construct|apply|execute|verify|validate|process)/i.test(
      f.name,
    ),
  );

  for (const signer of signers) {
    const sigFields = extractEncodedFields(signer);
    if (sigFields.length === 0) continue;
    for (const consumer of consumers) {
      // only pair if same file or shared struct context (heuristic: same file)
      if (path.dirname(signer.file) !== path.dirname(consumer.file)) continue;
      const consFields = extractReadFields(consumer);
      const gap = consFields.filter((f) => !sigFields.includes(f));
      if (gap.length === 0) continue;
      findings.push({
        kind: "validation_asymmetry",
        signer: `${signer.name} @ ${path.basename(signer.file)}:${signer.line}`,
        signer_covers: sigFields.slice(0, 12),
        consumer: `${consumer.name} @ ${path.basename(consumer.file)}:${consumer.line}`,
        consumer_reads: consFields.slice(0, 12),
        gap,
        severity: gap.length >= 2 ? "HIGH" : "MEDIUM",
        pattern: "A",
        ground_truth_ref:
          "DISC-007 Circle Arc — ProposalParts::hash excludes pol_round/proposer",
      });
    }
  }
  return findings;
}

function extractEncodedFields(fn) {
  const body = fn.body || "";
  const fields = new Set();
  // abi.encode(a, b, c) / encodePacked
  const reSol = /abi\.encode(?:Packed)?\s*\(([^)]*)\)/g;
  let m;
  while ((m = reSol.exec(body)) !== null) {
    for (const piece of m[1].split(",")) {
      const t = piece
        .trim()
        .replace(/^\w+\s+/, "")
        .replace(/^["']|["']$/g, "");
      if (t && t.length < 40) fields.add(t);
    }
  }
  // Rust style fields read into hasher
  const reHash =
    /(?:hasher|h)\.(?:update|input|append)\s*\(\s*&?([A-Za-z_][\w\.]+)/g;
  while ((m = reHash.exec(body)) !== null) fields.add(m[1].trim());
  // bytes32 chained hash inputs (keccak256(abi.encode(...)))
  const reKeccak = /keccak256\s*\(\s*abi\.encode(?:Packed)?\s*\(([^)]*)\)/g;
  while ((m = reKeccak.exec(body)) !== null) {
    for (const piece of m[1].split(",")) {
      const t = piece.trim();
      if (t) fields.add(t);
    }
  }
  return [...fields];
}

function extractReadFields(fn) {
  const body = fn.body || "";
  const fields = new Set();
  const re =
    /\b(?:msg|payload|self|this|origin|packet|header|input|params)\.([A-Za-z_]\w*)/g;
  let m;
  while ((m = re.exec(body)) !== null) fields.add(m[1]);
  // Solidity struct field reads via _packetHeader.field()
  const re2 = /\b_?[A-Za-z_]\w*\.([A-Za-z_]\w*)\s*\(/g;
  let count = 0;
  while ((m = re2.exec(body)) !== null && count < 50) {
    const name = m[1];
    if (
      name.length > 1 &&
      name.length < 24 &&
      !/^(call|send|transfer|push|pop|length|delete)$/.test(name)
    ) {
      fields.add(name);
      count++;
    }
  }
  return [...fields];
}

/**
 * 4b — Symmetric Path Comparison (forward vs reverse asymmetry)
 */
function analyse4b(ctx) {
  const findings = [];
  // Dedupe at TWO levels:
  //  1. exact pair (forward@line | reverse@line) — never re-emit the same pair
  //  2. forward+kind — one CRITICAL value-asymmetry / one HIGH guard-asymmetry
  //     finding per forward function, regardless of how many reverses matched.
  //     Without this, "deposit" pairs with withdraw/redeem/unstake/etc. and
  //     emits N copies of the same fact.
  const seenPair = new Set();
  const emittedKindPerForward = new Set();
  for (const [fwd, rev] of SYMMETRIC_PAIRS) {
    const fwdFns = findFunctionByNameSubstring(ctx.functions, fwd);
    const revFns = findFunctionByNameSubstring(ctx.functions, rev);
    if (fwdFns.length === 0 || revFns.length === 0) continue;
    for (const f of fwdFns) {
      for (const r of revFns) {
        if (path.dirname(f.file) !== path.dirname(r.file)) continue;
        if (f.name === r.name) continue;
        const pairKey = `${f.name}@${f.line}|${r.name}@${r.line}`;
        if (seenPair.has(pairKey)) continue;
        seenPair.add(pairKey);
        const fOracle =
          /\b(?:oracle|getPrice|priceOf|chainlink|pyth|aggregator)\b/i.test(
            f.body || "",
          );
        const rOracle =
          /\b(?:oracle|getPrice|priceOf|chainlink|pyth|aggregator)\b/i.test(
            r.body || "",
          );
        const fHasValueParam = /\b(?:value|price|amount|usd|notional)\b/i.test(
          f.params || "",
        );
        const rHasValueParam = /\b(?:value|price|amount|usd|notional)\b/i.test(
          r.params || "",
        );
        // Asymmetry: forward uses oracle, reverse trusts raw value param
        const valueKey = `${f.name}@${f.line}|value_computation`;
        if (
          fOracle &&
          !rOracle &&
          rHasValueParam &&
          !emittedKindPerForward.has(valueKey)
        ) {
          emittedKindPerForward.add(valueKey);
          findings.push({
            kind: "symmetric_path_asymmetry",
            forward: `${f.name} @ ${path.basename(f.file)}:${f.line} (oracle-priced)`,
            reverse: `${r.name} @ ${path.basename(r.file)}:${r.line} (raw input)`,
            asymmetry: "value_computation",
            severity: "CRITICAL",
            pattern: "A",
            ground_truth_ref:
              "Drift VAULTS-001 — manager_borrow oracle, manager_repay raw",
          });
        }
        // Asymmetry: forward has require/access check, reverse does not
        const fGuard = (f.modifiers || []).length;
        const rGuard = (r.modifiers || []).length;
        const guardKey = `${f.name}@${f.line}|access_guard`;
        if (
          fGuard > rGuard &&
          fGuard > 0 &&
          rGuard === 0 &&
          !emittedKindPerForward.has(guardKey)
        ) {
          // Design-intent suppression: in staking/naming/lending/dex protocols, many
          // forward/reverse pairs are intentionally asymmetric (admin sets, user does).
          // The manifest lists those pairs and we skip emission. Both directions are
          // tested so the manifest authors can list either order.
          const suppressed = isPairSuppressed(ctx.designIntent, f.name, r.name);
          // Delegate-call module detection: SSV-style architecture where module fns
          // are reachable only via _delegate from a guarded entry point. Lack of
          // modifier on the module fn alone is not a Pattern A bug.
          const fInDelegate = isDelegateCallModule(ctx.designIntent, f.file);
          const rInDelegate = isDelegateCallModule(ctx.designIntent, r.file);
          if (suppressed) {
            ctx.log &&
              ctx.log(
                `  [4b suppress] ${f.name}↔${r.name}: ${suppressed.reason}`,
              );
          } else if (fInDelegate || rInDelegate) {
            ctx.log &&
              ctx.log(
                `  [4b suppress] ${f.name}↔${r.name}: delegate-call module — guard at upstream entry-point`,
              );
          } else {
            emittedKindPerForward.add(guardKey);
            findings.push({
              kind: "guard_asymmetry",
              forward: `${f.name} (modifiers: ${(f.modifiers || []).join(",") || "none"})`,
              reverse: `${r.name} (modifiers: ${(r.modifiers || []).join(",") || "none"})`,
              asymmetry: "access_guard",
              severity: "HIGH",
              pattern: "A",
            });
          }
        }
      }
    }
  }
  return findings;
}

/**
 * 4c — Field Binding Gap (struct field set vs signed field set)
 */
function analyse4c(ctx) {
  const findings = [];
  // For solidity: find struct definitions and pair with their hash function
  for (const fn of ctx.functions) {
    if (fn.language !== "solidity") continue;
    if (!/hash|sign|digest|encode/i.test(fn.name)) continue;
    const code = readSafe(fn.file);
    if (!code) continue;
    // Find struct in same file
    const structs = [];
    const structRe = /struct\s+([A-Z]\w*)\s*\{([^}]+)\}/g;
    let s;
    while ((s = structRe.exec(code)) !== null) {
      const fields = s[2]
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((decl) =>
          decl
            .replace(/\/\/.*$/, "")
            .trim()
            .split(/\s+/)
            .pop(),
        );
      structs.push({ name: s[1], fields });
    }
    const signed = extractEncodedFields(fn);
    for (const st of structs) {
      const total = st.fields.length;
      const missing = st.fields.filter(
        (f) => !signed.some((s2) => s2.includes(f)),
      );
      if (total > 0 && missing.length > 0 && missing.length < total) {
        findings.push({
          kind: "field_binding_gap",
          struct: st.name,
          hash_function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
          total_fields: total,
          signed_fields: total - missing.length,
          unbound: missing,
          severity: missing.length >= 2 ? "CRITICAL" : "HIGH",
          pattern: "A",
          ground_truth_ref:
            "OKX-WC-001 — _getSessionHash covers 8/10 Session fields",
        });
      }
    }
  }
  return findings;
}

/**
 * 4d — Cross-Context Identity (msg.sender / authority misuse)
 */
function analyse4d(ctx) {
  const findings = [];
  for (const fn of ctx.functions) {
    const body = fn.body || "";
    if (!body) continue;
    // Solidity: msg.sender check inside function that is callable via delegatecall / batch
    if (fn.language === "solidity") {
      const usesMsgSender = /\bmsg\.sender\b/.test(body);
      const callsBatchOrDelegate =
        /\b(?:_batchCall|delegatecall|multicall|executeBatch|_call)\s*\(/.test(
          body,
        );
      const hasERC2771Hint =
        /trustedForwarder|isTrustedForwarder|_msgSender/.test(body);
      if (usesMsgSender && callsBatchOrDelegate) {
        findings.push({
          kind: "cross_context_identity",
          function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
          identity: "msg.sender",
          context_assumption: "caller==owner",
          actual_context: "self-call through batch/delegate path",
          severity: "CRITICAL",
          pattern: "B",
          ground_truth_ref:
            "OKX-WC-001 — _batchCall self-execution as session executor",
        });
      }
      if (usesMsgSender && hasERC2771Hint) {
        findings.push({
          kind: "cross_context_identity_2771",
          function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
          identity: "msg.sender",
          actual_context:
            "ERC-2771 forwarder rewrites msg.sender — should use _msgSender()",
          severity: "HIGH",
          pattern: "B",
        });
      }
    }
    // Rust/Solana: payload-supplied authority used without cert_origin cross-check
    if (fn.language === "rust") {
      const usesPayloadAuthority =
        /\b(?:payload|msg|input)\.(?:authority|proposer|sender|signer)\b/.test(
          body,
        );
      const hasCrossCheck =
        /\bcert_origin|expected_proposer|validator_set|signer\.is_signer\b/.test(
          body,
        );
      if (usesPayloadAuthority && !hasCrossCheck) {
        findings.push({
          kind: "payload_identity_trust",
          function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
          identity: "payload.authority",
          actual_context:
            "no cross-check against cert_origin / signer / validator set",
          severity: "HIGH",
          pattern: "B",
          ground_truth_ref:
            "DISC-002 Sui — ExecutionTimeObservation authority not cross-checked",
        });
      }
    }
  }
  return findings;
}

function runPhase4(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 4: Paired function analysis (CORE)...");
  const a = analyse4a(ctx);
  const b = analyse4b(ctx);
  const c = analyse4c(ctx);
  const d = analyse4d(ctx);
  ctx.phases["4_paired_analysis"] = {
    "4a_validation_asymmetry": a,
    "4b_symmetric_paths": b,
    "4c_field_binding": c,
    "4d_cross_context_identity": d,
    counts: { "4a": a.length, "4b": b.length, "4c": c.length, "4d": d.length },
    elapsed_ms: Date.now() - t0,
  };
  ctx.log(
    `  → 4a:${a.length} 4b:${b.length} 4c:${c.length} 4d:${d.length} in ${Date.now() - t0}ms`,
  );
}

// ─── PHASE 5: OPERATION ORDERING (Pattern C) ───────────────────────────────────

const EXPENSIVE_OPS = [
  /\b(?:ecrecover|ECDSA\.recover)\s*\(/i,
  /\bkeccak256\s*\(/i,
  /\bsha256(?:\.\w+)?\s*\(/i, // Solidity sha256, Go crypto/sha256.Sum256
  /\bripemd160\s*\(/i,
  /\b(?:verify|VerifySignature|VerifyVote|VerifyHeader|verify_signature|verify_ed25519)\s*\(/i,
  /\babi\.decode\s*\(/,
  /\.call\s*\{|\.call\s*\(/,
  /\.delegatecall\s*\(/,
  /\binvoke_signed\s*\(/,
  /\bDeserialize\s*\(/i,
  /\b(?:Marshal|Unmarshal)(?:Binary|JSON|To)?\s*\(/, // Go expensive serialisation
  /\.Sum\s*\(/, // hash.Sum
  // C / Firedancer-specific
  /\bfd_ed25519_verify\s*\(/,
  /\bfd_ed25519_sign\s*\(/,
  /\bfd_secp256k1_(?:verify|recover)\s*\(/,
  /\bfd_sha(?:256|512)_(?:hash|append|fini)\s*\(/,
  /\bfd_blake3_(?:hash|append|fini)\s*\(/,
  /\bfd_runtime_verify_/,
  /\bfd_bn254_/,
];

const CHEAP_CHECKS = [
  /\brequire\s*\(/,
  /\bassert\s*\(/,
  /\bif\s*\([^{)]*\)\s*revert\b/,
  /\b(?:>=|<=|==|!=)\s*[0-9A-Z_a-z]/,
  /\bensure!\s*\(/,
  /\bbail!\s*\(/,
  /\bif\s+\w+\s*[!=<>]=?\s*\w+/, // Go: if x == y / if x != y
  /\bif\s+err\s*!=\s*nil\b/, // Go err check
  /\bHasAddress\s*\(|\.Contains\s*\(|\.Has\s*\(/, // Go set membership cheap-check
  // C / Firedancer-specific cheap checks
  /\bif\s*\(\s*[!&]?\s*\w+\s*[!=<>]/, // if (x != y) / if (!ptr)
  /\bif\s*\(\s*\w+\s*==\s*NULL\b/, // if (x == NULL)
  /\bFD_TEST\s*\(/, // Firedancer test macro
  /\bFD_UNLIKELY\s*\(/, // Firedancer branch hint = check
  /\bFD_(?:LIKELY|UNLIKELY)\s*\(\s*\w+\s*[!=<>]/,
  /\bif\s*\(\s*\w+\s*<\s*\w+\s*\)/, // if (size < limit)
  /\bif\s*\(\s*\w+\s*>\s*\w+\s*\)/,
  /\bif\s*\(\s*sz\s*!=/, // common Firedancer size check
  /\bif\s*\(\s*FD_UNLIKELY/,
];

function runPhase5(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 5: Operation ordering...");
  const findings = [];
  for (const fn of ctx.functions) {
    const body = fn.body || "";
    if (!body) continue;
    const expensiveAt = [];
    const cheapAt = [];
    for (const re of EXPENSIVE_OPS) {
      const r = new RegExp(re.source, re.flags + "g");
      let m;
      while ((m = r.exec(body)) !== null) expensiveAt.push(m.index);
    }
    for (const re of CHEAP_CHECKS) {
      const r = new RegExp(re.source, re.flags + "g");
      let m;
      while ((m = r.exec(body)) !== null) cheapAt.push(m.index);
    }
    if (expensiveAt.length === 0 || cheapAt.length === 0) continue;
    const firstExpensive = Math.min(...expensiveAt);
    const firstCheap = Math.min(...cheapAt);
    if (firstExpensive < firstCheap) {
      const expensiveBeforeCheap = expensiveAt.filter(
        (p) => p < firstCheap,
      ).length;
      findings.push({
        kind: "expensive_before_cheap",
        function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
        expensive_count_before_first_cheap: expensiveBeforeCheap,
        amplification: expensiveBeforeCheap >= 3 ? "high" : "moderate",
        severity: expensiveBeforeCheap >= 3 ? "HIGH" : "MEDIUM",
        pattern: "C",
        ground_truth_ref:
          "CometBFT DISC-001 — tryAddVote runs verify before address check (~100x)",
      });
    }
  }
  ctx.phases["5_operation_ordering"] = {
    findings,
    elapsed_ms: Date.now() - t0,
  };
  ctx.log(`  → ${findings.length} ordering findings in ${Date.now() - t0}ms`);
}

// ─── PHASE 6: REENTRANCY + CALLBACK ────────────────────────────────────────────

const EXTERNAL_CALL_PATTERNS = [
  /\.call\s*\{[^}]*\}\s*\(/,
  /\.call\s*\(/,
  /\.delegatecall\s*\(/,
  /\.staticcall\s*\(/,
  /\.transfer\s*\(/,
  /\.send\s*\(/,
  /\binvoke\s*\(/,
  /\binvoke_signed\s*\(/,
  /\bIERC20\([^)]+\)\.transfer\b/,
  /\bsafeTransfer(?:From)?\s*\(/,
];

function runPhase6(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 6: Reentrancy + callback analysis...");
  const findings = [];
  for (const fn of ctx.functions) {
    const body = fn.body || "";
    if (!body) continue;
    // View/pure functions cannot mutate contract state — Phase 6 reentrancy
    // (state_after_external_call) is meaningless for them. Their "external
    // calls" are staticcalls and the "state writes" are to local memory return
    // values. Mutability gate added 2026-05-05 after ENS scan flagged
    // ccipBatchCallback (an `external view`) as a HIGH FP.
    if (fn.mutability === "view" || fn.mutability === "pure") continue;
    let extCallIdx = -1;
    for (const re of EXTERNAL_CALL_PATTERNS) {
      const r = new RegExp(re.source);
      const m = r.exec(body);
      if (m) {
        extCallIdx = m.index;
        break;
      }
    }
    if (extCallIdx < 0) continue;
    // State updates after external call?
    const after = body.slice(extCallIdx);
    const writesAfter = STATE_WRITE_PATTERNS[fn.language] || [];
    let stateAfter = false;
    for (const re of writesAfter) {
      const r = new RegExp(re.source, re.flags);
      if (r.test(after)) {
        stateAfter = true;
        break;
      }
    }
    const hasGuard =
      /\bnonReentrant\b/.test(JSON.stringify(fn.modifiers || []) + body) ||
      /ReentrancyGuard|reentrancy_guard/.test(body);
    if (stateAfter && !hasGuard) {
      findings.push({
        kind: "state_after_external_call",
        function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
        guard: "absent",
        severity: "HIGH",
        pattern: "D",
      });
    }
    // Hook context — Uniswap v4 / EIP-7702
    if (
      /\b(?:onERC1155Received|onERC721Received|beforeSwap|afterSwap|tokensReceived)\b/.test(
        fn.name,
      )
    ) {
      findings.push({
        kind: "callback_hook",
        function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
        observation: "msg.sender inside callback may not equal protocol caller",
        severity: "MEDIUM",
        pattern: "D",
      });
    }
  }
  ctx.phases["6_reentrancy"] = { findings, elapsed_ms: Date.now() - t0 };
  ctx.log(
    `  → ${findings.length} reentrancy/callback findings in ${Date.now() - t0}ms`,
  );
}

// ─── PHASE 7: ORACLE + PRICE FEED ──────────────────────────────────────────────

const ORACLE_READ_PATTERNS = [
  /\b(?:latestRoundData|latestAnswer|getRoundData)\s*\(/,
  /\b(?:getPrice|priceOf|getAssetPrice)\s*\(/,
  /\b(?:pyth|chainlink|tellor|aggregator|priceFeed)\b/i,
  /\bPriceUpdate\b/,
];

function runPhase7(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 7: Oracle + price feed analysis...");
  const findings = [];
  for (const fn of ctx.functions) {
    const body = fn.body || "";
    if (!body) continue;
    let isOracle = false;
    for (const re of ORACLE_READ_PATTERNS) {
      if (new RegExp(re.source, re.flags).test(body)) {
        isOracle = true;
        break;
      }
    }
    if (!isOracle && !/oracle|price/i.test(fn.name)) continue;
    // Staleness operator
    const staleStrict =
      /\b(?:posted_slot|publish_time|updatedAt|timestamp)\s*<\s*/.test(body);
    const staleLE =
      /\b(?:posted_slot|publish_time|updatedAt|timestamp)\s*<=\s*/.test(body);
    if (staleStrict && !staleLE) {
      findings.push({
        kind: "oracle_staleness_op",
        function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
        observed: "< (strict)",
        recommended: "<=",
        severity: "HIGH",
        pattern: "E",
        ground_truth_ref: "Drift ORACLE-001 — < instead of <= on posted_slot",
      });
    }
    // View/pure functions cannot mutate state — they cannot "refresh" an oracle
    // or be missing a "circuit breaker" in any meaningful sense. Skip them
    // before flagging Pattern E. (Mutability gate added 2026-05-05 after SSV +
    // ENS scans surfaced 11/18 false positives caused by flagging view fns.)
    const isReadOnly = fn.mutability === "view" || fn.mutability === "pure";
    // Permissionless refresh detection (function is external + no role gate)
    if (isExternal(fn) && !isReadOnly) {
      const cls = classifyEntryPoint(fn);
      if (cls.gate === "permissionless") {
        findings.push({
          kind: "oracle_permissionless_refresh",
          function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
          severity: "MEDIUM",
          pattern: "E",
        });
      }
    }
    // Circuit breaker missing
    const hasBreaker =
      /\b(?:circuitBreaker|maxDeviation|priceDeviation|deviationThreshold)\b/i.test(
        body,
      );
    if (!hasBreaker && isOracle && !isReadOnly) {
      findings.push({
        kind: "oracle_no_circuit_breaker",
        function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
        severity: "LOW",
        pattern: "E",
      });
    }
  }
  ctx.phases["7_oracle"] = { findings, elapsed_ms: Date.now() - t0 };
  ctx.log(`  → ${findings.length} oracle findings in ${Date.now() - t0}ms`);
}

// ─── PHASE 8: ACCESS CONTROL HIERARCHY ─────────────────────────────────────────

function runPhase8(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 8: Access control hierarchy mapping...");
  const roles = new Map(); // role -> [functions]
  for (const fn of ctx.functions) {
    const body = fn.body || "";
    const mods = (fn.modifiers || []).join(" ");
    const roleMatch =
      mods.match(/only([A-Z]\w+)/) || body.match(/onlyRole\s*\(\s*([A-Z_]+)/);
    const role = roleMatch
      ? roleMatch[1]
      : mods.includes("onlyOwner")
        ? "Owner"
        : null;
    if (!role) continue;
    if (!roles.has(role)) roles.set(role, []);
    roles
      .get(role)
      .push({ name: fn.name, file: path.basename(fn.file), line: fn.line });
  }
  const escalations = [];
  for (const [role, fns] of roles.entries()) {
    for (const fn of fns) {
      const fnFull = ctx.functions.find(
        (f) => f.name === fn.name && f.line === fn.line,
      );
      const body = fnFull?.body || "";
      // Detects: role can call grantRole/transferOwnership/setAdmin/setRole/setOperator
      if (
        /\b(?:grantRole|transferOwnership|setAdmin|setOwner|setOperator|addValidator|registerExecutor|setPermission)\s*\(/.test(
          body,
        )
      ) {
        escalations.push({
          role,
          function: `${fn.name} @ ${fn.file}:${fn.line}`,
          can_escalate_to: "higher_or_equal_role",
          severity: role === "Owner" ? "INFO" : "HIGH",
          pattern: "B",
        });
      }
    }
  }
  // Timelock detection
  const hasTimelock = ctx.functions.some((f) =>
    /\b(?:timelock|TimelockController|delay)\b/i.test(f.body || ""),
  );
  ctx.phases["8_access_control"] = {
    roles: [...roles.entries()].map(([r, fs]) => ({
      role: r,
      functions: fs.length,
      examples: fs.slice(0, 5),
    })),
    escalations,
    timelock_present: hasTimelock,
    elapsed_ms: Date.now() - t0,
  };
  ctx.log(
    `  → ${roles.size} roles, ${escalations.length} escalations${hasTimelock ? ", timelock present" : ", NO timelock"} in ${Date.now() - t0}ms`,
  );
}

// ─── PHASE 9: SIGNATURE + REPLAY ──────────────────────────────────────────────

function runPhase9(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 9: Signature + replay analysis...");
  const findings = [];
  for (const fn of ctx.functions) {
    const body = fn.body || "";
    const isSigVerify =
      /\b(?:ecrecover|ECDSA\.recover|verify_signature|verify_ed25519|verifySchnorr|recoverSigner|tryRecover)\s*\(/.test(
        body,
      ) || /\bisValidSignature\s*\(/.test(body);
    if (!isSigVerify) continue;
    // Field-set check on the signed digest
    const signed = extractEncodedFields(fn);
    const signedStr = signed.join(" ").toLowerCase();
    const checks = {
      chainId: /chainid|chain_id|block\.chainid|chain.id/i.test(signedStr),
      contract:
        /address\(this\)|self_address|verifyingcontract|verifying_contract/i.test(
          signedStr,
        ),
      nonce: /nonce/i.test(signedStr),
      deadline: /deadline|expiry|expires|valid_until/i.test(signedStr),
    };
    const missing = Object.entries(checks)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      findings.push({
        kind: "signature_field_gap",
        function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
        signed_fields: signed.slice(0, 12),
        missing,
        severity: missing.includes("chainId")
          ? "HIGH"
          : missing.length >= 3
            ? "HIGH"
            : "MEDIUM",
        pattern: "F",
        ground_truth_ref:
          "DISC-009 Circle Arc — chain_id excluded from sign-bytes",
      });
    }
    // s-malleability: ecrecover without explicit s-bound check
    if (
      /ecrecover/.test(body) &&
      !/0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0|s\s*<=\s*/.test(
        body,
      )
    ) {
      findings.push({
        kind: "signature_malleability",
        function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
        severity: "LOW",
        pattern: "F",
      });
    }
  }
  ctx.phases["9_signature_replay"] = { findings, elapsed_ms: Date.now() - t0 };
  ctx.log(`  → ${findings.length} signature findings in ${Date.now() - t0}ms`);
}

// ─── PHASE 10: CAPABILITY INJECTION (Pattern G) ────────────────────────────────

function runPhase10(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 10: Capability injection (Pattern G)...");
  const findings = [];
  for (const fn of ctx.functions) {
    const body = fn.body || "";
    if (!body) continue;
    // ERC-721/1155 receive hook that is NOT just acknowledging
    if (/^onERC(721|1155)(Batch)?Received$/.test(fn.name)) {
      const hasStateMod = extractWrites(fn).length > 0;
      if (hasStateMod) {
        findings.push({
          kind: "asset_intake_modifies_state",
          function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
          severity: "HIGH",
          pattern: "G",
          ground_truth_ref:
            "GROK-BANKR-001 — gifted Bankr Club NFT auto-unlocked transfer toolset ($174K)",
        });
      }
    }
    // Capability gate via balanceOf/ownerOf returning > 0
    if (
      /(?:balanceOf|ownerOf|hasRole|isMember)\s*\([^)]*\)\s*(?:>\s*0|>=\s*1|!=\s*0)/.test(
        body,
      )
    ) {
      findings.push({
        kind: "token_gated_capability",
        function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
        severity: "HIGH",
        pattern: "G",
      });
    }
    // Solidity modifier keyed to wallet contents
    for (const mod of fn.modifiers || []) {
      if (
        /^(hasNFT|holdsToken|memberOf|onlyHolders|onlyMembers|onlyClubMember|onlyNFTHolder)$/.test(
          mod,
        )
      ) {
        findings.push({
          kind: "wallet_state_modifier",
          function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
          modifier: mod,
          severity: "MEDIUM",
          pattern: "G",
        });
      }
    }
  }
  ctx.phases["10_capability_injection"] = {
    findings,
    elapsed_ms: Date.now() - t0,
  };
  ctx.log(`  → ${findings.length} Pattern G findings in ${Date.now() - t0}ms`);
}

// ─── PHASE 11: OFF-CHAIN TRUST BOUNDARY (Pattern H) ────────────────────────────

// Strong markers: each one alone is enough to flag (specific to LZ-style off-chain trust).
// Weak markers (executor/relayer) only flag when paired with another weak/strong marker
// in the same function — pure consensus code uses these terms legitimately.
const H_STRONG_PATTERNS = [
  {
    re: /\b(?:singleVerifier|defaultVerifier|trustedVerifier|setDefaultVerifier|UlnConfig)\b/,
    kind: "single_verifier_config",
    severity: "HIGH",
  },
  {
    re: /\b(?:DVN|dvnConfig|DVNConfig|requiredDVN|optionalDVN)\b/,
    kind: "dvn_config_surface",
    severity: "MEDIUM",
  },
  {
    re: /\b(?:requiredVerifications|requiredDVNCount|optionalDVNThreshold)\s*[<=>]/,
    kind: "quorum_check",
    severity: "MEDIUM",
  },
  {
    re: /\b(?:trustedRemote|trustedRemoteLookup|setPeer|setTrustedRemote)\b/,
    kind: "cross_chain_trust_anchor",
    severity: "MEDIUM",
  },
  {
    re: /\b(?:durableNonce|nonceAccount|preSignedTx|preSignedTransaction)\b/,
    kind: "pre_signed_durable_nonce",
    severity: "HIGH",
  },
  {
    re: /\b(?:committeeRoot|merkleRoot|blockHeaderRoot|stateRoot)\s*=/,
    kind: "externally_set_root",
    severity: "MEDIUM",
  },
];

const H_WEAK_PATTERNS = [
  { re: /\b(?:executor|Executor)\b/, kind: "executor_term" },
  { re: /\b(?:relayer|Relayer)\b/, kind: "relayer_term" },
  {
    re: /\b(?:bridgeMessage|crossChainMessage|lzReceive|nonblockingLzReceive)\b/,
    kind: "cross_chain_message",
  },
];

function runPhase11(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 11: Off-chain trust boundary...");
  const findings = [];
  for (const fn of ctx.functions) {
    const body = fn.body || "";
    if (!body) continue;
    // STRONG patterns — each one alone suffices.
    for (const p of H_STRONG_PATTERNS) {
      if (new RegExp(p.re.source, p.re.flags).test(body)) {
        findings.push({
          kind: p.kind,
          function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
          severity: p.severity,
          pattern: "H",
          marker_strength: "strong",
          ground_truth_ref:
            "KELP-LZ-001 — LayerZero default single-verifier ($293M April 18)",
        });
      }
    }
    // WEAK patterns — only flag when 2+ co-occur in the same function (signals a true
    // off-chain bridge/relayer module, not generic consensus terminology).
    let weakCount = 0;
    const weakKinds = [];
    for (const p of H_WEAK_PATTERNS) {
      if (new RegExp(p.re.source, p.re.flags).test(body)) {
        weakCount++;
        weakKinds.push(p.kind);
      }
    }
    if (weakCount >= 2) {
      findings.push({
        kind: "offchain_dispatch_module",
        function: `${fn.name} @ ${path.basename(fn.file)}:${fn.line}`,
        severity: "LOW",
        pattern: "H",
        marker_strength: "weak_co_occurrence",
        weak_markers: weakKinds,
      });
    }
  }
  // Dedupe by function+kind
  const seen = new Set();
  const dedup = findings.filter((f) => {
    const k = f.function + "|" + f.kind;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  ctx.phases["11_offchain_trust"] = {
    findings: dedup,
    elapsed_ms: Date.now() - t0,
  };
  ctx.log(`  → ${dedup.length} Pattern H findings in ${Date.now() - t0}ms`);
}

// ─── PHASE 12: ECONOMIC INVARIANTS ─────────────────────────────────────────────

const INVARIANT_HINTS = [
  {
    name: "conservation",
    re: /\b(?:totalSupply|totalAssets|totalShares|totalDeposits|totalBorrowed|reserves)\b/,
    severity: "INFO",
  },
  {
    name: "collateralization",
    re: /\b(?:collateral|ltv|loanToValue|borrowCap|debtRatio|healthFactor)\b/i,
    severity: "MEDIUM",
  },
  {
    name: "lp_share_pricing",
    re: /\b(?:totalShares|sharesOf|sharePrice|priceOfShare)\b/,
    severity: "MEDIUM",
  },
  {
    name: "fee_accounting",
    re: /\b(?:protocolFee|lpFee|hookFee|feeGrowth|feesAccrued|collectedFees)\b/,
    severity: "MEDIUM",
  },
];

function runPhase12(ctx) {
  const t0 = Date.now();
  ctx.log("Phase 12: Economic invariant analysis...");
  const findings = [];
  const invariantMap = {};
  for (const inv of INVARIANT_HINTS) invariantMap[inv.name] = [];
  for (const fn of ctx.functions) {
    const body = fn.body || "";
    if (!body) continue;
    // A "mutator" must actually mutate state. View/pure functions read invariant
    // values into return paths but cannot violate the invariant. Skip them before
    // counting. (Mutability gate added 2026-05-05; ENS scan listed 3 view fns
    // among "5 conservation mutators" — analyzer error.)
    if (fn.mutability === "view" || fn.mutability === "pure") continue;
    for (const inv of INVARIANT_HINTS) {
      if (new RegExp(inv.re.source, inv.re.flags).test(body)) {
        invariantMap[inv.name].push({
          name: fn.name,
          file: path.basename(fn.file),
          line: fn.line,
        });
      }
    }
  }
  // Flag any invariant touched by 3+ functions but with no visible reentrancy guard or invariant test
  for (const [inv, fns] of Object.entries(invariantMap)) {
    if (fns.length >= 3) {
      findings.push({
        kind: "invariant_multi_mutator",
        invariant: inv,
        mutator_count: fns.length,
        examples: fns.slice(0, 6),
        severity:
          inv === "collateralization" || inv === "fee_accounting"
            ? "HIGH"
            : "MEDIUM",
      });
    }
  }
  // Flash-loan path detection
  const hasFlash = ctx.functions.some((f) =>
    /\b(?:flashLoan|onFlashLoan|executeOperation|IFlashLoanReceiver)\b/i.test(
      f.body || "",
    ),
  );
  if (hasFlash) {
    findings.push({
      kind: "flash_loan_path",
      observation:
        "Flash-loan callback path present — confirm invariants hold under temporary balance shifts",
      severity: "INFO",
    });
  }
  ctx.phases["12_economic_invariants"] = {
    findings,
    invariant_index: Object.fromEntries(
      Object.entries(invariantMap).map(([k, v]) => [k, v.length]),
    ),
    elapsed_ms: Date.now() - t0,
  };
  ctx.log(`  → ${findings.length} invariant findings in ${Date.now() - t0}ms`);
}

// ─── SEVERITY ROLLUP + SUMMARY ─────────────────────────────────────────────────

function rollUp(ctx) {
  const allFindings = [];
  const collect = (arr, phase) => {
    if (!Array.isArray(arr)) return;
    for (const f of arr) allFindings.push({ ...f, source_phase: phase });
  };
  const p4 = ctx.phases["4_paired_analysis"] || {};
  collect(p4["4a_validation_asymmetry"], 4);
  collect(p4["4b_symmetric_paths"], 4);
  collect(p4["4c_field_binding"], 4);
  collect(p4["4d_cross_context_identity"], 4);
  collect((ctx.phases["5_operation_ordering"] || {}).findings, 5);
  collect((ctx.phases["6_reentrancy"] || {}).findings, 6);
  collect((ctx.phases["7_oracle"] || {}).findings, 7);
  collect((ctx.phases["8_access_control"] || {}).escalations, 8);
  collect((ctx.phases["9_signature_replay"] || {}).findings, 9);
  collect((ctx.phases["10_capability_injection"] || {}).findings, 10);
  collect((ctx.phases["11_offchain_trust"] || {}).findings, 11);
  collect((ctx.phases["12_economic_invariants"] || {}).findings, 12);

  const sev = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of allFindings) sev[f.severity] = (sev[f.severity] || 0) + 1;
  return {
    all: allFindings,
    summary: { total_candidates: allFindings.length, ...sev },
  };
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = {
    target: null,
    language: null,
    output: null,
    ollama: false,
    skipPhase: "",
    maxPairs: CONFIG.MAX_PAIRS,
    verbose: false,
    filesFrom: null,
    designIntent: null,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--target":
        opts.target = argv[++i];
        break;
      case "--language":
        opts.language = argv[++i];
        break;
      case "--output":
        opts.output = argv[++i];
        break;
      case "--ollama":
        opts.ollama = true;
        break;
      case "--skip-phase":
        opts.skipPhase = argv[++i];
        break;
      case "--max-pairs":
        opts.maxPairs = parseInt(argv[++i], 10);
        break;
      case "--verbose":
        opts.verbose = true;
        break;
      case "--files-from":
        opts.filesFrom = argv[++i];
        break;
      case "--design-intent":
        opts.designIntent = argv[++i];
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }
  return opts;
}

/**
 * Load a design-intent manifest (staking/naming/lending/dex). Returns
 * { suppress_pairs: [{forward_re, reverse_re, reason}, ...] } compiled.
 * Bad path or bad JSON returns null without throwing.
 */
function loadDesignIntent(manifestPath) {
  if (!manifestPath) return null;
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    const pairs = Array.isArray(parsed.suppress_pairs)
      ? parsed.suppress_pairs
      : [];
    return {
      protocol_class: parsed.protocol_class || "unknown",
      suppress_pairs: pairs.map((p) => ({
        forward_re: new RegExp("^(?:" + p.forward_match + ")$", "i"),
        reverse_re: new RegExp("^(?:" + p.reverse_match + ")$", "i"),
        forward_match: p.forward_match,
        reverse_match: p.reverse_match,
        reason: p.reason || "",
      })),
      delegate_call_modules: Array.isArray(parsed.delegate_call_modules)
        ? parsed.delegate_call_modules
        : [],
    };
  } catch (e) {
    console.warn(
      `[design-intent] failed to load ${manifestPath}: ${e.message}`,
    );
    return null;
  }
}

/**
 * Returns true if the pair (forward_name, reverse_name) is suppressed by the
 * loaded design-intent manifest. Matches against the regex patterns in
 * suppress_pairs[].forward_re/reverse_re. Names are matched case-insensitively
 * as a whole-name match (with the regex anchored ^...$).
 */
function isPairSuppressed(designIntent, fwdName, revName) {
  if (!designIntent || !designIntent.suppress_pairs) return null;
  for (const rule of designIntent.suppress_pairs) {
    if (rule.forward_re.test(fwdName) && rule.reverse_re.test(revName))
      return rule;
    // Also try the reversed direction so the manifest can list either order
    if (rule.forward_re.test(revName) && rule.reverse_re.test(fwdName))
      return rule;
  }
  return null;
}

/**
 * Returns true if the function lives in a delegate-call module and the analyzer
 * is parsing the module file rather than the upstream entry-point. In that
 * case, lack of modifier on the module fn is expected by design.
 */
function isDelegateCallModule(designIntent, fnFile) {
  if (!designIntent || !Array.isArray(designIntent.delegate_call_modules))
    return false;
  const base = path.basename(fnFile);
  return designIntent.delegate_call_modules.includes(base);
}

/**
 * Restrict a discovered file map to only those paths whose absolute path
 * appears in the allowlist. Used by --files-from for git-delta scans.
 */
function restrictFilesByList(files, allowAbsList) {
  const allow = new Set(allowAbsList.map((p) => path.resolve(p)));
  const out = {};
  for (const [lang, list] of Object.entries(files)) {
    out[lang] = list.filter((p) => allow.has(path.resolve(p)));
  }
  return out;
}

function printHelp() {
  console.log(`
BuzzShield V6 — Layer 1 Deep (12-phase consensus analyzer)

Usage:
  node buzzshield-layer1-deep.js --target <repo-path> [options]

Options:
  --target <path>      Repo to scan (required)
  --language <lang>    Force language (auto-detected otherwise)
  --output <dir>       Where to write phase JSONs
  --ollama             Enable Ollama qwen3:14b for Phases 4/8/12 (optional)
  --skip-phase <n,n>   Skip specific phases (e.g. --skip-phase 6,12)
  --max-pairs <n>      Cap on Phase 4 pair count (default 200)
  --verbose            Detailed output

Output:
  <output>/layer1-deep.json     Full 12-phase JSON
  <output>/layer1-summary.json  Severity-rolled summary
`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    printHelp();
    process.exit(0);
  }
  const opts = parseArgs(argv);
  if (!opts.target) {
    console.error("Error: --target required");
    process.exit(1);
  }
  if (!fs.existsSync(opts.target)) {
    console.error(`Error: target not found: ${opts.target}`);
    process.exit(1);
  }

  const tStart = Date.now();
  const skip = new Set(
    (opts.skipPhase || "")
      .split(",")
      .map((s) => parseInt(s, 10))
      .filter(Boolean),
  );

  // Discover + classify
  let files = discoverFiles(opts.target);
  // --files-from <path>: restrict the file walk to a caller-supplied allowlist
  // (used by the v6 pipeline's --git-delta mode to scan only changed files).
  if (opts.filesFrom) {
    try {
      const lines = fs
        .readFileSync(opts.filesFrom, "utf8")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const before = Object.values(files).reduce((s, v) => s + v.length, 0);
      files = restrictFilesByList(files, lines);
      const after = Object.values(files).reduce((s, v) => s + v.length, 0);
      console.log(
        `[files-from] restricted ${before} → ${after} files via ${opts.filesFrom}`,
      );
    } catch (e) {
      console.warn(
        `[files-from] failed to load ${opts.filesFrom}: ${e.message} — continuing with full walk`,
      );
    }
  }
  const language = opts.language || detectLanguage(files);
  const totalFiles = Object.values(files).reduce((s, v) => s + v.length, 0);
  // Load design-intent manifest if requested. Used by Phase 4b to suppress
  // user-vs-admin pair noise in domain-specific protocols (staking, naming, ...).
  const designIntent = loadDesignIntent(opts.designIntent);
  if (designIntent) {
    console.log(
      `[design-intent] loaded class=${designIntent.protocol_class} pairs=${designIntent.suppress_pairs.length} delegate_modules=${designIntent.delegate_call_modules.length}`,
    );
  }

  const commitHash = (() => {
    try {
      return execSync(`cd "${opts.target}" && git rev-parse HEAD 2>/dev/null`, {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      return "unknown";
    }
  })();

  console.log(
    "╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║  BuzzShield V6 — Layer 1 Deep (Consensus Analyzer v2)       ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝",
  );
  console.log(`  Target:    ${opts.target}`);
  console.log(`  Commit:    ${commitHash.slice(0, 12)}`);
  console.log(`  Language:  ${language}`);
  console.log(
    `  Files:     ${totalFiles} (Sol=${files.solidity.length} Rs=${files.rust.length} Go=${files.go.length} TS=${files.typescript.length})`,
  );
  console.log("");

  const ctx = {
    target: opts.target,
    commit: commitHash,
    language,
    files,
    functions: [],
    entries: [],
    mutations: [],
    shared_fields: [],
    phases: {},
    options: opts,
    designIntent,
    log: (msg) => console.log(msg),
  };

  // Run phases
  const phaseRunners = [
    [1, runPhase1],
    [2, runPhase2],
    [3, runPhase3],
    [4, runPhase4],
    [5, runPhase5],
    [6, runPhase6],
    [7, runPhase7],
    [8, runPhase8],
    [9, runPhase9],
    [10, runPhase10],
    [11, runPhase11],
    [12, runPhase12],
  ];
  for (const [n, runner] of phaseRunners) {
    if (skip.has(n)) {
      console.log(`Phase ${n}: SKIPPED`);
      continue;
    }
    try {
      runner(ctx);
    } catch (e) {
      console.error(`Phase ${n} failed: ${e.message}`);
      ctx.phases[`${n}_error`] = { error: e.message, stack: e.stack };
    }
  }

  // Roll up
  const { all, summary } = rollUp(ctx);

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  const outputPayload = {
    target: opts.target,
    commit: commitHash,
    language,
    timestamp: new Date().toISOString(),
    elapsed_seconds: parseFloat(elapsed),
    total_files: totalFiles,
    total_functions: ctx.functions.length,
    phases: ctx.phases,
    summary,
  };

  // Write output — pick the first writable base of: explicit --output, /data/buzz/persistent/reports, /home/claude-code/.tmp-build/v6-output, then /tmp
  let outputDir = opts.output;
  if (!outputDir) {
    const scanId = `layer1-deep-${new Date().toISOString().slice(0, 10)}-${path.basename(opts.target)}`;
    const candidates = [
      path.join("/data/buzz/persistent/reports", scanId),
      path.join("/home/claude-code/.tmp-build/v6-output", scanId),
      path.join("/tmp", scanId),
    ];
    for (const c of candidates) {
      try {
        fs.mkdirSync(c, { recursive: true });
        outputDir = c;
        break;
      } catch {}
    }
    if (!outputDir) outputDir = candidates[1];
  } else {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (e) {
      console.error(`Cannot create output dir ${outputDir}: ${e.message}`);
      process.exit(1);
    }
  }
  fs.writeFileSync(
    path.join(outputDir, "layer1-deep.json"),
    JSON.stringify(outputPayload, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDir, "layer1-summary.json"),
    JSON.stringify(
      {
        target: opts.target,
        commit: commitHash,
        elapsed_seconds: parseFloat(elapsed),
        summary,
        top_findings: all
          .sort((a, b) => sevRank(b.severity) - sevRank(a.severity))
          .slice(0, 30)
          .map((f) => ({
            severity: f.severity,
            pattern: f.pattern,
            kind: f.kind,
            function:
              f.function || f.signer || f.forward || f.struct || f.invariant,
            gap: f.gap || f.unbound || f.missing,
            ground_truth_ref: f.ground_truth_ref,
          })),
      },
      null,
      2,
    ),
  );

  console.log("");
  console.log(
    "╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║                LAYER 1 DEEP COMPLETE                         ║",
  );
  console.log(
    "╠══════════════════════════════════════════════════════════════╣",
  );
  console.log(`║  Functions:  ${String(ctx.functions.length).padEnd(43)}║`);
  console.log(`║  Findings:   ${String(all.length).padEnd(43)}║`);
  console.log(`║  CRITICAL:   ${String(summary.CRITICAL || 0).padEnd(43)}║`);
  console.log(`║  HIGH:       ${String(summary.HIGH || 0).padEnd(43)}║`);
  console.log(`║  MEDIUM:     ${String(summary.MEDIUM || 0).padEnd(43)}║`);
  console.log(`║  Elapsed:    ${(elapsed + "s").padEnd(43)}║`);
  console.log(`║  Output:     ${outputDir.slice(-43).padEnd(43)}║`);
  console.log(
    "╚══════════════════════════════════════════════════════════════╝",
  );

  // Note: We deliberately DO NOT set a non-zero exit code on CRITICAL
  // findings. Earlier versions did (for CI gating), but the v6 pipeline's
  // execSync treats non-zero as failure and silently fell back to the legacy
  // regex Layer 1 — masking every deep run that actually found CRITICALs.
  // CI gating, when needed, should be done by reading layer1-summary.json.
}

function sevRank(s) {
  return { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 }[s] || 0;
}

// ─── EXPORTS ───────────────────────────────────────────────────────────────────

module.exports = {
  runPhase1,
  runPhase2,
  runPhase3,
  runPhase4,
  runPhase5,
  runPhase6,
  runPhase7,
  runPhase8,
  runPhase9,
  runPhase10,
  runPhase11,
  runPhase12,
  discoverFiles,
  detectLanguage,
  extractFunctions,
  extractSolidityFunctions,
  extractRustFunctions,
  extractGoFunctions,
  extractTSFunctions,
  extractCFunctions,
};

if (require.main === module) {
  main().catch((e) => {
    console.error("Fatal:", e.message);
    console.error(e.stack);
    process.exit(1);
  });
}
