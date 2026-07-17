# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 12 — S4 slice 1 (worker, capped): Info-page extraction landed; renderer/traces still NOT reached — S4 stays [~]

- **State:** `npm test` **146/146** (138→146, +8 new), `npm run build`
  green. Existing traces (`anchor`, `draft-cursor`, `draft-menu`,
  `draft-menu-slot6`) untouched, still 0 diff (not re-run this session but
  no shared code was touched). **`summary-info-onix.json`/`-magby.json`
  were NOT produced** — no Info-page renderer exists yet, so there is
  nothing to capture against. `ROADMAP.md` S4 stays `[~]`.
- **Did:** Closed the slice-1 blocker the brief asked for first:
  `tools/extract/extract-summary-info.ts` extracts, for the 6 anchor
  species, National Dex number (RAM-probed `FLAG_SYS_NATIONAL_DEX` at the
  anchor to confirm National — not Hoenn — numbering applies, bit read
  back `1`/TRUE), types, and `genderRatio` from `species_info.h`, plus
  ability name+description text for every ability the pool uses, into
  `src/data/gen/summary-info.json`. Added `src/engine/monGender.ts`
  (pure port of `GetGenderFromSpeciesAndPersonality`). Both pinned in
  `tests/summaryInfo.test.ts` (8 new tests) against the anchor's real
  personality values (e.g. confirms ONIX shows male, MAGBY female).
  Then spent the remainder of the session's budget researching the
  renderer itself (window pixel geometry, text-color tables, sprite
  positions/priorities/anchoring, BG-layer reasoning, a nature-memo
  two-tone-color-code gap in `font.ts`, a few unresolved assumptions) and
  wrote it all up as `docs/summary-screen-notes.md` §7 rather than ship
  unverified rendering code with no oracle pixels behind it — building the
  actual `summaryInfoPage.ts` renderer, wiring `summaryScreen.ts`+
  `paletteFade.ts` into `core.ts` (confirmed **zero existing call sites**
  for either), and capturing/debugging the two dense traces against the
  oracle is real multi-hour work that didn't fit in what was left of this
  session's cap after the research above.
- **Next:** Follow `docs/summary-screen-notes.md` §7 directly — it's a
  resolved implementation spec, not a scouting task: (1) build
  `src/engine/summaryInfoPage.ts` (BG3 tilemap via `drawTileBg` + all
  text windows via `drawText` + type icon/markings/ball/mon-front sprites
  via `drawSprite`); (2) resolve the 4 flagged open items before trusting
  pixels — nature-memo two-tone color codes (§7's caveat), mon-sprite
  `hFlip` table membership for the 6 species, rental-mon caught-ball item
  (assumed but unverified `ITEM_POKE_BALL`), and markings anim-frame-0
  appearance; (3) wire `summaryScreen.ts`+`paletteFade.ts` into
  `core.ts`'s `EngineState`/`tick()`/`render()` per §7's exact branch
  points; (4) only then capture `summary-info-onix.json`/`-magby.json`
  (dense through both fades + the settled +59..+64 window; probe MAGBY's
  own stable window independently, don't assume ONIX's) and iterate to 0
  diff.
- **Notes:** This is the same "stop rather than ship a guessed renderer"
  call the prior slice made for the fade math — the difference this time
  is the blocker (extraction) is actually closed, and the open unknowns
  left for next time are few, named, and cheap to resolve (each is one
  more source grep), not a wide-open scouting problem. `PAPERCUT`: none
  new this session — the RAM-inspection recipe for a single save flag
  (national dex) was fast once `inspect-anchor.py`'s pattern was reused.

---

## 11 — Supervisor: S5 scout merged (rent-flow dossier)

- **State:** `docs/rent-flow-notes.md` merged; main tree `npm test`
  **138/138**, build green, all traces 0 diff. ROADMAP updated: S6 scope
  note + rented-ball RNG domain note (committed).
- **Did:** Verified + merged the S5 scout. Corrections vs prior
  assumptions: RENT is instant (no per-pick confirm; only yes/no is the
  final "Are these three POKeMON OK?"); OTHERS = cancel; DESELECT is
  RENT's relabel on a rented ball. Load-bearing finds: battle 1's opponent
  generated BEFORE frame 0 (anchor constant); rented ball sprites roll
  `Random()%5` per ~32f cooldown per ball (must be modeled from S5 on).
  S5→S6 boundary pinned: the "Right this way, please!" hold.
- **Next:** S4 slice-1 finisher (see entry 10's blocker list): extract
  Info-page data (type/dex/ability text/gender), render the static Info
  page, commit summary-info traces captured inside the stable +59..+64
  window, 0 diff. Then S5 implementation.
- **Notes:** Ledger hygiene: entry 8 was pre-archived by a worker while
  still live here; dropped it from the ledger without re-appending.

---

---
