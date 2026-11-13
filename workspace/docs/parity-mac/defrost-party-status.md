# A Pokemon thawed by a Fire move stayed frozen in its party record

Found by the wide compare in the first mixed batch (ROM seed 20276, `ai-v1` player).

## Symptom

Seed 20276: the opponent's Fire Blast hits the player's frozen Vibrava and thaws it.

- ROM: the active Pokemon and its party record both show no status from then on.
- Engine: the active Pokemon is thawed; its party record still says frozen (`status1` 32) for the rest of the battle
  (52 decision points).

## What it changes for the game

A switch-in rebuilds the status from the party record (`src/engine/battleScriptSwitchinOpcode.ts`). So a Pokemon thawed
by a Fire move that then left the field (a voluntary switch, Roar, Whirlwind, Baton Pass) came back frozen in the
engine. With the old test player it never left the field by choice, so the replay never showed it.

## C source

`Cmd_moveend`, `MOVEEND_DEFROST` (`battle_script_commands.c:4257-4273`):

    gBattleMons[gBattlerTarget].status1 &= ~STATUS1_FREEZE;
    gActiveBattler = gBattlerTarget;
    BtlController_EmitSetMonData(B_COMM_TO_CONTROLLER, REQUEST_STATUS_BATTLE, 0, sizeof(...status1), &gBattleMons[gBattlerTarget].status1);   // 4267

`REQUEST_STATUS_BATTLE` writes the party Pokemon's status.

## Engine and fix

`src/engine/battleScriptMoveEndControllers.ts`, `executeDefrost`: it cleared the battler's `status1` and emitted the
`set-battler-status-data` event, but did not write the party record. Now it does
(`withBattleScriptPartyMemberStatus1`), as every other status write in the engine already did.

All `set-battler-status-data` sites were checked: the attack canceler, Rest, Refresh, the hit chain's two status writes
and the move-end item cures write the party; `executeDefrost` and the faint clear (`faint-party-status.md`) did not.

## Proof

- ROM seed 20276 on the fixed engine: every turn state and every wide state match.
- `tests/parityMacDefrostPartyStatus.test.ts` (fails without the fix: party status `[0, 32, 0]`).
