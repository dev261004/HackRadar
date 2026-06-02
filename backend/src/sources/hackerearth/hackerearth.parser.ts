import {
  OpportunityMode as PrismaOpportunityMode,
  OpportunityStatus as PrismaOpportunityStatus,
  OpportunityType as PrismaOpportunityType
} from "@prisma/client";
import type { HackerEarthListingItem, HackerEarthListingSection } from "./hackerearth.types.js";

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

export function cleanTitle(value: string) {
  return normalizeWhitespace(value)
    .replace(/\s*\|\s*HackerEarth\s*$/i, "")
    .replace(/\s*-\s*HackerEarth\s*$/i, "")
    .replace(/\b(HACKATHON|COMPETITIVE)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sourceIdFromHackerEarthUrl(value: string) {
  const url = new URL(value);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.at(-1) ?? url.toString();
}

export function slugFromHackerEarthUrl(value: string) {
  return sourceIdFromHackerEarthUrl(value);
}

export function parseHackerEarthDate(value: string) {
  const normalized = normalizeWhitespace(value);
  const match = normalized.match(
    /\b([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+UTC\b/i
  );

  if (match) {
    let hour = Number(match[4]);
    const minute = Number(match[5]);
    const meridiem = (match[6] ?? "").toLowerCase();

    if (meridiem === "pm" && hour < 12) {
      hour += 12;
    }

    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }

    return new Date(
      `${match[3]}-${monthToNumber(match[1] ?? "").padStart(2, "0")}-${(match[2] ?? "").padStart(
        2,
        "0"
      )}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00.000Z`
    );
  }

  const shortDate = normalized.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})\s+UTC\b/i);

  if (shortDate) {
    return new Date(
      `${shortDate[3]}-${monthToNumber(shortDate[1] ?? "").padStart(2, "0")}-${(shortDate[2] ?? "").padStart(
        2,
        "0"
      )}T00:00:00.000Z`
    );
  }

  return null;
}

function monthToNumber(value: string) {
  const months: Record<string, string> = {
    jan: "1",
    january: "1",
    feb: "2",
    february: "2",
    mar: "3",
    march: "3",
    apr: "4",
    april: "4",
    may: "5",
    jun: "6",
    june: "6",
    jul: "7",
    july: "7",
    aug: "8",
    august: "8",
    sep: "9",
    sept: "9",
    september: "9",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12"
  };

  return months[value.toLowerCase()] ?? "1";
}

export function extractDateInfo(text: string, listing: HackerEarthListingItem) {
  const lines = normalizeLines(text);
  const startsIndex = lines.findIndex((line) => /^starts on:?$/i.test(line));
  const endsIndex = lines.findIndex((line) => /^ends on:?$/i.test(line));
  const startsAt = startsIndex >= 0 ? parseHackerEarthDate(lines[startsIndex + 1] ?? "") : null;
  const endsAt = endsIndex >= 0 ? parseHackerEarthDate(lines[endsIndex + 1] ?? "") : null;
  const listingDate = parseHackerEarthDate(listing.listingText);

  return {
    startsAt: startsAt ?? (listing.section === "upcoming" ? listingDate : null),
    endsAt: endsAt ?? (listing.section === "previous" ? listingDate : null),
    registrationDeadline: endsAt ?? null
  };
}

export function inferMode(text: string) {
  const hasOnline = /\bonline\b/i.test(text);
  const hasOffline = /\boffline|onsite|in-person\b/i.test(text);

  if (hasOnline && hasOffline) {
    return PrismaOpportunityMode.HYBRID;
  }

  if (hasOnline) {
    return PrismaOpportunityMode.ONLINE;
  }

  if (hasOffline) {
    return PrismaOpportunityMode.OFFLINE;
  }

  return PrismaOpportunityMode.UNKNOWN;
}

export function inferType(text: string, listing: HackerEarthListingItem) {
  const combined = `${listing.url} ${listing.title} ${listing.listingText} ${text}`;

  if (/\/hackathon\//i.test(listing.url)) {
    return /\b(hiring|job|recruit)\b/i.test(combined)
      ? PrismaOpportunityType.HIRING_CHALLENGE
      : PrismaOpportunityType.HACKATHON;
  }

  if (/\/hiring\//i.test(listing.url) || /\b(hiring|jobs?|recruit)\b/i.test(combined)) {
    return PrismaOpportunityType.HIRING_CHALLENGE;
  }

  if (/\b(gen ai|generative ai|artificial intelligence|machine learning|ai|ml|data scientist)\b/i.test(combined)) {
    return PrismaOpportunityType.AI_COMPETITION;
  }

  if (/\/competitive\//i.test(listing.url) || /\b(competitive|coding|programming|algorithm|dsa)\b/i.test(combined)) {
    return PrismaOpportunityType.CODING_CONTEST;
  }

  if (listing.typeHint === "HACKATHON") {
    return PrismaOpportunityType.HACKATHON;
  }

  if (listing.typeHint === "HIRING_CHALLENGE") {
    return PrismaOpportunityType.HIRING_CHALLENGE;
  }

  if (listing.typeHint === "CODING_CONTEST") {
    return PrismaOpportunityType.CODING_CONTEST;
  }

  return PrismaOpportunityType.OTHER;
}

export function inferStatus(params: {
  text: string;
  section: HackerEarthListingSection;
  startsAt: Date | null;
  endsAt: Date | null;
  now: Date;
}) {
  if (params.section === "previous" || /\bwinners are announced|ended|previous challenges\b/i.test(params.text)) {
    return PrismaOpportunityStatus.CLOSED;
  }

  if (params.endsAt && params.endsAt < params.now) {
    return PrismaOpportunityStatus.CLOSED;
  }

  if (params.startsAt && params.startsAt > params.now) {
    return PrismaOpportunityStatus.UPCOMING;
  }

  if (params.startsAt && params.startsAt <= params.now && (!params.endsAt || params.endsAt >= params.now)) {
    return PrismaOpportunityStatus.ONGOING;
  }

  if (params.section === "live" || /\b(start now|register|ends in)\b/i.test(params.text)) {
    return PrismaOpportunityStatus.OPEN;
  }

  return PrismaOpportunityStatus.UPCOMING;
}

export function getClosedVisibility(params: {
  status: PrismaOpportunityStatus;
  endsAt: Date | null;
  scrapedAt: Date;
}) {
  if (params.status !== PrismaOpportunityStatus.CLOSED) {
    return {
      closedAt: null,
      visibleUntil: null
    };
  }

  const closedAt = params.endsAt ?? params.scrapedAt;

  return {
    closedAt,
    visibleUntil: new Date(closedAt.getTime() + 24 * 60 * 60 * 1000)
  };
}

export function extractDescriptionText(text: string) {
  const lines = normalizeLines(text);
  const overviewIndex = lines.findIndex((line) => /^overview$/i.test(line));

  if (overviewIndex < 0) {
    return null;
  }

  const collected: string[] = [];

  for (let index = overviewIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (
      !line ||
      /^(themes?|prizes?|rules|participants|judging criteria|social share|help & support|log in|sign up)$/i.test(line)
    ) {
      break;
    }

    collected.push(line);
  }

  const description = normalizeWhitespace(collected.join(" "));

  return description.length > 30 ? description : null;
}

export function extractPrizeText(text: string) {
  const lines = normalizeLines(text);
  const prizeIndex = lines.findIndex((line) => /^prizes?/i.test(line));

  if (prizeIndex < 0) {
    const prizeLine = lines.find((line) => /\bprizes?\b|\bcash prize\b|\busd\b|\$\d+/i.test(line));
    return prizeLine ?? null;
  }

  const collected: string[] = [];

  for (let index = prizeIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line || /^(social share|help & support|log in|sign up)$/i.test(line)) {
      break;
    }

    collected.push(line);
  }

  const prizeText = normalizeWhitespace(collected.join(" "));

  return prizeText.length > 0 ? prizeText.slice(0, 1000) : null;
}

export function extractTeamSize(text: string) {
  const single = text.match(/allowed team size:\s*(\d+)/i);

  if (single) {
    return {
      teamSizeMin: Number(single[1]),
      teamSizeMax: Number(single[1])
    };
  }

  const range = text.match(/allowed team size:\s*(\d+)\s*[-]\s*(\d+)/i);

  if (range) {
    return {
      teamSizeMin: Number(range[1]),
      teamSizeMax: Number(range[2])
    };
  }

  return {
    teamSizeMin: null,
    teamSizeMax: null
  };
}

export function extractLocation(mode: PrismaOpportunityMode) {
  if (mode === PrismaOpportunityMode.ONLINE) {
    return {
      locationText: "Online",
      country: null,
      city: null
    };
  }

  if (mode === PrismaOpportunityMode.HYBRID) {
    return {
      locationText: "Hybrid",
      country: null,
      city: null
    };
  }

  if (mode === PrismaOpportunityMode.OFFLINE) {
    return {
      locationText: "Offline",
      country: null,
      city: null
    };
  }

  return {
    locationText: null,
    country: null,
    city: null
  };
}

export function extractTags(text: string, listing: HackerEarthListingItem) {
  const tags = new Set<string>();
  const combined = `${listing.url} ${listing.title} ${listing.listingText} ${text}`;

  if (/\/hackathon\//i.test(listing.url) || /\bhackathon\b/i.test(combined)) {
    tags.add("hackathon");
  }

  if (/\b(ai|gen ai|machine learning|ml|data science|data scientist)\b/i.test(combined)) {
    tags.add("ai");
  }

  if (/\bpython\b/i.test(combined)) {
    tags.add("python");
  }

  if (/\bdsa|algorithm|competitive\b/i.test(combined)) {
    tags.add("coding");
  }

  if (/\bhiring|jobs?|recruit\b/i.test(combined)) {
    tags.add("hiring");
  }

  return Array.from(tags);
}
