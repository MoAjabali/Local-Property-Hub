import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storage';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface RateCache {
  rates: Record<string, number>; // e.g. { USD: 0.267 } relative to base
  base: string;
  fetchedAt: number;
}

export async function fetchLiveRate(
  fromCode: string,
  toCode: string
): Promise<number | null> {
  try {
    // Check cache first
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.RATE_CACHE);
    if (raw) {
      const cache: RateCache = JSON.parse(raw);
      const age = Date.now() - cache.fetchedAt;
      if (age < CACHE_TTL_MS && cache.base === fromCode && cache.rates[toCode]) {
        return cache.rates[toCode];
      }
    }

    // Fetch from free API (no key required)
    const res = await fetch(`https://open.er-api.com/v6/latest/${fromCode}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (data.result !== 'success' || !data.rates) return null;

    const newCache: RateCache = {
      rates: data.rates,
      base: fromCode,
      fetchedAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.RATE_CACHE, JSON.stringify(newCache));

    return data.rates[toCode] ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert amount from `fromCode` to `toCode` using live rates.
 * Returns null if rate unavailable.
 */
export async function convertLive(
  amount: number,
  fromCode: string,
  toCode: string
): Promise<{ converted: number; rate: number } | null> {
  if (fromCode === toCode) return { converted: amount, rate: 1 };
  const rate = await fetchLiveRate(fromCode, toCode);
  if (rate === null) return null;
  return { converted: amount * rate, rate };
}
