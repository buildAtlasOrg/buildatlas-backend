# buildatlas-backend

Express backend. GitHub OAuth, fetch repos, push workflow files.

## Setup

```
npm install
node server.js
```

Needs `routes/getGitHubLogin.env`:

```
PORT=5000
SESSION_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
SUPABASE_URL=
SUPABASE_KEY=
```

## Endpoints

```
GET  /auth/github               start OAuth
GET  /auth/github/callback      OAuth callback
GET  /logout                    log out
GET  /api/repos                 get user repos
POST /api/repos/workflows       create workflow in selected repos
```

## Not done yet

- Move access tokens out of session into Supabase
- Pagination on /api/repos
- Session expiry check
- Verify user has write access before creating workflow
- Replace console.log with Winston
- Save workflow job status to DB for retries
