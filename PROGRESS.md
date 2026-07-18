# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
