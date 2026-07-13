export function getRequestDomain(request: any): string {
  const forwardedHost = String(request.headers?.['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();
  const host = forwardedHost || String(request.headers?.host || '').trim();

  return host.toLowerCase();
}
