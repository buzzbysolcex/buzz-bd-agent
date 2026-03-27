/**
 * Colosseum Copilot — Intel Source #18
 * v8.2.0 | 5,400+ hackathon projects, 84,000+ archives, 6,300+ products
 * Free API, PAT auth, 90-day rotation
 * Rate limits: 30 search/min, 10 analysis/min, 2 concurrent
 */

const COPILOT_BASE = process.env.COLOSSEUM_COPILOT_API_BASE;
const COPILOT_PAT = process.env.COLOSSEUM_COPILOT_PAT;

const headers = {
  'Authorization': `Bearer ${COPILOT_PAT}`,
  'Content-Type': 'application/json'
};

async function copilotFetch(path, options = {}) {
  if (!COPILOT_BASE || !COPILOT_PAT) {
    throw new Error('Copilot not configured: missing COLOSSEUM_COPILOT_API_BASE or PAT');
  }
  const url = `${COPILOT_BASE}${path}`;
  const res = await fetch(url, { headers, ...options });

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After') || 5;
    console.warn(`[Copilot] Rate limited. Retry after ${retryAfter}s`);
    throw new Error(`RATE_LIMITED: retry after ${retryAfter}s`);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Copilot ${res.status}: ${body}`);
  }

  return res.json();
}

async function searchProjects(query, filters = {}, limit = 10) {
  return copilotFetch('/search/projects', {
    method: 'POST',
    body: JSON.stringify({ query, limit, filters })
  });
}

async function searchArchives(query, sources = [], limit = 5) {
  return copilotFetch('/search/archives', {
    method: 'POST',
    body: JSON.stringify({ query, limit, sources: sources.length ? sources : undefined })
  });
}

async function getProjectBySlug(slug) {
  return copilotFetch(`/projects/by-slug/${encodeURIComponent(slug)}`);
}

async function getCluster(key) {
  return copilotFetch(`/clusters/${encodeURIComponent(key)}`);
}

async function analyzeCohort(cohort, dimensions, topK = 10) {
  return copilotFetch('/analyze', {
    method: 'POST',
    body: JSON.stringify({ cohort, dimensions, topK })
  });
}

async function compareCohorts(cohortA, cohortB, dimensions, topK = 5) {
  return copilotFetch('/compare', {
    method: 'POST',
    body: JSON.stringify({ cohortA, cohortB, dimensions, topK })
  });
}

async function enrichTokenWithHackathonData(tokenName, tokenDescription = '') {
  try {
    const data = await searchProjects(
      `${tokenName} ${tokenDescription}`.trim(),
      {},
      5
    );

    return {
      hasHackathonHistory: data.results.length > 0,
      relatedProjects: data.results.map(r => ({
        name: r.name,
        slug: r.slug,
        hackathon: r.hackathon?.name,
        similarity: r.similarity,
        isWinner: !!r.prize,
        prize: r.prize,
        cluster: r.cluster,
        links: r.links,
        crowdedness: r.crowdedness
      })),
      totalFound: data.totalFound,
      scoringBonus: data.results.length > 0
        ? data.results[0].accelerator ? 15
          : data.results[0].prize ? 10
          : 5
        : 0
    };
  } catch (err) {
    console.error('[Copilot] Enrichment failed:', err.message);
    return { hasHackathonHistory: false, relatedProjects: [], scoringBonus: 0, error: err.message };
  }
}

async function getWeeklyTrends() {
  try {
    const comparison = await compareCohorts(
      { hackathons: ['cypherpunk'] },
      { hackathons: ['breakout'] },
      ['problemTags', 'primitives', 'techStack'],
      5
    );
    return comparison;
  } catch (err) {
    console.error('[Copilot] Trends failed:', err.message);
    return null;
  }
}

async function checkStatus() {
  return copilotFetch('/status');
}

module.exports = {
  searchProjects,
  searchArchives,
  getProjectBySlug,
  getCluster,
  analyzeCohort,
  compareCohorts,
  enrichTokenWithHackathonData,
  getWeeklyTrends,
  checkStatus
};
