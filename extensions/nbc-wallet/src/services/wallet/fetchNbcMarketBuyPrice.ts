import { getNbcMarketConfig } from './getNbcMarketConfig.js';

type MarketCache = {
  price: number;
  fetchedAt: number;
};

let marketCache: MarketCache | null = null;

function parseBuyPrice(payload: unknown, priceField: string): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const raw = data[priceField];
  const price = Number(raw);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return price;
}

export async function fetchNbcMarketBuyPrice(): Promise<number | null> {
  const config = getNbcMarketConfig();

  if (!config.enabled || !config.accessKey) {
    return null;
  }

  const now = Date.now();
  if (
    marketCache &&
    now - marketCache.fetchedAt < config.cacheTtlSeconds * 1000
  ) {
    return marketCache.price;
  }

  const url = new URL(config.tickerUrl);
  url.searchParams.set('symbol', config.symbol);
  url.searchParams.set('accessKey', config.accessKey);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(
      `NBC market ticker request failed (${response.status} ${response.statusText})`
    );
  }

  const json = await response.json();
  const price = parseBuyPrice(json, config.priceField);

  if (price === null) {
    throw new Error(
      `NBC market ticker response missing valid "${config.priceField}" price`
    );
  }

  marketCache = { price, fetchedAt: now };
  return price;
}

/** Clears in-memory cache (for tests). */
export function resetNbcMarketPriceCache(): void {
  marketCache = null;
}
