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
