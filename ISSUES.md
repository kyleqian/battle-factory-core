# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## 1 — Font glyphs render with the wrong shape (~2000px anchor diff)

`npm run compare -- tools/compare/traces/anchor.json` shows 2161/38400px
(5.63%) diff on the anchor frame, entirely within text regions (title,
category, species, message windows); BG1 chrome and OBJ ball/arrow sprites
are pixel-exact (0 diff there - verified by diffing only the ball/chrome
rows).

**Confirmed from reference/pokeemerald/src/text.c:** `DecompressGlyphTile`
does NOT copy `graphics/fonts/latin_normal.png`'s per-pixel palette indices
1:1 into the displayed glyph. It runs each glyph through
`GenerateFontHalfRowLookupTable` + `sFontHalfRowOffsets` (a 256-entry table,
`text.c:51`) that combines pairs of source nibbles into a blended output
nibble - this is a real bit-packing/blend step, not a straight recolor. Our
current `src/engine/font.ts` `drawText` treats each source pixel's raw value
(0-3) as directly selecting bg/fg/shadow, which is wrong: measured against
the oracle, the real glyph ink only spans ~9 of the source bitmap's 15
tall rows and the horizontal detail differs too (see the two side-by-side
row dumps in this run's session - oracle 'R' at window-relative rows 4-12,
ours scattered across rows 3-12 with extra/missing pixels each row).

**Lead for next worker:** reverse-engineer `sFontHalfRowOffsets` +
`sFontHalfRowLookupTable` (`text.c:41-51,363-420,526-560`) and either (a)
replicate the exact bit-packing at extract time so `font-normal.json`
stores the already-correctly-blended glyph bitmaps, or (b) implement the
same lookup at render time in `src/engine/font.ts`. Validate glyph-by-glyph
against the oracle's rendered "RENTAL POKéMON" / "Select the first
POKéMON." text (crop + diff, not eyeballing) before declaring it fixed.
