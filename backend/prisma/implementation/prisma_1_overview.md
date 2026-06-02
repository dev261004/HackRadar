# Prisma 1: Overview and Why HackRadar Uses It

This file explains Prisma at a high level and how it fits into HackRadar.

## What Prisma Is

Prisma is an ORM, which means Object Relational Mapper.

It helps a TypeScript backend talk to a relational database like PostgreSQL using typed application code instead of writing raw SQL everywhere.

Prisma also manages the database schema through migration files.

## Why We Use Prisma in HackRadar

HackRadar needs to store structured data for opportunities, sources, scraper runs, and raw snapshots.

The data model will grow over time as we add source ingestion, search, tracking, notifications, and user accounts.

Prisma gives us a central schema file that describes the database clearly.

It also generates a typed database client so backend code gets autocomplete and type safety.

## How Prisma Fits Into This Project

In HackRadar, PostgreSQL is the database.

Prisma is the tool that defines the database schema, creates migrations, and gives the backend a safe way to query the database.

Express handles HTTP requests.

The repository layer uses Prisma to read or write database records.

The route layer returns API responses to the frontend.

## Main Prisma Pieces

The Prisma schema describes models, enums, fields, relationships, indexes, and database table mappings.

The Prisma migration system turns schema changes into database changes.

The Prisma Client is generated from the schema and used by the backend code.

The Prisma config file tells Prisma where the schema and migrations live and which database URL to use.

## Local PostgreSQL Now, Supabase Later

Because Supabase is also PostgreSQL, this setup can move from local PostgreSQL to Supabase later.

The main change will usually be the database connection string.

The Prisma schema and most backend code can stay the same.

## Prisma 7 Note

This project uses Prisma 7.

Prisma 7 moved some configuration out of the schema file and into `prisma.config.ts`.

At runtime, the backend uses the PostgreSQL adapter so Prisma Client can connect to PostgreSQL.
