/**
 * Safety Sub-Agent — L2 Filter
 * Sources: RugCheck, DFlow MCP
 * Weight: 0.30 (highest priority alongside wallet)
 * Model: bankr/gpt-5-nano (OpenClaw) | Direct API (REST API)
 * 
 * Checks: honeypot, liquidity lock, mint authority, ownership, 
 * suspicious holders, scam signatures
 * 
 * Instant Kill conditions → score = 0
 */

const RUGCHECK_BASE = 'https://api.rugcheck.xyz/v1';

// Instant kill flags — any of these = score 0
const INSTANT_KILLS = [
  'mint_not_revoked',
  'lp_unprotected',
  'mixer_funded',
  'honeypot_detected',
  'blacklist_function'
];

async function runSafetyAgent({ address, chain, requestId }) {
  const start = Date.now();
  console.log(`[${requestId}] 🛡️ safety-agent: Starting for ${address} on ${chain}`);

  const factors = [];
  let rawScore = 100; // Start at 100, deduct for risks

  try {
    // ─── RugCheck API ───
    let rugcheckData = null;
    try {
      const rugUrl = `${RUGCHECK_BASE}/tokens/${address}/report/summary`;
      const rugRes = await fetch(rugUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });

      if (rugRes.ok) {
        rugcheckData = await rugRes.json();
      } else {
        factors.push({ name: 'rugcheck_unavailable', impact: -5, detail: `HTTP ${rugRes.status}` });
        rawScore -= 5;
      }
    } catch (rugErr) {
      factors.push({ name: 'rugcheck_error', impact: -5, detail: rugErr.message });
      rawScore -= 5;
    }

    if (rugcheckData) {
      // Process RugCheck risks
      const risks = rugcheckData.risks || [];
      const riskLevel = String(rugcheckData.score_normalised || rugcheckData.score || 0);

      // Check for instant kills
      for (const risk of risks) {
        const riskName = (risk.name || '').toLowerCase().replace(/\s+/g, '_');
        
        if (INSTANT_KILLS.some(kill => riskName.includes(kill))) {
          factors.push({
            name: riskName,
            impact: -100,
            detail: `INSTANT KILL: ${risk.description || risk.name}`,
            severity: 'critical'
          });
          return {
            status: 'completed',
            score: 0,
            duration_ms: Date.now() - start,
            data: {
              verdict: 'UNSAFE',
              instant_kill: true,
              kill_reason: risk.name,
              rugcheck_score: rugcheckData.score,
              risks: risks,
              factors: factors
            }
          };
        }
      }

      // Score deductions by risk level
      for (const risk of risks) {
        const level = (risk.level || '').toLowerCase();
        let deduction = 0;

        switch (level) {
          case 'critical': deduction = 30; break;
          case 'high':     deduction = 20; break;
          case 'medium':   deduction = 10; break;
          case 'low':      deduction = 5;  break;
          case 'info':     deduction = 0;  break;
          default:         deduction = 5;
        }

        if (deduction > 0) {
          rawScore -= deduction;
          factors.push({
            name: risk.name || 'unknown_risk',
            impact: -deduction,
            detail: risk.description || risk.name,
            severity: level
          });
        }
      }

      // Bonus: RugCheck overall score
      if (riskLevel === 'good' || riskLevel === 'safe') {
        factors.push({ name: 'rugcheck_safe', impact: 5, detail: 'RugCheck overall: safe' });
        rawScore = Math.min(rawScore + 5, 100);
      }

      // Token age check
      if (rugcheckData.tokenMeta?.createdOn) {
        const ageMs = Date.now() - new Date(rugcheckData.tokenMeta.createdOn).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        
        if (ageDays < 1) {
          factors.push({ name: 'very_new_token', impact: -15, detail: `Created ${Math.round(ageDays * 24)}h ago` });
          rawScore -= 15;
        } else if (ageDays < 7) {
          factors.push({ name: 'new_token', impact: -5, detail: `Created ${Math.round(ageDays)}d ago` });
          rawScore -= 5;
        } else if (ageDays > 30) {
          factors.push({ name: 'established_token', impact: 5, detail: `${Math.round(ageDays)}d old` });
          rawScore = Math.min(rawScore + 5, 100);
        }
      }

      // Mint authority check
      if (rugcheckData.tokenMeta?.mintAuthority) {
        factors.push({ name: 'mint_active', impact: -20, detail: 'Mint authority not revoked' });
        rawScore -= 20;
      } else {
        factors.push({ name: 'mint_revoked', impact: 5, detail: 'Mint authority revoked ✓' });
        rawScore = Math.min(rawScore + 5, 100);
      }

      // Freeze authority check
      if (rugcheckData.tokenMeta?.freezeAuthority) {
        factors.push({ name: 'freeze_active', impact: -15, detail: 'Freeze authority active — can freeze holder wallets' });
        rawScore -= 15;
      }

      // Top holder concentration
      const topHolders = rugcheckData.topHolders || [];
      if (topHolders.length > 0) {
        const topHolderPct = topHolders[0]?.pct || 0;
        if (topHolderPct > 50) {
          factors.push({ name: 'whale_concentration', impact: -25, detail: `Top holder: ${topHolderPct.toFixed(1)}%` });
          rawScore -= 25;
        } else if (topHolderPct > 20) {
          factors.push({ name: 'high_concentration', impact: -10, detail: `Top holder: ${topHolderPct.toFixed(1)}%` });
          rawScore -= 10;
        }
      }
    }

    // ─── DFlow check (if available) ───
    // DFlow MCP provides additional order flow analysis
    // TODO: Wire DFlow MCP when available in REST context
    // For now, skip with info note
    factors.push({ name: 'dflow_pending', impact: 0, detail: 'DFlow MCP integration pending for REST API' });

    // Clamp score
    const finalScore = Math.max(0, Math.min(100, rawScore));
    const verdict = finalScore >= 70 ? 'SAFE' : finalScore >= 40 ? 'CAUTION' : 'UNSAFE';

    return {
      status: 'completed',
      score: finalScore,
      duration_ms: Date.now() - start,
      data: {
        verdict: verdict,
        instant_kill: false,
        rugcheck_available: !!rugcheckData,
        rugcheck_score: rugcheckData?.score || null,
        risk_count: rugcheckData?.risks?.length || 0,
        factors: factors,
        factor_count: factors.length
      }
    };

  } catch (err) {
    console.error(`[${requestId}] ❌ safety-agent failed:`, err.message);
    return {
      status: 'error',
      score: 0,
      duration_ms: Date.now() - start,
      data: { error: err.message, factors }
    };
  }
}

module.exports = { runSafetyAgent };
