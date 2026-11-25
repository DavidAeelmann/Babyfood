import type {
  Aisle,
  Allergen,
  BracketKey,
  CutShape,
  EnabledSlots,
  FirstFoodCategory,
  HouseholdConfig,
  MealSlotType,
} from '../types/recipe';

export const ADULT_WEIGHT = 1.0;

export const BRACKET_META: Record<
  BracketKey,
  { label: string; shortLabel: string; weight: number; summary: string }
> = {
  '6_9m': {
    label: '6–9 meses',
    shortLabel: '6–9m',
    weight: 0.25,
    summary: 'Tiras macias do tamanho de um dedo ou esmagado, zero sal ou mel',
  },
  '9_12m': {
    label: '9–12 meses',
    shortLabel: '9–12m',
    weight: 0.30,
    summary: 'Pedaços macios para pega em pinça, zero sal ou mel',
  },
  '12_24m': {
    label: '12–24 meses',
    shortLabel: '12–24m',
    weight: 0.40,
    summary: 'Pedaços macios de garfo, redondos cortados em quartos, sal mínimo',
  },
  '2_4y': {
    label: '2–4 anos',
    shortLabel: '2–4a',
    weight: 0.55,
    summary: 'Cortes à medida da criança, especiarias suaves',
  },
  '4y_plus': {
    label: '4+ anos',
    shortLabel: '4a+',
    weight: 0.70,
    summary: 'Prato pequeno familiar',
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

export const AISLE_LABELS: Record<Aisle, string> = {
  Produce: 'Frutas e Legumes',
  'Meat & Fish': 'Talho e Peixaria',
  'Dairy & Eggs': 'Lacticínios e Ovos',
  Bakery: 'Padaria',
  Frozen: 'Congelados',
  Pantry: 'Mercearia',
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  dairy: 'Leite / Lacticínios',
  egg: 'Ovo',
  peanut: 'Amendoim',
  tree_nut: 'Frutos de Casca Rija',
  fish: 'Peixe',
  shellfish: 'Marisco',
  soy: 'Soja',
  wheat: 'Trigo / Glúten',
  sesame: 'Sésamo',
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
  'sesame',
];

export const FIRST_FOOD_CATEGORY_LABELS: Record<FirstFoodCategory, string> = {
  Vegetables: 'Legumes e Hortícolas',
  Fruits: 'Fruta',
  'Proteins & Iron': 'Proteínas e Ferro',
  Grains: 'Cereais e Pão',
  'Dairy & Fats': 'Lacticínios e Gorduras',
  Allergens: 'Alergénios Principais',
};

export const CUT_SHAPES: CutShape[] = [
  'finger-strip',
  'pincer-dice',
  'quartered-lengthwise',
  'smashed-flat',
  'flaked-fine',
  'fork-mash',
];

export const MEAL_SLOTS: MealSlotType[] = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
];

export const DEFAULT_ENABLED_SLOTS: EnabledSlots = {
  breakfast: false,
  lunch: false,
  snack: false,
  dinner: true,
};

export const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

export const DEFAULT_HOUSEHOLD: HouseholdConfig = {
  adults: 2,
  activeBrackets: ['6_9m', '2_4y'],
  excludedAllergens: [],
};

export const METRIC_UNITS = ['g', 'ml', 'pcs', 'tbsp', 'tsp'] as const;

export const UNIT_LABELS: Record<(typeof METRIC_UNITS)[number], string> = {
  g: 'g',
  ml: 'ml',
  pcs: 'un',
  tbsp: 'c. sopa',
  tsp: 'c. chá',
};
