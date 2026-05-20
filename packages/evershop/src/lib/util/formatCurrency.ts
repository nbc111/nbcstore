import { getConfig } from './getConfig.js';

/** Locale for Intl currency display (UI language may stay zh). */
export function getCurrencyFormatLocale(currency?: string): string {
  const configured = getConfig('shop.currencyLocale', '');
  if (configured) {
    return configured;
  }

  const curr = (currency || getConfig('shop.currency', 'USD')).toUpperCase();
  if (curr === 'USD') {
    return 'en-US';
  }

  return getConfig('shop.language', 'en');
}

export function formatCurrency(
  value: number | string,
  currency?: string
): string {
  const amount = typeof value === 'number' ? value : parseFloat(value || '0');
  const curr = (currency || getConfig('shop.currency', 'USD')).toUpperCase();

  return new Intl.NumberFormat(getCurrencyFormatLocale(curr), {
    style: 'currency',
    currency: curr
  }).format(amount);
}
