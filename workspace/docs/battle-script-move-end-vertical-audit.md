# Battle Script move-end vertical audit

Scope: source/data audit for the S10 decision-to-machine checkpoint.  This is
not an opcode registration or a mechanics claim.  Receipts below use the
pinned pret source and the committed generated program inventories.

## 1. The exact next bytes after the asleep slice

The staged adapter executes `BattleScript_MoveUsedIsAsleep` at
`data/battle_scripts_1.s:3717-3721`: `printstring`, `waitmessage`,
`statusanimation`, then `goto BattleScript_MoveEnd`.  Its existing Tier-1
receipt pins opcode IDs `16, 18, 100, 40`, and the current barrier at the
first instruction of `BattleScript_MoveEnd` (`tests/factoryBattleScriptDecision.test.ts:178-207`).

`BattleScript_MoveEnd` itself is exactly:

```asm
BattleScript_MoveEnd::                    @ data/battle_scripts_1.s:267-269
    moveendall
    end
```

`moveendall` expands at `asm/macros/battle_script.inc:417-420` to the
following bytecode instructions, not a single moveend instruction:

| Program order | bytes / operands | dispatcher | receipt |
| --- | --- | --- | --- |
| 1 | `B_SCR_OP_SETBYTE` (46), `.4byte sMOVEEND_STATE`, `.byte 0` | `Cmd_setbyte` | generated program block `BattleScript_MoveEnd`, source statement 268; macro path `moveendall → setbyte` |
| 2 | `B_SCR_OP_MOVEEND` (73), `.byte 0`, `.byte 0` | `Cmd_moveend` | same block; macro path `moveendall → moveend` |
| 3 | `B_SCR_OP_END` (61) | `Cmd_end` | source statement 269 |

The pointer operand is not an abstract local: `sMOVEEND_STATE` is
`gBattleScripting + 0x14`, the `moveendState` byte
(`include/constants/battle_script_commands.h:266`; `include/battle.h:489-500`).
The direct C implementation is likewise exact: `Cmd_setbyte` decodes the
four-byte pointer at `PC+1`, stores `PC[5]`, then advances six bytes
(`src/battle_script_commands.c:3815-3821`).  The generated lexical receipt
maps slot 46 to that source span and the dispatch row at line 377.

Thus, when either committed asleep staging route reaches this point it has:

- attacker/target `0/1` for TYROGUE/PLUSLE or `1/0` for PLUSLE/TYROGUE;
- the source asleep admission result already applied: active sleeper status
  `4 → 3`, status-controller acknowledgement completed, and no PP reduction;
- the `BattleScript_MoveUsedIsAsleep` message and status-animation events
  emitted and acknowledged; and
- current script PC at opcode 46, before it writes `moveendState = 0`.

Those staged facts are asserted for the player and trainer paths in
`tests/factoryBattleScriptDecision.test.ts:208-339`.  For the trainer route,
the committed state is `FRONTIER_MON_PLUSLE_2` with seed 1 and the five AI
draws already reflected in the kernel cursor (`0x79e39ac4`, five calls); the
asleep script itself consumes no random number.  The player TYROGUE route has
zero calls.  Neither fact makes move-end generally RNG-free.

## 2. Opcode 46 is bounded only as a complete byte-lvalue primitive

The generated `battle-script-opcode-observations/v1` inventory contains 214
concrete `B_SCR_OP_SETBYTE` starts (all have the fixed `[4, 1]` operand-width
sequence).  Its pointer-symbol classes are complete for that generated
program:

| pointer expression | starts | required byte-lvalue domain |
| --- | ---: | --- |
| `cEFFECT_CHOOSER` | 58 | battle communication effect chooser |
| `cMULTISTRING_CHOOSER` | 10 | battle communication mult-string chooser |
| `gBattleCommunication` | 7 | communication byte 0 |
| `gBattleCommunication + 1` | 2 | communication byte 1 |
| `gBattleMoveDamage` / `+1` / `+2` / `+3` | 2 / 2 / 2 / 2 | four addressable bytes of signed move damage |
| `gBattlerTarget` | 2 | target battler byte |
| `gMoveResultFlags` | 3 | result-flags byte |
| `sBATTLER` | 2 | `BattleScripting.battler` |
| `sB_ANIM_TARGETS_HIT` | 3 | `BattleScripting.animTargetsHit` |
| `sB_ANIM_TURN` | 8 | `BattleScripting.animTurn` |
| `sDMG_MULTIPLIER` | 10 | `BattleScripting.dmgMultiplier` |
| `sGIVEEXP_STATE` | 5 | `BattleScripting.getExpState` |
| `sLEARNMOVE_STATE` | 2 | `BattleScripting.learnMoveState` |
| `sLVLBOX_STATE` | 1 | `BattleScripting.levelUpBoxState` |
| `sMOVEEND_STATE` | 24 | `BattleScripting.moveendState` |
| `sMULTIHIT_EFFECT` | 3 | `BattleScripting.multihitMoveEffect` |
| `sSTATCHANGER` | 47 | `BattleScripting.statChanger` |
| `sSTAT_ANIM_PLAYED` | 9 | `BattleScripting.statAnimPlayed` |
| `sTRIPLE_KICK_POWER` / `+1` | 1 / 1 | two addressable bytes of triple-kick power |
| `sTWOTURN_STRINGID` | 8 | `BattleScripting.twoTurnsMoveStringId` |

The totals are 24 pointer expressions and 214 starts.  The inventory also
records the macro/source families: 75 direct `setbyte`, 58 `setmoveeffect`,
47 `setstatchanger`, 8 `setword`, 2 `sethword`, and move-end wrappers
`all=4`, `case=4`, `from=2`, `fromto=2`, `to=12`.  This is why the wrapper
spelling cannot narrow the handler: `setword` emits four slot-46 starts and
`sethword` two.

So source-complete registration of `Cmd_setbyte` is bounded, but only by an
explicit typed **byte-lvalue resolver** for every row above.  It must decode
the symbolic four-byte pointer, write exactly the low byte supplied by the
program, preserve the other bytes of the two multi-byte cells, return an
immutable updated rules context, and advance PC by six.  It must not be a
handler special-cased to `sMOVEEND_STATE`; that would register opcode 46 for
the other 190 concrete starts while silently changing or rejecting their
source semantics.  The generated dispatch/source receipt is
`src/data/gen/battle-script-command-handlers.json` slot 46 and the lexical
receipt is `src/data/gen/battle-script-handler-lexical-facts.json` slot 46.

## 3. What `Cmd_moveend 0, 0` would do

After generic SETBYTE, `Cmd_moveend` reads `endMode=PC[1]=0` and
`endState=PC[2]=0` (`src/battle_script_commands.c:4225-4226`).  The macro
means all cases from initialized `moveendState=0`; the case constants are
0..16 with sentinel 17 (`include/constants/battle_script_commands.h:393-410`).
It loops synchronously until an effect transfers control or state reaches 17;
only then, with `effect == FALSE`, it advances PC by three to the `end` at
`BattleScript_MoveEnd+8` (`battle_script_commands.c:4489-4497`).

For the committed singles no-damage asleep state, the immediate facts rule
out the damage-dependent Rage and defrost predicates, the doubles-only next
target loop, Choice Band (TYROGUE has a Focus Band; PLUSLE a Petaya Berry),
and the staged Guts/Plus ability pair has no matching
Synchronize/on-damage/immunity callback.  The concrete path is therefore an
`effect == FALSE` sweep through cases 0..16, interrupted by two required
controller returns, and includes this state hygiene:

1. Rage, defrost, target Synchronize, on-damage abilities, immunity abilities,
   attacker Synchronize (0..5): call/check the source predicates; no script
   push for the staged tuple.  In the general engine these delegated ability
   calls can emit scripts, controller work, and their own mechanics.
2. Choice move and changed items (6..7): validate/update `choicedMove` and
   merge `changedItems`; no concrete change for the two staged held items.
3. Item effects and King's Rock/Shell Bell (11..12): call `ItemBattleEffects`.
   These are source-required general branches and may push scripts and consume
   RNG in their implementations; their absence is only a staged-state fact.
4. Attacker invisible/visible and target visible (8..10): case 8 takes its
   increment-only path because the attacker is not semi-invulnerable. Case 9
   then **does emit** attacker `SpriteInvisibility(FALSE)`, because both
   `!STATUS3_SEMI_INVULNERABLE` and `WasUnableToUseMove(attacker)` satisfy its
   source predicate; it marks the controller, clears the status bit, sets
   `restoredBattlerSprite`, increments, and returns at the same PC. After
   acknowledgement and resumption, case 10 **does emit** the same visibility
   command for the untouched, in-range, non-semi-invulnerable target, clears
   its bit, increments, and returns. A second acknowledgement resumes case
   13. These two barriers are required even though neither sprite was hidden
   in the staged state.
5. Substitute cleanup (13), last-move bookkeeping (14), and mirror-move
   history (15): mutate the battle/disable/special/history fields subject to
   flags and absent/faint tests.  The no-damage asleep path sets last landed
   move unavailable where applicable; no damage does not erase this required
   bookkeeping.
6. Next target (16): singles skips the double-target replay.  In doubles it
   can reset state to 0, clean move values, push the original effect script,
   jump to `BattleScript_FlushMessageBox`, and return.

The only direct controller barriers inside this handler are defrost
(`BtlController_EmitSetMonData`, lines 4265-4269) and the three sprite
visibility cases (4341-4379); the exact staged path takes the attacker-visible
and target-visible barriers. Delegated ability/item calls can add more.
`Cmd_moveend` itself has no `Random()` call in its source span.  That does not
prove a zero-RNG move-end implementation: delegated ability/item/effect
scripts and the general action continuation still require their own source
RNG accounting.

After both controller resumptions and the rest of this particular
`effect == FALSE` singles sweep, PC advances to `end`; `Cmd_end` is the next
required continuation, not a new decision request. The source-wide action
scheduler/turn-finalization after that end is outside the currently staged
adapter. Therefore the current barrier is honest: it stops before both the
write primitive and the 289-line move-end state machine.

## 4. Completed SETBYTE unit

The completed smallest honest increment was **complete generic `Cmd_setbyte`
only**:
add the explicit 24-class byte-lvalue rules state/resolver, implement the
fixed six-byte write/advance primitive, and mechanically test all 214
generated starts plus byte-preservation for the two four-byte/one two-byte
cells.  Then extend the committed asleep decision route exactly one
instruction: it writes `moveendState=0` and returns the existing honest
machine barrier at opcode 73 (`B_SCR_OP_MOVEEND`).  This materially advances
the current machine while neither registering a partial opcode nor claiming
any move-end mechanic.

Exact remaining unit after that remains source-complete `Cmd_moveend`, including all
17 cases, mutable battle/disable/special/history/item state listed above,
ability and item delegates, controller barriers, script stack/PC transfers,
doubles replay, and the `end`/action-scheduler continuation.  It is larger
than the generic SETBYTE primitive and should be decomposed around source
complete delegates, never by registering a reduced `sMOVEEND_STATE` handler.

## 5. Opcode-73 implementation boundary receipt

`src/data/gen/battle-script-move-end-facts.json` is the committed,
regenerable source boundary for the remaining decision.  Its extractor reads
the pinned handler/constant sources plus the assembled opcode observation
catalog and records:

- all **17** executable numeric states plus sentinel 17, with every case body
  preserved verbatim and hashed;
- all **24** assembled opcode-73 starts, uniformly `[1,1]` operands: end-mode
  counts **0=6 / 1=4 / 2=14** and wrapper counts
  `all=4 / case=4 / from=2 / fromto=2 / to=12`; and
- per-case call, global, mutation, controller, explicit-return, and script
  target candidates.  Numeric state is authoritative: the C source text
  places item cases 11–12 before visibility cases 8–10.

This receipt also makes the currently missing ownership precise.  A complete
rules context still needs battler item/stat-stage state; `chosenMove`;
`choicedMove[]` and `changedItems[]`; special damage/restored-sprite state;
the charging-turn protect bit; battle type/count/position data; and the
last-printed/last/resulting/last-landed/last-hit-by/type plus
`lastTakenMove`/`lastTakenMoveFrom` histories.  The following source hooks
must return immutable rules/RNG/controller/script effects rather than boolean
stubs:

- `AbilityBattleEffects` for target Synchronize, on-damage, immunity-loop,
  and attacker Synchronize;
- `ItemBattleEffects` for move-end-all and King's Rock/Shell Bell, including
  any RNG or pushed effect script;
- held-effect/enigma resolution, `WasUnableToUseMove`, battler
  side/position/partner lookup, `GET_MOVE_TYPE`, and the damage predicates;
- status-data and three sprite-visibility controller emissions/resumptions;
  and
- `MoveValuesCleanUp`, move-effect script lookup/push, and the
  `BattleScript_FlushMessageBox` doubles transfer.

Until those owners exist, opcode 73 remains deliberately unregistered and
the player/AI asleep verticals retain the honest barrier.  The receipt is a
decomposition checkpoint, not an implementation or a staged no-effect claim.
