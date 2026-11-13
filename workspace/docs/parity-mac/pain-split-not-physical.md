# Pain Split was recorded as a physical hit (audit lead B7) — fixed

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 483 off DIR`.

## Symptom

Seed 483: the player's Dusclops uses Pain Split on Nidoking (33 / 178 -> 105 / 105), then Nidoking uses Counter.
ROM: Counter fails. Engine: Counter went on as if it had been hit physically (then "It doesn't affect" the Ghost type), which
changed the turn's random draws. The same wrong record lets Revenge double and breaks Focus Punch's focus after a Pain Split.

## Cause

- C, `Cmd_datahpupdate` (`battle_script_commands.c:1938`): the physical record needs
  `IS_TYPE_PHYSICAL(moveType) && ... && gCurrentMove != MOVE_PAIN_SPLIT`. Pain Split is Normal-typed, so it also fails the
  `!IS_TYPE_PHYSICAL` branch (`:1953`): it writes neither `gProtectStructs[].physicalDmg` nor `specialDmg`.
- Engine: `src/engine/battleScriptHitChainOpcode.ts` (datahpupdate's damage branch) filed every physical-typed move, Pain Split
  included, into `protectPhysicalDmg` / `specialStatus.physicalDmg`.

## Fix

That branch skips both damage cells when the current move is Pain Split (220); the Shell Bell cell is untouched.

## Test

`tests/battleScriptPainSplitOpcode.test.ts` "records no Counter / Mirror Coat damage ...": whichever side loses HP keeps
`protectPhysicalDmg` 0 (fails unfixed with 50).

## ROM replay

Seed 483 matches to battle end. See `STATUS.md`.
