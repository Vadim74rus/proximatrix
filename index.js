const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { MTProtoServer } = require('./src/mtproto-server');
const { SocksServer } = require('./src/socks5-server');
const { HttpProxyServer } = require('./src/http-proxy-server');
const { connect: connectDb } = require('./src/db');
const usersMongo = require('./src/users-mongo');
const { start: startAdminApi } = require('./src/admin-api');
const notifyService = require('./src/notify-service');
const config = require('./config.json');
const logBuffer = require('./src/log-buffer');

// Инициализация буфера логов для API
logBuffer.init();

class ProxyServer {
  constructor() {
    this.mtprotoServer = null;
    this.socks5Server = null;
    this.httpServer = null;
    this.httpsServer = null;
    this.adminApiServer = null;
  }

  async start() {
    console.log('🚀 Запуск прокси-сервера Proximatrix...\n');

    const publicIp = config.mtproto?.publicIp || process.env.PROXY_PUBLIC_IP || 'YOUR_IP';
    const useMultiUser = config.api?.enabled === true;

    if (useMultiUser) {
      const mongoUri = config.mongo?.uri || process.env.MONGODB_URI;
      if (!mongoUri) throw new Error('При api.enabled нужен config.mongo.uri или MONGODB_URI');
      await connectDb(mongoUri);
      await usersMongo.refreshSecretsCache();
      console.log('✅ MongoDB подключена, кэш секретов обновлён');
      
      // Создаём тестового пользователя, если база пустая
      const existingUsers = await usersMongo.listUsers(false);
      if (existingUsers.length === 0) {
        const testUser = await usersMongo.addUser({
          telegramId: '000000000',
          username: 'test',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 год
          enabled: true,
        });
        // Обновляем кэш секретов после создания пользователя
        await usersMongo.refreshSecretsCache();
        console.log(`✅ Создан тестовый пользователь для проверки MTProto`);
        console.log(`   Secret: ${testUser.secret}`);
        console.log(`   Ссылка: https://t.me/proxy?server=${publicIp}&port=${config.mtproto?.port || 8444}&secret=${testUser.secret}`);
      }
    }

    // Запуск MTProto прокси для Telegram
    if (config.mtproto && config.mtproto.enabled) {
      const opts = {
        port: config.mtproto.port,
        host: config.mtproto.host,
        publicIp,
        minIdleServers: config.mtproto.minIdleServers, // для стабильного пинга (см. PING_OPTIMIZATION.md)
        sponsorTag: process.env.MTPROTO_SPONSOR_TAG || config.mtproto?.sponsorTag || undefined, // тег от @MTProxyBot (см. SPONSOR_CHANNEL.md)
      };
      if (useMultiUser) {
        opts.getSecrets = () => usersMongo.getEnabledSecretsSync();
        // Callback для уведомлений о подозрительной активности
        opts.onSuspiciousActivity = async (info) => {
          console.log('\n🚨 ============================================');
          console.log('🚨 ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ ОБНАРУЖЕНА!');
          console.log('🚨 ============================================');
          console.log(`Пользователь ID: ${info.userId}`);
          console.log(`Имя: ${info.firstname || 'N/A'}`);
          console.log(`Username: ${info.username || 'N/A'}`);
          console.log(`Telegram ID: ${info.telegramId || 'N/A'}`);
          console.log(`Секрет: ${info.secret.slice(0, 8)}...`);
          console.log(`Новый IP: ${info.ip}`);
          console.log(`Существующие IP: ${info.existingIPs.join(', ')}`);
          console.log(`Причина: ${info.reason}`);
          console.log(`Действие: уведомление отправлено. Решение — за администратором (при необходимости отключите через API).`);
          console.log('🚨 ============================================\n');
          
          // Отправляем уведомление администратору (не блокируем основной поток)
          notifyService.notifySuspiciousActivity(info).catch(err => {
            console.error('❌ Ошибка отправки уведомления:', err.message);
          });
        };
      } else {
        const secret = config.mtproto.secret && config.mtproto.secret.length === 32
          ? config.mtproto.secret
          : null;
        opts.secret = secret || undefined;
      }
      this.mtprotoServer = new MTProtoServer(opts);
      await this.mtprotoServer.start();
      console.log(`✅ MTProto прокси запущен на порту ${config.mtproto.port} (для Telegram)`);
      if (useMultiUser) {
        const count = usersMongo.getEnabledSecretsSync().length;
        if (count === 0) {
          console.log(`   Режим: мультипользователь (MongoDB), активных секретов: 0.`);
          console.log(`   ⚠️  Создайте пользователей через API для работы прокси.`);
        } else {
          console.log(`   Режим: мультипользователь (MongoDB), активных секретов: ${count}.`);
          // Показываем ссылку первого активного пользователя для тестирования
          const firstSecret = usersMongo.getEnabledSecretsSync()[0];
          if (firstSecret) {
            console.log(`   Тестовая ссылка: https://t.me/proxy?server=${publicIp}&port=${config.mtproto.port}&secret=${firstSecret}`);
            console.log(`   Для получения всех ссылок используйте API: GET /api/users/{id}/link`);
          }
        }
      } else {
        const mtSecret = this.mtprotoServer.getSecret();
        console.log(`   Secret: ${mtSecret}`);
        console.log(`   Ссылка: https://t.me/proxy?server=${publicIp}&port=${config.mtproto.port}&secret=${mtSecret}`);
      }
      if (publicIp === 'YOUR_IP') {
        console.log(`   ⚠️  Укажите IP в config.json (mtproto.publicIp) или PROXY_PUBLIC_IP`);
      }
      const sponsorTag = process.env.MTPROTO_SPONSOR_TAG || config.mtproto?.sponsorTag;
      if (sponsorTag) {
        console.log(`   📢 Канал спонсора: тег ${sponsorTag.slice(0, 8)}... (зарегистрирован в @MTProxyBot)`);
        console.log(`   💡 Telegram может показывать канал в списке чатов по IP прокси (${publicIp}).`);
      }
    }

    // API управления пользователями (MongoDB)
    if (config.api && config.api.enabled) {
      const serverIp = config.mtproto?.serverIp || process.env.PROXY_SERVER_IP || null;
      const certPath = config.api.sslCert || process.env.SSL_CERT_PATH || '';
      const keyPath = config.api.sslKey || process.env.SSL_KEY_PATH || '';
      const caPath = config.api.sslCa || process.env.SSL_CA_PATH || '';
      let ssl = null;
      if (certPath && keyPath) {
        const resolvePath = (p) => (path.isAbsolute(p) ? p : path.join(process.cwd(), p));
        try {
          const cert = fs.readFileSync(resolvePath(certPath));
          const key = fs.readFileSync(resolvePath(keyPath));
          ssl = { key, cert };
          if (caPath && fs.existsSync(resolvePath(caPath))) {
            ssl.ca = fs.readFileSync(resolvePath(caPath));
          }
        } catch (err) {
          console.warn('⚠️  SSL-сертификаты не загружены:', err.message, '— API работает по HTTP');
        }
      }
      this.adminApiServer = await startAdminApi({
        port: config.api.port || 9090,
        host: config.api.host || '0.0.0.0',
        apiKey: config.api.apiKey || process.env.PROXY_API_KEY || '',
        publicIp,
        serverIp,
        mtPort: config.mtproto?.port || 8444,
        ssl,
      });
      const scheme = ssl ? 'https' : 'http';
      console.log(`✅ API управления пользователями: ${scheme}://${config.api.host || '0.0.0.0'}:${config.api.port || 9090}${ssl ? ' (HTTPS)' : ''}`);
      if (config.api.apiKey) console.log(`   Защита: X-API-Key`);
    }

    // Запуск SOCKS5 прокси для Telegram (альтернатива)
    if (config.socks5 && config.socks5.enabled) {
      this.socks5Server = new SocksServer({
        port: config.socks5.port,
        host: config.socks5.host
      });
      await this.socks5Server.start();
      console.log(`✅ SOCKS5 прокси запущен на порту ${config.socks5.port} (для Telegram)`);
    }

    // Запуск HTTP прокси для WhatsApp
    if (config.http.enabled) {
      this.httpServer = new HttpProxyServer({
        port: config.http.port,
        host: config.http.host,
        type: 'http'
      });
      await this.httpServer.start();
      console.log(`✅ HTTP прокси запущен на порту ${config.http.port} (для WhatsApp)`);
    }

    // Запуск HTTPS прокси для WhatsApp
    if (config.https.enabled) {
      this.httpsServer = new HttpProxyServer({
        port: config.https.port,
        host: config.https.host,
        type: 'https'
      });
      await this.httpsServer.start();
      console.log(`✅ HTTPS прокси запущен на порту ${config.https.port} (для WhatsApp)`);
    }

    console.log('\n📊 Статус серверов:');
    console.log(`   MTProto: ${config.mtproto && config.mtproto.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log(`   API:    ${config.api && config.api.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log(`   SOCKS5: ${config.socks5 && config.socks5.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log(`   HTTP:   ${config.http.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log(`   HTTPS:  ${config.https.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log('\n💡 Используйте эти настройки в Telegram и WhatsApp клиентах');
  }

  async stop() {
    console.log('\n🛑 Остановка серверов...');

    if (this.adminApiServer) {
      this.adminApiServer.close();
    }
    try {
      const { close: closeDb } = require('./src/db');
      await closeDb();
    } catch (_) {}
    if (this.mtprotoServer) {
      await this.mtprotoServer.stop();
    }

    if (this.socks5Server) {
      await this.socks5Server.stop();
    }
    
    if (this.httpServer) {
      await this.httpServer.stop();
    }
    
    if (this.httpsServer) {
      await this.httpsServer.stop();
    }
    
    console.log('✅ Все серверы остановлены');
  }
}

// Обработка необработанных отклонений промисов (отказоустойчивость)
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Обработка сигналов завершения (graceful shutdown)
const server = new ProxyServer();
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n📴 Получен сигнал ${signal}, остановка...`);
  try {
    await Promise.race([
      server.stop(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 15000)),
    ]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка при остановке:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Запуск сервера
server.start().catch(err => {
  console.error('❌ Ошибка при запуске сервера:', err);
  process.exit(1);
});

module.exports = ProxyServer;