/**
 * MTProto Proxy для Telegram
 * На основе протокола MTProxy (https://core.telegram.org/proxy)
 * Адаптировано из JSMTProxy (https://github.com/FreedomPrevails/JSMTProxy)
 */

const net = require('net');
const crypto = require('crypto');

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
    this.secret = options.secret || this.generateSecret();
    this.server = null;
    this.serverIdleCons = [];
    this.telegramIdleNum = TELEGRAM_SERVERS.map(() => MIN_IDLE_SERVERS);

    for (let i = 0; i < TELEGRAM_SERVERS.length; i++) {
      this.serverIdleCons[i] = [];
    }
  }

  generateSecret() {
    return crypto.randomBytes(16).toString('hex');
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

      const binSecret = Buffer.from(this.secret, 'hex');
      if (binSecret.length !== 16) {
        reject(new Error('MTProto secret должен быть 32 hex-символа (16 байт). Сгенерируйте: head -c 16 /dev/urandom | xxd -ps'));
        return;
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

      this.server = net.createServer((socket) => {
        socket.setTimeout(CON_TIMEOUT);

        socket.on('error', () => {
          socket.destroy();
        });

        socket.on('timeout', () => {
          socket.destroy();
        });

        socket.on('end', () => {
          if (socket.serverSocket != null) {
            socket.serverSocket.destroy();
          }
        });

        socket.on('data', (data) => {
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

            socket.cipherDecClient = crypto.createDecipheriv('aes-256-ctr', decryptKeyClient, decryptIvClient);
            socket.cipherEncClient = crypto.createCipheriv('aes-256-ctr', encryptKeyClient, encryptIvClient);

            const decAuthPacket = socket.cipherDecClient.update(buf64);
            socket.dcId = Math.abs(decAuthPacket.readInt16LE(60)) - 1;

            for (let i = 0; i < 4; i++) {
              if (decAuthPacket[56 + i] !== 0xef) {
                socket.destroy();
                return;
              }
            }

            if (socket.dcId > 4 || socket.dcId < 0) {
              socket.destroy();
              return;
            }

            data = data.slice(64, data.length);
            socket.init = true;
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
    return this.secret;
  }

  getConnectionLink() {
    return `https://t.me/proxy?server=${this.host === '0.0.0.0' ? 'YOUR_SERVER_IP' : this.host}&port=${this.port}&secret=${this.secret}`;
  }
}

module.exports = { MTProtoServer };
