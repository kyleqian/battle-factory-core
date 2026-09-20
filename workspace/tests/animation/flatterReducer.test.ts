import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  flatterAtAge,
  type FlatterLiveInputs,
} from "../../src/animation/flatter.ts";
import {
  sceneOnFlatterView,
  type SceneOnFlatterPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  flatterConfigFor,
  flatterInputsFor,
  verifyFlatterReducer,
} from "../../tools/compare/verifyFlatterReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_FLATTER source-relative reducer and narrow Scene-ON seam", () => {
  it("replays both complete retained bilateral windows twice without framebuffer or coverage credit", () => {
    const first = verifyFlatterReducer();
    expect(verifyFlatterReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": {
        retainedRows: 219,
        reducerRows: 438,
        seamRows: 438,
        reducerSha256: "3db6bdfc9610d77f74e10d02b4f76e38795cd381fe629b371a07f3e4240d6c9e",
        seamSha256: "3db6bdfc9610d77f74e10d02b4f76e38795cd381fe629b371a07f3e4240d6c9e",
        framebufferCompared: false,
        coverageCredit: false,
      },
      "opponent-front": {
        retainedRows: 219,
        reducerRows: 438,
        seamRows: 438,
        reducerSha256: "165e72204099d1c549964a23c62e87286704779febba4ba630d1fe1965993a7e",
        seamSha256: "165e72204099d1c549964a23c62e87286704779febba4ba630d1fe1965993a7e",
        framebufferCompared: false,
        coverageCredit: false,
      },
      allWindows: {
        retainedRows: 438,
        passes: 2,
        reducerRows: 876,
        seamRows: 876,
        reducerSha256: "20ab1a02dfdc01641bd641b9d3d5045ed566fcf2f941e5555397a0c283629272",
        seamSha256: "20ab1a02dfdc01641bd641b9d3d5045ed566fcf2f941e5555397a0c283629272",
        framebufferCompared: false,
        coverageCredit: false,
      },
    });
  });

  it("pins the source cursor, spotlight edge, fade windows, resource ages, and cleanup boundary", () => {
    const input = flatterInputsFor("player-back", 0);
    expect(flatterAtAge(0, input).source).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(flatterAtAge(7, input).source).toMatchObject({ pointerOffset: 41, wait: 1 });
    expect(flatterAtAge(49, input).source).toMatchObject({ pointerOffset: 57, wait: -1 });
    expect(flatterAtAge(51, input).source).toMatchObject({ pointerOffset: 72, wait: 10 });
    expect(flatterAtAge(63, input).source).toMatchObject({ pointerOffset: 87, wait: -1 });
    expect(flatterAtAge(65, input).source).toMatchObject({ pointerOffset: 242, wait: 0 });
    expect(flatterAtAge(67, input).source).toMatchObject({ pointerOffset: 195, wait: 5 });
    expect(flatterAtAge(75, input).source).toMatchObject({ pointerOffset: 206, wait: 1 });
    expect(flatterAtAge(176, input).source).toMatchObject({ pointerOffset: 224, wait: 1 });
    expect(flatterAtAge(218, input).source).toMatchObject({ pointerOffset: 232, wait: 0, active: false });

    expect(flatterAtAge(49, input).spotlight).toMatchObject({ matrix: [4096, 0, 0, 170], phase: 0, flags: 1 });
    expect(flatterAtAge(68, input).spotlight).toMatchObject({ matrix: [240, 0, 0, 170] });
    expect(flatterAtAge(69, input).spotlight).toMatchObject({ matrix: [227, 0, 0, 170] });
    expect(flatterAtAge(154, input).spotlight).toMatchObject({ matrix: [215, 0, 0, 170] });
    expect(flatterAtAge(174, input).spotlight).toMatchObject({ matrix: [4096, 0, 0, 170], flags: 5 });
    expect(flatterAtAge(175, input).spotlight).toBeNull();
    expect(flatterAtAge(7, input).tasks).toHaveLength(1);
    expect(flatterAtAge(48, input).tasks).toHaveLength(0);
    expect(flatterAtAge(176, input).tasks).toHaveLength(1);
    expect(flatterAtAge(217, input).tasks).toHaveLength(0);
    expect(flatterAtAge(217, input).resources).toMatchObject({ spotlightLoaded: true, confettiLoaded: true });
    expect(flatterAtAge(218, input)).toMatchObject({
      active: false,
      spotlight: null,
      verticalDips: [],
      confetti: [],
      tasks: [],
      cleanup: { firstInactive: true, resourcesReleased: true, visualTasks: 0, soundTasks: 0 },
      resources: { spotlightLoaded: false, confettiLoaded: false, spotlightTag: null, confettiTag: null },
    });
  });

  it("consumes materially altered live presentation inputs through the typed seam while gameplay remains caller-owned", () => {
    const input = flatterInputsFor("player-back", 75);
    const gameplayRng = Object.freeze({ opaque: "caller-gameplay-rng", seed: 0x0bad_c0de });
    const gameplayState = Object.freeze({ opaque: "caller-gameplay-state", turn: 7 });
    const altered: FlatterLiveInputs = {
      ...input,
      attackerSide: "opponent",
      targetSide: "player",
      attackerSpecies: "CROBAT",
      targetSpecies: "BLISSEY",
      attackerCenter: { x: 202, y: 46 },
      targetCenter: { x: 37, y: 116 },
      targetSpriteOrigin: { x: 35, y: 91 },
      attackerInitialOffset: { x2: 2, y2: -3 },
      targetInitialOffset: { x2: -4, y2: 2 },
      attackerArt: { slot: 21, attr: [114, 0xc0a9, 0x6d23], subpriority: 54, matrixNum: 5, matrix: [256, 4, -4, 256] },
      targetArt: { slot: 22, attr: [116, 0xc0aa, 0x6d24], subpriority: 55, matrixNum: 6, matrix: [384, -4, 4, 384] },
      spotlight: { slot: 11, attr: [118, 0xc0ab, 0x6d25], subpriority: 56, matrixNum: 7 },
      verticalDipSlots: [12, 13],
      confetti: input.confetti.map((allocation, index) => ({
        ...allocation,
        slot: 24 + index,
        initial: {
          ...allocation.initial,
          x2: index,
          y2: -index,
          data: [0x5e0 + index, 0x480 - index, index & 1, allocation.initial.data[3] ?? 0],
        },
      })),
      taskSlots: { hardwarePaletteFade: 7 },
      spriteOrder: Array.from({ length: 64 }, (_, slot) => 63 - slot),
      buffers: {
        softwareOam: [{ owner: "altered-software-oam" }],
        hardwareOam: [{ owner: "altered-hardware-oam" }],
        softwareMatrices: [[1024, 1, -1, 1024]],
        hardwareMatrices: [[2048, -1, 1, 2048]],
      },
      palette: { unfaded: [1, 2, 3], faded: [4, 5, 6], hardware: [7, 8, 9] },
      registers: { dispcnt: 0x1234, bldcnt: 0x3f40, callerOwned: 0x2468 },
      resources: {
        spotlightTag: 0xaaaa,
        confettiTag: 0xbbbb,
        spotlightTileSlot: 31,
        spotlightPaletteSlot: 14,
        confettiTileSlot: 32,
        confettiPaletteSlot: 15,
        allocator: { allocation: "caller-resource-history" },
      },
      audio: { current: { output: "caller-audio" }, attackerPan: 63, targetPan: -64 },
      liveCounts: { visualTasks: 4, soundTasks: 2, matrixBitmap: 0x41 },
      animationRng: 0x1234_5678,
      gameplayRng,
      gameplayState,
    };
    const before = JSON.stringify(altered);
    const baseline = flatterAtAge(75, input);
    const alteredState = flatterAtAge(75, altered);
    expect(alteredState).not.toEqual(baseline);
    expect(alteredState).toMatchObject({
      battlers: {
        attacker: { side: "opponent", species: "CROBAT", center: { x: 202, y: 46 }, offset: { x2: 2, y2: -3 }, art: { slot: 21 } },
        target: { side: "player", species: "BLISSEY", center: { x: 37, y: 116 }, offset: { x2: -4 }, art: { slot: 22 } },
      },
      spotlight: { slot: 11, x: 37, y: 106, matrixNum: 7 },
      verticalDips: expect.arrayContaining([expect.objectContaining({ slot: 13, x: 35, y: 91 })]),
      confetti: expect.arrayContaining([expect.objectContaining({ slot: 24, x2: 50, y2: -32 })]),
      resources: { spotlightTag: 0xaaaa, confettiTag: 0xbbbb, spotlightTileSlot: 31, confettiPaletteSlot: 15, allocator: { allocation: "caller-resource-history" }, matrixBitmap: 0x41 },
      painterOrder: altered.spriteOrder,
      buffers: altered.buffers,
      palette: altered.palette,
      registers: altered.registers,
      audio: { live: { output: "caller-audio" }, events: [{ channel: "SE1", sound: "SE_M_FLATTER", pan: -64 }] },
      rng: { animation: 0x1234_5678, gameplay: gameplayRng, gameplayUnchanged: true },
      gameplay: gameplayState,
    });
    expect(flatterAtAge(176, altered).tasks).toEqual([expect.objectContaining({ slot: 7, role: "restore-battle" })]);
    expect(JSON.stringify(altered)).toBe(before);
    expect(gameplayRng).toEqual({ opaque: "caller-gameplay-rng", seed: 0x0bad_c0de });
    expect(gameplayState).toEqual({ opaque: "caller-gameplay-state", turn: 7 });

    const seam = sceneOnFlatterView({ age: 75, config: flatterConfigFor("player-back", 75, altered) } as SceneOnFlatterPresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(alteredState);
    expect(attacker.geometry.side).toBe("opponent");
    expect(target.geometry.side).toBe("player");
  });

  it("keeps the reducer source-derived and the retained evidence outside production and coverage", () => {
    const source = readFileSync(resolve(root, "src/animation/flatter.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party|reference)[^"']*["']/u);
    expect(source).not.toMatch(/absolute\s*(?:battle\s*)?(?:tick|frame)|framebuffer|controller-frame/iu);
    const data = coverage as Json;
    expect(data.entries.some((entry: Json) => entry.move === "MOVE_FLATTER")).toBe(false);
  });
});
