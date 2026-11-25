import type { ApplianceId, Recipe } from '../types/recipe';

export interface ApplianceMeta {
  id: ApplianceId;
  label: string;
  shortLabel: string;
  subtitle: string;
}

export const APPLIANCE_META: Record<ApplianceId, ApplianceMeta> = {
  'ninja-foodi-power': {
    id: 'ninja-foodi-power',
    label: 'Ninja Foodi Power',
    shortLabel: 'Foodi Power',
    subtitle: 'Liquidificadora & Processador (batidos, purés, massas, húmus)',
  },
  'ninja-crispi-pro-xl': {
    id: 'ninja-crispi-pro-xl',
    label: 'Ninja Crispi Pro XL',
    shortLabel: 'Crispi Pro XL',
    subtitle: 'Air Fryer em Vidro XL (5,7L / 2,3L — Air Fry, Assar, Max Crisp)',
  },
};

export function getRecipeAppliances(recipe: Recipe): ApplianceId[] {
  if (recipe.appliances && recipe.appliances.length > 0) {
    return recipe.appliances;
  }

  const text = `${recipe.title} ${recipe.steps.map((s) => s.text).join(' ')}`.toLowerCase();
  const found: ApplianceId[] = [];

  const usesFoodiPower =
    recipe.id.includes('foodi') ||
    text.includes('tritur') ||
    text.includes('liquidificador') ||
    text.includes('processador') ||
    text.includes('batido') ||
    text.includes('smoothie') ||
    text.includes('húmus') ||
    text.includes('pesto') ||
    text.includes('mousse') ||
    text.includes('nice cream') ||
    text.includes('gelado') ||
    text.includes('creme') ||
    text.includes('sopa') ||
    text.includes('panquec') ||
    text.includes('waffle');

  const usesCrispiPro =
    recipe.id.includes('crispi') ||
    text.includes('crispi') ||
    text.includes('air fry') ||
    text.includes('forno') ||
    text.includes('assad') ||
    text.includes('assar') ||
    text.includes('gratin') ||
    text.includes('dourad') ||
    text.includes('croquet') ||
    text.includes('hambúrguer') ||
    text.includes('almôndeg') ||
    text.includes('queque') ||
    text.includes('muffin') ||
    text.includes('bolach') ||
    text.includes('scone') ||
    text.includes('nugget');

  if (usesFoodiPower) found.push('ninja-foodi-power');
  if (usesCrispiPro) found.push('ninja-crispi-pro-xl');

  return found;
}

export function getAppliancePrepTip(recipe: Recipe, appliance: ApplianceId): string {
  const text = `${recipe.title} ${recipe.steps.map((s) => s.text).join(' ')}`.toLowerCase();

  if (appliance === 'ninja-foodi-power') {
    if (text.includes('smoothie') || text.includes('batido') || text.includes('gelado') || text.includes('nice cream')) {
      return 'Use o copo XL Smoothie Bowl / Extração de Nutrientes com o programa Auto-iQ Bowl ou Smoothie (smartTORQUE evita encravar com fruta congelada).';
    }
    if (text.includes('húmus') || text.includes('pesto') || text.includes('mousse')) {
      return 'Use o jarro processador ou copo pequeno com o programa Spreads / Chop para textura ultra cremosa sem grumos.';
    }
    if (text.includes('sopa') || text.includes('creme')) {
      return 'Após cozer os legumes, deixe arrefecer 5 min e passe para o jarro Ninja Foodi Power (Velocidade Variável) para um creme aveludado perfeito para bebé.';
    }
    if (text.includes('panquec') || text.includes('waffle') || text.includes('aveia') || text.includes('nugget') || text.includes('bolach')) {
      return 'Use o jarro processador para triturar flocos de aveia em farinha fina ou envolver a massa / carne picada em segundos.';
    }
    return 'Ideal para triturar, picar ou homogeneizar os ingredientes no jarro Ninja Foodi Power com controlo de textura para bebés e crianças.';
  }

  // ninja-crispi-pro-xl
  const isSnackOrSmall = recipe.meal_slot === 'snack' || recipe.meal_slot === 'breakfast';
  const container = isSnackOrSmall
    ? 'recipiente de vidro CleanCrisp 2,3L (ou 5,7L para o dobro)'
    : 'recipiente de vidro XL 5,7L CleanCrisp';

  if (text.includes('queque') || text.includes('muffin') || text.includes('bolach') || text.includes('scone') || text.includes('pão de banana') || text.includes('tarte')) {
    return `Coloque no ${container} em modo Bake (160–170 °C) durante cerca de 12–18 min; o vidro transparente permite vigiar sem abrir.`;
  }
  if (text.includes('frango') && (text.includes('batat') || text.includes('coxa'))) {
    return `Use o ${container} em modo Roast ou Air Fry (190 °C, ~20–25 min), virando a meio para ficar suculento por dentro e macio para o bebé.`;
  }
  if (text.includes('dourad') || text.includes('nugget') || text.includes('croquet') || text.includes('hambúrguer') || text.includes('almôndeg') || text.includes('palitos')) {
    return `Disponha na grelha crisper dentro do ${container} com um fio de azeite; modo Air Fry ou Max Crisp (190–200 °C, 12–15 min) sem virar demais.`;
  }
  return `Prepare diretamente no ${container} em modo Air Fry / Roast (180–195 °C), reduzindo ~20–25% do tempo de forno tradicional e servindo na própria taça de vidro.`;
}
