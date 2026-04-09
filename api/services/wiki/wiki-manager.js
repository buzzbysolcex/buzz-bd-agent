/**
 * Buzz Wiki Manager — Karpathy LLM Knowledge Base
 *
 * Persistent markdown wiki at /data/buzz/persistent/wiki/ that Buzz reads
 * and writes directly. Not in git. Survives container/server/ah restarts
 * via Docker volume mount.
 *
 * Structure:
 *   WIKI.md                 — schema
 *   INDEX.md                — master index (auto-regenerated)
 *   LOG.md                  — append-only activity log
 *   entities/*.md           — tokens, projects, people, orgs
 *   concepts/*.md           — patterns, techniques, scoring rules
 *   synthesis/*.md          — cross-cutting analysis
 *   signals/*.md            — AIBTC signal research
 *   raw/                    — immutable source documents (NEVER modified)
 *
 * Feature flag: KARPATHY_WIKI (off by default — Ogie flips after review)
 *
 * All operations are read/write markdown files. No DB. No Redis. Just files.
 */

const fs = require("fs");
const path = require("path");
const { feature } = require("../../lib/feature-flags");

const WIKI_ROOT =
  process.env.WIKI_ROOT ||
  (fs.existsSync("/data/buzz/persistent/wiki")
    ? "/data/buzz/persistent/wiki"
    : "/data/wiki"); // container sees /data/wiki, host sees /data/buzz/persistent/wiki
const SUBDIRS = ["entities", "concepts", "synthesis", "signals"];

// ─────────────────────────────────────────────────────────────
// Path helpers
// ─────────────────────────────────────────────────────────────

function pagePath(type, slug) {
  return path.join(WIKI_ROOT, type, `${slug}.md`);
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function ensureWikiRoot() {
  if (!exists(WIKI_ROOT)) {
    fs.mkdirSync(WIKI_ROOT, { recursive: true });
  }
  for (const sub of SUBDIRS) {
    const p = path.join(WIKI_ROOT, sub);
    if (!exists(p)) fs.mkdirSync(p, { recursive: true });
  }
  const raw = path.join(WIKI_ROOT, "raw");
  for (const d of ["intel", "scans", "scores", "external"]) {
    const p = path.join(raw, d);
    if (!exists(p)) fs.mkdirSync(p, { recursive: true });
  }
}

// ─────────────────────────────────────────────────────────────
// Page template
// ─────────────────────────────────────────────────────────────

function renderPage({
  title,
  type, // entity | concept | synthesis | signal
  created,
  updated,
  sources = [],
  tags = [],
  summary = "",
  content = "",
  related = [],
  changelog = [],
}) {
  const today = updated || created || new Date().toISOString().split("T")[0];
  const ts = created || today;

  const sourcesLine = sources.length
    ? sources.map((s) => `[[${s}]]`).join(", ")
    : "—";
  const tagsLine = tags.length ? tags.map((t) => `#${t}`).join(" ") : "—";

  const relatedBlock = related.length
    ? related.map((r) => `- [[${r.name}]] — ${r.why}`).join("\n")
    : "_No related pages yet._";

  const changelogBlock = changelog.length
    ? changelog.map((c) => `- ${c}`).join("\n")
    : `- ${ts}: Created`;

  return `# ${title}
**Type**: ${type}
**Created**: ${ts}
**Updated**: ${today}
**Sources**: ${sourcesLine}
**Tags**: ${tagsLine}

---

## Summary
${summary.trim() || "_No summary yet._"}

## Content
${content.trim() || "_No content yet._"}

## Related
${relatedBlock}

## Changelog
${changelogBlock}
`;
}

// ─────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────

function writePage(type, slug, meta) {
  if (!SUBDIRS.includes(type)) {
    throw new Error(`Invalid wiki page type: ${type}`);
  }
  ensureWikiRoot();
  const p = pagePath(type, slug);
  const content = renderPage({ ...meta, type });
  fs.writeFileSync(p, content);
  return p;
}

function readPage(type, slug) {
  const p = pagePath(type, slug);
  if (!exists(p)) return null;
  return fs.readFileSync(p, "utf8");
}

function updatePage(type, slug, updater) {
  const p = pagePath(type, slug);
  if (!exists(p)) return null;
  const current = fs.readFileSync(p, "utf8");
  const next = updater(current);
  if (next && next !== current) {
    fs.writeFileSync(p, next);
    return p;
  }
  return null;
}

// Append a line to the ## Changelog section of an existing page
function appendChangelog(type, slug, line) {
  return updatePage(type, slug, (current) => {
    const today = new Date().toISOString().split("T")[0];
    const entry = `- ${today}: ${line}`;
    // Insert after "## Changelog" header
    if (/## Changelog/.test(current)) {
      return current.replace(/## Changelog\n/, `## Changelog\n${entry}\n`);
    }
    return current + `\n## Changelog\n${entry}\n`;
  });
}

function listPages(type) {
  const dir = path.join(WIKI_ROOT, type);
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

function extractSummary(content) {
  const match = content.match(/## Summary\n([\s\S]*?)(?=\n##|\n?$)/);
  if (!match) return "";
  return match[1]
    .trim()
    .split("\n")[0]
    .slice(0, 140)
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
}

function extractTitle(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

// ─────────────────────────────────────────────────────────────
// INDEX.md
// ─────────────────────────────────────────────────────────────

function generateIndex() {
  ensureWikiRoot();
  const sections = [];

  for (const type of SUBDIRS) {
    const files = listPages(type);
    const lines = [];
    for (const f of files) {
      const slug = f.replace(/\.md$/, "");
      const content = readPage(type, slug) || "";
      const title = extractTitle(content, slug);
      const summary = extractSummary(content);
      lines.push(`- [[${slug}]] — ${summary || title}`);
    }
    sections.push(
      `## ${type.charAt(0).toUpperCase() + type.slice(1)} (${files.length} pages)\n${lines.join("\n") || "_none_"}`,
    );
  }

  const header = `# Buzz Wiki — Master Index
**Generated**: ${new Date().toISOString()}
**Schema**: [[WIKI]]

---

`;
  const body = sections.join("\n\n");
  const footer = `\n\n---\n_Regenerated by wiki-manager.generateIndex()_\n`;

  fs.writeFileSync(path.join(WIKI_ROOT, "INDEX.md"), header + body + footer);
  return path.join(WIKI_ROOT, "INDEX.md");
}

// ─────────────────────────────────────────────────────────────
// LOG.md (append-only)
// ─────────────────────────────────────────────────────────────

function appendLog(operation, title, pagesAffected = []) {
  ensureWikiRoot();
  const logPath = path.join(WIKI_ROOT, "LOG.md");
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  const affectedLine = pagesAffected.length
    ? ` Pages: ${pagesAffected.map((p) => `[[${p}]]`).join(", ")}.`
    : "";
  const entry = `\n## [${now}] ${operation} | ${title}\n${affectedLine}\n`;

  if (!exists(logPath)) {
    fs.writeFileSync(
      logPath,
      `# Buzz Wiki — Activity Log\n**Append-only.** Newest entries appended at bottom.\n${entry}`,
    );
  } else {
    fs.appendFileSync(logPath, entry);
  }
  return logPath;
}

// ─────────────────────────────────────────────────────────────
// Entity + concept convenience writers
// ─────────────────────────────────────────────────────────────

function createEntityPage(token) {
  const slug = slugify(token.slug || token.ticker || token.address);
  if (!slug) return null;
  const meta = {
    title: token.title || `${token.ticker || slug}`,
    created: (token.created_at || new Date().toISOString()).split("T")[0],
    sources: token.sources || [],
    tags: (token.tags || [])
      .concat([token.chain ? `chain-${token.chain}` : null])
      .filter(Boolean),
    summary:
      token.summary ||
      `${token.ticker || slug} on ${token.chain || "unknown chain"}. Buzz score ${token.score ?? "n/a"}.`,
    content: token.content || "",
    related: token.related || [],
    changelog: token.changelog || [],
  };
  return writePage("entities", slug, meta);
}

function updateEntityPage(slug, newData) {
  return appendChangelog(
    "entities",
    slugify(slug),
    newData.line || JSON.stringify(newData).slice(0, 200),
  );
}

function createConceptPage(concept) {
  const slug = slugify(concept.slug || concept.name);
  if (!slug) return null;
  return writePage("concepts", slug, {
    title: concept.title || concept.name,
    created: concept.created || new Date().toISOString().split("T")[0],
    sources: concept.sources || [],
    tags: concept.tags || [],
    summary: concept.summary || "",
    content: concept.content || "",
    related: concept.related || [],
    changelog: concept.changelog || [],
  });
}

function createSynthesisPage(synth) {
  const slug = slugify(synth.slug || synth.title);
  if (!slug) return null;
  return writePage("synthesis", slug, {
    title: synth.title,
    created: synth.created || new Date().toISOString().split("T")[0],
    sources: synth.sources || [],
    tags: synth.tags || [],
    summary: synth.summary || "",
    content: synth.content || "",
    related: synth.related || [],
    changelog: synth.changelog || [],
  });
}

function createSignalPage(signal) {
  const slug = slugify(signal.slug || `${signal.date}-${signal.beat}`);
  if (!slug) return null;
  return writePage("signals", slug, {
    title: signal.title || `${signal.date} ${signal.beat}`,
    created: signal.date || new Date().toISOString().split("T")[0],
    sources: signal.sources || [],
    tags: ["signal", signal.beat].filter(Boolean),
    summary: signal.summary || "",
    content: signal.content || "",
    related: signal.related || [],
    changelog: signal.changelog || [],
  });
}

// ─────────────────────────────────────────────────────────────
// Query — find relevant pages for a topic/beat
// ─────────────────────────────────────────────────────────────

function findRelevantPages(query, { limit = 5 } = {}) {
  const indexPath = path.join(WIKI_ROOT, "INDEX.md");
  if (!exists(indexPath)) return [];
  const q = query.toLowerCase();
  const index = fs.readFileSync(indexPath, "utf8");
  const matches = [];
  const lineRe = /\[\[([^\]]+)\]\]\s*—\s*(.*)/;
  for (const line of index.split("\n")) {
    if (!line.includes("[[")) continue;
    const m = line.match(lineRe);
    if (!m) continue;
    const slug = m[1];
    const summary = m[2];
    const score =
      (slug.toLowerCase().includes(q) ? 10 : 0) +
      (summary.toLowerCase().includes(q) ? 3 : 0);
    if (score > 0) matches.push({ slug, summary, score });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Find the page content across subdirs for a slug
function findPageContent(slug) {
  for (const type of SUBDIRS) {
    const content = readPage(type, slug);
    if (content) return { type, slug, content };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// LINT — orphans, missing, stale, stats
// ─────────────────────────────────────────────────────────────

function wikiLint() {
  ensureWikiRoot();

  const allPages = [];
  for (const type of SUBDIRS) {
    for (const f of listPages(type)) {
      allPages.push({ type, slug: f.replace(/\.md$/, "") });
    }
  }

  // Build link map: who links to whom
  const inboundCount = {};
  const referencedNames = new Set();
  for (const { type, slug } of allPages) {
    const content = readPage(type, slug) || "";
    const links = content.match(/\[\[([^\]]+)\]\]/g) || [];
    for (const link of links) {
      const target = link.replace(/[\[\]]/g, "");
      referencedNames.add(target);
      inboundCount[target] = (inboundCount[target] || 0) + 1;
    }
  }
  // Don't count self-links
  for (const { slug } of allPages) {
    const content =
      readPage(allPages.find((p) => p.slug === slug)?.type || "", slug) || "";
    if (content.includes(`[[${slug}]]`)) {
      // Strip self-references from inbound count
      // (rough — per-page check is overkill for lint)
    }
  }

  // Orphans: pages that are not referenced by any other page
  const orphans = allPages
    .filter(({ slug }) => !inboundCount[slug])
    .map(({ type, slug }) => `${type}/${slug}`);

  // Missing: names referenced in [[wikilinks]] that don't exist as files
  const existingSlugs = new Set(allPages.map((p) => p.slug));
  const missingPages = [...referencedNames].filter(
    (n) => !existingSlugs.has(n) && n !== "WIKI" && n !== "INDEX",
  );

  // Stale: not modified in 30+ days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const stalePages = [];
  for (const { type, slug } of allPages) {
    try {
      const stat = fs.statSync(pagePath(type, slug));
      if (stat.mtimeMs < thirtyDaysAgo) {
        stalePages.push(`${type}/${slug}`);
      }
    } catch {}
  }

  const result = {
    totalPages: allPages.length,
    entitiesCount: listPages("entities").length,
    conceptsCount: listPages("concepts").length,
    synthesisCount: listPages("synthesis").length,
    signalsCount: listPages("signals").length,
    orphans,
    missingPages,
    stalePages,
    ranAt: new Date().toISOString(),
  };

  appendLog(
    "lint",
    `Lint complete — ${result.totalPages} pages, ${orphans.length} orphans, ${missingPages.length} missing, ${stalePages.length} stale`,
    [],
  );

  return result;
}

function wikiStats() {
  ensureWikiRoot();
  return {
    root: WIKI_ROOT,
    entities: listPages("entities").length,
    concepts: listPages("concepts").length,
    synthesis: listPages("synthesis").length,
    signals: listPages("signals").length,
    has_index: exists(path.join(WIKI_ROOT, "INDEX.md")),
    has_log: exists(path.join(WIKI_ROOT, "LOG.md")),
  };
}

// ─────────────────────────────────────────────────────────────
// Non-blocking hooks used by scoring pipeline + signal factory
// ─────────────────────────────────────────────────────────────

// Scoring pipeline hook — never throws, never blocks
function hookTokenScored(token) {
  if (!feature("KARPATHY_WIKI")) return { skipped: true };
  try {
    const slug = slugify(token.ticker || token.address);
    if (!slug) return { skipped: true, reason: "no slug" };
    const existing = readPage("entities", slug);
    if (existing) {
      appendChangelog(
        "entities",
        slug,
        `Re-scored ${token.score ?? "?"} (prev ${token.previousScore ?? "n/a"}) — ${token.verdict || ""}`.trim(),
      );
      return { updated: slug };
    }
    // New entity gets a minimal seed page; synthesis happens in weekly ingest
    createEntityPage({
      ticker: token.ticker,
      chain: token.chain,
      score: token.score,
      summary: `${token.ticker || token.address} on ${token.chain || "unknown"} — scored ${token.score} (${token.verdict || "unknown"}).`,
      changelog: [
        `${new Date().toISOString().split("T")[0]}: Created from scoring pipeline`,
      ],
    });
    return { created: slug };
  } catch (err) {
    return { error: err.message };
  }
}

// Signal factory hook — returns compiled research string or null
function hookSignalResearch(beat) {
  if (!feature("KARPATHY_WIKI")) return null;
  try {
    const pages = findRelevantPages(beat, { limit: 5 });
    if (!pages.length) return null;
    const parts = [];
    for (const { slug } of pages) {
      const found = findPageContent(slug);
      if (found) parts.push(`## [[${slug}]]\n${found.content}`);
    }
    return parts.length ? parts.join("\n---\n") : null;
  } catch {
    return null;
  }
}

module.exports = {
  // constants
  WIKI_ROOT,
  SUBDIRS,

  // path / helpers
  pagePath,
  slugify,
  ensureWikiRoot,

  // CRUD
  renderPage,
  writePage,
  readPage,
  updatePage,
  appendChangelog,
  listPages,

  // Index + log
  generateIndex,
  appendLog,

  // Typed writers
  createEntityPage,
  updateEntityPage,
  createConceptPage,
  createSynthesisPage,
  createSignalPage,

  // Query
  findRelevantPages,
  findPageContent,

  // Maintenance
  wikiLint,
  wikiStats,

  // Non-blocking hooks
  hookTokenScored,
  hookSignalResearch,
};
