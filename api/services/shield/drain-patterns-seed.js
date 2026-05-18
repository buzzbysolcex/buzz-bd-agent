/**
 * Buzz Shield — 31 Drain Patterns (was 23, +8 from deep research Apr 10 2026)
 * Sources: DeepMind AI Agent Traps, Blockaid, Blowfish, SlowMist, on-chain analysis,
 * Chainalysis 2026, Immunefi, Datadog Security Labs, UCSB CCS 2026
 */

const SEED_PATTERNS = [
  {
    pattern_id: "owner_reassign_combo",
    name: "Owner Reassignment Combo",
    description:
      "assign instruction transfers account ownership to attacker program, followed by SOL drain",
    instruction_sequence: JSON.stringify(["assign", "transfer"]),
    severity: "critical",
    source: "deepmind_agent_traps",
    confirmed: 1,
    first_seen: "2025-06-01",
  },
  {
    pattern_id: "bulk_spl_drain",
    name: "Bulk SPL Token Drain",
    description:
      "Enumerates all token accounts then transfers each SPL token to attacker address",
    instruction_sequence: JSON.stringify([
      "getTokenAccountsByOwner",
      "transfer_checked",
    ]),
    severity: "critical",
    source: "onchain_analysis",
    confirmed: 1,
    first_seen: "2025-03-15",
  },
  {
    pattern_id: "durable_nonce_trick",
    name: "Durable Nonce Trap",
    description:
      "Uses AdvanceNonceAccount to create never-expiring transaction that can be submitted later after program upgrade",
    instruction_sequence: JSON.stringify([
      "advanceNonceAccount",
      "programCall",
    ]),
    severity: "high",
    source: "blockaid_toctou",
    confirmed: 1,
    first_seen: "2025-09-01",
  },
  {
    pattern_id: "toctou_program_upgrade",
    name: "TOCTOU Program Upgrade",
    description:
      "Program upgraded within 1 block of transaction, changing execution behavior after simulation",
    instruction_sequence: JSON.stringify(["upgradeProgram", "invoke"]),
    severity: "high",
    source: "blowfish_aqua_vanish",
    confirmed: 1,
    first_seen: "2025-11-01",
  },
  {
    pattern_id: "blinks_phishing",
    name: "Blinks Action Phishing",
    description:
      "Solana Action endpoint returns assign instruction hidden in seemingly normal transaction",
    instruction_sequence: JSON.stringify(["actionEndpoint", "assign"]),
    severity: "high",
    source: "solana_blinks_registry",
    confirmed: 1,
    first_seen: "2025-08-01",
  },
  {
    pattern_id: "fake_mint_drain",
    name: "Fake Mint Drain",
    description:
      "Creates token account then transfers victim SOL disguised as mint operation",
    instruction_sequence: JSON.stringify(["createAccount", "transfer"]),
    severity: "medium",
    source: "nft_phishing_q1_2026",
    confirmed: 1,
    first_seen: "2026-01-15",
  },
  {
    pattern_id: "approval_fatigue",
    name: "Approval Fatigue Attack",
    description:
      "Multiple small benign transactions followed by one malicious transaction in sequence",
    instruction_sequence: JSON.stringify(["benign_tx_series", "malicious_tx"]),
    severity: "medium",
    source: "deepmind_agent_traps",
    confirmed: 1,
    first_seen: "2026-02-01",
  },
  {
    pattern_id: "supply_chain_poison",
    name: "Supply Chain Package Poison",
    description:
      "npm/pip dependency modified to exfiltrate wallet keys and credentials via postinstall script",
    instruction_sequence: JSON.stringify(["postinstall", "exfiltrate_env"]),
    severity: "critical",
    source: "axios_ghsa_fw8c",
    confirmed: 1,
    first_seen: "2026-03-31",
  },
  {
    pattern_id: "mcp_tool_hijack",
    name: "MCP Tool Data Manipulation",
    description:
      "MCP tool returns manipulated data to trick agent into signing malicious transaction",
    instruction_sequence: JSON.stringify(["mcp_response_tamper", "sign_tx"]),
    severity: "high",
    source: "agent_breach_analysis",
    confirmed: 1,
    first_seen: "2026-01-01",
  },
  {
    pattern_id: "memory_poison",
    name: "Agent Memory Poisoning",
    description:
      "Malicious instructions injected into agent long-term memory to alter future behavior",
    instruction_sequence: JSON.stringify(["memory_write", "delayed_trigger"]),
    severity: "high",
    source: "deepmind_agent_traps",
    confirmed: 1,
    first_seen: "2026-02-15",
  },
  {
    pattern_id: "multisig_reassign",
    name: "Silent Multisig Reassignment",
    description: "Silently adds attacker key to multisig authority set",
    instruction_sequence: JSON.stringify(["setAuthority", "addSigner"]),
    severity: "critical",
    source: "slowmist_tron_migration",
    confirmed: 1,
    first_seen: "2025-12-01",
  },
  {
    pattern_id: "token_account_drain",
    name: "Token Account Close Sweep",
    description:
      "Closes all token accounts to reclaim SOL rent to attacker address",
    instruction_sequence: JSON.stringify(["closeAccount_loop"]),
    severity: "high",
    source: "rublevka_drainer_kit",
    confirmed: 1,
    first_seen: "2025-10-01",
  },
  {
    pattern_id: "cascading_agent_exploit",
    name: "Cascading Agent Exploit",
    description:
      "Compromised agent sends malicious instructions to other agents in network",
    instruction_sequence: JSON.stringify([
      "agent_message",
      "propagate",
      "drain",
    ]),
    severity: "critical",
    source: "procurement_fraud_q3",
    confirmed: 1,
    first_seen: "2026-03-01",
  },
  {
    pattern_id: "phantom_sim_bypass",
    name: "Simulation Bypass",
    description:
      "Transaction passes wallet simulation but executes differently on-chain",
    instruction_sequence: JSON.stringify([
      "simulate_benign",
      "execute_malicious",
    ]),
    severity: "high",
    source: "coinspect_phantom",
    confirmed: 1,
    first_seen: "2025-07-01",
  },
  {
    pattern_id: "program_upgrade_then_drain",
    name: "Upgrade-then-Drain",
    description:
      "Program upgraded, waits 1 block, then drains via new code path",
    instruction_sequence: JSON.stringify([
      "upgradeProgram",
      "wait_block",
      "drain",
    ]),
    severity: "critical",
    source: "toctou_variant",
    confirmed: 1,
    first_seen: "2025-11-15",
  },
  {
    pattern_id: "hidden_instruction_bundle",
    name: "Hidden Instruction Bundle",
    description:
      "More than 5 instructions where malicious one is hidden among benign ones",
    instruction_sequence: JSON.stringify(["benign_x5", "malicious_x1"]),
    severity: "medium",
    source: "phishing_analysis",
    confirmed: 1,
    first_seen: "2025-09-15",
  },
  {
    pattern_id: "fake_airdrop_drain",
    name: "Fake Airdrop Drain",
    description:
      "Claim airdrop transaction that actually transfers tokens OUT from victim",
    instruction_sequence: JSON.stringify([
      "claimAirdrop_facade",
      "transfer_out",
    ]),
    severity: "medium",
    source: "rublevka_landing_pages",
    confirmed: 1,
    first_seen: "2025-08-15",
  },
  {
    pattern_id: "delegated_authority_abuse",
    name: "Delegated Authority Abuse",
    description:
      "Program given delegate authority on token account then uses it to drain",
    instruction_sequence: JSON.stringify([
      "approve_delegate",
      "transferChecked",
    ]),
    severity: "high",
    source: "spl_token_exploit",
    confirmed: 1,
    first_seen: "2025-06-15",
  },
  {
    pattern_id: "agent_identity_spoof",
    name: "Agent Identity Spoofing",
    description:
      "Agent claims to be a known trusted agent with wrong ERC-8004 identity",
    instruction_sequence: JSON.stringify(["fake_erc8004", "trust_exploit"]),
    severity: "high",
    source: "deepmind_agent_traps",
    confirmed: 1,
    first_seen: "2026-03-15",
  },
  {
    pattern_id: "prompt_injection_memo",
    name: "Prompt Injection via TX Memo",
    description:
      "Transaction memo field contains instructions targeting the signing agent LLM",
    instruction_sequence: JSON.stringify(["memo_with_prompt", "agent_action"]),
    severity: "medium",
    source: "novel_2026_vector",
    confirmed: 0,
    first_seen: "2026-04-01",
  },
  // Phase 2 P0 patterns
  {
    pattern_id: "address_poisoning_lookalike",
    name: "Address Poisoning — Lookalike Substitution",
    description:
      "Attacker sends dust from address matching first/last 4 chars of trusted recipient. Agent picks poisoned address from tx history. 65.4M incidents since Jan 2025, $12.4M single loss.",
    instruction_sequence: JSON.stringify([
      "dust_send_to_victim",
      "victim_copies_from_history",
      "transfer_to_lookalike",
    ]),
    severity: "critical",
    source: "blockaid_address_poisoning_2026",
    confirmed: 1,
    first_seen: "2025-01-01",
  },
  {
    pattern_id: "durable_nonce_temporal_delay",
    name: "Temporal Delay Attack — Pre-Signed Nonce Exploitation",
    description:
      "Pre-signed durable nonce transaction held for days/weeks then submitted. Drift Protocol lost $270M via this vector (Apr 2 2026). Social engineering obtains signatures, temporal separation hides intent.",
    instruction_sequence: JSON.stringify([
      "social_eng_sign",
      "durable_nonce_store",
      "delay_days_weeks",
      "rapid_sequential_submit",
    ]),
    severity: "critical",
    source: "drift_hack_april_2026",
    confirmed: 1,
    first_seen: "2026-04-02",
  },
  {
    pattern_id: "cross_chain_bridge_spoof",
    name: "Cross-Chain Bridge Message Spoofing",
    description:
      "Spoofed bridge message with zero gateway verification. Receiver contract trusts unverified source. CrossCurve lost $3M Feb 2026. Bridges account for 69% of DeFi theft.",
    instruction_sequence: JSON.stringify([
      "spoofed_bridge_message",
      "missing_gateway_proof",
      "execute_on_destination",
    ]),
    severity: "critical",
    source: "crosscurve_bridge_2026",
    confirmed: 1,
    first_seen: "2026-02-01",
  },
  // ── Deep Research Patterns (Apr 10, 2026) ──
  {
    pattern_id: "cicd_supply_chain_cascade",
    name: "CI/CD Supply Chain Cascade",
    description:
      "Compromised security scanner (e.g., Trivy) steals maintainer credentials, publishes backdoored packages targeting wallet files. Detection: .pth files in site-packages, unexpected postinstall hooks",
    instruction_sequence: JSON.stringify([
      "postinstall",
      "exfiltrate_env",
      "download_rat",
    ]),
    severity: "critical",
    source: "datadog_litellm_teampcp",
    confirmed: 1,
    first_seen: "2026-03-19",
  },
  {
    pattern_id: "steganographic_payload",
    name: "Steganographic Payload Delivery",
    description:
      "Malware hidden in WAV/audio files with XOR-encrypted payloads in audio frames. Downloaded during package installation from non-CDN IPs",
    instruction_sequence: JSON.stringify([
      "download_media",
      "xor_decrypt",
      "execute",
    ]),
    severity: "high",
    source: "datadog_telnyx_campaign",
    confirmed: 1,
    first_seen: "2026-03-27",
  },
  {
    pattern_id: "ai_oracle_manipulation",
    name: "AI Agent Oracle Manipulation",
    description:
      "Manipulated price feeds targeting AI trading agents that trust oracle data without validation. $45M+ losses from agents with shared API keys (45.6% of deployments)",
    instruction_sequence: JSON.stringify([
      "feed_manipulation",
      "autonomous_trade",
      "drain",
    ]),
    severity: "critical",
    source: "slowmist_2025_report",
    confirmed: 1,
    first_seen: "2025-09-01",
  },
  {
    pattern_id: "post_fusaka_address_poisoning",
    name: "Post-Fusaka Address Poisoning Surge",
    description:
      "Ethereum Fusaka upgrade reduced fees 6x, poisoning attempts spiked from 628K to 3.4M/month (5.5x). $62M lost in two months. Zero-value/dust transfers from vanity addresses matching user history",
    instruction_sequence: JSON.stringify([
      "dust_transfer",
      "vanity_address",
      "clipboard_hijack",
    ]),
    severity: "critical",
    source: "chainalysis_2026",
    confirmed: 1,
    first_seen: "2025-12-01",
  },
  {
    pattern_id: "permit2_approval_drain",
    name: "Permit2/increaseAllowance Approval Drain",
    description:
      "Malicious signatures granting long-term token access without further approval. Single incidents up to $3.02M. Targets permit/increaseAllowance calls to unverified contracts",
    instruction_sequence: JSON.stringify([
      "permit2_sign",
      "increaseAllowance",
      "transferFrom",
    ]),
    severity: "critical",
    source: "immunefi_access_control",
    confirmed: 1,
    first_seen: "2025-06-01",
  },
  {
    pattern_id: "deepfake_founder_impersonation",
    name: "AI Deepfake Founder Impersonation",
    description:
      "148% surge in AI-generated voice/video impersonation of project founders and exchange executives. Triggers urgent fund-transfer requests via video/voice",
    instruction_sequence: JSON.stringify([
      "social_engineer",
      "deepfake_verify",
      "transfer",
    ]),
    severity: "high",
    source: "chainalysis_2026_scams",
    confirmed: 1,
    first_seen: "2025-08-01",
  },
  {
    pattern_id: "autonomous_exploit_agent",
    name: "Autonomous AI Exploit Agent",
    description:
      "Frontier LLMs exploiting 55-65% of known smart contract bugs autonomously at ~$0.50/attempt. 10:1 offense-defense cost asymmetry. Rapid sequential probing from single addresses",
    instruction_sequence: JSON.stringify([
      "enumerate_entry_points",
      "exploit_attempt",
      "drain",
    ]),
    severity: "critical",
    source: "academic_research_2026",
    confirmed: 1,
    first_seen: "2026-01-01",
  },
  {
    pattern_id: "physical_phishing_hardware",
    name: "Physical Phishing — Hardware Wallet Letters",
    description:
      "Official-looking Ledger/Trezor letters with QR codes linking to phishing sites requesting seed phrases. Social engineering via postal mail",
    instruction_sequence: JSON.stringify([
      "physical_letter",
      "qr_phishing",
      "seed_capture",
    ]),
    severity: "medium",
    source: "slowmist_2025_report",
    confirmed: 1,
    first_seen: "2025-04-01",
  },
];

function seedDrainPatterns(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO drain_patterns
    (pattern_id, name, description, instruction_sequence, severity, source, confirmed, first_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const p of SEED_PATTERNS) {
      insert.run(
        p.pattern_id,
        p.name,
        p.description,
        p.instruction_sequence,
        p.severity,
        p.source,
        p.confirmed,
        p.first_seen,
      );
    }
  });

  tx();
  return SEED_PATTERNS.length;
}

module.exports = { seedDrainPatterns, SEED_PATTERNS };
