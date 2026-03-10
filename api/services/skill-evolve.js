/**
 * Buzz BD Agent — Skill Effectiveness Tracker
 * v7.3.1 | Learning Loop — Hermes-inspired
 *
 * Tracks +1/-1 outcomes per skill.
 * Score > +5 = "proven", < -3 = "needs-review"
 * Stored at /data/workspace/memory/skill-effectiveness.json
 */

const fs = require('fs');
const path = require('path');

const EFFECTIVENESS_FILE = '/data/workspace/memory/skill-effectiveness.json';

/**
 * Record a positive (+1) or negative (-1) outcome for a skill
 * @param {string} skillName
 * @param {number} delta - +1 or -1
 * @param {string} [reason] - why the outcome was positive/negative
 * @returns {object} updated skill score
 */
function recordOutcome(skillName, delta, reason = '') {
  if (!skillName) return { success: false, error: 'skillName is required' };
  if (delta !== 1 && delta !== -1) return { success: false, error: 'delta must be +1 or -1' };

  const data = loadEffectiveness();
  const safeName = skillName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  if (!data.skills[safeName]) {
    data.skills[safeName] = { score: 0, positives: 0, negatives: 0, status: 'neutral', history: [] };
  }

  const skill = data.skills[safeName];
  skill.score += delta;
  if (delta > 0) skill.positives++;
  else skill.negatives++;

  // Update status
  if (skill.score > 5) skill.status = 'proven';
  else if (skill.score < -3) skill.status = 'needs-review';
  else skill.status = 'neutral';

  // Append to history (keep last 50)
  skill.history.push({
    delta,
    reason,
    timestamp: new Date().toISOString(),
    score_after: skill.score
  });
  if (skill.history.length > 50) skill.history = skill.history.slice(-50);

  data.updated_at = new Date().toISOString();
  saveEffectiveness(data);

  return {
    success: true,
    skill: safeName,
    score: skill.score,
    status: skill.status,
    positives: skill.positives,
    negatives: skill.negatives
  };
}

/**
 * Get effectiveness data for all skills or a specific skill
 * @param {string} [skillName] - optional specific skill
 * @returns {object}
 */
function getEffectiveness(skillName) {
  const data = loadEffectiveness();

  if (skillName) {
    const safeName = skillName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const skill = data.skills[safeName];
    if (!skill) return { success: true, skill: safeName, score: 0, status: 'untracked' };
    return { success: true, skill: safeName, ...skill };
  }

  // Summary of all skills
  const skills = Object.entries(data.skills).map(([name, s]) => ({
    name, score: s.score, status: s.status, positives: s.positives, negatives: s.negatives
  }));

  const proven = skills.filter(s => s.status === 'proven').length;
  const needsReview = skills.filter(s => s.status === 'needs-review').length;

  return {
    success: true,
    total_tracked: skills.length,
    proven,
    needs_review: needsReview,
    neutral: skills.length - proven - needsReview,
    skills,
    updated_at: data.updated_at
  };
}

function loadEffectiveness() {
  try {
    if (fs.existsSync(EFFECTIVENESS_FILE)) {
      return JSON.parse(fs.readFileSync(EFFECTIVENESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { skills: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

function saveEffectiveness(data) {
  const dir = path.dirname(EFFECTIVENESS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EFFECTIVENESS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { recordOutcome, getEffectiveness };
