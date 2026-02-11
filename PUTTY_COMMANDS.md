# 🪟 Команды для PuTTY - Шпаргалка

Быстрый справочник команд для выполнения в PuTTY.

## 🔗 Подключение

**Настройки PuTTY:**
- Host: `77.221.156.12`
- Port: `22`
- Connection type: SSH
- Login: `root`
- Password: `xH06REFgpMae`

**Совет:** Сохраните сессию в PuTTY для быстрого подключения в будущем.

---

## 📋 Основные команды

### Навигация

```bash
# Переход в директорию проекта
cd /opt/proximatrix

# Просмотр текущей директории
pwd

# Список файлов
ls -la

# Просмотр содержимого файла
cat config.json

# Редактирование файла
nano config.json
# В nano: Ctrl+O для сохранения, Ctrl+X для выхода
```

### Установка Docker (если еще не установлен)

```bash
apt update
apt install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Настройка файрвола

```bash
ufw allow 1080/tcp
ufw allow 8080/tcp
ufw allow 8443/tcp
ufw --force enable
ufw status
```

---

## 🐳 Docker команды

### Переход в директорию проекта

```bash
cd /opt/proximatrix
```

### Сборка и запуск

```bash
# Сборка образа
docker compose build

# Запуск контейнера
docker compose up -d

# Запуск с пересборкой
docker compose up -d --build
```

### Управление

```bash
# Статус контейнеров
docker compose ps

# Логи (последние 50 строк)
docker compose logs --tail=50 proximatrix

# Логи в реальном времени
docker compose logs -f proximatrix
# Нажмите Ctrl+C для выхода

# Перезапуск
docker compose restart proximatrix

# Остановка
docker compose stop proximatrix

# Запуск
docker compose start proximatrix

# Остановка и удаление
docker compose down
```

### Проверка

```bash
# Проверка портов
netstat -tulpn | grep -E '1080|8080|8443'

# Использование ресурсов
docker stats proximatrix-proxy
# Нажмите Ctrl+C для выхода

# Информация о контейнере
docker inspect proximatrix-proxy
```

---

## ✅ Проверка работы прокси

```bash
# Тест SOCKS5
curl --socks5 77.221.156.12:1080 http://ifconfig.me

# Тест HTTP
curl --proxy http://77.221.156.12:8080 http://ifconfig.me

# Проверка веб-интерфейса
curl http://77.221.156.12:8080
```

---

## 🔍 Решение проблем

### Контейнер не запускается

```bash
# Проверка логов
docker compose logs proximatrix

# Проверка всех контейнеров (включая остановленные)
docker compose ps -a

# Проверка конфигурации
docker compose config
```

### Прокси не работает

```bash
# Проверка файрвола
ufw status

# Проверка запущенных контейнеров
docker ps

# Проверка портов
ss -tulpn | grep -E '1080|8080|8443'
```

### Пересборка после изменений

```bash
cd /opt/proximatrix
docker compose down
docker compose up -d --build
docker compose logs -f
```

---

## 📝 Редактирование конфигурации

```bash
# Открыть config.json в редакторе
nano /opt/proximatrix/config.json

# После редактирования перезапустить контейнер
docker compose restart proximatrix
```

**Работа с nano:**
- `Ctrl+O` - Сохранить
- `Ctrl+X` - Выйти
- `Ctrl+K` - Вырезать строку
- `Ctrl+U` - Вставить

---

## 💡 Полезные советы для PuTTY

1. **Копирование:** Выделите текст мышью - он автоматически скопируется
2. **Вставка:** Правый клик мыши или `Shift+Insert`
3. **Прокрутка:** Используйте колесико мыши или полосу прокрутки
4. **Отключение:** Введите `exit` или просто закройте окно
5. **Сохранение сессии:** В PuTTY: Session → Saved Sessions → введите имя → Save

---

## 🚀 Быстрый старт (после первого развертывания)

```bash
# Подключитесь через PuTTY, затем:

cd /opt/proximatrix
docker compose ps
docker compose logs --tail=20 proximatrix
```

---

**Готово! Используйте эти команды для управления прокси-сервером.** 🎉