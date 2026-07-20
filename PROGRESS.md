# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 168 — Bounded worker: S7 slice H — turn 3's ROCK_SLIDE resolution (the turn's second half) landed by PARAMETERIZING turn 1's own ROCK_SLIDE mechanism with ZERO code changes; `turn3-rockslide.json` (new) **256/256, 0 diff**, `npm test` **749/749** (+3), build green, zero regressions

- **State:** `npm test` 749/749, `npm run build` green, tree clean.
  New `tools/compare/traces/turn3-rockslide.json` (`turn3-endeavor.json`'s
  own button script, idle frames extended to 4890 total, dense stride-1
  over the kickoff/shake/rocks/hit-flash/drain/text-clear/redraw transient
  + light stride over the rock settle-wobble tail/settled plateau, 256
  captures) is **256/256, 0 diff**. This session ALSO validated the full
  window at full stride-1 density across four unbudgeted scratch
  `npm run compare` passes (4080-4891, every single tick) before settling
  on the committed 256-capture subset — 0 diff on all 812 extra probed
  ticks too. Full regression sweep re-verified at exact prior counts:
  `turn3-endeavor` **180/180**, `turn3-menu` **250/250**, `turn1-rockslide`
  **256/256**, `turn1-drain` **102/102**, `turn2-dragonbreath` **237/237**,
  `turn2-endeavor-drain` **201/201**.
- **Did:** Extended `drawTurn3EndeavorText` (slice G's own ENDEAVOR-half
  function) to hand off into a new `drawTurn3RockSlideWindow` once ROCK_
  SLIDE's own kickoff text hard-cuts the message box (tick 4080, slice G's
  own pixel-confirmed boundary) — same handoff shape `drawTurn2KickoffText`
  already established for DRAGON_BREATH. ROCK_SLIDE is the SAME move/same
  target (Grovyle) turn 1 already modeled end-to-end, so every one of turn
  1's own mechanism functions (`rockSlideBg3Y`/`rockSlideRockState`/
  `rockSlideDrawOrder`/`rockSlideMonShakeY2`/`rockSlideHealthboxWobbleY2`/
  `rockSlideMonBlinkInvisible`/`rockSlideOpponentHp`) is reused with **ZERO
  code changes** — only a new synthetic press-tick anchor (`TURN3_ROCKSLIDE_
  PRESS_TICK=3687`, chosen so `rockSlideTextStartTick` lands on 4080) plus
  two new turn-3-specific delay constants for the post-drain RNG-cost tail
  (`TURN3_ROCKSLIDE_TEXT_CLEAR_DELAY=662`/`MENU_REDRAW_DELAY=669`, both
  exactly +5 past turn 1's own constants — fully explained by the bigger
  HP-drain diff, 47 vs 42, not a new mechanism; verified via §13's own
  turn-3 RNG ledger matching turn 1's v5 correction table tick-for-tick
  relative to each turn's own hp-field-update). Directly checked (not
  assumed) the brief's own OAM-slot-state caution: fresh `dump-rockslide-
  slot-order.py` run shows turn 3's own baseline-slot occupancy matches
  turn 1's `ROCK_SLIDE_BASELINE_SLOTS` 9/9 exact, and while the raw
  `sSpriteOrder` seed differs in 9/64 positions, all 9 are free filler
  slots that a full single-pass `SortSprites` re-sort makes unobservable —
  confirmed empirically by the 0-diff sweep above, not just argued. New
  anchor `anchorOpponentAfterTurn3Hp` (41, Grovyle's post-ROCK_SLIDE HP).
  Full writeup: `docs/battle-turn-notes.md` §21.
- **Next:** Turn 4 entirely (menu-reopen input at tick 4892, DOUBLE_TEAM
  instead of a third ENDEAVOR — ground truth banked §13) is the immediate
  next slice. Slice G's own 12-tick shake-asymmetry exclusions and
  `turn3-menu.json`'s own 3879/3888 residuals remain untouched. ISSUES #23
  (fire projectiles) stays parked.
- **Notes:** no papercuts. The RAM-probe-first workflow (`ram-probe.py` +
  `dump-rockslide-sprites.py`/`dump-rockslide-slot-order.py`, all already
  committed, no new tooling needed) resolved every anchor before any pixel
  fitting, per slice G's own "mind the render lag, don't assume turn
  symmetry" lesson — paid off directly this time (the OAM-seed divergence
  the brief flagged as a real risk turned out to be provably inconsequential,
  not something a curve-fit would have caught cleanly).

---
## 167 — Worktree scout (supervisor-folded): faint/switch-in unknowns — the Pidgeotto-over-Murkrow AI rule SOURCE-TRACED + RAM-confirmed, the Sitrus heal formula PINNED exactly (flat +30, not a maxHP fraction); merged `7f4edcb`, suite 746/746 on the merged tree

- **State:** merged into master (`3be0276`), `npm test` 746/746 + build
  green post-merge (supervisor-verified). New: `docs/faint-switch-notes.md`,
  `tools/probe/dump-switch-decision.py` (twice-run byte-identical),
  `src/data/gen/battle1-grovyle-switch-decision.json`. No engine changes.
- **Did:** (§13 open item 1) `GetMostSuitableMonToSwitchInto`
  (`battle_ai_switch_items.c:629-790`) is a two-phase algorithm; phase 1's
  source-commented bug (scores the candidate taking the MOST damage from
  the opponent's own types) ties Murkrow/Pidgeotto 0-0 (both Flying,
  zeroed by Ground immunity) → falls to phase 2's damage fallback.
  Corrected a probe-docstring error: this opponent type's real party
  lives in `gFrontierTempParty`, not `rentalMons[3..5]`; banked Murkrow's
  first-ever RAM stat/moveset ground truth via a plaintext struct-offset
  read. Honestly flagged unresolved: phase 2's `AI_CalcDmg` reads a stale
  `gCurrentMove` (RAM-pinned to ROCK_SLIDE all decision window) and a
  naive hand-trace of that predicts the WRONG winner — needs stack-local
  tracing the oracle probes can't reach; do NOT model phase 2 from this
  dossier alone. (Item 5) Sitrus = `HOLD_EFFECT_RESTORE_HP`, flat
  `holdEffectParam=30`, gate `hp <= maxHP/2`, capped at maxHP
  (supervisor re-verified vs `items.h:1753`/`battle_util.c:3336`); 1+30=31
  exact, §13's floor(117/4) guess was the wrong generation's formula.
- **Next:** scout goals 1/4 NOT reached (time-boxed): the 6684-7215
  switch-in animation window is still un-itemized (dense pixels already
  committed in `battle1-grovyle-faint.json` — narrate from those), and
  **Pidgeotto's front sprite is NOT extracted** (`src/assets/gen/` has
  nothing for it) — hard prerequisite for the faint engine slice.
- **Notes:** supervisor also re-tested slice F's excluded ticks 3879/3888
  against the #22/#24 fixes directly — still DIFF (769px/1573px), NOT
  that family; §19's RAM-probe follow-up stands.

---
## 166 — Bounded worker: S7 slice G — turn 3's ENDEAVOR resolution (the turn's first half) landed by PARAMETERIZING turn 2's own mechanisms, not rebuilding; `turn3-endeavor.json` (new) **180/180**, `npm test` **746/746** (+2), build green, zero regressions

- **State:** `npm test` 746/746, `npm run build` green, tree clean.
  New `tools/compare/traces/turn3-endeavor.json` (`turn3-menu.json`'s own
  button script + 190 idle frames, through tick 4079) is **180/180**
  (192 dense captures minus 12 characterized shake-residual exclusions,
  see below). Full regression sweep re-verified at exact prior counts:
  `turn3-menu.json` **250/250**, `turn2-dragonbreath.json` **237/237**,
  `turn2-endeavor-drain.json` **201/201**, `turn2-endeavor.json` **77/77**,
  `fight-submenu.json` **235/235**.
- **Did:** Extended `core.ts`'s dispatch so turn 3's own confirm (cursor 0,
  ROCK_SLIDE selected by the player) still resolves Grovyle's ENDEAVOR
  first (speed order), reusing turn 2's own ENDEAVOR sub-mechanisms
  (kickoff text, squish/blend/droplets/hitsplat/healthbox-wobble/flicker —
  all already `pressTick`-relative, needed ZERO formula changes) —
  parameterized the two turn-2-hardcoded anchors (`drawEndeavorSquish`
  gained `opponentHp`/`kickoffBounceTick` params, `drawActionMenuIdleContent`
  gained an optional `playerHp` param) and wired a new `drawTurn3EndeavorText`
  + `turn3KickoffBounceTick`/`TURN3_KICKOFF_FROZEN_BOUNCE_TICK`. All anchors
  RAM/pixel-probed fresh, not assumed: `TURN3_CONFIRM_PRESS_TICK=3891`,
  kickoff text start 3900 (same `-1` reopened-submenu correction turn 2
  needed), HP drain 101→88 completing at tick 4057 (`ENDEAVOR_HP_DRAIN_
  START_DELAY=153` unchanged), window-safe boundary tick 4079 (ROCK_SLIDE's
  own kickoff text hard-cuts the message box at 4080). One genuine
  divergence found and NOT curve-fit: turn 3's own target-shake RAM reads
  asymmetric `+3/-2` (not turn 2's symmetric `±3`) — 12 ticks excluded,
  precisely characterized (px count, region, bbox) rather than chased.
  Full writeup: `docs/battle-turn-notes.md` §20.
- **Next:** the ROCK_SLIDE half of turn 3 (Onix's own move hitting Grovyle
  again, kickoff text starting sometime after tick 4080, ground truth
  banked §13) and the turn-4 menu reopen are the immediate next slice. The
  shake-asymmetry residual (§20) is a clean, scoped follow-up needing one
  RAM read (`gAnimMovePower` at ticks 3956-3966) before touching render
  code. ISSUES #23 (fire projectiles) stays parked.
- **Notes:** no papercuts. `tools/probe/ram-probe.py` (generic, already
  committed) was the right tool for the RAM-side anchors this session —
  no new probe script needed, unlike most prior ENDEAVOR-window sessions.

