/** Mirrors server-side calculateNbcAmount */
export function calculateRequiredNbc(
  cnyAmount: number,
  exchangeRate: number
): number {
  const amount = Number(cnyAmount);
  if (!exchangeRate || exchangeRate <= 0 || !Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.ceil(amount / exchangeRate);
}
