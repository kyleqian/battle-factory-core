/**
 * Live input builders for the zero-Random2 "Q2" bodies (prep25 s0.2 / B.4 / B.5 / C): Snore (173), Sky Attack (143), Hyper Voice (304),
 * Sand Tomb (328), Smog (123). Every field is production-derivable: geometry from the battler anchors, sprite / matrix / task slots from the
 * known-entry allocator (lowest free over [0,1,2,6,8,60..63]) plus the measured per-move K tables (equal across the four prep25
 * scenarios), the assets-only palette composite with the move's own asset palettes written by the reducers, the lent 64-slot order, and the
 * WIN0 history rule (first body (240,161); (0,0) once an earlier body ran). No capture row is read.
 */
import { S0_REGISTERS, ZERO_BG_VALUES, battlerSprite, type LiveBgSnapshotArgs } from "./liveBgSnapshotMoves.ts";

type Side = "player" | "opponent";
type Inputs = Record<string, any>;
type Rgb = Readonly<{ r: number; g: number; b: number }>;
const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const opposite = (side: Side): Side => (side === "player" ? "opponent" : "player");
const HEALTHBOX_ORDER_KEYS = [
  { slot: 0, subpriority: 1, oamPriority: 0, oamY: 72 }, { slot: 1, subpriority: 1, oamPriority: 0, oamY: 14 },
  { slot: 2, subpriority: 200, oamPriority: 3, oamY: 0 }, { slot: 60, subpriority: 0, oamPriority: 0, oamY: 26 },
  { slot: 61, subpriority: 1, oamPriority: 0, oamY: 14 }, { slot: 62, subpriority: 0, oamPriority: 0, oamY: 84 },
  { slot: 63, subpriority: 1, oamPriority: 0, oamY: 72 },
] as const;
/** First-body S0 registers; once an earlier body ran WIN0 is cleared (prep25 B.5). */
const registersFor = (firstBody: boolean): Record<string, number> => (firstBody ? { ...S0_REGISTERS } : { ...S0_REGISTERS, win0h: 0, win0v: 0 });
const battler = (side: Side, anchors: LiveBgSnapshotArgs["attacker"]) => ({
  ...battlerSprite(side, anchors), animNum: 0, animCmdIndex: 0, animDelayCounter: 0, data: [0, 0, 0, 0, 0, 0, 0, 0],
});
const orderKeys = (attackerSide: Side, attackerAttr0: number, targetAttr0: number) => [
  ...HEALTHBOX_ORDER_KEYS,
  { slot: 6, subpriority: 30, oamPriority: 2, oamY: attackerSide === "player" ? attackerAttr0 : targetAttr0 },
  { slot: 8, subpriority: 40, oamPriority: 2, oamY: attackerSide === "player" ? targetAttr0 : attackerAttr0 },
].sort((l, r) => l.slot - r.slot);
const spriteAlloc = (slot: number, attr: [number, number, number], subpriority: number, oamPriority: number, flags: number) =>
  ({ slot, attr, subpriority, oamPriority, flags });

export type LiveQ2Args = LiveBgSnapshotArgs & Readonly<{ spriteOrder: readonly number[]; firstBody: boolean }>;

/**
 * `Move_SNORE` (173): two SnoreEffect calls (platform slot 3 + three Zs in slots 4, 5, 7, matrices free from 1, scale matrix 1 / 2 by
 * side), tasks scale 0 / monbg 1 / shake 2 / clear 0, ANIM_TAG_SNORE_Z in OBJ bank 7 tile 305. Z geometry: 32x32 cells at the attacker's
 * picture offset point (-16, -17) +- 1.
 */
export function liveSnoreInputs(args: LiveQ2Args & { snoreZPalette: readonly Rgb[] }): Inputs {
  const { attackerSide, attacker, target } = args, targetSide = opposite(attackerSide), player = attackerSide === "player";
  const attackerSprite = battler(attackerSide, attacker), targetSprite = battler(targetSide, target);
  const sub = (player ? 30 : 40) - 2;
  const zx = [1, 0, -1].map((d) => (player ? -d : d));
  const zCells = [4, 5, 7].map((slot, i) => spriteAlloc(slot, [(attacker.picOffsetPoint.y - 17) & 0xff, 0x8000 | (attacker.picOffsetPoint.x - 16 + (player ? -1 + i : 1 - i)) & 0x1ff, 31025], sub, 2, 1));
  void zx;
  const platform = spriteAlloc(3, [160, 304, 65535], sub, 3, 5);
  const call = { platform, z: zCells };
  return {
    attackerSprite, targetSprite,
    taskSlots: { scale: 0, monbg: 1, targetShake: 2, clearMonbg: 0 },
    effectAllocations: [call, call],
    scaleMatrixNum: player ? 1 : 2,
    resource: { tag: 10197, tileSlot: 6, paletteAllocatorSlot: 7, paletteBank: 23, tileRange: [305, 16], palette: args.snoreZPalette.map(bgr555) },
    allocator: { matrixBitmap: 6, spriteOrder: args.spriteOrder, activeOrderKeys: orderKeys(attackerSide, attackerSprite.attr[0], targetSprite.attr[0]) },
    palettes: { unfaded: args.palettes.unfaded, faded: args.palettes.faded, hardware: args.palettes.hardware },
    background: {
      values: ZERO_BG_VALUES, registers: registersFor(args.firstBody),
      monbg: player ? { bg: 2, activeCnt: 0x5e02, paletteBank: 9 } : { bg: 1, activeCnt: 0x5c02, paletteBank: 8 },
    },
    animationRngSeed: 0, gameplayRng: null,
  };
}

/**
 * `Move_HYPER_VOICE` (304): cry / scale / shake / platform / wait-for-cry tasks 0..4 (BGM duck task reuses slot 1), the palette-blend
 * helper (slot 3) and the ring (slot 4, matrix 0), the scale matrix 1 / 2 by side, ANIM_TAG_THIN_RING in OBJ bank 7 tile 305 (64 tiles),
 * the ring inserted before slot 6 and the shadow slot 2 in the painter order (equal on both sides and across the four prep25 scenarios).
 * No register input; the move is exact after any history that leaves the lent order known.
 */
export function liveHyperVoiceInputs(args: Omit<LiveQ2Args, "firstBody"> & { attackerSpeciesId: number; thinRingPalette: readonly number[] }): Inputs {
  const { attackerSide, attacker, target } = args, targetSide = opposite(attackerSide), player = attackerSide === "player";
  const attackerBank = player ? 16 : 17, targetBank = player ? 17 : 16;
  return {
    attackerCrySpecies: args.attackerSpeciesId,
    attackerSprite: battlerSprite(attackerSide, attacker), targetSprite: battlerSprite(targetSide, target),
    taskSlots: { cry: 0, scale: 1, targetShake: 2, platform: 3, waitForCry: 4, duckBgm: 1 },
    spriteSlots: { paletteBlend: 3, ring: 4 },
    paletteBlendSubpriority: (player ? 30 : 40) - 2,
    matrixSlots: { ring: 0, attackerScale: player ? 1 : 2 },
    resource: { tag: 10203, tileSlot: 6, paletteBank: 7, tileRange: [305, 64] },
    spriteOrder: args.spriteOrder,
    painter: { shadowSlot: 2, ringInsertionBefore: 6 },
    palettes: {
      unfaded: args.palettes.unfaded, faded: args.palettes.faded, hardware: args.palettes.hardware,
      backgroundBanks: [1, 2, 3], attackerBank, targetBank, thinRingBank: 23, thinRingPalette: args.thinRingPalette,
    },
    matrixBitmap: 6, animationRngSeed: 0, gameplayRng: null,
  };
}

type PositionAnchors = LiveBgSnapshotArgs["attacker"] & Readonly<{ battlePositionCenter: Readonly<{ x: number; y: number }> }>;

/**
 * `Move_SMOG` (123): seven purple gas clouds in the lowest free slots (ages 7, 16, ..., 61), tasks monbg 1 / mist sound 0 / blend 2 / shake 3 /
 * toxic sound 0 / clear 0, ANIM_TAG_PURPLE_GAS_CLOUD in OBJ bank 7 tile 305 (16 tiles). The clouds sit at the target's BATTLE POSITION
 * centre; the monbg scroll is 32 - the target sprite centre (+ its idle rest x2); the BG control registers are the S0 values plus the
 * monbg / split writes of the target's side (opponent target: BG1, player target: BG2).
 */
export function liveSmogInputs(args: Omit<LiveQ2Args, "firstBody" | "target"> & { target: PositionAnchors }): Inputs {
  const { attackerSide, attacker, target } = args, targetSide = opposite(attackerSide), toOpponent = targetSide === "opponent";
  const attackerSprite = battlerSprite(attackerSide, attacker), targetSprite = battlerSprite(targetSide, target);
  return {
    targetPictureOrigin: { x: target.battlePositionCenter.x, y: target.battlePositionCenter.y },
    targetBgPriority: toOpponent ? 1 : 2,
    attackerSprite, targetSprite, cloudSpriteSlots: [3, 4, 5, 7, 9, 10, 11],
    taskSlots: { updateMonBg: 1, mistSound: 0, blendColorCycle: 2, shakeMon2: 3, toxicSound: 0, clearMonBg: 0 },
    resources: { purpleGasCloud: { paletteBank: 7, tileSlot: 6, tileRange: [305, 16] } },
    matrixBitmap: 6, spriteOrder: args.spriteOrder,
    painterSprites: orderKeys(attackerSide, attackerSprite.attr[0], targetSprite.attr[0]),
    monbg: { layer: toOpponent ? "bg1" : "bg2", scroll: { x: 32 - target.spriteCenter.x - target.frontIdleRest.x2, y: 32 - target.spriteCenter.y - target.frontIdleRest.y2 } },
    background: toOpponent
      ? { baseBg1Cnt: 0x9c00, baseBg2Cnt: 0x5e00, monbgBg1Cnt: 0x5c02, monbgBg2Cnt: 0x5e00, splitBg1Cnt: 0x5c01, splitBg2Cnt: 0x5e02 }
      : { baseBg1Cnt: 0x9c00, baseBg2Cnt: 0x5e00, monbgBg1Cnt: 0x9c00, monbgBg2Cnt: 0x5e02, splitBg1Cnt: 0x9c01, splitBg2Cnt: 0x5e02 },
    targetPaletteBank: toOpponent ? 17 : 16,
    animationRngSeed: 0, gameplayRng: null,
  };
}

const signedOamY = (y: number): number => ((y & 0xff) >= 160 ? (y & 0xff) - 256 : y & 0xff);

/**
 * `Move_SAND_TOMB` (328): the SandTombAnimationProfile. The vortex centre is the target's battle-position centre, the palette-blend
 * sentinel the target's picture offset point; mud sand in OBJ bank 7 tile 305; the shake task takes slot 0 (priority 254); the free list is the
 * known-entry free set. The painter keys are the healthbox constants plus the two battlers (OAM y = sprite centre - 32 + idle rest).
 */
export function liveSandTombProfile(args: Omit<LiveQ2Args, "firstBody" | "target" | "palettes"> & { target: PositionAnchors; freeSpriteSlots: readonly number[] }): Inputs {
  const { attackerSide, attacker, target } = args, targetSide = opposite(attackerSide), player = attackerSide === "player";
  const attackerSprite = battlerSprite(attackerSide, attacker), targetSprite = battlerSprite(targetSide, target);
  const keys = orderKeys(attackerSide, attackerSprite.attr[0], targetSprite.attr[0])
    .map((k) => ({ slot: k.slot, priority: k.oamPriority, subpriority: k.subpriority, y: signedOamY(k.oamY) }));
  return {
    orientation: player ? "player-back" : "opponent-front", endAge: 123, attackerSide,
    attackerSpriteSlot: player ? 6 : 8, attackerSubpriority: player ? 30 : 40,
    target: {
      vortexCenter: { x: target.battlePositionCenter.x, y: target.battlePositionCenter.y },
      paletteCenter: { x: target.picOffsetPoint.x, y: target.picOffsetPoint.y },
      spriteSlot: player ? 8 : 6, initialX2: target.frontIdleRest.x2, initialY2: target.frontIdleRest.y2,
      subpriority: player ? 40 : 30, sortTopY: signedOamY(targetSprite.attr[0]),
    },
    spriteOrder: { initialOrder: args.spriteOrder, initialKeys: keys, freeSpriteSlots: args.freeSpriteSlots },
    mudSand: { tag: 10074, tileNum: 305, paletteNum: 7 },
    shakeTaskSlot: 0, shakeTaskPriority: 254, startingAnimationRng: 0, gameplayRng: 0,
  };
}

/**
 * `Move_SKY_ATTACK` (143; setup = charge turn 148 rows, unleash = strike 180 rows, selected by `request.turn & 1`): one input for both
 * bodies. Task slots, the bird (the healthbox sprite 63 key), the impact (tile slot 6 / palette 7 / tile 305) and bird (slot 7 / bank 8 /
 * tile 537) allocations are the known-entry constants (equal across the four prep25 scenarios); the monbg BG / control by attacker side.
 * Registers: S0 for the first body (the charge), WIN0 cleared once an earlier body ran (the strike; prep25 B.5).
 */
export function liveSkyAttackInputs(args: LiveQ2Args & { impactPalette: readonly number[]; birdPalette: readonly number[] }): Inputs {
  const { attackerSide, attacker, target } = args, targetSide = opposite(attackerSide), player = attackerSide === "player";
  const attackerSprite = battler(attackerSide, attacker), targetSprite = battler(targetSide, target);
  return {
    attackerSprite, targetSprite,
    taskSlots: { monbg: 1, blendSetup: 0, shake: 2, sound: 3, fade: 3, blendUnleash: 0, birdShake: 0, slidingBg: 2, clearMonbg: 0, fadeBg: 0 },
    bird: { slot: 63, matrixNum: 0, attr: [72, 49342, 20572], subpriority: 1, oamPriority: 0, flags: 1 },
    resources: {
      impact: { tag: 10135, tileSlot: 6, paletteAllocatorSlot: 7, paletteBank: 7, tileRange: [305, 16], palette: args.impactPalette },
      bird: { tag: 10284, tileSlot: 7, paletteAllocatorSlot: 8, paletteBank: 8, tileRange: [537, 64], palette: args.birdPalette },
    },
    allocator: { matrixBitmap: 6, spriteOrder: args.spriteOrder, activeOrderKeys: orderKeys(attackerSide, attackerSprite.attr[0], targetSprite.attr[0]) },
    palettes: { unfaded: args.palettes.unfaded, faded: args.palettes.faded, hardware: args.palettes.hardware },
    background: {
      values: ZERO_BG_VALUES, registers: registersFor(args.firstBody),
      monbg: player ? { bg: 1, unleashBg: 2, activeCnt: 0x5c02, paletteBank: 9 } : { bg: 2, unleashBg: 1, activeCnt: 0x5e02, paletteBank: 8 },
      vram: {},
    },
    animationRngSeed: 0, gameplayRng: null,
  };
}
