# Authora — User Authentication & JWT

A complete Workora internship project by Aashutosh Pandey. Node.js + Express + MongoDB, with a responsive frontend served by the same app. No frontend build or separate frontend deployment is required.

## Start here

For a quick local preview without database setup:

```bash
npm ci
npm run demo
```

Open http://localhost:3000 and create an account. **Demo accounts live in memory and reset when the server stops.** Demo mode cannot run with NODE_ENV=production. The normal start command always requires MongoDB and never silently falls back to memory.

For the real application:

1. Install Node.js 24 LTS.
2. Run `npm ci` in this folder.
3. Copy `.env.example` to `.env` (Windows PowerShell: `Copy-Item .env.example .env`).
4. Set `MONGO_URI` to your MongoDB Atlas URI with a database name, e.g. `/authora?retryWrites=true&w=majority`. Use the database user's password, URL-encoded if it contains reserved characters. Configure Atlas network access for your deployment.
5. Generate a secret with the following command and paste the result into `JWT_SECRET` in `.env`:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

6. Leave `APP_ORIGIN=http://localhost:3000` for local use. Run `npm start`.
7. Visit http://localhost:3000. Register, test the protected route, reload, sign out, and sign in again.

Never commit `.env` or paste real credentials into a public issue or screenshot.

## Features

- Registration, login, profile, protected API example, logout.
- bcrypt with cost 12; passwords 12+ characters and at most 72 UTF-8 bytes to prevent silent bcrypt truncation.
- HS256 JWT with issuer, audience, subject, session version, and one-hour expiry validation.
- HTTP-only, SameSite=Strict cookies; Secure and __Host- prefix in production. No JWT in localStorage or JSON responses.
- Logout revokes all the account's existing sessions through a database token version.
- Unique, case-normalized email; safe field extraction prevents query operator injection.
- JSON-only mutation routes, required custom header, Origin validation, cross-site fetch rejection, no cross-origin CORS grants.
- Helmet/CSP headers, API no-store, request body limits, authentication rate limiting, sanitized server errors.
- Responsive interface, labeled forms, password visibility toggle, loading/error states, automatic expiry handling, protected API playground.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Database readiness (200/503) |
| POST | `/api/auth/register` | `{name,email,password}`; create account and session |
| POST | `/api/auth/login` | `{email,password}`; create session |
| GET | `/api/auth/me` | Authenticated profile and session expiry |
| GET | `/api/protected` | JWT-protected demonstration |
| POST | `/api/auth/logout` | Revoke all sessions; clear cookie |

Every POST must include `Content-Type: application/json` and `X-Authora-Client: web`. Cookies are sent by the browser or Postman cookie jar. Logout body is `{}`. Successful auth responds with public user data, never the password/hash/token. Unknown API endpoints return JSON 404; `/` serves the interface.

Typical responses: 201 registration, 200 success, 400 validation, 401 missing/invalid session or invalid login, 403 CSRF/origin, 409 duplicate email, 413 body too large, 429 rate limit.

## Postman submission proof

Import `postman/Authora.postman_collection.json` and `postman/Authora.local.postman_environment.json`. Select the environment; use its local baseUrl or replace it with your Render URL. Keep Postman's cookie jar enabled. The collection generates a unique email per run. Run requests **in order**: health → protected without login → register → profile → protected → logout → rejected after logout → login → wrong password. Built-in assertions verify expected results. Use a fresh cookie jar before the collection run; the register request generates a new account each time.

## Deploy to Render (one web service)

The included `render.yaml` is prepared for a Node web service and generates JWT_SECRET automatically through a Blueprint. You can also deploy manually:

1. Create a GitHub repository named `Authora` and push this folder's contents, including `package-lock.json`. Do not upload `node_modules` or `.env`.
2. In Render, create a **Web Service** from the repository.
3. Runtime: Node. Build command: `npm ci --omit=dev`. Start command: `npm start`. Health check: `/api/health`.
4. Set `NODE_ENV=production`, `NODE_VERSION=24.19.0`, `MONGO_URI` (real Atlas URI), `JWT_SECRET` (generated random secret), and `APP_ORIGIN` (the exact HTTPS service URL, without trailing slash).
5. Deploy. If the URL is only available after service creation, set APP_ORIGIN then redeploy.
6. Open the service URL. This is also your frontend/demo link. Verify register, reload, logout and login. Set Postman's baseUrl to the same origin.

Blueprint alternative: New → Blueprint → select repository → supply MONGO_URI and APP_ORIGIN. Check the proposed service name/URL before supplying APP_ORIGIN. Render generates JWT_SECRET.

Sources: https://render.com/docs/blueprint-spec and https://expressjs.com/en/advanced/best-practice-security.html

## Testing

```bash
npm test
```

The 14 automated API/security tests exercise the real Express middleware, bcrypt, and JWT against an isolated memory store. No database credentials are needed.

For a real MongoDB integration check, set TEST_MONGO_URI to a disposable database and run:

```bash
node --env-file-if-exists=.env scripts/mongo-check.js
```

It creates and removes one unique test account, reconnects to verify persistence, checks duplicate email rejection, and checks session revocation. It does not erase collections.

## Structure

- `src/app.js` — routes, middleware, validation and cookies
- `src/store.js` — Mongoose model/repository and isolated demo/test store
- `src/server.js` — database startup, configuration and shutdown
- `src/demo.js` — explicit local-only preview
- `public/` — frontend HTML/CSS/JS
- `test/` — automated API/security tests
- `scripts/mongo-check.js` — real database integration check
- `postman/` — submission-ready collection and local environment
- `.github/workflows/test.yml` — automated test workflow
- `render.yaml` — deployment configuration

## Scope and operational notes

This fulfills the assigned registration/login/bcrypt/JWT/protected-route project. Email verification, password reset, MFA, refresh tokens, and account deletion are not implemented. Emails are identifiers, not verified identities. Registration can disclose that an email is already registered. Sessions expire after one hour and require signing in again. Logout intentionally signs out all devices. One single Render instance is assumed; the rate limiter is in-process, so use a shared limiter store before scaling horizontally. MongoDB uniqueness is enforced by an index initialized before serving requests. Treat unexpected errors and dependency updates as maintenance work; this is not a claim of an independent security audit.
