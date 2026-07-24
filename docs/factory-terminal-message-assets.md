# Factory terminal messages and record prompt

This source-only companion to [factory-lobby-terminal-assets.md](factory-lobby-terminal-assets.md) fills the data gap after the Lobby map/NPC extraction. It creates no terminal-specific artwork because the regular loss and seventh-win branches use ordinary field UI.

`tools/extract/extract-factory-terminal-messages.ts` writes `src/data/gen/factory-terminal-messages.json`; pass `--out-dir <directory>` to regenerate it away from the worktree. The Tier-1 test regenerates it byte-for-byte.

## Reused, byte-identical assets

The terminal renderer must reuse these existing source extracts, not make a terminal bitmap:

- `prebattle-room-msgbox.json`: `graphics/text_window/message_box.png`, loaded by `LoadMessageBoxAndBorderGfx` for the field dialogue frame.
- `prebattle-room-std-window.json`: options frame 0, `graphics/text_window/1.png`, loaded by `LoadUserWindowBorderGfx` for `MULTI_YESNO`.
- `font-normal.json` and `charmap.json`: `FONT_NORMAL`, used by both field messages and menu text.

The field message window is window 0 at tile `(2,15)`, `27×4` content tiles with palette 15/base tile `0x194`; its printer starts at `(0,0)` with dark-gray/white/light-gray roles `(2,1,3)` (`src/menu.c:78-99,195-201`; `src/field_message_box.c:21-31,95-110`).

## Terminal source contract

`BattleFrontier_BattleFactoryLobby/scripts.inc:40-94` selects these messages:

- Loss: `ReturnMonsSaveResults`, then restore/save operations and the record prompt.
- Regular seventh win: congratulations, award, `frontier_givepoints`, the shared `ObtainedXBattlePoints` GETPOINTS message, exchange/save, then the record prompt.

The templates and exact script operations are generated from `BattleFactoryLobby/scripts.inc:372-467`; `BattleFrontier_Text_ObtainedXBattlePoints` is defined at `BattleTowerLobby/scripts.inc:1336-1337`. `MSGBOX_DEFAULT` and `MSGBOX_GETPOINTS` differ exactly as represented in the artifact (`std_msgbox.inc:18-35`): GETPOINTS waits for the BP fanfare and does not add a button press of its own.

## Record prompt menu

`AskRecordBattle` executes `multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE`. `MULTI_YESNO` is source id 94 and contains `YES`, `NO` (`src/data/script_menu.h:608-611`). `DrawMultichoiceMenu` measures `YES` as 18 px with `FONT_NORMAL`, converts it to a 4-tile-wide content window, and does not shift requested left 20; the 2 choices make it 4 tiles high (`src/script_menu.c:92-123,726-770`). Its standard-frame outer rectangle is therefore `(19,7)`, `6×6` tiles.

The default selection is index 1 (`NO`), with the normal menu arrow `▶` at local `(0,17)` versus `(0,1)` for YES. The menu accepts input after its two-frame delay, does not wrap because it has two choices, and lets B dispatch `MULTI_B_PRESSED` (`src/script_menu.c:125-176`; `src/menu.c:927-961,1581-1593`).

## Still owned by a renderer/controller

This extraction intentionally provides no timing model, text printer implementation, save/audio behavior, status mutations, fading, field map composition, or choice dispatch. A terminal implementation needs to sequence the generated operations relative to its map/script handoff, render the ordinary field text printer and menu atop the existing Lobby map, supply `{PLAYER}`/`{STR_VAR_1}` placeholders for the BP result, and implement no audio here.
