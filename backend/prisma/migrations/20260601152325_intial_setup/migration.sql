-- CreateEnum
CREATE TYPE "opportunity_source_key" AS ENUM ('devfolio', 'hackerearth', 'unstop');

-- CreateEnum
CREATE TYPE "opportunity_type" AS ENUM ('hackathon', 'coding-contest', 'ai-competition', 'hiring-challenge', 'other');

-- CreateEnum
CREATE TYPE "opportunity_status" AS ENUM ('upcoming', 'open', 'ongoing', 'closed');

-- CreateEnum
CREATE TYPE "opportunity_mode" AS ENUM ('online', 'offline', 'hybrid', 'unknown');

-- CreateEnum
CREATE TYPE "sync_run_status" AS ENUM ('running', 'success', 'failed', 'partial');

-- CreateTable
CREATE TABLE "opportunity_sources" (
    "key" "opportunity_source_key" NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_sources_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "sourceKey" "opportunity_source_key" NOT NULL,
    "sourceId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "applyUrl" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "summary" TEXT,
    "description" TEXT,
    "descriptionHtml" TEXT,
    "type" "opportunity_type" NOT NULL DEFAULT 'other',
    "status" "opportunity_status" NOT NULL DEFAULT 'upcoming',
    "organizerName" TEXT,
    "organizerUrl" TEXT,
    "bannerImageUrl" TEXT,
    "logoUrl" TEXT,
    "registrationStartsAt" TIMESTAMP(3),
    "registrationDeadline" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "visibleUntil" TIMESTAMP(3),
    "mode" "opportunity_mode" NOT NULL DEFAULT 'unknown',
    "locationText" TEXT,
    "country" TEXT,
    "city" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibility" TEXT,
    "teamSizeMin" INTEGER,
    "teamSizeMax" INTEGER,
    "isFree" BOOLEAN,
    "feeAmount" DECIMAL(12,2),
    "feeCurrency" TEXT,
    "prizeAmount" DECIMAL(12,2),
    "prizeCurrency" TEXT,
    "prizeText" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_sync_runs" (
    "id" TEXT NOT NULL,
    "sourceKey" "opportunity_source_key" NOT NULL,
    "status" "sync_run_status" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "source_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_raw_snapshots" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "syncRunId" TEXT,
    "sourceKey" "opportunity_source_key" NOT NULL,
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "payload" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_raw_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_sourceUrl_key" ON "opportunities"("sourceUrl");

-- CreateIndex
CREATE INDEX "opportunities_sourceKey_idx" ON "opportunities"("sourceKey");

-- CreateIndex
CREATE INDEX "opportunities_type_idx" ON "opportunities"("type");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_mode_idx" ON "opportunities"("mode");

-- CreateIndex
CREATE INDEX "opportunities_country_city_idx" ON "opportunities"("country", "city");

-- CreateIndex
CREATE INDEX "opportunities_registrationDeadline_idx" ON "opportunities"("registrationDeadline");

-- CreateIndex
CREATE INDEX "opportunities_startsAt_idx" ON "opportunities"("startsAt");

-- CreateIndex
CREATE INDEX "opportunities_closedAt_idx" ON "opportunities"("closedAt");

-- CreateIndex
CREATE INDEX "opportunities_visibleUntil_idx" ON "opportunities"("visibleUntil");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_sourceKey_sourceId_key" ON "opportunities"("sourceKey", "sourceId");

-- CreateIndex
CREATE INDEX "source_sync_runs_sourceKey_startedAt_idx" ON "source_sync_runs"("sourceKey", "startedAt");

-- CreateIndex
CREATE INDEX "source_sync_runs_status_idx" ON "source_sync_runs"("status");

-- CreateIndex
CREATE INDEX "opportunity_raw_snapshots_opportunityId_capturedAt_idx" ON "opportunity_raw_snapshots"("opportunityId", "capturedAt");

-- CreateIndex
CREATE INDEX "opportunity_raw_snapshots_sourceKey_sourceId_idx" ON "opportunity_raw_snapshots"("sourceKey", "sourceId");

-- CreateIndex
CREATE INDEX "opportunity_raw_snapshots_syncRunId_idx" ON "opportunity_raw_snapshots"("syncRunId");

-- AddForeignKey
ALTER TABLE "source_sync_runs" ADD CONSTRAINT "source_sync_runs_sourceKey_fkey" FOREIGN KEY ("sourceKey") REFERENCES "opportunity_sources"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_raw_snapshots" ADD CONSTRAINT "opportunity_raw_snapshots_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_raw_snapshots" ADD CONSTRAINT "opportunity_raw_snapshots_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "source_sync_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
