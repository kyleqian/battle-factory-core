# Factory Lobby terminal visual assets

This is a source-only extraction for the common field scene used by the
regular Battle Factory loss and first seven-win endings. It is deliberately
not a terminal-flow implementation and contains no oracle framebuffer data.

`tools/extract/extract-factory-lobby-terminal.ts` writes:

- `src/assets/gen/factory-lobby-terminal-tileset.json`
- `src/data/gen/factory-lobby-terminal-layout.json`
- `src/assets/gen/factory-lobby-terminal-npcs.json`

It accepts `--out-dir <directory>` for byte-for-byte regeneration; the Tier-1
test exercises that path.

## Source boundary

Both terminal branches finish in `BattleFrontier_BattleFactoryBattleRoom_
EventScript_WarpToLobby`:

- the loss path sets `CHALLENGE_STATUS_LOST` at
  `data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:88-90`;
- the seventh-win path sets `CHALLENGE_STATUS_WON` at `:109-111`;
- regular singles then executes `warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_
  LOBBY, 4, 8` at `:222-227`.

`BattleFrontier_BattleFactoryLobby_OnWarp` turns `LOCALID_PLAYER` north, and
the OnFrame status table dispatches `WonChallenge` or `LostChallenge
` (`data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:1-23,40-94`).
Those scripts own the message, fanfare, save, record prompt, and all timing;
none is reproduced here. The two existing OFF oracle evidence probes document
those flow gates without exporting pixels:
`docs/factory-loss-ending-off-probe.md` and
`docs/factory-seventh-win-ending-off-probe.md`.

## Map and camera

`LAYOUT_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY` is the 19×12-block layout in
`data/layouts/layouts.json:3455-3462`, using `gTileset_Building` and
`gTileset_BattleFactory`. The extractor decodes its `map.bin`, 2×2
`border.bin`, both source metatile arrays, attributes, indexed tiles, and only
the palette banks/transformed tile entries reached by those blocks. Global
tile/metatile numbering is the standard primary 0–511 / secondary 512–1023
split from `include/fieldmap.h:4-20`; each metatile's eight u16 entries are
the two 2×2 BG layers.

At warp `(4,8)`, the regular field camera is centered on the player tile:
`(4*16+8-120, 8*16+8-80) = (-48,56)`. This uses the same coordinate convention
as the existing pre-battle-room extractor and is why the Lobby artifact must
retain `border.bin`: the terminal viewport reaches three map blocks left of
the layout and two rows below it. It is source geometry, not a fitted capture.

## Visible object scope

The Lobby map's object definitions are in
`data/maps/BattleFrontier_BattleFactoryLobby/map.json`. At the `(4,8)` singles
terminal camera, the extracted objects are exactly the geometrically exposed
ones:

- Brendan (`OBJ_EVENT_GFX_BRENDAN_NORMAL`), `(4,8)`, facing north;
- singles attendant (`OBJ_EVENT_GFX_SCIENTIST_1`), `(4,7)`, facing south;
- Woman 1, `(3,11)`, facing south; and
- Fat Man, `(6,10)`, facing south.

The doubles attendant at `(14,7)`, Camper `(14,11)`, and Picnicker `(13,11)`
lie beyond this camera's right edge, so no asset is exported for them. The
four exported poses are only the one standard 16×32 frame used at the gate:
standard frame 0 for south and 1 for north (`src/data/object_events/
object_event_pic_tables.h`; `sAnimTable_Standard`). Their image/palette source
anchors are `src/data/object_events/object_event_graphics.h` and
`object_event_graphics_info.h`: Brendan uses `brendan/walking.png` plus
`brendan.pal`; Scientist 1 uses `scientist_1.png` plus `npc_3.pal`; Woman 1
and Fat Man use their named PNGs plus shared `npc_1.pal`.

## Still owned by a later renderer

This data does not include field-script execution, object/event task timing,
window composition, text printing, audio, or palette fades. A terminal
renderer can reuse the already-extracted standard message frame
(`prebattle-room-msgbox.json`) and the existing font/charmap artifacts, then
compose them above this field map according to source window/task behavior.
