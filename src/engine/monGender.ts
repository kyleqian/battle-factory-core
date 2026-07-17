// GetGenderFromSpeciesAndPersonality (reference/pokeemerald/src/pokemon.c:3471-3485):
// genderRatio is either a fixed literal (MON_MALE=0x00/MON_FEMALE=0xFE/
// MON_GENDERLESS=0xFF) or a 0-254 threshold compared against the personality
// value's low byte. Species data (genderRatio per species) lives in
// src/data/gen/summary-info.json; this is the pure per-mon half.

export type MonGender = "male" | "female" | "genderless";

const MON_MALE = 0x00;
const MON_FEMALE = 0xfe;
const MON_GENDERLESS = 0xff;

export function getMonGender(genderRatio: number, personality: number): MonGender {
  if (genderRatio === MON_MALE) return "male";
  if (genderRatio === MON_FEMALE) return "female";
  if (genderRatio === MON_GENDERLESS) return "genderless";
  return genderRatio > (personality & 0xff) ? "female" : "male";
}
