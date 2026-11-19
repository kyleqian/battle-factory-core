// Gen-3 stat formulas, matching reference/pokeemerald/src/pokemon.c's
// CalculateMonStats / CALC_STAT macro exactly (verified against a RAM dump
// of the anchor's six rental mons - see tests for the cross-check).

export type NatureModifier = -1 | 0 | 1;

export function calculateHpStat(base: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

export const SPECIES_SHEDINJA = 303;

// CalculateMonStats (pokemon.c:2845): `if (species == SPECIES_SHEDINJA) newMaxHP = 1;`. A fresh mon (hp 0, max 0)
// then takes currentHP = 1 (`if (currentHP != 0 || oldMaxHP == 0) currentHP = 1`), i.e. full HP stays full.
export function calculateMaxHp(species: number, base: number, iv: number, ev: number, level: number): number {
  return species === SPECIES_SHEDINJA ? 1 : calculateHpStat(base, iv, ev, level);
}

export function calculateOtherStat(base: number, iv: number, ev: number, level: number, natureModifier: NatureModifier): number {
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  if (natureModifier === 1) return Math.floor((raw * 110) / 100);
  if (natureModifier === -1) return Math.floor((raw * 90) / 100);
  return raw;
}
