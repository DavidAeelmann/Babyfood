import type { Aisle, Allergen, BracketKey, HouseholdConfig } from '../types/recipe';

export const ADULT_WEIGHT = 1.0;

export const BRACKET_META: Record<
  BracketKey,
  { label: string; shortLabel: string; weight: number; summary: string }
> = {
  '6_9m': {
    label: '6–9 mo',
    shortLabel: '6–9m',
    weight: 0.25,
    summary: 'Soft finger-length strips or mashed, zero added salt or honey',
  },
  '9_12m': {
    label: '9–12 mo',
    shortLabel: '9–12m',
    weight: 0.30,
    summary: 'Pincer-grasp soft bite-sized pieces, zero added salt or honey',
  },
  '12_24m': {
    label: '12–24 mo',
    shortLabel: '12–24m',
    weight: 0.40,
    summary: 'Forkable soft pieces, quartered rounds, minimal salt',
  },
  '2_4y': {
    label: '2–4 yr',
    shortLabel: '2–4y',
    weight: 0.55,
    summary: 'Kid-sized cuts, mild spice option',
  },
  '4y_plus': {
    label: '4+ yr',
    shortLabel: '4y+',
    weight: 0.70,
    summary: 'Standard small plate',
  },
};

export const BRACKET_KEYS: BracketKey[] = [
  '6_9m',
  '9_12m',
  '12_24m',
  '2_4y',
  '4y_plus',
];

export const AISLE_ORDER: Aisle[] = [
  'Produce',
  'Meat & Fish',
  'Dairy & Eggs',
  'Bakery',
  'Frozen',
  'Pantry',
];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  dairy: 'Dairy',
  egg: 'Egg',
  peanut: 'Peanut',
  tree_nut: 'Tree Nut',
  fish: 'Fish',
  shellfish: 'Shellfish',
  soy: 'Soy',
  wheat: 'Wheat',
};

export const ALLERGEN_KEYS: Allergen[] = [
  'dairy',
  'egg',
  'peanut',
  'tree_nut',
  'fish',
  'shellfish',
  'soy',
  'wheat',
];

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const DEFAULT_HOUSEHOLD: HouseholdConfig = {
  adults: 2,
  activeBrackets: ['6_9m', '2_4y'],
  excludedAllergens: [],
};

export const METRIC_UNITS = ['g', 'ml', 'pcs', 'tbsp', 'tsp'] as const;
