# Turn-5 Battle Scene OFF reader set

This additive evidence set supplies the explicit Scene-OFF readers required
by `docs/turn1-4-epoch-prep.md` §3 before retiring `turn4Resolved`. Every
fixture sets `"oracleProfile": "battle-scene-off"`, copies the complete
canonical controller `segments` from `tools/compare/traces/turn7-menu.json`
unchanged, and uses stride-1 `captureFrames` at or below the oracle's
256-capture per-file limit.

The deliberate idle gaps 5401-5925 and 6996-7304 contain no transition or
reader boundary. The active turn-5 evidence is gapless from 5926 through
6995; the post-confirm portion is independently gapless from 5968 through
6995.

## Fixtures and live comparison results

| Fixture | Captures | Boundary ticks covered | `npm run compare -- <trace> --summary` |
| --- | ---: | --- | ---: |
| `tools/compare/fixtures/turn5-reset-off.json` | 51 (5350-5400) | post-turn-4 handler install 5351, reset/first input 5352, HP 88/1, fresh-bounce dwell | **51 exact / 0 mismatch** |
| `tools/compare/fixtures/turn5-menu-off.json` | 42 (5926-5967) | action A 5926-5927, DMA hold, FIGHT reveal and dwell, slot-0 PP `[7,20,19,10]`, confirm A 5958-5959, `gCurrentMove` ENDEAVOR edge 5965 | **7 exact / 35 mismatch** |
| `tools/compare/fixtures/turn5-endeavor-off.json` | 254 (5968-6221) | ENDEAVOR kickoff/content, both HP overlays, shared bounce freeze, and continuous handoff into the following move window | **54 exact / 200 mismatch** |
| `tools/compare/fixtures/turn5-rockslide-off.json` | 256 (6222-6477) | ROCK_SLIDE tail including fatal HP commit 6285; faint sink 6360, healthbox gone 6377, faint text 6378-6397, first dismiss eligibility 6398 and cursor 6399 | **7 exact / 249 mismatch** |
| `tools/compare/fixtures/turn5-faint-off.json` | 121 (6478-6598) | continued faint wait, canonical dismiss A 6560-6561 (accepted 6561), controller completion 6563, icon-bar continuation 6588 | **56 exact / 65 mismatch** |
| `tools/compare/fixtures/turn5-switch-off.json` | 252 (6599-6850) | replacement species/HP commit 6684, Pidgeotto materialize/settle through 6786, switch controller completion 6804, resumed end-turn script 6815 | **164 exact / 88 mismatch** |
| `tools/compare/fixtures/turn5-sitrus-off.json` | 145 (6851-6995) | Sitrus message 6851-6885, displayed heal 6953-6982, text clear 6982, semantic completion 6987-6988, handler ready 6994, full menu/first accepted input 6995 | **0 exact / 145 mismatch** |
| `tools/compare/fixtures/turn6-menu-off.json` | 47 (7305-7351) | canonical turn-6 action A 7312-7313 (accepted 7313), choose-move request 7314 with PP `[6,20,19,10]`, handler ready 7317, first complete submenu 7318, confirm A 7344-7345 | **12 exact / 35 mismatch** |

The current engine therefore matches **351/1168** captures and mismatches
**817/1168**. These mismatches are banked findings only; this evidence step
does not change app behavior or re-time the existing Scene-ON pins.

## Verification

Each fixture was run independently against the live Scene-OFF oracle:

```sh
bin/oracle run <trace> -o <fresh-output> --quiet
npm run compare -- <trace> --summary
```

For every fixture, `<fresh-output>/manifest.json` contained exactly the same
number of captures as the trace's `captureFrames.length`: respectively
**51, 42, 254, 256, 121, 252, 145, and 47**. A structural check also proved
that every capture list is stride 1, every count is at most 256, and every
controller segment array equals the canonical `turn7-menu.json` array.

The future turn-4 retirement acceptance total is therefore **512 + N**, where
**N = 1168** (that is, **1680 total captures**).
