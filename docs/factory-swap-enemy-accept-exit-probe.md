# S8 OFF — enemy accept prompt exit probe

Evidence checkpoint only. This adds no runtime/controller/rendering change and
makes no app pixel claim. It continues the canonical Battle Scene OFF enemy
picker route from `battle1-swapyes-b.json`; the compact ground-truth ledger is
`src/data/gen/battle1-swap-accept-exit-boundaries.json`.

## Reproduce

The generator retains the committed route through SWAP at tick 29802, selects
GROVYLE at the earliest usable enemy-picker edge, then adds only the named
prompt control. It produces capture windows for the oracle, not renderer
assets. Use a fresh scratch directory.

```sh
taskdir=$(mktemp -d)
for scenario in accept-state5-a accept-yes accept-no accept-b
do
  node tools/probe/derive-swap-enemy-picker-trace.mjs "$scenario" \
    > "$taskdir/$scenario.json"
  bin/oracle --profile battle-scene-off run "$taskdir/$scenario.json" \
    -o "$taskdir/$scenario-oracle"
  python3 tools/run-mgba-probe.py "$taskdir/$scenario-ram.json" -- \
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
    tools/probe/dump-swap-enemy-picker.py "$taskdir/$scenario.json" \
    "$taskdir/$scenario-ram.json" 29970 30100
done
```

`run-mgba-probe.py` validates each JSON result before accepting mGBA's known
teardown SIGSEGV. The probe decodes only selected party-record fields from
RAM; it neither reads nor stores framebuffers.

## Oracle/RAM boundary ledger

The last state-producing frame is **29999**:
`Swap_Task_HandleYesNo` is state 5, cursor YES, selected enemy slot 0, and
`monSwapped=1`. As with the prior picker boundary, a task installed during a
frame cannot process that frame's key edge: the first accepted prompt control
is therefore tick **30000**. An attempted control at the state-5 snapshot
itself is rejected. `Swap_Task_FadeSpeciesName` remains independently alive
beside the main task through every prompt/return branch.

| branch | controls | immediate callback path | next stable/input-ready boundary | party/result |
| --- | --- | --- | --- | --- |
| YES | A at 30000 (default YES) | `Swap_HandleAcceptMonResponse` 30000 → `Swap_Task_Exit` 30001 | `CB2_ReturnToFieldContinueScript` 30041 | `gSpecialVar_Result=FALSE` at 30020; `CopySwappedMonData` at **30021** replaces player slot 0 ONIX (species 95, PID 1205102525) with enemy slot 0 GROVYLE (species 278 / rental monId 188, PID 1094072807), friendship 0. |
| NO | DOWN at 30000, delayed A at 30020 | `Swap_HandleAcceptMonResponse` 30020 → `Swap_Task_ScreenInfoTransitionIn` 30021 | enemy `Swap_Task_HandleChooseMons` state 1 at **30087** | `gSpecialVar_Result` stays TRUE; player slot 0 remains ONIX. |
| B | delayed B at 30020 | `Swap_HandleAcceptMonResponse` 30020 → `Swap_Task_ScreenInfoTransitionIn` 30021 | enemy `Swap_Task_HandleChooseMons` state 1 at **30087** | `gSpecialVar_Result` stays TRUE; player slot 0 remains ONIX. |

The NO/B return preserves `inEnemyScreen=1`, `cursorPos=0`,
`playerMonId=0`, and the selected enemy identity (GROVYLE). `yesNoCursorPos`
is 1 after NO and 0 after B; it is stale popup state, not a return-picker
cursor. Notably, `monSwapped` also remains 1 after an accept prompt has been
opened even on NO/B. It is *not* the commit bit: only the YES follow-up
enters `Swap_Task_Exit`, whose state 1 calls `CopySwappedMonData`.

## Source ownership

`Swap_AskAcceptMon` opens the mon picture and sets `monSwapped=TRUE` before
installing `Swap_Task_HandleYesNo` (`battle_factory_screen.c:2571-2582`).
`Swap_Task_HandleYesNo` dispatches A-on-YES without erasing the popup; A on
NO and B erase it before calling `Swap_HandleAcceptMonResponse`
(`2465-2520`). That callback always starts the mon-picture close, then chooses
`Swap_Task_Exit` only when `tSaidYes`; otherwise it assigns the generic
screen-info transition back to enemy `HandleChooseMons` input (`2553-2569`).

`Swap_Task_Exit` sets the script result FALSE at state 0, copies the selected
enemy party record at state 1, and only then starts its palette fade/state 2
(`2409-2456`). Thus the RAM-pinned mutation at 30021 is the precise commit
point, not prompt display, `monSwapped`, or YES's button edge. The selected
ball/species fade task remains separately owned throughout; it is destroyed
only on the YES exit teardown, while NO/B retain it through the restored
picker.

The next implementation slice, if any, must be a state-driven accept-prompt
branch/return seam with its own dense app comparison. This evidence does not
authorize an absolute-tick rendering rule.
