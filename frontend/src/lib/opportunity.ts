export const opportunitySources = ["devfolio", "hackerearth", "unstop"] as const;

export type OpportunitySource = (typeof opportunitySources)[number];

export const opportunityTypes = [
  "hackathon",
  "coding-contest",
  "ai-competition",
  "hiring-challenge",
  "other"
] as const;

export type OpportunityType = (typeof opportunityTypes)[number];

export type OpportunityStatus = "open" | "upcoming" | "ongoing" | "closed";

export type OpportunityMode = "online" | "offline" | "hybrid" | "unknown";

export interface Opportunity {
  id: string;
  sourceId?: string | null;
  sourceUrl?: string;
  applyUrl?: string | null;
  title: string;
  slug?: string | null;
  summary?: string | null;
  description?: string | null;
  descriptionHtml?: string | null;
  source: OpportunitySource;
  type: OpportunityType;
  organizerName?: string | null;
  organizerUrl?: string | null;
  bannerImageUrl?: string | null;
  logoUrl?: string | null;
  registrationStartsAt?: string | null;
  registrationDeadline: string | null;
  startsAt: string | null;
  endsAt: string | null;
  closedAt?: string | null;
  visibleUntil?: string | null;
  mode?: OpportunityMode;
  locationText?: string | null;
  country?: string | null;
  city?: string | null;
  url: string;
  tags: string[];
  skills?: string[];
  eligibility?: string | null;
  teamSizeMin?: number | null;
  teamSizeMax?: number | null;
  isFree?: boolean | null;
  feeAmount?: string | null;
  feeCurrency?: string | null;
  prizeAmount?: string | null;
  prizeCurrency?: string | null;
  prizeText?: string | null;
  status: OpportunityStatus;
  firstSeenAt?: string;
  lastSeenAt?: string;
  scrapedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  organizer: string;
  location: string;
  isOnline: boolean;
}
