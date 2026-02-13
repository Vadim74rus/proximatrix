# 🔑 Все ключи проекта Proximatrix

Полный список всех ключей, паролей, токенов и учетных данных, используемых в проекте.

---

## 🖥️ Доступ к серверу

| Параметр | Значение | Где используется |
|----------|----------|------------------|
| **IP адрес** | `77.221.156.12` | SSH подключение, публичный IP прокси |
| **Логин SSH** | `root` | Подключение через PuTTY/SSH |
| **Пароль SSH** | `xH06REFgpMae` | Подключение через PuTTY/SSH |

⚠️ **Важно:** После первого подключения рекомендуется сменить пароль root.

---

## 🗄️ MongoDB

| Параметр | Значение по умолчанию | Где задаётся |
|----------|----------------------|--------------|
| **Пользователь** | `proximatrix` | `docker-compose.yml`: `MONGO_INITDB_ROOT_USERNAME` |
| **Пароль** | `changeme_proximatrix_2026` | `docker-compose.yml`: `MONGO_INITDB_ROOT_PASSWORD` |
| **База данных** | `proximatrix` | Автоматически из URI |
| **Порт** | `27017` | Внутренний порт MongoDB |

### Строка подключения

**Внутри Docker (из контейнера proximatrix):**
```
mongodb://proximatrix:changeme_proximatrix_2026@mongo:27017/proximatrix?authSource=admin
```

**С другого сервера:**
```
mongodb://proximatrix:changeme_proximatrix_2026@77.221.156.12:27017/proximatrix?authSource=admin
```

Переменная окружения: `MONGODB_URI` в `docker-compose.yml`

---

## 🔐 API управления пользователями

| Параметр | Значение по умолчанию | Где задаётся |
|----------|----------------------|--------------|
| **API ключ** | `proximatrix-api-key-change-in-production` | `docker-compose.yml`: `PROXY_API_KEY` или `config.json`: `api.apiKey` |
| **Порт API** | `9090` | `config.json`: `api.port` |
| **Хост API** | `0.0.0.0` | `config.json`: `api.host` |

### Использование

**В заголовке запроса:**
```http
X-API-Key: proximatrix-api-key-change-in-production
```

**Или в query параметре:**
```
?apiKey=proximatrix-api-key-change-in-production
```

**Пример запроса:**
```bash
curl -H "X-API-Key: proximatrix-api-key-change-in-production" \
  http://77.221.156.12:9090/api/users
```

---

## 📢 Уведомления администратору (Telegram)

| Параметр | Значение по умолчанию | Где задаётся |
|----------|----------------------|--------------|
| **URL API уведомлений** | `https://blacknetiv.ru` | `docker-compose.yml`: `NOTIFY_API_URL` |
| **Секрет для уведомлений** | (не задан, пустая строка) | `docker-compose.yml`: `NOTIFY_SECRET` |

### Использование

**В заголовке запроса к внешнему API:**
```http
X-Notify-Secret: ваш-секретный-ключ
```

⚠️ **Важно:** Если `NOTIFY_SECRET` не задан или пустой, уведомления отключены.

---

## 🌐 Публичный IP и порты

| Параметр | Значение | Где задаётся |
|----------|----------|--------------|
| **Публичный IP** | `77.221.156.12` | `docker-compose.yml`: `PROXY_PUBLIC_IP` или `config.json`: `mtproto.publicIp` |
| **MTProto порт** | `8444` | `config.json`: `mtproto.port` |
| **API порт** | `9090` | `config.json`: `api.port` |
| **HTTP прокси порт** | `8080` | `config.json`: `http.port` |
| **HTTPS прокси порт** | `8443` | `config.json`: `https.port` |
| **SOCKS5 порт** | `1080` | `config.json`: `socks5.port` |
| **MongoDB порт** | `27017` | Внутренний порт (можно пробросить наружу) |

---

## 🔒 MTProto секреты

| Параметр | Описание | Где генерируется |
|----------|----------|------------------|
| **Секрет MTProto** | 32-символьная hex строка (например: `ce73574096e3a84066fe1796c6bb03a6`) | Автоматически при создании пользователя через API или в `users-mongo.js`: `generateSecret()` |

**Формат:** 16 байт в hex формате (32 символа)

**Где хранится:** MongoDB, коллекция `users`, поле `secret`

**Пример ссылки:**
```
https://t.me/proxy?server=77.221.156.12&port=8444&secret=ce73574096e3a84066fe1796c6bb03a6
```

---

## 📋 Переменные окружения (docker-compose.yml)

Все ключи задаются в секции `environment` сервиса `proximatrix`:

```yaml
environment:
  PROXY_PUBLIC_IP: "77.221.156.12"
  MONGODB_URI: "mongodb://proximatrix:changeme_proximatrix_2026@mongo:27017/proximatrix?authSource=admin"
  PROXY_API_KEY: "proximatrix-api-key-change-in-production"
  NOTIFY_API_URL: "https://blacknetiv.ru"
  NOTIFY_SECRET: ""
```

И в секции `mongo`:

```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: proximatrix
  MONGO_INITDB_ROOT_PASSWORD: changeme_proximatrix_2026
```

---

## 🔐 Генерация новых ключей

### Генерация API ключа

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Генерация пароля MongoDB

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"

# OpenSSL
openssl rand -base64 24
```

### Генерация секрета для уведомлений

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📝 Чеклист безопасности (перед продакшеном)

- [ ] **Пароль SSH root** изменён
- [ ] **Пароль MongoDB** (`MONGO_INITDB_ROOT_PASSWORD`) изменён на сложный случайный
- [ ] **API ключ** (`PROXY_API_KEY`) заменён на длинную случайную строку
- [ ] **Секрет уведомлений** (`NOTIFY_SECRET`) задан и совпадает с внешним API
- [ ] **MONGODB_URI** обновлён с новым паролем MongoDB
- [ ] Все ключи проверены на совпадение в разных местах конфигурации
- [ ] Порты открыты в UFW и панели хостинга
- [ ] `.env` файлы (если используются) добавлены в `.gitignore`

---

## 🔍 Где используются ключи

### В коде

- **`src/admin-api.js`** — проверка `X-API-Key` для доступа к API
- **`src/notify-service.js`** — отправка `X-Notify-Secret` во внешний API
- **`src/db.js`** — подключение к MongoDB через `MONGODB_URI`
- **`src/users-mongo.js`** — генерация секретов MTProto для пользователей
- **`index.js`** — чтение `PROXY_API_KEY`, `MONGODB_URI`, `PROXY_PUBLIC_IP`

### В конфигурации

- **`docker-compose.yml`** — все переменные окружения
- **`config.json`** — опциональные настройки (приоритет у переменных окружения)

---

## 📖 Дополнительная документация

- **`DEPLOY_KEYS.md`** — подробная инструкция по ключам и деплою
- **`CONNECT_FROM_OTHER_SERVER.md`** — подключение с другого сервера
- **`NOTIFY_SETUP.md`** — настройка уведомлений
- **`API.md`** — документация API

---

## ⚠️ Важные замечания

1. **Все ключи по умолчанию** должны быть изменены перед использованием в продакшене
2. **Не коммитьте** реальные ключи в Git репозиторий
3. **Используйте переменные окружения** вместо хардкода в коде
4. **Храните ключи в безопасности** — не передавайте их в открытом виде
5. **Регулярно ротируйте** ключи (особенно API ключи и пароли)
