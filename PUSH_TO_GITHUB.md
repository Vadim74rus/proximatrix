# 📤 Быстрая загрузка проекта на GitHub через WebStorm

## ✅ Анализ проекта

Проект готов к загрузке! Структура:

```
proximatrix/
├── Dockerfile              ✅ Docker образ
├── docker-compose.yml      ✅ Docker Compose конфигурация
├── package.json            ✅ Зависимости Node.js
├── index.js                ✅ Главный файл приложения
├── config.json             ✅ Конфигурация прокси
├── src/
│   ├── socks5-server.js    ✅ SOCKS5 прокси сервер
│   └── http-proxy-server.js ✅ HTTP/HTTPS прокси сервер
├── .gitignore              ✅ Игнорируемые файлы
└── README.md               ✅ Документация
```

**Все файлы готовы!** ✅

---

## 🚀 Загрузка через WebStorm (3 шага)

### Шаг 1: Инициализация Git

**В WebStorm:**

1. Откройте проект: `File` → `Open` → `a:\proximatrix`
2. Включите Git: `VCS` → `Enable Version Control Integration` → выберите `Git` → `OK`

### Шаг 2: Подключение к GitHub

**В WebStorm:**

1. `VCS` → `Git` → `Remotes...`
2. Нажмите `+` (плюс)
3. **Name:** `origin`
4. **URL:** `https://github.com/Vadim74rus/proximatrix.git`
5. Нажмите `OK`

### Шаг 3: Коммит и Push

**В WebStorm:**

1. **Добавьте файлы:**
   - Правой кнопкой на корневую папку проекта → `Git` → `Add`
   - Или выделите все файлы → правой кнопкой → `Git` → `Add`

2. **Создайте коммит:**
   - Нажмите `Ctrl+K` (или вкладка `Commit` внизу)
   - Сообщение: `Initial commit: Proximatrix proxy server`
   - Нажмите `Commit`

3. **Загрузите на GitHub:**
   - Нажмите `Ctrl+Shift+K` (или `VCS` → `Git` → `Push...`)
   - **Remote:** `origin`
   - **Branch:** `main` (если нужно, создайте ветку)
   - Нажмите `Push`

4. **Если запросит авторизацию:**
   - **Username:** `Vadim74rus`
   - **Password:** Personal Access Token (см. ниже)

---

## 🔑 Создание Personal Access Token

Если Git запросит пароль:

1. Откройте GitHub: https://github.com
2. Перейдите: **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Нажмите **Generate new token** → **Generate new token (classic)**
4. Заполните:
   - **Note:** `WebStorm Proximatrix`
   - **Expiration:** 90 days (или больше)
   - **Select scopes:** ✅ `repo` (полный доступ)
5. Нажмите **Generate token**
6. **Скопируйте токен** (показывается только один раз!)
7. Используйте этот токен как пароль в WebStorm

---

## ✅ Проверка

После загрузки откройте в браузере:
https://github.com/Vadim74rus/proximatrix

Вы должны увидеть все файлы проекта! ✅

---

## 📥 Клонирование на сервер

После успешной загрузки на GitHub, на сервере выполните:

```bash
cd /opt
git clone https://github.com/Vadim74rus/proximatrix.git proximatrix
cd proximatrix
ls -la
```

---

**Готово! Проект на GitHub!** 🎉