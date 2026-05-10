#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #159 — HE-A4 Single-EOA Proxy Admin Detector (v1.0)
 *
 * Detects proxy contracts whose admin slot (EIP-1967) or ProxyAdmin owner is
 * a single EOA — no timelock wrapper, no multi-sig governance. This is the
 * Wasabi/Renegade class of op-sec vulnerability: a single key-compromise
 * enables a complete drain via malicious upgradeTo + delegatecall.
 *
 * Two scan modes:
 *   --source <path>            Scan .sol files for proxy + admin patterns.
 *   --proxy <0xaddr> --rpc <url>
 *                              Read EIP-1967 admin slot live from a chain.
 *                              Classify admin (EOA / TimelockController / Safe).
 *
 * Severity gate (per spec):
 *   HIGH    — no timelock OR EOA owner with admin upgrade rights
 *   MEDIUM  — timelock present < 24h delay
 *   LOW     — timelock >= 24h delay
 *
 * Output JSON shape per finding:
 *   { severity, detector, proxy_address, admin_address, admin_type,
 *     timelock_delay_seconds, hypothesis, confidence }
 *
 * Reference:
 *   - rules/audit-methodology-v2.md
 *   - rules/detector-pr-template.md
 *   - brain/Doctrine.md → Renegade R-1 (admin-key compromise theory)
 */

const fs = require("fs");
const path = require("path");
const scanner = require("./lib/proxy-admin-scanner.js");

// 24h threshold for severity gate
const TIMELOCK_24H_SECONDS = 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Source-mode scan
// ---------------------------------------------------------------------------

function scanSource(targetPath, opts = {}) {
  const verbose = !!opts.verbose;
  const findings = [];
  const target = path.resolve(targetPath);

  if (!fs.existsSync(target)) {
    throw new Error("source target not found: " + target);
  }

  let files;
  if (fs.statSync(target).isFile()) {
    files = [target];
  } else {
    files = scanner.walkSolidityFiles(target, {
      includeTests: !!opts.includeTests,
    });
  }

  for (const file of files) {
    let src;
    try {
      src = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const contracts = scanner.extractContracts(src);
    if (contracts.length === 0) continue;

    const transparentInfo = scanner.detectTransparentProxyPattern(
      src,
      contracts,
    );
    const uupsInfo = scanner.detectUUPSPattern(src, contracts);
    const acInfo = scanner.detectAccessControlPattern(src, contracts);
    const timelockInfo = scanner.detectTimelock(src);
    const multisigInfo = scanner.detectMultisig(src);

    // We only need to fire #159 when a proxy admin pattern exists
    // (TransparentUpgradeableProxy / ProxyAdmin / UUPS with onlyOwner upgrade).
    if (!transparentInfo.detected && !uupsInfo.detected) continue;

    if (verbose) {
      console.error(
        `[#159] ${path.relative(target, file)} transparent=${transparentInfo.detected} uups=${uupsInfo.detected} timelock=${timelockInfo.detected} multisig=${multisigInfo.detected}`,
      );
    }

    for (const c of contracts) {
      // Look at the contract's constructor + initializer + transferOwnership
      // chain for a single-admin commitment.
      const ctor = scanner.findConstructor(c.body);
      const initializers = scanner.findInitializers(c.body);

      const adminCommitments = []; // { kind, expr, line, source }

      // 1) Constructor body — _transferOwnership / Ownable() init / new ProxyAdmin
      if (ctor) {
        const owns = scanner.findTransferOwnershipCalls(ctor.body);
        for (const o of owns) {
          adminCommitments.push({
            kind: "transferOwnership",
            expr: o.addr,
            line: ctor.line + countLines(ctor.body.slice(0, o.idx)),
            source: "constructor",
            functionName: "constructor",
          });
        }
        // Look for inline `new ProxyAdmin(<addr>)`
        const proxyAdminNew = ctor.body.match(
          /new\s+ProxyAdmin\s*\(\s*([^)]+)\)/,
        );
        if (proxyAdminNew) {
          adminCommitments.push({
            kind: "new ProxyAdmin",
            expr: proxyAdminNew[1].trim(),
            line:
              ctor.line + countLines(ctor.body.slice(0, proxyAdminNew.index)),
            source: "constructor",
            functionName: "constructor",
          });
        }
      }

      // 2) Initializer bodies — __Ownable_init, _transferOwnership,
      //    _grantRole(DEFAULT_ADMIN_ROLE, …), __AccessControl_init
      for (const initFn of initializers) {
        const owns = scanner.findTransferOwnershipCalls(initFn.body);
        for (const o of owns) {
          adminCommitments.push({
            kind: "transferOwnership",
            expr: o.addr,
            line: initFn.line + countLines(initFn.body.slice(0, o.idx)),
            source: "initializer",
            functionName: initFn.name,
          });
        }
        // __Ownable_init(<addr>) and __Ownable_init_unchained(<addr>)
        const ownableInitRe = /__Ownable_init(?:_unchained)?\s*\(\s*([^)]*)\)/g;
        let oim;
        while ((oim = ownableInitRe.exec(initFn.body)) !== null) {
          const addr = oim[1].trim();
          if (addr) {
            adminCommitments.push({
              kind: "__Ownable_init",
              expr: addr,
              line: initFn.line + countLines(initFn.body.slice(0, oim.index)),
              source: "initializer",
              functionName: initFn.name,
            });
          }
        }
        // _grantRole(DEFAULT_ADMIN_ROLE, …) is the AC-mode admin commit
        const grants = scanner.findGrantRoleCalls(initFn.body);
        for (const g of grants) {
          if (
            /DEFAULT_ADMIN_ROLE/.test(g.role) ||
            /ADMIN_ROLE/.test(g.role) ||
            /UPGRADER_ROLE/.test(g.role) ||
            /UPGRADE_ROLE/.test(g.role)
          ) {
            adminCommitments.push({
              kind: g.fn + "(" + g.role.trim() + ", …)",
              expr: g.addr,
              line: initFn.line + countLines(initFn.body.slice(0, g.idx)),
              source: "initializer",
              functionName: initFn.name,
            });
          }
        }
      }

      if (adminCommitments.length === 0) continue;

      // For each commitment, classify the admin expression
      for (const com of adminCommitments) {
        const cls = scanner.classifyAdminExpression(com.expr);

        // Determine severity
        // - If timelock is wired AND admin expression resolves to a timelock
        //   instance → MEDIUM/LOW depending on delay (cannot tell at static
        //   level → MEDIUM as conservative default with note)
        // - If multisig pattern detected in same file AND admin resolves to
        //   that → suppress (no flag)
        // - If admin is a literal EOA, msg.sender, or unresolved identifier
        //   without timelock context → HIGH
        let severity = "HIGH";
        let timelockDelaySeconds = null;
        let suppressed = false;
        let suppressionReason = null;

        if (
          cls.kind === "address_cast" &&
          /timelock/i.test(cls.inner) &&
          timelockInfo.detected
        ) {
          severity = "MEDIUM"; // can't read the delay statically
          suppressionReason = null;
        } else if (
          cls.kind === "identifier" &&
          /timelock/i.test(cls.name) &&
          timelockInfo.detected
        ) {
          severity = "MEDIUM";
        } else if (
          cls.kind === "identifier" &&
          (/safe/i.test(cls.name) || /multisig/i.test(cls.name)) &&
          multisigInfo.detected
        ) {
          suppressed = true;
          suppressionReason = "admin_resolves_to_multisig_pattern";
        } else if (cls.kind === "address_cast" && multisigInfo.detected) {
          // Check the inner identifier name
          if (/safe|multisig/i.test(cls.inner)) {
            suppressed = true;
            suppressionReason = "admin_resolves_to_multisig_cast";
          }
        }

        if (suppressed) {
          if (verbose)
            console.error(
              `  SUPPRESSED ${path.relative(target, file)}:${com.line} — ${suppressionReason}`,
            );
          continue;
        }

        // Confidence calibration:
        // - literal EOA in source w/o timelock → 0.9
        // - msg.sender in initializer w/o timelock → 0.8 (could be Safe deployer)
        // - identifier with timelock pattern present → 0.6
        let confidence = 0.7;
        if (cls.kind === "literal_eoa_or_contract") confidence = 0.9;
        else if (cls.kind === "msg_sender") confidence = 0.8;
        else if (cls.kind === "identifier" && !timelockInfo.detected)
          confidence = 0.75;
        else if (cls.kind === "identifier" && timelockInfo.detected)
          confidence = 0.6;

        const adminType =
          cls.kind === "literal_eoa_or_contract"
            ? "EOA-or-literal"
            : cls.kind === "msg_sender"
              ? "msg.sender"
              : cls.kind === "address_cast" && /timelock/i.test(cls.inner || "")
                ? "TimelockController"
                : cls.kind === "identifier" && /timelock/i.test(cls.name || "")
                  ? "TimelockController"
                  : cls.kind === "identifier" &&
                      /safe|multisig/i.test(cls.name || "")
                    ? "Safe"
                    : "Unknown";

        const proxyKind = transparentInfo.detected
          ? "TransparentUpgradeableProxy/ProxyAdmin"
          : uupsInfo.detected
            ? "UUPS"
            : "Unknown";

        findings.push({
          severity,
          detector: "buzzshield-159-ha4",
          mode: "source",
          file: path.relative(target, file),
          line: com.line,
          contract: c.name,
          proxy_kind: proxyKind,
          admin_commitment: com.kind,
          admin_expression: com.expr,
          admin_address:
            cls.kind === "literal_eoa_or_contract" ? cls.addr : null,
          admin_type: adminType,
          timelock_delay_seconds: timelockDelaySeconds,
          timelock_present_in_source: timelockInfo.detected,
          multisig_present_in_source: multisigInfo.detected,
          where: com.source + ":" + com.functionName,
          hypothesis:
            `Single-admin upgrade commitment in ${proxyKind} contract ${c.name} ` +
            `(${com.kind} = ${com.expr}) ${
              timelockInfo.detected
                ? "without verifiable timelock-wrapping"
                : "with NO timelock present in source"
            }${
              multisigInfo.detected
                ? "; multisig hints found but admin expression does not resolve to them"
                : "; no multisig governance detected"
            } — single key-compromise enables malicious upgradeTo and complete drain.`,
          confidence,
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// On-chain mode (EIP-1967)
// ---------------------------------------------------------------------------

async function scanOnChain({ proxyAddr, rpcUrl, verbose = false }) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(proxyAddr)) {
    throw new Error("proxy address invalid: " + proxyAddr);
  }
  const info = await scanner.readEIP1967AdminOnChain(rpcUrl, proxyAddr);
  if (verbose) console.error("[#159 on-chain]", JSON.stringify(info, null, 2));

  if (!info.admin_address) {
    return [
      {
        severity: "INFO",
        detector: "buzzshield-159-ha4",
        mode: "on-chain",
        proxy_address: info.proxy_address,
        admin_address: null,
        admin_type: "Unknown",
        timelock_delay_seconds: null,
        hypothesis:
          "EIP-1967 admin slot read returned zero — proxy may be UUPS (no admin slot) or non-standard. Run --source mode for completeness.",
        confidence: 0.4,
        slot_value: info.slot_value,
      },
    ];
  }

  let severity;
  if (info.admin_type === "EOA") {
    severity = "HIGH";
  } else if (info.admin_type === "TimelockController") {
    severity =
      info.timelock_delay_seconds !== null &&
      info.timelock_delay_seconds < TIMELOCK_24H_SECONDS
        ? "MEDIUM"
        : "LOW";
  } else if (info.admin_type === "Safe") {
    severity = "LOW";
  } else {
    severity = "MEDIUM"; // unknown contract — manual review
  }

  let confidence = 0.85;
  if (info.admin_type === "EOA") confidence = 0.92;
  if (info.admin_type === "Safe") confidence = 0.88;
  if (info.admin_type === "TimelockController") confidence = 0.9;
  if (info.admin_type === "Contract") confidence = 0.6;

  const hypothesis =
    info.admin_type === "EOA"
      ? `EIP-1967 admin slot of ${info.proxy_address} resolves to EOA ${info.admin_address} (no bytecode). Single key-compromise = malicious upgradeTo + drain. Renegade-class op-sec vector.`
      : info.admin_type === "TimelockController"
        ? `EIP-1967 admin = TimelockController ${info.admin_address} (delay ${info.timelock_delay_seconds ?? "unknown"}s). ${info.timelock_delay_seconds !== null && info.timelock_delay_seconds < TIMELOCK_24H_SECONDS ? "Delay < 24h fails best-practice gate." : "Delay >= 24h within best-practice gate."}`
        : info.admin_type === "Safe"
          ? `EIP-1967 admin = Safe-pattern multisig ${info.admin_address}. Threshold-based governance present.`
          : `EIP-1967 admin = unknown contract ${info.admin_address} (${info.code_size_bytes} bytes bytecode). Manual classification required.`;

  return [
    {
      severity,
      detector: "buzzshield-159-ha4",
      mode: "on-chain",
      proxy_address: info.proxy_address,
      admin_address: info.admin_address,
      admin_type: info.admin_type,
      timelock_delay_seconds: info.timelock_delay_seconds,
      is_contract: info.is_contract,
      code_size_bytes: info.code_size_bytes,
      hypothesis,
      confidence,
      slot_value: info.slot_value,
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countLines(s) {
  let n = 0;
  for (const c of s) if (c === "\n") n++;
  return n;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        args[key] = argv[++i];
      } else args[key] = true;
    } else args._.push(a);
  }
  return args;
}

async function cliMain() {
  const args = parseArgs(process.argv);
  const findings = [];

  if (!args.source && !args.proxy) {
    console.error(
      "Usage:\n" +
        "  buzzshield-159-ha4-detector.js --source <path>\n" +
        "  buzzshield-159-ha4-detector.js --proxy <0xaddr> --rpc <url>\n" +
        "Options: [--verbose] [--include-tests] [--out <file.json>]",
    );
    process.exit(1);
  }

  if (args.source) {
    const sourceFindings = scanSource(args.source, {
      verbose: !!args.verbose,
      includeTests: !!args["include-tests"],
    });
    findings.push(...sourceFindings);
  }

  if (args.proxy) {
    if (!args.rpc) {
      console.error("--proxy requires --rpc <url>");
      process.exit(1);
    }
    try {
      const onChainFindings = await scanOnChain({
        proxyAddr: args.proxy,
        rpcUrl: args.rpc,
        verbose: !!args.verbose,
      });
      findings.push(...onChainFindings);
    } catch (e) {
      console.error("on-chain scan failed:", e.message);
      process.exit(2);
    }
  }

  const summary = {
    detector: "buzzshield-159-ha4",
    version: "1.0",
    scanned_at: new Date().toISOString(),
    finding_count: findings.length,
    findings,
  };
  const out = JSON.stringify(summary, null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, out);
    console.error(
      "Findings written to " + args.out + " (" + findings.length + " findings)",
    );
  } else {
    console.log(out);
  }
}

if (require.main === module)
  cliMain().catch((err) => {
    console.error("FATAL:", err.stack || err);
    process.exit(3);
  });

module.exports = {
  scanSource,
  scanOnChain,
  TIMELOCK_24H_SECONDS,
  // re-exported for test convenience
  _scanner: scanner,
};
