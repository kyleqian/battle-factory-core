# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 38 — S5 decline path landed: YES/NO cursor UP/DOWN + B/A-on-NO decline + 20-tick un-reveal, oracle-pinned; `confirm-decline.json` committed at 13/67 (54 frames individually attributed, none new/unexplained)

- **State:** `npm test` **310/310** (297→310, +13), `npm run build` green. All
  10 pre-existing traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions.
  `confirm-decline.json` **committed** at 13/67 frames byte-exact; every
  non-matching frame individually attributed in the commit message (none
  newly introduced by unrelated code).
- **Did:** Implemented `docs/confirm-flow-notes.md` §2/§3: YES/NO cursor
  UP/DOWN (repeat-gated toggle) and decline (B anywhere or A-on-NO, modeled
  once): same-tick `mons[2].selectedId`->0, `selectingMonsState` 4->3,
  message revert, YES/NO erased; new `confirmReveal.ts` "closing" phase for
  the 20-tick un-reveal, pixel-pinned tick-by-tick (NOT a mirror of the
  open direction; reuses `monPic.ts` `CLOSE_TABLE_B` values; new
  `decliningSpecies` snapshot field). `core.ts` input gate now keys off
  `confirmReveal` presence; re-pick works the tick it clears. Ball 3 leaves
  the rented set same-tick. 15 new Tier-1 tests
  (`tests/confirmDecline.test.ts`). Full mechanics in commit `9a8e96b`.
  **Trace:** `confirm-decline.json` (dense captures 240-306: DOWN dwell,
  decline, un-reveal, resettle, re-pick A) at 13/67 — frames 240-252 (the
  whole cursor-move + decline + early un-reveal) byte-exact; the 54 diff
  frames split into three groups, now filed as **ISSUES #11** (species-name
  breathe, frames 256-306 baseline — decline re-activates it immediately,
  so it is no longer dodgeable and must be modeled), **#12** (un-reveal
  first-ticks residual, 253-255), **#13** (periodic ball-area bumps on 10
  frames, stall-analogue suspect).
- **Next (supervisor-set):** ISSUES #11 (breathe model — required before
  `confirm-decline.json` can meet the trace bar), then #12/#13 chases, then
  S5's last piece: the YES-press accept path (exit fade → pre-battle room,
  `docs/prebattle-room-notes.md`). Then S6 off its banked dossier.
- **Notes:** all RAM/pixel probing (scratch `tools/compare/scratch/*.ts` +
  `bin/oracle`-backed dense traces, direct RGB sampling via Node/pngjs) was
  scratch, deleted before finishing - nothing uncommitted left beyond the
  intended `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/confirmDecline.test.ts` + `tests/confirmReveal.test.ts` (renamed
  field) + `tools/compare/traces/confirm-decline.json` + docs changes.
  PAPERCUT: pixel-archaeology on a brand-new state transition (no RAM-probe
  harness available this session, oracle screenshots only) ate a large
  fraction of the session's budget - a reusable RAM-probe script (the
  dossier mentions one built ad hoc last session at
  `sFactorySelectScreen+0x2A0` for `monPicAnimating`) would have cut this
  significantly; worth banking as a real tool next time this kind of
  RAM-verified-dossier-to-pixel-exact-implementation gap comes up.

---

---
