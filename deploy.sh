#!/bin/bash

# Скрипт для развертывания на сервере
# Использование: ./deploy.sh

echo "🚀 Развертывание Proximatrix на сервере..."

SERVER="root@77.221.156.12"
REMOTE_DIR="/opt/proximatrix"

# Проверка подключения
echo "📡 Проверка подключения к серверу..."
ssh $SERVER "echo 'Подключение успешно!'"

# Создание директории на сервере
echo "📁 Создание директории на сервере..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

# Копирование файлов
echo "📤 Копирование файлов..."
scp -r package.json index.js config.json src/ $SERVER:$REMOTE_DIR/

# Установка зависимостей
echo "📦 Установка зависимостей..."
ssh $SERVER "cd $REMOTE_DIR && npm install"

# Настройка файрвола
echo "🔥 Настройка файрвола..."
ssh $SERVER "ufw allow 1080/tcp && ufw allow 8080/tcp && ufw allow 8443/tcp"

# Установка PM2 (если не установлен)
echo "⚙️  Проверка PM2..."
ssh $SERVER "command -v pm2 >/dev/null 2>&1 || npm install -g pm2"

# Перезапуск сервиса
echo "🔄 Перезапуск сервиса..."
ssh $SERVER "cd $REMOTE_DIR && pm2 delete proximatrix 2>/dev/null || true"
ssh $SERVER "cd $REMOTE_DIR && pm2 start index.js --name proximatrix"
ssh $SERVER "pm2 save"

echo "✅ Развертывание завершено!"
echo ""
echo "📊 Статус сервиса:"
ssh $SERVER "pm2 status proximatrix"
echo ""
echo "📝 Логи:"
ssh $SERVER "pm2 logs proximatrix --lines 10"