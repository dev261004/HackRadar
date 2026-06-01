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
    src/
      config/
      data/
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

## Next Implementation Steps

1. Add PostgreSQL schema for opportunities and source sync runs.
2. Build source adapters for Devfolio, HackerEarth, and Unstop.
3. Add ingestion jobs and queue processing.
4. Replace mock data with database-backed API responses.
5. Add search and filtering improvements.
