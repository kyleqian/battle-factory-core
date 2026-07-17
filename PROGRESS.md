# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 7 — ISSUES #3 partial: slot6 every-frame trace 40/66 → 58/66

- **State:** `npm test` **110/110**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` 38/38 —
  still all 0 diff (no regressions). `draft-menu-slot6.json` (every-frame
  0-65) **58/66** (was 40/66). S2 stays `[~]` — 8 frames still differ, all
  redraw-scheduling transients (see `ISSUES.md` #3, trimmed to just these).
- **Did:** Root-caused and fixed the two clusters inside the mon-pic
  sub-state machine (`src/engine/monPic.ts`): (1) the ball-open flash bar's
  flat-vs-blended color was wrongly tied to the hasActed timing variant —
  it actually tracks a separate, session-persistent "has BLDCNT ever been
  configured" flag, now `MonPicState.blended`; (2) that same
  first-ever-open-after-a-cursor-move case needs its own window-growth
  timing table ("variant C"), pinned from dense oracle probing of
  draft-menu-slot6.json. Added 4 new hermetic Tier-1 tests (15→19) pinning
  variant C and the blend/variant decoupling.
- **Next:** Fix the remaining 3 clusters (all `Select_Task_Handle*`'s
  redraw scheduling, not mon-pic): f1-f3 cursor-move header/arrow redraw,
  f37-f38 menu-highlight redraw (likely same mechanism as f1-f3), f44/47-48
  close-phase transients. `ISSUES.md` #3 has a dedicated probing plan for
  each (isolate with single-purpose dense traces before fixing against the
  combined slot6 trace). Then tick S2 `[x]`, then S4.
- **Notes:** The end-states are already exact — only 8/66 frames differ,
  all transient (settle within 2-4 ticks); this is scheduling/timing, not
  missing mechanisms.

---

## 6 — Ball-open reveal landed (38/38); every-frame capture exposes transients

- **State:** `npm test` **106/106**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` **38/38**
  — all 0 diff. NEW `draft-menu-slot6.json` (every-frame captures 0-65)
  → **40/66**: the ≤4-frame-spaced traces skip transient frames that are
  not yet exact. S2 stays `[~]`; remainder is `ISSUES.md` #3 (clusters +
  diff forensics there). ISSUES #2 deleted (fixed: reveal + blend + 6 front
  sprites, monPic sub-state Tier-1-pinned).
- **Did:** Worker landed the mon-pic reveal (WIN0 growth, 5-bit-space
  blend, front-sprite extraction for all 6 species) + 15 hermetic tests;
  hit its 50-min cap while building the slot-6 trace. Supervisor verified
  all compares/tests, ran the unfinished trace, inspected diff PNGs,
  filed #3 with per-cluster diagnosis, committed the trace.
- **Next:** Fix `ISSUES.md` #3 → `draft-menu-slot6.json` 66/66, then tick
  S2 `[x]`. Then S4 (summary screen).
- **Notes:** Transient mechanisms are all in battle_factory_screen.c
  (affine open anim, redraw scheduling, close-phase sprite visibility).

---
