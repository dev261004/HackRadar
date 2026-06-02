import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser, type Page } from "playwright";
import {
  cleanTitle,
  extractDateInfo,
  extractDescriptionText,
  extractLocation,
  extractPrizeText,
  extractTags,
  extractTeamSize,
  getClosedVisibility,
  inferMode,
  inferStatus,
  inferType,
  normalizeWhitespace,
  slugFromHackerEarthUrl,
  sourceIdFromHackerEarthUrl
} from "./hackerearth.parser.js";
import {
  hackerEarthListingItemSchema,
  hackerEarthScrapedOpportunitySchema,
  type HackerEarthListingItem,
  type HackerEarthListingRoute,
  type HackerEarthListingSection,
  type HackerEarthScrapeOptions,
  type HackerEarthScrapeResult,
  type HackerEarthScrapedOpportunity
} from "./hackerearth.types.js";

const hackerEarthBaseUrl = "https://www.hackerearth.com";

const hackerEarthListingRoutes: HackerEarthListingRoute[] = [
  {
    label: "All challenges",
    url: "https://www.hackerearth.com/challenges/",
    typeHint: "OTHER"
  },
  {
    label: "Hackathons",
    url: "https://www.hackerearth.com/challenges/hackathon/",
    typeHint: "HACKATHON"
  },
  {
    label: "Competitive challenges",
    url: "https://www.hackerearth.com/challenges/competitive/",
    typeHint: "CODING_CONTEST"
  },
  {
    label: "Hiring challenges",
    url: "https://www.hackerearth.com/challenges/hiring/",
    typeHint: "HIRING_CHALLENGE"
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
  imageAlts: string[];
  links: Array<{
    text: string;
    href: string;
    contextText: string;
    sectionText: string;
  }>;
}

function normalizeUrl(value: string) {
  const url = new URL(value, hackerEarthBaseUrl);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function isHackerEarthChallengeUrl(value: string) {
  try {
    const url = new URL(value, hackerEarthBaseUrl);

    if (!["www.hackerearth.com", "assessment.hackerearth.com"].includes(url.hostname)) {
      return false;
    }

    const parts = url.pathname.split("/").filter(Boolean);

    if (parts[0] !== "challenges") {
      return false;
    }

    return ["hackathon", "competitive", "hiring"].includes(parts[1] ?? "") && Boolean(parts[2]);
  } catch {
    return false;
  }
}

function inferSection(value: string): HackerEarthListingSection {
  if (/previous challenges|winners are announced|previous|ended/i.test(value)) {
    return "previous";
  }

  if (/upcoming challenges|starts on|upcoming/i.test(value)) {
    return "upcoming";
  }

  if (/live challenges|start now|ends in|live/i.test(value)) {
    return "live";
  }

  return "unknown";
}

function mergeListingItems(current: HackerEarthListingItem, incoming: HackerEarthListingItem) {
  return {
    ...current,
    title: current.title.length >= incoming.title.length ? current.title : incoming.title,
    listingText:
      incoming.listingText.length > current.listingText.length ? incoming.listingText : current.listingText,
    section: current.section !== "unknown" ? current.section : incoming.section,
    typeHint: current.typeHint !== "OTHER" ? current.typeHint : incoming.typeHint,
    sourceRoutes: Array.from(new Set([...current.sourceRoutes, ...incoming.sourceRoutes]))
  };
}

async function autoScrollPage(page: Page) {
  await page.evaluate(`async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let previousHeight = 0;

    for (let index = 0; index < 6; index += 1) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(500);

      const currentHeight = document.body.scrollHeight;

      if (currentHeight === previousHeight) {
        break;
      }

      previousHeight = currentHeight;
    }

    window.scrollTo(0, 0);
  }`);
}

async function extractPageData(page: Page): Promise<PageExtraction> {
  return (await page.evaluate(`(() => {
    const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
    const meta = (selector) => document.querySelector(selector)?.content?.trim() || null;
    const headings = Array.from(document.querySelectorAll("h1,h2,h3")).map((heading) => ({
      text: normalize(heading.textContent),
      top: heading.getBoundingClientRect().top
    }));
    const links = Array.from(document.querySelectorAll("a[href]")).map((anchor) => {
      const rect = anchor.getBoundingClientRect();
      const closestHeading = headings.filter((heading) => heading.top <= rect.top).at(-1)?.text ?? "";
      const card = anchor.closest("article, li, section, div");

      return {
        text: normalize(anchor.innerText || anchor.textContent),
        href: anchor.href,
        contextText: normalize(card?.textContent ?? anchor.textContent),
        sectionText: closestHeading
      };
    });
    const imageAlts = Array.from(document.querySelectorAll("img[alt]"))
      .map((image) => normalize(image.getAttribute("alt")))
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
      imageAlts,
      links
    };
  })()`)) as PageExtraction;
}

async function collectListingItemsFromRoute(page: Page, route: HackerEarthListingRoute) {
  await page.goto(route.url, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await autoScrollPage(page).catch(() => undefined);
  await page.waitForSelector("a[href]", {
    state: "attached",
    timeout: 30_000
  });

  const extracted = await extractPageData(page);
  const items = new Map<string, HackerEarthListingItem>();

  for (const link of extracted.links) {
    const href = normalizeUrl(link.href);

    if (!isHackerEarthChallengeUrl(href) || !link.text) {
      continue;
    }

    const parsed = hackerEarthListingItemSchema.safeParse({
      title: cleanTitle(link.text),
      url: href,
      listingText: link.contextText,
      section: inferSection(`${link.sectionText} ${link.contextText}`),
      typeHint: route.typeHint,
      sourceRoutes: [route.url]
    });

    if (parsed.success) {
      const existing = items.get(href);
      items.set(href, existing ? mergeListingItems(existing, parsed.data) : parsed.data);
    }
  }

  return Array.from(items.values());
}

async function collectListingItems(page: Page) {
  const deduped = new Map<string, HackerEarthListingItem>();
  const routeStats: HackerEarthScrapeResult["routeStats"] = [];
  const errors: string[] = [];

  for (const route of hackerEarthListingRoutes) {
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

function getOrganizerName(extracted: PageExtraction) {
  const imageAlt = extracted.imageAlts.find((alt) => !/^image/i.test(alt));

  if (!imageAlt) {
    return "HackerEarth";
  }

  return imageAlt.replace(/^Image:\s*/i, "").trim() || "HackerEarth";
}

async function scrapeDetailPage(
  page: Page,
  listing: HackerEarthListingItem,
  scrapedAt: Date
): Promise<HackerEarthScrapedOpportunity> {
  await page.goto(listing.url, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

  const extracted = await extractPageData(page);
  const sourceUrl = normalizeUrl(extracted.canonicalUrl ?? listing.url);
  const title = cleanTitle(extracted.title ?? listing.title);
  const combinedText = `${listing.listingText}\n${extracted.bodyText}`;
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
  const teamSize = extractTeamSize(combinedText);
  const location = extractLocation(mode);

  return hackerEarthScrapedOpportunitySchema.parse({
    sourceId: sourceIdFromHackerEarthUrl(sourceUrl),
    sourceUrl,
    applyUrl: sourceUrl,
    title,
    slug: slugFromHackerEarthUrl(sourceUrl),
    summary: extracted.metaDescription ? normalizeWhitespace(extracted.metaDescription) : null,
    description: extractDescriptionText(extracted.bodyText),
    descriptionHtml: extracted.mainHtml ? extracted.mainHtml.slice(0, 60_000) : null,
    type: inferType(combinedText, listing),
    organizerName: getOrganizerName(extracted),
    organizerUrl: null,
    bannerImageUrl: extracted.ogImage,
    logoUrl: null,
    registrationStartsAt: null,
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
    tags: extractTags(combinedText, listing),
    skills: [],
    eligibility: null,
    teamSizeMin: teamSize.teamSizeMin,
    teamSizeMax: teamSize.teamSizeMax,
    isFree: null,
    prizeText: extractPrizeText(extracted.bodyText),
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

export async function scrapeHackerEarthOpportunities(
  options: HackerEarthScrapeOptions
): Promise<HackerEarthScrapeResult> {
  let browser: Browser | null = null;
  const errors: string[] = [];
  const opportunities: HackerEarthScrapedOpportunity[] = [];

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
