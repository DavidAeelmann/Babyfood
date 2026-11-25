import type { AgeAdaptation, BracketKey, CutShape } from '../types/recipe';

export const CUT_SHAPE_META: Record<
  CutShape,
  { label: string; shortHint: string }
> = {
  'finger-strip': {
    label: 'Tiras de Dedo',
    shortHint: 'Tiras macias da largura de 2 dedos',
  },
  'pincer-dice': {
    label: 'Cubos Pinça',
    shortHint: 'Cubos macios de 1 cm',
  },
  'quartered-lengthwise': {
    label: 'Em Quartos',
    shortHint: 'Redondos cortados em 4 ao comprido',
  },
  'smashed-flat': {
    label: 'Esmagado',
    shortHint: 'Achatado com garfo, nunca inteiro',
  },
  'flaked-fine': {
    label: 'Lascas Finas',
    shortHint: 'Lascas húmidas, sem espinhas',
  },
  'fork-mash': {
    label: 'Puré / Garfo',
    shortHint: 'Textura espessa e cremosa',
  },
};

export function inferCutShape(
  adaptation: AgeAdaptation,
  bracket: BracketKey,
): CutShape {
  if (adaptation.cut_shape) return adaptation.cut_shape;

  const text = `${adaptation.cut_and_texture} ${adaptation.serving_note}`.toLowerCase();

  if (text.includes('quarter') || text.includes('quarto')) return 'quartered-lengthwise';
  if (
    text.includes('flatten') ||
    text.includes('smash') ||
    text.includes('achatar') ||
    text.includes('achatad')
  ) {
    return 'smashed-flat';
  }
  if (
    text.includes('flake') ||
    text.includes('shred') ||
    text.includes('crumble') ||
    text.includes('lasca') ||
    text.includes('desfiad')
  ) {
    return 'flaked-fine';
  }
  if (
    text.includes('mash') ||
    text.includes('purée') ||
    text.includes('puree') ||
    text.includes('puré') ||
    text.includes('esmagad') ||
    text.includes('porridge') ||
    text.includes('papa') ||
    text.includes('sopa') ||
    text.includes('soup')
  ) {
    return 'fork-mash';
  }
  if (text.includes('strip') || text.includes('wedge') || text.includes('tira')) {
    return 'finger-strip';
  }
  if (
    text.includes('dice') ||
    text.includes('cube') ||
    text.includes('cubo') ||
    text.includes('1 cm') ||
    text.includes('1.5 cm') ||
    text.includes('bite') ||
    text.includes('pedaço') ||
    text.includes('pincer') ||
    text.includes('pinça')
  ) {
    return 'pincer-dice';
  }

  return bracket === '6_9m' ? 'finger-strip' : 'pincer-dice';
}
