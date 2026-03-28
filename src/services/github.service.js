const axios = require('axios');
const { normalizeRepo } = require('../utils/github');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// In-memory TTL cache for repo listings (1-minute TTL)
// ---------------------------------------------------------------------------
const repoCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

function getCached(key) {
  const entry = repoCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    repoCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  repoCache.set(key, { data, ts: Date.now() });
}

// ---------------------------------------------------------------------------
// Normalize GitHub API errors into a consistent error object
// ---------------------------------------------------------------------------
function buildGitHubError(err) {
  const status = err.response && err.response.status;
  const ghMessage = err.response && err.response.data && err.response.data.message;

  const error = new Error(ghMessage || err.message);
  error.status = status;
  error.code =
    status === 401 ? 'TOKEN_INVALID'
    : status === 403 ? 'PERMISSION_DENIED'
    : status === 404 ? 'NOT_FOUND'
    : status === 409 ? 'CONFLICT'
    : status === 422 ? 'UNPROCESSABLE'
    : status === 429 ? 'RATE_LIMITED'
    : status >= 500 ? 'GITHUB_SERVER_ERROR'
    : 'GITHUB_ERROR';
  return error;
}

// ---------------------------------------------------------------------------
// Circuit-breaker: trips OPEN after 5 consecutive server-side failures,
// recovers to HALF-OPEN after 30s, and closes again on first success.
// ---------------------------------------------------------------------------
const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT_MS = 30 * 1000;

const circuit = {
  state: 'CLOSED',   // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failures: 0,
  openedAt: null
};

function circuitAllow() {
  if (circuit.state === 'CLOSED') return true;
  if (circuit.state === 'OPEN') {
    if (Date.now() - circuit.openedAt >= RECOVERY_TIMEOUT_MS) {
      circuit.state = 'HALF_OPEN';
      logger.info({ event: 'circuit_half_open' });
      return true;
    }
    return false;
  }
  // HALF_OPEN: allow one probe request through
  return true;
}

function circuitOnSuccess() {
  if (circuit.state !== 'CLOSED') {
    logger.info({ event: 'circuit_closed' });
  }
  circuit.failures = 0;
  circuit.state = 'CLOSED';
  circuit.openedAt = null;
}

function circuitOnFailure(isServerError) {
  if (!isServerError) return; // only count 5xx / network errors, not 4xx
  circuit.failures += 1;
  if (circuit.state === 'HALF_OPEN' || circuit.failures >= FAILURE_THRESHOLD) {
    circuit.state = 'OPEN';
    circuit.openedAt = Date.now();
    logger.error({ event: 'circuit_open', failures: circuit.failures });
  }
}

// ---------------------------------------------------------------------------
// Central HTTP helper: circuit-breaker + 10s timeout + exponential backoff
// ---------------------------------------------------------------------------
async function githubRequest(config, retries = 3) {
  if (!circuitAllow()) {
    const err = new Error('GitHub API temporarily unavailable (circuit open)');
    err.code = 'CIRCUIT_OPEN';
    throw err;
  }

  const baseDelay = 500;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios({ timeout: 10000, ...config });
      circuitOnSuccess();
      return response;
    } catch (err) {
      lastErr = err;
      const status = err.response && err.response.status;
      const isServerError = !status || status >= 500;
      const retryable = !status || status === 429 || status === 502 || status === 503;

      if (!retryable || attempt === retries) {
        circuitOnFailure(isServerError);
        break;
      }

      const retryAfterHeader =
        status === 429 && err.response.headers && err.response.headers['retry-after']
          ? parseInt(err.response.headers['retry-after'], 10) * 1000
          : null;
      const delay = retryAfterHeader || baseDelay * Math.pow(2, attempt);

      logger.warn({ event: 'github_api_retry', attempt: attempt + 1, status, delayMs: delay, url: config.url });
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw buildGitHubError(lastErr);
}

// ---------------------------------------------------------------------------
// Validate token looks sane before sending to GitHub
// ---------------------------------------------------------------------------
function validateTokenFormat(token) {
  if (typeof token !== 'string' || token.length < 20) {
    throw new Error('Access token is malformed or too short');
  }
}

// ---------------------------------------------------------------------------
// Fetch paginated user repositories with TTL caching
// ---------------------------------------------------------------------------
async function fetchUserRepos(accessToken, { page = 1, limit = 30 } = {}) {
  validateTokenFormat(accessToken);

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
  const cacheKey = `repos:${accessToken}:${safePage}:${safeLimit}`;

  const cached = getCached(cacheKey);
  if (cached) {
    logger.info({ event: 'repos_cache_hit', page: safePage, limit: safeLimit });
    return cached;
  }

  const response = await githubRequest({
    method: 'get',
    url: 'https://api.github.com/user/repos',
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' },
    params: { per_page: safeLimit, page: safePage, sort: 'updated' }
  });

  const result = {
    repos: response.data.map(repo => normalizeRepo(repo)),
    page: safePage,
    limit: safeLimit,
    hasMore: response.data.length === safeLimit
  };

  setCache(cacheKey, result);
  return result;
}

// ---------------------------------------------------------------------------
// Check if the authenticated user has push/admin access to a repo
// ---------------------------------------------------------------------------
async function checkRepoWriteAccess(accessToken, owner, repoName) {
  validateTokenFormat(accessToken);
  try {
    const response = await githubRequest({
      method: 'get',
      url: `https://api.github.com/repos/${owner}/${repoName}`,
      headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' }
    });
    const perms = response.data.permissions || {};
    return perms.push === true || perms.admin === true;
  } catch (err) {
    logger.warn({ event: 'write_access_check_failed', owner, repo: repoName, code: err.code });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Workflow YAML — configurable via WORKFLOW_YAML env var
// ---------------------------------------------------------------------------
function getWorkflowYaml(branch = 'main') {
  if (process.env.WORKFLOW_YAML) {
    return process.env.WORKFLOW_YAML.replace(/\\n/g, '\n');
  }
  return [
    'name: BuildAtlas',
    '',
    'on:',
    '  push:',
    `    branches: [${branch}]`,
    '  pull_request:',
    `    branches: [${branch}]`,
    '',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - name: Set up Node.js',
    '        uses: actions/setup-node@v4',
    '        with:',
    "          node-version: '18'",
    '      - name: Install dependencies',
    '        run: npm install',
    '      - name: Run tests',
    '        run: npm test',
    ''
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Create or update a BuildAtlas workflow file in a repository
// ---------------------------------------------------------------------------
async function createWorkflow(accessToken, owner, repoName, defaultBranch = 'main') {
  validateTokenFormat(accessToken);
  if (!owner || !repoName) {
    throw new Error('owner and repoName are required');
  }

  const workflowPath = '.github/workflows/buildatlas.yml';
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${workflowPath}`;
  const headers = { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' };

  const payload = {
    message: 'Add BuildAtlas workflow',
    content: Buffer.from(getWorkflowYaml(defaultBranch)).toString('base64'),
    branch: defaultBranch
  };

  // If the file already exists, include its SHA so GitHub treats this as an update
  try {
    const existing = await githubRequest({ method: 'get', url: apiUrl, headers });
    payload.sha = existing.data.sha;
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  const commit = await githubRequest({ method: 'put', url: apiUrl, data: payload, headers });
  return commit.data;
}

// ---------------------------------------------------------------------------
// Fetch workflows for a repository
// ---------------------------------------------------------------------------
async function fetchWorkflows(accessToken, owner, repo) {
  validateTokenFormat(accessToken);
  const response = await githubRequest({
    method: 'get',
    url: `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' },
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Fetch all workflow runs for a repository (with optional filters)
// ---------------------------------------------------------------------------
async function fetchRuns(accessToken, owner, repo, params = {}) {
  validateTokenFormat(accessToken);
  const response = await githubRequest({
    method: 'get',
    url: `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' },
    params,
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Fetch runs for a specific workflow
// ---------------------------------------------------------------------------
async function fetchWorkflowRuns(accessToken, owner, repo, workflowId, params = {}) {
  validateTokenFormat(accessToken);
  const response = await githubRequest({
    method: 'get',
    url: `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`,
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' },
    params,
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Fetch a single workflow run
// ---------------------------------------------------------------------------
async function fetchRun(accessToken, owner, repo, runId) {
  validateTokenFormat(accessToken);
  const response = await githubRequest({
    method: 'get',
    url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' },
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Fetch jobs for a run
// ---------------------------------------------------------------------------
async function fetchRunJobs(accessToken, owner, repo, runId) {
  validateTokenFormat(accessToken);
  const response = await githubRequest({
    method: 'get',
    url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' },
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Fetch job logs — follows the GitHub 302 redirect and returns raw log text
// ---------------------------------------------------------------------------
async function fetchJobLogs(accessToken, owner, repo, jobId) {
  validateTokenFormat(accessToken);
  const response = await githubRequest({
    method: 'get',
    url: `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`,
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' },
    maxRedirects: 5,
    responseType: 'text',
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Re-run a workflow run
// ---------------------------------------------------------------------------
async function reRunWorkflowRun(accessToken, owner, repo, runId) {
  validateTokenFormat(accessToken);
  await githubRequest({
    method: 'post',
    url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' },
  });
}

// ---------------------------------------------------------------------------
// Cancel a workflow run
// ---------------------------------------------------------------------------
async function cancelWorkflowRun(accessToken, owner, repo, runId) {
  validateTokenFormat(accessToken);
  await githubRequest({
    method: 'post',
    url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/cancel`,
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' },
  });
}

module.exports = {
  fetchUserRepos,
  createWorkflow,
  checkRepoWriteAccess,
  fetchWorkflows,
  fetchRuns,
  fetchWorkflowRuns,
  fetchRun,
  fetchRunJobs,
  fetchJobLogs,
  reRunWorkflowRun,
  cancelWorkflowRun,
};
