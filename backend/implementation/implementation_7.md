# Backend Implementation 7: All-Source Sync Command

This file explains the seventh backend implementation done for HackRadar.

## Goal

Add one command that runs every current scraper source in sequence.

## What Was Implemented

A new `sync:all` command was wired to `backend/src/scripts/sync-all.ts`.

The command runs Devfolio, Unstop, and HackerEarth syncs sequentially.

It accepts the same shared `--limit` argument used by individual sync commands.

## Main Files Added

- `backend/src/scripts/sync-all.ts`
- `backend/implementation/implementation_7.md`

## Main Files Updated

- `COMMANDS.md`
- `README.md`

## Command Added

```bash
npm run sync:all -w backend
```

Small test run:

```bash
npm run sync:all -w backend -- --limit=1
```

## Behavior

The command starts each source sync one by one.

If one source fails, the script keeps going and still attempts the remaining sources.

At the end, it prints a combined JSON summary with one result entry per source.

If any source fails or returns a non-success status, the command exits with a non-zero code.

## Why This Was Added

Running one source at a time is useful during scraper development.

For regular ingestion, we need one command that refreshes all configured sources together.

This command gives us that before adding scheduled queue workers with BullMQ and Redis.

## Verification Done

The backend TypeScript check passed.

The backend production build passed.

A live test sync was run with `npm run sync:all -w backend -- --limit=1`.

That test ran Devfolio, Unstop, and HackerEarth sequentially. All three completed successfully, and the combined command returned `SUCCESS`.
