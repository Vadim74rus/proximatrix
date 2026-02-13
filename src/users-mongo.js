/**
 * Пользователи MTProxy в MongoDB.
 * Поля: telegramId, username, secret, activatedAt, expiresAt, enabled, createdAt.
 * Активный секрет: enabled === true и (expiresAt отсутствует или expiresAt > сейчас).
 */

const crypto = require('crypto');
const { ObjectId } = require('mongodb');

const COLLECTION = 'users';

let secretsCache = [];
let cacheValid = false;

function generateSecret() {
  return crypto.randomBytes(16).toString('hex');
}

function getCollection() {
  const { getDb } = require('./db');
  const db = getDb();
  if (!db) throw new Error('MongoDB not connected');
  return db.collection(COLLECTION);
}

async function refreshSecretsCache() {
  try {
    const col = getCollection();
    const now = new Date();
    const list = await col.find({
      enabled: { $ne: false },
      secret: { $exists: true, $ne: '' },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    }).project({ secret: 1 }).toArray();
    secretsCache = list.map((d) => d.secret).filter(Boolean);
    cacheValid = true;
    return secretsCache;
  } catch (err) {
    console.error('⚠️  Ошибка обновления кэша секретов:', err.message);
    cacheValid = false;
    return secretsCache;
  }
}

function getEnabledSecretsSync() {
  return secretsCache;
}

async function invalidateCache() {
  cacheValid = false;
  try {
    await refreshSecretsCache();
  } catch (_) {
    // При ошибке оставляем старый кэш до следующей успешной попытки
  }
}

async function addUser(data = {}) {
  const col = getCollection();
  const now = new Date();
  const doc = {
    telegramId: data.telegramId != null ? String(data.telegramId) : null,
    username: data.username != null ? String(data.username) : (data.name || '') || null,
    secret: data.secret || generateSecret(),
    activatedAt: data.activatedAt ? new Date(data.activatedAt) : now,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    enabled: data.enabled !== false,
    createdAt: now,
    allowedIPs: [], // Разрешенные IP адреса
    connectionHistory: [], // История подключений
    lastConnectionIP: null,
    lastConnectionTime: null,
  };
  const r = await col.insertOne(doc);
  doc._id = r.insertedId;
  doc.id = doc._id.toString();
  await invalidateCache();
  return doc;
}

async function updateUser(id, updates) {
  const col = getCollection();
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  if (!oid) return null;
  const set = {};
  if (updates.telegramId !== undefined) set.telegramId = String(updates.telegramId);
  if (updates.username !== undefined) set.username = String(updates.username);
  if (updates.name !== undefined) set.username = String(updates.name);
  if (updates.activatedAt !== undefined) set.activatedAt = new Date(updates.activatedAt);
  if (updates.expiresAt !== undefined) set.expiresAt = updates.expiresAt == null ? null : new Date(updates.expiresAt);
  if (updates.enabled !== undefined) set.enabled = !!updates.enabled;
  const r = await col.updateOne({ _id: oid }, { $set: set });
  if (r.modifiedCount || r.matchedCount) await invalidateCache();
  const doc = await col.findOne({ _id: oid });
  return doc ? toUser(doc) : null;
}

async function setEnabled(id, enabled) {
  return updateUser(id, { enabled });
}

async function deleteUser(id) {
  const col = getCollection();
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  if (!oid) return false;
  const r = await col.deleteOne({ _id: oid });
  if (r.deletedCount) await invalidateCache();
  return r.deletedCount > 0;
}

async function getUser(id) {
  const col = getCollection();
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  if (!oid) return null;
  const doc = await col.findOne({ _id: oid });
  return doc ? toUser(doc) : null;
}

async function listUsers(maskSecret = true) {
  const col = getCollection();
  const list = await col.find({}).sort({ createdAt: -1 }).toArray();
  return list.map((d) => ({
    id: d._id.toString(),
    telegramId: d.telegramId,
    username: d.username,
    secret: maskSecret && d.secret ? d.secret.slice(0, 8) + '…' : d.secret,
    activatedAt: d.activatedAt,
    expiresAt: d.expiresAt,
    enabled: d.enabled,
    createdAt: d.createdAt,
  }));
}

async function getUserBySecret(secret) {
  const col = getCollection();
  const doc = await col.findOne({ secret: secret });
  return doc ? toUser(doc) : null;
}

async function logConnection(secret, ip, status, reason = null) {
  const col = getCollection();
  const user = await col.findOne({ secret: secret });
  if (!user) return;

  const now = new Date();
  const logEntry = {
    ip: ip,
    status: status, // 'connected', 'disconnected', 'blocked'
    reason: reason,
    timestamp: now,
  };

  // Добавляем в историю (храним последние 100 записей)
  const history = user.connectionHistory || [];
  history.push(logEntry);
  if (history.length > 100) {
    history.shift(); // Удаляем старые записи
  }

  const update = {
    connectionHistory: history,
    lastConnectionIP: ip,
    lastConnectionTime: now,
  };

  // Если это первое подключение, добавляем IP в разрешенные
  if (status === 'connected' && (!user.allowedIPs || user.allowedIPs.length === 0)) {
    update.allowedIPs = [ip];
  }

  await col.updateOne({ _id: user._id }, { $set: update });
}

async function getConnectionHistory(userId, limit = 50) {
  const col = getCollection();
  const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
  if (!oid) return null;
  
  const doc = await col.findOne({ _id: oid }, { projection: { connectionHistory: 1 } });
  if (!doc) return null;
  
  const history = (doc.connectionHistory || []).slice(-limit);
  return history.reverse(); // Новые сверху
}

async function resetAllowedIPs(userId) {
  const col = getCollection();
  const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
  if (!oid) return null;
  
  await col.updateOne({ _id: oid }, { $set: { allowedIPs: [] } });
  const doc = await col.findOne({ _id: oid });
  return doc ? toUser(doc) : null;
}

function toUser(doc) {
  return {
    id: doc._id.toString(),
    telegramId: doc.telegramId,
    username: doc.username,
    secret: doc.secret,
    activatedAt: doc.activatedAt,
    expiresAt: doc.expiresAt,
    enabled: doc.enabled,
    createdAt: doc.createdAt,
    allowedIPs: doc.allowedIPs || [],
    connectionHistory: doc.connectionHistory ? doc.connectionHistory.slice(-10) : [], // Последние 10 для списка
    lastConnectionIP: doc.lastConnectionIP,
    lastConnectionTime: doc.lastConnectionTime,
  };
}

module.exports = {
  getEnabledSecretsSync,
  refreshSecretsCache,
  getEnabledSecrets: refreshSecretsCache,
  addUser,
  updateUser,
  setEnabled,
  deleteUser,
  getUser,
  getUserBySecret,
  listUsers,
  generateSecret,
  logConnection,
  getConnectionHistory,
  resetAllowedIPs,
};
