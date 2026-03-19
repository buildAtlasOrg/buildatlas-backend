function ensureAuth(req, res, next) {
  // TODO(intern): add session age check and require re-auth when session is too old.
  // TODO(intern): handle API JSON responses for unauthenticated requests instead of redirecting for client APIs.
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

module.exports = { ensureAuth };