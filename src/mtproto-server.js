/**
 * MTProto Proxy для Telegram
 * На основе протокола MTProxy (https://core.telegram.org/proxy)
 * Адаптировано из JSMTProxy (https://github.com/FreedomPrevails/JSMTProxy)
 */

const net = require('net');
const crypto = require('crypto');
const connectionTracker = require('./connection-tracker');

// Telegram Data Center серверы (порт 443)
const TELEGRAM_SERVERS = [
  '149.154.175.50',   // DC1
  '149.154.167.51',   // DC2
  '149.154.175.100',  // DC3
  '149.154.167.91',   // DC4
  '149.154.171.5'     // DC5
];

const CON_TIMEOUT = 5 * 60 * 1000; // 5 минут
const MIN_IDLE_SERVERS = 2;

function reverseInplace(buffer) {
  for (let i = 0, j = buffer.length - 1; i < j; ++i, --j) {
    const t = buffer[j];
    buffer[j] = buffer[i];
    buffer[i] = t;
  }
}

class MTProtoServer {
  constructor(options = {}) {
    this.port = options.port || 443;
    this.host = options.host || '0.0.0.0';
    this.publicIp = options.publicIp || '';
    this.secret = options.secret || this.generateSecret();
    this.getSecrets = options.getSecrets || null;
    this.server = null;
    this.serverIdleCons = [];
    this.telegramIdleNum = TELEGRAM_SERVERS.map(() => MIN_IDLE_SERVERS);
    this.onSuspiciousActivity = options.onSuspiciousActivity || null;

    // Настраиваем callback для уведомлений
    if (this.onSuspiciousActivity) {
      connectionTracker.setNotificationCallback(this.onSuspiciousActivity);
    }

    for (let i = 0; i < TELEGRAM_SERVERS.length; i++) {
      this.serverIdleCons[i] = [];
    }
  }

  generateSecret() {
    return crypto.randomBytes(16).toString('hex');
  }

  getSecretList() {
    if (this.getSecrets && typeof this.getSecrets === 'function') {
      const list = this.getSecrets();
      return Array.isArray(list) ? list.filter(s => s && s.length === 32) : [];
    }
    return this.secret ? [this.secret] : [];
  }

  createIdleServer(id, ip) {
    const client = new net.Socket();
    client.setKeepAlive(true);

    client.on('timeout', () => {
      client.destroy();
    });

    client.connect(443, ip, () => {
      let randomBuf = crypto.randomBytes(64);
      while (true) {
        const val = (randomBuf[3] << 24) | (randomBuf[2] << 16) | (randomBuf[1] << 8) | (randomBuf[0]);
        const val2 = (randomBuf[7] << 24) | (randomBuf[6] << 16) | (randomBuf[5] << 8) | (randomBuf[4]);
        if (randomBuf[0] !== 0xef &&
            val !== 0x44414548 &&
            val !== 0x54534f50 &&
            val !== 0x20544547 &&
            val !== 0x4954504f &&
            val !== 0xeeeeeeee &&
            val2 !== 0x00000000) {
          randomBuf[56] = randomBuf[57] = randomBuf[58] = randomBuf[59] = 0xef;
          break;
        }
        randomBuf = crypto.randomBytes(64);
      }

      const keyIv = Buffer.allocUnsafe(48);
      randomBuf.copy(keyIv, 0, 8);

      const encryptKeyServer = Buffer.allocUnsafe(32);
      keyIv.copy(encryptKeyServer, 0, 0);
      const encryptIvServer = Buffer.allocUnsafe(16);
      keyIv.copy(encryptIvServer, 0, 32);

      reverseInplace(keyIv);

      const decryptKeyServer = Buffer.allocUnsafe(32);
      keyIv.copy(decryptKeyServer, 0, 0);
      const decryptIvServer = Buffer.allocUnsafe(16);
      keyIv.copy(decryptIvServer, 0, 32);

      client.cipherDecServer = crypto.createDecipheriv('aes-256-ctr', decryptKeyServer, decryptIvServer);
      client.cipherEncServer = crypto.createCipheriv('aes-256-ctr', encryptKeyServer, encryptIvServer);

      const packetEnc = client.cipherEncServer.update(randomBuf);
      randomBuf.copy(packetEnc, 0, 0, 56);

      client.write(packetEnc, () => {
        this.serverIdleCons[id].push(client);
      });
    });

    client.on('error', () => {
      client.destroy();
    });

    client.on('data', (data) => {
      if (client.clientSocket && client.clientSocket.writable) {
        const decPacket = client.cipherDecServer.update(data);
        const encPacket = client.clientSocket.cipherEncClient.update(decPacket);
        client.clientSocket.write(encPacket);
      } else {
        client.destroy();
      }
    });

    client.on('end', () => {
      if (client.clientSocket != null) {
        client.clientSocket.end();
      }
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      // Поддержка лимитов файловых дескрипторов (только Linux, опционально)
      try {
        const { exec } = require('child_process');
        exec(`/usr/bin/prlimit --pid ${process.pid} --nofile=81920:81920 2>/dev/null`, () => {});
      } catch (e) {
        // Игнорируем, если prlimit недоступен (например, в Alpine)
      }

      const secretsList = this.getSecretList();
      if (secretsList.length === 0) {
        if (this.getSecrets && typeof this.getSecrets === 'function') {
          console.log('⚠️  MTProto: нет активных секретов. Сервер запущен, но пользователи должны быть созданы через API.');
        } else {
          reject(new Error('MTProto: нужен хотя бы один секрет (config или getSecrets)'));
          return;
        }
      }

      // Поддерживаем пул соединений к Telegram DC
      const maintainPool = () => {
        for (let i = 0; i < TELEGRAM_SERVERS.length; i++) {
          if (this.serverIdleCons[i].length < this.telegramIdleNum[i]) {
            this.createIdleServer(i, TELEGRAM_SERVERS[i]);
          }
        }
      };
      setInterval(maintainPool, 100);
      maintainPool();

      const normalizeIP = (addr) => {
        if (!addr) return 'unknown';
        if (addr.startsWith('::ffff:')) return addr.slice(7);
        return addr;
      };

      this.server = net.createServer((socket) => {
        socket.setTimeout(CON_TIMEOUT);
        const clientIP = normalizeIP(socket.remoteAddress) || 'unknown';
        let matchedSecret = null;

        socket.on('error', () => {
          if (matchedSecret) connectionTracker.unregisterConnection(matchedSecret, clientIP);
          socket.destroy();
        });

        socket.on('timeout', () => {
          if (matchedSecret) connectionTracker.unregisterConnection(matchedSecret, clientIP);
          socket.destroy();
        });

        socket.on('end', () => {
          if (matchedSecret) connectionTracker.unregisterConnection(matchedSecret, clientIP);
          if (socket.serverSocket != null) socket.serverSocket.destroy();
        });

        socket.on('data', async (data) => {
          // Защита от сканирования
          if (socket.init == null && (data.length === 41 || data.length === 56)) {
            socket.destroy();
            return;
          }

          if (socket.init == null && data.length < 64) {
            socket.destroy();
            return;
          }

          if (socket.init == null) {
            const buf64 = Buffer.allocUnsafe(64);
            data.copy(buf64);

            const secretsList = this.getSecretList();
            if (secretsList.length === 0) {
              // В мультипользовательском режиме нет активных секретов - отклоняем соединение
              socket.destroy();
              return;
            }
            
            let matched = false;
            for (const secretHex of secretsList) {
              const binSecret = Buffer.from(secretHex, 'hex');
              if (binSecret.length !== 16) continue;

              let keyIv = Buffer.allocUnsafe(48);
              buf64.copy(keyIv, 0, 8);

              let decryptKeyClient = Buffer.allocUnsafe(32);
              keyIv.copy(decryptKeyClient, 0, 0);
              let decryptIvClient = Buffer.allocUnsafe(16);
              keyIv.copy(decryptIvClient, 0, 32);

              reverseInplace(keyIv);

              let encryptKeyClient = Buffer.allocUnsafe(32);
              keyIv.copy(encryptKeyClient, 0, 0);
              let encryptIvClient = Buffer.allocUnsafe(16);
              keyIv.copy(encryptIvClient, 0, 32);

              decryptKeyClient = crypto.createHash('sha256').update(Buffer.concat([decryptKeyClient, binSecret])).digest();
              encryptKeyClient = crypto.createHash('sha256').update(Buffer.concat([encryptKeyClient, binSecret])).digest();

              const cipherDec = crypto.createDecipheriv('aes-256-ctr', decryptKeyClient, decryptIvClient);
              const decAuthPacket = cipherDec.update(buf64);
              const dcId = Math.abs(decAuthPacket.readInt16LE(60)) - 1;

              let valid = true;
              for (let i = 0; i < 4; i++) {
                if (decAuthPacket[56 + i] !== 0xef) { valid = false; break; }
              }
              if (dcId > 4 || dcId < 0) valid = false;

              if (valid) {
                // Проверяем разрешение на подключение через connection tracker
                const checkResult = await connectionTracker.registerConnection(secretHex, clientIP);
                if (!checkResult.allowed) {
                  console.log(`🚫 Подключение отклонено для секрета ${secretHex.slice(0, 8)}... с IP ${clientIP}: ${checkResult.reason}`);
                  socket.destroy();
                  return;
                }
                
                socket.cipherDecClient = cipherDec;
                socket.cipherEncClient = crypto.createCipheriv('aes-256-ctr', encryptKeyClient, encryptIvClient);
                socket.dcId = dcId;
                data = data.slice(64, data.length);
                socket.init = true;
                matchedSecret = secretHex;
                matched = true;
                break;
              }
            }
            if (!matched) {
              socket.destroy();
              return;
            }
          }

          const payload = socket.cipherDecClient.update(data);

          if (socket.serverSocket == null) {
            if (this.serverIdleCons[socket.dcId].length > 0) {
              do {
                socket.serverSocket = this.serverIdleCons[socket.dcId].shift();
                if (socket.serverSocket && !socket.serverSocket.writable) {
                  socket.serverSocket.destroy();
                }
              } while (socket.serverSocket && !socket.serverSocket.writable);

              if (socket.serverSocket) {
                socket.serverSocket.setTimeout(CON_TIMEOUT);
                socket.serverSocket.setKeepAlive(false);
                socket.serverSocket.clientSocket = socket;
              }
            } else {
              socket.destroy();
              return;
            }
          }

          if (socket.serverSocket && socket.serverSocket.writable) {
            const encPayload = socket.serverSocket.cipherEncServer.update(payload);
            socket.serverSocket.write(encPayload);
          } else {
            socket.destroy();
          }
        });
      });

      this.server.on('error', (err) => {
        console.error('❌ MTProto Server Error:', err);
      });

      this.server.listen(this.port, this.host, () => {
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  getSecret() {
    const list = this.getSecretList();
    return list.length > 0 ? list[0] : this.secret;
  }

  getConnectionLink(secret, publicIp) {
    const host = publicIp || this.publicIp || (this.host === '0.0.0.0' ? 'YOUR_SERVER_IP' : this.host);
    return `https://t.me/proxy?server=${host}&port=${this.port}&secret=${secret || this.getSecret()}`;
  }
}

module.exports = { MTProtoServer };
