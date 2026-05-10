#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #143 — Wasabi-class UUPS + Zero-Delay AccessControl Detector (v1.0)
 *
 * Detects the Wasabi pattern (rekt $5M Apr 30): a contract that
 *   1. inherits UUPSUpgradeable (or non-upgradeable variant), AND
 *   2. inherits AccessControlUpgradeable (or non-upgradeable variant), AND
 *   3. in its initializer, _grantRole(DEFAULT_ADMIN_ROLE | UPGRADER_ROLE,
 *      <single literal/parameter/msg.sender>), AND
 *   4. that admin address is NOT wrapped by a TimelockController in this module,
 *      AND
 *   5. _authorizeUpgrade(address) is gated by onlyRole(<the same single role>),
 *      with no extra timelock or multi-sig checkpoint.
 *
 * Distinct from #159: #159 is the TransparentUpgradeableProxy/ProxyAdmin
 * pattern (admin slot at storage). #143 is the UUPS+AccessControl pattern,
 * where the upgrade authority lives in the implementation contract itself.
 *
 * NEGATIVE training:
 *   - Renegade HEAD source (TransparentUpgradeableProxy + _disableInitializers
 *     + atomic 3-arg deploy). Different proxy class — should NOT fire.
 *   - Boros (per R-3): triple-protected (initializer + onlyRole(_INITIALIZER_ROLE)
 *     + _disableInitializers).
 *
 * Severity: HIGH (structural pattern, key-compromise enables drain).
 */

const fs = require("fs");
const path = require("path");
const scanner = require("./lib/proxy-admin-scanner.js");

// ---------------------------------------------------------------------------
// Roles considered upgrade-authority capable
// ---------------------------------------------------------------------------

const UPGRADE_ROLE_NAMES = [
  "DEFAULT_ADMIN_ROLE",
  "ADMIN_ROLE",
  "UPGRADER_ROLE",
  "UPGRADE_ROLE",
  "PROXY_ADMIN_ROLE",
  "GOVERNOR_ROLE",
];

function isUpgradeRole(roleExpr) {
  const e = roleExpr.trim();
  for (const r of UPGRADE_ROLE_NAMES) {
    if (e === r || e.endsWith("." + r)) return true;
  }
  // keccak256("…_ROLE") class also flagged
  if (/_ROLE\b/.test(e)) return true;
  return false;
}

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

    const uupsInfo = scanner.detectUUPSPattern(src, contracts);
    const acInfo = scanner.detectAccessControlPattern(src, contracts);
    const timelockInfo = scanner.detectTimelock(src);
    const multisigInfo = scanner.detectMultisig(src);

    // Filter: must have BOTH UUPS + AccessControl signal in this file
    if (!uupsInfo.detected || !acInfo.detected) {
      if (verbose && (uupsInfo.detected || acInfo.detected)) {
        console.error(
          `[#143] ${path.relative(target, file)} skipped — uups=${uupsInfo.detected} ac=${acInfo.detected}`,
        );
      }
      continue;
    }

    if (verbose) {
      console.error(
        `[#143] ${path.relative(target, file)} uups=${uupsInfo.detected} ac=${acInfo.detected} timelock=${timelockInfo.detected} multisig=${multisigInfo.detected}`,
      );
    }

    for (const c of contracts) {
      // Per-contract: must inherit BOTH UUPS-ish and AccessControl-ish parents
      const inheritsUUPS = c.inherits.some((p) =>
        /UUPSUpgradeable|ERC1822Proxiable/.test(p),
      );
      const inheritsAC = c.inherits.some((p) =>
        /AccessControl(?:Upgradeable|Enumerable|Defaultable)?/.test(p),
      );
      if (!inheritsUUPS || !inheritsAC) continue;

      // Find _authorizeUpgrade
      const authFn = scanner.findAuthorizeUpgrade(c.body);
      if (!authFn) {
        if (verbose)
          console.error(
            `  ${c.name}: inherits UUPS+AC but _authorizeUpgrade not found in this contract — skip (likely abstract)`,
          );
        continue;
      }
      const auth = scanner.analyzeAuthorizeUpgrade(authFn);

      // Find initializer(s)
      const inits = scanner.findInitializers(c.body);
      if (inits.length === 0) {
        if (verbose)
          console.error(`  ${c.name}: no initializer found, skipping`);
        continue;
      }

      // Track admin commits made in initializer for upgrade-relevant roles
      const adminCommits = []; // { role, addr, line, fn, fnName }
      for (const initFn of inits) {
        const grants = scanner.findGrantRoleCalls(initFn.body);
        for (const g of grants) {
          if (isUpgradeRole(g.role)) {
            const lineNo =
              initFn.line + countLines(initFn.body.slice(0, g.idx));
            adminCommits.push({
              role: g.role.trim(),
              addr: g.addr.trim(),
              line: lineNo,
              fn: g.fn,
              fnName: initFn.name,
            });
          }
        }
      }

      if (adminCommits.length === 0) {
        if (verbose)
          console.error(
            `  ${c.name}: no upgrade-role grant found in initializer, skipping`,
          );
        continue;
      }

      // For each admin commit, decide whether the gate fires
      for (const commit of adminCommits) {
        const cls = scanner.classifyAdminExpression(commit.addr);

        // Suppression checks:
        //   1) auth uses onlyRole/onlyOwner with timelock-named arg AND timelock present
        //      → safer; SUPPRESS.
        //   2) admin expr resolves to a multisig identifier AND multisig hint present
        //      → SUPPRESS.
        let suppressed = false;
        let suppressionReason = null;

        if (
          auth.gatingType === "onlyRole" &&
          auth.roleArg &&
          /timelock/i.test(auth.roleArg) &&
          timelockInfo.detected
        ) {
          suppressed = true;
          suppressionReason = "_authorizeUpgrade gated by timelock-named role";
        }
        if (
          (cls.kind === "identifier" && /timelock/i.test(cls.name)) ||
          (cls.kind === "address_cast" && /timelock/i.test(cls.inner || ""))
        ) {
          if (timelockInfo.detected) {
            suppressed = true;
            suppressionReason =
              "admin role granted to timelock-named identifier";
          }
        }
        if (
          (cls.kind === "identifier" &&
            /safe|multisig|gnosis/i.test(cls.name)) ||
          (cls.kind === "address_cast" &&
            /safe|multisig|gnosis/i.test(cls.inner || ""))
        ) {
          if (multisigInfo.detected) {
            suppressed = true;
            suppressionReason = "admin role granted to multi-sig identifier";
          }
        }

        if (suppressed) {
          if (verbose)
            console.error(
              `  SUPPRESSED ${path.relative(target, file)}:${commit.line} (${c.name}) — ${suppressionReason}`,
            );
          continue;
        }

        // Confidence calibration
        let confidence = 0.85;
        if (cls.kind === "literal_eoa_or_contract") confidence = 0.92;
        else if (cls.kind === "msg_sender") confidence = 0.82;
        else if (cls.kind === "identifier") confidence = 0.78;

        // The Wasabi-class hypothesis
        const adminExprStr =
          cls.kind === "msg_sender"
            ? "msg.sender"
            : cls.kind === "literal_eoa_or_contract"
              ? cls.addr
              : cls.kind === "identifier"
                ? cls.name
                : commit.addr;

        findings.push({
          severity: "HIGH",
          detector: "buzzshield-143-wasabi",
          mode: "source",
          file: path.relative(target, file),
          line: commit.line,
          contract_name: c.name,
          inherits_uups: inheritsUUPS,
          inherits_access_control: inheritsAC,
          access_control_role: commit.role,
          access_control_admin: adminExprStr,
          access_control_admin_kind: cls.kind,
          access_control_admin_addr:
            cls.kind === "literal_eoa_or_contract" ? cls.addr : null,
          initializer_function: commit.fnName,
          authorize_upgrade_gating_type: auth.gatingType,
          authorize_upgrade_role_arg: auth.roleArg || null,
          timelock_present: timelockInfo.detected,
          multisig_present: multisigInfo.detected,
          hypothesis:
            `${c.name} inherits UUPSUpgradeable + AccessControlUpgradeable. ` +
            `Initializer (${commit.fnName}) grants ${commit.role} to ${adminExprStr} ` +
            `(no timelock wrap, no multi-sig). _authorizeUpgrade gated by ${auth.gatingType}` +
            (auth.roleArg ? "(" + auth.roleArg + ")" : "") +
            ` — Wasabi-class single-key upgrade authority. Key-compromise enables ` +
            `malicious upgradeTo + complete drain.`,
          confidence,
        });
      }
    }
  }

  return findings;
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

function cliMain() {
  const args = parseArgs(process.argv);
  if (!args.source) {
    console.error(
      "Usage: buzzshield-143-wasabi-detector.js --source <path> [--verbose] [--include-tests] [--out <file.json>]",
    );
    process.exit(1);
  }
  const findings = scanSource(args.source, {
    verbose: !!args.verbose,
    includeTests: !!args["include-tests"],
  });
  const summary = {
    detector: "buzzshield-143-wasabi",
    version: "1.0",
    scanned_at: new Date().toISOString(),
    target: path.resolve(args.source),
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

if (require.main === module) cliMain();

module.exports = {
  scanSource,
  isUpgradeRole,
  UPGRADE_ROLE_NAMES,
  _scanner: scanner,
};
