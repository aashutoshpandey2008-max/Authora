import mongoose from 'mongoose';
import request from 'supertest';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { mongoStore } from '../src/store.js';
// Run only against a disposable test database; this script creates and removes one account.
if (!process.env.TEST_MONGO_URI) throw new Error('Set TEST_MONGO_URI to a disposable MongoDB database.');
const email = `integration-${randomUUID()}@example.com`;
await mongoose.connect(process.env.TEST_MONGO_URI);
try {
 await mongoose.model('User').init();
 const app = createApp({store:mongoStore,secret:'integration-test-secret-at-least-32-bytes',origin:'http://localhost:3000',limits:false});
 const reg = await request(app).post('/api/auth/register').set('X-Authora-Client','web').send({name:'Integration Test',email,password:'integration-test-passphrase'});
 assert.equal(reg.status,201); const cookie=reg.headers['set-cookie'][0].split(';')[0];
 await mongoose.disconnect(); await mongoose.connect(process.env.TEST_MONGO_URI);
 assert.equal((await request(app).get('/api/protected').set('Cookie',cookie)).status,200);
 const duplicate=await request(app).post('/api/auth/register').set('X-Authora-Client','web').send({name:'Integration Test',email,password:'integration-test-passphrase'});assert.equal(duplicate.status,409);
 await request(app).post('/api/auth/logout').set('X-Authora-Client','web').set('Cookie',cookie).send({});
 assert.equal((await request(app).get('/api/protected').set('Cookie',cookie)).status,401);
 console.log('PASS: MongoDB registration, reconnect persistence, unique email, session revocation.');
} finally { await mongoose.model('User').deleteOne({email}); await mongoose.disconnect(); }
