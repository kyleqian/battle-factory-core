# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 33 — ISSUES #8 leads 1-2 CLOSED (real BG3 wide-window content + RAM-verified window-hold fix, both committed); lead 3 (`confirm-flow.json`) STOPPED short of commit per the brief's stop condition — diffs shrank by ~4-10x but a 3rd, unrelated-looking gap remains

- **State:** `npm test` **291/291** (290→291, +1 net in
  `tests/confirmReveal.test.ts` — one test split into two to cover the new
  boundary), `npm run build` green. All 9 committed traces re-verified at
  their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, rent-slot1 125/139,
  rent-3picks 157/190, summary-info-magby 132/132, summary-info-onix
  122/122) — zero regressions. `confirm-flow.json` **not committed** (see
  below).
- **Did:** **Part 1 (BG3 ground truth):** RAM/VRAM-dumped BG3's actual
  tilemap (mapBaseIndex 27 → VRAM 0x0600D800, rows 4-11) during the wide
  reveal window. Found (and cross-confirmed against source,
  `Select_InitBgs`, `battle_factory_screen.c:1202-1206`) that the wide
  window's content is literally 3 copies of the *already-extracted* narrow
  8x8 `mon-pic-bg.json` tile block, placed at 3 disjoint tile-column anchors
  (x=16/88/160) with 2 transparent 8px gaps (x80-88, x152-160) — not a
  continuous 64px-period tiling as the prior slice's `bg3ColorTiled`
  approximated (which was also mis-anchored, wrapping relative to the
  narrow window's own x88 origin instead of the wide window's x16). **Part
  2 (tick boundaries):** RAM-verified `confirmReveal.ts`'s phase boundaries
  via direct `REG_DISPCNT`/`REG_WIN0V` reads plus `gSprites[]` located by
  known screen position (robust against `FactorySelectScreen` struct-offset
  guessing, which a first attempt got wrong by 2-6 bytes). Flash phase (13
  ticks incl. 1-tick creation lag) confirmed exact, no change. Window phase:
  found `Select_Task_OpenChosenMonPics`' case0 (WIN0 on) and case1 (`ShowBg
  (3)`) are 2 separate ticks with NO window movement between them, not 1 as
  implemented — real hardware holds the degenerate (64,65) window for 2
  ticks before the 8-tick growth to (32,96) starts. Fixed: `WINDOW_STEPS`
  gained an extra `{64,65}` hold entry (11 entries total, same as before —
  only the content of indices 1/8/9/10 shifted, so the overall
  flash→window→shown tick budget is unchanged). Also independently
  confirmed the BG3 wash stays visible **permanently** through the settled
  YES/NO idle (pixel-sampled several frames), not just during window
  growth — `confirmReveal.ts`'s existing "shown"-phase window field already
  modeled this correctly, no change needed. **Extractor + render (both
  committed):** `extract-factory-screen.ts` now emits a `wideTilemap`
  (26x8) field in `mon-pic-bg.json`; `monPicRender.ts`'s `bg3ColorTiled` is
  replaced with `bg3ColorWide` (reads the real geometry, no more tiling
  approximation). Narrow single-popup path (`bg3Color`, `mon-pic-bg.json`'s
  original `tilemap` field) untouched. **Part 3 (trace, not committed):**
  rebuilt `confirm-flow.json` (rent-3picks.json's exact button prefix +
  idle to frame 279) and ran `npm run compare`: diffs dropped sharply (was
  1000-5000px/2-14% starting ~confirm+34; now mostly 30-950px/0.1-2.5%,
  frames 185-188 clean) but two frames (191: 2922px, 233: 4058px) are still
  in the old magnitude range, and none of the remaining diffs match ISSUES
  #5's own x88-151-confinement signature (different bboxes, solid-wrong-color
  failure shape rather than partial-window jitter) — not attributable to
  that policy. Bboxed and sampled 5 representative frames (189/190/191/233/
  249); found what looks like 3 *different* gaps (a yellow-pixel mismatch
  early in the flash phase, likely in the 3rd pick's own un-exercised
  post-frame-189 `monPic` close rendering; a probable contributor at the
  "shown" transition tied to a newly-found 1-tick sprite-creation stagger
  between chosen-mon slot0 and slots1-2 that this engine's single
  `monsAndYesNoVisible` boolean doesn't model; and an unrelated red-vs-white
  mismatch near the YES/NO box in the steady dwell). Per the brief's stop
  condition, did not commit the trace; ISSUES #8 rewritten with the full
  bbox/sample evidence and a renumbered lead list for whichever of the 3 a
  future session tackles first.
- **Next:** ISSUES #8's 3 remaining leads (frame 190/191's yellow mismatch,
  the slot0 sprite-creation stagger, frame 249's red-vs-white mismatch) —
  tackle independently, since evidence suggests 3 unrelated bugs, not one.
  Once clean, commit `confirm-flow.json` and delete ISSUES #8. After that:
  the decline path (stretch goal, still open), then the YES-press exit fade
  + pre-battle room (`docs/prebattle-room-notes.md`), S6.
- **Notes:** all RAM/VRAM probing was scratch (`/tmp/confirm_probe*.py`,
  deleted before finishing); the trial `confirm-flow.json` was written then
  removed (not committed) once compare showed remaining diffs — nothing
  uncommitted left in the tree beyond the intended engine/extractor/test
  changes. PAPERCUT: ~15 min lost chasing `FactorySelectScreen`'s struct
  offsets by hand (computed `monPics[]`/`monPicAnimating` byte positions
  from the C struct definition directly, got them wrong by 2-6 bytes twice)
  before switching to a struct-offset-independent approach (scan `gSprites[]`
  for sprites at known screen positions instead) — worth reaching for the
  position-scan method first next time a sprite/task needs locating, rather
  than hand-deriving struct byte offsets from source.

---
