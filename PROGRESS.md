# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
