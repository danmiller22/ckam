import { Ad } from "./types.ts";
import {
  CITY_NAME,
  MAX_PRICE_KGS,
  MIN_ROOMS,
  MAX_ROOMS,
  OWNER_ONLY,
} from "./config.ts";

interface RawLalafoItem {
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
}

function extractPhone(item: RawLalafoItem): string | null {
  if (typeof item.phone === "string" && item.phone.trim()) {
    return item.phone.trim();
  }
  if (Array.isArray(item.phones) && item.phones.length > 0) {
    const first = item.phones.find((p) => typeof p === "string" && p.trim());
    if (first) return first.trim();
  }
  return null;
}

function extractCity(item: RawLalafoItem): string {
  return (
    item.city_name ||
    item.city ||
    CITY_NAME
  );
}

function extractDistrict(item: RawLalafoItem): string | null {
  if (typeof item.region_name === "string" && item.region_name.trim()) {
    return item.region_name.trim();
  }
  if (typeof item.location === "string" && item.location.trim()) {
    return item.location.trim();
  }
  return null;
}

function extractPrice(item: RawLalafoItem): { price: number | null; currency: string | null } {
  if (typeof item.price === "number") {
    return { price: item.price, currency: item.currency ?? "KGS" };
  }
  if (typeof item.price_string === "string") {
    const digits = item.price_string.replace(/[^0-9]/g, "");
    if (digits) {
      const price = Number(digits);
      if (!Number.isNaN(price)) {
        return { price, currency: item.currency ?? "KGS" };
      }
    }
  }
  return { price: null, currency: item.currency ?? null };
}

function extractRooms(item: RawLalafoItem): number | null {
  if (Array.isArray(item.attributes)) {
    for (const attr of item.attributes) {
      if (!attr) continue;
      const slug = (attr.slug ?? "").toString().toLowerCase();
      if (slug.includes("rooms") || slug.includes("komnat")) {
        const v = attr.value;
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

  const source = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
  const match = source.match(/(\d+)\s*комнат/);
  if (match) {
    const n = Number(match[1]);
    if (!Number.isNaN(n)) return n;
  }

  return null;
}

function detectIsOwner(item: RawLalafoItem): boolean | null {
  const userType = (item.user_type ?? item.owner ?? "").toString().toLowerCase();
  if (userType.includes("owner") || userType.includes("собствен")) {
    return true;
  }
  if (userType.includes("агент") || userType.includes("риелтор")) {
    return false;
  }

  const desc = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
  if (desc.includes("собственник")) return true;
  if (desc.includes("риелтор") || desc.includes("агентство")) return false;

  return null;
}

function extractImages(item: RawLalafoItem): string[] {
  const urls: string[] = [];

  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (!img) continue;
      if (typeof img.url === "string" && img.url.trim()) {
        urls.push(img.url.trim());
      }
    }
  }

  if (Array.isArray(item.photos)) {
    for (const p of item.photos) {
      if (typeof p === "string" && p.trim()) {
        urls.push(p.trim());
      }
    }
  }

  return Array.from(new Set(urls));
}

function extractUrl(item: RawLalafoItem): string {
  return (
    item.url ||
    item.link ||
    ""
  );
}

function mapItemToAd(item: RawLalafoItem): Ad | null {
  const id = item.id != null ? String(item.id) : null;
  if (!id) return null;

  const title = item.title || "Объявление";
  const city = extractCity(item);
  const district = extractDistrict(item);
  const { price, currency } = extractPrice(item);
  const rooms = extractRooms(item);
  const isOwner = detectIsOwner(item);
  const phone = extractPhone(item);
  const url = extractUrl(item);
  const imageUrls = extractImages(item);

  return {
    id,
    title,
    city,
    district,
    rooms,
    price,
    currency,
    isOwner,
    phone,
    url,
    imageUrls,
  };
}

function passesFilters(ad: Ad): boolean {
  if (ad.city !== CITY_NAME) return false;
  if (!ad.district) return false;

  if (ad.rooms == null || ad.rooms < MIN_ROOMS || ad.rooms > MAX_ROOMS) {
    return false;
  }

  if (ad.price == null || ad.price <= 0 || ad.price > MAX_PRICE_KGS) {
    return false;
  }

  if (!ad.phone) return false;
  if (!ad.imageUrls || ad.imageUrls.length === 0) return false;
  if (!ad.url) return false;

  if (OWNER_ONLY && ad.isOwner !== true) return false;

  return true;
}

export async function fetchFilteredAds(apiUrl: string): Promise<Ad[]> {
  const resp = await fetch(apiUrl, {
    headers: {
      "Accept": "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (compatible; LalafoTelegramBot/1.0)",
      "device": "pc",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Lalafo API error", resp.status, text);
    throw new Error(`Lalafo API error: ${resp.status}`);
  }

  const data = await resp.json();
  const items: RawLalafoItem[] = Array.isArray(data?.items) ? data.items : [];

  const ads: Ad[] = [];
  for (const raw of items) {
    const ad = mapItemToAd(raw);
    if (!ad) continue;
    if (passesFilters(ad)) ads.push(ad);
  }

  return ads;
}