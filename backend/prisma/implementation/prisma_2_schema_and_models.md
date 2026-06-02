# Prisma 2: Schema, Models, Enums, and Relationships

This file explains the Prisma schema concepts used in HackRadar.

## Schema File

The main Prisma schema is in `backend/prisma/schema.prisma`.

This file is the source of truth for the database structure.

When the schema changes, a migration should be created so PostgreSQL can be updated safely.

## Generator

The generator tells Prisma to create Prisma Client.

Prisma Client is the typed database client used by the backend.

Without generation, TypeScript code will not know about the latest models and fields.

## Datasource

The datasource tells Prisma which database provider is used.

HackRadar uses PostgreSQL.

In Prisma 7, the actual database URL is handled in `prisma.config.ts`, not directly inside the schema.

## Enums

Enums define a fixed set of allowed values.

HackRadar uses enums for source, opportunity type, opportunity status, opportunity mode, and sync run status.

This prevents random values from entering important fields.

For example, an opportunity source should be Devfolio, HackerEarth, or Unstop, not any arbitrary string.

## Models

A model represents a database table.

Each field in a model represents a database column.

HackRadar currently has models for opportunity sources, opportunities, source sync runs, and raw opportunity snapshots.

## Opportunity Model

The Opportunity model is the main table.

It stores normalized data from different platforms in one common structure.

This lets the frontend and API work with one consistent opportunity shape, even when Devfolio, HackerEarth, and Unstop return different source data.

## One Opportunity Table

HackRadar uses one opportunity table for hackathons, coding contests, AI competitions, and hiring challenges.

The type field separates these categories.

This is simpler and more flexible than creating separate tables for each category.

## Raw Snapshots

Raw snapshots store the original collected payload from a source.

This is useful because source platforms may include extra fields that are not yet part of the normalized opportunity model.

It also helps debugging when a scraper or API adapter behaves unexpectedly.

## Relationships

A relationship connects records between tables.

In HackRadar, source sync runs are connected to a source.

Raw snapshots are connected to an opportunity and optionally to a sync run.

These relationships help us trace where data came from.

## Indexes and Unique Rules

Indexes help the database search and filter faster.

HackRadar adds indexes for fields like source, type, status, mode, country, city, deadlines, and visibility dates.

Unique rules prevent duplicate records.

For example, source URL is unique because the same source page should not create multiple opportunity records.

## Closed Event Visibility

Closed events are kept in the database.

The public API decides whether they should be shown by checking the visible-until date.

This supports the product rule that closed events are visible for only one day while still preserving historical records.
