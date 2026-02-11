# API управления пользователями MTProxy (MongoDB)

При включённом API данные хранятся в **MongoDB**. Поля пользователя: `telegramId`, `username`, `secret`, `activatedAt`, `expiresAt`, `enabled`, `createdAt`.

В `config.json` должны быть `api.enabled: true` и задан `MONGODB_URI` (или `config.mongo.uri`). См. [DEPLOY_KEYS.md](DEPLOY_KEYS.md) для ключей и деплоя.

---

## Авторизация

Все запросы к API должны содержать ключ:

- Заголовок: `X-API-Key: ваш-секретный-ключ`
- Или query: `?apiKey=ваш-секретный-ключ`

Без ключа ответ `401 Unauthorized`.

---

## Эндпоинты

### Создать пользователя (выдать новую ссылку)

```http
POST /api/users
Content-Type: application/json
X-API-Key: ваш-секретный-ключ

{
  "telegramId": "123456789",
  "username": "ivan",
  "activatedAt": "2025-02-11",
  "expiresAt": "2026-02-11",
  "enabled": true
}
```

Все поля кроме `secret` опциональны. `secret` генерируется автоматически, если не передан.

Ответ `201`:

```json
{
  "id": "65a1b2c3d4e5f6789012345",
  "telegramId": "123456789",
  "username": "ivan",
  "secret": "a1b2c3d4e5f6...",
  "link": "https://t.me/proxy?server=77.221.156.12&port=8444&secret=a1b2c3d4...",
  "activatedAt": "2025-02-11T00:00:00.000Z",
  "expiresAt": "2026-02-11T00:00:00.000Z",
  "enabled": true,
  "createdAt": "2025-02-11T12:00:00.000Z"
}
```

Ссылку `link` отдайте пользователю для Telegram.

---

### Список пользователей

```http
GET /api/users
X-API-Key: ваш-секретный-ключ
```

Ответ `200`:

```json
{
  "users": [
    {
      "id": "65a1b2c3d4e5f6789012345",
      "telegramId": "123456789",
      "username": "ivan",
      "secret": "a1b2c3d4…",
      "activatedAt": "2025-02-11T00:00:00.000Z",
      "expiresAt": "2026-02-11T00:00:00.000Z",
      "enabled": true,
      "createdAt": "2025-02-11T12:00:00.000Z"
    }
  ]
}
```

---

### Получить ссылку пользователя

```http
GET /api/users/{id}/link
X-API-Key: ваш-секретный-ключ
```

Ответ `200`: `{ "id": "...", "link": "https://t.me/proxy?server=..." }`

---

### Отключить доступ

```http
POST /api/users/{id}/disable
X-API-Key: ваш-секретный-ключ
```

Ответ `200`: `{ "id": "...", "enabled": false }`. Секрет перестаёт приниматься MTProto.

---

### Включить доступ

```http
POST /api/users/{id}/enable
X-API-Key: ваш-секретный-ключ
```

Ответ `200`: `{ "id": "...", "enabled": true }`

---

### Обновить пользователя

```http
PATCH /api/users/{id}
Content-Type: application/json
X-API-Key: ваш-секретный-ключ

{
  "telegramId": "123456789",
  "username": "new_username",
  "activatedAt": "2025-02-11",
  "expiresAt": "2026-03-11",
  "enabled": true
}
```

Ответ `200` — объект пользователя.

---

### Удалить пользователя

```http
DELETE /api/users/{id}
X-API-Key: ваш-секретный-ключ
```

Ответ `200`: `{ "deleted": true }`. Секрет удаляется из БД, ссылка перестаёт работать.

---

## Логика «активного» секрета

Секрет считается активным, если:

- `enabled !== false`
- и (`expiresAt` отсутствует, или `expiresAt` > текущее время)

Только такие секреты принимаются MTProto. После истечения `expiresAt` или при `enabled: false` доступ по этой ссылке блокируется.

---

## Примеры (curl)

```bash
# Создать пользователя
curl -X POST http://77.221.156.12:9090/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ваш-api-ключ" \
  -d '{"telegramId":"123456789","username":"ivan","expiresAt":"2026-02-11"}'

# Список
curl -H "X-API-Key: ваш-api-ключ" http://77.221.156.12:9090/api/users

# Отключить
curl -X POST -H "X-API-Key: ваш-api-ключ" \
  http://77.221.156.12:9090/api/users/65a1b2c3d4e5f6789012345/disable

# Удалить
curl -X DELETE -H "X-API-Key: ваш-api-ключ" \
  http://77.221.156.12:9090/api/users/65a1b2c3d4e5f6789012345
```

Все ключи и шаги деплоя — в [DEPLOY_KEYS.md](DEPLOY_KEYS.md).
