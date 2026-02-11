const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');

class HttpProxyServer {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.host = options.host || '0.0.0.0';
    this.type = options.type || 'http';
    this.server = null;
  }

  start() {
    return new Promise((resolve, reject) => {
      if (this.type === 'https') {
        // Для HTTPS используем HTTP сервер, который обрабатывает CONNECT метод
        this.server = http.createServer((req, res) => {
          this.handleRequest(req, res);
        });
      } else {
        this.server = http.createServer((req, res) => {
          this.handleRequest(req, res);
        });
      }

      this.server.on('error', (err) => {
        console.error(`❌ ${this.type.toUpperCase()} Proxy Server Error:`, err);
      });

      this.server.on('connect', (req, socket, head) => {
        this.handleConnect(req, socket, head);
      });

      this.server.listen(this.port, this.host, () => {
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  handleRequest(req, res) {
    // Обработка обычных HTTP запросов
    const targetUrl = req.url;

    if (!targetUrl || targetUrl === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <head><title>Proximatrix Proxy</title></head>
          <body>
            <h1>🚀 Proximatrix Proxy Server</h1>
            <p>Прокси-сервер для Telegram и WhatsApp</p>
            <p><strong>Тип:</strong> ${this.type.toUpperCase()}</p>
            <p><strong>Порт:</strong> ${this.port}</p>
            <hr>
            <h2>Настройки для WhatsApp:</h2>
            <ul>
              <li><strong>HTTP Proxy:</strong> ${this.host === '0.0.0.0' ? 'ваш_IP' : this.host}:${this.port}</li>
              <li><strong>HTTPS Proxy:</strong> ${this.host === '0.0.0.0' ? 'ваш_IP' : this.host}:${this.port}</li>
            </ul>
          </body>
        </html>
      `);
      return;
    }

    // Запросы только с путём (например /favicon.ico) — не проксируем, отвечаем сразу
    if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) {
      if (targetUrl === '/favicon.ico' || targetUrl.startsWith('/favicon')) {
        res.writeHead(204, { 'Content-Length': '0' });
        res.end();
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    try {
      const url = new URL(targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: req.method,
        headers: req.headers
      };

      const protocol = url.protocol === 'https:' ? https : http;
      
      const proxyReq = protocol.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error(`❌ HTTP Proxy Error (${url.hostname}):`, err.message);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Proxy Error: ' + err.message);
      });

      req.pipe(proxyReq);
    } catch (err) {
      console.error('❌ HTTP Proxy Request Error:', err);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');
    }
  }

  handleConnect(req, socket, head) {
    // Обработка HTTPS туннелирования (CONNECT метод)
    const url = req.url.split(':');
    const targetHost = url[0];
    const targetPort = parseInt(url[1] || 443);

    console.log(`🔗 CONNECT ${targetHost}:${targetPort}`);

    const targetSocket = net.createConnection(targetPort, targetHost, () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      targetSocket.write(head);
      socket.pipe(targetSocket);
      targetSocket.pipe(socket);
    });

    targetSocket.on('error', (err) => {
      console.error(`❌ HTTPS Proxy Connection Error (${targetHost}:${targetPort}):`, err.message);
      socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      socket.end();
    });

    socket.on('error', (err) => {
      console.error('❌ HTTPS Proxy Socket Error:', err);
      targetSocket.destroy();
    });

    socket.on('close', () => {
      targetSocket.destroy();
    });

    targetSocket.on('close', () => {
      socket.destroy();
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = { HttpProxyServer };