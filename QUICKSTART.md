# 🚀 Быстрый старт

## 🐳 Развертывание через Docker (Рекомендуется)

### Автоматическое развертывание

```bash
# Сделайте скрипт исполняемым
chmod +x deploy-docker.sh

# Запустите автоматическое развертывание
./deploy-docker.sh
```

Скрипт автоматически:
- ✅ Проверит подключение к серверу
- ✅ Установит Docker (если нужно)
- ✅ Настроит файрвол
- ✅ Загрузит проект
- ✅ Соберет и запустит контейнер

### Ручное развертывание через Docker

```bash
# 1. Подключитесь к серверу
ssh root@77.221.156.12

# 2. Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Загрузите проект
mkdir -p /opt/proximatrix
cd /opt/proximatrix
# Загрузите файлы через scp или git

# 4. Настройте файрвол
ufw allow 1080/tcp && ufw allow 8080/tcp && ufw allow 8443/tcp

# 5. Запустите
docker compose up -d

# 6. Проверьте
docker compose ps
docker compose logs -f
```

## 💻 Локальная установка и тестирование

### С Docker (локально)

```bash
# Сборка и запуск
docker compose up -d

# Просмотр логов
docker compose logs -f
```

### Без Docker (локально)

```bash
# Установка зависимостей
npm install

# Запуск сервера
npm start
```

Сервер запустится на:
- SOCKS5: `localhost:1080` (для Telegram)
- HTTP: `localhost:8080` (для WhatsApp)
- HTTPS: `localhost:8443` (для WhatsApp)

## 📦 Развертывание без Docker (альтернативный способ)

### Вариант 1: Автоматическое развертывание

```bash
# Сделайте скрипт исполняемым
chmod +x deploy.sh

# Запустите развертывание
./deploy.sh
```

### Вариант 2: Ручное развертывание

```bash
# 1. Подключитесь к серверу
ssh root@77.221.156.12

# 2. Установите Node.js (если еще не установлен)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Создайте директорию проекта
mkdir -p /opt/proximatrix
cd /opt/proximatrix

# 4. Загрузите файлы проекта (используйте scp с вашего компьютера)
# На вашем компьютере выполните:
# scp -r package.json index.js config.json src/ root@77.221.156.12:/opt/proximatrix/

# 5. Установите зависимости
npm install

# 6. Настройте файрвол
ufw allow 1080/tcp
ufw allow 8080/tcp
ufw allow 8443/tcp

# 7. Установите PM2 для постоянной работы
npm install -g pm2

# 8. Запустите сервер
pm2 start index.js --name proximatrix
pm2 save
pm2 startup
```

## Настройка клиентов

### Telegram
- Тип: SOCKS5
- Сервер: `77.221.156.12`
- Порт: `1080`

### WhatsApp
- HTTP прокси: `77.221.156.12:8080`
- HTTPS прокси: `77.221.156.12:8443`

## Проверка работы

```bash
# Проверка SOCKS5
curl --socks5 77.221.156.12:1080 http://ifconfig.me

# Проверка HTTP
curl --proxy http://77.221.156.12:8080 http://ifconfig.me
```

## Управление

```bash
# Просмотр статуса
pm2 status

# Логи
pm2 logs proximatrix

# Перезапуск
pm2 restart proximatrix
```