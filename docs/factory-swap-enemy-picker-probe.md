# S8 OFF — enemy rental picker boundary probe

Evidence checkpoint only: no runtime, renderer, controller, or acceptance
trace changed. Profile is `battle-scene-off`; the unchanged source prefix is
`tools/compare/traces-groundtruth/battle1-swapyes-b.json`. The compact result
fixture is `src/data/gen/battle1-swap-enemy-picker-boundaries.json`.

## Reproduce

The trace generator preserves that committed route and limits captures to a
single named window. It does not contain framebuffer-derived assets.

```sh
taskdir=$(mktemp -d)
node tools/probe/derive-swap-enemy-picker-trace.mjs canonical \
  > "$taskdir/enemy-entry.json"
bin/oracle --profile battle-scene-off run "$taskdir/enemy-entry.json" \
  -o "$taskdir/enemy-entry"

python3 tools/run-mgba-probe.py "$taskdir/swap-picker.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-swap-enemy-picker.py \
  tools/compare/traces-groundtruth/battle1-swapyes-b.json \
  "$taskdir/swap-picker.json" 29780 30200
```

The three edge variants are `earliest-swap-a`, `earliest-picker-right`, and
`earliest-accept-a`; pass one as the generator's first argument. Each replay
was also run through `tools/run-mgba-probe.py`, which validated its JSON even
when libmGBA ended with its known teardown SIGSEGV.

## Oracle/RAM boundary ledger

All ticks are oracle trace ticks. The canonical route presses DOWN at 29781;
the menu cursor changes to SWAP at 29782. An A at **29782** is the earliest
post-DOWN SWAP selection: RAM records `Swap_Task_SwitchPartyScreen` state 0
at 29783. The unmodified route waits until A at 29801, so the equivalent
task begins at 29802.

| tick | RAM/source boundary |
| ---: | --- |
| 29802 | canonical `Swap_Task_SwitchPartyScreen` state 0 |
| 29823 | state 3 owns `Swap_Task_SlideCycleBalls`; the three ball-cycle flags progress independently |
| 29886 | `Swap_InitActions(SWAP_ENEMY_SCREEN)` has set `inEnemyScreen=1`, `cursorPos=0`, and `actionsCount=5` |
| 29887–29934 | `Swap_Task_ScreenInfoTransitionIn` runs the two action-button slides, text fade, and picker labels; it is not picker input-ready |
| 29935 | `Swap_Task_HandleChooseMons` state 1: first accepted picker input edge |
| 29936 | RIGHT at 29935 changes cursor 0 → 1; RIGHT at 29934 is rejected |
| 29975 | A at the first ready tick for eligible slot 0 reaches `Swap_AskAcceptMon` |
| 29976 | `Swap_Task_HandleYesNo` begins with `monSwapped=1` and opens the mon picture / `Accept this POKéMON?` path |
| 29999 | `Swap_Task_HandleYesNo` state 5: first accept-popup A/B/UP/DOWN input edge |

The canonical navigation probe still gives the picker sequence 0 → 1 → 2 →
1 → 0 at RIGHT 30001, RIGHT 30021, LEFT 30041, LEFT 30061. Its A at 30081
follows the same `Swap_ActionMon` exit path; the first accept UI task is
30121, and its prompt accepts input at 30145. These later values are delayed
only by the route's idle time, not a different UI mechanism.

The offered identity/order is fixed before the screen: rental slots 3–5 are
GROVYLE (`monId` 188), MURKROW (184), and PIDGEOTTO (135). The evidence
fixture mirrors the checked RAM values in
`src/data/gen/battle1-swap-rentalmons-dump.json`; `Swap_InitActions` does not
roll or reorder them. In this route the chosen player slot is ONIX (0), so
each offered species is eligible—`Swap_AlreadyHasSameSpecies` only rejects a
species held by either non-replaced player slot.

## Source-defined accept/exit boundary

`Swap_OptionSwap` closes the player mon picture, stores `playerMonId`, erases
the popup, and immediately installs `Swap_Task_SwitchPartyScreen`
(`reference/pokeemerald/src/battle_factory_screen.c:3989-3996`). Its state 3
waits for the ball slide and species fade, then calls
`Swap_InitActions(SWAP_ENEMY_SCREEN)`; state 4 enters
`Swap_Task_ScreenInfoTransitionIn` (`3196-3250`, `3961-3979`).

At an enemy ball, `Swap_ActionMon` routes eligible choices through
`Swap_Task_ScreenInfoTransitionOut` to `Swap_AskAcceptMon`; a duplicate keeps
the picker and shows its rejection message (`4039-4062`). `Swap_AskAcceptMon`
sets `monSwapped=TRUE`, opens the mon picture, prints the accept message, and
delegates to `Swap_Task_HandleYesNo` (`2465-2583`). In that prompt, A on YES
closes the mon picture and selects `Swap_Task_Exit`; A on NO or B erases the
popup and returns through `Swap_Task_ScreenInfoTransitionIn` to the enemy
picker. That YES/NO branch is the next distinct implementation boundary.

The only runtime-safe next slice is therefore state-driven enemy picker
presentation through `Swap_Task_HandleChooseMons` input plus the accept-prompt
handoff. It needs its own dense app comparison before any pixel claim; this
checkpoint makes none.
