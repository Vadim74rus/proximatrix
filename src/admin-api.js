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
    const url = new URL(req.url || '/', 'http://' + host);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const method = req.method;

    // Главная страница (без API-ключа)
    if ((pathname === '/' || pathname === '') && method === 'GET') {
      const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proximatrix — MTProxy для Telegram</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 1rem; background: #1a1a2e; color: #eee; }
    h1 { color: #0f0; }
    a { color: #6cf; }
    code { background: #333; padding: .2em .4em; border-radius: 4px; }
    .box { background: #16213e; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    ul { margin: .5rem 0; padding-left: 1.2rem; }
  </style>
</head>
<body>
  <h1>Proximatrix</h1>
  <p>MTProxy для Telegram и прокси для WhatsApp.</p>
  <div class="box">
    <strong>Почему при переходе по адресу не работает?</strong>
    <ul>
      <li><strong>Корень (/)</strong> — эта страница. API-ключ не нужен.</li>
      <li><strong>/api/users</strong> и другие <code>/api/*</code> — требуют заголовок <code>X-API-Key</code> или параметр <code>?apiKey=...</code>. Без ключа ответ: <code>Invalid or missing API key</code>.</li>
    </ul>
    Чтобы управлять пользователями, отправляйте запросы к <code>/api/users</code> с ключом (см. <a href="https://github.com/Vadim74rus/proximatrix/blob/main/API.md">API.md</a>, <a href="https://github.com/Vadim74rus/proximatrix/blob/main/KEYS_FOR_EXTERNAL_SERVER.md">KEYS_FOR_EXTERNAL_SERVER.md</a>).
  </div>
  <p><a href="https://t.me/ai_quantums">Канал AI QUANTUM</a></p>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(html);
      return;
    }

    // Для всех /api/* запросов нужен API-ключ
    if (pathname.startsWith('/api') && apiKey && getApiKey(req) !== apiKey) {
      send(res, 401, { error: 'Invalid or missing API key' });
      return;
    }

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
