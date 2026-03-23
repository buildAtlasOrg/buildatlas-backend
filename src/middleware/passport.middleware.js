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
        // TODO: switch to minimal session objects; move tokens into encrypted DB storage to reduce risk if cookies are stolen.
        // TODO: log and monitor unexpected null accessToken values for security incidents.
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