# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 227 — Bounded worker (S7 slice R rung (c2)): QUICK_ATTACK's two afterimage clones LAND 0-diff — three real bugs found by RAM re-probe + oracle-PNG bisection (a boundary-transcription truncation, a blend-target-2 rule, a creation-lag tick, plus a "feet stay grounded" clip), `turn9-quickattack.json` **117/117, 0 diff** (up from 112)

- **State:** `npm test` **888/888** (880 + 8 new Tier-1 pins), `npm run
  build` green, tree clean. `turn9-quickattack.json` captureFrames extended
  112→117 (adds 10930-10934, the whole window provable before rung (c3)'s
  unmodeled hitsplat obscures further ticks), 0 diff. Regressions
  re-verified 0 diff: `turn9-menu.json` 111, `turn8-menu.json` 88,
  `turn1-cloneanim.json` 230.
- **Did:** Per the retry handoff's mandatory first step, fresh RAM re-probe
  (`dump-quickattack-anim.py`) of the slot-3/4 boundary ticks confirmed
  §36/§38's table EXCEPT slot 3's second life, transcribed as `[67,69]`
  (RAM 10938-10940) but actually alive through RAM 10945 — a 5-tick
  truncation bug, corrected to `[67,74]`. Fixing just that didn't move the
  needle (reproduced §38's exact prior diff counts), so bisected further
  via cropped oracle-PNG pixel diffs and found two more real bugs: (1)
  `blendedTile`'s target-2 must be the LIVE framebuffer, not the plain
  static background, whenever a clone overlaps the real sprite (RAM's
  `BLDCNT` target-2 mask includes OBJ) — clones now draw AFTER the real
  sprite's own opaque redraw, blending over `fb` (new `blendedTileOverFb`/
  `drawSpriteSheetBlendedOverFb`); (2) a freshly-created clone needs ONE
  MORE tick of latency than the usual render=RAM+1 lag before its first
  blended pixel (proven via the already-exact render 10929, which
  regresses if slot 3 draws there — blending a color with itself at
  `eva+evb=20` doesn't preserve it); (3) the real sprite's own feet stay
  grounded (unmoved) through the whole lunge — new `TURN9_QUICKATTACK_
  LUNGE_GROUND_CLIP_Y=74` clips both the footprint erase and the redraw
  below that absolute screen row. All three pixel-confirmed, not guessed.
- **Next:** rung (c3) (hitsplat, slot 7, RAM-created 10934/render 10935,
  `drawEndeavorHitsplats`'s own 10-tick precedent; Onix's shake episode 1,
  slot 6, `x2` square-wave `5,5,0,0,5,5,0,0` RAM 10936-10943 — this
  session's own fresh probe, §39) fully unattempted, ran out of cap after
  landing (c2). Landing (c3) will also retroactively test Bug 2's
  untested half (slot 3 life-2 start, slot 4's own start), since the
  hitsplat's own render window overlaps both. Rung (d) ROCK_SLIDE still
  waits on (c) finishing.
- **Notes:** `docs/battle-turn-notes.md` §39 has the full diagnosis (RAM
  table, all three bugs, the fix, honest scope of what's independently
  pixel-proven vs. reasoned-by-symmetry). No PAPERCUTS this session.
