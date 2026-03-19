const express = require('express');
const passport = require('passport');
const githubController = require('../controllers/github.controller');
const { ensureAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Public home route
router.get('/', githubController.home);

// Secured repos API route
router.get('/api/repos', ensureAuth, githubController.getRepos);

// Start GitHub OAuth
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
