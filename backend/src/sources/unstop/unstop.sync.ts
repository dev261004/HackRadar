import {
  OpportunityMode as PrismaOpportunityMode,
  OpportunitySourceKey as PrismaOpportunitySourceKey,
  OpportunityStatus as PrismaOpportunityStatus,
  OpportunityType as PrismaOpportunityType,
  SyncRunStatus,
  type Prisma
} from "@prisma/client";
import { env } from "../../config/env.js";
import { getPrisma } from "../../lib/prisma.js";
import { scrapeUnstopOpportunities } from "./unstop.scraper.js";
import type { UnstopScrapedOpportunity } from "./unstop.types.js";

export interface UnstopSyncOptions {
  limit?: number;
  headless?: boolean;
  requestDelayMs?: number;
}

export interface UnstopSyncResult {
  syncRunId: string;
  discoveredCount: number;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  status: SyncRunStatus;
  errors: string[];
  routeStats: Array<{
    url: string;
    discoveredCount: number;
    failed: boolean;
    error?: string;
  }>;
}

function jsonPayload(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function decimalString(value: string | null) {
  return value ? value : null;
}

function buildOpportunityWriteData(
  opportunity: UnstopScrapedOpportunity,
  scrapedAt: Date
): Prisma.OpportunityUncheckedCreateInput {
  return {
    sourceKey: PrismaOpportunitySourceKey.UNSTOP,
    sourceId: opportunity.sourceId,
    sourceUrl: opportunity.sourceUrl,
    applyUrl: opportunity.applyUrl,
    title: opportunity.title,
    slug: opportunity.slug,
    summary: opportunity.summary,
    description: opportunity.description,
    descriptionHtml: opportunity.descriptionHtml,
    type: opportunity.type as PrismaOpportunityType,
    status: opportunity.status as PrismaOpportunityStatus,
    organizerName: opportunity.organizerName,
    organizerUrl: opportunity.organizerUrl,
    bannerImageUrl: opportunity.bannerImageUrl,
    logoUrl: opportunity.logoUrl,
    registrationStartsAt: opportunity.registrationStartsAt,
    registrationDeadline: opportunity.registrationDeadline,
    startsAt: opportunity.startsAt,
    endsAt: opportunity.endsAt,
    closedAt: opportunity.closedAt,
    visibleUntil: opportunity.visibleUntil,
    mode: opportunity.mode as PrismaOpportunityMode,
    locationText: opportunity.locationText,
    country: opportunity.country,
    city: opportunity.city,
    tags: opportunity.tags,
    skills: opportunity.skills,
    eligibility: opportunity.eligibility,
    teamSizeMin: opportunity.teamSizeMin,
    teamSizeMax: opportunity.teamSizeMax,
    isFree: opportunity.isFree,
    feeAmount: decimalString(opportunity.feeAmount),
    feeCurrency: opportunity.feeCurrency,
    prizeText: opportunity.prizeText,
    lastSeenAt: scrapedAt,
    scrapedAt
  };
}

async function ensureUnstopSource() {
  return getPrisma().opportunitySource.upsert({
    where: {
      key: PrismaOpportunitySourceKey.UNSTOP
    },
    create: {
      key: PrismaOpportunitySourceKey.UNSTOP,
      displayName: "Unstop",
      baseUrl: "https://unstop.com",
      isEnabled: true
    },
    update: {
      displayName: "Unstop",
      baseUrl: "https://unstop.com",
      isEnabled: true
    }
  });
}

export async function syncUnstopOpportunities(options: UnstopSyncOptions = {}): Promise<UnstopSyncResult> {
  const prisma = getPrisma();
  await ensureUnstopSource();

  const syncRun = await prisma.sourceSyncRun.create({
    data: {
      sourceKey: PrismaOpportunitySourceKey.UNSTOP,
      status: SyncRunStatus.RUNNING,
      metadata: {
        limit: options.limit ?? env.UNSTOP_SCRAPE_LIMIT,
        headless: options.headless ?? env.UNSTOP_HEADLESS,
        requestDelayMs: options.requestDelayMs ?? env.UNSTOP_REQUEST_DELAY_MS
      }
    }
  });

  let createdCount = 0;
  let updatedCount = 0;

  try {
    const scraped = await scrapeUnstopOpportunities({
      limit: options.limit ?? env.UNSTOP_SCRAPE_LIMIT,
      headless: options.headless ?? env.UNSTOP_HEADLESS,
      requestDelayMs: options.requestDelayMs ?? env.UNSTOP_REQUEST_DELAY_MS,
      userAgent: env.SCRAPER_USER_AGENT
    });

    for (const opportunity of scraped.opportunities) {
      const scrapedAt = new Date();
      const existing = await prisma.opportunity.findUnique({
        where: {
          sourceUrl: opportunity.sourceUrl
        },
        select: {
          id: true
        }
      });
      const writeData = buildOpportunityWriteData(opportunity, scrapedAt);
      const saved = await prisma.opportunity.upsert({
        where: {
          sourceUrl: opportunity.sourceUrl
        },
        create: {
          ...writeData,
          firstSeenAt: scrapedAt
        },
        update: writeData
      });

      if (existing) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }

      await prisma.opportunityRawSnapshot.create({
        data: {
          opportunityId: saved.id,
          syncRunId: syncRun.id,
          sourceKey: PrismaOpportunitySourceKey.UNSTOP,
          sourceId: opportunity.sourceId,
          sourceUrl: opportunity.sourceUrl,
          payload: jsonPayload(opportunity.rawData)
        }
      });
    }

    const failedCount = scraped.failedCount;
    const status = failedCount > 0 ? SyncRunStatus.PARTIAL : SyncRunStatus.SUCCESS;

    await prisma.sourceSyncRun.update({
      where: {
        id: syncRun.id
      },
      data: {
        status,
        finishedAt: new Date(),
        fetchedCount: scraped.opportunities.length,
        createdCount,
        updatedCount,
        failedCount,
        errorMessage: scraped.errors.length > 0 ? scraped.errors.join("\n") : null,
        metadata: {
          discoveredCount: scraped.discoveredCount,
          routeStats: scraped.routeStats,
          errors: scraped.errors
        }
      }
    });

    return {
      syncRunId: syncRun.id,
      discoveredCount: scraped.discoveredCount,
      fetchedCount: scraped.opportunities.length,
      createdCount,
      updatedCount,
      failedCount,
      status,
      errors: scraped.errors,
      routeStats: scraped.routeStats
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await prisma.sourceSyncRun.update({
      where: {
        id: syncRun.id
      },
      data: {
        status: SyncRunStatus.FAILED,
        finishedAt: new Date(),
        createdCount,
        updatedCount,
        failedCount: 1,
        errorMessage: message
      }
    });

    throw error;
  }
}
