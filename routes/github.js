// Route declarations: endpoint definitions only
const express = require('express');
const passport = require('passport');
const githubController = require('../controllers/githubController');
const { ensureAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Public home route
router.get('/', githubController.home);

// Secured GitHub repos API route
router.get('/api/repos', ensureAuth, githubController.getRepos);
router.post('/api/repos/workflows', ensureAuth, githubController.createWorkflows);

// Start OAuth handshake
router.get('/auth/github', passport.authenticate('github', { scope: ['user:email', 'read:user', 'repo'] }));

// OAuth callback route
router.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login-failed' }),
  githubController.githubCallback
);

// UI pages require authentication
router.get('/repos', ensureAuth, githubController.reposPage);
router.get('/profile', ensureAuth, githubController.profilePage);

// Auth status pages
router.get('/login-failed', githubController.loginFailed);
router.get('/logout', githubController.logout);

module.exports = router;

