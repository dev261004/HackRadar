import { fallbackOpportunities } from "./fallback-opportunities";
import type { Opportunity } from "./opportunity";

interface OpportunitiesResponse {
  data: Opportunity[];
  meta?: {
    count?: number;
    dataSource?: "database" | "mock";
  };
}

export type OpportunitiesDataSource = "database" | "mock" | "fallback";

export interface OpportunitiesFeed {
  data: Opportunity[];
  meta: {
    count: number;
    dataSource: OpportunitiesDataSource;
    isFallback: boolean;
    error?: string;
  };
}

const backendUrl =
  typeof window === "undefined"
    ? process.env.BACKEND_API_URL ?? "http://localhost:4000"
    : process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4000";

function fallbackFeed(error?: string): OpportunitiesFeed {
  return {
    data: fallbackOpportunities,
    meta: {
      count: fallbackOpportunities.length,
      dataSource: "fallback",
      isFallback: true,
      error
    }
  };
}

export async function getOpportunitiesFeed(): Promise<OpportunitiesFeed> {
  try {
    const response = await fetch(`${backendUrl}/api/opportunities`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return fallbackFeed(`Backend returned ${response.status}.`);
    }

    const payload = (await response.json()) as OpportunitiesResponse;
    const data = Array.isArray(payload.data) ? payload.data : [];

    return {
      data,
      meta: {
        count: payload.meta?.count ?? data.length,
        dataSource: payload.meta?.dataSource ?? "database",
        isFallback: false
      }
    };
  } catch (error) {
    return fallbackFeed(error instanceof Error ? error.message : "Backend request failed.");
  }
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const feed = await getOpportunitiesFeed();
  return feed.data;
}
