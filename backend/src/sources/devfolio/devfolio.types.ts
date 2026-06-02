import { z } from "zod";

export const devfolioListingSectionSchema = z.enum(["open", "upcoming", "past", "unknown"]);

export type DevfolioListingSection = z.infer<typeof devfolioListingSectionSchema>;

export const devfolioListingRouteSchema = z.object({
  url: z.string().url(),
  sectionHint: devfolioListingSectionSchema,
  label: z.string()
});

export type DevfolioListingRoute = z.infer<typeof devfolioListingRouteSchema>;

export const devfolioListingItemSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  section: devfolioListingSectionSchema,
  listingText: z.string(),
  sourceRoutes: z.array(z.string().url()).default([])
});

export type DevfolioListingItem = z.infer<typeof devfolioListingItemSchema>;

export const devfolioScrapedOpportunitySchema = z.object({
  sourceId: z.string().min(1),
  sourceUrl: z.string().url(),
  applyUrl: z.string().url().nullable(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  descriptionHtml: z.string().nullable(),
  organizerName: z.string().nullable(),
  organizerUrl: z.string().url().nullable(),
  bannerImageUrl: z.string().url().nullable(),
  logoUrl: z.string().url().nullable(),
  registrationStartsAt: z.date().nullable(),
  registrationDeadline: z.date().nullable(),
  startsAt: z.date().nullable(),
  endsAt: z.date().nullable(),
  closedAt: z.date().nullable(),
  visibleUntil: z.date().nullable(),
  mode: z.enum(["ONLINE", "OFFLINE", "HYBRID", "UNKNOWN"]),
  status: z.enum(["UPCOMING", "OPEN", "ONGOING", "CLOSED"]),
  locationText: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  tags: z.array(z.string()),
  skills: z.array(z.string()),
  eligibility: z.string().nullable(),
  teamSizeMin: z.number().int().positive().nullable(),
  teamSizeMax: z.number().int().positive().nullable(),
  isFree: z.boolean().nullable(),
  prizeText: z.string().nullable(),
  rawData: z.record(z.unknown())
});

export type DevfolioScrapedOpportunity = z.infer<typeof devfolioScrapedOpportunitySchema>;

export interface DevfolioScrapeOptions {
  limit: number;
  headless: boolean;
  requestDelayMs: number;
  userAgent: string;
}

export interface DevfolioScrapeResult {
  opportunities: DevfolioScrapedOpportunity[];
  discoveredCount: number;
  failedCount: number;
  errors: string[];
  routeStats: Array<{
    url: string;
    discoveredCount: number;
    failed: boolean;
    error?: string;
  }>;
}
