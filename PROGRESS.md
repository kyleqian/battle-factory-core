# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 31 — ISSUES #7 remainder CLOSED: frames 152/153 root-caused and fixed (cursor-redraw catch-up accelerates with 2+ rented balls), plus a second bug found+fixed along the way (frame 92/168: `OPEN_TABLE_B`'s "extra hold" tick was a wrong flash frame, should be a degenerate 1px window); `rent-3picks.json` committed at 157/190, every remaining diff frame individually attributed to ISSUES #5

- **State:** `npm test` **276/276** (273→276, +3), `npm run build` green.
  All 8 previously-committed traces re-verified UNCHANGED at their exact
  prior counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, rent-slot1 **125/139**,
  summary-info-magby 132/132, summary-info-onix 122/122).
  `tools/compare/traces/rent-3picks.json` **committed** at **157/190**.
- **Did:** Rebuilt the exact 3-pick shape from ISSUES #7 (confirms@37/113/
  189, 36-idle+2RIGHT between rents, dense captures 0-189) and reproduced
  the prior session's diff set exactly, confirming it was stable. Tested
  the assigned hypotheses in order: (1) "perpetual species-name breathe" for
  frame 152 - FALSE, ruled out immediately (frames 154-189 are clean, a
  perpetual breathe would keep diffing them). (2) Cross-checked the FIRST
  RIGHT (1 ball rented): its own +1/+2 frames (76/77) are clean, confirming
  the single/zero-ball 3-tick-staggered redraw timing
  (`CursorRedrawState`'s existing doc) is untouched. (3) Overlaid
  oracle-vs-app crops at frames 152/153: **frame 152** - oracle already
  shows "BAYLEEF" (species text) where the app still shows "MAGBY"; **frame
  153** - oracle's cursor arrow is already under slot 2 where the app's is
  still under slot 1. Both are the SAME mechanism: with 2+ balls already
  rented at the move tick, the whole redraw pipeline lands 1 tick sooner -
  species text catches up alongside category (`elapsed>=1`, not staggered
  to `elapsed>=2`) and the arrow settles at `elapsed>=2` instead of
  `elapsed>=3`. **Root-caused as a clean, state-derivable rule** (not a
  chaotic race): confirmed absent with exactly 1 rented ball (frames 76/77
  clean), present with exactly 2 (frames 152/153, both fixed). Fixed by
  adding a `fast: boolean` field to `CursorRedrawState`, set from
  `activeSlotsBeforeAction.length >= 2` at move time (`core.ts`), consulted
  by `advanceCursorRedraw`'s settle threshold and the species-catch-up
  condition (`factoryDraftScreen.ts`). Pinned with 4 new Tier-1 tests
  (`tests/draftScreen.test.ts`) against both the isolated `advanceCursorRedraw`
  transition and a full `tick()` integration (rent slot0, RIGHT with 1
  ball -> `fast:false`; rent slot0+slot1, RIGHT with 2 balls -> `fast:true`).
  **Along the way, found frame 92 was a diff too** (not mentioned in the
  brief's "already decomposed" list - a gap in the prior sessions' own
  accounting, not a new regression) - **byte-identical bbox/pixel-values to
  frame 168** (both `x92-146/y64`, oracle showing ball-art gradient colors,
  app showing a flat `FLASH_BLENDED_COLOR` (194,233,226) fill). RAM-probed
  (`REG_DISPCNT`/`WIN0V` direct reads) around ticks 88-96: real hardware's
  `DISPCNT` WIN0 bit sets at tick 91, its BG3 bit at tick 92 - i.e.
  `Task_OpenMonPic`'s case0/case1 have already fired by frame 92, but the
  window hasn't started growing yet (still the initial `top=64,bottom=65`
  degenerate 1px window from case0). `monPic.ts`'s `OPEN_TABLE_B` modeled
  this "extra hold" tick (idx15, oracle-measured but never explained) as a
  3rd flat `flash(64,true)` frame; it's actually `win(64,65)` - a real,
  blended 1px window, not the flash sprite. Fixed by replacing that table
  entry; pinned by updating `tests/monPic.test.ts`'s variant-B open test to
  assert the window shape at idx15 instead of a 3rd flash tick. This fix
  incidentally cleared frame 168 too (the exact same table index, hit again
  by the 3rd ball's own open) - **frames 37-57/113-133 (rent-close jitter,
  unaffected, byte-identical to before), 92/152/153/168 (all now CLEAN)**.
  Only **169/170/189** remain, matching the brief's own pre-classification
  ("#5-attributable") exactly: `169` (x88-151/y56-72, 512px) and `170`
  (x88-151/y52-76, 512px) are the same magnitude/location as every other
  accepted ISSUES #5 window-growth frame (e.g. rent1's own 117/118/119/120,
  each 512px in the same x88-151 window); `189` (x93-110/y55-68, 107px)
  matches the brief's own predicted bbox verbatim. Committed
  `rent-3picks.json` (0-189 dense) with all 33 remaining diff frames
  individually attributed in the commit message.
- **Next:** confirm-flow implementation (`docs/confirm-flow-notes.md`),
  exit sequence (`docs/prebattle-room-notes.md`), and S6 remain queued
  behind S5's completion per entry 26 - S5's own acceptance criterion (a
  committed 3-pick trace) is now met modulo the ISSUES #5 window-jitter gap
  (root-caused as an unfixable-at-this-engine's-level hardware cycle race,
  policy settled).
- **Notes:** all RAM probing was scratch (`/tmp/probe_regs.py`,
  `/tmp/probe_ballstate.ts`, `/tmp/probe_monpic.ts`, deleted before
  finishing; trace JSON under `/tmp`) - nothing uncommitted left in the
  tree beyond the final `tools/compare/traces/rent-3picks.json`. Also
  deduplicated an accidental exact-duplicate "## 28" entry in this file
  during the archive rotation (both copies were byte-identical; kept one).
  PAPERCUT: manually decoding PNG filters in pure Python to bbox a diff
  cost ~10 min before switching to PIL (already a dev dependency via the
  system Python, not this project's own toolchain) - worth reaching for
  PIL/Pillow first next time instead of hand-rolling a PNG decoder for
  quick bbox/pixel-dump scripts.

---

## 30 — ISSUES #7 remainder: RAM-pinned + fixed the second-ball display-tile lag (Parts 1-2 landed, committed); Part 3 (`rent-3picks.json`) built a clean candidate but STOPPED short of committing per the brief's own stop condition — more diff frames than expected, though all classify as pre-existing/benign on inspection

- **State:** `npm test` **273/273** (270→273, +3 in
  `tests/ballAnimDisplayLag.test.ts`), `npm run build` green, working tree
  clean except this docs commit. `rent-slot1.json` re-verified unchanged at
  **125/139**. `rent-3picks.json` **still not committed** (see below - not
  blocked by a known bug, just short of a final verification pass).
- **Did:** **Part 1 (RAM probe, committed with Part 2):** wrote a scratch
  `EmeraldOracle` probe (direct `struct Sprite` reads: `animCmdIndex` @0x2B,
  OAM `tileNum` = attr2 bits0-9 @0x04, cross-derived `sFactorySelectScreen`
  base via a pointer DEREF that a first attempt missed) dumping both balls'
  `animCmdIndex` and raw-framebuffer diffs tick-by-tick across a long dwell
  after 2 plain rents (~80 cadence transitions total). Finding: real
  hardware's own display lag from *its own* `animCmdIndex` is a uniform 1
  tick for **every** ball, always (both balls, ~40 transitions each, one
  exception at the full-cycle-restart/reroll boundary which needs+1 more -
  not exercised before tick 189, so out of scope here). Cross-checked
  against the engine's own modeled `cmdIndex` via a throwaway vitest dump:
  slot 0's internal `cmdIndex` runs exactly 1 tick EARLY vs RAM (engine hits
  cmdIndex9 at tick104 in a 2-ball dwell; RAM hits it at tick105) - a
  pre-existing quirk `REST_INTERNAL_OFFSET`'s own comment already flagged as
  present-but-harmless for single-ball; slot 1's matches RAM exactly, no
  offset. This fully explains the old "flat 2" model: it was only ever
  correct for slot 0's own miscalibration, not a real 2-tick hardware lag.
  **Part 2 (committed, `2a29750`):** `advanceBallAnim` now takes a
  `displayLagTicks` param (2 for slot0, 1 for every other slot, wired from
  `core.ts`'s ball-index loop) - purely additive to the shift-register
  logic, `advanceBallAnimCore` (cmdIndex/timer/pendingRest/RNG) untouched,
  so every pre-existing RNG-pinned test passed unmodified. Pinned 3 new
  Tier-1 tests against the RAM checkpoints. Confirmed via `npm run compare`
  against a scratch 2-rent trace that frames 180/188 (the originally-
  reported 176px ball-OBJ-position diffs) are now **0 diff**.
  **Part 3 (not committed):** rebuilt the exact PROGRESS-archive #21 3-pick
  shape (confirms@37/113/189, dense captures 0-189) and ran `npm run
  compare`. Frames 180/188 confirmed clean. But found MORE diff frames than
  the brief's stated expectation ("168-170 and 189 only"): frames 37-57 and
  113-133 (bbox/pixel-count byte-identical to `rent-slot1.json`'s own
  already-committed 14-diff ISSUES #5 pattern, recurring once per rent) and
  frames 152-153 (new location, x196-236/y20-28 then x59-109/y80-92, right
  after the 2nd RIGHT move - the first plausibly matches ROADMAP's
  already-documented "species-name palette breathe, not yet modeled" gap,
  the second unidentified). None are at a ball's OBJ position in a way
  that isn't already independently accepted. Per the brief's own stop
  condition ("any other diff -> STOP, do not commit, document"), did not
  commit the trace despite this analysis suggesting it's likely shippable -
  full breakdown in ISSUES #7.
- **Next:** a future session should (1) identify frame 153's bbox
  (x59-109/y80-92) via RAM/overlay, (2) re-run the exact compare above to
  reconfirm the diff set is stable, (3) if clean, commit
  `rent-3picks.json` with per-frame attributions and delete ISSUES #7.
  Confirm-flow implementation (`docs/confirm-flow-notes.md`), exit sequence
  (`docs/prebattle-room-notes.md`), and S6 remain queued behind this per
  entry 26.
- **Notes:** all oracle probing this session was scratch (Python scripts +
  a throwaway vitest test file under `tests/_scratch_displaylag.test.ts`,
  deleted before finishing; trace JSONs under `/tmp`) - nothing uncommitted
  left in the tree. PAPERCUT: ~10 min lost to a pointer-dereference bug in
  my own probe script (`sFactorySelectScreen` is `struct X *`, not `struct
  X` - reading fields directly off its own address instead of dereferencing
  first silently returned plausible-looking-but-wrong zeros for slots 1-4);
  `inspect-anchor.py`'s existing `oracle.read_u32(SFACTORY_SELECT_SCREEN_ADDR)`
  pattern already does this correctly and is worth grep'ing for before
  hand-deriving struct offsets fresh next time.

---

## 29 — ISSUES #7 Part 1 landed (species-keyed LEFT/RIGHT stall, sanctioned per entries 26-28): fixed, tested, committed; Part 2 (`rent-3picks.json`) STOPPED per the brief's own explicit stop condition — a SECOND, narrower ball-render bug (unrelated to the stall rule) surfaced once the trace was actually built

- **State:** `npm test` **270/270** (264→270, +6 in
  `tests/ballAnimSpeciesStall.test.ts`), `npm run build` green, working tree
  clean. `rent-slot1.json` re-verified still **125/139** (no regression).
  `rent-3picks.json` **still not built** (blocked by a newly-found, different
  bug - see below and ISSUES #7).
- **Did:** **Part 1 (committed, `e3f712e`):** implemented the corrected
  2-species safe-list in `ballAnimStall`'s LEFT/RIGHT branch
  (`cursorMoveStallsBalls`, `factoryDraftScreen.ts`) - stalls every active
  ball only when the entering slot's species is outside `{BAYLEEF,
  HAUNTER}`, keyed by the engine's existing draft-pool species string (not
  slot index). Pinned with 6 new Tier-1 tests against ISSUES #7's
  RAM-derived checkpoints (Probe A: action ticks 79/121/163/205 reproduced,
  decisive HAUNTER-no-stall window 203→207 not 208; Probe C: count=2
  HAUNTER-no-stall windows 276→284/275→307 not 285/308) - every expected
  value hand-derived from documented RAM facts via `MOVING_CMDS`' fixed
  durations, then cross-checked against the implementation before
  committing to the numbers (not the other way around). No existing test
  had pinned the old always-stall behavior, so nothing needed updating.
  **Part 2 (not committed):** rebuilt PROGRESS-archive #21's exact 3-pick
  trace (confirms at press-ticks 37/113/189) and ran `npm run compare`
  (scratch, captures 0-245). First checked the brief's required amendment
  (probe for the first YES/NO-hand-off pixel after tick 189): frame 189
  itself is still clean/#5-attributable, but frames ≥190 diverge
  immediately and explode fast (949px→13271px by 234+, spreading to
  x239/y32-156) - confirms the trace must end at/before 189. Then found
  frames 180 and 188 show a 176px diff at **x56-76/y54-73, outside the
  x88-151 mon-pic window, at ball-index-1's (MAGBY) own OBJ position** -
  the brief's explicit stop condition. Root-caused enough to rule out the
  stall rule as the cause (byte-identical diff before/after Part 1's fix,
  confirmed via `git worktree` against the pre-fix commit; ball 1's
  internal `cmdIndex` timing independently matches pure zero-stall
  arithmetic exactly) and pinned it precisely: the engine's `displayTile`
  lags the oracle by 1 tick at this transition, not the documented-as-2-tick
  constant. Per the brief, stopped without guessing a fix - did not commit
  `rent-3picks.json`, wrote the full finding into ISSUES #7 (trimmed to this
  remainder, historical species-stall investigation trail removed - git
  history has it if ever needed) instead of re-litigating the now-fixed
  stall rule.
- **Next:** a future session should RAM-probe the display-lag mechanism for
  a second active ball directly - the bug reproduces with just 2 plain
  rents and a long-enough dwell, no cursor moves needed (ball 1's own
  cmdIndex8→9→10 transition around tick 179-188). Once that's fixed,
  `rent-3picks.json` should build cleanly against the same trace shape
  already validated here. Confirm-flow implementation
  (`docs/confirm-flow-notes.md`), exit sequence
  (`docs/prebattle-room-notes.md`), and S6 remain queued behind this per
  entry 26.
- **Notes:** all oracle probing this session was scratch (trace JSON files
  under `/tmp`, a throwaway `git worktree` for the before/after comparison,
  a throwaway TS script overlaying candidate ball tiles onto the oracle's
  own PNG per this issue's established zero-residual-diff method) - nothing
  uncommitted left in the tree, worktree removed. PAPERCUT: none beyond the
  usual oracle round-trip overhead; the `git worktree add HEAD~1` +
  symlink-node_modules/reference trick to run `npm run compare` against a
  prior commit without disturbing the working tree is worth remembering for
  future before/after regression checks.

