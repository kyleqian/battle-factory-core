# White Herb did not work on a Baton Pass switch-in (audit "suspected" lead) — fixed

Mac parity lane, 2026-11-12. No replay seed shows this. Proof: a Mechanic Lab scenario on the real ROM (below) and the source.

## Symptom

Baton Pass hands the user's stat changes to the Pokémon that comes in. When a lowered stat was handed to a Pokémon holding a
White Herb, the real game uses the herb at once, as the Pokémon enters, before the other side moves. The engine kept the
lowered stat until a later item check (after the other side's move), so a hit in between used the lowered stat.

## Cause

- C: `Cmd_switchindataupdate` copies the passer's stat stages when the move is Baton Pass
  (`battle_script_commands.c:4648-4653`). `Cmd_switchineffects` then calls
  `ItemBattleEffects(ITEMEFFECT_ON_SWITCH_IN, ...)` after the ability hook (`:5265-5266`); its `HOLD_EFFECT_RESTORE_STATS`
  case resets every lowered stage and runs `BattleScriptExecute(BattleScript_WhiteHerbEnd2)` (`battle_util.c:3312-3328`).
  `BattleScriptExecute` replaces the running script (no pushed cursor) and the item script's `end2` finishes the action
  (`:3960-3964`). So the rest of `switchineffects` (the Spikes "already damaged" flag clear, the turn-order slot,
  `hpOnSwitchout`) and the rest of the Baton Pass script (its move-end pass) do not run.
- Engine: `src/engine/battleScriptSwitchinOpcode.ts` said the case was unreachable ("stat stages are always reset to the
  default just before this opcode"). That is true for every switch-in except Baton Pass.

## Fix

The switch-in opcode checks the hold effect after the ability hook: with a White Herb and a stage below the default it
resets the stages and jumps to `BattleScript_WhiteHerbEnd2`. A jump, not a call: the opcode's tail and the rest of the
Baton Pass script are skipped, as in the source.

## Tests (both fail on the unfixed code)

- `tests/battleScriptSwitchinOpcode.test.ts`, "a White Herb holder that enters with a lowered stage ...": stages reset,
  herb removed, the script ends at `end2`, the Spikes flag is left as it was.
- `tests/parityMacWhiteHerbBatonPass.test.ts`: a whole turn through the reducer. The trainer's Baton Pass hands Defense -2
  to a White Herb holder; the herb message comes before the player's move.

## ROM proof (Mechanic Lab, Scene OFF, `challengeNum 0`, base sets `[156,149,180]` / `[184,188,135]`, seed 305419897)

`overrides.parties`: player lead Jolteon (135) with four Baton Pass, second Snorlax (143) holding White Herb (180);
opponent lead Arcanine (59, ability slot 0 = Intimidate) with four Splash. Driven with the closed-loop driver
(decisions: move slot 0, switch to party 1, move slot 0).

| frame | what the ROM shows |
|---|---|
| 0 | Jolteon's Attack stage is 5 (Intimidate at battle start) |
| 13 - 229 | Jolteon uses Baton Pass; Snorlax is in with Attack stage 5, item 180 |
| by 484 | Attack stage 6, item 0: the herb was used |
| 484 - 639 | only now Arcanine's Splash runs (its PP drops at 639) |

A second run with a slower passer (Arcanine moves first, Baton Pass is the turn's last action) shows the same restore
before the next turn.
