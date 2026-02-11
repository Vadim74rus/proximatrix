#!/bin/bash
# Диагностика MTProto прокси — запустите на сервере: bash check-mtproxy.sh

echo "=== Проверка MTProto прокси ==="
echo ""

echo "1. Порт в config.json:"
grep -A1 '"port"' config.json 2>/dev/null | head -5
echo ""

echo "2. Слушает ли кто-то порт 8444 на хосте:"
ss -tulpn 2>/dev/null | grep 8444 || netstat -tulpn 2>/dev/null | grep 8444 || echo "   (ss/netstat не нашли 8444)"
echo ""

echo "3. UFW — открыт ли 8444:"
ufw status 2>/dev/null | grep 8444 || echo "   Порт 8444 не найден в UFW! Выполните: ufw allow 8444/tcp"
echo ""

echo "4. Docker контейнер и порты:"
docker ps --format "table {{.Names}}\t{{.Ports}}" 2>/dev/null | grep -E "proximatrix|8444" || docker ps -a 2>/dev/null | head -5
echo ""

echo "5. Проверка подключения к порту 8444 с самого сервера:"
timeout 2 bash -c 'echo >/dev/tcp/127.0.0.1/8444' 2>/dev/null && echo "   OK: порт 8444 доступен на localhost" || echo "   Ошибка: к 127.0.0.1:8444 подключиться нельзя (проверьте, что контейнер запущен и config.json с port 8444)"
echo ""

echo "6. Содержимое config.json (mtproto):"
node -e "try { const c=require('./config.json'); console.log('   port:', c.mtproto?.port, 'publicIp:', c.mtproto?.publicIp); } catch(e) { console.log('   Ошибка чтения config.json'); }" 2>/dev/null
echo ""

echo "=== Итог ==="
echo "Если пункт 5 — «Ошибка»: перезапустите контейнер и убедитесь, что в config.json указано \"port\": 8444"
echo "Если пункт 3 — порт не в UFW: выполните  ufw allow 8444/tcp  и  ufw reload"
echo "У некоторых хостингов есть свой файрвол в панели — откройте там TCP 8444."
echo ""
echo "Проверка с вашего ПК (PowerShell): Test-NetConnection -ComputerName 77.221.156.12 -Port 8444"
echo "Или онлайн: https://www.yougetsignal.com/tools/open-ports/  (IP 77.221.156.12, Port 8444)"
