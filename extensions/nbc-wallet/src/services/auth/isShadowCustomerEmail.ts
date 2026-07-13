export function isShadowCustomerEmail(email?: string | null): boolean {
  return /^wallet_[^@\s]+@nbc\.local$/i.test(String(email || '').trim());
}
