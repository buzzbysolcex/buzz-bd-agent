/**
 * x402 Payment Paywall Middleware
 * Returns HTTP 402 with x402-compatible payment headers for unpaid requests.
 * Admin key holders and localhost bypass the paywall.
 *
 * Usage:
 *   const { x402Paywall } = require('./middleware/x402-paywall');
 *   app.use('/api/v1/premium/pipeline', x402Paywall({ price: '10000', resource: '/api/v1/premium/pipeline', description: '...' }), handler);
 *
 * Buzz BD Agent | x402 Micropayments | USDC on Base
 */

const BUZZ_WALLET = process.env.ACP_OWNER_ADDRESS || process.env.BANKR_FEE_WALLET || '0x2Dc03124091104E7798C0273D96FC5ED65F05aA9';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base mainnet
const ADMIN_KEY = process.env.BUZZ_API_ADMIN_KEY;
const BASE_URL = process.env.BUZZ_PUBLIC_URL || 'http://204.168.137.253:3000';

/**
 * Create x402 paywall middleware for a specific endpoint
 * @param {Object} options
 * @param {string} options.price - Amount in USDC smallest units (6 decimals). "10000" = $0.01
 * @param {string} options.resource - The endpoint path (e.g., "/api/v1/pipeline")
 * @param {string} options.description - Human-readable description
 */
function x402Paywall(options = {}) {
  const {
    price = '10000', // $0.01 default
    resource = '/api/v1/data',
    description = 'Buzz BD Agent Intelligence Data',
  } = options;

  return (req, res, next) => {
    // Bypass 1: Admin key (internal access)
    const apiKey = req.headers['x-api-key'] || extractBearer(req.headers.authorization);
    if (ADMIN_KEY && apiKey === ADMIN_KEY) return next();

    // Bypass 2: Localhost (OpenClaw, Sentinel, crons)
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') return next();

    // Bypass 3: Valid x402 payment proof
    const paymentHeader = req.headers['x-402-payment'] || req.headers['x-payment'];
    if (paymentHeader) {
      // For now, accept any non-empty payment proof
      // TODO: Verify payment proof via Coinbase CDP facilitator
      // https://api.cdp.coinbase.com/platform/v2/x402/facilitator
      console.log(`[x402] Payment received for ${resource}: ${paymentHeader.substring(0, 30)}...`);
      return next();
    }

    // No payment — return 402 with payment requirements
    const paymentRequired = {
      accepts: [{
        scheme: 'exact',
        network: 'base',
        maxAmountRequired: price,
        resource: `${BASE_URL}${resource}`,
        description,
        mimeType: 'application/json',
        payTo: BUZZ_WALLET,
        maxTimeoutSeconds: 60,
        asset: USDC_BASE,
        extra: {
          provider: 'SolCex Exchange',
          agent: 'Buzz BD Agent',
          version: '7.7.0',
        },
      }],
    };

    const encoded = Buffer.from(JSON.stringify(paymentRequired)).toString('base64');

    res.status(402)
      .set('X-Payment-Required', encoded)
      .set('Access-Control-Expose-Headers', 'X-Payment-Required')
      .json({
        error: 'payment_required',
        message: `This endpoint requires x402 micropayment. Price: $${(parseInt(price) / 1000000).toFixed(4)} USDC on Base.`,
        payment_info: paymentRequired,
        docs: 'https://x402.org',
      });
  };
}

function extractBearer(header) {
  if (!header) return null;
  const parts = header.split(' ');
  return parts[0] === 'Bearer' && parts[1] ? parts[1] : null;
}

module.exports = { x402Paywall };
