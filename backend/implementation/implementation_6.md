# Backend Implementation 6: HackerEarth Scraper

This file explains the sixth backend implementation done for HackRadar.

## Goal

Add HackerEarth source ingestion so HackRadar can collect public hackathons, competitive coding challenges, AI competitions, and hiring challenges from HackerEarth.

## Technology Used

The scraper uses Playwright with TypeScript.

HackerEarth public challenge listing pages and detail pages expose useful challenge data without login, so this implementation stays public-only.

## What Was Implemented

A new HackerEarth source folder was added under `backend/src/sources/hackerearth`.

The implementation discovers challenge links from public HackerEarth listing routes, deduplicates them, opens detail pages, extracts fields, validates the result with Zod, upserts normalized opportunity records, stores raw snapshots, and records sync run history.

## Main Files Added

- `backend/src/sources/hackerearth/hackerearth.types.ts`
- `backend/src/sources/hackerearth/hackerearth.parser.ts`
- `backend/src/sources/hackerearth/hackerearth.scraper.ts`
- `backend/src/sources/hackerearth/hackerearth.sync.ts`
- `backend/src/scripts/sync-hackerearth.ts`

## Main Files Updated

- `backend/package.json`
- `backend/src/config/env.ts`
- `backend/.env.example`
- `.env.example`
- `README.md`
- `COMMANDS.md`

## New Commands

`npm run sync:hackerearth -w backend` runs the HackerEarth scraper and writes results to the database.

`npm run sync:hackerearth -w backend -- --limit=1` runs a small one-record test sync.

## Public Routes Used

- `https://www.hackerearth.com/challenges/`
- `https://www.hackerearth.com/challenges/hackathon/`
- `https://www.hackerearth.com/challenges/competitive/`
- `https://www.hackerearth.com/challenges/hiring/`

## Scraping Flow

The scraper opens each public listing route with Playwright.

It scrolls pages to pick up rendered content.

It keeps only public HackerEarth challenge links from supported challenge categories.

It visits each detail page and extracts title, organizer, description, dates, status, mode, team size, prize text, tags, and raw page data.

The sync layer upserts normalized records into `Opportunity`.

It also stores the original collected payload in `OpportunityRawSnapshot`.

Every run is tracked in `SourceSyncRun`.

## Normalization

Hackathon URLs are stored as opportunity type `HACKATHON` unless the text clearly indicates a hiring challenge.

Competitive challenge URLs are stored as `CODING_CONTEST`, `AI_COMPETITION`, or `HIRING_CHALLENGE` based on page text.

The source key is stored as `HACKEREARTH`.

The source id is based on the final slug in the HackerEarth challenge URL.

The status is inferred from listing section, start/end dates, and page text such as winners announced, live, start now, or ends in.

Closed events are stored permanently, but public visibility is controlled through `visibleUntil`.

## Current Limitations

This covers publicly discoverable HackerEarth challenges only.

Private, removed, invite-only, login-only, or internally archived challenges are not expected to appear.

HackerEarth has old and new page layouts, so field extraction may need tuning after inspecting real synced records.

## Verification Done

The backend TypeScript check passed.

The backend production build passed.

A live test sync was run with `npm run sync:hackerearth -w backend -- --limit=1`.

That test checked all configured HackerEarth listing routes, discovered 25 unique public challenge links after deduplication, fetched one detail page, created one database record, stored a raw snapshot, and completed with zero failures.
