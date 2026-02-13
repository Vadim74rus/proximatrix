/**
 * Сервис отправки уведомлений администратору через внешний API
 */

const http = require('http');
const https = require('https');

class NotifyService {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || process.env.NOTIFY_API_URL || '';
    this.secret = options.secret || process.env.NOTIFY_SECRET || '';
    this.enabled = this.apiUrl && this.secret;
  }

  /**
   * Отправляет уведомление администратору через внешний API
   * @param {string} message - Текст уведомления
   * @param {string} subject - Заголовок (опционально)
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async sendNotification(message, subject = null) {
    if (!this.enabled) {
      return { ok: false, error: 'Notifications disabled' };
    }

    if (!message || !message.trim()) {
      return { ok: false, error: 'Message is required' };
    }

    const NOTIFY_TIMEOUT = 10000; // 10 s

    try {
      const url = new URL(this.apiUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestBody = JSON.stringify({
        message: subject ? `[${subject}]\n${message}` : message,
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: (url.pathname || '/').replace(/\/+$/, '') + '/api/notify/admin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Notify-Secret': this.secret,
          'Content-Length': Buffer.byteLength(requestBody),
        },
      };

      return new Promise((resolve) => {
        const req = client.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            clearTimeout(timer);
            if (res.statusCode === 200) {
              try {
                const result = JSON.parse(data);
                console.log(`✅ Уведомление отправлено: ${result.sentTo || 1} получателей`);
                resolve({ ok: true, result });
              } catch {
                resolve({ ok: true });
              }
            } else {
              console.error(`❌ Уведомление: HTTP ${res.statusCode}`);
              resolve({ ok: false, error: `HTTP ${res.statusCode}` });
            }
          });
        });

        const timer = setTimeout(() => {
          req.destroy();
          resolve({ ok: false, error: 'Timeout' });
        }, NOTIFY_TIMEOUT);

        req.on('error', (err) => {
          clearTimeout(timer);
          console.error(`❌ Уведомление: ${err.message}`);
          resolve({ ok: false, error: err.message });
        });

        req.write(requestBody);
        req.end();
      });
    } catch (err) {
      console.error(`❌ Уведомление: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Отправляет уведомление о подозрительной активности
   * @param {Object} info - Информация о подозрительной активности
   */
  async notifySuspiciousActivity(info) {
    const subject = '🚨 Подозрительная активность MTProxy';
    const message = [
      `Пользователь ID: ${info.userId}`,
      `Имя: ${info.firstname || 'N/A'}`,
      `Username: ${info.username || 'N/A'}`,
      `Telegram ID: ${info.telegramId || 'N/A'}`,
      `Секрет: ${info.secret.slice(0, 8)}...`,
      `Новый IP: ${info.ip}`,
      `Существующие IP: ${info.existingIPs.join(', ')}`,
      `Причина: ${info.reason}`,
      ``,
      `Решение за вами. При необходимости отключите: POST /api/users/${info.userId}/disable`,
    ].join('\n');

    return await this.sendNotification(message, subject);
  }
}

module.exports = new NotifyService();
