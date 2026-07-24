# S8 OFF — enemy `PKMN FOR SWAP` return probe

Evidence checkpoint only. This adds no production controller, renderer,
image asset, or app-comparison claim. The compact source/RAM ledger is
`src/data/gen/battle1-swap-enemy-return-boundaries.json`.

The probe preserves the canonical OFF post-win prefix only through its
already-committed SWAP handoff. From the input-ready enemy picker it presses
DOWN once (balls → action index 3, `PKMN FOR SWAP`), then A. It does not
replay a Battle 2 turn.

## Reproduce

Use a fresh directory. Every RAM invocation goes through the teardown-safe
wrapper; the probe records task state, both party arrays, all six persistent
rental records, and `gRngValue`—never framebuffers.

```sh
taskdir=$(mktemp -d)
for scenario in rejected accepted player-input-rejected first-player-input
do
  node tools/probe/derive-swap-enemy-return-trace.mjs "$scenario" \
    > "$taskdir/$scenario.json"
done

python3 tools/run-mgba-probe.py "$taskdir/rejected-ram.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-swap-enemy-return.py "$taskdir/rejected.json" \
  "$taskdir/rejected-ram.json" 29935
python3 tools/run-mgba-probe.py "$taskdir/accepted-ram.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-swap-enemy-return.py "$taskdir/accepted.json" \
  "$taskdir/accepted-ram.json" 29935,29936,29938,29963,29969,29977,30009,30010,30047
python3 tools/run-mgba-probe.py "$taskdir/player-accepted-ram.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-swap-enemy-return.py "$taskdir/first-player-input.json" \
  "$taskdir/player-accepted-ram.json" 30047,30048

bin/oracle --profile battle-scene-off run "$taskdir/accepted.json" \
  -o "$taskdir/oracle"
```

The wrapper validated all fresh JSON outputs while accepting mGBA's known
teardown SIGSEGV. The oracle output is used only to record raw-RGB SHA-256
transition checkpoints in the compact fixture; no PNG is committed or used at
runtime.

## Pinned result

`Swap_Task_ScreenInfoTransitionIn` installs enemy `HandleChooseMons` state 1
at snapshot tick 29935. DOWN on that installation frame is rejected; the
first accepted DOWN is 29936 and jumps directly from ball cursor 0 to action
cursor 3. A at 29938 installs `Swap_Task_ScreenInfoTransitionOut` state 0.

The enemy transition starts its `PKMN FOR SWAP` slide at 29963 and its delayed
CANCEL slide at 29969. `Swap_Task_SwitchPartyScreen` starts at 29977, changes
to player actions at 30009 (`inEnemyScreen=FALSE`, four actions, cursor 0),
then starts player transition-in at 30010. The player picker task is installed
at snapshot 30047; RIGHT there is rejected, while RIGHT at 30048 is the first
fresh player-picker input and moves cursor 0 → 1.

The complete player party (ONIX/MAGBY/BAYLEEF), enemy party
(GROVYLE/MURKROW/PIDGEOTTO), and rental IDs `[156,149,180,188,184,135]` are
unchanged at every RAM checkpoint. `gRngValue` continues through ordinary
VBlank/sprite activity, but this branch makes no selection roll and performs
no party or rental mutation.

## Source contract

The enemy array's fourth action is `Swap_ActionPkmnForSwap`
(`battle_factory_screen.c:1042-1057`). It installs transition-out with
`Swap_Task_SwitchPartyScreen` as its follow-up (4017-4023). Enemy transition
out removes two action buttons; the switch task calls
`Swap_InitActions(SWAP_PLAYER_SCREEN)`, hides the enemy-specific button
sprites, and uses the normal transition-in to rebuild player CANCEL chrome
(3001-3250). No accept prompt, duplicate test, or `CopySwappedMonData` path is
entered.
