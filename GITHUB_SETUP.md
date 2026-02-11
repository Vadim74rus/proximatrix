# 🔗 Настройка GitHub репозитория

## Ваш репозиторий

**URL:** https://github.com/Vadim74rus/proximatrix.git

---

## 📤 Загрузка файлов в GitHub

### Вариант 1: Через GitHub Desktop (рекомендуется для Windows)

**💻 НА ВАШЕМ КОМПЬЮТЕРЕ:**

1. **Скачайте GitHub Desktop:**
   - Перейдите на: https://desktop.github.com/
   - Скачайте и установите GitHub Desktop

2. **Войдите в GitHub Desktop:**
   - Откройте GitHub Desktop
   - Войдите в свой аккаунт GitHub (Vadim74rus)

3. **Добавьте локальный репозиторий:**
   - В GitHub Desktop: **File** → **Add Local Repository**
   - Нажмите **Choose...** и выберите папку `a:\proximatrix`
   - Нажмите **Add repository**

4. **Если Git не инициализирован:**
   - GitHub Desktop предложит создать репозиторий
   - Нажмите **Create a Repository**
   - Убедитесь, что путь: `a:\proximatrix`
   - Нажмите **Create Repository**

5. **Подключите к удаленному репозиторию:**
   - В GitHub Desktop нажмите **Repository** → **Repository Settings**
   - Перейдите на вкладку **Remote**
   - В поле **Primary remote repository (origin)** введите:
     ```
     https://github.com/Vadim74rus/proximatrix.git
     ```
   - Нажмите **Save**

6. **Загрузите файлы:**
   - В левой панели вы увидите все файлы проекта
   - Внизу в поле **Summary** введите: `Initial commit`
   - Нажмите **Commit to main**
   - Нажмите **Push origin** (или **Publish repository** если это первый раз)

✅ Файлы загружены в GitHub!

---

### Вариант 2: Через командную строку Git

**💻 НА ВАШЕМ КОМПЬЮТЕРЕ:**

Откройте PowerShell или командную строку в папке проекта:

```powershell
# Перейдите в директорию проекта
cd a:\proximatrix

# Инициализируйте Git репозиторий (если еще не инициализирован)
git init

# Добавьте удаленный репозиторий
git remote add origin https://github.com/Vadim74rus/proximatrix.git

# Добавьте все файлы
git add .

# Создайте первый коммит
git commit -m "Initial commit"

# Установите основную ветку
git branch -M main

# Загрузите файлы на GitHub
git push -u origin main
```

**Если Git запросит авторизацию:**

1. **Username:** `Vadim74rus`
2. **Password:** Используйте Personal Access Token (не обычный пароль!)

**Как создать Personal Access Token:**

1. Откройте GitHub в браузере
2. Перейдите: **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Нажмите **Generate new token** → **Generate new token (classic)**
4. Заполните:
   - **Note:** `Proximatrix Deployment`
   - **Expiration:** выберите срок действия (например, 90 дней)
   - **Select scopes:** выберите `repo` (полный доступ к репозиториям)
5. Нажмите **Generate token**
6. **Скопируйте токен** (он показывается только один раз!)
7. Используйте этот токен как пароль при `git push`

---

## 📥 Клонирование на сервер

**🖥️ НА СЕРВЕРЕ** (в окне PuTTY):

После того, как файлы загружены в GitHub, выполните на сервере:

```bash
cd /opt
```

```bash
git clone https://github.com/Vadim74rus/proximatrix.git proximatrix
```

Если репозиторий приватный, Git запросит:
- **Username:** `Vadim74rus`
- **Password:** используйте Personal Access Token

```bash
cd proximatrix
```

```bash
ls -la
```

Вы должны увидеть все файлы проекта!

---

## 🔄 Обновление проекта на сервере

Если вы внесли изменения в проект и загрузили их в GitHub, обновите проект на сервере:

**🖥️ НА СЕРВЕРЕ** (в окне PuTTY):

```bash
cd /opt/proximatrix
```

```bash
git pull
```

Это загрузит последние изменения из GitHub.

---

## ✅ Проверка

После клонирования проверьте, что все файлы на месте:

**🖥️ НА СЕРВЕРЕ:**

```bash
cd /opt/proximatrix
ls -la
```

Должны быть видны:
- `Dockerfile`
- `docker-compose.yml`
- `package.json`
- `index.js`
- `config.json`
- `src/` (папка)

```bash
ls -la src/
```

Должны быть:
- `socks5-server.js`
- `http-proxy-server.js`

---

**Готово! Теперь можно продолжать с ШАГ 6 из DEPLOY.md** 🎉