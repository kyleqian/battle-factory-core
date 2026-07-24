// S7 slice N-3: FEATHER_DANCE's 8 independently-rotating feather sprites
// (`gFallingFeatherSpriteTemplate`, `AnimFallingFeather`/`_Step`,
// reference/pokeemerald/src/battle_anim_flying.c:572-893, spawn timeline
// data/battle_anim_scripts.s:3975-3995's `Move_FEATHER_DANCE`).
//
// This mechanism is driven from a RAM-probed per-tick TABLE
// (src/data/gen/turn6-feather-sprites-probe.json), not a from-scratch port
// of the C state machine: `AnimFallingFeather_Step`'s own accumulator
// (`data->unk8`, meant to be a plain `+= 104` per tick) does not reproduce
// the real `gOamMatrices` writes tick-for-tick against this session's own
// fresh probe (the matrix visibly lags the sprite's own `x2` field by
// several ticks in a pattern that isn't a constant offset - suggests a
// buffering/refresh detail in how `gOamMatrices` gets applied that isn't
// obvious from the callback's own source alone, or a subtlety in the
// decompilation's own bitfield casts this session didn't fully untangle
// within its time budget - flagged in battle-turn-notes.md §29 for a future
// session rather than shipped as a guessed-at, unverified port). The
// PROBED table is itself twice-run byte-identical (RAM-truthed), so using
// it directly is not a curve-fit - it's the real hardware state, read
// verbatim, same spirit as this codebase's other RAM-anchored constant
// tables (e.g. `GROVYLE_STRETCH_TABLE`).
//
// The genuinely-new PIECE this slice contributes is still real: the
// generic affine blit primitive (`drawSpriteSheetAffineRotate`, pinned
// against this mechanism's own real matrix in `tests/battleScene.test.ts`)
// and the render wiring (8 concurrent affine draws per tick, z-ordered by
// OAM priority against Onix's own sprite) below.

import turn6FeatherProbe from "../data/gen/turn6-feather-sprites-probe.json" with { type: "json" };
import turn7FeatherProbe from "../data/gen/turn7-feather-sprites-probe.json" with { type: "json" };
import turn8FeatherProbe from "../data/gen/turn8-feather-sprites-probe.json" with { type: "json" };

interface FeatherProbeRecord {
  tick: number;
  slot: number;
  inUse: number;
  invisible: number;
  matrixNum: number;
  priority: number;
  hFlip: number;
  animNum: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

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

/** RAM-to-render lag for this mechanism (bisected this session against the oracle at several probe ticks, same "+1 for most mechanisms" class the rest of this dossier finds - see battle-turn-notes.md §29). Re-verified per-turn (§34) to carry unchanged to turns 7/8's own probe tables. */
const FEATHER_RENDER_LAG = 1;

/** The 8 `gFallingFeatherSpriteTemplate` OAM slots, ascending - also
 * candidate A's `sSpriteOrder` seed (ISSUES #30 adoption,
 * docs/feather-order-notes.md's "candidate A wins" section): the winning
 * seed is the plain ascending-slot skeleton with the same-tick `(4,7)` spawn
 * pair landing in that order, which IS this array unmodified - the `(8,9)`/
 * `(10,11)` pairs' own initial relative order is confirmed fully redundant
 * (no simulated tick ever differs), so no special-casing is needed. */
const FEATHER_ORDER_SEED = [3, 4, 7, 8, 9, 10, 11, 12];

const FEATHER_SORT_DISPLAY_HEIGHT = 160;

/** `sprite->oam.y` wraparound applied by `SortSprites` (`sprite.c`):
 * `y >= DISPLAY_HEIGHT` wraps to `y - 256`. The extra `> 128` wrap for
 * `ST_OAM_AFFINE_DOUBLE + ST_OAM_SIZE_3` sprites does not apply here -
 * `gFallingFeatherSpriteTemplate` is `ST_OAM_SIZE_2` (32x32), confirmed from
 * `reference/pokeemerald/src/battle_anim_flying.c:171-180`. */
function featherWrappedY(rec: FeatherProbeRecord): number {
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
function featherSortStep(order: number[], recs: Map<number, FeatherProbeRecord>): number[] {
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
 * own probe table, restricted to the 8 `gFallingFeatherSpriteTemplate`
 * slots - the other ~56 `gSprites[]` entries aren't RAM-probed, but per
 * docs/feather-order-notes.md's decisive finding, only the `(4,7)` spawn
 * pair's initial relative order ever changes a predicted draw order, and
 * `FEATHER_ORDER_SEED`'s ascending-slot skeleton already encodes the
 * winning `(4,7)`-before choice. Returns RAM tick -> live feather slots in
 * front-to-back `sSpriteOrder` position (index 0 = frontmost/on-top).
 * Ports `tools/probe/simulate-feather-sprite-order.py`'s `simulate()`
 * verbatim (same comparator, same persistent-order threading tick to tick,
 * same not-yet-appeared-slot splicing) - not a reimplementation from
 * scratch, and pinned against that script's own output in
 * `tests/featherDance.test.ts`.
 */
function simulateFeatherSpriteOrder(byTick: Map<number, FeatherProbeRecord[]>): Map<number, number[]> {
  const ticks = [...byTick.keys()].sort((a, b) => a - b);
  let order = FEATHER_ORDER_SEED.slice();
  const lastRec = new Map<number, FeatherProbeRecord>();
  const out = new Map<number, number[]>();
  for (const t of ticks) {
    const recsAtTick = new Map<number, FeatherProbeRecord>();
    for (const rec of byTick.get(t) ?? []) recsAtTick.set(rec.slot, rec);
    for (const slot of FEATHER_ORDER_SEED) {
      const rec = recsAtTick.get(slot);
      if (rec) lastRec.set(slot, rec);
    }
    const recs = new Map<number, FeatherProbeRecord>();
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
    const live = order.filter((s) => {
      const rec = recsAtTick.get(s);
      return rec !== undefined && rec.inUse !== 0 && !rec.invisible;
    });
    out.set(t, live);
  }
  return out;
}

/**
 * A RAM-table-driven feather-sprite lookup (battle-turn-notes.md §29/§34):
 * builds a per-tick index from one turn's own probe JSON (twice-run
 * byte-identical, i.e. real hardware state, not a curve-fit) and returns a
 * `(t) => FeatherRenderSprite[]` function keyed to that probe's own absolute
 * RAM ticks. `lastRamTick` is the RAM tick after which the probe's own OAM
 * slots (3/4/7/8/9/10/11/12) get reused by an unrelated sprite the real game
 * creates next (RAM-confirmed per-turn: this is NOT always the same offset
 * from spawn, so it's a parameter, not a shared constant) - trusting raw
 * `inUse` beyond it would render a random unrelated sprite as if it were a
 * feather.
 */
function makeFeatherSpriteLookup(probe: { ticks: FeatherProbeRecord[] }, lastRamTick: number): (t: number) => FeatherRenderSprite[] {
  const byTick = new Map<number, FeatherProbeRecord[]>();
  for (const rec of probe.ticks) {
    let list = byTick.get(rec.tick);
    if (!list) {
      list = [];
      byTick.set(rec.tick, list);
    }
    list.push(rec);
  }
  const simOrderByTick = simulateFeatherSpriteOrder(byTick);
  return function featherSprites(t: number): FeatherRenderSprite[] {
    const ramTick = t - FEATHER_RENDER_LAG;
    if (ramTick > lastRamTick) return [];
    const recs = byTick.get(ramTick);
    if (!recs) return [];
    const simOrder = simOrderByTick.get(ramTick) ?? [];
    const out: FeatherRenderSprite[] = [];
    for (const rec of recs) {
      if (!rec.inUse || rec.invisible) continue;
      out.push({
        centerX: rec.x + rec.x2,
        centerY: rec.y + rec.y2,
        pa: rec.a,
        pb: rec.b,
        pc: rec.c,
        pd: rec.d,
        animNum: rec.animNum ? 1 : 0,
        priority: rec.priority,
        slot: rec.slot,
        order: simOrder.indexOf(rec.slot),
      });
    }
    return out;
  };
}

/** All currently-live (RAM `inUse && !invisible`) feather sprites at absolute trace tick `t`, or `[]` outside/after the window. */
export const turn6FeatherSprites = makeFeatherSpriteLookup(turn6FeatherProbe as { ticks: FeatherProbeRecord[] }, 7557);

/** Same mechanism, turn 7's own real ticks (docs/battle-turn-notes.md §34) - identical +1 lag re-verified against the oracle, last real-feather RAM tick 8591 (slot 12's own despawn). */
export const turn7FeatherSprites = makeFeatherSpriteLookup(turn7FeatherProbe as { ticks: FeatherProbeRecord[] }, 8591);

/** Same mechanism, turn 8's own real ticks (docs/battle-turn-notes.md §34) - identical +1 lag re-verified against the oracle, last real-feather RAM tick 9637 (slot 12's own despawn). */
export const turn8FeatherSprites = makeFeatherSpriteLookup(turn8FeatherProbe as { ticks: FeatherProbeRecord[] }, 9637);

/** First rendered feather in the source script, relative to animation command
 * ownership. The stock controller creates the first sprite at age 53 and the
 * ordinary OBJ callback-to-OAM lag makes it visible at age 54. */
export const FEATHER_DANCE_FIRST_VISIBLE_AGE = 54;
const TURN6_FIRST_VISIBLE_TICK = 7405;
const ONIX_TARGET_POSITION_CENTER = { x: 72, y: 80 } as const;

/**
 * Portable presentation-seam view of the source-proved falling-feather
 * component. The committed table supplies callback/OAM state, while geometry
 * is translated from the explicit target position and callers see only a
 * move-relative clock.
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
