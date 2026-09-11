import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  DIG_DIRT_MOUND_TAG,
  DIG_IMPACT_TAG,
  DIG_MUD_SAND_TAG,
  DIG_SETUP_FIRST_INACTIVE_AGE,
  DIG_UNLEASH_FIRST_INACTIVE_AGE,
  digAtAge,
  type DigLiveInputs,
} from "../../src/animation/dig.ts";
import {
  sceneOnDigView,
  type SceneOnDigPresentationState,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER_ORDER = [
  62, 60, 0, 63, 1, 61, 6, 8, 2, 4, 3, 7, 5, 10, 9,
  21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 54, 55, 56, 57, 58,
  59, 23, 22, 48, 49, 50, 51, 52, 53, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
  47,
] as const;

const live = (overrides: Partial<DigLiveInputs> = {}): DigLiveInputs => ({
  body: "setup",
  attackerSide: "player",
  targetSide: "opponent",
  attackerSpecies: "LOMBRE",
  targetSpecies: "ONIX",
  attackerCenter: { x: 72, y: 97 },
  targetCenter: { x: 176, y: 49 },
  targetAnimationOrigin: { x: 176, y: 49 },
  attackerElevationY: 80,
  attackerInitialOffset: { x: 0, y: 0 },
  targetInitialOffset: { x: 0, y: 0 },
  attackerSpriteSlot: 6,
  targetSpriteSlot: 8,
  attackerSubpriority: 30,
  targetSubpriority: 40,
  attackerInitialVisible: true,
  targetInitialVisible: true,
  attackerInitialMatrixNum: 0,
  targetInitialMatrixNum: 0,
  attackerCleanupMatrixNum: 2,
  targetCleanupMatrixNum: 1,
  attackerInitialMatrix: [256, 0, 0, 256],
  targetInitialMatrix: [256, 0, 0, 256],
  moundSlots: [3, 4],
  plumeSlots: [5, 7, 9, 10, 5, 7, 9, 10, 5, 7, 9, 10, 5, 7, 9, 10, 5, 7, 9, 10],
  impactSpriteSlot: 5,
  impactMatrixNum: 0,
  moundMatrixNum: 0,
  plumeMatrixNum: 0,
  digTaskSlot: 0,
  updateMonBgTaskSlot: 1,
  clearMonBgTaskSlot: 2,
  shakeTaskSlot: 0,
  spriteOrder: PLAYER_ORDER,
  mudSand: { tileSlot: 6, paletteBank: 7, tileRange: [305, 5] },
  dirtMound: { tileSlot: 7, paletteBank: 8, tileRange: [321, 16] },
  impact: { tileSlot: 6, paletteBank: 7, tileRange: [305, 16] },
  initialMatrixBitmap: 6,
  setupBgOffset: { x: -40, y: -65 },
  monBg: {
    layer: "bg2", layerId: 4, snapshot: { x: 72, y: 160 },
    baseScroll: { x: -40, y: -128 }, activeCnt: 24066, inactiveCnt: 24064,
  },
  animationRngSeed: 0x12345678,
  ...overrides,
});

const unleashLive = (overrides: Partial<DigLiveInputs> = {}): DigLiveInputs => live({
  body: "unleash",
  attackerSide: "opponent",
  targetSide: "player",
  attackerCenter: { x: 176, y: 52 },
  targetCenter: { x: 72, y: 91 },
  targetAnimationOrigin: { x: 72, y: 99 },
  attackerElevationY: 40,
  attackerInitialVisible: false,
  attackerSubpriority: 40,
  targetSubpriority: 30,
  attackerSpriteSlot: 8,
  targetSpriteSlot: 6,
  moundSlots: [3, 4],
  plumeSlots: [],
  impactSpriteSlot: 5,
  setupBgOffset: { x: -144, y: -20 },
  monBg: {
    layer: "bg1", layerId: 8, snapshot: { x: 176, y: 160 },
    baseScroll: { x: -144, y: -128 }, activeCnt: 23554, inactiveCnt: 23554,
  },
  ...overrides,
});

function sceneState(input: DigLiveInputs, age: number): SceneOnDigPresentationState {
  const attackerSpecies = input.attackerSpecies as SceneOnPresentationBattler["species"];
  const targetSpecies = input.targetSpecies as SceneOnPresentationBattler["species"];
  const { body, attackerSide, targetSide, attackerSpecies: _aSpecies,
    targetSpecies: _tSpecies, attackerCenter, targetCenter, ...animationInputs } = input;
  return {
    age,
    config: {
      move: "DIG",
      body,
      attacker: { species: attackerSpecies, geometry: {
        side: attackerSide, spriteCorner: attackerCenter,
        animationCenter: attackerCenter, battlePositionCenter: attackerCenter,
      } },
      target: { species: targetSpecies, geometry: {
        side: targetSide, spriteCorner: targetCenter,
        animationCenter: input.targetAnimationOrigin ?? targetCenter,
        battlePositionCenter: targetCenter,
      } },
      fieldProfile: { playerHp: 1, playerMaxHp: 1, opponentHp: 1, opponentMaxHp: 1 },
      animationInputs,
    },
  } as SceneOnDigPresentationState;
}

function runStrictVerifier(): Record<string, any> {
  return JSON.parse(execFileSync(process.execPath, [
    "--experimental-strip-types", "tools/compare/verifyDigReducer.ts",
  ], { encoding: "utf8" })) as Record<string, any>;
}

describe("MOVE_DIG source-relative reducer", () => {
  it("replays all 526 retained rows twice through the reducer and typed seam", () => {
    const first = runStrictVerifier();
    const second = runStrictVerifier();
    expect(second).toEqual(first);
    expect(first.total).toEqual({
      retainedRows: 526, reducerRows: 526, seamRows: 526, framebufferCompared: false,
    });
    expect(first["player-back"]).toMatchObject({
      reducerRows: 263, seamRows: 263,
      digest: "5e52ee40e4354da97e20d673e8195f322e4bb3d8099ada1b0eee67510fd927c2",
      setup: { digest: "2bd90e9fd6a2575f1c5c86d0140b9626443ec1bd0536453dbda96c74e045eea8" },
      unleash: { digest: "c7bfd415ac3b6380b0e990851ad7cda3e55bd9d74482feff4e555d148a4f4b07" },
    });
    expect(first["opponent-front"]).toMatchObject({
      reducerRows: 263, seamRows: 263,
      digest: "4fb4eb59545b129fa4f5ab8ea89e12e40e147848c8a63f7162128e1cab7e2c30",
      setup: { digest: "8b5137cd451d35dd087f0c53aa811004c5fbc8e20eabb3088e0700e1690edb32" },
      unleash: { digest: "08edcfe20d96a686f5599cb9c389f1eb2ecedcb12d8647324ba55354e0d2b5f3" },
    });
  });

  it("keeps source waits, both phase lifecycles, resources, and cleanup explicit", () => {
    const setupRoot = digAtAge(0, live());
    expect(setupRoot).toMatchObject({
      source: { owner: "Move_DIG", pointerOffset: 0, wait: 0, active: true },
      background: { layer: "bg2", monbg: false },
      resources: {
        mudSand: { tag: null, loaded: false },
        dirtMound: { tag: null, loaded: false }, impact: { tag: null, loaded: false },
      },
      rng: { gameplay: "untouched", advances: 0 },
    });
    expect(digAtAge(7, live()).sprites).toHaveLength(2);
    expect(digAtAge(1, live()).resources.mudSand).toMatchObject({ tag: DIG_MUD_SAND_TAG, loaded: true });
    expect(digAtAge(4, live()).resources.dirtMound).toMatchObject({ tag: DIG_DIRT_MOUND_TAG, loaded: true });
    expect(digAtAge(10, live()).tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ callback: "AnimTask_DigBounceMovement", data: expect.arrayContaining([2, 0, 0]) }),
    ]));
    expect(digAtAge(18, live())).toMatchObject({
      source: { pointerOffset: 283, wait: 32 },
      audio: { events: [expect.objectContaining({ sound: "SE_M_DIG", pan: -64 })] },
    });
    expect(digAtAge(18, live()).sprites.filter((sprite) => sprite.kind === "dirt-plume"))
      .toHaveLength(4);
    expect(digAtAge(167, live())).toMatchObject({
      scanline: { state: 3 },
      tasks: [expect.objectContaining({ callback: "AnimTask_DigBounceMovement", data: expect.arrayContaining([4]) })],
      attacker: { visible: false },
    });
    expect(digAtAge(DIG_SETUP_FIRST_INACTIVE_AGE, live())).toMatchObject({
      active: false, sprites: [], tasks: [],
      resources: {
        mudSand: { loaded: false, tag: null }, dirtMound: { loaded: false, tag: null },
        allocator: { matrixBitmap: 6, releasedAtFirstInactive: true },
      },
      cleanup: { firstInactive: true, visualTasks: 0, ownedSprites: 0, ownedTasks: 0, resourcesReleased: true },
    });

    const unleash = unleashLive();
    expect(digAtAge(14, unleash)).toMatchObject({
      source: { pointerOffset: 158, wait: 16 },
      tasks: expect.arrayContaining([
        expect.objectContaining({ callback: "AnimTask_DigRiseUpFromHole", data: expect.arrayContaining([2]) }),
      ]),
    });
    expect(digAtAge(32, unleash)).toMatchObject({
      source: { pointerOffset: 9, wait: 1 },
      sprites: expect.arrayContaining([
        expect.objectContaining({ kind: "impact", x: 80, y: 99, matrix: [372, 0, 0, 372] }),
      ]),
      tasks: expect.arrayContaining([
        expect.objectContaining({ callback: "Task_UpdateMonBg" }),
        expect.objectContaining({ callback: "Task_ClearMonBg" }),
        expect.objectContaining({ callback: "AnimTask_ShakeMon_Step" }),
      ]),
      audio: { events: [expect.objectContaining({ sound: "SE_M_MEGA_KICK2", pan: 63 })] },
    });
    expect(digAtAge(1, unleash).resources.impact).toMatchObject({ tag: DIG_IMPACT_TAG, loaded: true });
    expect(digAtAge(61, unleash).sprites).toEqual(expect.arrayContaining([
      expect.objectContaining({ callback: "DestroyAnimSprite", data: expect.arrayContaining([0]) }),
    ]));
    expect(digAtAge(DIG_UNLEASH_FIRST_INACTIVE_AGE, unleash)).toMatchObject({
      active: false, sprites: [], tasks: [],
      resources: {
        impact: { loaded: false, tag: null }, dirtMound: { loaded: false, tag: null },
        allocator: { matrixBitmap: 6, releasedAtFirstInactive: true },
      },
      cleanup: { firstInactive: true, visualTasks: 0, ownedSprites: 0, ownedTasks: 0, resourcesReleased: true },
    });
  });

  it("responds materially to live geometry, allocation, order, task, matrix, and species controls", () => {
    const input = unleashLive();
    const canonical = digAtAge(32, input);
    const alteredInput = unleashLive({
      attackerSpecies: "MAGBY", targetSpecies: "NINETALES",
      attackerCenter: { x: 154, y: 61 }, targetCenter: { x: 94, y: 84 },
      targetAnimationOrigin: { x: 94, y: 92 }, attackerElevationY: 49,
      moundSlots: [12, 13], impactSpriteSlot: 14,
      impactMatrixNum: 2, moundMatrixNum: 2, initialMatrixBitmap: 1,
      digTaskSlot: 5, updateMonBgTaskSlot: 6, clearMonBgTaskSlot: 7, shakeTaskSlot: 8,
      spriteOrder: [14, 13, 12, 5, 6, 7, 8],
      mudSand: { tileSlot: 12, paletteBank: 13, tileRange: [400, 5] },
      dirtMound: { tileSlot: 14, paletteBank: 15, tileRange: [416, 16] },
      impact: { tileSlot: 12, paletteBank: 13, tileRange: [400, 16] },
    });
    const altered = digAtAge(32, alteredInput);
    expect(altered).not.toEqual(canonical);
    expect(altered).toMatchObject({
      attacker: { x: 154, y: 61 }, target: { x: 94, y: 84 },
      tasks: expect.arrayContaining([
        expect.objectContaining({ slot: 6, callback: "Task_UpdateMonBg" }),
        expect.objectContaining({ slot: 7, callback: "Task_ClearMonBg" }),
        expect.objectContaining({ slot: 8, callback: "AnimTask_ShakeMon_Step" }),
      ]),
      resources: {
        dirtMound: { tileSlot: 14, paletteBank: 15 }, impact: { tileSlot: 12, paletteBank: 13 },
        allocator: { matrixBitmap: 5 },
      },
    });
    expect(altered.sprites).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "impact", slot: 14, x: 102, y: 92, matrixNum: 2 }),
    ]));

    const swappedOrder = digAtAge(32, unleashLive({ spriteOrder: [62, 60, 0, 63, 1, 61, 6, 8, 2, 3, 4, 5] }));
    expect(swappedOrder.order.ownedSlots).not.toEqual(canonical.order.ownedSlots);

    const seam = sceneOnDigView(sceneState(input, 32));
    const { attacker: _attacker, target: _target, ...seamCore } = seam;
    const { attacker: _reducedAttacker, target: _reducedTarget, ...reducedCore } = canonical;
    expect(seamCore).toEqual(reducedCore);
    expect(sceneOnDigView(sceneState({ ...input, attackerSpecies: "MAGBY", targetSpecies: "NINETALES" }, 32)))
      .toMatchObject({ attacker: { species: "MAGBY" }, target: { species: "NINETALES" } });
  });
});
