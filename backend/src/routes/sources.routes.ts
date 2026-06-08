import { Router } from "express";
import {
  getSourceSyncRunById,
  listSourceSyncRuns,
  listSources,
  sourceSyncRunStatuses,
  type SourceSyncRunStatus
} from "../repositories/sources.repository.js";
import { opportunitySources, type OpportunitySource } from "../types/opportunity.js";

export const sourcesRouter = Router();

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function isOpportunitySource(value: string): value is OpportunitySource {
  return opportunitySources.includes(value as OpportunitySource);
}

function isSourceSyncRunStatus(value: string): value is SourceSyncRunStatus {
  return sourceSyncRunStatuses.includes(value as SourceSyncRunStatus);
}

function parseLimit(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

sourcesRouter.get("/", async (_req, res) => {
  const result = await listSources();

  res.json({
    data: result.data,
    meta: {
      count: result.data.length,
      dataSource: result.dataSource
    }
  });
});

sourcesRouter.get("/sync-runs", async (req, res) => {
  const source = firstQueryValue(req.query.source);
  const status = firstQueryValue(req.query.status);
  const limit = firstQueryValue(req.query.limit);
  const result = await listSourceSyncRuns({
    source: source && isOpportunitySource(source) ? source : undefined,
    status: status && isSourceSyncRunStatus(status) ? status : undefined,
    limit: parseLimit(limit)
  });

  res.json({
    data: result.data,
    meta: {
      count: result.data.length,
      dataSource: result.dataSource,
      reason: result.reason,
      limit: result.limit,
      sources: opportunitySources,
      statuses: sourceSyncRunStatuses
    }
  });
});

sourcesRouter.get("/sync-runs/:id", async (req, res) => {
  const result = await getSourceSyncRunById(req.params.id);

  if (result.reason === "database_not_configured") {
    res.status(503).json({
      error: "Sync run history requires database configuration.",
      reason: result.reason
    });
    return;
  }

  if (result.reason === "database_error") {
    res.status(500).json({
      error: "Could not read sync run history.",
      reason: result.reason
    });
    return;
  }

  if (!result.data) {
    res.status(404).json({
      error: "Sync run not found"
    });
    return;
  }

  res.json({
    data: result.data,
    meta: {
      dataSource: result.dataSource
    }
  });
});
