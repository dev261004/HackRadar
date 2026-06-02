import {
  OpportunityMode as PrismaOpportunityMode,
  OpportunitySourceKey as PrismaOpportunitySourceKey,
  OpportunityStatus as PrismaOpportunityStatus,
  OpportunityType as PrismaOpportunityType,
  type Opportunity as PrismaOpportunity
} from "@prisma/client";
import type {
  Opportunity,
  OpportunityMode,
  OpportunitySource,
  OpportunityStatus,
  OpportunityType
} from "../types/opportunity.js";

const sourceMap: Record<PrismaOpportunitySourceKey, OpportunitySource> = {
  [PrismaOpportunitySourceKey.DEVFOLIO]: "devfolio",
  [PrismaOpportunitySourceKey.HACKEREARTH]: "hackerearth",
  [PrismaOpportunitySourceKey.UNSTOP]: "unstop"
};

const typeMap: Record<PrismaOpportunityType, OpportunityType> = {
  [PrismaOpportunityType.HACKATHON]: "hackathon",
  [PrismaOpportunityType.CODING_CONTEST]: "coding-contest",
  [PrismaOpportunityType.AI_COMPETITION]: "ai-competition",
  [PrismaOpportunityType.HIRING_CHALLENGE]: "hiring-challenge",
  [PrismaOpportunityType.OTHER]: "other"
};

const statusMap: Record<PrismaOpportunityStatus, OpportunityStatus> = {
  [PrismaOpportunityStatus.UPCOMING]: "upcoming",
  [PrismaOpportunityStatus.OPEN]: "open",
  [PrismaOpportunityStatus.ONGOING]: "ongoing",
  [PrismaOpportunityStatus.CLOSED]: "closed"
};

const modeMap: Record<PrismaOpportunityMode, OpportunityMode> = {
  [PrismaOpportunityMode.ONLINE]: "online",
  [PrismaOpportunityMode.OFFLINE]: "offline",
  [PrismaOpportunityMode.HYBRID]: "hybrid",
  [PrismaOpportunityMode.UNKNOWN]: "unknown"
};

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function getLocationLabel(opportunity: PrismaOpportunity) {
  if (opportunity.locationText) {
    return opportunity.locationText;
  }

  if (opportunity.city && opportunity.country) {
    return `${opportunity.city}, ${opportunity.country}`;
  }

  return opportunity.country ?? opportunity.city ?? "Global";
}

export function mapOpportunityRecord(opportunity: PrismaOpportunity): Opportunity {
  const mode = modeMap[opportunity.mode];
  const sourceUrl = opportunity.sourceUrl;
  const applyUrl = opportunity.applyUrl ?? sourceUrl;

  return {
    id: opportunity.id,
    sourceId: opportunity.sourceId,
    sourceUrl,
    applyUrl,
    title: opportunity.title,
    slug: opportunity.slug,
    summary: opportunity.summary,
    description: opportunity.description,
    descriptionHtml: opportunity.descriptionHtml,
    source: sourceMap[opportunity.sourceKey],
    type: typeMap[opportunity.type],
    status: statusMap[opportunity.status],
    organizerName: opportunity.organizerName,
    organizerUrl: opportunity.organizerUrl,
    bannerImageUrl: opportunity.bannerImageUrl,
    logoUrl: opportunity.logoUrl,
    registrationStartsAt: toIsoString(opportunity.registrationStartsAt),
    registrationDeadline: toIsoString(opportunity.registrationDeadline),
    startsAt: toIsoString(opportunity.startsAt),
    endsAt: toIsoString(opportunity.endsAt),
    closedAt: toIsoString(opportunity.closedAt),
    visibleUntil: toIsoString(opportunity.visibleUntil),
    mode,
    locationText: opportunity.locationText,
    country: opportunity.country,
    city: opportunity.city,
    tags: opportunity.tags,
    skills: opportunity.skills,
    eligibility: opportunity.eligibility,
    teamSizeMin: opportunity.teamSizeMin,
    teamSizeMax: opportunity.teamSizeMax,
    isFree: opportunity.isFree,
    feeAmount: opportunity.feeAmount?.toString() ?? null,
    feeCurrency: opportunity.feeCurrency,
    prizeAmount: opportunity.prizeAmount?.toString() ?? null,
    prizeCurrency: opportunity.prizeCurrency,
    prizeText: opportunity.prizeText,
    firstSeenAt: opportunity.firstSeenAt.toISOString(),
    lastSeenAt: opportunity.lastSeenAt.toISOString(),
    scrapedAt: toIsoString(opportunity.scrapedAt),
    createdAt: opportunity.createdAt.toISOString(),
    updatedAt: opportunity.updatedAt.toISOString(),
    organizer: opportunity.organizerName ?? "Unknown organizer",
    location: getLocationLabel(opportunity),
    isOnline: mode === "online" || mode === "hybrid",
    url: applyUrl
  };
}
