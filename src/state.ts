import { MAX_SENT_IDS } from "./config.ts";

export interface BotState {
  sentIds: string[];
}

const STATE_PATH = "./data/state.json";

const isDeploy =
  typeof Deno.env !== "undefined" &&
  typeof Deno.env.get === "function" &&
  Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

let kvPromise: Promise<Deno.Kv> | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!kvPromise) {
    kvPromise = Deno.openKv();
  }
  return kvPromise;
}

async function loadStateFromKv(): Promise<BotState> {
  const kv = await getKv();
  const res = await kv.get<string[]>(["state", "sentIds"]);
  if (Array.isArray(res.value)) {
    return { sentIds: res.value.map(String) };
  }
  return { sentIds: [] };
}

async function saveStateToKv(state: BotState): Promise<void> {
  const kv = await getKv();
  const unique = Array.from(new Set(state.sentIds));
  const trimmed =
    unique.length > MAX_SENT_IDS
      ? unique.slice(unique.length - MAX_SENT_IDS)
      : unique;
  await kv.set(["state", "sentIds"], trimmed);
}

async function loadStateFromFs(): Promise<BotState> {
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

async function saveStateToFs(state: BotState): Promise<void> {
  const unique = Array.from(new Set(state.sentIds));
  const trimmed =
    unique.length > MAX_SENT_IDS
      ? unique.slice(unique.length - MAX_SENT_IDS)
      : unique;

  const dir = STATE_PATH.split("/").slice(0, -1).join("/");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true }).catch(() => {});
  }

  await Deno.writeTextFile(
    STATE_PATH,
    JSON.stringify({ sentIds: trimmed }, null, 2),
  );
}

export async function loadState(): Promise<BotState> {
  if (isDeploy) {
    return await loadStateFromKv();
  }
  return await loadStateFromFs();
}

export async function saveState(state: BotState): Promise<void> {
  if (isDeploy) {
    await saveStateToKv(state);
  } else {
    await saveStateToFs(state);
  }
}