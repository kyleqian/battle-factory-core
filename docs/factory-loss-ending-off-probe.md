# Factory loss ending — Battle Scene OFF probe

`tools/probe/stage-factory-loss-ending-off.py` is the reproducible OFF-profile
terminal-loss evidence route. It deliberately stages only the field handoff;
by default it stores hashes only. The opt-in comparison path writes RGB into
a fresh temporary directory; those pixels are never committed or imported by
production rendering.

## Construction

The probe replays the canonical `battle1-postwin-dense.json` prefix through
tick 29601, its source-owned Battle-1 swap screen. It does not replay a later
battle or change an oracle bootstrap snapshot. It then writes exactly the
state that `BattleFrontier_BattleFactoryBattleRoom_EventScript_WarpToLobbyLost`
would have established before its normal single-mode lobby warp:

| write | value | source basis |
| --- | --- | --- |
| `gSaveBlock2Ptr + 0xCA8` | `CHALLENGE_STATUS_LOST` (`4`) | battle-room script lines 88–90 |
| `gSaveBlock1Ptr->location` | Factory Lobby map `(group 26, map 31)`, no warp id, `(4,8)` | battle-room script lines 222–227; `map_groups.h` |
| `gLastUsedWarp` | Factory Battle Room `(26,33)` | normal warp provenance, `overworld.c:540–546` |
| `gMain.callback2/state` | `CB2_LoadMap`, `0` | ordinary field map loader, `overworld.c:1572–1587` |

No message pointer, script context, text/window task, party, challenge battle
number, active flag, sprite, palette, or framebuffer is written. After that
seam, the real `CB2_LoadMap → LoadMapInStepsLocal` path loads the lobby;
its `OnWarp` and `OnFrame` scripts select `LostChallenge`, so normal source
script code owns all terminal rendering and input.

## Reproduce

```sh
scratch_dir=$(mktemp -d /tmp/pokebench-factory-loss-XXXXXX)
python3 tools/run-mgba-probe.py "$scratch_dir/factory-loss-ending-off.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/stage-factory-loss-ending-off.py "$scratch_dir/factory-loss-ending-off.json"
```

The wrapper accepts mGBA's known teardown SIGSEGV only after validating the
fresh output JSON. The JSON retains every one of 720 relative frames as raw
RGB hashes plus map/status/controller RAM; it contains no pixel assets.

The dense app comparison owns its own fresh scratch directory and runs the
same wrapped probe:

```sh
npm run compare:factory-terminal-loss
```

`tools/compare/fixtures/factory-terminal-loss-off.json` pins the exact
relative +1..+210 window and A releases at +80/+160. The helper compares all
210 raw frames, then discards the scratch location with normal OS temporary
storage lifecycle; the application renders only source-extracted map, NPC,
window, arrow, and font data.

## Observed OFF window (fresh run, 2026-07-23)

- Relative frames 1–10 are the real map-loader progression; frame 13 begins
  the lobby's loss-message composition.
- The exact source-extracted loss message is: “Thank you for participating!
  I will return your POKéMON in exchange for our rental POKéMON. I must also
  save the event results. Please wait.” It is a field-message gate, not a
  bespoke Factory results screen.
- In the `idleToRecordPrompt` case, sparse A presses at relative 80 and 160
  release the message's two text waits. At relative 210, the source flow has
  completed party restore/save: `challengeStatus` changes `4 → 0` and active
  Factory-streak flags `0x100 → 0`, while battle number stays 1, Level-50
  Factory streak stays 1, and rents stay 0.
- That case then remains in the lobby through frame 720 with map `(26,31)`,
  status 0, active flags 0, and ordinary overworld callback/state. The field
  animation/cursor cadence remains live; “stable” here means a stable source
  endpoint, not a frozen framebuffer.
- The independent `recordPromptB` control uses the same path plus B at
  relative 600. Its hashes diverge on frame 601 and remain distinct through
  the captured tail, proving the source record-prompt B dispatch is an input
  gate rather than baked terminal chrome.

The terminal-local adapter and compositor match this complete opening window
at **210/210 exact**. It acknowledges the generic round controller's
`roundLost` command only at +210, after party restore/status clear, without
changing round rules or RNG. The later record question remains unimplemented.
