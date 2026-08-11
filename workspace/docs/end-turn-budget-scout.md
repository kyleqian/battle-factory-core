# Seed 21 end-turn instruction-budget scout

> **FROZEN EVIDENCE CHECKPOINT — 2026-07-29.** Diagnosis-only evidence at
> run HEAD `66186f0acf67607fc3dc66e27a5f7d1ec77397f5`, using the pinned pret
> source and Battle Scene OFF oracle (`http://127.0.0.1:8014`; `bin/oracle
> info` reported bootstrap v5 and anchor `9c89c741…`). No production source,
> test, fixture, generated data, or oracle artifact changed. The reproduction
> used the existing `driveGeneratedRoundToCompletion(21)` pattern from
> `tests/factoryRoundBattleOrchestrator.test.ts:66-103` in disposable scratch
> instrumentation only.
>
> Frozen engine grep:
>
> - `battleEndTurnOrchestration.ts:130` sets `SCRIPT_BUDGET = 256`;
> - its two runners, `runScriptToOwnEnd` (`:344-375`) and
>   `runScriptToEnd3` (`:465-495`), increment that one counter for every
>   `stepBattleScriptMachine` result, including `scheduler-progressed`;
> - the registered `B_SCR_OP_WAITMESSAGE` handler is at
>   `battleScriptSourceCommands.ts:968-996`; it advances only after its
>   scheduler counter reaches the requested wait;
> - `battleScriptMachine.ts:840-865` confirms a scheduler-progress result
>   preserves the PC but increments `instructionsExecuted`;
> - `factoryBattleScriptFullTurnDecision.ts:791-854` already has the needed
>   precedent: 256 source-instruction budget plus a distinct 4,096-yield
>   budget, charging `scheduler-progressed` and controller acknowledgements
>   only to the latter.

## 1. Reproduction

The eighth player submission of generated seed 21 (`i=7` in the driver;
Battle 0, turn 7) throws from
`battleEndTurnOrchestration.ts:375`. The prior command boundary is:

| side | active | HP | status1 | status2 | status3 / volatile |
| --- | --- | ---: | ---: | ---: | --- |
| player | GRANBULL (210), party 0 | 9 / 165 | 0 | 0 | 0 / none |
| trainer | SUDOWOODO (185), party 1 | 20 / 163 | 0 | 0 | 0 / none |

During the turn, the player's selected move leaves GRANBULL at 4 HP, defeats
SUDOWOODO, and the trainer's normal forced replacement is SEAKING (98), party
2, at 123 / 123. End turn then starts
`BattleScript_DamagingWeatherContinues` with Sandstorm (`weather = 8`):

| side | active at effect start | HP | status1/status2/status3 |
| --- | --- | ---: | --- |
| player | GRANBULL (210), party 0 | 4 / 165 | 0 / 0 / 0 |
| trainer | SEAKING (98), party 2 | 123 / 123 | 0 / 0 / 0 |

No status or volatile bit is involved. The tripping script is the
`BattleScript_DamagingWeatherLoop` instance entered from
`BattleScript_DamagingWeatherContinues`; it is at PC 2337,
`B_SCR_OP_WAITMESSAGE`, with `messageDisplayActive=true`, no pending
controller, and `pauseCounterBattle=31` after budget record 255. Thus the
PC is deliberately stationary while the scheduler advances the legitimate
64-frame message wait.

### Tail of the original 256-budget run

The exact final 30 pre-step records (the state that produced the real throw)
are uniform except for the monotonic scheduler counter:

| budget records | label | opcode | PC | `instructionsExecuted` | `pauseCounterBattle` |
| --- | --- | --- | ---: | ---: | ---: |
| 226–255 | `BattleScript_DamagingWeatherLoop` | `B_SCR_OP_WAITMESSAGE` | 2337 | 220–249 | 2–31 |

All 30 records have `messageDisplayActive=true`, `activeBattler=0`, and an
empty `pendingControllerBattlers` array. In particular, the tail proves
positive progress: each call changes `gPauseCounterBattle`'s ported value
from 2 through 31. It cannot be an instruction-PC non-termination.

With a scratch-only ceiling of 1,024, the same run completes, rather than
looping, after **303** interpreter iterations (294 recorded machine
executions). Its final 30 records are the final `waitmessage` counts 49–63,
then `orword`, `effectivenesssound`, `hitanimation`, controller-acknowledged
`healthbarupdate`/`datahpupdate`/`tryfaintmon`/`checkteamslost`, then
`jumpifbyte`, `addbyte`, `jumpifbytenotequal`, `bicword`, and `end2`
(PCs 2337–2349). The script applies Sandstorm damage to GRANBULL, reaching
0 HP, while SEAKING ends at 116 / 123; it returns normally and the existing
fainted-actions continuation then presents the ordinary player replacement.

## 2. Classification: (b) legitimately long, bounded script

This is not category (a). The source's relevant cursors all advance:

- `Cmd_waitmessage` increments `gPauseCounterBattle` and advances
  `gBattlescriptCurrInstr` only at `>= toWait`, clearing `MSG_DISPLAY`
  (`battle_script_commands.c:2159-2178`). The port mirrors that exact
  condition in `battleScriptSourceCommands.ts:968-995`. The observed 2→31
  tail is its expected partial progress, not a stuck counter.
- `BattleScript_DamagingWeatherContinues` first prints one 64-count weather
  message, then `BattleScript_DamagingWeatherLoop` prints another 64-count
  damage message for every battler actually hurt (`battle_scripts_1.s:3200-3210`).
- The loop's real termination is `addbyte gBattleCommunication, 1` followed
  by `jumpifbytenotequal ... gBattlersCount` (`battle_scripts_1.s:3218-3224`).
  Here it iterates both singles battlers: SEAKING is damaged in iteration 0;
  GRANBULL is damaged and faints in iteration 1. It then reaches `end2`.
- On the C side, `DoFieldEndTurnEffects` starts this script for Sandstorm,
  increments `turnCountersTracker`, and returns control to the battle loop
  (`battle_util.c:1374-1437`). The later battler-effects loop has its own
  explicit cursor guard and advances `turnEffectsTracker` and, at the count
  case, `turnEffectsBattlerId` (`battle_util.c:1464-1479,1772-1782`); none of
  those cursors is implicated by this script.

The exact 303-step requirement is arithmetically explained by three genuine
`B_WAIT_TIME_LONG = 64` waits: one weather-continues message plus one damage
message for each of two vulnerable battlers. Each wait has 63
`scheduler-progressed` calls (the 64th call advances the opcode), hence
**3 × 63 = 189** scheduler yields. The completed trace has 294 machine
executions, so its other **105** are PC-advancing source instructions; the
runner also makes **9** blocked-then-acknowledged controller iterations.
Thus **189 + 105 + 9 = 303**. The current 256 ceiling therefore expires 47
iterations too early, midway through the third message.

If retaining the current single counter, the narrow numeric repair is at
least 303 (use **304** to make the strict `< SCRIPT_BUDGET` loop admit all
303 iterations; 512 gives a 209-step cushion). That change is safe for this
carrier but is the less robust fix: longer legal scripts may accumulate more
wait yields.

## 3. Recommended ≤30-minute implementation

Prefer the existing two-budget design instead of inflating the numeric cap.

1. In `src/engine/battleEndTurnOrchestration.ts`, change both
   `runScriptToOwnEnd` and `runScriptToEnd3` (currently `:344-375` and
   `:465-495`) to the same accounting shape as
   `factoryBattleScriptFullTurnDecision.ts:791-854`:
   `sourceInstructions < SCRIPT_BUDGET` plus `yieldSteps < 4_096`.
2. Increment `yieldSteps` for `scheduler-progressed` and for a blocked step
   that becomes controller-acknowledged; increment `sourceInstructions` only
   for an actual PC-advancing normal instruction. Preserve the existing
   blocked-without-ack throw. Give yield exhaustion a distinct error naming
   the label/opcode; retain the source-budget error for real source loops.
3. Add a Tier-1 regression in `tests/factoryRoundBattleOrchestrator.test.ts`:
   invoke the existing helper with seed 21 (either add `[21, <measured
   cursor>]` once the worker records the final cursor, or a dedicated test)
   and assert Battle 0 proceeds past turn 7's Sandstorm KO to the
   `forced-switch` player boundary, with GRANBULL at 0, SEAKING at 116, and
   no budget throw. The stronger final assertion is seven-battle completion
   plus its newly pinned RNG cursor, if that remains a legitimate win after
   the replacement path.

The regression must exercise the ordinary generated driver—not a fabricated
weather fixture—because the 303-step shape requires the real order: opponent
replacement, then a two-vulnerable-battler Sandstorm loop. No oracle probe is
needed for this diagnosis: the exact wait and termination semantics are
directly source-cited, and the offending interpreter trace is deterministic.
