/**
 * Live input builders for the zero-Random2 "Q2" bodies (prep25 s0.2 / B.4 / B.5 / C): Snore (173), Sky Attack (143), Hyper Voice (304),
 * Sand Tomb (328), Smog (123). Every field is production-derivable: geometry from the battler anchors, sprite / matrix / task slots from the
 * known-entry allocator (lowest free over [0,1,2,6,8,60..63]) plus the measured per-move K tables (equal across the four prep25
 * scenarios), the assets-only palette composite with the move's own asset palettes written by the reducers, the lent 64-slot order, and the
 * WIN0 history rule (first body (240,161); (0,0) once an earlier body ran). No capture row is read.
 */
import { liveMoveTimingSidePhase } from "./liveMoveTimingPolicy.ts";
import { KNOWN_ENTRY_NON_BATTLER_SPRITES, S0_REGISTERS, ZERO_BG_VALUES, battlerSprite, type LiveBgSnapshotArgs } from "./liveBgSnapshotMoves.ts";
import { liveMoveOptionalLagAge } from "./liveMoveTimingPolicy.ts";

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
    // D4 (#151): the age-59 palette-upload band from the faithful-timing policy (liveMoveTimingPolicy.ts 304; dominant = the late upload).
    paletteUploadLate: liveMoveTimingSidePhase(304, "palette-upload-scanline", attackerSide) === "event",
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
export function liveSandTombProfile(args: Omit<LiveQ2Args, "firstBody" | "target" | "palettes"> & { target: PositionAnchors; freeSpriteSlots: readonly number[];
  /** trp1: Status_SandTomb (sandTomb.ts `turn-trap`); absent = MOVE_SAND_TOMB. */
  turnTrap?: boolean }): Inputs {
  const { attackerSide, attacker, target } = args, targetSide = opposite(attackerSide), player = attackerSide === "player";
  const attackerSprite = battlerSprite(attackerSide, attacker), targetSprite = battlerSprite(targetSide, target);
  const keys = orderKeys(attackerSide, attackerSprite.attr[0], targetSprite.attr[0])
    .map((k) => ({ slot: k.slot, priority: k.oamPriority, subpriority: k.subpriority, y: signedOamY(k.oamY) }));
  return {
    orientation: player ? "player-back" : "opponent-front", endAge: args.turnTrap === true ? 99 : 123, attackerSide,
    ...(args.turnTrap === true ? { body: "turn-trap" } : {}),
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

/**
 * `Move_BONEMERANG` (155; prep29 B.1): one input per hit body (71 rows, constant). Picture centres are the battlers' picture offset points; the bone /
 * impact / lunge sprites take slots 3 / 4 / 4 (lowest free, birth-first) with the attacker's battler subpriority - 2; tasks shake 0 / monbg 1 / clear 0;
 * the monbg scroll is 32 - the target sprite centre on the target's BG (opponent target BG1, player target BG2). The BG control registers are the
 * first-body S0 pair for hit 1; hit 2 starts from hit 1's split values (a Bonemerang hit is the only history this builder supports).
 */
export function liveBonemerangInputs(args: LiveQ2Args): Inputs {
  const { attackerSide, attacker, target } = args, targetSide = opposite(attackerSide), toOpponent = targetSide === "opponent";
  const attackerSprite = battlerSprite(attackerSide, attacker), targetSprite = battlerSprite(targetSide, target);
  const monbgBg1Cnt = toOpponent ? 0x5c02 : 0x9c00, monbgBg2Cnt = toOpponent ? 0x5e00 : 0x5e02;
  const splitBg1Cnt = toOpponent ? 0x5c02 : 0x9c01, splitBg2Cnt = toOpponent ? 0x5e00 : 0x5e02;
  const first = args.firstBody;
  return {
    attackerPictureCenter: { ...attacker.picOffsetPoint }, targetPictureCenter: { ...target.picOffsetPoint },
    attackerSprite, targetSprite,
    allocations: { boneSpriteSlot: 3, impactSpriteSlot: 4, lungeSpriteSlot: 4, shakeTaskSlot: 0, updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0, boneMatrixSlot: 0, impactMatrixSlot: 3 },
    resources: { bone: { tileSlot: 6, paletteBank: 7, tileRange: [305, 16] }, impact: { tileSlot: 7, paletteBank: 8, tileRange: [321, 16] } },
    spriteOrder: args.spriteOrder,
    painterSprites: orderKeys(attackerSide, attackerSprite.attr[0], targetSprite.attr[0]).map((k) => ({ slot: k.slot, subpriority: k.subpriority, oamPriority: k.oamPriority, oamY: k.oamY })),
    initialMatrixBitmap: 6,
    monbg: { layer: toOpponent ? "bg1" : "bg2", scroll: { x: 32 - target.spriteCenter.x, y: 32 - target.spriteCenter.y }, targetBgPriority: toOpponent ? 1 : 0 },
    background: {
      baseBg1Cnt: first ? 0x9c00 : splitBg1Cnt, baseBg2Cnt: first ? 0x5e00 : splitBg2Cnt, monbgBg1Cnt, monbgBg2Cnt, splitBg1Cnt, splitBg2Cnt,
    },
    animationRngSeed: 0, gameplayRng: null,
  };
}

/** The Dig first-body scanline S0 (prep18 s1.1; Rapid Spin's entry state is the same constant, prep29 B.3): bank 0 = 80 x +2, 80 x -2, then zeros; bank 1 zero. */
const rapidSpinScanline = (): [number[], number[]] => [[...Array(80).fill(2), ...Array(80).fill(-2), ...Array(160).fill(0)], Array(320).fill(0)];

/**
 * `Move_RAPID_SPIN` (229; prep29 B.3): 130 rows. The spin sprite sits at the attacker's BATTLE POSITION centre and the hit splat at the target's picture
 * offset point (the seam takes the attacker / target `animationCenter`s, set by the caller); both effect sprites take slot 3 (lowest free), the splat
 * matrix 0, tasks elevation 0 / shake 0 / monbg 1 / clear 0 / sound 2; the monbg is the ATTACKER's (BG2 for a player attacker, BG1 for an opponent) at
 * 32 - its sprite centre. Power / damage come from the request; the entry scanline is the constant S0 banks.
 */
export function liveRapidSpinInputs(args: Omit<LiveQ2Args, "firstBody" | "palettes"> & { movePower: number; moveDamage: number }): Inputs {
  const { attackerSide, attacker, target } = args, targetSide = opposite(attackerSide), player = attackerSide === "player";
  return {
    attackerSpriteSlot: player ? 6 : 8, targetSpriteSlot: player ? 8 : 6, rapidSpriteSlot: 3, impactSpriteSlot: 3, impactMatrixSlot: 0,
    elevationTaskSlot: 0, shakeTaskSlot: 0, monbgTaskSlot: 1, clearTaskSlot: 0, soundTaskSlot: 2,
    spriteOrder: args.spriteOrder, paletteBanks: { impact: 7, rapidSpin: 8 }, tileSlots: { impact: 6, rapidSpin: 7 }, baseMatrixBitmap: 6,
    movePower: args.movePower, moveDamage: args.moveDamage,
    targetInitialOffset: { x: target.frontIdleRest.x2, y: target.frontIdleRest.y2 },
    animationRng: 0,
    monbg: { layer: player ? "bg2" : "bg1", spriteX: attacker.spriteCenter.x, spriteY: attacker.spriteCenter.y,
      bgX: 32 - attacker.spriteCenter.x, bgY: 32 - attacker.spriteCenter.y, inBg2: player, battlerId: player ? 0 : 1 },
    initialScanlineSrcBuffer: 1, initialScanlineBanks: rapidSpinScanline(),
    gameplayRng: null, targetSide,
  };
}

const OUTRAGE_FLAME_BIRTHS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 27, 29, 31, 33, 35, 37, 39, 44, 46, 48, 50, 52, 54, 56] as const;
/** Lowest-free flame slots over the known-entry in-use set, births first; a flame is destroyed at birth + 31 after that frame's births (prep29 B.6). */
const outrageFlameSlots = (): number[] => {
  const used = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]), slots: number[] = [], freed = new Set<number>();
  OUTRAGE_FLAME_BIRTHS.forEach((age, i) => {
    OUTRAGE_FLAME_BIRTHS.forEach((birth, j) => { if (j < i && birth + 31 < age && !freed.has(j)) { freed.add(j); used.delete(slots[j]!); } });
    let s = 0; while (used.has(s)) s += 1;
    used.add(s); slots.push(s);
  });
  return slots;
};

/**
 * `Move_OUTRAGE` (200; prep29 B.6): 119 rows, first body only (S0 registers). The flame origin is the attacker's picture offset point; the 23 flames take
 * the lowest-free slots (birth-first, destroyed at birth + 31); the flame OAM words are the known-entry constant [0, 0x8000, 31257]; tasks
 * loop-SE 0 / blend 1 / elliptical translate 2 / shake 3; ANIM_TAG_SMALL_EMBER: tile slot 6, tiles 537..616, hardware bank 23.
 */
export function liveOutrageInputs(args: LiveBgSnapshotArgs & { spriteOrder: readonly number[]; smallEmberPalette: readonly number[] }): Inputs {
  const { attackerSide, attacker, target } = args;
  const attackerSprite = battlerSprite(attackerSide, attacker), targetSprite = battlerSprite(opposite(attackerSide), target);
  const sprites = [attackerSprite, targetSprite].sort((a, b) => a.slot - b.slot);
  return {
    attackerPictureOrigin: { ...attacker.picOffsetPoint }, targetPictureOrigin: { ...target.spriteCenter },
    attackerSprite, targetSprite,
    taskSlots: { loopSe: 0, blendColorCycle: 1, translateMonElliptical: 2, shakeMon2: 3 },
    spriteSlots: { flames: outrageFlameSlots() },
    resources: { smallEmber: { tag: 10029, tileSlot: 6, paletteAllocatorSlot: 7, hardwarePaletteBank: 23, tileRange: [537, 80], palette: [...args.smallEmberPalette] } },
    allocator: {
      initialOccupiedSprites: [0, 1, 2, 6, 8, 60, 61, 62, 63], initialMatrixBitmap: 6, spriteOrder: args.spriteOrder,
      initialLiveSprites: [...KNOWN_ENTRY_NON_BATTLER_SPRITES.map((s) => ({ slot: s.slot, attr: [...s.attr] as [number, number, number], subpriority: s.subpriority })),
        ...sprites.map((s) => ({ slot: s.slot, attr: s.attr, subpriority: s.subpriority }))].sort((a, b) => a.slot - b.slot),
    },
    oam: { flame: [0, 0x8000, 31257] },
    palettes: { unfaded: args.palettes.unfaded, faded: args.palettes.faded, hardware: args.palettes.hardware },
    registers: { ...S0_REGISTERS }, animationRngSeed: 0, gameplayRng: null,
  };
}

/**
 * `Move_LUSTER_PURGE` (295; prep29 B.5, faithful-random): the circle is at the attacker's picture offset point, the six hit splats at the target's battle
 * position centre + (-1, +2) for a player target / (+1, +2) for an opponent target, the monbg at the attacker sprite centre (scroll 32 - centre).
 * The six word pairs (plan rows {ageOffset: 170 + 5k, count: 2}) come only from the presentation host.
 */
export function liveLusterPurgeFields(args: Omit<LiveQ2Args, "firstBody" | "palettes" | "spriteOrder"> & { target: PositionAnchors; draws: readonly (readonly number[])[] }) {
  const { attackerSide, attacker, target } = args, player = attackerSide === "player";
  return {
    attackerBattlerId: (player ? 0 : 1) as 0 | 1, attackerSpriteSlot: player ? 6 : 8, targetSpriteSlot: player ? 8 : 6,
    targetInitialX2: target.frontIdleRest.x2,
    circleCenter: { ...attacker.picOffsetPoint }, monbgCenter: { ...attacker.spriteCenter },
    monbgPosition: { x: 32 - attacker.spriteCenter.x, y: 32 - attacker.spriteCenter.y },
    hitsplatCenter: { x: target.battlePositionCenter.x + (player ? 1 : -1), y: target.battlePositionCenter.y + 2 },
    visualRandom: { hitsplats: args.draws.map((pair) => ({ x: pair[0]!, y: pair[1]! })) as never },
  };
}

const IDENTITY_MATRIX = [256, 0, 0, 256] as const;
/** The source's optional late lag age of Mach Punch (machPunch.ts animationDrawsAtAge / MACH_PUNCH_PLAYER_FIRST_INACTIVE). */
const MACH_PUNCH_OPTIONAL_LAG_AGE = 91;

/**
 * `Move_MACH_PUNCH` (183; prep25 s0.2 / B.5, FAITHFUL TIMING D4): first body only. Tasks fade 0 / monbg 1 / sliding BG 3 / punch 0 / shake 2 /
 * clear 0 / restore fade 2; the eight traces take the known-entry free slots 3, 4, 5, 7, 9..12, the hit splat 13 and the fist 14 (lowest free,
 * matrix 0, fist scale 303); impact tile slot 6 / bank 7, hands-and-feet tile slot 7 / bank 8; the trace palette is OBJ bank 9, whose unfaded
 * contents at a first body are the known-entry healthbar palette (tag 55044; equal in all eight D4a / prep25 scenarios, two trainers, any species).
 * Traces start at the attacker's sprite centre, the hit splat at the
 * target's picture offset point. The optional late lag at age 91 (CPU phase) comes only from the timing policy (dominant phase, 110 rows).
 */
/** Null when the target has a non-zero idle rest (species audit 9: a residual at age 60 stays unexplained for ONIX / RATTATA targets). */
export function liveMachPunchInputs(args: LiveQ2Args & { healthbarPalette: readonly number[] }): Inputs | null {
  const { attackerSide, attacker, target } = args, targetSide = opposite(attackerSide);
  if (target.frontIdleRest.x2 !== 0 || target.frontIdleRest.y2 !== 0) return null;
  const attackerSprite = battlerSprite(attackerSide, attacker), targetSprite = battlerSprite(targetSide, target);
  const lag = liveMoveOptionalLagAge(183);
  if (lag !== null && lag !== MACH_PUNCH_OPTIONAL_LAG_AGE) throw new Error(`Mach Punch timing policy lag age ${lag} is not the source's ${MACH_PUNCH_OPTIONAL_LAG_AGE}`);
  const battlerInput = (s: ReturnType<typeof battlerSprite>) =>
    ({ slot: s.slot, x: s.x, y: s.y, x2: s.x2, y2: s.y2, subpriority: s.subpriority, oamPriority: s.oamPriority, matrixNum: s.matrixNum, matrix: [...s.matrix] });
  return {
    attackerPictureOrigin: { ...attacker.spriteCenter }, targetPictureOrigin: { ...target.picOffsetPoint },
    attackerSprite: battlerInput(attackerSprite), targetSprite: battlerInput(targetSprite),
    taskSlots: { monBg: 1, initialFade: 0, slidingBg: 3, punch: 0, shake: 2, clearMonBg: 0, restoreFade: 2 },
    traceSlots: [3, 4, 5, 7, 9, 10, 11, 12], hitSplatSlot: 13, fistSlot: 14, matrixSlot: 0,
    resources: { impact: { tileSlot: 6, paletteBank: 7, tileRange: [305, 16] }, handsAndFeet: { tileSlot: 7, paletteBank: 8, tileRange: [537, 64] } },
    tracePalette: { bank: 9, bgr555: [...args.healthbarPalette] },
    matrixBitmap: 6, matrixSlots: Array.from({ length: 32 }, () => [...IDENTITY_MATRIX]), fistMatrix: [303, 0, 0, 303],
    spriteOrder: args.spriteOrder,
    painterSprites: orderKeys(attackerSide, attackerSprite.attr[0], targetSprite.attr[0])
      .map((k) => ({ slot: k.slot, subpriority: k.subpriority, oamPriority: k.oamPriority, oamY: k.oamY & 0xff })),
    registers: { bg3hofs: 0, bldcnt: 0, bldalpha: 0, bldy: 0 },
    animationRngSeed: 0, gameplayRng: null,
    optionalLateLag: lag !== null,
  };
}
