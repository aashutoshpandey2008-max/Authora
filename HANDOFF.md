# Handoff — Authora

## Already built

Registration, login, bcrypt hashing, signed JWT cookies, protected middleware, profile/dashboard, logout with revocation, validation, security headers, CSRF defenses, rate limits, responsive frontend, automated tests, Postman collection, CI workflow and Render configuration.

## Your remaining steps

1. Extract the project and run `npm ci` then `npm run demo` for an immediate preview.
2. Create a new GitHub repository (suggested name: `Authora`). Push the extracted project, not the ZIP file.
3. Add your MongoDB Atlas URI and a generated JWT_SECRET to local `.env` or Render environment variables.
4. Deploy one Render Web Service using README.md. Set APP_ORIGIN to the exact live HTTPS origin.
5. Run the Postman collection against the live URL and capture proof.
6. Submit your GitHub repository URL and either the Postman collection or live demo URL to Workora.

Git commands after creating an EMPTY GitHub repository:

```bash
git init
git add .
git commit -m "Build Authora authentication and JWT project"
git branch -M main
git remote add origin https://github.com/aashutoshpandey2008-max/Authora.git
git push -u origin main
```

If GitHub generates a different repository URL, use that exact URL. No repository has been created or pushed by this delivery, and no cloud service has been provisioned.

## Submission description

Authora implements user registration and login with Node.js, Express and MongoDB. Passwords are hashed using bcrypt before storage. Signed, expiring JWTs are delivered through HTTP-only cookies and verified by middleware to protect account and API routes. The project includes a responsive demo interface, session revocation on logout, validation, request protections, automated tests and a Postman collection.

## Verification status

14 API/security tests pass, and the Render Blueprint validates. MongoDB integration and browser visual checks remain pending because this environment blocked the required processes. See VERIFICATION.md for commands and exact limitations.
