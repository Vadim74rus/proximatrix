# Proximatrix - Прокси-сервер для Telegram и WhatsApp

Прокси-сервер на Node.js для работы с Telegram и WhatsApp через ваш виртуальный сервер.

## 🚀 Возможности

- ✅ **MTProto прокси для Telegram** (порт 8444) — рекомендуемый тип для Telegram
- ✅ **Мультипользователь и API** — пользователи в MongoDB (telegramId, username, secret, дата активации/окончания), управление по API
- ✅ SOCKS5 прокси для Telegram (порт 1080, опционально)
- ✅ HTTP прокси для WhatsApp (порт 8080)
- ✅ HTTPS прокси для WhatsApp (порт 8443)
- ✅ Docker контейнеризация для простого развертывания
- ✅ Простая настройка через config.json
- ✅ Логирование подключений

## 📋 Требования

- Docker и Docker Compose (рекомендуется)
- Или Node.js 16+ для прямого запуска
- Ubuntu 24.04 (или другая Linux система)
- Минимум 2 GB RAM
- Доступ к серверу по SSH

## 🐳 Быстрое развертывание через Docker (Рекомендуется)

**📖 Полная инструкция:** См. [DEPLOY.md](DEPLOY.md) - пошаговое руководство от подключения к серверу до настройки клиентов (включает инструкции для Windows/PuTTY и Linux/Mac)

### Автоматическое развертывание

```bash
# Сделайте скрипт исполняемым
chmod +x deploy-docker.sh

# Запустите автоматическое развертывание
./deploy-docker.sh
```

### Ручное развертывание

```bash
# 1. Подключитесь к серверу
ssh root@77.221.156.12

# 2. Установите Docker (если еще не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Загрузите проект
mkdir -p /opt/proximatrix
cd /opt/proximatrix
# Загрузите файлы через scp или git

# 4. Настройте файрвол
ufw allow 8444/tcp   # MTProto для Telegram
ufw allow 1080/tcp
ufw allow 8080/tcp
ufw allow 8443/tcp

# 5. Запустите через Docker Compose
docker compose up -d

# 6. Проверьте статус
docker compose ps
docker compose logs -f
```

## 🔧 Установка без Docker (альтернативный способ)

### 1. Подключитесь к серверу

```bash
ssh root@77.221.156.12
```

### 2. Установите Node.js

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверка версии
node --version
npm --version
```

### 3. Установите проект

```bash
# Создайте директорию для проекта
mkdir -p /opt/proximatrix
cd /opt/proximatrix

# Загрузите файлы проекта (используйте git или scp)
# Если используете git:
git clone <ваш-репозиторий> .

# Или загрузите файлы через scp с локального компьютера:
# scp -r . root@77.221.156.12:/opt/proximatrix/

# Установите зависимости
npm install
```

### 4. Настройте файрвол

```bash
# Разрешите порты в UFW
ufw allow 1080/tcp   # SOCKS5 для Telegram
ufw allow 8080/tcp   # HTTP для WhatsApp
ufw allow 8443/tcp   # HTTPS для WhatsApp

# Или если используете iptables:
iptables -A INPUT -p tcp --dport 1080 -j ACCEPT
iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
iptables -A INPUT -p tcp --dport 8443 -j ACCEPT
```

### 5. Запустите сервер

```bash
# Запуск вручную
npm start

# Или используйте PM2 для постоянной работы
npm install -g pm2
pm2 start index.js --name proximatrix
pm2 save
pm2 startup
```

## ⚙️ Конфигурация

Отредактируйте `config.json` для изменения настроек:

```json
{
  "socks5": {
    "enabled": true,
    "host": "0.0.0.0",
    "port": 1080
  },
  "http": {
    "enabled": true,
    "host": "0.0.0.0",
    "port": 8080
  },
  "https": {
    "enabled": true,
    "host": "0.0.0.0",
    "port": 8443
  }
}
```

## 📱 Настройка клиентов

### Telegram (MTProto — рекомендуется)

1. Запустите прокси и посмотрите в логах строку **Secret** и **Ссылка для Telegram**
2. В Telegram: **Настройки** → **Данные и хранилище** → **Прокси**
3. Нажмите **Добавить прокси** → выберите **MTProto**
4. Вставьте ссылку вида:  
   `https://t.me/proxy?server=77.221.156.12&port=8444&secret=XXXX`  
   (или введите вручную: сервер `77.221.156.12`, порт `8444`, секрет из логов)
5. Сохраните и включите прокси

### Telegram (SOCKS5 — альтернатива)

1. Откройте Telegram → **Настройки** → **Продвинутые** → **Прокси-серверы**
2. Тип: **SOCKS5**, Сервер: `77.221.156.12`, Порт: `1080`
3. Сохраните и активируйте (в config.json включите `socks5.enabled: true`)

### WhatsApp

**Подробная инструкция:** [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md)

**Кратко — WhatsApp Web (в браузере):**

1. Прокси настраивается **в браузере**, не в самом WhatsApp.
2. **Chrome/Edge:** установите расширение **Proxy SwitchyOmega** → создайте профиль → HTTP: `77.221.156.12`, порт `8080`; HTTPS: `77.221.156.12`, порт `8443` → включите профиль → откройте [web.whatsapp.com](https://web.whatsapp.com).
3. **Firefox:** Настройки → Сеть → Настройки → Ручная настройка прокси → HTTP: `77.221.156.12:8080`, HTTPS: `77.221.156.12:8443` → OK → откройте [web.whatsapp.com](https://web.whatsapp.com).

**Мобильный WhatsApp:** в приложении нет встроенного прокси. Варианты: системный прокси Wi‑Fi (Android), приложение-прокси или VPN через ваш сервер. Подробнее — в [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md).

## 🔍 Проверка работы

### Проверка SOCKS5 прокси

```bash
curl --socks5 77.221.156.12:1080 http://ifconfig.me
```

### Проверка HTTP прокси

```bash
curl --proxy http://77.221.156.12:8080 http://ifconfig.me
```

## 🐳 Управление Docker контейнером

```bash
# Просмотр статуса
docker compose ps

# Просмотр логов
docker compose logs -f proximatrix

# Перезапуск
docker compose restart proximatrix

# Остановка
docker compose stop proximatrix

# Запуск
docker compose start proximatrix

# Пересборка после изменений
docker compose up -d --build

# Удаление
docker compose down
```

## 🛠️ Управление сервисом (PM2 - для установки без Docker)

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs proximatrix

# Перезапуск
pm2 restart proximatrix

# Остановка
pm2 stop proximatrix

# Удаление из автозапуска
pm2 delete proximatrix
```

## 📊 Мониторинг

Проверьте логи для отслеживания подключений:

```bash
# Если используете PM2
pm2 logs proximatrix

# Или напрямую
npm start
```

## 🔌 Подключение с другого сервера (API)

Если вы хотите подключить бот или другой сервис к API Proximatrix для управления пользователями MTProxy:

📖 **Подробная инструкция:** [CONNECT_FROM_OTHER_SERVER.md](CONNECT_FROM_OTHER_SERVER.md)

**Быстрая настройка:**

1. На сервере Proximatrix порт **9090** должен быть открыт в UFW
2. Создайте `.env` на вашем боте/сервере:

   ```env
   PROXY_API_URL=http://77.221.156.12:9090
   PROXY_API_KEY=proximatrix-api-key-change-in-production
   ```

3. Ключ `PROXY_API_KEY` должен совпадать с `PROXY_API_KEY` в `docker-compose.yml` на сервере Proximatrix

**Документация API:** [API.md](API.md)  
**Ключи и настройки:** [DEPLOY_KEYS.md](DEPLOY_KEYS.md)  
**Канал спонсора в Telegram:** [SPONSOR_CHANNEL.md](SPONSOR_CHANNEL.md)  
**Домен и сайт (DNS, nginx):** [DOMAIN_AND_WEBSITE.md](DOMAIN_AND_WEBSITE.md)  
**Не подключается к прокси?** [PROXY_CONNECTION_CHECKLIST.md](PROXY_CONNECTION_CHECKLIST.md)

## 🔒 Безопасность

⚠️ **Важно:** Для продакшена обязательно:

1. Измените `PROXY_API_KEY` в docker-compose.yml на свой длинный случайный ключ
2. Измените пароль MongoDB (`MONGO_INITDB_ROOT_PASSWORD`) в docker-compose.yml
3. Используйте HTTPS для API (настройте reverse proxy с SSL)
4. Настройте rate limiting для API
5. Ограничьте доступ к портам через файрвол (только нужные IP)

## 🐛 Решение проблем

### Прокси не работает

**Для Docker:**
1. Проверьте статус контейнера: `docker compose ps`
2. Проверьте логи: `docker compose logs proximatrix`
3. Проверьте порты: `netstat -tulpn | grep -E '1080|8080|8443'`
4. Проверьте файрвол: `ufw status`

**Для прямого запуска:**
1. Проверьте, что сервер запущен: `pm2 status` или `ps aux | grep node`
2. Проверьте порты: `netstat -tulpn | grep -E '1080|8080|8443'`
3. Проверьте файрвол: `ufw status` или `iptables -L`
4. Проверьте логи: `pm2 logs proximatrix`

### Telegram не подключается

- Убедитесь, что используете SOCKS5, а не HTTP
- Проверьте, что порт 1080 открыт
- Попробуйте другой прокси-сервер для проверки

### WhatsApp не работает

- Убедитесь, что прокси настроен в браузере правильно
- Проверьте, что порты 8080 и 8443 открыты
- Попробуйте использовать HTTPS прокси вместо HTTP

## 📝 Лицензия

ISC

## 👤 Автор

Proximatrix Project