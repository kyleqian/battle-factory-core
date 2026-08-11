// `AnimTask_BlendColorCycle` (reference/pokeemerald/src/battle_anim_normal.c:
// 447-506), the `blend_color_cycle` family's shared task - see
// ANIMATION_PROGRESS.md's "blend_color_cycle family map" entry for the full
// mechanism survey (28 Level-50 moves) and MOVE_GROWTH's own argv (selector
// ATTACKER, delay=0, numBlends=2, initialBlendY=0, targetBlendY=8,
// color=WHITE).
//
// This models `gPaletteFade.y`'s progression (the BG-half's own coefficient,
// "bgY" below) as a sequence of legs - one per `BeginNormalPaletteFade` call
// the task's loop makes (numBlends legs, alternating direction, the final
// leg's targetY force-overridden to 0 when numBlends==1 per source - not yet
// implemented here, only the numBlends==2 shape GROWTH and siblings A/B/C
// need). Each leg's own `y` climbs/falls by `deltaY` every 2 ticks (matching
// `UpdateNormalPaletteFade`'s BG/OBJ alternation), then holds at its target
// for a source-probed finishing sequence before the next leg (or task
// destroy) takes over.
//
// Two timing quirks, RAM-probed directly (not derived from reading the C
// alone - see `tools/probe/dump-growth-blendcolorcycle.py` and its
// `mechanic-growth-player-ivysaur-opponent-onix.json` fixture, both ticks
// 211-238 of that trace, cross-checked against `nm` addresses for
// `AnimTask_BlendColorCycle[Loop]`):
//
// 1. Only the FIRST leg gets a "free" extra half-step on its own creation
//    tick (`BeginNormalPaletteFade`'s own synchronous `UpdatePaletteFade()`
//    call landing the same tick as the regular per-frame one, since the
//    task is created from the animation-script interpreter's own per-frame
//    slot); every LATER leg (triggered from `AnimTask_BlendColorCycleLoop`,
//    itself a per-frame task) does not get this and holds at its own
//    startY for one extra tick before stepping. Modeled by `firstLegBonus`.
// 2. The finishing hold between "`y` reaches `targetY`" and "the next leg's
//    `BeginNormalPaletteFade` fires" is a fixed 7-tick sequence (2 ticks for
//    the alternating-half equality check to notice, 4 ticks of
//    `softwareFadeFinishingCounter` hold, 1 tick for the same-tick
//    re-`Begin`); the FINAL leg (task destroy, no re-`Begin`) takes one
//    additional tick, since destroy has no fused same-tick side effect to
//    piggyback on. Both constants (`POST_REACH_TICKS`, `FINAL_LEG_EXTRA_TICK`)
//    are oracle-probed, not derived.
//
// The OBJ-half (what a battler's own OBJ palette row actually renders) lags
// the BG half by the same "one step held two ticks" cadence already
// established for the S4 fades in `paletteFade.ts`, but landing on the
// EVEN-age boundary here (RAM-probed): `objY(age) = bgY(2*floor(age/2) - 1)`.

export interface BlendColorCycleLeg {
  readonly startY: number;
  readonly targetY: number;
}

export interface BlendColorCycleTiming {
  readonly legs: readonly BlendColorCycleLeg[];
  readonly deltaY: number;
}

const POST_REACH_TICKS = 7;
const FINAL_LEG_EXTRA_TICK = 1;

function legReachAge(leg: BlendColorCycleLeg, deltaY: number): number {
  const swing = Math.abs(leg.targetY - leg.startY);
  if (swing === 0) return 0;
  const steps = Math.ceil(swing / deltaY);
  return Math.max(0, 2 * steps - 2);
}

export function blendColorCycleLegDuration(
  leg: Readonly<BlendColorCycleLeg>,
  deltaY: number,
  isFinalLeg: boolean,
): number {
  // An odd/non-divisible swing is clamped on the OBJ half one transfer
  // later than an exactly divisible swing. RECOVER's literal 0<->11,
  // delta-2 cycle RAM-probes this extra tick on every leg; GROWTH's
  // divisible 0<->8 legs retain their established 13/14 durations.
  const swing = Math.abs(leg.targetY - leg.startY);
  const clampTransferTick = swing % deltaY === 0 ? 0 : 1;
  return legReachAge(leg, deltaY)
    + POST_REACH_TICKS
    + clampTransferTick
    + (isFinalLeg ? FINAL_LEG_EXTRA_TICK : 0);
}

function legStepY(
  localAge: number,
  leg: Readonly<BlendColorCycleLeg>,
  deltaY: number,
  firstLegBonus: boolean,
): number {
  const age = firstLegBonus ? localAge : localAge - 1;
  if (age < 0) return leg.startY;
  const dir = leg.targetY > leg.startY ? 1 : leg.targetY < leg.startY ? -1 : 0;
  if (dir === 0) return leg.startY;
  const step = Math.floor(age / 2) + 1;
  const raw = leg.startY + dir * deltaY * step;
  return dir > 0 ? Math.min(leg.targetY, raw) : Math.max(leg.targetY, raw);
}

export interface BlendColorCycleState {
  readonly active: boolean;
  readonly bgY: number;
}

/** `gPaletteFade.y`'s value at `age` ticks since the task's creation tick. */
export function blendColorCycleBgYAtAge(
  age: number,
  timing: Readonly<BlendColorCycleTiming>,
): BlendColorCycleState {
  let offset = 0;
  for (let i = 0; i < timing.legs.length; i++) {
    const leg = timing.legs[i]!;
    const isFinal = i === timing.legs.length - 1;
    const duration = blendColorCycleLegDuration(leg, timing.deltaY, isFinal);
    const localAge = age - offset;
    if (localAge < duration) {
      return { active: age >= 0, bgY: legStepY(localAge, leg, timing.deltaY, i === 0) };
    }
    offset += duration;
  }
  const lastLeg = timing.legs[timing.legs.length - 1]!;
  return { active: false, bgY: lastLeg.targetY };
}

/**
 * The coefficient a selected OBJ palette row actually renders with at `age`
 * (RAM-probed one-step-of-two-ticks lag behind `bgY`, landing on even-age
 * boundaries - see module doc point above).
 */
export function blendColorCycleObjYAtAge(
  age: number,
  timing: Readonly<BlendColorCycleTiming>,
): number {
  const laggedAge = 2 * Math.floor(age / 2) - 1;
  return blendColorCycleBgYAtAge(laggedAge, timing).bgY;
}
