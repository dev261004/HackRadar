import type { OpportunitySource } from "../types/opportunity.js";

interface SourceRegistryItem {
  source: OpportunitySource;
  displayName: string;
  strategy: "api-first" | "scraper";
  enabled: boolean;
}

export const sourceRegistry: SourceRegistryItem[] = [
  {
    source: "devfolio",
    displayName: "Devfolio",
    strategy: "api-first",
    enabled: true
  },
  {
    source: "hackerearth",
    displayName: "HackerEarth",
    strategy: "api-first",
    enabled: true
  },
  {
    source: "unstop",
    displayName: "Unstop",
    strategy: "api-first",
    enabled: true
  }
];
