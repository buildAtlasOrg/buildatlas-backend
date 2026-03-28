function normalizeRepo(repo) {
  if (!repo || typeof repo !== 'object') return null;

  return {
    name:           typeof repo.name === 'string'           ? repo.name           : null,
    url:            typeof repo.html_url === 'string'       ? repo.html_url       : null,
    description:    typeof repo.description === 'string'    ? repo.description    : null,
    language:       typeof repo.language === 'string'       ? repo.language       : null,
    stars:          typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0,
    private:        repo.private === true,
    updated_at:     typeof repo.updated_at === 'string'     ? repo.updated_at     : null,
    owner:          repo.owner && typeof repo.owner.login === 'string' ? repo.owner.login : null,
    default_branch: typeof repo.default_branch === 'string' ? repo.default_branch : 'main'
  };
}

module.exports = { normalizeRepo };
