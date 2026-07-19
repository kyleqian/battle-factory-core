# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

