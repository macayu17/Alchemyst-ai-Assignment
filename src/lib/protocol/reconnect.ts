const MAX_RECONNECT_DELAY_MS = 10_000;

export function reconnectDelay(attempt: number): number {
  return Math.min(500 * 2 ** Math.max(0, attempt), MAX_RECONNECT_DELAY_MS);
}
