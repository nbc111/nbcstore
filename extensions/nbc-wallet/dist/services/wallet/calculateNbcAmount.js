export function calculateNbcAmount(cnyAmount, rate) {
    const amount = Number(cnyAmount);
    return Math.floor(amount / rate);
}
