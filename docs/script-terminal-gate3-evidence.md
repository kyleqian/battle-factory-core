# Gate-3 Battle Script terminal-opcode evidence

Audited 2026-07-24 against the pinned source. This is source evidence only;
it does not add either opcode to the interpreter.

## Evidence base

| Artifact | Exact scope / count | SHA-256 |
| --- | --- | --- |
| `include/constants/battle_script_commands.h` | 249 enum rows; `ENDSELECTIONSCRIPT` line 74 = slot 68 (`0x44`), `FINISHACTION` line 252 = slot 246 (`0xF6`) | `842cce6dd704b09b24a49abdca67ee7a8062a2e3a465e1b764fc63c0d230580f` |
| `src/battle_script_commands.c` | 249 dispatch rows; slots 68/246 at lines 399/577; handlers at 3999–4002 and 10308–10311 | `e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c` |
| `asm/macros/battle_script.inc` | `endselectionscript` lines 379–381 and `finishaction` lines 1243–1245 are each one `.byte` and declare no parameters | `0a8e1c3bdf4c49d07b2e09ff8ab524812a5217b9735106e1b79b6be261a6db7e` |
| `data/battle_scripts_1.s` | Catalogued program source: 619 labels, 3275 executable statements, 3306 opcode starts | `4ac3e610b68c11ef0f4e4c0fc62ddba7fda5a8400e43705428868978ec7551a6` |
| `data/battle_scripts_2.s` | Not included in the committed program; six additional `finishaction` starts (lines 103, 111, 131, 144, 156, 168) | `6f64a730ba75ff062587ca99fa6416899b865edae30d0f349d5a155e08d22c11` |

The generated handler catalog is structurally complete (249 enum/table/handler
rows, no aliases or join defects): `battle-script-command-handlers.json`
`b065d380af048cff9f1f4574c9f4a679d95ac7918b7ab9a2ebda2a2cf3c8b32a`.
Its lexical companion records no `gBattlescriptCurrInstr` reference for either
handler (249 handlers; 718 total pointer references):
`battle-script-handler-lexical-facts.json`
`c7528e7afce898835a23ede8e3fafd174c4f0f9b8a68edf59d8f533348517174`.
The macro catalog has 300 declarations / 309 opcode references
(`battle-script-macro-emissions.json`,
`259600e3c0f0ef45697937664fca85307aa6ca860872befe9d96fa69a1fb6aa0`).

`battle-script-program.json` is deliberately only `battle_scripts_1.s`
(its source field says so):
`77dd161fa630f6245beeee29efbaa6068e5f258a7eb8eb517bfc73e5479255f6`.
Its observation catalog has 3306 concrete typed starts across 232 used slots:
`battle-script-opcode-observations.json`
`9f6c162de155a337355e17423302f372911913a8aa706ead5b08c72159f1dda3`.
It observes 11 zero-operand starts for opcode 68 and one for opcode 246;
the lossless candidate join reports the same 11/1
(`battle-script-command-candidate-audit.json`,
`2f54df1d993c05eeb517a90a00023d79b00285ef7411670618880979953d3c91`).

## Opcode 68 — `ENDSELECTIONSCRIPT`

**Encoding and PC.** It is exactly one encoded byte, `0x44`: the macro has no
operand emission, and all 11 catalogued starts have `operandWidths: []`.
The handler is exactly:

```c
static void Cmd_endselectionscript(void)
{
    *(gBattlerAttacker + gBattleStruct->selectionScriptFinished) = TRUE;
}
```

(`battle_script_commands.c:3999-4002`). It neither advances nor redirects
`gBattlescriptCurrInstr`; this is intentional terminal control, not an omitted
one-byte `++`. Calling it again writes `TRUE` again to the same location, so
the direct handler state change is idempotent. The outer selection dispatcher
stops re-entering that cursor after observing the flag.

**Authoritative state and observer.** `selectionScriptFinished` is
`bool8 selectionScriptFinished[MAX_BATTLERS_COUNT]` in `struct BattleStruct`
(`battle.h:378`). The pointer expression is C's equivalent of
`gBattleStruct->selectionScriptFinished[gBattlerAttacker]`: it is indexed by
the current attacker, not by an encoded operand. Selection entry explicitly
sets that element `FALSE` and records a per-battler
`stateIdAfterSelScript` (for example `battle_main.c:4186-4189`, 4228-4231,
4271-4274, 4326-4329, 4342-4345, and 4385-4388).

`HandleTurnActionSelectionState` is the next authoritative observer. In
`STATE_SELECTION_SCRIPT`, it changes `gBattleCommunication[gActiveBattler]`
to `stateIdAfterSelScript[gActiveBattler]` if the flag is true
(`battle_main.c:4486-4500`). In
`STATE_SELECTION_SCRIPT_MAY_RUN`, it additionally reads the controller return
buffer: `B_ACTION_NOTHING_FAINTED` commits `HITMARKER_RUN`, chooses
`B_ACTION_RUN`, and enters action-confirmed standby; the other answer clears
the recorded action and restores the saved selection state
(`battle_main.c:4508-4532`). Thus the same terminal opcode never means
“action complete.”

While the flag is false, the dispatcher restores the per-battler selection
cursor into `gBattlescriptCurrInstr`, executes at most one opcode, then writes
the cursor back to `gSelectionBattleScripts[gActiveBattler]`
(`battle_main.c:4492-4499`, mirrored at 4524-4531). That execution is gated
by `IS_BATTLE_CONTROLLER_ACTIVE_OR_PENDING_SYNC_ANYWHERE(gActiveBattler)`;
the macro includes the local controller bit plus link/pending-sync bits
(`battle_controllers.h:99-107`). Opcode 68 emits no controller command and
marks nothing pending itself, but its predecessor may: the forfeit start is
`printselectionstring`, `forfeityesnobox`, then opcode 68
(`battle_scripts_1.s:4547-4550`), and `VARIOUS_EMIT_YESNOBOX` emits the
Yes/No controller command and marks `gActiveBattler` pending
(`battle_script_commands.c:6433-6436`).

The 11 in-program starts are exactly: `PrintCantEscapeFromBattle` (3082),
`PrintFullBox` (3086), `SelectingDisabledMove` (3361), `NoMovesLeft` (3550),
`SelectingMoveWithNoPP` (3554), `SelectingTormentedMove` (3565),
`SelectingNotAllowedMoveTaunt` (3578), `SelectingImprisonedMove` (3656),
`SelectingNotAllowedMoveChoiceItem` (4388),
`ActionSelectionItemsCantBeUsed` (4428), and
`AskIfWantsToForfeitMatch` (4550). A whole-source search finds no additional
`endselectionscript` use in `battle_scripts_2.s` or elsewhere.

**Recommendation — defer opcode implementation.** A future interpreter may
report a distinct `selection-script-finished { battler }` terminal receipt,
without PC advance and with idempotent replays. It must be consumed only by a
selection-session layer that owns the flag reset, saved cursor,
`stateIdAfterSelScript`, action-selection state, controller return, and
pending-controller gate. The current generic `BattleScriptHaltReason` has
only an untagged `kind: "terminal"` (`src/engine/battleScriptMachine.ts:15-21`,
458-469), so installing this opcode as that existing halt would silently erase
the selection/action distinction.

## Opcode 246 — `FINISHACTION`

**Encoding and PC.** It is exactly one encoded byte, `0xF6`: its macro has no
parameters or operand emission. The sole committed-program use is
`BattleScript_SuccessForceOut` at `battle_scripts_1.s:3324-3332` (observation
instruction index 2431); it also has `operandWidths: []`. The handler is
exactly:

```c
static void Cmd_finishaction(void)
{
    gCurrentActionFuncId = B_ACTION_FINISHED;
}
```

(`battle_script_commands.c:10308-10311`). It likewise has no PC write,
advance, or controller emission. Replaying it only assigns the same global
action-function ID (12; `battle.h:27-44`), so the direct handler write is
idempotent. It is not a generic script-end byte: the instruction stays under
the cursor because the action scheduler switches away from script execution.

**Authoritative state and observer.** `gCurrentActionFuncId` is the global
turn-action dispatch state (`battle.h:646`). `RunTurnActionsFunctions` calls
`sTurnActionsFuncsTable[gCurrentActionFuncId]` once per turn-action pass
(`battle_main.c:4937-4956`). Slot 10 is `HandleAction_RunBattleScript`, which
runs one script opcode only when `gBattleControllerExecFlags == 0`
(`battle_main.c:536-551`; `battle_util.c:3822-3826`). After opcode 246 stores
12, the next action pass dispatches slot 12, `HandleAction_ActionFinished`.
That observer resets the active turn battler's `monToSwitchIntoId`, increments
`gCurrentTurnActionNumber`, selects the next `gActionsByTurnOrder` value, and
clears action-local status/move/script-stack state
(`battle_util.c:658-680`). `RunTurnActionsFunctions` then sees whether every
battler has acted and enters end-turn processing if so
(`battle_main.c:4945-4956`).

There is no per-battler selection flag, selection cursor, or selection
controller response in this lifecycle. The handler itself has no pending
dependency, but the preceding script may have emitted controller work; action
script execution is globally blocked until `gBattleControllerExecFlags` is
zero. The full source has six additional `battle_scripts_2.s` starts outside
the committed program: `ShakeBallThrowEnd` (103), `TrainerBallBlock` (111),
`OpponentUsesHealItem` (131), `OpponentUsesStatusCureItem` (144),
`OpponentUsesXItem` (156), and `OpponentUsesGuardSpec` (168). Therefore the
catalogue's one observed start is not a whole-source usage count; the audited
whole-source total is seven.

**Recommendation — defer opcode implementation.** It can eventually emit a
separate `action-finished` terminal receipt (no PC advance, idempotent direct
write) for an action scheduler that owns action ID 12, turn order, cleanup,
faint/end-turn handoff, and the global controller gate. Do not map it to the
existing untyped generic terminal, and do not make it set a selection flag.
The current pure machine intentionally treats only `END`/`END2` as an
unqualified shared action boundary and leaves their battle side effects out
(`battleScriptMachine.ts:495-527`); it has no action-dispatch state. Opcode
246 should wait for the main-owned typed scheduler seam and for
`battle_scripts_2.s` to be admitted to the generated program (or otherwise
represented) before it can claim whole-source coverage.

## Gate-3 verdict

Both zero-operand encodings and non-advancing PCs are settled. A generic
interpreter can expose terminal transitions safely only as a discriminated
result (`selection-script-finished` versus `action-finished`), with the
respective outer lifecycle consuming it. It cannot use the present single
`terminal` halt for both. No opcode implementation is source-safe at the
current unwired controller/scheduler/rules boundary; defer both pending the
typed selection-session and action-scheduler contracts.
