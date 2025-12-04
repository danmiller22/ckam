export interface BotState {
  sentIds: string[];
}

// Вариант для Deno Deploy: состояние не сохраняем между запусками.
// Каждый запуск работает "с нуля", без дедупликации.
export async function loadState(): Promise<BotState> {
  return { sentIds: [] };
}

export async function saveState(_state: BotState): Promise<void> {
  // no-op
  return;
}