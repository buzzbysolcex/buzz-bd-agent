/**
 * @buzzbd/scorer — Buzz Token Scoring Engine
 *
 * 11-rule crypto token scorer. Zero LLM cost.
 * Built by a chef. Kitchen runs itself.
 *
 * Usage:
 *   const { scoreToken, calculateScore, RULES } = require('@buzzbd/scorer');
 *   const result = await scoreToken('PEPE');
 *   console.log(result.score, result.classification);
 */

const { scoreToken, fetchLeaderboard, calculateScore, RULES } = require('./lib/scorer');

module.exports = { scoreToken, fetchLeaderboard, calculateScore, RULES };
