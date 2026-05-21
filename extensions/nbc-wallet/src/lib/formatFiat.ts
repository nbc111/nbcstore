export function formatFiatAmount(
  value: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  try {
    const curr = currency.toUpperCase();
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      currencyDisplay: 'narrowSymbol'
    }).format(value);
    return curr === 'USD' ? formatted.replace(/^US\$/, '$') : formatted;
  } catch {
    return `${currency} ${value}`;
  }
}

/** NBC unit price is often well below $1; avoid currency rounding to $0.02. */
export function formatNbcExchangeRate(
  rate: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  const fractionDigits = rate < 0.01 ? 6 : rate < 0.1 ? 4 : rate < 1 ? 3 : 2;
  try {
    const curr = currency.toUpperCase();
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(rate);
    return curr === 'USD' ? formatted.replace(/^US\$/, '$') : formatted;
  } catch {
    return `${currency} ${rate.toFixed(fractionDigits)}`;
  }
}
