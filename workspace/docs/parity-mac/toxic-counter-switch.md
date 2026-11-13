# Toxic counter survived a switch (audit lead B1) — fixed

Mac parity lane, 2026-11-12. Evidence is not in git; every number re-derives from the seed with `tools/audio/romDriveSeed.sh SEED off DIR`.

## Symptom

A badly poisoned Pokémon that left the field and came back kept its growing Toxic damage in the engine.
The real game restarts it at 1/16 of max HP.

Seed 165 (Scene OFF), first diverging turn: the opponent's Murkrow (142 max HP, badly poisoned two turns earlier, then
blown out by Whirlwind) is sent back in after Parasect faints.

| | Murkrow HP after the end-of-turn poison tick | status1 |
|---|---|---|
| ROM | 88 -> 80 (8 = 142 / 16 x 1) | `STATUS1_TOXIC_POISON`, counter 0 at entry, 1 after the tick |
| engine before the fix | 88 -> 64 (24 = 8 x 3) | counter 2 at entry (carried), 3 after the tick |

The first compare row that differed was `[9973, 0, 152, 64, 403131217, 157, 0]` (engine) against the ROM's `hp 80` with the
same `gRngValue` 403131217: same turn, same RNG, different poison damage.

This seed was filed under "the ROM sends in a different opponent after a faint" (audit doc section 7). That signature only
says the new opponent's HP differs; here the same Pokémon came in and the HP differed because of the poison tick.

## Cause

- C: `battle_util.c:1536-1548` (`ENDTURN_BAD_POISON`) does `gBattleMons[gActiveBattler].status1 += STATUS1_TOXIC_TURN(1)`
  and nothing else. There is no `BtlController_EmitSetMonData(REQUEST_STATUS_BATTLE)` after it, so `gPlayerParty` /
  `gEnemyParty` keep the word written when the poison was inflicted (`SetMoveEffect`, `battle_script_commands.c:2488`:
  `STATUS1_TOXIC_POISON`, counter 0). A switch-in copies the party word into `gBattleMons`, so the counter restarts.
- Engine: `src/engine/battleEndTurnOrchestration.ts` `bumpToxicCounter` also wrote the bumped word into the party record
  (`withBattleScriptPartyMemberStatus1`), and `src/engine/battleScriptSwitchinOpcode.ts:559` reloads `status1` from that
  record on switch-in. The counter therefore survived any switch (voluntary, Roar / Whirlwind, Baton Pass, faint replacement
  of another Pokémon followed by a later return).

## Fix

`bumpToxicCounter` now changes the active battler only. One function, no other caller.

## Test

`tests/battleEndTurnOrchestration.test.ts`: "Toxic's counter bump stays on the battler ...". Two end-of-turn ticks; the battler's
`status1` carries counter 2, the party record stays `STATUS1_TOXIC_POISON` with counter 0, party HP is still synced.
Unfixed: the party record reads 640 (`0x280`) instead of 128.

## ROM replay

Open seeds re-driven with the fix (Scene OFF): **94, 165, 183, 343, 499, 1014, 1030 now match to battle end** (7 seeds).
Regression list: see `STATUS.md`.
