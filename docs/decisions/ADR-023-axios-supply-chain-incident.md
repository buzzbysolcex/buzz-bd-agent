# ADR-023: axios npm Supply Chain Incident Response

## Status: Accepted
## Date: 2026-04-05
## Context

GitHub Advisory GHSA-fw8c-xr5c-95f9 disclosed that axios npm versions 1.13.4-1.13.5 were compromised by North Korean state actor Sapphire Sleet. The attack injected `plain-crypto-js` as a dependency that exfiltrated credentials (environment variables, wallet keys, API tokens) via C2 server at `sfrclak.com` (142.11.206.73, 142.11.206.72).

GitHub confirmed C2 communication from our CI runners during the March 31 window. IOC scan on our Hetzner server was CLEAN — axios 1.13.6 (safe), no plain-crypto-js, no RAT artifacts, no active C2 connections.

## Decision

### Credentials Rotated
| Credential | Rotated | Location |
|---|---|---|
| HETZNER_SSH_KEY | YES | GitHub secret + authorized_keys |
| DOCKER_PASSWORD | YES | GitHub secret (buzz-ci-apr2026) |
| GH_PAT | YES | GitHub secret (90-day expiry) |
| TELEGRAM_BOT_TOKEN | YES | GitHub secret + server .env |
| SENTINEL_BOT_TOKEN | YES | GitHub secret + hermes .env |
| NANSEN_API_KEY | PENDING | Nansen dashboard + server .env |
| X_ACCESS_TOKEN | PENDING | developer.x.com + server .env |
| X_ACCESS_TOKEN_SECRET | PENDING | Same |
| X_CONSUMER_KEY | PENDING | Same |
| X_CONSUMER_SECRET | PENDING | Same |

### CI/CD Hardening
1. Added supply chain security check step to deploy.yml (pre-build)
2. Lockfile integrity scan blocks `plain-crypto-js` in any lockfile
3. `npm audit --audit-level=critical` runs before every build
4. Dockerfile npm install uses `--ignore-scripts` with explicit rebuild for native modules
5. axios 1.13.6 confirmed safe in lockfiles

### Server Hardening (requires root)
```bash
# Block C2 IPs
iptables -A OUTPUT -d 142.11.206.73 -j DROP
iptables -A OUTPUT -d 142.11.206.72 -j DROP

# Block C2 domain
echo "0.0.0.0 sfrclak.com" >> /etc/hosts
```

## Consequences
- All CI builds now fail-fast on compromised dependency detection
- npm postinstall scripts no longer run during Docker builds (except explicit rebuilds)
- Credential rotation cadence established: 90-day expiry on GH_PAT
- Five credentials still pending rotation (Nansen, Twitter) — tracked in master prompt
