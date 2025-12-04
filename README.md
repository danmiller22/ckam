# Lalafo → Telegram (Deno bot)

Работает и как:
- GitHub Actions cron-скрипт;
- Deno Deploy (использует KV вместо файловой системы).

Фильтры:

- город: только Бишкек
- 1–2 комнаты
- цена ≤ 50 000 KGS
- только собственник
- обязательно: район, телефон, фото, ссылка.

### Переменные окружения

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `LALAFO_API_URL`

### Состояние (без дублей)

- На **GitHub Actions / локально** — файл `data/state.json`.
- На **Deno Deploy** — `Deno KV` (ключ `["state", "sentIds"]`).

### Локальный запуск

```bash
deno task run
```