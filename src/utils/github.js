function normalizeRepo(repo) {
  // TODO(intern): enforce explicit fields and strip any GH API fields that could contain unsafe data.
  // TODO(intern): add safe defaults / auditing for missing owner/default_branch values.
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