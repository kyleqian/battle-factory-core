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

## Round 2 (this session): the three open pieces landed, byte-exact

All three round-1 "still open" items are now landed in
`src/engine/healthboxAssembly.ts`, pinned by
`tests/healthboxAssembly.test.ts`'s full-byte-exactness assertion: **every
opaque pixel of the harvested 100x28 block (2574/2574) is now asserted and
matches, with zero exclusion rects.** `composeOpponentHealthbox`'s signature
changed to take an `assets: { frame, hpbar }` bag (was just `frame`) since
the HP bar now needs its own sheet too - the only caller is the test, so
this was a safe change (not wired into `battleScene.ts` this round either).

### 1. HP-bar placement (was open)

Round 1's read of `sHealthBar_Subsprites_Opponent` (3 subsprites: two `32x8`
halves + a lone `8x8`) was correct groundwork; what was missing was the
actual coordinate transform. `AddSubspritesToOamBuffer`
(`reference/pokeemerald/src/sprite.c:1679-1755`) computes each subsprite's
screen corner as `base{X,Y} + subsprite.{x,y}`, where `base{X,Y} =
oam.{x,y} - sprite.centerToCornerVec{X,Y}` — **this is the sprite's own
*center*, not its corner** (round 1's naive placement used the bar's OAM
corner `(36,26)` directly, which is why it mismatched). Re-probed via
`dump-healthbox-vram.py` at the same trace/tick: bar `oam.{x,y}=(36,26)`,
`centerToCornerVec=(-16,-4)` → `base=(52,30)` → canvas-local center
`(40,16)` (frame origin `(12,14)`). Applying the two visible subsprites'
offsets:
- `{x:-16,y:0,tileOffset:0}` (32×8, bar's own local tiles 0-3) → canvas-local
  corner `(24,16)`.
- `{x:16,y:0,tileOffset:4}` (32×8, local tiles 4-7) → canvas-local corner
  `(56,16)`.
- `{x:-32,y:0,tileOffset:8}` (8×8) → canvas-local corner `(8,16)`, but its
  backing VRAM (bar's own local tile 8) is confirmed **all-zero nibbles** in
  a fresh probe dump — fully transparent, so it contributes no pixels and
  is omitted from the compositor entirely (see `HP_BAR_SUBSPRITES`, only 2
  entries).

Bar's own local tiles 0-7 (i.e. `HP_BAR_FULL_TILES`) are exactly what round
1 already nailed: `[1,2,11,11,11,11,11,11]` from the `hpbar` tileset (tiles
0-1 = the static "HP" caption letters, `HEALTHBOX_GFX_1`/`_2`, copied once
at sprite creation, `battle_interface.c:938`; tiles 2-7 = the full-HP green
fill segment, `HEALTHBOX_GFX_HP_BAR_GREEN`+8 = `HEALTHBOX_GFX_11`).

**Correction to round 1's z-order claim:** round 1 guessed (unverified)
that `healthboxLeft` (OAM index 1) wins over the healthbar (OAM index 60)
wherever the frame is opaque, since GBA ties resolve to the lower OAM
index. Direct pixel diffing this round shows the **opposite**: at
canvas-local `(37,17)` (well inside the bar's footprint) the frame's own
tile is fully opaque (`singlesOpponent` tile #36, entirely palette index 2)
but the harvested pixel is the bar's teal fill color — the bar wins.
Whatever the actual OAM-buffer insertion order/tie-break is here (not
re-derived; the subsprite expansion makes naive spriteId-ordering
reasoning unreliable), the compositor now just draws the frame first and
the bar on top, which reproduces all 2574 pixels exactly.

### 2. Nickname+gender text (was open)

Root cause of round 1's "drew nothing": nothing wrong with the font decode
or charmap - the bug was rendering directly into a screen-bound
framebuffer/window abstraction that didn't match the real compositing
model. Read `UpdateNickInHealthbox` (`battle_interface.c:1912-1965`) and
`TextIntoHealthboxObject` (`battle_interface.c:2585-2598`) in full this
round: the real game renders into an 8×2-tile (64×16px) window at print
position `(x=0,y=3)` with `FONT_SMALL` and `TextColors{bg:2,fg:1,shadow:3}`
(literal palette indices — `AddTextPrinterAndCreateWindowOnHealthbox`'s
`color[]={bgColor,1,3}`, confirmed exactly against the harvested pixels:
frame palette index 1 ≈ `(66,66,66)`, 2 ≈ `(255,255,222)`, 3 ≈
`(222,214,181)`), then `TextIntoHealthboxObject` CPU-copies it into
`healthboxLeft`'s own VRAM via a two-part tile-aligned copy. Traced the
copy's net pixel effect by hand: it's equivalent to a **plain rectangular
blit** of window-local `(x:0..55, y:5..15)` to the destination sprite's
own canvas-local `(x:8..63, y:5..15)` — window rows 0-4 (the glyphs' own
top 2px, since text starts at print-y 3) are simply never copied to the
sprite at all. Verified this transform pixel-for-pixel against the
harvested block (0 mismatches over 616 cells before adding it to the real
compositor).

One real wrinkle found along the way: **gender symbols are colored
differently than the nickname text.** `gText_HealthboxGender_Male`/
`_Female` (`strings.c:1247-1248`) embed a `{COLOR DYNAMIC_COLOR2}`/`{COLOR
DYNAMIC_COLOR1}` control code right before the `♂`/`♀` glyph
(`TEXT_DYNAMIC_COLOR_2=0xB=11`, `_1=0xA=10` -
`include/constants/characters.h:244-245`), which overrides just the
printer's `fgColor` for the rest of the string (`text.c:980-984`,
`EXT_CTRL_CODE_COLOR`). Palette indices 11/10 in this sprite's own bank are
a saturated sky-blue/salmon-pink (`(66,206,255)`/`(255,156,148)`) —
matches the harvested `♂` pixels exactly once applied (`GENDER_SYMBOL_FG`).
The glyph bitmaps themselves (`font-small.json` codes 181/182) are plain
3-role glyphs like any other letter; the color comes entirely from the
string's own embedded control code, not the glyph data.

The "Lv" prefix glyph likewise resolved cleanly: `UpdateLvlInHealthbox`
writes `CHAR_EXTRA_SYMBOL` (0xF9) + `CHAR_LV_2` (0x05) -
`text.c:1454-1456`'s `CHAR_EXTRA_SYMBOL` escape resolves the next byte to
glyph code `byte | 0x100` = `0x105` = 261, which `font-small.json` does
carry (a combined "Lv" icon bitmap, width 8) even though it's not a normal
printable charmap entry.

### 3. Level text (was open)

Same window/copy model as nickname text, just a different destination
(`healthboxRight`'s own tile 0 → canvas-local `x=64`, since Right's corner
is Left's + `(64,0)`) and copy width (3 tiles / 24px, vs. 7 for the
nickname). `UpdateLvlInHealthbox` (`battle_interface.c:1105-1137`) builds
`"Lv" + ConvertIntToDecimalStringN(level, LEFT_ALIGN, 3)`, then
right-aligns the *whole* "Lv"+digits string within a reserved 3-digit field
via `xPos = 5 * (3 - digitCount)` (so `"Lv50"`, 2 digits, prints at window
x=5 - not x=0). No `FONT_BOLD`/bolding technique involved despite the
comment in `UpdateLvlInHealthbox`'s neighboring code (`RenderTextHandleBold`
is called elsewhere in this file for other bars, not this path) - level
text uses plain `FONT_SMALL` like the nickname, same `TextColors`. Verified
0 mismatches over 264 cells before wiring into the compositor.

### Round 3 (this session): hpFraction != 1 and status != "none" landed

Both remaining throws are gone. **No oracle ground truth exists for either
of these** — the canonical trace (`sendout.json`) never reaches a frame
with partial HP or a status condition before the first action menu, so
there is nothing to harvest pixels from. This round's validation is
source-decoded logic pinned by hermetic Tier-1 tests only (exact
`filledPixels` arithmetic for the boundary cases, tile bytes taken from
newly-extracted real sheets, never hand-drawn) — **oracle pixel validation
against real hardware is explicitly deferred to S7's first HP-drain
trace.**

#### HP-bar partial fill

`CalcBarFilledPixels` (`battle_interface.c:2413-2456`), specialized to the
settled (non-mid-animation) case: `pixels = floor(hpFraction * 48)`
(`B_HEALTHBAR_PIXELS=48`, `battle_interface.c:2233`) stands in for the
source's `currValue * totalPixels / maxValue` integer division, valid
whenever `maxValue >= totalPixels` (true for essentially every real
Pokémon's max HP against a 48px bar — the Q24.8 fixed-point branch for
`maxValue < totalPixels` is not implemented). One accepted imprecision:
floating-point `hpFraction` can differ from the source's exact integer
ratio by 1px right at a truncation boundary for some HP pairs — acceptable
per the no-oracle-yet caveat above.

The 6-column fill array (`pixelsArray`, one 0-8 value per healthbar-local
tile) is filled greedily (8,8,8,... then the remainder, then zeros) exactly
as the source loop does. The **"never show a fully-empty bar for a
Pokémon that isn't fainted" sliver rule** (source lines 2436-2440:
`filledPixels==0 && newValue>0` → force `pixelsArray[0]=1`) is reproduced
as `rawPixels===0 && hpFraction>0` → force column 0 to 1px, `filledPixels=1`.

Color-band selection (`MoveBattleBarGraphically`, `battle_interface.c:
2279-2284`) is `filledPixelsCount > 24` (50% of 48, exact) → green,
`> 9` (`floor(48*20/100)=9`, **not** 9.6) → yellow, else red — pinned by a
test at both boundaries: **exactly 50% HP (24px) is yellow, not green**;
**exactly 20% HP (9px) is red, not yellow** (both `>`, not `>=`). This is
a real, easy-to-get-wrong detail, not a hypothetical.

Tile selection: the healthbar sprite's own local tiles 0-1 ("H"/"P"
caption) are always `hpbar` sheet tiles 1-2, band-independent (loaded once
at sprite creation, `battle_interface.c:938`, never touched by
`MoveBattleBarGraphically`). Local tiles 2-7 (the 6 fill columns) select
per-column-pixel-count tiles from whichever band's sheet:
`HEALTHBOX_GFX_HP_BAR_GREEN`/`_YELLOW`/`_RED`'s enum offsets into
`gHealthboxElementsGfxTable` are 3, 47, 56 respectively (counted by hand
through the full enum, `battle_interface.c:39-115`); `hpbar.png` only
covers the green band (enum 0-11, confirmed: it's exactly 12 tiles) — the
yellow/red bands live in a **separate PNG, `hpbar_anim.png`** (enum 47-64,
18 tiles = 9 yellow + 9 red), which was not extracted before this round.
Extended `tools/extract/extract-battle-healthbox.ts` to pull it in
(`battle-healthbox.json`'s new `hpbarAnim` key) — real decoded PNG bytes,
same pipeline as every other sheet here, not hand-drawn. Verified
`hpbarAnim` tile 8 (yellow, "8px filled") has the exact same opaque/
transparent mask as the already-proven `hpbar` tile 11 (green "8px
filled") before trusting the enum-offset arithmetic.

#### Status icon

`UpdateStatusIconInHealthbox`'s opponent path (`battle_interface.c:2000-
2003`, `2059`): `tileNumAdder=0x11=17` for any opponent battler (singles or
doubles), 3 tiles (96 bytes) CPU-copied into the healthboxLeft sprite's own
local tile array at that offset. Left's own tile grid is 8 cols × 4 rows
(64×32px frame half ÷ 8px tiles), so local tile 17 = row 2, col 1 → canvas-
local corner `(8,16)`, 24×8px.

**This footprint overlaps the HP bar's leftmost ("H" caption) tile at
canvas `(24,16)` by one 8px column** — the status icon's 3rd tile and the
bar's "H" tile both claim canvas `x=24..31,y=16..23`. Rather than invent a
new z-order rule for this collision, the compositor draws the status icon
as part of the **frame layer** (since the real game CPU-copies it into the
same sprite's VRAM as the static frame art) *before* drawing the HP bar on
top — reusing round 2's already-pixel-confirmed rule that the bar wins
wherever both are opaque. Pinned by a test that computes the expected
pixel as "the bar's H-tile color if opaque there, else the status icon's
own color."

Row selection within `status2.png` (3 cols × 5 rows = 15 tiles): enum order
PSN, PRZ, SLP, FRZ, BRN (`battle_interface.c:112-126`) maps directly to
sheet rows 0-4. **`status2.png`, not `status.png`, is the correct sheet for
this module** — `GetStatusIconForBattlerId` (`battle_interface.c:2074-
2129`) selects a battler-specific variant (`status.png`=BATTLER0/player,
`status2.png`=BATTLER1), and the opponent is always battler 1 in a singles
battle. The pre-existing `status` key in `battle-healthbox.json` is the
*wrong* sheet for this module; extended the extractor to also pull
`status2.png` (new `status2` key) rather than reuse the wrong one.

Each status icon's tile pixel data indexes one shared "dynamic color" slot
— this sprite's own palette index `battler+12` (`pltAdder`,
`battle_interface.c:2057-2058`), fixed at index 13 for the opponent in
singles — which `sStatusIconColors` (`battle_interface.c:751-757`)
overwrites at runtime with a status-specific 5-bit GBA color
(`RGB(24,12,24)` for poison, etc.), expanded to 8-bit the same way mGBA's
framebuffer does (`(c5<<3)|(c5>>2)`, reproduced locally in
`healthboxAssembly.ts` rather than importing the dev-time-only
`tools/extract/gbaColor.ts` into engine code). Confirmed the placeholder
color baked into `ball_status_bar.png`'s own palette at that slot,
`(197,98,197)`, is close to `expand5to8(24,12,24)`'s `(198,99,198)` —
the art's own placeholder already approximates the runtime substitution,
corroborating the palette-index identification.

### Out of scope (unchanged)

- Doubles-battle battler positions (2/3), the Safari-ball / caught-ball
  overlay, and the player-side healthbox are still untouched — this module
  is opponent-singles-only, as it always has been.
- Partial-HP/status oracle pixel validation is still deferred to S7's first
  HP-drain trace (unchanged by the wiring below — the live call site only
  ever requests `hpFraction: 1, status: "none"` this round).

## Wired live (worktree lane, 2026-07-19): the send-out render path now goes through the compositor

`src/engine/battleScene.ts`'s `drawSendOutHealthbox` (called from
`renderBattleScene` for the send-out/settled windows) no longer blits the
pixel-harvested `sendout-healthbox-opponent.json` rectangle. It now draws
`composeOpponentHealthbox`'s own 128×32 canvas directly, translated by the
same slide-in `dx` as before, skipping `null` (transparent) cells so the
scene's background shows through exactly where the real OAM sprite would be
transparent.

**Call-site params**, sourced from committed battle data rather than
hardcoded (module-level consts right after the existing asset consts in
`battleScene.ts`):
- `name`/`level`/`hpFraction`: `src/data/gen/battle1-turn1-ram-dump.json`'s
  `battlerSnapshots.before_turn.battler1` (species 278/level 50/hp
  143/maxHP 143 — RAM-probed, already a committed data file used by
  `tests/turnRng.test.ts`) crossed with `src/data/gen/species-names.json`
  (species id → display name, likewise already used by
  `tests/battleMessageTemplates.test.ts`) for `"GROVYLE"`. `hp === maxHP`
  confirms this window's actual case is full HP, so `hpFraction: 1`.
- `gender: "male"` stays a literal — no committed data file carries
  frontier-trainer opponents' `personality` (only the player's own rentals
  do, `anchor-state.json`), so there's nothing to derive it from yet; it's
  the oracle-pixel-confirmed value for GROVYLE's harvested gender glyph
  (see above).
- `status: "none"` — the settled send-out window never shows a status
  condition.

**Old bleed-masking machinery removed.** `getHealthboxContentMask` and its
backing `healthboxContentMask` cache existed only to approximate the
healthbox sprite's true non-rectangular shape from the rectangular harvest,
via a value-equality heuristic against the plain background (§7.22/§7.23).
The compositor's own transparency is the REAL per-pixel shape (the frame
tileset's own index-0 convention), so that heuristic is now unnecessary for
the opponent side. Before wiring this in, confirmed empirically (scratch
comparison script, not committed) that the compositor's non-null cells are
a **strict superset** of the old heuristic's "real content" cells within the
harvest's own 100×28 crop (2574 vs. 2526 of 2800 total cells; 0 cells where
the old heuristic said "paint" and the compositor disagreed) and that the
48 extra cells all carry the exact same RGB as the settled background
(so painting them changes nothing visually) — including the three specific
coordinates `tests/battleScene.test.ts`'s own pre-existing fade-window test
pins (a bleed-margin pixel, a genuine-content pixel, and the nameplate
border pixel), all of which agree exactly between the two approaches. The
player-side healthbox keeps its own separate, untouched
`getMenuHealthboxPlayerContentMask` (out of scope this round).

**Sweep evidence** (all in this worktree, before vs. after the swap — every
count identical, zero pixel movement): sendout 255/256, s6-acceptance
224/228, menu-throw 78/78, menu-materialize 62/62, menu-idle 69/69,
menu-text 18/18, scene-assembly 256/256, transition 206/206. `npm test`
580/580 (579 base + 1 new), `npm run build` green.

**`sendout-healthbox-opponent.json` was NOT deleted** — grepped first:
`tests/healthboxAssembly.test.ts` still uses it as the byte-exact
ground-truth fixture for the compositor itself, and
`tests/battleScene.test.ts` still uses it directly (independent of
`battleScene.ts`'s own render internals) to pin the slide-in/bleed-window
behavior. Both are legitimate ground-truth uses, not leftover call-site
wiring, so the harvest stays.

**New Tier-1 test**: `tests/battleScene.test.ts` — "settled opponent
healthbox render equals composeOpponentHealthbox's own output buffer for
the real anchor params" — independently recomputes the same anchor params
the live call site uses and asserts every opaque compositor cell equals
the rendered on-screen pixel at trace tick 1555, proving the render path
actually goes through the compositor rather than merely agreeing with it
in isolation.

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
