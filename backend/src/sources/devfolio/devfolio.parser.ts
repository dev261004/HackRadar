import {
  OpportunityMode as PrismaOpportunityMode,
  OpportunityStatus as PrismaOpportunityStatus
} from "@prisma/client";
import type { DevfolioListingItem, DevfolioListingSection } from "./devfolio.types.js";

const dateOnlyTime = "T00:00:00.000Z";

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

export function slugFromDevfolioUrl(value: string) {
  const url = new URL(value);
  const hostParts = url.hostname.split(".");

  if (hostParts.length > 2) {
    return hostParts[0] ?? url.hostname;
  }

  return url.pathname.split("/").filter(Boolean).at(-1) ?? url.hostname;
}

export function cleanTitle(value: string) {
  return normalizeWhitespace(value)
    .replace(/\s*\|\s*Devfolio\s*$/i, "")
    .replace(/\s*-\s*Devfolio\s*$/i, "")
    .trim();
}

export function uniqueNormalizedTags(values: string[]) {
  const ignored = new Set([
    "theme",
    "hackathon",
    "apply now",
    "remind me",
    "see projects",
    "open",
    "upcoming",
    "ended",
    "online",
    "offline",
    "live"
  ]);

  return Array.from(
    new Set(
      values
        .map((value) => normalizeWhitespace(value).toLowerCase())
        .filter((value) => value.length > 1 && value.length <= 48 && !ignored.has(value))
    )
  );
}

export function extractThemeTags(text: string) {
  const lines = normalizeLines(text);
  const tags: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^theme$/i.test(lines[index] ?? "")) {
      continue;
    }

    for (let offset = 1; offset <= 6; offset += 1) {
      const candidate = lines[index + offset];

      if (!candidate || /participat|online|offline|open|upcoming|ended|starts|opens|apply|remind/i.test(candidate)) {
        break;
      }

      tags.push(candidate);
    }
  }

  return uniqueNormalizedTags(tags);
}

export function parseNumericDate(value: string) {
  const match = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = Number(match[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;

  if (!day || !month || !year) {
    return null;
  }

  return new Date(`${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}${dateOnlyTime}`);
}

function parseNamedDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function parseDateRange(value: string) {
  const normalized = normalizeWhitespace(value);
  const compactRange = normalized.match(
    /\b([A-Za-z]{3,9}\s+\d{1,2})\s*-\s*([A-Za-z]{3,9}\s+\d{1,2}),?\s*(\d{4})\b/
  );

  if (compactRange) {
    const year = compactRange[3];
    const startsAt = parseNamedDate(`${compactRange[1]}, ${year}`);
    const endsAt = parseNamedDate(`${compactRange[2]}, ${year}`);

    return { startsAt, endsAt };
  }

  const fullRange = normalized.match(
    /\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\s*-\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/
  );

  if (fullRange) {
    return {
      startsAt: parseNamedDate(fullRange[1] ?? ""),
      endsAt: parseNamedDate(fullRange[2] ?? "")
    };
  }

  const numericDates = Array.from(normalized.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g)).map((match) =>
    parseNumericDate(match[0])
  );

  return {
    startsAt: numericDates[0] ?? null,
    endsAt: numericDates[1] ?? null
  };
}

export function extractDateInfo(text: string, listing: DevfolioListingItem) {
  const lines = normalizeLines(text);
  const listingText = listing.listingText;
  let registrationStartsAt: Date | null = null;
  let registrationDeadline: Date | null = null;
  let startsAt: Date | null = null;
  let endsAt: Date | null = null;

  const runsFromIndex = lines.findIndex((line) => /^runs from$/i.test(line));

  if (runsFromIndex >= 0) {
    const rangeLine = lines[runsFromIndex + 1];

    if (rangeLine) {
      const parsedRange = parseDateRange(rangeLine);
      startsAt = parsedRange.startsAt;
      endsAt = parsedRange.endsAt;
    }
  }

  const listingStart = listingText.match(/\bStarts\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\b/i);

  if (!startsAt && listingStart) {
    startsAt = parseNumericDate(listingStart[1] ?? "");
  }

  const listingOpen = listingText.match(/\bOpens\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\b/i);

  if (listingOpen) {
    registrationStartsAt = parseNumericDate(listingOpen[1] ?? "");
  }

  const deadlineLineIndex = lines.findIndex((line) =>
    /applications?\s+(close|deadline)|registration\s+(close|deadline)/i.test(line)
  );

  if (deadlineLineIndex >= 0) {
    const deadlineLine = lines[deadlineLineIndex + 1] ?? lines[deadlineLineIndex] ?? "";
    registrationDeadline = parseNumericDate(deadlineLine) ?? parseNamedDate(deadlineLine);
  }

  return {
    registrationStartsAt,
    registrationDeadline,
    startsAt,
    endsAt
  };
}

export function inferMode(text: string) {
  const hasOnline = /\bonline\b/i.test(text);
  const hasOffline = /\boffline\b/i.test(text);

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

export function inferStatus(params: {
  text: string;
  section: DevfolioListingSection;
  startsAt: Date | null;
  endsAt: Date | null;
  now: Date;
}) {
  const { text, section, startsAt, endsAt, now } = params;

  if (section === "past" || /\b(ended|applications closed|see projects)\b/i.test(text)) {
    return PrismaOpportunityStatus.CLOSED;
  }

  if (endsAt && endsAt < now) {
    return PrismaOpportunityStatus.CLOSED;
  }

  if (startsAt && startsAt <= now && (!endsAt || endsAt >= now) && /\bruns from\b/i.test(text)) {
    return PrismaOpportunityStatus.ONGOING;
  }

  if (/\b(apply now|applications open|open)\b/i.test(text)) {
    return PrismaOpportunityStatus.OPEN;
  }

  if (section === "upcoming" || /\b(upcoming|remind me|opens)\b/i.test(text)) {
    return PrismaOpportunityStatus.UPCOMING;
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
  const visibleUntil = new Date(closedAt.getTime() + 24 * 60 * 60 * 1000);

  return {
    closedAt,
    visibleUntil
  };
}

export function extractDescriptionText(text: string, fallback: string | null) {
  const lines = normalizeLines(text);
  const startIndex = lines.findIndex((line) =>
    /^(about|about the hackathon|description|overview|what is|problem statement)$/i.test(line)
  );

  if (startIndex >= 0) {
    const collected: string[] = [];

    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];

      if (!line || /^(theme|themes|prizes?|schedule|sponsors?|rules|faq|faqs|tracks?|judges?)$/i.test(line)) {
        break;
      }

      collected.push(line);
    }

    const description = normalizeWhitespace(collected.join(" "));

    if (description.length > 40) {
      return description;
    }
  }

  return fallback;
}

export function inferLocation(params: { text: string; mode: PrismaOpportunityMode }) {
  if (params.mode === PrismaOpportunityMode.ONLINE) {
    return {
      locationText: "Online",
      country: null,
      city: null
    };
  }

  const lines = normalizeLines(params.text);
  const locationIndex = lines.findIndex((line) => /^(happening|location|venue)$/i.test(line));
  const locationText = locationIndex >= 0 ? lines[locationIndex + 1] ?? null : null;

  if (!locationText || /online|offline/i.test(locationText)) {
    return {
      locationText: params.mode === PrismaOpportunityMode.OFFLINE ? "Offline" : null,
      country: null,
      city: null
    };
  }

  const parts = locationText.split(",").map((part) => normalizeWhitespace(part));

  return {
    locationText,
    country: parts.at(-1) ?? null,
    city: parts.length > 1 ? parts.at(-2) ?? null : null
  };
}
