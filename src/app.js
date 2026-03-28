const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const githubRouter = require('./routes/github.routes');
const { configurePassport } = require('./middleware/passport.middleware');
const logger = require('./utils/logger');

const app = express();

app.use((req, _res, next) => {
  logger.info({ event: 'request', method: req.method, url: req.url });
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

configurePassport(passport);

app.use('/', githubRouter);

module.exports = app;