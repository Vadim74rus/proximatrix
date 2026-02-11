# 🚀 Загрузка проекта в GitHub через WebStorm

Инструкция для пользователей WebStorm IDE.

---

## 📤 Шаг 1: Инициализация Git репозитория в WebStorm

**💻 НА ВАШЕМ КОМПЬЮТЕРЕ (в WebStorm):**

1. **Откройте проект** в WebStorm:
   - File → Open → выберите папку `a:\proximatrix`

2. **Инициализируйте Git репозиторий:**
   - В верхнем меню: **VCS** → **Enable Version Control Integration**
   - Выберите **Git** из списка
   - Нажмите **OK**

   Или через терминал WebStorm:
   - Внизу окна откройте вкладку **Terminal**
   - Выполните:
     ```bash
     git init
     ```

---

## 🔗 Шаг 2: Подключение к GitHub репозиторию

**💻 НА ВАШЕМ КОМПЬЮТЕРЕ (в WebStorm):**

### Вариант A: Через интерфейс WebStorm

1. **Добавьте удаленный репозиторий:**
   - В верхнем меню: **VCS** → **Git** → **Remotes...**
   - Нажмите **+** (плюс)
   - **Name:** `origin`
   - **URL:** `https://github.com/Vadim74rus/proximatrix.git`
   - Нажмите **OK**

### Вариант B: Через терминал WebStorm

В терминале WebStorm (внизу окна) выполните:

```bash
git remote add origin https://github.com/Vadim74rus/proximatrix.git
```

**Проверка подключения:**
```bash
git remote -v
```

Должны увидеть:
```
origin  https://github.com/Vadim74rus/proximatrix.git (fetch)
origin  https://github.com/Vadim74rus/proximatrix.git (push)
```

---

## 📝 Шаг 3: Добавление файлов и создание коммита

**💻 НА ВАШЕМ КОМПЬЮТЕРЕ (в WebStorm):**

### Вариант A: Через интерфейс WebStorm

1. **Добавьте файлы в Git:**
   - В левой панели проекта (Project) все файлы будут отмечены красным (неотслеживаемые)
   - Правой кнопкой мыши на корневую папку проекта → **Git** → **Add**
   - Или выделите все файлы (Ctrl+A) → правой кнопкой → **Git** → **Add**

2. **Создайте коммит:**
   - Внизу окна откройте вкладку **Commit**
   - Или нажмите **Ctrl+K** (Windows) / **Cmd+K** (Mac)
   - В поле **Commit Message** введите: `Initial commit`
   - Убедитесь, что все файлы отмечены галочками
   - Нажмите **Commit** (или **Commit and Push...**)

### Вариант B: Через терминал WebStorm

В терминале WebStorm выполните:

```bash
git add .
git commit -m "Initial commit"
```

---

## 📤 Шаг 4: Загрузка файлов на GitHub

**💻 НА ВАШЕМ КОМПЬЮТЕРЕ (в WebStorm):**

### Вариант A: Через интерфейс WebStorm

1. **Загрузите файлы:**
   - В верхнем меню: **VCS** → **Git** → **Push...**
   - Или нажмите **Ctrl+Shift+K** (Windows) / **Cmd+Shift+K** (Mac)
   - В окне **Push Commits**:
     - **Remote:** выберите `origin`
     - **Branch:** выберите `main` (или создайте новую ветку)
   - Нажмите **Push**

2. **Если Git запросит авторизацию:**
   - WebStorm может открыть окно авторизации GitHub
   - **Username:** `Vadim74rus`
   - **Password:** используйте **Personal Access Token** (не обычный пароль!)

   **Как создать Personal Access Token:**
   - Откройте GitHub в браузере: https://github.com
   - Перейдите: **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
   - Нажмите **Generate new token** → **Generate new token (classic)**
   - Заполните:
     - **Note:** `WebStorm Proximatrix`
     - **Expiration:** выберите срок (например, 90 дней)
     - **Select scopes:** выберите `repo` (полный доступ)
   - Нажмите **Generate token**
   - **Скопируйте токен** (показывается только один раз!)
   - Используйте этот токен как пароль в WebStorm

### Вариант B: Через терминал WebStorm

В терминале WebStorm выполните:

```bash
git branch -M main
git push -u origin main
```

Если запросит авторизацию:
- **Username:** `Vadim74rus`
- **Password:** используйте Personal Access Token

---

## ✅ Шаг 5: Проверка загрузки

**💻 НА ВАШЕМ КОМПЬЮТЕРЕ:**

1. Откройте в браузере: https://github.com/Vadim74rus/proximatrix
2. Вы должны увидеть все файлы проекта:
   - `Dockerfile`
   - `docker-compose.yml`
   - `package.json`
   - `index.js`
   - `config.json`
   - `src/` (папка)
   - и другие файлы

✅ Файлы успешно загружены в GitHub!

---

## 📥 Шаг 6: Клонирование на сервер

**🖥️ НА СЕРВЕРЕ** (в окне PuTTY):

Теперь можно клонировать проект на сервер:

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

Если вы внесли изменения в WebStorm и загрузили их в GitHub:

**В WebStorm:**
1. **Commit изменения:** `Ctrl+K` → введите сообщение → **Commit**
2. **Push изменения:** `Ctrl+Shift+K` → **Push**

**На сервере (в PuTTY):**
```bash
cd /opt/proximatrix
git pull
```

Это загрузит последние изменения из GitHub.

---

## 💡 Полезные горячие клавиши WebStorm для Git

- **Ctrl+K** (Windows) / **Cmd+K** (Mac) - Открыть окно коммита
- **Ctrl+Shift+K** (Windows) / **Cmd+Shift+K** (Mac) - Push (загрузить на GitHub)
- **Ctrl+T** (Windows) / **Cmd+T** (Mac) - Update Project (обновить с GitHub)
- **Alt+`** (обратная кавычка) - Меню VCS

---

## 🐛 Решение проблем

### Ошибка "Authentication failed"

1. Убедитесь, что используете Personal Access Token, а не обычный пароль
2. Проверьте, что токен имеет права `repo`
3. Создайте новый токен, если старый истек

### Ошибка "Repository not found"

1. Проверьте URL репозитория: `https://github.com/Vadim74rus/proximatrix.git`
2. Убедитесь, что репозиторий существует на GitHub
3. Проверьте права доступа к репозиторию

### Файлы не добавляются в Git

1. Проверьте `.gitignore` - возможно, файлы игнорируются
2. Убедитесь, что файлы не находятся в `.idea/` или других игнорируемых папках
3. Попробуйте добавить файлы вручную через терминал: `git add -f filename`

---

**Готово! Теперь можно продолжать с ШАГ 6 из DEPLOY.md (проверка файлов на сервере)** 🎉