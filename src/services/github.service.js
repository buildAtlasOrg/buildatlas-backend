const axios = require('axios');
const { normalizeRepo } = require('../utils/github');

async function fetchUserRepos(accessToken) {
  if (!accessToken) {
    throw new Error('No access token provided');
  }

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

  return response.data.map(repo => normalizeRepo(repo));
}

module.exports = { fetchUserRepos };