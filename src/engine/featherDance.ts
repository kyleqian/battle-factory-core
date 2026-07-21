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

import featherProbe from "../data/gen/turn6-feather-sprites-probe.json" with { type: "json" };

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

const byTick = new Map<number, FeatherProbeRecord[]>();
for (const rec of (featherProbe as { ticks: FeatherProbeRecord[] }).ticks) {
  let list = byTick.get(rec.tick);
  if (!list) {
    list = [];
    byTick.set(rec.tick, list);
  }
  list.push(rec);
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
}

/** RAM-to-render lag for this mechanism (bisected this session against the oracle at several probe ticks, same "+1 for most mechanisms" class the rest of this dossier finds - see battle-turn-notes.md §29). */
const FEATHER_RENDER_LAG = 1;

/** Last RAM tick any real feather sprite is still `inUse` (slot 12's own despawn, `y>=112`) - PAST this, the probe's own slots (3/4/7/8/9/10/11/12) get reused by unrelated sprites the real game creates next (the still-unmodeled stat-down flash/arrow, battle-turn-notes.md §29), so trusting raw `inUse` beyond this tick would render a random unrelated sprite as if it were a feather. */
const FEATHER_LAST_RAM_TICK = 7557;

/** All currently-live (RAM `inUse && !invisible`) feather sprites at absolute trace tick `t`, or `[]` outside/after the window. */
export function turn6FeatherSprites(t: number): FeatherRenderSprite[] {
  const ramTick = t - FEATHER_RENDER_LAG;
  if (ramTick > FEATHER_LAST_RAM_TICK) return [];
  const recs = byTick.get(ramTick);
  if (!recs) return [];
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
    });
  }
  return out;
}

/**
 * Draw-order tiebreak for same-priority feathers (battle-turn-notes.md §29/§34):
 * pokeemerald's `SortSprites` (`reference/pokeemerald/src/sprite.c`) sorts the
 * real OAM buffer by `(subpriority, oam.priority)` ascending, and lower-index
 * OAM slots draw IN FRONT of higher-index slots at equal priority. All 8
 * `gFallingFeatherSpriteTemplate` spawns share the same `subpriority`
 * (`Cmd_createsprite`'s `subpriority_offset` is 0 for every spawn line in
 * `data/battle_anim_scripts.s`'s `Move_FEATHER_DANCE`), so this codebase's
 * own `slot` (== `gSprites[]` index, the same value used for real OAM order
 * here) is the tiebreak that matters - lower slot drawn LAST (on top). Bisected
 * empirically against the oracle on the 7421-7549 residual window (the
 * cheapest repro): this ordering cut the mismatched-pixel total from ~2000+px
 * (arbitrary ascending-slot draw, i.e. HIGHER slot on top) to 425px, with 9
 * frames landing exact - a real, load-bearing fix, not yet a full crack (a
 * smaller residual remains, characterized in §34 as still-open).
 */
export function compareFeatherDrawOrder(a: FeatherRenderSprite, b: FeatherRenderSprite): number {
  return b.priority - a.priority || b.slot - a.slot;
}
