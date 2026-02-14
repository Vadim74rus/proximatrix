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
  "firstname": "Иван",
  "activatedAt": "2025-02-11",
  "expiresAt": "2026-02-11",
  "enabled": true
}
```

Все поля кроме `secret` опциональны. `secret` генерируется автоматически, если не передан. Чтобы использовать **конкретный секрет** (например, из ссылки @MTProxyBot), передайте `"secret": "32_символа_hex"` и `"enabled": true`. Если ссылка не подключается — см. [PROXY_CONNECTION_CHECKLIST.md](PROXY_CONNECTION_CHECKLIST.md).

Ответ `201`:

```json
{
  "id": "65a1b2c3d4e5f6789012345",
  "telegramId": "123456789",
  "username": "ivan",
  "firstname": "Иван",
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
      "firstname": "Иван",
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
  "firstname": "Новое Имя",
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

### История подключений пользователя

```http
GET /api/users/{id}/connections?limit=50
X-API-Key: ваш-секретный-ключ
```

Параметр `limit` (опционально, по умолчанию 50) — количество последних записей.

Ответ `200`:

```json
{
  "userId": "65a1b2c3d4e5f6789012345",
  "connections": [
    {
      "ip": "192.168.1.100",
      "status": "connected",
      "reason": null,
      "timestamp": "2025-02-11T12:30:00.000Z",
      "telegramId": "123456789",
      "firstname": "Иван",
      "username": "ivan"
    },
    {
      "ip": "10.0.0.50",
      "status": "suspicious",
      "reason": "Simultaneous connection from different IP",
      "timestamp": "2025-02-11T12:25:00.000Z",
      "telegramId": "123456789",
      "firstname": "Иван",
      "username": "ivan"
    }
  ]
}
```

Статусы: `connected`, `disconnected`, `suspicious`, `blocked`.

**Важно:** В истории подключений отображаются данные **владельца секрета** из базы данных (telegramId, firstname, username). Если секрет используется с разных IP, для всех IP будут показаны данные владельца секрета. MTProto прокси не передает информацию о реальном подключившемся пользователе.

---

### Сбросить разрешенные IP адреса

```http
POST /api/users/{id}/reset-ips
X-API-Key: ваш-секретный-ключ
```

Сбрасывает список разрешенных IP адресов. После сброса при следующем подключении IP будет добавлен автоматически.

Ответ `200`:

```json
{
  "id": "65a1b2c3d4e5f6789012345",
  "message": "Allowed IPs reset",
  "allowedIPs": []
}
```

Используйте после включения пользователя, если нужно разрешить подключение с нового IP.

---

## Логика «активного» секрета

Секрет считается активным, если:

- `enabled !== false`
- и (`expiresAt` отсутствует, или `expiresAt` > текущее время)

Только такие секреты принимаются MTProto. После истечения `expiresAt` или при `enabled: false` доступ по этой ссылке блокируется.

---

## Контроль доступа по IP

Система отслеживает IP-адреса подключений для каждого секрета:

- **Первое подключение**: IP автоматически добавляется в список разрешенных
- **Одновременные подключения с разных IP**: Все подключения **разрешаются**. Администратору отправляется уведомление в Telegram; решение (отключить пользователя и т.д.) принимает администратор через `POST /api/users/{id}/disable`
- **Уведомления**: При подозрительной активности в логах и в Telegram выводится информация об аккаунте
- **История**: Все события логируются в `connectionHistory` (статусы: `connected`, `disconnected`, `suspicious`)
- **Сброс IP**: Список разрешенных IP можно сбросить через `POST /api/users/{id}/reset-ips`

---

## Примеры (curl)

```bash
# Создать пользователя
curl -X POST http://77.221.156.12:9090/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ваш-api-ключ" \
  -d '{"telegramId":"123456789","username":"ivan","firstname":"Иван","expiresAt":"2026-02-11"}'

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
