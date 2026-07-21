# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 226 — Supervisor wind-down: session end 2026-07-21 ~06:30 — **16 worker steps verified and folded** (8 main-lane + 8 worktree, 10 rounds); suite **821 → 880/880**; headlines: **turns 6-9 landed as engine slices** (turn 6 complete end to end incl. the stat-fall banner and ROCK_SLIDE vs Pidgeotto; turns 7/8 complete minus feather sub-windows; turn 9 through QUICK_ATTACK's lunge), **the dossier pipeline is GAPLESS from anchor through battle 1's WIN to battle 2's swap prompt** (turns 15/16/17 + post-WIN scouted, prefix-verified, incl. the run's first status-condition ground truth and the RNG-resume/opponent-2 window bisected to 105 ticks), and **FIVE standing issues resolved by the probe-first pattern** (#26 Sitrus ring closed via closed-form crack, #27 RNG call attributed, #28+#29 bounce-shift families root-caused AND fixed — 32 excluded ticks restored, #30 narrowed: candidate A crowned, half-texel eliminated, residual split into two named classes)

- **State (verified this minute):** `npm test` **880/880**, `npm run
  build` green, tree clean, no worktrees, no unmerged branches. Traces
  landed/extended this session (all supervisor-rerun 0 diff):
  turn5-sitrus-c 150→181, turn6-menu 33→44, turn6-statfall 127,
  turn6-rockslide-{a,b} 255+105, turn6-feathers 106, turn7-menu 85→93,
  turn7-rockslide-{a-d} 787, turn7-feathers 16, turn8-menu 78→88,
  turn8-bind-{a,b} 322, turn8-feathers 33, turn9-menu 111,
  turn9-quickattack 112. Groundtruth: battle1-turn{15,16,17}-dense +
  battle1-postwin-dense (854 captures total, all prefix-chain-verified).
- **The probe pattern was the session's engine:** five 30-min
  RAM/source-first worktree probes (8-17 min each) resolved what
  repeated bounded fitting could not — every "quirk" label fell to a
  small real engine bug or a closed form. Two fix steps then restored
  37 previously-excluded ticks across 4 traces. The pattern is now
  standard: probe ships a verify script, fix worker re-runs it first.
- **Next:** (1) slice R rung (c2)+(d) — afterimage clones (§38's
  bisection plan: single-digit-% per-tick diffs, skip-mask ruled out)
  then ROCK_SLIDE/turn-end to finish turn 9; (2) turns 10-13 as
  parameterizations (dossiers exist); (3) adopt #30's candidate A
  (mechanical recipe banked) + chase its class-(b) occlusion bug; (4)
  turn 9's shake-episode-2 parity + #30 class (a) + #23 remain the hard
  unknowns; (5) S8 engine slices (win sequence → post-WIN scenes →
  swap) now have complete ground truth.
- **Notes:** no usage-limit events; zero merge conflicts across 8
  worktree merges (incl. one intentional stacked/nested pair, folded in
  one merge, cleaned inner-first); no PAPERCUTS.md changes (three
  in-dossier notes, none tooling-class); worker discipline strong (three
  honest no-land stops, every one with banked findings the next attempt
  landed on; the cwd-persistence gotcha bit the SUPERVISOR twice —
  memory updated). Interactive session; no escalations needed — the
  one near-trigger (slice R's consecutive non-landings) resolved under
  the established convergence-counting convention (§35→§36→§37→landed).
