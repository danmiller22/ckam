import { loadState, saveState } from "./src/state.ts";
import { fetchFilteredAds } from "./src/lalafo.ts";
import { sendAdToTelegram } from "./src/telegram.ts";

async function main() {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  const apiUrl = Deno.env.get("LALAFO_API_URL");

  if (!token || !chatId || !apiUrl) {
    console.error("Missing required env vars. Need TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, LALAFO_API_URL");
    // On Deno Deploy Deno.exit is not allowed, so just stop execution.
    return;
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