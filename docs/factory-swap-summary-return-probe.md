# S8 OFF — player swap SUMMARY return probe

This dev-only Battle Scene OFF checkpoint pins the source-defined SUMMARY
branch from the post-win player options popup. It adds no runtime controller,
renderer, image asset, app comparison claim, or canonical Battle 2 replay.
The compact handoff is
`src/data/gen/battle1-swap-summary-return-boundaries.json`.

The phrase "origin picker" here means the selected player-origin **options
popup**, not the raw three-ball `HandleChooseMons` row: SUMMARY is entered
from that popup and pret deliberately restores `Swap_Task_HandleMenu` after
return. The original ONIX selection and popup cursor are preserved.

## Reproduce

Use a fresh directory. The generator only references the deterministic
post-win prefix through the already-proven player options popup; it supplies
no pixel data. Every RAM run uses the teardown-safe wrapper.

```sh
taskdir=$(mktemp -d)
for scenario in menu-a-too-early open return-b-too-early return-b \
  picker-down-too-early first-picker-input
do
  node tools/probe/derive-swap-summary-return-trace.mjs "$scenario" \
    > "$taskdir/$scenario.json"
  python3 tools/run-mgba-probe.py "$taskdir/$scenario-ram.json" -- \
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
    tools/probe/dump-swap-summary-return.py "$taskdir/$scenario.json" \
    "$taskdir/$scenario-ram.json" 29750 29900
done
```

The wrapper validated fresh JSON for the six runs while accepting libmGBA's
known teardown SIGSEGV. The probe records callbacks, task states, fade state,
summary parameters, player party, rental IDs, and RNG—never PNGs or RGB data.

## Fresh OFF evidence

At tick 29759, `Swap_Task_HandleMenu` installs state 3 after it samples the
frame, so its A is rejected. The fresh A at **29760** enters
`Swap_Task_OpenSummaryScreen` state 6. Its source-relative milestones are:

| Tick | Ground-truth state |
| ---: | --- |
| 29760 | accepted default `SUMMARY`; source task state 6 |
| 29761 | screen fade has completed; state 7 frees swap picker windows/sprites |
| 29783 | state 8 prepares the summary callback |
| 29784 | `CB2_InitSummaryScreen`; the exact source call supplies mode 0 (`SUMMARY_MODE_NORMAL`), `gPlayerParty`, current index 0, max index 2; `fromSummaryScreen=TRUE` |
| 29800 | `Summary_Task_HandleInput` exists, but its entry fade remains active |
| 29822 | fade is visibly/state-wise inactive only after input sampling; B here is rejected |
| 29823 | first accepted summary B starts close fade |
| 29845 | normal summary close invokes `CB2_InitSwapScreen`, with `gLastViewedMonIndex=0` |
| 29864 | player popup reconstructed: `Swap_Task_HandleMenu` state 3, ONIX cursor 0, menu cursor 0 (`SUMMARY`) |
| 29884 | first fresh popup input: DOWN moves menu cursor `SUMMARY -> SWAP`; DOWN at 29883 is rejected during return fade |

`CB2_InitSwapScreen` intentionally rebuilds screen resources, calls
`Swap_ShowSummaryMonSprite`, then clears `fromSummaryScreen` while drawing the
options popup. This is why the return is the same selected player options
origin, rather than a raw three-ball picker or a duplicate copy of the old
screen.

The player party remains ONIX/MAGBY/BAYLEEF with personalities
1205102525/1534575931/1550278706, and rental IDs remain
`[156,149,180,188,184,135]`, across every recorded boundary. No swap result,
party/rental mutation, or selection RNG operation occurs. `gRngValue` changes
only through normal VBlank/sprite activity: `0x9d0287e2` at accepted open,
`0x65a2eb17` at summary handoff, `0x247d935c` at accepted close,
`0xfdc5d1fa` at the swap callback return, and `0x59ab124b` at the returned
popup's first input-ready tick.

## Source contract

`Swap_OptionSummary` sets `STATE_SUMMARY_FADE` and delegates to
`Swap_Task_OpenSummaryScreen` (`battle_factory_screen.c:2378-2405,
3978-4004`). The cleanup state removes swap chrome before calling
`ShowPokemonSummaryScreen(SUMMARY_MODE_NORMAL, gPlayerParty, cursorPos, 2,
CB2_InitSwapScreen)`. `CloseSummaryScreen` stores the final viewed mon index
and invokes that callback (`pokemon_summary_screen.c:1509-1521`). Finally,
the swap initializer restores that index, keeps player action mode, and starts
`Swap_Task_HandleMenu` for the source-owned options-popup reconstruction
(`battle_factory_screen.c:3273-3433, 3882-3895`).
