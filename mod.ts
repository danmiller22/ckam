// mod.ts

// ================== НАСТРОЙКИ ФИЛЬТРОВ ==================

const CITY = "Бишкек";
const MAX_PRICE_KGS = 50_000;
const MIN_ROOMS = 1;
const MAX_ROOMS = 2;
const OWNER_ONLY = true; // только "собственник"

// ================== ТИПЫ ==================

type RawItem = {
  id?: number | string;
  title?: string;
  description?: string;
  city?: string;
  city_name?: string;
  region_name?: string;
  location?: string;

  price?: number;
  currency?: string;
  price_string?: string;

  user_type?: string;
  owner?: string;

  phone?: string;
  phones?: string[] | null;

  images?: { url: string }[];
  photos?: string[];

  url?: string;
  link?: string;

  attributes?: { slug?: string; value?: string | number }[];
};

type Ad = {
  id: string;
  title: string;
  city: string;
  district: string | null;
  rooms: number | null;
  price: number | null;
  currency: string | null;
  isOwner: boolean | null;
  phone: string | null;
  url: string;
  imageUrls: string[];
};

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================

function extractPhone(item: RawItem): string | null {
  if (typeof item.phone === "string" && item.phone.trim()) {
    return item.phone.trim();
  }
  if (Array.isArray(item.phones)) {
    const p = item.phones.find((x) => typeof x === "string" && x.trim());
    if (p) return p.trim();
  }
  return null;
}

function extractCity(item: RawItem): string {
  return item.city_name || item.city || CITY;
}

function extractDistrict(item: RawItem): string | null {
  if (item.region_name && item.region_name.trim()) return item.region_name.trim();
  if (item.location && item.location.trim()) return item.location.trim();
  return null;
}

function extractPrice(item: RawItem): { price: number | null; currency: string | null } {
  if (typeof item.price === "number") {
    return { price: item.price, currency: item.currency ?? "KGS" };
  }
  if (typeof item.price_string === "string") {
    const digits = item.price_string.replace(/[^0-9]/g, "");
    if (digits) {
      const n = Number(digits);
      if (!Number.isNaN(n)) return { price: n, currency: item.currency ?? "KGS" };
    }
  }
  return { price: null, currency: item.currency ?? null };
}

function extractRooms(item: RawItem): number | null {
  if (Array.isArray(item.attributes)) {
    for (const a of item.attributes) {
      if (!a) continue;
      const slug = (a.slug ?? "").toLowerCase();
      if (slug.includes("rooms") || slug.includes("komnat")) {
        const v = a.value;
        if (typeof v === "number") return v;
        if (typeof v === "string") {
          const digits = v.replace(/[^0-9]/g, "");
          if (digits) {
            const n = Number(digits);
            if (!Number.isNaN(n)) return n;
          }
        }
      }
    }
  }

  const text = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
  const m = text.match(/(\d+)\s*комнат/);
  if (m) {
    const n = Number(m[1]);
    if (!Number.isNaN(n)) return n;
  }

  return null;
}

function detectIsOwner(item: RawItem): boolean | null {
  const t = (item.user_type ?? item.owner ?? "").toString().toLowerCase();
  if (t.includes("owner") || t.includes("собствен")) return true;
  if (t.includes("агент") || t.includes("риелтор")) return false;

  const text = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
  if (text.includes("собственник")) return true;
  if (text.includes("риелтор") || text.includes("агентство")) return false;

  return null;
}

function extractImages(item: RawItem): string[] {
  const urls: string[] = [];

  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (img?.url && img.url.trim()) urls.push(img.url.trim());
    }
  }
  if (Array.isArray(item.photos)) {
    for (const p of item.photos) {
      if (p && p.trim()) urls.push(p.trim());
    }
  }

  return Array.from(new Set(urls));
}

function extractUrl(item: RawItem): string {
  return item.url || item.link || "";
}

function mapItemToAd(item: RawItem): Ad | null {
  const id = item.id != null ? String(item.id) : null;
  if (!id) return null;

  const { price, currency } = extractPrice(item);

  return {
    id,
    title: item.title || "Объявление",
    city: extractCity(item),
    district: extractDistrict(item),
    rooms: extractRooms(item),
    price,
    currency,
    isOwner: detectIsOwner(item),
    phone: extractPhone(item),
    url: extractUrl(item),
    imageUrls: extractImages(item),
  };
}

function passesFilters(ad: Ad): boolean {
  if (ad.city !== CITY) return false;
  if (!ad.district) return false;

  if (ad.rooms == null || ad.rooms < MIN_ROOMS || ad.rooms > MAX_ROOMS) {
    return false;
  }

  if (ad.price == null || ad.price <= 0 || ad.price > MAX_PRICE_KGS) {
    return false;
  }

  if (!ad.phone) return false;
  if (!ad.url) return false;
  if (!ad.imageUrls.length) return false;

  if (OWNER_ONLY && ad.isOwner !== true) return false;

  return true;
}

// ================== LALAFO ==================

async function fetchFilteredAds(apiUrl: string): Promise<Ad[]> {
  const resp = await fetch(apiUrl, {
    headers: {
      "Accept": "application/json, text/plain, */*",
      "User-Agent": "LalafoTelegramBot/1.0",
    },
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Lalafo error", resp.status, txt);
    return [];
  }

  const data = await resp.json() as { items?: RawItem[] };
  const items = Array.isArray(data.items) ? data.items : [];

  const ads: Ad[] = [];
  for (const raw of items) {
    const ad = mapItemToAd(raw);
    if (ad && passesFilters(ad)) ads.push(ad);
  }
  return ads;
}

// ================== TELEGRAM ==================

const TG_API = "https://api.telegram.org";

async function callTelegram(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${TG_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Telegram HTTP error", method, res.status, txt);
  } else {
    const data = await res.json();
    if (!data.ok) {
      console.error("Telegram API error", method, data);
    }
  }
}

function buildCaption(ad: Ad): string {
  const lines: string[] = [];

  lines.push(ad.district ? `${ad.city}, ${ad.district}` : ad.city);
  lines.push("");
  if (ad.rooms != null) lines.push(`Количество комнат: ${ad.rooms}`);
  lines.push("Тип недвижимости: Квартира");
  if (ad.isOwner === true) lines.push("Тип предложения: Собственник");
  else if (ad.isOwner === false) lines.push("Тип предложения: Посредник");

  lines.push("");
  if (ad.price != null) {
    lines.push(`Цена: ${ad.price} ${ad.currency ?? "KGS"}`);
  }
  if (ad.phone) lines.push(`Телефон: ${ad.phone}`);
  lines.push(`Ссылка: ${ad.url}`);

  return lines.join("\n");
}

async function sendAd(ad: Ad, token: string, chatId: string): Promise<void> {
  const caption = buildCaption(ad);

  if (ad.imageUrls.length === 0) {
    await callTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: caption,
    });
    return;
  }

  if (ad.imageUrls.length === 1) {
    await callTelegram(token, "sendPhoto", {
      chat_id: chatId,
      photo: ad.imageUrls[0],
      caption,
    });
    return;
  }

  const media = ad.imageUrls.slice(0, 10).map((url, i) => ({
    type: "photo",
    media: url,
    caption: i === 0 ? caption : undefined,
  }));

  await callTelegram(token, "sendMediaGroup", {
    chat_id: chatId,
    media,
  });
}

// ================== MAIN ==================

async function runOnce() {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  const apiUrl = Deno.env.get("LALAFO_API_URL");

  if (!token || !chatId || !apiUrl) {
    console.error("Env vars required: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, LALAFO_API_URL");
    return;
  }

  const ads = await fetchFilteredAds(apiUrl);
  console.log(`Got ${ads.length} ads after filters`);

  for (const ad of ads) {
    console.log("Sending", ad.id, ad.title);
    await sendAd(ad, token, chatId);
    await new Promise((r) => setTimeout(r, 1000)); // пауза, чтобы не спамить Telegram
  }
}

if (import.meta.main) {
  runOnce();
}
