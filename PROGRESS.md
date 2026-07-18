# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 41 — ISSUES #12 root cause #2 fixed + ISSUES #13 root-caused and fixed; `confirm-decline.json` 54/67 → **67/67**, both entries DELETED

- **State:** `npm test` **328/328** (325→328, +3 in `tests/confirmDecline.test.ts`;
  the 324→325 en route was the #12 pin), `npm run build` green. All 10
  pre-existing traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions.
  `confirm-decline.json`: **54/67 → 67/67, byte-exact on every frame.**
  Both ISSUES #12 and #13 DELETED.
- **Did (Part 1, ISSUES #12 root cause #2):** Dense per-tick pixel diff of
  oracle vs app in the WIN_OPTIONS box (x176-224/y112-144, fresh
  `npm run compare` capture into `tools/compare/out/confirm-decline`)
  showed the YES/NO glyph text is already fully erased (replaced by plain
  window-background pixels) at closing `elapsed===1` — one tick before the
  old `elapsed<2` model — while the cursor-highlight sprite's own red
  pixels stay visible through `elapsed===2`, one tick *after* the old
  `cursorVisible` cutoff, only gone at `elapsed===3`. Fixed in
  `confirmReveal.ts`'s closing branch: `yesNoVisible` now only true at
  `elapsed===0`; `cursorVisible` true through `elapsed<=2`. Pinned
  (`confirmDecline.test.ts`, new ISSUES #12 describe block asserting all 4
  boundary ticks). This alone took `confirm-decline.json` to 55/67 (254
  byte-exact, 255 down from 973px to a 45px residual in the ball-grid area
  — see Part 2).
- **Did (Part 2, ISSUES #13):** RAM-probed `gSprites[]` (position-scanned
  the 6 ball sprites by their known screen centers, `35*i+32,64` —
  confirmed indices 0-5 = grid slots 0-5 exactly) and cross-checked
  `animCmdIndex`/`animNum` tick-by-tick against this engine's own predicted
  `ballAnims[]` state (scratch Python probe via the mgba-venv interpreter +
  a scratch Node replay of `core.ts`, both deleted after use) plus direct
  oracle-vs-app pixel sampling at each ball's grid position. Ground truth:
  starting at the closing phase's `elapsed 0->1` boundary, every
  still-active ball (slots 0/1; slot 2 is already null from the decline
  itself) needs exactly one more internal tick of stall on top of the
  decline's own already-modeled `Select_PrintSelectMonString` stall — a
  **permanent** one-tick downstream shift (proven by diffs recurring on
  every subsequent `MOVING_CMDS` transition all the way to frame 302, long
  after `confirmReveal` itself goes null — only explainable by a genuine
  internal-timer stall via the existing `ballAnimStall` skip-a-tick
  mechanism, ISSUES #6's family, not a brief display-only lag like
  `isRevealStallActive` which self-corrects and can't cascade). Fixed:
  `core.ts` now sets `ballAnimStall = activeSlotsBeforeAction` on the same
  `wasClosingAtZero`-derived tick the speciesNameFade activation already
  fires on. This alone closed 10 of the remaining 11 #13-listed frames plus
  255's residual (66/67). The 12th residual, frame 273 (3px at the 3
  `REVEAL_FLASH_CENTERS`, y=64, exact `FLASH_BLENDED_COLOR` value): the
  closing zoom-out's own final width-1 flash pixel outlives `confirmReveal`
  going null by exactly 1 tick — a pure OAM-teardown render lag, kept
  deliberately separate from (and NOT changing) `confirmReveal`'s own
  already-RAM-verified 20-tick un-reveal duration that gates cursor-input
  readiness. Fixed via a new `DraftScreenState.closingFlashResidual`
  boolean (same shape as this codebase's other post-hoc trailing-render
  fields, e.g. `rentConfirmRedraw`), set for exactly the tick
  `confirmReveal` transitions "closing"->null, consumed by
  `drawConfirmReveal`'s now-non-early-returning null branch. **67/67.**
  Both fixes pinned (`confirmDecline.test.ts`, 3 new describe blocks: the
  #12 boundary timing, the #13 `ballAnimStall` extension + frozen-state
  equality check, and the `closingFlashResidual` one-tick pulse).
- **Next:** ISSUES.md backlog is now EMPTY. S5's last piece: the YES-press
  accept path (exit fade → pre-battle room, `docs/prebattle-room-notes.md`).
  Then S6 off its banked dossier.
- **Notes:** all RAM probing (`tools/probe/ram-probe.py` for the ball-sprite
  position scan + `animCmdIndex` watch, addresses derived from
  `gSprites`'s linker symbol + `sizeof(struct Sprite)=0x44` from
  `reference/pokeemerald/include/sprite.h`) and pixel sampling (scratch
  Python/PIL over `tools/compare/out/confirm-decline`'s fresh captures) was
  scratch, deleted before finishing - nothing uncommitted beyond the
  intended `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/confirmDecline.test.ts` + `ISSUES.md`/`PROGRESS.md`. No new
  papercuts — `tools/probe/ram-probe.py` and the position-scan method from
  PROGRESS-archive #35 both worked as documented.

---
