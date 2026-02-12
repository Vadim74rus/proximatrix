# 🔄 Полная переустановка Proximatrix на сервере

Пошаговые команды для полной переустановки проекта из GitHub.

---

## 📋 ШАГ 1: Подключение к серверу

**💻 НА ВАШЕМ КОМПЬЮТЕРЕ:**

Откройте **PuTTY** и подключитесь к серверу:
- **Host:** `77.221.156.12`
- **Port:** `22`
- **Login:** `root`
- **Password:** `xH06REFgpMae`

---

## 🛑 ШАГ 2: Остановка и удаление старых контейнеров

**🖥️ НА СЕРВЕРЕ** (в окне PuTTY):

Выполните команды по порядку:

```bash
cd /opt/proximatrix
```

```bash
docker compose down
```

```bash
docker compose ps -a
```

Проверьте, что контейнеры остановлены. Если есть контейнеры со статусом `Exited` или `Created`, удалите их:

```bash
docker rm -f proximatrix-proxy proximatrix-mongo 2>/dev/null || true
```

---

## 🗑️ ШАГ 3: Удаление старой директории (опционально)

**🖥️ НА СЕРВЕРЕ:**

Если хотите полностью удалить старую версию:

```bash
cd /opt
```

```bash
rm -rf proximatrix
```

**⚠️ Внимание:** Это удалит все локальные изменения! Если хотите сохранить `config.json` или другие файлы, сначала скопируйте их.

---

## 📥 ШАГ 4: Клонирование репозитория из GitHub

**🖥️ НА СЕРВЕРЕ:**

```bash
cd /opt
```

```bash
git clone https://github.com/Vadim74rus/proximatrix.git proximatrix
```

Если репозиторий приватный, Git запросит логин и пароль:
- **Username:** `Vadim74rus`
- **Password:** используйте Personal Access Token (не обычный пароль!)

Если нужно использовать токен напрямую:

```bash
git clone https://ВАШ_ТОКЕН@github.com/Vadim74rus/proximatrix.git proximatrix
```

---

## 📁 ШАГ 5: Переход в директорию проекта

**🖥️ НА СЕРВЕРЕ:**

```bash
cd /opt/proximatrix
```

```bash
ls -la
```

Проверьте, что все файлы на месте (должны быть: `Dockerfile`, `docker-compose.yml`, `package.json`, `config.json`, папка `src/`).

---

## 🔥 ШАГ 6: Настройка файрвола (UFW)

**🖥️ НА СЕРВЕРЕ:**

Откройте необходимые порты:

```bash
ufw allow 8444/tcp comment 'MTProto для Telegram'
```

```bash
ufw allow 1080/tcp comment 'SOCKS5 для Telegram'
```

```bash
ufw allow 8080/tcp comment 'HTTP для WhatsApp'
```

```bash
ufw allow 8443/tcp comment 'HTTPS для WhatsApp'
```

```bash
ufw allow 9090/tcp comment 'API управления пользователями'
```

```bash
ufw --force enable
```

```bash
ufw status
```

Проверьте, что все порты открыты (8444, 1080, 8080, 8443, 9090).

---

## ⚙️ ШАГ 7: Настройка ключей (если нужно)

**🖥️ НА СЕРВЕРЕ:**

Отредактируйте `docker-compose.yml` для изменения ключей (опционально):

```bash
nano docker-compose.yml
```

Или используйте значения по умолчанию (они уже указаны в файле).

**Нажмите `Ctrl+X`, затем `Y`, затем `Enter`** для сохранения (если редактировали).

---

## 🏗️ ШАГ 8: Сборка и запуск Docker контейнеров

**🖥️ НА СЕРВЕРЕ:**

```bash
cd /opt/proximatrix
```

```bash
docker compose build --no-cache
```

Дождитесь завершения сборки (может занять несколько минут).

```bash
docker compose up -d
```

Флаг `-d` запускает контейнеры в фоновом режиме.

---

## ✅ ШАГ 9: Проверка статуса

**🖥️ НА СЕРВЕРЕ:**

```bash
docker compose ps
```

Вы должны увидеть два контейнера:
- `proximatrix-proxy` со статусом `Up`
- `proximatrix-mongo` со статусом `Up (healthy)`

---

## 📊 ШАГ 10: Просмотр логов

**🖥️ НА СЕРВЕРЕ:**

```bash
docker compose logs -f proximatrix
```

Вы должны увидеть сообщения:
```
🚀 Запуск прокси-сервера Proximatrix...
✅ MongoDB подключена, кэш секретов обновлён
✅ MTProto прокси запущен на порту 8444 (для Telegram)
✅ API управления пользователями: http://0.0.0.0:9090
✅ HTTP прокси запущен на порту 8080 (для WhatsApp)
✅ HTTPS прокси запущен на порту 8443 (для WhatsApp)
```

**Нажмите `Ctrl+C`** чтобы выйти из просмотра логов.

---

## 🧪 ШАГ 11: Проверка работы API

**🖥️ НА СЕРВЕРЕ:**

```bash
curl -H "X-API-Key: proximatrix-api-key-change-in-production" http://localhost:9090/api/users
```

Должен вернуться JSON: `{"users":[]}` или список пользователей.

---

## ✅ Готово!

Проект успешно переустановлен и запущен!

---

## 📝 Краткая версия (все команды подряд)

Если хотите выполнить всё быстро, вот все команды подряд (копируйте и вставляйте по блокам):

```bash
# Остановка старых контейнеров
cd /opt/proximatrix
docker compose down
docker rm -f proximatrix-proxy proximatrix-mongo 2>/dev/null || true

# Удаление старой директории (опционально)
cd /opt
rm -rf proximatrix

# Клонирование из GitHub
git clone https://github.com/Vadim74rus/proximatrix.git proximatrix

# Переход в директорию
cd /opt/proximatrix

# Настройка файрвола
ufw allow 8444/tcp comment 'MTProto для Telegram'
ufw allow 1080/tcp comment 'SOCKS5 для Telegram'
ufw allow 8080/tcp comment 'HTTP для WhatsApp'
ufw allow 8443/tcp comment 'HTTPS для WhatsApp'
ufw allow 9090/tcp comment 'API управления пользователями'
ufw --force enable

# Сборка и запуск
docker compose build --no-cache
docker compose up -d

# Проверка
docker compose ps
docker compose logs -f proximatrix
```

---

## 🔍 Если что-то пошло не так

1. **Проверьте логи:** `docker compose logs proximatrix`
2. **Проверьте статус:** `docker compose ps`
3. **Перезапустите:** `docker compose restart`
4. **См. инструкцию:** [DEPLOY.md](DEPLOY.md) или [QUICK_FIX_API.md](QUICK_FIX_API.md)
