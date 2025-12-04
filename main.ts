import { loadState, saveState } from "./src/state.ts";
import { fetchFilteredAds } from "./src/lalafo.ts";
import { sendAdToTelegram } from "./src/telegram.ts";

async function main() {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  const apiUrl = Deno.env.get("LALAFO_API_URL");

  if (!token) {
    console.error("Missing TELEGRAM_BOT_TOKEN env var");
    Deno.exit(1);
  }
  if (!chatId) {
    console.error("Missing TELEGRAM_CHAT_ID env var");
    Deno.exit(1);
  }
  if (!apiUrl) {
    console.error("Missing LALAFO_API_URL env var");
    Deno.exit(1);
  }

  const state = await loadState();

  console.log("Fetching Lalafo ads...");
  const ads = await fetchFilteredAds(apiUrl);
  console.log(`Got ${ads.length} ads after filters`);

  const newAds = ads.filter((ad) => !state.sentIds.includes(ad.id));
  console.log(`New ads to send: ${newAds.length}`);

  for (const ad of newAds) {
    try {
      console.log("Sending ad", ad.id, ad.title);
      await sendAdToTelegram(ad, token, chatId);
      state.sentIds.push(ad.id);
      // small delay to be nice to Telegram
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      console.error("Failed to send ad", ad.id, err);
    }
  }

  await saveState(state);
  console.log("Done");
}

if (import.meta.main) {
  main();
}