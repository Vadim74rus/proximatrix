/**
 * Подключение к MongoDB.
 * URI из config.mongo.uri или переменной MONGODB_URI.
 */

const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connect(uri) {
  if (db) return db;
  client = new MongoClient(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxIdleTimeMS: 60000,
  });
  await client.connect();
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  const dbName = (match && match[1] && match[1] !== 'admin') ? match[1] : 'proximatrix';
  db = client.db(dbName);
  return db;
}

function getDb() {
  return db;
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { connect, getDb, close };
