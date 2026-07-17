# Progress ledger — archive

Older entries moved out of `PROGRESS.md` to keep the live ledger lean. Newest
archived entry on top. Git history has the full detail regardless.

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

## 1 — Iteration 0: staged plan authored (supervisor)

- **State:** Baseline green (`npm test` 3/3, `npm run build` OK, oracle
  answering). `ROADMAP.md` now carries the staged plan S1–S9; no engine code
  yet. `tools/compare/traces/anchor.json` committed.
- **Did:** Verified skeleton baseline; probed the oracle (anchor = Lv-50
  single draft screen, ONIX slot 1; RIGHT/A semantics + timings observed);
  pinned the color expansion `(c<<3)|(c>>2)` against all 22 anchor colors;
  verified the dev-time RAM-inspection recipe (replay matches canonical sha
  byte-exactly; anchor `gRngValue = 0xd2ddeec8`); confirmed the per-frame
  VBlank `Random()` rule (`main.c:366`); authored ROADMAP.md stages S1–S9
  with command-backed acceptance criteria.
- **Next:** S1 via worker briefs — extraction pipeline + engine skeleton +
  `appTrace.ts` wiring, driving `npm run compare -- tools/compare/traces/
  anchor.json` to 0 diff.
- **Notes:** RAM-inspection quirks (mGBA log spam on stdout, benign exit-139
  teardown segfault) are documented in ROADMAP.md Domain notes.

---

## 0 — Run initialized

- **State:** Fresh run from the harness template. `npm test` and
  `npm run build` green on the skeleton; engine not started.
- **Did:** Template stamped by `initialize-run.sh` (see `.run.json` for the
  pinned reference revision, ROM SHA-1, and oracle bootstrap version).
- **Next:** Supervisor iteration 0 — bootstrap the plan: probe the oracle,
  survey the reference, replace `ROADMAP.md`'s PLAN PENDING section with
  staged, command-backed acceptance criteria (`SUPERVISOR.md` § "Fresh
  run"), and commit it before any implementation brief.
- **Notes:** The oracle contract and canonical-state description are in
  `bin/oracle info`. Read `AGENTS.md` before anything else.
## 2 — S1 worker: extraction + engine skeleton, anchor frame 94% pixel-exact

- **State:** `npm test` 22/22 green, `npm run build` green, `npm run dev`
  serves without errors. `npm run compare -- tools/compare/traces/
  anchor.json` → **DIFF 2161/38400px (5.63%), ssimMean=0.8171** — NOT yet
  0 diff. All 2161 diff pixels are inside the four text windows (title/
  category/species/message); BG1 chrome tilemap and the OBJ ball+arrow
  sprites are pixel-exact (verified 0 diff outside text regions).
- **Did:** Built `tools/extract/` (indexed-PNG decoder preserving raw
  palette indices — pngjs alone loses them on duplicate colors; JASC .pal
  parser; tile/tilemap decoders; charmap.txt parser) writing committed
  `src/assets/gen/*.json` + `src/data/gen/*.json` from
  `reference/pokeemerald`. Pinned the GBA color round-trip precisely:
  reference art's 8-bit RGB must go 8-bit → 5-bit (`round(v*31/255)`) → the
  oracle's real expansion (`(c<<3)|(c>>2)`), not used as-is (verified
  against real anchor-screenshot colors, e.g. interface.pal's `164,115,246`
  → oracle's actual `165,115,247`). Discovered `sPokeball_Gfx` (factory_
  screen/pokeball.png) is dead code — the real ball art is `graphics/
  starter_choose/pokeball_selection.png` (`gPokeballSelection_Gfx`); menu.png
  supplies BG1's own palette directly (not interface.pal, which is OBJ-only
  for the arrow/highlights). Built `src/engine/` (pure `tick`/`render`,
  240x160 RGBA, no DOM/timers/Math.random): `bg.ts`/`sprites.ts` tile
  compositors, `font.ts` text layout, `factoryDraftScreen.ts` assembling the
  anchor from `sSelect_WindowTemplates` + `CreateSprite` coordinates
  transcribed from `battle_factory_screen.c` (not eyeballed). Wired
  `main.ts` and `tools/compare/appTrace.ts` to the same core. Added 19 new
  Tier-1 tests (tile/tilemap decode, color round-trip, text measurement, an
  anchor-render regression pinning the current output).
- **Next:** Close the remaining 5.63% — see `ISSUES.md` #1: the font
  renderer needs `sFontHalfRowOffsets`/`GenerateFontHalfRowLookupTable`
  (`reference/pokeemerald/src/text.c:41-51,363-420,526-560`) replicated
  exactly; our current `drawText` treats source glyph pixels as directly
  selecting bg/fg/shadow, but the real renderer blends pairs of source
  nibbles through that lookup table first. Fix either in the extractor
  (bake correct bitmaps into `font-normal.json`) or in `src/engine/font.ts`
  at render time, then re-run `npm run compare` to confirm 0 diff and update
  the pinned hash in `tests/anchorRender.test.ts`.
- **Notes:** `npm run dev` checked via `curl` against the Vite dev server
  (200 on `/` and `/src/main.ts`), not a real browser — no headless browser
  was available in this session; worth a real visual check next session.
## 4 — S2 worker: cursor sweep 0-diff; menu state machine done, ball-open art not yet — S2 PARTIAL

- **State:** `npm test` 39/39 green, `npm run build` green.
  `tools/compare/traces/anchor.json` still **1/1, 0 diff** (no regression).
  `tools/compare/traces/draft-cursor.json` (new, committed) → **13/13
  frames matched, 0 diff** — full RIGHT sweep across all 6 slots with wrap,
  full LEFT sweep back with wrap. `tools/compare/traces/draft-menu.json`
  (new, committed) → **10/38 matched** — every frame outside the ball-open
  "mon pic" window is exact; diff is confined to a ~64x64px region (see
  `ISSUES.md` #2 for the full diagnosis). S2 is therefore only partially
  done; see `ROADMAP.md`'s `[~]` status line for the precise breakdown.
- **Did:** Ported `reference/pokeemerald/src/main.c`'s `ReadKeys()` JOY_NEW/
  JOY_REPEAT model exactly (`src/engine/keyRepeat.ts`: one shared repeat
  counter, 40-tick start delay, 5-tick continue delay, reset on any change
  to the held combination) - pinned against a hand-derived tick sequence in
  `tests/keyRepeat.test.ts` (fires at ticks 1, 41, 46, 51...). Wired the
  draft screen's cursor mode (`LEFT`/`RIGHT` with wrap,
  `Select_UpdateBallCursorPosition`) and menu mode (`A` opens SUMMARY/RENT/
  OTHERS with `menuCursorPos=0`, `UP`/`DOWN` navigate with wrap, `B` OR `A`
  on OTHERS closes back to cursor mode - `Select_OptionOthers` is a no-op
  cancel, confirmed from source) into `src/engine/core.ts`'s `tick()`, all
  pinned by 12 new hermetic tests in `tests/draftScreen.test.ts`. Extracted
  the 6 anchor rental-pool species' header text (species name + Pokedex
  category) via a new `tools/extract/extract-species-header.ts` reading
  `species_names.h` + `pokedex_entries.h`, replacing S1's placeholder empty
  slots 2-6 (`src/data/gen/draft-pool-header.json`). Extracted the menu
  highlight sprite pair (`menu_highlight_left/right.png`) and render the
  SUMMARY/RENT/OTHERS popup text + highlight bar when the menu is open.
  Reverse-engineered (and probed against the oracle) the exact settle
  timing for cursor moves, key-repeat, menu nav, and menu open/close - see
  `ROADMAP.md` Domain notes; also discovered idle screens only stay
  pixel-stable for ~104 frames before a previously-unknown species-name
  color pulse (`Select_Task_FadeSpeciesName`) kicks in, and kept both new
  traces safely under that.
- **Next:** The ball-open reveal (`Task_OpenMonPic`/`Task_CloseMonPic`'s
  WIN0 growth + `BG3`/`BG1`/`OBJ` alpha blend, plus the front-sprite
  extraction for ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/QUILAVA) is the one
  remaining piece for S2 - `ISSUES.md` #2 has the full mechanism, register
  values, and timing already reverse-engineered; re-run
  `draft-menu.json` (already committed with dense captures over both
  transitions, on 2 different slots) to check progress once implemented.
  After that: S3 is proceeding in a parallel worktree (rental data/RNG) -
  don't touch `src/engine/rng.ts` or `src/data/gen/rental*`/`anchor-state.json`.
- **Notes:** PAPERCUT: none this session - the oracle's dense-capture probing
  loop (`bin/oracle run <trace> -o <dir>` + comparing manifest sha256s) was
  fast and effective for reverse-engineering exact frame timing; no friction.

---

## 3 — S1 worker: font glyph fix closes the anchor compare — S1 COMPLETE

- **State:** S1 acceptance fully met. `npm run compare -- tools/compare/
  traces/anchor.json` → **1/1 frames matched, 0 diff, ssimMean=1.0000, exit
  0** (was 2161/38400px, 5.63%). `npm test` 22/22 green, `npm run build`
  green, `npm run dev` serves (curl 200 on `/` and `/src/main.ts`; still no
  real-browser check — no headless browser available in this session
  either).
- **Did:** Fixed `ISSUES.md` #1 (now deleted). Two distinct bugs in
  `src/engine/font.ts`, both pinned against `reference/pokeemerald/src/
  text.c`: (1) the raw-glyph-pixel → color role mapping was wrong — traced
  `sFontHalfRowOffsets`/`GenerateFontHalfRowLookupTable` (text.c:41-51,
  363-511) by hand and confirmed it is **not** a blend of adjacent source
  pixels (contra the ISSUES.md lead) but a per-pixel remap table (raw 0-3 →
  role bg/fg/shadow, raw 3 folds back onto role 0/bg) vectorized 4-at-a-time
  for GBA speed; also ported `GLYPH_COPY`'s "skip writing when the resolved
  color index is literal 0" transparency rule (text.c:585), replacing the
  old "raw===0 is always transparent" logic. Verified empirically against
  oracle pixel colors (text.pal index1=black=bgColor, index2=white=fgColor
  matches the observed title-text look) before committing. (2)
  `DecompressGlyph_Normal` (text.c:1883) hardcodes `gCurGlyph.height = 15`
  for Latin glyphs regardless of the 16px cell size — our render loop used
  the full `cellSize` and leaked stray bgColor pixels into the row directly
  below the title text. Added `glyphHeight` to `font-normal.json`/`FontData`
  and capped the row loop to it; re-ran the extractor (only `font-normal.
  json` changed). Updated the pinned hash in `tests/anchorRender.test.ts`
  and the `FontData` test fixture in `tests/font.test.ts`. Ticked S1 `[x]`
  in `ROADMAP.md`.
- **Next:** S2 — draft-screen interaction parity (cursor movement, header
  text, A → ball-open + SUMMARY/RENT/OTHERS menu, B/close, message-box
  updates). See `ROADMAP.md` S2 acceptance criteria. S3 (rental data/RNG)
  is running in a parallel worktree per the supervisor's scoping — don't
  touch `src/engine/rng.ts` or `src/data/gen/rental*`.
- **Notes:** No headless browser tooling (playwright/puppeteer) is
  installed in this run; `npm run dev` has only ever been curl-smoke-tested,
  not visually verified. Worth adding if a future stage needs real DOM/
  canvas verification.

---

## 5 — Supervisor: S3 merged from worktree lane — S3 COMPLETE

- **State:** Merged `worker/wt-20260717-012856` (S3: RNG core, rental data,
  anchor RAM dump) into master; on the merged tree `npm test` **91/91**
  green, `npm run build` green, `anchor.json` 1/1 and `draft-cursor.json`
  13/13 still 0 diff. Worktree + branch cleaned up. S3 ticked `[x]` in
  ROADMAP; S2 remains `[~]` with `ISSUES.md` #2 (ball-open reveal) open.
- **Did:** Verified S3 in the worktree (74/74 there; LCG constants checked
  against `random.c`; dump spot-checked: `gRngValue 0xd2ddeec8`, six
  species in pinned order with RAM-read Lv50 stats). Added the
  `sFactorySelectScreen` finding to ROADMAP Domain notes.
- **Next:** Finish S2 via `ISSUES.md` #2 (mon-pic window growth + GBA
  5-bit-space alpha blend + 6 front-sprite extraction), then S4.
- **Notes:** Statics aren't in the linker map — `nm` on the pinned ELF
  resolves them (recipe in `tools/extract/inspect-anchor.py`).

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
