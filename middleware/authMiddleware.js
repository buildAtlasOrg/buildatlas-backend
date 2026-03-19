// Middleware: protect routes by checking session authentication
function ensureAuth(req, res, next) {
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
