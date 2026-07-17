# Progress ledger — archive

Older entries moved out of `PROGRESS.md` to keep the live ledger lean. Newest
archived entry on top. Git history has the full detail regardless.

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

