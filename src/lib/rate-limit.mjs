/**
 * Atomic PostgreSQL-backed fixed-window rate limiter.
 * Keys must be opaque identifiers; callers should hash email addresses before use.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} key
 * @param {number} limit
 * @param {number} windowMs
 * @param {Date} now
 */
export async function consumeRateLimit(prisma, key, limit, windowMs, now = new Date()) {
  const expiredBefore = new Date(now.getTime() - windowMs);
  const rows = await prisma.$queryRaw`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart", "updatedAt")
    VALUES (${key}, 1, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE
    SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStart" <= ${expiredBefore} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" <= ${expiredBefore} THEN ${now}
        ELSE "RateLimitBucket"."windowStart"
      END,
      "updatedAt" = ${now}
    RETURNING "count"
  `;
  return Number(rows[0]?.count ?? limit + 1) <= limit;
}
