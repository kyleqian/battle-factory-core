# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 125 — Bounded worker: **S7 slice B convergence retry** — Gap 1 (clone motion) CLOSED via RAM probe, Gap 2 (banner) REFRAMED to a smaller source-confirmed residual — `turn1-cloneanim.json` **49/230 → 168/230**; suite 631 → **634/634**

- **State:** `npm test` **634/634** (+3 Tier-1 pins), `npm run build` green,
  tree clean. `tools/compare/traces/turn1-cloneanim.json` (unchanged, per
  the brief) now **168/230** (was 49/230) - acceptance (230/230) not yet
  met but both named gaps individually advanced per the brief's discipline.
  Zero regressions: turn1-kickoff 81/81, fight-submenu 234/235, menu-idle
  69/69, sendout 255/256, s6-acceptance 224/228 - all re-verified unchanged.
- **Did:** new probe `tools/probe/dump-doubleteam-sprites.py` (identifies
  the two clone sprites by `callback === AnimDoubleTeam`, `nm`-resolved
  since it's `static`) dumped their `data[]`/`x2` every tick 1955-2200
  directly off RAM. **Gap 1 CLOSED**: found the prior session's formula had
  two bugs, not the "non-uniform call cadence" it suspected - (a) the two
  clones are NOT a shared `+offset`/`-offset` table (C's arithmetic-shift
  truncation isn't symmetric around zero at small amplitude, RAM-proved:
  clone A `x2=0` but clone B `x2=-1` at the same tick, not `-0`) - fixed by
  simulating both clones independently (`DOUBLE_TEAM_CLONE_OFFSETS_A`/`_B`,
  `battleMenu.ts`); (b) the anchor tick was actually already correct once
  combined with fix (a) and this run's established one-tick render-lag
  convention - re-verified against the compare tool directly (clone window
  1964-2093: pervasive multi-KB diffs → 0 diff except 4 near-1px edge
  ticks). **Gap 2 REFRAMED**: tested `frame2` first as instructed - RAM
  disproves it outright (Grovyle's own sprite fields are perfectly flat the
  whole banner window). Re-read `StatsChangeAnimation_Step1-3` source
  directly and found the real mechanism: target-1 is **BG1** (not flat
  white, the prior session's 2-sample algebraic solve was a coincidence),
  loaded with a real scrolling stat-arrow tilemap/palette
  (`gStatAnim_Increase_Tilemap`/`gStatAnim_Evasion_Pal`) that
  `StatsChangeAnimation_Step3` scrolls via `gBattle_BG1_Y += tVelocity`
  (`tVelocity=3`) UNCONDITIONALLY every tick including the "flat eva/evb"
  hold - RAM-confirmed exact (`gBattle_BG1_Y`: flat 0 through 2129, then a
  clean `0,3,6,...,180` ramp 2130-2189, matching `tVelocity=3` exactly).
- **Next:** slice B is NOT done - gap 2's residual is now well-bounded but
  requires real new work (extract `gStatAnim_Evasion_Pal`/`_Tilemap`/`_Gfx`,
  new LZ77-BG extractor, wire an OBJ-window-clipped BG1-scroll compositor -
  the OBJ-window registers `StatsChangeAnimation_Step1` sets are almost
  certainly why the banner tracks Grovyle's silhouette instead of covering
  the whole screen) - materially larger than a formula fix, flagged for the
  next slice-B session rather than rushed. Gap 1's own 4-tick sub-pixel
  residual (2075/2082/2088/2089, 2-7px each) also left named, not chased
  further this session. Once gap 2 lands, re-run `npm run compare` for
  230/230. ROCK_SLIDE (slice C) and drain/turn-end (slice D) still queued
  behind this.
- **Notes:** docs/battle-menu-notes.md §10 restructured (§10a this
  session's findings, §10b prior attempt preserved for history, superseded).
  PAPERCUT: none - the RAM-probe-first discipline the brief mandated worked
  exactly as intended, turning two prior "grid search found no fit" dead
  ends into one closed formula bug + one correctly-scoped extraction task.

---
## 124 — Supervisor: FONT_NARROW branch merged (ISSUES #20 → extraction half closed, rewire half open) — **suite 631/631**; round 6 = slice-B convergence retry (two named leads) + turn-2 ground-truth scout

- **State (verified post-merge):** `npm test` **631/631** (+29), `npm run
  build` green, tree clean, no worktrees/branches. turn1-kickoff 81/81
  re-verified post-slice-B-attempt; turn1-cloneanim committed at 49/230
  (in-progress target, #123).
- **Did:** merged the FONT_NARROW lane (extractor + font-narrow.json +
  byte-exact proof vs the submenu harvest, 24 render checks 0 mismatch,
  via the engine's own drawText); trimmed ISSUES #20 to its rewire half
  (PP dynamic-color state machine + mixed-font runs, both source-traced
  in tests/fontNarrow.test.ts's header).
- **Next:** round 6 — main lane: slice-B convergence retry per #123's own
  two named probes (dense gSprites[].data[] over the clone slots;
  frame2 idle-breathing hypothesis under the banner hold) with the
  strictly-smaller-gap discipline; worktree: turn-2 ground-truth scout
  (extend the canonical script into turn 2, pin fresh RNG/damage/text —
  also cross-validates damageCalc's +2-corrected formula on new rolls).
  Then slice C (ROCK_SLIDE) + D (drain/turn-end, closes #16's deferred
  validation).

---
## 123 — Bounded worker: **S7 slice B attempted, NOT accepted** — DOUBLE_TEAM clone anim + stat banner engine code landed and wired, but `turn1-cloneanim.json` scores **49/230** (acceptance was 0 diff); two genuine unresolved mechanisms individually attributed; suite stays **602/602**, zero regressions

- **State:** `npm test` **602/602** (unchanged - no new Tier-1 pins added,
  see Notes), `npm run build` green, tree clean. New trace
  `tools/compare/traces/turn1-cloneanim.json` (canonical prefix, ticks
  1964-2193, 230 captures) committed at **49/230** - **acceptance criterion
  (0 diff) NOT met**. Zero regressions: turn1-kickoff 81/81, fight-submenu
  234/235, menu-idle 69/69, sendout 255/256, s6-acceptance 224/228 - all
  re-verified unchanged.
- **Did:** implemented and wired `battleMenu.ts`'s `doubleTeamCloneOffset`/
  `statsBannerEva` (pure tick formulas) + `battleScene.ts`'s
  `eraseGrovyleFootprint`/`drawSpriteSheetBlended`/`drawDoubleTeamClones`/
  `drawStatsBanner`, hooked into `drawFightSubmenuWindow`'s `confirmElapsed`
  branch right after slice A's `drawTurnKickoffText`. RAM/register findings
  for both windows are solid (re-verified via a fresh stride-1
  `dump-registers.py` re-probe): clone window flat `BLDCNT=0x3F40`/
  `eva=12,evb=8` 1966-2093; gap 2094-2131 exact-match baseline (no code
  needed); banner `BLDCNT=0x3F42`/`eva` ramps 0→10→0 over 2127-2193,
  `evb=16-eva`. Reverse-engineered the banner's true mechanism from raw
  pixels (two independent exact algebraic solves): it's a flat-WHITE flash
  blended IN OVER Grovyle's own real, un-hidden sprite - NOT a BG1-composited
  copy replacing it as first assumed; this fixed an early bug where `eva=0`
  boundary ticks showed background instead of plain Grovyle.
- **Two unresolved gaps, both individually attributed (docs/battle-menu-
  notes.md §10, not curve-fit)**: (1) the clone motion's per-tick advance
  rate doesn't fit any `(anchor, rate)` pair against the decoded C formula -
  long-range zero-crossings (ticks 1999/2024/2092) match the simulated
  sequence exactly, but the oracle already shows motion by tick 1970 while
  the same anchor's short-range formula predicts zero motion through 1975;
  a grid search over anchor/rate found no fit reconciling both ranges. (2)
  the banner's own hold window (2150-2171, `eva`/`evb` RAM-confirmed flat)
  shows the real sprite's OWN raw color cycling through several values
  tick-to-tick - a second, unidentified motion under the blend, not
  `menuIdleBounce` (wrong period/already frozen there). Candidate flagged
  but not tested: `grovyleFrontSprite`'s unused `frame2` asset (a species
  idle-breathing animation, never wired into any renderer).
- **Next:** (1) a dense `gSprites[].data[]` RAM probe (not pixel bboxes) for
  the two clone sprite slots across 1964-2094 to nail the true call cadence;
  (2) check whether wiring `frame2` as a periodic idle swap closes the
  banner gap; (3) then re-run `npm run compare` on the already-committed
  trace until 230/230 - the trace itself doesn't need to change, only the
  rendering formulas. ROCK_SLIDE (slice C) and drain/turn-end (slice D)
  remain queued behind this.
- **Notes:** kept the partial implementation committed rather than reverting
  (this run's "attribute, don't withhold" convention) since it's a real,
  regression-free improvement in understanding even though not yet pixel-
  exact; no new Tier-1 tests were pinned this session since the formulas are
  demonstrably not yet correct (pinning a known-wrong value would be worse
  than not pinning). PAPERCUT: none beyond the inherent difficulty of this
  specific window - the session budget went almost entirely into oracle/RAM
  forensics for a mechanism with two compounding, previously-undocumented
  sub-mechanisms (a non-uniform clone advance rate, a second sprite motion
  under the banner blend) that this session could bound but not fully solve.
