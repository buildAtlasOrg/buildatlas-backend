const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const githubRouter = require('./routes/github.routes');
const { configurePassport } = require('./middleware/passport.middleware');
const logger = require('./utils/logger');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

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