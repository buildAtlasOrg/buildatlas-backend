# buildatlas-backend

Backend for BuildAtlas — a tool that lets you connect your GitHub account and visualize your CI/CD pipelines as an interactive graph. Instead of reading raw YAML, you see your jobs, dependencies, and statuses as a node/edge diagram.

This repo handles GitHub OAuth, fetches repos and workflow files, and exposes the API the frontend consumes.

---

## Tech Stack

- **Node.js / Express** — HTTP server and routing
- **Passport.js** — GitHub OAuth authentication
- **express-session** — session management
- **express-rate-limit** — rate limiting on API routes
- **Supabase** — database for token and session storage (in progress)
- **Axios** — GitHub REST API calls
- **Winston** — structured logging (in progress)

---

## Project Structure

```
src/
├── app.js                  Express app setup and middleware
├── server.js               Entry point
├── config/
│   └── db.js               Supabase client
├── routes/
│   └── github.routes.js    All route definitions
├── controllers/
│   └── github.controller.js Request handlers
├── middleware/
│   ├── auth.middleware.js   Auth guard (ensureAuth)
│   └── passport.middleware.js GitHub OAuth strategy
├── services/
│   └── github.service.js   GitHub API calls
└── utils/
    └── github.js           Repo data normalization
```

---

## Endpoints

```
GET  /                          Home, redirects based on auth state
GET  /auth/github               Start GitHub OAuth
GET  /auth/github/callback      OAuth callback
GET  /logout                    End session
GET  /api/repos                 Fetch authenticated user's repos
POST /api/repos/workflows       Push workflow file into selected repos
GET  /repos                     Repos page (HTML)
GET  /profile                   Profile page (HTML)
```

---

## Setup

```
npm install
node server.js
```

Create `routes/getGitHubLogin.env`:

```
PORT=5000
SESSION_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
SUPABASE_URL=
SUPABASE_KEY=
```

GitHub OAuth credentials: github.com/settings/developers → OAuth Apps
Supabase credentials: supabase.com → your project → Settings → API

---

## Status

Working:
- GitHub OAuth login flow
- Fetching user repositories from GitHub API
- Pushing workflow YAML files into selected repos
- Rate limiting on API routes

In progress:
- Supabase integration (token storage, session persistence)
- Pipeline visualization (handled in the frontend repo using React Flow)
- Structured logging with Winston