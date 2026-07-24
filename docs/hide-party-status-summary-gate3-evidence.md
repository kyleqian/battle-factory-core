# `HIDEPARTYSTATUSSUMMARY` Gate-3 source evidence

Scope: source/catalog audit for this one Battle Script command. This records
controller receipt and scheduling only; it neither implements nor claims the
party-summary tray's presentation lifetime.

## Identity, bytecode, and complete starts

`B_SCR_OP_HIDEPARTYSTATUSSUMMARY` is enum slot **98** (`0x62`):
`include/constants/battle_script_commands.h:104` and the dispatch entry at
`src/battle_script_commands.c:429` select `Cmd_hidepartystatussummary`
(`:5734-5741`). The generated command-handler/candidate-audit catalogs retain
that same slot, table row, handler span, and source definition hash
`2d7325fa02dee3f401a8cd25b2e5def8a13c4de94aedf847282f1120baf6f707`
(from source file hash
`e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c`).

The sole macro is `hidepartystatussummary battler:req`
(`asm/macros/battle_script.inc:567-570`). It emits the opcode byte then one
`battler` byte, with the only macro wrapper path `[hidepartystatussummary]`.
The generated macro/program/observation catalogs cover
`data/battle_scripts_1.s`; they record exactly four typed starts, all operand
width `[1]`. A whole-source scan finds no invocation in
`data/battle_scripts_2.s`, so the pinned-source inventory is complete:

| catalog instruction index | script label / source line | selector |
| ---: | --- | --- |
| 2077 | `BattleScript_FaintedMonTryChoose`, `battle_scripts_1.s:2878` | `BS_ATTACKER` |
| 2087 | `BattleScript_FaintedMonSendOutNew`, `:2889` | `BS_FAINTED` |
| 2105 | `BattleScript_LinkHandleFaintedMonLoop`, `:2912` | `BS_FAINTED` |
| 2257 | `BattleScript_DoSwitchOut`, `:3115` | `BS_ATTACKER` |

`BS_ATTACKER` is value 1 and `BS_FAINTED` is value 3
(`include/constants/battle_script_commands.h:303-307`). The resolver maps
them specifically to `gBattlerAttacker` and `gBattlerFainted`, respectively
(`src/battle_util.c:694-716`). Thus every concrete use chooses the relevant
switching attacker or the recorded fainted battler; this is not an implicit
current-active-battler command. The two `BS_ATTACKER` starts are followed by
`switchinanim`; both `BS_FAINTED` starts follow the same hide-then-
`switchinanim` ordering (`battle_scripts_1.s:2873-2891,2907-2914,3109-3117`).

## Exact interpreter and controller protocol

The handler has no branch and no local `gBattleControllerExecFlags`, message,
or idle guard. On every receipt it does exactly this:

1. Resolves instruction byte 1 with `GetBattlerForBattleScript` and writes the
   result to `gActiveBattler`.
2. Calls `BtlController_EmitHidePartyStatusSummary(B_COMM_TO_CONTROLLER)`.
3. Marks that resolved battler pending with `MarkBattlerForControllerExec`.
4. Unconditionally advances `gBattlescriptCurrInstr += 2`.

Those are the four substantive source lines at
`battle_script_commands.c:5736-5740`; the generated lexical audit likewise
records the sole instruction-pointer write as the literal two-byte advance.

The emitter is payload-free apart from the command identifier:
`battle_controllers.c:1517-1524` writes all four transfer bytes as
`CONTROLLER_HIDEPARTYSTATUSSUMMARY` and transfers length 4. This controller
enum value is **49** (zero-based; its ordered enum slot is
`include/battle_controllers.h:186-235`). It is therefore sound for a typed
event to contain only the already-resolved `battler`:

```ts
Readonly<{ kind: "hide-party-status-summary"; battler: BattlerId }>
```

No script operand, party data, flag, animation id, duration, or resource id is
carried by this controller message. This is a semantic command, not a raw
four-byte payload API.

`MarkBattlerForControllerExec` sets the selected local controller bit for a
non-link battle (or the outbound-link marker for a link battle),
`battle_util.c:847-862`. `HandleAction_RunBattleScript` executes another
command only when the *whole* controller-execution word is zero
(`battle_util.c:3822-3826`). The existing pending/ack scheduler is therefore
the right receipt boundary: append exactly one immutable event, mark that
resolved battler pending, advance two bytes once, and clear only through an
acknowledgement.

## Acknowledgement is intentionally earlier than tray completion

The normal player and opponent command tables dispatch controller 49 to the
corresponding hide handlers (`battle_controller_player.c:150-178`,
`battle_controller_opponent.c:134-163`). Each handler has the same shape:
if `partyStatusSummaryShown` is true, it only reassigns the existing
summary-task function to `Task_HidePartyStatusSummary`; whether shown or not,
it immediately calls its `*BufferExecCompleted` routine
(`player:3042-3047`; `opponent:1968-1973`). The player completion routine
clears the selected local pending bit (`player:200-214`); the opponent
analogue does the same (`opponent:527-541`). This is acknowledgement of
**command receipt/task kickoff**, not the later visual teardown.

The five other regular controller families preserve that same local guard and
immediate acknowledgement: player partner (`battle_controller_player_partner.c:1878-1883`),
recorded player (`battle_controller_recorded_player.c:1755-1760`), recorded
opponent (`battle_controller_recorded_opponent.c:1727-1732`), link partner
(`battle_controller_link_partner.c:1635-1640`), and link opponent
(`battle_controller_link_opponent.c:1784-1789`). Safari and
Wally also dispatch controller 49 but are immediate no-ops
(`battle_controller_safari.c:643-646`; `battle_controller_wally.c:1521-1524`).
Link's transport/received-marker path remains owned by the existing generic
controller protocol; it does not change this command's payload or make the
visual task an acknowledgement condition.

The separate UI task proves the distinction. When a regular handler finds a
shown summary, `Task_HidePartyStatusSummary` begins afterwards by enabling
blend mode, setting an initial blend of 16, and assigning per-icon/bar exit
callbacks (`battle_interface.c:1671-1724`). Its battle-start branch fades
every other task tick and destroys the sprites/task only later
(`:1727-1776`); its during-battle branch fades each task tick and likewise
does not destroy/reset state until later (`:1779-1807`). The command handler
does not wait on either branch. Existing Scene-OFF presentation notes also
pin a during-battle icon-bar fade/destroy window as this task's independent
work (`docs/battle-turn-notes.md:4518-4534`).

## Decision

**Safe now for the narrow controller seam:** represent each script receipt as
one immutable `hide-party-status-summary` event for the operand-resolved
battler, then use the existing pending/ack scheduler. Advance exactly two
bytes at receipt; acknowledge controller completion rather than any animation
lifetime. This matches all four starts, both active-battler selectors, the
exact four-byte controller transfer, regular-family shown guards, and the
Safari/Wally no-op families.

**Defer presentation/resource work:** the event must not pretend to have
hidden sprites synchronously. The tray task owns blend registers, six icon
sprites, a bar sprite, exit callbacks, side/order behavior, task destruction,
and the delayed clearing of `partyStatusSummaryShown`; its cadence differs
between battle-start and during-battle cases. No source evidence authorizes
binding scheduler acknowledgement to that lifetime, synthesizing its visual
state, or treating Scene-OFF as proof that the resources/timing are absent.

Excluded: implementation, raw controller transport, `waitstate`, summary
sprite allocation/destruction, blend/register or pixel timing, Scene-ON/OFF
rendering, rules/RNG/PP work, and fixtures. If a future fixture needs a
Pokémon builder, it must use `ppUps: [0, 0, 0, 0]`.
