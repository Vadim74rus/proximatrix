# 🔑 Ключи для подключения с другого сервера

Ключи и настройки, которые нужно использовать на вашем боте/другом сервере для подключения к API Proximatrix.

---

## 📋 Переменные окружения (.env)

Создайте файл **`.env`** на вашем боте/другом сервере:

```env
# URL API Proximatrix
PROXY_API_URL=http://77.221.156.12:9090

# API ключ для авторизации (должен совпадать с PROXY_API_KEY на сервере Proximatrix)
PROXY_API_KEY=proximatrix-api-key-change-in-production
```

---

## 🔐 Ключи для API запросов

### API URL
```
http://77.221.156.12:9090
```

### API ключ
```
proximatrix-api-key-change-in-production
```

**Важно:** Этот ключ должен совпадать с `PROXY_API_KEY` в `docker-compose.yml` на сервере Proximatrix (77.221.156.12).

---

## 📝 Примеры использования

### Node.js

```javascript
const API_URL = process.env.PROXY_API_URL || 'http://77.221.156.12:9090';
const API_KEY = process.env.PROXY_API_KEY || 'proximatrix-api-key-change-in-production';

// Создать пользователя
async function createUser(telegramId, username, firstname) {
  const response = await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      telegramId: String(telegramId),
      username: username,
      firstname: firstname,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 год
    }),
  });
  return await response.json();
}

// Получить список пользователей
async function getUsers() {
  const response = await fetch(`${API_URL}/api/users`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  return await response.json();
}

// Получить ссылку пользователя
async function getUserLink(userId) {
  const response = await fetch(`${API_URL}/api/users/${userId}/link`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  return await response.json();
}

// Отключить пользователя
async function disableUser(userId) {
  const response = await fetch(`${API_URL}/api/users/${userId}/disable`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  return await response.json();
}

// Включить пользователя
async function enableUser(userId) {
  const response = await fetch(`${API_URL}/api/users/${userId}/enable`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  return await response.json();
}

// Получить историю подключений
async function getConnectionHistory(userId, limit = 50) {
  const response = await fetch(`${API_URL}/api/users/${userId}/connections?limit=${limit}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  return await response.json();
}
```

### Python

```python
import os
import requests

API_URL = os.getenv('PROXY_API_URL', 'http://77.221.156.12:9090')
API_KEY = os.getenv('PROXY_API_KEY', 'proximatrix-api-key-change-in-production')

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
}

# Создать пользователя
def create_user(telegram_id, username, firstname):
    response = requests.post(
        f'{API_URL}/api/users',
        headers=headers,
        json={
            'telegramId': str(telegram_id),
            'username': username,
            'firstname': firstname,
            'expiresAt': '2026-02-11',
        }
    )
    return response.json()

# Получить список пользователей
def get_users():
    response = requests.get(f'{API_URL}/api/users', headers=headers)
    return response.json()

# Отключить пользователя
def disable_user(user_id):
    response = requests.post(f'{API_URL}/api/users/{user_id}/disable', headers=headers)
    return response.json()
```

### cURL

```bash
# Переменные окружения
export PROXY_API_URL="http://77.221.156.12:9090"
export PROXY_API_KEY="proximatrix-api-key-change-in-production"

# Создать пользователя
curl -X POST "$PROXY_API_URL/api/users" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PROXY_API_KEY" \
  -d '{
    "telegramId": "123456789",
    "username": "ivan",
    "firstname": "Иван",
    "expiresAt": "2026-02-11"
  }'

# Получить список пользователей
curl -H "X-API-Key: $PROXY_API_KEY" "$PROXY_API_URL/api/users"

# Получить ссылку пользователя
curl -H "X-API-Key: $PROXY_API_KEY" "$PROXY_API_URL/api/users/{userId}/link"

# Отключить пользователя
curl -X POST -H "X-API-Key: $PROXY_API_KEY" "$PROXY_API_URL/api/users/{userId}/disable"

# Включить пользователя
curl -X POST -H "X-API-Key: $PROXY_API_KEY" "$PROXY_API_URL/api/users/{userId}/enable"

# История подключений
curl -H "X-API-Key: $PROXY_API_KEY" "$PROXY_API_URL/api/users/{userId}/connections"
```

---

## 🔒 Авторизация

Все запросы к API должны содержать ключ в заголовке:

```http
X-API-Key: proximatrix-api-key-change-in-production
```

Или в query параметре:

```
?apiKey=proximatrix-api-key-change-in-production
```

Без ключа или с неверным ключом — ответ `401 Unauthorized`.

---

## 📊 Доступные endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/users` | Список всех пользователей |
| `POST` | `/api/users` | Создать пользователя |
| `GET` | `/api/users/{id}` | Получить пользователя |
| `PATCH` | `/api/users/{id}` | Обновить пользователя |
| `DELETE` | `/api/users/{id}` | Удалить пользователя |
| `GET` | `/api/users/{id}/link` | Получить ссылку MTProto |
| `POST` | `/api/users/{id}/enable` | Включить пользователя |
| `POST` | `/api/users/{id}/disable` | Отключить пользователя |
| `GET` | `/api/users/{id}/connections` | История подключений |
| `POST` | `/api/users/{id}/reset-ips` | Сбросить разрешенные IP |

---

## ⚠️ Важно

1. **API ключ** (`PROXY_API_KEY`) должен совпадать на обоих серверах:
   - На сервере Proximatrix (в `docker-compose.yml`)
   - На вашем боте/другом сервере (в `.env`)

2. **Порт 9090** должен быть открыт в UFW на сервере Proximatrix:
   ```bash
   ufw allow 9090/tcp
   ```

3. **Проверка подключения:**
   ```bash
   curl -H "X-API-Key: proximatrix-api-key-change-in-production" \
     http://77.221.156.12:9090/api/users
   ```
   Должен вернуться JSON: `{"users":[]}` или список пользователей.

---

## 📖 Полная документация API

См. **[API.md](API.md)** — подробное описание всех endpoints, параметров и примеров.

---

## 🔍 Проверка подключения

### С вашего ПК (PowerShell)

```powershell
$headers = @{
    "X-API-Key" = "proximatrix-api-key-change-in-production"
}
Invoke-RestMethod -Uri "http://77.221.156.12:9090/api/users" -Headers $headers
```

### С другого сервера (Linux)

```bash
curl -H "X-API-Key: proximatrix-api-key-change-in-production" \
  http://77.221.156.12:9090/api/users
```

---

## 🚨 Если подключение не работает

1. Проверьте, что порт 9090 открыт на сервере Proximatrix:
   ```bash
   ufw status | grep 9090
   ```

2. Проверьте, что API ключ совпадает:
   - На сервере Proximatrix: `docker exec proximatrix-proxy printenv PROXY_API_KEY`
   - На вашем сервере: значение в `.env` файле

3. См. **[CONNECT_FROM_OTHER_SERVER.md](CONNECT_FROM_OTHER_SERVER.md)** для диагностики
