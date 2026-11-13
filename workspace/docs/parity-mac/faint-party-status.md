# The party record of a fainted Pokemon kept its last status

No effect on play. Found by the wide compare; fixed so that the compare needs no exception for it.

## Symptom

A Pokemon that fainted while paralysed, poisoned and so on: the ROM's party record has `status1` 0 afterwards, the
engine's kept the last value (first seen on ROM seeds 9, 10 and 12 with the new players).

## C source

`Cmd_cleareffectsonfaint` (`battle_script_commands.c:3063-3079`):

    gBattleMons[gActiveBattler].status1 = 0;
    BtlController_EmitSetMonData(B_COMM_TO_CONTROLLER, REQUEST_STATUS_BATTLE, 0, sizeof(...status1), &gBattleMons[gActiveBattler].status1);   // 3071-3072

## Why it changes nothing for the game

Nothing reads the status of a fainted Pokemon: `Cmd_if_status_in_party` (`battle_ai_script_commands.c:1568-1598`) and
the party menu test HP first, and nothing revives in the Factory.

## Engine and fix

`src/engine/battleScriptHitChainOpcode.ts`, the `cleareffectsonfaint` handler: it cleared the battler and emitted the
event; now it also writes the party record. The wide compare no longer leaves out the status of a fainted party member
(`tools/integration/soundCensusRomReplay.ts`, `docs/parity-mac/wide-compare.md`).

## Proof

- `tests/battleScriptHitChainOpcode.test.ts`, "writes the cleared status to the fainted Pokemon's party record" (fails
  without the fix: 64).
- ROM seeds 342, 457 and 20276 with the stricter compare: match.
