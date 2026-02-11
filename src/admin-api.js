/**
 * API управления пользователями MTProxy (MongoDB).
 * Защита: заголовок X-API-Key или query ?apiKey=...
 */

const http = require('http');
const usersMongo = require('./users-mongo');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function getApiKey(req) {
  return req.headers['x-api-key'] || new URL(req.url || '', 'http://x').searchParams.get('apiKey') || '';
}

function send(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

function createServer(options = {}) {
  const { apiKey = '', port = 9090, host = '127.0.0.1', publicIp = '77.221.156.12', mtPort = 8444 } = options;

  const server = http.createServer(async (req, res) => {
    if (apiKey && getApiKey(req) !== apiKey) {
      send(res, 401, { error: 'Invalid or missing API key' });
      return;
    }

    const url = new URL(req.url || '/', 'http://' + host);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const method = req.method;

    try {
      if (pathname === '/api/users' && method === 'GET') {
        const list = await usersMongo.listUsers(true);
        return send(res, 200, { users: list });
      }

      if (pathname === '/api/users' && method === 'POST') {
        const body = await parseBody(req);
        const user = await usersMongo.addUser({
          telegramId: body.telegramId,
          username: body.username || body.name,
          name: body.name || body.username,
          activatedAt: body.activatedAt,
          expiresAt: body.expiresAt,
          enabled: body.enabled !== false,
        });
        const link = `https://t.me/proxy?server=${publicIp}&port=${mtPort}&secret=${user.secret}`;
        return send(res, 201, {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          secret: user.secret,
          link,
          activatedAt: user.activatedAt,
          expiresAt: user.expiresAt,
          enabled: user.enabled,
          createdAt: user.createdAt,
        });
      }

      const match = pathname.match(/^\/api\/users\/([^/]+)\/?(link)?$/);
      if (match) {
        const [, id, linkOnly] = match;
        const user = await usersMongo.getUser(id);
        if (!user) return send(res, 404, { error: 'User not found' });

        if (linkOnly === 'link') {
          return send(res, 200, {
            id: user.id,
            link: `https://t.me/proxy?server=${publicIp}&port=${mtPort}&secret=${user.secret}`,
          });
        }

        if (method === 'GET') {
          return send(res, 200, user);
        }

        if (method === 'PATCH') {
          const body = await parseBody(req);
          const updated = await usersMongo.updateUser(id, {
            telegramId: body.telegramId,
            username: body.username,
            name: body.name,
            activatedAt: body.activatedAt,
            expiresAt: body.expiresAt,
            enabled: body.enabled,
          });
          return send(res, 200, updated);
        }

        if (method === 'DELETE') {
          const ok = await usersMongo.deleteUser(id);
          return send(res, 200, { deleted: ok });
        }
      }

      const disableMatch = pathname.match(/^\/api\/users\/([^/]+)\/disable$/);
      if (disableMatch && method === 'POST') {
        const id = disableMatch[1];
        const u = await usersMongo.setEnabled(id, false);
        if (!u) return send(res, 404, { error: 'User not found' });
        return send(res, 200, { id, enabled: false });
      }

      const enableMatch = pathname.match(/^\/api\/users\/([^/]+)\/enable$/);
      if (enableMatch && method === 'POST') {
        const id = enableMatch[1];
        const u = await usersMongo.setEnabled(id, true);
        if (!u) return send(res, 404, { error: 'User not found' });
        return send(res, 200, { id, enabled: true });
      }

      send(res, 404, { error: 'Not found' });
    } catch (err) {
      console.error('API Error:', err);
      send(res, 500, { error: err.message || 'Internal error' });
    }
  });

  return server;
}

function start(options) {
  return new Promise((resolve, reject) => {
    const server = createServer(options);
    server.listen(options.port || 9090, options.host || '0.0.0.0', () => resolve(server));
    server.on('error', reject);
  });
}

module.exports = { createServer, start };
