const http = require('http');
const https = require('https');
const net = require('net');
const { SocksServer } = require('./src/socks5-server');
const { HttpProxyServer } = require('./src/http-proxy-server');
const config = require('./config.json');

class ProxyServer {
  constructor() {
    this.socks5Server = null;
    this.httpServer = null;
    this.httpsServer = null;
  }

  async start() {
    console.log('🚀 Запуск прокси-сервера Proximatrix...\n');

    // Запуск SOCKS5 прокси для Telegram
    if (config.socks5.enabled) {
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
    console.log(`   SOCKS5: ${config.socks5.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log(`   HTTP:   ${config.http.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log(`   HTTPS:  ${config.https.enabled ? '✅ Активен' : '❌ Отключен'}`);
    console.log('\n💡 Используйте эти настройки в Telegram и WhatsApp клиентах');
  }

  async stop() {
    console.log('\n🛑 Остановка серверов...');
    
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