# HackRadar

HackRadar is a centralized platform that aggregates hackathons, coding contests, AI competitions, hiring challenges, and tech opportunities from multiple platforms into one place.

The goal is to help developers, students, competitive programmers, AI engineers, job seekers, and hackathon enthusiasts discover opportunities without jumping across many websites.

## MVP Decisions

- Initial sources: Devfolio, HackerEarth, and Unstop.
- Scope: global opportunities.
- Auth: not included in v1.
- Tracking and saved opportunities: planned for v2 after auth is added.
- Data ingestion: use public APIs where available; otherwise use scraping.
- AI service: planned later.
- Notifications: planned later through email, with WhatsApp considered only if a reliable free API is available.
- Language: TypeScript for frontend and backend.

## Current Architecture

```text
frontend/  Next.js + TypeScript
backend/   Node.js + Express + TypeScript
database   PostgreSQL + Prisma
```

Planned later:

```text
PostgreSQL -> Redis/BullMQ -> Scraper Workers -> FastAPI AI Service -> Meilisearch
```

## Tech Stack

| Layer      | Tech              |
| ---------- | ----------------- |
| Frontend   | Next.js           |
| Backend    | Node.js + Express |
| Language   | TypeScript        |
| Database   | PostgreSQL        |
| ORM        | Prisma            |
| Search     | Meilisearch       |
| Queue      | BullMQ            |
| Cache      | Redis             |
| Scraping   | Playwright        |
| AI Service | FastAPI           |
| Deployment | Vercel + Railway  |

## Project Structure

```text
HackRadar/
  backend/
    prisma/
    src/
      config/
      data/
      lib/
      mappers/
      repositories/
      routes/
      sources/
      types/
  frontend/
    src/
      app/
      components/
      lib/
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run backend and frontend together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/health`
- Opportunities API: `http://localhost:4000/api/opportunities`
- Sources API: `http://localhost:4000/api/sources`

For the full command reference, see [COMMANDS.md](COMMANDS.md).

## Backend APIs

- `GET /api/opportunities` lists public opportunities with optional filters.
- `GET /api/opportunities/:id` returns one public opportunity.
- `GET /api/sources` lists Devfolio, HackerEarth, and Unstop source status.
- `GET /api/sources/sync-runs` lists recent scraper/API sync runs. Optional filters: `source`, `status`, `limit`.
- `GET /api/sources/sync-runs/:id` returns one sync run with metadata and raw snapshot count.

## Environment

Copy the example environment files before running locally:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Update `backend/.env` with your local PostgreSQL connection string:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hackradar?schema=public
```

Replace the username, password, port, and database name to match your machine.

## Database

The backend uses Prisma for schema management. The first schema includes:

- `Opportunity` for normalized hackathon, contest, AI competition, and hiring challenge data.
- `OpportunitySource` for Devfolio, HackerEarth, and Unstop metadata.
- `SourceSyncRun` for tracking each API/scraper run.
- `OpportunityRawSnapshot` for storing raw source payloads.

Public listings include active/upcoming/ongoing opportunities and closed opportunities only while their `visibleUntil` timestamp is still valid. This supports the product rule that closed events are shown for only one day without deleting historical records.

Generate Prisma Client:

```bash
npm run db:generate -w backend
```

Create and apply a migration:

```bash
npm run db:migrate -w backend
```

Open Prisma Studio:

```bash
npm run db:studio -w backend
```

## Devfolio Scraper

Install the Chromium browser used by Playwright:

```bash
npm run scraper:install -w backend
```

Run a Devfolio sync:

```bash
npm run sync:devfolio -w backend
```

Run a small test sync:

```bash
npm run sync:devfolio -w backend -- --limit=1
```

The scraper uses Playwright, reads public Devfolio listing pages, normalizes records into the `Opportunity` table, stores raw page data in `OpportunityRawSnapshot`, and records each run in `SourceSyncRun`.

Current public listing routes used for discovery:

- `https://devfolio.co/explore`
- `https://devfolio.co/hackathons`
- `https://devfolio.co/hackathons/open`
- `https://devfolio.co/hackathons/upcoming`
- `https://devfolio.co/hackathons/past`

Useful scraper environment variables:

- `DEVFOLIO_HEADLESS=true`
- `DEVFOLIO_SCRAPE_LIMIT=25`
- `DEVFOLIO_REQUEST_DELAY_MS=750`
- `SCRAPER_USER_AGENT=HackRadarBot/0.1 (+https://github.com/hackradar; respectful opportunity indexing)`

## Unstop Scraper

Run an Unstop sync:

```bash
npm run sync:unstop -w backend
```

Run a small test sync:

```bash
npm run sync:unstop -w backend -- --limit=1
```

The scraper uses Playwright, discovers public Unstop opportunity links from competition and hackathon listing surfaces, reads AMP detail pages where available, normalizes records into the `Opportunity` table, stores raw page data in `OpportunityRawSnapshot`, and records each run in `SourceSyncRun`.

Current public listing routes used for discovery:

- `https://unstop.com/compete/amp`
- `https://unstop.com/hackathons/amp`
- `https://unstop.com/competitions/amp`
- `https://unstop.com/competitions-challenges`
- `https://unstop.com/hackathons`
- `https://unstop.com/competitions`

Useful Unstop scraper environment variables:

- `UNSTOP_HEADLESS=true`
- `UNSTOP_SCRAPE_LIMIT=25`
- `UNSTOP_REQUEST_DELAY_MS=750`

## HackerEarth Scraper

Run a HackerEarth sync:

```bash
npm run sync:hackerearth -w backend
```

Run a small test sync:

```bash
npm run sync:hackerearth -w backend -- --limit=1
```

The scraper uses Playwright, discovers public HackerEarth challenge links, normalizes records into the `Opportunity` table, stores raw page data in `OpportunityRawSnapshot`, and records each run in `SourceSyncRun`.

Current public listing routes used for discovery:

- `https://www.hackerearth.com/challenges/`
- `https://www.hackerearth.com/challenges/hackathon/`
- `https://www.hackerearth.com/challenges/competitive/`
- `https://www.hackerearth.com/challenges/hiring/`

Useful HackerEarth scraper environment variables:

- `HACKEREARTH_HEADLESS=true`
- `HACKEREARTH_SCRAPE_LIMIT=25`
- `HACKEREARTH_REQUEST_DELAY_MS=750`

## All Scrapers

Run all current source scrapers sequentially:

```bash
npm run sync:all -w backend
```

Run a small test sync for every source:

```bash
npm run sync:all -w backend -- --limit=1
```

The command runs Devfolio, Unstop, and HackerEarth. It keeps going if one source fails, prints a combined summary, and exits with a non-zero code if any source fails or completes with partial issues.

## Next Implementation Steps

1. Run and inspect the Devfolio, Unstop, and HackerEarth sync output.
2. Improve source field extraction based on real scraped records.
3. Add scheduled ingestion jobs with BullMQ and Redis.
4. Add search and filtering improvements.
5. Add source-quality dashboards for sync runs and extraction gaps.
