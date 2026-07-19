# Opponent healthbox INTERNAL tile assembly — root cause (ISSUES #16)

Worktree-lane investigation task: root-cause why prior brute-force attempts
at placing `healthbox_singles_opponent.png`'s own tileset in its own raster
order at the pixel-confirmed settled corner `(12,14)` mismatched 728/2574
opaque px, and build the real content-assembly pipeline. RAM/VRAM/OAM
ground truth gathered via the sanctioned dev-time recipe (ROADMAP.md Domain
notes), reusable probe script `tools/probe/dump-healthbox-vram.py`.

## Root cause (RAM/VRAM-confirmed)

**The frame placement itself was never the bug.** At trace tick 1555
(`tools/compare/traces/sendout.json`, GROVYLE/male/Lv50/full-HP/no-status),
the opponent healthbox is three separate OAM sprites, all still fully
intact and readable in real OBJ VRAM:

| sprite | spriteId | oam.tileNum | oam.shape/size | screen corner (x,y) | pixel size |
|---|---|---|---|---|---|
| healthboxLeft (`gHealthboxSpriteIds[1]`) | 1 | 156 | wide/size3 (`64x32`) | (12,14) | 64×32 |
| healthboxRight (`gSprites[1].oam.affineParam`) | 61 | 188 (=156+32) | wide/size3 (`64x32`) | (76,14) | 64×32 |
| healthbar (`gSprites[1].data[5]`) | 60 | 292 | wide/size1 (`32x8`) | (36,26) | 32×8 |

(`x`/`y` derived the same way `docs/battle-interface-assets.md` already
documents for the party-status balls: `sprite.{x,y} + centerToCornerVec`,
confirmed to equal the real OAM `x`/`y` fields exactly.)

Decoding the raw 4bpp bytes at `OBJ_VRAM0 + tileNum*32` for all three
sprites and diffing tile-for-tile against the already-extracted
`healthbox_singles_opponent.png` tileset (`battle-healthbox.json`
`singlesOpponent`, 16 cols × 4 rows = 64 tiles) shows: **every VRAM tile
that isn't inside the name/level/HP-bar footprint is byte-identical to the
sheet's own tile at the same (row, col)** — e.g. `healthboxLeft`'s VRAM
tile at local (row0,col0) exactly equals sheet tile #0; (row1,col0)
exactly equals sheet #16; (row2,col0) exactly equals sheet #32; (row3,col0)
exactly equals sheet #48 (one probe run, `tools/probe/dump-healthbox-vram.py
tools/compare/traces/sendout.json 1555 1 <out.json>`, cross-checked with a
small Node decode script, not committed - see Reproduce below). Since
`healthboxRight`'s corner is exactly `healthboxLeft.corner + (64,0)` with
zero gap, and `healthbox_singles_opponent.png` is exactly 128×32 (16×4
tiles = Left's 32 tiles + Right's 32 tiles concatenated), **the whole base
frame is reproduced exactly by a single flat blit of the existing extracted
sheet at screen corner `(12,14)`** — no tile remap, no subsprite table, no
per-sprite split needed for the frame itself.

**The actual 728/2574 mismatch is 100% attributable to the three pieces of
*content* the real game CPU-copies on top of that base frame after loading
it**, none of which come from `healthbox_singles_opponent.png` at all:

1. **HP bar** (a *separate* sprite, not part of the frame sheet) — VRAM tiles
   0–1 of the healthbar sprite are `hpbar.png` tiles `#1,#2` (its static left
   cap, loaded once at `CreateBattlerHealthboxSprites`,
   `battle_interface.c:938`); tiles 2–7 are **all** `hpbar.png` tile `#11`
   (the fully-filled green segment, repeated 6×) — confirmed exactly by the
   VRAM dump, matching `MoveBattleBarGraphically`'s full-HP case
   (`battle_interface.c:2275-2306`: `filledPixelsCount` maxed → 6 identical
   `CpuCopy32` calls from `HEALTHBOX_GFX_HP_BAR_GREEN`'s fully-filled tile
   into `healthbarSpriteId`'s own tiles 2-7). Screen footprint: `(36,26)`,
   32×8px, palette = `ballDisplayAsset`'s `TAG_HEALTHBAR_PAL` (already the
   `hpbar` tileset's own palette in `battle-healthbox.json`).
2. **Nickname + gender text** ("GROVYLE♂", `FONT_SMALL`), CPU-copied into
   `healthboxLeft`'s own VRAM by `UpdateNickInHealthbox`
   (`battle_interface.c:1912-1965`, opponent path:
   `TextIntoHealthboxObject((void*)(OBJ_VRAM0+0x20+spriteTileNum),
   windowTileData, 7)`) — overwrites `healthboxLeft`'s tiles 1-7 (row0,
   bottom 3 px rows only) and tiles 9-15 (row1, all 8 px rows). Net effect
   traces to a plain rectangular blit (the two-part CPU copy is a hardware
   tile-alignment optimization, not a real remap): screen footprint
   `x=20..75` (56px, 7 tiles), `y=19..29` (11px) — confirmed as the exact
   *unmatched* region in `healthboxLeft`'s VRAM dump (tiles 1-6 in that
   range show `NO MATCH` against the sheet; tiles that happen to still be
   blank there, e.g. some of 6/7, coincidentally still equal a blank sheet
   tile).
3. **Level text** ("Lv50", `FONT_BOLD` = `FONT_NORMAL` glyphs bolded at
   render time — no separate glyph art, see `extract-battle-healthbox.ts`),
   CPU-copied into `healthboxRight`'s VRAM by `UpdateLvlInHealthbox`
   (`battle_interface.c:1105-1137`, opponent path: offset `spriteTileNum +
   0x400` = tile 0 of Right, width 3) — overwrites Right's tiles 0-2 (row0,
   bottom 3px) and tiles 8-10 (row1, full). Screen footprint: `x=76..99`
   (24px, 3 tiles), `y=19..29` (11px) — confirmed the exact unmatched
   region in `healthboxRight`'s VRAM dump (row0/row1 cols 0-2 `NO MATCH`;
   row2/row3 match the sheet directly, i.e. genuinely untouched frame).

So: **the "tile remap" the previous sessions flagged as unsolved does not
exist as a remap** — the frame sheet's own raster tile order *is* the
on-screen order, unmodified. What's missing is compositing three pieces of
*dynamically rendered content* (a fill-level-dependent HP-bar sprite, plus
two independently-positioned text blits using the game's own
window/text-printer pipeline) on top of an otherwise-static, already-solved
frame. This reframes the remaining work from "reverse-engineer an unknown
tile shuffle" (open-ended) to "implement three well-scoped, precisely
located overlays" (bounded).

## What this session lands vs. what's still open

**Landed, byte-exact, RAM/VRAM-verified** (`src/engine/healthboxAssembly.ts`,
pinned by `tests/healthboxAssembly.test.ts`):
- The base frame: a flat blit of `battle-healthbox.json`'s `singlesOpponent`
  tileset+palette at the healthbox's own corner. Exact for every pixel
  outside the content footprints below (verified against 859/2574 opaque
  px of the committed harvested block - the rest is excluded from the
  assertion, not mismatched, per the still-open items below).

**Still open (named precisely, not curve-fit):**
- **HP-bar placement.** Tile *selection* for the full-HP case is
  RAM/VRAM-confirmed exact (`HP_BAR_FULL_TILES = [1, 2, 11, 11, 11, 11, 11,
  11]` from the `hpbar` tileset - `MoveBattleBarGraphically`'s full-HP case,
  `battle_interface.c:2275-2306`). Its on-screen *placement* is not:
  unlike `healthboxLeft`/`Right`, the healthbar sprite has its own
  `SubspriteTable` (`sHealthBar_Subsprites_Opponent`,
  `battle_interface.c:491-518`) — **3** subsprites, not 1: two `32x8`
  halves (`tileOffset 0` and `4`) plus a lone extra `8x8` subsprite
  (`tileOffset 8`, offset `x=-32` from the bar's own center) that this
  session only discovered by reading the source *after* a naive
  single-rectangle placement (bar's own OAM corner, `(36,26)`, 32×8) had
  already mismatched the harvested block at that exact footprint (tried
  once, empirically wrong — see the git history of this file's own
  compositor for the discarded attempt). Also confirmed empirically along
  the way: sprite z-order matters here — `healthboxLeft` (OAM index 1) is
  a lower index than the healthbar sprite (OAM index 60), and GBA hardware
  renders the lower OAM index on top for equal-priority sprites, so
  wherever the frame itself is opaque it wins over the bar beneath it (not
  asserted by a test since the bar isn't composited at all this round, but
  worth keeping for whoever implements the subsprite placement). Not
  reattempted this session (time-boxed) — the tile selection is solid
  groundwork; the 3-subsprite geometry (likely: two adjoining 32-wide
  halves plus a separate cap piece 8px further left) is the next step.
- **Name/gender text rendering.** A first attempt reusing the existing
  `drawText`/`FONT_SMALL` glyph data (`src/data/gen/font-small.json`) at
  the derived footprint (`x=20..75,y=19..29` screen / `x=8..63,y=5..15`
  local-to-frame-canvas) with a first-guess `TextColors` (`fg` = palette
  index 1 `(66,66,66)`, `shadow` = index 3 `(222,214,181)`, both colors
  *are* present in the harvested crop's own pixels at that location, so the
  palette guess is likely right) drew **nothing** at that position — the
  glyph bitmap's role values were 0 (transparent) everywhere sampled,
  meaning either the x/y anchor is off, `UpdateNickInHealthbox`'s actual
  string has a leading control/prefix character (`gText_HealthboxNickname`
  is not necessarily an empty string — not inspected this session) that
  shifts the cursor, or `FONT_SMALL`'s glyph bitmap layout doesn't decode
  with the same `sFontHalfRowOffsets` 4-role convention `font.ts` already
  uses for `FONT_NORMAL` (not verified either way this session).
- **Level text rendering** ("Lv50", `FONT_BOLD`): footprint derived
  (`x=76..99,y=19..29` screen), not attempted — blocked behind the same
  glyph-decode question as the name text, plus the bolding technique itself
  (`RenderTextHandleBold`, not read this session).
- **HP-bar partial-fill tile selection** (`CalcBarFilledPixels`'s per-column
  fill-level table, `battle_interface.c` — not read this session): the
  function signature accepts `hpFraction` for S7's benefit but only `1.0`
  is implemented; anything else throws rather than silently producing wrong
  pixels.
- **Status icon / caught-ball overlay**: out of scope for this trace (no
  status, non-Safari trainer battle → `TryAddPokeballIconToHealthbox`
  returns early, `UpdateStatusIconInHealthbox`'s "no status" case appears to
  draw a blank/transparent tile — not independently verified).

## Reproduce the RAM/VRAM ground truth

```sh
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-healthbox-vram.py tools/compare/traces/sendout.json 1555 1 /tmp/healthbox-probe.json
```

Dumps `struct Sprite` fields (`include/sprite.h`) for `healthboxLeft`
(`gHealthboxSpriteIds[battler]`), `healthboxRight`
(`gSprites[left].oam.affineParam`), and the healthbar
(`gSprites[left].data[5]`), plus raw OBJ-VRAM 4bpp tile bytes and OBJ
palette RAM for each. Battler `1` = opponent in this singles trace; `0` =
player. Same mGBA-interpreter quirks as every other probe in
`tools/probe/`: stdout log spam is normal, exit 139 after the output file
is written is benign.
