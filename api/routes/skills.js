const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { createSkill, patchSkill, listSkills } = require('../services/tools/skill-create');

const STATIC_SKILLS_DIR = '/data/workspace/skills';
const LEARNED_SKILLS_DIR = '/data/workspace/skills/learned';
const SKILL_PATCHES_LOG = '/data/workspace/memory/skill-patches.json';

router.get('/', (req, res) => {
  try {
    let staticCount = 0;
    if (fs.existsSync(STATIC_SKILLS_DIR)) {
      staticCount = fs.readdirSync(STATIC_SKILLS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'learned').length;
    }
    const learned = listSkills();
    res.json({ success: true, total: staticCount + learned.length, static_count: staticCount, learned_count: learned.length, learned_skills: learned });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/:name', (req, res) => {
  try {
    const name = req.params.name;
    const learnedPath = path.join(LEARNED_SKILLS_DIR, name, 'SKILL.md');
    const staticPath = path.join(STATIC_SKILLS_DIR, name, 'SKILL.md');
    let skillPath = null, type = null;
    if (fs.existsSync(learnedPath)) { skillPath = learnedPath; type = 'learned'; }
    else if (fs.existsSync(staticPath)) { skillPath = staticPath; type = 'static'; }
    if (!skillPath) return res.status(404).json({ success: false, error: `Skill "${name}" not found` });
    const content = fs.readFileSync(skillPath, 'utf8');
    res.json({ success: true, name, type, content });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/', (req, res) => {
  try {
    const { name, description, content, category, session } = req.body;
    const result = createSkill({ name, description, content, category, session });
    if (result.success) res.status(201).json(result);
    else res.status(400).json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/:name', (req, res) => {
  try {
    const { oldString, newString, reason } = req.body;
    const result = patchSkill({ name: req.params.name, oldString, newString, reason });
    if (result.success) res.json(result);
    else res.status(400).json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/:name/history', (req, res) => {
  try {
    const name = req.params.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!fs.existsSync(SKILL_PATCHES_LOG)) return res.json({ success: true, name, history: [] });
    const log = JSON.parse(fs.readFileSync(SKILL_PATCHES_LOG, 'utf8'));
    const history = log.filter(entry => entry.skill === name);
    res.json({ success: true, name, history });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
