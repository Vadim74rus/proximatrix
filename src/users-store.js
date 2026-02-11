/**
 * Хранилище пользователей MTProxy: секреты, включён/выключен, API для управления.
 * Файл users.json хранится на диске (при монтировании в Docker сохраняется между перезапусками).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_USERS_PATH = path.join(__dirname, '..', 'users.json');

function ensureUsersFile(filePath = DEFAULT_USERS_PATH) {
  try {
    fs.accessSync(filePath);
  } catch {
    fs.writeFileSync(filePath, JSON.stringify({ users: [] }, null, 2), 'utf8');
  }
}

function load(filePath = DEFAULT_USERS_PATH) {
  ensureUsersFile(filePath);
  const data = fs.readFileSync(filePath, 'utf8');
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed.users) ? parsed : { users: [] };
  } catch {
    return { users: [] };
  }
}

function save(data, filePath = DEFAULT_USERS_PATH) {
  ensureUsersFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generateSecret() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Возвращает список секретов, по которым разрешён доступ (enabled).
 */
function getEnabledSecrets(filePath = DEFAULT_USERS_PATH) {
  const { users } = load(filePath);
  return users.filter(u => u.enabled !== false).map(u => u.secret);
}

/**
 * Добавить пользователя. Возвращает { id, secret, link }.
 */
function addUser(options = {}, filePath = DEFAULT_USERS_PATH) {
  const { name = '', enabled = true } = options;
  const data = load(filePath);
  const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
  const secret = generateSecret();
  const user = {
    id,
    secret,
    name: name || id,
    enabled: !!enabled,
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  save(data, filePath);
  return { id, secret, name: user.name, enabled: user.enabled, createdAt: user.createdAt };
}

/**
 * Обновить пользователя (name, enabled).
 */
function updateUser(id, updates, filePath = DEFAULT_USERS_PATH) {
  const data = load(filePath);
  const idx = data.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  if (updates.name !== undefined) data.users[idx].name = updates.name;
  if (updates.enabled !== undefined) data.users[idx].enabled = !!updates.enabled;
  save(data, filePath);
  return data.users[idx];
}

/**
 * Включить/отключить доступ по id.
 */
function setEnabled(id, enabled, filePath = DEFAULT_USERS_PATH) {
  return updateUser(id, { enabled }, filePath);
}

/**
 * Удалить пользователя (секрет перестаёт работать).
 */
function deleteUser(id, filePath = DEFAULT_USERS_PATH) {
  const data = load(filePath);
  const idx = data.users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  data.users.splice(idx, 1);
  save(data, filePath);
  return true;
}

/**
 * Получить пользователя по id (без полного секрета в ответе для списка).
 */
function getUser(id, filePath = DEFAULT_USERS_PATH) {
  const { users } = load(filePath);
  const u = users.find(u => u.id === id);
  if (!u) return null;
  return { ...u };
}

/**
 * Список всех пользователей (secret можно маскировать для выдачи в списке).
 */
function listUsers(maskSecret = true, filePath = DEFAULT_USERS_PATH) {
  const { users } = load(filePath);
  return users.map(u => ({
    id: u.id,
    name: u.name,
    enabled: u.enabled,
    createdAt: u.createdAt,
    secret: maskSecret ? (u.secret ? u.secret.slice(0, 8) + '…' : '') : u.secret,
  }));
}

module.exports = {
  load,
  save,
  getEnabledSecrets,
  addUser,
  updateUser,
  setEnabled,
  deleteUser,
  getUser,
  listUsers,
  generateSecret,
  DEFAULT_USERS_PATH,
};
