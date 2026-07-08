type RateLimitInput = {
  scope: string;
  keys: string[];
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
};

const buckets = new Map<string, number[]>();

export function getRequestRateLimitKey(
  request: { ip?: string; connection?: { remoteAddress?: string } },
  ...parts: Array<string | number | null | undefined>
) {
  const ip = request.ip || request.connection?.remoteAddress || 'unknown';
  return [ip, ...parts.map((part) => String(part ?? '').trim().toLowerCase())]
    .filter(Boolean)
    .join(':');
}

export function checkRateLimit(input: RateLimitInput): RateLimitResult {
  const limit = Math.max(Number(input.limit || 0), 0);
  if (limit === 0) {
    return { allowed: true };
  }

  const windowMs = Math.max(Number(input.windowSeconds || 60), 1) * 1000;
  const now = Date.now();
  let allowed = true;

  for (const key of input.keys) {
    const bucketKey = `${input.scope}:${key}`;
    const timestamps = (buckets.get(bucketKey) || []).filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (timestamps.length >= limit) {
      allowed = false;
      buckets.set(bucketKey, timestamps);
      continue;
    }

    timestamps.push(now);
    buckets.set(bucketKey, timestamps);
  }

  return { allowed };
}
