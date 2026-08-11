# Pre-battle room scene notes (S5 groundwork)

Implementation dossier for the post-draft settled scene in
`BattleFrontier_BattleFactoryPreBattleRoom`: the room as it appears after
the draft's exit fade (§2/§4 of `docs/rent-flow-notes.md`), through
"Right this way, please!" fully printed and idle. Extraction-only session —
no engine code (`src/engine/` untouched). Extractors:
`tools/extract/extract-prebattle-room.ts`, writing
`src/assets/gen/prebattle-room-{tileset,npcs,msgbox}.json` and
`src/data/gen/prebattle-room-layout.json`. Tests: `tests/prebattleRoom.test.ts`.

## 0. Ground-truth trace

Reproduced the scout's happy path exactly (`docs/rent-flow-notes.md` §4's
button script: rent slots 1/2/3 at press-ticks 2/42, 74/82/122, 154/162/202,
`A` on the final YES/NO confirm at 264) as a dense every-frame capture,
frames 262-443 (`/tmp/s5-scout/rent3-dense-exit.json` +
`rent3-dense-exit-out/`, scratch, not committed per instructions - the
session's earlier scouting pass had already produced this exact trace,
independently re-verified this session against the source script). Two
target windows, both screenshot-confirmed this session:
- **Settled room, no message box**: frames 329-337 (pixel-stable per
  `rent-flow-notes.md` §4; used frames 333 and 337 for extraction
  cross-checks below).
- **Fully-printed message, idle**: frame 361 onward (holds byte-identical
  through the capture tail).

## 1. Map: tileset + layout

`BattleFrontier_BattleFactoryPreBattleRoom`'s layout
(`data/layouts/layouts.json`, id
`LAYOUT_BATTLE_FRONTIER_BATTLE_FACTORY_PRE_BATTLE_ROOM`) is **17x14 blocks**
(272x224 px), primary tileset `gTileset_Building`
(`data/tilesets/primary/building` - 512 tiles but only **8 metatiles**, none
of which this room's blocks actually reference) + secondary
`gTileset_BattleFactory` (`data/tilesets/secondary/battle_factory` - 432
tiles / 354 metatiles). Every block in this map's `map.bin`
(`data/layouts/BattleFrontier_BattleFactoryPreBattleRoom/map.bin`, 476 bytes
= 17\*14\*2) resolves to a secondary-tileset metatile (ids 512-865); the
primary tileset contributes nothing visible to this specific room.

**Global numbering** (`include/global.fieldmap.h:4-20`, `fieldmap.h:4-11`):
tile numbers 0-511 index the primary sheet, 512-1023 index the secondary
sheet at `tileNum-512`; metatile ids follow the identical 512 split
(`NUM_TILES_IN_PRIMARY`/`NUM_METATILES_IN_PRIMARY` both 512). Each metatile
is 8 tile-entries (u16, **same bit layout as a BG screen entry** - bits 0-9
tile, 10 hFlip, 11 vFlip, 12-15 palette - confirmed by reusing
`tools/extract/tilemap.ts`'s `parseTilemap` on `metatiles.bin` treated as an
8-wide grid): entries 0-3 are the bottom layer's 2x2 arrangement, 4-7 the
top layer's.

**Palette slot numbering gotcha** (verified by inspecting the actual `.pal`
files, not assumed): global palette slots 0-5 load
`<primary>/palettes/0N.pal`, slots 6-12 load `<secondary>/palettes/NN.pal`
using **the same NN as the global slot number**, not a local
0-6-re-based-at-6 index. Confirmed directly:
`data/tilesets/secondary/battle_factory/palettes/00.pal` through `05.pal`
are all-black unused placeholders, while `06.pal` through `11.pal` hold this
room's real colors (`12.pal`-`15.pal` are also unused placeholders here).
Getting this wrong (as an initial pass in this session's scratch script did)
silently renders every secondary-tileset block black.

**Metatile layer type** (`global.fieldmap.h:40-52`,
`metatile_attributes.bin`, 2 bytes/metatile: behavior u8 + 4 unused bits +
layerType 4 bits): `METATILE_LAYER_TYPE_NORMAL`(0) uses the middle+top BG
layers, `COVERED`(1) bottom+middle, `SPLIT`(2) bottom+top - this determines
which of the 3 actual background layers a metatile's 2 stored layers land
on, and therefore whether object-event sprites (drawn between the middle
and top hardware layers) appear in front of or behind that block's upper
layer. Every block this room's layout references has `layerType: 0`
(`METATILE_LAYER_TYPE_NORMAL`) per the extracted
`prebattle-room-tileset.json`'s `metatiles[*].layerType` - i.e. the whole
visible room uses the standard bottom-BG-layer-only-effectively floor/wall
rendering with sprites naturally in front; no `SPLIT`/`COVERED` blocks (e.g.
overhead signage) are in view. A later engine step can render this room's
static frame as two flat composited layers with sprites drawn on top,
without needing full 3-hardware-layer BG emulation - **but this is scoped
to what's actually on screen in the S5 static shot; don't generalize it to
other rooms.**

**Extraction scope**: `extract-prebattle-room.ts` writes only the
tiles/palettes/metatile-defs the map's 238 blocks actually reference (124
tiles, 5 palette slots, 101 unique metatiles of the tilesets' combined
362-metatile superset) into `src/assets/gen/prebattle-room-tileset.json`,
keyed by global tile number / palette slot / metatile id (dedup via a `Map`,
not hand-picked). The full 17x14 block grid (`{metatileId, collision,
elevation}` x238) is `src/data/gen/prebattle-room-layout.json`.

### Camera origin (screen (0,0) in map-pixel space)

**Oracle-derived, not assumed**: brute-force-matched the fully-decoded
272x224 map render against oracle frame 333 (sliding-window pixel diff over
every valid `(ox,oy)`) - exact match (0 differing sampled pixels) at
**map-pixel `(16, 56)`**. Re-verified against frame 337 (also 0 diff)
and, after wiring NPC sprites in, against a **full 240x160 diff of both
frames including the sprites: 0/38400 pixels differ** (verification
script, scratch, not committed - see §5).

This matches the standard field-camera convention exactly: the player's
tile-center pixel is always screen-center. Player tile `(8,8)` (below): map
pixel `(8*16+8, 8*16+8) = (136,136)`; screen center `(120,80)`; origin =
`(136-120, 136-80) = (16,56)`. Horizontally this places the player exactly
`MAP_OFFSET` (7, `include/fieldmap.h:18`) blocks from the visible screen's
left edge (blocks bx=1..15 of 0..16 are on-screen, player's bx=8 is the 8th
from bx=1); vertically the origin's `y=56 = 3*16+8` is **not** block-aligned
(56 mod 16 = 8, a half-block), consistent with the known
`gSpriteCoordOffsetY = ... - 8` field-camera vertical adjustment
(`src/field_camera.c:462`) - flagged as read-from-source context, not
independently re-derived this session (the empirical origin match makes it
moot for S5's static shot, but a future room with a *moving* camera should
re-verify this term rather than assume it).

### NPC tile positions (post `EventScript_EnterRoom` movement, settled)

- Attendant (`LOCALID_FACTORY_PRE_BATTLE_ATTENDANT`, `OBJ_EVENT_GFX_
  SCIENTIST_1`): spawns `(8,12)` (`map.json`'s `object_events[0]`), then
  `Movement_AttendantEnterRoom` (`scripts.inc:412-418`) walks up x5 + faces
  down → settles at **tile `(8,7)`, facing south**.
- Player: warped in at `(8,13)` (`BattleFrontier_BattleFactoryLobby/
  scripts.inc:172`, `warp MAP_..._PRE_BATTLE_ROOM, 8, 13`), `OnWarp`'s
  `SetUpObjects` turns north immediately (`scripts.inc:10-17`), then
  `Movement_PlayerEnterRoom` (`scripts.inc:388-394`) walks up x5 (no
  trailing `face_*`, holds the walk-up facing) → settles at **tile `(8,8)`,
  facing north**. This whole walk-in happens once, before the anchor's
  frame 0 (`rent-flow-notes.md` §2's "preamble" note) - the post-draft
  return to this room does **not** replay it; both NPCs are already
  standing at these settled tiles.

## 2. NPC sprite frames

Both are the standard 16x32, 9-frame `overworld_frame(*, 2, 4, N)` sheets
(144x32 px = 18x4 8x8-tiles; frame `N` = tile columns `[2N, 2N+1]` x all 4
rows). `sAnimTable_Standard`'s `ANIM_STD_FACE_SOUTH`/`_NORTH` map to
picture-table frames 0/1 respectively (`object_event_anims.h:178-187`,
`sAnim_FaceSouth`/`sAnim_FaceNorth` use `ANIMCMD_FRAME(0,...)`/`(1,...)`) -
**not** a coincidence worth re-deriving per-NPC, it's the shared standard
table every `sPicTable_*` in this scene uses.

- **Attendant**: `graphics/object_events/pics/people/scientist_1.png`,
  frame **0** (face south = the settled facing). Palette
  `graphics/object_events/palettes/npc_3.pal` (`OBJ_EVENT_PAL_TAG_NPC_3`,
  `object_event_graphics_info.h:894-911` → `object_event_movement.c:484`).
  Sprite art confirmed visually against the oracle capture (brown hair,
  white/red uniform) before extraction, not just trusted from the constant
  name (`OBJ_EVENT_GFX_SCIENTIST_1` reads oddly for what's drawn as an
  attendant, but the pixels match exactly).
- **Player**: confirmed **male protagonist (Brendan)** from the oracle
  sprite's green shirt (Emerald's male-trainer overworld palette signature,
  cropped and visually inspected this session - the save's PC gender isn't
  otherwise recorded in this run's extracted data).
  `graphics/object_events/pics/people/brendan/walking.png`
  (`gObjectEventPic_BrendanNormal`), frame **1** (face north = the settled
  facing). Palette `graphics/object_events/palettes/brendan.pal`
  (`OBJ_EVENT_PAL_TAG_BRENDAN`, `object_event_graphics_info.h`
  `gObjectEventGraphicsInfo_BrendanNormal` → `PALSLOT_PLAYER`).

Both extracted to `src/assets/gen/prebattle-room-npcs.json` as
`{tileset:{columns:2,rows:4,tiles:[...8 tiles of 64 palette-index
bytes...]}, palette:[...16 {r,g,b}...], facing}`.

### Screen placement (oracle-verified sprite anchor)

Sprites are 16px wide (== tile width, so **horizontally tile-aligned**, no
centering offset needed) and 32px tall (twice the tile height, so **bottom-
aligned**: sprite top = `tileY*16 + 16 - 32 = tileY*16 - 16`). Verified by
compositing both NPCs into the map render at exactly this anchor and
diffing the composite against oracle frames 333 and 337 full-frame:
**0/38400 pixels differ on both**, i.e. this anchor rule plus the extracted
tile/sprite/palette data reproduces the entire settled scene byte-for-byte,
foreground and background alike. In screen pixels (camera origin (16,56)):
attendant sprite top-left `(112-16, 112-16-56) = (96, 40)`... concretely
`attendantTile(8,7)` → sprite draws at map-pixel `(128, 96)`, screen
`(128-16, 96-56) = (112, 40)`; `playerTile(8,8)` → map-pixel `(128,112)`,
screen `(112, 56)`. (These are map/screen pixel top-left corners of the
16x32 sprite bounding box, elevation 0 for both - no elevation-based
vertical adjustment needed in this scene.)

## 3. Standard message box: "Right this way, please!"

Printed by `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_
EnterBattleRoom` (`scripts.inc:43-52`): `msgbox BattleFrontier_
BattleFactoryPreBattleRoom_Text_RightThisWay, MSGBOX_DEFAULT`, text at
`scripts.inc:612-613` (`.string "Right this way, please!$"`, single page,
no line break - `rent-flow-notes.md`'s "strings.c:612-613" citation was
slightly off, the string lives in this map's own `scripts.inc`, not
`strings.c`). `MSGBOX_DEFAULT` blocks on player `A` before `closemessage`
runs (confirmed non-auto-advancing, `rent-flow-notes.md` §4: byte-identical
frames 361-963).

**Window frame art**: `graphics/text_window/message_box.png` (56x16 = 7x2
8x8-tiles) is `gMessageBox_Gfx`/`gMessageBox_Pal`
(`src/graphics.c:1472-1473`), drawn by `DrawDialogueFrame` inside
`Task_DrawFieldMessage` (`src/field_message_box.c:25-45`). Extracted
verbatim (own embedded PNG palette, no companion `.pal` file - the build's
`.gbapal` is generated from this PNG) to
`src/assets/gen/prebattle-room-msgbox.json`.

**Important asset-boundary finding** (cross-checked precisely, not
hand-waved): `message_box.png`'s own palette does **not** contain the
oracle's pure-white `(255,255,255)` box interior - its closest entries
(indices 1, 10, 12) are `(247,247,247)`, an intentionally-slightly-off-white
border-shading tone. The oracle screenshot's flat white interior fill is
**not** drawn from this asset at all - it's the window's plain background
fill, using the already-extracted `src/assets/gen/text-palette.json`
(`colors[2] = {r:255,g:255,b:255}` exactly). **A later engine step needs
both assets together**: `message_box.png`'s decorative border tiles for the
rounded-corner frame, and `text-palette.json`'s index-2 white for the flat
interior fill - they are not interchangeable and the box art alone will not
reproduce the oracle's interior color.

**Geometry** (oracle-measured this session, `frame-00361.png`, column scan
at x=0 and x=120 for the first non-floor-color row): box top edge at
**screen y=96**, spanning the full screen width (**x=0-239**) down to the
screen bottom (**y=159**) - i.e. **64px tall (8 8px-tile rows), 30 tiles
wide**, the standard bottom-of-screen field message box. Not independently
cross-referenced against a `WindowTemplate` struct literal this session
(deprioritized given the time budget - low risk, this is the same standard
box every field message in the game uses, and the pixel measurement is
direct).

**Text rendering params**: not pixel-measured to sub-tile precision this
session (see Risks below) - documented from the shared font system already
extracted and tested elsewhere in this repo (`src/data/gen/font-normal.json`
+ `src/assets/gen/text-palette.json`, used identically for the draft
screen's own message printing per `ROADMAP.md` S1/S2). `font-normal.json`
carries `defaultFgColor:2, defaultBgColor:1, defaultShadowColor:3,
letterSpacing:0, lineSpacing:0` - i.e. `FONT_NORMAL`'s standard white-on-
transparent-with-dark-shadow rendering, index 2 (`{255,255,255}`) matching
the interior-fill finding above. Print speed/cadence (chars-per-frame) was
**not** derived this session - flagged as Risk 2 below; the only oracle
timing pinned is the two endpoints already in `rent-flow-notes.md` §4
(printing starts frame 338, fully printed by frame 361 - a **23-frame**
window for "Right this way, please!"'s 24 printable characters, i.e.
consistent with the standard ~1 char/frame text speed, but not verified
per-character against intermediate frames).

## 4. Extraction outputs

- `src/data/gen/prebattle-room-layout.json` - 17x14 block grid, camera
  origin, both NPCs' settled tile positions.
- `src/assets/gen/prebattle-room-tileset.json` - the 124 tiles / 5 palette
  slots / 101 metatiles this map's blocks reference (keyed by global tile
  number / palette slot / metatile id).
- `src/assets/gen/prebattle-room-npcs.json` - attendant + player settled-
  pose sprite frame (2x4 tiles) + 16-color palette + facing.
- `src/assets/gen/prebattle-room-msgbox.json` - the 7x2-tile message-box
  frame art + its embedded palette.

All four verified byte-identical across two consecutive extractor runs
(`md5` of all four outputs matched). `tests/prebattleRoom.test.ts` pins
shape/count sanity plus the specific tile/palette/metatile values used in
the §1-§3 oracle cross-checks above.

## 5. Risks / follow-ups for the engine step

1. **Message-box text print timing (chars/frame) is not pinned** - only
   the two endpoints (start frame 338, done frame 361) are known. A future
   dense trace capturing every frame 338-361 would let the engine step pin
   exact per-character reveal timing instead of assuming linear ~1/frame.
2. **Text sub-tile origin (first glyph's exact x,y) was not pixel-measured
   to single-pixel precision** - attempted this session but the sample
   region (screen x=6-19,y=98-111) turned out to still be inside the box's
   rounded top-left corner art, not the text; re-attempt with a tighter,
   corner-excluding crop before the engine step needs exact glyph
   placement. The font/color system itself (`font-normal.json` +
   `text-palette.json`) is already oracle-tested elsewhere in this repo, so
   this is a placement question, not a data-correctness one.
3. **Camera origin's vertical `-8` term is cited from `field_camera.c:462`
   but not independently re-derived** - moot for this static shot (the
   origin was pixel-matched directly, not computed from the formula), but
   flagged in case a future room needs the camera to move.
4. **Only the anchor's fixed rental pool / male protagonist / Lv-50-singles
   attendant graphic was captured** - `OBJ_EVENT_GFX_SCIENTIST_1` is a
   generic NPC graphic reused elsewhere in the game (`data/contest_
   opponents.h:2690`); if a later stage needs the female-protagonist (May)
   or a different attendant variant, those are separate, unextracted
   assets (`graphics/object_events/pics/people/may/`, `scientist_2.png`).
5. **The attendant/player's idle animations (if any) while the message box
   is up were not probed** - the settled-room windows (329-337) predate
   the message box; whether either NPC's sprite has any idle motion during
   the message (unlikely for a `face_*`-locked NPC, but not confirmed) is
   unexamined.
