# `TRAINERSLIDEIN` / `TRAINERSLIDEOUT` Gate-3 source evidence

Scope: pinned-source and generated-catalog audit for these two Battle Script
commands only. This establishes a narrow script-to-controller receipt seam. It
does not implement trainer sprites, controller-family presentation, timing, or
pixels.

## Opcode identity and observed bytecode

The authoritative enum and dispatch table identify two separate commands:

| command | opcode | enum / dispatch | handler |
| --- | ---: | --- | --- |
| `TRAINERSLIDEIN` | **83** (`0x53`) | `reference/pokeemerald/include/constants/battle_script_commands.h:89`; `reference/pokeemerald/src/battle_script_commands.c:414` | `Cmd_trainerslidein`, `battle_script_commands.c:5301-5308` |
| `TRAINERSLIDEOUT` | **248** (`0xf8`) | `reference/pokeemerald/include/constants/battle_script_commands.h:254`; `reference/pokeemerald/src/battle_script_commands.c:579` | `Cmd_trainerslideout`, `battle_script_commands.c:10319-10326` |

The direct macros each emit one opcode byte followed by one required operand
byte:

- `trainerslidein battler:req` is
  `reference/pokeemerald/asm/macros/battle_script.inc:493-496`.
- `trainerslideout position:req` is
  `reference/pokeemerald/asm/macros/battle_script.inc:1251-1254`.

The generated observations independently retain this shape. In
`src/data/gen/battle-script-opcode-observations.json`, slot 83 has exactly ten
observed instruction starts, all with operand widths `[1]`, at catalog indices
2115, 2121, 2146, 2153, 2161, 2166, 2183, 2188, 2200, and 2206. Slot 248 has
exactly five observed starts, also all `[1]`, at 2119, 2151, 2164, 2186, and
2204. The catalog covers the assembled program sourced from
`data/battle_scripts_1.s`; its recorded invocations are:

| opcode | label / source line | operand |
| --- | --- | --- |
| in | `BattleScript_LocalBattleWonLoseTexts`, `battle_scripts_1.s:2927` | `BS_ATTACKER` |
| out | same, `:2931` | `B_POSITION_OPPONENT_LEFT` |
| in | same, `:2933` | `BS_FAINTED` |
| in | `BattleScript_LocalBattleLostPrintTrainersWinText`, `:2966` | `BS_ATTACKER` |
| out | `BattleScript_LocalBattleLostDoTrainer2WinText`, `:2972` | `B_POSITION_OPPONENT_LEFT` |
| in | same, `:2974` | `BS_FAINTED` |
| in | `BattleScript_FrontierLinkBattleLost`, `:2985` | `BS_ATTACKER` |
| out | same, `:2988` | `B_POSITION_OPPONENT_LEFT` |
| in | same, `:2990` | `BS_FAINTED` |
| in | `BattleScript_TowerLinkBattleWon`, `:3013` | `BS_ATTACKER` |
| out | same, `:3016` | `B_POSITION_OPPONENT_LEFT` |
| in | same, `:3018` | `BS_FAINTED` |
| in | `BattleScript_FrontierTrainerBattleWon_LoseTexts`, `:3035` | `BS_ATTACKER` |
| out | same, `:3039` | `B_POSITION_OPPONENT_LEFT` |
| in | same, `:3041` | `BS_FAINTED` |

A whole-source scan adds one invocation outside that generated program:
`BattleScript_ActionWallyThrow` uses `trainerslidein BS_TARGET` at
`reference/pokeemerald/data/battle_scripts_2.s:198`. There are no other
`trainerslidein` or `trainerslideout` invocations in the two pinned Battle
Script files.

The generated handler and candidate-audit catalogs agree with the pinned C
source. They record source file hash
`e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c`
and definition hashes
`db90774b98e31fa499591246713b292079fc1eae67294638caca215f82470056`
for slide-in and
`03bb6dd9578fdbbb176eab1571ecda3026d730f03b9dd01cdd2e6835ea4986e5`
for slide-out
(`src/data/gen/battle-script-command-candidate-audit.json`, slots 83 and
248).

## The operand is a battler position

Despite the `battler` parameter name on the slide-in macro, both C handlers
resolve byte 1 with:

```c
gActiveBattler = GetBattlerAtPosition(gBattlescriptCurrInstr[1]);
```

That is direct at `battle_script_commands.c:5303` and `:10321`. Neither
handler calls `GetBattlerForBattleScript`.

`GetBattlerAtPosition` scans `gBattlerPositions` for the supplied position
(`reference/pokeemerald/src/battle_anim_mons.c:859-869`). The position enum is
player-left 0, opponent-left 1, player-right 2, and opponent-right 3
(`reference/pokeemerald/include/constants/battle.h:26-33`).

The script spellings are potentially misleading because `BS_TARGET`,
`BS_ATTACKER`, and `BS_FAINTED` have the numerically overlapping values 0, 1,
and 3 (`include/constants/battle_script_commands.h:303-307`). For these two
commands those bytes are nevertheless interpreted as positions by the called
resolver. A future seam must therefore expose a typed
`getBattlerAtPosition(position)` operation and carry the resolved battler. It
must not reuse the general `GetBattlerForBattleScript` selector resolver.

## Exact script-side receipt protocol

Neither handler has a local controller-idle guard, branch, message latch, or
pause counter. Each performs the same four-step protocol:

1. Resolve instruction byte 1 as a battler position and assign
   `gActiveBattler`.
2. Emit its direction-specific command to `B_COMM_TO_CONTROLLER`.
3. Call `MarkBattlerForControllerExec(gActiveBattler)`.
4. Advance `gBattlescriptCurrInstr` by exactly two bytes.

The generated lexical facts preserve the one-byte read and the sole
instruction-pointer write, `gBattlescriptCurrInstr += 2`, for both handlers
(`src/data/gen/battle-script-handler-lexical-facts.json`, the two handler
records).

The controller messages are also direction-specific. The controller enum
places `CONTROLLER_TRAINERSLIDE` and
`CONTROLLER_TRAINERSLIDEBACK` in consecutive but distinct slots 8 and 9
(`reference/pokeemerald/include/battle_controllers.h:184-195`).
`BtlController_EmitTrainerSlide` fills all four transferred bytes with the
first ID, while `BtlController_EmitTrainerSlideBack` fills all four with the
second (`reference/pokeemerald/src/battle_controllers.c:1043-1059`). No
position, trainer picture, coordinate, speed, duration, or resource ID is
included in the transferred payload; position resolution has already selected
the receiving battler.

`MarkBattlerForControllerExec` sets the selected local-controller bit in a
non-link battle or the link outbound-message marker in a link battle
(`reference/pokeemerald/src/battle_util.c:847-862`). The normal script action
dispatches another opcode only while the entire execution word is zero
(`battle_util.c:3822-3826`). This supports a pending controller-receipt seam,
but it does not by itself establish when presentation is complete.

## Pending/ack is not universal animation completion

At the proposed Gate-3 boundary, pending plus semantic acknowledgement means
only that a direction-specific command was received and its controller work
was initiated. It must not be described as a universal trainer-slide
animation completion signal. The native controllers prove that no such
portable completion point exists:

- Normal player and opponent slide-in handlers allocate/configure a trainer
  sprite, install `SpriteCB_TrainerSlideIn`, and leave their controller
  function waiting until the sprite callback becomes `SpriteCallbackDummy`
  (`reference/pokeemerald/src/battle_controller_player.c:2353-2389,908-918`;
  `battle_controller_opponent.c:1325-1393,191-201`).
- Their slide-out handlers start a linear translation. Later controller
  functions wait for the callback to become dummy, then free sprite/OAM
  resources and acknowledge the native command
  (`battle_controller_player.c:920-928,2393-2403`;
  `battle_controller_opponent.c:203-211,1397-1405`).
- Link-opponent slide-in creates and starts the sprite but immediately calls
  `LinkOpponentBufferExecCompleted`; the source comment explicitly notes that
  the previously assigned callback-wait controller function is overwritten
  (`reference/pokeemerald/src/battle_controller_link_opponent.c:1304-1326`).
- Player-partner, recorded-player, recorded-opponent, and link-partner
  slide-in handlers immediately acknowledge as no-ops
  (`battle_controller_player_partner.c:1346-1349`;
  `battle_controller_recorded_player.c:1257-1260`;
  `battle_controller_recorded_opponent.c:1256-1259`;
  `battle_controller_link_partner.c:1155-1158`). Safari immediately
  acknowledges both directions (`battle_controller_safari.c:371-379`).
- Wally slide-in creates a sprite and waits on its callback, whereas Wally
  slide-out immediately acknowledges
  (`battle_controller_wally.c:1050-1070`).

The callback itself advances horizontal `x2` only when the intro-slide flag
allows it, may enter a vertical phase, and becomes dummy only at the relevant
zero coordinate
(`reference/pokeemerald/src/battle_gfx_sfx_util.c:396-417`). That timing is
controller/presentation behavior, not data encoded in either Battle Script
instruction.

Native `*BufferExecCompleted` functions clear the relevant local execution bit
or send the link done message (for representative player and opponent
implementations, see `battle_controller_player.c:200-214` and
`battle_controller_opponent.c:527-541`). Because different controller
families invoke completion at different points, a semantic Gate-3 receipt
acknowledgement must not claim to reproduce those family-specific callback,
resource, or visual lifetimes. Likewise, a following `waitstate` only observes
the native global pending word; it is not evidence for one universal
animation-duration contract.

## Safe boundary and deferred work

The two receipts may share a union only if their discriminants remain
distinct:

```ts
type TrainerSlideReceipt =
  | Readonly<{ kind: "trainer-slide-in"; battler: BattlerId }>
  | Readonly<{ kind: "trainer-slide-out"; battler: BattlerId }>;
```

For either opcode, the narrow safe operation is: read one position byte,
resolve it through `getBattlerAtPosition`, emit exactly one immutable
direction-specific semantic receipt, mark that resolved battler pending, and
advance two bytes once. Any semantic acknowledgement at this seam records
receipt/controller-work initiation only.

Deferred in full: trainer-picture selection; decompression and templates;
palette, OAM, and sprite allocation/freeing; coordinate setup and linear
translation; sprite lifetime; callback/task timing; `gIntroSlideFlags`;
controller-family-specific completion; rendering; Battle Scene OFF/ON timing;
and pixel acceptance. This note makes no rules, RNG, PP, fixture, animation,
or visual-parity claim.
