/** Mirrors server-side calculateNbcAmount */
export function calculateRequiredWalletAssetAmount(
  fiatAmount: number,
  exchangeRate: number
): number {
  const amount = Number(fiatAmount);
  if (!exchangeRate || exchangeRate <= 0 || !Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.ceil(amount / exchangeRate);
}

/** Mirrors server-side calculateNbcAmount */
export function calculateRequiredNbc(
  cnyAmount: number,
  exchangeRate: number
): number {
  return calculateRequiredWalletAssetAmount(cnyAmount, exchangeRate);
}
