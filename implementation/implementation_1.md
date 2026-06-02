# Project Implementation 1: Command Reference

This file explains the first project-level implementation done for HackRadar.

## Goal

Create one central file that documents all npm scripts used in the project.

## What Was Implemented

A root command reference file was added at `COMMANDS.md`.

The README now links to this file from the getting started section.

## Main Files Added

- `COMMANDS.md`
- `implementation/implementation_1.md`

## Main Files Updated

- `README.md`

## Rule Added

Whenever a new script is added to any `package.json`, `COMMANDS.md` must be updated in the same implementation.

This keeps the project easy to run as more scripts are added for database work, scrapers, queues, seeds, workers, and deployment.

## Commands Documented

The command file currently documents root workspace commands, backend commands, Prisma database commands, scraper commands, frontend commands, setup flow, and verification flow.
