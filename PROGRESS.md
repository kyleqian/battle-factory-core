# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 122 — Supervisor: ROCK_SLIDE ground-truth scout merged — ticks 2094-2600 pinned stride-1 (`battle-move-anim-notes.md` §9); round-4 fold complete, suite **602/602**

- **State (verified post-merge):** `npm test` **602/602**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-kickoff 81/81 and
  fight-submenu 234/235 re-verified on the merged tree.
- **Did (worktree scout, verified then merged, conflict-free):** two dense
  stride-1 groundtruth traces (`battle1-rockslide-dense-a/b.json`,
  2094-2600 complete, twice-run 0 mismatch), two reusable probes
  (`dump-registers.py`, `dump-rockslide-sprites.py`), and §9 tick tables:
  all 20 rock spawns (4-tick cadence 2347-2423, argv-cross-verified),
  exact BG3_Y shake sequence (0,-7,-7,0,0,-7,-7,0,0,-7,-7), hit-flash
  sub-windows (healthbox wobble 2481-2500, mon blink 2482-2513, 4-tick
  cycles), text-timing tables, and a NEW finding: Grovyle's OBJ goes
  BG-composited (invisible as sprite) for 2344-2472 — the `monbg`
  mechanism, target-side. §9 ends with a pinned-vs-open list per engine
  slice B/C/D.
- **Next:** round 5 — main lane: slice B (clone anim 1964-2094 + post-
  clone gap + stat banner + evasiveness text, through 2193); worktree:
  ISSUES #20 (FONT_NARROW extraction + byte-exact validation against the
  committed submenu harvest). Then slice C (ROCK_SLIDE) and D (drain +
  turn end, which also closes ISSUES #16's deferred validation).

