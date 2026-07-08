export function getRequestDomain(request: {
  headers?: Record<string, string | string[] | undefined>;
  hostname?: string;
}): string {
  const forwardedHost = request.headers?.['x-forwarded-host'];
  const host =
    request.headers?.host || forwardedHost || request.hostname || 'localhost';
  return String(Array.isArray(host) ? host[0] : host)
    .split(',')[0]
    .trim()
    .toLowerCase();
}
