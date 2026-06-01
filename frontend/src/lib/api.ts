import { fallbackOpportunities } from "./fallback-opportunities";
import type { Opportunity } from "./opportunity";

interface OpportunitiesResponse {
  data: Opportunity[];
}

const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000";

export async function getOpportunities(): Promise<Opportunity[]> {
  try {
    const response = await fetch(`${backendUrl}/api/opportunities`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return fallbackOpportunities;
    }

    const payload = (await response.json()) as OpportunitiesResponse;
    return payload.data;
  } catch {
    return fallbackOpportunities;
  }
}
