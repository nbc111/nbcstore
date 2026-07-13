import { getConfig } from '@evershop/evershop/lib/util/getConfig';

export function getShopCurrency(): string {
  return String(getConfig('shop.currency', 'USD')).toUpperCase();
}

export function getNbcToFiatRateKey(currency?: string): string {
  const fiat = (currency || getShopCurrency()).toUpperCase();
  return `NBC_TO_${fiat}`;
}

export function getAssetToFiatRateKey(assetSymbol: string, currency?: string): string {
  const asset = String(assetSymbol || 'NBC').trim().toUpperCase();
  const fiat = (currency || getShopCurrency()).toUpperCase();
  return `${asset}_TO_${fiat}`;
}
