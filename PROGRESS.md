# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 177 — Bounded worker: S7 slice K — turn 5's ROCK_SLIDE (Grovyle 1→0, the faint), the faint sink, the button-gated KO hold, and "Foe GROVYLE fainted!", landed green, ending BEFORE "DESTIN sent out PIDGEOTTO!"; `turn5-rockslide.json` (new) **256/256**, `turn5-faint.json` (new) **110/110**, both 0 diff, `npm test` **776/776** (+8), build green, zero regressions

- **State:** `npm test` 776/776, `npm run build` green, tree clean.
  `turn5-rockslide.json` (kickoff/shake/rocks/hit-flash/drain, tick
  6222-6477) **256/256**, `turn5-faint.json` (pre-sink hold tail through
  the sink, healthbox vanish, fainted text, cursor, the real KO-dismiss `A`
  press, and 26 post-press static ticks, tick 6478-6587) **110/110**, both
  0 diff. Full regression sweep at exact prior counts, all 0 diff:
  `turn5-endeavor` 254/254, `turn5-menu` 41/41, `turn4-rockslide` 250/250,
  `turn4-doubleteam` 249/249, `turn3-rockslide` 256/256, `turn1-rockslide`
  256/256, `fight-submenu` 235/235, `turn3-endeavor` 192/192, `turn3-menu`
  254/254, `turn2-endeavor-drain` 201/201, `turn4-menu` 44/44, `turn2-
  dragonbreath` 237/237, `turn1-cloneanim` 230/230, `menu-idle` 69/69,
  `turn2-endeavor` 77/77, plus `sendout.json` **255/256** (unchanged - the
  pre-existing named tick-1496 particle-color residual, untouched).
- **Did:** RAM/pixel-probed turn 5's own ROCK_SLIDE window first (dense
  oracle sweeps, no new committed probe traces needed - reused the
  already-committed groundtruth). Parameterized turn 3's own ROCK_SLIDE
  mechanism unchanged (synthetic anchor `TURN5_ROCKSLIDE_PRESS_TICK=5829`,
  cross-confirmed two independent ways: the kickoff-text hard-cut pixel
  tick AND the drain formula's own raw-hp-field-write prediction both land
  on 6429 exactly). Implemented the faint sink as THE FORMULA (§7a's closed
  form: `grovyleFaintSinkRowsAndY2`, handoff S=6502, n=8, +1 render lag),
  not a table - pinned against every one of the 8 RAM-confirmed step ticks.
  Re-probed (not assumed) and answered the brief's own "what happens to
  Grovyle's healthbox" question: it vanishes entirely at S+19=6521, a fact
  not itemized anywhere in the prior dossier. Implemented the KO-text
  button gate as real state (`BattleSceneState.turn5KoDismissElapsed`,
  `sendOutPressElapsed`'s own "created directly" idiom) - `core.ts`'s
  `tick()` has no auto-advance timer that could fire past this point, so
  "hold indefinitely" falls out of the state machine's own shape rather
  than a bolted-on freeze check; both branches (idle-forever, A-advances)
  Tier-1-pinned. Found and fixed two real bugs the naive intro-cursor reuse
  would have shipped wrong, both pixel-confirmed via `npm run compare`
  before committing: the wait-cursor's X position is text-width-relative
  (`LINE2_ORIGIN.x + measureText(...line2)`), not the fixed `CURSOR_DEST_X`
  the S6 intro's own case coincidentally matches; and this cursor's own
  bounce is a one-shot climb-then-hold (0→1→2 over 9-tick steps, then flat
  through this trace's own stopping tick), not `cursorState`'s perpetual
  4-phase loop - both generalized as real parameters on `cursorState`/
  `drawCursor` rather than a second copy-pasted mechanism, S6 intro
  behavior re-verified byte-exact (`sendout.json`, `s6-acceptance.json`
  unaffected). The opponent's own EMPTY healthbox bar (Grovyle's hp=0) is
  oracle-exercised for the first time - `calcBarFilledPixels`'s existing
  general formula already renders it correctly, zero compositor changes,
  confirmed via `npm run compare` not assumed. Added 8 Tier-1 pins: 3 sink-
  formula (all 8 RAM steps + before/after-destroy boundaries), 1
  eligibility-boundary, 2 KO-gate state-machine (both branches), 1 early-
  press-dropped, 1 empty-bar `composeOpponentHealthbox` pin (mirrors the
  existing hp=1/117 player-side pin). Docs: new §24 in
  `docs/battle-turn-notes.md`.
- **Next:** the switch-in tail (tick 6588 on - party-icon-bar re-trigger,
  DESTIN's own "sent out PIDGEOTTO!" text at 6687, ball-throw/materialize
  reusing `GROVYLE_STRETCH_TABLE` per §7b, healthbox slide-in, Onix's own
  Sitrus proc per §2's exact formula, the next settled menu) is the
  immediate next slice - ground truth already substantially banked in
  `docs/faint-switch-notes.md` §3/§6/§7.
- **Notes:** no new papercuts this session.

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

