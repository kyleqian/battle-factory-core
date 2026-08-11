# S8 OFF — player-options B-close → player-picker return

Bounded oracle/source evidence only; no runtime or acceptance-trace change.
Profile: `battle-scene-off`. This continues the committed
`battle1-swapyes-a.json` prefix through the player-choice `A` at tick 29702.

## Reproduction

The source trace's later popup controls are deliberately not reused. Retain
`segments.slice(0, 149)`, then append 57 idle frames, one `B`, 180 idle
frames, one delayed `RIGHT`, and 40 idle frames. Capture every frame
29759--29981:

```sh
node - <<'NODE' | bin/oracle --profile battle-scene-off run /dev/stdin -o /tmp/swap-b-close
const source = require('./tools/compare/traces-groundtruth/battle1-swapyes-a.json');
const segments = [...source.segments.slice(0, 149),
  { frames: 57, buttons: [] }, { frames: 1, buttons: ['B'] },
  { frames: 180, buttons: [] }, { frames: 1, buttons: ['RIGHT'] },
  { frames: 40, buttons: [] },
];
console.log(JSON.stringify({ oracleProfile: 'battle-scene-off', segments,
  captureFrames: Array.from({ length: 223 }, (_, i) => 29759 + i) }));
NODE
```

The RAM pass used the same derived segments with the generic task/register
pattern and was launched through `tools/run-mgba-probe.py`; it wrote valid
JSON before the known harmless mGBA teardown SIGSEGV.

## Exact edge and timeline

Offsets below are relative to the player-choice A's output frame, 29702.
The prior popup probe's `+56` is the **controller-state handoff**, not a
physical `JOY_NEW` sample: while `Task_OpenMonPic` finishes, the main task is
still `Swap_Task_HandleMenu/STATE_MENU_SHOW_OPTIONS`. At 29759 (`+57`) that
case shows the menu and stores `STATE_MENU_HANDLE_INPUT`; only the following
frame can consume a new key. A B segment on 29758 or 29759 is therefore
discarded. The first accepted B segment is 29760 (`+58`), with its first
different framebuffer at 29761.

| tick | offset | controller / presentation fact |
| --- | ---: | --- |
| 29759 | +57 | `Swap_Task_HandleMenu` reaches `STATE_MENU_HANDLE_INPUT`; popup is now logically ready for the next sampled edge. |
| 29760 | +58 | B is accepted. `CloseMonPic(..., TRUE)` creates and immediately advances `Task_CloseMonPic`; the parent becomes `Swap_Task_ScreenInfoTransitionIn`, state 0. |
| 29761--29767 | +59--+65 | close task advances WIN0V from `(36,92)` to `(64,65)` in four-pixel steps. The first changed frame is 29761. |
| 29768--29769 | +66--+67 | close task is gone; then WIN0 is disabled after the background sprite's close handoff. |
| 29779 | +77 | `SpriteCB_CloseMonPic` has cleared `monPicAnimating`; transition-in begins its CANCEL button slide. |
| 29787 | +85 | transition-in begins the text-palette fade; it clears at 29810. |
| 29810--29814 | +108--+112 | transition-in prints the action strings/message/category/species and completes states 5--8. |
| 29815 | +113 | parent changes to `Swap_Task_HandleChooseMons/STATE_CHOOSE_MONS_HANDLE_INPUT`: restored player picker. |
| 29816 | +114 | first subsequent physical input sample can be consumed. Delayed RIGHT at 29941 changes `cursorPos` 0→1, proving the restored picker is input-ready. |

The captured B trace differs from an identical no-B baseline continuously
from 29761 onward (including the normal per-frame selected-ball/species-name
activity); no capture was thinned to make a comparison claim.

## Source/RAM ownership

`Swap_Task_HandleMenu` B branch (`battle_factory_screen.c:2601-2618`) erases
`SWAP_WIN_OPTIONS`, starts `CloseMonPic`, and installs the exact generic
follow-up task. `Task_CloseMonPic` (`4250-4291`) owns only the WIN0 close and
the selected-mon-picture background affine callback. RAM recorded task
callback pointers `Task_CloseMonPic` from 29760--29767 and
`Swap_Task_ScreenInfoTransitionIn` from 29760 until it became
`Swap_Task_HandleChooseMons` at 29815; WIN0V and DISPCNT followed the source
steps above.

The ball clock is not a close/return epoch: the existing selected ball sprite
keeps its `SpriteCB_Pokeball` callback and selected-palette rock/random
restart behavior throughout. Likewise the existing `Swap_Task_FadeSpeciesName`
task remains allocated; transition-in state 8 merely re-enables
`fadeSpeciesNameActive` after printing the transition species text. It does
not create a new ball task or reset a species-breathe epoch. A presentation
implementation must keep those clocks phase-/sprite-owned rather than keying
them to absolute oracle ticks or to the B edge.

## Boundary after this slice

This path ends at the ordinary player-picker input loop. The next distinct
presentation boundary is a newly accepted player-picker A, which takes
`Swap_ActionMon` through `Swap_Task_ScreenInfoTransitionOut` and back into
`Swap_Task_HandleMenu` for another mon-picture/options presentation. It is
outside this evidence step.
