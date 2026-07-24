# Factory seventh-win ending — Battle Scene OFF probe

`tools/probe/stage-factory-seventh-win-ending-off.py` is the reproducible
OFF-profile evidence route for the Factory's regular first Level-50
seven-win ending. It stages a source-relative field handoff and then lets the
ordinary map loader plus Factory Lobby scripts render every message, fanfare,
save, and record prompt. It stores only per-frame RGB hashes and RAM facts;
it neither commits pixels nor participates in app rendering.

## Construction boundary

The probe replays the canonical `battle1-postwin-dense.json` prefix through
tick 29601, its source-owned post-win swap screen. It writes the successful
seventh-battle state that the battle-room script has established before the
ordinary singles warp:

| Write | Value | Source basis |
| --- | --- | --- |
| `challengeStatus` | `WON` (`3`) | battle-room `:100-105` |
| `curChallengeBattleNum` | `7` | battle-room `:100-103` |
| Factory singles Level-50 streak | `7` | battle-room `:98-100`; `IncrementWinStreak` |
| Battle Points | `0` | first-challenge balance, so `frontier_givepoints` can demonstrate its source-defined `0 → 3` mutation |
| field location | Factory Lobby `(26,31)`, no warp id, `(4,8)` | battle-room `:222-227` |
| last warp / callback | Factory Battle Room provenance; `CB2_LoadMap`, state `0` | ordinary field map loader |

The canonical draft bootstrap begins at the BP cap, so its value is changed
only to create the legitimate first-award precondition. No message/script
context, window, text printer, task, party, record flag, renderer/framebuffer,
or `sPerformedRentalSwap` is written. The active Factory Level-50 bit is
already set by the canonical prefix and is asserted rather than staged.

After the handoff the real path is `CB2_LoadMap → LoadMapInStepsLocal →`
Lobby `OnWarp`/`OnFrame` → `WonChallenge`. This is an oracle evidence probe,
not a claim of application pixel parity.

## Reproduce

```sh
scratch_dir=$(mktemp -d /tmp/pokebench-factory-seventh-win-XXXXXX)
python3 tools/run-mgba-probe.py "$scratch_dir/factory-seventh-win-ending-off.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/stage-factory-seventh-win-ending-off.py \
  "$scratch_dir/factory-seventh-win-ending-off.json"
```

The wrapper requires a fresh output and accepts mGBA's known teardown SIGSEGV
only after that output parses as JSON.

## Observed relative OFF window

Each result contains dense RGB hashes and field RAM. The three source-relative
controls are deliberately separate from the staged state:

- `regularCongratsGate` gives no input through +1200: status remains `WON`,
  battle number/streak remain `7`, active flags remain `0x100`, and BP remains
  `0`.
- `awardGate` gives only A at +300, releasing the regular congratulations
  default message and opening the award default message. At +1200 it still has
  `WON` and `0` BP, pinning the separate award input gate.
- `fullToRecordPromptAndB` uses A at +300, +1100, +2200, and +3500. The first
  BP mutation is exactly +2201 and is `0 → 3`. No input is sent for the
  `MSGBOX_GETPOINTS` fanfare/wait path. The +3500 A releases the exchange/save
  message's source page break.

At +3549 the real lobby code restores the saved party (the live and saved
party hashes become equal), clears challenge status `3 → 0`, and retains
Factory singles Level-50 active flags `0x100`, battle number `7`, streak `7`,
rents `0`, and BP `3`. B at +4400 is therefore after the restore/save
milestone, on the later record-prompt branch; its input and following hashes
are retained in the dense window. The first-run B frame hash is
`13a93330e23a8e71e70434ee66bf63d55d66ca6cf91c5c3a90286d13ad698e43`, with
the next frame changing to
`90d21c1d80b9f31ee944714b10d2f1c2b62227da4a5fe12623f9b92ab379d335`.

No terminal-only image, absolute-tick rendering rule, or oracle framebuffer
is exported to the production application.

Two fresh wrapper runs produced byte-identical evidence JSON (SHA-256
`975f916752da2d8b33b201372203921ad1d033432bed3cab06f6e6e0205f637d`),
including every captured RGB hash and RAM sample.
