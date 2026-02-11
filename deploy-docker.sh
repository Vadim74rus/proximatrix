#!/bin/bash

# Скрипт автоматического развертывания Proximatrix через Docker
# Использование: ./deploy-docker.sh

set -e  # Остановка при ошибке

SERVER="root@77.221.156.12"
REMOTE_DIR="/opt/proximatrix"
SSH_KEY=""  # Путь к SSH ключу, если используется (например: "-i ~/.ssh/id_rsa")

echo "🚀 Автоматическое развертывание Proximatrix через Docker..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для выполнения команд на сервере
run_remote() {
    if [ -n "$SSH_KEY" ]; then
        ssh $SSH_KEY $SERVER "$1"
    else
        ssh $SERVER "$1"
    fi
}

# Функция для копирования файлов
copy_files() {
    if [ -n "$SSH_KEY" ]; then
        scp $SSH_KEY -r "$@" $SERVER:$REMOTE_DIR/
    else
        scp -r "$@" $SERVER:$REMOTE_DIR/
    fi
}

echo -e "${YELLOW}📡 Шаг 1: Проверка подключения к серверу...${NC}"
if run_remote "echo 'Подключение успешно!'"; then
    echo -e "${GREEN}✅ Подключение установлено${NC}"
else
    echo -e "${RED}❌ Не удалось подключиться к серверу${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔧 Шаг 2: Проверка и установка Docker...${NC}"
run_remote "
    if ! command -v docker &> /dev/null; then
        echo 'Установка Docker...'
        apt update
        apt install -y ca-certificates curl gnupg lsb-release
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
        echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable\" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt update
        apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        echo 'Docker установлен'
    else
        echo 'Docker уже установлен'
    fi
"

echo ""
echo -e "${YELLOW}🔥 Шаг 3: Настройка файрвола...${NC}"
run_remote "
    ufw allow 1080/tcp comment 'SOCKS5 для Telegram' 2>/dev/null || true
    ufw allow 8080/tcp comment 'HTTP для WhatsApp' 2>/dev/null || true
    ufw allow 8443/tcp comment 'HTTPS для WhatsApp' 2>/dev/null || true
    ufw --force enable 2>/dev/null || true
    echo 'Порты открыты в файрволе'
"

echo ""
echo -e "${YELLOW}📁 Шаг 4: Создание директории проекта...${NC}"
run_remote "mkdir -p $REMOTE_DIR"

echo ""
echo -e "${YELLOW}📤 Шаг 5: Копирование файлов проекта...${NC}"
copy_files Dockerfile docker-compose.yml package.json index.js config.json src/

echo ""
echo -e "${YELLOW}🏗️  Шаг 6: Остановка существующего контейнера (если есть)...${NC}"
run_remote "cd $REMOTE_DIR && docker compose down 2>/dev/null || true"

echo ""
echo -e "${YELLOW}🔨 Шаг 7: Сборка Docker образа...${NC}"
run_remote "cd $REMOTE_DIR && docker compose build"

echo ""
echo -e "${YELLOW}🚀 Шаг 8: Запуск контейнера...${NC}"
run_remote "cd $REMOTE_DIR && docker compose up -d"

echo ""
echo -e "${YELLOW}⏳ Ожидание запуска контейнера (10 секунд)...${NC}"
sleep 10

echo ""
echo -e "${YELLOW}📊 Шаг 9: Проверка статуса...${NC}"
run_remote "cd $REMOTE_DIR && docker compose ps"

echo ""
echo -e "${YELLOW}📝 Шаг 10: Последние логи...${NC}"
run_remote "cd $REMOTE_DIR && docker compose logs --tail=20 proximatrix"

echo ""
echo -e "${GREEN}✅ Развертывание завершено!${NC}"
echo ""
echo -e "${GREEN}📋 Информация о прокси:${NC}"
echo -e "   SOCKS5: ${GREEN}77.221.156.12:1080${NC} (для Telegram)"
echo -e "   HTTP:   ${GREEN}77.221.156.12:8080${NC} (для WhatsApp)"
echo -e "   HTTPS:  ${GREEN}77.221.156.12:8443${NC} (для WhatsApp)"
echo ""
echo -e "${YELLOW}💡 Полезные команды:${NC}"
echo -e "   Просмотр логов: ${YELLOW}ssh $SERVER 'cd $REMOTE_DIR && docker compose logs -f'${NC}"
echo -e "   Перезапуск:     ${YELLOW}ssh $SERVER 'cd $REMOTE_DIR && docker compose restart'${NC}"
echo -e "   Статус:         ${YELLOW}ssh $SERVER 'cd $REMOTE_DIR && docker compose ps'${NC}"
echo ""