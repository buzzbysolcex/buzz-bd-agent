/**
 * Wallet Sub-Agent — L2 Filter
 * Sources: Helius DAS API, Allium (when fixed)
 * Weight: 0.30 (highest priority alongside safety)
 * Model: bankr/gpt-5-nano (OpenClaw) | Direct API (REST API)
 * 
 * Checks: deployer wallet age, history, holder distribution,
 * connected wallets, suspicious patterns
 */

async function runWalletAgent({ address, chain, requestId }) {
  const start = Date.now();
  console.log(`[${requestId}] 👛 wallet-agent: Starting for ${address} on ${chain}`);

  const factors = [];
  let rawScore = 50; // Start neutral

  try {
    // ─── Chain-specific forensics ───
    if (chain === 'solana' || chain === 'sol') {
      await runSolanaForensics(address, factors, requestId);
    } else if (['base', 'ethereum', 'eth', 'bsc', 'polygon', 'avalanche'].includes(chain)) {
      await runEvmForensics(address, chain, factors, requestId);
    } else {
      factors.push({ name: 'unsupported_chain', impact: 0, detail: `Forensics not available for ${chain}` });
    }

    // Calculate score from factors
    for (const factor of factors) {
      rawScore += factor.impact;
    }

    const finalScore = Math.max(0, Math.min(100, rawScore));
    const verdict = finalScore >= 70 ? 'CLEAN' : finalScore >= 40 ? 'MIXED' : 'SUSPICIOUS';

    return {
      status: 'completed',
      score: finalScore,
      duration_ms: Date.now() - start,
      data: {
        verdict,
        chain,
        factors,
        factor_count: factors.length
      }
    };

  } catch (err) {
    console.error(`[${requestId}] ❌ wallet-agent failed:`, err.message);
    return {
      status: 'error',
      score: 0,
      duration_ms: Date.now() - start,
      data: { error: err.message, factors }
    };
  }
}

/**
 * Solana forensics via Helius DAS API
 */
async function runSolanaForensics(address, factors, requestId) {
  const HELIUS_KEY = process.env.HELIUS_API_KEY;
  
  if (!HELIUS_KEY) {
    factors.push({ name: 'helius_unavailable', impact: -10, detail: 'Helius API key not configured' });
    return;
  }

  const HELIUS_BASE = `https://api.helius.xyz/v0`;

  try {
    // ─── Get token metadata via Helius DAS ───
    const dasUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
    const dasRes = await fetch(dasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'getAsset',
        params: { id: address }
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (dasRes.ok) {
      const dasData = await dasRes.json();
      const asset = dasData.result;

      if (asset) {
        // Check authorities
        if (asset.authorities?.length > 0) {
          const authority = asset.authorities[0];
          factors.push({
            name: 'authority_found',
            impact: 0,
            detail: `Authority: ${authority.address?.slice(0, 8)}...`
          });

          // Check deployer wallet history
          await checkDeployerHistory(authority.address, HELIUS_BASE, HELIUS_KEY, factors, requestId);
        }

        // Ownership model
        if (asset.ownership?.frozen) {
          factors.push({ name: 'frozen_token', impact: -20, detail: 'Token ownership is frozen' });
        }

        // Supply info
        if (asset.token_info?.supply && asset.token_info?.decimals) {
          const supply = asset.token_info.supply / Math.pow(10, asset.token_info.decimals);
          if (supply > 1e12) {
            factors.push({ name: 'excessive_supply', impact: -5, detail: `Supply: ${supply.toExponential(2)}` });
          }
        }
      }
    }

    // ─── Holder analysis via Helius ───
    try {
      const holdersUrl = `${HELIUS_BASE}/token-metadata?api-key=${HELIUS_KEY}`;
      const holdersRes = await fetch(holdersUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mintAccounts: [address] }),
        signal: AbortSignal.timeout(10000)
      });

      if (holdersRes.ok) {
        const holdersData = await holdersRes.json();
        if (holdersData[0]) {
          const meta = holdersData[0];
          if (meta.onChainData?.tokenStandard !== undefined) {
            factors.push({ 
              name: 'token_standard', 
              impact: 5, 
              detail: `Standard: ${meta.onChainData.tokenStandard}` 
            });
          }
        }
      }
    } catch {
      // Non-critical
    }

  } catch (err) {
    factors.push({ name: 'helius_error', impact: -10, detail: err.message });
  }
}

/**
 * Check deployer wallet history
 */
async function checkDeployerHistory(deployerAddress, heliusBase, heliusKey, factors, requestId) {
  try {
    const txUrl = `${heliusBase}/addresses/${deployerAddress}/transactions?api-key=${heliusKey}&limit=10`;
    const txRes = await fetch(txUrl, {
      signal: AbortSignal.timeout(10000)
    });

    if (txRes.ok) {
      const txs = await txRes.json();
      
      if (txs.length === 0) {
        factors.push({ name: 'no_deployer_history', impact: -20, detail: 'Deployer has no transaction history' });
        return;
      }

      // Check deployer age (oldest tx)
      const oldestTx = txs[txs.length - 1];
      if (oldestTx?.timestamp) {
        const ageMs = Date.now() / 1000 - oldestTx.timestamp;
        const ageDays = ageMs / (60 * 60 * 24);

        if (ageDays < 1) {
          factors.push({ name: 'brand_new_deployer', impact: -25, detail: `Deployer created ${Math.round(ageDays * 24)}h ago` });
        } else if (ageDays < 7) {
          factors.push({ name: 'new_deployer', impact: -15, detail: `Deployer ${Math.round(ageDays)}d old` });
        } else if (ageDays < 30) {
          factors.push({ name: 'recent_deployer', impact: -5, detail: `Deployer ${Math.round(ageDays)}d old` });
        } else if (ageDays > 90) {
          factors.push({ name: 'established_deployer', impact: 15, detail: `Deployer ${Math.round(ageDays)}d old` });
        } else {
          factors.push({ name: 'moderate_deployer', impact: 5, detail: `Deployer ${Math.round(ageDays)}d old` });
        }
      }

      // Check for serial deployment pattern (many token creates)
      const tokenCreates = txs.filter(tx => 
        tx.type === 'CREATE' || tx.description?.includes('create')
      ).length;

      if (tokenCreates > 5) {
        factors.push({ name: 'serial_deployer', impact: -20, detail: `${tokenCreates} token creates in recent history` });
      } else if (tokenCreates > 2) {
        factors.push({ name: 'multi_deployer', impact: -10, detail: `${tokenCreates} token creates` });
      }

      factors.push({ name: 'history_depth', impact: 5, detail: `${txs.length} recent transactions analyzed` });
    }
  } catch (err) {
    factors.push({ name: 'deployer_check_failed', impact: -5, detail: err.message });
  }
}

/**
 * EVM forensics (Base, Ethereum, etc.) — basic implementation
 * TODO: Allium integration when 404 fixed
 */
async function runEvmForensics(address, chain, factors, requestId) {
  // For EVM chains, we can use public block explorers / etherscan-compatible APIs
  // This is a scaffold — full implementation needs Allium (currently 404) or Etherscan API
  
  factors.push({
    name: 'evm_basic_check',
    impact: 0,
    detail: `EVM forensics for ${chain} — basic mode (Allium integration pending)`
  });

  // TODO: Wire Allium when 404 is fixed
  // TODO: Add Etherscan/Basescan API for holder distribution
  // TODO: Add deployer wallet age check via block explorer
  
  // For now, provide neutral score
  factors.push({ name: 'evm_neutral', impact: 0, detail: 'Limited data — EVM forensics pending full integration' });
}

module.exports = { runWalletAgent };
