export function buildWalletAuthMessage(messagePrefix: string, nonce: string): string {
  return `${messagePrefix}\n\nNonce: ${nonce}`;
}
