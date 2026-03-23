function ensureAuth(req, res, next) {
  // TODO: add session age check and require re-auth when session is too old.
  // TODO: handle API JSON responses for unauthenticated requests instead of redirecting for client APIs.
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

module.exports = { ensureAuth };