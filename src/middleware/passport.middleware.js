const GitHubStrategy = require('passport-github').Strategy;

function configurePassport(passport) {
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL
      },
      function verify(accessToken, refreshToken, profile, done) {
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