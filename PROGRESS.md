# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 44 — S6 slice 0: ground-truth bring-up pinning complete — battle1-intro.json (1886f/254 captures) committed, RNG/transition/personality checkpoints RAM-verified, dossier extended; NO ENGINE CODE

- **State:** `npm test` **341/341** (unchanged, no engine touched), `npm run
  build` green. `tools/compare/traces-groundtruth/battle1-intro.json`
  (new dir, +README) committed: 1886 frames (`accept-prebattle.json`'s
  verified 392-frame prefix + A-press@400 + 2 more player-paced A-presses
  + idle through transition/intro/both send-outs), 254 dense captures.
  `bin/oracle run` on it verified green; spot-checked anchor (1/1) and
  confirm-decline (67/67) still exact — zero regressions.
- **Did:** Two chained oracle probe passes (sparse locator, then a dense
  final pass around each located boundary) pinned every frame boundary
  the step asked for (message-close, warp-fade black window, transition
  start/first-visual, both send-out text settles, first-action-menu
  settle at tick 1750 with its 36-frame idle cycle) — see
  `docs/battle-bringup-notes.md`'s new "Slice-0 ground truth, 2026-07-18"
  section for the full sha256-cited list. `tools/probe/ram-probe.py`
  (gRngValue + gBattleTypeFlags + gEnemyParty[0..2].personality, every
  tick from 395) then pinned: the 1/VBlank cadence and its exact freeze
  tick (1044→1045, then one explicit draw at 1066, then a 675-tick true
  battle freeze 1066-1740); all 3 opponent personality rolls (28/16/95
  rejection iterations for Grovyle/Murkrow/Pidgeotto respectively,
  cross-validated 3-for-3 against this file's own expected-nature table
  via `personality % 25`); and the transition-select roll (tick 868→869,
  narrowed to 2 of 12 candidates — see below). **Two corrections to the
  existing dossier filed with full RAM evidence** (not re-probing what
  was already trusted — these surfaced from this session's own new data):
  (1) the 3 nature-rerolls + transition-select happen during the
  **heal-icon animation** (ticks 842-869), roughly 160-200 ticks *before*
  the transition's black screen (1031) — not "the same frame" as the
  transition start, as previously assumed; (2) **4** explicit `Random()`
  draws survive the per-frame freeze, not the previously-documented 2 —
  two of them (ticks 1741, 1745) are unexplained, flagged for a future
  source re-read.
- **Next:** S6 slice 1+ (actual engine implementation: battle transition
  effect, scene init, intro text, first action menu) can now build against
  this committed ground truth instead of re-scouting it. Two loose ends
  flagged in the dossier's §4: (a) the transition-visual identification
  is narrowed to `CIRCLES_MEET` or `CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ` (2
  of 12) via RNG math but not pixel-confirmed — a future session should
  either find the right RAM field for the resolved transition id or do a
  frame-by-frame source cross-check; (b) transition-end (trainer/bg fully
  assembled) is bounded to ticks 1200-1290, not resolved tighter.
  Suggested `ROADMAP.md` S6 wording (not edited here, worker convention):
  append under S6 "**Groundwork banked (2026-07-18):**
  `tools/compare/traces-groundtruth/battle1-intro.json` (1886f, 254
  captures) pins the full A-press-through-first-action-menu window with
  sha256-cited frame boundaries and RAM-verified RNG/personality/
  transition-candidate checkpoints (`docs/battle-bringup-notes.md`
  'Slice-0 ground truth'); engine slices can now implement against fixed
  targets instead of re-scouting timings."
- **Notes:** PAPERCUT retired (not fixed by me, supervisor's file):
  `PAPERCUTS.md`'s "No committed oracle trace for the battle-1 bring-up
  path" entry is superseded by this commit. No new papercuts this
  session. All scratch work (`/tmp/s6-worker/`: probe scripts, sparse/
  dense locator trace JSONs, ram-probe spec/output) is scratch per
  convention, not committed. `src/engine/`, `src/assets/`, `src/data/`,
  and `tools/extract/` were **not touched** — confirmed via `git status`
  before both commits.


## 43 — ISSUES #14 root-caused and fixed (two distinct bugs, both the same "accept's own extra-work-free path renders early" mechanism family); `accept-prebattle.json` 123/137 → **137/137**, entry DELETED

- **State:** `npm test` **341/341** (337→341, +4 `tests/prebattleRoomFlow.test.ts`),
  `npm run build` green. `accept-prebattle.json`: **123/137 → 137/137, byte-
  exact on every frame.** All 12 other traces re-verified at their exact
  prior counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-
  menu-slot6 66/66, example 4/4, rent-slot1 125/139, rent-3picks 157/190,
  summary-info-magby 132/132, summary-info-onix 122/122, confirm-flow 79/95,
  confirm-decline 67/67) — zero regressions. ISSUES #14 DELETED.
- **Did:** Also fixed a doc bug inherited from the prior session: the
  supervisor's ISSUES #15 insertion had clobbered #14's own heading line,
  leaving its body under an orphaned continuation fragment (separate commit,
  restored before starting). Root-caused #14 in two layers, both found by
  replaying `accept-prebattle.json`'s exact button script through a scratch
  engine harness and cross-referencing `confirmReveal` state per tick against
  `npm run compare`'s per-frame diff-pixel counts (RAM/IO-register probing,
  the step brief's suggested first approach, was superseded once this
  cross-reference made the mechanism obvious without it). **Root cause #1**
  (the 4-row window-edge band, frames 262-269/270-279, ~11 of the 14 listed
  frames): the accept path's `UNREVEAL_WINDOW_STEPS`/`UNREVEAL_FLASH_WIDTHS`
  table read lands exactly **one tick early** vs decline - confirmed
  air-tight by reproducing every one of the residual's diff-pixel counts
  exactly (96/48/24/12/9px = the precise pixel deltas between adjacent table
  entries × 3 flash centers). Same "decline's extra same-tick work delays
  the render by a tick" mechanism already fixed for `monsVisible` (ISSUES
  #9/#13 family) — just not previously applied to this table. Fixed by
  factoring the table lookup into a pure `closingWindowStep(tick)` and
  reading it at `elapsed+1` (clamped to the last tick, matching decline's
  own tail-hold behavior via the pre-existing `closingFlashResidual`) for
  `accepting`, unchanged for decline. **Root cause #2** (a 36px residual on
  frame 262 surfaced only after fixing #1): the same early-render mechanism
  also hits the window's live ball-grid layer on accept's very first closing
  tick (elapsed 1) - a naive display-only lag (the usual fix for this
  family, tried first and reverted when it broke frame 263) doesn't work
  here because the immediately-following tick permanently freezes via the
  pre-existing `ballAnimStall` mechanism (ISSUES #13), so lagging the stored
  value leaves the wrong tile frozen for the whole stall instead of
  self-correcting. Fixed via a new `ConfirmRevealState.preCloseBallAnims`
  snapshot (every active ball's state as of the tick closing started,
  mirroring the existing `decliningBallAnim` pattern but for all slots)
  consumed by `factoryDraftScreen.ts`'s window-ball rendering only at
  `accepting && elapsed === 1`. Both fixes pinned in
  `tests/prebattleRoomFlow.test.ts` (window/flash table-shift equivalence
  vs. a live decline replay across every tick + the tail clamp, and the
  ball-snapshot's exact one-tick lifecycle).
- **Next:** ISSUES.md backlog is back to just #15 (message-box asset debt,
  out of scope for this step). S6 (battle bring-up) is the next roadmap
  stage, off its already-banked groundwork (`docs/battle-bringup-notes.md`).
- **Notes:** no papercuts this session beyond the doc-heading fix above
  (itself filed/fixed, not left standing). All scratch probing (a Node
  replay harness importing `core.ts` directly, plus Python/PIL pixel
  sampling of `tools/compare/out/latest`) was scratch, deleted before
  finishing - nothing uncommitted beyond the intended
  `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/prebattleRoomFlow.test.ts` + `ISSUES.md`/`PROGRESS.md`/
  `PROGRESS-archive.md`.

---

## 42 — S5 COMPLETE: YES-press accept path (exit fade → pre-battle room → fully-printed "Right this way, please!") implemented, oracle-pinned; `accept-prebattle.json` committed at 123/137, ISSUES #14 filed for the residual

- **State:** `npm test` **337/337** (329→337, +8 `tests/prebattleRoomFlow.test.ts`,
  +2 rewritten in `tests/confirmDecline.test.ts`), `npm run build` green. All
  11 pre-existing traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95, confirm-decline 67/67) —
  zero regressions. New trace `tools/compare/traces/accept-prebattle.json`
  (dense, 137 captures spanning the YES press through the fully-printed,
  settled idle message) committed at **123/137**, all 14 non-matching
  frames individually attributed to a new, precisely-evidenced entry
  (ISSUES #14).
- **Did:** Implemented S5's last piece end-to-end: new `src/engine/
  prebattleRoom.ts` (scene-mode state machine: fadingOut → black → fadingIn
  → roomHold → printing → idle) and `src/engine/prebattleRoomRender.ts`
  (static room composite reusing the already-dossier-verified 17x14-block +
  NPC-sprite assets, plus the message box), wired into `core.ts`'s
  `EngineState`/`tick`/`render` via a new top-level `prebattleRoom` field
  (same shape as `summaryScreen.transition`'s own exclusive-ownership
  pattern). Dense oracle probes this session (own dense captures, not
  reused from prior scratch) pinned: (1) the exit fade-out reuses
  `paletteFade.ts`'s existing `EXIT_FADE_OUT` timing verbatim (same
  `BeginNormalPaletteFade(PALETTES_ALL,0,0,16,RGB_BLACK)` call, source-
  confirmed) but only *starts* once the 20-tick closing/un-reveal
  (`Select_HideChosenMons()`, the SAME function decline calls) finishes -
  not at the button press itself; (2) a new, distinct 14-tick black hold
  (`EXIT_TO_ROOM_BLACK_HOLD_TICKS`, NOT the summary screen's 20); (3) the
  room fade-in reuses `FADE_IN` verbatim; (4) an 8-tick settled-room hold
  before the message box appears (`ROOM_HOLD_TICKS`); (5) the message box
  frame+interior appears fully-formed in one tick (no grow animation) -
  baked directly from an oracle capture into a new asset
  (`src/assets/gen/prebattle-msgbox-frame.json`) after this session's own
  tile/palette brute-force match against `prebattle-room-msgbox.json`
  turned up unexplained ~1-GBA-step color mismatches (PAPERCUT, see below);
  (6) text prints exactly 1 character/tick linearly (no pauses - the
  dossier's own sha-diff-only pass had mistaken 3 space-character ticks for
  timing stalls), glyph origin (16,121) and colors pixel-derived this
  session (corrects `docs/prebattle-room-notes.md` §3's own Risk 1/2 - see
  `prebattleRoomRender.ts`'s module doc for the corrected box geometry,
  y112-159 not y96-159). Root-caused and fixed two real accept-vs-decline
  source divergences along the way (both source-grepped, not guessed):
  `Select_ErasePopupMenu(SELECT_WIN_YES_NO)` is decline-only (accept's
  YES/NO box + cursor highlight stay visible through the whole closing AND
  the exit fade, new `drawYesNoOverlayFaded` export); and the 3 mon pics
  vanish one tick earlier on accept than decline's own cutoff (decline's
  extra same-tick `Select_HandleMonSelectionChange`/`Select_
  PrintSelectMonString` work delays that frame's render, same "extra work
  costs a tick" family as ISSUES #9/#13). RNG continuity (ROADMAP S6's
  correction note) verified two ways: a hermetic hold-yourself test proving
  `rngValue` advances every single tick with no gaps through the whole
  window, and a `tools/probe/ram-probe.py` cross-check pinning the exact
  `gRngValue` at the fully-printed idle tick (bit-exact match, both new
  Tier-1 tests in `tests/prebattleRoomFlow.test.ts`). Ball anims (and their
  RNG rolls) keep advancing through "fadingOut" specifically (source-
  confirmed: `Select_DestroyAllSprites` only runs once the fade completes,
  `battle_factory_screen.c:1512-1519`), then stop for good.
- **Next:** S5 is now fully `[x]`-ready per its own acceptance criteria
  (supervisor to confirm and tick `ROADMAP.md`, per protocol this worker
  doesn't edit it). A future session should pick up ISSUES #14 (the
  window-edge residual below) opportunistically, or move straight to S6
  (battle bring-up) off its already-banked groundwork
  (`docs/battle-bringup-notes.md`).
- **Notes:** **ISSUES #14 filed, not fixed:** a 4-row band at the shrinking
  reveal window's current top/bottom edge shows a wrong color for 8 frames
  of the accept-path closing animation, tapering to 0 by the time the
  window fully collapses (same halving-tapering shape as ISSUES #5's flash-
  bar family) - full pixel evidence + what was ruled out (not a window-
  bounds/table-timing bug, `bg3ColorWide` is flat there, `target2Color`'s
  `bg1Color` fallback is the likely site) is in the entry itself. Chased for
  a meaningful chunk of this session's budget before stopping to bank the
  two *confirmed* source-level bugs instead of guessing further at this
  third one. PAPERCUT: `prebattle-room-msgbox.json`'s own tile/palette data
  didn't reproduce the oracle's box art byte-for-byte when composited per
  the standard `DrawDialogueFrame` tile-index algorithm (source-read
  correctly, cross-checked against the extracted JSON) - colors were
  consistently one GBA 5-bit step brighter than the palette's own entries
  at several positions (border edges, text shadow), not yet root-caused.
  Worked around by baking the exact oracle pixels for the box's pre-text
  frame directly into a new asset instead of re-deriving from tiles/
  palette - functionally correct (0 diff on the box itself) but a future
  session should figure out why the tile-based derivation didn't match
  before extending it (e.g. to a 2nd map's message box) elsewhere. ~20 min
  lost this session on that specific investigation before the baking
  shortcut was chosen.

---
