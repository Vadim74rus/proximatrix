/**
 * Отслеживание подключений MTProto по IP и секретам
 * Автоматическое отключение при обнаружении одновременных подключений с разных IP
 */

const usersMongo = require('./users-mongo');

class ConnectionTracker {
  constructor() {
    // Активные подключения: Map<secret, Set<ip>>
    this.activeConnections = new Map();
    // Callback для уведомлений
    this.onSuspiciousActivity = null;
  }

  /**
   * Регистрирует новое подключение
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

    // Проверяем, есть ли уже подключения с других IP
    if (currentIPs.length > 0 && !currentIPs.includes(ip)) {
      // Обнаружено одновременное подключение с другого IP!
      console.log(`⚠️  Подозрительная активность: секрет ${secret.slice(0, 8)}... используется одновременно с IP: ${currentIPs.join(', ')} и ${ip}`);
      
      // Отключаем пользователя
      const user = await usersMongo.getUserBySecret(secret);
      if (user && user.enabled) {
        await usersMongo.setEnabled(user.id, false);
        await usersMongo.logConnection(secret, ip, 'blocked', 'Simultaneous connection from different IP');
        
        // Уведомление администратору
        if (this.onSuspiciousActivity) {
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
        
        return { allowed: false, reason: 'User disabled due to suspicious activity' };
      }
    }

    // Разрешаем подключение и добавляем IP
    ipSet.add(ip);
    
    // Логируем подключение
    await usersMongo.logConnection(secret, ip, 'connected');
    
    return { allowed: true };
  }

  /**
   * Удаляет подключение при отключении
   * @param {string} secret - Секрет MTProto
   * @param {string} ip - IP адрес клиента
   */
  async unregisterConnection(secret, ip) {
    if (this.activeConnections.has(secret)) {
      const ipSet = this.activeConnections.get(secret);
      ipSet.delete(ip);
      
      // Если больше нет активных подключений, удаляем запись
      if (ipSet.size === 0) {
        this.activeConnections.delete(secret);
      }
      
      // Логируем отключение
      await usersMongo.logConnection(secret, ip, 'disconnected');
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
