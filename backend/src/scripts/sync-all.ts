import { getPrisma } from "../lib/prisma.js";
import { syncDevfolioOpportunities } from "../sources/devfolio/devfolio.sync.js";
import { syncHackerEarthOpportunities } from "../sources/hackerearth/hackerearth.sync.js";
import { syncUnstopOpportunities } from "../sources/unstop/unstop.sync.js";

type SourceName = "devfolio" | "hackerearth" | "unstop";

interface SourceSyncResult {
  source: SourceName;
  ok: boolean;
  result?: SyncResultWithStatus;
  error?: string;
}

interface SyncResultWithStatus {
  status: string;
}

function getNumberArg(name: string) {
  const prefix = `--${name}=`;
  const rawValue = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);

  if (!rawValue) {
    return undefined;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) ? value : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function runSource(
  source: SourceName,
  syncFn: (options: { limit?: number }) => Promise<SyncResultWithStatus>,
  limit?: number
): Promise<SourceSyncResult> {
  console.log(`Starting ${source} sync`);

  try {
    const result = await syncFn({ limit });
    const ok = result.status === "SUCCESS";

    console.log(`${source} sync ${ok ? "completed" : "completed with issues"}`);

    return {
      source,
      ok,
      result
    };
  } catch (error) {
    console.error(`${source} sync failed`);
    console.error(error);

    return {
      source,
      ok: false,
      error: getErrorMessage(error)
    };
  }
}

async function main() {
  const startedAt = new Date();
  const limit = getNumberArg("limit");
  const results = [
    await runSource("devfolio", syncDevfolioOpportunities, limit),
    await runSource("unstop", syncUnstopOpportunities, limit),
    await runSource("hackerearth", syncHackerEarthOpportunities, limit)
  ];
  const failedSources = results.filter((result) => !result.ok);
  const status =
    failedSources.length === 0 ? "SUCCESS" : failedSources.length === results.length ? "FAILED" : "PARTIAL";

  const summary = {
    status,
    limit: limit ?? null,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    sources: results
  };

  console.log("All source sync completed");
  console.log(JSON.stringify(summary, null, 2));

  if (failedSources.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("All source sync failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
