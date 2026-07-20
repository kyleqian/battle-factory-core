# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 173 — Worktree probe (supervisor-folded): Family B (menu-idle ticks 3879/3888) ROOT-CAUSED — no hardware quirk; the engine's turn-3 reopened-submenu bounce composition is uniformly ONE RAM tick ahead of the real invisible bouncer's `sSinIndex`, visible only at sine-plateau crossings; merged `42b26f9`, suite 756/756 on the merged tree

- **State:** merged into master, `npm test` 756/756 + build green
  post-merge (supervisor-verified; verification script re-run in the
  worktree by supervisor — all 5 checks PASS). New: multi-hop `"path"`
  support in `tools/probe/ram-probe.py` (backward-compat verified),
  `tools/probe/verify-turn3-menu-bounce-rule.py`, probe spec + twice-run
  dump, `docs/turn3-residual-probe-notes.md` "Family B, continued".
- **Did:** pointer-chase (`gBattleSpritesDataPtr` → `healthBoxesData[0]`
  → bouncer sprite ids → `gSprites[].data[]`) proves the bouncer's
  `sSinIndex` ticks a perfectly uniform +7/tick (both regions, 41 ticks,
  zero exceptions) with plain read-before-increment sampling
  (`battle_main.c:2967-2979`). `model(t) == real_screen(t+1)` holds with
  ZERO violations: a constant miscalibration, masked on shared plateaus,
  visible exactly at crossings — 3861/3870/3879/3888 in this window.
  OVERTURNS §19's "hardware quirk at a bounce extremum" reading. The
  earlier "1-tick shift ruled out" test had shifted the WRONG WAY
  (2→1 advances further); the corrective direction is 2→3 for this
  composition. Caveat flagged: predicted mismatches at 3861 (onix) and
  3870 (healthbox) are NOT in captureFrames — the fix slice must add
  them alongside restoring 3879/3888.
- **Next:** one small main-lane cleanup slice applies Family A's
  stale-power shake rule + Family B's phase correction and restores all
  16 excluded ticks (12 shake + 3879/3888 + 3861/3870); then turn 5.
- **Notes:** no new papercuts.

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
