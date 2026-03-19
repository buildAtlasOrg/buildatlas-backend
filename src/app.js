const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const githubRouter = require('./routes/github.routes');
const { configurePassport } = require('./middleware/passport.middleware');

const app = express();

app.use((req, res, next) => {
  console.log('[REQ]', req.method, req.url);
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

configurePassport(passport);

app.use('/', githubRouter);

module.exports = app;