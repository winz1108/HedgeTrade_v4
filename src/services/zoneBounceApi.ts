import type { ZBStatus, ZBZones, ZBTrades, ZBParams, ZBHealth } from '../types/zoneBounce';

const BASE = 'http://130.61.50.101/zb';

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchZBHealth(): Promise<ZBHealth | null> {
  return fetchJSON<ZBHealth>('/health');
}

export async function fetchZBStatus(): Promise<ZBStatus | null> {
  return fetchJSON<ZBStatus>('/status');
}

export async function fetchZBZones(): Promise<ZBZones | null> {
  return fetchJSON<ZBZones>('/zones');
}

export async function fetchZBTrades(): Promise<ZBTrades | null> {
  return fetchJSON<ZBTrades>('/trades');
}

export async function fetchZBParams(): Promise<ZBParams | null> {
  return fetchJSON<ZBParams>('/params');
}
