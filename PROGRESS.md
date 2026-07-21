# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 233 — Bounded worker (S7 slice R rung (b) implementation): all 5 AERIAL_ACE mechanisms wired; mechanism 5 (slice) fully 0-diff, mechanisms 1/3 (lunge+clones) land their own first tick with a small unresolved residual just past it, mechanism 4 (palette pulse) REVERTED as badly wrong (pure table kept) — `turn10-aerialace.json` **18/18, 0 diff** (12345-12362, smaller than the dossier's full window)

- **State:** `npm test` **936/936** (921 + 15 new), `npm run build`
  green, `verify-turn10-aerialace.ts` **20/20 fresh** (mandatory first
  step, rerun unchanged after implementation). Full regression sweep 0
  diff, unchanged counts: `turn10-menu.json` **83/83**,
  `turn9-quickattack.json` **117/117**, `turn9-quickattack-b.json`
  **77/77**, `turn9-rockslide.json` **130/130**, `turn1-cloneanim.json`
  **230/230**.
- **Did:** wired all 5 mechanisms into a new `drawTurn10AerialAceWindow`
  dispatcher (`turn10AerialAceLungeOffset`/`Slot4Offset`/`Slot7Offset`/
  `OnixShakeY2`/`PaletteDarkenCoeff`/`SliceState`), loaded the
  cutting-slice asset (`battleAnimCuttingSlice`), and threaded
  `onixY2Extra`/`darken`/`paletteOverride` params through
  `drawTurn5RockSlideAttack`/`drawTurn6FieldBase`/`drawTurn10FieldBase`/
  `staticBgPixel` (all defaulted no-ops, confirmed by the sweep). The
  slice sprite's own per-tick table turned out RAM-tick-indexed despite
  its own "render tick" column header — resolved by matching the
  oracle's own 71px onset patch pixel-for-pixel against the asset's
  frame-0 opacity mask (a CENTER-based OAM corner, uniform +1 lag).
  Mechanism 3 needed the SAME asymmetric "+1 extra tick at each life's
  START only" fix §39 already root-caused for QUICK_ATTACK's own
  clones, plus QUICK_ATTACK's own ground-clip constant reused verbatim
  — closed the worst of the residual but not all of it (small residual
  renders 12363-12366, shrinking 666→29px, NOT feet-related, not
  root-caused). Mechanism 4's render application came out badly wrong
  (~48-54% of the whole frame mismatches at the plateau) — reverted
  per the brief's own "revert partial render code, keep the pure
  table" rule; `darken` is hardcoded false in the dispatcher now.
- **Next:** (1) mechanism 3's residual — bisect the lunge table's own
  early entries (indices 0-2) first, a "disable clones" experiment this
  session ran rules out a pure clone-position bug. (2) mechanism 4 —
  re-derive the live BG palette BANK NUMBER via direct RAM read (this
  session guessed by RGB-proximity against the extracted static asset,
  which is why it's wrong). (3) once both close, extend
  `turn10-aerialace.json` past 12362 through the dossier's own 12389
  settle boundary in one pass (mechanism 2 becomes independently
  provable there too, since its own window opens right after).
- **Notes:** `docs/battle-turn-notes.md` §42 has the full writeup incl.
  the exact pixel evidence for both the landed mechanisms and the two
  named gaps. No PAPERCUTS beyond the standing mgba-venv-teardown one.

---
## 232 — Supervisor merge fold: AERIAL_ACE fully RAM-pinned and asset-ready (stacked chain `worker/wt-20260721-111226`+`112501` merged, 3 commits) — cutting-slice sheet extracted + **VRAM-verified 0 mismatches** (OAM is AFFINE-OFF + OBJ-BLEND, checked not assumed), all FIVE mechanisms pinned in `docs/aerial-ace-notes.md` (live pressTick 12305 instrumented; two §40 corrections: lunge window +1 tick, clone life-ends +1 tick; mechanisms 1/3 need **+2** render lag vs 5's +1; mechanism 4 is a SOFTWARE `BlendPalette()` 2-step, not BLDY hardware — the brief's own assumption falsified with evidence; 71px onset patch attributed to mechanism 5). `tools/probe/verify-turn10-aerialace.ts` **20/20 supervisor-rerun** post-merge

- **State (supervisor-verified post-merge):** `npm test` **921/921**
  (917 + 4 asset pins), `npm run build` green, verify script 20/20
  fresh from the main tree, worktree chain cleaned up. Turn-10 rung-(c)
  probe (ROCK_SLIDE/turn-end) in flight on `worker/wt-20260721-114115`.
- **Notes:** next engine slice (AERIAL_ACE wiring) is a wiring job:
  asset + all tables banked, verify script gates it. Also verified this
  fold: rung c3's hitsplat fixes closed `turn2-endeavor-drain`'s last
  residual (now **201/201**, was 200/201 since S7 slice E1) — supervisor-
  rerun confirmed, no capture changes.

---
## 231 — Bounded worker (S7 slice R rungs c3/c4/d): rungs (c4) and (d) LAND 0-diff (`turn9-quickattack-b.json` **77/77**, new `turn9-rockslide.json` **130/130**); rung (c3) lands Onix's own shake exactly but the hitsplat's own pixels + a pre-existing slot4-tail residual stay a named small gap, and a genuine NEW mechanism (Onix's own brief whole-sprite hit-flash, render 10983-10986) was found and left unmodeled

- **State:** `npm test` **917/917** (896 + 21 new), `npm run build`
  green, `verify-turn9-postlunge.ts` **99/99 fresh** (mandatory first
  step, reran unchanged after implementation too). Full regression sweep
  0 diff: `turn9-quickattack.json` **117/117** (unchanged, NOT extended —
  see gap), `turn9-menu.json` **111/111**, `turn10-menu.json` **83/83**,
  `turn2-endeavor-drain.json` **201/201**, `turn1-rockslide.json`
  **256/256**.
- **Did:** wired ep2 (healthbox y2 wobble + the SEPARATE Onix flicker,
  two independent tables per the brief), Onix's HP drain (31→24), the
  single-line "not very effective" reveal, the settled hold, and the full
  ROCK_SLIDE half (synthetic `TURN9_ROCKSLIDE_PRESS_TICK=10717`,
  cross-confirmed by 3 independent shared-constant offsets landing on
  the dossier's own cited ticks) — new `drawTurn9QuickAttackWindow`
  dispatcher replaces the old "kickoff text held forever" stub. Onix's
  own x2 shake (ep1) is pixel-proven exact in isolation. The hitsplat
  itself got 2 real RAM-grounded fixes (matrix 303 not ENDEAVOR's 372;
  force-blended at `eva=16,evb=16` against live `fb`, not a flat
  palette) that took its diff from ~1700px to ~150-380px/tick but not to
  0 — a fine edge/tip residual, time-boxed. A pre-existing rung-(c2) bug
  (afterimage clones ignoring the lunge's own ground-clip) was fixed
  along the way (`maxY` added to `drawSpriteSheetBlendedOverFb`).
- **Next:** (1) hitsplat tip-pixel residual — dump the exact sampled
  source index at 2-3 mismatched tips to find the affine-scale rounding
  fix. (2) the new hit-flash discovery (10983-10986) needs a direct
  `gPlttBufferFaded`/OBJ-palette-bank RAM read — sampling proved it's
  NOT a simple per-color blend or remap (position-dependent output for
  identical input colors). (3) once both close, extend
  `turn9-quickattack.json` into 10935-10986 for a fully contiguous
  rung (c3)/(c4) capture.
- **Notes:** `docs/battle-turn-notes.md` §41 has the full writeup incl.
  every RAM probe and the exact math that solved the blend ratio. No
  PAPERCUTS beyond the standing mgba-venv-teardown one.

