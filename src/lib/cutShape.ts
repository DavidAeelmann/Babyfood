import type { AgeAdaptation, BracketKey, CutShape } from '../types/recipe';

export const CUT_SHAPE_META: Record<
  CutShape,
  { label: string; shortHint: string }
> = {
  'finger-strip': {
    label: 'Finger Strip',
    shortHint: '2-finger width soft strips',
  },
  'pincer-dice': {
    label: 'Pincer Dice',
    shortHint: '1 cm soft bite cubes',
  },
  'quartered-lengthwise': {
    label: 'Quartered',
    shortHint: 'Rounds cut in 4 lengthwise',
  },
  'smashed-flat': {
    label: 'Smashed Flat',
    shortHint: 'Flattened, never whole round',
  },
  'flaked-fine': {
    label: 'Flaked Fine',
    shortHint: 'Moist flakes, bone-checked',
  },
  'fork-mash': {
    label: 'Fork Mash',
    shortHint: 'Thick & soft scoopable',
  },
};

export function inferCutShape(
  adaptation: AgeAdaptation,
  bracket: BracketKey,
): CutShape {
  if (adaptation.cut_shape) return adaptation.cut_shape;

  const text = `${adaptation.cut_and_texture} ${adaptation.serving_note}`.toLowerCase();

  if (text.includes('quarter')) return 'quartered-lengthwise';
  if (text.includes('flatten') || text.includes('smash')) return 'smashed-flat';
  if (text.includes('flake') || text.includes('shred') || text.includes('crumble')) {
    return 'flaked-fine';
  }
  if (
    text.includes('mash') ||
    text.includes('purée') ||
    text.includes('puree') ||
    text.includes('porridge') ||
    text.includes('soup')
  ) {
    return 'fork-mash';
  }
  if (text.includes('strip') || text.includes('wedge')) return 'finger-strip';
  if (
    text.includes('dice') ||
    text.includes('cube') ||
    text.includes('1 cm') ||
    text.includes('1.5 cm') ||
    text.includes('bite') ||
    text.includes('pincer')
  ) {
    return 'pincer-dice';
  }

  return bracket === '6_9m' ? 'finger-strip' : 'pincer-dice';
}
