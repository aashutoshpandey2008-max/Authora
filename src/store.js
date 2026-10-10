import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
const schema = new mongoose.Schema({
  name: { type: String, required: true }, email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });
const User = mongoose.model('User', schema);
export const mongoStore = {
  async create(data) { return User.create(data); },
  async byEmail(email) { return User.findOne({ email }).select('+passwordHash'); },
  async byId(id) { return mongoose.isValidObjectId(id) ? User.findById(id) : null; },
  async revoke(id) { await User.findByIdAndUpdate(id, { $inc: { tokenVersion: 1 } }); },
};
// Only used by tests and the explicitly requested local demo command.
export function memoryStore() {
  const users = new Map();
  return {
    async create(data) {
      if ([...users.values()].some(u => u.email === data.email)) throw Object.assign(new Error('Duplicate'), { code: 11000 });
      const user = { ...data, id: randomUUID(), tokenVersion: 0, createdAt: new Date() };
      users.set(user.id, user); return user;
    },
    async byEmail(email) { return [...users.values()].find(u => u.email === email); },
    async byId(id) { return users.get(id); },
    async revoke(id) { const user = users.get(id); if (user) user.tokenVersion++; },
  };
}
