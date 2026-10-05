import { describe, expect, it } from "vitest";
import { foresightAtAge, type ForesightLiveInputs } from "../../src/animation/foresight.ts";

// docs/live-species-audit-2.md 2.7 / ISSUES #145b: the glass legs are InitAnimLinearTranslation arithmetic from the true
// GetBattlerSpriteCoordAttr rectangle; dwell positions measured from the ROM sprite (direct mGBA, AnimForesightMagnifyingGlass_Step).
const base = {
  targetSide: "opponent", targetSpecies: "X", attackerSpecies: "MACHOKE", targetSpriteSlot: 8, glassSpriteSlot: 3, blendTaskSlot: 0,
  updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0, spriteOrder: Array.from({ length: 64 }, (_, i) => i),
  glassPaletteBank: 7, glassTileSlot: 6, matrixBitmap: 6, exactTranslation: true,
  monbg: { layer: "bg1", spriteX: 176, spriteY: 42, bgX: -144, bgY: -10, inBg2: false, battlerId: 1 },
} as unknown as ForesightLiveInputs;
const rig = (b: ForesightLiveInputs["targetBounds"], y: number): ForesightLiveInputs =>
  ({ ...base, targetBounds: b, targetPictureOffset: { x: 176, y } });
const settled = (i: ForesightLiveInputs, age: number) => { const g = foresightAtAge(age, i).glass!; return [g.x + g.x2, g.y + g.y2]; };

describe("Foresight glass exact linear translation", () => {
  it.each([
    ["ONIX 56x64 (pic y 42)", rig({ left: 148, right: 204, top: 10, bottom: 74 }, 42), [[200, 69], [200, 15], [152, 69], [152, 6]]],
    ["GOLBAT 64x64 (pic y 35)", rig({ left: 144, right: 208, top: 3, bottom: 67 }, 35), [[203, 62], [203, 8], [149, 62], [149, -1]]],
  ] as const)("%s dwell positions", (_n, input, dwell) => {
    for (const [k, age] of [20, 38, 56, 74].entries()) expect(settled(input, age)).toEqual(dwell[k]);
  });
});
