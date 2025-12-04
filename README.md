# Lalafo → Telegram (Deno bot)

Бот, который берёт объявления с Lalafo (JSON API) и отправляет отфильтрованные варианты в Telegram-канал/чат.

Фильтры (зашиты в коде):

- город: только Бишкек
- количество комнат: 1–2
- цена: ≤ 50 000 KGS
- только собственник
- обязательно:
  - район
  - телефон
  - хотя бы одна фотография
  - ссылка на объявление

## Что нужно настроить

1. **Получить Lalafo API URL**

   Найди рабочий URL вида:

   `https://lalafo.kg/api/search/v3/feed/search?...`

   Настрой в нём:
   - город Бишкек
   - аренда квартир
   - 1–2 комнаты
   - подходящий порядок сортировки (обычно новые сверху).

   Потом этот полный URL положишь в переменную окружения `LALAFO_API_URL`.

2. **Создать Telegram-бота**

   Через `@BotFather`:
   - создай бота;
   - возьми `BOT_TOKEN`.

3. **Найти chat_id**

   - создай канал или чат, куда бот будет слать объявления;
   - добавь туда бота как администратора;
   - узнай `chat_id` (например, через бота `@RawDataBot` или любой другой способ).

4. **GitHub Secrets**

   В репозитории на GitHub:

   `Settings → Secrets and variables → Actions` и добавь:

   - `TELEGRAM_BOT_TOKEN` — токен бота;
   - `TELEGRAM_CHAT_ID` — chat id канала/чата;
   - `LALAFO_API_URL` — полный URL Lalafo API.

## Локальный запуск

```bash
deno task run
```

Нужны права:

- `--allow-net` для доступа к Lalafo и Telegram
- `--allow-read --allow-write` для `data/state.json`

Они уже зашиты в `deno.json` через задачу `run`.

## Автозапуск на GitHub Actions

Workflow `.github/workflows/lalafo-telegram.yml`:

- запускает бота каждые 10 минут;
- использует Deno 1.x;
- берёт секреты из GitHub.

Если нужно изменить частоту — правь cron в workflow.

## Где править логику

- Фильтры: `src/config.ts`
- Парсинг ответа Lalafo: `src/lalafo.ts` (функция `mapItemToAd` и helpers)
- Формат текста в Telegram: `src/telegram.ts` (функция `buildCaption`)
- Логика состояния (без дублей): `src/state.ts`
- Точка входа: `main.ts`