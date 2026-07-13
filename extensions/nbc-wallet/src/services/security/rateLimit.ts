import { getConfig } from '@evershop/evershop/lib/util/getConfig';

type RateLimitInput = {
  scope: string;
  keys: Array<string | number | null | undefined>;
  limit?: number;
  windowSeconds?: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

function normalizeKeyPart(value: string | number | null | undefined) {
  return String(value || 'anonymous').trim().toLowerCase();
}

function getClientIp(request: any) {
  const forwardedFor = String(request.headers?.['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return (
    forwardedFor ||
    request.ip ||
    request.socket?.remoteAddress ||
    request.connection?.remoteAddress ||
    'unknown'
  );
}

export function getRequestRateLimitKey(
  request: any,
  ...parts: Array<string | number | null | undefined>
) {
  return [getClientIp(request), ...parts].map(normalizeKeyPart).join(':');
}

export function checkRateLimit(input: RateLimitInput): RateLimitResult {
  const defaultLimit = Number(getConfig('nbcWallet.rateLimit.default.limit', 60));
  const defaultWindowSeconds = Number(
    getConfig('nbcWallet.rateLimit.default.windowSeconds', 60)
  );
  const limit = Math.max(Number(input.limit || defaultLimit), 1);
  const windowSeconds = Math.max(
    Number(input.windowSeconds || defaultWindowSeconds),
    1
  );
  const key = [input.scope, ...input.keys.map(normalizeKeyPart)].join(':');
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1)
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
