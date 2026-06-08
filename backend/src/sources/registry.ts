import type { OpportunitySource } from "../types/opportunity.js";

interface SourceRegistryItem {
  source: OpportunitySource;
  displayName: string;
  baseUrl: string;
  strategy: "api-first" | "scraper";
  enabled: boolean;
}

export const sourceRegistry: SourceRegistryItem[] = [
  {
    source: "devfolio",
    displayName: "Devfolio",
    baseUrl: "https://devfolio.co",
    strategy: "api-first",
    enabled: true
  },
  {
    source: "hackerearth",
    displayName: "HackerEarth",
    baseUrl: "https://www.hackerearth.com",
    strategy: "api-first",
    enabled: true
  },
  {
    source: "unstop",
    displayName: "Unstop",
    baseUrl: "https://unstop.com",
    strategy: "api-first",
    enabled: true
  }
];
