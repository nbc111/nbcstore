export function calculateNbcAmount(cnyAmount: string | number, rate: number) {
  const amount = Number(cnyAmount);
  return Math.floor(amount / rate);
}
