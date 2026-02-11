# Используем официальный образ Node.js на базе Alpine (легковесный)
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости (если есть)
RUN npm install --production || true

# Копируем остальные файлы проекта
COPY . .

# Создаем непривилегированного пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Переключаемся на непривилегированного пользователя
USER nodejs

# Открываем порты для прокси (MTProto 8444, SOCKS5 1080, HTTP 8080, HTTPS 8443)
EXPOSE 8444 1080 8080 8443

# Запускаем приложение
CMD ["node", "index.js"]