# Prisma 3: Migrations, Client, and Project Workflow

This file explains how Prisma is used day to day in HackRadar.

## Database URL

The backend reads the database connection string from `DATABASE_URL`.

For local development, this value lives in `backend/.env`.

For deployment later, the hosting provider or Supabase will provide the database URL as an environment variable.

## Migration

A migration is a saved database change.

When the Prisma schema changes, Prisma can create a migration that updates PostgreSQL.

For example, adding a new field to the Opportunity model should create a migration so the database gets that new column.

## When to Run Migration

Run the migration command after changing `backend/prisma/schema.prisma`.

The database must already exist before running the migration.

The migration command applies schema changes and also generates Prisma Client.

## Prisma Client

Prisma Client is generated from the schema.

Backend code uses Prisma Client to query tables like opportunities and source sync runs.

Because Prisma Client is generated, it knows the exact model names, fields, and types from the schema.

## Generate

Generate updates Prisma Client without changing the database.

This is useful after pulling schema changes or after installing dependencies.

Migration usually runs generation automatically, but generation can also be run separately.

## Prisma Studio

Prisma Studio is a browser UI for viewing and editing database records during development.

It is useful for checking whether opportunities, sources, sync runs, and raw snapshots were created correctly.

It should be treated as a development tool, not as the main admin panel for the final product.

## Repository Pattern in HackRadar

HackRadar does not put Prisma calls directly inside every route.

The route calls a repository function.

The repository handles database filtering and maps database records into API response objects.

This keeps Express route code cleaner and makes future changes easier.

## Mapper Pattern in HackRadar

The database uses Prisma enum names and database-friendly fields.

The API should return frontend-friendly values.

The mapper converts database records into the opportunity shape used by the frontend.

This keeps internal database details from leaking into the user-facing API.

## Good Workflow

Change the Prisma schema first when the data model needs to change.

Create and apply a migration.

Generate Prisma Client if needed.

Update repository and mapper code.

Update routes and frontend types only after the backend data shape is clear.

## Common Mistakes to Avoid

Do not manually change database tables and forget to update the Prisma schema.

Do not edit generated Prisma Client files.

Do not store only normalized data and throw away source data. Raw snapshots are important for scrapers.

Do not delete closed opportunities just because they should disappear from public listings.

Do not put database logic directly into UI code.
