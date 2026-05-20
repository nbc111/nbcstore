import { getConfig } from '@evershop/evershop/lib/util/getConfig';

export function getShopCurrency(): string {
  return String(getConfig('shop.currency', 'USD')).toUpperCase();
}

export function getNbcToFiatRateKey(currency?: string): string {
  const fiat = (currency || getShopCurrency()).toUpperCase();
  return `NBC_TO_${fiat}`;
}
