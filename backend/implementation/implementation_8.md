# Implementation 8: Source Sync API

## What changed

- Added `GET /api/sources` for reading configured opportunity sources.
- Added `GET /api/sources/sync-runs` for reading recent scraper/API sync run history.
- Added `GET /api/sources/sync-runs/:id` for reading one sync run in detail.
- Mounted the new router under `/api/sources`.
- Extended the source registry with source base URLs so the API can return useful source metadata even before database syncs have run.

## Backend files changed

- `src/sources/registry.ts`
  - Added `baseUrl` to every source registry entry.

- `src/repositories/sources.repository.ts`
  - Added database read logic for sources and sync runs.
  - Maps Prisma enum values like `DEVFOLIO` and `SUCCESS` into API-friendly lowercase strings like `devfolio` and `success`.
  - Adds source stats:
    - total opportunity count
    - sync run count
    - latest sync run
  - Uses the static source registry as a fallback when `DATABASE_URL` is not configured or the database query fails.

- `src/routes/sources.routes.ts`
  - Added Express handlers for source and sync run API endpoints.
  - Supports query filters for sync run listing:
    - `source=devfolio|hackerearth|unstop`
    - `status=running|success|failed|partial`
    - `limit=number`

- `src/app.ts`
  - Mounted `sourcesRouter` at `/api/sources`.

- `README.md`
  - Added the new Source API endpoints to the backend API reference.

## API response behavior

`GET /api/sources`

- Returns all known sources from the registry.
- If the database is available, each source includes database stats.
- If the database is unavailable, each source still appears, but database-backed stats are empty.

`GET /api/sources/sync-runs`

- Returns recent sync runs from `SourceSyncRun`.
- Defaults to 25 results.
- Caps the result limit at 100.
- Returns an empty list with a metadata reason if the database is not configured.

`GET /api/sources/sync-runs/:id`

- Returns one sync run with:
  - source info
  - run status
  - run counts
  - duration
  - metadata
  - raw snapshot count
- Returns `404` when the sync run ID does not exist.
- Returns `503` when sync history is requested without database configuration.
