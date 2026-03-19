const axios = require('axios');
const { normalizeRepo } = require('../utils/github');

async function fetchUserRepos(accessToken) {
  if (!accessToken) {
    throw new Error('No access token provided');
  }

  // TODO(intern): add a request limiter or circuit-breaker to protect GitHub API calls from DOS at high volume.
  const response = await axios.get('https://api.github.com/user/repos', {
    headers: {
      Authorization: `token ${accessToken}`,
      'User-Agent': 'buildatlas-app'
    },
    params: {
      per_page: 100,
      sort: 'updated'
    }
  });

  return response.data.map(repo => normalizeRepo(repo));
}

async function createWorkflow(accessToken, owner, repoName, defaultBranch = 'main') {
  if (!accessToken || !owner || !repoName) {
    throw new Error('accessToken, owner, and repoName are required');
  }

  const path = '.github/workflows/buildatlas.yml';
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`;
  const workflowYaml = `name: BuildAtlas\n\non:\n  push:\n    branches: [${defaultBranch}]\n  pull_request:\n    branches: [${defaultBranch}]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Set up Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '18'\n      - name: Install dependencies\n        run: npm install\n      - name: Run tests\n        run: npm test\n`;
  const encodedContent = Buffer.from(workflowYaml).toString('base64');

  const payload = {
    message: 'Add BuildAtlas workflow',
    content: encodedContent,
    branch: defaultBranch
  };

  try {
    // If workflow exists, update (must provide sha)
    const existing = await axios.get(apiUrl, {
      headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' }
    });
    payload.sha = existing.data.sha;
  } catch (err) {
    if (!(err.response && err.response.status === 404)) {
      throw err;
    }
  }

  const commit = await axios.put(apiUrl, payload, {
    headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'buildatlas-app' }
  });

  // TODO(intern): make workflow YAML template configurable and avoid hard-coding test/run commands.
  // TODO(intern): normalize GitHub API errors and return a consistent service error object to controller layer.
  return commit.data;
}

module.exports = { fetchUserRepos, createWorkflow };