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
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
  ],
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

// Serve built Vite app at /app (production)
const appDist = path.join(__dirname, '../../buildatlas-frontend/dist');
app.use('/app', express.static(appDist));
app.get('/app/*', (_req, res) => {
  res.sendFile(path.join(appDist, 'index.html'));
});

// Serve built Next.js website at / (production)
const websiteOut = path.join(__dirname, '../../buildatlas-website/out');
app.use(express.static(websiteOut));
app.get('*', (_req, res) => {
  res.sendFile(path.join(websiteOut, '404.html'));
});

app.use((err, req, res, next) => {
  console.error('[ERROR HANDLER] message:', err.message);
  console.error('[ERROR HANDLER] stack:', err.stack);
  console.error('[ERROR HANDLER] status:', err.status || err.statusCode);
  res.status(err.status || err.statusCode || 500).json({ error: err.message });
});

module.exports = app;