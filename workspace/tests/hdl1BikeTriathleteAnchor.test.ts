// hdl1 (docs/hdl1-head-lines-bike-sprite.md, docs/fcr2-catcher-round2.md finding 6): the bike-riding TRIATHLETEs in the battle room.
// gObjectEventGraphicsInfo_CyclingTriathleteM / F (object_event_graphics_info.h:1084-1120) use sAnimTable_AcroBike, whose face and walk
// entries are the standard ones (object_event_anims.h:1006-1014 against :825-833): face west = frame 2, as every room trainer. The
// difference was the width: the ROM centres a sprite on its tile (event_object_movement.c:1461-1463, centerToCornerVecX =
// -(width >> 1), x += 8), so the 32-wide bike sheet stands 8 px left of a 16-wide trainer; ours drew it at the 16-wide left.
// Measured on the fcr2 ROM runs: frame 2 at (120, 56) (seed 9 Scene ON MALIK, ROM 91,800; seed 2 Scene OFF JILL, ROM 112,239), ours
// at (128, 56). The hashes below are those ROM frames' RGB over x 112-159, y 56-87 (the old and new places both inside).
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderBattleRoomEntryScene, opponentSheetNameForGfx } from "../src/engine/battleRoomRender.ts";
import { entryStep, INITIAL_BATTLE_ROOM_STATE, SETTLED_SCENE_ELAPSED } from "../src/engine/battleRoom.ts";
import { getFactoryTrainerPresentation } from "../src/engine/factoryTrainerPresentation.ts";
import { facilityTrainerGfxIdForClass } from "../src/engine/factoryTrainerOverworldGfx.ts";
import { recordDraws } from "../src/engine/drawRecord.ts";
import npcs from "../src/assets/gen/battle-room-npcs.json" with { type: "json" };

type Sheet = { frames: { columns: number; rows: number; tiles: number[][] }[]; palette: { r: number; g: number; b: number }[] };
const SHEETS = (npcs as unknown as { opponents: Record<string, Sheet> }).opponents;

function settledRoom(trainerId: number) {
  const trainer = getFactoryTrainerPresentation(trainerId);
  const fb = new Uint8Array(240 * 160 * 4);
  const { record } = recordDraws(() => renderBattleRoomEntryScene(
    fb, entryStep(SETTLED_SCENE_ELAPSED), SETTLED_SCENE_ELAPSED, 0, 0, undefined,
    { ...INITIAL_BATTLE_ROOM_STATE, trainerPresentation: trainer },
  ));
  const opponent = record.overworldSprites.find((s) => s.role === "room-opponent")!;
  return { trainer, fb, opponent };
}

function cropSha(fb: Uint8Array, x0: number, y0: number, w: number, h: number): string {
  const out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const src = ((y0 + y) * 240 + x0 + x) * 4;
      out.set(fb.subarray(src, src + 3), (y * w + x) * 3);
    }
  }
  return createHash("sha256").update(out).digest("hex");
}

const ROM_SETTLED_CROPS = {
  // .integration/evidence/fcr2/final/s9-on-ws ROM 91,800 (MALIK, CYCLING_TRIATHLETE_M).
  98: "90752a5f4f7bb7ff9975596d8d45bc2ed6a58dc57ca23993d035c64f1d870d9c",
  // .integration/evidence/fcr2/final/s2-off-ws ROM 112,239 (JILL, CYCLING_TRIATHLETE_F).
  99: "aa5de94f15ce10ed257bf49d0c8a80e3fcc3979a8b3f39168f949d443372cc77",
} as const;

describe("hdl1: the bike-riding TRIATHLETEs stand where the ROM draws them", () => {
  it("the two cycling sheets are the room's only 32-wide ones", () => {
    const wide = Object.entries(SHEETS).filter(([, sheet]) => sheet.frames[0]!.columns * 8 !== 16).map(([name]) => name).sort();
    expect(wide).toEqual(["CYCLING_TRIATHLETE_F", "CYCLING_TRIATHLETE_M"]);
  });

  for (const [id, sheetName] of [[98, "CYCLING_TRIATHLETE_M"], [99, "CYCLING_TRIATHLETE_F"]] as const) {
    it(`${sheetName} (trainer ${id}) draws frame 2 at (120, 56), the ROM's pixels`, () => {
      const { trainer, fb, opponent } = settledRoom(id);
      expect(opponentSheetNameForGfx(facilityTrainerGfxIdForClass(trainer.facilityClassId))).toBe(sheetName);
      expect(opponent).toMatchObject({ graphicsId: sheetName, x: 120, y: 56, width: 32, height: 32 });
      // Every opaque pixel of the sheet's frame 2 (face west) is on screen at (120, 56).
      const sheet = SHEETS[sheetName]!;
      const frame = sheet.frames[2]!;
      let opaque = 0;
      for (let ty = 0; ty < 4; ty += 1) for (let tx = 0; tx < 4; tx += 1) {
        const tile = frame.tiles[ty * 4 + tx]!;
        for (let p = 0; p < 64; p += 1) {
          if (tile[p] === 0) continue;
          opaque += 1;
          const { r, g, b } = sheet.palette[tile[p]!]!;
          const at = ((56 + ty * 8 + Math.floor(p / 8)) * 240 + 120 + tx * 8 + (p % 8)) * 4;
          expect([fb[at], fb[at + 1], fb[at + 2]]).toEqual([r, g, b]);
        }
      }
      expect(opaque).toBeGreaterThan(250);
      expect(cropSha(fb, 112, 56, 48, 32)).toBe(ROM_SETTLED_CROPS[id]);
    });
  }

  it("every 16-wide trainer keeps its place (x 128)", () => {
    for (const id of [25, 36, 50, 58]) {
      const { opponent } = settledRoom(id);
      expect([opponent.x, opponent.width], opponent.graphicsId).toEqual([128, 16]);
    }
  });
});
