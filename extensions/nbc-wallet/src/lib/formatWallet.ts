export function shortenAddress(address: string): string {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatNbcAmount(amount: number, maxFractionDigits = 0): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0
  }).format(amount);
}
