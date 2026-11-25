import { AISLE_ORDER, ALLERGEN_KEYS, BRACKET_KEYS, METRIC_UNITS } from '../src/lib/constants';

const ageAdaptationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cut_and_texture', 'serving_note'],
  properties: {
    cut_and_texture: { type: 'string' },
    serving_note: { type: 'string' },
  },
};

export const weekGenerationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['week_id', 'generated_at', 'planned_ids', 'breakfast_ids', 'lunch_ids', 'snack_ids', 'recipes'],
  properties: {
    week_id: { type: 'string' },
    generated_at: { type: 'string' },
    planned_ids: {
      type: 'array',
      items: { type: 'string' },
      minItems: 7,
      maxItems: 7,
    },
    breakfast_ids: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 3,
    },
    lunch_ids: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 3,
    },
    snack_ids: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 3,
    },
    recipes: {
      type: 'array',
      minItems: 16,
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'title',
          'image_url',
          'prep_minutes',
          'cook_minutes',
          'base_servings',
          'min_age_months',
          'allergens',
          'ingredients',
          'steps',
          'age_adaptations',
        ],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          image_url: { type: 'string' },
          prep_minutes: { type: 'number' },
          cook_minutes: { type: 'number' },
          base_servings: { type: 'number' },
          min_age_months: { type: 'number' },
          allergens: {
            type: 'array',
            items: { type: 'string', enum: [...ALLERGEN_KEYS] },
          },
          ingredients: {
            type: 'array',
            minItems: 4,
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'canonical_id',
                'name',
                'quantity',
                'unit',
                'aisle',
                'is_pantry_staple',
              ],
              properties: {
                canonical_id: { type: 'string' },
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string', enum: [...METRIC_UNITS] },
                aisle: { type: 'string', enum: [...AISLE_ORDER] },
                is_pantry_staple: { type: 'boolean' },
              },
            },
          },
          steps: {
            type: 'array',
            minItems: 3,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['order', 'text', 'is_seasoning_split_point'],
              properties: {
                order: { type: 'number' },
                text: { type: 'string' },
                is_seasoning_split_point: { type: 'boolean' },
              },
            },
          },
          age_adaptations: {
            type: 'object',
            additionalProperties: false,
            required: [...BRACKET_KEYS],
            properties: {
              '6_9m': ageAdaptationSchema,
              '9_12m': ageAdaptationSchema,
              '12_24m': ageAdaptationSchema,
              '2_4y': ageAdaptationSchema,
              '4y_plus': ageAdaptationSchema,
            },
          },
        },
      },
    },
  },
} as const;
