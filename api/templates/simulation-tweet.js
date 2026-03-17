/**
 * Simulation Tweet Template — Buzz BD Agent
 * Generates tweet-ready text from MiroFish simulation results
 */

function simulationTweet(simResult) {
  const { ticker, simulation, ev_calculation } = simResult;
  const c = simulation.clusters;

  const recEmoji = simulation.recommendation === 'LIST' ? '✅'
    : simulation.recommendation === 'MONITOR' ? '⏳' : '❌';

  return [
    `🐝 BUZZ LISTING SIMULATION — ${ticker}`,
    '',
    '20 agents | 4 clusters | EV analysis',
    '',
    'Cluster Consensus:',
    `🎰 Degens: ${c.degen?.consensus || 'N/A'} (${c.degen?.bullish || 0}/5)`,
    `🐋 Whales: ${c.whale?.consensus || 'N/A'} (${c.whale?.bullish || 0}/5)`,
    `🏦 Institutions: ${c.institutional?.consensus || 'N/A'} (${c.institutional?.bullish || 0}/5)`,
    `👥 Community: ${c.community?.consensus || 'N/A'} (${c.community?.bullish || 0}/5)`,
    '',
    `Probability: ${Math.round((simulation.probability || 0) * 100)}% favorable`,
    `EV = ${ev_calculation}`,
    '',
    `Recommendation: ${simulation.recommendation} ${recEmoji}`,
    '',
    'Powered by MiroFish Stage 1 | Buzz BD Agent',
    '@SolCex_Exchange #BuzzBDAgent #MiroFish #CryptoAgents'
  ].join('\n');
}

module.exports = { simulationTweet };
