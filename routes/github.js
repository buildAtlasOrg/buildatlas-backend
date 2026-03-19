require('dotenv').config({ path: './routes/getGitHubLogin.env' });
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const path = require('path');
const axios = require('axios');
const app = express();

// Log requests for debugging
app.use((req, res, next) => {
    console.log('[REQ]', req.method, req.url);
    next();
});

// Serve static files from public directory (absolute path)
console.log('STATIC DIR:', path.resolve(__dirname, '../public'));
app.use(express.static(path.resolve(__dirname, '../public')));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false, // Set to true in production with HTTPS
            sameSite: "lax"
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Github OAuth Strategy
passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL
        },
        function verify(accessToken, refreshToken, profile, done) {
            profile.accessToken = accessToken;
            return done(null, {
                id: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                photos: profile.photos,
                accessToken: accessToken
            });
        }
    )
);

// Home page
app.get('/', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.redirect('/repos');
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Fetch authenticated user's repos
app.get('/api/repos', async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const accessToken = req.user && req.user.accessToken;
    if (!accessToken) {
        return res.status(401).json({ error: 'No access token found.' });
    }
    try {
        const response = await axios.get('https://api.github.com/user/repos', {
            headers: {
                Authorization: `token ${accessToken}`,
                'User-Agent': 'buildatlas-app'
            },
            params: {
                per_page: 100,
                sort: 'updated'
            }
        });
        console.log('GITHUB SCOPES:', response.headers['x-oauth-scopes'], response.headers['x-accepted-oauth-scopes']);
        const repos = response.data.map(repo => ({
            name: repo.name,
            url: repo.html_url,
            description: repo.description,
            language: repo.language,
            stars: repo.stargazers_count,
            private: repo.private,
            updated_at: repo.updated_at
        }));
        res.json(repos);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch repositories', details: error.message });
    }
});

// Start GitHub login
app.get(
    '/auth/github',
    passport.authenticate('github', { scope: ['user:email', 'read:user', 'repo'] })
);

// ✅ GitHub OAuth callback — this was MISSING and is required for login to complete
app.get(
    '/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login-failed' }),
    (req, res) => {
        console.log('LOGIN CALLBACK – user:', req.user);
        console.log('LOGIN CALLBACK – sessionID:', req.sessionID, 'session:', req.session);
        res.redirect('/repos');
    }
);

// Repos page — served after login
app.get('/repos', ensureAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/repos.html'));
});

// Protected middleware
function ensureAuth(req, res, next) {
    console.log('ensureAuth:', {
        isAuthenticated: req.isAuthenticated && req.isAuthenticated(),
        user: req.user,
        sessionID: req.sessionID,
        session: req.session
    });
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

app.get('/profile', ensureAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/profile.html'));
});

app.get('/login-failed', (req, res) => {
    res.json({ message: 'GitHub login failed. Please try again.' });
});

app.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) return next(err);
        req.session.destroy(() => {
            res.redirect('/');
        });
    });
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on http://localhost:${process.env.PORT || 5000}`);
});
