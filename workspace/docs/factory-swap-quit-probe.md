# S8 OFF — swap quit/keep-party boundaries

This is a dev-only, Battle Scene OFF evidence checkpoint for the reusable
quit-swapping interaction. It changes no runtime/controller/presentation code
and does not extend a canonical Battle 2 turn. The compact handoff is
`src/data/gen/factory-swap-quit-boundaries.json`; its input fixture is
`tools/probe/derive-swap-quit-trace.mjs` and its RAM/framebuffer probe is
`tools/probe/dump-swap-quit.py`.

## Reproduce

Use a fresh directory and the teardown-safe wrapper. The generator derives
only the deterministic entry from `battle1-swapyes-a.json`; it supplies no
image data and captures at most 256 frames per run.

```sh
taskdir=$(mktemp -d)
node tools/probe/derive-swap-quit-trace.mjs player-b-yes > "$taskdir/yes.json"
python3 tools/run-mgba-probe.py "$taskdir/yes-ram.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-swap-quit.py "$taskdir/yes.json" \
  "$taskdir/yes-ram.json" 29696 29900
```

The named routes are `player-b-too-early`, `player-b`,
`player-b-prompt-a-too-early`, `player-b-yes`, `player-b-no`, and
`player-b-return-b`. The wrapper validates the newly written JSON before
accepting libmGBA's known teardown SIGSEGV.

## Fresh OFF evidence

The player picker is ONIX (species 95, personality 1205102525), cursor 0,
with four actions. A B during the offer-YES entry fade at **29650** does
nothing; after release, B at **29702** installs
`Swap_Task_ScreenInfoTransitionOut` state 0. The phase-relative path is:

| Tick | Owner / visible boundary | RGB888 SHA-256 where sampled |
| ---: | --- | --- |
| 29702 | accepted picker B; transition-out state 0 | `438c21d92cf2234cdb2df9a2fc9a644c27040daebca56cb08574212b287311d4` |
| 29716 | first transition framebuffer change | `3021c0ceb1e2522dbed0fd78c31291524ea07b9da46064cfb6c7685d4ebae142` |
| 29735 | `Swap_AskQuitSwapping`: prints `Quit swapping?` | `9da2316f5725ae4c78414d614eee787c5dd21b6807ae5ebeb65062157d6e0408` |
| 29736 | `Swap_Task_HandleYesNo` state 4: YES/NO drawn | `7b78031d6f061c3f7609cb201bad71a2e911315e4d234a0e9535a45ae000cd64` |
| 29737 | state 5, cursor defaults YES; physical input is still next-frame | `4e16acf986f25e29513ffbea0f3c077fe76b2d76dfc8a8bd7e22054cfb069cae` |
| 29738 | first accepted A/B/UP/DOWN edge | branch-dependent |

The prompt edge pair is strict: A at 29737 is discarded; A at 29738 follows
the default YES branch. It becomes `Swap_HandleQuitSwappingResponse` on 29738,
`Swap_Task_Exit` on 29739, and `CB2_ReturnToFieldContinueScript` on **29760**.
`gSpecialVar_Result` remains TRUE and ONIX is unchanged: quit YES means
*keep the party*, not accept a swap.

For the return branches, DOWN at 29738 then A at 29758 (NO), or B at 29758,
both enter `Swap_Task_ScreenInfoTransitionIn` on 29759 and restore the
originating player picker input loop on **29796**. Both retain the same party
identity and TRUE script result. The return's sampled framebuffer is the
ordinary player picker hash
`438c21d92cf2234cdb2df9a2fc9a644c27040daebca56cb08574212b287311d4`.

## Source task graph, variants, and ownership

`Swap_Task_HandleChooseMons` routes picker B through
`Swap_Task_ScreenInfoTransitionOut` to `Swap_AskQuitSwapping`. The latter
prints `gText_QuitSwapping`, clears `monSwapped`, and delegates to the common
YES/NO task. YES invokes `Swap_Task_Exit`; because `monSwapped == FALSE`, its
state 0 writes `gSpecialVar_Result = TRUE` and skips `CopySwappedMonData`.
NO/B invoke the shared transition-in task with the picker input state.

Player CANCEL and enemy CANCEL both dispatch `Swap_ActionCancel`, which
installs that exact same quit callback and transition-out follow-up. Enemy B
uses the same B branch in `Swap_Task_HandleChooseMons`; only its two-button
slide chrome differs because `inEnemyScreen` is true. This source proves the
shared interaction without adding a second canonical replay. The unprobed
enemy-specific presentation remainder is bounded to those `PKMN FOR SWAP` +
CANCEL slide timings, not prompt/result/mutation semantics.

RNG remains owned by the normal VBlank/sprite callbacks: the fresh probe sees
`gRngValue` `0xfe6d3280` at accepted B, `0x79a7c9b5` at prompt-ready, and
`0x989e3bd3` at returned picker. Quit itself performs no selection, party,
or rental mutation and has no extra RNG operation to model.
