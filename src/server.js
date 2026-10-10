import mongoose from 'mongoose';
import { createApp } from './app.js';
import { mongoStore } from './store.js';
const production = process.env.NODE_ENV === 'production';
const origin = process.env.APP_ORIGIN || (production ? '' : 'http://localhost:3000');
if (!process.env.MONGO_URI || !process.env.JWT_SECRET || !origin) throw new Error('Set MONGO_URI, JWT_SECRET and APP_ORIGIN in your environment.');
const url = new URL(origin);
if (url.origin !== origin || (production && url.protocol !== 'https:')) throw new Error('APP_ORIGIN must be an origin without a trailing slash; production requires HTTPS.');
const app = createApp({ store: mongoStore, secret: process.env.JWT_SECRET, origin, production, health: () => mongoose.connection.readyState === 1 });
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
await mongoose.model('User').init();
const server = app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Authora ready.'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
});
