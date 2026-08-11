# Opponent HYPER BEAM recharge lifecycle — Battle Scene OFF

This is a SIDE-lane source-and-oracle checkpoint for an opponent-owned
recharge action. It adds no production engine, controller, animation, or
pixel-acceptance code.

Fixture:
[`mechanic-opponent-hyper-beam-recharge-off.json`](../tools/battle-lab/mechanic-opponent-hyper-beam-recharge-off.json).
It explicitly selects `battle-scene-off` and uses `mechanicLab`
`overrides.parties`: exactly three complete, checksummed Pokémon per side,
built before `CB2_InitBattle`. The builder therefore lets Emerald derive
stats, HP, ability, types, and PP, preserves both benches, and exposes state
read-only (`tools/battle-lab/README.md:33-45`). The trace uses only ordinary A
presses; no HP, status, stage, outcome, turn, AI result, or controller state is
injected (`README.md:62-67`).

- Opponent Tauros is Speed **162**, while player Shuckle is Speed **10**.
  Tauros can legally learn TM15 HYPER BEAM
  (`reference/pokeemerald/src/data/pokemon/tmhm_learnsets.h:3276-3284`), and
  all four slots contain it, constraining the normal Factory AI to one legal
  choice without injecting a decision.
- Shuckle survives and uses legal HM04 STRENGTH
  (`tmhm_learnsets.h:5516-5536`). Both leads remain active through the next
  command, making the evidence deliberately nonterminal.

## Observed sequence

All frames are trace-relative. The fixture requests every named frame and all
frames in the tight edge windows (207 captures / 1,268 total frames).

| Frames | Oracle receipt |
| --- | --- |
| 0 / 34 / 40 | Real first command, FIGHT selection, then `currentMove=63`; Tauros HYPER BEAM PP begins `5,5,5,5`. Frame 0 raw framebuffer SHA-256 is `f85daff1f5528e0ce99ebf7f573d9f26b1db97c3e34229fab1ab70e669f85072`. |
| 71→72 | The AI-selected slot's HYPER BEAM PP changes `5→4`. |
| 167→168 | HYPER BEAM damage changes Shuckle `127→109`; Shuckle survives. |
| 260→261 | Tauros `status2` changes `0→4194304`, exactly `STATUS2_RECHARGE`; PP remains `5,4,5,5`. |
| 398→399 / 400 | After Shuckle's first real STRENGTH, the ROM publishes the genuine next player command (`playerControllerCommand 51→18`); Tauros still owns recharge and still has PP `5,4,5,5`. |
| 834→835 / 866→867 / 868→869 | Ordinary A opens FIGHT, then confirms STRENGTH; the player controller returns from move selection (`18→20→53`) while Tauros remains in recharge. |
| 872→873→874→875 | Turn execution first restores the opponent-owned locked move (`currentMove 0→63`), then clears Tauros `STATUS2_RECHARGE` (`4194304→0`) and dispatches its controller work. HYPER BEAM PP stays `5,4,5,5`: there is no second deduction. |
| 899→900 / 930 | The automatic opponent action completes its controller dispatch; frame 930 visibly holds **“Foe TAUROS must recharge!”**. Raw framebuffer SHA-256: `dca441cb9e3ecca833b415704fe8a1d62a5bff5ec5f671f5d276cbf6e5716c8e`. |
| 999→1000 / 1084→1085 | Only after recharge does selected STRENGTH execute: Shuckle PP changes `14→13`, then Tauros HP changes `143→136`. Tauros HYPER BEAM PP is still `5,4,5,5`. |
| 1101→1102 / 1168 / 1268 | The next genuine action boundary is published (`playerControllerCommand 51→18`) and settles to the ordinary nonterminal prompt with both leads alive, recharge clear, and `battleOutcome=0`. Frame 1268 raw framebuffer SHA-256: `6cb66b417f67955ef38183c54b3422a5b6031a7eee5f9fa8693f8595a194a51e`. |

This proves ownership and ordering, not merely the recharge text: the faster
opponent consumes its locked no-action branch before the already-selected
player move spends PP or deals damage, while the opponent's original move slot
is unchanged.

## Source causal map

- HYPER BEAM is `EFFECT_RECHARGE`, 150 power, 90 accuracy, 5 PP
  (`reference/pokeemerald/src/data/battle_moves.h:822-832`). Its effect script
  runs the attack canceler, accuracy check, and a certain user-owned recharge
  effect before the generic hit path
  (`reference/pokeemerald/data/battle_scripts_1.s:1111-1115`).
- Applying `MOVE_EFFECT_RECHARGE` sets `STATUS2_RECHARGE`, a two-count timer,
  and `gLockedMoves` (`battle_script_commands.c:2728-2732`). A locked/recharging
  battler reuses that saved move during action setup
  (`reference/pokeemerald/src/battle_util.c:97-110`).
- On the forced turn, the recharge canceler clears the status and timer,
  cancels multi-turn state, marks the battler unable to use the move, and
  redirects to `BattleScript_MoveUsedMustRecharge`
  (`battle_util.c:2098-2108`). That script prints the recharge string and goes
  directly to move end (`battle_scripts_1.s:1117-1120`), so it never reaches
  normal PP reduction (`battle_script_commands.c:1230-1249`).
- Turn cleanup also decrements any surviving recharge timer and clears the bit
  at zero (`reference/pokeemerald/src/battle_main.c:4878-4883`); the observed
  canceler clear at frame 874 happens earlier in the forced action itself.

## Reproduction

Two fresh Battle Scene OFF runs produced byte-identical manifests and all 207
PNGs; both manifests passed `jq empty`. Manifest SHA-256:
`8ea21a131bb039317bd37832d73249d4e940b5ed5edcc13a381a8dedfb3a6615`.
The sorted relative PNG checksum ledger SHA-256 is
`d1381031b207673e12a7bc280bea782b5cae20a40f148c79bf72b137c5cba4d0`.

```sh
run_a=$(mktemp -d /tmp/pokebench-recharge-a-XXXXXX)
run_b=$(mktemp -d /tmp/pokebench-recharge-b-XXXXXX)
bin/oracle --profile battle-scene-off lab \
  tools/battle-lab/mechanic-opponent-hyper-beam-recharge-off.json \
  -o "$run_a" --quiet
bin/oracle --profile battle-scene-off lab \
  tools/battle-lab/mechanic-opponent-hyper-beam-recharge-off.json \
  -o "$run_b" --quiet
jq empty "$run_a/manifest.json" "$run_b/manifest.json"
cmp "$run_a/manifest.json" "$run_b/manifest.json"
```

The bounded implementation follow-up is to preserve this opponent recharge
owner across the genuine intervening player command and present its forced
must-recharge resolution before releasing the selected player action, without
turn, species, move, or absolute-tick routing.
