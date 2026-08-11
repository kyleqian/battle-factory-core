# `RETURNTOBALL` / `MAKEVISIBLE` Gate-3 source evidence

Scope: source-evidence audit only for the two named Battle Script mnemonics.
This is neither an implementation nor a pixel, animation, rules, RNG, PP, or
fixture change.

## Identity and complete start inventory

The supplied numeric names do not match this run's pinned source/catalog. In
the authoritative enum and dispatch table, `RETURNTOBALL` is slot **88**
(`0x58`), not 146, and `MAKEVISIBLE` is slot **111** (`0x6f`), not 162:

| mnemonic | enum / dispatch evidence | handler |
| --- | --- | --- |
| `returntoball` | `include/constants/battle_script_commands.h:94`; `src/battle_script_commands.c:419` | `Cmd_returntoball`, `battle_script_commands.c:5346-5353` |
| `makevisible` | `include/constants/battle_script_commands.h:117`; `src/battle_script_commands.c:442` | `Cmd_makevisible`, `battle_script_commands.c:6217-6224` |

`src/data/gen/battle-script-command-handlers.json`,
`battle-script-command-candidate-audit.json`, and
`battle-script-opcode-observations.json` all preserve those same slots, table
rows, handler spans, and source hash
`e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c`.
There is no source/catalog evidence that associates the names with 146/162;
this note follows the named commands and records the source IDs so a future
task can resolve any external numbering scheme before coding.

Both are direct, one-required-`battler` macros, with no wrapper path:

| mnemonic | macro emission | observed operand form |
| --- | --- | --- |
| `returntoball` | `asm/macros/battle_script.inc:517-520`: opcode `.byte`, battler `.byte` | one byte; every observed start is `[1]` |
| `makevisible` | `asm/macros/battle_script.inc:628-631`: opcode `.byte`, battler `.byte` | one byte; every observed start is `[1]` |

The generated program/observation catalogs cover `data/battle_scripts_1.s`;
a raw `rg` of both `data/battle_scripts_1.s` and `data/battle_scripts_2.s`
finds no additional invocation. Thus the full pinned-source inventory is:

| mnemonic | catalog index | script label and line | operand |
| --- | ---: | --- | --- |
| `returntoball` | 1161 | `BattleScript_EffectBatonPass`, `battle_scripts_1.s:1706` | `BS_ATTACKER` |
| `returntoball` | 2427 | `BattleScript_SuccessForceOut`, `battle_scripts_1.s:3328` | `BS_TARGET` |
| `makevisible` | 2820 | `BattleScript_YawnMakesAsleep`, `battle_scripts_1.s:3884` | `BS_EFFECT_BATTLER` |
| `makevisible` | 3227 | `BattleScript_ArenaDoJudgment`, `battle_scripts_1.s:4473` | `BS_PLAYER1` |
| `makevisible` | 3229 | `BattleScript_ArenaDoJudgment`, `battle_scripts_1.s:4475` | `BS_OPPONENT1` |

The catalog indices are its ordered instruction-start counters, not ROM
addresses. The `ArenaDoJudgment` starts each have an explicit intervening
`waitstate` (`:4474`), while `RETURNTOBALL` is followed immediately by
`getswitchedmondata` in Baton Pass and by `waitstate` in Force Out.

## Exact common interpreter protocol

Each handler has the same small script-side shape: it maps byte 1 through
`GetBattlerForBattleScript`, writes the result to `gActiveBattler`, emits one
controller command to `B_COMM_TO_CONTROLLER`, marks that active battler for
controller execution, then unconditionally advances exactly two bytes. There
is no local `gBattleControllerExecFlags` check, no message latch, no pause
counter, and no branch in either handler. The generated lexical audit records
the sole instruction-pointer write as `gBattlescriptCurrInstr += 2` for each.

The selection is **not** uniformly attacker/target. The resolver maps
`BS_TARGET`, `BS_ATTACKER`, and `BS_EFFECT_BATTLER` to
`gBattlerTarget`, `gBattlerAttacker`, and `gEffectBattler`, respectively,
and maps `BS_PLAYER1`/`BS_OPPONENT1` by current battle position
(`src/battle_util.c:694-738`). Consequently the five concrete starts select
the actor named above; none is an implicit “active”, attacker-only, or
target-only command.

`MarkBattlerForControllerExec` sets the selected local controller bit in a
non-link battle (or sends the link-outbound marker in a link battle),
`battle_util.c:847-862`. `HandleAction_RunBattleScript` only dispatches the
next command when the *whole* execution word is zero (`:3822-3826`). Local
controller completion restores its command runner and clears exactly that
battler's bit (`PlayerBufferExecCompleted`,
`battle_controller_player.c:200-214`; opponent analogue `:527-541`). This is
the shared pending/idle and acknowledgement contract. It is acknowledgement
of controller completion, not a claim that both visual operations have the
same completion timing.

## Distinct controller payloads and completions

The emitted commands are materially different:

| script mnemonic | controller payload | local player/opponent outcome |
| --- | --- | --- |
| `RETURNTOBALL` | `BtlController_EmitReturnMonToBall(..., TRUE)` writes `[CONTROLLER_RETURNMONTOBALL, TRUE]` and transfers **2** bytes (`battle_controllers.c:1027-1032`) | Since byte 1 is true, each handler skips the switch-out animation, frees the mon OAM matrix, destroys the battler sprite, hides its healthbox (and the opponent shadow), then acknowledges immediately (`battle_controller_player.c:2227-2241`; `battle_controller_opponent.c:1200-1214`). The false branch, not used here, launches substitute/switch-out animations and only later destroys/acknowledges (`player:2244-2262,1328-1336`; `opponent:1217-1235,422-431`). |
| `MAKEVISIBLE` | `BtlController_EmitSpriteInvisibility(..., FALSE)` writes `[CONTROLLER_SPRITEINVISIBILITY, FALSE, CONTROLLER_SPRITEINVISIBILITY, CONTROLLER_SPRITEINVISIBILITY]` and transfers **4** bytes (`battle_controllers.c:1535-1542`) | If `IsBattlerSpritePresent(active)` is true, the handler sets only that sprite's `invisible` field to false and copies it into persistent battle-sprite data; whether present or not, it immediately acknowledges (`player:3056-3064`; `opponent:1980-1988`). |

`CONTROLLER_RETURNMONTOBALL` and `CONTROLLER_SPRITEINVISIBILITY` are distinct
enum commands (`include/battle_controllers.h:192,237`). The latter runs across
the regular local/link controller families; Safari and Wally simply complete
it without changing a sprite (`battle_controller_safari.c:653-656`,
`battle_controller_wally.c:1531-1534`). That controller-family variation is
another reason not to mistake the shared dispatch/ack shape for one semantic
operation.

Visibility has a state dependency that the script handler itself does not
own: it only changes an extant, present battler sprite, with presence defined
from contest state, position, side, and party HP (`battle_anim_mons.c:871ff`).
The copied `battlerData[].invisible` value participates in subsequent sprite
and shadow behavior (`battle_gfx_sfx_util.c:923-932,1203-1226`). By contrast,
this opcode's `RETURNTOBALL` always asks for `skipAnim = TRUE`, so the
controller removes sprite/healthbox resources; it does not merely set a
visibility bit. Its only concrete uses sit in switch/forced-out flows, with
different later data and action sequencing.

## Decision and narrow future recommendation

**Do not implement these as one typed semantic controller seam.** They share
only the already-general script-to-controller lifecycle:

```ts
type PendingControllerCommand = Readonly<{
  battler: BattlerId;
  // a discriminated semantic payload, then an explicit acknowledgement
}>;
```

When the existing scheduler/controller boundary is ready, add separate
discriminants such as `return-mon-to-ball { battler, skipAnimation: true }`
and `set-battler-sprite-visibility { battler, invisible: false }`. Execution
of either command may use the common rule: select the operand-resolved
battler, append one pending command, advance two bytes, and require an
explicit acknowledgement before the global all-idle dispatcher continues.
Only the second can initially acknowledge synchronously after applying a
typed visibility state *if* the future presentation model has established
sprite presence. The first must remain blocked behind an explicit
sprite/healthbox destruction and (for the general false payload) substitute/
switch-out animation lifecycle. No source evidence authorizes collapsing
those resource effects or their completion condition.

Excluded: implementation of either opcode, a generic raw-byte controller
transport, generic `WAITSTATE`, sprite allocation/destruction, healthbox or
shadow rendering, substitute/switch-out animation, scene timing/pixels,
audio, battle rules, RNG, PP, and controller support for link/Safari/Wally.
Any later hypothetical Pokémon fixture must specify `ppUps: [0, 0, 0, 0]`.
