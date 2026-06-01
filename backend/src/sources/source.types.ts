import type { Opportunity, OpportunitySource } from "../types/opportunity.js";

export interface SourceAdapter {
  source: OpportunitySource;
  fetchOpportunities(): Promise<Opportunity[]>;
}

export interface SourceRunResult {
  source: OpportunitySource;
  fetched: number;
  failed: boolean;
  error?: string;
}
