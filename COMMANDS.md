# HackRadar Commands

This file is the command reference for HackRadar.

Whenever a new script is added to any `package.json`, update this file in the same implementation.

## Root Commands

Run these from the project root.

| Command | Purpose |
| ------- | ------- |
| `npm install` | Install all workspace dependencies. |
| `npm run dev` | Run backend and frontend together. |
| `npm run dev:backend` | Run only the backend development server. |
| `npm run dev:frontend` | Run only the frontend development server. |
| `npm run build` | Build all workspaces. |
| `npm run typecheck` | Run TypeScript checks for all workspaces. |

## Backend Commands

Run these from the project root.

| Command | Purpose |
| ------- | ------- |
| `npm run dev -w backend` | Run the backend API in watch mode. |
| `npm run build -w backend` | Build the backend TypeScript output. |
| `npm run start -w backend` | Run the compiled backend from `dist`. |
| `npm run typecheck -w backend` | Check backend TypeScript without emitting files. |

## Backend Database Commands

Run these from the project root.

| Command | Purpose |
| ------- | ------- |
| `npm run db:validate -w backend` | Validate the Prisma schema. |
| `npm run db:generate -w backend` | Generate Prisma Client from the schema. |
| `npm run db:migrate -w backend` | Create/apply a Prisma migration against PostgreSQL. |
| `npm run db:studio -w backend` | Open Prisma Studio for local database inspection. |

## Backend Scraper Commands

Run these from the project root.

| Command | Purpose |
| ------- | ------- |
| `npm run scraper:install -w backend` | Install Playwright Chromium for scraping. |
| `npm run sync:devfolio -w backend` | Scrape public Devfolio routes and sync records to PostgreSQL. |
| `npm run sync:devfolio -w backend -- --limit=1` | Run a small Devfolio test sync. |
| `npm run sync:unstop -w backend` | Scrape public Unstop routes and sync records to PostgreSQL. |
| `npm run sync:unstop -w backend -- --limit=1` | Run a small Unstop test sync. |

## Frontend Commands

Run these from the project root.

| Command | Purpose |
| ------- | ------- |
| `npm run dev -w frontend` | Run the Next.js frontend development server. |
| `npm run build -w frontend` | Build the frontend production app. |
| `npm run start -w frontend` | Run the compiled frontend production server. |
| `npm run typecheck -w frontend` | Check frontend TypeScript without emitting files. |

## Common Setup Flow

Use this flow on a fresh local setup.

```bash
npm install
npm run db:migrate -w backend
npm run scraper:install -w backend
npm run dev
```

## Common Verification Flow

Use this flow after backend or frontend code changes.

```bash
npm run typecheck
npm run build
```

For backend-only changes:

```bash
npm run typecheck -w backend
npm run build -w backend
```

For frontend-only changes:

```bash
npm run typecheck -w frontend
npm run build -w frontend
```
