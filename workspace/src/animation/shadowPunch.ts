// 1:1 port of `AnimTask_AttackerPunchWithTrace` (`reference/pokeemerald/src/
// battle_anim_mons.c:2392-2496` - NOT `battle_anim_fight.c` as the prior
// session's own scoping note said; confirmed directly via `nm` against the
// pinned elf). MOVE_SHADOW_PUNCH's own single unproven component
// (ANIMATION_PROGRESS.md's 2026-07-25 "BG-swap pipeline" dissolution
// verdict) - every other op in `Move_SHADOW_PUNCH` (battle_anim_scripts.s:
// 4308-4327) is already exact-proven by FIRE_PUNCH/ICE_PUNCH/THUNDER_PUNCH/
// EXTREME_SPEED.
//
// RAM-probed directly (`tools/probe/dump-shadowpunch-full.py`, both attacker
// orientations, staged HAUNTER-vs-ONIX via `mechanicLab overrides.parties`):
// the task slides the attacker's own sprite `x2` out over 5 ticks then back
// over 4 (NOT a symmetric 5/5 despite the source's own "do same number of
// traces as before" comment - the real tCounter bookkeeping is genuinely
// asymmetric), spawning one darkened+translucent `CloneBattlerSpriteWithBlend`
// afterimage per tick (9 total), each self-destroying exactly 8 ticks after
// its own creation. A real vanilla artifact, confirmed on hardware, not a
// bug in this port: `gSprites[attacker].x2 -= tBattlerSpriteId` at task setup
// subtracts the attacker's own SPRITE SLOT INDEX (a small integer, 6-8 in the
// probed fixtures) from `x2` as if it were a pixel offset, and this offset is
// never undone - it persists for the whole task (visible in every attacker/
// clone position this module predicts). `tMoveSpeed` is +8 for a player-side
// attacker, -8 for an opponent-side one (`GetBattlerSide`); `tPriority` is 2
// when the attacker's own `GetBattlerSpriteSubpriority` is 20 or 40, else 3 -
// RAM-confirmed both ways (player-side battler-0 subpriority 30 -> priority
// 3; opponent-side battler-0 subpriority 40 -> priority 2).
//
// Closed-form derivation (no per-tick lookup table needed - verified against
// every probed tick in both fixtures): let `S` = the attacker's own sprite
// slot index and `V` = the signed move speed. At local age `a` (0-indexed,
// `a=0` is the task's own first RAM-observable tick - creation and the first
// `_Step` call collapse into the same tick, so there is no separate
// "creation-only" state to model):
//   - `a` in [0,4] (state 0, sliding out): a clone is created at
//     `x2 = -S + a*V` (the attacker's position BEFORE this tick's own
//     increment), then the attacker's own `x2` becomes `-S + (a+1)*V`.
//   - `a` in [5,7] (state 1, sliding back): a clone is created at
//     `x2 = -S + (10-a)*V`, then the attacker's own `x2` becomes
//     `-S + (9-a)*V`.
//   - `a === 8`: a clone is created at `x2 = -S + 2*V` (the same formula as
//     `a=7`'s clone, one step further), then the attacker's own `x2` is
//     snapped to exactly 0 (the source's own explicit override, NOT the
//     naturally-decremented value).
//   - `a > 8`: no new clones; the attacker's own `x2` stays 0.
// Every clone self-destroys exactly 8 ticks after its own creation age (alive
// for local ages `[k, k+7]`, gone from `k+8` on) - the task itself is gone
// once every clone has expired, i.e. from age `8+8=16` on.
export interface ShadowPunchAttackerState {
  readonly x2: number;
}

export interface ShadowPunchClone {
  readonly x2: number;
  readonly creationAge: number;
}

function shadowPunchCloneX2(creationAge: number, spriteId: number, moveSpeed: number): number {
  return creationAge <= 4
    ? -spriteId + creationAge * moveSpeed
    : -spriteId + (10 - creationAge) * moveSpeed;
}

/** The attacker's own `x2` at local age `a` (see module doc for the derivation). Zero before the task starts or after it settles. */
export function shadowPunchAttackerX2(age: number, spriteId: number, moveSpeed: number): number {
  if (age < 0) return 0;
  if (age <= 4) return -spriteId + (age + 1) * moveSpeed;
  if (age <= 7) return -spriteId + (9 - age) * moveSpeed;
  return 0; // age === 8 (source's own explicit snap-to-zero) and every age after
}

/** Every trace clone alive at local age `a` (creation order, oldest first). */
export function shadowPunchClonesAtAge(
  age: number,
  spriteId: number,
  moveSpeed: number,
): readonly ShadowPunchClone[] {
  const clones: ShadowPunchClone[] = [];
  for (let k = 0; k <= 8; k += 1) {
    if (age >= k && age <= k + 7) {
      clones.push({ x2: shadowPunchCloneX2(k, spriteId, moveSpeed), creationAge: k });
    }
  }
  return clones;
}

/**
 * Draw (paint) order, back to front, for every clone alive at local age `a`.
 * `CreateBattlerTrace`'s own `CloneBattlerSpriteWithBlend(0)` always grabs
 * the lowest free sprite slot, and every other slot this task ever touches
 * is claimed for the task's whole life EXCEPT the very first one (the
 * lowest slot of all, since it was the first ever claimed) - so it alone
 * gets reclaimed the instant its own occupant (creation age 0) expires,
 * which happens on the exact tick creation age 8's clone is born (an
 * 8-tick lifetime, one creation per tick). RAM-confirmed both attacker
 * orientations (`dump-shadowpunch-full.py`, `traceSprites[].slot`): ascending
 * slot order is otherwise plain ascending creation order (this codebase's
 * usual "lower OAM position draws on top" convention - `AddSpritesToOamBuffer`
 * preserves `gSprites[]` order, no `SortSprites` call in this task), so at
 * every age except the reused-slot window the OLDEST alive clone is
 * frontmost; from local age 8 on, creation-age-8's clone inherits that same
 * lowest slot and becomes permanently frontmost instead (verified identical
 * in both fixtures - a structural property of the fixed 9-clones/8-tick-life
 * schedule, not a fixture-specific coincidence).
 */
export function shadowPunchClonePaintOrder(
  age: number,
  spriteId: number,
  moveSpeed: number,
): readonly ShadowPunchClone[] {
  const clones = shadowPunchClonesAtAge(age, spriteId, moveSpeed);
  const frontK = age < 8 ? 0 : 8;
  const back = clones.filter((c) => c.creationAge !== frontK)
    .sort((a, b) => b.creationAge - a.creationAge);
  const front = clones.find((c) => c.creationAge === frontK);
  return front ? [...back, front] : back;
}

/** `tPriority`: `GetBattlerSpriteSubpriority` 20 or 40 -> 2, else 3 (RAM-confirmed both ways). */
export function shadowPunchClonePriority(attackerSubpriority: number): 2 | 3 {
  return attackerSubpriority === 20 || attackerSubpriority === 40 ? 2 : 3;
}

/** `BlendPalette(dest, 16, 13, RGB_BLACK)` applied once at task setup - reuse `blendComponentToBlack` (paletteFade.ts), already oracle-validated for this exact linear formula. */
export const SHADOW_PUNCH_TRACE_BLEND_COEFF = 13;
/** `setalpha 9, 8` - the trace clones' own `ST_OAM_OBJ_BLEND` translucency (RAM-confirmed BLDCNT=0x3F40: 1st target OBJ, 2nd target BG0-3+OBJ+BD, alpha-blend mode). */
export const SHADOW_PUNCH_TRACE_ALPHA = { eva: 9, evb: 8 } as const;
/** Live BLDCNT/BLDALPHA window for `monbg` plus the trace OBJ stack. */
export const SHADOW_PUNCH_ALPHA_FIRST_AGE = 41;
export const SHADOW_PUNCH_ALPHA_LAST_AGE = 59;

export function shadowPunchAlphaActive(age: number): boolean {
  return age >= SHADOW_PUNCH_ALPHA_FIRST_AGE && age <= SHADOW_PUNCH_ALPHA_LAST_AGE;
}

/**
 * `fadetobg BG_GHOST` / `restorebg` fade-ramp (`BLDY`, hardware-driven,
 * `Task_FadeToBg` - the mechanism itself is already exact-proven via
 * MOVE_EXTREME_SPEED, only this move's own timing anchors are new). Age 0 is
 * the tick `BLDCNT` first reads nonzero (the fade-out's own first tick,
 * `bldy` still 0 that tick). RAM-probed directly rather than fit to a
 * formula: the fade-IN ramp (restorebg, ages 61-99) has a genuine 3-tick
 * startup hold at `bldy=1` before settling into the steady 1-per-tick rate
 * the fade-OUT ramp (ages 0-36) uses cleanly throughout - plausibly
 * `Task_FadeToBg`'s own state-2 "recompute the default BG from scratch"
 * costing extra setup frames before the hardware ramp resumes counting: not
 * chased further, the exact literal table is zero-risk here (both ramps
 * share the same 5-tick hold-at-16 plateau, RAM-confirmed identical both
 * times). Ages outside the table are settled (bldy 0, fade inactive).
 */
const SHADOW_PUNCH_BLDY_TABLE: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16, 16, 16, 16,
  15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 16, 16, 16, 16,
  15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
];
/** The second (`restorebg`) ramp's own first tick reaching full black (age 79) - the BG swaps back to the default map exactly here, mirroring the first ramp's own swap-to-ghost at age 16 (`Task_FadeToBg`'s state-2 "load new bg" transition, gated on the fade-out completing). */
export const SHADOW_PUNCH_GHOST_BG_FIRST_AGE = 16;
export const SHADOW_PUNCH_GHOST_BG_LAST_AGE = 78;

export function shadowPunchBackgroundBldy(
  age: number,
  attackerSide: "player" | "opponent" = "player",
): number {
  // The opponent-side restore task drops its full-black hold one callback
  // earlier; fresh BLDY reads are otherwise identical through age 82.
  const sampledAge = attackerSide === "opponent" && age >= 83 ? age + 1 : age;
  return SHADOW_PUNCH_BLDY_TABLE[sampledAge] ?? 0;
}

export function shadowPunchBackgroundIsGhost(age: number): boolean {
  return age >= SHADOW_PUNCH_GHOST_BG_FIRST_AGE && age <= SHADOW_PUNCH_GHOST_BG_LAST_AGE;
}

/** `AnimTask_AttackerPunchWithTrace`'s own first RAM-observable tick (this module's local age 0), relative to `fadetobg`'s own age 0. */
export const SHADOW_PUNCH_PUNCH_TASK_FIRST_AGE = 41;
/** `create_fist_sprite`/`create_basic_hitsplat_sprite` - RAM-confirmed visible windows, same template/affine shape FIRE_PUNCH's own (already-proven) fist/hitsplat use. */
export const SHADOW_PUNCH_FIST_FIRST_AGE = 49;
export const SHADOW_PUNCH_FIST_LAST_AGE = 57;
export const SHADOW_PUNCH_HITSPLAT_FIRST_AGE = 49;
export const SHADOW_PUNCH_HITSPLAT_LAST_AGE = 58;
/** `AnimTask_ShakeMon, ANIM_TARGET, 3, 0, 6, 1` - reuses the already-ported `shakeMon.ts` primitive verbatim. */
export const SHADOW_PUNCH_TARGET_SHAKE = { xOffset: 3, yOffset: 0, numTimes: 6, frameDelay: 1 } as const;
export const SHADOW_PUNCH_TARGET_SHAKE_FIRST_AGE = 49;

/**
 * The real attacker sprite itself goes invisible for this whole window
 * (RAM-confirmed both orientations, `dump-shadowpunch-full.py`'s own
 * `attacker.invisible` field) - only the trace clones are ever drawn while
 * it's active. The window starts 3 ticks before the punch task's own first
 * RAM-observable tick and ends exactly when `restorebg`'s own second
 * `fadetobg` fade-out begins (`bldcnt` reads 0 again the same tick this
 * flips back), bracketing the clone+fist+hitsplat body with a fixed margin
 * on each side; no source line was found that explains the 3-tick lead-in
 * directly, so this is encoded as a literal RAM-probed window rather than a
 * guessed mechanism, matching this module's own BLDY-table precedent.
 */
export const SHADOW_PUNCH_ATTACKER_HIDDEN_FIRST_AGE = 38;
export const SHADOW_PUNCH_ATTACKER_HIDDEN_LAST_AGE = 59;

export function shadowPunchAttackerVisible(age: number): boolean {
  return age < SHADOW_PUNCH_ATTACKER_HIDDEN_FIRST_AGE || age > SHADOW_PUNCH_ATTACKER_HIDDEN_LAST_AGE;
}

/**
 * Fresh `gSprites`, `gMain.oamBuffer`, hardware OAM, and raw-RGB reads show
 * that the photographed epochs differ per transfer path: ordinary sprite
 * callbacks trail by one frame, while newly-created trace clones first
 * appear after two. Clone retirement is already reflected after one frame;
 * the handoff frame is handled at the draw seam by excluding the not-yet-
 * transferred ninth clone. These are hardware-buffer boundaries, not a
 * whole-animation timing offset.
 */
export const SHADOW_PUNCH_DISPLAY_OAM_LAG = 1;
export const SHADOW_PUNCH_CLONE_DISPLAY_LAG = 2;
export const SHADOW_PUNCH_CLONE_RETIREMENT_FIRST_AGE = 50;
