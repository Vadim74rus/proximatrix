const net = require('net');

class SocksServer {
  constructor(options = {}) {
    this.port = options.port || 1080;
    this.host = options.host || '0.0.0.0';
    this.server = null;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', (err) => {
        console.error('❌ SOCKS5 Server Error:', err);
      });

      this.server.listen(this.port, this.host, () => {
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  async handleConnection(socket) {
    let buffer = Buffer.alloc(0);
    let state = 'handshake';

    socket.on('data', async (data) => {
      buffer = Buffer.concat([buffer, data]);

      try {
        if (state === 'handshake') {
          const result = await this.handleHandshake(socket, buffer);
          if (result.success) {
            buffer = result.remainingBuffer;
            state = 'request';
          } else {
            return;
          }
        }

        if (state === 'request') {
          const result = await this.handleRequest(socket, buffer);
          if (result.success) {
            buffer = result.remainingBuffer;
            state = 'relay';
          } else {
            return;
          }
        }
      } catch (err) {
        console.error('❌ SOCKS5 Connection Error:', err);
        socket.destroy();
      }
    });

    socket.on('error', (err) => {
      console.error('❌ SOCKS5 Socket Error:', err);
    });

    socket.on('close', () => {
      // Соединение закрыто
    });
  }

  async handleHandshake(socket, buffer) {
    if (buffer.length < 2) {
      return { success: false };
    }

    const version = buffer[0];
    const nMethods = buffer[1];

    if (version !== 5) {
      socket.write(Buffer.from([0x05, 0xFF]));
      socket.destroy();
      return { success: false };
    }

    if (buffer.length < 2 + nMethods) {
      return { success: false };
    }

    // Поддерживаем метод "без аутентификации" (0x00)
    const methods = buffer.slice(2, 2 + nMethods);
    const noAuth = methods.includes(0x00);

    if (noAuth) {
      socket.write(Buffer.from([0x05, 0x00]));
      return { 
        success: true, 
        remainingBuffer: buffer.slice(2 + nMethods) 
      };
    } else {
      socket.write(Buffer.from([0x05, 0xFF]));
      socket.destroy();
      return { success: false };
    }
  }

  async handleRequest(socket, buffer) {
    if (buffer.length < 4) {
      return { success: false };
    }

    const version = buffer[0];
    const command = buffer[1];
    const reserved = buffer[2];
    const addressType = buffer[3];

    if (version !== 5) {
      this.sendReply(socket, 0x01);
      socket.destroy();
      return { success: false };
    }

    let targetHost = '';
    let targetPort = 0;
    let offset = 4;

    // Определение адреса назначения
    if (addressType === 0x01) {
      // IPv4
      if (buffer.length < 10) {
        return { success: false };
      }
      targetHost = `${buffer[4]}.${buffer[5]}.${buffer[6]}.${buffer[7]}`;
      targetPort = buffer.readUInt16BE(8);
      offset = 10;
    } else if (addressType === 0x03) {
      // Доменное имя
      const hostLength = buffer[4];
      if (buffer.length < 5 + hostLength + 2) {
        return { success: false };
      }
      targetHost = buffer.slice(5, 5 + hostLength).toString('utf8');
      targetPort = buffer.readUInt16BE(5 + hostLength);
      offset = 5 + hostLength + 2;
    } else if (addressType === 0x04) {
      // IPv6
      if (buffer.length < 22) {
        return { success: false };
      }
      const ipv6 = buffer.slice(4, 20);
      targetHost = Array.from(ipv6)
        .map((byte, i) => {
          if (i % 2 === 0) {
            return ipv6.readUInt16BE(i).toString(16);
          }
          return '';
        })
        .filter(Boolean)
        .join(':');
      targetPort = buffer.readUInt16BE(20);
      offset = 22;
    } else {
      this.sendReply(socket, 0x08);
      socket.destroy();
      return { success: false };
    }

    // Обработка команды CONNECT
    if (command === 0x01) {
      try {
        // Создаем прямое TCP соединение
        const targetSocket = net.createConnection(targetPort, targetHost, () => {
          // Успешное соединение
          const bindAddress = socket.localAddress || '0.0.0.0';
          const bindPort = socket.localPort || 0;
          this.sendReply(socket, 0x00, bindAddress, bindPort);

          // Релей данных
          socket.pipe(targetSocket);
          targetSocket.pipe(socket);
        });

        targetSocket.on('error', (err) => {
          console.error(`❌ SOCKS5 Target Connection Error (${targetHost}:${targetPort}):`, err.message);
          this.sendReply(socket, 0x05);
          socket.destroy();
        });

        targetSocket.on('close', () => {
          socket.destroy();
        });

        socket.on('close', () => {
          targetSocket.destroy();
        });

        return { 
          success: true, 
          remainingBuffer: buffer.slice(offset) 
        };
      } catch (err) {
        console.error('❌ SOCKS5 Connection Error:', err);
        this.sendReply(socket, 0x05);
        socket.destroy();
        return { success: false };
      }
    } else {
      // Неподдерживаемая команда
      this.sendReply(socket, 0x07);
      socket.destroy();
      return { success: false };
    }
  }

  sendReply(socket, replyCode, bindAddress = '0.0.0.0', bindPort = 0) {
    const addressBytes = this.addressToBytes(bindAddress);
    const reply = Buffer.concat([
      Buffer.from([0x05, replyCode, 0x00]),
      addressBytes,
      Buffer.from([(bindPort >> 8) & 0xFF, bindPort & 0xFF])
    ]);
    socket.write(reply);
  }

  addressToBytes(address) {
    const parts = address.split('.');
    if (parts.length === 4) {
      // IPv4
      return Buffer.from([
        0x01,
        parseInt(parts[0]),
        parseInt(parts[1]),
        parseInt(parts[2]),
        parseInt(parts[3])
      ]);
    } else {
      // Доменное имя
      const addressBuffer = Buffer.from(address, 'utf8');
      return Buffer.concat([
        Buffer.from([0x03, addressBuffer.length]),
        addressBuffer
      ]);
    }
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

module.exports = { SocksServer };