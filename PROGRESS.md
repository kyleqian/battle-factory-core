# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 15 — Supervisor wind-down: session end 2026-07-17 ~05:50

- **State (verified this minute):** `npm test` **159/159**, `npm run build`
  green, all five compare traces 0 diff (`anchor` 1/1, `draft-cursor`
  13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66 every-frame,
  `summary-info-onix` **122/122** every-frame incl. full B-exit).
  `ISSUES.md` empty. Working tree clean. ROADMAP: **S1 [x] S2 [x] S3 [x]
  S4 [~] S5-S9 [ ]** — S4's remainder: MAGBY Info-page trace (probe its
  own stable window), the 3 other pages + scroll-wipe, UP/DOWN
  mon-switching, move-select, the mon idle animation.
- **Session summary (supervised, ~01:00-05:50):** 9 worker steps + 1 merge
  lane. Landed: staged roadmap (iteration 0); S1 pixel-exact anchor +
  compare loop + extraction pipeline; S2 draft interactions frame-exact
  incl. every-frame transients; S3 RNG core + 882 rentals extracted +
  anchor RAM dump (six mons pinned to recomputed stats); S4 fade math,
  Info-page data + renderer, entry+exit fades pixel-exact; scout dossiers
  for S4 (summary-screen-notes.md) and S5 (rent-flow-notes.md). Key
  domain finds in ROADMAP notes: anchor RNG seed, ball-sprite RNG
  consumption, battle-1 opponent is an anchor constant, statics-via-nm
  recipe, fade elapsed+1 + black-hold quirks.
- **Next:** S4 remainder (start with summary-info-magby.json), then S5
  implementation off docs/rent-flow-notes.md. All prerequisites committed.
- **Notes:** Every worker ended at a green commit; no usage-limit events;
  two PAPERCUTS entries total (see file).

---

## 14 — S4 slice 1 (worker, capped): B-exit fade fixed, ISSUES #4 closed; summary-info-onix.json now 0 diff through settle — S4 stays [~] (MAGBY trace still open)

- **State:** `npm test` **159/159** (152→159, +7 new), `npm run build`
  green. `anchor`/`draft-cursor`/`draft-menu`/`draft-menu-slot6` re-verified
  0 diff. `tools/compare/traces/summary-info-onix.json` extended from 64
  captures (entry+settle only) to **122 dense captures, every frame,
  covering SUMMARY-press through the full B-exit (fade-out/black-hold/
  fade-in) back to the resettled draft screen** → **0 diff, all 122
  frames**. `ISSUES.md` #4 deleted (fixed, not worked around).
- **Did:** Per the brief's method: ran a fresh, isolated dense oracle probe
  of the B-exit only (not layered on the entry trace). First probe attempt
  (B pressed at the settled Info page's own press-tick+62, well inside the
  documented pixel-stable window) found B silently did nothing for ~50
  frames — a real gotcha, now in `ROADMAP.md`'s Domain notes: input-ready
  lags visual-stable by a few ticks here (`Task_HandleInput`'s
  `!gPaletteFade.active` guard isn't true yet even though the screen looks
  settled); B first reliably registers at absolute press-tick+63 (a
  parameter sweep confirmed +62 fails, +63 works). With a probe that
  actually triggered the fade, derived the true curve pixel-for-pixel
  (component 90 and 255 samples, matching `paletteFade.test.ts`'s existing
  oracle-pinned values exactly) — the exit fade-out/fade-in curves and
  their `elapsed+1` offset were **already correct** in `core.ts`'s
  `render()`; the actual bug was the black-hold phase: the entry direction
  had a special "hold's own last tick already shows fade-in's first step"
  branch, but the exit direction fell through to always-pure-black instead
  of getting the same treatment — the exit's black hold has the identical
  quirk (oracle-confirmed: the true last hold tick, not pure black, matches
  `bgFadeY(0, FADE_IN)`/`objFadeY(0, FADE_IN)` composited on the *draft*
  screen, symmetric with the entry composing onto the *Info* page).
  Rewrote `render()`'s black-hold branch to apply the peek uniformly by
  direction instead of hardcoding it entry-only. New
  `tests/summaryScreenRender.test.ts` hermetically pins the render()
  *dispatch* itself (which curve/offset/black-hold-quirk applies to which
  phase × direction) — the layer this bug actually lived in, distinct from
  `paletteFade.test.ts`'s already-correct low-level curve math.
- **Next:** `summary-info-magby.json` (stretch, not reached this session —
  probe MAGBY's own stable window first, don't assume ONIX's press-tick+59
  transfers) is the last piece of S4 slice 1's brief before S4's "≥2
  different slots" acceptance criterion is met. After that: S4's remaining
  scope (page navigation RIGHT/LEFT, mon-switching UP/DOWN, move-select) or
  move on to S5 per supervisor call.
- **Notes:** The debugging path here is a good template for future
  fade/dispatch bugs on this screen: (1) isolated dense probe of *only*
  the interaction in question, (2) sanity-check the probe actually
  triggered the intended state transition (don't assume a "stable-looking"
  press registered — verify pixels actually start changing where expected
  before trusting the rest of the derivation), (3) compare the app's
  actual rendered pixels against the oracle's directly (not against a
  hand-derived formula) to localize which specific composited region
  disagrees, since that pinpoints the dispatch bug far faster than
  re-deriving curve math that was already right.

---

## 13 — S4 slice 1 (worker, capped): Info-page renderer built and wired; entry+settle trace 0 diff; B-exit gap found — S4 stays [~]

- **State:** `npm test` **152/152** (146→152, +6 new), `npm run build`
  green. `anchor`/`draft-cursor`/`draft-menu`/`draft-menu-slot6` all
  re-verified 0 diff this session (untouched code paths, but re-ran given
  how much of `src/engine/` this slice touched). **New:**
  `tools/compare/traces/summary-info-onix.json` (dense, every frame from
  the SUMMARY press through the settled Info page's stable window, 64
  captures) → **0 diff**. `ROADMAP.md` still `[~]` — see gap below.
- **Did:** Built `src/engine/summaryInfoPage.ts` (the static Info-page
  compositor: BG3 tilemap, type/markings/ball/mon sprites, all text
  windows, per `docs/summary-screen-notes.md` §7) and wired
  `summaryScreen.ts`+`paletteFade.ts` into `core.ts` (`EngineState` gains
  `summaryScreen`; `tick()` routes A-on-SUMMARY/B-on-Info-page; `render()`
  dispatches flat/faded draft or Info-page rendering by transition phase).
  Then debugged the render pixel-exact against dense oracle captures
  (iterating `npm run compare`'s diff PNGs, per the brief) until the ONIX
  settled Info page and the full entry-fade sequence hit 0 diff. Real bugs
  found and fixed along the way (all still applicable, see commit
  `ec234e9` for the settled-frame set and `5729950` for the fade-timing
  set): `sTextColors` colorId0/1 were transposed (hid/blackened most text);
  the A-button icon is colored by its **window's** palette, not its source
  PNG's; `PositionStatusSlidingWindow`'s on-load reset lands on a flat
  fill, not a redraw of `page_info.bin`'s stale default; `{NO}`/`{LV}` are
  single-glyph control codes with ligature bitmaps already sitting in
  `font-normal.json` at raw codes 264/52 (bypass the charmap, which only
  covers quoted single-char entries); and — the big one — `render()`'s fade
  curves need `bgFadeY(t.elapsed + 1, timing)`/`objFadeY(t.elapsed + 1,
  timing)`, not `t.elapsed` directly (`BeginNormalPaletteFade`'s first
  blend step lands within its own trigger tick), plus the black-hold
  phase's own **last** tick already shows the fade-in's first step (BG
  only — OBJ is a further tick behind even there), which needed its own
  branch instead of always rendering solid black. Extraction: new
  `src/engine/fadeRender.ts` (fading variants of the `drawTileBg`/
  `drawSprite`/`drawText` primitives, `y<=0` reproduces the originals
  exactly — used for both the summary Info page and a new
  `renderFactoryDraftScreenFaded`), `drawSprite` gained an `hFlip` param
  (all 6 anchor species render hFlip'd on this screen, confirmed from
  `species_info.h`'s `noFlip` field — opposite of the draft-screen pic),
  and `src/assets/gen/summary-ball.json` (the summary screen's caught-ball
  icon is a **different** asset than the draft screen's rental-ball
  sprite, `graphics/balls/poke.png` not `factory_screen/pokeball.png` —
  confirmed every rental defaults to `ITEM_POKE_BALL` via
  `pokemon.c:2261`).
- **Next:** **The B-exit (Info page → draft screen) path is unresolved.**
  The state machine's phase/tick bookkeeping looks structurally right
  (settles at the expected tick, `onInfoPage` flips back correctly), but
  the *rendered pixels* diverge severely starting ~2 ticks into the exit
  fade-out and get progressively more wrong (SSIM trending toward 0, not a
  small residual) — this does **not** fit the same "+1" pattern that fixed
  entry, so applying it blindly would likely be wrong. Exact repro: trace
  `2×A, wait 40, 2×A, wait 60, 2×B, wait N`, dense-capture frames 104-165;
  104-106 match, first divergence at 107 (2 ticks after the B press
  registers). Needs a **fresh dense oracle probe of the exit fade
  specifically** (isolated, not layered on the entry trace) before
  guessing further — do not reuse the entry "+1" fix without re-deriving
  it from oracle pixels for this direction. Once that's resolved: extend
  `summary-info-onix.json` to cover the B-exit back to the settled draft
  screen (per the original brief), then `summary-info-magby.json` (stretch
  — probe MAGBY's own stable window first, don't assume ONIX's +59..+64
  transfers).
- **Notes:** `docs/summary-screen-notes.md` §7's spec was excellent — the
  BG-layering/composition-order/window-geometry reasoning all held up
  against oracle pixels with zero corrections needed. Every bug found this
  session was in territory the spec explicitly flagged as unresolved (text
  colors, ball asset, hFlip) or genuinely out of scope for a static-page
  spec (the fade-timing "+1", the black-hold boundary tick, the
  `{NO}`/`{LV}` control codes) — a good sign the extraction-then-implement
  split this run's been using is working. `PAPERCUT`: the `bin/oracle
  run`-vs-`npm run compare` frame-numbering question (are "press-tick N"
  labels from a direct oracle probe always directly comparable to
  `appTrace.ts`'s frame counter?) came up twice this session and cost real
  time both times — worth a `bin/oracle info`/`ROADMAP.md` Domain-notes
  clarification for the next worker who dense-probes a fresh interaction.

---
