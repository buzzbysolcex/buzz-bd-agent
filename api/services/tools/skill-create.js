const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LEARNED_SKILLS_DIR = '/data/workspace/skills/learned';
const SKILL_PATCHES_LOG = '/data/workspace/memory/skill-patches.json';

function createSkill({ name, description, content, category = 'general', session = 'unknown' }) {
  if (!name || !description || !content) {
    return { success: false, error: 'name, description, and content are required' };
  }
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const skillDir = path.join(LEARNED_SKILLS_DIR, safeName);
  const skillPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillPath)) {
    return { success: false, error: `Skill "${safeName}" already exists. Use patchSkill to update.` };
  }
  fs.mkdirSync(skillDir, { recursive: true });
  const now = new Date().toISOString();
  const skillContent = `---\nname: ${safeName}\ndescription: "${description}"\nversion: 1.0.0\ncategory: ${category}\ncreated: ${now}\ncreated_by: buzz-learning-loop\nsession: ${session}\nauto_learned: true\n---\n\n# ${name}\n\n> Auto-learned by Buzz BD Agent on ${now.split('T')[0]}\n> Category: ${category} | Session: ${session}\n\n${content}\n\n---\n*Learned skill — Buzz Closed Learning Loop | Alpha Phase 0*\n`;
  fs.writeFileSync(skillPath, skillContent, 'utf8');
  const receiptId = `BZZ-${now.split('T')[0].replace(/-/g, '')}-SKILL-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const patchLog = loadPatchLog();
  patchLog.push({ action: 'create', skill: safeName, version: '1.0.0', category, session, timestamp: now, receipt: receiptId });
  savePatchLog(patchLog);
  return { success: true, path: skillPath, name: safeName, version: '1.0.0', jvr_receipt: receiptId };
}

function patchSkill({ name, oldString, newString, reason = 'improvement' }) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const skillPath = path.join(LEARNED_SKILLS_DIR, safeName, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return { success: false, error: `Skill "${safeName}" not found` };
  let content = fs.readFileSync(skillPath, 'utf8');
  if (!content.includes(oldString)) return { success: false, error: 'oldString not found in skill content' };
  content = content.replace(oldString, newString);
  const versionMatch = content.match(/version:\s*(\d+)\.(\d+)\.(\d+)/);
  if (versionMatch) {
    const [, major, minor, patch] = versionMatch;
    const newVersion = `${major}.${minor}.${parseInt(patch) + 1}`;
    content = content.replace(/version:\s*\d+\.\d+\.\d+/, `version: ${newVersion}`);
    fs.writeFileSync(skillPath, content, 'utf8');
    const now = new Date().toISOString();
    const receiptId = `BZZ-${now.split('T')[0].replace(/-/g, '')}-PATCH-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const patchLog = loadPatchLog();
    patchLog.push({ action: 'patch', skill: safeName, version: newVersion, reason, timestamp: now, receipt: receiptId });
    savePatchLog(patchLog);
    return { success: true, version: newVersion, jvr_receipt: receiptId };
  }
  return { success: false, error: 'Could not parse version in skill' };
}

function listSkills() {
  if (!fs.existsSync(LEARNED_SKILLS_DIR)) return [];
  const skills = [];
  const dirs = fs.readdirSync(LEARNED_SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const dir of dirs) {
    const skillPath = path.join(LEARNED_SKILLS_DIR, dir.name, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf8');
      const version = content.match(/version:\s*([\d.]+)/)?.[1] || 'unknown';
      const category = content.match(/category:\s*(\w+)/)?.[1] || 'general';
      const created = content.match(/created:\s*(.+)/)?.[1] || 'unknown';
      skills.push({ name: dir.name, version, category, created });
    }
  }
  return skills;
}

function loadPatchLog() {
  try {
    const dir = path.dirname(SKILL_PATCHES_LOG);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(SKILL_PATCHES_LOG)) return JSON.parse(fs.readFileSync(SKILL_PATCHES_LOG, 'utf8'));
  } catch (e) {}
  return [];
}

function savePatchLog(log) {
  const dir = path.dirname(SKILL_PATCHES_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SKILL_PATCHES_LOG, JSON.stringify(log, null, 2), 'utf8');
}

module.exports = { createSkill, patchSkill, listSkills };
