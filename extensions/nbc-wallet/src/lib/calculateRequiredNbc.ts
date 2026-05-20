/** Mirrors server-side calculateNbcAmount */
export function calculateRequiredNbc(
  cnyAmount: number,
  exchangeRate: number
): number {
  if (!exchangeRate || exchangeRate <= 0) {
    return 0;
  }
  return Math.floor(cnyAmount / exchangeRate);
}
