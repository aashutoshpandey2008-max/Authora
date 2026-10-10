import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'node:url';

export function createApp({ store, secret, origin, production = false, demo = false, health = () => true, limits = true }) {
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes.');
  const app = express();
  if (production) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ strictTransportSecurity: production ? undefined : false,
    contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': production ? [] : null } } }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  const cookieName = production ? '__Host-authora' : 'authora';
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', path: '/' };
  const publicUser = u => ({ id: String(u.id), name: u.name, email: u.email, createdAt: u.createdAt });
  const dummyHash = bcrypt.hashSync('timing-comparison-placeholder', 12);
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // JSON + custom header blocks cross-site forms. No cross-origin CORS permission is granted.
      if (!req.is('application/json') || req.get('X-Authora-Client') !== 'web') return res.status(403).json({ error: 'JSON and X-Authora-Client: web are required.' });
      if ((req.get('Origin') && req.get('Origin') !== origin) || req.get('Sec-Fetch-Site') === 'cross-site') return res.status(403).json({ error: 'Request origin is not allowed.' });
    }
    next();
  });
  if (limits) app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Try again in 15 minutes.' } }));
  const authLimit = limits ? rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many authentication attempts. Try again in 15 minutes.' } }) : (req, res, next) => next();
  function issue(res, user) {
    const token = jwt.sign({ ver: user.tokenVersion }, secret, { algorithm: 'HS256', subject: String(user.id), issuer: 'authora', audience: 'authora-web', expiresIn: '1h' });
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: 3600000 });
  }
  async function requireAuth(req, res, next) {
    let claims;
    try {
      claims = jwt.verify(req.cookies[cookieName], secret, { algorithms: ['HS256'], issuer: 'authora', audience: 'authora-web' });
      if (!claims.sub || !Number.isInteger(claims.ver) || !Number.isInteger(claims.exp)) throw new Error();
    } catch { return res.status(401).json({ error: 'Please sign in to continue.' }); }
    const user = await store.byId(claims.sub);
    if (!user || user.tokenVersion !== claims.ver) return res.status(401).json({ error: 'Your session has ended. Please sign in again.' });
    req.user = user; req.claims = claims; next();
  }
  app.get('/api/health', (req, res) => res.status(health() ? 200 : 503).json({ status: health() ? 'ok' : 'unavailable', mode: demo ? 'local-demo' : 'mongodb' }));
  app.post('/api/auth/register', authLimit, async (req, res) => {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Use a name of 2–60 characters, a valid email, and a password of at least 12 characters (maximum 72 bytes).' });
    try {
      const user = await store.create({ name: name.trim(), email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 12) });
      issue(res, user); res.status(201).json({ user: publicUser(user), message: 'Account created.' });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'Unable to create an account with this email. Try signing in.' });
      throw error;
    }
  });
  app.post('/api/auth/login', authLimit, async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Enter a valid email and password.' });
    const user = await store.byEmail(email.trim().toLowerCase());
    const matches = await bcrypt.compare(password, user?.passwordHash || dummyHash);
    if (!user || !matches) return res.status(401).json({ error: 'Email or password is incorrect.' });
    issue(res, user); res.json({ user: publicUser(user), message: 'Welcome back.' });
  });
  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user), expiresAt: new Date(req.claims.exp * 1000) }));
  app.get('/api/protected', requireAuth, (req, res) => res.json({ message: 'Access granted. Your JWT was verified.', user: publicUser(req.user), verifiedAt: new Date() }));
  app.post('/api/auth/logout', requireAuth, async (req, res) => {
    await store.revoke(req.user.id); res.clearCookie(cookieName, cookieOptions); res.json({ message: 'Signed out on all devices.' });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
    console.error('Request failed:', error.name);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
