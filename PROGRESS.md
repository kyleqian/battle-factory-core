# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
