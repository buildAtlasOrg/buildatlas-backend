function normalizeRepo(repo) {
  return {
    name: repo.name,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    private: repo.private,
    updated_at: repo.updated_at,
    owner: repo.owner && repo.owner.login ? repo.owner.login : null,
    default_branch: repo.default_branch || 'main'
  };
}

module.exports = { normalizeRepo };