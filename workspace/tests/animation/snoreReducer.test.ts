import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import { SNORE_FIRST_INACTIVE_AGE, snoreAtAge, snoreSourceAtAge, type SnoreLiveInputs } from "../../src/animation/snore.ts";
import { sceneOnSnoreView, type SceneOnSnorePresentationState } from "../../src/animation/sceneOnPresentation.ts";
import { snoreConfigFor, snoreInputsFor, verifySnoreReducer } from "../../tools/compare/verifySnoreReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("MOVE_SNORE pure source-age reducer and narrow Scene-ON seam", () => {
  it("replays all 140 retained bilateral rows twice through both layers", () => {
    const first = verifySnoreReducer();
    expect(verifySnoreReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 70, reducerRows: 140, seamRows: 140, cleanup: 69, reducerSha256: expect.stringMatching(/^[0-9a-f]{64}$/u), seamSha256: expect.stringMatching(/^[0-9a-f]{64}$/u), framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 70, reducerRows: 140, seamRows: 140, cleanup: 69, reducerSha256: expect.stringMatching(/^[0-9a-f]{64}$/u), seamSha256: expect.stringMatching(/^[0-9a-f]{64}$/u), framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 140, passes: 2, reducerRows: 280, seamRows: 280, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("keeps both SnoreEffect calls, all twelve Z lives, schedules, latches, and cleanup source-relative", () => {
    const input = snoreInputsFor("player-back");
    expect(snoreSourceAtAge(0)).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(snoreSourceAtAge(7)).toMatchObject({ pointerOffset: 15, wait: 30, active: true });
    expect(snoreSourceAtAge(39)).toMatchObject({ pointerOffset: 20, wait: 1, active: true });
    expect(snoreSourceAtAge(SNORE_FIRST_INACTIVE_AGE)).toMatchObject({ pointerOffset: 24, wait: 1, active: false });
    expect(snoreAtAge(7, input)).toMatchObject({
      effect: { call: 1, localAge: 0, callsStarted: 1 },
      sprites: { z: [{ callback: "AnimTranslateLinear_WithFollowup" }, {}, {}], platform: { callback: "AnimShakeMonOrBattlePlatforms_Step" } },
      audio: { events: [{ sound: "SE_M_SNORE", pan: "attacker", call: 1 }] },
      background: { registers: { bldcnt: 0x3f40, bldalpha: 0x0808 } },
    });
    expect(snoreAtAge(39, input)).toMatchObject({ effect: { call: 2, localAge: 0, callsStarted: 2 }, sprites: { z: [{}, {}, {}] } });
    expect(snoreAtAge(SNORE_FIRST_INACTIVE_AGE, input)).toMatchObject({
      active: false, tasks: [], sprites: { z: [], platform: null }, resources: { snoreZ: { loaded: false, tag: null } },
      cleanup: { firstInactive: true, visualTasks: 0, soundTasks: 0, resourcesReleased: true },
    });
  });

  it("materially changes species, picture origin, palette, geometry and allocation through the typed seam while gameplay stays opaque", () => {
    const input = snoreInputsFor("player-back");
    const gameplayRng = Object.freeze({ opaque: "gameplay-rng", value: 0x0badc0de });
    const gameplayState = Object.freeze({ opaque: "battle-state", turn: 17 });
    const palette = input.resource.palette.map((color, index) => (color ^ (index * 37 + 0x421)) & 0x7fff);
    const zSlots = [10, 11, 12] as const;
    const altered: SnoreLiveInputs = {
      ...input, attackerSide: "opponent", targetSide: "player", attackerSpecies: "WAILORD", targetSpecies: "BLISSEY",
      attackerPictureOrigin: { x: 201, y: 37 }, targetPictureOrigin: { x: 39, y: 121 },
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 45, attr: [13, 0xc0a9, 0x6d23], subpriority: 55, oamPriority: 3, matrixNum: 0, matrix: [256,0,0,256] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 113, attr: [81, 0xc007, 0x4123], subpriority: 14, oamPriority: 0 },
      taskSlots: { scale: 5, monbg: 6, targetShake: 7, clearMonbg: 8 }, scaleMatrixNum: 6,
      effectAllocations: input.effectAllocations.map((entry, call) => ({
        platform: { ...entry.platform, slot: 13 + call, subpriority: 52 - call },
        z: entry.z.map((allocation, index) => ({ ...allocation, slot: zSlots[index] + call * 3, attr: [allocation.attr[0], allocation.attr[1], 0x8900 + index], subpriority: 50 - index, oamPriority: 2 })),
      })),
      resource: { tag: 10197, tileSlot: 31, paletteAllocatorSlot: 8, paletteBank: 24, tileRange: [620, 16], palette },
      allocator: { ...input.allocator, matrixBitmap: 0x95, spriteOrder: input.allocator.spriteOrder.slice().reverse() },
      background: { ...input.background, values: { ...input.background.values, callerOwnedAxis: 73 }, registers: { ...input.background.registers, callerOwnedRegister: 0x2468 }, monbg: { bg: 1, activeCnt: 0x5c02, paletteBank: 7 } },
      animationRngSeed: 0x12345678, gameplayRng, gameplayState,
    };
    const baseline = snoreAtAge(16, input), changed = snoreAtAge(16, altered);
    expect(changed).not.toEqual(baseline);
    expect(digest(changed)).not.toBe(digest(baseline));
    expect(changed).toMatchObject({
      battlers: { attacker: { side: "opponent", species: "WAILORD", pictureOrigin: { x: 201, y: 37 }, sprite: { slot: 21, matrixNum: 6 } }, target: { side: "player", species: "BLISSEY", pictureOrigin: { x: 39, y: 121 }, sprite: { slot: 22 } } },
      resources: { snoreZ: { allocation: { tileSlot: 31, paletteAllocatorSlot: 8, paletteBank: 24 } }, matrixBitmap: 0x95 },
      rng: { gameplay: gameplayRng, gameplayState, gameplayUnchanged: true },
    });
    expect(changed.sprites.z.map((entry) => [entry.slot, entry.x, entry.y, entry.attr[2]])).not.toEqual(baseline.sprites.z.map((entry) => [entry.slot, entry.x, entry.y, entry.attr[2]]));
    expect(changed.painterOrder).not.toEqual(baseline.painterOrder);
    expect(changed.palette.faded.slice(24 * 16, 25 * 16)).toEqual(palette);
    expect(changed.background.values.callerOwnedAxis).toBe(73);
    expect(changed.background.registers.callerOwnedRegister).toBe(0x2468);

    const config = snoreConfigFor("player-back");
    const { attackerSide: _aSide, targetSide: _tSide, attackerSpecies: _aSpecies, targetSpecies: _tSpecies, attackerPictureOrigin: _aOrigin, targetPictureOrigin: _tOrigin, ...animationInputs } = altered;
    const seam = sceneOnSnoreView({ age: 16, config: { ...config,
      attacker: { ...config.attacker, species: "WAILORD" as never, geometry: { ...config.attacker.geometry, side: "opponent", animationCenter: altered.attackerPictureOrigin, battlePositionCenter: { x: 201, y: 45 } } },
      target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", animationCenter: altered.targetPictureOrigin, battlePositionCenter: { x: 39, y: 113 } } }, animationInputs } } as SceneOnSnorePresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(changed);
    expect(attacker.species).toBe("WAILORD"); expect(target.species).toBe("BLISSEY");
    expect(gameplayRng).toEqual({ opaque: "gameplay-rng", value: 0x0badc0de });
    expect(gameplayState).toEqual({ opaque: "battle-state", turn: 17 });
  });

  it("keeps production evidence-free and MOVE_SNORE unsupported", () => {
    const source = readFileSync(resolve(root, "src/animation/snore.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    expect(source).not.toMatch(/absolute\s*(?:battle\s*)?(?:tick|frame)|framebuffer|controller-frame/iu);
    const data = coverage as Json;
    expect(data.queue).not.toContain("MOVE_SNORE");
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_SNORE")).toBeUndefined();
    expect(JSON.stringify(data.componentTracks.filter((track: Json) => track.representatives?.includes("MOVE_SNORE")))).toBe("[]");
  });
});
