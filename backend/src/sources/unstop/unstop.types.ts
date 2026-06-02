import { z } from "zod";

export const unstopListingRouteSchema = z.object({
  url: z.string().url(),
  label: z.string(),
  typeHint: z.enum(["HACKATHON", "CODING_CONTEST", "AI_COMPETITION", "HIRING_CHALLENGE", "OTHER"])
});

export type UnstopListingRoute = z.infer<typeof unstopListingRouteSchema>;

export const unstopListingItemSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  ampUrl: z.string().url(),
  listingText: z.string(),
  typeHint: z.enum(["HACKATHON", "CODING_CONTEST", "AI_COMPETITION", "HIRING_CHALLENGE", "OTHER"]),
  sourceRoutes: z.array(z.string().url()).default([])
});

export type UnstopListingItem = z.infer<typeof unstopListingItemSchema>;

export const unstopScrapedOpportunitySchema = z.object({
  sourceId: z.string().min(1),
  sourceUrl: z.string().url(),
  applyUrl: z.string().url().nullable(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  descriptionHtml: z.string().nullable(),
  type: z.enum(["HACKATHON", "CODING_CONTEST", "AI_COMPETITION", "HIRING_CHALLENGE", "OTHER"]),
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
  feeAmount: z.string().nullable(),
  feeCurrency: z.string().nullable(),
  prizeText: z.string().nullable(),
  rawData: z.record(z.unknown())
});

export type UnstopScrapedOpportunity = z.infer<typeof unstopScrapedOpportunitySchema>;

export interface UnstopScrapeOptions {
  limit: number;
  headless: boolean;
  requestDelayMs: number;
  userAgent: string;
}

export interface UnstopScrapeResult {
  opportunities: UnstopScrapedOpportunity[];
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
