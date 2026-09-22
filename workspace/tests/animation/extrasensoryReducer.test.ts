import { describe, expect, it } from "vitest";
import {
  EXTRASENSORY_FIRST_INACTIVE_AGE,
  extrasensoryAtAge,
  extrasensorySourceAtAge,
} from "../../src/animation/extrasensory.ts";
import {
  extrasensoryInputsFor,
  verifyExtrasensoryReducer,
} from "../../tools/compare/verifyExtrasensoryReducer.ts";

describe("MOVE_EXTRASENSORY source-relative reducer and typed Scene-ON seam", () => {
  it("replays all 322 bilateral rows twice through the component and seam", () => {
    const first = verifyExtrasensoryReducer();
    expect(verifyExtrasensoryReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { rows: 161, passes: 2, componentRows: 322, seamRows: 322,
        componentSha256: "a58c6b13ef148dda82b392db6a9f28005888f2089d77d7fa666fba4e05a0d142",
        seamSha256: "a58c6b13ef148dda82b392db6a9f28005888f2089d77d7fa666fba4e05a0d142" },
      "opponent-front": { rows: 161, passes: 2, componentRows: 322, seamRows: 322,
        componentSha256: "46271a3de2a7f4117da8c2006d49072c920291563d1e1534dd57de39b3539939",
        seamSha256: "46271a3de2a7f4117da8c2006d49072c920291563d1e1534dd57de39b3539939" },
      bilateral: { rows: 322, passes: 2, componentRows: 644, seamRows: 644 },
    });
  });

  it("pins the three distortion programs, two blend programs, clone lifecycle, and cleanup", () => {
    expect(extrasensorySourceAtAge(0)).toMatchObject({ pointer: 0x082cefec, active: true });
    expect(extrasensorySourceAtAge(42)).toMatchObject({ pointer: 0x082cf014, wait: 1 });
    expect(extrasensorySourceAtAge(68)).toMatchObject({ pointer: 0x082cf033, wait: 1 });
    expect(extrasensorySourceAtAge(94)).toMatchObject({ pointer: 0x082cf04a, wait: 1 });
    for (const [age, stage, program] of [[42, 0, [2, 5, 64]], [68, 1, [2, 5, 192]],
      [94, 2, [4, 4, 0]]] as const) {
      const state = extrasensoryAtAge(age, extrasensoryInputsFor("player-back", undefined, age));
      expect(state.distortion).toMatchObject({ active: true, stage, lower: 8, upper: 72 });
      expect(state.tasks).toEqual(expect.arrayContaining([
        expect.objectContaining({ callback: "AnimTask_ExtrasensoryDistortion_Step",
          data: expect.arrayContaining([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, -144,
            ...program]) }),
      ]));
    }
    expect(extrasensoryAtAge(94, extrasensoryInputsFor("player-back", undefined, 94)))
      .toMatchObject({ clone: { slot: 3, matrixNum: 0 }, cleanup: { cloneSprites: 1 } });
    expect(extrasensoryAtAge(118, extrasensoryInputsFor("player-back", undefined, 118)))
      .toMatchObject({ clone: null, cleanup: { cloneSprites: 0 } });
    expect(extrasensoryAtAge(EXTRASENSORY_FIRST_INACTIVE_AGE,
      extrasensoryInputsFor("player-back", undefined, EXTRASENSORY_FIRST_INACTIVE_AGE)))
      .toMatchObject({ active: false, tasks: [], targetOnMonBg: false,
        cleanup: { firstInactive: true, visualTasks: 0, soundTasks: 0,
          matrixBitmap: 6, ownedTasks: 0, cloneSprites: 0 } });
  });

  it("changes with live side/species/geometry/buffers while preserving opaque gameplay", () => {
    const age = 100;
    const input = extrasensoryInputsFor("player-back", undefined, age);
    const baseline = extrasensoryAtAge(age, input);
    const altered = extrasensoryAtAge(age, { ...input,
      attackerSide: "opponent", targetSide: "player",
      attackerSpecies: "CROBAT", targetSpecies: "BLISSEY",
      attackerCenter: { x: 200, y: 42 }, targetCenter: { x: 40, y: 114 },
      spriteOrder: [...input.spriteOrder].reverse(),
      registers: { ...input.registers, bldy: 7 },
      animationRng: input.animationRng ^ 0x12345678,
    });
    expect(altered).not.toEqual(baseline);
    expect(altered.gameplay).toBe(input.gameplayState);
    expect(altered.rng.gameplay).toBe(input.gameplayRng);
    expect(altered.rng.gameplayUnchanged).toBe(true);
  });
});
