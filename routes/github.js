// Route declarations: endpoint definitions only
const express = require('express');
const passport = require('passport');
const githubController = require('../controllers/githubController');
const { ensureAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Public home route
router.get('/', githubController.home);

// Secured GitHub repos API route
// TODO: add request rate limiting middleware for this endpoint to reduce abuse and API throttling.
// TODO: ensure token is loaded from secure session/DB per-user, not from client-supplied header or query params.
router.get('/api/repos', ensureAuth, githubController.getRepos);
router.post('/api/repos/workflows', ensureAuth, githubController.createWorkflows);

// Start OAuth handshake
// TODO: review OAuth scope least-privilege; for read-only repos use repo:status or public_repo when possible.
router.get('/auth/github', passport.authenticate('github', { scope: ['user:email', 'read:user', 'repo'] }));

// OAuth callback route
// TODO: handle invalid/expired callback tokens and fail fast with clear audit log entries.
// TODO: add CSRF protection on OAuth callback flow (state param verification), especially before production.
router.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login-failed' }),
  githubController.githubCallback
);

// UI pages require authentication
router.get('/repos', ensureAuth, githubController.reposPage);
router.get('/profile', ensureAuth, githubController.profilePage);

// Auth status pages
// TODO: add structured logging here (login_fails, logout events) with request context for monitoring.
// TODO: consider adding audit trail persistence for auth events in a DB table for incident investigation.
router.get('/login-failed', githubController.loginFailed);
router.get('/logout', githubController.logout);

module.exports = router;

