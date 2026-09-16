import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import {
  shockWaveAtAge,
  type ShockWaveLiveInputs,
} from "../../src/animation/shockWave.ts";
import {
  sceneOnShockWaveView,
  type SceneOnShockWavePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  shockWaveConfigFor,
  shockWaveInputsFor,
  verifyShockWaveReducer,
} from "../../tools/compare/verifyShockWaveReducer.ts";

const root = resolve(import.meta.dirname, "../..");
const TRACK_COMPONENTS = [
  "asset:ANIM_TAG_CIRCLE_OF_LIGHT",
  "asset:ANIM_TAG_ELECTRIC_ORBS",
  "asset:ANIM_TAG_LIGHTNING",
  "asset:ANIM_TAG_SPARK",
  "sprite:gGrowingShockWaveOrbSpriteTemplate",
  "task:AnimTask_BlendBattleAnimPal",
  "task:AnimTask_ElectricChargingParticles",
  "task:AnimTask_ShakeMon",
  "task:AnimTask_ShockWaveLightning",
  "task:AnimTask_ShockWaveProgressingBolt",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:setalpha",
  "visualCommand:simple_palette_blend",
] as const;

describe("MOVE_SHOCK_WAVE source-relative reducer and narrow Scene-ON seam", () => {
  it("replays all retained bilateral rows twice through reducer and typed seam", () => {
    const first = verifyShockWaveReducer();
    expect(verifyShockWaveReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": { retainedRows: 267, reducerRows: 534, seamRows: 534, cleanup: 266, framebufferCompared: false, coverageCredit: false },
      "opponent-front": { retainedRows: 263, reducerRows: 526, seamRows: 526, cleanup: 262, framebufferCompared: false, coverageCredit: false },
      bilateral: { retainedRows: 530, passes: 2, reducerRows: 1060, seamRows: 1060, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("takes material live identity, geometry, allocation, task/resource, order, register, and RNG controls", () => {
    const input = shockWaveInputsFor("player-back");
    const initialOccupiedSprites = input.allocator.initialOccupiedSprites
      .filter((slot) => slot !== input.attackerSprite.slot && slot !== input.targetSprite.slot);
    const initialLiveSprites = input.allocator.initialLiveSprites
      .filter((entry) => entry.slot !== input.attackerSprite.slot && entry.slot !== input.targetSprite.slot);
    const altered: ShockWaveLiveInputs = {
      ...input,
      attackerSide: "opponent",
      targetSide: "player",
      attackerSpecies: "CROBAT",
      targetSpecies: "BLISSEY",
      attackerPictureOrigin: { x: 201, y: 43 },
      targetPictureOrigin: { x: 39, y: 117 },
      targetBattlePosition: { x: 39, y: 85 },
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 43, subpriority: 55, matrixNum: 6, matrix: [192, 16, -16, 192] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 117, subpriority: 14, matrixNum: 7, matrix: [224, 0, 0, 224] },
      taskSlots: { charging: 9, progressing: 10, lightning: 11, shake: 12, blend: 13, monbg: 14, clear: 15 },
      spriteSlots: { orb: 30, paletteBlend: 31 },
      matrixSlots: { orb: 5 },
      resources: {
        circleOfLight: { ...input.resources.circleOfLight, paletteAllocatorSlot: 9, hardwarePaletteBank: 25, tileSlot: 31, tileRange: [620, 1] },
        electricOrbs: { ...input.resources.electricOrbs, paletteAllocatorSlot: 10, hardwarePaletteBank: 26, tileSlot: 32, tileRange: [621, 1] },
        spark: { ...input.resources.spark, paletteAllocatorSlot: 11, hardwarePaletteBank: 27, tileSlot: 33, tileRange: [622, 1] },
        lightning: { ...input.resources.lightning, paletteAllocatorSlot: 12, hardwarePaletteBank: 28, tileSlot: 34, tileRange: [623, 1] },
      },
      allocator: {
        initialOccupiedSprites: [...initialOccupiedSprites, 21, 22],
        initialMatrixBitmap: 0x95,
        spriteOrder: input.allocator.spriteOrder.slice().reverse(),
        initialLiveSprites: [
          ...initialLiveSprites,
          { slot: 21, attr: input.attackerSprite.attr, subpriority: 55 },
          { slot: 22, attr: input.targetSprite.attr, subpriority: 14 },
        ],
      },
      background: { ...input.background, values: { ...input.background.values, callerOwnedAxis: 73 }, setupX: -12, setupY: -23, clearX: -2, clearY: -3 },
      registers: { ...input.registers, bldcnt: 0x1234, bldalpha: 0x5678, callerOwnedRegister: 0x2468 },
      animationRngSeed: 0x12345678,
      gameplayRng: { opaque: "gameplay-owned" },
    };
    const baseline = shockWaveAtAge(77, input);
    const changed = shockWaveAtAge(77, altered);
    expect(changed).not.toEqual(baseline);
    expect(changed).toMatchObject({
      battlers: {
        attacker: { side: "opponent", species: "CROBAT", sprite: { slot: 21, x: 201, y: 43, matrixNum: 6 } },
        target: { side: "player", species: "BLISSEY", sprite: { slot: 22, x: 39, y: 117, matrixNum: 7 } },
      },
      sprites: expect.arrayContaining([expect.objectContaining({ kind: "orb", slot: 30 })]),
      tasks: expect.arrayContaining([expect.objectContaining({ role: "progressing", slot: 10 }), expect.objectContaining({ role: "monbg", slot: 14 })]),
      resources: { tags: { electricOrbs: { paletteAllocatorSlot: 10, hardwarePaletteBank: 26, tileSlot: 32 } }, matrixBitmap: 0x95 | (1 << 5) },
      rng: { gameplay: { opaque: "gameplay-owned" }, gameplayUnchanged: true },
    });
    expect(changed.painterOrder).not.toEqual(baseline.painterOrder);
    expect(changed.painterOrder).toHaveLength(64);
    expect(changed.battlers.attacker.sprite.matrix).toEqual([192, 16, -16, 192]);
    expect(changed.battlers.target.sprite.matrix).toEqual([224, 0, 0, 224]);
    expect(changed.sprites.find((sprite) => sprite.kind === "orb")?.matrix).not.toEqual(changed.battlers.attacker.sprite.matrix);
    expect(baseline.battlers.attacker.sprite.matrix).toEqual(baseline.sprites.find((sprite) => sprite.kind === "orb")?.matrix);
    expect(changed.background.values[altered.background.xKey]).toBe(-12);
    expect(changed.background.values[altered.background.yKey]).toBe(-23);
    expect(changed.registers[altered.background.horizontalRegister]).toBe(500);
    expect(changed.registers[altered.background.verticalRegister]).toBe(489);
    expect(changed.background.values.callerOwnedAxis).toBe(73);
    expect(changed.registers.callerOwnedRegister).toBe(0x2468);
    expect(changed.palette.faded.slice(31 * 16, 32 * 16)).toEqual(altered.palettes.faded.slice(31 * 16, 32 * 16));

    const cleanup = shockWaveAtAge(266, input);
    expect(shockWaveAtAge(264, input).rng.sourceDraws).toBe(263);
    expect(shockWaveAtAge(265, input).rng.sourceDraws).toBe(263);
    expect(cleanup.rng.sourceDraws).toBe(264);

    const config = shockWaveConfigFor("player-back");
    const { attackerSide: _attackerSide, targetSide: _targetSide, attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies, attackerPictureOrigin: _attackerPictureOrigin, targetPictureOrigin: _targetPictureOrigin, targetBattlePosition: _targetBattlePosition, ...animationInputs } = altered;
    const seam = sceneOnShockWaveView({
      age: 77,
      config: {
        ...config,
        attacker: { ...config.attacker, species: "CROBAT" as never, geometry: { ...config.attacker.geometry, side: "opponent", spriteCorner: { x: 169, y: 11 }, animationCenter: altered.attackerPictureOrigin, battlePositionCenter: altered.attackerPictureOrigin } },
        target: { ...config.target, species: "BLISSEY" as never, geometry: { ...config.target.geometry, side: "player", spriteCorner: { x: 7, y: 85 }, animationCenter: altered.targetPictureOrigin, battlePositionCenter: altered.targetBattlePosition } },
        animationInputs,
      },
    } as SceneOnShockWavePresentationState);
    const { attacker, target, ...seamState } = seam;
    expect(seamState).toEqual(changed);
    expect(attacker.geometry.animationCenter).toEqual(altered.attackerPictureOrigin);
    expect(target.geometry.animationCenter).toEqual(altered.targetPictureOrigin);
  });

  it("keeps production evidence-free and promotes only Shock Wave", () => {
    const source = readFileSync(resolve(root, "src/animation/shockWave.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(?:tools\/compare|evidence|raw-rgb|screenshot|canonical-party)[^"']*["']/u);
    const data = coverage as { entries: Array<{ move: string }>; queue: string[]; componentTracks: Array<{ id: string; components: readonly string[]; representatives: string[]; fulfilled: boolean; goal: string }> };
    expect(data.entries.find((entry) => entry.move === "MOVE_SHOCK_WAVE")).toMatchObject({ status: "exact" });
    expect(data.queue).toEqual(["MOVE_NIGHTMARE"]);
    expect(data.componentTracks.find((entry) => entry.id === "shock-wave-electric-bolts")).toMatchObject({ components: TRACK_COMPONENTS, representatives: ["MOVE_SHOCK_WAVE"], fulfilled: true, goal: expect.stringContaining("FULFILLED") });
  });
});
