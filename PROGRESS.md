# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 121 — Bounded worker: **S7 slice A landed** — move CONFIRMATION (A on ROCK_SLIDE) + turn kickoff through "Foe GROVYLE used\nDOUBLE TEAM!" — `turn1-kickoff.json` **81/81, 0 diff**; suite 593 → **602/602**

- **State:** `npm test` **602/602** (+9 net Tier-1), `npm run build` green,
  tree clean. New trace `tools/compare/traces/turn1-kickoff.json` (canonical
  `battle1-turn1.json` prefix through the 2nd A press, idle to tick 1964, 81
  dense captures) **81/81, 0 diff** - no residual, no attribution needed.
  Zero regressions: fight-submenu 234/235 (unchanged), menu-idle 69/69,
  sendout 255/256, s6-acceptance 224/228, menu-throw 78/78.
- **Did:** densely re-probed ticks 1900-2020 (own oracle trace + RAM probe,
  twice-run 0 mismatches - §11 never exercised A-confirm, only nav/B-close)
  and found: A-confirm hands off to the engine with **no visible submenu-
  close redraw at all** (unlike B's own DMA round-trip) - the submenu keeps
  showing its idle content for 9 more ticks while `gBattleMainFunc`/
  `gBattlerAttacker`/`gCurrentMove` resolve turn order (Grovyle outspeeds
  Onix), then hard-cuts atomically to the message at tick 1929
  (`gBattle_BG0_Y` 320->0). String pixel-confirmed exact: "Foe GROVYLE
  used\nDOUBLE TEAM!" (`STRINGID_USEDMOVE` + `sText_FoePkmnPrefix`), 1
  tick/char (this save's FAST speed - corrects a stale scratch-doc claim of
  2 ticks/char, now three-for-three confirmed against this cadence rule).
  Reused the existing battle-text printer (`drawMessageTextLines`/
  `battleWindow`, FONT_NORMAL) verbatim - no new asset needed, unlike the
  FIGHT submenu's own FONT_NARROW move list. The onix/healthbox bounce
  overlay stays live for 3 ticks past the press then freezes at a
  grid-searched literal tick (not the live formula's own value at that
  moment) through tick 1964. `battleMenu.ts`'s `FightSubmenuState` gains
  `confirmElapsed`; `core.ts`'s FIGHT-submenu input branch now also guards
  on `confirmElapsed === null` so no further input mutates the submenu once
  confirmed (matches the source's "controller stops polling" behavior, not
  just this trace's own idle script - a real hardening, not just a feature
  add). RNG ledger pinned via a determinism test (identical script replayed
  twice -> identical state), not a `turnRng` integration - this window
  consumes zero `Random()` calls, `turnRng` isn't wired into `core.ts` yet.
- **Next:** the clone animation (tick 1964+, DOUBLE_TEAM's own blend/motion,
  `battle-move-anim-notes.md` §8) is the immediate next window; the stat-
  change banner and ROCK_SLIDE's own resolution (accuracy/crit/damage/
  HP-drain) follow per battle-turn-notes.md §9's tick table.
- **Notes:** docs in `docs/battle-menu-notes.md` §9 (this session's own
  section, per the brief's choice). Stayed in scope (battleMenu.ts/
  battleScene.ts/core.ts + their tests, new trace, this doc's §9,
  PROGRESS.md) - did not touch battle-turn-notes.md/battle-move-anim-notes.md
  or ISSUES #5/#16/#18/#19/#20 per the brief. No PAPERCUT this session.

---
## 120 — Supervisor: **S6 → [x] (user decision — 1496 accepted/parked, ISSUES #18 policy-settled)**; healthbox-compositor branch merged (ISSUES #16 trimmed to its deferred-S7-validation stub) — **suite 593/593**; ISSUES #20 filed (FONT_NARROW gap)

- **State (verified post-merge):** `npm test` **593/593**, `npm run build`
  green, tree clean, no worktrees/branches. Sweeps re-run on the merged
  tree: fight-submenu 234/235, sendout 255/256, s6-acceptance 224/228,
  menu-idle 69/69 — unchanged, the compositor swap is pixel-neutral as
  required.
- **Did:** (1) user decided option 1 on the escalated S6 question: tick
  1496 accepted/parked permanently, ROADMAP S6 → **[x]** (commit
  17794e3), ISSUES #18 rewritten as a policy-settled attribution record
  (mirrors #5's format). (2) merged the worktree healthbox lane:
  `composeOpponentHealthbox` now drives the live send-out render (harvest
  file kept as test fixture only); two both-sides-additive
  `battleScene.ts`/test import conflicts hand-resolved, full suite run
  BEFORE the merge commit per the truncated-merge-output lesson.
  (3) ISSUES #16 trimmed to its one open debt (partial-HP/status oracle
  validation, due in S7's first HP-drain trace). (4) ISSUES #20 filed:
  FONT_NARROW was never extracted — submenu text is a battle-1-only
  harvest, blocks S8/S9 movesets (from #119's flag).
- **Next:** S7 turn execution — move confirmation (A on ROCK_SLIDE) →
  battle-script sequencing → HP-drain trace (which also validates #16's
  partial-HP path against real oracle pixels). Ground truth already
  banked: battle1-turn1.json v5 + RAM dump + §9 tick tables +
  battle-move-anim-notes. The S7 core modules (damageCalc/turnOrder/
  turnRng) are wired-ready but not yet consumed by core.ts.
- **Notes:** round 3 = 2 workers, both green first try ($4.60/11.6min +
  ~$15/47min), zero regressions. This makes 6 verified worker steps + 3
  merges today, suite 555 → 593.

