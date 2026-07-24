# S8 OFF — enemy-origin swap quit chrome probe

Evidence checkpoint only. It changes no controller, presentation, renderer,
trace acceptance, or production data. The compact ledger is
`src/data/gen/battle1-swap-enemy-quit-boundaries.json`; the fixture generator
and mGBA RAM probe are `tools/probe/derive-swap-enemy-quit-trace.mjs` and
`tools/probe/dump-swap-enemy-quit.py`.

## Reproduce

Use a fresh directory and the teardown-safe mGBA wrapper. Each scenario
derives only the established Battle Scene OFF post-win prefix through its
input-ready enemy picker; it does not replay Battle 2 or contain image data.

```sh
taskdir=$(mktemp -d)
for scenario in enemy-b-too-early enemy-b-prompt-a-too-early enemy-b-yes \
  enemy-b-no enemy-b-return-b enemy-b-no-input-rejected \
  enemy-b-no-first-input enemy-cancel-yes
do
  node tools/probe/derive-swap-enemy-quit-trace.mjs "$scenario" \
    > "$taskdir/$scenario.json"
done

python3 tools/run-mgba-probe.py "$taskdir/b-yes-ram.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-swap-enemy-quit.py "$taskdir/enemy-b-yes.json" \
  "$taskdir/b-yes-ram.json" 29935,29936,29961,29967,29975,29976,29977,29978,29979,30000
```

The wrapper validated every fresh JSON result while accepting mGBA's known
teardown SIGSEGV. It records task/RAM state and raw-RGB hashes only—no PNG or
framebuffer asset is committed.

## Pinned OFF result

The enemy picker installs `HandleChooseMons` on 29935: B there is rejected;
B at **29936** installs `ScreenInfoTransitionOut`. Unlike player-origin quit,
the source's enemy-only chrome removes `PKMN FOR SWAP` at **29961**, then
starts the delayed CANCEL slide at **29967**. The shared prompt prints at
29975, draws YES/NO at 29976, and only accepts input after the 29977
installation frame. Thus A at 29977 is rejected while A at **29978** takes
default YES; it reaches `CB2_ReturnToFieldContinueScript` at **30000**.

DOWN at 29978 then A at 29998 (NO), or B at 29998, both begin the reverse
enemy transition at **29999**. It starts `PKMN FOR SWAP` at 30000, begins
CANCEL at **30011**, and reinstalls enemy `HandleChooseMons` at 30047. RIGHT
at that install frame is rejected; RIGHT at **30048** is the first fresh
input and moves the cursor 0 → 1. This is the variant-specific reconstruction
that player-origin evidence cannot establish.

Enemy CANCEL is separately exercised: DOWN at 29936/29938 moves to action 4;
A at 29940 starts the same two-button teardown (29965 / 29971), then default
YES is accepted at 29982 and returns to field at 30004. Its four-tick offset
comes solely from navigating to the CANCEL action.

All checkpoints retain ONIX/MAGBY/BAYLEEF, GROVYLE/MURKROW/PIDGEOTTO, and
rental IDs `[156,149,180,188,184,135]`, with friendship zero and script
result TRUE. The normal VBlank/sprite stream advances RNG, but quit does not
make a selection roll or mutate party/rental records.

## Source contract

`Swap_Task_HandleChooseMons` has one B route for both picker modes
(`battle_factory_screen.c:2600-2647`). Enemy CANCEL is action 4 and uses
`Swap_ActionCancel` (3983-4023), so both origins share
`Swap_AskQuitSwapping` / `Swap_HandleQuitSwappingResponse` (2457-2539).
The visible distinction is exactly `ScreenInfoTransitionOut` and
`ScreenInfoTransitionIn`'s enemy two-button paths (3001-3167): PKMN FOR SWAP
slides first, CANCEL is deliberately staggered, and both must finish before
the shared callback continues. No accept, duplicate, `CopySwappedMonData`, or
extra RNG branch is entered.
