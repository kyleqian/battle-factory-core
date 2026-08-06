import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import npcs from "../src/assets/gen/battle-room-npcs.json" with { type: "json" };
import {
  GENERIC_OPPONENT_SHEET,
  opponentSheetForGfx,
  opponentSheetNameForGfx,
} from "../src/engine/battleRoomRender.ts";
import {
  FACILITY_GFX_FALLBACK,
  OBJ_EVENT_GFX,
  TOWER_FEMALE_FACILITY_CLASS_GFX,
  TOWER_MALE_FACILITY_CLASS_GFX,
  type ObjectEventGfxId,
} from "../src/engine/factoryTrainerOverworldGfx.ts";

type NpcSprite = {
  frames: { columns: number; rows: number; tiles: number[][] }[];
  palette: Array<{ r: number; g: number; b: number }>;
};

const opponents = (npcs as { opponents: Record<string, NpcSprite> }).opponents;

// Every OBJ_EVENT_GFX id the tower tables can resolve (factoryTrainerOverworldGfx.ts).
const ALL_TOWER_GFX_IDS = new Set<ObjectEventGfxId>([
  ...TOWER_MALE_FACILITY_CLASS_GFX.map(([, gfx]) => gfx),
  ...TOWER_FEMALE_FACILITY_CLASS_GFX.map(([, gfx]) => gfx),
  FACILITY_GFX_FALLBACK,
]);

describe("battle-room opponent walk-in sheets (battle-room-npcs.json opponents)", () => {
  it("regenerates the committed JSON byte-for-byte from the reference source", () => {
    const paths = [
      "src/assets/gen/battle-room-npcs.json",
      "src/assets/gen/battle-room-tileset.json",
      "src/data/gen/battle-room-layout.json",
    ];
    const before = paths.map((p) => readFileSync(p, "utf8"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-room.ts"], { stdio: "pipe" });
    expect(paths.map((p) => readFileSync(p, "utf8"))).toEqual(before);
  });

  it("extracts every OBJ_EVENT_GFX id the tower tables can produce, each to its own sheet", () => {
    for (const gfxId of ALL_TOWER_GFX_IDS) {
      const name = opponentSheetNameForGfx(gfxId);
      if (gfxId === OBJ_EVENT_GFX.BUG_CATCHER) {
        // BUG_CATCHER's own sheet IS the generic fallback sheet - not a fallback-in-wrongness.
        expect(name).toBe(GENERIC_OPPONENT_SHEET);
      } else {
        expect(name, `gfx id ${gfxId} must not fall back to the generic sheet`).not.toBe(GENERIC_OPPONENT_SHEET);
      }
      expect(opponents[name], `gfx id ${gfxId} resolves to an extracted sheet (${name})`).toBeDefined();
    }
  });

  it("wires every entry of the OBJ_EVENT_GFX const to its own named sheet (no generic aliasing)", () => {
    for (const [constKey, gfxId] of Object.entries(OBJ_EVENT_GFX)) {
      expect(opponentSheetNameForGfx(gfxId)).toBe(constKey);
    }
    const resolvedNames = Object.values(OBJ_EVENT_GFX).map((gfxId) => opponentSheetNameForGfx(gfxId));
    expect(new Set(resolvedNames).size).toBe(Object.keys(OBJ_EVENT_GFX).length);
  });

  it("extracts all 9 standard poses per sheet with 16-color palettes and walk-in frames in range", () => {
    for (const [name, sheet] of Object.entries(opponents)) {
      expect(sheet.frames, name).toHaveLength(9);
      expect(sheet.palette, name).toHaveLength(16);
      for (const frame of sheet.frames) {
        expect(frame.tiles, name).toHaveLength(frame.columns * frame.rows);
        for (const tile of frame.tiles) {
          expect(tile).toHaveLength(64);
          expect(tile.every((v) => v >= 0 && v < 16)).toBe(true);
        }
      }
      // The room's opponent choreography uses walk-south frames 0/3/4 and the
      // settled facing-west frame 2 (battleRoom.ts opponentStep) - all 9 exist.
    }
  });

  it("pins HIKER walk-in fidelity (south-facing frame 0 + npc_1 palette round-trip)", () => {
    const hiker = opponents.HIKER;
    // npc_1.pal entry 1 = (255,213,180) -> gbaRoundTrip -> (255,214,181), oracle-matching.
    expect(hiker.palette[1]).toEqual({ r: 255, g: 214, b: 181 });
    // Frame 0 (face south), tile 2 row 6: the hiker's beard/face row.
    expect(hiker.frames[0].tiles[2].slice(48, 56)).toEqual([0, 7, 6, 6, 7, 7, 6, 6]);
    expect(hiker.frames[0].tiles[3].slice(48, 56)).toEqual([6, 6, 7, 7, 6, 6, 7, 0]);
  });

  it("pins NINJA_BOY fidelity (16x16 2x2-tile frames, facing-west frame 2)", () => {
    const ninja = opponents.NINJA_BOY;
    for (const frame of ninja.frames) {
      expect(frame.columns).toBe(2);
      expect(frame.rows).toBe(2);
      expect(frame.tiles).toHaveLength(4);
    }
    // Frame 2 (face west), bottom-left tile row 0: the front-facing ninja mask.
    expect(ninja.frames[2].tiles[3].slice(0, 8)).toEqual([3, 3, 7, 7, 7, 0, 0, 0]);
    // Top-left tile row 7: head edge above the mask.
    expect(ninja.frames[2].tiles[0].slice(56, 64)).toEqual([0, 0, 0, 4, 3, 3, 15, 3]);
  });

  it("pins CYCLING_TRIATHLETE_M fidelity (32x32 4x4-tile frames)", () => {
    const cyclist = opponents.CYCLING_TRIATHLETE_M;
    for (const frame of cyclist.frames) {
      expect(frame.columns).toBe(4);
      expect(frame.rows).toBe(4);
      expect(frame.tiles).toHaveLength(16);
    }
    // Frame 0 (face south), tile 9 (upper-middle 8x8 of the 32x32 frame) row 0.
    expect(cyclist.frames[0].tiles[9].slice(0, 8)).toEqual([0, 0, 10, 10, 9, 8, 5, 8]);
    expect(cyclist.palette[1]).toEqual({ r: 255, g: 214, b: 181 });
  });

  it("keeps the deterministic generic fallback for an unmapped id", () => {
    const unmapped = 9999 as ObjectEventGfxId;
    expect(opponentSheetNameForGfx(unmapped)).toBe(GENERIC_OPPONENT_SHEET);
    expect(opponentSheetForGfx(unmapped)).toBe(opponents[GENERIC_OPPONENT_SHEET]);
  });
});
