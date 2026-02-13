/**
 * Отслеживание подключений MTProto по IP и секретам.
 * При одновременном использовании секрета с разных IP — только уведомление админу.
 * Все подключения разрешаются, решение (отключить пользователя и т.д.) принимает администратор.
 */

const usersMongo = require('./users-mongo');

class ConnectionTracker {
  constructor() {
    this.activeConnections = new Map();
    this.onSuspiciousActivity = null;
  }

  /**
   * Регистрирует новое подключение.
   * При подозрительной активности (разные IP одновременно) — уведомление админу, подключение разрешается.
   * @param {string} secret - Секрет MTProto
   * @param {string} ip - IP адрес клиента
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async registerConnection(secret, ip) {
    if (!this.activeConnections.has(secret)) {
      this.activeConnections.set(secret, new Set());
    }

    const ipSet = this.activeConnections.get(secret);
    const currentIPs = Array.from(ipSet);
    const isSuspicious = currentIPs.length > 0 && !currentIPs.includes(ip);

    if (isSuspicious) {
      console.log(`⚠️  Подозрительная активность: секрет ${secret.slice(0, 8)}... используется одновременно с IP: ${currentIPs.join(', ')} и ${ip}`);
      try {
        const user = await usersMongo.getUserBySecret(secret);
        if (user && this.onSuspiciousActivity) {
          usersMongo.logConnection(secret, ip, 'suspicious', 'Simultaneous connection from different IP').catch(() => {});
          this.onSuspiciousActivity({
            userId: user.id,
            username: user.username,
            telegramId: user.telegramId,
            secret: secret,
            ip: ip,
            existingIPs: currentIPs,
            reason: 'Simultaneous connection from different IP',
          });
        }
      } catch (err) {
        console.error('⚠️  Ошибка при отправке уведомления о подозрительной активности:', err.message);
      }
    }

    ipSet.add(ip);
    usersMongo.logConnection(secret, ip, 'connected').catch(() => {});
    return { allowed: true };
  }

  /**
   * Удаляет подключение при отключении
   * @param {string} secret - Секрет MTProto
   * @param {string} ip - IP адрес клиента
   */
  unregisterConnection(secret, ip) {
    if (this.activeConnections.has(secret)) {
      const ipSet = this.activeConnections.get(secret);
      ipSet.delete(ip);
      if (ipSet.size === 0) {
        this.activeConnections.delete(secret);
      }
      usersMongo.logConnection(secret, ip, 'disconnected').catch(() => {});
    }
  }

  /**
   * Устанавливает callback для уведомлений о подозрительной активности
   * @param {Function} callback - Функция для вызова при обнаружении подозрительной активности
   */
  setNotificationCallback(callback) {
    this.onSuspiciousActivity = callback;
  }

  /**
   * Получает статистику активных подключений
   * @returns {Object}
   */
  getStats() {
    const stats = {
      totalSecrets: this.activeConnections.size,
      totalConnections: 0,
      secretsWithMultipleIPs: 0,
    };

    for (const [secret, ipSet] of this.activeConnections.entries()) {
      const ipCount = ipSet.size;
      stats.totalConnections += ipCount;
      if (ipCount > 1) {
        stats.secretsWithMultipleIPs++;
      }
    }

    return stats;
  }

  /**
   * Очищает все отслеживаемые подключения (для тестирования)
   */
  clear() {
    this.activeConnections.clear();
  }
}

module.exports = new ConnectionTracker();
