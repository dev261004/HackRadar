# Backend Implementation 2: PostgreSQL and Prisma Setup

This file explains the second backend implementation done for HackRadar.

## Goal

Add a real database foundation using PostgreSQL and Prisma so HackRadar can store complete opportunity data from Devfolio, HackerEarth, and Unstop.

## What Was Implemented

Prisma was added to the backend as the ORM and schema management tool.

The backend now has a production-minded database schema for opportunity data, source metadata, scraper or API run history, and raw source snapshots.

The opportunity API was updated to read from the database when `DATABASE_URL` is configured.

If the database is not configured or a database query fails during early development, the API falls back to mock data so the frontend can still run.

## Main Files Added

- `backend/prisma/schema.prisma`
- `backend/prisma.config.ts`
- `backend/src/lib/prisma.ts`
- `backend/src/mappers/opportunity.mapper.ts`
- `backend/src/repositories/opportunities.repository.ts`

## Main Files Updated

- `backend/package.json`
- `backend/.env.example`
- `backend/src/config/env.ts`
- `backend/src/types/opportunity.ts`
- `backend/src/data/mockOpportunities.ts`
- `backend/src/routes/opportunities.routes.ts`

## Database Models Added

The Prisma schema added four main database models.

`OpportunitySource` stores source information for Devfolio, HackerEarth, and Unstop.

`Opportunity` stores normalized opportunity records. This includes title, source, type, status, full description, organizer, dates, location, city, country, team size, prize text, fees, tags, skills, and tracking timestamps.

`SourceSyncRun` stores each API or scraping run. This will help debug future ingestion jobs by recording counts, errors, status, and timing.

`OpportunityRawSnapshot` stores the original raw data collected from a platform. This is useful because each platform has different data fields, and we may need to reprocess source data later.

## Important Product Rules Added

HackRadar should show closed events, but only for one day.

The database should not delete closed events. Instead, the public listing API filters them using `visibleUntil`.

This means old records remain useful for deduplication, analytics, and future improvements, while users only see recently closed events for a short time.

## API Changes

The opportunity list API now supports filters for source, type, status, mode, country, city, and search query.

The route talks to a repository instead of directly reading mock data. This keeps database logic separate from Express route logic.

## Prisma 7 Setup Detail

This project uses Prisma 7.

In Prisma 7, the database URL is managed through `prisma.config.ts` for migrations, and the runtime Prisma Client uses the PostgreSQL adapter.

That is why the backend includes both `prisma.config.ts` and a Prisma client helper in `backend/src/lib/prisma.ts`.

## Commands Added

The backend package now has commands for validating the Prisma schema, generating Prisma Client, running migrations, and opening Prisma Studio.

These commands are documented in the README.

## Current Limitation After This Step

The database schema exists, but real Devfolio, HackerEarth, and Unstop ingestion is not implemented yet.

The next backend implementation should seed source metadata and then add source adapters.
