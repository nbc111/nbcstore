export function calculateNbcAmount(cnyAmount: string | number, rate: number) {
  const amount = Number(cnyAmount);
  if (!Number.isFinite(amount) || amount <= 0 || !rate || rate <= 0) {
    return 0;
  }
  return Math.ceil(amount / rate);
}
