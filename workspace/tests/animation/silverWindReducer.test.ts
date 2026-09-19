import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  silverWindAtAge,
  type SilverWindLiveInputs,
} from "../../src/animation/silverWind.ts";
import {
  sceneOnSilverWindView,
  type SceneOnSilverWindPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  silverWindConfigFor,
  silverWindInputsFor,
  verifySilverWindReducer,
} from "../../tools/compare/verifySilverWindReducer.ts";

const root = resolve(import.meta.dirname, "../..");

describe("MOVE_SILVER_WIND source-relative reducer and narrow Scene-ON seam", () => {
  it("replays every retained bilateral row twice through reducer and typed seam", () => {
    const first = verifySilverWindReducer();
    expect(verifySilverWindReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 193, reducerRows: 386, seamRows: 386, cleanup: 192, framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 196, reducerRows: 392, seamRows: 392, cleanup: 195, framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 389, passes: 2, reducerRows: 778, seamRows: 778, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("uses live side, identity, picture geometry, allocations, registers, palette, order and presentation RNG while gameplay stays opaque", () => {
    const input = silverWindInputsFor("player-back");
    const changedUnfaded = input.palettes.unfaded.slice();
    changedUnfaded[500] = (changedUnfaded[500]! ^ 0x7fff) & 0x7fff;
    const altered: SilverWindLiveInputs = {
      ...input,
      attackerSide: "opponent", targetSide: "player",
      attackerSpecies: "CHARIZARD", targetSpecies: "BLISSEY",
      attackerPictureOrigin: { x: 199, y: 41 }, targetPictureOrigin: { x: 37, y: 119 },
      attackerSprite: { ...input.attackerSprite, slot: 41, x: 199, y: 41, subpriority: 55, matrixNum: 6, matrix: [192, 16, -16, 192] },
      targetSprite: { ...input.targetSprite, slot: 42, x: 37, y: 119, subpriority: 14, matrixNum: 7, matrix: [224, 0, 0, 224] },
      taskSlots: { pan: 9, monbg: 10, firstExclude: 11, firstFade: 12, slidingBg: 13, clearMonbg: 14, restoreFade: 15, secondExclude: 16 },
      sparkleSlots: input.sparkleSlots.map((allocation, index) => ({
        ...allocation, slot: allocation.slot + 80, matrixNum: (allocation.matrixNum + 8) % 32,
        subpriority: allocation.subpriority + index + 1, oamPriority: ((allocation.oamPriority + 1) & 3) as 0 | 1 | 2 | 3,
      })).reverse(),
      resources: { sparkle6: { ...input.resources.sparkle6, tileSlot: 31, tileRange: [620, 1], paletteAllocatorSlot: 9, paletteBank: 25 } },
      allocator: {
        ...input.allocator, initialMatrixBitmap: 0x95,
        spriteOrder: input.allocator.spriteOrder.slice().reverse(),
        initialSprites: input.allocator.initialSprites.map((sprite) => ({ ...sprite, subpriority: sprite.subpriority + 3 })),
      },
      palettes: { ...input.palettes, unfaded: changedUnfaded },
      background: {
        ...input.background,
        values: { ...input.background.values, callerOwnedAxis: 73 },
        registers: { ...input.background.registers, callerOwnedRegister: 0x2468 },
        monbg: { bg: 2, paletteBank: 9, activeCnt: 0x5e02, splitBg1Cnt: 0x5c01, splitBg2Cnt: 0x5e02 },
        bugBackground: { player: "LIVE_BUG_PLAYER", opponent: "LIVE_BUG_OPPONENT" },
        bugBackgroundTaskId: { player: 91, opponent: 92 },
      },
      animationRngSeed: 0x12345678,
      gameplayRng: { opaque: "gameplay-rng" }, gameplayState: { opaque: "gameplay-state" },
    };
    const baseline = silverWindAtAge(80, input);
    const changed = silverWindAtAge(80, altered);
    expect(changed).not.toEqual(baseline);
    expect(changed).toMatchObject({
      battlers: {
        attacker: { side: "opponent", species: "CHARIZARD", pictureOrigin: { x: 199, y: 41 }, sprite: { slot: 41, x: 199, matrixNum: 6 } },
        target: { side: "player", species: "BLISSEY", pictureOrigin: { x: 37, y: 119 }, sprite: { slot: 42, x: 37, matrixNum: 7 } },
      },
      resources: { sparkle6: { allocation: { tileSlot: 31, paletteAllocatorSlot: 9, paletteBank: 25 } } },
      rng: { gameplay: { opaque: "gameplay-rng" }, gameplayState: { opaque: "gameplay-state" }, gameplayUnchanged: true },
    });
    expect(changed.sprites.map((sprite) => sprite.slot)).not.toEqual(baseline.sprites.map((sprite) => sprite.slot));
    expect(changed.painterOrder).not.toEqual(baseline.painterOrder);
    expect(changed.palette.unfaded[500]).toBe(changedUnfaded[500]);
    expect(changed.background.values.callerOwnedAxis).toBe(73);
    expect(changed.registers.callerOwnedRegister).toBe(0x2468);
    expect(changed.rng.animation).not.toBe(baseline.rng.animation);

    const config = silverWindConfigFor("player-back");
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, attackerPictureOrigin: _attackerPictureOrigin, targetPictureOrigin: _targetPictureOrigin, ...animationInputs } = altered;
    const seam = sceneOnSilverWindView({
      age: 80,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "CHARIZARD" as never, geometry: { ...config.attacker.geometry, side: "opponent", spriteCorner: { x: 167, y: 9 }, animationCenter: altered.attackerPictureOrigin, battlePositionCenter: altered.attackerPictureOrigin } },
        target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", spriteCorner: { x: 5, y: 87 }, animationCenter: altered.targetPictureOrigin, battlePositionCenter: altered.targetPictureOrigin } },
        animationInputs,
      },
    } as SceneOnSilverWindPresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(changed);
    expect(attacker.geometry.animationCenter).toEqual(altered.attackerPictureOrigin);
    expect(target.geometry.animationCenter).toEqual(altered.targetPictureOrigin);
  });

  it("keeps production evidence-free and records only the independently accepted move", () => {
    const source = readFileSync(resolve(root, "src/animation/silverWind.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    const data = coverage as { entries: Array<{ move: string; status: string }>; queue: string[]; componentTracks: Array<{ id: string; fulfilled?: boolean }> };
    expect(data.entries.find((entry) => entry.move === "MOVE_SILVER_WIND")).toMatchObject({ status: "exact" });
    expect(data.queue).not.toContain("MOVE_SILVER_WIND");
    // SKY_ATTACK remains independently unsupported, so the multi-move track
    // cannot inherit fulfillment from Silver Wind's exact body.
    expect(data.componentTracks.find((track) => track.id === "blend-battle-anim-palette-exclude")?.fulfilled).not.toBe(true);
  });
});
