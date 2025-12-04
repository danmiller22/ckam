import { MAX_SENT_IDS } from "./config.ts";

export interface BotState {
  sentIds: string[];
}

const STATE_PATH = "./data/state.json";

export async function loadState(): Promise<BotState> {
  try {
    const data = await Deno.readTextFile(STATE_PATH);
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed.sentIds)) {
      return { sentIds: parsed.sentIds.map(String) };
    }
  } catch (_err) {
    // ignore, use default
  }
  return { sentIds: [] };
}

export async function saveState(state: BotState): Promise<void> {
  const unique = Array.from(new Set(state.sentIds));
  if (unique.length > MAX_SENT_IDS) {
    state.sentIds = unique.slice(unique.length - MAX_SENT_IDS);
  } else {
    state.sentIds = unique;
  }

  const dir = STATE_PATH.split("/").slice(0, -1).join("/");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true }).catch(() => {});
  }

  await Deno.writeTextFile(
    STATE_PATH,
    JSON.stringify({ sentIds: state.sentIds }, null, 2),
  );
}