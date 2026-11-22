CREATE TABLE "RateLimitCleanupState" (
  "id" TEXT NOT NULL,
  "lastRunAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitCleanupState_pkey" PRIMARY KEY ("id")
);
