# Battle-interface assets: ball_display + down_arrow_alt (S6 groundwork)

Worktree-lane extraction task: pull the two battle-interface assets flagged
missing for the scene-assembly window (party-status ball icons + the
message-box "wait for input" cursor) and pixel-verify both against the
oracle. Extraction only — no engine code, no rendering wired up.

Extractor: `tools/extract/extract-battle-interface.ts` (run with
`node --experimental-strip-types tools/extract/extract-battle-interface.ts`).
Output: `src/assets/gen/battle-interface-ball-display.json`,
`src/assets/gen/battle-interface-down-arrow.json`. Ground-truth trace:
`tools/compare/traces-groundtruth/battle-interface-assets.json` (35 segments
identical to `battle1-intro.json`'s first 1420 frames, 137 dense
`captureFrames` covering 1284-1420 — regenerate with `bin/oracle run
tools/compare/traces-groundtruth/battle-interface-assets.json -o <dir>`).

## Asset 1 — party-status-summary ball icons (`ball_display.png`)

**Source path matches the brief exactly.** Loader:
`CreatePartyStatusSummarySprites` (`src/battle_interface.c:1450-1657`),
called uniformly from every `battle_controller_*.c:*` (e.g.
`battle_controller_opponent.c:1949`) with data-driven `skipPlayer`/
`isBattleStart` args from `gBattleBufferA`.

- **Tiles:** `sStatusSummaryBallsSpriteSheet` = `&gHealthboxElementsGfxTable
  [HEALTHBOX_GFX_STATUS_BALL]`, `0x80` bytes = 4 tiles
  (`src/battle_interface.c:652-656`). `gHealthboxElementsGfxTable`
  concatenates `hpbar.4bpp, expbar.4bpp, status.4bpp, misc.4bpp,
  hpbar_anim.4bpp, misc_frameend.4bpp, ball_display.4bpp, ...`
  (`src/graphics.c:358-370`) — `HEALTHBOX_GFX_STATUS_BALL`'s offset lands
  exactly on `ball_display.4bpp`'s first byte, and `ball_display.png` is
  32×8px = exactly 4 tiles, so decoding `ball_display.png` directly (no
  table-offset arithmetic needed) reproduces those bytes. Enum order
  (`src/battle_interface.c:107-111`): `HEALTHBOX_GFX_STATUS_BALL` (Full),
  `_EMPTY`, `_FAINTED`, `_STATUSED` — tiles 0-3 in the extracted JSON,
  confirmed by decoding each tile's shape (tile0 = filled pokéball, tile1 =
  hollow ring, tile2 = solid recolor, tile3 = banded recolor).
  Caveat (not fixed, out of scope): `CreatePartyStatusSummarySprites`'s own
  tileNum arithmetic (`src/battle_interface.c:1549-1645`, e.g. `+= 3` for a
  fainted mon, `+= 2` for a status ailment) does not match the enum's
  declared Fainted/Statused order — a rendering-code question for whoever
  wires this up, not resolved here.
- **Palette:** `sStatusSummaryBallsSpritePal` = `gBattleInterface_BallDisplayPal`
  (`TAG_STATUS_SUMMARY_BALLS_PAL`, `src/battle_interface.c:652`) =
  `ball_display.png`'s own embedded 16-color palette
  (`src/graphics.c:356`). Unlike the hp/exp-bar sheets in
  `extract-battle-healthbox.ts` (which borrow this same palette but not
  these tiles), **this asset's own embedded palette genuinely is the
  runtime palette** — confirmed byte-exact below.
- **OAM/position:** `sOamData_StatusSummaryBalls` — shape `8x8`, 1 tile, no
  anims (`src/battle_interface.c:678-693`). Per-icon screen position, from
  `CreatePartyStatusSummarySprites` (`src/battle_interface.c:1450-1538`):
  `bar_X`/`bar_Y` are `(136, 96)` for the player side and `(104, 40)` for
  the opponent side (singles, `!skipPlayer` — both true in this trace);
  each ball icon's *sprite* position is `(bar_X ± (10·k + 24), bar_Y - 4)`
  (player: `bar_X + 24 + 10·i`; opponent: `bar_X - (10·(5-i) + 24)`, `i` =
  party slot 0-5). Sprite `x`/`y` in this codebase are **centers, not
  corners** — `CalcCenterToCornerVec` (`src/sprite.c:687-700`, table-driven
  by OAM shape/size) gives `(-4, -4)` for an `8x8` sprite
  (`sprite.oam.{x,y} = sprite.{x,y} + centerToCornerVec{X,Y}`,
  `src/sprite.c:349-355`), so the on-screen top-left corner is 4px up and
  4px left of the formula above. Combined: **opponent icon `i` corner =
  `(26 + 10·i, 32)`; player icon `i` corner = `(156 + 10·i, 88)`**, `i` =
  0-5 — verified against the oracle capture pixel-for-pixel (see below),
  not just asserted from source.

### Verification

Trace: `bug catcher destin`'s trainer-appear message box (this is the pinned
`battle1-intro.json` trace's own content — not Factory-specific, but the
same generic `CreatePartyStatusSummarySprites` codepath). Ball-icon entrance
slide settles at **tick 1292** exactly (16/16 px match from 1292 onward;
1284-1291 still mid-slide, confirmed by a per-tick sweep — icon slots are
progressively absent/ring-shaped before settling). Classified each of the
12 on-screen icons (6 opponent + 6 player) by testing all 4 states and
picking the exact match; every icon matched exactly one state at
**16/16 px** (Empty, transparent-heavy tile) or **37/37 px** (Full):

| side | slots (0-5) | state |
|---|---|---|
| opponent | 0,1,2 | Empty |
| opponent | 3,4,5 | Full |
| player | 0,1,2 | Full |
| player | 3,4,5 | Empty |

Re-verified at 5 frames spread across the settled window (1292, 1300, 1350,
1400, 1420) × 12 icons = **1590/1590 px exact** (every icon, every sampled
tick, RGB-exact against the oracle capture, using `ball_display.png`'s own
embedded palette with no adjustment). **RESOLVED, byte-exact.**

## Asset 2 — the "wait for input" cursor (`down_arrow_alt.png`)

**The brief's guessed path (`graphics/battle_interface/down_arrow_alt.png`)
does not exist** — the real asset is `graphics/fonts/down_arrow_alt.png`
(confirmed via `grep` — there is no `down_arrow_alt.*` anywhere under
`graphics/battle_interface/`). Loader: `src/text.c:72`,
`sDarkDownArrowTiles = INCGFX_U8("graphics/fonts/down_arrow_alt.png",
".4bpp")`, drawn by `TextPrinterDrawDownArrow` (`src/text.c:787-836`) via
`TextPrinterWaitWithDownArrow` (`src/text.c:865-882`) whenever a
`TextPrinter` is paused waiting for `A`/`B` with `gTextFlags.autoScroll ==
0`. `gTextFlags.useAlternateDownArrow` selects this "dark" variant over the
plain `down_arrow.png`; `battle_message.c:2997-3000` sets it `TRUE` for
every battle window except `ARENA_WIN_JUDGMENT_TEXT` — so **every regular
battle message box uses this asset**, matching the brief's description.
It is drawn directly into the window's tile data (`BlitBitmapRectToWindow`),
not as a sprite — no OAM/palette tag of its own.

**Why it looks like a heart:** the shape itself is a plain downward-pointing
triangle/arrowhead (confirmed by decoding the raw pixel indices — outline
index1, fill index2, a symmetric 7-row taper). What reads as a "heart" is
the *color*: this raw blit copies palette indices straight into the
window's own tile data, so it takes on whichever colors are already loaded
for that window rather than `down_arrow_alt.png`'s own embedded (irrelevant)
palette — same convention as the hp/exp-bar sheets in
`extract-battle-healthbox.ts`. Empirically (see below) index1→white
`(255,255,255)`, index2→red `(255,0,0)`, an exact match for
`gBattleTextboxPalette` bank 0 (`BG_PLTT_ID(0)`, `src/battle_bg.c:864`) —
already extracted as `battle-window.json`'s `palette[0]`
(`textbox_0.pal[1]` = white, `textbox_0.pal[2]` = red). **No new palette
file was written for this asset** — render it with `battle-window.json`'s
existing `palette[0]`.

**The bob:** `sDownArrowYCoords = {0, 1, 2, 1}` (`src/text.c:75`). Each
draw call either decrements a countdown or (when it hits 0) redraws and
resets the countdown to 8 while advancing the phase index — tracing
`TextPrinterDrawDownArrow`'s countdown logic tick-by-tick shows the redraw
actually fires every **9** ticks (not 8: the draw tick itself is the 9th),
so the bob is a **4-phase, 36-tick-period** cycle, exactly matching the
brief's description.

### Verification

Empirically, at fixed screen position **(destX=123, destY=135..137)**, the
cursor's on-screen top row cycles **140 → 141 → 142 → 141 → 140 → ...**,
dwelling 9 ticks per value, 36-tick period — a dense per-tick sweep of the
full 1284-1420 window confirms this exactly, with the first full dwell
block starting at tick 1301 and a clean block boundary at 1328 (offset 0)
usable as a phase anchor. This reproduces byte-exact when modeled as
`destY = 135 + offset` with `offset` cycling `[0, 1, 2, 1]` (9 ticks each)
and a **fixed** source sample (row 0 of the decoded 8×48 bitmap, i.e. the
shape's own natural position) — **not** as literally read off the
`BlitBitmapRectToWindow` call site's parameter order (source Y varies,
dest Y fixed at `currentX,currentY`). Tracing the sign through
`BlitBitmapRect4Bit`'s tile-address arithmetic (`src/blit.c:9-51`) predicts
the *opposite* direction (increasing source-sample offset should move the
visible shape **up** the screen, not down, for a fixed destination) — this
residual sign/axis mismatch is **not resolved**: the asset (raw shape
indices + the `[0,1,2,1]` cycle magnitudes, both directly transcribed from
source) is confirmed correct, and an empirical additive rule reproduces
every tested pixel exactly, but which literal coordinate (source-row vs.
dest-row) "moves" at runtime, and why the naive blit-math sign disagrees,
is left for whichever engine slice actually wires up text-printer waiting —
flagging it explicitly rather than asserting an unverified formula.

Full-window sweep, all 137 captured ticks (1284-1420), fixed `destX=123`,
`destY=135+offset(tick)` per the additive rule above, `srcY=0`: **4773/4773
px exact** (37 non-transparent px/frame × 129 ticks from 1292 — the window
brief asked to treat as settled — onward; 1284-1291 excluded only because
the *ball icons'* entrance slide hadn't finished, the cursor itself is
present and correct for the full 137-tick capture). **RESOLVED for the
asset itself (shape + palette source, byte-exact); the source/dest-axis
attribution of the bob is explicitly NOT verified against the blit
arithmetic** — noted above for a future engine slice.

## Files

- `tools/extract/extract-battle-interface.ts` — extractor (new)
- `src/assets/gen/battle-interface-ball-display.json` — 4-tile sheet +
  embedded palette
- `src/assets/gen/battle-interface-down-arrow.json` — 8×48 raw index
  bitmap + `sourceRowOffsets: [0,1,2,1]` (transcribed from
  `sDownArrowYCoords`; see the unresolved axis caveat above before wiring
  a renderer to it)
- `tools/compare/traces-groundtruth/battle-interface-assets.json` — probe
  trace (137 dense captures, ticks 1284-1420)
