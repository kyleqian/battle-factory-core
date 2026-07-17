# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 10 — S4 slice 1 (worker, capped): fade math + state machine landed; Info-page rendering NOT reached — S4 stays [~]

- **State:** `npm test` **138/138** (115→138), `npm run build` green.
  Existing 4 compare traces (`anchor`, `draft-cursor`, `draft-menu`,
  `draft-menu-slot6`) still all 0 diff (untouched this slice). **No new
  compare traces committed** — `summary-info-onix.json`/`-magby.json` from
  the step brief were NOT produced; the Info page has no renderer yet, so
  there was nothing to capture against. `ROADMAP.md` S4 stays `[ ]`
  (unstarted rendering-wise; foundation only).
- **Did:** Landed the hard, reusable half of S4 first: dense oracle
  probing (fresh, this session — not just reading the scout's dossier) of
  all 4 `BeginNormalPaletteFade(PALETTES_ALL, 0, ..., RGB_BLACK)` calls
  (entry fade-out/in, exit fade-out/in) fully pinned the per-frame 5-bit
  blend curve and the BG/OBJ 1-tick stagger (`objPaletteToggle`) —
  `src/engine/paletteFade.ts`, self-consistent with the dossier's
  press-tick+59/+53 settle points (20+24+15=59, 18+20+15=53 ticks exactly).
  Wired those tick counts into a summary-screen entry/exit state machine
  (`src/engine/summaryScreen.ts`: transition direction/phase/elapsed,
  selectedSlot, page id) mirroring `Select_Task_OpenSummaryScreen`'s
  3-state machine. 23 new hermetic Tier-1 tests, all pinned against literal
  oracle pixel values (no oracle/pixels at test time). Also confirmed the
  brief's requested number: **first mon idle-animation churn frame is
  press-tick+65** (slot 1/ONIX; settled Info page is stable from +59
  through +64, every frame differs from +65 onward through +151 with no
  further stable window found) — MAGBY (slot 2) not independently probed.
  Addendum written to `docs/summary-screen-notes.md` §6 with full detail.
  Neither module is wired into `core.ts`/render yet.
- **Next:** The Info page renderer itself, blocked on missing extraction
  (found while scoping, not yet done): `species-stats.json` has no
  type/dex-number fields; no ability name/description text table; no
  gender-ratio table. Next slice: (1) extract those (types + dex numbers
  likely cheap additions to `extract-species-header.ts`'s source files;
  ability names/descriptions from `gAbilityNames`/
  `gAbilityDescriptionPointers` need a small new extractor); (2) build the
  Info-page renderer (BG3 tilemap from already-extracted
  `summary-bg.json`, the window/text fields per the dossier's §2/§3, type
  icons from `summary-type-icons.json`) for a **static** frame (mon
  idle-anim can stay a documented remainder, captures must stay ≤
  press-tick+64 per the churn frame above); (3) wire
  `summaryScreen.ts`+`paletteFade.ts` into `core.ts`'s tick/render,
  blending the draft-screen framebuffer during entry-out/exit-in and the
  new Info-page framebuffer during entry-in/exit-out; (4) only then are
  `summary-info-onix.json`/`-magby.json` (dense through the fades, ≤4-frame
  elsewhere) achievable — build and commit those to actually close S4
  slice 1's acceptance criteria, which this session did not reach.
- **Notes:** This slice hit its 50-minute cap on research + the (large,
  now-done-once) fade-curve derivation before rendering could start —
  flagging per `AGENTS.md`'s "stop at a green commit, report exact
  frames/pixels" guidance rather than shipping a rushed/unverified
  renderer. The fade math is the part most likely to have been gotten
  subtly wrong by guessing (5-bit space, BG/OBJ stagger, per-transition
  dead-frame delays all differ from naive assumptions) — glad it's now
  oracle-pinned and covered, since every future summary-screen fade (S4
  paging is a redraw not a fade, but S5's draft-exit fade and S6's battle
  transition likely reuse this exact mechanism).

---

## 9 — Supervisor: S4 scout merged; S2 verified complete

- **State:** Scout branch `worker/wt-20260717-032349` merged: summary-screen
  art extracted (`src/assets/gen/summary-*.json`) + implementation dossier
  `docs/summary-screen-notes.md` (entry `SUMMARY_MODE_LOCK_MOVES`, all 4
  pages + UP/DOWN mon-switching reachable, OT suppressed for rentals,
  ranked frame-exactness risks). Merged tree: `npm test` **115/115**,
  build green, all four compare traces 0 diff. Worktree cleaned up.
- **Did:** Verified the #3 fix (66/66) and the scout deliverables myself;
  merged; re-ran the full battery on the merged tree.
- **Next:** S4 implementation slice 1 — entry fade → static Info page →
  B-exit restore, dense-capture traces 0-diff (dossier §1/§2 is the map;
  keep traces clear of the looping mon idle anim per dossier risk #1).
- **Notes:** Dossier flags the return path re-entering the draft via
  `CB2_InitSelectScreen` (fresh init, `fromSummaryScreen=TRUE`,
  `gLastViewedMonIndex` can move the cursor) — treat exit traces as
  first-class acceptance, not an afterthought.

---

## 8 — ISSUES #3 closed: slot6 every-frame trace 58/66 → 66/66; S2 COMPLETE

- **State:** `npm test` **115/115**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` 38/38,
  `draft-menu-slot6.json` **66/66** — all 0 diff, no regressions. `ISSUES.md`
  #3 deleted (fixed). S2 ticked `[x]` in `ROADMAP.md`.
- **Did:** Root-caused and fixed the 3 remaining redraw-scheduling clusters
  via single-purpose dense oracle probes (LEFT-only, DOWN-only, and B-only
  from a settled state), all traced to `CB2_SelectScreen`'s
  `AnimateSprites`/`BuildOamBuffer`/`RunTextPrinters`/`UpdatePaletteFade`/
  `RunTasks` ordering (RunTasks runs last, so any OAM change it makes isn't
  picked up until the *next* frame's `BuildOamBuffer`, while window/text
  copies land same-tick): (1) LEFT/RIGHT cursor moves reveal category text,
  species text, then the arrow sprite on 3 successive ticks, not atomically
  — new `CursorRedrawState` in `factoryDraftScreen.ts`; (2) UP/DOWN menu nav
  keeps the highlight bar on the old row for 2 full ticks before jumping to
  the new one (no piecemeal reveal, single OAM move) — new
  `MenuHighlightRedrawState`; (3) `monPic.ts`'s close tables were missing
  the same front-sprite/highlight-bar 1-tick OAM lag the open tables already
  modeled, and (surprise, oracle-verified against both draft-menu.json's own
  first close and draft-menu-slot6.json's) the close's window-shrink shape
  does NOT mirror hasActed-at-close or the open variant letter — only an
  open that was variant C gets the skip+duplicate shape; A and B both close
  clean. Added Tier-1 tests for all three (monPic.test.ts 15→20,
  draftScreen.test.ts 12→16).
- **Next:** S4 — summary screen parity (draft's SUMMARY view, page
  navigation, return to draft). See `ROADMAP.md` S4 acceptance criteria.
- **Notes:** The "mirror the open variant" hypothesis for the close table
  seemed elegant but was empirically wrong — always re-verify against a
  fresh dense probe of the *specific* trace in question rather than
  generalizing from one data point, even when the generalization is
  structurally tempting.

---
