// Service layer: encapsulates GitHub API calls
const axios = require('axios');

async function fetchUserRepos(accessToken) {
  // Validate required token input
  // TODO(intern): enforce token format checking and avoid passing invalid tokens to GitHub.
  if (!accessToken) {
    throw new Error('No access token provided');
  }

  // Query GitHub API for user repositories using the OAuth access token
  // TODO(intern): add exponential backoff and retry for transient 502/503/429 responses and log rate-limit headers.
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

  // Normalize response to minimal payload for front-end usage
  return response.data.map(repo => ({
    name: repo.name,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    private: repo.private,
    updated_at: repo.updated_at,
    owner: repo.owner?.login || null,
    default_branch: repo.default_branch || 'main'
  }));
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

  // TODO(intern): detect and handle 409 conflict, 403 corp policies, and convert to structured service errors.
  // TODO(intern): add support for GitHub App authentication (installation tokens) in addition to OAuth user tokens.
  return commit.data;
}

module.exports = { fetchUserRepos, createWorkflow };
