// Middleware setup: configure Passport.js for GitHub OAuth
const GitHubStrategy = require('passport-github').Strategy;

function configurePassport(passport) {
  // Serialize the entire user object into session
  passport.serializeUser((user, done) => done(null, user));

  // Deserialize from session back into req.user each request
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL
      },
      function verify(accessToken, refreshToken, profile, done) {
        // Build minimal user profile including token for API calls
        const user = {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          photos: profile.photos,
          accessToken
        };
        return done(null, user);
      }
    )
  );
}

module.exports = { configurePassport };
