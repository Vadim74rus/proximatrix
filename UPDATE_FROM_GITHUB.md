# 🔄 Обновление проекта из GitHub и перезапуск

Команды для обновления кода из GitHub и перезапуска контейнеров.

---

## 📋 Команды по порядку

**🖥️ НА СЕРВЕРЕ** (в окне PuTTY):

### ШАГ 1: Остановка контейнеров

```bash
cd /opt/proximatrix
```

```bash
docker compose down
```

### ШАГ 2: Скачивание изменений из GitHub

```bash
git pull
```

Если Git запросит логин и пароль:
- **Username:** `Vadim74rus`
- **Password:** используйте Personal Access Token (не обычный пароль!)

### ШАГ 3: Пересборка контейнеров (если нужно)

Если были изменения в `Dockerfile` или `package.json`:

```bash
docker compose build --no-cache
```

Если изменений в зависимостях не было, можно пропустить этот шаг.

### ШАГ 4: Запуск контейнеров

```bash
docker compose up -d
```

### ШАГ 5: Проверка статуса

```bash
docker compose ps
```

### ШАГ 6: Просмотр логов

```bash
docker compose logs -f proximatrix
```

**Нажмите `Ctrl+C`** чтобы выйти из просмотра логов.

---

## 📝 Все команды одним блоком (для копирования)

```bash
# Остановка контейнеров
cd /opt/proximatrix
docker compose down

# Скачивание изменений из GitHub
git pull

# Пересборка (опционально, если были изменения в Dockerfile/package.json)
docker compose build --no-cache

# Запуск контейнеров
docker compose up -d

# Проверка статуса
docker compose ps

# Просмотр логов
docker compose logs -f proximatrix
```

---

## ⚡ Быстрая версия (без пересборки)

Если изменений в зависимостях не было:

```bash
cd /opt/proximatrix && docker compose down && git pull && docker compose up -d && docker compose ps
```

---

## 🔍 Если что-то пошло не так

1. **Проверьте статус:** `docker compose ps`
2. **Проверьте логи:** `docker compose logs proximatrix`
3. **Перезапустите:** `docker compose restart`
4. **Если нужно полностью пересобрать:** `docker compose build --no-cache && docker compose up -d`
