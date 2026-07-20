# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 178 — Worktree scout (supervisor-folded): slice L's five asset/formula gaps — 4/5 CLOSED with implementable numbers, 2 corrections to prior docs (the "thrown ball" is STATIC at (176,64), no arc exists; the particle burst is 16 sprites, not 13); merged `0f17f5c`, suite 776/776 on the merged tree

- **State:** merged into master, `npm test` 776/776 + build green
  post-merge (supervisor-verified). New: `docs/faint-switch-notes.md`
  §8, `tools/extract/extract-battle-anim-item-heal.ts` +
  `src/assets/gen/battle-anim-item-heal.json`, probe specs + twice-run
  outputs. No engine changes.
- **Did:** (gap 2) ball prop: slot 7, created 6727, static (176,64),
  lifetime 6727-6756, reuses extracted ball-open gfx — no arc, no new
  asset. (gap 3) materialize tint: bit-for-bit the same
  `MATERIALIZE_TINT_COLOR` + 15-tick ramp as Grovyle's send-out,
  re-anchored (hold 24, ramp 15). (gap 4) particle burst x2/y2 verified
  400/400 exact vs the ALREADY-IMPLEMENTED gbaSin/gbaCos formula; count
  corrected 13→16 (3 reused freed slots the earlier scan missed).
  (gap 5) healthbox slide-in: same sprite slot throughout; old box goes
  invisible in lockstep with the sink destroy tick (no slide-out);
  new box = the identical 23-step linear slide-in from send-out.
  (gap 1) Sitrus sparkle extracted BYTE-EXACT (0/115px); ring extracted
  + source-cited but NOT pixel-verified — which affine-anim table
  (`cmds1`/`cmds2`) applies is the one remaining unknown (§8a), a 2-way
  choice slice L can settle by direct oracle diff.
- **Next:** slice L (the switch-in window, tick 6588 → settled menu vs
  PIDGEOTTO ~7256) has every formula/asset it needs; the ring affine
  choice is its only in-flight unknown.
- **Notes:** no new papercuts (known ram-probe bitfield gap worked
  around as documented).

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
