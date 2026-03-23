// Middleware: protect routes by checking session authentication
function ensureAuth(req, res, next) {
  // TODO: remove plaintext session dump logs from production and use structured log levels (debug/trace only).
  // TODO: add explicit checks for session expiry / token revocation and force re-auth if invalid.
  console.log('ensureAuth:', {
    isAuthenticated: req.isAuthenticated && req.isAuthenticated(),
    user: req.user,
    sessionID: req.sessionID,
    session: req.session
  });

  // If user is authenticated, allow request through
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Otherwise redirect to home page for login
  res.redirect('/');
}

module.exports = { ensureAuth };
