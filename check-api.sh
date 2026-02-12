#!/bin/bash
# Скрипт проверки доступности API Proximatrix

API_URL="${PROXY_API_URL:-http://77.221.156.12:9090}"
API_KEY="${PROXY_API_KEY:-proximatrix-api-key-change-in-production}"

echo "🔍 Проверка API Proximatrix"
echo "URL: $API_URL"
echo ""

# Проверка доступности порта
echo "1️⃣ Проверка порта..."
if command -v nc >/dev/null 2>&1; then
    HOST=$(echo $API_URL | sed -E 's|https?://([^:/]+).*|\1|')
    PORT=$(echo $API_URL | sed -E 's|.*:([0-9]+).*|\1|')
    if nc -z -w 3 "$HOST" "$PORT" 2>/dev/null; then
        echo "   ✅ Порт $PORT доступен на $HOST"
    else
        echo "   ❌ Порт $PORT недоступен на $HOST"
        echo "   Проверьте UFW и панель хостинга"
    fi
else
    echo "   ⚠️  netcat не установлен, пропускаем проверку порта"
fi

# Проверка HTTP ответа
echo ""
echo "2️⃣ Проверка HTTP запроса..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-API-Key: $API_KEY" \
    "$API_URL/api/users" 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ API отвечает (HTTP $HTTP_CODE)"
    echo ""
    echo "3️⃣ Получение списка пользователей..."
    curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/users" | jq '.' 2>/dev/null || curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/users"
else
    echo "   ❌ API не отвечает (HTTP $HTTP_CODE)"
    echo ""
    echo "   Возможные причины:"
    echo "   - Порт 9090 не открыт в UFW"
    echo "   - Контейнер proximatrix-proxy не запущен"
    echo "   - Неправильный API ключ"
    echo "   - API не включён (api.enabled: false)"
fi

echo ""
echo "📋 Для настройки используйте:"
echo "   export PROXY_API_URL='$API_URL'"
echo "   export PROXY_API_KEY='ваш-ключ'"
echo ""
echo "📖 Подробнее: CONNECT_FROM_OTHER_SERVER.md"
