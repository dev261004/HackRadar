# Frontend Implementation 1: Initial Frontend Setup

This file explains the first frontend implementation done for HackRadar.

## Goal

Create the first TypeScript frontend foundation for HackRadar so users can browse opportunities from a clean discovery page.

## What Was Implemented

The frontend was created as a Next.js and TypeScript app inside the `frontend` folder.

It includes a homepage, global styles, a reusable opportunity explorer component, opportunity types, API fetching, and fallback mock data.

## Main Files Added

- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/next.config.ts`
- `frontend/next-env.d.ts`
- `frontend/.env.example`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/components/opportunity-explorer.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/opportunity.ts`
- `frontend/src/lib/fallback-opportunities.ts`

## User Experience Added

The homepage shows HackRadar as an opportunity discovery app.

It displays supported MVP sources: Devfolio, HackerEarth, and Unstop.

It shows opportunity cards with title, source, status, type, organizer, deadline, start date, tags, and an external link.

## Filters Added

The first frontend setup added search, source filters, and type filters.

Users can search by title, organizer, location, source, type, and tags.

Users can filter opportunities by source and opportunity type.

## Data Fetching

The frontend tries to fetch opportunity data from the backend API.

If the backend is unavailable, the frontend uses fallback mock opportunities so the interface can still be viewed during development.

## Styling Direction

The UI was designed as an actual discovery dashboard, not a marketing landing page.

The layout focuses on scanning and filtering opportunities quickly.

## Current Limitation After This Step

At this stage, the frontend used only the initial opportunity fields and did not yet include city or country filters.
