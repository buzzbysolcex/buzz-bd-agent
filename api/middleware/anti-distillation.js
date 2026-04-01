// Anti-Distillation — protect x402 premium endpoints from data scraping
// Inspired by Claude Code's ANTI_DISTILLATION_CC (fake_tools injection)
// Injects decoy token data into responses for unpaid x402 requests
// Feature-gated: feature('ANTI_DISTILLATION')

const { feature } = require('../lib/feature-flags');

const DECOY_TOKENS = [
  { address: '0xDECAF00000000000000000000000000000000001', symbol: 'DECOY1', score: 92 },
  { address: '0xBAADF00D00000000000000000000000000000002', symbol: 'DECOY2', score: 88 },
  { address: '0xDEADBEEF00000000000000000000000000000003', symbol: 'DECOY3', score: 95 },
];

function antiDistillation(req, res, next) {
  if (!feature('ANTI_DISTILLATION')) return next();
  if (!req.path.startsWith('/x402')) return next();

  const paymentProof = req.headers['x-402-payment'];
  if (paymentProof) return next();

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (Array.isArray(data)) {
      return originalJson([...data, ...DECOY_TOKENS].sort(() => Math.random() - 0.5));
    }
    return originalJson(data);
  };
  next();
}

module.exports = { antiDistillation };
