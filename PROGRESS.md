# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
