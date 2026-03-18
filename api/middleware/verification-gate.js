/**
 * Verification Gate Middleware — Day 32B
 *
 * Blocks any endpoint from surfacing unverified token data.
 * Use: app.use('/api/v1/simulate', verificationGate, simulateRoutes)
 */

const { isVerified, isQuarantined, verifyToken, VERIFICATION_STATUS } = require('../lib/data-verifier');

function requireVerified(req, res, next) {
  const contractAddress = req.body?.token_address || req.body?.contract_address ||
                          req.params?.contractAddress || req.params?.address ||
                          req.query?.address || req.query?.contract;
  const chain = req.body?.chain || req.query?.chain || 'solana';

  if (!contractAddress) return next(); // No token context — pass through

  // Check quarantine first
  const q = isQuarantined(contractAddress, chain);
  if (q.quarantined) {
    return res.status(422).json({
      error: 'TOKEN_QUARANTINED',
      code: 'QUARANTINED',
      reason: q.reason,
      message: `Token ${contractAddress} is quarantined. Reason: ${q.reason}. ` +
               `Resolve via POST /api/v1/verify/resolve/${contractAddress}`
    });
  }

  // Check verified snapshot
  const v = isVerified(contractAddress, chain);
  if (!v.verified) {
    return res.status(422).json({
      error: 'TOKEN_NOT_VERIFIED',
      code: 'NOT_VERIFIED',
      message: `Token must pass triple verification before use. ` +
               `Run GET /api/v1/verify/${contractAddress}?chain=${chain} first.`
    });
  }

  // Attach verified snapshot to request
  req.verifiedSnapshot = v.snapshot;
  next();
}

// Async version that auto-verifies if not yet checked
async function requireVerifiedAutoCheck(req, res, next) {
  const contractAddress = req.body?.token_address || req.body?.contract_address ||
                          req.params?.contractAddress || req.params?.address ||
                          req.query?.address || req.query?.contract;
  const chain = req.body?.chain || req.query?.chain || 'solana';

  if (!contractAddress) return next();

  const q = isQuarantined(contractAddress, chain);
  if (q.quarantined) {
    return res.status(422).json({
      error: 'TOKEN_QUARANTINED', code: 'QUARANTINED', reason: q.reason,
      message: `Token ${contractAddress} is quarantined: ${q.reason}`
    });
  }

  const v = isVerified(contractAddress, chain);
  if (v.verified) {
    req.verifiedSnapshot = v.snapshot;
    return next();
  }

  // Auto-run verification
  try {
    const result = await verifyToken(contractAddress, chain);
    if (result.overall === VERIFICATION_STATUS.VERIFIED) {
      req.verifiedSnapshot = result.evidence;
      return next();
    }
    return res.status(422).json({
      error: 'TOKEN_NOT_VERIFIED', code: result.overall,
      mismatches: result.mismatches,
      message: `Triple verification failed: ${result.mismatches.join('; ')}`
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, code: 'VERIFICATION_ERROR' });
  }
}

module.exports = { requireVerified, requireVerifiedAutoCheck };
