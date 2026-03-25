const path = require('path');
const crypto = require('crypto');
const passport = require('passport');
const { fetchUserRepos, createWorkflow } = require('../services/github.service');

function home(req, res) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/repos');
  }
  res.sendFile(path.join(__dirname, '../../public/index.html'));
}

async function getRepos(req, res) {
  // TODO: validate and enrich req.user token before API call, consider refresh-flow for stale tokens.
  // TODO: implement repository pagination metadata, with query params page/limit, to avoid large payloads.
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({ error: 'No access token found.' });
  }

  try {
    const repos = await fetchUserRepos(req.user.accessToken);
    res.json(repos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repositories', details: error.message });
  }
}

async function createWorkflows(req, res) {
  // TODO: enforce an authorization layer to confirm user can write workflows in each selected repo.
  // TODO: persist workflow creation requests and status in DB for retryable background jobs.
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
      results.push({ repo: `${repo.owner || 'unknown'}/${repo.name || 'unknown'}`, status: 'error', message: error.message });
    }
  }

  res.json({ results });
}

function initiateOAuth(req, res, next) {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  passport.authenticate('github', {
    scope: ['user:email', 'read:user', 'repo'],
    state
  })(req, res, next);
}

function githubCallback(req, res) {
  const returnedState = req.query.state;
  const expectedState = req.session.oauthState;
  delete req.session.oauthState;

  if (!returnedState || returnedState !== expectedState) {
    return res.status(403).json({ error: 'Invalid OAuth state. Possible CSRF attack.' });
  }

  res.redirect('/repos');
}

function reposPage(req, res) {
  res.sendFile(path.join(__dirname, '../../public/repos.html'));
}

function profilePage(req, res) {
  res.sendFile(path.join(__dirname, '../../public/profile.html'));
}

function loginFailed(req, res) {
  res.json({ message: 'GitHub login failed. Please try again.' });
}

function logout(req, res, next) {
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
  initiateOAuth,
  githubCallback,
  reposPage,
  profilePage,
  loginFailed,
  logout
};