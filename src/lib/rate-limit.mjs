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
  const cleanupDueBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const cleanupLease = await prisma.$queryRaw`
    INSERT INTO "RateLimitCleanupState" ("id", "lastRunAt")
    VALUES ('global', ${now})
    ON CONFLICT ("id") DO UPDATE
    SET "lastRunAt" = EXCLUDED."lastRunAt"
    WHERE "RateLimitCleanupState"."lastRunAt" <= ${cleanupDueBefore}
    RETURNING "id"
  `;

  if (cleanupLease.length > 0) {
    const retentionCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await prisma.$executeRaw`
      DELETE FROM "RateLimitBucket"
      WHERE "windowStart" < ${retentionCutoff}
    `;
  }

  return Number(rows[0]?.count ?? limit + 1) <= limit;
}
