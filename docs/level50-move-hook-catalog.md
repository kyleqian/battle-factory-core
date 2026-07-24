# Level-50 move item/ability hook catalog

Audit date: 2026-07-24. This is an intentionally partial inventory of selected
source dispatchers beside the 300-move Level-50 roster. It does **not** classify
individual moves into item or ability hooks. Every move's two
`potentialCategories` fields are explicitly `null` with status `unsupported`.

The rejected first version walked only named operands in assembled Battle
Script blocks. Assembly labels also fall through implicitly to the next
instruction, so that walk underclassified ordinary paths: notably THUNDER and
SURF lost their accuracy/absorber hooks. The generated Battle Script graph now
pins those linear successors and source-spelled jump/call/return/end edges,
but deliberately does not infer runtime branch guards, other handler transfers,
or call-return continuations. Following more named operands cannot make a
per-move algorithm conservative or exact; that still needs the remaining
control and guard evidence before a hook.

## Included dispatcher inventory

| Ownership | Cataloged categories | Count | Source selector |
| --- | --- | ---: | --- |
| Item | Choice Band selection; target evasion-up accuracy; King's Rock flinch | 3 | `TrySetCantSelectMoveBattleScript` / `CheckMoveLimitations`, `Cmd_accuracycheck`, and `Cmd_moveend` |
| Ability | Soundproof; three absorbers; contact on-damage; Color Change; three accuracy modifiers | 9 | `AbilityBattleEffects` and `Cmd_accuracycheck` |
| Soundproof selector rows | Exact `sSoundMovesTable` entries excluding `MOVE_NONE` | 10 | `battle_util.c`; 9 of the 10 occur in the Level-50 roster |

These are dispatcher inventory counts, not move counts. The inventory preserves
the runtime owner (attacker item, target item, attacker ability, or target
ability) in every row. It makes no claim that a move reaches the dispatcher,
that the active battler owns the hook, or that state and earlier source guards
permit the hook to run. Other dispatchers are not enumerated.

## Provenance

The extractor reads the generated roster/program joins and these pinned source
selectors:

- `src/battle_util.c` SHA-256 `2ba9ee4efe913effa119c8342281745f481910ca1b20cd76b470673062a45fd5`
- `src/battle_script_commands.c` SHA-256 `e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c`
- `include/battle.h` SHA-256 `8ef0355f2345592094c82cfde6641644a6b7157012104736416f8c05f34f0685`
- `include/constants/pokemon.h` SHA-256 `e0153a94a2fc0f84e6de372494dfb01e88be4d9cf1cbbeca5e56b8a0b645f7e5`

Reproduce with `npm run extract:level50-move-parameterization` and
`npx vitest run tests/level50MoveParameterization.test.ts --no-watch --pool=forks`.
