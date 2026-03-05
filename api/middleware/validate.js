/**
 * Validation Middleware for /score-token
 * Validates contract address format and chain parameter
 */

function validateScoreRequest(req, res, next) {
  const { address, chain } = req.body;

  // Address is required
  if (!address || typeof address !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid "address" field',
      hint: 'Provide a valid contract address string'
    });
  }

  // Trim and validate address format
  const trimmedAddress = address.trim();

  // Solana addresses: base58, 32-44 chars
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  // EVM addresses: 0x + 40 hex chars
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;

  const chainLower = (chain || 'solana').toLowerCase();

  if (['solana', 'sol'].includes(chainLower)) {
    if (!solanaRegex.test(trimmedAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Solana address format',
        hint: 'Solana addresses are 32-44 base58 characters'
      });
    }
  } else if (['ethereum', 'eth', 'base', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'].includes(chainLower)) {
    if (!evmRegex.test(trimmedAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid EVM address format',
        hint: 'EVM addresses start with 0x followed by 40 hex characters'
      });
    }
  }

  // Validate depth parameter
  const depth = req.body.depth || 'standard';
  if (!['standard', 'deep'].includes(depth)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid "depth" parameter',
      hint: 'Use "standard" (default) or "deep" (includes L5 Nansen Smart Money)'
    });
  }

  // Normalize
  req.body.address = trimmedAddress;
  req.body.chain = chainLower;
  req.body.depth = depth;

  next();
}

module.exports = { validateScoreRequest };
