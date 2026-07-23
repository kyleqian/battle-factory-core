# S8 OFF — player-options popup probe

Bounded evidence only; no runtime or trace changes. Profile: `battle-scene-off`.
The committed input prefix is `tools/compare/traces-groundtruth/battle1-swapyes-a.json`,
through segment 148 inclusive (ends at tick 29700); its player-choice `A` is
then at tick 29701. Here, relative offset `+0` is tick **29702**, so the
requested popup frame is **29760 / +58**.

## Reproduction

Use the exact ground-truth segments, retain `segments.slice(0, 149)`, append
the 29701 player-choice A plus an idle/input tail, and send that JSON to:

```sh
node -e '<derive trace; set oracleProfile and captureFrames>' | \
  bin/oracle --profile battle-scene-off run /dev/stdin
```

Dense baseline capture 29758--29880 (no tail input) and the three one-frame
edge probes below were run fresh. This preserves the committed prefix and
creates no acceptance trace or oracle-derived runtime asset.

## Pinned result

| oracle tick | offset | observation |
| --- | ---: | --- |
| 29757 | +55 | B is rejected: the dense baseline remains unchanged through the popup draw; source says the same `monPicAnimating` guard rejects A/DOWN here. |
| 29758 | +56 | first input-ready edge. A is accepted (default `SUMMARY`); first changed presentation frame is 29764. B is accepted; its first changed presentation frame is 29759. |
| 29760 | +58 | first visible popup draw: `SUMMARY`, `SWAP`, `RECHOOSE`; default cursor is `SUMMARY`. The immediately following frame, 29761, is the settled composed popup. A at this exact edge is also accepted, with the first response at 29766. |
| 29781 | +79 | committed-prefix DOWN edge is accepted; its menu-cursor response first displays at 29802 (+80), selecting `SWAP`. |
| 29801 | +99 | committed-prefix A edge is accepted on `SWAP`; 29802 is the first close/switch presentation frame. |

The fixed output-window hashes that distinguish the initial draw are
29758--29759 `9c4b02f6…`, 29760 `fc8e71ab…`, and 29761--29764
`de35a010…`; these are probe evidence only, not assets. The long visible
idle’s intermittent hash changes are the existing species-name breathe, not
popup redraws.

## Source path and next boundary

`Task_OpenMonPic` opens WIN0 as 1 pixel, shows BG3, then expands WIN0V by
four pixels each task frame before creating the mon sprite
(`battle_factory_screen.c:4202-4247`). `Swap_Task_HandleMenu` waits for that
animation, calls `Swap_ShowMenuOptions`, and immediately enters
`STATE_MENU_HANDLE_INPUT` (`2585-2629`): this explains the +56 controller
gate preceding the +58 visible tilemap frame.

At the popup, A dispatches `menuCursorPos` (`3983-3986`). The default calls
`Swap_OptionSummary` (`3998-4002`), changing the exact next controller phase
to `Swap_Task_OpenSummaryScreen`/`STATE_SUMMARY_FADE`; the first observable
palette/presentation change is six frames after the +56 A edge (29764). B
closes the mon pic, erases `SWAP_WIN_OPTIONS`, and sets the exact next
controller phase to `Swap_Task_ScreenInfoTransitionIn` (`2609-2618`), visible
one frame after the +56 B edge (29759). DOWN stays in `STATE_MENU_HANDLE_INPUT`
and calls `Swap_UpdateMenuCursorPosition(1)` (`2620-2626`). Selecting SWAP
calls `Swap_OptionSwap` (`3989-3996`), whose exact next controller phase is
`Swap_Task_SwitchPartyScreen` (`3195-3235`) and whose eventual party identity
changes to the enemy screen through `Swap_InitActions(SWAP_ENEMY_SCREEN)`.

## Smallest implementation slice

Implement only the menu seam after the already-green mon-picture reveal:
draw the three-option window at presentation +58, expose an input gate at
controller +56, use `SUMMARY` default, and reproduce B/DOWN/A dispatch into
the source-named phase transitions above. Keep mon-picture animation and
species-breathe clocks separate; do not use absolute oracle ticks or captured
frame assets.
