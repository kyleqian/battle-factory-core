import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  overheatAtAge,
  type OverheatLiveInputs,
} from "../../src/animation/overheat.ts";
import {
  sceneOnOverheatView,
  type SceneOnOverheatPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  overheatConfigFor,
  overheatInputsFor,
  verifyOverheatReducer,
} from "../../tools/compare/verifyOverheatReducer.ts";

const root = resolve(import.meta.dirname, "../..");

describe("MOVE_OVERHEAT source-relative reducer and narrow Scene-ON seam", () => {
  it("replays every retained bilateral row twice through reducer and typed seam", () => {
    const first = verifyOverheatReducer();
    expect(verifyOverheatReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 230, reducerRows: 460, seamRows: 460, cleanup: 229, framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 230, reducerRows: 460, seamRows: 460, cleanup: 229, framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 460, passes: 2, reducerRows: 920, seamRows: 920, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("takes material live side, identity, geometry, allocation, palette, order, and presentation-RNG controls while gameplay remains opaque", () => {
    const input = overheatInputsFor("player-back");
    const changedPalette = input.palettes.unfaded.slice();
    changedPalette[500] = (changedPalette[500]! ^ 0x7fff) & 0x7fff;
    const altered: OverheatLiveInputs = {
      ...input,
      attackerSide: "opponent", targetSide: "player", attackerSpecies: "CHARIZARD", targetSpecies: "BLISSEY",
      attackerPictureOrigin: { x: 201, y: 43 }, targetPictureOrigin: { x: 39, y: 117 },
      attackerSprite: { ...input.attackerSprite, slot: 41, x: 201, y: 43, subpriority: 55, matrixNum: 6, matrix: [192, 16, -16, 192] },
      targetSprite: { ...input.targetSprite, slot: 42, x: 39, y: 117, subpriority: 14, matrixNum: 7, matrix: [224, 0, 0, 224] },
      taskSlots: { monbg: 9, firstAttackerShake: 10, targetShake: 11, lastAttackerShake: 12, clearMonbg: 13 },
      spriteSlots: {
        flames: input.spriteSlots.flames.map((slot) => slot + 100).reverse(),
        hitsplats: input.spriteSlots.hitsplats.map((slot) => slot + 100).reverse(),
        paletteBlends: input.spriteSlots.paletteBlends.map((slot) => slot + 100).reverse(),
      },
      matrixSlots: { hitsplats: input.matrixSlots.hitsplats.map((slot) => slot + 8).reverse() },
      resources: {
        smallEmber: { ...input.resources.smallEmber, tileSlot: 31, tileRange: [620, 1], paletteAllocatorSlot: 9, hardwarePaletteBank: 25 },
        impact: { ...input.resources.impact, tileSlot: 32, tileRange: [621, 1], paletteAllocatorSlot: 10, hardwarePaletteBank: 26 },
      },
      allocator: { ...input.allocator, initialMatrixBitmap: 0x95, spriteOrder: input.allocator.spriteOrder.slice().reverse() },
      palettes: { ...input.palettes, unfaded: changedPalette },
      background: { ...input.background, values: { ...input.background.values, callerOwnedAxis: 73 }, setupX: -12, setupY: -23, clearX: -2, clearY: -3 },
      registers: { ...input.registers, bldcnt: 0x1234, bldalpha: 0x5678, callerOwnedRegister: 0x2468 },
      animationRngSeed: 0x12345678,
      gameplayRng: { opaque: "gameplay-rng" }, gameplayState: { opaque: "gameplay-state" },
    };
    const baseline = overheatAtAge(80, input);
    const changed = overheatAtAge(80, altered);
    expect(changed).not.toEqual(baseline);
    expect(changed).toMatchObject({
      battlers: {
        attacker: { side: "opponent", species: "CHARIZARD", sprite: { slot: 41, x: 201, y: 43, matrixNum: 6 } },
        target: { side: "player", species: "BLISSEY", sprite: { slot: 42, x: 39, y: 117, matrixNum: 7 } },
      },
      resources: { tags: { smallEmber: { tileSlot: 31, paletteAllocatorSlot: 9, hardwarePaletteBank: 25 }, impact: { tileSlot: 32, paletteAllocatorSlot: 10, hardwarePaletteBank: 26 } } },
      rng: { gameplay: { opaque: "gameplay-rng" }, gameplayState: { opaque: "gameplay-state" }, gameplayUnchanged: true },
    });
    expect(changed.sprites.filter((sprite) => sprite.kind === "flame").map((sprite) => sprite.slot)).not.toEqual(baseline.sprites.filter((sprite) => sprite.kind === "flame").map((sprite) => sprite.slot));
    expect(changed.painterOrder).not.toEqual(baseline.painterOrder);
    expect(changed.palette.unfaded[500]).toBe(changedPalette[500]);
    expect(changed.background.values.callerOwnedAxis).toBe(73);
    expect(changed.registers.callerOwnedRegister).toBe(0x2468);
    expect(changed.rng.animation).not.toBe(baseline.rng.animation);

    const config = overheatConfigFor("player-back");
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, attackerPictureOrigin: _attackerPictureOrigin, targetPictureOrigin: _targetPictureOrigin, ...animationInputs } = altered;
    const seam = sceneOnOverheatView({
      age: 80,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "CHARIZARD" as never, geometry: { ...config.attacker.geometry, side: "opponent", spriteCorner: { x: 169, y: 11 }, animationCenter: altered.attackerPictureOrigin, battlePositionCenter: altered.attackerPictureOrigin } },
        target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", spriteCorner: { x: 7, y: 85 }, animationCenter: altered.targetPictureOrigin, battlePositionCenter: altered.targetPictureOrigin } },
        animationInputs,
      },
    } as SceneOnOverheatPresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(changed);
    expect(attacker.geometry.animationCenter).toEqual(altered.attackerPictureOrigin);
    expect(target.geometry.animationCenter).toEqual(altered.targetPictureOrigin);
  });

  it("keeps production evidence-free and MOVE_OVERHEAT exact with no queue or track credit", () => {
    const source = readFileSync(resolve(root, "src/animation/overheat.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    const data = coverage as { entries: Array<{ move: string }>; queue: string[]; componentTracks: Array<{ representatives?: readonly string[] }> };
    expect(data.entries.find((entry) => entry.move === "MOVE_OVERHEAT")).toMatchObject({ status: "exact" });
    expect(data.queue).not.toContain("MOVE_OVERHEAT");
    expect(data.componentTracks.some((track) => track.representatives?.includes("MOVE_OVERHEAT"))).toBe(false);
  });
});
