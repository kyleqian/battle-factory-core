# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 230 — Supervisor merge fold: turn 9's ENTIRE post-lunge window ground-truthed by a two-probe stacked chain (`worker/wt-20260721-103557` merged, 2 commits) — shake episode 2 ROOT-CAUSED as two independent RAM+1 mechanisms (20-tick healthbox y2 wobble + a separate 3-block Onix visibility flicker; Onix's sprite never moves), episode-1/hitsplat lag classes pinned (+1 hitsplat, +2 shake incl. a creation-tick stall), and the full C4 territory pinned (HP drain 31→24 lag-free w/ band flip at 10999; message reveal 1 char/tick 11005→11028, ONE line — dossier corrected; settled hold 11028-11109 FLAT; rung-(d) transition anchor 11110). `tools/probe/verify-turn9-postlunge.ts` **99/99 supervisor-rerun** from the merged main tree

- **State (supervisor-verified post-merge):** `npm test` **896/896**,
  `npm run build` green, verify script 99/99 fresh, no worktrees, no
  unmerged branches. Two turn9-notes.md label corrections folded with
  my own PNG re-read at 11040 (one-line message, Onix 24/117).
- **Notes:** probe chain = round-2 worktree (12.5 min) + stacked
  follow-up (19 min, nested worktree base 832e65a). One mis-based
  launch in between (my error: invoking the MAIN tree's launcher by
  absolute path from inside a worktree bases the new worktree on
  master, NOT the branch — nesting requires the worktree's OWN script
  copy invoked relatively); the worker caught it and stopped honestly
  at $0.27. PAPERCUTS: exit-139 teardown-segfault entry added (two
  workers re-confirmed it this session). Rungs (c3)/(c4)/(d) are now
  wiring jobs against the 99-check script.

---
## 229 — Bounded worker (S7 slice R rung (a)): turn 10's FIGHT-submenu reopen LANDS 0-diff, zero navigation presses — `turn10-menu.json` **83/83, 0 diff**; rung (b) (AERIAL_ACE's animation) RAM-probed to a concrete 5-mechanism inventory, NOT implemented — one mechanism needs a genuinely new sprite asset, out of cap

- **State:** `npm test` **896/896** (892 + 4 new), `npm run build` green,
  tree clean. `turn10-menu.json` (new, 83/83, 0 diff) covers the reopen
  (12262) through AERIAL_ACE's own kickoff text settling (12344), one
  tick before the animation's first pixel change. Full regression sweep
  (~35 traces incl. `turn9-menu` 111, `turn9-quickattack` 117,
  `turn6-feathers` 235, `turn1-rockslide` 256) all re-verified 0 diff,
  unchanged counts.
- **Did:** `turn9Resolved` state flag (mirrors turn1..turn8Resolved),
  cursor persists ROCK_SLIDE(0), PP ledger gains a 7th slot-0 decrement
  (3/10). Real bug found and fixed along the way: the settled menu for
  the gap between turn 9's own (unmodeled) resolution and turn 10's own
  press isn't gated by a button-press flag — it's a pure-`t` redraw check
  inside turn 9's OWN dispatcher (same shape `drawTurn7RockSlideWindow`/
  `drawTurn8BindWindow` already establish), safe since it only fires past
  `turn9-quickattack.json`'s own committed window. `TURN9_MENU_REDRAW_
  DELAY` fresh-oracle-bisected to 574 (NOT the dossier's own prose value
  579 — the bounce task resets 5 ticks before the visual settle, per
  `MENU_BOUNCE_RAM_SETUP_TICK`'s own precedent) against the new trace's
  own capture, 0/83 mismatches vs. 5-46 at every other delta from -5 to
  +8 tried. Then RAM-probed rung (b) (mandatory first step, per the
  brief): `Move_AERIAL_ACE`'s script is FIVE concurrent mechanisms
  (Pidgeotto's own short elliptical lunge, Onix's own shake, two blended
  trace/afterimage clones — parameterizable from QUICK_ATTACK's own
  code, a background palette-blend pulse, and a "cutting slice" sprite
  that needs a genuinely new asset+render routine) — exact RAM tables for
  all five banked in battle-turn-notes.md §40, none implemented.
- **Next:** rung (b)'s 4 parameterizable mechanisms could land quickly;
  the cutting-slice sprite (asset extraction + new draw routine) is
  comparable scope to this whole session's rung (a) on its own. Rung (c)
  (ROCK_SLIDE + both HP drains + turn-end through turn-11's own menu)
  entirely unattempted.
- **Notes:** `docs/battle-turn-notes.md` §40 has the full RAM probe
  (task/sprite tables, exact x2/y2 sequences per mechanism, source script
  cross-read). No PAPERCUTS this session.

