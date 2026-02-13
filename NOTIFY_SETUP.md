# Настройка уведомлений администратору

Система автоматически отправляет уведомления администратору в Telegram при обнаружении подозрительной активности (одновременные подключения с разных IP).

---

## Быстрая настройка

### 1. Добавьте переменные в `docker-compose.yml`

Откройте `docker-compose.yml` и добавьте в секцию `environment` сервиса `proximatrix`:

```yaml
environment:
  PROXY_PUBLIC_IP: "77.221.156.12"
  MONGODB_URI: "mongodb://proximatrix:changeme_proximatrix_2026@mongo:27017/proximatrix?authSource=admin"
  PROXY_API_KEY: "proximatrix-api-key-change-in-production"
  NOTIFY_API_URL: "https://blacknetiv.ru"
  NOTIFY_SECRET: "ваш-секретный-ключ"
```

### 2. Сгенерируйте секретный ключ

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Или используйте любой другой способ генерации случайной строки.

### 3. Перезапустите контейнер

```bash
docker compose restart proximatrix
```

---

## Проверка работы

После настройки при обнаружении подозрительной активности:

1. **В логах** вы увидите:
   ```
   🚨 ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ ОБНАРУЖЕНА!
   ...
   ✅ Уведомление отправлено администратору: 1 получателей
   ```

2. **В Telegram** администратор получит сообщение:
   ```
   [🚨 Подозрительная активность MTProxy]
   Пользователь ID: ...
   Имя: ...
   Username: ...
   Telegram ID: ...
   Секрет: ...
   Новый IP: ...
   Существующие IP: ...
   Причина: Simultaneous connection from different IP

   Решение за вами. При необходимости отключите: POST /api/users/{id}/disable
   ```

---

## Отключение уведомлений

Чтобы отключить уведомления, просто удалите или оставьте пустыми переменные `NOTIFY_API_URL` и `NOTIFY_SECRET` в `docker-compose.yml`:

```yaml
environment:
  NOTIFY_API_URL: ""
  NOTIFY_SECRET: ""
```

Или не добавляйте их вообще — система будет работать без уведомлений, только логирование.

---

## Формат уведомления

Уведомление отправляется через внешний API (`POST /api/notify/admin`) со следующим форматом:

**Заголовок:** `[🚨 Подозрительная активность MTProxy]`

**Тело сообщения:**
```
Пользователь ID: {userId}
Имя: {firstname}
Username: {username}
Telegram ID: {telegramId}
Секрет: {secret первые 8 символов}...
Новый IP: {ip}
Существующие IP: {existingIPs через запятую}
Причина: {reason}

Решение за вами. При необходимости отключите: POST /api/users/{userId}/disable
```

---

## Требования к внешнему API

Внешний API должен поддерживать:

- **Endpoint:** `POST /api/notify/admin`
- **Авторизация:** Заголовок `X-Notify-Secret: ваш-секретный-ключ`
- **Тело запроса:** JSON с полем `message`
- **Ответ:** JSON с полем `ok: true` и опционально `sentTo: число`

Подробнее см. документацию вашего API уведомлений.

---

## Устранение проблем

### Уведомления не отправляются

1. **Проверьте логи:**
   ```bash
   docker compose logs proximatrix | grep "уведомление"
   ```

2. **Проверьте переменные окружения:**
   ```bash
   docker exec proximatrix-proxy printenv | grep NOTIFY
   ```

3. **Проверьте доступность API:**
   ```bash
   curl -X POST https://blacknetiv.ru/api/notify/admin \
     -H "Content-Type: application/json" \
     -H "X-Notify-Secret: ваш-ключ" \
     -d '{"message": "Тест"}'
   ```

### Ошибка "Notifications disabled"

Это означает, что переменные `NOTIFY_API_URL` или `NOTIFY_SECRET` не заданы. Добавьте их в `docker-compose.yml` и перезапустите контейнер.

### Ошибка "HTTP 401"

Проверьте правильность `NOTIFY_SECRET` — он должен совпадать с ключом, настроенным в вашем API уведомлений.
