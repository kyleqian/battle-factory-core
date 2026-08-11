/**
 * Port of SetBattleFacilityTrainerGfxId's facility-class -> overworld-gfx
 * resolution (reference/pokeemerald/src/battle_tower.c:1161-1251): the real
 * game maps a Battle Frontier trainer's `facilityClass` to an
 * OBJ_EVENT_GFX_* id by searching gTowerMaleFacilityClasses[30] first
 * (battle_tower.c:153-185), then gTowerFemaleFacilityClasses[20]
 * (:187-209), reading the parallel gTowerMaleTrainerGfxIds[30]
 * (:211-243) / gTowerFemaleTrainerGfxIds[20] (:245-267); neither-array
 * classes fall back to OBJ_EVENT_GFX_BOY_1 (:1238-1251). The battle room's
 * walk-in sprite is this resolution (src/battle_factory.c:379-382 calls
 * SetBattleFacilityTrainerGfxId(gTrainerBattleOpponent_A, 0)).
 *
 * Facility-class values are the FACILITY_CLASS_* constants
 * (include/constants/trainers.h:123-206); gfx values are the OBJ_EVENT_GFX_*
 * constants (include/constants/event_objects.h:7-98). Trainer identity
 * already carries facilityClassId (factoryTrainerPresentation.ts), so the
 * mapping is keyed by that id alone.
 */

/** OBJ_EVENT_GFX_* ids referenced by the two tower tables (include/constants/event_objects.h). */
export const OBJ_EVENT_GFX = {
  NINJA_BOY: 5,
  BOY_1: 7,
  GIRL_3: 14,
  RICH_BOY: 15,
  POKEFAN_F: 18,
  WOMAN_2: 20,
  EXPERT_M: 21,
  EXPERT_F: 22,
  POKEFAN_M: 25,
  CAMPER: 31,
  PICNICKER: 32,
  MAN_3: 33,
  WOMAN_5: 34,
  YOUNGSTER: 35,
  BUG_CATCHER: 36,
  PSYCHIC_M: 37,
  SCHOOL_KID_M: 38,
  MANIAC: 39,
  HEX_MANIAC: 40,
  BLACK_BELT: 44,
  BEAUTY: 45,
  LASS: 47,
  GENTLEMAN: 48,
  SAILOR: 49,
  FISHERMAN: 50,
  RUNNING_TRIATHLETE_M: 51,
  RUNNING_TRIATHLETE_F: 52,
  TUBER_F: 53,
  TUBER_M: 54,
  HIKER: 55,
  CYCLING_TRIATHLETE_M: 56,
  CYCLING_TRIATHLETE_F: 57,
  MAN_4: 65,
  MAN_5: 66,
} as const satisfies Record<string, number>;

export type ObjectEventGfxId = (typeof OBJ_EVENT_GFX)[keyof typeof OBJ_EVENT_GFX];

/** gTowerMaleFacilityClasses[i] -> gTowerMaleTrainerGfxIds[i], battle_tower.c:153-243. */
export const TOWER_MALE_FACILITY_CLASS_GFX: readonly (readonly [facilityClassId: number, gfxId: ObjectEventGfxId])[] = [
  [0x00, OBJ_EVENT_GFX.HIKER], // FACILITY_CLASS_HIKER
  [0x11, OBJ_EVENT_GFX.TUBER_M], // FACILITY_CLASS_TUBER_M
  [0x03, OBJ_EVENT_GFX.MAN_3], // FACILITY_CLASS_COOLTRAINER_M
  [0x15, OBJ_EVENT_GFX.RICH_BOY], // FACILITY_CLASS_RICH_BOY
  [0x17, OBJ_EVENT_GFX.MANIAC], // FACILITY_CLASS_POKEMANIAC
  [0x07, OBJ_EVENT_GFX.RUNNING_TRIATHLETE_M], // FACILITY_CLASS_SWIMMER_M
  [0x0a, OBJ_EVENT_GFX.BLACK_BELT], // FACILITY_CLASS_BLACK_BELT
  [0x19, OBJ_EVENT_GFX.MAN_5], // FACILITY_CLASS_GUITARIST
  [0x1a, OBJ_EVENT_GFX.MAN_5], // FACILITY_CLASS_KINDLER
  [0x1b, OBJ_EVENT_GFX.CAMPER], // FACILITY_CLASS_CAMPER
  [0x1d, OBJ_EVENT_GFX.MANIAC], // FACILITY_CLASS_BUG_MANIAC
  [0x1e, OBJ_EVENT_GFX.PSYCHIC_M], // FACILITY_CLASS_PSYCHIC_M
  [0x20, OBJ_EVENT_GFX.GENTLEMAN], // FACILITY_CLASS_GENTLEMAN
  [0x26, OBJ_EVENT_GFX.SCHOOL_KID_M], // FACILITY_CLASS_SCHOOL_KID_M
  [0x29, OBJ_EVENT_GFX.POKEFAN_M], // FACILITY_CLASS_POKEFAN_M
  [0x09, OBJ_EVENT_GFX.EXPERT_M], // FACILITY_CLASS_EXPERT_M
  [0x2b, OBJ_EVENT_GFX.YOUNGSTER], // FACILITY_CLASS_YOUNGSTER
  [0x2d, OBJ_EVENT_GFX.FISHERMAN], // FACILITY_CLASS_FISHERMAN
  [0x2e, OBJ_EVENT_GFX.CYCLING_TRIATHLETE_M], // FACILITY_CLASS_CYCLING_TRIATHLETE_M
  [0x30, OBJ_EVENT_GFX.RUNNING_TRIATHLETE_M], // FACILITY_CLASS_RUNNING_TRIATHLETE_M
  [0x32, OBJ_EVENT_GFX.RUNNING_TRIATHLETE_M], // FACILITY_CLASS_SWIMMING_TRIATHLETE_M
  [0x34, OBJ_EVENT_GFX.MAN_3], // FACILITY_CLASS_DRAGON_TAMER
  [0x04, OBJ_EVENT_GFX.MAN_5], // FACILITY_CLASS_BIRD_KEEPER
  [0x35, OBJ_EVENT_GFX.NINJA_BOY], // FACILITY_CLASS_NINJA_BOY
  [0x3a, OBJ_EVENT_GFX.SAILOR], // FACILITY_CLASS_SAILOR
  [0x05, OBJ_EVENT_GFX.MANIAC], // FACILITY_CLASS_COLLECTOR
  [0x42, OBJ_EVENT_GFX.MAN_4], // FACILITY_CLASS_PKMN_BREEDER_M
  [0x44, OBJ_EVENT_GFX.CAMPER], // FACILITY_CLASS_PKMN_RANGER_M
  [0x43, OBJ_EVENT_GFX.BUG_CATCHER], // FACILITY_CLASS_BUG_CATCHER
  [0x00, OBJ_EVENT_GFX.HIKER], // FACILITY_CLASS_HIKER (repeat: gfx differs from index 0's slot)
] as const;

/** gTowerFemaleFacilityClasses[i] -> gTowerFemaleTrainerGfxIds[i], battle_tower.c:187-267. */
export const TOWER_FEMALE_FACILITY_CLASS_GFX: readonly (readonly [facilityClassId: number, gfxId: ObjectEventGfxId])[] = [
  [0x0d, OBJ_EVENT_GFX.WOMAN_2], // FACILITY_CLASS_AROMA_LADY
  [0x10, OBJ_EVENT_GFX.TUBER_F], // FACILITY_CLASS_TUBER_F
  [0x12, OBJ_EVENT_GFX.WOMAN_5], // FACILITY_CLASS_COOLTRAINER_F
  [0x0c, OBJ_EVENT_GFX.HEX_MANIAC], // FACILITY_CLASS_HEX_MANIAC
  [0x13, OBJ_EVENT_GFX.WOMAN_2], // FACILITY_CLASS_LADY
  [0x14, OBJ_EVENT_GFX.BEAUTY], // FACILITY_CLASS_BEAUTY
  [0x1f, OBJ_EVENT_GFX.LASS], // FACILITY_CLASS_PSYCHIC_F
  [0x27, OBJ_EVENT_GFX.GIRL_3], // FACILITY_CLASS_SCHOOL_KID_F
  [0x2a, OBJ_EVENT_GFX.POKEFAN_F], // FACILITY_CLASS_POKEFAN_F
  [0x16, OBJ_EVENT_GFX.EXPERT_F], // FACILITY_CLASS_EXPERT_F
  [0x2f, OBJ_EVENT_GFX.CYCLING_TRIATHLETE_F], // FACILITY_CLASS_CYCLING_TRIATHLETE_F
  [0x31, OBJ_EVENT_GFX.RUNNING_TRIATHLETE_F], // FACILITY_CLASS_RUNNING_TRIATHLETE_F
  [0x33, OBJ_EVENT_GFX.RUNNING_TRIATHLETE_F], // FACILITY_CLASS_SWIMMING_TRIATHLETE_F
  [0x36, OBJ_EVENT_GFX.GIRL_3], // FACILITY_CLASS_BATTLE_GIRL
  [0x37, OBJ_EVENT_GFX.WOMAN_5], // FACILITY_CLASS_PARASOL_LADY
  [0x38, OBJ_EVENT_GFX.RUNNING_TRIATHLETE_F], // FACILITY_CLASS_SWIMMER_F
  [0x1c, OBJ_EVENT_GFX.PICNICKER], // FACILITY_CLASS_PICNICKER
  [0x02, OBJ_EVENT_GFX.WOMAN_2], // FACILITY_CLASS_PKMN_BREEDER_F
  [0x45, OBJ_EVENT_GFX.PICNICKER], // FACILITY_CLASS_PKMN_RANGER_F
  [0x47, OBJ_EVENT_GFX.LASS], // FACILITY_CLASS_LASS
] as const;

/** The neither-array fallback tail (battle_tower.c:1238-1251): always OBJ_EVENT_GFX_BOY_1. */
export const FACILITY_GFX_FALLBACK: ObjectEventGfxId = OBJ_EVENT_GFX.BOY_1;

/**
 * Resolves a facility class to its overworld gfx id exactly as the real
 * game's SetBattleFacilityTrainerGfxId does: search the male classes, then
 * the female classes, then fall back to BOY_1.
 */
export function facilityTrainerGfxIdForClass(facilityClassId: number): ObjectEventGfxId {
  for (const [classId, gfxId] of TOWER_MALE_FACILITY_CLASS_GFX) {
    if (classId === facilityClassId) return gfxId;
  }
  for (const [classId, gfxId] of TOWER_FEMALE_FACILITY_CLASS_GFX) {
    if (classId === facilityClassId) return gfxId;
  }
  return FACILITY_GFX_FALLBACK;
}
