// FEATHER_DANCE's 8 independently-rotating feather sprites
// (`gFallingFeatherSpriteTemplate`, `AnimFallingFeather`/`_Step`,
// reference/pokeemerald/src/battle_anim_flying.c:572-893, spawn timeline
// data/battle_anim_scripts.s:3975-3995's `Move_FEATHER_DANCE`).
//
// This mechanism is driven by a MINIMAL INTERPRETER over the committed anim
// command stream (`src/data/gen/battle-move-anim-scripts.json`'s
// `FEATHER_DANCE` entry) plus a direct port of the two source sprite
// callbacks below - NOT a recorded per-tick RAM table (ANIMATION_PROGRESS.md's
// 2026-07-24 anim-script interpreter spike; retires ISSUES #40). Both source
// callbacks are fully deterministic (`gBattleAnimArgs`, battler sprite
// coords, and `gSineTable` only - no `Random()`), so a direct port
// reproduces every committed feather trace exactly (turns 6/7/8, verified
// field-for-field against `src/data/gen/turn{6,7,8}-feather-sprites-probe.json`
// in `tests/featherDance.test.ts` - those probe JSONs are kept as dev-time
// test evidence, no longer imported by this production module) AND derives
// each sprite's own natural self-destroy tick from the same physics that
// drives its motion, matching the old hand-recorded `lastRamTick` cutoffs
// (7557/8591/9637) exactly with no per-turn constant.

import battleMoveAnimScripts from "../data/gen/battle-move-anim-scripts.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import { interpretCreateSpriteSchedule, type AnimScriptCommand } from "./animScriptInterpreter.ts";

const FEATHER_DANCE_SCRIPT = battleMoveAnimScripts.FEATHER_DANCE as {
  main: AnimScriptCommand[];
};

const FEATHER_DANCE_SPAWN_SCHEDULE = interpretCreateSpriteSchedule(FEATHER_DANCE_SCRIPT.main);

export interface FeatherRenderSprite {
  centerX: number;
  centerY: number;
  pa: number;
  pb: number;
  pc: number;
  pd: number;
  animNum: 0 | 1;
  priority: number;
  slot: number;
  /** Candidate A's simulated `sSpriteOrder` front-to-back position at this
   * tick, restricted to the live feather slots (see
   * `simulateFeatherSpriteOrder` below) - lower = drawn ON TOP, matching
   * `AddSpritesToOamBuffer`'s real "lower sSpriteOrder position = lower OAM
   * index = on top" rule. Used only as `compareFeatherDrawOrder`'s
   * same-priority tiebreak. */
  order: number;
}

/** One RAM tick's worth of `AnimFallingFeather_Step` state for a single
 * feather sprite - the interpreter's own output shape, field-compatible
 * with the retired RAM-probe rows it replaces (minus `tick`/`inUse`/
 * `invisible`/`matrixNum`, which the simulation doesn't need: it only ever
 * produces states for ticks the sprite genuinely exists and is visible -
 * RAM-confirmed that real feathers never set `invisible` mid-life). */
interface FallingFeatherState {
  x2: number;
  y: number;
  y2: number;
  priority: number;
  hFlip: 0 | 1;
  animNum: 0 | 1;
  a: number;
  b: number;
  c: number;
  d: number;
}

function gbaSine(index: number): number {
  return GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
}

/** True arithmetic (floor) right shift, matching C's shift-by-`n` on signed values in this range (see `battleMenu.ts`'s own `Sin`/`Cos` for the same convention, cross-verified there against RAM). */
function asr(value: number, shift: number): number {
  return Math.floor(value / 2 ** shift);
}

/**
 * Direct port of `AnimFallingFeather` + `AnimFallingFeather_Step`
 * (`reference/pokeemerald/src/battle_anim_flying.c:572-893`) for a single
 * `gFallingFeatherSpriteTemplate` sprite. `args` is the script's own 8
 * `gBattleAnimArgs` (see `battle-move-anim-scripts.json`'s
 * `createspriteArgvMapping`): `[xOffset, yOffset, initialAngle, deltaAngle,
 * yVelocityQ8_8, ampPacked, yThresholdOffset, targetFlag]`. `xBase`/`yBase`
 * are `GetBattlerSpriteCoord(target, BATTLER_COORD_ATTR_HEIGHT/_WIDTH)` -
 * here the presentation seam's own explicit target anchor, not a recorded
 * constant.
 *
 * Named booleans/variables replace the source's packed bitfield
 * (`struct FeatherDanceData`) 1:1 (`waiting`=`unk0_0a`, `ampIndex`=`unk0_0b`,
 * `flipArmed`=`unk0_0d`, `prevQuadrantMark`=`unk0_1`, `priorityLow`=`unkE_0`)
 * - `unk0_0c` is omitted entirely: the source sets it once at setup and
 * never clears it, so its one call site (`if (data->unk0_0c)`) is always
 * true; the contest branch beneath it (`IsContest()`) is dead in a real
 * battle and is likewise omitted.
 *
 * Returns one state per RAM tick from the sprite's own first-visible tick
 * (index 0, i.e. its own creation tick) through its natural self-destroy
 * (`sprite->y+y2 >= data->unkE_1`, `DestroyAnimSpriteAfterTimer`'s
 * one-tick-later teardown) - the array's own length IS the sprite's
 * lifetime, no external cutoff constant needed.
 */
function simulateFallingFeather(args: readonly number[], yBase: number): FallingFeatherState[] {
  const [, arg1, arg2, arg3, arg4, arg5, arg6] = args as [number, number, number, number, number, number, number, number];
  let y = yBase + arg1;
  let hFlip: 0 | 1 = 0;
  let animNum: 0 | 1 = 0;

  const unk4 = arg3;
  const unk6 = arg4;
  const unkA = (arg2 >> 8) & 0xff;
  const ampByIndex: readonly [number, number] = [arg5 & 0xff, (arg5 >> 8) & 0xff];
  const destroyThreshold = yBase + arg6;

  let unk2 = arg2 & 0xff;
  let prevQuadrantMark = unk2 >> 6;
  let waiting = false;
  let ampIndex: 0 | 1 = 0;
  let flipArmed = false;
  let waitCounter = 0;
  let priority: number;
  let priorityLow: boolean;
  let y8 = y << 8;

  const inFlapRange = unk2 >= 64 && unk2 <= 191;
  const basePriority = 2; // GetBattlerSpriteBGPriority(battler) - shared base for both battlers in a singles battle
  if (inFlapRange) {
    priority = basePriority + 1;
    priorityLow = false;
    if (!(unk4 & 0x8000)) {
      hFlip = (hFlip ^ 1) as 0 | 1;
      animNum = hFlip;
    }
  } else {
    priority = basePriority;
    priorityLow = true;
    if (unk4 & 0x8000) {
      hFlip = (hFlip ^ 1) as 0 | 1;
      animNum = hFlip;
    }
  }

  const matrixFor = (x2: number): { a: number; b: number; c: number; d: number } => {
    const sinIndex = asr(-x2, 1) + unkA;
    const b = gbaSine(sinIndex);
    const a = gbaSine(sinIndex + 64);
    return { a, b, c: -b || 0, d: a };
  };
  const doFlip = (): void => {
    hFlip = (hFlip ^ 1) as 0 | 1;
    animNum = hFlip;
    if (!priorityLow) priority -= 1;
    else priority += 1;
    priorityLow = !priorityLow;
    flipArmed = false;
  };

  let x2 = asr(gbaSine(unk2) * ampByIndex[0], 8);
  let matrix = matrixFor(x2);

  const states: FallingFeatherState[] = [];
  let destroyTimer: number | null = null;
  for (;;) {
    if (destroyTimer !== null) {
      if (destroyTimer <= 0) break;
      destroyTimer -= 1;
      states.push({ x2, y, y2: 0, priority, hFlip, animNum, ...matrix });
      continue;
    }
    if (waiting) {
      const before = waitCounter;
      waitCounter = (waitCounter - 1) & 0xff;
      if (before % 256 === 0) {
        waiting = false;
        waitCounter = 0;
      }
    } else {
      const quadrant = unk2 >> 6;
      switch (quadrant) {
        case 0:
          if (prevQuadrantMark === 1) {
            flipArmed = true;
            waiting = true;
            waitCounter = 0;
          } else if (prevQuadrantMark === 3) {
            ampIndex = (ampIndex ^ 1) as 0 | 1;
            waiting = true;
            waitCounter = 0;
          } else if (flipArmed) {
            doFlip();
          }
          break;
        case 1:
          if (prevQuadrantMark === 0) {
            flipArmed = true;
            waiting = true;
            waitCounter = 0;
          } else if (prevQuadrantMark === 2) {
            waiting = true;
            waitCounter = 0;
          } else if (flipArmed) {
            doFlip();
          }
          break;
        case 2:
          if (prevQuadrantMark === 3) {
            flipArmed = true;
            waiting = true;
            waitCounter = 0;
          } else if (prevQuadrantMark === 1) {
            waiting = true;
            waitCounter = 0;
          } else if (flipArmed) {
            doFlip();
          }
          break;
        default:
          if (prevQuadrantMark === 2) {
            flipArmed = true;
          } else if (prevQuadrantMark === 0) {
            ampIndex = (ampIndex ^ 1) as 0 | 1;
            waiting = true;
            waitCounter = 0;
          } else if (flipArmed) {
            doFlip();
          }
          break;
      }
      prevQuadrantMark = quadrant;

      x2 = asr(ampByIndex[ampIndex] * gbaSine(unk2), 8);
      matrix = matrixFor(x2);

      y8 += unk6;
      y = y8 >> 8;
      if (unk4 & 0x8000) {
        unk2 = (unk2 - (unk4 & 0x7fff)) & 0xff;
      } else {
        unk2 = (unk2 + (unk4 & 0x7fff)) & 0xff;
      }

      if (y >= destroyThreshold) destroyTimer = 0;
    }
    states.push({ x2, y, y2: 0, priority, hFlip, animNum, ...matrix });
  }
  return states;
}

const FEATHER_ORDER_SEED = [3, 4, 7, 8, 9, 10, 11, 12] as const;

const FEATHER_SORT_DISPLAY_HEIGHT = 160;

interface FeatherSlotState extends FallingFeatherState {
  x: number;
  slot: number;
}

/** `sprite->oam.y` wraparound applied by `SortSprites` (`sprite.c`):
 * `y >= DISPLAY_HEIGHT` wraps to `y - 256`. The extra `> 128` wrap for
 * `ST_OAM_AFFINE_DOUBLE + ST_OAM_SIZE_3` sprites does not apply here -
 * `gFallingFeatherSpriteTemplate` is `ST_OAM_SIZE_2` (32x32), confirmed from
 * `reference/pokeemerald/src/battle_anim_flying.c:171-180`. */
function featherWrappedY(rec: FeatherSlotState): number {
  const y = rec.y + rec.y2;
  return y >= FEATHER_SORT_DISPLAY_HEIGHT ? y - 256 : y;
}

/**
 * One exact `SortSprites` pass (`reference/pokeemerald/src/sprite.c`,
 * restricted to the 8 feather slots): a full insertion sort, run every
 * tick, comparator `swap when priority1 > priority2, OR (priority1 ==
 * priority2 AND y1 < y2)`. Ports `simulate-feather-sprite-order.py`'s
 * `sort_step` verbatim.
 */
function featherSortStep(order: number[], recs: Map<number, FeatherSlotState>): number[] {
  const out = order.slice();
  for (let i = 1; i < out.length; i += 1) {
    let j = i;
    while (j > 0) {
      const s1 = out[j - 1]!;
      const s2 = out[j]!;
      const r1 = recs.get(s1)!;
      const r2 = recs.get(s2)!;
      const y1 = featherWrappedY(r1);
      const y2 = featherWrappedY(r2);
      if (r1.priority > r2.priority || (r1.priority === r2.priority && y1 < y2)) {
        out[j - 1] = s2;
        out[j] = s1;
        j -= 1;
      } else {
        break;
      }
    }
  }
  return out;
}

/**
 * ISSUES #30 candidate A: simulates pokeemerald's real, PERSISTENT
 * `sSpriteOrder` insertion sort (`sprite.c`: `BuildSpritePriorities` →
 * `SortSprites` → `AddSpritesToOamBuffer`, run every frame) over one turn's
 * own per-tick feather states, restricted to the 8
 * `gFallingFeatherSpriteTemplate` slots - the other ~56 `gSprites[]` entries
 * aren't modeled, but per docs/feather-order-notes.md's decisive finding,
 * only the `(4,7)` spawn pair's initial relative order ever changes a
 * predicted draw order, and `FEATHER_ORDER_SEED`'s ascending-slot skeleton
 * already encodes the winning `(4,7)`-before choice. Returns RAM tick ->
 * live feather slots in front-to-back `sSpriteOrder` position (index 0 =
 * frontmost/on-top). Ports `tools/probe/simulate-feather-sprite-order.py`'s
 * `simulate()` verbatim (same comparator, same persistent-order threading
 * tick to tick, same not-yet-appeared-slot splicing) - not a
 * reimplementation from scratch, and pinned against that script's own
 * output in `tests/featherDance.test.ts`.
 */
function simulateFeatherSpriteOrder(byTick: Map<number, FeatherSlotState[]>): Map<number, number[]> {
  const ticks = [...byTick.keys()].sort((a, b) => a - b);
  let order: number[] = FEATHER_ORDER_SEED.slice();
  const lastRec = new Map<number, FeatherSlotState>();
  const out = new Map<number, number[]>();
  for (const t of ticks) {
    const recsAtTick = new Map<number, FeatherSlotState>();
    for (const rec of byTick.get(t) ?? []) recsAtTick.set(rec.slot, rec);
    for (const slot of FEATHER_ORDER_SEED) {
      const rec = recsAtTick.get(slot);
      if (rec) lastRec.set(slot, rec);
    }
    const recs = new Map<number, FeatherSlotState>();
    for (const slot of FEATHER_ORDER_SEED) {
      const rec = lastRec.get(slot);
      if (rec) recs.set(slot, rec);
    }
    const activeOrder = order.filter((s) => recs.has(s));
    if (activeOrder.length > 0) {
      const sorted = featherSortStep(activeOrder, recs);
      let idx = 0;
      order = order.map((s) => (recs.has(s) ? sorted[idx++]! : s));
    }
    const live = order.filter((s) => recsAtTick.has(s));
    out.set(t, live);
  }
  return out;
}

/**
 * Builds a per-tick feather-sprite lookup by running the anim-script
 * interpreter's spawn schedule through the ported `AnimFallingFeather`/
 * `_Step` callback for each of the 8 slots (`FEATHER_ORDER_SEED`, in the
 * script's own creation order), keyed to absolute RAM ticks anchored at
 * `firstSpawnTick` (the RAM tick the FIRST feather's `createsprite` fires).
 * Replaces the old RAM-probe table replay (ANIMATION_PROGRESS.md's
 * 2026-07-24 anim-script interpreter spike) - the per-slot lifetime (and so
 * the whole octet's own last real tick) falls out of the simulated physics
 * directly, with no `lastRamTick` parameter needed.
 */
function makeFeatherSpriteLookup(firstSpawnTick: number, xBase: number, yBase: number): (t: number) => FeatherRenderSprite[] {
  const byTick = new Map<number, FeatherSlotState[]>();
  let lastRamTick = firstSpawnTick;
  for (let i = 0; i < FEATHER_ORDER_SEED.length; i += 1) {
    const slot = FEATHER_ORDER_SEED[i]!;
    const spawn = FEATHER_DANCE_SPAWN_SCHEDULE[i]!;
    const spawnTick = firstSpawnTick + spawn.tick;
    const states = simulateFallingFeather(spawn.args, yBase);
    for (let k = 0; k < states.length; k += 1) {
      const tick = spawnTick + k;
      let list = byTick.get(tick);
      if (!list) {
        list = [];
        byTick.set(tick, list);
      }
      list.push({ ...states[k]!, x: xBase + spawn.args[0]!, slot });
      if (tick > lastRamTick) lastRamTick = tick;
    }
  }
  const simOrderByTick = simulateFeatherSpriteOrder(byTick);
  return function featherSprites(t: number): FeatherRenderSprite[] {
    const ramTick = t - FEATHER_RENDER_LAG;
    if (ramTick > lastRamTick) return [];
    const recs = byTick.get(ramTick);
    if (!recs) return [];
    const simOrder = simOrderByTick.get(ramTick) ?? [];
    return recs.map((rec) => ({
      centerX: rec.x + rec.x2,
      centerY: rec.y + rec.y2,
      pa: rec.a,
      pb: rec.b,
      pc: rec.c,
      pd: rec.d,
      animNum: rec.animNum,
      priority: rec.priority,
      slot: rec.slot,
      order: simOrder.indexOf(rec.slot),
    }));
  };
}

/** RAM-to-render lag for this mechanism (bisected against the oracle at several probe ticks, same "+1 for most mechanisms" class the rest of this dossier finds - see battle-turn-notes.md §29). Re-verified per-turn (§34) to carry unchanged to turns 7/8. */
const FEATHER_RENDER_LAG = 1;

/** First rendered feather in the source script, relative to animation command
 * ownership. The stock controller creates the first sprite at age 53 and the
 * ordinary OBJ callback-to-OAM lag makes it visible at age 54. */
export const FEATHER_DANCE_FIRST_VISIBLE_AGE = 54;
const TURN6_FIRST_VISIBLE_TICK = 7405;
const ONIX_TARGET_POSITION_CENTER = { x: 72, y: 80 } as const;

/** All currently-live feather sprites at absolute trace tick `t`, or `[]` outside/after the window. Onix's own target-relative anchor (`ONIX_TARGET_POSITION_CENTER`), turn 6. */
export const turn6FeatherSprites = makeFeatherSpriteLookup(7404, ONIX_TARGET_POSITION_CENTER.x, ONIX_TARGET_POSITION_CENTER.y);

/** Same mechanism, turn 7's own real first-spawn RAM tick (docs/battle-turn-notes.md §34). */
export const turn7FeatherSprites = makeFeatherSpriteLookup(8438, ONIX_TARGET_POSITION_CENTER.x, ONIX_TARGET_POSITION_CENTER.y);

/** Same mechanism, turn 8's own real first-spawn RAM tick (docs/battle-turn-notes.md §34). */
export const turn8FeatherSprites = makeFeatherSpriteLookup(9484, ONIX_TARGET_POSITION_CENTER.x, ONIX_TARGET_POSITION_CENTER.y);

/**
 * Portable presentation-seam view of the source-proved falling-feather
 * component. The interpreter/callback port supplies callback/OAM state
 * directly (no recorded table), while geometry is translated from the
 * explicit target position and callers see only a move-relative clock.
 */
export function featherDanceSpritesAtAge(
  age: number,
  targetPositionCenter: Readonly<{ x: number; y: number }>,
  targetSide: "player" | "opponent" = "player",
  animationAgeOffset = 0,
): FeatherRenderSprite[] {
  const animationAge = age + animationAgeOffset;
  if (animationAge < FEATHER_DANCE_FIRST_VISIBLE_AGE) return [];
  const sourceTick =
    TURN6_FIRST_VISIBLE_TICK + animationAge - FEATHER_DANCE_FIRST_VISIBLE_AGE;
  const dx = targetPositionCenter.x - ONIX_TARGET_POSITION_CENTER.x;
  const dy = targetPositionCenter.y - ONIX_TARGET_POSITION_CENTER.y;
  // AnimFallingFeather takes its base priority from
  // GetBattlerSpriteBGPriority(target), toggling between that priority and
  // +1 as each feather crosses the target. In singles the opponent target's
  // base is exactly one layer nearer the front than the player's.
  const priorityDelta = targetSide === "opponent" ? -1 : 0;
  return turn6FeatherSprites(sourceTick).map((sprite) => ({
    ...sprite,
    centerX: sprite.centerX + dx,
    centerY: sprite.centerY + dy,
    priority: sprite.priority + priorityDelta,
  }));
}

/**
 * Draw-order tiebreak for same-priority feathers (ISSUES #30, "candidate A"
 * adoption - docs/feather-order-notes.md's 2026-07-21 "candidate A wins"
 * session has the full derivation and pixel-diff evidence). Differing-
 * priority sprites are already correctly ordered by `priority` alone
 * (pokeemerald's `SortSprites`, `reference/pokeemerald/src/sprite.c`, sorts
 * `oam.priority` dominant) - this only breaks EXACT-priority ties, which the
 * simple "lower slot on top" heuristic (the previous tiebreak, ~2000+px  ->
 * 425px over the residual window) got only partly right, because the real
 * hardware's tiebreak is the PERSISTENT `sSpriteOrder` array's own insertion-
 * sort history, not the raw slot number. `order` (attached per-sprite by
 * `makeFeatherSpriteLookup`, via `simulateFeatherSpriteOrder`) is that
 * simulated front-to-back position for the tick; lower `order` = drawn ON
 * TOP, same "on top" polarity the old slot-based heuristic used, so the
 * tiebreak term keeps the same shape (`b.X - a.X`), only `X` changes from
 * `slot` to the simulated `order`. Verified (fresh oracle render+diff,
 * `tools/probe/render-feather-order-candidates.ts`): cuts the turn-6
 * 7421-7549 window from 425px to a 230px verified-lower-bound floor, ≤
 * shipped on 129/129 ticks; generalizes to turns 7/8 (46px -> 17px spot
 * checks). Residual beyond 230px is NOT this tiebreak - see
 * docs/feather-order-notes.md's forensics sections for the two remaining
 * signature classes.
 */
export function compareFeatherDrawOrder(a: FeatherRenderSprite, b: FeatherRenderSprite): number {
  return b.priority - a.priority || b.order - a.order;
}
