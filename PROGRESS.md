# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 40 — ISSUES #12: hypothesis disproven + real root cause #1 found/fixed (declined-ball window-render hold); root cause #2 characterized, still open; `confirm-decline.json` 53/67 → 54/67

- **State:** `npm test` **324/324** (323→324, +1
  `tests/confirmDecline.test.ts`), `npm run build` green. All 10
  pre-existing traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions.
  `confirm-decline.json`: **53/67 → 54/67**; **frame 253 now byte-exact**
  (was 156px); frame 254 251px→95px, frame 255 1129px→973px (both
  shrunk, not yet closed). Step brief's acceptance bar (all of 253-255
  fixed, >=56/67) **not fully met** — see Notes for why this is the right
  stop point rather than a rushed table.
- **Did:** RAM-probed (`tools/probe/ram-probe.py`, scratch spec/output not
  committed) `confirm-decline.json`'s actual decline tick-by-tick and
  **disproved** the prior worker's "decline branch fires 1 tick early"
  hypothesis: `selectingMonsState`/`mons[2].selectedId`/`monPicAnimating`
  all flip together at the exact tick this engine's decline branch already
  fires — timing was already correct. `fadeSpeciesNameActive`'s real
  1-tick-later flip (and its existing `wasClosingAtZero` compensation) is
  confirmed correct and kept; comment updated to record the disproof.
  Pixel-diffed oracle vs app at frames 253-255 (`tools/compare/out/latest`)
  and found the REAL root cause: the un-reveal's "still-shown" hold already
  freezes the 3 front-sprite mon pics via `decliningSpecies`, but the wide
  window's *background ball-grid layer* did not get the same treatment,
  reading live (already-deselected) ball state instead. Verified exactly
  via `blend8` math against `pokeball.selectedPalette`/`grayPalette` (matches
  oracle's declined-ball RGB byte-for-byte with `selectedPalette`, confirmed
  frozen/non-animating across all 3 oracle frames, switching to gray only at
  frame 256). Fixed: new `ConfirmRevealState.decliningBallAnim` snapshot
  (`core.ts`, same hold window as `decliningSpecies`), consumed by
  `factoryDraftScreen.ts`'s `drawConfirmReveal` to override the window's
  ball array for the declined slot. 1 new Tier-1 test pinning the snapshot's
  elapsed-0-through-2 lifetime. Characterized (not fixed) a SECOND, separate
  residual now isolated at frames 254/255: the YES/NO box text + cursor
  highlight (`WIN_OPTIONS`, y112-144 — outside the mon-pic window's y32-96
  clip, unrelated to the window-shrink table) actually starts a multi-tick
  erase transition one tick earlier than modeled and the highlight persists
  one tick later than modeled; full evidence + probe plan filed in ISSUES
  #12 (re-scoped, not deleted). Full trail in the ISSUES #12 entry and
  commit history.
- **Next (supervisor-set, per the original brief):** ISSUES #12's remaining
  YES/NO box erase-transition timing (evidence + a concrete RAM-probe plan
  already filed), then ISSUES #13 (stretch, untouched this session — no
  cap time left after #12), then S5's last piece: the YES-press accept path
  (exit fade → pre-battle room, `docs/prebattle-room-notes.md`). Then S6.
- **Notes:** stopped here rather than push into #12's second sub-bug because
  the erase-transition timing needs its own dense probe (sprite-invisible
  RAM read + per-tick pixel scan) to avoid guessing a wrong table under time
  pressure — a disproven hypothesis + a real, tested, committed partial fix
  is the honest stopping point per the brief's own instruction ("a clean
  disproof + re-filed entry is an acceptable outcome, a silent workaround is
  not"). All scratch RAM-probe specs/outputs and one scratch pixel-math
  script were deleted before finishing; nothing uncommitted beyond the
  intended `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/confirmDecline.test.ts` + `ISSUES.md`/`PROGRESS.md`. No new
  papercuts — `tools/probe/ram-probe.py` (committed last session) worked
  as documented, first try.

---

## 39 — ISSUES #11 fixed: species-name breathe (`Select_Task_FadeSpeciesName`) modeled exactly, RAM-pinned; `confirm-decline.json` 13/67 → 53/67

- **State:** `npm test` **323/323** (310→323, +13
  `tests/speciesNameFade.test.ts`), `npm run build` green. All 10
  pre-existing traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions, the
  breathe never fires within any of their action budgets.
  `confirm-decline.json`: **13/67 → 53/67** (one short of the step brief's
  "exactly 54/67" target - see Notes for why, and why that's the right stop
  point rather than a sign the model is wrong).
- **Did:** Built `tools/probe/ram-probe.py` (generic, reusable per-tick
  RAM-probe over a button-segment script; committed per `PAPERCUTS.md`) and
  used it to pin `fadeSpeciesNameActive`/`fadeOut`/`coeffDelay`/`coeff`/
  `faceSpeciesNameDelay` tick-by-tick (`sFactorySelectScreen+0x2A2..0x2A9`,
  cross-verified against the already-RAM-confirmed `monPicAnimating` at
  `+0x2A0`) from both the anchor (idle) and `confirm-decline.json`'s actual
  decline. Confirmed the state machine matches `Select_Task_FadeSpeciesName`
  exactly, including a subtle quirk: `FADESTATE_RUN`'s `coeff === 0` check is
  unconditional, so the pre-onset ramp bounces through six 16-tick
  `FADESTATE_DELAY` pauses (1 RUN tick each) before `coeff` ever leaves 0 -
  103 ticks of active time, matching ROADMAP.md's empirically-observed
  "~104 cumulative cursor-mode ticks" idle-stable budget exactly (was never
  explained before). Cross-checked `BlendPalette` (reusing
  `paletteFade.ts`'s already-verified `blendComponentToBlack`) against a
  direct pixel probe: reproduces ISSUES #11's oracle sample (coeff 5 → RGB
  173,0,0) exactly, plus the full table (0..6 → 255,239,222,206,189,173,156).
  Found a genuine GBA render lag (RAM `coeff` steps at tick T, the rendered
  pixel only changes at T+1) - modeled via a `renderCoeff` field, same shape
  as this codebase's other queued-write lags (ISSUES #5, `paletteFade.ts`).
  New `src/engine/speciesNameFade.ts` (state + advance + activate/
  deactivate + `speciesNameColor`), wired into `core.ts`: deactivates on
  cursor-mode A (popup open), reactivates on B-close/OTHERS/non-confirming
  RENT-DESELECT directly, and on decline with an extra RAM-required 1-tick
  delay (see Notes and ISSUES #12's update). `factoryDraftScreen.ts` now
  renders WIN_SPECIES through a per-tick-blended palette instead of the
  fixed one. 13 new Tier-1 tests (`tests/speciesNameFade.test.ts`): waveform
  boundaries (7-tick cadence, peak-6 flip, 16-tick pause), the blend table,
  the anchor-onset tick, pause/resume (not reset) semantics, and the
  core.ts wiring. Full mechanics + evidence trail in commit `2013459`.
- **Next (supervisor-set, per the original brief):** ISSUES #12/#13 chases
  (both got new evidence this session, see below - still open, out of
  scope for this step), then S5's last piece: the YES-press accept path
  (exit fade → pre-battle room, `docs/prebattle-room-notes.md`). Then S6.
- **Notes:** **why 53/67, not the brief's "exactly 54/67":** with #11's
  constant baseline gone, an **11th** ball-area frame surfaced - **273**
  (3px, `x=44/120/196,y=64`), the same y54-73 ball-region family as ISSUES
  #13's already-documented 10 frames but much smaller and previously
  invisible under the uniform ~129px species-color diff that used to cover
  256-306. Verified this can't be caused by this session's change (`git
  diff` of the speciesNameFade commit touches only `drawText`'s palette
  argument for the WIN_SPECIES window - zero lines touching `ballAnims`,
  `drawSprite`, or `drawConfirmReveal`), so it's a pre-existing #13-pattern
  gap the original characterization simply didn't enumerate, not a
  regression. Documented as new evidence in ISSUES #13 (not fixed - out of
  scope for this step) rather than chased further. Also appended new
  evidence to ISSUES #12: RAM shows `fadeSpeciesNameActive` truly flips one
  tick after this engine's OTHER decline effects, even though they're the
  same synchronous C statement in the source - likely evidence the existing
  decline branch itself fires 1 tick early (a candidate root cause for #12's
  253-255 residual), compensated here only for this module's own activation
  timing, not fixed at the source. All RAM/pixel probing beyond the
  committed `tools/probe/ram-probe.py` script itself (its one-off spec
  JSONs, a scratch pixel-cross-check script) was scratch, deleted before
  finishing. PAPERCUT: building the per-tick RAM-probe harness from scratch
  (symbol/pointer-deref plumbing, mGBA's exit-139/stdout-spew quirks) ate
  a large fraction of this session before any engine code was written -
  now moot for future sessions since `tools/probe/ram-probe.py` is
  committed and reusable (usage note in its own docstring), but worth
  flagging: ~25-30 min lost this session to (re)deriving it.

---

---
