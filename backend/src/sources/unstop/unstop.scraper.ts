import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser, type Page } from "playwright";
import {
  cleanTitle,
  extractDescriptionText,
  extractEligibility,
  extractEventDates,
  extractFee,
  extractLocation,
  extractPrizeText,
  extractRegistrationDeadline,
  extractTags,
  extractTeamSize,
  getClosedVisibility,
  inferMode,
  inferStatus,
  inferType,
  normalizeWhitespace,
  slugFromUnstopUrl,
  sourceIdFromUnstopUrl
} from "./unstop.parser.js";
import {
  unstopListingItemSchema,
  unstopScrapedOpportunitySchema,
  type UnstopListingItem,
  type UnstopListingRoute,
  type UnstopScrapeOptions,
  type UnstopScrapeResult,
  type UnstopScrapedOpportunity
} from "./unstop.types.js";

const unstopBaseUrl = "https://unstop.com";

const unstopListingRoutes: UnstopListingRoute[] = [
  {
    label: "Compete AMP",
    url: "https://unstop.com/compete/amp",
    typeHint: "OTHER"
  },
  {
    label: "Hackathons AMP",
    url: "https://unstop.com/hackathons/amp",
    typeHint: "HACKATHON"
  },
  {
    label: "Competitions AMP",
    url: "https://unstop.com/competitions/amp",
    typeHint: "OTHER"
  },
  {
    label: "Competitions and challenges",
    url: "https://unstop.com/competitions-challenges",
    typeHint: "OTHER"
  },
  {
    label: "Hackathons",
    url: "https://unstop.com/hackathons",
    typeHint: "HACKATHON"
  },
  {
    label: "Competitions",
    url: "https://unstop.com/competitions",
    typeHint: "OTHER"
  }
];

interface PageExtraction {
  title: string | null;
  organizerName: string | null;
  documentTitle: string;
  metaDescription: string | null;
  ogImage: string | null;
  bodyText: string;
  mainHtml: string | null;
  canonicalUrl: string | null;
  links: Array<{
    text: string;
    href: string;
  }>;
}

function normalizeUrl(value: string) {
  const url = new URL(value, unstopBaseUrl);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function toAmpUrl(value: string) {
  const normalized = normalizeUrl(value);

  if (normalized.endsWith("/amp")) {
    return normalized;
  }

  return `${normalized}/amp`;
}

function toCanonicalOpportunityUrl(value: string) {
  return normalizeUrl(value).replace(/\/amp$/, "");
}

function opportunityTypeHintFromUrl(value: string) {
  const path = new URL(value).pathname;

  if (path.startsWith("/hackathons/")) {
    return "HACKATHON";
  }

  return "OTHER";
}

function isUnstopOpportunityUrl(value: string) {
  try {
    const url = new URL(value, unstopBaseUrl);

    if (url.hostname !== "unstop.com") {
      return false;
    }

    const parts = url.pathname.split("/").filter(Boolean).filter((part) => part !== "amp");
    const category = parts[0];
    const slug = parts[1];

    if (!category || !slug || !["hackathons", "competitions"].includes(category)) {
      return false;
    }

    return /-\d+$/.test(slug);
  } catch {
    return false;
  }
}

async function autoScrollPage(page: Page) {
  await page.evaluate(`async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let previousHeight = 0;

    for (let index = 0; index < 8; index += 1) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(600);

      const currentHeight = document.body.scrollHeight;

      if (currentHeight === previousHeight) {
        break;
      }

      previousHeight = currentHeight;
    }

    window.scrollTo(0, 0);
  }`);
}

function mergeListingItems(current: UnstopListingItem, incoming: UnstopListingItem) {
  return {
    ...current,
    title: current.title.length >= incoming.title.length ? current.title : incoming.title,
    listingText:
      incoming.listingText.length > current.listingText.length ? incoming.listingText : current.listingText,
    typeHint: current.typeHint !== "OTHER" ? current.typeHint : incoming.typeHint,
    sourceRoutes: Array.from(new Set([...current.sourceRoutes, ...incoming.sourceRoutes]))
  };
}

async function extractPageData(page: Page): Promise<PageExtraction> {
  return (await page.evaluate(`(() => {
    const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
    const meta = (selector) => document.querySelector(selector)?.content?.trim() || null;
    const links = Array.from(document.querySelectorAll("a[href]")).map((anchor) => ({
      text: normalize(anchor.innerText || anchor.textContent),
      href: anchor.href
    }));

    return {
      title:
        document.querySelector("h1")?.textContent?.trim() ??
        meta('meta[property="og:title"]') ??
        document.title,
      organizerName: document.querySelector("h2 a")?.textContent?.trim() ?? document.querySelector("h2")?.textContent?.trim() ?? null,
      documentTitle: document.title,
      metaDescription:
        meta('meta[name="description"]') ?? meta('meta[property="og:description"]') ?? null,
      ogImage: meta('meta[property="og:image"]'),
      bodyText: document.body.innerText,
      mainHtml: document.querySelector("main")?.innerHTML ?? null,
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href ?? null,
      links
    };
  })()`)) as PageExtraction;
}

async function collectListingItemsFromRoute(page: Page, route: UnstopListingRoute) {
  await page.goto(route.url, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await autoScrollPage(page).catch(() => undefined);
  await page.waitForSelector("a[href]", {
    timeout: 30_000
  });

  const extracted = await extractPageData(page);
  const items = new Map<string, UnstopListingItem>();

  for (const link of extracted.links) {
    const href = normalizeUrl(link.href);

    if (!isUnstopOpportunityUrl(href)) {
      continue;
    }

    const canonicalUrl = toCanonicalOpportunityUrl(href);
    const parsed = unstopListingItemSchema.safeParse({
      title: cleanTitle(link.text),
      url: canonicalUrl,
      ampUrl: toAmpUrl(canonicalUrl),
      listingText: link.text,
      typeHint: opportunityTypeHintFromUrl(canonicalUrl) === "HACKATHON" ? "HACKATHON" : route.typeHint,
      sourceRoutes: [route.url]
    });

    if (parsed.success) {
      const existing = items.get(canonicalUrl);
      items.set(canonicalUrl, existing ? mergeListingItems(existing, parsed.data) : parsed.data);
    }
  }

  return Array.from(items.values());
}

async function collectListingItems(page: Page) {
  const deduped = new Map<string, UnstopListingItem>();
  const routeStats: UnstopScrapeResult["routeStats"] = [];
  const errors: string[] = [];

  for (const route of unstopListingRoutes) {
    try {
      const items = await collectListingItemsFromRoute(page, route);

      for (const item of items) {
        const existing = deduped.get(item.url);
        deduped.set(item.url, existing ? mergeListingItems(existing, item) : item);
      }

      routeStats.push({
        url: route.url,
        discoveredCount: items.length,
        failed: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${route.url}: ${message}`);
      routeStats.push({
        url: route.url,
        discoveredCount: 0,
        failed: true,
        error: message
      });
    }
  }

  return {
    items: Array.from(deduped.values()),
    routeStats,
    errors
  };
}

async function scrapeDetailPage(
  page: Page,
  listing: UnstopListingItem,
  scrapedAt: Date
): Promise<UnstopScrapedOpportunity> {
  await page.goto(listing.ampUrl, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

  const extracted = await extractPageData(page);
  const title = cleanTitle(extracted.title ?? listing.title);
  const bodyText = extracted.bodyText;
  const combinedText = `${listing.listingText}\n${bodyText}`;
  const sourceUrl = toCanonicalOpportunityUrl(extracted.canonicalUrl ?? listing.url);
  const registrationDeadline = extractRegistrationDeadline(combinedText, listing, scrapedAt);
  const eventDates = extractEventDates(combinedText);
  const mode = inferMode(combinedText);
  const status = inferStatus({
    text: combinedText,
    registrationDeadline,
    startsAt: eventDates.startsAt,
    endsAt: eventDates.endsAt,
    now: scrapedAt
  });
  const visibility = getClosedVisibility({
    status,
    endsAt: eventDates.endsAt,
    registrationDeadline,
    scrapedAt
  });
  const fee = extractFee(combinedText);
  const teamSize = extractTeamSize(combinedText);
  const type = inferType(combinedText, listing);
  const location = extractLocation(combinedText, mode);
  const description = extractDescriptionText(bodyText, title);
  const organizerUrl = extracted.links.find((link) => link.text === extracted.organizerName)?.href ?? null;

  return unstopScrapedOpportunitySchema.parse({
    sourceId: sourceIdFromUnstopUrl(sourceUrl),
    sourceUrl,
    applyUrl: sourceUrl,
    title,
    slug: slugFromUnstopUrl(sourceUrl),
    summary: extracted.metaDescription ? normalizeWhitespace(extracted.metaDescription) : null,
    description,
    descriptionHtml: extracted.mainHtml ? extracted.mainHtml.slice(0, 60_000) : null,
    type,
    organizerName: extracted.organizerName ? normalizeWhitespace(extracted.organizerName) : null,
    organizerUrl: organizerUrl && organizerUrl.startsWith("https://unstop.com") ? organizerUrl : null,
    bannerImageUrl: extracted.ogImage,
    logoUrl: null,
    registrationStartsAt: null,
    registrationDeadline,
    startsAt: eventDates.startsAt,
    endsAt: eventDates.endsAt,
    closedAt: visibility.closedAt,
    visibleUntil: visibility.visibleUntil,
    mode,
    status,
    locationText: location.locationText,
    country: location.country,
    city: location.city,
    tags: extractTags(combinedText, listing),
    skills: [],
    eligibility: extractEligibility(bodyText),
    teamSizeMin: teamSize.teamSizeMin,
    teamSizeMax: teamSize.teamSizeMax,
    isFree: fee.isFree,
    feeAmount: fee.feeAmount,
    feeCurrency: fee.feeCurrency,
    prizeText: extractPrizeText(bodyText),
    rawData: {
      listing,
      ampUrl: listing.ampUrl,
      extracted: {
        ...extracted,
        mainHtml: extracted.mainHtml ? extracted.mainHtml.slice(0, 60_000) : null
      },
      scrapedAt: scrapedAt.toISOString()
    }
  });
}

export async function scrapeUnstopOpportunities(options: UnstopScrapeOptions): Promise<UnstopScrapeResult> {
  let browser: Browser | null = null;
  const errors: string[] = [];
  const opportunities: UnstopScrapedOpportunity[] = [];

  try {
    browser = await chromium.launch({
      headless: options.headless
    });

    const context = await browser.newContext({
      userAgent: options.userAgent,
      viewport: {
        width: 1365,
        height: 900
      }
    });
    const page = await context.newPage();
    const listingDiscovery = await collectListingItems(page);
    errors.push(...listingDiscovery.errors);
    const listingItems = listingDiscovery.items;
    const limitedItems = listingItems.slice(0, options.limit);

    for (const listing of limitedItems) {
      try {
        if (options.requestDelayMs > 0) {
          await delay(options.requestDelayMs);
        }

        opportunities.push(await scrapeDetailPage(page, listing, new Date()));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${listing.url}: ${message}`);
      }
    }

    await context.close();

    return {
      opportunities,
      discoveredCount: listingItems.length,
      failedCount: errors.length,
      errors,
      routeStats: listingDiscovery.routeStats
    };
  } finally {
    await browser?.close();
  }
}
