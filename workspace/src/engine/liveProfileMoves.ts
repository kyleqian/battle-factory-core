/**
 * Shared "profile" builder for Spikes (191), Octazooka (190) and Lovely Kiss (142) (prep22 s0.3 P1, s B.2-B.5).
 * Every input is production-derivable: the lowest-free sprite slots over the known-entry in-use set, the sprite
 * subpriority from the target battler's side, the attr2 words from the first / second loaded sheet's measured
 * allocation (bank 7 tile 305 / 537, bank 8 tile 305), and the palette snapshots = the assets-only composite
 * (composeLivePalettes) with the move's own asset palette written into the measured OBJ bank. No capture row is read.
 * Lovely Kiss alone consumes Random2 (4 words at age +120); its activation value comes from the presentation host.
 */
import { liveMoveTimingSidePhase, type LiveMoveTimingBody } from "./liveMoveTimingPolicy.ts";
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";

// src/engine may not import src/animation (animationBoundaryRatchet): the move assets' palettes are passed in by liveMoveAnimation.ts.
export type LiveProfileRgb = Readonly<{ r: number; g: number; b: number }>;
type Rgb = LiveProfileRgb;
const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const OBJ_BANK_BASE = 16;

/** Composite array with one OBJ bank replaced by an asset palette (OBJ bank n = palette bank 16 + n). */
function withObjBank(base: readonly number[], bank: number, palette: readonly Rgb[]): number[] {
  const out = base.slice();
  palette.forEach((c, i) => { out[(OBJ_BANK_BASE + bank) * 16 + i] = bgr555(c); });
  return out;
}

export type LiveProfileSlots = Readonly<{ free: readonly number[]; targetSide: "player" | "opponent" }>;
const targetBattlerSubpriority = (side: "player" | "opponent") => side === "player" ? 30 : 40;
const attr2 = (bank: number, tile: number) => (bank << 12) | (2 << 10) | tile;

/** `Move_SPIKES`: three spikes in the lowest free slots, the target's palette copy (monbg) leaves the OBJ banks unchanged. */
export function liveSpikesProfile(input: LiveProfileSlots & { palettes: LivePaletteComposite; activationRng: number; spikePalette: readonly Rgb[] }) {
  const { free, targetSide, palettes } = input;
  const after = (base: readonly number[]) => withObjBank(base, 7, input.spikePalette);
  return {
    animationRngAtAge0: input.activationRng,
    spriteSlots: [free[0]!, free[1]!, free[2]!] as [number, number, number],
    targetSubpriority: targetBattlerSubpriority(targetSide) - 2,
    oam: { spikeAttr2: attr2(7, 305) },
    palette: {
      unfadedAtAge0: palettes.unfaded, fadedAtAge0: palettes.faded, hardwareAtAge0: palettes.hardware,
      unfadedAfterLoad: after(palettes.unfaded), fadedAfterLoad: after(palettes.faded),
      unfadedAfterMonbg: after(palettes.unfaded), fadedAfterMonbg: after(palettes.faded),
    },
  };
}

/** `Move_OCTAZOOKA`: ball in the lowest free slot, then four smokes (graySmoke sheet bank 7, blackBall sheet bank 8). */
export function liveOctazookaProfile(input: LiveProfileSlots & { palettes: LivePaletteComposite; activationRng: number; graySmokePalette: readonly Rgb[]; blackBallPalette: readonly Rgb[] }) {
  const { free, targetSide, palettes } = input;
  const smoke = (base: readonly number[]) => withObjBank(base, 7, input.graySmokePalette);
  const ball = (base: readonly number[]) => withObjBank(smoke(base), 8, input.blackBallPalette);
  return {
    animationRngAtAge0: input.activationRng,
    ballSpriteSlot: free[0]!,
    smokeSpriteSlots: [free[0]!, free[1]!, free[2]!, free[3]!] as [number, number, number, number],
    targetSubpriority: targetBattlerSubpriority(targetSide) - 2,
    oam: { ballAttr2: attr2(8, 305), smokeAttr2: attr2(7, 537) },
    palette: {
      unfadedAtAge0: palettes.unfaded, fadedAtAge0: palettes.faded, hardwareAtAge0: palettes.hardware,
      unfadedAfterGraySmokeLoad: smoke(palettes.unfaded), fadedAfterGraySmokeLoad: smoke(palettes.faded),
      unfadedAfterBlackBallLoad: ball(palettes.unfaded), fadedAfterBlackBallLoad: ball(palettes.faded),
    },
  };
}

/**
 * `Move_LOVELY_KISS`: devil in the lowest free slot, then four hearts (pinkHeart sheet bank 7, devil sheet bank 8). The
 * reducer replays the host's four `% 180` draws from the host's activation value (plan `{ageOffset 120, count 4}`).
 */
export function liveLovelyKissProfile(input: LiveProfileSlots & { palettes: LivePaletteComposite; activationRng: number; pinkHeartPalette: readonly Rgb[]; devilPalette: readonly Rgb[] }) {
  const { free, targetSide, palettes } = input;
  const heart = (base: readonly number[]) => withObjBank(base, 7, input.pinkHeartPalette);
  const devil = (base: readonly number[]) => withObjBank(heart(base), 8, input.devilPalette);
  return {
    animationRngAtAge0: input.activationRng,
    devilSpriteSlot: free[0]!,
    heartSpriteSlots: [free[0]!, free[1]!, free[2]!, free[3]!] as [number, number, number, number],
    targetSubpriority: targetBattlerSubpriority(targetSide),
    palette: {
      unfadedAtAge0: palettes.unfaded, fadedAtAge0: palettes.faded, hardwareAtAge0: palettes.hardware,
      unfadedAfterPinkHeartLoad: heart(palettes.unfaded), fadedAfterPinkHeartLoad: heart(palettes.faded),
      unfadedAfterDevilLoad: devil(palettes.unfaded), fadedAfterDevilLoad: devil(palettes.faded),
    },
  };
}

/**
 * `Move_SIGNAL_BEAM` (324; prep22 s B.2-B.5 P3, first body only): SignalBeamLiveInputs from production sources. Geometry from the
 * battler anchors; the 23 red / green orb pairs and the palette-blend helper take the lowest free slots over the known-entry in-use
 * set (orbs released 30 rows after birth, the helper created before that age's pair and kept: `signalBeamOrbSlots`); task slots,
 * resource allocations (duck bank 9 tile 321, red bank 7 tile 305, green bank 8 tile 313), the identity matrices and the
 * non-owned painter keys (battler sprites 6 / 8 sub 30 / 40 oam priority 2 oamY = y - 32, healthbox sprites 0 1 2 60-63) are the
 * known-entry constants (equal across the four prep22 scenarios); WIN0 is the first-body (240, 161); the target palette is the
 * composite OBJ bank of the target battler. The caller gates on the first body (the WIN0 reset and the lent order).
 */
export const SIGNAL_BEAM_OCCUPIED_SLOTS: ReadonlySet<number> = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]);
export const SIGNAL_BEAM_ORB_PAIR_COUNT = 23;
export const SIGNAL_BEAM_FIRST_PAIR_AGE = 18;
export const SIGNAL_BEAM_PAIR_STEP = 3;
export const SIGNAL_BEAM_HELPER_AGE = 36;
export const SIGNAL_BEAM_ORB_LIFETIME = 30;

export function signalBeamOrbSlots(): Readonly<{ pairs: readonly { redSlot: number; greenSlot: number }[]; helperSlot: number }> {
  const used = new Set(SIGNAL_BEAM_OCCUPIED_SLOTS);
  const freeAt = new Map<number, number[]>();
  const lowest = (n: number) => Array.from({ length: 64 }, (_, i) => i).filter((i) => !used.has(i)).slice(0, n);
  const pairs: { redSlot: number; greenSlot: number }[] = [];
  let helperSlot = -1;
  for (let age = 0; pairs.length < SIGNAL_BEAM_ORB_PAIR_COUNT; age += 1) {
    for (const slot of freeAt.get(age) ?? []) used.delete(slot);
    const k = (age - SIGNAL_BEAM_FIRST_PAIR_AGE) / SIGNAL_BEAM_PAIR_STEP;
    if (age < SIGNAL_BEAM_FIRST_PAIR_AGE || !Number.isInteger(k)) continue;
    if (age === SIGNAL_BEAM_HELPER_AGE) { helperSlot = lowest(1)[0]!; used.add(helperSlot); }
    const [redSlot, greenSlot] = lowest(2) as [number, number];
    used.add(redSlot); used.add(greenSlot);
    pairs.push({ redSlot, greenSlot });
    freeAt.set(age + SIGNAL_BEAM_ORB_LIFETIME, [...(freeAt.get(age + SIGNAL_BEAM_ORB_LIFETIME) ?? []), redSlot, greenSlot]);
  }
  return { pairs, helperSlot };
}

const IDENTITY_MATRIX = [256, 0, 0, 256] as const;
const HEALTHBOX_PAINTER_KEYS = [
  { slot: 0, subpriority: 1, oamPriority: 0, oamY: 72 }, { slot: 1, subpriority: 1, oamPriority: 0, oamY: 14 },
  { slot: 2, subpriority: 200, oamPriority: 3, oamY: 0 }, { slot: 60, subpriority: 0, oamPriority: 0, oamY: 26 },
  { slot: 61, subpriority: 1, oamPriority: 0, oamY: 14 }, { slot: 62, subpriority: 0, oamPriority: 0, oamY: 84 },
  { slot: 63, subpriority: 1, oamPriority: 0, oamY: 72 },
] as const;

type Anchors = Readonly<{ picOffsetPoint: Readonly<{ x: number; y: number }>; spriteCenter: Readonly<{ x: number; y: number }>;
  frontIdleRest: Readonly<{ x2: number; y2: number }> }>;

export function liveSignalBeamInputs(input: {
  attackerSide: "player" | "opponent"; attacker: Anchors; target: Anchors; palettes: LivePaletteComposite;
  /** The lent 64-slot sSpriteOrder at activation. */
  spriteOrder: readonly number[];
}) {
  const { attackerSide, attacker, target } = input;
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const sub = (side: string) => (side === "player" ? 30 : 40);
  const battler = (side: "player" | "opponent", a: Anchors) => ({
    slot: side === "player" ? 6 : 8, x: a.spriteCenter.x, y: a.spriteCenter.y, x2: a.frontIdleRest.x2, y2: a.frontIdleRest.y2,
    subpriority: sub(side), oamPriority: 2, matrixNum: 0, matrix: IDENTITY_MATRIX,
  });
  const { pairs, helperSlot } = signalBeamOrbSlots();
  const targetBank = targetSide === "player" ? 0 : 1;
  return {
    attackerPictureOrigin: attacker.picOffsetPoint, targetPictureOrigin: target.picOffsetPoint,
    attackerSprite: battler(attackerSide, attacker), targetSprite: battler(targetSide, target),
    orbPairs: pairs, taskSlots: { attackerShake: 0, pan: 1, sinTimer: 2, targetShake: 3 }, paletteBlendSpriteSlot: helperSlot,
    resources: {
      duck: { paletteBank: 9, tileSlot: 2, tileRange: [321, 16] as const },
      redOrb: { paletteBank: 7, tileSlot: 0, tileRange: [305, 16] as const },
      greenOrb: { paletteBank: 8, tileSlot: 1, tileRange: [313, 8] as const },
    },
    matrixBitmap: 6, matrixSlots: Array.from({ length: 32 }, () => IDENTITY_MATRIX),
    spriteOrder: input.spriteOrder,
    painterSprites: [
      ...HEALTHBOX_PAINTER_KEYS,
      { slot: 6, subpriority: 30, oamPriority: 2, oamY: ((attackerSide === "player" ? attacker : target).spriteCenter.y - 32) & 0xff },
      { slot: 8, subpriority: 40, oamPriority: 2, oamY: ((attackerSide === "opponent" ? attacker : target).spriteCenter.y - 32) & 0xff },
    ].sort((l, r) => l.slot - r.slot),
    targetPalette: { bank: 16 + targetBank, unfaded: input.palettes.unfaded.slice((16 + targetBank) * 16, (16 + targetBank) * 16 + 16) },
    registers: { win0h: 240, win0v: 161 },
    animationRngSeed: 0, gameplayRng: null,
  };
}

/**
 * `Move_SHEER_COLD` (329; prep22 s B.2-B.5 P3, first body only): SheerColdLiveInputs from production sources. The single FrozenIceCube sprite
 * takes the lowest free slot over the known-entry in-use set; the cube is born at the target picOffsetPoint - (32, 36) and Task_UpdateMonBg
 * carries the target sprite (x + x2, y + y2) with the scroll (32 - x, 32 - y) on bg2 for a player target / bg1 for an opponent target.
 * Task slots, the cube resource (bank 7, tile 305, 64 tiles) and the activation BG registers (the reducer defaults) are the known-entry
 * constants equal across the four prep22 scenarios; the order is the lent known-entry `sSpriteOrder`. The caller gates on the first body.
 */
export function liveSheerColdInputs(input: {
  attackerSide: "player" | "opponent"; attacker: Anchors; target: Anchors; spriteOrder: readonly number[];
  /** The order host's body class (d4later: an opponent attacker's later body takes the age-171 lag); default the first body. */
  body?: LiveMoveTimingBody;
}) {
  const { attackerSide, attacker, target } = input;
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const sprite = (side: "player" | "opponent") => ({ slot: side === "player" ? 6 : 8, subpriority: side === "player" ? 30 : 40, matrixNum: 0, matrix: IDENTITY_MATRIX });
  const cubeSpriteSlot = Array.from({ length: 64 }, (_, i) => i).find((i) => !SIGNAL_BEAM_OCCUPIED_SLOTS.has(i))!;
  const tx = target.spriteCenter.x + target.frontIdleRest.x2, ty = target.spriteCenter.y + target.frontIdleRest.y2;
  return {
    targetAnimationCenter: target.picOffsetPoint, targetBattlePositionCenter: { x: tx, y: ty },
    attackerSprite: sprite(attackerSide), targetSprite: sprite(targetSide), cubeSpriteSlot,
    taskSlots: { fadeToBg: 0, cube: 0, updateMonBg: 1, sound: 2, clearMonBg: 0, restoreBg: 0 },
    resources: { iceCube: { paletteBank: 7, tileSlot: 0, tileRange: [305, 64] as const } },
    matrixBitmap: 6, spriteOrder: input.spriteOrder,
    painterSprites: [
      ...HEALTHBOX_PAINTER_KEYS.map((k) => ({ slot: k.slot, subpriority: k.subpriority, oamPriority: k.oamPriority, y: k.oamY })),
      { slot: 6, subpriority: 30, oamPriority: 2, y: ((attackerSide === "player" ? attacker : target).spriteCenter.y - 32) & 0xff },
      { slot: 8, subpriority: 40, oamPriority: 2, y: ((attackerSide === "opponent" ? attacker : target).spriteCenter.y - 32) & 0xff },
    ].sort((l, r) => l.slot - r.slot),
    monbg: { layer: targetSide === "player" ? "bg2" as const : "bg1" as const, scroll: { x: 32 - tx, y: 32 - ty } },
    animationRng: 0, gameplayRng: null,
    // D4 (#151): the restorebg fade end from the faithful-timing policy's per-side age-171 lag (189 with the lag, 188 without).
    restoreFadeEndAge: liveSheerColdRestoreFadeEndAge(attackerSide, input.body),
  };
}

/** Sheer Cold's restore fade end (D4, liveMoveTimingPolicy.ts 329): 188 + the chosen age-171 lag of the attacker's side and body class. */
export function liveSheerColdRestoreFadeEndAge(attackerSide: "player" | "opponent", body: LiveMoveTimingBody = "first"): number {
  return 188 + (liveMoveTimingSidePhase(329, "optional-lag-age", attackerSide, body) === "event" ? 1 : 0);
}

type EruptionSide = "player" | "opponent";
/** Anchors of one battler (liveMoveAnimation.ts liveBattlerAnchors). */
export type LiveEruptionAnchors = Readonly<{ picOffsetPoint: Readonly<{ x: number; y: number }>; spriteCenter: Readonly<{ x: number; y: number }>;
  frontIdleRest: Readonly<{ x2: number; y2: number }> }>;
/** K (prep36 ER36, equal in 10/10 windows) and S (Move_ERUPTION script cadence, battle_anim_scripts.s:3805-3828) constants. */
const ERUPTION = Object.freeze({
  tag: 10201, tileRange: [537, 84] as [number, number], paletteSlot: 7,
  paletteTags: [65535, 65535, 65535, 65535, 54322, 55039, 55044, 65535, 65535, 65535, 65535, 65535, 65535, 65535, 65535, 65535],
  occupied: [0, 1, 2, 6, 8, 60, 61, 62, 63], matrixNum: { player: 1, opponent: 2 } as Record<EruptionSide, number>,
  battlerSub: { player: 30, opponent: 40 } as Record<EruptionSide, number>,
  launchTask: 0, companionTask: 1, platformTask: 0, battlerTask: 1, audioTask: 2,
  wave1Start: 19, companionWait: 59, wave2Gap: 2, fallingAfterE2: 34, shakeAfterFalling: 23, audioAfterFalling: 24, closingAfterFalling: 106, endAfterE2: 294,
});
export interface LiveEruptionProfileInput {
  readonly attackerSide: EruptionSide;
  readonly anchors: Readonly<Record<EruptionSide, LiveEruptionAnchors>>;
  /** GetBattlerYDeltaFromSpriteId: the attacker's pic-coords y_offset (art view coords.yOffset). */
  readonly attackerYDelta: number;
  readonly palettes: LivePaletteComposite;
  readonly warmRockPalette: readonly Rgb[];
  /** Known-entry scene occupants (liveBgSnapshotMoves.ts KNOWN_ENTRY_NON_BATTLER_SPRITES) and the battler OBJ (battlerSprite) for the sort keys. */
  readonly sceneSprites: readonly Readonly<{ slot: number; attr: readonly number[]; subpriority: number }>[];
  readonly battlerSprites: Readonly<Record<EruptionSide, Readonly<{ slot: number; attr: readonly number[]; subpriority: number }>>>;
  readonly activationOrder: readonly number[];
  readonly animationRng: number;
  /** Seam-provided eruptionLaunch.ts eruptionLaunchTimeline: the task lifetime of the wave whose source offset is given. */
  readonly launchLifetime: (launch: Record<string, unknown>, sourceOffset: 33 | 46) => readonly [number, number];
  /** Seam-provided eruptionFallingRock.ts ERUPTION_FALLING_ROCK_SOURCE_CALLS. */
  readonly fallingCalls: unknown;
}
/**
 * `Move_ERUPTION` (docs/next-adapters-prep36.md s0-s2; ported 1:1 from tools/integration/prep36EruptionModel.ts eruptionProfile36): the complete
 * EruptionAnimationProfile from production facts. The schedule comes from the UNCHANGED launch reducer: wave 1's task end E1 (wave 2 parked),
 * wave 2 at E1 + 2 and its end E2; falling rocks at E2 + 34, HorizontalShake + 23, loopsewithpan + 24, closing blend + 106, end E2 + 294.
 * The gameplay RNG field is a reducer pass-through (never read by the renderer): 0, presentation never sees gameplay RNG.
 */
export function liveEruptionProfile(input: LiveEruptionProfileInput): Record<string, unknown> & { endAge: number } {
  const side = input.attackerSide, tside: EruptionSide = side === "player" ? "opponent" : "player";
  const A = input.anchors[side], T = input.anchors[tside];
  const freeAtEntry = Array.from({ length: 64 }, (_, s) => s).filter((s) => !ERUPTION.occupied.includes(s));
  const geometry = { attackerSpriteSlot: side === "player" ? 6 : 8, attackerX: A.spriteCenter.x, attackerY: A.spriteCenter.y,
    centerToCornerVecY: -64, battlerPicHeight: 64, battlerYDelta: input.attackerYDelta, matrixNum: ERUPTION.matrixNum[side],
    ...(A.frontIdleRest.x2 || A.frontIdleRest.y2 ? { initialX2: A.frontIdleRest.x2, initialY2: A.frontIdleRest.y2 } : {}) };
  const allocator = (freeSpriteSlots: readonly number[], endAge: number) => ({ freeSpriteSlots, tileTag: ERUPTION.tag, paletteTag: ERUPTION.tag,
    tileRange: ERUPTION.tileRange, tileRangeBeforeLoad: [0, 0] as [number, number], paletteSlot: ERUPTION.paletteSlot, loadedAge: 1, freedAge: endAge });
  const launchFor = (wave2Start: number, endAge: number) => ({
    side, geometry, allocator: allocator(freeAtEntry, endAge), taskSlot: ERUPTION.launchTask,
    waves: [
      { taskStartAge: ERUPTION.wave1Start, sourceOffset: 33, companionTaskSlot: ERUPTION.companionTask, companionTaskEndAge: ERUPTION.wave1Start + ERUPTION.companionWait },
      { taskStartAge: wave2Start, sourceOffset: 46, companionTaskSlot: ERUPTION.companionTask, companionTaskEndAge: wave2Start + ERUPTION.companionWait },
    ],
    startingAnimationRng: input.animationRng, endAge,
  });
  const e1 = input.launchLifetime(launchFor(900, 1200), 33)[1];
  const wave2Start = e1 + ERUPTION.wave2Gap;
  const e2 = input.launchLifetime(launchFor(wave2Start, 1200), 46)[1];
  const endAge = e2 + ERUPTION.endAfterE2, creationAge = e2 + ERUPTION.fallingAfterE2;
  const resources = { tileTag: ERUPTION.tag, paletteTag: ERUPTION.tag, tileRangeBeforeLoad: [0, 0] as [number, number], tileRange: ERUPTION.tileRange,
    paletteSlot: ERUPTION.paletteSlot, loadedAge: 1, freedAge: endAge };
  const signedY = (attr0: number) => ((attr0 & 0xff) >= 160 ? (attr0 & 0xff) - 256 : attr0 & 0xff);
  const scene = [...input.sceneSprites, input.battlerSprites.player, input.battlerSprites.opponent].sort((a, b) => a.slot - b.slot);
  const keys = [...scene, input.battlerSprites[side], input.battlerSprites[tside]].map((s) => ({
    slot: s.slot, priority: ((s.attr[2]! >> 10) & 3) as 0 | 1 | 2 | 3, subpriority: s.subpriority, y: signedY(s.attr[0]!) }));
  // AnimTask_EruptionLaunchRocks_Step zeroes the attacker x2 and restores y (battle_anim_fire.c:845, 899): at the shake creation the attacker
  // carries no idle rest; the target keeps its species rest.
  const shakeBattler = (s: EruptionSide) => ({ battlerId: s === "player" ? 0 : 1, side: s, spriteSlot: s === "player" ? 6 : 8,
    x: input.anchors[s].spriteCenter.x, y: input.anchors[s].spriteCenter.y,
    initialX2: s === side ? 0 : input.anchors[s].frontIdleRest.x2, initialY2: s === side ? 0 : input.anchors[s].frontIdleRest.y2 });
  const orientation = side === "player" ? "player-back" : "opponent-front";
  return {
    orientation, endAge, launch: launchFor(wave2Start, endAge),
    falling: { creationAge, endAge, calls: input.fallingCalls,
      geometry: { oamCenterOffsetX: 16, oamCenterOffsetY: 16, subpriority: 3, oamPriority: 2, horizontalFlip: true },
      allocator: allocator(freeAtEntry.slice(0, 6), endAge), startingAnimationRng: input.animationRng },
    horizontalShake: { orientation, taskCreationAge: creationAge + ERUPTION.shakeAfterFalling, endAge, platformTaskSlot: ERUPTION.platformTask,
      battlerTaskSlot: ERUPTION.battlerTask, platformInitialX: 0, battlers: [shakeBattler("player"), shakeBattler("opponent")],
      startingAnimationRng: input.animationRng, gameplayRng: 0, resources },
    palette: { closingCommandAge: creationAge + ERUPTION.closingAfterFalling, cleanupAge: endAge,
      attackerBattler: side === "player" ? 0 : 1, targetBattler: side === "player" ? 1 : 0, visiblePartnerBattlers: [],
      paletteSpriteSlots: { opening: freeAtEntry[0]!, closing: freeAtEntry[0]! },
      geometry: { x: T.picOffsetPoint.x, y: T.picOffsetPoint.y, openingSubpriority: ERUPTION.battlerSub[side] - 2, closingSubpriority: 3 },
      warmRockPaletteSlot: ERUPTION.paletteSlot, paletteTagsAtAge0: ERUPTION.paletteTags,
      unfadedPaletteAtAge0: input.palettes.unfaded, fadedPaletteAtAge0: input.palettes.faded, hardwarePaletteAtAge0: input.palettes.hardware,
      warmRockPalette: input.warmRockPalette.map(bgr555) },
    audio: { commandAge: creationAge + ERUPTION.audioAfterFalling, endAge, taskSlot: ERUPTION.audioTask, attackerSide: side, targetSide: tside },
    gameplayRng: 0,
    spriteOrder: { initialOrder: input.activationOrder, initialKeys: keys },
  };
}
