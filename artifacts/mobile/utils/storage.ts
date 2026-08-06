import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  BUILDINGS: '@imtelak:buildings',
  FLOORS: '@imtelak:floors',
  UNITS: '@imtelak:units',
  TENANTS: '@imtelak:tenants',
  CONTRACTS: '@imtelak:contracts',
  RENT_TRANSACTIONS: '@imtelak:rentTransactions',
  PAYMENTS: '@imtelak:payments',
  MAINTENANCE: '@imtelak:maintenance',
  CURRENCIES: '@imtelak:currencies',
  EXCHANGE_RATES: '@imtelak:exchangeRates',
  SETTINGS: '@imtelak:settings',
  SUBSCRIPTION: '@imtelak:subscription',
  RATE_CACHE: '@imtelak:rateCache',
};

export async function loadList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveList<T>(key: string, data: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

export async function loadObject<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? { ...defaultValue, ...JSON.parse(raw) } : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function saveObject<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}
