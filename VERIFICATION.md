# Verification — 8 October 2026

Passed:
- 14 API/security tests using the real Express app, bcrypt and JWT with an isolated memory repository.
- Frontend JavaScript syntax check.
- Render Blueprint validation against https://render.com/schema/render.yaml.json.
- Production dependency audit: zero known vulnerabilities reported at verification time.

Not verified in this environment:
- Real MongoDB integration: the downloaded MongoDB process was denied an operating-system operation and could not start. Use `npm run test:mongo` with TEST_MONGO_URI pointing to a disposable Atlas/local database.
- Browser flow and rendered desktop/mobile layout: Chromium downloaded successfully from its fallback mirror, but process startup was denied a required socket operation. No browser screenshots or browser test success are claimed.
- Live deployment, cloud credentials and GitHub push: intentionally left for the owner; none configured.

Reproduce the browser check on your machine:
1. `npm ci`
2. `npx playwright install chromium`
3. In one terminal: `npm run demo`
4. In another terminal, from the project folder: `node scripts/browser-check.cjs`

The browser check registers a unique account, tests the protected API, reloads the session, logs out, logs in again, checks mobile overflow and captures screenshots in test-results/. The demo must be running before the check. It uses Playwright's bundled Chromium executable. Accounts persist only during the demo process.
