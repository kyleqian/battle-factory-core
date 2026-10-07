/**
 * Live input builders for the BG-snapshot move bodies MOVE_OVERHEAT (315) and MOVE_SILVER_WIND (318), FIRST BODY only
 * (prep16 s0.3/s2: the activation BG registers/scroll/matrices are the constant S0 only while no animation unit has run;
 * liveMoveSpriteOrderInput.firstBody). Geometry comes from `liveBattlerAnchors`, palettes from `composeLivePalettes`
 * (assets only), the allocator/task/OAM/register values are the measured first-body constants (prep14 s1.3/1.4, prep16 s2):
 * equal across both accepted corpora (every K field), the fresh first-body captures and the alternate-species scenarios.
 * No capture row is read at runtime.
 */
import paletteData from "../data/gen/live-animation-palette-resources.json" with { type: "json" };
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";

type Side = "player" | "opponent";
/** Reducer inputs, structurally typed by the move config they are spread into (src/engine may not import src/animation). */
type Inputs = Record<string, any>;
type Point = Readonly<{ x: number; y: number }>;
export interface LiveBgSnapshotAnchors {
  readonly picOffsetPoint: Point;
  readonly spriteCenter: Point;
  readonly frontIdleRest: Readonly<{ x2: number; y2: number }>;
}
export interface LiveBgSnapshotArgs {
  readonly attackerSide: Side;
  readonly attacker: LiveBgSnapshotAnchors;
  readonly target: LiveBgSnapshotAnchors;
  readonly palettes: LivePaletteComposite;
}

/** The first-body BG register state S0 (prep16 s0.3: 64/64 first-body activations, both sides, alternates, shiny). */
export const S0_REGISTERS: Readonly<Record<string, number>> = Object.freeze({
  dispcnt: 0xbf40, bg0cnt: 0x9800, bg1cnt: 0x9c00, bg2cnt: 0x5e00, bg3cnt: 0x5a0b,
  bg0hofs: 0, bg0vofs: 0, bg1hofs: 0, bg1vofs: 0, bg2hofs: 0, bg2vofs: 0, bg3hofs: 0, bg3vofs: 0,
  win0h: 240, win0v: 161, winin: 0x3f3f, winout: 0x3f3f, mosaic: 0, bldcnt: 0, bldalpha: 0, bldy: 0,
});
export const ZERO_BG_VALUES: Readonly<Record<string, number>> = Object.freeze({
  gBattle_BG0_X: 0, gBattle_BG0_Y: 0, gBattle_BG1_X: 0, gBattle_BG1_Y: 0,
  gBattle_BG2_X: 0, gBattle_BG2_Y: 0, gBattle_BG3_X: 0, gBattle_BG3_Y: 0,
});
const IDENTITY = Object.freeze([256, 0, 0, 256] as const);
/** Battler OBJ attr2 (tile | palette bank << 12): player OBJ bank 0 tile 0x171, opponent bank 1 tile 0x1d9. */
const BATTLER_ATTR2: Readonly<Record<Side, number>> = Object.freeze({ player: 2417, opponent: 6617 });
export const KNOWN_ENTRY_NON_BATTLER_SPRITES = Object.freeze([
  { slot: 0, attr: [72, 49278, 20508], subpriority: 1 }, { slot: 1, attr: [16398, 49164, 20636], subpriority: 1 },
  { slot: 2, attr: [16384, 16384, 23853], subpriority: 200 }, { slot: 60, attr: [16410, 16420, 24868], subpriority: 0 },
  { slot: 61, attr: [16398, 49228, 20668], subpriority: 1 }, { slot: 62, attr: [16468, 16542, 24860], subpriority: 0 },
  { slot: 63, attr: [72, 49342, 20572], subpriority: 1 },
] as const);

export const battlerSprite = (side: Side, anchors: LiveBgSnapshotAnchors) => {
  const { x, y } = anchors.spriteCenter, { x2, y2 } = anchors.frontIdleRest;
  return Object.freeze({
    slot: side === "player" ? 6 : 8, x, y, x2, y2,
    // CreateSprite of the 64x64 battler OBJ: attr0 y = centre - 32 (+ y2), attr1 size 3 | x = centre - 32 (+ x2).
    attr: Object.freeze([(y + y2 - 32) & 0xff, 0xc000 | (x + x2 - 32) & 0x1ff, BATTLER_ATTR2[side]] as [number, number, number]),
    subpriority: side === "player" ? 30 : 40, oamPriority: 2, matrixNum: 0, matrix: IDENTITY, flags: 1,
  });
};
const resourceWords = (name: string): readonly number[] => (paletteData.resources as Record<string, { colors: readonly number[] }>)[name]!.colors;
const palettes = (composite: LivePaletteComposite) => ({
  unfaded: composite.unfaded, faded: composite.faded, hardware: composite.hardware,
});

/** MOVE_OVERHEAT animationInputs (prep16 s2.1). Null when a battler's idle rest is non-zero (the renderer draws no idle offset). */
export function liveOverheatInputs(args: LiveBgSnapshotArgs): Inputs | null {
  const { attackerSide, attacker, target } = args, targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  if (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0
    || target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const attackerSprite = battlerSprite(attackerSide, attacker), targetSprite = battlerSprite(targetSide, target);
  const player = attackerSide === "player";
  // The hit splat's first OAM words sit 16 px up/left of Overheat's first hit point (target picture + (-5|+5, +3)).
  const hit = { x: target.picOffsetPoint.x + (player ? -5 : 5), y: target.picOffsetPoint.y + 3 };
  const sprites = [attackerSprite, targetSprite].sort((a, b) => a.slot - b.slot);
  return {
    attackerSprite, targetSprite,
    taskSlots: { monbg: 1, firstAttackerShake: 0, targetShake: 0, lastAttackerShake: 2, clearMonbg: 0 },
    spriteSlots: {
      flames: Array.from({ length: 24 }, (_, i) => [3, 4, 5, 7, 9, 10, 11, 12][i] ?? i + 5),
      hitsplats: [3, 4, 3, 3], paletteBlends: [3, 3, 4, 3, 3],
    },
    matrixSlots: { hitsplats: [0, 3, 0, 0] },
    resources: {
      smallEmber: { tag: 10029, tileSlot: 6, paletteAllocatorSlot: 7, hardwarePaletteBank: 23, tileRange: [537, 80],
        palette: resourceWords("ANIM_TAG_SMALL_EMBER") },
      impact: { tag: 10135, tileSlot: 7, paletteAllocatorSlot: 8, hardwarePaletteBank: 24, tileRange: [305, 16],
        palette: resourceWords("ANIM_TAG_IMPACT") },
    },
    allocator: {
      initialOccupiedSprites: [0, 1, 2, 6, 8, 60, 61, 62, 63], initialMatrixBitmap: 0x6,
      spriteOrder: [], // replaced by the caller with the lent first-body order
      initialLiveSprites: [...KNOWN_ENTRY_NON_BATTLER_SPRITES.map((s) => ({ slot: s.slot, attr: s.attr as unknown as [number, number, number], subpriority: s.subpriority })),
        ...sprites.map((s) => ({ slot: s.slot, attr: s.attr, subpriority: s.subpriority }))].sort((a, b) => a.slot - b.slot),
    },
    oam: {
      flame: [0, 0x8000, 31257],
      hitsplat: [0x500 | (hit.y - 16) & 0xff, 0x8000 | (hit.x - 16) & 0x1ff, 35121],
      paletteBlend: [160, 304, 65535],
    },
    palettes: palettes(args.palettes),
    background: {
      values: ZERO_BG_VALUES, xKey: `gBattle_BG${player ? 1 : 2}_X`, yKey: `gBattle_BG${player ? 1 : 2}_Y`,
      controlRegister: `bg${player ? 1 : 2}cnt`, horizontalRegister: `bg${player ? 1 : 2}hofs`, verticalRegister: `bg${player ? 1 : 2}vofs`,
      // Task_UpdateMonBg data: 32 - the target's source sprite centre.
      setupX: 32 - target.spriteCenter.x, setupY: 32 - target.spriteCenter.y,
      setupControl: player ? 0x5c02 : 0x5e02, clearX: 0, clearY: 0, clearControl: player ? 0x5c02 : 0x5e02,
      clearHorizontal: 0, clearVertical: 0, monbgPaletteBank: player ? 8 : 9,
    },
    registers: S0_REGISTERS, animationRngSeed: 0, gameplayRng: 0,
  } as Inputs;
}

// Sparkle birth table by side: [slot, matrixNum, attr0, attr1, attr2, subpriority, oamPriority] at the measured reference target
// picture y (player attacker: 42; opponent attacker: 88). Each attr0 y byte moves with the target picture y (prep14 s1.4).
const SPARKLES: Readonly<Record<Side, readonly (readonly number[])[]>> = Object.freeze({
  player: Object.freeze([[3, 0, 258, 16872, 31025, 42, 2],
  [4, 3, 300, 18408, 30001, 42, 1],
  [5, 4, 280, 18920, 30001, 86, 1],
  [7, 5, 506, 19432, 30001, 86, 1],
  [9, 6, 258, 19944, 31025, 42, 2],
  [10, 7, 300, 20456, 30001, 42, 1],
  [11, 8, 280, 20968, 30001, 86, 1],
  [12, 9, 506, 21480, 30001, 86, 1],
  [13, 10, 258, 21992, 31025, 42, 2],
  [14, 11, 300, 22504, 30001, 42, 1],
  [15, 12, 280, 23016, 30001, 86, 1],
  [16, 13, 506, 23528, 30001, 86, 1],
  [17, 14, 286, 24040, 30001, 42, 1],
  [18, 15, 262, 24552, 31025, 42, 2],
  [19, 16, 286, 25064, 30001, 42, 1],
  [20, 17, 262, 25576, 31025, 42, 2],
  [21, 18, 286, 26088, 30001, 42, 1],
  [22, 19, 262, 26600, 31025, 42, 2]]),
  opponent: Object.freeze([[3, 0, 304, 16632, 32049, 32, 3],
  [4, 3, 346, 18168, 31025, 32, 2],
  [5, 4, 326, 18680, 31025, 96, 2],
  [7, 5, 296, 19192, 31025, 96, 2],
  [9, 6, 304, 19704, 32049, 32, 3],
  [10, 7, 346, 20216, 31025, 32, 2],
  [11, 8, 326, 20728, 31025, 96, 2],
  [12, 9, 296, 21240, 31025, 96, 2],
  [13, 10, 304, 21752, 32049, 32, 3],
  [14, 11, 346, 22264, 31025, 32, 2],
  [15, 12, 326, 22776, 31025, 96, 2],
  [16, 13, 296, 23288, 31025, 96, 2],
  [17, 14, 332, 23800, 31025, 32, 2],
  [18, 15, 308, 24312, 32049, 32, 3],
  [19, 16, 332, 24824, 31025, 32, 2],
  [20, 17, 308, 25336, 32049, 32, 3],
  [21, 18, 332, 25848, 31025, 32, 2],
  [22, 19, 308, 26360, 32049, 32, 3]]),
});
const SPARKLE_REFERENCE_TARGET_Y: Readonly<Record<Side, number>> = Object.freeze({ player: 42, opponent: 88 });

/** MOVE_SILVER_WIND animationInputs (prep16 s2.2): first-body S0 registers for BOTH sides (opponent: bg1cnt 0x9c00, win0 240/161, splitBg1Cnt 0x9c01). */
export function liveSilverWindInputs(args: LiveBgSnapshotArgs): Inputs & { readonly attackerPictureOrigin: Point; readonly targetPictureOrigin: Point } {
  const { attackerSide, attacker, target } = args, targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const player = attackerSide === "player";
  const attackerSprite = battlerSprite(attackerSide, attacker), targetSprite = battlerSprite(targetSide, target);
  const targetPictureOrigin = { x: target.spriteCenter.x, y: target.picOffsetPoint.y };
  const delta = targetPictureOrigin.y - SPARKLE_REFERENCE_TARGET_Y[attackerSide];
  return {
    attackerPictureOrigin: { x: attacker.spriteCenter.x, y: attacker.spriteCenter.y }, targetPictureOrigin,
    attackerSprite, targetSprite,
    taskSlots: { pan: 0, monbg: 2, firstExclude: 1, firstFade: 3, slidingBg: 4, clearMonbg: 0, restoreFade: 0, secondExclude: 1 },
    sparkleSlots: SPARKLES[attackerSide].map(([slot, matrixNum, attr0, attr1, attr2, subpriority, oamPriority]) => ({
      slot, matrixNum, attr: [attr0! & 0xff00 | (attr0! + delta) & 0xff, attr1!, attr2!] as [number, number, number], subpriority, oamPriority,
    })),
    resources: { sparkle6: { tag: 10271, tileSlot: 6, paletteAllocatorSlot: 7, paletteBank: 23, tileRange: [305, 4],
      palette: resourceWords("ANIM_TAG_SPARKLE_6") } },
    allocator: {
      initialMatrixBitmap: 0x6, spriteOrder: [62, 60, 0, 63, 1, 61, 6, 8, 2],
      initialSprites: [
        { slot: 0, subpriority: 1, oamPriority: 0, oamY: 72 }, { slot: 1, subpriority: 1, oamPriority: 0, oamY: 14 },
        { slot: 2, subpriority: 200, oamPriority: 3, oamY: 0 },
        { slot: 6, subpriority: 30, oamPriority: 2, oamY: (player ? attackerSprite : targetSprite).attr[0] },
        { slot: 8, subpriority: 40, oamPriority: 2, oamY: (player ? targetSprite : attackerSprite).attr[0] },
        { slot: 60, subpriority: 0, oamPriority: 0, oamY: 26 }, { slot: 61, subpriority: 1, oamPriority: 0, oamY: 14 },
        { slot: 62, subpriority: 0, oamPriority: 0, oamY: 84 }, { slot: 63, subpriority: 1, oamPriority: 0, oamY: 72 },
      ],
    },
    palettes: palettes(args.palettes),
    background: {
      values: ZERO_BG_VALUES, registers: S0_REGISTERS,
      monbg: player
        ? { bg: 1, paletteBank: 8, activeCnt: 0x5c02, splitBg1Cnt: 0x5c01, splitBg2Cnt: 0x5e02 }
        : { bg: 2, paletteBank: 9, activeCnt: 0x5e02, splitBg1Cnt: 0x9c01, splitBg2Cnt: 0x5e02 },
      bugBackground: { player: "BG_BUG_PLAYER", opponent: "BG_BUG_OPPONENT" },
      bugBackgroundTaskId: { player: 23, opponent: 22 },
    },
    animationRngSeed: 0, gameplayRng: 0,
  };
}

/**
 * MOVE_PSYCH_UP animationInputs (prep16 s2.3 player; lb21 opponent), any body with a known order lend:
 * the player's `bg2cnt` is 0x5e00 at a first-body activation and the 32 software matrices are identity (measured). The spiral
 * is placed at the attacker picture origin; the monbg base scroll is 32 - the attacker's sprite centre.
 */
export function livePsychUpInputs(args: LiveBgSnapshotArgs): Inputs | null {
  const { attackerSide, attacker, target } = args;
  if (target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const player = attackerSide === "player";
  // lb21 (docs/later-bodies-overheat-psychup.md): the opponent attacker's orientation inputs, confirmed 0 px on 7 bodies.
  if (!player && (attacker.frontIdleRest.x2 !== 0 || attacker.frontIdleRest.y2 !== 0)) return null;
  const attackerSprite = battlerSprite(attackerSide, attacker), targetSprite = battlerSprite(player ? "opponent" : "player", target);
  return {
    // The player spiral sits at the attacker's picture offset point, the opponent's at its sprite centre; the target origin is
    // the target sprite centre (prep16 dump, lb21 opponent first-body capture).
    attackerPictureOrigin: player ? attacker.picOffsetPoint : attacker.spriteCenter, targetPictureOrigin: target.spriteCenter,
    attackerSprite, targetSprite,
    taskSlots: { blendCycle: 0, updateMonBg: 1, loopSound: 2, sway: 3, scale: 2, attackerPalette: 3, clearMonBg: 0 },
    spiral: { slot: 3, matrixSlot: 0, subpriority: player ? 28 : 38, attr2: 31025, painterInsertionIndex: player ? 6 : 7 },
    scaleMatrixSlot: player ? 1 : 2, spriteOrder: [], matrixBitmap: 0x6,
    matrixSlots: Array.from({ length: 32 }, () => [256, 0, 0, 256]),
    resource: { tag: 10196, tileSlot: 6, paletteBank: 7, tileRange: [305, 64] },
    monBg: { layer: player ? "bg2" : "bg1", battlerId: player ? 0 : 1, copyPaletteBank: player ? 9 : 8,
      baseScroll: { x: 32 - attacker.spriteCenter.x, y: 32 - attacker.spriteCenter.y },
      initialBgCnt: player ? 0x5e00 : 0x9c00, monBgCnt: player ? 0x5e02 : 0x5c02, initialHardwareScroll: { x: 0, y: 0 } },
    palettes: { ...palettes(args.palettes), backgroundBanks: [1, 2, 3], attackerBank: player ? 16 : 17, attackerPaletteSelectorHigh: 1,
      resourcePalette: resourceWords("ANIM_TAG_SPIRAL") },
    registers: { bldcnt: 0, bldalpha: 0, bldy: 0 }, animationRngSeed: 0, gameplayRng: 0,
  } as Inputs;
}
