function normalizeRepo(repo) {
  return {
    name: repo.name,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    private: repo.private,
    updated_at: repo.updated_at
  };
}

module.exports = { normalizeRepo };