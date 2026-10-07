/**
 * Shared "profile" builder for Spikes (191), Octazooka (190) and Lovely Kiss (142) (prep22 s0.3 P1, s B.2-B.5).
 * Every input is production-derivable: the lowest-free sprite slots over the known-entry in-use set, the sprite
 * subpriority from the target battler's side, the attr2 words from the first / second loaded sheet's measured
 * allocation (bank 7 tile 305 / 537, bank 8 tile 305), and the palette snapshots = the assets-only composite
 * (composeLivePalettes) with the move's own asset palette written into the measured OBJ bank. No capture row is read.
 * Lovely Kiss alone consumes Random2 (4 words at age +120); its activation value comes from the presentation host.
 */
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
