# ⚡ Быстрое исправление ошибки "ECONNREFUSED" или "fetch failed"

Если вы видите ошибку подключения к API Proximatrix, выполните эти команды на сервере **77.221.156.12**.

## 🚀 Автоматическое исправление (рекомендуется)

**Подключитесь к серверу через PuTTY и выполните:**

```bash
cd /opt/proximatrix
chmod +x fix-api-connection.sh
./fix-api-connection.sh
```

Скрипт автоматически исправит все проблемы.

---

## 🔧 Ручное исправление

Если скрипт недоступен, выполните команды по порядку:

### 1. Проверьте контейнер

```bash
docker compose ps
```

Если контейнер не запущен (`STATUS` не содержит `Up`), запустите:

```bash
cd /opt/proximatrix
docker compose up -d
```

### 2. Откройте порт 9090 в UFW

```bash
ufw allow 9090/tcp
ufw reload
ufw status | grep 9090
```

Должна быть строка с портом 9090.

### 3. Проверьте логи API

```bash
docker compose logs proximatrix | grep -i api
```

Должна быть строка: `✅ API управления пользователями: http://0.0.0.0:9090`

Если строки нет, перезапустите контейнер:

```bash
docker compose restart proximatrix
sleep 5
docker compose logs proximatrix | tail -20
```

### 4. Проверьте доступность API

```bash
curl -H "X-API-Key: proximatrix-api-key-change-in-production" http://localhost:9090/api/users
```

Должен вернуться JSON: `{"users":[]}` или список пользователей.

---

## ✅ Проверка с вашего ПК

После исправления на сервере, проверьте с вашего компьютера:

**PowerShell:**

```powershell
Test-NetConnection -ComputerName 77.221.156.12 -Port 9090
```

Если **TcpTestSucceeded: True** — порт доступен! ✅

Если **TcpTestSucceeded: False** — откройте порт **9090** в панели управления вашего хостинга.

---

## 📋 Настройки для вашего бота/сервера

Убедитесь, что в `.env` на вашем боте/сервере указано:

```env
PROXY_API_URL=http://77.221.156.12:9090
PROXY_API_KEY=proximatrix-api-key-change-in-production
```

**Важно:** `PROXY_API_KEY` должен совпадать с ключом в `docker-compose.yml` на сервере Proximatrix.

---

## 🔍 Если проблема осталась

1. **Проверьте панель хостинга** — порт 9090 должен быть открыт там
2. **Проверьте логи:** `docker compose logs proximatrix | tail -50`
3. **Проверьте config.json:** должно быть `"api": { "enabled": true, "port": 9090 }`
4. **См. подробную инструкцию:** [CONNECT_FROM_OTHER_SERVER.md](CONNECT_FROM_OTHER_SERVER.md)
