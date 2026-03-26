const GitHubStrategy = require('passport-github').Strategy;
const { storeToken } = require('../services/token.service');

function configurePassport(passport) {
  // Only serialize minimal, non-sensitive identifiers into the session cookie.
  passport.serializeUser((user, done) => {
    done(null, { id: user.id, username: user.username, displayName: user.displayName });
  });

  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL
      },
      async function verify(accessToken, _refreshToken, profile, done) {
        if (!accessToken) {
          console.warn('[SECURITY] GitHub OAuth returned null accessToken for user:', profile.id);
        }
        if (!profile) {
          console.warn('[SECURITY] GitHub OAuth returned null profile');
          return done(new Error('No profile returned from GitHub'));
        }

        const user = {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName
        };

        try {
          await storeToken(profile.id, accessToken);
        } catch (err) {
          return done(err);
        }

        return done(null, user);
      }
    )
  );
}

module.exports = { configurePassport };
