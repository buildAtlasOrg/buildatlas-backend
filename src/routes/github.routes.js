const express = require('express');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const githubController = require('../controllers/github.controller');
const { ensureAuth } = require('../middleware/auth.middleware');
const router = express.Router();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const workflowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many workflow requests, please try again later.' }
});

// Public home route
router.get('/', githubController.home);

// Current session user
router.get('/api/me', ensureAuth, githubController.getMe);

// Repos
router.get('/api/repos', ensureAuth, apiLimiter, githubController.getRepos);
router.post('/api/repos/workflows', ensureAuth, workflowLimiter, githubController.createWorkflows);

// Workflows & runs (order matters — specific paths before param paths)
router.get('/api/repos/:owner/:repo/workflows', ensureAuth, apiLimiter, githubController.getWorkflows);
router.get('/api/repos/:owner/:repo/actions/runs', ensureAuth, apiLimiter, githubController.getRuns);
router.get('/api/repos/:owner/:repo/actions/workflows/:workflowId/runs', ensureAuth, apiLimiter, githubController.getWorkflowRuns);
router.get('/api/repos/:owner/:repo/actions/runs/:runId/jobs', ensureAuth, apiLimiter, githubController.getRunJobs);
router.get('/api/repos/:owner/:repo/actions/runs/:runId', ensureAuth, apiLimiter, githubController.getRun);
router.get('/api/repos/:owner/:repo/actions/jobs/:jobId/logs', ensureAuth, apiLimiter, githubController.getJobLogs);
router.post('/api/repos/:owner/:repo/actions/runs/:runId/rerun', ensureAuth, workflowLimiter, githubController.reRunWorkflow);
router.post('/api/repos/:owner/:repo/actions/runs/:runId/cancel', ensureAuth, workflowLimiter, githubController.cancelRun);

// OAuth
router.get('/auth/github', githubController.initiateOAuth);
router.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login-failed' }),
  githubController.githubCallback
);

router.get('/repos', ensureAuth, githubController.reposPage);
router.get('/profile', ensureAuth, githubController.profilePage);
router.get('/login-failed', githubController.loginFailed);
router.get('/logout', githubController.logout);

module.exports = router;
