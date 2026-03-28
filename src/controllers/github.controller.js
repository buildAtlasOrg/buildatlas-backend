const path = require('path');
const crypto = require('crypto');
const passport = require('passport');
const { fetchUserRepos, createWorkflow, checkRepoWriteAccess } = require('../services/github.service');
const { getToken, deleteToken } = require('../services/token.service');
const { recordAuthEvent } = require('../services/auth-events.service');
const { createJob, updateJob } = require('../services/workflow-jobs.service');
const logger = require('../utils/logger');

function home(req, res) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/repos');
  }
  res.sendFile(path.join(__dirname, '../../public/index.html'));
}

async function getRepos(req, res) {
  const token = await getToken(req.user.id);
  if (!token) {
    return res.status(401).json({ error: 'No access token found.' });
  }

  const page = req.query.page;
  const limit = req.query.limit;

  try {
    const result = await fetchUserRepos(token, { page, limit });
    res.json(result);
  } catch (error) {
    if (error.code === 'TOKEN_INVALID') {
      logger.warn({ event: 'stale_token_detected', userId: req.user.id });
      return res.status(401).json({ error: 'GitHub token is invalid or expired. Please log in again.' });
    }
    logger.error({ event: 'fetch_repos_error', userId: req.user.id, message: error.message });
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
}

async function createWorkflows(req, res) {
  const token = await getToken(req.user.id);
  if (!token) {
    return res.status(401).json({ error: 'No access token found.' });
  }

  const selectedRepos = req.body.selected;
  if (!Array.isArray(selectedRepos) || selectedRepos.length === 0) {
    return res.status(400).json({ error: 'No repositories selected.' });
  }

  const results = [];
  for (const repo of selectedRepos) {
    if (typeof repo.owner !== 'string' || typeof repo.name !== 'string' || !repo.owner || !repo.name) {
      results.push({ repo: 'unknown/unknown', status: 'error', message: 'Invalid repository object: owner and name must be non-empty strings' });
      continue;
    }

    const jobId = await createJob(req.user.id, repo.owner, repo.name);

    try {
      const hasAccess = await checkRepoWriteAccess(token, repo.owner, repo.name);
      if (!hasAccess) {
        await updateJob(jobId, 'error', { errorMsg: 'No write access to this repository' });
        results.push({ repo: `${repo.owner}/${repo.name}`, status: 'error', message: 'No write access to this repository' });
        continue;
      }

      const created = await createWorkflow(token, repo.owner, repo.name, repo.default_branch);
      await updateJob(jobId, 'ok', { commitSha: created.content.sha });
      results.push({ repo: `${repo.owner}/${repo.name}`, status: 'ok', commit: created.content.sha });
    } catch (error) {
      const message = error.code === 'PERMISSION_DENIED'
        ? 'Repository policy denied workflow creation'
        : error.message;
      logger.warn({ event: 'workflow_create_error', repo: `${repo.owner}/${repo.name}`, code: error.code, message });
      await updateJob(jobId, 'error', { errorMsg: message });
      results.push({ repo: `${repo.owner}/${repo.name}`, status: 'error', message });
    }
  }

  res.json({ results });
}

function initiateOAuth(req, res, next) {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  passport.authenticate('github', {
    scope: ['read:user', 'repo'],
    state
  })(req, res, next);
}

function githubCallback(req, res) {
  const returnedState = req.query.state;
  const expectedState = req.session.oauthState;
  delete req.session.oauthState;

  if (!returnedState || returnedState !== expectedState) {
    logger.warn({ event: 'oauth_state_mismatch', userId: req.user && req.user.id });
    return res.status(403).json({ error: 'Invalid OAuth state. Possible CSRF attack.' });
  }

  // Stamp session creation time for age checks in auth middleware
  req.session.createdAt = Date.now();

  const userId = req.user && req.user.id;
  logger.info({ event: 'login_success', userId });
  recordAuthEvent('login_success', userId, req.ip);
  res.redirect('/repos');
}

function reposPage(_req, res) {
  res.sendFile(path.join(__dirname, '../../public/repos.html'));
}

function profilePage(_req, res) {
  res.sendFile(path.join(__dirname, '../../public/profile.html'));
}

function loginFailed(req, res) {
  logger.warn({ event: 'login_fail', ip: req.ip });
  recordAuthEvent('login_fail', null, req.ip);
  res.json({ message: 'GitHub login failed. Please try again.' });
}

function logout(req, res, next) {
  const userId = req.user && req.user.id;
  req.logout(function(err) {
    if (err) return next(err);
    req.session.destroy(async () => {
      if (userId) {
        try { await deleteToken(userId); } catch (_) {}
        logger.info({ event: 'logout', userId });
        recordAuthEvent('logout', userId, req.ip);
      }
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
