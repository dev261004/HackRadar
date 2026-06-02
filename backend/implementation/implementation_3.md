# Backend Implementation 3: Devfolio Scraper

This file explains the third backend implementation done for HackRadar.

## Goal

Add the first real source ingestion path for HackRadar by scraping public Devfolio hackathon pages and saving normalized data into PostgreSQL.

## Technology Used

The scraper uses Playwright with TypeScript.

Playwright was chosen because Devfolio is a modern JavaScript-heavy website. It can render pages like a real browser, wait for dynamic content, and inspect page links and text reliably.

## What Was Implemented

A Devfolio source folder was added under `backend/src/sources/devfolio`.

The implementation discovers hackathon links from Devfolio Explore, visits individual hackathon pages, extracts useful fields, validates the scraped result, saves normalized opportunity records, stores raw source snapshots, and records sync run history.

## Main Files Added

- `backend/src/sources/devfolio/devfolio.types.ts`
- `backend/src/sources/devfolio/devfolio.parser.ts`
- `backend/src/sources/devfolio/devfolio.scraper.ts`
- `backend/src/sources/devfolio/devfolio.sync.ts`
- `backend/src/scripts/sync-devfolio.ts`

## Main Files Updated

- `backend/package.json`
- `backend/src/config/env.ts`
- `backend/.env.example`
- `.env.example`
- `README.md`

## New Commands

`npm run scraper:install -w backend` installs the Chromium browser used by Playwright.

`npm run sync:devfolio -w backend` runs the Devfolio scraper and writes results to the database.

`npm run sync:devfolio -w backend -- --limit=1` runs a small one-record test sync.

## Scraping Flow

The scraper opens `https://devfolio.co/explore`.

It collects public hackathon links that point to Devfolio hackathon subdomains.

It visits each hackathon page one by one with a small delay between requests.

It extracts page title, meta description, image, body text, main HTML, dates, mode, status, tags, location, and raw page data.

The sync layer upserts the normalized record into the `Opportunity` table.

It also stores the original collected payload in `OpportunityRawSnapshot`.

Every run is tracked in `SourceSyncRun`.

## Normalization

The scraper converts Devfolio-specific page content into HackRadar fields.

Devfolio records are stored as opportunity type `HACKATHON`.

The source key is stored as `DEVFOLIO`.

The source id is based on the Devfolio hackathon subdomain slug.

The status is inferred from page text, listing section, and dates.

The mode is inferred from text such as online, offline, or both.

Closed events are stored permanently, but public visibility is controlled through `visibleUntil`.

## Validation

Scraped records are validated with Zod before database writes.

This helps catch broken extraction results early instead of saving malformed records.

## Database Writes

The sync process first ensures the Devfolio source exists in `OpportunitySource`.

Each opportunity is upserted by `sourceUrl`.

If a record already exists, it is updated and `lastSeenAt` changes.

If it is new, it is created and `firstSeenAt` is set.

Each scrape creates a raw snapshot so the original page data can be inspected later.

## Current Limitations

Devfolio page layouts may change, so extraction may need tuning after inspecting real scraped records.

Full HTML is stored but should not be rendered in the frontend until sanitization is added.

Country and city are inferred only when the page provides a clear text location.

This is a manual sync command for now. Scheduled jobs with BullMQ and Redis will be added later.

## Verification Done

The backend TypeScript check passed.

The backend production build passed.

A live test sync was run with `npm run sync:devfolio -w backend -- --limit=1`.

That test discovered Devfolio links, fetched one opportunity, created one database record, stored a raw snapshot, and completed the sync run successfully.
