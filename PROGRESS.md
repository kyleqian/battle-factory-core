# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 172 — Bounded worker retry: S7 slice I-2 — the turn-4 clone-window residual ROOT-CAUSED and FIXED (2 real bugs, not the bounce/HP candidates §22 suspected); `turn4-doubleteam.json` (new) **249/249**, `turn4-rockslide.json` (new) **250/250**, `npm test` **756/756** (+3), build green, zero regressions

- **State:** `npm test` 756/756, `npm run build` green, tree clean. New
  `tools/compare/traces/turn4-doubleteam.json` (kickoff text/clone/banner/
  stat-rose-text, ticks 4934→5317, 249 captures, dense over every actively-
  changing window + strided over the provably-static holds) and `turn4-
  rockslide.json` (ticks 5318→5925, 250 captures, dense at every boundary +
  stride-2 through the shake/rock-fall midsection — the 256-capture service
  ceiling forced that one compromise, noted honestly rather than silently)
  are both **0 diff**, one tick (4934) excluded with restated §22-style
  evidence (13292px, both neighbors exact, same "redraw extremum" family as
  3337/3465/3721/3879/3888). Zero regressions at exact prior counts:
  `turn4-menu` 44/44, `turn3-rockslide` 256/256, `turn3-endeavor` 180/180,
  `turn1-cloneanim` 230/230, `turn1-rockslide` 256/256, `turn2-dragonbreath`
  237/237.
- **Did:** followed the brief's mandated autopsy order instead of re-fitting
  pixel formulas. (1) Diffed app-vs-oracle at tick 4978 directly: pixels
  showed a clean "app(x) == oracle(x+1)" substitution, not noise. (2) Diffed
  turn 1's oracle (tick 1972, the same `n=8` into DOUBLE_TEAM's clone motion)
  against turn 4's oracle (tick 4978) directly — genuinely DIFFERENT
  real-hardware pixels at the identical `n`, AND turn 4's *app* matched
  turn 1's *oracle* exactly — proof the code was faithfully reproducing
  turn 1's mechanism while turn 4's real hardware does something else. (3)
  RAM-probed the actual clone sprites (`gSprites[3]`/`gSprites[4]`, found by
  scanning all 64 slots' callback pointers): `x2`/`data[]` progressions are
  BIT-IDENTICAL to the model at matching `n` — the offset formula was never
  wrong. RAM-probed `BLDCNT`/`BLDALPHA`/BG scroll registers: also identical
  both turns. RAM-probed Grovyle's own front-sprite palette (`gPlttBuffer
  {Unfaded,Faded}`): also byte-identical both turns. Then RAM-probed
  `sSpriteOrder` (`0x020217F4`, the same static array `rockSlideDrawOrder`
  already uses) at both turns' analogous ticks — **found it**: the two
  clones tie exactly on `SortSprites`' key (`oam.priority`/`subpriority`/
  `oam.y` all raw-copied identical via `CloneBattlerSpriteWithBlend`), and
  the tie-break (whichever's earlier in the persistent, history-dependent
  `sSpriteOrder`) is B-before-A for turn 1 but A-before-B for turn 4 — same
  two slots (3/4) both times, opposite order. Fixed via a new `frontClone`
  param on `drawDoubleTeamClones` (RAM-verified per turn, NOT a general
  `SortSprites` simulation — scoped honestly in the code comment, since
  unlike the rock-stacking fix these two sprites only ever tie against each
  other, once per turn). (4) Sweeping the full window past this fix (stride-
  1, 4934-5925) surfaced a SECOND, unrelated bug: `drawTurn4RockSlideWindow`
  never wired in the "Foe GROVYLE's evasiveness\nrose!" text phase turn 1's
  own `drawRockSlideWindow` already has — it jumped straight to the
  ROCK_SLIDE line 265 ticks early. Ported the same three-phase text gate
  (`TURN_KICKOFF`→`STAT_ROSE`→`ROCK_SLIDE`, `statRoseTextStartTick`/
  `rockSlideTextStartTick`, both already generic `pressTick`-parameterized
  functions) — closed it outright, 250/250. Grovyle's 41→1 drain (the first
  turn to cross the healthbox's yellow/red HP bands, ISSUES #16's own "never
  oracle-exercised" note) needed ZERO new compositor code — bands render
  correctly already. Added 3 Tier-1 pins: the two pixel fixes (clone
  z-order at (191/192,17)/t4978, stat-rose text at (16/17,124)/t5210) plus
  `rockSlideOpponentHp`'s real 41→1 numbers.
- **Next:** the ENTIRE turn-4 window (4934-5925) is now committed and
  verified — S7 slice I is fully closed. Turn 5's own reopen (input tick
  5926) is the natural next engine slice; it inherits the Family A stale-
  shake fix #171 already root-caused (predicts turn 5's ENDEAVOR shake is
  symmetric, stale 75 from turn 4's ROCK_SLIDE) and the faint/switch-in
  ground truth §3-§6 already banked.
- **Notes:** none — no papercuts this session; `git status`/stash discipline
  held throughout (no mid-experiment checkouts).

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
