// Service layer: encapsulates GitHub API calls
const axios = require('axios');

async function fetchUserRepos(accessToken) {
  // Validate required token input
  if (!accessToken) {
    throw new Error('No access token provided');
  }

  // Query GitHub API for user repositories using the OAuth access token
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

  // Normalize response to minimal payload for front-end usage
  return response.data.map(repo => ({
    name: repo.name,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    private: repo.private,
    updated_at: repo.updated_at
  }));
}

module.exports = { fetchUserRepos };
