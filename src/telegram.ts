import { Ad } from "./types.ts";

const TELEGRAM_API_BASE = "https://api.telegram.org";

async function callTelegram<T>(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const resp = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Telegram API error", method, resp.status, text);
    throw new Error(`Telegram API error: ${resp.status}`);
  }

  const data = await resp.json();
  if (!data.ok) {
    console.error("Telegram API logical error", method, data);
    throw new Error("Telegram API logical error");
  }

  return data.result as T;
}

function buildCaption(ad: Ad): string {
  const lines: string[] = [];

  const locationLine = ad.district
    ? `${ad.city}, ${ad.district}`
    : ad.city;

  lines.push(locationLine);
  lines.push("");
  if (ad.rooms != null) {
    lines.push(`Количество комнат: ${ad.rooms}`);
  }
  lines.push("Тип недвижимости: Квартира");
  if (ad.isOwner === true) {
    lines.push("Тип предложения: Собственник");
  } else if (ad.isOwner === false) {
    lines.push("Тип предложения: Посредник`);
  }

  lines.push("");

  if (ad.price != null) {
    const currency = ad.currency ?? "KGS";
    lines.push(`Цена: ${ad.price} ${currency}`);
  }

  if (ad.phone) {
    lines.push(`Телефон: ${ad.phone}`);
  }

  lines.push(`Ссылка: ${ad.url}`);

  return lines.join("\n");
}

export async function sendAdToTelegram(
  ad: Ad,
  token: string,
  chatId: string,
): Promise<void> {
  const caption = buildCaption(ad);

  if (ad.imageUrls && ad.imageUrls.length > 0) {
    const images = ad.imageUrls.slice(0, 10);

    if (images.length === 1) {
      await callTelegram(token, "sendPhoto", {
        chat_id: chatId,
        photo: images[0],
        caption,
      });
      return;
    }

    const media = images.map((url, idx) => ({
      type: "photo",
      media: url,
      caption: idx === 0 ? caption : undefined,
    }));

    await callTelegram(token, "sendMediaGroup", {
      chat_id: chatId,
      media,
    });
    return;
  }

  await callTelegram(token, "sendMessage", {
    chat_id: chatId,
    text: caption,
  });
}