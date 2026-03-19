const path = require('path');
const { fetchUserRepos } = require('../services/github.service');

function home(req, res) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/repos');
  }
  res.sendFile(path.join(__dirname, '../../public/index.html'));
}

async function getRepos(req, res) {
  if (!req.user || !req.user.accessToken) {
    return res.status(401).json({ error: 'No access token found.' });
  }

  try {
    const repos = await fetchUserRepos(req.user.accessToken);
    res.json(repos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repositories', details: error.message });
  }
}

function githubCallback(req, res) {
  console.log('LOGIN CALLBACK – user:', req.user);
  console.log('LOGIN CALLBACK – sessionID:', req.sessionID, 'session:', req.session);
  res.redirect('/repos');
}

function reposPage(req, res) {
  res.sendFile(path.join(__dirname, '../../public/repos.html'));
}

function profilePage(req, res) {
  res.sendFile(path.join(__dirname, '../../public/profile.html'));
}

function loginFailed(req, res) {
  res.json({ message: 'GitHub login failed. Please try again.' });
}

function logout(req, res, next) {
  req.logout(function(err) {
    if (err) return next(err);
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
}

module.exports = {
  home,
  getRepos,
  githubCallback,
  reposPage,
  profilePage,
  loginFailed,
  logout
};