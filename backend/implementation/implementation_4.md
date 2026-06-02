# Backend Implementation 4: Devfolio Public Route Expansion

This file explains the fourth backend implementation done for HackRadar.

## Goal

Expand Devfolio scraping from a single public page to every public Devfolio listing route currently known and useful for hackathon discovery.

## What Changed

The Devfolio scraper no longer discovers hackathons only from `https://devfolio.co/explore`.

It now visits multiple public listing routes, renders each route with Playwright, scrolls the page to trigger lazy-loaded content, collects hackathon links, and deduplicates them before scraping detail pages.

## Public Routes Used

- `https://devfolio.co/explore`
- `https://devfolio.co/hackathons`
- `https://devfolio.co/hackathons/open`
- `https://devfolio.co/hackathons/upcoming`
- `https://devfolio.co/hackathons/past`

These routes represent the public discovery surfaces we can currently identify for Devfolio hackathons.

## Main Files Updated

- `backend/src/sources/devfolio/devfolio.types.ts`
- `backend/src/sources/devfolio/devfolio.scraper.ts`
- `backend/src/sources/devfolio/devfolio.sync.ts`
- `README.md`

## Discovery Behavior

Each route is opened with Playwright.

The scraper waits for the document to load, gives network activity a short chance to settle, scrolls the page, and then collects all anchor links.

Only Devfolio hackathon subdomain links are treated as opportunity detail pages.

Links are deduplicated by normalized URL.

If the same hackathon is found on multiple listing routes, the scraper keeps one record and stores all source routes that found it.

## Route Statistics

The sync result now includes route-level discovery stats.

Each route reports the number of hackathon links found and whether that route failed.

These stats are also saved in the sync run metadata so we can inspect coverage later.

## Why This Matters

Devfolio does not guarantee that one page exposes every public hackathon.

Using all known public listing routes gives HackRadar better coverage for open, upcoming, and past events while still keeping scraping polite and limited.

## Current Limitation

This still covers publicly discoverable Devfolio hackathons only.

Private, unlisted, invite-only, login-only, draft, or internally archived events are not expected to appear through these public routes.

## Verification Done

The backend TypeScript check passed.

The backend production build passed.

A live test sync was run with `npm run sync:devfolio -w backend -- --limit=2`.

That test successfully checked all five public listing routes, discovered 25 unique Devfolio hackathon links after deduplication, fetched two detail pages, updated two database records, and completed with zero failures.
