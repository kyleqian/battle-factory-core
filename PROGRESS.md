# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 228 — Supervisor merge fold: **ISSUES #30 FULLY CRACKED and closed** by the round-1 worktree worker (branch `worker/wt-20260721-095153` merged) — candidate A's sSpriteOrder draw-order adopted AND the real root cause of BOTH residual classes found: feathers are `ST_OAM_AFFINE_NORMAL` (not `_DOUBLE`), so `drawSpriteSheetAffineRotate`'s unconditional doubled destination box painted rotated feather corners over Onix; new `doubleSizeBox=false` param at the feather call only. Turn-6 residual window 425px → **0px on all 129 ticks**, turns 7/8 likewise; feather traces extended **106→235, 16→145, 33→162**, suite **892/892**

- **State (all supervisor-verified post-merge, main tree):** `npm test`
  **892/892**, `npm run build` green. Supervisor-rerun 0 diff:
  `turn6-feathers` 235/235, `turn7-feathers` 145/145, `turn8-feathers`
  162/162, `turn9-quickattack` 117/117, plus spot-checks `sendout`
  255/256 (ISSUES #18's settled tick), `turn6-rockslide-a` 255/255,
  `turn8-bind-a` 256/256, `turn6-statfall` 127/127. Source claim
  independently verified (`battle_anim_flying.c:175`,
  `gOamData_AffineNormal_ObjNormal_32x32`). Worktree + branch cleaned up.
- **Notes:** the "two independent residual classes" forensic split (#224)
  dissolved — one box-clip bug explained both signatures. The default-true
  param keeps every other affine caller byte-identical (ball spin
  verified via `sendout`). Dossier: `docs/feather-order-notes.md`'s
  2026-07-21 adoption section. ISSUES #30 removed this commit.
