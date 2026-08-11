# PLAYSE / FANFARE Gate-3 evidence

Scope: source evidence for the Battle Script opcodes only. This is a scheduler
and controller-boundary recommendation, not an audio implementation.

## Provenance and concrete starts

`B_SCR_OP_PLAYSE` is enum slot 84 (the dispatch-table row is
`src/battle_script_commands.c:415`, `Cmd_playse`, lines 5310--5317); `FANFARE`
is slot 85 (row 416, `Cmd_fanfare`, lines 5319--5326). The generated handler
catalog pins those definitions and source hash
`e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c`.

Both source forms are direct one-parameter macros in
`asm/macros/battle_script.inc`: `playse song:req` at 498--501 and `fanfare
song:req` at 503--506. Each emits its opcode with `.byte`, followed by the
single supplied `song` expression with `.2byte`; the generated macro catalog
records the sole wrapper path as `[playse]` or `[fanfare]`. There are no other
wrapper or operand-width forms in that macro catalog.

The generated assembled-program/observation catalogs deliberately cover only
`data/battle_scripts_1.s`. They record every concrete start there, all with
the one `[2]` operand-width sequence:

| Opcode | Catalog starts (instruction index; script line; payload) |
| --- | --- |
| `PLAYSE` | 3210; 4451; `SE_ARENA_TIMEUP1` — `BattleScript_ArenaTurnBeginning`<br>3212; 4453; `SE_ARENA_TIMEUP1` — same<br>3220; 4464; `SE_DING_DONG` — `BattleScript_ArenaNothingDecided`<br>3232; 4478; `SE_ARENA_TIMEUP1` — `BattleScript_ArenaDoJudgment`<br>3234; 4480; `SE_ARENA_TIMEUP1` — same |
| `FANFARE` | 2294; 3156; `MUS_LEVEL_UP` — `BattleScript_LevelUp`<br>2318; 3184; `MUS_LEVEL_UP` — `BattleScript_LearnedNewMove` |

A raw whole-source scan finds five additional `PLAYSE` invocations in the
non-catalogued `data/battle_scripts_2.s`, all via that same direct macro and
therefore the same 16-bit form: `SE_USE_ITEM` at 120, 136, 149, and 161
(`BattleScript_OpponentUses{HealItem,StatusCureItem,XItem,GuardSpec}`), plus
`SE_FLEE` at 171 (`BattleScript_RunByUsingItem`). No `FANFARE` occurs in that
file, and no other `playse`/`fanfare` source invocation exists in either
Battle Script source file.

## Handler and controller facts

Neither handler has a local `gBattleControllerExecFlags` guard. Each does,
in order: select `gBattlerAttacker` as `gActiveBattler`; read the little-endian
u16 at instruction bytes 1--2; emit a controller message to
`B_COMM_TO_CONTROLLER`; mark that active battler for controller execution;
and unconditionally advance `gBattlescriptCurrInstr += 3`.

The emitted four-byte controller payloads are exact:

| Script opcode | `gBattleBufferA[gActiveBattler]` payload |
| --- | --- |
| `PLAYSE` | `[CONTROLLER_PLAYSE, songId & 0xff, songId >> 8, 0]` |
| `FANFARE` | `[CONTROLLER_PLAYFANFAREORBGM, songId & 0xff, songId >> 8, FALSE]` |

This comes from `BtlController_EmitPlaySE` and
`BtlController_EmitPlayFanfareOrBGM` (`battle_controllers.c:1461--1477`).
`Cmd_fanfare` supplies `FALSE`, so this script opcode selects the fanfare
branch of the shared fanfare-or-BGM controller command; it is not evidence for
a Battle Script BGM event.

For local battles, `MarkBattlerForControllerExec` (`battle_util.c:856--862`)
sets the selected battler bit in `gBattleControllerExecFlags`. The global
action dispatcher, rather than either audio handler, only runs the next script
command when that word is zero (`HandleAction_RunBattleScript`,
`battle_util.c:3822--3826`). The normal player controller shows the local
endpoint: it derives SE pan from `GetBattlerSide(gActiveBattler)`, invokes
`PlaySE12WithPanning`, then immediately calls `PlayerBufferExecCompleted`
(`battle_controller_player.c:2882--2892`). Its fanfare-or-BGM handler invokes
`PlayFanfare` when byte 3 is zero and also immediately completes
(`2895--2907`). `PlayerBufferExecCompleted` clears that battler's active bit
in a non-link battle (`200--212`). Opponent, Safari, Wally, recorded, link,
and partner controller families dispatch the same two command IDs and use the
same immediate-completion pattern; link transport is the separate branch of
the existing controller protocol.

Thus a controller acknowledgement gates script scheduling, but neither opcode
waits for SE or fanfare playback to finish. The distinct Battle Script
`waitstate` opcode (slot 58; macro lines 331--333; handler
`battle_script_commands.c:3927--3931`) advances only once the *whole*
`gBattleControllerExecFlags` word is zero. It is not an audio-completion
primitive. In particular, the two `FANFARE` starts continue to message/level
logic without a fanfare-duration wait. `IsFanfareTaskInactive` and
field-script `waitfanfare` are outside this Battle Script/controller path and
must not be collapsed into it.

## Narrow future seam

When this opcode family is implemented, expose two immutable semantic events,
for example `{ kind: "play-se", battler, songId }` and
`{ kind: "play-fanfare", battler, songId }`. The interpreter must set the
attacker-owned controller command pending, append exactly one corresponding
event, and advance three bytes. The scheduler/controller boundary then
acknowledges command receipt (not sound completion) before permitting the
normal global controller-idle rule to run another script command. Keep the
fanfare event distinct from SE and do not infer a BGM variant from this
opcode.

Excluded: PCM/sequence playback, mixing, pan rendering, duration modelling,
Scene-OFF/ON presentation, pixel work, and any rule/RNG/PP change. Any future
fixture that needs a Pokémon builder remains `ppUps: [0, 0, 0, 0]`.
