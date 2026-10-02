const buckets = new Map();

export function rateLimit(request, scope, limit, windowMs) {
  const forwarded = request.headers["x-forwarded-for"] || request.headers["x-real-ip"] || "unknown";
  const client = String(forwarded).split(",")[0].trim();
  const key = `${scope}:${client}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > limit) return Math.ceil((bucket.resetAt - now) / 1000);
  return null;
}
