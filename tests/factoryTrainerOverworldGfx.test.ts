// Tier-1 pins for the SetBattleFacilityTrainerGfxId port
// (src/engine/factoryTrainerOverworldGfx.ts) - the facility-class ->
// OBJ_EVENT_GFX_* resolution the battle room's opponent walk-in sprite
// consumes (reference/pokeemerald/src/battle_tower.c:1161-1251).
import { describe, expect, it } from "vitest";
import {
  FACILITY_GFX_FALLBACK,
  OBJ_EVENT_GFX,
  TOWER_FEMALE_FACILITY_CLASS_GFX,
  TOWER_MALE_FACILITY_CLASS_GFX,
  facilityTrainerGfxIdForClass,
} from "../src/engine/factoryTrainerOverworldGfx.ts";
import {
  getFactoryTrainerPresentation,
} from "../src/engine/factoryTrainerPresentation.ts";

describe("factoryTrainerOverworldGfx: SetBattleFacilityTrainerGfxId port", () => {
  it("maps trainer 9 LILIANA (FACILITY_CLASS_SCHOOL_KID_F = 0x27) to OBJ_EVENT_GFX_GIRL_3 (female index 7)", () => {
    const presentation = getFactoryTrainerPresentation(9);
    expect(presentation).toMatchObject({ trainerId: 9, name: "LILIANA" });
    expect(presentation.facilityClassId).toBe(0x27);
    expect(facilityTrainerGfxIdForClass(presentation.facilityClassId)).toBe(OBJ_EVENT_GFX.GIRL_3);
  });

  it("maps a male-array class (trainer 50 DESTIN, FACILITY_CLASS_BUG_CATCHER = 0x43) to OBJ_EVENT_GFX_BUG_CATCHER (male index 28)", () => {
    const presentation = getFactoryTrainerPresentation(50);
    expect(presentation.facilityClassId).toBe(0x43);
    expect(facilityTrainerGfxIdForClass(presentation.facilityClassId)).toBe(OBJ_EVENT_GFX.BUG_CATCHER);
  });

  it("falls back to OBJ_EVENT_GFX_BOY_1 for a class in neither tower array (FACILITY_CLASS_MAGMA_GRUNT_M = 0x8)", () => {
    expect(facilityTrainerGfxIdForClass(0x08)).toBe(FACILITY_GFX_FALLBACK);
    expect(FACILITY_GFX_FALLBACK).toBe(OBJ_EVENT_GFX.BOY_1);
  });

  it("mirrors the source table sizes; the one duplicate is HIKER at both male slots 0 and 29 (source-faithful)", () => {
    expect(TOWER_MALE_FACILITY_CLASS_GFX).toHaveLength(30);
    expect(TOWER_FEMALE_FACILITY_CLASS_GFX).toHaveLength(20);
    const maleIds = TOWER_MALE_FACILITY_CLASS_GFX.map(([id]) => id);
    expect(new Set(maleIds).size).toBe(29);
    expect(TOWER_MALE_FACILITY_CLASS_GFX[0]).toEqual([0x00, OBJ_EVENT_GFX.HIKER]);
    expect(TOWER_MALE_FACILITY_CLASS_GFX[29]).toEqual([0x00, OBJ_EVENT_GFX.HIKER]);
    const femaleIds = TOWER_FEMALE_FACILITY_CLASS_GFX.map(([id]) => id);
    expect(new Set(femaleIds).size).toBe(20);
  });
});
