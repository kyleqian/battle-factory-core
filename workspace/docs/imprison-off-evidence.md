# Imprison — source audit and OFF receipt

Scope: source and stock-ROM Battle Scene OFF evidence only.

## Exact source contract

`Cmd_tryimprison` first fails if the attacker's
`STATUS3_IMPRISONED_OTHERS` bit is already set. Otherwise it runs the special
Pressure routine before scanning each opposing active battler, then attacker
move slots 0..3 and defender slots 0..3, accepting the first equality whose
attacker move is nonzero. Success sets the attacker's bit; no overlap takes
the supplied failure pointer (`reference/pokeemerald/src/battle_script_commands.c:9412-9451`).
There is no `Random()` call in this command or its Pressure helper.

`PressurePPLoseOnUsingImprison` walks opponents, decrements the Imprison slot
once per opposing `ABILITY_PRESSURE` if nonzero, but emits one persistent PP
controller update after the whole loop (`reference/pokeemerald/src/battle_util.c:767-797`). This is **additional** to normal shell `ppreduce`, not a replacement.

The existing action-admission scan exactly matches the relevant source
predicate: it considers only opposing battlers with the Imprison bit, checks
their four move slots in source order, and treats an exact selected-move
equality as a contribution (`src/engine/battleScriptActionAdmission.ts:2355-2436`). It correctly does not apply the setter's `MOVE_NONE` guard because
admission is asked about a concrete chosen move.

## Reproducible OFF receipts

Both fixtures use three complete Level-50 parties, Gardevoir
`[Imprison,Growl,Growl,Growl]`, and a foe constrained to Growl, creating the
required active overlap. Run either using the same checked mGBA wrapper and
`tools/probe/audit-frontier-tail-off.py` command shown in the Lock On receipt.

- `tools/battle-lab/mechanic-imprison-zero-pressure-off.json`: at frame 65
  normal PP deduction is 10→9; at 66 status3 becomes `0x2000`.
  `sRandCount` stays 9419 throughout: zero attributed draws. (`gRngValue`
  itself shows only frame-advance drift with no `Random()` attribution —
  supervisor rerun 2026-07-28 observed `0xa1600022` at frames 65-66.)
- `tools/battle-lab/mechanic-imprison-one-pressure-off.json`: against an
  active Dusclops (Pressure), normal deduction is likewise 10→9 at 65, then
  the special loop performs exactly one extra 9→8 at 66 while setting
  status3 `0x2000`. The same pinned `sRandCount=9419` proves zero RNG.

The receipt distinguishes the required persistent-controller shape by its
source loop: the extra loss happens before the overlap bit, but controller
emission is after the loop, once per use even with multiple opposing Pressure
battlers.
