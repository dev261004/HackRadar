# Backend Implementation 5: Unstop Scraper

This file explains the fifth backend implementation done for HackRadar.

## Goal

Add Unstop source ingestion so HackRadar can collect public hackathons, competitions, AI competitions, coding contests, and hiring challenge style opportunities from Unstop.

## Technology Used

The scraper uses Playwright with TypeScript.

Unstop has normal JavaScript pages and lighter AMP pages. The implementation uses public listing routes for discovery and AMP detail pages for stable text extraction.

## What Was Implemented

A new Unstop source folder was added under `backend/src/sources/unstop`.

The implementation discovers opportunity links from public Unstop listing pages, deduplicates links, opens AMP detail pages, extracts fields, validates the result with Zod, upserts normalized opportunity records, stores raw snapshots, and records sync run history.

## Main Files Added

- `backend/src/sources/unstop/unstop.types.ts`
- `backend/src/sources/unstop/unstop.parser.ts`
- `backend/src/sources/unstop/unstop.scraper.ts`
- `backend/src/sources/unstop/unstop.sync.ts`
- `backend/src/scripts/sync-unstop.ts`

## Main Files Updated

- `backend/package.json`
- `backend/src/config/env.ts`
- `backend/.env.example`
- `.env.example`
- `README.md`
- `COMMANDS.md`

## New Commands

`npm run sync:unstop -w backend` runs the Unstop scraper and writes results to the database.

`npm run sync:unstop -w backend -- --limit=1` runs a small one-record test sync.

## Public Routes Used

- `https://unstop.com/compete/amp`
- `https://unstop.com/hackathons/amp`
- `https://unstop.com/competitions/amp`
- `https://unstop.com/competitions-challenges`
- `https://unstop.com/hackathons`
- `https://unstop.com/competitions`

## Scraping Flow

The scraper opens each public listing route with Playwright.

It scrolls pages to pick up lazy-loaded links.

It keeps only Unstop opportunity detail links from supported categories such as hackathons and competitions.

It converts detail links to AMP URLs for detail extraction.

It visits each AMP detail page and extracts title, organizer, description, dates, status, mode, location, eligibility, team size, prize text, fee information, tags, and raw page data.

The sync layer upserts normalized records into `Opportunity`.

It also stores the original collected payload in `OpportunityRawSnapshot`.

Every run is tracked in `SourceSyncRun`.

## Normalization

Hackathon URLs are stored as opportunity type `HACKATHON`.

Competition URLs are inferred into `AI_COMPETITION`, `CODING_CONTEST`, `HIRING_CHALLENGE`, or `OTHER` based on title and page text.

The source key is stored as `UNSTOP`.

The source id is based on the numeric id at the end of the Unstop opportunity slug.

The status is inferred from deadline, event dates, and text such as ended or registration closed.

Closed events are stored permanently, but public visibility is controlled through `visibleUntil`.

## Current Limitations

This covers publicly discoverable Unstop opportunities only.

Private, removed, login-only, or internally archived opportunities are not expected to appear.

Unstop category labels can be broad, so type inference may need tuning after inspecting real synced records.

Country and city are inferred only when the page exposes clear location text.

## Verification Done

The backend TypeScript check passed.

The backend production build passed.

A live test sync was run with `npm run sync:unstop -w backend -- --limit=1`.

That test checked all configured Unstop listing routes, discovered 24 unique opportunity links after deduplication, fetched one AMP detail page, created one database record, stored a raw snapshot, and completed with zero failures.
