# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 171 — Worktree probe (supervisor-folded): slice G's 12-tick shake asymmetry ROOT-CAUSED (stale `gBattleMovePower` drives shake amplitude — 75→±3, 60→+3/-2, source formula reproduces BOTH turns); menu-idle ticks 3879/3888 localized but need a pointer-chase probe; merged `e8edc8d`, suite 753/753 on the merged tree

- **State:** merged into master, `npm test` 753/753 + build green
  post-merge (supervisor-verified). New: `docs/turn3-residual-probe-notes.md`,
  probe specs + twice-run outputs under `tools/probe/specs/` /
  `src/data/gen/`. No engine changes (by design — mechanism only).
- **Did:** (Family A, §20's 12 excluded ticks) `AnimTask_ShakeTargetBased
  OnMovePowerOrDmg` reads `gAnimMovePower` = stale `gBattleMovePower`,
  written ONLY by `CalculateBaseDamage` — ENDEAVOR never calls it. Turn
  2's shake inherited 75 (turn 1's ROCK_SLIDE) → 75/12=6 even → ±3; turn
  3's inherited 60 (turn 2's DRAGON_BREATH) → 60/12=5 odd → down=2/up=3.
  Supervisor re-verified the formula at `battle_anim_mon_movement.c:
  971-998`. Predicts turn 5's ENDEAVOR shake is symmetric again (stale
  75 from turn 4's ROCK_SLIDE). READY for a small engine fix (stale-power
  state + restore the 12 ticks). (Family B, ticks 3879/3888) render=
  RAM+1 confirmed; at both ticks the model's bounce-`y2` plateau
  transition leads real hardware by exactly 1 tick; constant-offset fix
  RULED OUT (breaks 3 passing ticks). Root cause needs the bouncer
  sprite's raw `sSinIndex`/task state behind `gBattleSpritesDataPtr->
  healthBoxesData[]` — a pointer-chase not reached.
- **Next:** fold the Family A fix into the next shake-touching engine
  slice (turn 5 needs the rule anyway); Family B pointer-chase probe is
  a clean 30-45 min worktree step.
- **Notes:** worker PAPERCUT (ram-probe.py spews mGBA logs to stdout,
  docstring implies stderr) recorded in PAPERCUTS.md by supervisor.

---
## 170 — Bounded worker: S7 slice I — turn 4's FIGHT-submenu reopen landed green (44/44, 0 diff); the DOUBLE_TEAM/ROCK_SLIDE resolution itself does NOT land — a real uncracked pixel residual, not a scope choice

- **State:** `npm test` **753/753** (+4), `npm run build` green, tree
  clean. New `tools/compare/traces/turn4-menu.json` (extends `turn3-
  rockslide.json`'s own 4890-frame prefix with the groundtruth trace's own
  turn-4 reopen+confirm presses verbatim, through tick 4933, 44 dense
  captures) is **44/44, 0 diff**. Zero regressions, exact prior counts:
  `turn3-rockslide` 256/256, `turn3-endeavor` 180/180, `turn3-menu` 250/250,
  `turn1-cloneanim` 230/230, `turn1-rockslide` 256/256, `turn2-dragonbreath`
  237/237.
- **Did:** New `BattleSceneState.turn3Resolved` + `core.ts` reopen gate
  (`TURN3_ROCKSLIDE_REOPEN_GATE_DELAY=465`, derived from turn 3's own
  synthetic-vs-real press-tick anchors' difference) — cursor stays at 0
  (ROCK_SLIDE, no nav needed, §13's own finding), PP reads 8/10
  (`currentPPForActiveMon` gained a `turn3Resolved` param, a second
  independent slot-0 decrement). Wrote (but could NOT pixel-verify) the
  DOUBLE_TEAM+banner+ROCK_SLIDE resolution itself, parameterizing turn 1's
  own mechanism with a REAL press tick (`TURN4_CONFIRM_PRESS_TICK=4925` —
  unlike turn 3, no synthetic anchor needed since turn 4's preceding move IS
  DOUBLE_TEAM again, same as turn 1). Six independent RAM/pixel anchors
  (`gCurrentMove` flip, evasion stage, accuracy/crit/damage rolls, ROCK_SLIDE
  kickoff-text tick, HP field update) all landed EXACTLY where turn 1's own
  unchanged formulas predict — strong evidence for zero-code-change reuse —
  **but a live oracle diff still shows a real, unexplained ~2% residual
  inside the clone-animation window** (728px, `x=145-205,y=17-70`, the
  Grovyle sprite region — confirmed NOT bounce-related: invariant across the
  entire bounce-tick grid-search plateau that fixed the confirm-wait
  window's own separate bounce bug). Per this run's "never commit red" rule,
  did not commit that window or the ROCK_SLIDE window (untested downstream
  of the same unresolved issue) — only the reopen/confirm-registration
  prefix, which IS fully verified.
- **Next:** RAM-probe `BLDALPHA`/`BLDCNT`/the palette buffer directly at
  the clone-window residual (tick 4978) before re-sweeping pixel formulas
  blind — root-causing that is the hard blocker for the rest of turn 4.
  Full writeup + every anchor/number: `docs/battle-turn-notes.md` §22.
- **Notes:** mid-session accident — a scratch grid-search loop's own `git
  checkout -- src/engine/battleScene.ts` (meant to revert a throwaway
  experiment) wiped that file's real uncommitted edits too, since nothing
  had been committed yet. Recovered by re-applying the same edits from
  memory (verified via fresh `tsc`/`npm test`), but cost real time —
  PAPERCUT: never `git checkout` a file mid-experiment without committing
  or stashing real work first, ~15 min lost.

---
## 169 — Worktree scout (supervisor-folded): switch-in window fully itemized + Pidgeotto front sprite verified byte-exact (0/1087) — the faint engine slice now has complete pinned ground truth; merged `18c7bbd`, suite 749/749 on the merged tree

- **State:** merged into master, `npm test` 749/749 + build green
  post-merge (supervisor-verified). New: 4 dense stride-1 groundtruth
  traces (`battle1-switchin-dense-{a,b,c,d}.json`, ticks 6350-7312,
  twice-run/0 sha mismatches), `docs/faint-switch-notes.md` §3-§6.
- **Did:** (goal 1) Pidgeotto's front pic was ALREADY extracted (S6
  groundwork `38f687c`; #167's "not extracted" claim was a stale false
  negative) — verified byte-exact vs a fresh oracle capture, and the
  corner formula generalizes: `(144, 8 + gMonFrontPicCoords[species]
  .yOffset)`, 2 species cross-checked. (goal 2) Full frame-accurate
  itemization: hit-flicker → erase-and-sink faint (source-cited
  `SpriteCB_FaintOpponentMon`, NOT fade/dissolve) → text phases →
  party-summary-bar re-trigger → ball throw/tinted materialize →
  healthbox slide-in → Sitrus proc text+heal-bar. CORRECTS §13: real
  animation plays inside the "frozen 6429-6560" window, and the menu
  visually settles ~7250-7256, not 7215. (goal 3) §6 grades each element
  reused-verbatim / similar-unverified / genuinely-new (faint-sink and
  Sitrus sparkle are new; ball/materialize not formula-verified).
- **Next:** turn 4 engine slice is in flight (main lane); after it, the
  turn-5 + faint/switch-in engine slice implements directly against
  §3-§6 + §13.
- **Notes:** worker PAPERCUT (contact-sheet row-slicing desync) recorded
  in PAPERCUTS.md by supervisor.
