const path = require('path');
const passport = require('passport');
const {
  fetchUserRepos, createWorkflow, checkRepoWriteAccess,
  fetchWorkflows, fetchRuns, fetchWorkflowRuns, fetchRun,
  fetchRunJobs, fetchJobLogs, reRunWorkflowRun, cancelWorkflowRun,
} = require('../services/github.service');
const logger = require('../utils/logger');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function home(req, res) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect(`${FRONTEND_URL}/app/dashboard`);
  }
  res.sendFile(path.join(__dirname, '../../public/index.html'));
}

// ── Session user ──────────────────────────────────────────────────────────────

function getMe(req, res) {
  const u = req.user;
  res.json({
    id: u.id,
    login: u.username,
    name: u.displayName || u.username,
    avatar_url: u.avatarUrl || null,
    email: u.email || null,
  });
}

// ── Repos ─────────────────────────────────────────────────────────────────────

async function getRepos(req, res) {
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });

  try {
    const result = await fetchUserRepos(token, { page: req.query.page, limit: req.query.limit });
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
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });

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

    try {
      const hasAccess = await checkRepoWriteAccess(token, repo.owner, repo.name);
      if (!hasAccess) {
        results.push({ repo: `${repo.owner}/${repo.name}`, status: 'error', message: 'No write access to this repository' });
        continue;
      }
      const created = await createWorkflow(token, repo.owner, repo.name, repo.default_branch);
      results.push({ repo: `${repo.owner}/${repo.name}`, status: 'ok', commit: created.content.sha });
    } catch (error) {
      const message = error.code === 'PERMISSION_DENIED'
        ? 'Repository policy denied workflow creation'
        : error.message;
      logger.warn({ event: 'workflow_create_error', repo: `${repo.owner}/${repo.name}`, code: error.code, message });
      results.push({ repo: `${repo.owner}/${repo.name}`, status: 'error', message });
    }
  }
  res.json({ results });
}

// ── Workflows ─────────────────────────────────────────────────────────────────

async function getWorkflows(req, res) {
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });
  try {
    const data = await fetchWorkflows(token, req.params.owner, req.params.repo);
    res.json(data);
  } catch (err) {
    logger.error({ event: 'fetch_workflows_error', message: err.message });
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch workflows' });
  }
}

// ── Runs ──────────────────────────────────────────────────────────────────────

async function getRuns(req, res) {
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });
  try {
    const data = await fetchRuns(token, req.params.owner, req.params.repo, req.query);
    res.json(data);
  } catch (err) {
    logger.error({ event: 'fetch_runs_error', message: err.message });
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch runs' });
  }
}

async function getWorkflowRuns(req, res) {
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });
  try {
    const data = await fetchWorkflowRuns(token, req.params.owner, req.params.repo, req.params.workflowId, req.query);
    res.json(data);
  } catch (err) {
    logger.error({ event: 'fetch_workflow_runs_error', message: err.message });
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch workflow runs' });
  }
}

async function getRun(req, res) {
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });
  try {
    const data = await fetchRun(token, req.params.owner, req.params.repo, req.params.runId);
    res.json(data);
  } catch (err) {
    logger.error({ event: 'fetch_run_error', message: err.message });
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch run' });
  }
}

async function getRunJobs(req, res) {
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });
  try {
    const data = await fetchRunJobs(token, req.params.owner, req.params.repo, req.params.runId);
    res.json(data);
  } catch (err) {
    logger.error({ event: 'fetch_run_jobs_error', message: err.message });
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch run jobs' });
  }
}

async function getJobLogs(req, res) {
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });
  try {
    const logs = await fetchJobLogs(token, req.params.owner, req.params.repo, req.params.jobId);
    res.set('Content-Type', 'text/plain').send(logs);
  } catch (err) {
    logger.error({ event: 'fetch_job_logs_error', message: err.message });
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch job logs' });
  }
}

async function reRunWorkflow(req, res) {
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });
  try {
    await reRunWorkflowRun(token, req.params.owner, req.params.repo, req.params.runId);
    res.status(204).send();
  } catch (err) {
    logger.error({ event: 'rerun_workflow_error', message: err.message });
    res.status(err.status || 500).json({ error: err.message || 'Failed to re-run workflow' });
  }
}

async function cancelRun(req, res) {
  const token = req.user.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token found.' });
  try {
    await cancelWorkflowRun(token, req.params.owner, req.params.repo, req.params.runId);
    res.status(204).send();
  } catch (err) {
    logger.error({ event: 'cancel_run_error', message: err.message });
    res.status(err.status || 500).json({ error: err.message || 'Failed to cancel run' });
  }
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

function initiateOAuth(req, res, next) {
  passport.authenticate('github', { scope: ['read:user', 'repo'] })(req, res, next);
}

function githubCallback(req, res) {
  req.session.createdAt = Date.now();
  const userId = req.user && req.user.id;
  logger.info({ event: 'login_success', userId });
  res.redirect(`${FRONTEND_URL}/app/dashboard`);
}

function reposPage(_req, res) {
  res.sendFile(path.join(__dirname, '../../public/repos.html'));
}

function profilePage(_req, res) {
  res.sendFile(path.join(__dirname, '../../public/profile.html'));
}

function loginFailed(req, res) {
  logger.warn({ event: 'login_fail', ip: req.ip });
  res.redirect(`${FRONTEND_URL}/?login_failed=1`);
}

function logout(req, res, next) {
  const userId = req.user && req.user.id;
  req.logout(function(err) {
    if (err) return next(err);
    req.session.destroy(() => {
      logger.info({ event: 'logout', userId });
      res.json({ ok: true });
    });
  });
}

module.exports = {
  home, getMe, getRepos, createWorkflows,
  getWorkflows, getRuns, getWorkflowRuns, getRun, getRunJobs, getJobLogs,
  reRunWorkflow, cancelRun,
  initiateOAuth, githubCallback, reposPage, profilePage, loginFailed, logout,
};
