const express = require('express');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const githubController = require('../controllers/github.controller');
const { ensureAuth } = require('../middleware/auth.middleware');

const router = express.Router();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

// Secured repos API route
router.get('/api/repos', ensureAuth, apiLimiter, githubController.getRepos);
router.post('/api/repos/workflows', ensureAuth, workflowLimiter, githubController.createWorkflows);

// Start GitHub OAuth — repo scope required to create workflow files
router.get('/auth/github', githubController.initiateOAuth);

// OAuth callback route — state param verified in controller
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
