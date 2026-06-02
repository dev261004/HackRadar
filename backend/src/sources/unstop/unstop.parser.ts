import {
  OpportunityMode as PrismaOpportunityMode,
  OpportunityStatus as PrismaOpportunityStatus,
  OpportunityType as PrismaOpportunityType
} from "@prisma/client";
import type { UnstopListingItem } from "./unstop.types.js";

const monthNumbers: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12"
};

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
    .replace(/\s*-\s*20\d{2}\s*$/i, "")
    .replace(/\s*\|\s*Unstop\s*$/i, "")
    .replace(/\s*-\s*Unstop\s*$/i, "")
    .trim();
}

export function sourceIdFromUnstopUrl(value: string) {
  const url = new URL(value);
  const segment = url.pathname.split("/").filter(Boolean).filter((part) => part !== "amp").at(-1);
  const idMatch = segment?.match(/-(\d+)$/);

  return idMatch?.[1] ?? segment ?? url.toString();
}

export function slugFromUnstopUrl(value: string) {
  const url = new URL(value);
  return url.pathname.split("/").filter(Boolean).filter((part) => part !== "amp").at(-1) ?? url.hostname;
}

function parseYear(value: string) {
  const numeric = Number(value);
  return numeric < 100 ? 2000 + numeric : numeric;
}

function toIstDate(params: {
  day: number;
  month: string;
  year: number;
  hour?: number;
  minute?: number;
  meridiem?: string;
}) {
  let hour = params.hour ?? 0;

  if (params.meridiem) {
    const meridiem = params.meridiem.toLowerCase();

    if (meridiem === "pm" && hour < 12) {
      hour += 12;
    }

    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }
  }

  const iso = `${params.year.toString().padStart(4, "0")}-${params.month}-${params.day
    .toString()
    .padStart(2, "0")}T${hour.toString().padStart(2, "0")}:${(params.minute ?? 0)
    .toString()
    .padStart(2, "0")}:00+05:30`;

  return new Date(iso);
}

export function parseUnstopDate(value: string) {
  const normalized = normalizeWhitespace(value);
  const match = normalized.match(
    /\b(\d{1,2})\s+([A-Za-z]{3,9})'(\d{2,4}),?\s*(?:(\d{1,2}):(\d{2})\s*(AM|PM)\s*)?IST?\b/i
  );

  if (!match) {
    return null;
  }

  const month = monthNumbers[(match[2] ?? "").toLowerCase()];

  if (!month) {
    return null;
  }

  return toIstDate({
    day: Number(match[1]),
    month,
    year: parseYear(match[3] ?? ""),
    hour: match[4] ? Number(match[4]) : undefined,
    minute: match[5] ? Number(match[5]) : undefined,
    meridiem: match[6]
  });
}

function parseRelativeDeadline(text: string, now: Date) {
  const days = text.match(/\b(\d+)\s+days?\s+left\b/i);

  if (days) {
    return new Date(now.getTime() + Number(days[1]) * 24 * 60 * 60 * 1000);
  }

  const hours = text.match(/\b(\d+)\s+hours?\s+left\b/i);

  if (hours) {
    return new Date(now.getTime() + Number(hours[1]) * 60 * 60 * 1000);
  }

  const minutes = text.match(/\b(\d+)\s+minutes?\s+left\b/i);

  if (minutes) {
    return new Date(now.getTime() + Number(minutes[1]) * 60 * 1000);
  }

  return null;
}

export function extractRegistrationDeadline(text: string, listing: UnstopListingItem, now: Date) {
  const absoluteLine = normalizeLines(text).find((line) => /registration deadline/i.test(line));
  const absoluteDate = absoluteLine ? parseUnstopDate(absoluteLine) : null;
  const relativeDate = parseRelativeDeadline(`${listing.listingText} ${text}`, now);

  if (absoluteDate && absoluteDate >= now) {
    return absoluteDate;
  }

  return relativeDate ?? absoluteDate;
}

export function extractEventDates(text: string) {
  const normalized = normalizeWhitespace(text);
  const range = normalized.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s*[-]\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\s+(\d{4})\b/i
  );

  if (range) {
    const month = monthNumbers[(range[3] ?? "").toLowerCase()];

    if (month) {
      return {
        startsAt: toIstDate({
          day: Number(range[1]),
          month,
          year: Number(range[4])
        }),
        endsAt: toIstDate({
          day: Number(range[2]),
          month,
          year: Number(range[4]),
          hour: 23,
          minute: 59
        })
      };
    }
  }

  return {
    startsAt: null,
    endsAt: null
  };
}

export function inferMode(text: string) {
  const hasHybrid = /\bhybrid\b/i.test(text) || /online\s*\+\s*offline/i.test(text);
  const hasOnline = /\bonline\b/i.test(text);
  const hasOffline = /\boffline\b/i.test(text);

  if (hasHybrid || (hasOnline && hasOffline)) {
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
  registrationDeadline: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  now: Date;
}) {
  if (params.endsAt && params.endsAt < params.now) {
    return PrismaOpportunityStatus.CLOSED;
  }

  if (/registration closed|applications closed|ended/i.test(params.text)) {
    return PrismaOpportunityStatus.CLOSED;
  }

  if (params.startsAt && params.startsAt <= params.now && (!params.endsAt || params.endsAt >= params.now)) {
    return PrismaOpportunityStatus.ONGOING;
  }

  if (params.registrationDeadline && params.registrationDeadline >= params.now) {
    return PrismaOpportunityStatus.OPEN;
  }

  return PrismaOpportunityStatus.UPCOMING;
}

export function getClosedVisibility(params: {
  status: PrismaOpportunityStatus;
  endsAt: Date | null;
  registrationDeadline: Date | null;
  scrapedAt: Date;
}) {
  if (params.status !== PrismaOpportunityStatus.CLOSED) {
    return {
      closedAt: null,
      visibleUntil: null
    };
  }

  const closedAt = params.endsAt ?? params.registrationDeadline ?? params.scrapedAt;

  return {
    closedAt,
    visibleUntil: new Date(closedAt.getTime() + 24 * 60 * 60 * 1000)
  };
}

export function inferType(text: string, listing: UnstopListingItem) {
  const combined = `${listing.url} ${listing.title} ${listing.listingText} ${text}`;

  if (/\/hackathons\//i.test(listing.url) || /\bhackathon\b/i.test(combined)) {
    return PrismaOpportunityType.HACKATHON;
  }

  if (/\b(hiring|hire|recruit|job|internship)\b/i.test(combined)) {
    return PrismaOpportunityType.HIRING_CHALLENGE;
  }

  if (/\b(ai|artificial intelligence|machine learning|ml|data science|genai)\b/i.test(combined)) {
    return PrismaOpportunityType.AI_COMPETITION;
  }

  if (/\b(code|coding|programming|algorithm|developer|software|ctf)\b/i.test(combined)) {
    return PrismaOpportunityType.CODING_CONTEST;
  }

  return listing.typeHint === "HACKATHON" ? PrismaOpportunityType.HACKATHON : PrismaOpportunityType.OTHER;
}

export function extractDescriptionText(text: string, title: string) {
  const lines = normalizeLines(text);
  const startIndex = lines.findIndex((line) => new RegExp(`all that you need to know about`, "i").test(line));

  if (startIndex < 0) {
    return null;
  }

  const collected: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (
      !line ||
      /^(important dates|contact the organisers|rewards and prizes|featured opportunities|similar opportunities|related opportunities|voice your opinion)/i.test(
        line
      )
    ) {
      break;
    }

    if (!line.includes(title)) {
      collected.push(line);
    }
  }

  const description = normalizeWhitespace(collected.join(" "));

  return description.length > 30 ? description : null;
}

export function extractEligibility(text: string) {
  const lines = normalizeLines(text);
  const startIndex = lines.findIndex((line) => /^eligibility$/i.test(line));

  if (startIndex < 0) {
    return null;
  }

  const collected: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line || /^(refer & win|all that you need|stages and timelines)$/i.test(line)) {
      break;
    }

    collected.push(line);
  }

  return collected.length > 0 ? collected.join(", ") : null;
}

export function extractTeamSize(text: string) {
  const individual = /team size\s+individual participation/i.test(text);

  if (individual) {
    return {
      teamSizeMin: 1,
      teamSizeMax: 1
    };
  }

  const range = text.match(/team size\s+(\d+)\s*[-]\s*(\d+)\s+members?/i);

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

export function extractPrizeText(text: string) {
  const lines = normalizeLines(text);
  const startIndex = lines.findIndex((line) => /^(rewards and prizes|rewards|prizes)$/i.test(line));

  if (startIndex < 0) {
    const prizeLine = lines.find((line) => /prize pool|prizes? worth|cash prize/i.test(line));
    return prizeLine ?? null;
  }

  const collected: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line || /^(featured opportunities|similar opportunities|related opportunities|voice your opinion)/i.test(line)) {
      break;
    }

    collected.push(line);
  }

  const prizeText = normalizeWhitespace(collected.join(" "));

  return prizeText.length > 0 ? prizeText.slice(0, 1000) : null;
}

export function extractFee(text: string) {
  if (/\bfree\b/i.test(text)) {
    return {
      isFree: true,
      feeAmount: null,
      feeCurrency: null
    };
  }

  const fee = text.match(/registration fee:\s*[₹INR\s]*([\d,]+)/i);

  if (!fee) {
    return {
      isFree: null,
      feeAmount: null,
      feeCurrency: null
    };
  }

  return {
    isFree: false,
    feeAmount: (fee[1] ?? "").replace(/,/g, ""),
    feeCurrency: "INR"
  };
}

export function extractLocation(text: string, mode: PrismaOpportunityMode) {
  if (mode === PrismaOpportunityMode.ONLINE) {
    return {
      locationText: "Online",
      country: null,
      city: null
    };
  }

  const venue = text.match(/venue:\s*([^\n\r]+)/i);

  if (!venue) {
    return {
      locationText: mode === PrismaOpportunityMode.OFFLINE ? "Offline" : mode === PrismaOpportunityMode.HYBRID ? "Hybrid" : null,
      country: null,
      city: null
    };
  }

  return {
    locationText: normalizeWhitespace(venue[1] ?? ""),
    country: null,
    city: null
  };
}

export function extractTags(text: string, listing: UnstopListingItem) {
  const rawTags = new Set<string>();

  if (/\/hackathons\//i.test(listing.url) || /\bhackathon\b/i.test(`${listing.title} ${text}`)) {
    rawTags.add("hackathon");
  }

  if (/\bai|artificial intelligence|machine learning|genai\b/i.test(text)) {
    rawTags.add("ai");
  }

  if (/\bmarketing|growth\b/i.test(text)) {
    rawTags.add("marketing");
  }

  if (/\bcyber|security|ctf\b/i.test(text)) {
    rawTags.add("cybersecurity");
  }

  if (/\bblockchain|web3\b/i.test(text)) {
    rawTags.add("web3");
  }

  return Array.from(rawTags);
}
