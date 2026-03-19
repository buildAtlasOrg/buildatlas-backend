// Controller layer: handles Express request/response for GitHub-related routes
const path = require('path');
const { fetchUserRepos, createWorkflow } = require('../services/githubServices');

// Home endpoint: redirect authenticated users to repos page, otherwise show landing page
function home(req, res) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/repos');
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
}

// API endpoint for fetching repositories with backend GitHub service
// TODO(intern): validate req.user and req.user.accessToken for session expiration and refresh failure.
// TODO(intern): implement pagination and caching with a short TTL for /api/repos responses to improve rate limit behavior.
// TODO(intern): sanitize repo output and avoid leaking token or sensitive user info in error details in prod.
async function getRepos(req, res) {
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({ error: 'No access token found.' });
  }

  try {
    const repos = await fetchUserRepos(req.user.accessToken);
    res.json(repos);
  } catch (error) {
    // Internal server error returned if GitHub API call fails
    res.status(500).json({ error: 'Failed to fetch repositories', details: error.message });
  }
}

async function createWorkflows(req, res) {
  // TODO(intern): apply JSON schema validation for req.body.selected to prevent injection and malformed payloads.
  // TODO(intern): rate-limit this endpoint per user to avoid mass-write operations on GitHub repos.
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({ error: 'No access token found.' });
  }

  const selectedRepos = req.body.selected;
  if (!Array.isArray(selectedRepos) || selectedRepos.length === 0) {
    return res.status(400).json({ error: 'No repositories selected.' });
  }

  const results = [];
  for (const repo of selectedRepos) {
    try {
      if (!repo.owner || !repo.name) {
        throw new Error('Invalid repository object');
      }
      const created = await createWorkflow(req.user.accessToken, repo.owner, repo.name, repo.default_branch);
      results.push({ repo: `${repo.owner}/${repo.name}`, status: 'ok', commit: created.content.sha });
    } catch (error) {
      // TODO(intern): consider storing error events in a persistent audit table for later analysis.
      results.push({ repo: `${repo.owner || 'unknown'}/${repo.name || 'unknown'}`, status: 'error', message: error.message });
    }
  }

  res.json({ results });
}

// OAuth callback success handler
// TODO(intern): remove console.logs and switch to structured logger (winston/pino) with error severity and request IDs.
// TODO(intern): avoid exposing full session object in logs, capture only non-sensitive metadata for auditing.
function githubCallback(req, res) {
  // Debug logs for session and user data
  console.log('LOGIN CALLBACK – user:', req.user);
  console.log('LOGIN CALLBACK – sessionID:', req.sessionID, 'session:', req.session);
  res.redirect('/repos');
}

// Page handlers for client routes
function reposPage(req, res) {
  res.sendFile(path.join(__dirname, '../public/repos.html'));
}

function profilePage(req, res) {
  res.sendFile(path.join(__dirname, '../public/profile.html'));
}

function loginFailed(req, res) {
  res.json({ message: 'GitHub login failed. Please try again.' });
}

// Logout route handler
function logout(req, res, next) {
  // TODO(intern): rotate session identifier after logout to prevent session fixation.
  // TODO(intern): include logout event in audit log and optionally in a persistent 'user_sessions' history store.
  req.logout(function(err) {
    if (err) return next(err);
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
}

module.exports = {
  home,
  getRepos,
  createWorkflows,
  githubCallback,
  reposPage,
  profilePage,
  loginFailed,
  logout
};
