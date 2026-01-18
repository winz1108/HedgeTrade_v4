interface CachedData {
  currentAsset?: number;
  currentBTC?: number;
  currentCash?: number;
  initialAsset?: number;
  currentPrice?: number;
  timestamp: number;
}

const CACHE_KEY = 'hedgetrade_data_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

export const dataCache = {
  save(data: Partial<CachedData>) {
    try {
      const cached: CachedData = {
        ...data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  },

  load(): CachedData | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data = JSON.parse(cached) as CachedData;
      const age = Date.now() - data.timestamp;

      if (age > CACHE_EXPIRY) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to load from cache:', error);
      return null;
    }
  },

  clear() {
    localStorage.removeItem(CACHE_KEY);
  },
};
