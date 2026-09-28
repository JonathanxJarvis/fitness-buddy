import type { UnitSystem } from './types';

export const LB_PER_KG = 2.20462;
export const CM_PER_IN = 2.54;
export const ML_PER_FLOZ = 29.5735;
export const G_PER_OZ = 28.3495;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (inches: number) => inches * CM_PER_IN;
export const mlToFlOz = (ml: number) => ml / ML_PER_FLOZ;
export const flOzToMl = (oz: number) => oz * ML_PER_FLOZ;

export function formatWeight(kg: number, units: UnitSystem, digits = 1): string {
  return units === 'us' ? `${kgToLb(kg).toFixed(digits)} lb` : `${kg.toFixed(digits)} kg`;
}

export function weightValue(kg: number, units: UnitSystem): number {
  return units === 'us' ? kgToLb(kg) : kg;
}

export function weightToKg(value: number, units: UnitSystem): number {
  return units === 'us' ? lbToKg(value) : value;
}

export const weightUnit = (units: UnitSystem) => (units === 'us' ? 'lb' : 'kg');

export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const total = Math.round(cmToIn(cm));
  return `${Math.floor(total / 12)}′ ${total % 12}″`;
}

export function formatWater(ml: number, units: UnitSystem): string {
  return units === 'us' ? `${Math.round(mlToFlOz(ml))} fl oz` : `${Math.round(ml)} ml`;
}

export const waterUnit = (units: UnitSystem) => (units === 'us' ? 'fl oz' : 'ml');

export function waterValue(ml: number, units: UnitSystem): number {
  return units === 'us' ? mlToFlOz(ml) : ml;
}

/** Glass size used for the quick-add water buttons. */
export function glassMl(units: UnitSystem): number {
  return units === 'us' ? flOzToMl(8) : 250;
}
