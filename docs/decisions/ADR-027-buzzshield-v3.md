# ADR-027: BuzzShield V3 — Research-Driven Security Layers

## Status: PROPOSED

## Date: 2026-04-10

## Context

"Your Agent Is Mine" (arXiv:2604.08407, CCS 2026) by UCSB/Fuzzland/UCSD/World Liberty Financial
is the first systematic study of malicious LLM API routers. Key findings:

- 428 routers studied, 9 actively injecting malicious code (2.1% hostile rate)
- 17 stealing credentials, 1 confirmed ETH wallet drainer
- 4 attack classes: AC-1 (response injection), AC-2 (credential theft),
  AC-1.a (package typosquatting), AC-1.b (conditional delivery after warm-up)
- 3 proposed defenses: policy gate, anomaly screening, transparency logging

BuzzShield V2 already covers all 4 attack classes but the paper identifies
deeper defense layers we should implement.

## Decision

Add 3 new BuzzShield layers inspired by the paper's defense recommendations:

1. **Drift Detector** (BUZZSHIELD_DRIFT_DETECTOR) — behavioral entropy
   tracking per router session to catch AC-1.b warm-up evasion
2. **Typosquat Scanner** (BUZZSHIELD_TYPOSQUAT) — Levenshtein distance
   check against top 5000 npm/pip packages, complementing OSV.dev
3. **Integrity Binding** (BUZZSHIELD_INTEGRITY_BINDING) — SHA-256 hash
   of every scan result stored on-chain via ScoreStorage v2

All three start as feature-flagged FALSE. Implementation timeline: Q2-Q3 2026.

## Alternatives Considered

1. Wait for paper's reference implementation → rejected (no code released)
2. Only cite paper without building → rejected (competitive advantage in building)
3. Build all 3 simultaneously → rejected (staged rollout reduces risk)

## Consequences

- Service catalog: 34 → 37 services (3 planned)
- Feature flags: 53 → 56
- Frontier hackathon submission strengthened with CCS 2026 citation
- Academic validation creates differentiation vs competitors on #439

## References

- arXiv:2604.08407 — "Your Agent Is Mine"
- ADR-025 — BuzzShield gap analysis (DeepMind, SCONE-bench, OWASP)
- Wiki: /data/buzz/persistent/wiki/concepts/buzzshield-v3-roadmap.md
- Wiki: /data/buzz/persistent/wiki/entities/ucsb-mine-paper.md
