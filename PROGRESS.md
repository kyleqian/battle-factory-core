# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 176 — Worktree scout (supervisor-folded): switch-in formula verification — faint sink PINNED as a closed form (source+RAM agree tick-for-tick), materialize stretch is a BYTE-EXACT re-anchored reuse of `GROVYLE_STRETCH_TABLE` (41/41), Sitrus = 2 sprites (`ANIM_TAG_THIN_RING`/`ANIM_TAG_SPARKLE_2`, gfx confirmed unextracted); merged `4fd6489`, suite 768/768 on the merged tree

- **State:** merged into master, `npm test` 768/768 + build green
  post-merge (supervisor-verified; sink formula re-checked vs
  `battle_main.c:2783` by supervisor). New: `docs/faint-switch-notes.md`
  §7 + 2 probe specs with twice-run outputs. No engine changes.
- **Did:** (1) faint sink closed form: handoff at 6502, `n = 8 -
  floor(yOffset/8)` erase steps at `S+1,S+3,…,S+2n-1` (`y2` 8→64),
  destroy at `S+2n+1` = 6519 — matches §3a pixel evidence tick-for-tick.
  (2) Pidgeotto's materialize stretch geometry = `GROVYLE_STRETCH_TABLE`/
  `_EARLY_TABLE` verbatim, re-anchored 1503→6791 — no new table needed.
  Open-particle burst shape confirmed (13 sprites, 1-tick stagger,
  26-tick life) but its radial motion formula was not captured. (3)
  Sitrus effect: exactly 2 sprites, cross-checked vs
  `General_HeldItemEffect`'s two `loadspritegfx` calls; gfx genuinely
  unextracted (checked, not assumed).
- **Next (slice L's named gaps):** thrown-ball prop sprite identity/
  table; materialize palette tint RAM confirmation; particle burst
  motion formula; Sitrus ring+sparkle gfx extraction; healthbox
  slide-in ramps (not reached). Slice K (ROCK_SLIDE→faint→gate→fainted
  text) needs NONE of these.
- **Notes:** worker PAPERCUT (ram-probe.py path vocab can't shift/mask
  sub-byte bitfields — blocked the tint check) recorded in PAPERCUTS.md.

---
## 175 — Bounded worker: S7 slice J — turn 5's FIGHT-submenu reopen + Grovyle's ENDEAVOR (Onix 88→1), landed green, ending BEFORE Onix's own ROCK_SLIDE kickoff; `turn5-menu.json` (new) **41/41**, `turn5-endeavor.json` (new) **254/254**, both 0 diff, `npm test` **768/768** (+7), build green, zero regressions

- **State:** `npm test` 768/768, `npm run build` green, tree clean.
  `turn5-menu.json` (reopen 5926→confirm-wait through tick 5967, 41 dense
  captures, tick 5927 excluded) and `turn5-endeavor.json` (kickoff text 5968
  through the safe boundary 6221, 254 dense captures) both **0 diff**. Full
  regression sweep at exact prior counts, all 0 diff: `turn4-rockslide`
  250/250, `turn4-doubleteam` 249/249, `turn3-endeavor` 192/192, `turn3-menu`
  254/254, `turn2-endeavor-drain` 201/201, `fight-submenu` 235/235, plus
  `turn4-menu` 44/44, `turn3-rockslide` 256/256, `turn2-dragonbreath`
  237/237, `turn1-rockslide` 256/256, `turn1-cloneanim` 230/230, `menu-idle`
  69/69, `turn2-endeavor` 77/77.
- **Did:** RAM-probed turn 5's own window first (`tools/probe/ram-probe.py`,
  `tools/probe/specs/turn5-endeavor-watch.json`) to nail real anchors before
  touching render code: `TURN5_CONFIRM_PRESS_TICK=5959` (real press, +6 to
  `gCurrentMove`->283 matching every prior turn), `gBattleMovePower`==75 for
  the ENTIRE window (turn 4's own ROCK_SLIDE, stale) confirming the residual-
  cleanup slice's own turn-5 shake prediction (symmetric 3/3) FOR REAL
  against oracle pixels for the first time, `gBattleMons[0].hp` 88->1 at RAM
  tick 6201. Added `BattleSceneState.turn4Resolved` + a `core.ts` reopen
  branch gated on the newly-exported `TURN4_ROCKSLIDE_MENU_REDRAW_DELAY`
  (directly usable — turn 4's own ROCK_SLIDE was already real-press-
  anchored, no synthetic-anchor arithmetic needed unlike slice I's own
  gate). Threaded `turn4Resolved` one epoch further through every render
  dispatch tier (`drawMenuIdleBaseWithOpponentHp`/`drawActionMenuIdleContent`/
  `drawActionMenuIdleWindow`/`drawFightSubmenuWindow`/`drawFightSubmenuChrome`/
  `currentPPForActiveMon`) — zero new render mechanisms, pure parameterize-
  don't-rebuild. New `drawTurn5EndeavorText` reuses `drawEndeavorSquish`/
  `endeavorOnixHp` unchanged. Grid-searched `turn5KickoffBounceTick`'s frozen
  plateau (`d` in `[-4..4]`, center 0) against a live oracle diff. One named
  single-tick residual (5927, 769px, Onix silhouette) — tested and RULED OUT
  a uniform `-1` shift (fixes 5927 but breaks 3 other ticks), so excluded per
  this run's "characterize, don't force-fit" rule, same class as this
  dossier's other redraw-extremum residuals. Dense-swept 6014-6249 to find
  the safe stopping boundary: 0 diff through tick 6221, hard-cut to Onix's
  own ROCK_SLIDE kickoff at 6222 (out of scope) — confirmed the exact
  boundary rather than guessing. The player healthbox's green→yellow→red
  bands + the hp=1 "never fully empty" sliver rule (ISSUES #16's own "never
  oracle-exercised on the player side" gap) needed ZERO compositor changes —
  verified exact across the whole 88→1 drain. Added 7 Tier-1 pins: reopen/
  confirm replay, reopen-gate-still-closed, PP 7/10, two ENDEAVOR-window
  determinism/smoke checks, `endeavorOnixHp` with the real 88→1 numbers, and
  the player-healthbox hp=1 red-sliver pin (`calcBarFilledPixels`/
  `pickHpBarBand`/tile content). Docs: new `docs/battle-turn-notes.md` §23
  (anchors, the shake-prediction verdict, the residual-tick investigation,
  the band/sliver findings).
- **Next:** Onix's own ROCK_SLIDE (tick 6222 onward — hitting Grovyle, 1→0,
  the faint itself) through DESTIN's forced Pidgeotto switch-in and the next
  settled menu is the immediate next slice — ground truth already fully
  banked in §13 (the button-gated KO-text finding, Onix's own Sitrus Berry
  proc, DESTIN's non-sequential switch-in pick). Tick 4934's and this
  slice's own tick-5927 residuals remain a different, still-open class.
- **Notes:** no new papercuts. `git status`/stash discipline held; no
  mid-experiment checkouts; scratch probe traces (uncommitted) deleted
  after use, only the named committed traces + RAM-probe spec/dump kept.

---
## 174 — Bounded worker: S7 residual-cleanup slice — Family A (stale shake power) + Family B (turn-3 bounce phase) both APPLIED; `turn3-endeavor.json` **192/192**, `turn3-menu.json` **254/254**, both 0 diff, all 16 excluded ticks restored, `npm test` **761/761** (+5), build green, zero regressions

- **State:** `npm test` 761/761, `npm run build` green, tree clean.
  `turn3-endeavor.json` **192/192** (12 shake ticks restored: 3958/3959/
  3962/3963/3966/3967/3984/3985/3988/3989/3992/3993). `turn3-menu.json`
  **254/254** (3879/3888 restored, 3861/3870 added as the predicted-but-
  never-captured crossings). Full regression sweep at exact prior counts,
  all 0 diff: `turn4-menu` 44/44, `turn4-doubleteam` 249/249, `turn4-
  rockslide` 250/250, `turn3-rockslide` 256/256, `turn2-dragonbreath`
  237/237, `turn2-endeavor-drain` 201/201, `turn2-endeavor` 77/77, `fight-
  submenu` 235/235, `battle1-fight-submenu-idle` (groundtruth) 256/256,
  `turn1-rockslide` 256/256, `turn1-cloneanim` 230/230, `menu-idle` 69/69.
- **Did:** implemented both already-root-caused (#171/#173) fixes as
  faithful, general rules — no re-derivation, per the brief. **Family A**
  (`src/engine/battleScene.ts`): replaced the literal `ENDEAVOR_SHAKE_STEP`
  constant with `endeavorShakeSteps(stalePower)` (the source-derived
  `downStep=amp/2`/`upStep=downStep+(amp&1)` formula), threaded a new
  `stalePower` param through `endeavorShakeX2`/`drawEndeavorSquish` from
  each ENDEAVOR call site — turn 2 passes `ROCK_SLIDE_MOVE_POWER=75`
  (unchanged, still symmetric 3/3), turn 3 passes
  `DRAGON_BREATH_MOVE_POWER=60` (now asymmetric 2/3, matching the RAM-
  proven mechanism). **Family B**: `turn3SubmenuBounceTick` now subtracts
  one additional tick (`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT - 1`), scoped to
  this composition only — `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` itself is
  untouched, so turn 2's own reopen windows (proven correctly calibrated)
  are unaffected. Both fixes verified 0 diff via `npm run compare` before
  and after restoring/adding the excluded ticks. Added 5 Tier-1 pins:
  `endeavorShakeSteps` against all three RAM-confirmed data points
  (75→3/3 ×2 including the turn-5 prediction, 60→2/3) plus clamp bounds;
  `turn3SubmenuBounceTick`+`menuIdleBounce` against the committed RAM
  pointer-chase dump (`src/data/gen/turn3-menu-bouncer-raw-probe.json`,
  38+38 region-ticks, zero exceptions) plus the two named residuals
  individually. Docs: both families marked RESOLVED in
  `docs/turn3-residual-probe-notes.md` (short subsection each); one-line
  correction notes added to `docs/battle-turn-notes.md` §19/§20 pointing
  at the resolution, history left intact.
- **Next:** turn 5's own reopen (input tick 5926) is the natural next
  engine slice — it inherits both fixes for free (Family A predicts
  symmetric 3/3 again, stale 75 from turn 4's own ROCK_SLIDE, now pinned)
  and the faint/switch-in ground truth §3-§6 already banked. Tick 4934's
  excluded redraw-extremum is a different, still-open residual class (out
  of this slice's scope).
- **Notes:** no new papercuts.
