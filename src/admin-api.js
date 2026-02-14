/**
 * API управления пользователями MTProxy (MongoDB).
 * Защита: заголовок X-API-Key или query ?apiKey=...
 * Поддержка HTTPS через options.ssl (key, cert, ca).
 */

const http = require('http');
const https = require('https');
const usersMongo = require('./users-mongo');

const MAX_BODY_SIZE = 1024 * 256; // 256 KB

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk;
    });
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
  const { apiKey = '', port = 9090, host = '127.0.0.1', publicIp = 'aiquantums.ru', serverIp = null, mtPort = 8444 } = options;
  const linkWithIp = serverIp && serverIp !== publicIp
    ? `https://t.me/proxy?server=${serverIp}&port=${mtPort}&secret=`
    : null;

  const handler = async (req, res) => {
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
          firstname: body.firstname,
          activatedAt: body.activatedAt,
          expiresAt: body.expiresAt,
          enabled: body.enabled !== false,
        });
        const link = `https://t.me/proxy?server=${publicIp}&port=${mtPort}&secret=${user.secret}`;
        const linkIp = linkWithIp ? linkWithIp + user.secret : undefined;
        return send(res, 201, {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstname: user.firstname,
          secret: user.secret,
          link,
          ...(linkIp && { linkIp }),
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
          const link = `https://t.me/proxy?server=${publicIp}&port=${mtPort}&secret=${user.secret}`;
          const linkIp = linkWithIp ? linkWithIp + user.secret : undefined;
          return send(res, 200, { id: user.id, link, ...(linkIp && { linkIp }) });
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
            firstname: body.firstname,
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

      const connectionsMatch = pathname.match(/^\/api\/users\/([^/]+)\/connections$/);
      if (connectionsMatch && method === 'GET') {
        const id = connectionsMatch[1];
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const history = await usersMongo.getConnectionHistory(id, limit);
        if (history === null) return send(res, 404, { error: 'User not found' });
        return send(res, 200, { userId: id, connections: history });
      }

      const resetIPsMatch = pathname.match(/^\/api\/users\/([^/]+)\/reset-ips$/);
      if (resetIPsMatch && method === 'POST') {
        const id = resetIPsMatch[1];
        const u = await usersMongo.resetAllowedIPs(id);
        if (!u) return send(res, 404, { error: 'User not found' });
        return send(res, 200, { id, message: 'Allowed IPs reset', allowedIPs: u.allowedIPs });
      }

      send(res, 404, { error: 'Not found' });
    } catch (err) {
      console.error('API Error:', err.message);
      send(res, err.message === 'Request body too large' ? 413 : 500, {
        error: err.message === 'Request body too large' ? 'Request body too large' : (err.message || 'Internal error'),
      });
    }
  };

  const server = options.ssl && options.ssl.key && options.ssl.cert
    ? https.createServer(options.ssl, handler)
    : http.createServer(handler);
  return server;
}

function start(options) {
  return new Promise((resolve, reject) => {
    const server = createServer(options);
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.listen(options.port || 9090, options.host || '0.0.0.0', () => resolve(server));
    server.on('error', reject);
  });
}

module.exports = { createServer, start };
