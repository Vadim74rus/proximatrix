#!/bin/bash
# Скрипт для исправления проблемы подключения к API Proximatrix
# Запускать на сервере 77.221.156.12

set -e

echo "🔧 Исправление подключения к API Proximatrix"
echo "============================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для проверки статуса
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ ОШИБКА${NC}"
    fi
}

# 1. Проверка контейнеров
echo "1️⃣ Проверка контейнеров Docker..."
if docker compose ps | grep -q "proximatrix-proxy.*Up"; then
    echo -e "${GREEN}✅ Контейнер proximatrix-proxy запущен${NC}"
else
    echo -e "${YELLOW}⚠️  Контейнер не запущен, запускаю...${NC}"
    cd /opt/proximatrix 2>/dev/null || cd $(dirname "$0")
    docker compose up -d
    sleep 5
fi

# 2. Проверка порта 9090 в UFW
echo ""
echo "2️⃣ Проверка порта 9090 в UFW..."
if ufw status | grep -q "9090/tcp"; then
    echo -e "${GREEN}✅ Порт 9090 открыт в UFW${NC}"
else
    echo -e "${YELLOW}⚠️  Порт 9090 не открыт, открываю...${NC}"
    ufw allow 9090/tcp
    ufw reload
    echo -e "${GREEN}✅ Порт 9090 открыт${NC}"
fi

# 3. Проверка, что порт слушается
echo ""
echo "3️⃣ Проверка, что порт 9090 слушается..."
if ss -tulpn | grep -q ":9090"; then
    echo -e "${GREEN}✅ Порт 9090 слушается${NC}"
else
    echo -e "${RED}❌ Порт 9090 не слушается${NC}"
    echo "Проверьте логи: docker compose logs proximatrix"
    exit 1
fi

# 4. Проверка API изнутри контейнера
echo ""
echo "4️⃣ Проверка API изнутри контейнера..."
API_KEY=$(docker compose exec -T proximatrix printenv PROXY_API_KEY 2>/dev/null | head -1 || echo "proximatrix-api-key-change-in-production")
if docker exec proximatrix-proxy curl -s -f -H "X-API-Key: $API_KEY" http://localhost:9090/api/users > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API отвечает внутри контейнера${NC}"
else
    echo -e "${RED}❌ API не отвечает внутри контейнера${NC}"
    echo "Проверьте логи: docker compose logs proximatrix | tail -50"
    exit 1
fi

# 5. Проверка доступности снаружи
echo ""
echo "5️⃣ Проверка доступности снаружи..."
if curl -s -f -m 5 -H "X-API-Key: $API_KEY" http://localhost:9090/api/users > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API доступен снаружи контейнера${NC}"
else
    echo -e "${YELLOW}⚠️  API недоступен снаружи контейнера${NC}"
    echo "Возможно, порт закрыт в панели хостинга"
fi

# 6. Вывод информации
echo ""
echo "============================================"
echo -e "${GREEN}✅ Диагностика завершена${NC}"
echo ""
echo "📋 Информация для подключения:"
echo "   URL: http://77.221.156.12:9090"
echo "   API Key: $API_KEY"
echo ""
echo "🧪 Тест подключения:"
echo "   curl -H \"X-API-Key: $API_KEY\" http://77.221.156.12:9090/api/users"
echo ""
echo "📖 Если порт всё ещё недоступен с другого сервера:"
echo "   1. Проверьте панель хостинга (откройте порт 9090)"
echo "   2. Проверьте логи: docker compose logs proximatrix | tail -50"
echo "   3. Перезапустите: docker compose restart proximatrix"
