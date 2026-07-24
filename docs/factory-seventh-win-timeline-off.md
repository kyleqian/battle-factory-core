# Factory seventh-win terminal timeline (Battle Scene OFF)

`tools/probe/stage-factory-seventh-win-timeline-off.py` is a deterministic,
dev-only stage: it reuses the committed late Battle-1 prefix only to obtain
the normal Factory save/party context, then writes the state that the real
seventh win has already established and re-enters `CB2_LoadMap`. The retail
Factory Lobby `WonChallenge` script owns every subsequent visible action.

Run it only through the mGBA wrapper, with a fresh path:

```sh
scratch=$(mktemp -d)
py=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python3
"$py" tools/run-mgba-probe.py "$scratch/seventh-win.json" -- \
  "$py" tools/probe/stage-factory-seventh-win-timeline-off.py "$scratch/seventh-win.json"
```

The compact consumer fixture is
`src/data/gen/factory-seventh-win-timeline-off.json`. It is source- and
RAM-backed evidence, not a runtime asset or a screenshot lookup table.

Key handoff facts: normal congratulations print is +38..101; the source
award release at +2200 mutates 0 BP to 3 at +2201, begins `MSGBOX_GETPOINTS`,
and starts the 312-frame `MUS_OBTAIN_B_POINTS` fanfare counter. Its final
nonzero counter is +2512 and its first zero is +2513; the next exchange
message does not begin printing until +2518. Party restoration and Factory
challenge-status clear are the same +3549 operation. The delayed record
question reaches its shared default-NO menu at +4422, has delay zero at
+4423, and first accepts A at +4424 (result 1 / NO). A on +4422 is rejected.

Outside battle, VBlank owns the RNG. It is one Gen-3 LCG call/frame after the
map-loader setup, except source-owned initialization bursts of 3, 4, and 3
calls at +3, +4, and +34. The fixture also names only raw-RGB hashes that
remain identical for at least 50 frames; other apparent waits still animate
field sprites in nine-frame cycles and must not be treated as visual holds.
