import { ColorMatrixFilter } from 'pixi.js';
import { BloomFilter } from 'pixi-filters';

/**
 * Résultat de l'analyse colorimétrique d'une image.
 */
export interface PaletteAnalysis {
  /** Luminosité moyenne [0..1] — 0 = très sombre, 1 = très claire */
  avgLuminosity: number;
  /** Saturation moyenne [0..1] — 0 = désaturé (niveaux de gris), 1 = très saturé */
  avgSaturation: number;
  /** Température dominante : 'warm' (rouges/jaunes), 'cold' (bleus/verts), 'neutral' */
  temperature: 'warm' | 'cold' | 'neutral';
}

/**
 * Paramètres calculés pour les filtres PixiJS.
 */
export interface FilterParams {
  bloomStrength: number;
  bloomQuality: number;
  contrastBoost: number;
  saturationBoost: number;
}

// ---------------------------------------------------------------------------
// Analyse de palette
// ---------------------------------------------------------------------------

/**
 * Sample un canvas offscreen pour extraire luminosité, saturation et température.
 * On ne lit qu'une grille de ~200 pixels pour rester instantané.
 */
export async function analyzeImagePalette(img: HTMLImageElement | ImageBitmap): Promise<PaletteAnalysis> {
  const SAMPLE_SIZE = 200;

  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    // Fallback neutre si le canvas n'est pas dispo
    return { avgLuminosity: 0.5, avgSaturation: 0.5, temperature: 'neutral' };
  }

  ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  let totalLum = 0;
  let totalSat = 0;
  let warmScore = 0; // canaux rouge > bleu
  let coldScore = 0; // canaux bleu > rouge
  let pixelCount = 0;

  // On lit 1 pixel sur 4 (grille 2x2) pour aller vite
  for (let i = 0; i < data.length; i += 4 * 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    // Luminosité perceptuelle (formule standard BT.601)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Saturation HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    totalLum += lum;
    totalSat += sat;

    // Température : jaunes/rouges = chaud, bleus/verts froids = froid
    if (r > b + 0.1) warmScore++;
    else if (b > r + 0.05) coldScore++;

    pixelCount++;
  }

  const avgLuminosity = totalLum / pixelCount;
  const avgSaturation = totalSat / pixelCount;
  const temperature: PaletteAnalysis['temperature'] =
    warmScore > coldScore * 1.5 ? 'warm' :
      coldScore > warmScore * 1.5 ? 'cold' : 'neutral';

  return { avgLuminosity, avgSaturation, temperature };
}

// ---------------------------------------------------------------------------
// Calcul des paramètres de filtres
// ---------------------------------------------------------------------------

/**
 * Interpole linéairement entre a et b selon t ∈ [0..1].
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * À partir d'une analyse de palette, calcule les paramètres optimaux pour les filtres.
 *
 * Logique :
 * - Map sombre (lum faible) → bloom plus fort pour faire ressortir les lumières
 * - Map déjà saturée (sat élevée) → on n'ajoute pas de saturation supplémentaire
 * - Map chaude (désert, lave) → bloom et saturation réduits car les jaunes/oranges
 *   s'emballent très vite
 */
export function computeFilterParams(analysis: PaletteAnalysis, intensity: 'off' | 'soft' | 'normal' = 'normal'): FilterParams {
  const { avgLuminosity, avgSaturation, temperature } = analysis;

  // Normal: Bloom plus visible [0.15 .. 0.6]
  let bloomStrength = lerp(0.6, 0.15, avgLuminosity);
  let contrastBoost = lerp(0.18, 0.05, avgSaturation);
  let saturationBoost = lerp(0.12, 0.0, avgSaturation);

  if (temperature === 'warm') {
    saturationBoost *= 0.5;
    contrastBoost *= 1.2;
  }

  if (temperature === 'cold') {
    bloomStrength *= 1.15;
    saturationBoost *= 1.2;
  }

  if (intensity === 'soft') {
    bloomStrength *= 0.4;
    contrastBoost *= 0.5;
    saturationBoost *= 0.5;
  }

  return {
    bloomStrength: Math.max(0.02, bloomStrength),
    bloomQuality: 2,
    contrastBoost: Math.max(0.01, contrastBoost),
    saturationBoost: Math.max(0, saturationBoost),
  };
}

// ---------------------------------------------------------------------------
// Construction des filtres PixiJS
// ---------------------------------------------------------------------------

/**
 * Crée et retourne les filtres PixiJS prêts à être appliqués sur le BoardScene.
 * Retourne `null` si la qualité n'est pas 'high'.
 */
export async function buildHighQualityFilters(
  img: HTMLImageElement | ImageBitmap | null,
  overridePalette?: PaletteAnalysis,
  intensity: 'off' | 'soft' | 'normal' = 'normal'
): Promise<[BloomFilter, ColorMatrixFilter] | null> {
  if (intensity === 'off') return null;

  let params: FilterParams;

  if (overridePalette) {
    params = computeFilterParams(overridePalette, intensity);
    console.log('[qualityFilters] Using override palette:', overridePalette);
    console.log('[qualityFilters] Computed filter params:', params);
  } else if (img) {
    const analysis = await analyzeImagePalette(img);
    params = computeFilterParams(analysis, intensity);

    console.log('[qualityFilters] Palette analysis:', analysis);
    console.log('[qualityFilters] Computed filter params:', params);
  } else {
    // Pas d'image ni de palette fournie → valeurs conservatives
    params = {
      bloomStrength: intensity === 'soft' ? 0.05 : 0.2,
      bloomQuality: 2,
      contrastBoost: intensity === 'soft' ? 0.02 : 0.05,
      saturationBoost: intensity === 'soft' ? 0.02 : 0.05,
    };
  }

  const bloom = new BloomFilter({
    strength: params.bloomStrength,
    quality: params.bloomQuality,
    resolution: 1, // Fixé à 1 pour les perfs (évite la surchauffe sur écrans Retina)
  });

  const colorMatrix = new ColorMatrixFilter();
  colorMatrix.contrast(params.contrastBoost, true);
  colorMatrix.saturate(params.saturationBoost, true);

  return [bloom, colorMatrix];
}