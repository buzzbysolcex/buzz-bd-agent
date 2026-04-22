/**
 * BuzzShield V5 — RDT + AISC Unified Threat Model Checklist
 *
 * Source: /data/buzz/persistent/reports/buzzshield-v5-unified-threat-model.md
 * Version: 1.0 (April 22, 2026)
 *
 * 5 domains, 40 items:
 *   - TD-01-LI: Loop Injection (8 items)
 *   - TD-02-OV: Overthinking Exploitation (7 items)
 *   - TD-03-ER: Expert Routing Manipulation (8 items)
 *   - TD-04-SI: Spectral Instability (7 items)
 *   - TD-05-AISC: AI Supply Chain Integrity (10 items)
 *
 * Feature flag: RDT_THREAT_MODEL (default OFF)
 *
 * Consumed by api/routes/shield-public-rdt.js
 */

"use strict";

const VERSION = "1.0";

const DOMAIN_META = {
  "TD-01-LI": {
    name: "Loop Injection",
    description:
      "The frozen input is re-injected at every recurrence step. An adversarial input can compound its effect across all T iterations, amplifying a weak signal until it dominates the hidden state.",
    severity_range: "Medium to Critical",
    detection_signals: [
      "Input embedding similarity to known adversarial clusters, weighted by expected loop depth",
      "Post-loop hidden state drift beyond baseline distribution for the input class",
      "Asymmetric influence patterns (input tokens with disproportionate gradient impact across loops)",
    ],
    references: [
      "https://github.com/kyegomez/OpenMythos",
      "arXiv:2604.12946",
      "arXiv:2510.25741",
    ],
  },
  "TD-02-OV": {
    name: "Overthinking Exploitation",
    description:
      "Beyond a convergence point, looped models drift past the correct solution into noise. Attackers can force inputs past optimal depth to induce hallucination or exhaust compute.",
    severity_range: "Medium to High",
    detection_signals: [
      "Adaptive Computation Time (ACT) halting patterns — unusual halting distributions flagged",
      "Loop count vs. input complexity ratio — simple inputs requesting maximum depth",
      "Output confidence drift across loop depth (confidence without grounding)",
    ],
    references: ["arXiv:1807.03819", "arXiv:2502.17416"],
  },
  "TD-03-ER": {
    name: "Expert Routing Manipulation",
    description:
      "Recurrent-depth architectures pair with Mixture of Experts. An attacker can craft inputs to force routing away from safety-aligned shared experts or concentrate load on less robust routed experts.",
    severity_range: "High to Critical",
    detection_signals: [
      "Expert activation entropy per token (low entropy = routing manipulation suspected)",
      "Shared-expert bypass ratio (inputs systematically avoiding safety experts)",
      "Router logit anomalies (bias-adjusted scores outside training distribution)",
    ],
    references: ["arXiv:2401.06066"],
  },
  "TD-04-SI": {
    name: "Spectral Instability",
    description:
      "Looped training is stable only when the spectral radius of the injection matrix A satisfies ρ(A) < 1. Adversarial inputs can push the residual stream toward boundary conditions where stability breaks — especially in fine-tuned deployments that did not re-verify the constraint.",
    severity_range: "Critical",
    detection_signals: [
      "Runtime spectral radius monitoring of injection parameters",
      "Hidden state magnitude tracking across loops (divergence detection)",
      "Fine-tune artifact scanning (checking if ρ(A) constraints were preserved)",
    ],
    references: ["arXiv:2604.12946"],
  },
  "TD-05-AISC": {
    name: "AI Supply Chain Integrity",
    description:
      "Audits the data, model, and dependency chain that feeds an agent before it processes a single user request. 250 malicious documents are sufficient to backdoor LLMs from 600M to 13B parameters (Anthropic / UK AISI / Alan Turing, Oct 2025).",
    severity_range: "Medium to Critical",
    detection_signals: [
      "Model provenance checkpoint hash verification",
      "Training data source trust classification",
      "Canary trigger / perplexity anomaly monitoring at inference",
      "AI infra dependency SBOM + OSV scanning",
    ],
    references: [
      "https://www.anthropic.com/research/small-samples-poison",
      "https://www.aisi.gov.uk/blog/examining-backdoor-data-poisoning-at-scale",
      "https://arxiv.org/abs/2510.07192",
    ],
  },
};

const RAW_ITEMS = [
  // ───── TD-01-LI : Loop Injection (8) ─────
  {
    id: "LI-01",
    domain_id: "TD-01-LI",
    title: "Loop-depth disclosure",
    severity: "medium",
    description: "Agent declares maximum recurrence depth in metadata.",
    buzzshield_unique: false,
  },
  {
    id: "LI-02",
    domain_id: "TD-01-LI",
    title: "Input perturbation budget",
    severity: "high",
    description: "Adversarial perturbation testing at declared loop depth.",
    buzzshield_unique: false,
  },
  {
    id: "LI-03",
    domain_id: "TD-01-LI",
    title: "Hidden state drift monitoring",
    severity: "high",
    description: "Runtime drift detection across loop iterations.",
    buzzshield_unique: false,
  },
  {
    id: "LI-04",
    domain_id: "TD-01-LI",
    title: "Embedding similarity screening",
    severity: "high",
    description: "Input screened against known adversarial cluster library.",
    buzzshield_unique: false,
  },
  {
    id: "LI-05",
    domain_id: "TD-01-LI",
    title: "Prelude/Coda boundary analysis",
    severity: "critical",
    description:
      "BuzzShield-unique — boundary between setup tokens and payload tokens tested for amplification.",
    buzzshield_unique: true,
  },
  {
    id: "LI-06",
    domain_id: "TD-01-LI",
    title: "Gradient influence asymmetry",
    severity: "high",
    description: "Per-token gradient impact measured across loops.",
    buzzshield_unique: false,
  },
  {
    id: "LI-07",
    domain_id: "TD-01-LI",
    title: "Re-injection isolation test",
    severity: "medium",
    description:
      "Frozen input isolation verified — no cross-contamination from prior requests.",
    buzzshield_unique: false,
  },
  {
    id: "LI-08",
    domain_id: "TD-01-LI",
    title: "Safety bypass regression",
    severity: "critical",
    description: "Post-loop output tested against safety training benchmarks.",
    buzzshield_unique: false,
  },

  // ───── TD-02-OV : Overthinking Exploitation (7) ─────
  {
    id: "OV-01",
    domain_id: "TD-02-OV",
    title: "ACT halting enforcement",
    severity: "high",
    description: "Model implements adaptive halting, not fixed-depth.",
    buzzshield_unique: false,
  },
  {
    id: "OV-02",
    domain_id: "TD-02-OV",
    title: "Compute budget cap",
    severity: "high",
    description: "Per-request loop iteration ceiling enforced.",
    buzzshield_unique: false,
  },
  {
    id: "OV-03",
    domain_id: "TD-02-OV",
    title: "Convergence detection",
    severity: "medium",
    description: "Early stopping when hidden state stabilizes.",
    buzzshield_unique: false,
  },
  {
    id: "OV-04",
    domain_id: "TD-02-OV",
    title: "Complexity-depth correlation",
    severity: "medium",
    description: "Simple inputs flagged when requesting maximum depth.",
    buzzshield_unique: false,
  },
  {
    id: "OV-05",
    domain_id: "TD-02-OV",
    title: "Confidence calibration",
    severity: "high",
    description:
      "Output confidence verified against actual accuracy at each depth.",
    buzzshield_unique: false,
  },
  {
    id: "OV-06",
    domain_id: "TD-02-OV",
    title: "x402 billing awareness",
    severity: "high",
    description:
      "BuzzShield-unique — compute budget tied to x402 payment, preventing billing drain via forced overthinking.",
    buzzshield_unique: true,
  },
  {
    id: "OV-07",
    domain_id: "TD-02-OV",
    title: "Hallucination regression suite",
    severity: "medium",
    description:
      "Post-convergence outputs tested against known-correct baselines.",
    buzzshield_unique: false,
  },

  // ───── TD-03-ER : Expert Routing Manipulation (8) ─────
  {
    id: "ER-01",
    domain_id: "TD-03-ER",
    title: "Shared expert enforcement",
    severity: "critical",
    description: "Safety-aligned shared experts cannot be bypassed by routing.",
    buzzshield_unique: false,
  },
  {
    id: "ER-02",
    domain_id: "TD-03-ER",
    title: "Expert activation entropy monitoring",
    severity: "high",
    description:
      "Low-entropy activation patterns flagged as routing manipulation.",
    buzzshield_unique: false,
  },
  {
    id: "ER-03",
    domain_id: "TD-03-ER",
    title: "Router logit anomaly detection",
    severity: "high",
    description: "Routing scores outside training distribution trigger alerts.",
    buzzshield_unique: false,
  },
  {
    id: "ER-04",
    domain_id: "TD-03-ER",
    title: "Load concentration limits",
    severity: "high",
    description:
      "No single expert handles >X% of traffic (configurable threshold).",
    buzzshield_unique: false,
  },
  {
    id: "ER-05",
    domain_id: "TD-03-ER",
    title: "Expert capability mapping",
    severity: "medium",
    description:
      "Each expert's capability documented, safety-critical experts identified.",
    buzzshield_unique: false,
  },
  {
    id: "ER-06",
    domain_id: "TD-03-ER",
    title: "MoE-RDT blended attack detection",
    severity: "critical",
    description:
      "BuzzShield-unique — combined routing + loop depth manipulation detected.",
    buzzshield_unique: true,
  },
  {
    id: "ER-07",
    domain_id: "TD-03-ER",
    title: "Routing function integrity",
    severity: "high",
    description: "Router weights verified against training checkpoint.",
    buzzshield_unique: false,
  },
  {
    id: "ER-08",
    domain_id: "TD-03-ER",
    title: "Expert isolation testing",
    severity: "high",
    description: "Each expert tested in isolation for safety alignment.",
    buzzshield_unique: false,
  },

  // ───── TD-04-SI : Spectral Instability (7) ─────
  {
    id: "SI-01",
    domain_id: "TD-04-SI",
    title: "Spectral radius verification",
    severity: "critical",
    description: "ρ(A) < 1 verified at deploy time and after every fine-tune.",
    buzzshield_unique: false,
  },
  {
    id: "SI-02",
    domain_id: "TD-04-SI",
    title: "Hidden state magnitude monitoring",
    severity: "critical",
    description: "Runtime tracking of h_t norm across loops, alerts on growth.",
    buzzshield_unique: false,
  },
  {
    id: "SI-03",
    domain_id: "TD-04-SI",
    title: "Fine-tune artifact scanning",
    severity: "critical",
    description:
      "Post-fine-tune verification that stability constraints preserved.",
    buzzshield_unique: false,
  },
  {
    id: "SI-04",
    domain_id: "TD-04-SI",
    title: "Residual stream bounds",
    severity: "critical",
    description: "Hard bounds on hidden state magnitude enforced at inference.",
    buzzshield_unique: false,
  },
  {
    id: "SI-05",
    domain_id: "TD-04-SI",
    title: "Convergence point verification",
    severity: "critical",
    description:
      "Final hidden state compared against expected convergence targets.",
    buzzshield_unique: false,
  },
  {
    id: "SI-06",
    domain_id: "TD-04-SI",
    title: "Injection matrix integrity",
    severity: "critical",
    description:
      "A matrix verified against training checkpoint at inference time.",
    buzzshield_unique: false,
  },
  {
    id: "SI-07",
    domain_id: "TD-04-SI",
    title: "Runtime spectral-radius certificate",
    severity: "critical",
    description:
      "BuzzShield-unique — continuous runtime certificate that ρ(A) < 1 holds, not just deploy-time check.",
    buzzshield_unique: true,
  },

  // ───── TD-05-AISC : AI Supply Chain Integrity (10) ─────
  {
    id: "AISC-01",
    domain_id: "TD-05-AISC",
    title: "Model Provenance Declaration",
    severity: "high",
    description:
      "Agent declares model source, version, training lineage, and checkpoint hash.",
    buzzshield_unique: false,
  },
  {
    id: "AISC-02",
    domain_id: "TD-05-AISC",
    title: "Training Data Source Audit",
    severity: "high",
    description:
      "Training data sources documented with trust classification (internal/verified/external/unknown).",
    buzzshield_unique: false,
  },
  {
    id: "AISC-03",
    domain_id: "TD-05-AISC",
    title: "Untrusted Content Ingestion Boundary",
    severity: "high",
    description:
      "Clear separation between trusted training data and untrusted runtime ingestion (RAG, scraped data).",
    buzzshield_unique: false,
  },
  {
    id: "AISC-04",
    domain_id: "TD-05-AISC",
    title: "Canary Trigger Monitoring",
    severity: "critical",
    description:
      "BuzzShield-unique — Sentinel-style probe system detecting backdoor triggers (known patterns + perplexity anomaly).",
    buzzshield_unique: true,
  },
  {
    id: "AISC-05",
    domain_id: "TD-05-AISC",
    title: "Post-Training Mitigation Stack",
    severity: "medium",
    description:
      "RLHF, adversarial fine-tuning, or safety layer applied after base training.",
    buzzshield_unique: false,
  },
  {
    id: "AISC-06",
    domain_id: "TD-05-AISC",
    title: "Dependency Chain for AI Infra",
    severity: "medium",
    description:
      "AI-specific dependencies audited (model loaders, tokenizers, inference runtimes, vector DBs).",
    buzzshield_unique: false,
  },
  {
    id: "AISC-07",
    domain_id: "TD-05-AISC",
    title: "Prompt Injection Defense Layer",
    severity: "high",
    description:
      "Active defense against prompt injection at inference time (pattern + ML classifier).",
    buzzshield_unique: false,
  },
  {
    id: "AISC-08",
    domain_id: "TD-05-AISC",
    title: "Agent Identity & Attestation",
    severity: "medium",
    description:
      "On-chain identity registered (ERC-8004, AgentProof, or equivalent).",
    buzzshield_unique: false,
  },
  {
    id: "AISC-09",
    domain_id: "TD-05-AISC",
    title: "Kill Switch & Rollback Capability",
    severity: "medium",
    description:
      "Agent can be halted and rolled back to known-good state within defined SLA.",
    buzzshield_unique: false,
  },
  {
    id: "AISC-10",
    domain_id: "TD-05-AISC",
    title: "User-Facing Disclosure of AI Risk",
    severity: "medium",
    description:
      "End users informed that they are interacting with AI and aware of relevant risk categories.",
    buzzshield_unique: false,
  },
];

// Enrich each raw item with domain-level detection_signals + references.
const ITEMS = RAW_ITEMS.map((raw) => {
  const meta = DOMAIN_META[raw.domain_id] || {};
  return {
    id: raw.id,
    domain: meta.name || raw.domain_id,
    domain_id: raw.domain_id,
    title: raw.title,
    description: raw.description,
    severity: raw.severity || "medium",
    detection_signals: Array.isArray(meta.detection_signals)
      ? meta.detection_signals.slice()
      : [],
    references: Array.isArray(meta.references) ? meta.references.slice() : [],
    buzzshield_unique: Boolean(raw.buzzshield_unique),
  };
});

const DOMAINS = Object.keys(DOMAIN_META).map((id) => {
  const meta = DOMAIN_META[id];
  const count = ITEMS.filter((it) => it.domain_id === id).length;
  return {
    domain_id: id,
    name: meta.name,
    description: meta.description,
    severity_range: meta.severity_range,
    item_count: count,
    detection_signals: meta.detection_signals.slice(),
    references: meta.references.slice(),
  };
});

function getAll() {
  return ITEMS.slice();
}

function getByDomain(domainId) {
  if (!domainId) return getAll();
  const needle = String(domainId).toUpperCase();
  return ITEMS.filter((it) => it.domain_id.toUpperCase() === needle);
}

function getBySeverity(severity) {
  if (!severity) return getAll();
  const needle = String(severity).toLowerCase();
  return ITEMS.filter((it) => it.severity.toLowerCase() === needle);
}

function filter({ domain, severity } = {}) {
  let out = getAll();
  if (domain) {
    const needle = String(domain).toUpperCase();
    out = out.filter((it) => it.domain_id.toUpperCase() === needle);
  }
  if (severity) {
    const needle = String(severity).toLowerCase();
    out = out.filter((it) => it.severity.toLowerCase() === needle);
  }
  return out;
}

module.exports = {
  VERSION,
  DOMAIN_META,
  DOMAINS,
  ITEMS,
  getAll,
  getByDomain,
  getBySeverity,
  filter,
};
