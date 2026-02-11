# 🐳 Docker команды - Шпаргалка

## Быстрый старт

```bash
# Автоматическое развертывание
chmod +x deploy-docker.sh
./deploy-docker.sh
```

## Основные команды

### Запуск и остановка

```bash
# Запуск в фоновом режиме
docker compose up -d

# Остановка
docker compose stop

# Перезапуск
docker compose restart

# Остановка и удаление контейнеров
docker compose down

# Запуск с пересборкой
docker compose up -d --build
```

### Просмотр информации

```bash
# Список контейнеров
docker compose ps

# Логи (последние 100 строк)
docker compose logs --tail=100

# Логи в реальном времени
docker compose logs -f

# Использование ресурсов
docker stats proximatrix-proxy

# Информация о контейнере
docker inspect proximatrix-proxy
```

### Выполнение команд внутри контейнера

```bash
# Войти в контейнер
docker exec -it proximatrix-proxy sh

# Выполнить команду
docker exec proximatrix-proxy node --version
```

### Управление образами

```bash
# Список образов
docker images

# Удаление образа
docker rmi proximatrix:latest

# Очистка неиспользуемых ресурсов
docker system prune -a
```

## Проверка работы

```bash
# Проверка портов на сервере
netstat -tulpn | grep -E '1080|8080|8443'

# Тест SOCKS5 прокси
curl --socks5 77.221.156.12:1080 http://ifconfig.me

# Тест HTTP прокси
curl --proxy http://77.221.156.12:8080 http://ifconfig.me

# Проверка веб-интерфейса
curl http://77.221.156.12:8080
```

## Решение проблем

```bash
# Просмотр всех логов
docker compose logs

# Просмотр логов с временными метками
docker compose logs -t

# Перезапуск с очисткой
docker compose down
docker compose up -d --build

# Проверка конфигурации
docker compose config

# Проверка статуса healthcheck
docker inspect proximatrix-proxy | grep -A 10 Health
```