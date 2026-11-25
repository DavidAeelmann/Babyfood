# LittleTable — Family & Baby Meal Planner PWA

A fast, mobile-first Progressive Web App that generates a weekly family meal plan with overhead meal photos, adapts every recipe to the active child age brackets in your household (`6–9m`, `9–12m`, `12–24m`, `2–4y`, `4y+`), and compiles an offline-capable, aisle-grouped grocery list.

## Quick Start (Offline-Ready Seeded Dataset)

```bash
npm install
npm run dev
```

Build and test:

```bash
npm test
npm run build
```

## Weekly AI Generation Pipeline (`/scripts/generate-week.ts`)

1. Copy `.env.example` to `.env` and add your `GEMINI_API_KEY` (default) or set `LLM_PROVIDER=openai` with `OPENAI_API_KEY`.
2. Run the generator:

```bash
# Full generation (12-14 recipes + 4:3 .webp meal photos)
npm run generate-week

# Validate existing public/data/week-current.json
npm run generate-week -- --validate-only

# Dry-run end-to-end with mock data (no API key required)
npm run generate-week -- --mock --dry-run
```

## GitHub Actions Weekly Cron

Add `GEMINI_API_KEY` (or `OPENAI_API_KEY` + repository variable `LLM_PROVIDER=openai`) in **Settings → Secrets and variables → Actions**. Every Sunday at 06:00 UTC, `.github/workflows/weekly-meal-refresh.yml` refreshes `public/data/week-current.json` and `public/meals/*.webp`, and commits to `main` only after `--validate-only`, `npm test`, and `npm run build` pass.
