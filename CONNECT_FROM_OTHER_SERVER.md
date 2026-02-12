# Подключение к API Proximatrix с другого сервера

Если вы подключаете бот или другой сервис к API Proximatrix, настройте переменные окружения.

## ⚡ Быстрое решение ошибки "fetch failed"

Если видите ошибку **"❌ Не подключено: fetch failed"**, выполните на сервере Proximatrix (77.221.156.12):

```bash
# 1. Проверьте, что контейнер запущен
docker compose ps

# 2. Проверьте порт 9090 в UFW
ufw status | grep 9090

# 3. Если порта нет — откройте его
ufw allow 9090/tcp
ufw reload

# 4. Проверьте логи API
docker compose logs proximatrix | grep -i api

# 5. Перезапустите контейнер
docker compose restart proximatrix
```

Затем проверьте подключение с вашего ПК:

```powershell
Test-NetConnection -ComputerName 77.221.156.12 -Port 9090
```

Если **TcpTestSucceeded: False** — порт закрыт в панели хостинга (откройте порт 9090 там).

---

## Переменные окружения (.env)

Создайте файл **`.env`** на сервере, где запущен ваш бот/сервис:

```env
PROXY_API_URL=http://77.221.156.12:9090
PROXY_API_KEY=proximatrix-api-key-change-in-production
```

**Важно:** Замените `PROXY_API_KEY` на тот же ключ, что задан в `docker-compose.yml` на сервере Proximatrix (переменная `PROXY_API_KEY`).

---

## Проверка подключения

### С вашего ПК (PowerShell)

```powershell
# Проверка доступности API
Test-NetConnection -ComputerName 77.221.156.12 -Port 9090

# Тест API запроса
$headers = @{
    "X-API-Key" = "proximatrix-api-key-change-in-production"
}
Invoke-RestMethod -Uri "http://77.221.156.12:9090/api/users" -Headers $headers
```

### С другого сервера (Linux)

```bash
# Проверка порта
curl -v http://77.221.156.12:9090/api/users -H "X-API-Key: proximatrix-api-key-change-in-production"

# Должен вернуться JSON: {"users":[]} или список пользователей
```

---

## Решение проблемы "fetch failed"

### 1. Проверьте, что API запущен на сервере Proximatrix

**На сервере 77.221.156.12 (PuTTY):**

```bash
docker compose ps
docker compose logs proximatrix | grep -i api
```

Должна быть строка: `✅ API управления пользователями: http://0.0.0.0:9090`

### 2. Проверьте порт 9090 в файрволе

**На сервере 77.221.156.12:**

```bash
ufw status | grep 9090
```

Если порта нет:
```bash
ufw allow 9090/tcp
ufw reload
```

### 3. Проверьте доступность с интернета

**С вашего ПК:**

```powershell
Test-NetConnection -ComputerName 77.221.156.12 -Port 9090
```

Если **TcpTestSucceeded: False** — порт закрыт на хостинге (панель управления) или файрволом.

### 4. Проверьте правильность URL и ключа

В `.env` на вашем боте/сервере должно быть:

```env
PROXY_API_URL=http://77.221.156.12:9090
PROXY_API_KEY=proximatrix-api-key-change-in-production
```

**Важно:**
- URL должен быть **http://** (не https://), так как API работает по HTTP
- Порт **9090** (не 8080 или другой)
- Ключ должен совпадать с `PROXY_API_KEY` в docker-compose.yml на сервере Proximatrix

### 5. Проверьте логи API на сервере

**На сервере 77.221.156.12:**

```bash
docker compose logs proximatrix | tail -50
```

Если видите ошибки подключения к MongoDB — проверьте, что контейнер `proximatrix-mongo` запущен:

```bash
docker compose ps mongo
docker compose logs mongo | tail -20
```

---

## Пример подключения (Node.js)

Если ваш бот на Node.js:

```javascript
const API_URL = process.env.PROXY_API_URL || 'http://77.221.156.12:9090';
const API_KEY = process.env.PROXY_API_KEY || 'proximatrix-api-key-change-in-production';

async function createUser(telegramId, username) {
  const response = await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      telegramId: String(telegramId),
      username: username,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 год
    }),
  });
  return await response.json();
}
```

---

## Быстрая диагностика

**На сервере Proximatrix (77.221.156.12):**

```bash
# 1. Проверка контейнеров
docker compose ps

# 2. Проверка портов
ss -tulpn | grep 9090

# 3. Проверка файрвола
ufw status | grep 9090

# 4. Тест API изнутри контейнера
docker exec proximatrix-proxy curl -H "X-API-Key: proximatrix-api-key-change-in-production" http://localhost:9090/api/users

# 5. Логи API
docker compose logs proximatrix | grep -i "api\|error"
```

**С вашего ПК:**

```powershell
# Проверка доступности
Test-NetConnection -ComputerName 77.221.156.12 -Port 9090

# Тест запроса
Invoke-WebRequest -Uri "http://77.221.156.12:9090/api/users" -Headers @{"X-API-Key"="proximatrix-api-key-change-in-production"}
```

---

## Частые ошибки

### "fetch failed" или "ECONNREFUSED"

- Порт 9090 не открыт в UFW на сервере Proximatrix
- Порт 9090 закрыт в панели хостинга
- Контейнер `proximatrix-proxy` не запущен
- API не включён (`api.enabled: false` в config.json)

### "401 Unauthorized"

- Неправильный `PROXY_API_KEY` в `.env` (не совпадает с docker-compose)
- Заголовок `X-API-Key` не отправляется

### "500 Internal Server Error"

- MongoDB не подключена (контейнер `proximatrix-mongo` не запущен)
- Неправильный `MONGODB_URI` в docker-compose

---

**После исправления перезапустите контейнеры:**

```bash
docker compose restart proximatrix
```
