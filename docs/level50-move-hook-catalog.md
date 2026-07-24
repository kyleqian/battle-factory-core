# Level-50 move item/ability hook catalog

Audit date: 2026-07-24. This is a generated, source-selector catalog for the
300-move Level-50 roster. It is not a battler-state catalog: every category is
only a potential hook and requires the stated active battler to own the item or
ability at runtime. No category is inferred from a Frontier set's species,
item, or co-occurrence.

## Included finite selectors

`level50-move-parameterization/v2` follows script labels conservatively through
all named operands. Thus `ATTACKCANCELER`, `ACCURACYCHECK`, and `MOVEEND`
reach mean possible source-script reach, not an assertion a branch executes.

| Ownership | Categories | Level-50 record counts | Source selector |
| --- | --- | ---: | --- |
| Attacker item | Choice Band selection | 300 | `TrySetCantSelectMoveBattleScript` / `CheckMoveLimitations`: `HOLD_EFFECT_CHOICE_BAND` applies to any selected slot after a prior chosen move. |
| Target item | Evasion-up accuracy | 106 | `Cmd_accuracycheck`: target `HOLD_EFFECT_EVASION_UP` after a reachable `ACCURACYCHECK`. |
| Attacker item | King's Rock flinch | 19 | `Cmd_moveend`: `HOLD_EFFECT_FLINCH` and `FLAG_KINGS_ROCK_AFFECTED` after reachable `MOVEEND`. |
| Target ability | Soundproof | 9 | `ABILITYEFFECT_MOVES_BLOCK`: exact `sSoundMovesTable` membership after reachable `ATTACKCANCELER`. |
| Target ability | Volt/Water Absorb, Flash Fire | 0 / 1 / 1 | `ABILITYEFFECT_ABSORBING`: electric/water with nonzero power; fire regardless of power, after reachable `ACCURACYCHECK`. No Level-50 move reaches the Volt Absorb selector. |
| Target ability | Contact on-damage | 13 | `ABILITYEFFECT_ON_DAMAGE`: `FLAG_MAKES_CONTACT` for Rough Skin, Effect Spore, Poison Point, Static, Flame Body, and Cute Charm after reachable `MOVEEND`. |
| Target ability | Color Change | 30 | `ABILITYEFFECT_ON_DAMAGE`: nonzero power after reachable `MOVEEND`. |
| Attacker/target ability | Compound Eyes / Sand Veil / Hustle | 106 / 106 / 74 | `Cmd_accuracycheck`; Hustle additionally uses `IS_TYPE_PHYSICAL(type)`. |

The manifest exposes all nine cataloged ability families even though only eight
occur in the Level-50 records; counts in `coverage.joins` count represented
categories. `unsupportedCategories: null` is deliberate. It names the honest
boundary: all other item and ability dispatch families, ownership, state
predicates, and branch outcomes are not claimed by this join.

## Provenance

The extractor reads `moves.json` flags/type/power plus the assembled script
program and these pinned source selectors:

- `src/battle_util.c` SHA-256 `2ba9ee4efe913effa119c8342281745f481910ca1b20cd76b470673062a45fd5`
- `src/battle_script_commands.c` SHA-256 `e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c`
- `include/battle.h` SHA-256 `8ef0355f2345592094c82cfde6641644a6b7157012104736416f8c05f34f0685`
- `include/constants/pokemon.h` SHA-256 `e0153a94a2fc0f84e6de372494dfb01e88be4d9cf1cbbeca5e56b8a0b645f7e5`

Reproduce with `npm run extract:level50-move-parameterization` and
`npx vitest run tests/level50MoveParameterization.test.ts --no-watch --pool=forks`.
