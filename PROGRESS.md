# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 246 — Bounded worker (S7/S8 turn 13 engine step, rung 3 of 4): DRAGON_BREATH re-targeted at Pidgeotto LANDS 0-diff — kickoff text, HP drain 16→0, faint sink, "Foe PIDGEOTTO fainted!" + button-gated KO hold all wired; rung 4 (MURKROW switch-in) NOT attempted, out of scope this session

- **State:** `npm test` **986/986** (978 + 8 new Tier-1), `npm run build`
  green, tree clean. `verify-turn13.ts` **60/60** (mandatory-first-step
  rerun, unaffected). New trace `turn13-dragonbreath-faint.json`
  **141/141, 0 diff**, twice-run byte-identical (15699-15745 kickoff
  typing, 15855-15900 HP drain, 15955-15985 faint sink + fainted-text
  start, 16300/16600/16800 sparse KO-hold samples, 16808-16824 dense
  gated-press boundary — stops at the rung-4 handoff, per the brief).
  Regression sweep clean: `turn13-sandattack` 190/190, `turn13-menu`
  57/57, `turn12-menu` 46/46.
- **Did:** new `turn13KoDismissElapsed` state field threaded through
  `core.ts`'s `tick()`, mirroring `turn5KoDismissElapsed`'s pattern
  EXACTLY (eligibility-gated single-set idiom; render stays a pure
  function of `t`, same as turn 5's own precedent — the "locks... holds
  through 16824" shape falls out of the live wait-cursor's own 9-tick
  phase boundaries, no press-driven freeze needed). Reused verbatim:
  `dragonBreathTextStartTick`/`Chars` (new synthetic
  `TURN13_DRAGONBREATH_PRESS_TICK=15516`, oracle-bisected exact),
  `dragonBreathGrovyleHp` (16→0, `DRAGONBREATH_HP_DRAIN_START_DELAY=353`
  unchanged), `cursorState` (the fainted-message wait-cursor's own FULL
  perpetual 4-phase bounce — turn 5's own window was too short to
  exercise this, turn 13's ~840-tick hold does). Generalized (new
  optional params, every pre-existing call site unaffected):
  `grovyleFaintSinkRowsAndY2` (now takes `startTick`/`steps` — Pidgeotto
  `S=15960,n=7` vs. Grovyle `S=6502,n=8`), `drawTurn5PidgeottoSettled`/
  `drawTurn5SwitchinSprite`/`drawTurn6FieldBase`/`drawTurn13FieldBase`
  (new `pidgeottoSink`/`pidgeottoHealthboxVisible`/`pidgeottoHp` params).
  **Two real bugs found via `npm run compare`, not guessed**: (1)
  Pidgeotto's own target hit-flash (blink + healthbox wobble) — turn 2's
  own DRAGON_BREATH scene already reuses `rockSlideMonBlinkInvisible`/
  `rockSlideHealthboxWobbleY2` for its target; omitting it regressed
  ~1085px at 15855-15863, isolated by the diff crop to Pidgeotto's own
  sprite — re-anchoring both closed it. (2) Onix's own on-field bounce
  must stay FROZEN through the fainted-message hold here, unlike turn 5's
  own analogous window (`drawTurn5RockSlideWindow` reverts to live
  `bounceTick=t` there) — a first attempt mirrored turn 5 and regressed
  ~2325px at 15979 on Onix's own sprite/healthbox; reverting to the
  frozen `turn13KickoffBounceTick` throughout closed it. A third, tiny
  fix: the wait-cursor's own start needed one MORE tick of lag than
  `TURN5_FAINTED_CURSOR_START_DELAY`'s own "+1" convention
  (`TURN13_FAINTED_CURSOR_START_DELAY=485`), found via two mismatched
  phase-boundary ticks (16810/16819).
- **Next:** rung 4 (MURKROW switch-in) — turn 5's faint-switch machinery
  re-anchored per `docs/turn13-notes.md` §6-§7's REUSE MAP; asset already
  extracted (§48's own correction: MURKROW's front sprite has been in
  `FRONT_SPECIES`/`battle-opponent-front-sprites.json` since commit
  `c170d68`) — pure wiring from here, nothing left to probe.
- **Notes:** `docs/battle-turn-notes.md` §49 and `docs/turn13-notes.md`'s
  newest dated section have the full writeup. **Named, excluded
  residual** (not chased, time-boxed): a 2px diff at ticks 15882-15884,
  isolated to Pidgeotto's own HP-bar fill color (`calcBarFilledPixels`
  renders hp=1,2,3 identically — a bar-quantization floor — but the
  oracle's own pixel there doesn't match either candidate this session
  checked); excluded from `turn13-dragonbreath-faint.json`'s own
  `captureFrames` rather than faked. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

- **State:** `npm test` **978/978** (unchanged), `npm run build` green,
  tree clean. `turn13-sandattack.json` **190/190, 0 diff** (185 -> 190,
  adds render 15476-15480, the attacker-slide-only span). Regression
  sweep clean: `turn13-menu` 57/57, `turn12-menu` 46/46, `turn12-aerialace`
  56/56, `turn11-menu` 56/56, `turn10-aerialace` 23/23.
- **Did:** extracted `gBattleAnimSpriteGfx_MudSand` (no `.png` source in
  this reference tree, unlike every prior battle-anim asset — only the
  raw pre-compression `mud_sand.4bpp`; new `tools/extract/
  extract-sandattack-dirt.ts` decodes tile 0 directly). Ran the committed
  `dump-sandattack-anim.py` fresh against `battle1-turn13-dense-a.json`
  15470-15525 and derived TWO closed forms directly from RAM (not
  guessed): (1) Pidgeotto's own attacker-slide `x2` (a 7-tick pinned
  table) — wired (`turn13SandAttackPidgeottoX2`, threaded through 4
  existing draw functions as a new trailing param) and **oracle-confirmed
  0-diff** on its own; (2) all 30 dirt sprites' own linear-translation
  motion (`x2/y2 = ∓floor(min(n,20)*step/256)` off one shared RAM origin,
  `xStep`/`yStep` per sprite RAM-exact) — wired with an OAM draw order
  sorted by descending spawn slot (closed most, not all, of the diff: 41
  -> 37/231 mismatched frames). The remaining residual (small, <0.2%/frame,
  concentrated where 3+ sprites' cells overlap right after each wave's
  spawn) wasn't chased further — likely needs a fuller `SortSprites`-style
  per-tick simulation (`rockSlideDrawOrder`'s own precedent), not just a
  spawn-order sort. **Correction to §47/PROGRESS #244's own assumption**:
  MURKROW's front sprite is **already extracted** (`FRONT_SPECIES` in
  `extract-battle-mon-pics.ts` has included it since commit `c170d68`) —
  Part C's own asset-extraction need was smaller than previously thought.
- **Next:** Part A's dirt-cloud residual is a named, well-characterized
  gap (full derivation + pinned table in `docs/turn13-notes.md`'s newest
  section) — a resuming worker can either chase the OAM-order fix or just
  leave it excluded and move to Parts B/C, both of which are still fully
  pure wiring per `docs/turn13-notes.md` §4-§7's REUSE MAP (nothing left
  to probe): Part B needs a new `turn13KoDismissElapsed`-style field
  mirroring `turn5KoDismissElapsed`'s pattern in `core.ts`; Part C is
  turn 5's faint-switch machinery re-anchored (asset already exists per
  the correction above).
- **Notes:** `docs/battle-turn-notes.md` §48 has the full writeup, plus
  `docs/turn13-notes.md`'s newest "bounded worker... Part A" section (the
  authoritative ground truth: pinned 30-entry dirt table, exact formula,
  residual characterization). PAPERCUT: `mud_sand.4bpp` having no `.png`
  companion cost ~10 min of investigation before confirming the raw-4bpp
  path was correct, not a missing asset.

- **State:** `npm test` **978/978** (969 + 9 new Tier-1), `npm run build`
  green, tree clean. `verify-turn13.ts` **60/60** (mandatory-first-step
  rerun, unaffected). New trace `turn13-sandattack.json` **185/185, 0
  diff** (ticks 15420-15475 + 15522-15650: confirm-transient tail,
  settled kickoff text, silent monbg gap, accuracy-drop stat banner,
  "ONIX’s accuracy fell!" typing+hold — deliberately EXCLUDES
  15476-15521, the dirt-throw/attacker-slide window). Regression sweep
  clean: `turn13-menu` 57/57, `turn12-menu` 46/46, `turn12-aerialace`
  56/56, `turn11-menu` 56/56, `turn10-aerialace` 23/23.
- **Did:** `drawTurn13SandAttackWindow` dispatches SAND_ATTACK's own
  kickoff text ("Foe PIDGEOTTO used\nSAND-ATTACK!"), a new
  `turn13SandAttackAccEva`/`Bg1Y` pair (a THIRD parameter combination of
  the already-wired generic `StatsChangeAnimation` banner — non-sharply
  target/wait 10/20 crossed with a DECREASE direction and the `accuracy`
  palette, no new asset extraction needed), and "ONIX’s accuracy fell!"
  (curly apostrophe, matching the font/charmap pin `TURN6_ATKFELL_LINE1`
  already established). All pure wiring, zero new render primitives.
  **One genuine bug found by oracle bisection, not guessed**: `pressTick`
  (`TICK0+sm.confirmElapsed`) is **15419** at runtime, not 15418 (the
  confirm press's own segment-start tick a naive dossier reading
  suggests) — a fresh `npm run compare` caught every mid-typing frame
  showing a small diff localized to exactly one trailing glyph (the
  classic off-by-one-tick signature) plus a huge diff at the transition
  frame itself; rebased all three new delay constants off the real
  anchor, closed to 0 immediately.
- **Next:** rung 3 (DRAGON_BREATH re-targeted at Pidgeotto — kickoff text
  reuses the ALREADY-GENERIC `dragonBreathTextStartTick`/`Chars`
  verbatim with a new synthetic pressTick anchor; HP-drain reuses
  `dragonBreathGrovyleHp` verbatim; faint sink reuses
  `grovyleFaintSinkRowsAndY2` verbatim; the KO-gated hold needs a NEW
  `turn13KoDismissElapsed`-style field threaded through `core.ts`,
  mirroring `turn5KoDismissElapsed`'s own pattern exactly, cycling the 4
  idle-bounce shas the dossier names), then rung 4 (MURKROW switch-in —
  turn 5's faint-switch machinery re-anchored, but needs a NEW
  front-sprite asset for MURKROW, not yet extracted anywhere in
  `src/assets/gen/`). Both rungs' full ground truth is already banked in
  `docs/turn13-notes.md` §4-§7 — nothing left to probe, this is pure
  wiring + one new asset extraction from here.
- **Notes:** `docs/battle-turn-notes.md` §47 has the full writeup. The
  (a) dirt-throw sub-phase (30 dirt sprites from one shared
  attacker-relative origin, `Random2()&0x1F` per-sprite jitter,
  regenerable via the committed `tools/probe/dump-sandattack-anim.py`)
  needs a new sprite-sheet asset extraction (`ANIM_TAG_MUD_SAND`, not yet
  in `src/assets/gen/`) — didn't fit this session's remaining time;
  excluded from `turn13-sandattack.json`'s own `captureFrames` rather
  than claim a false 0-diff pass, matching the "exclude, don't fake"
  convention ISSUES #23's own projectile exclusion already establishes.
  No PAPERCUTS beyond the standing mgba-venv-teardown one.
