#!/usr/bin/env node
/**
 * Bankr Partner Deploy API — Test Suite
 * Run: node modules/bankr-deploy/test-bankr-deploy.js
 * With key: BANKR_PARTNER_KEY=bk_xxx node modules/bankr-deploy/test-bankr-deploy.js
 */
const { deployToken, simulateDeploy, deployForProspect, feeRecipientFromTwitter, feeRecipientFromWallet, feeRecipientFromENS, DeployTracker, BankrError, DEFAULT_FEE_RECIPIENT } = require('./bankr-deploy.js');

const KEY = process.env.BANKR_PARTNER_KEY || '';
let passed = 0, failed = 0;

function pass(m) { passed++; console.log('\x1b[32m  ✅ ' + m + '\x1b[0m'); }
function fail(m) { failed++; console.log('\x1b[31m  ❌ ' + m + '\x1b[0m'); }

async function run() {
  console.log('\n🐝 Bankr Partner Deploy — Tests\n');

  // T1: Missing key
  try { await deployToken({ partnerKey: '', tokenName: 'Test', feeRecipient: DEFAULT_FEE_RECIPIENT }); fail('T1'); }
  catch (e) { e.code === 'INVALID_KEY' ? pass('Rejects empty key') : fail('T1 wrong: ' + e.code); }

  // T2: Missing name
  try { await deployToken({ partnerKey: 'bk_test', tokenName: '', feeRecipient: DEFAULT_FEE_RECIPIENT }); fail('T2'); }
  catch (e) { e.code === 'VALIDATION' ? pass('Rejects empty name') : fail('T2 wrong: ' + e.code); }

  // T3: Missing feeRecipient
  try { await deployToken({ partnerKey: 'bk_test', tokenName: 'Test' }); fail('T3'); }
  catch (e) { e.code === 'VALIDATION' ? pass('Rejects missing feeRecipient') : fail('T3 wrong: ' + e.code); }

  // T4: Invalid feeRecipient type
  try { await deployToken({ partnerKey: 'bk_test', tokenName: 'Test', feeRecipient: { type: 'bad', value: 'x' } }); fail('T4'); }
  catch (e) { e.code === 'VALIDATION' ? pass('Rejects invalid type') : fail('T4 wrong: ' + e.code); }

  // T5: Fee helpers
  try {
    const tw = feeRecipientFromTwitter('@0xDeployer');
    const w = feeRecipientFromWallet('0x4b362B7db6904A72180A37307191fdDc4eD282Ab');
    const ens = feeRecipientFromENS('vitalik.eth');
    (tw.type === 'x' && tw.value === '0xDeployer' && w.type === 'wallet' && ens.type === 'ens') ? pass('Fee helpers work') : fail('T5 format');
  } catch (e) { fail('T5: ' + e.message); }

  // T6: Invalid wallet
  try { feeRecipientFromWallet('bad'); fail('T6'); }
  catch (e) { e.code === 'VALIDATION' ? pass('Rejects bad wallet') : fail('T6 wrong: ' + e.code); }

  // T7: Tracker
  try {
    const t = new DeployTracker();
    t.record({ tokenAddress: '0x1', activityId: 't1', chain: 'base', txHash: '0xh', _pipeline: { prospectName: 'A', buzzScore: 85, deployType: 'LIVE' } });
    t.record({ tokenAddress: '0x2', _pipeline: { prospectName: 'B', buzzScore: 72, deployType: 'SIMULATION' } });
    const s = t.getStats();
    (s.totalDeploys === 2 && s.liveDeploys === 1 && s.simulations === 1) ? pass('Tracker works') : fail('T7 stats');
  } catch (e) { fail('T7: ' + e.message); }

  // T8: Score threshold
  try { await deployForProspect({ name: 'Low', buzzScore: 45 }, DEFAULT_FEE_RECIPIENT, 'bk_test'); fail('T8'); }
  catch (e) { e.code === 'SCORE_TOO_LOW' ? pass('Rejects low score') : fail('T8 wrong: ' + e.code); }

  // T9: API simulation (needs key)
  if (KEY) {
    try {
      const r = await simulateDeploy({ partnerKey: KEY, tokenName: 'BuzzTest', tokenSymbol: 'BTEST', feeRecipient: DEFAULT_FEE_RECIPIENT });
      r.success ? pass('API simulate OK: ' + r.tokenAddress) : fail('T9 response');
    } catch (e) { console.log('  ⚠️  T9: ' + e.code + ' — ' + e.message); }
  } else { console.log('  ⚠️  T9-11 skipped (no BANKR_PARTNER_KEY)'); }

  console.log('\n─── Results: ' + passed + ' passed, ' + failed + ' failed ───\n');
  if (!KEY) console.log('Next: BANKR_PARTNER_KEY=bk_xxx node modules/bankr-deploy/test-bankr-deploy.js\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
