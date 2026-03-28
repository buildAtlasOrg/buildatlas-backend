# buildatlas-backend

Backend for BuildAtlas — a tool that lets you connect your GitHub account and visualize your CI/CD pipelines as an interactive graph. Instead of reading raw YAML, you see your jobs, dependencies, and statuses as a node/edge diagram.

This repo handles GitHub OAuth, fetches repos and workflow files, and exposes the API the frontend consumes.

---

## Tech Stack

- **Node.js / Express** — HTTP server and routing
- **Passport.js** — GitHub OAuth authentication
- **express-session** — session management
- **express-rate-limit** — rate limiting on API routes
- **Supabase** — token storage and audit logging
- **Axios** — GitHub REST API calls
- **Winston** — structured JSON logging

---

## Project Structure

```
src/
├── app.js                        Express app setup and middleware
├── server.js                     Entry point
├── config/
│   └── db.js                     Supabase client
├── routes/
│   └── github.routes.js          All route definitions and rate limiters
├── controllers/
│   └── github.controller.js      Request handlers
├── middleware/
│   ├── auth.middleware.js         Auth guard (ensureAuth) with session age check
│   └── passport.middleware.js    GitHub OAuth strategy
├── services/
│   ├── github.service.js         GitHub API calls (retry, circuit-breaker, cache)
│   ├── token.service.js          Encrypted token storage in Supabase
│   ├── auth-events.service.js    Auth event persistence (login, logout, failures)
│   └── workflow-jobs.service.js  Workflow creation job tracking
├── utils/
│   ├── github.js                 Repo data normalization (explicit field whitelist)
│   ├── crypto.js                 AES-256-GCM encryption/decryption
│   └── logger.js                 Winston structured logger
└── db/
    └── migrations/
        ├── create_user_tokens.sql
        ├── create_auth_events.sql
        └── create_workflow_jobs.sql
```

---

## Endpoints

```
GET  /                          Home — redirects to /repos if authenticated
GET  /auth/github               Start GitHub OAuth
GET  /auth/github/callback      OAuth callback (CSRF state verified)
GET  /logout                    End session and delete stored token
GET  /login-failed              OAuth failure landing page
GET  /api/repos                 Fetch authenticated user's repos (paginated, cached)
POST /api/repos/workflows       Push BuildAtlas workflow into selected repos
GET  /repos                     Repos page (HTML)
GET  /profile                   Profile page (HTML)
```

**Query params for `/api/repos`:**
- `page` — page number (default: 1)
- `limit` — results per page, max 100 (default: 30)

---

## Setup

```
npm install
node src/server.js
```

Create a `.env` file in the project root:

```
PORT=5000
SESSION_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback

SUPABASE_URL=
SUPABASE_KEY=
TOKEN_ENCRYPTION_KEY=    # 64-character hex string (32 bytes) — generate with: openssl rand -hex 32

NODE_ENV=development     # set to 'production' to enable secure cookies
LOG_LEVEL=info           # optional — controls winston log verbosity
WORKFLOW_YAML=           # optional — override the default CI workflow template
```

GitHub OAuth credentials: github.com/settings/developers → OAuth Apps
Supabase credentials: supabase.com → your project → Settings → API

### Database migrations

Run these in order in your Supabase SQL editor:

1. `src/db/migrations/create_user_tokens.sql`
2. `src/db/migrations/create_auth_events.sql`
3. `src/db/migrations/create_workflow_jobs.sql`

---

## Security

- GitHub OAuth tokens encrypted at rest with AES-256-GCM before storage in Supabase
- Only non-sensitive user metadata (id, username, displayName) stored in session cookie
- CSRF state parameter generated and verified on every OAuth callback
- OAuth callback errors from GitHub (access denied, bad code) caught and logged before Passport runs
- Session cookies are `httpOnly`, `sameSite: lax`, and `secure` in production
- Sessions expire after 24 hours and force re-authentication
- Inbound rate limiting: 100 req/15min on `/api/repos`, 20 req/15min on `/api/repos/workflows`
- Write access to each repo verified against GitHub API before creating a workflow file
- All GitHub API tokens validated for format before use

## Reliability

- All outbound GitHub API calls go through a central `githubRequest` helper with:
  - 10-second timeout
  - Exponential backoff retry on 429 / 502 / 503 (respects `Retry-After` header)
  - Circuit-breaker: opens after 5 consecutive server-side failures, attempts recovery after 30s
- GitHub API errors normalized into consistent objects with typed error codes (`TOKEN_INVALID`, `PERMISSION_DENIED`, `CONFLICT`, etc.)
- Repo listings cached in-memory for 1 minute per user/page/limit combination

## Logging

All events logged as structured JSON via Winston.

| Event | Level | Persisted to DB |
|---|---|---|
| `login_success` | info | `auth_events` |
| `login_fail` | warn | `auth_events` |
| `logout` | info | `auth_events` |
| `oauth_null_access_token` | warn | — |
| `oauth_callback_error` | warn | `auth_events` |
| `stale_token_detected` | warn | — |
| `github_api_retry` | warn | — |
| `circuit_open` / `circuit_closed` | error / info | — |
| `workflow_create_error` | warn | `workflow_jobs` |

---

## Status

- GitHub OAuth login flow with CSRF protection
- Encrypted token storage in Supabase
- Paginated repository fetching with TTL cache
- Write access verification before workflow creation
- Workflow job status persisted to DB for auditability
- Inbound and outbound rate limiting with circuit-breaker
- Structured logging with auth event persistence
- Pipeline visualization — handled in the frontend repo using React Flow
