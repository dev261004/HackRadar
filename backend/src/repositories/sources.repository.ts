import {
  OpportunitySourceKey as PrismaOpportunitySourceKey,
  SyncRunStatus as PrismaSyncRunStatus,
  type Prisma,
  type SourceSyncRun as PrismaSourceSyncRun
} from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "../lib/prisma.js";
import { sourceRegistry } from "../sources/registry.js";
import type { OpportunitySource } from "../types/opportunity.js";

export const sourceSyncRunStatuses = ["running", "success", "failed", "partial"] as const;

export type SourceSyncRunStatus = (typeof sourceSyncRunStatuses)[number];

type SourceStrategy = (typeof sourceRegistry)[number]["strategy"];
type SourceListDataSource = "database" | "registry";
type SyncRunDataSource = "database" | "none";
type SyncRunUnavailableReason = "database_not_configured" | "database_error";

export interface SourceSummary {
  source: OpportunitySource;
  displayName: string;
  baseUrl: string | null;
  strategy: SourceStrategy;
  enabled: boolean;
  stats: {
    opportunityCount: number | null;
    syncRunCount: number;
    latestSyncRun: SourceSyncRunSummary | null;
  };
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SourceSyncRunSummary {
  id: string;
  source: OpportunitySource;
  status: SourceSyncRunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  counts: {
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errorMessage: string | null;
}

export interface SourceSyncRunDetail extends SourceSyncRunSummary {
  sourceInfo: {
    displayName: string;
    baseUrl: string | null;
    enabled: boolean;
  };
  metadata: Prisma.JsonValue | null;
  rawSnapshotCount: number;
}

export interface ListSourcesResult {
  data: SourceSummary[];
  dataSource: SourceListDataSource;
}

export interface ListSourceSyncRunsFilters {
  source?: OpportunitySource;
  status?: SourceSyncRunStatus;
  limit?: number;
}

export interface ListSourceSyncRunsResult {
  data: SourceSyncRunSummary[];
  dataSource: SyncRunDataSource;
  limit: number;
  reason?: SyncRunUnavailableReason;
}

export interface GetSourceSyncRunResult {
  data: SourceSyncRunDetail | null;
  dataSource: SyncRunDataSource;
  reason?: SyncRunUnavailableReason;
}

type SourceWithLatestRun = Prisma.OpportunitySourceGetPayload<{
  include: {
    syncRuns: true;
    _count: {
      select: {
        syncRuns: true;
      };
    };
  };
}>;

type SyncRunWithSourceAndCount = Prisma.SourceSyncRunGetPayload<{
  include: {
    source: true;
    _count: {
      select: {
        rawSnapshots: true;
      };
    };
  };
}>;

const DEFAULT_SYNC_RUN_LIMIT = 25;
const MAX_SYNC_RUN_LIMIT = 100;

const sourceToPrismaKeyMap: Record<OpportunitySource, PrismaOpportunitySourceKey> = {
  devfolio: PrismaOpportunitySourceKey.DEVFOLIO,
  hackerearth: PrismaOpportunitySourceKey.HACKEREARTH,
  unstop: PrismaOpportunitySourceKey.UNSTOP
};

const prismaKeyToSourceMap: Record<PrismaOpportunitySourceKey, OpportunitySource> = {
  [PrismaOpportunitySourceKey.DEVFOLIO]: "devfolio",
  [PrismaOpportunitySourceKey.HACKEREARTH]: "hackerearth",
  [PrismaOpportunitySourceKey.UNSTOP]: "unstop"
};

const statusToPrismaStatusMap: Record<SourceSyncRunStatus, PrismaSyncRunStatus> = {
  running: PrismaSyncRunStatus.RUNNING,
  success: PrismaSyncRunStatus.SUCCESS,
  failed: PrismaSyncRunStatus.FAILED,
  partial: PrismaSyncRunStatus.PARTIAL
};

const prismaStatusToStatusMap: Record<PrismaSyncRunStatus, SourceSyncRunStatus> = {
  [PrismaSyncRunStatus.RUNNING]: "running",
  [PrismaSyncRunStatus.SUCCESS]: "success",
  [PrismaSyncRunStatus.FAILED]: "failed",
  [PrismaSyncRunStatus.PARTIAL]: "partial"
};

function toIso(date: Date | null) {
  return date ? date.toISOString() : null;
}

function getDurationMs(startedAt: Date, finishedAt: Date | null) {
  return finishedAt ? finishedAt.getTime() - startedAt.getTime() : null;
}

function normalizeLimit(limit: number | undefined) {
  if (!limit || !Number.isInteger(limit) || limit < 1) {
    return DEFAULT_SYNC_RUN_LIMIT;
  }

  return Math.min(limit, MAX_SYNC_RUN_LIMIT);
}

function sourceStrategyFor(source: OpportunitySource): SourceStrategy {
  return sourceRegistry.find((item) => item.source === source)?.strategy ?? "scraper";
}

function mapSyncRunRecord(run: PrismaSourceSyncRun): SourceSyncRunSummary {
  return {
    id: run.id,
    source: prismaKeyToSourceMap[run.sourceKey],
    status: prismaStatusToStatusMap[run.status],
    startedAt: run.startedAt.toISOString(),
    finishedAt: toIso(run.finishedAt),
    durationMs: getDurationMs(run.startedAt, run.finishedAt),
    counts: {
      fetched: run.fetchedCount,
      created: run.createdCount,
      updated: run.updatedCount,
      skipped: run.skippedCount,
      failed: run.failedCount
    },
    errorMessage: run.errorMessage
  };
}

function mapSourceFromRegistry(source: (typeof sourceRegistry)[number]): SourceSummary {
  return {
    source: source.source,
    displayName: source.displayName,
    baseUrl: source.baseUrl,
    strategy: source.strategy,
    enabled: source.enabled,
    stats: {
      opportunityCount: null,
      syncRunCount: 0,
      latestSyncRun: null
    },
    createdAt: null,
    updatedAt: null
  };
}

function mapSourceRecord(
  source: SourceWithLatestRun,
  opportunityCount: number | null,
  registrySource?: (typeof sourceRegistry)[number]
): SourceSummary {
  const publicSource = prismaKeyToSourceMap[source.key];
  const latestSyncRun = source.syncRuns[0] ? mapSyncRunRecord(source.syncRuns[0]) : null;

  return {
    source: publicSource,
    displayName: source.displayName,
    baseUrl: source.baseUrl ?? registrySource?.baseUrl ?? null,
    strategy: registrySource?.strategy ?? sourceStrategyFor(publicSource),
    enabled: source.isEnabled,
    stats: {
      opportunityCount,
      syncRunCount: source._count.syncRuns,
      latestSyncRun
    },
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString()
  };
}

function mapSyncRunDetail(run: SyncRunWithSourceAndCount): SourceSyncRunDetail {
  const summary = mapSyncRunRecord(run);

  return {
    ...summary,
    sourceInfo: {
      displayName: run.source.displayName,
      baseUrl: run.source.baseUrl,
      enabled: run.source.isEnabled
    },
    metadata: run.metadata,
    rawSnapshotCount: run._count.rawSnapshots
  };
}

export async function listSources(): Promise<ListSourcesResult> {
  if (!isDatabaseConfigured()) {
    return {
      data: sourceRegistry.map(mapSourceFromRegistry),
      dataSource: "registry"
    };
  }

  try {
    const prisma = getPrisma();
    const [sources, opportunityCounts] = await Promise.all([
      prisma.opportunitySource.findMany({
        include: {
          syncRuns: {
            orderBy: {
              startedAt: "desc"
            },
            take: 1
          },
          _count: {
            select: {
              syncRuns: true
            }
          }
        },
        orderBy: {
          displayName: "asc"
        }
      }),
      prisma.opportunity.groupBy({
        by: ["sourceKey"],
        _count: {
          id: true
        }
      })
    ]);
    const sourceByKey = new Map(sources.map((source) => [source.key, source]));
    const countByKey = new Map(
      opportunityCounts.map((count) => [count.sourceKey, count._count.id] as const)
    );
    const registrySources = sourceRegistry.map((registrySource) => {
      const key = sourceToPrismaKeyMap[registrySource.source];
      const dbSource = sourceByKey.get(key);

      if (!dbSource) {
        return mapSourceFromRegistry(registrySource);
      }

      return mapSourceRecord(dbSource, countByKey.get(key) ?? 0, registrySource);
    });
    const registrySourceKeys = new Set(sourceRegistry.map((source) => source.source));
    const databaseOnlySources = sources
      .filter((source) => !registrySourceKeys.has(prismaKeyToSourceMap[source.key]))
      .map((source) => mapSourceRecord(source, countByKey.get(source.key) ?? 0));

    return {
      data: [...registrySources, ...databaseOnlySources],
      dataSource: "database"
    };
  } catch (error) {
    console.warn("Falling back to source registry because the database query failed.", error);

    return {
      data: sourceRegistry.map(mapSourceFromRegistry),
      dataSource: "registry"
    };
  }
}

export async function listSourceSyncRuns(
  filters: ListSourceSyncRunsFilters
): Promise<ListSourceSyncRunsResult> {
  const limit = normalizeLimit(filters.limit);

  if (!isDatabaseConfigured()) {
    return {
      data: [],
      dataSource: "none",
      limit,
      reason: "database_not_configured"
    };
  }

  try {
    const where: Prisma.SourceSyncRunWhereInput = {};

    if (filters.source) {
      where.sourceKey = sourceToPrismaKeyMap[filters.source];
    }

    if (filters.status) {
      where.status = statusToPrismaStatusMap[filters.status];
    }

    const runs = await getPrisma().sourceSyncRun.findMany({
      where,
      orderBy: {
        startedAt: "desc"
      },
      take: limit
    });

    return {
      data: runs.map(mapSyncRunRecord),
      dataSource: "database",
      limit
    };
  } catch (error) {
    console.warn("Could not read source sync runs.", error);

    return {
      data: [],
      dataSource: "none",
      limit,
      reason: "database_error"
    };
  }
}

export async function getSourceSyncRunById(id: string): Promise<GetSourceSyncRunResult> {
  if (!isDatabaseConfigured()) {
    return {
      data: null,
      dataSource: "none",
      reason: "database_not_configured"
    };
  }

  try {
    const run = await getPrisma().sourceSyncRun.findUnique({
      where: {
        id
      },
      include: {
        source: true,
        _count: {
          select: {
            rawSnapshots: true
          }
        }
      }
    });

    return {
      data: run ? mapSyncRunDetail(run) : null,
      dataSource: "database"
    };
  } catch (error) {
    console.warn("Could not read source sync run detail.", error);

    return {
      data: null,
      dataSource: "none",
      reason: "database_error"
    };
  }
}
