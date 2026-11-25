export type BracketKey = '6_9m' | '9_12m' | '12_24m' | '2_4y' | '4y_plus';

export type MetricUnit = 'g' | 'ml' | 'pcs' | 'tbsp' | 'tsp';

export type Aisle =
  | 'Produce'
  | 'Meat & Fish'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Frozen'
  | 'Pantry';

export type Allergen =
  | 'dairy'
  | 'egg'
  | 'peanut'
  | 'tree_nut'
  | 'fish'
  | 'shellfish'
  | 'soy'
  | 'wheat';

export interface Ingredient {
  canonical_id: string;
  name: string;
  quantity: number;
  unit: MetricUnit;
  aisle: Aisle;
  is_pantry_staple: boolean;
}

export interface RecipeStep {
  order: number;
  text: string;
  is_seasoning_split_point: boolean;
}

export interface AgeAdaptation {
  cut_and_texture: string;
  serving_note: string;
}

export interface Recipe {
  id: string;
  title: string;
  image_url: string;
  prep_minutes: number;
  cook_minutes: number;
  base_servings: number;
  min_age_months: number;
  allergens: Allergen[];
  ingredients: Ingredient[];
  steps: RecipeStep[];
  age_adaptations: Record<BracketKey, AgeAdaptation>;
}

export type MealSlotType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type DayPlan = Record<MealSlotType, string>;

export interface WeekData {
  week_id: string;
  generated_at: string;
  planned_ids: string[];
  breakfast_ids?: string[];
  lunch_ids?: string[];
  snack_ids?: string[];
  recipes: Recipe[];
}

export interface HouseholdConfig {
  adults: number;
  activeBrackets: BracketKey[];
  excludedAllergens: Allergen[];
}

export interface GroceryItem {
  key: string;
  canonical_id: string;
  name: string;
  quantity: number;
  unit: MetricUnit;
  aisle: Aisle;
  is_pantry_staple: boolean;
  meals: string[];
}

export interface CustomGroceryItem {
  id: string;
  name: string;
  aisle: Aisle;
  checked: boolean;
}

export type FirstFoodCategory =
  | 'Vegetables'
  | 'Fruits'
  | 'Proteins & Iron'
  | 'Grains'
  | 'Dairy & Fats'
  | 'Allergens';

export interface FirstFoodItem {
  id: string;
  name: string;
  ptName: string;
  category: FirstFoodCategory;
  allergen?: Allergen;
  prep6m: string;
  canonicalIds: string[];
}

export type TriedFoodReaction = 'loved' | 'neutral' | 'watch';

export interface TriedFoodEntry {
  triedAt: string;
  reaction?: TriedFoodReaction;
}

export interface CustomFirstFood {
  id: string;
  name: string;
  category: FirstFoodCategory;
}

