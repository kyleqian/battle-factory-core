# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 34 — ISSUES #8 CLOSED: all 3 remaining render gaps root-caused and fixed (gap 1 reattributed to #5, gap 2 was a 1-tick-early phase transition not a per-slot stagger, gap 3 was a highlight/text draw-order bug plus a real font.ts glyph-overrun bug); `confirm-flow.json` still NOT committed — rebuilding it surfaced a 4th, distinct gap, filed as new ISSUES #9

- **State:** `npm test` **292/292** (291→292, +1), `npm run build` green.
  All 9 committed traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66,
  example 4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby
  132/132, summary-info-onix 122/122) — zero regressions. `confirm-flow.json`
  **not committed** (see below).
- **Did:** Rebuilt `confirm-flow.json` (rent-3picks.json's exact prefix +
  90-tick idle, dense captures 185-279) and diagnosed each of #8's 3 gaps
  in priority order. **Gap 1 (frames 190/191, up to 2922px):** cross-checked
  against this same trace's own ball1/ball2 closes (frames 38/39, 114/115 -
  plain deselect closes, unrelated to the reveal) and found byte-for-byte
  identical bbox/magnitude/failure shape, matching ISSUES #5's own
  mechanism record verbatim ("up to 3343px/8.71%"). The 3rd pick's popup
  close is the same `CloseMonPic` path every RENT/DESELECT confirm uses
  (`core.ts`'s RENT branch, unconditional) — never a confirmReveal bug, just
  #5's already-accepted WIN0V hardware-cycle race hitting this instance
  harder. The prior session's "ruled out" call compared only against #5's
  steady 512px frames, not its own documented peak transient frames. No
  code change; #8 updated instead of "fixed" for this lead. **Gap 2 (frame
  233, 4058px):** a fresh RAM probe (`gSprites[]` scanned by screen
  position, same recipe as before) confirmed the previously-recorded slot0-
  vs-slots1/2 sprite-creation stagger is real *in RAM* — but diffing
  consecutive oracle PNGs across the transition shows all 3 front sprites'
  actual pixels appear on the exact same rendered frame, one tick later
  than this engine modeled. The RAM-level stagger is fully absorbed by the
  same BuildOamBuffer-before-RunTasks lag documented elsewhere in this
  codebase and never reaches the screen — modeling 3 per-slot flags would
  have been wrong. Fixed by adding one more hold tick to `WINDOW_STEPS`
  (11→12 entries); `monsAndYesNoVisible` stays a single flag.
  **Gap 3 (frame 249, 81px):** two bundled causes. (a) `drawConfirmReveal`
  drew the YES/NO text *before* the cursor-highlight sprite, opposite the
  working RENT/SUMMARY/OTHERS menu's order in the same file — the highlight
  blotted out "YES"'s own letters when the cursor sat on that row; fixed by
  reordering. (b) A real `font.ts` bug, unrelated to confirmReveal: `drawText`
  painted every glyph's full 16px template cell with the background color
  when `colors.bg != 0`, not just the glyph's own proportional advance width
  — invisible everywhere else (always landing on already-matching
  background) except the last character of the one message long enough to
  reach a border ("Are these three POKéMON OK?"'s "?", 2px short of the info
  window's own yellow frame). Cross-checked against
  `reference/pokeemerald/src/text.c:608-609` (glyphWidth clamped to the
  glyph's own width before `GLYPH_COPY`) and this font's own extracted
  bitmap data (every glyph's ink is confined to columns 0..width-1) —
  confirmed the clamp is safe for every character. Fixed by bounding the
  fill loop to `font.widths[code]`. Frame 189 (107px) re-checked last per
  the brief: unchanged, byte-identical to rent-3picks.json's own already-
  #5-attributed frame 189 — not a 4th gap. **New finding (ISSUES #9):**
  with all 3 of #8's gaps fixed, `confirm-flow.json` still isn't clean
  modulo #5 — periodic small diffs (36-180px) appear in individual rented
  balls' own 32x32 OBJ regions (all 3 slots implicated at different times)
  scattered through both the reveal window and the ~90-tick settled dwell.
  Confirmed pre-existing (byte-identical bboxes already present in the
  *pre-fix* compare run, just +30px from the now-fixed font bug) and
  confirmed NOT ISSUES #5 (wrong region/shape) — it's `ballAnim.ts`'s model
  being exercised, for the first time in any committed trace, by a long
  undisturbed 3-ball idle with zero cursor/menu input to ever resync it
  (`ballAnimStall` stays `[]` the whole window). Filed as ISSUES #9 with
  full bbox/frame evidence rather than folded into #8's now-resolved scope.
- **Next:** ISSUES #9 (RAM-probe `gSprites[]`/`ballAnim.ts`'s internal state
  across a dense 3-ball idle window, same recipe as the now-closed #6/#7),
  then rebuild and commit `confirm-flow.json`. After that: the decline path
  (stretch goal, still open), the YES-press exit fade + pre-battle room
  (`docs/prebattle-room-notes.md`), S6.
- **Notes:** all RAM probing (`gSprites[]` position-scan, per the last
  worker's papercut note) and the trial `confirm-flow.json` were scratch —
  deleted before finishing, nothing uncommitted left in the tree beyond the
  intended `src/engine/confirmReveal.ts`/`factoryDraftScreen.ts`/`font.ts` +
  `tests/confirmReveal.test.ts` changes. PAPERCUT: none this session beyond
  the usual RAM-probe setup cost (mgba-venv interpreter segfaults at
  teardown, exit 139, benign — already documented in
  `tools/extract/inspect-anchor.py`'s own docstring, cost a few minutes to
  remember before checking stdout instead of the exit code).

---

---
