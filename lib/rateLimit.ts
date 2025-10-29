const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 10;

interface Entry {
  hits: number;
  expiresAt: number;
}

const store = new Map<string, Entry>();

export function checkRateLimit(identifier: string) {
  const now = Date.now();
  const existing = store.get(identifier);

  if (existing && existing.expiresAt > now) {
    if (existing.hits >= MAX_REQUESTS) {
      return false;
    }
    existing.hits += 1;
    store.set(identifier, existing);
    return true;
  }

  store.set(identifier, { hits: 1, expiresAt: now + WINDOW_MS });
  return true;
}
