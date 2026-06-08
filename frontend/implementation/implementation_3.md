# Frontend Implementation 3: Real Data States

## Goal

Improve the opportunity discovery UI so it communicates what data is being shown and handles real API states clearly.

## What Was Implemented

- Added a loading state while the frontend requests opportunities from the backend.
- Added empty states for:
  - no loaded opportunities
  - no opportunities matching the current filters
- Added a data indicator showing whether records came from:
  - database data
  - backend mock data
  - local frontend fallback data
- Added source filter counts.
- Added deadline sorting.
- Added quick views for:
  - all opportunities
  - recently added opportunities
  - closing soon opportunities

## Main Files Updated

- `frontend/src/lib/api.ts`
- `frontend/src/app/page.tsx`
- `frontend/src/components/opportunity-explorer.tsx`
- `frontend/src/app/globals.css`
- `frontend/.env.example`

## API Handling

`getOpportunitiesFeed()` now returns both opportunity data and metadata.

The frontend reads the backend `meta.dataSource` value from `GET /api/opportunities`.

If the backend is unavailable, the frontend still shows local fallback records and labels them as local fallback data.

## Filter Count Behavior

Source counts are calculated after applying search, type, location, and quick-view filters.

This means the Devfolio, HackerEarth, and Unstop counts show how many records would be visible if that source filter was selected.

## Sorting Behavior

Deadline sorting supports:

- deadline first
- deadline latest
- recently added
- recently updated

The `Closing soon` quick view automatically sorts by nearest deadline.

The `Recently added` quick view automatically sorts by newest created date.
