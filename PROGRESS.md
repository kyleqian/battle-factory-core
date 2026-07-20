# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 165 — Supervisor wind-down: session end 2026-07-20 ~02:45 — **12 verified worker steps** (9 main + 3 worktree, every one folded green); suite **685 → 744/744**; headline: **turn 2 is COMPLETE end to end** (`turn2-dragonbreath.json` 237/237) and **three long-standing residual families were root-caused and closed** (ISSUES #19, #22, #24 — all three were harvest/dispatch bugs, none was the timing mystery they looked like)

- **State (verified this minute):** `npm test` **744/744**, `npm run
  build` green, tree clean at `fe8015b`, no worktrees, no unmerged
  branches. Full acceptance sweep, supervisor-rerun:
  `turn2-endeavor-drain` **201/201**, `turn2-endeavor` **77/77**,
  `turn2-dragonbreath` **237/237**, `turn3-menu` **250/250**,
  `fight-submenu` **235/235**, `turn1-rockslide` 256/256,
  `battle1-fight-submenu-idle` **256/256**, `sendout` 255/256 (#18
  policy-settled), `s6-acceptance` 224/228 (#5/#18 policy-settled).
- **Session summary (supervised, ~22:10-02:45, 6 rounds):** S7's ENDEAVOR
  window CLOSED (tail 3061-3094: healthbox wobble + Onix flicker); the
  whole DRAGON_BREATH half built from scouted ground truth — kickoff
  text, `AnimTask_ShakeMon2`, both red-fade blends, Grovyle's HP drain,
  text-clear, turn-3 menu reopen, and the 3347-3846 tail (where a dense
  probe caught a live-bounce/HP-digit bug the reference stride would have
  missed); slice F opened turn 3 (the engine previously DEAD-ENDED after
  turn 2) at 250/250. ISSUES #20 closed (FIGHT submenu on the live
  FONT_NARROW pipeline) and S8's per-battle-moveset dependency closed
  (`battleSetup.ts`, KABUTO proven through the state machine). S8
  swap-screen assets extracted, 0 unexplained mismatches/1404 px.
- **The residual-family thread (the session's best result):** #19's
  root cause was an extractor bbox cropping a rare sine-peak state, NOT a
  timing model — which generated the supervisor hypothesis that the other
  named single-tick residuals shared that class. Confirmed: #22's 2135
  plus 3465/3721 were the SAME class on a different asset (Onix's own
  `y2=2` peak, never harvested); 3337 was already silently fixed. That
  fix then TRADED tick 2901 (supervisor caught this: the landing report
  called it an unrelated pre-existing bug, but re-adding 2901 reproduced
  a byte-identical 769px signature) → filed #24 → closed by a ONE-LINE
  missing dispatch arm (`turn1Resolved`), not the two-anchor model the
  brief predicted. Net: four ticks green simultaneously, +4 Tier-1 pins.
- **Next:** (1) S7's faint/forced-switch slice is the biggest open item —
  turn 3's move resolution, turns 4-5, the faint, the AI switch-in, SEND
  OUT (ground truth banked, §13/§14/§19; slice F is only its menu
  prefix); (2) ISSUES #23 (fire projectiles, PARKED by supervisor default
  after 4 attempts — reversible, findings fully banked); (3) S8 engine
  work is unblocked end to end; (4) S4's remainder stays deferred.
- **Notes:** no usage-limit events; worker cost ~$3.7-14/step, 10-40
  min/step, 12/12 landed or returned a clean named negative. One worker
  edited ROADMAP.md (supervisor-owned) — content was accurate status
  only, kept, boundary noted. One new PAPERCUTS entry (supervisor
  mid-worker commits on the shared tree).
