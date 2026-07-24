# Factory terminal presentation boundaries — Battle Scene OFF

`tools/probe/stage-factory-terminal-boundaries-off.py` adds a source-relative
RAM/task/text-printer pass on top of the existing legitimate loss and first
regular seventh-win field handoffs. Its concise observed boundaries are in
`src/data/gen/factory-terminal-boundaries-off.json`; the tool samples a raw
RGB888 SHA-256 and source-owned RAM state every frame, but never writes PNG or
RGB assets and is not usable by production rendering.

The field loader occupies relative frames 1--10. The field text printer first
appears at +38 and `Task_DrawFieldMessage` performs its source state-1
`DrawDialogueFrame` on +39. Thus map load, dialogue-frame copy, and first
glyph are separate renderer boundaries rather than a terminal-specific static
screen.

## Seventh win

The regular congrats printer runs +38--101; its `MSGBOX_DEFAULT` release is
the source input at +300. The award starts at +303, reaches the text printer's
scroll-with-down-arrow wait at +369--1099, and its distinct DEFAULT button
gate is ready after the printer finishes at +1141; the +2200 A releases that
gate. `frontier_givepoints` changes BP exactly at +2201 (0 to 3). The
following GETPOINTS text runs +2201--2236 and completes at +2237 with **no
button**: `waitfanfare`/`waitmessage` are source completion waits, not an
input gate.

The exchange/save text starts +2518, its `RENDER_STATE_CLEAR` page wait spans
+2571--3499, and status clears after party restore/save at +3549. The record
question begins at +3716 and has its own scroll/page wait +3780--4399. A at
+4400 releases that text wait; only then does `DrawMultichoiceMenu` create
the default-NO MULTI_YESNO content window at +4422. Its two-frame delay has
post-task ready boundary +4423: A at +4422 is rejected (delay 1, result 255),
while A at +4424 accepts default NO (result 1) and removes the task.

## Loss

Loss shares +38 first glyph and +39 dialogue-frame draw. Its return/save
text has clear-page waits +68--79 and +142--159, released by the source A
inputs at +80 and +160. Party restore/save clears status at +210 without a BP
mutation. The later record question prints +380--443, waits +444--599, and
the A at +600 creates MULTI_YESNO at +622. The same one-frame post-ready
relationship holds: +622 A is rejected; +624 A accepts default NO.

The menu's active `gWindows` content template is `{ id: 1, bg: 0, left: 21,
top: 9, width: 4, height: 4, palette: 15, baseBlock: 100 }`; the standard
frame is owned by the normal multichoice/window implementation, not a special
Factory asset.

## Reproduce

Use fresh outputs and the required wrapper. The six short controls avoid
retaining multiple mGBA sessions in one process; `all`/`all` remains available
for environments that can run the whole matrix together.

```sh
scratch_dir=$(mktemp -d /tmp/pokebench-factory-terminal-boundaries-XXXXXX)
FACTORY_TERMINAL_PROBE_SCOPE=seventhWin FACTORY_TERMINAL_PROBE_CONTROL=idle \
  python3 tools/run-mgba-probe.py "$scratch_dir/win-idle.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/stage-factory-terminal-boundaries-off.py "$scratch_dir/win-idle.json"
```

Repeat with scope `seventhWin`/`loss` and control `rejected`/`accepted`.
Each case replays the canonical `battle1-postwin-dense.json` prefix through
29601 then writes only the source-established battle result, lobby warp, and
`CB2_LoadMap` seam. It does not write message/script contexts, tasks, windows,
printers, party, record flags, or framebuffer state.

`bin/oracle symbols` exposes the public Save/task/window globals, but not the
source-static printer, message-mode, input-delay, script-context, or task
callback symbols. The probe obtains those addresses from the pinned ELF local
symbol table (`arm-none-eabi-nm -an`); this is a dev-time evidence limitation,
not runtime data or a production ABI.
