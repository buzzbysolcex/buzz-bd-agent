# Security Hardening — Item 1: Credential Isolation (PRD + Implementation Skeleton)

> Status: SCOPING PRD (no code shipped). Greenlight requested from operator before implementation.
> Authority: Ogie msgs 7637 + 7654 (2026-05-24). Hardening checklist item 1 of 5 from TU Berlin / Max Planck "Toward Securing AI Agents Like Operating Systems".
> Cross-ref: `brain/External-Frameworks.md` v1.2 (filed 2026-05-24).
> Audience: operator review pre-greenlight; readable without deep security-architecture background.

---

## Section 1 — Threat Model

### What the attacker can do TODAY

`[INSPECTED]` (verified this session via `ls -la /home/claude-code/.env*`):

- `/home/claude-code/.env.canonical` exists (6188 bytes, mode `-rw-------`, owner `claude:claude`)
- `/home/claude-code/.env.aibtc`, `.env.heyanon`, `.env.github`, `.env.moltbook`, `.env`, `.env.anthropic` all present, all mode 600, all owned by `claude:claude`
- `.env.basescan`, two `.env.github.bak-*` files owned by `root:root`

`[ASSUMED]` (architectural — not file-content-read this session):

- These files contain plaintext secrets per `brain/External-Frameworks.md` v1.2: `BANKR_API_KEY`, `HELIUS_API_KEY`, `TELEGRAM_BOT_TOKEN`, `WAR_ROOM_CHAT_ID`, `X_BEARER_TOKEN`, `CMC_API_KEY`, plus `AIBTC_BTC_WIF`, `GMAIL_*`, `DISCORD_BOT_TOKEN`, `CDP_API_KEY_*`, etc.
- Mode 600 + owner `claude` means ANY process running as user `claude` (which includes every Buzz subprocess, every spawned tool, every shell command from the Claude session) can `cat` these files and read plaintext

### What we're defending against

1. **Prompt-injection-induced internal-tool calls that exfiltrate secrets.** Adversarial input from scanned tokens, scraped Twitter content, audit targets, or external Discord/Telegram channels persuades the model to invoke a Bash tool call like `cat /home/claude-code/.env.canonical` or to write a script that posts secrets to an attacker-controlled URL.
2. **Malicious skill installation.** A user-supplied or marketplace skill that reads env files at activation time and exfiltrates them via a benign-looking HTTP call.
3. **Supply-chain attacks on npm dependencies.** A compromised npm package (e.g., the axios incident referenced in `project_security_rotation.md`, Apr 2026) that reads env vars at `require()` time and ships them out.
4. **Compromised subagent / sub-skill code execution.** A sub-skill that gains code execution can read every secret without scope-check.

### What we're explicitly NOT defending against in v1

- **Root-level compromise.** If attacker is root, they read `/root/secrets/` directly; broker is itself root-readable. v1 scope is `claude` user containment.
- **OS kernel exploits.** Out of scope.
- **Physical-access attacks on the Hetzner CPX62 host.**
- **Memory forensics on the broker process.** Secrets live in broker RAM; a root-level memory dump retrieves them. Acceptable for v1.
- **TOCTOU between broker handout and tool use.** If a tool legitimately retrieves a secret then is compromised, the secret is already in tool memory. v1 reduces blast radius; does not eliminate it.

---

## Section 2 — Proposed Architecture

### 2.1 Broker process (`buzz-secret-broker`)

- **Process owner:** `root` (or `claude` with sudo-grant to read `/root/secrets/`)
- **Listener:** Unix domain socket at `/run/buzz-secret-broker.sock` (mode 0660, owner `root:claude`)
- **Secret storage:** in-memory `Map<string, string>` loaded from `/root/secrets/canonical.env` at boot. Re-read on `SIGHUP`.
- **Tool authentication:** Linux `SO_PEERCRED` socket option (`getsockopt(socket, SOL_SOCKET, SO_PEERCRED, ...)`) returns peer `{ pid, uid, gid }`. Broker resolves `pid → /proc/<pid>/exe` (canonical executable path) and `pid → /proc/<pid>/cmdline` (script path arg for Node) to determine "which tool is asking".
- **Scope enforcement:** broker reads `/etc/buzz/secret-scope.json` (config) mapping `tool_identity → allowed_secret_names`. Any request outside scope returns `{ "error": "scope_denied", "tool": "<resolved>", "secret": "<requested>" }` and logs the attempt.
- **Audit log:** every request (granted OR denied) appended to `/var/log/buzz-secret-broker.log` with `{ ts, peer_pid, peer_uid, resolved_tool, secret_name, decision, scope_token }`.

### 2.2 Tool authentication detail

`[INSPECTED]` (Linux man pages): `SO_PEERCRED` gives `(pid, uid, gid)` of the connecting peer at the moment of `connect()`. Simpler than `SCM_CREDENTIALS` (which requires the peer to explicitly send credentials via `sendmsg`).

The broker uses peer PID to read `/proc/<pid>/cmdline` and matches against known tool fingerprints (e.g., `node /home/claude-code/buzz-workspace/api/server.js` → `tool=buzz-api-server`). For Node scripts, `argv[1]` is the script path — that's the tool identity. Match against the scope config file.

Limitations: PID reuse race window (microseconds) exists but is exploitable only by an attacker already on-box at user level; acceptable for v1.

### 2.3 Secret retrieval API (JSON over Unix socket)

Request:
```json
{ "op": "get", "secret_name": "X_BEARER_TOKEN" }
```

Response (granted):
```json
{
  "ok": true,
  "value": "AAAA...",
  "expires_at": 1748097600,
  "scope_token": "tok_a8f...",
  "ttl_seconds": 300
}
```

Response (denied):
```json
{
  "ok": false,
  "error": "scope_denied",
  "tool": "score-tweeter",
  "secret": "BANKR_API_KEY"
}
```

`expires_at` is advisory — broker does not actually invalidate the value; the model is "the tool caches for ≤ TTL then re-asks". Future v2 can add real rotation+invalidation.

### 2.4 File-mount changes

| From                                | To                                | Mode | Owner        |
| ----------------------------------- | --------------------------------- | ---- | ------------ |
| `/home/claude-code/.env.canonical`  | `/root/secrets/canonical.env`     | 600  | `root:root`  |
| `/home/claude-code/.env.aibtc`      | `/root/secrets/aibtc.env`         | 600  | `root:root`  |
| `/home/claude-code/.env.heyanon`    | `/root/secrets/heyanon.env`       | 600  | `root:root`  |
| `/home/claude-code/.env.github`     | `/root/secrets/github.env`        | 600  | `root:root`  |
| `/home/claude-code/.env.moltbook`   | `/root/secrets/moltbook.env`      | 600  | `root:root`  |
| `/home/claude-code/.env.anthropic`  | `/root/secrets/anthropic.env`     | 600  | `root:root`  |

Old paths replaced with a **deny-script symlink**:
- `/home/claude-code/.env.canonical` → `/usr/local/bin/buzz-env-deny.sh`
- Script logs: `{ ts, who-called, /proc/self/cmdline }` to `/var/log/buzz-env-deny.log`, then exits 1.
- A `cat .env.canonical` returns no secrets, but it ALERTS us that something tried.

### 2.5 Tool migration plan

A new helper `api/lib/secrets.js` (~50 LOC) wraps the broker request:

```javascript
const { get } = require('./lib/secrets');
const xBearer = await get('X_BEARER_TOKEN'); // throws if scope-denied
```

Tools migrate from `process.env.X_BEARER_TOKEN` to `await secrets.get('X_BEARER_TOKEN')`. The helper does in-process caching (TTL 60s) so high-frequency callers don't hammer the broker.

Migration mode: broker runs in **warning mode** for first 7 days — every scope-denied request is LOGGED but value is RETURNED anyway. Operator reviews log, adjusts scope config, then flips broker to **enforcement mode**.

---

## Section 3 — Scope Decisions (per-tool)

`[INSPECTED]` (verified this session via `grep -rn "process.env\." api/ scripts/ --include="*.js"`):

- **api/** layer: 169 `process.env.*` occurrences across **53 files**
- **scripts/** layer: 62 `process.env.*` occurrences across **25 files**
- **Total: 78 distinct files reference env vars; 231 total occurrences**

(Note: not all 231 are SECRET reads — many are config knobs like `BUZZ_DB_DIR`, `PIPELINE_DIR`, port numbers, feature flags. Estimated 40-60% are real secret reads. Migration only targets secret reads; config knobs stay on `process.env`.)

### Per-tool capability table (representative sample — full table generated during impl Week 1)

| Tool identity                                          | Required secrets                                                       | Broker scope name      |
| ------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------- |
| `api/server.js`                                        | `BUZZ_API_ADMIN_KEY`, `TELEGRAM_BOT_TOKEN`, `WAR_ROOM_CHAT_ID`         | `core-server`          |
| `api/services/twitter-brain.js`                        | `X_API_BEARER_TOKEN`, `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_*`        | `twitter-bot`          |
| `api/services/signals/aibtc-direct-filer.js`           | `AIBTC_BTC_WIF`, `AIBTC_BTC_ADDRESS`                                   | `aibtc-signal-filer`   |
| `api/services/agents/scanner.js`                       | `CMC_API_KEY`                                                          | `token-scanner`        |
| `api/services/agents/wallet.js`                        | `HELIUS_API_KEY`                                                       | `wallet-service`       |
| `api/services/outreach/gmail-sender.js`                | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`        | `gmail-outreach`       |
| `api/services/twitter-brain.js`                        | `BANKR_PARTNER_KEY`                                                    | (also `twitter-bot`)   |
| `api/services/heyanon/mcp-client.js`                   | `HEYANON_API_KEY`, `HEYANON_ENDPOINT`                                  | `heyanon-mcp`          |
| `api/services/llm-proxy.js`                            | `MINIMAX_API_KEY`                                                      | `llm-proxy`            |
| `api/services/identity/atv-identity.js`                | `ATV_API_KEY`                                                          | `identity-resolver`    |
| `api/services/nansen-enrichment.js`                    | `NANSEN_API_KEY`                                                       | `nansen-enricher`      |
| `api/services/agentproof.js`                           | `AGENTPROOF_API_KEY`                                                   | `agentproof-publisher` |
| `api/services/moltbook/pulse-moltbook.js`              | `MOLTBOOK_API_KEY`                                                     | `moltbook-poster`      |
| `api/services/github/pr-monitor.js`                    | `GITHUB_PAT`                                                           | `github-monitor`       |
| `api/services/intel/discord-intel-ingest.js`           | `DISCORD_BOT_TOKEN`, `DISCORD_BOT_APP_ID`                              | `discord-intel`        |
| `api/middleware/x402-paywall.js`                       | `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`                                 | `x402-paywall`         |
| `api/lib/colosseum-copilot.js`                         | `COLOSSEUM_COPILOT_PAT`                                                | `colosseum-copilot`    |

Full table (estimated ~25-35 tools after dedup) generated during impl Week 1 by parsing the grep output + de-duplicating tools that read the same secret set.

### Migration order

1. **Week 2 (warning-mode):** start with 3 SMALLEST tools — `agentproof-publisher`, `moltbook-poster`, `identity-resolver` (each ~1 secret, low-risk if it breaks)
2. **Week 3 (warning-mode → enforcement-mode):** migrate remaining ~22 tools. Largest last (`twitter-bot`, `core-server`).
3. **Week 4:** flip broker to enforcement-mode; old `.env.*` paths replaced with deny-symlinks.

---

## Section 4 — Implementation Skeleton

### 4.1 Broker process (~250 LOC Node.js)

**Path:** `/home/claude-code/buzz-workspace/security/broker/buzz-secret-broker.js`

Components:
- Unix socket server (`net.createServer({ allowHalfOpen: false })`, listen on `/run/buzz-secret-broker.sock`)
- On `connection`: extract `SO_PEERCRED` via `socket.getPeerCredentials()` (or `node-getpeereid` package for older Node — Node 22 should have it native via the `net` module; verify in Week 1)
- Resolve `pid → tool_identity`: read `/proc/<pid>/cmdline`, normalize, match against scope config
- Per-request: parse JSON `{ op, secret_name }`, check scope, return value or denial, log
- SIGHUP handler: reload `/etc/buzz/secret-scope.json` + `/root/secrets/*.env`
- Structured logging to `/var/log/buzz-secret-broker.log` (one JSON object per line)
- pm2-managed (auto-restart on crash); see 4.4

### 4.2 `secrets.js` helper (~50 LOC)

**Path:** `/home/claude-code/buzz-workspace/api/lib/secrets.js`

```javascript
// Pseudo-skeleton
const net = require('net');
const SOCK = '/run/buzz-secret-broker.sock';
const cache = new Map(); // secret_name → { value, expires_at }

async function get(name) {
  const cached = cache.get(name);
  if (cached && cached.expires_at > Date.now()) return cached.value;

  return new Promise((resolve, reject) => {
    const client = net.createConnection(SOCK, () => {
      client.write(JSON.stringify({ op: 'get', secret_name: name }) + '\n');
    });
    client.on('data', (buf) => {
      const resp = JSON.parse(buf.toString());
      if (!resp.ok) return reject(new Error(`broker: ${resp.error} (${name})`));
      cache.set(name, { value: resp.value, expires_at: Date.now() + resp.ttl_seconds * 1000 });
      resolve(resp.value);
      client.end();
    });
    client.on('error', reject);
    setTimeout(() => reject(new Error('broker timeout')), 2000);
  });
}

module.exports = { get };
```

### 4.3 Mount migration script (~30 LOC)

**Path:** `/home/claude-code/buzz-workspace/security/broker/migrate-secrets-to-root.sh`

```bash
#!/bin/bash
set -euo pipefail
sudo mkdir -p /root/secrets
sudo chmod 700 /root/secrets
for f in canonical aibtc heyanon github moltbook anthropic; do
  src="/home/claude-code/.env.${f}"
  dst="/root/secrets/${f}.env"
  if [ -f "$src" ] && [ ! -L "$src" ]; then
    sudo cp "$src" "$dst"
    sudo chmod 600 "$dst"
    sudo chown root:root "$dst"
    sudo mv "$src" "${src}.pre-broker-bak"
    sudo ln -s /usr/local/bin/buzz-env-deny.sh "$src"
    echo "migrated: $src → $dst (deny-symlink installed)"
  fi
done
echo "Done. Old files preserved at .pre-broker-bak — delete after 7-day validation."
```

Deny-script at `/usr/local/bin/buzz-env-deny.sh`:

```bash
#!/bin/bash
echo "{\"ts\":\"$(date -Iseconds)\",\"caller\":\"$(cat /proc/$PPID/cmdline | tr '\0' ' ')\",\"path\":\"$0\"}" \
  >> /var/log/buzz-env-deny.log
echo "ACCESS DENIED. This path is broker-managed. Use api/lib/secrets.js get('NAME')." >&2
exit 1
```

### 4.4 pm2 ecosystem entry

**Path:** `/home/claude-code/buzz-workspace/security/broker/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'buzz-secret-broker',
    script: './buzz-secret-broker.js',
    cwd: '/home/claude-code/buzz-workspace/security/broker',
    autorestart: true,
    max_restarts: 50,
    min_uptime: '10s',
    error_file: '/var/log/buzz-secret-broker.err.log',
    out_file: '/var/log/buzz-secret-broker.out.log',
    env: { NODE_ENV: 'production', BROKER_MODE: 'enforce' },
    env_warning: { NODE_ENV: 'production', BROKER_MODE: 'warn' }
  }]
};
```

### 4.5 Scope config

**Path:** `/etc/buzz/secret-scope.json` (root-owned, mode 644 — readable by broker, not by `claude`)

```json
{
  "tools": {
    "core-server": {
      "match_cmdline": "node /home/claude-code/buzz-workspace/api/server.js",
      "secrets": ["BUZZ_API_ADMIN_KEY", "TELEGRAM_BOT_TOKEN", "WAR_ROOM_CHAT_ID"]
    },
    "twitter-bot": {
      "match_cmdline_prefix": "node /home/claude-code/buzz-workspace/api/services/twitter-brain.js",
      "secrets": ["X_API_BEARER_TOKEN", "X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET", "BANKR_PARTNER_KEY"]
    }
  },
  "default_policy": "deny",
  "audit_all_requests": true
}
```

---

## Section 5 — Open Questions

1. **SO_PEERCRED vs SCM_CREDENTIALS — which is sufficient?** Proposed: `SO_PEERCRED` (simpler, peer doesn't need to opt-in). On Linux + Node 22, available via the standard `net` module (verify in Week 1; fallback to `node-unix-dgram` if needed). **MOST LOAD-BEARING question** — the entire authentication model depends on it.
2. **Broker as root vs sudo-grant?** Proposed: broker runs as root via systemd-style service file. Avoids passwordless-sudo footgun.
3. **Who maintains `secret-scope.json`?** Proposed: file is in git at `security/broker/secret-scope.json.template`, deployed copy lives at `/etc/buzz/secret-scope.json`. PRs to the template require operator review. Changes deployed via `sudo cp + SIGHUP`.
4. **Backward compatibility during migration?** Proposed: broker has `BROKER_MODE=warn` for first 7 days — denied requests still return the value but log a `scope_violation`. After 7 days, flip to `enforce`. `process.env.X` STILL works during the entire migration (env vars set at parent process startup by reading `/root/secrets/canonical.env`); tools migrate at their own pace.
5. **What about subprocess `child_process.spawn` calls?** A spawned subprocess inherits env from parent. If the parent has the secret in `process.env`, the child does too. Migration must remove the secret from parent env BEFORE spawning — `secrets.js` should explicitly `delete process.env[name]` after caching. Tracked as Week 3 task.
6. **What about Bash tool calls from Claude session?** A Bash tool call inherits the Claude session's env. If the session was launched without the env vars (Week 4 mount-migration step), Bash can't read them. But the broker socket is still accessible to Bash via a `buzz-get-secret <NAME>` CLI wrapper — scope-checked per shell invocation. Decision: ship the CLI wrapper in Week 3.
7. **MCP servers (Telegram, LunarCrush, Gmail) — broker-integrated or env-passthrough?** Proposed: out of scope for v1. MCP servers spawn outside the broker model; they continue reading `/root/secrets/` via their own credential path. Track as item-1.5 follow-up.

---

## Section 6 — Risk Assessment

### Performance
- Unix socket round-trip on localhost: ~0.1 ms typical
- Tool startup adds ~1-5 ms total (handful of secrets, cached after first read)
- Per-request overhead during steady-state: zero (cache hit)
- **Verdict: negligible.**

### Failure modes

| Failure                                            | Mitigation                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Broker crash → all tools lose secret access        | pm2 auto-restart (<5s downtime); tools have 60s in-process cache so most tolerate restart silently        |
| Broker stuck (deadlock, fd exhaustion)             | Tool-side 2s timeout in `secrets.js`; tool falls back to error rather than hang                           |
| Scope config typo locks out critical tool          | Warning-mode 7-day buffer catches before enforce; rollback = revert `secret-scope.json` + SIGHUP          |
| Migration leaves a tool reading old `.env` path    | Deny-symlink + log alert surfaces this within hours of activation; tool gets clear error message          |
| Operator forgets to set perms on `/root/secrets/`  | Migration script enforces 600 + root ownership; checked at broker boot, refuses to start if perms wrong   |
| Broker socket permission misconfig blocks `claude` | Smoke-test in Week 1 with a single migrated tool; explicit `chmod 660` + `chown root:claude` in init      |
| pm2 itself fails                                   | Operator manually launches broker; service file fallback (systemd) tracked as item-1.5                    |

### Operator-side complexity
- Secret rotation now requires editing `/root/secrets/canonical.env` + `kill -HUP <broker-pid>`. Same complexity as today (edit `.env.canonical` + restart services), arguably simpler (no service restart needed).
- One well-secured directory (`/root/secrets/`) replaces 7+ files at `/home/claude-code/`. Reduces attack surface for the operator-managed permission grants.

---

## Section 7 — Sequencing

| Week | Deliverables                                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------------------------------- |
| 1    | Broker process (~250 LOC) + `secrets.js` helper (~50 LOC) + scope config skeleton + pm2 entry + local smoke-test        |
| 2    | Migrate 3 smallest tools (`agentproof`, `moltbook`, `identity`); broker in WARN mode; 7-day observation                 |
| 3    | Migrate remaining ~22 tools; flip broker to ENFORCE mode; ship `buzz-get-secret` CLI wrapper for Bash                   |
| 4    | Mount migration: secrets move to `/root/secrets/`; deny-symlinks installed; old `.env.*` deleted after 7-day backup     |

**Total estimated effort: 3-4 weeks of part-time work, sequenced behind audit pipeline (Lane 1) operations.**

Risk to schedule: scope config tuning during Week 2 WARN mode may reveal more tools than the grep predicts (some tools dynamically read env in nested helpers). Add 1 week buffer if the per-tool count exceeds 35.

---

## Section 8 — Recommendation

### Proposed posture: **GO-with-prototype-first**

The 3-4 week full implementation is correct in scope but high-risk if any architectural assumption (SO_PEERCRED native support, broker-restart tolerance under load, scope-config maintenance burden) fails late in the timeline.

### v0 prototype proposal (1 week build)

- Build the broker + `secrets.js` only.
- Migrate ONE tool end-to-end: `api/services/agentproof.js` (single secret `AGENTPROOF_API_KEY`).
- Run broker in WARN mode for 1 week alongside production `process.env` access.
- **Validation criteria:** zero scope_violations on the migrated tool; broker uptime ≥99.9% (pm2 restart count ≤1); secret retrieval p99 latency ≤2ms; operator confirms the rotation workflow (`edit + SIGHUP`) is acceptable.
- If v0 passes → greenlight full 3-4 week impl.
- If v0 fails → architectural reset; sunk cost is 1 week, not 4.

### Effort-vs-`brain/External-Frameworks.md` envelope

`brain/External-Frameworks.md` v1.2 estimates "2-3 weeks for items 1-5 combined". This PRD's 3-4 weeks for item 1 ALONE is **wider than that envelope**. Two possible reads:

- The brain note's estimate underestimates the per-tool migration cost. (Likely — the grep result of 78 files referencing env was not modeled.)
- Items 2-5 are simpler (e.g., MCP-server allowlist, output-channel restriction, capability tokens already structurally simpler) and ship in 1-2 weeks combined, keeping the cumulative checklist near the envelope.

**Recommendation:** revise `brain/External-Frameworks.md` to "3-4 weeks for item 1, +1-2 weeks for items 2-5" after operator greenlights this PRD, so future planning isn't anchored to the underestimate.

### Greenlight ask

- [ ] Operator approves v0 prototype (1 week build, validates architecture)
- [ ] Operator approves WARN-mode → ENFORCE-mode 7-day buffer pattern
- [ ] Operator confirms `/root/secrets/` directory and broker-as-root posture is acceptable
- [ ] Operator approves scope config in git (template) + deployed copy at `/etc/buzz/`

If all four → proceed with v0 prototype, surface results at end of Week 1 for full-impl greenlight.

---

_PRD: Security-Hardening-Item-1-Credential-Isolation | v1.0 | 2026-05-24 (Ogie msgs 7637 + 7654 — TU Berlin hardening checklist item 1 scoped)_
