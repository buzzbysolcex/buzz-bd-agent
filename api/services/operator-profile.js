/**
 * Buzz BD Agent — Operator Profile
 * v7.3.1 | Learning Loop — Hermes-inspired
 *
 * Tracks operator (Ogie) preferences, approval patterns,
 * active hours, and prayer times.
 * Stored at /data/workspace/memory/operator-profile.json
 */

const fs = require('fs');
const path = require('path');

const PROFILE_FILE = '/data/workspace/memory/operator-profile.json';

const DEFAULT_PROFILE = {
  name: 'Ogie',
  timezone: 'Asia/Jakarta',  // WIB (UTC+7)
  active_hours: { start: 9, end: 23 },  // 09:00-23:00 WIB
  prayer_times: {
    fajr: '04:30',
    dhuhr: '11:45',
    asr: '15:00',
    maghrib: '17:45',
    isha: '19:00'
  },
  preferences: {
    approval_mode: 'manual',          // manual | auto-qualified | auto-all
    min_score_for_outreach: 70,       // QUALIFIED threshold
    preferred_chains: ['solana', 'base', 'bsc'],
    notification_channel: 'telegram',
    quiet_during_prayer: true,
    max_outreach_per_day: 10
  },
  approval_patterns: {
    total_approved: 0,
    total_rejected: 0,
    avg_response_time_mins: null,
    common_reject_reasons: [],
    last_approval: null,
    last_rejection: null
  },
  created_at: null,
  updated_at: null
};

/**
 * Get operator profile (creates default if not exists)
 * @returns {object}
 */
function getProfile() {
  const profile = loadProfile();
  return { success: true, profile };
}

/**
 * Update operator profile with partial patch
 * @param {object} patch - fields to update (deep merge)
 * @returns {object}
 */
function updateProfile(patch) {
  if (!patch || typeof patch !== 'object') {
    return { success: false, error: 'patch must be an object' };
  }

  const profile = loadProfile();
  deepMerge(profile, patch);
  profile.updated_at = new Date().toISOString();
  saveProfile(profile);

  return { success: true, profile };
}

/**
 * Record an approval/rejection for pattern tracking
 * @param {string} action - 'approved' or 'rejected'
 * @param {string} [reason] - rejection reason
 * @param {number} [responseTimeMins] - time to respond
 */
function recordApproval(action, reason, responseTimeMins) {
  const profile = loadProfile();
  const patterns = profile.approval_patterns;

  if (action === 'approved') {
    patterns.total_approved++;
    patterns.last_approval = new Date().toISOString();
  } else if (action === 'rejected') {
    patterns.total_rejected++;
    patterns.last_rejection = new Date().toISOString();
    if (reason) {
      if (!patterns.common_reject_reasons.includes(reason)) {
        patterns.common_reject_reasons.push(reason);
        if (patterns.common_reject_reasons.length > 10) {
          patterns.common_reject_reasons = patterns.common_reject_reasons.slice(-10);
        }
      }
    }
  }

  if (responseTimeMins != null) {
    const total = patterns.total_approved + patterns.total_rejected;
    const prevAvg = patterns.avg_response_time_mins || responseTimeMins;
    patterns.avg_response_time_mins = Math.round(((prevAvg * (total - 1) + responseTimeMins) / total) * 10) / 10;
  }

  profile.updated_at = new Date().toISOString();
  saveProfile(profile);

  return { success: true, action, patterns };
}

/**
 * Check if current time is within operator active hours
 * @returns {boolean}
 */
function isActiveHour() {
  const profile = loadProfile();
  const now = new Date();
  // Convert to WIB (UTC+7)
  const wibHour = (now.getUTCHours() + 7) % 24;
  return wibHour >= profile.active_hours.start && wibHour < profile.active_hours.end;
}

function loadProfile() {
  try {
    if (fs.existsSync(PROFILE_FILE)) {
      return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));
    }
  } catch (e) {}
  // Create default profile
  const profile = { ...DEFAULT_PROFILE, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  saveProfile(profile);
  return profile;
}

function saveProfile(profile) {
  const dir = path.dirname(PROFILE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2), 'utf8');
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

module.exports = { getProfile, updateProfile, recordApproval, isActiveHour };
