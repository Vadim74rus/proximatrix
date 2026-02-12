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
      console.log('⚠️  Уведомления отключены (не заданы NOTIFY_API_URL или NOTIFY_SECRET)');
      return { ok: false, error: 'Notifications disabled' };
    }

    if (!message || !message.trim()) {
      return { ok: false, error: 'Message is required' };
    }

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
        path: url.pathname + (url.pathname.endsWith('/') ? 'api/notify/admin' : '/api/notify/admin'),
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
            if (res.statusCode === 200) {
              try {
                const result = JSON.parse(data);
                console.log(`✅ Уведомление отправлено администратору: ${result.sentTo || 1} получателей`);
                resolve({ ok: true, result });
              } catch {
                resolve({ ok: true });
              }
            } else {
              console.error(`❌ Ошибка отправки уведомления: HTTP ${res.statusCode}`);
              resolve({ ok: false, error: `HTTP ${res.statusCode}` });
            }
          });
        });

        req.on('error', (err) => {
          console.error(`❌ Ошибка отправки уведомления: ${err.message}`);
          resolve({ ok: false, error: err.message });
        });

        req.write(requestBody);
        req.end();
      });
    } catch (err) {
      console.error(`❌ Ошибка отправки уведомления: ${err.message}`);
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
      `Username: ${info.username || 'N/A'}`,
      `Telegram ID: ${info.telegramId || 'N/A'}`,
      `Секрет: ${info.secret.slice(0, 8)}...`,
      `Новый IP: ${info.ip}`,
      `Существующие IP: ${info.existingIPs.join(', ')}`,
      `Причина: ${info.reason}`,
      `Действие: Пользователь автоматически отключен`,
    ].join('\n');

    return await this.sendNotification(message, subject);
  }
}

module.exports = new NotifyService();
