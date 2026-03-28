const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function ensureAuth(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/');
  }

  const createdAt = req.session.createdAt;
  if (createdAt && Date.now() - createdAt > MAX_SESSION_AGE_MS) {
    req.logout(() => req.session.destroy(() => {}));
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.redirect('/');
  }

  next();
}

module.exports = { ensureAuth };
