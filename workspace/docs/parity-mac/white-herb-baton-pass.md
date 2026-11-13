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

## The Spikes flag (fourth pass: now seen on the ROM, no change needed)

`Cmd_switchineffects` sets `SIDE_STATUS_SPIKES_DAMAGED` when the entering Pokemon takes its Spikes damage and clears
it at its very end. The White Herb script above ends the action before that, so the flag stays set, and the **next**
Pokemon of that side takes no Spikes damage (its own switch-in then clears the flag). The fix above modeled this from
the source; it had never been seen on the ROM.

ROM (Mechanic Lab, Scene OFF, seed 701): player Jolteon (Baton Pass), Snorlax (White Herb), Blissey; opponent
Arcanine (Intimidate, four Spikes). Decisions: Splash; Baton Pass to Snorlax; switch to Blissey; switch to Jolteon.

| frame | with the herb | without the herb (control) |
|---|---|---|
| 355 | Spikes laid | the same |
| 749 | Snorlax enters with Attack -1: Spikes damage 235 -> 206, flag set | the same |
| 994 / 854 | herb used, Attack back to 0, **flag still set** | flag cleared |
| 1438 / 1302 | Blissey enters: **330 / 330, no Spikes damage**; the flag is cleared at 1576 | Blissey enters: 330 -> 275 |
| 2181 / 2198 | Jolteon enters: 140 -> 105 (the damage is back) | 140 -> 105 |

Engine: `tests/parityMacWhiteHerbBatonPassSpikesFlag.test.ts` plays the same two turns through the reducer. It passes
on the engine as it was: the model was right.
