# NemoClaw Compatibility Report

**Date:** 2026-03-18
**Author:** Buzz BD Agent Team (Day 31)
**Status:** Research Only — no installer analyzed

---

## 1. What Is NemoClaw?

NemoClaw is NVIDIA's open-source agentic container orchestration stack, announced at GTC 2026 on March 16, 2026. It is an OpenClaw plugin that packages the NVIDIA OpenShell runtime with enterprise-grade security, privacy, and policy controls for running autonomous AI agents ("claws") in sandboxed environments.

Key characteristics:

- **Enterprise wrapper around OpenClaw** — a distribution that ships with the components a security-conscious organization needs before letting autonomous agents near production systems.
- **CLI-driven orchestration** — the `nemoclaw` CLI orchestrates the full stack: OpenShell gateway, sandbox, inference provider, and network policy.
- **Sandboxed execution** — each agent runs inside an isolated OpenShell sandbox (effectively a Docker container with kernel-level cgroup isolation and YAML-based policy controls).
- **Declarative security policies** — administrators define which files an agent can access, which network connections it can make, and which cloud services it can call, all via YAML configuration.
- **Early-stage** — NVIDIA states NemoClaw should not yet be considered production-ready.

Sources:

- [GitHub - NVIDIA/NemoClaw](https://github.com/NVIDIA/NemoClaw)
- [NVIDIA Announces NemoClaw](https://nvidianews.nvidia.com/news/nvidia-announces-nemoclaw)
- [VentureBeat: NemoClaw brings security, scale to the agent platform](https://venturebeat.com/technology/nvidia-lets-its-claws-out-nemoclaw-brings-security-scale-to-the-agent)
- [The New Stack: NemoClaw is OpenClaw with guardrails](https://thenewstack.io/nemoclaw-openclaw-with-guardrails/)

---

## 2. How NemoClaw Relates to OpenClaw / agentic.hosting (ah)

| Aspect        | OpenClaw (standalone) | NemoClaw                               | ah (agentic.hosting) |
| ------------- | --------------------- | -------------------------------------- | -------------------- |
| Runtime       | OpenClaw gateway      | OpenShell (wraps OpenClaw)             | OpenClaw gateway     |
| Orchestration | Manual / CLI          | `nemoclaw` CLI + blueprints            | `ah` CLI             |
| Sandbox       | Basic Docker          | OpenShell kernel-level isolation       | Docker containers    |
| Security      | User-managed          | YAML policy-based guardrails           | User-managed         |
| Inference     | User-configured       | Nemotron models + NVIDIA cloud routing | User-configured      |

NemoClaw sits _above_ OpenClaw — it installs and manages OpenClaw via OpenShell. Our current setup uses `ah` (agentic.hosting) to manage OpenClaw containers on Akash Network. NemoClaw would be an alternative management layer that replaces `ah` as the orchestrator, not a complementary tool that runs alongside it.

---

## 3. Port Conflicts

### Ports Used by Our Stack (Buzz BD Agent)

| Port  | Service                 | Notes                   |
| ----- | ----------------------- | ----------------------- |
| 3000  | Buzz REST API (Express) | `BUZZ_API_PORT` env var |
| 3001  | Not currently used      | Reserved for future use |
| 8000  | Not currently used      | —                       |
| 8080  | Not currently used      | —                       |
| 18789 | OpenClaw gateway        | `OPENCLAW_PORT` env var |

### Ports Used by NemoClaw / OpenShell

| Port  | Service                     | Notes                                                  |
| ----- | --------------------------- | ------------------------------------------------------ |
| 18789 | OpenShell gateway (default) | Same as OpenClaw default                               |
| 3000  | Configurable alternative    | Can be set via `openclaw config set gateway.port 3000` |
| 8080  | Configurable alternative    | Can be set via `openclaw config set gateway.port 8080` |

### Conflict Assessment

- **Port 18789 — HIGH RISK.** Both our existing OpenClaw gateway and NemoClaw's OpenShell gateway default to port 18789. Running both simultaneously would cause a direct conflict.
- **Port 3000 — MEDIUM RISK.** If NemoClaw is configured to use port 3000 as its gateway, it would conflict with our Buzz REST API. The default is 18789, so this is only a risk if someone reconfigures it.
- **Ports 3001, 8000, 8080 — LOW RISK.** No known default conflicts, but 8080 is a configurable option for the OpenShell gateway.

---

## 4. Docker Management

### Does NemoClaw Assume Docker Compose?

NemoClaw uses Docker under the hood but manages containers through its own orchestration layer rather than a user-facing `docker-compose.yml`:

- **OpenShell embeds k3s inside Docker** — it requires host cgroup namespace access (`default-cgroupns-mode: host` in Docker daemon config).
- **OpenClaw's Docker setup** uses `network_mode: "service:openclaw-gateway"` so CLI commands can reach the gateway over 127.0.0.1.
- **Network isolation by default** — OpenShell uses `network: none` by default, requiring explicit network access enablement.

### Does NemoClaw Create Its Own Containers?

**Yes.** When you run the NemoClaw launch command, it:

1. Creates an OpenShell sandbox (an isolated Docker container).
2. Configures the gateway, inference providers, sandbox, and network policy based on a versioned blueprint.
3. Manages the full container lifecycle through the `nemoclaw` CLI.

This means NemoClaw would create and manage its own set of Docker containers, potentially conflicting with any `ah`-managed containers already running.

---

## 5. Compatibility Assessment with ah-Managed Containers

### Current Setup

- Buzz runs on Akash Network via `ah` (agentic.hosting)
- `ah` manages OpenClaw containers, deploys to Akash providers
- Our Docker image: `ghcr.io/buzzbysolcex/buzz-bd-agent:v6.3.6`

### Compatibility Issues

| Issue                         | Severity | Detail                                                                                                  |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| Gateway port conflict (18789) | Critical | Both `ah` and NemoClaw want to run an OpenClaw/OpenShell gateway on 18789                               |
| Docker daemon config changes  | High     | NemoClaw requires `default-cgroupns-mode: host`, which may affect all containers                        |
| Container network namespace   | High     | NemoClaw's `network: none` default and `network_mode: service:` pattern may conflict with ah networking |
| k3s embedded in Docker        | Medium   | OpenShell embeds k3s, adding resource overhead and potential conflicts                                  |
| Inference routing             | Medium   | NemoClaw routes inference through NVIDIA cloud by default; our stack uses MiniMax + Bankr               |

### Verdict

**NemoClaw and ah are NOT compatible for simultaneous use on the same host** managing the same OpenClaw instance. They are both orchestration layers that assume control over the OpenClaw gateway and container lifecycle.

---

## 6. Recommendation: NemoClaw Alongside ah, or Either-Or?

### Answer: Either-Or (Not Both)

NemoClaw and `ah` serve overlapping roles — they are both container orchestration tools for OpenClaw agents. Running both simultaneously would result in:

- Two competing gateway processes on port 18789
- Conflicting Docker container management
- Unpredictable network policy enforcement
- Conflicting cgroup and namespace configurations

### Possible Future Path

If we wanted to adopt NemoClaw, the migration would look like:

1. **Replace `ah` with NemoClaw** as the orchestration layer
2. **Re-deploy Buzz inside a NemoClaw-managed OpenShell sandbox** instead of an ah-managed container
3. **Reconfigure inference routing** to either keep MiniMax/Bankr or switch to Nemotron
4. **Port our YAML policies** to NemoClaw's policy format
5. **Validate port 3000** remains available for Buzz REST API inside the sandbox

### When NemoClaw Might Make Sense

- If we need enterprise-grade security guardrails (policy-based network/file access)
- If we migrate from Akash to a dedicated GPU instance (DGX Spark, DGX Station)
- If NVIDIA Nemotron models become cost-competitive with MiniMax for our use case

### When NemoClaw Does NOT Make Sense (Now)

- We run on Akash Network, not NVIDIA hardware
- NemoClaw is early-stage / not production-ready
- Our current ah + OpenClaw setup is working and stable
- Switching orchestrators mid-operation is high-risk

---

## 7. Risk Assessment: Would Installing NemoClaw Break Our Existing Setup?

### Risk Level: HIGH

| Risk                                                                               | Impact                  | Likelihood |
| ---------------------------------------------------------------------------------- | ----------------------- | ---------- |
| Port 18789 conflict kills existing OpenClaw gateway                                | Service outage          | Very High  |
| Docker daemon config change (`cgroupns-mode: host`) affects all running containers | Service degradation     | High       |
| NemoClaw installer modifies Node.js installation                                   | API server instability  | Medium     |
| k3s embedded in Docker consumes shared resources                                   | Performance degradation | Medium     |
| Network policy (default `network: none`) blocks Buzz API traffic                   | Complete outage         | Medium     |
| NemoClaw overwrites OpenClaw config files                                          | Config corruption       | Medium     |

### Recommendation

**DO NOT install NemoClaw on any machine currently running Buzz in production.** If evaluation is desired:

1. Use a completely separate test machine or VM
2. Do not share Docker daemon with production containers
3. Validate all port assignments before launching
4. Keep NemoClaw evaluation isolated from the Akash deployment

---

## Unknowns (Items We Could Not Verify)

Since this is a research-only report based on public sources (we did not download or run the NemoClaw installer), the following remain unknown:

- Exact list of all ports NemoClaw opens during installation
- Whether NemoClaw's OpenShell sandbox can be configured to coexist with an external OpenClaw gateway
- Whether NemoClaw modifies `/etc/docker/daemon.json` automatically or prompts first
- Whether NemoClaw's blueprint system can import existing ah-managed configurations
- Full resource requirements (CPU, memory, disk) for the OpenShell + k3s stack
- Whether NemoClaw supports Akash Network as a deployment target

---

_Report generated from public sources only. No installer scripts were downloaded or executed._
