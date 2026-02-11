# 🚀 Начните здесь - Быстрое развертывание

## 📋 Что нужно сделать

### 🪟 Если вы используете Windows и PuTTY:

**👉 Следуйте инструкции:** [DEPLOY.md](DEPLOY.md)

В файле DEPLOY.md есть подробные инструкции для Windows пользователей с PuTTY, включая использование WinSCP для загрузки файлов.

### 🐧 Если вы используете Linux/Mac:

1. **Подключитесь к серверу**
   ```bash
   ssh root@77.221.156.12
   # Пароль: xH06REFgpMae
   ```

2. **Запустите автоматическое развертывание**
   
   **На вашем локальном компьютере:**
   ```bash
   chmod +x deploy-docker.sh
   ./deploy-docker.sh
   ```
   
   Скрипт автоматически выполнит все необходимые шаги!

3. **Или разверните вручную** (см. [DEPLOY.md](DEPLOY.md))

## 📚 Документация

- **[DEPLOY.md](DEPLOY.md)** - Подробная инструкция от подключения до деплоя
- **[WEBSTORM_GITHUB.md](WEBSTORM_GITHUB.md)** - Загрузка проекта в GitHub через WebStorm ⭐
- **[GITHUB_SETUP.md](GITHUB_SETUP.md)** - Инструкция по загрузке проекта в GitHub
- **[QUICKSTART.md](QUICKSTART.md)** - Быстрый старт
- **[DOCKER_COMMANDS.md](DOCKER_COMMANDS.md)** - Шпаргалка по Docker командам
- **[README.md](README.md)** - Общая информация о проекте

## ⚡ Быстрые команды после развертывания

```bash
# Подключитесь к серверу
ssh root@77.221.156.12

# Перейдите в директорию проекта
cd /opt/proximatrix

# Просмотр статуса
docker compose ps

# Просмотр логов
docker compose logs -f

# Перезапуск
docker compose restart
```

## 📱 Настройка клиентов

### Telegram
- Тип: **SOCKS5**
- Сервер: `77.221.156.12`
- Порт: `1080`

### WhatsApp
- HTTP: `77.221.156.12:8080`
- HTTPS: `77.221.156.12:8443`

## ✅ Проверка работы

```bash
# Тест SOCKS5
curl --socks5 77.221.156.12:1080 http://ifconfig.me

# Тест HTTP
curl --proxy http://77.221.156.12:8080 http://ifconfig.me
```

---

**Готово! Следуйте инструкциям выше для быстрого развертывания.** 🎉