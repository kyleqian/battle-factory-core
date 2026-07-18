# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 32 — S5 slice 3 (confirm flow): state machine + RNG landed and Tier-1-pinned; render/trace STOPPED short of commit per the brief's own stop condition (wide-window pixel content not verified) — new ISSUES #8

- **State:** `npm test` **290/290** (276→290, +14 in new
  `tests/confirmReveal.test.ts`), `npm run build` green. All 9 committed
  traces re-verified at their exact prior counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, rent-slot1
  125/139, rent-3picks **157/190**, summary-info-magby 132/132,
  summary-info-onix 122/122) — zero regressions. `confirm-flow.json` **not
  committed** (see below).
- **Did:** Implemented the 3rd-RENT-confirm → reveal → settled YES/NO idle
  state machine (`src/engine/confirmReveal.ts`, wired into `core.ts`/
  `factoryDraftScreen.ts`): cursor/menu input permanently locks out once
  `isMonsConfirmed` (`selectingMonsState > FRONTIER_PARTY_SIZE`, same tick as
  every other confirm — no new logic needed there); the 3rd pick's own
  popup close reuses `monPic.ts`'s existing `CLOSE_TABLE_B` unchanged; once
  `monPic.phase === "closed"`, a new `ConfirmRevealState` machine runs the
  border-sprite flash-zoom at 3 positions (x=44/120/196, reusing the exact
  same 1/1/4/4/8/8/16/16/32/32/64/64 affine-anim widths `monPic.ts`'s own
  flash already pins — verified via source read,
  `sSpriteTemplate_Select_MonPicBgAnim` is literally the same sprite
  template/anim table used by both), then a full-width WIN0 window
  (x16-224, vs the single popup's x88-152) growing (64,65)→(32,96), then
  the 3 chosen-mon front sprites (ordered by `selectedId`, not slot) +
  YES/NO box appear together, cursor highlight 1 tick later (same
  window-copy-vs-OAM lag pattern as everywhere else in this screen).
  Exact tick counts (13 flash incl. 1-tick creation lag, 8 window-growth +
  3 hold, cursor +1) were oracle-probed this slice (dense capture diffing,
  scratch, not committed) against `rent-3picks.json`'s own button prefix
  extended with idle — close settles at confirm+~20 (unchanged), reveal
  settles around confirm+45, matching `docs/confirm-flow-notes.md`'s
  tick+43/44/45 pinning closely. **RNG (mission-critical per the brief):
  zero new logic** — the ball-anim loop in `core.ts` was already
  unconditional (runs regardless of cursor/menu/confirmed state) and this
  slice's confirmed-gate deliberately wraps only the cursor/menu *input*
  branch, not the ball-roll loop, so the existing RAM-verified RNG stream
  (`ballAnim.ts`, untouched) continues exactly through the whole window by
  construction — pinned with a Tier-1 regression test asserting the stream
  never merely advances 1/tick (proving ball-roll draws keep firing) and
  stays fully deterministic. 14 new Tier-1 tests in
  `tests/confirmReveal.test.ts` pin: `isMonsConfirmed`'s threshold, input
  lockout, the `confirmReveal` trigger tick, the full phase-boundary
  sequence (flash widths, window steps, shown/cursor timing), pick-order
  species, and the two RNG properties above.
  **Render/trace (not committed):** built a candidate `confirm-flow.json`
  (rent-3picks.json's exact button prefix + idle to ~280) and ran `npm run
  compare` — diverges hard (1000-5000px, 2-14%) starting at the wide
  window's opening (~frame 223) through the settled YES/NO idle, **well
  outside ISSUES #5's x88-151-confinement pattern** — not attributable to
  that policy. Root cause: `mon-pic-bg.json`'s extracted tilemap is only
  8x8 tiles (scoped for the single-popup window before this slice); the
  reveal's 208px window is approximated by tiling that same pattern every
  64px (`monPicRender.ts`'s new `bg3ColorTiled`), which doesn't match the
  real wide-window BG3 content. Per the brief's stop condition, did not
  commit the trace; filed **ISSUES #8** with the specifics. Decline path
  (B/NO) is unimplemented — explicitly a stretch goal per the brief, and
  time ran out before reaching it.
- **Next:** ISSUES #8: RAM/VRAM-dump the wide-window BG3 content directly
  (not tiled-approximated) and independently RAM-verify `confirmReveal.ts`'s
  tick boundaries (byte-level, like `monPic.ts`'s tables), then rebuild
  `confirm-flow.json` and commit once clean. After that: the decline path
  (stretch goal, still open), then the YES-press exit fade + pre-battle room
  (`docs/prebattle-room-notes.md`, explicitly next slice per the brief), S6.
- **Notes:** all oracle probing this session was scratch (`/tmp/confirm_probe*`,
  deleted before finishing) — nothing uncommitted left in the tree beyond
  the intended `src/engine/confirmReveal.ts` + `tests/confirmReveal.test.ts`
  + small exports added to `monPicRender.ts`/`factoryDraftScreen.ts`.
  PAPERCUT: spent a long time re-deriving the reveal's exact source
  mechanics (two chained tasks, shared `MonPicBgAnim` sprite template
  between the single-popup and 3-mon-reveal paths) from
  `battle_factory_screen.c` directly before writing any code — worth doing
  again for future slices (the dossier's own prose was occasionally
  ambiguous about which task owns which window/sprite), but it ate most of
  the session's budget and left too little time to also nail the wide
  window's exact pixel content; a future session should budget oracle
  RAM-probing time for the render layer *before* implementation, not after.

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
