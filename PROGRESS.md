# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 37 — Supervisor wind-down: session end 2026-07-17 ~21:00

- **State (verified this minute):** `npm test` **297/297**, `npm run build`
  green, working tree clean. Traces (all re-run by the supervisor at
  wind-down): `anchor` 1/1, `draft-cursor` 13/13, `draft-menu` 38/38,
  `draft-menu-slot6` 66/66, `summary-info-onix` 122/122,
  `summary-info-magby` 132/132 — all 0 diff — plus `rent-slot1` 125/139,
  `rent-3picks` **157/190** (new this session), `confirm-flow` **79/95**
  (new this session), every diff frame in all three individually
  attributed to ISSUES #5's settled pattern. ISSUES.md backlog is EMPTY
  of open bugs (only the #5 settled-policy note + mechanism record
  remain). ROADMAP: S5 slices 1-3 complete; S5 remainder = decline path
  (B/NO) + YES-press exit fade into the pre-battle room
  (`docs/prebattle-room-notes.md`).
- **Session summary (supervised, ~16:08-21:00):** 8 worker steps (7 main
  lane + 1 worktree lane), all supervisor-verified. Landed: (1) ISSUES #7
  resolved after a multi-session saga — the minimal-pair probe step proved
  the HAUNTER "contradiction" was a measurement artifact (a 3rd rent exits
  cursor mode same-tick, so the lone count=3 data point never happened),
  the species-keyed stall safe-list {BAYLEEF, HAUNTER} landed RAM-pinned;
  (2) per-slot displayTile lag fix; (3) cursor-redraw fast path with 2+
  rented balls + OPEN_TABLE_B degenerate-window fix, shipping
  `rent-3picks.json`; (4) confirm-flow state machine + reveal render
  (`confirmReveal.ts`), with five further render/timing bugs root-caused
  across ISSUES #8/#9/#10 (incl. a real `font.ts` glyph-width bug and a
  previously-unmodeled 4th stall source), shipping `confirm-flow.json`;
  (5) ISSUES #5's rent-slot1 re-time question closed empirically (8
  candidates all worse — attribution fallback is now policy). ISSUES
  #7/#8/#9/#10 all closed and deleted.
- **Next:** S5 remainder, in order: the decline path (B/NO,
  `docs/confirm-flow-notes.md` §3), then the YES-press exit fade +
  pre-battle room + attendant dialogue (`docs/prebattle-room-notes.md`,
  scene already extracted + composite-verified). Then S6 off its banked
  dossier (`docs/battle-bringup-notes.md`) + battle-1 assets.
- **Notes:** every worker ended at a green commit; no usage-limit events;
  the one worktree-lane step (rent-slot1 re-time sweep) produced a clean
  negative result and its branch was removed unmerged (no commits). The
  user's own `run-supervisor.sh` remote-control edit was committed on
  request (`c52d42a`).

---

## 36 — ISSUES #10 root-caused and fixed (RAM/oracle-pixel-verified); `confirm-flow.json` COMMITTED — S5's confirm-reveal render surface is now trace-pinned; ISSUES #9 and #10 both deleted

- **State:** `npm test` **297/297** (296→297, +1 net in
  `tests/confirmReveal.test.ts`), `npm run build` green. All 9 pre-existing
  traces re-verified at their exact prior counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, rent-slot1
  125/139, rent-3picks 157/190, summary-info-magby 132/132, summary-info-onix
  122/122) — zero regressions. **`confirm-flow.json` committed** at 79/95
  frames matched, the 16 non-matching frames individually attributed below.
- **Did:** Built a scratch oracle trace (`rent-3picks.json`'s 19 segments +
  90-tick idle, dense `captureFrames` 195-230) and sampled RGB directly at
  the 2 flash-bar centers unshared with any other on-screen element (x=44,
  x=196 - x=120 was ruled out, it sits under an unrelated always-present
  element that coincidentally shares `FLASH_BLENDED_COLOR`) plus a clean
  edge probe at x=8-20 (bar1's own left edge vs the wide window's fixed
  `WIDE_WINDOW_LEFT=16` - a value no flash-bar width can ever produce, the
  one unambiguous discriminator between "bar still on screen" and "window
  opened"). Found: the true flash-width sequence
  (`1,1,4,4,8,8,16,16,32,32,64,64` - unchanged, every value and the doubling
  cadence pixel-confirmed exact) starts exactly 1 tick later than modeled -
  the engine's `elapsed=-1` (existing 1-tick OAM-creation lag) needed a
  *second* hidden tick before `FLASH_WIDTHS[0]` applies, matching the shape
  `monPic.ts`'s own `OPEN_TABLE_*` already models (multiple hidden ticks
  before its first `flash(1)`). Cross-verified against the window-growth
  boundary too: with the extra hidden tick, `WINDOW_STEPS`' previously-added
  2nd `{64,65}` degenerate hold (PROGRESS #33) becomes redundant - dropping
  it (12→11 entries) is the exact 1-tick compensation needed to keep the
  total confirm-to-"shown" duration unchanged, so every already-RAM-verified
  downstream absolute tick (ISSUES #9's ball-anim/stall timing) stays where
  it was; row-scanned BG3 wash content at x=120 for frames 222-226 confirmed
  the growth step (60,69) lands exactly 1 tick after the single degenerate
  hold, not 2. Fixed in `confirmReveal.ts` (`FLASH_WIDTHS` now indexed
  `elapsed-1`, hidden below `elapsed<1`; `WINDOW_STEPS` lost its duplicate
  hold; `advanceConfirmReveal`'s flash→window transition threshold bumped by
  1 to match) and re-pinned in `tests/confirmReveal.test.ts` (boundary
  ticks shifted, 1 test added for the new 2nd hidden tick). Rebuilt
  `confirm-flow.json` (same recipe, `captureFrames` 185-279) and ran
  `npm run compare`: frames 210-279 (the entire flash + window + shown/
  YES-NO-dwell portion, where every ISSUES #9/#10 diff lived) are now
  **byte-exact**. The only remaining diffs, frames 189/190/191/192/193/194/
  195/196/197/198/199/201/203/205/207/209 (107/949/2892/512/512/512/512/512/
  448/64/32/16/8/4/3/1px), exactly reproduce ISSUES #5's own pre-documented
  pattern (tapering 189→199 then the halving tail 199/201/203/205/207/209 -
  32/16/8/4/3/1px, verbatim-matching PROGRESS #35's own prior characterization
  of this same window) - the 3rd pick's own popup-close catch-up, unrelated
  to this session's fix (untouched code path). Committed the trace with each
  attributed frame listed in the commit message. Full 9-trace suite +
  `confirm-flow.json` + `npm test` + `npm run build` all green (counts
  above); ISSUES #9 and #10 both deleted (git keeps history).
- **Next:** S5's confirm-reveal render surface is now fully trace-pinned
  modulo ISSUES #5 (policy-settled, no further fix attempts). S5's remainder:
  the decline path (stretch goal, still open), the YES-press exit fade +
  pre-battle room (`docs/prebattle-room-notes.md`), then S6.
- **Notes:** all RAM/pixel probing (`bin/oracle run` + direct RGB sampling
  via a scratch Node script, `/tmp/issue10/`) was scratch, deleted before
  finishing - nothing uncommitted left beyond the intended
  `src/engine/confirmReveal.ts` + `tests/confirmReveal.test.ts` +
  `tools/compare/traces/confirm-flow.json` + docs changes. PAPERCUT: none
  this session.

---

## 35 — ISSUES #9's ball-anim drift root-caused and fixed (2 independent display-lag bugs, both RAM-verified); `confirm-flow.json` STILL not committed — the fix cleared every ball-OBJ diff but exposed a 5th, unrelated gap in confirmReveal's own flash-bar timing, filed as new ISSUES #10

- **State:** `npm test` **296/296** (292→296, +4), `npm run build` green.
  All 9 committed traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122) — zero regressions. `confirm-flow.json` **not
  committed** (see below).
- **Did:** RAM-probed all 3 ball slots simultaneously (`gSprites[]` located
  by known screen position, `animCmdIndex`/`animNum`/`data[0]` every tick)
  across confirm-flow.json's exact button script (rent-3picks.json's 19
  segments + 90-tick idle, 280 ticks) and cross-correlated tick-by-tick
  against `ballAnim.ts`'s internal state for the same replay (scratch Python/
  TS dump scripts, not committed). Found two independent, clean,
  state-derivable causes, both display-only (RNG-critical internal state
  untouched): (1) slot 0's `displayLagTicks=2` (ISSUES #7) was permanent,
  but RAM-proved to apply only during its *first* moving cycle -
  `REST_INTERNAL_OFFSET`'s own extra tick already resyncs slot 0's internal
  `cmdIndex` with RAM the moment it first enters "resting" (RAM-confirmed:
  slot 0's *second* moving cycle matches RAM's own `animCmdIndex` exactly,
  transition for transition, zero drift) - added `BallAnimState.hasRested`,
  slot 0 now uses lag 2 only while `!hasRested`, lag 1 after (matching every
  other slot always). (2) A previously-unmodeled 4th stall source -
  `Select_CreateChosenMonsSprites()`'s own per-frame cost, same shape as the
  already-modeled LEFT/RIGHT/RENT-confirm text-print stalls
  (`ballAnimMultiBall.test.ts`'s root cause) - adds 1 more display-lag tick
  to every currently-active ball, landing near the reveal's
  window-fully-grown hold (RAM-confirmed via all 3 slots' own next
  `cmdIndex`-transition boundary after that point, all consistent with one
  shared, screen-level event, empirically bounded to a 4-tick window given
  this trace's own granularity) - added `confirmReveal.ts`'s
  `isRevealStallActive` predicate, read by `core.ts`'s ball-anim loop.
  Exhaustive cross-check: **0 `displayTile` mismatches across all 3 slots
  for the full 280-tick window** (down from 15 pre-fix). Pinned with 4 new
  Tier-1 tests (`ballAnimDisplayLag.test.ts`). Committed
  (`src/engine/ballAnim.ts`/`confirmReveal.ts`/`core.ts` +
  `tests/ballAnimDisplayLag.test.ts`).
  **Trace rebuild (not committed):** rebuilt `confirm-flow.json` (same
  recipe as before) and ran `npm run compare`: frames 223-279 (the entire
  window-hold + shown/YES-NO-dwell portion, where every prior ball-OBJ diff
  lived) are now **byte-exact**. Frames 189-209 remain diffing but match
  ISSUES #5's own already-accepted pattern exactly (tapering 189→199 then a
  halving tail 199/201/.../209 - 32/16/8/4/3/1px - the 3rd pick's own
  popup-close catch-up). Frames 210-222 (confirmReveal's own `flash` phase)
  still diff, but pixel-sampled and confirmed **not** ISSUES #5 (a clean,
  deterministic, always-same-direction 1-tick-early shift on *every*
  `FLASH_WIDTHS` doubling step, not a chaotic absolute-tick-dependent
  hardware race) - a genuinely new, unrelated gap in the reveal's own
  flash-bar tick bookkeeping, filed as **ISSUES #10** with the full
  pixel-level evidence. Per the brief's stop condition (residual diff not
  attributable to #5), did not commit the trace.
- **Next:** ISSUES #10 (RAM/register-probe `confirmReveal.ts`'s flash-phase
  tick bookkeeping - likely one more hold tick, same family as this file's
  already-fixed `WINDOW_STEPS` gap, or an `elapsed`-offset bug rather than
  the shared table's values), then rebuild and commit `confirm-flow.json`
  clean modulo ISSUES #5's frames 189-209. One unrelated, pre-existing,
  out-of-window gap also surfaced at absolute tick 114 (a `ballAnimStall`/
  display-lag-chain interaction during slot 0's first cycle, outside
  confirm-flow.json's captured range, already baked into rent-3picks.json's
  long-standing 157/190 count) - not chased, no evidence yet of a clean
  rule. After #10: the decline path (stretch goal, still open), then the
  YES-press exit fade + pre-battle room (`docs/prebattle-room-notes.md`),
  S6.
- **Notes:** all RAM probing (position-scanned `gSprites[]`, same recipe as
  ISSUES #6/#7's own) and the trial `confirm-flow.json` were scratch -
  deleted before finishing, nothing uncommitted left in the tree beyond the
  intended `src/engine/ballAnim.ts`/`confirmReveal.ts`/`core.ts` +
  `tests/ballAnimDisplayLag.test.ts` changes and the `ISSUES.md`/
  `PROGRESS.md` docs. PAPERCUT: none beyond the usual RAM-probe setup cost
  (mgba-venv interpreter segfaults at teardown, exit 139, benign, already
  documented).

---
