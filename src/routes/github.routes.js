const express = require('express');
const passport = require('passport');
const githubController = require('../controllers/github.controller');
const { ensureAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Public home route
router.get('/', githubController.home);

// Secured repos API route
// TODO: add application-level rate limiting middleware on these routes to guard against abuse.
// TODO: verify `ensureAuth` sets req.user.accessToken from a secure DB session store.
router.get('/api/repos', ensureAuth, githubController.getRepos);
router.post('/api/repos/workflows', ensureAuth, githubController.createWorkflows);

// Start GitHub OAuth
// TODO: use least-privilege OAuth scopes and document why each scope is required.
router.get('/auth/github', passport.authenticate('github', { scope: ['user:email', 'read:user', 'repo'] }));

// OAuth callback route
router.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login-failed' }),
  githubController.githubCallback
);

router.get('/repos', ensureAuth, githubController.reposPage);
router.get('/profile', ensureAuth, githubController.profilePage);
router.get('/login-failed', githubController.loginFailed);
router.get('/logout', githubController.logout);

module.exports = router;
