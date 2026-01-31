import { safeGetItem, safeSetItem } from './safeStorage';

const STORAGE_KEY = 'magistral_transparency_news_reads_v1';

type StoreShape = Record<
  string,
  {
    readIds: string[];
  }
>;

function loadStore(): StoreShape {
  if (typeof window === 'undefined') return {};
  return safeGetItem<StoreShape>(STORAGE_KEY, {});
}

function saveStore(store: StoreShape) {
  if (typeof window === 'undefined') return;
  safeSetItem(STORAGE_KEY, store);
}

export function getReadNewsIds(userId: string | null | undefined): Set<string> {
  if (!userId) return new Set();
  const store = loadStore();
  const ids = store[userId]?.readIds ?? [];
  return new Set(ids);
}

export function markNewsAsRead(userId: string | null | undefined, newsId: string) {
  if (!userId || !newsId) return;
  const store = loadStore();
  const current = new Set(store[userId]?.readIds ?? []);
  current.add(newsId);
  store[userId] = { readIds: Array.from(current) };
  saveStore(store);
}

