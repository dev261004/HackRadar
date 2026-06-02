# Frontend Implementation 2: Country and City Filters

This file explains the second frontend implementation done for HackRadar.

## Goal

Update the frontend so it supports country and city filtering, matching the database design for global opportunity discovery.

## What Was Implemented

The opportunity type was expanded to understand the richer backend data shape created during the Prisma database setup.

Country, city, and mode fields were added to the frontend opportunity model.

The opportunity explorer now builds country and city filter options from the available opportunity data.

## Main Files Updated

- `frontend/src/lib/opportunity.ts`
- `frontend/src/lib/fallback-opportunities.ts`
- `frontend/src/components/opportunity-explorer.tsx`
- `frontend/src/app/globals.css`

## Filter Behavior

The country filter shows all countries found in the currently loaded opportunities.

The city filter depends on the selected country.

If a user changes the country, the city filter resets to all cities so the UI does not keep an invalid city selected.

Online or global opportunities may not always have a country or city, so those fields are optional.

## Why This Was Added Now

HackRadar is planned as a global platform.

Adding country and city filters early makes the frontend match the database model and avoids redesigning the discovery page later.

## Current Limitation After This Step

The filters currently work on whatever data is loaded into the frontend.

Once real ingestion is implemented, the database and API will provide real country and city values from source platforms.
