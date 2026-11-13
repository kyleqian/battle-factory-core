# The AI's move scoring did not see the target's ability or its Sp. Atk stage (audit leads A6, A7) — fixed

Mac parity lane, 2026-11-12. No replay seed shows this. Proof: two Mechanic Lab scenarios on the real ROM (below) and the source.

## Symptom

In the opponent AI's third scoring script (`AI_CheckViability`) two facts about the PLAYER's Pokémon were missing:

- **Sp. Atk stage (A7).** `AI_CV_Roar` (`data/battle_ai_scripts.s:1290-1304`) and `AI_CV_PsychUp` (`:2086-2112`) ask whether
  any of the target's Attack, Defense, Sp. Atk, Sp. Def or evasion is above +2. The engine read Sp. Atk as "no change".
  When Sp. Atk was the only raised stat (Tail Glow, Growth) the engine scored Roar -3 with no random roll; the game goes
  to `AI_CV_Roar2` and rolls `if_random_less_than 128` for every Roar slot. Psych Up: engine -2, game +1.
- **Ability (A6).** `Cmd_get_ability AI_TARGET` returns the real ability without guessing when it is Shadow Tag, Magnet
  Pull or Arena Trap (`battle_ai_script_commands.c:1369-1371`). The engine did not have the ability there, so for a
  two-ability species (Dugtrio: Sand Veil / Arena Trap) it rolled the `Random() & 1` guess.

Either one changes how many random numbers the opponent spends, so the rest of the battle differs.

## Cause

`src/engine/factoryAiDecisionPolicy.ts` builds two literals for `runCheckViability`: attacker and target. `spAtkStage` and
`ability` were on the attacker literal only. The handlers read `input.target.spAtkStage ?? 6` and
`input.target.ability ?? "ABILITY_NONE"` (`src/engine/factoryAiCheckViability.ts`), so nothing failed. The wiring test
checked that every field is on the attacker OR the target literal, which these two satisfied.

## Fix

The target literal carries `spAtkStage: view.target.statStages.spAtk` and `ability: view.target.ability`.

## Test

`tests/factoryAiScoredWiringParity.test.ts`, "the TARGET literal carries the target's own ability and Sp. Atk stage"
(unfixed: both `undefined`).

## ROM proof (Mechanic Lab, Scene OFF, `challengeNum 4` = full AI; base request of seed 1816 with `overrides.parties`)

A7. Player lead Mr. Mime (122, Soundproof, four Tail Glow); opponent lead Snorlax (143, four Roar; Roar is blocked every turn).
Random draws of the opponent's move decision, single-stepped with the caller and the AI script label:

| turn | player Sp. Atk stage | draws | what they are |
|---|---|---|---|
| 2 | 8 (+2) | 5 | 4 `BattleAI_SetupAIData`, 1 tie-break |
| 3 | 10 (+4) | 9 | 4 set-up, **4 x `Cmd_if_random_less_than` at `AI_CV_Roar2`** (one per Roar slot), 1 tie-break |
| 4 | 12 (+6) | 9 | same |

A6. Player lead Dugtrio (51) with four Splash; opponent lead Snorlax with four Skill Swap. Draws of the opponent's first
decision (counted back from the action-menu `gRngValue` to the `gRandomTurnNumber` draw, checked against the four set-up rolls):

| Dugtrio's ability | draws |
|---|---|
| Arena Trap | 5 (4 set-up, 1 tie-break): **no ability guess** |
| Sand Veil | 14 |
