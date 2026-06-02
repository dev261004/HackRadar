# Backend Implementation 1: Initial Backend Setup

This file explains the first backend implementation done for HackRadar.

## Goal

Create the first TypeScript backend foundation for HackRadar so the frontend can request opportunity data through an API.

## What Was Implemented

The backend was created as a Node.js, Express, and TypeScript service inside the `backend` folder.

It includes a basic Express app structure with separate files for configuration, routes, mock data, source metadata, and shared opportunity types.

## Main Files Added

- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/src/server.ts`
- `backend/src/app.ts`
- `backend/src/config/env.ts`
- `backend/src/routes/health.routes.ts`
- `backend/src/routes/opportunities.routes.ts`
- `backend/src/types/opportunity.ts`
- `backend/src/data/mockOpportunities.ts`
- `backend/src/sources/registry.ts`
- `backend/src/sources/source.types.ts`

## API Endpoints Added

The backend exposes a health endpoint to confirm the API is running.

It also exposes opportunity endpoints for listing opportunities and getting one opportunity by id.

The opportunity routes initially used mock data because real source ingestion from Devfolio, HackerEarth, and Unstop had not been implemented yet.

## Opportunity Data Shape

The first backend setup created a shared opportunity type with fields like title, source, type, organizer, location, deadline, event dates, tags, status, and external URL.

This gave the frontend a stable shape to build against while the database and scraping layers were still pending.

## Source Registry

A source registry was added for Devfolio, HackerEarth, and Unstop.

The purpose of this registry is to keep source metadata in one place. Later, each source can have its own API or scraper adapter while the rest of the app still talks to one common opportunity system.

## Why This Structure Was Chosen

The backend was split into small folders from the beginning so future database, scraper, queue, and AI service work can be added without rewriting the initial API.

The initial API was intentionally simple, but it created the main contract between frontend and backend.

## Current Limitation After This Step

At this stage, the backend did not store data in PostgreSQL.

It only returned mock opportunities, so the next major step was database setup with Prisma.
