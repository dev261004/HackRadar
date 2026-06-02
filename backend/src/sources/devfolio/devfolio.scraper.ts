import {
  OpportunityMode as PrismaOpportunityMode,
  OpportunityStatus as PrismaOpportunityStatus
} from "@prisma/client";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser, type Page } from "playwright";
import {
  cleanTitle,
  extractDateInfo,
  extractDescriptionText,
  extractThemeTags,
  getClosedVisibility,
  inferLocation,
  inferMode,
  inferStatus,
  normalizeWhitespace,
  slugFromDevfolioUrl,
  uniqueNormalizedTags
} from "./devfolio.parser.js";
import {
  devfolioListingItemSchema,
  devfolioScrapedOpportunitySchema,
  type DevfolioListingRoute,
  type DevfolioListingItem,
  type DevfolioScrapeOptions,
  type DevfolioScrapeResult,
  type DevfolioScrapedOpportunity
} from "./devfolio.types.js";

const devfolioExploreUrl = "https://devfolio.co/explore";
const devfolioBaseUrl = "https://devfolio.co";

const devfolioListingRoutes: DevfolioListingRoute[] = [
  {
    label: "Explore",
    url: devfolioExploreUrl,
    sectionHint: "unknown"
  },
  {
    label: "All hackathons",
    url: "https://devfolio.co/hackathons",
    sectionHint: "unknown"
  },
  {
    label: "Open hackathons",
    url: "https://devfolio.co/hackathons/open",
    sectionHint: "open"
  },
  {
    label: "Upcoming hackathons",
    url: "https://devfolio.co/hackathons/upcoming",
    sectionHint: "upcoming"
  },
  {
    label: "Past hackathons",
    url: "https://devfolio.co/hackathons/past",
    sectionHint: "past"
  }
];

interface PageExtraction {
  title: string | null;
  documentTitle: string;
  metaDescription: string | null;
  ogImage: string | null;
  bodyText: string;
  mainHtml: string | null;
  canonicalUrl: string | null;
  jsonLd: unknown[];
  nextData: unknown | null;
}

function isDevfolioHackathonUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (!hostname.endsWith(".devfolio.co")) {
      return false;
    }

    if (["guide.devfolio.co", "status.devfolio.co", "blog.devfolio.co"].includes(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(value: string) {
  const url = new URL(value, devfolioBaseUrl);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function sectionFromText(value: string) {
  if (/past|ended|see projects/i.test(value)) {
    return "past";
  }

  if (/upcoming|remind me|opens/i.test(value)) {
    return "upcoming";
  }

  if (/open|apply now|live/i.test(value)) {
    return "open";
  }

  return "unknown";
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

function mergeListingItems(current: DevfolioListingItem, incoming: DevfolioListingItem) {
  return {
    ...current,
    title: current.title.length >= incoming.title.length ? current.title : incoming.title,
    section: current.section !== "unknown" ? current.section : incoming.section,
    listingText:
      incoming.listingText.length > current.listingText.length ? incoming.listingText : current.listingText,
    sourceRoutes: Array.from(new Set([...current.sourceRoutes, ...incoming.sourceRoutes]))
  };
}

async function collectListingItemsFromRoute(page: Page, route: DevfolioListingRoute) {
  await page.goto(route.url, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await autoScrollPage(page).catch(() => undefined);

  await page.waitForSelector("a[href]", {
    timeout: 30_000
  });

  const rawItems = (await page.evaluate(`(() => {
    const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
    const headings = Array.from(document.querySelectorAll("h1,h2,h3")).map((heading) => ({
      text: normalize(heading.textContent),
      top: heading.getBoundingClientRect().top
    }));

    return Array.from(document.querySelectorAll("a[href]")).map((anchor) => {
      const rect = anchor.getBoundingClientRect();
      const closestHeading = headings.filter((heading) => heading.top <= rect.top).at(-1)?.text;
      const card = anchor.closest("article, li, section, div");

      return {
        title: normalize(anchor.innerText || anchor.textContent),
        url: anchor.href,
        sectionText: closestHeading ?? "",
        listingText: normalize(card?.textContent ?? anchor.textContent)
      };
    });
  })()`)) as Array<{
    title: string;
    url: string;
    sectionText: string;
    listingText: string;
  }>;

  const deduped = new Map<string, DevfolioListingItem>();

  for (const rawItem of rawItems) {
    const url = normalizeUrl(rawItem.url);

    if (!isDevfolioHackathonUrl(url) || rawItem.title.length < 2 || /^image$/i.test(rawItem.title)) {
      continue;
    }

    const parsed = devfolioListingItemSchema.safeParse({
      title: cleanTitle(rawItem.title),
      url,
      section:
        sectionFromText(`${rawItem.sectionText} ${rawItem.listingText}`) === "unknown"
          ? route.sectionHint
          : sectionFromText(`${rawItem.sectionText} ${rawItem.listingText}`),
      listingText: rawItem.listingText,
      sourceRoutes: [route.url]
    });

    if (parsed.success) {
      const existing = deduped.get(url);
      deduped.set(url, existing ? mergeListingItems(existing, parsed.data) : parsed.data);
    }
  }

  return Array.from(deduped.values());
}

async function collectListingItems(page: Page) {
  const deduped = new Map<string, DevfolioListingItem>();
  const routeStats: DevfolioScrapeResult["routeStats"] = [];
  const errors: string[] = [];

  for (const route of devfolioListingRoutes) {
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

async function extractPageData(page: Page): Promise<PageExtraction> {
  return (await page.evaluate(`(() => {
    const meta = (selector) => document.querySelector(selector)?.content?.trim() || null;
    const parseJsonScript = (selector) => {
      const content = document.querySelector(selector)?.textContent;

      if (!content) {
        return null;
      }

      try {
        return JSON.parse(content);
      } catch {
        return null;
      }
    };
    const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map((script) => {
        try {
          return JSON.parse(script.textContent ?? "");
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return {
      title:
        document.querySelector("h1")?.textContent?.trim() ??
        meta('meta[property="og:title"]') ??
        document.title,
      documentTitle: document.title,
      metaDescription:
        meta('meta[name="description"]') ?? meta('meta[property="og:description"]') ?? null,
      ogImage: meta('meta[property="og:image"]'),
      bodyText: document.body.innerText,
      mainHtml: document.querySelector("main")?.innerHTML ?? null,
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href ?? null,
      jsonLd,
      nextData: parseJsonScript("script#__NEXT_DATA__")
    };
  })()`)) as PageExtraction;
}

async function scrapeDetailPage(
  page: Page,
  listing: DevfolioListingItem,
  scrapedAt: Date
): Promise<DevfolioScrapedOpportunity> {
  await page.goto(listing.url, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

  const extracted = await extractPageData(page);
  const combinedText = `${listing.listingText}\n${extracted.bodyText}`;
  const title = cleanTitle(extracted.title ?? listing.title);
  const slug = slugFromDevfolioUrl(listing.url);
  const summary = extracted.metaDescription ? normalizeWhitespace(extracted.metaDescription) : null;
  const description = extractDescriptionText(extracted.bodyText, summary);
  const dateInfo = extractDateInfo(combinedText, listing);
  const mode = inferMode(combinedText);
  const status = inferStatus({
    text: combinedText,
    section: listing.section,
    startsAt: dateInfo.startsAt,
    endsAt: dateInfo.endsAt,
    now: scrapedAt
  });
  const visibility = getClosedVisibility({
    status,
    endsAt: dateInfo.endsAt,
    scrapedAt
  });
  const location = inferLocation({
    text: extracted.bodyText,
    mode
  });
  const tags = uniqueNormalizedTags([
    ...extractThemeTags(combinedText),
    ...(mode === PrismaOpportunityMode.ONLINE ? ["online"] : []),
    ...(mode === PrismaOpportunityMode.OFFLINE ? ["offline"] : []),
    ...(mode === PrismaOpportunityMode.HYBRID ? ["hybrid"] : [])
  ]);

  return devfolioScrapedOpportunitySchema.parse({
    sourceId: slug,
    sourceUrl: listing.url,
    applyUrl: listing.url,
    title,
    slug,
    summary,
    description,
    descriptionHtml: extracted.mainHtml ? extracted.mainHtml.slice(0, 60_000) : null,
    organizerName: "Devfolio",
    organizerUrl: devfolioBaseUrl,
    bannerImageUrl: extracted.ogImage,
    logoUrl: null,
    registrationStartsAt: dateInfo.registrationStartsAt,
    registrationDeadline: dateInfo.registrationDeadline,
    startsAt: dateInfo.startsAt,
    endsAt: dateInfo.endsAt,
    closedAt: visibility.closedAt,
    visibleUntil: visibility.visibleUntil,
    mode,
    status,
    locationText: location.locationText,
    country: location.country,
    city: location.city,
    tags,
    skills: [],
    eligibility: null,
    teamSizeMin: null,
    teamSizeMax: null,
    isFree: null,
    prizeText: null,
    rawData: {
      listing,
      extracted: {
        ...extracted,
        mainHtml: extracted.mainHtml ? extracted.mainHtml.slice(0, 60_000) : null
      },
      scrapedAt: scrapedAt.toISOString()
    }
  });
}

export async function scrapeDevfolioOpportunities(
  options: DevfolioScrapeOptions
): Promise<DevfolioScrapeResult> {
  let browser: Browser | null = null;
  const errors: string[] = [];
  const opportunities: DevfolioScrapedOpportunity[] = [];

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
