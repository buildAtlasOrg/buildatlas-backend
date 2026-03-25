BUILDATLAS TODO
===============

-- SECURITY (do these first) --

Move tokens out of session/cookies into encrypted DB storage
  src/middleware/passport.middleware.js, middleware/passportConfig.js

Rotate session ID on logout (session fixation)
  src/controllers/github.controller.js, controllers/githubController.js

Add CSRF state param verification on OAuth callback
  src/controllers/github.controller.js, routes/github.js

Remove plaintext session/token dump from logs
  middleware/authMiddleware.js, controllers/githubController.js

Do not log full session object, only non-sensitive metadata
  controllers/githubController.js

Handle invalid/expired callback tokens with clear error
  routes/github.js


-- VALIDATION --

Validate req.body.selected before hitting GitHub API (schema check)
  src/controllers/github.controller.js, controllers/githubController.js

Confirm user has write access to each repo before creating workflow
  src/controllers/github.controller.js

Validate req.user.accessToken before API call, handle stale tokens
  src/controllers/github.controller.js, controllers/githubController.js

Enforce token format check before passing to GitHub
  services/githubServices.js

Strip unsafe fields from GitHub API response, add safe defaults
  src/utils/github.js


-- RELIABILITY --

Add rate limiting on all API routes
  src/routes/github.routes.js, routes/github.js

Add rate limiter / circuit-breaker on outbound GitHub API calls
  src/services/github.service.js

Add exponential backoff/retry for 502/503/429 from GitHub
  services/githubServices.js

Add session age check, force re-auth when session is too old
  src/middleware/auth.middleware.js, middleware/authMiddleware.js

Handle 409 conflict and 403 corp policy errors from GitHub
  services/githubServices.js

Normalize GitHub API errors into consistent error objects
  src/services/github.service.js


-- FEATURES --

Add pagination (page/limit) to /api/repos
  src/controllers/github.controller.js, controllers/githubController.js

Add short TTL caching on /api/repos
  controllers/githubController.js

Save workflow creation requests/status to DB for retryable jobs
  src/controllers/github.controller.js

Add GitHub App installation token support (alternative to OAuth)
  services/githubServices.js, middleware/passportConfig.js

Implement refresh token management
  middleware/passportConfig.js

Return JSON for unauthenticated API requests instead of redirecting
  src/middleware/auth.middleware.js


-- LOGGING --

Replace all console.logs with structured logger (winston/pino)
  src/services/github.service.js, controllers/githubController.js

Add structured logging for login_fail and logout events
  routes/github.js

Persist auth events to DB for incident investigation
  routes/github.js

Store error events in persistent audit table
  controllers/githubController.js

Log and monitor unexpected null accessToken values
  src/middleware/passport.middleware.js


-- CLEANUP --

Make workflow YAML template configurable, not hardcoded
  src/services/github.service.js

Use least-privilege OAuth scopes, document why each is needed
  src/routes/github.routes.js, routes/github.js
