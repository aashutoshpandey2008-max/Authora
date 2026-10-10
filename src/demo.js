import { randomBytes } from 'node:crypto';
import { createApp } from './app.js';
import { memoryStore } from './store.js';
if (process.env.NODE_ENV === 'production') throw new Error('Demo is local-only; use npm start in production.');
createApp({ store: memoryStore(), secret: randomBytes(48).toString('hex'), origin: 'http://localhost:3000', demo: true })
  .listen(3000, '127.0.0.1', () => console.log('Local demo: http://localhost:3000 — accounts reset when stopped.'));
