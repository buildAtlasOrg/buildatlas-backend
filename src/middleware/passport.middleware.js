const GitHubStrategy = require('passport-github').Strategy;
const { storeToken } = require('../services/token.service');
const logger = require('../utils/logger');

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
          logger.warn({ event: 'oauth_null_access_token', userId: profile && profile.id });
        }
        if (!profile) {
          logger.warn({ event: 'oauth_null_profile' });
          return done(new Error('No profile returned from GitHub'));
        }

        const user = {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: (profile.photos && profile.photos[0] && profile.photos[0].value) || null,
          email: (profile.emails && profile.emails[0] && profile.emails[0].value) || null,
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
