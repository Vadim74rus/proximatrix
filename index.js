const http = require('http');
const https = require('https');
const net = require('net');
const { MTProtoServer } = require('./src/mtproto-server');
const { SocksServer } = require('./src/socks5-server');
const { HttpProxyServer } = require('./src/http-proxy-server');
const config = require('./config.json');

class ProxyServer {
  constructor() {
    this.mtprotoServer = null;
    this.socks5Server = null;
    this.httpServer = null;
    this.httpsServer = null;
  }

  async start() {
    console.log('🚀 Запуск прокси-сервера Proximatrix...\n');

    // Запуск MTProto прокси для Telegram (рекомендуется)
    if (config.mtproto && config.mtproto.enabled) {
      const secret = config.mtproto.secret && config.mtproto.secret.length === 32
        ? config.mtproto.secret
        : null;
      this.mtprotoServer = new MTProtoServer({
        port: config.mtproto.port,
        host: config.mtproto.host,
        secret: secret || undefined
      });
      await this.mtprotoServer.start();
      const mtSecret = this.mtprotoServer.getSecret();
      const publicIp = config.mtproto.publicIp || process.env.PROXY_PUBLIC_IP || 'YOUR_IP';
      console.log(`✅ MTProto прокси запущен на порту ${config.mtproto.port} (для Telegram)`);
      console.log(`   Secret: ${mtSecret}`);
      console.log(`   Ссылка для Telegram: https://t.me/proxy?server=${publicIp}&port=${config.mtproto.port}&secret=${mtSecret}`);
      if (publicIp === 'YOUR_IP') {
        console.log(`   ⚠️  Укажите IP сервера в config.json (mtproto.publicIp) или в переменной PROXY_PUBLIC_IP`);
      }
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
    console.log(`   SOCKS5: ${config.socks5 && config.socks5.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log(`   HTTP:   ${config.http.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log(`   HTTPS:  ${config.https.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log('\n💡 Используйте эти настройки в Telegram и WhatsApp клиентах');
  }

  async stop() {
    console.log('\n🛑 Остановка серверов...');

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

// Обработка сигналов завершения
const server = new ProxyServer();

process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

// Запуск сервера
server.start().catch(err => {
  console.error('❌ Ошибка при запуске сервера:', err);
  process.exit(1);
});

module.exports = ProxyServer;