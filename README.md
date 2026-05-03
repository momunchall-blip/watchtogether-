# 🎬 WatchTogether

Смотри YouTube вместе с друзьями в реальном времени — синхронный плей/пауза/перемотка + чат + реакции.

## Что умеет

- ✅ Создание и вход в комнаты
- ✅ Синхронный просмотр YouTube (плей/пауза/перемотка у всех одновременно)
- ✅ Живой чат в реальном времени
- ✅ Эмодзи-реакции
- ✅ Список участников онлайн
- ✅ Приглашение по ссылке

## Запуск локально

```bash
npm install
npm start
# Открой http://localhost:3000
```

## Деплой на Railway (бесплатно)

1. Зайди на [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Выбери этот репозиторий
4. Railway автоматически запустит `npm start`
5. Готово! Сайт будет на `https://твой-проект.up.railway.app`

## Деплой на Render (бесплатно)

1. Зайди на [render.com](https://render.com)
2. New → Web Service → Connect GitHub
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Готово!

## Структура

```
watchtogether-app/
├── server.js        # Node.js + Express + Socket.io
├── package.json
└── public/
    └── index.html   # Весь фронтенд (одна страница)
```

## Как пользоваться

1. Создай комнату — введи название и своё имя
2. Скопируй ссылку и отправь другу
3. Вставь ссылку YouTube в поле внизу плеера
4. Нажми загрузить — видео появится у всех
5. Плей/Пауза синхронизируется автоматически
