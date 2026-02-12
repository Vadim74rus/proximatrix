# Ключи и деплой Proximatrix (MongoDB + API)

## Ключи по умолчанию (обязательно смените на продакшене)

| Назначение | Значение по умолчанию | Где задаётся |
|------------|------------------------|--------------|
| **MongoDB пользователь** | `proximatrix` | docker-compose: `MONGO_INITDB_ROOT_USERNAME` |
| **MongoDB пароль** | `changeme_proximatrix_2026` | docker-compose: `MONGO_INITDB_ROOT_PASSWORD` |
| **API-ключ** | `proximatrix-api-key-change-in-production` | docker-compose: `PROXY_API_KEY` или config.json `api.apiKey` |
| **Публичный IP** | `77.221.156.12` | docker-compose: `PROXY_PUBLIC_IP` или config.json `mtproto.publicIp` |

---

## Строка подключения к MongoDB

Внутри Docker (из контейнера proximatrix):

```
mongodb://proximatrix:changeme_proximatrix_2026@mongo:27017/proximatrix?authSource=admin
```

Она задаётся переменной **MONGODB_URI** в docker-compose (уже прописана).

Подключение с **другого сервера** (когда будете поднимать свой бэкенд):

- Хост: `77.221.156.12` (или имя хоста, где запущен MongoDB).
- Порт: **27017** (нужно пробросить в docker-compose и открыть в UFW, см. ниже).
- База: `proximatrix`.
- Пользователь/пароль: те же, что в таблице выше.

Пример URI с другого сервера:

```
mongodb://proximatrix:ВАШ_ПАРОЛЬ@77.221.156.12:27017/proximatrix?authSource=admin
```

---

## Деплой на сервер (кратко)

### 1. Подключение и подготовка

**На сервере (PuTTY):**

```bash
cd /opt/proximatrix
git pull
```

### 2. Порты в UFW

```bash
ufw allow 8444/tcp
ufw allow 9090/tcp
ufw allow 27017/tcp
ufw allow 8080/tcp
ufw allow 8443/tcp
ufw reload
ufw status
```

Порт **27017** нужен, если к MongoDB будут подключаться с другого сервера. Если только из контейнера — можно не открывать.

### 3. Переменные и ключи (перед первым запуском)

Отредактируйте **docker-compose.yml** и замените:

- `MONGO_INITDB_ROOT_PASSWORD` — свой пароль MongoDB.
- `PROXY_API_KEY` — свой секретный ключ для API (длинная случайная строка).
- В `MONGODB_URI` в той же строке замените пароль на тот же, что в `MONGO_INITDB_ROOT_PASSWORD`.

Пример (подставьте свои значения):

```yaml
environment:
  PROXY_PUBLIC_IP: "77.221.156.12"
  MONGODB_URI: "mongodb://proximatrix:ВАШ_ПАРОЛЬ_MONGO@mongo:27017/proximatrix?authSource=admin"
  PROXY_API_KEY: "ваш-длинный-случайный-api-ключ"
```

И в секции mongo:

```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: proximatrix
  MONGO_INITDB_ROOT_PASSWORD: ВАШ_ПАРОЛЬ_MONGO
```

### 4. Включение API в config.json

В `config.json` должно быть:

```json
"api": {
  "enabled": true,
  "port": 9090,
  "host": "0.0.0.0",
  "apiKey": ""
}
```

Ключ API лучше задавать через **PROXY_API_KEY** в docker-compose (как выше), тогда `apiKey` в config можно оставить пустым.

### 5. Сборка и запуск

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs -f
```

Дождитесь строк про MTProto, MongoDB и API. Ошибок быть не должно.

### 6. Проверка API

```bash
curl -H "X-API-Key: ваш-api-ключ" http://77.221.156.12:9090/api/users
```

Ожидается ответ `{"users":[]}`.

Создание пользователя (получить ссылку):

```bash
curl -X POST http://77.221.156.12:9090/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ваш-api-ключ" \
  -d '{"telegramId":"123456789","username":"ivan","activatedAt":"2025-02-11","expiresAt":"2026-02-11"}'
```

В ответе будет поле **link** — ссылка для Telegram.

---

## Коллекция в MongoDB

- **База:** `proximatrix`
- **Коллекция:** `users`

Документ пользователя:

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` | ObjectId | ID в MongoDB |
| `telegramId` | string | Telegram ID пользователя |
| `username` | string | Telegram username |
| `secret` | string | Секрет MTProxy (32 hex) |
| `activatedAt` | Date | Дата активации |
| `expiresAt` | Date или null | Дата окончания (null = без срока) |
| `enabled` | boolean | Включён ли доступ |
| `createdAt` | Date | Дата создания |

Ссылка для Telegram формируется так:

`https://t.me/proxy?server=77.221.156.12&port=8444&secret=<secret>`

---

## Подключение с другого сервера (позже)

📖 **Подробная инструкция:** см. [`CONNECT_FROM_OTHER_SERVER.md`](./CONNECT_FROM_OTHER_SERVER.md)

### Быстрая настройка

1. На сервере 77.221.156.12 открыт порт **9090** для API (UFW и при необходимости панель хостинга).
2. На сервере 77.221.156.12 открыт порт **27017** для MongoDB (если нужен прямой доступ к БД).
3. В docker-compose для MongoDB можно оставить только внутреннюю сеть; если нужен доступ снаружи — пробросить порт:

   ```yaml
   ports:
     - "27017:27017"
   ```

4. На вашем боте/сервере создайте `.env`:

   ```env
   PROXY_API_URL=http://77.221.156.12:9090
   PROXY_API_KEY=proximatrix-api-key-change-in-production
   ```

   **Важно:** `PROXY_API_KEY` должен совпадать с `PROXY_API_KEY` в docker-compose.yml на сервере Proximatrix.

5. API доступен по адресу `http://77.221.156.12:9090` (при открытом порте 9090). Все ключи храните в безопасности и не коммитьте в репозиторий.

---

## Чеклист перед продакшеном

- [ ] Пароль MongoDB изменён и совпадает в `MONGO_INITDB_ROOT_PASSWORD` и в `MONGODB_URI`.
- [ ] `PROXY_API_KEY` заменён на свой длинный случайный ключ.
- [ ] В config или в env задан правильный `PROXY_PUBLIC_IP` (77.221.156.12 или ваш домен).
- [ ] Порты 8444, 9090, 8080, 8443 (и при необходимости 27017) открыты в UFW.
- [ ] После деплоя проверены: логи контейнеров, ответ API и создание пользователя с получением ссылки.

После этого можно подключать второй сервер к API и к MongoDB по описанным выше ключам и URI.
