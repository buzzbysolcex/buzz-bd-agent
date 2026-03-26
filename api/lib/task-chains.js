/**
 * Task Chain Executor — ClawTeam Pattern 1
 * v8.2.0 | Dependency-aware pipeline automation
 * Maps to: all pipeline agents via TOML templates
 * Zero npm dependencies — inline TOML parser
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TaskChainExecutor {
  constructor(db, activityBoard, agentInbox) {
    this.db = db;
    this.activityBoard = activityBoard;
    this.agentInbox = agentInbox;
    this.templateDir = path.join(__dirname, '../../team-templates');
  }

  startChain(templateName, tokenAddress, tokenName) {
    const template = this._loadTemplate(templateName);
    if (!template) throw new Error(`Template not found: ${templateName}`);

    const chainId = crypto.randomUUID();
    const chainName = template.team?.name || templateName;

    const tasks = template.tasks || [];
    const insertStmt = this.db.prepare(`
      INSERT INTO task_chains (chain_id, chain_name, task_name, task_order, depends_on, status, endpoint, condition, token_address, agent_name, timeout_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((tasks) => {
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const depsJson = JSON.stringify(t.depends_on || []);
        const hasDeps = (t.depends_on || []).length > 0;
        insertStmt.run(
          chainId, chainName, t.name, i + 1, depsJson,
          hasDeps ? 'blocked' : 'pending',
          t.endpoint || null, t.condition || null,
          tokenAddress || null, t.agent_name || null,
          t.timeout_seconds || 60
        );
      }
    });
    insertMany(tasks);

    if (this.activityBoard) {
      this.activityBoard.log('chain_started', 'chain-executor', tokenAddress, tokenName, chainId,
        JSON.stringify({ template: templateName, tasks: tasks.length }));
    }

    return { chain_id: chainId, chain_name: chainName, tasks: tasks.length, token_address: tokenAddress };
  }

  getChainStatus(chainId) {
    const tasks = this.db.prepare(`
      SELECT * FROM task_chains WHERE chain_id = ? ORDER BY task_order
    `).all(chainId);

    if (!tasks.length) return null;

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'blocked').length;
    const running = tasks.filter(t => t.status === 'running').length;

    return {
      chain_id: chainId,
      chain_name: tasks[0].chain_name,
      token_address: tasks[0].token_address,
      completion: `${completed}/${total}`,
      completion_pct: Math.round((completed / total) * 100),
      status: failed > 0 ? 'failed' : completed === total ? 'completed' : running > 0 ? 'running' : 'pending',
      tasks: tasks.map(t => ({
        name: t.task_name,
        order: t.task_order,
        status: t.status,
        agent: t.agent_name,
        depends_on: JSON.parse(t.depends_on || '[]'),
        condition: t.condition,
        result: t.result ? JSON.parse(t.result) : null,
        error: t.error,
        started_at: t.started_at,
        completed_at: t.completed_at
      }))
    };
  }

  updateTask(chainId, taskName, status, result, error) {
    const now = new Date().toISOString();

    if (status === 'running') {
      this.db.prepare(`
        UPDATE task_chains SET status = ?, started_at = ? WHERE chain_id = ? AND task_name = ?
      `).run(status, now, chainId, taskName);
    } else if (status === 'completed') {
      this.db.prepare(`
        UPDATE task_chains SET status = ?, completed_at = ?, result = ? WHERE chain_id = ? AND task_name = ?
      `).run(status, now, result ? JSON.stringify(result) : null, chainId, taskName);
      this._unblockDownstream(chainId);
    } else if (status === 'failed') {
      const task = this.db.prepare(`
        SELECT retry_count, max_retries FROM task_chains WHERE chain_id = ? AND task_name = ?
      `).get(chainId, taskName);

      if (task && task.retry_count < task.max_retries) {
        this.db.prepare(`
          UPDATE task_chains SET retry_count = retry_count + 1, error = ?, status = 'pending' WHERE chain_id = ? AND task_name = ?
        `).run(error || null, chainId, taskName);
      } else {
        this.db.prepare(`
          UPDATE task_chains SET status = 'failed', error = ?, completed_at = ? WHERE chain_id = ? AND task_name = ?
        `).run(error || null, now, chainId, taskName);

        if (this.activityBoard) {
          this.activityBoard.log('chain_failed', 'chain-executor', null, null, chainId,
            JSON.stringify({ task: taskName, error }));
        }
      }
    }

    // Check if chain is complete
    const allTasks = this.db.prepare(`SELECT status FROM task_chains WHERE chain_id = ?`).all(chainId);
    const allDone = allTasks.every(t => t.status === 'completed' || t.status === 'failed');
    if (allDone && this.activityBoard) {
      const anyFailed = allTasks.some(t => t.status === 'failed');
      this.activityBoard.log(anyFailed ? 'chain_failed' : 'chain_completed', 'chain-executor', null, null, chainId,
        JSON.stringify({ total: allTasks.length, completed: allTasks.filter(t => t.status === 'completed').length }));
    }

    return { chain_id: chainId, task: taskName, status };
  }

  _unblockDownstream(chainId) {
    const allTasks = this.db.prepare(`
      SELECT * FROM task_chains WHERE chain_id = ? ORDER BY task_order
    `).all(chainId);

    for (const task of allTasks) {
      if (task.status !== 'blocked') continue;

      const deps = JSON.parse(task.depends_on || '[]');
      const allDepsMet = deps.every(depName => {
        const dep = allTasks.find(t => t.task_name === depName);
        return dep && dep.status === 'completed';
      });

      if (!allDepsMet) continue;

      if (task.condition) {
        const condMet = this._evalCondition(task.condition, allTasks);
        if (!condMet) {
          this.db.prepare(`
            UPDATE task_chains SET status = 'skipped', completed_at = datetime('now') WHERE chain_id = ? AND task_name = ?
          `).run(chainId, task.task_name);
          continue;
        }
      }

      this.db.prepare(`
        UPDATE task_chains SET status = 'pending' WHERE chain_id = ? AND task_name = ?
      `).run(chainId, task.task_name);
    }
  }

  _evalCondition(condition, allTasks) {
    try {
      // Parse conditions like "scorer.result.score >= 70"
      const match = condition.match(/^(\w+)\.result\.(\w+)\s*(>=|<=|>|<|==|!=)\s*(.+)$/);
      if (!match) return true;

      const [, taskName, field, op, rawValue] = match;
      const task = allTasks.find(t => t.task_name === taskName);
      if (!task || !task.result) return false;

      const result = JSON.parse(task.result);
      const actual = result[field];
      const expected = rawValue.startsWith("'") ? rawValue.slice(1, -1) : Number(rawValue);

      switch (op) {
        case '>=': return actual >= expected;
        case '<=': return actual <= expected;
        case '>':  return actual > expected;
        case '<':  return actual < expected;
        case '==': return actual == expected;
        case '!=': return actual != expected;
        default: return true;
      }
    } catch (e) {
      return true;
    }
  }

  listTemplates() {
    try {
      if (!fs.existsSync(this.templateDir)) return [];
      const files = fs.readdirSync(this.templateDir).filter(f => f.endsWith('.toml'));
      return files.map(f => {
        const content = fs.readFileSync(path.join(this.templateDir, f), 'utf8');
        const parsed = this._parseToml(content);
        return {
          name: parsed.team?.name || f.replace('.toml', ''),
          description: parsed.team?.description || '',
          file: f,
          tasks: (parsed.tasks || []).length
        };
      });
    } catch (e) {
      return [];
    }
  }

  _loadTemplate(name) {
    const filePath = path.join(this.templateDir, `${name}.toml`);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return this._parseToml(content);
  }

  _parseToml(content) {
    const result = { team: {}, tasks: [] };
    let currentSection = null;
    let currentTask = null;

    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      if (line === '[[tasks]]') {
        if (currentTask) result.tasks.push(currentTask);
        currentTask = {};
        currentSection = 'task';
        continue;
      }

      if (line.match(/^\[(\w+)\]$/)) {
        if (currentTask) { result.tasks.push(currentTask); currentTask = null; }
        currentSection = line.slice(1, -1);
        continue;
      }

      const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (!kvMatch) continue;

      const [, key, rawVal] = kvMatch;
      let val;

      if (rawVal.startsWith('"') || rawVal.startsWith("'")) {
        val = rawVal.slice(1, -1);
      } else if (rawVal.startsWith('[')) {
        try {
          val = JSON.parse(rawVal.replace(/'/g, '"'));
        } catch {
          val = rawVal;
        }
      } else if (rawVal === 'true') {
        val = true;
      } else if (rawVal === 'false') {
        val = false;
      } else if (!isNaN(rawVal)) {
        val = Number(rawVal);
      } else {
        val = rawVal;
      }

      if (currentSection === 'task' && currentTask) {
        currentTask[key] = val;
      } else if (currentSection === 'team') {
        result.team[key] = val;
      }
    }

    if (currentTask) result.tasks.push(currentTask);
    return result;
  }
}

module.exports = TaskChainExecutor;
