import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app.js';
import { memoryStore } from '../src/store.js';
const secret = 'test-only-secret-with-at-least-32-bytes';
const origin = 'http://localhost:3000';
const store = memoryStore();
const app = createApp({ store, secret, origin, limits: false });
const post = (path, body) => request(app).post(path).set('X-Authora-Client', 'web').send(body);
const account = { name: 'Aashutosh Pandey', email: 'aashutosh@example.com', password: 'a-long-test-passphrase' };
let cookie, user;
before(async () => {
 const res = await post('/api/auth/register', account);
 assert.equal(res.status, 201); user = res.body.user; cookie = res.headers['set-cookie'][0].split(';')[0];
});
test('registration hashes passwords and never returns secrets', async () => {
 const saved = await store.byEmail(account.email); assert.notEqual(saved.passwordHash, account.password);
 assert.equal(await bcrypt.compare(account.password, saved.passwordHash), true);
 assert.equal(user.passwordHash, undefined); assert.equal(user.tokenVersion, undefined);
 assert.equal(bcrypt.getRounds(saved.passwordHash), 12);
});
test('unauthenticated protected routes return 401', async () => { for (const path of ['/api/auth/me','/api/protected']) assert.equal((await request(app).get(path)).status, 401); });
test('valid cookie grants access and profile', async () => {
 assert.equal((await request(app).get('/api/protected').set('Cookie', cookie)).status, 200);
 const res = await request(app).get('/api/auth/me').set('Cookie', cookie); assert.equal(res.body.user.email, account.email); assert.ok(res.body.expiresAt);
});
test('case-normalized duplicate email is rejected', async () => { assert.equal((await post('/api/auth/register', { ...account, email: account.email.toUpperCase() })).status, 409); });
test('invalid inputs, short password, bcrypt byte overflow and NoSQL objects rejected', async () => {
 for (const data of [{...account, name:''},{...account,email:'bad'},{...account,password:'short'},{...account,password:'🚀'.repeat(20)},{...account,email:{$ne:null}}]) assert.equal((await post('/api/auth/register', data)).status,400);
 assert.equal((await post('/api/auth/login', {email:{$ne:null},password:'x'})).status,400);
});
test('incorrect and unknown credentials use generic failure', async () => {
 const wrong = await post('/api/auth/login', {...account,password:'wrong'});
 const unknown = await post('/api/auth/login', {...account,email:'unknown@example.com'});
 assert.equal(wrong.status,401); assert.deepEqual(wrong.body,unknown.body);
});
test('login sets HTTP-only strict cookie and returns no token', async () => {
 const res = await post('/api/auth/login', account); assert.equal(res.status,200);
 assert.match(res.headers['set-cookie'][0], /HttpOnly/); assert.match(res.headers['set-cookie'][0], /SameSite=Strict/); assert.equal(res.body.token,undefined);
});
test('forged, expired, wrong audience, issuer and algorithm tokens rejected', async () => {
 const base = {sub:user.id,ver:0};
 const good = {algorithm:'HS256',issuer:'authora',audience:'authora-web',expiresIn:'1h'};
 const tokens = [jwt.sign(base,'wrong-secret',good),jwt.sign(base,secret,{...good,expiresIn:-1}),jwt.sign(base,secret,{...good,audience:'other'}),jwt.sign(base,secret,{...good,issuer:'other'}),jwt.sign(base,secret,{...good,algorithm:'HS384'}),'not.a.token'];
 for (const token of tokens) assert.equal((await request(app).get('/api/protected').set('Cookie','authora='+token)).status,401);
});
test('CSRF defenses reject absent custom header, foreign origin and cross-site fetch', async () => {
 assert.equal((await request(app).post('/api/auth/login').send(account)).status,403);
 assert.equal((await request(app).post('/api/auth/login').set('X-Authora-Client','web').set('Origin','https://evil.example').send(account)).status,403);
 assert.equal((await request(app).post('/api/auth/login').set('X-Authora-Client','web').set('Sec-Fetch-Site','cross-site').send(account)).status,403);
 assert.equal((await request(app).post('/api/auth/login').set('X-Authora-Client','web').set('Origin',origin).send(account)).status,200);
});
test('malformed and oversized JSON have controlled errors', async () => {
 assert.equal((await request(app).post('/api/auth/login').set('Content-Type','application/json').send('{')).status,400);
 assert.equal((await post('/api/auth/login',{text:'x'.repeat(11000)})).status,413);
});
test('production cookie is Secure with __Host prefix', async () => {
 const prod = createApp({store,secret,origin:'https://example.com',production:true,limits:false});
 const res = await request(prod).post('/api/auth/login').set('X-Authora-Client','web').send(account);
 assert.match(res.headers['set-cookie'][0], /^__Host-authora=/); assert.match(res.headers['set-cookie'][0], /; Secure/);
});
test('logout invalidates previously issued JWTs server-side', async () => {
 const res = await request(app).post('/api/auth/logout').set('X-Authora-Client','web').set('Cookie',cookie).send({});
 assert.equal(res.status,200); assert.equal((await request(app).get('/api/protected').set('Cookie',cookie)).status,401);
});
test('security headers, API no-store and landing page are present', async () => {
 const res = await request(app).get('/'); assert.equal(res.status,200); assert.ok(res.headers['content-security-policy']);
 assert.equal(res.headers['x-powered-by'],undefined); assert.equal((await request(app).get('/api/health')).headers['cache-control'],'no-store');
});
test('authentication attempts are rate limited', async () => {
 const limited = createApp({store,secret,origin});
 for(let i=0;i<20;i++) await request(limited).post('/api/auth/login').set('X-Authora-Client','web').send({});
 const res = await request(limited).post('/api/auth/login').set('X-Authora-Client','web').send({}); assert.equal(res.status,429);
});
