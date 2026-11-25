# Family & Baby Meal Planner PWA — SPEC.md

## 1. Product Goal
A fast, mobile-first Progressive Web App that generates a weekly meal plan with meal photos, adapts every recipe to whichever child age brackets are currently selected in the household, and compiles an offline-capable, aisle-grouped grocery list.

## 2. Tech Stack & Constraints
- Frontend: Vite + React + TypeScript + Tailwind CSS + `vite-plugin-pwa`
- State & Offline Persistence: `localStorage` (active household config, locked meals, checked grocery items, pantry staples)
- Data Pipeline (Node.js script in `/scripts/generate-week.ts`):
  - Calls LLM API with Structured Outputs (JSON Schema) to generate 12–14 recipes (7 planned + swap bench)
  - Deterministic validator (`validateRecipes.ts`) enforces:
    1. Metric units only (`g`, `ml`, `pcs`, `tbsp`, `tsp`)
    2. Canonical `ingredient_id` snake_case slugs for exact grocery merging
    3. Mandatory `seasoning_split_step` index and `age_adaptations` for all brackets
    4. Hard safety rules (zero honey if `min_age_months < 12`, zero whole round hazards without prep rule)
  - Calls Image Generation API to create a clean overhead natural-light food photo per recipe (saved to `/public/meals/{id}.webp`)
  - Automatable via GitHub Actions weekly cron (or manual CLI run)

## 3. Household Profile & Adaptation Rules
User toggles in a compact top bar:
- Adults count (1–4, weight: 1.0)
- Active Child Brackets (multi-select):
  - `6_9m` (weight: 0.25 — finger-length soft strips / mashed / zero added salt or honey)
  - `9_12m` (weight: 0.30 — pincer-grasp bite-sized soft pieces / zero added salt or honey)
  - `12_24m` (weight: 0.40 — forkable soft pieces, quartered rounds, minimal salt)
  - `2_4y` (weight: 0.55 — kid-sized cuts, mild spice option)
  - `4y_plus` (weight: 0.70 — standard small plate)
- Allergen Exclusions (optional toggles: dairy, egg, peanut, tree_nut, fish, shellfish, soy, wheat)

## 4. Core Data Contract (`recipes.json`)
Each recipe object MUST conform to:
- `id`: string (slug)
- `title`: string
- `image_url`: string (local `/meals/{id}.webp` or fallback placeholder during dev)
- `prep_minutes`, `cook_minutes`: number
- `base_servings`: number (adult equivalent)
- `min_age_months`: number
- `allergens`: string[]
- `ingredients`: Array of `{ canonical_id, name, quantity, unit, aisle, is_pantry_staple }`
- `steps`: Array of `{ order, text, is_seasoning_split_point: boolean }`
- `age_adaptations`: Record<BracketKey, { cut_and_texture: string, serving_note: string }>

## 5. Mobile-First UI (v1 Scope — 3 Bottom Tabs)
1. **Plan Tab:**
   - Top compact Household Selector pill bar (Adults + active child brackets)
   - 7 daily meal cards: 4:3 meal photo, title, total time, active-bracket badges, one-tap Lock icon, one-tap Swap button (pulls from swap bench)
   - Button: "Shuffle Unlocked"
2. **Shop Tab:**
   - Aggregates all unlocked + locked meals in the active 7-day plan by `canonical_id` + `unit`, multiplied by total household serving weight
   - Grouped by supermarket aisle (`Produce`, `Meat & Fish`, `Dairy & Eggs`, `Pantry`, `Frozen`, `Bakery`)
   - 48px thumb-friendly checkboxes, strikethrough checked items to bottom, toggle to hide/show pantry staples, "Add custom item" input
3. **Cook View (on tapping any meal card):**
   - Full-bleed meal photo header + Screen Wake Lock toggle ("Keep Screen On")
   - **Dynamic Child Prep Card:** Displays ONLY the `age_adaptations` matching currently active child brackets
   - Scaled ingredients list (with quick checkoff as you prep)
   - Numbered cooking steps with a high-contrast highlighted banner on `is_seasoning_split_point === true`

## 6. Verification Gate (Required Before Completion)
- Seed `/public/data/week-current.json` with 10 realistic recipes + mock/generated meal images so UI works offline immediately without API keys.
- Run Playwright / Antigravity browser check at `390x844` (mobile viewport) verifying:
  1. Toggling `6_9m` vs `2_4y` updates scaled grocery totals and visible prep cards.
  2. Swapping a meal immediately recalculates the grocery list with zero duplicate `canonical_id` rows.
  3. Zero horizontal overflow on mobile viewport; attach screenshots of Plan, Shop, and Cook views to the Walkthrough artifact.
