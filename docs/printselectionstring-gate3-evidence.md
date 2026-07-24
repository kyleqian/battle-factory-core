# `PRINTSELECTIONSTRING` Gate-3 source evidence

Scope: mechanical source audit only for selection-message opcode `17`
(`B_SCR_OP_PRINTSELECTIONSTRING`) and its table-selected sibling opcode `20`
(`B_SCR_OP_PRINTSELECTIONSTRINGFROMTABLE`). This is not an implementation,
renderer, audio system, PP change, or a claim of pixel parity.

## Opcode forms and complete generated-start inventory

The opcode enum assigns `B_SCR_OP_PRINTSELECTIONSTRING` slot **17** (`0x11`)
at `reference/pokeemerald/include/constants/battle_script_commands.h:23` and
the C dispatch table maps it to `Cmd_printselectionstring` at
`reference/pokeemerald/src/battle_script_commands.c:348`. Its macro is
exactly one opcode byte plus one `.2byte id`
(`reference/pokeemerald/asm/macros/battle_script.inc:75-78`). The generated
handler catalog records that exact handler span (2148-2157) at
`src/data/gen/battle-script-command-handlers.json` (`slots[index=17]`).

The generated observation catalog finds exactly **10** concrete opcode-17
starts, all with the observed two-byte string-ID form. `index` below is the
catalog's ordered concrete instruction-start counter, not a ROM address.

| catalog index | label | source invocation | operand |
| ---: | --- | --- | --- |
| 2232 | `BattleScript_PrintFullBox` | `data/battle_scripts_1.s:3084-3086` | `STRINGID_BOXISFULL` |
| 2449 | `BattleScript_SelectingDisabledMove` | `:3359-3361` | `STRINGID_PKMNMOVEISDISABLED` |
| 2590 | `BattleScript_NoMovesLeft` | `:3548-3550` | `STRINGID_PKMNHASNOMOVESLEFT` |
| 2592 | `BattleScript_SelectingMoveWithNoPP` | `:3552-3554` | `STRINGID_NOPPLEFT` |
| 2599 | `BattleScript_SelectingTormentedMove` | `:3563-3565` | `STRINGID_PKMNCANTUSEMOVETORMENT` |
| 2606 | `BattleScript_SelectingNotAllowedMoveTaunt` | `:3576-3578` | `STRINGID_PKMNCANTUSEMOVETAUNT` |
| 2662 | `BattleScript_SelectingImprisonedMove` | `:3654-3656` | `STRINGID_PKMNCANTUSEMOVESEALED` |
| 3165 | `BattleScript_SelectingNotAllowedMoveChoiceItem` | `:4386-4388` | `STRINGID_ITEMALLOWSONLYYMOVE` |
| 3194 | `BattleScript_ActionSelectionItemsCantBeUsed` | `:4426-4428` | `STRINGID_ITEMSCANTBEUSEDNOW` |
| 3295 | `BattleScript_AskIfWantsToForfeitMatch` | `:4547-4550` | `STRINGID_QUESTIONFORFEITMATCH` |

The ten starts and their shared `[2]` operand-width observation are in
`src/data/gen/battle-script-opcode-observations.json`
(`opcodes[slot.id=17]`, `instructionStarts[opcode.id=17]`). All use the
direct macro; there is no further wrapper path.

`printselectionstringfromtable` is **not** an opcode-17 wrapper: it emits the
separate opcode **20** (`0x14`), then a `.4byte ptr`
(`reference/pokeemerald/asm/macros/battle_script.inc:90-93`; enum lines
24-26; dispatch table `battle_script_commands.c:351`). Its one concrete
start is catalog index **2230**, `BattleScript_PrintCantEscapeFromBattle`,
`data/battle_scripts_1.s:3080-3082`, operand `gNoEscapeStringIds`; the
observation catalog records its `[4]` width. The handler resolves the
`const u16 *` operand, adds `gBattleCommunication[MULTISTRING_CHOOSER]`, and
uses the selected `u16` (`battle_script_commands.c:2194-2207`). It therefore
shares the selection-controller operation but has pointer-plus-chooser input,
not the direct opcode-17 string-ID input.

## Exact command and controller lifecycle

`Cmd_printselectionstring` is deliberately **not locally busy-gated**:

1. It unconditionally assigns `gActiveBattler = gBattlerAttacker`.
2. It emits `BtlController_EmitPrintSelectionString(B_COMM_TO_CONTROLLER,
   T2_READ_16(curr + 1))`.
3. It marks that active battler for controller execution.
4. It advances the instruction pointer by **3** and sets
   `gBattleCommunication[MSG_DISPLAY] = 1`.

Those are all direct writes in
`reference/pokeemerald/src/battle_script_commands.c:2148-2157`. In the normal
engine the script dispatcher itself only invokes an opcode when the whole
`gBattleControllerExecFlags` word is zero
(`reference/pokeemerald/src/battle_util.c:3822-3826`), so a pending controller
prevents a normal second dispatch. The absence of an `if` remains meaningful:
calling this handler outside that dispatcher would emit, advance, and set the
latch even if a controller were busy. This differs from `Cmd_printstring`
(busy-gated, 2137-2146), `Cmd_waitmessage` (2159-2178), and the table sibling
(busy-gated, 2194-2207). The table sibling otherwise assigns the same active
battler, marks it busy, advances **5**, and sets the same latch.

The emitter's local controller payload is not merely a string ID. It writes
`CONTROLLER_PRINTSTRINGPLAYERONLY` in bytes 0 and 1, the little-endian string
ID in bytes 2-3, then transfers `sizeof(BattleMsgData) + 4`
(`reference/pokeemerald/src/battle_controllers.c:1168-1195`). It actively
serializes current/original move, last item/ability, scripting battler, script
party index, every battler ability, and all three text buffers. Its C layout
also contains `hpScale`, `itemEffectBattler`, and `moveType`
(`reference/pokeemerald/include/battle_message.h:202-215`), but this emitter
does **not** assign those three fields before transferring the full struct;
the ordinary `BtlController_EmitPrintString` does assign them immediately
above (1136-1166). Consequently source byte fidelity would include the current
contents of those three slots in the shared, initially zeroed transfer buffer
(`battle_controllers.c:20`), not a fresh selection-message value. They are
not part of the narrow semantic selection event. The transfer is copied to
`gBattleBufferA[active]` for `B_COMM_TO_CONTROLLER` in local battles
(`battle_controllers.c:655-677`; `battle_controllers.h:113-118`).

`MarkBattlerForControllerExec` sets the local active bit (or a link-outbound
bit) at `reference/pokeemerald/src/battle_util.c:847-862`; the local active
bit is `gBitTable[battler]` (`include/battle_controllers.h:75-82`). For the
normal player controller, the player-only command invokes ordinary printing
only when the active battler is on the player side; otherwise it completes
immediately (`src/battle_controller_player.c:2557-2563`). The opponent
controller's player-only handler always completes immediately
(`src/battle_controller_opponent.c:1535-1538`). Ordinary local player text
completion waits until `B_WIN_MSG`'s printer is inactive and then clears the
controller execution bit through `PlayerBufferExecCompleted`
(`battle_controller_player.c:200-224`, `1339-1343`). No renderer or sound
work is required to model that scheduler acknowledgement.

## Display latch and later waits/clears

Opcode 17 only sets `MSG_DISPLAY`; it never clears it. The immediate scripts
above all go straight to `endselectionscript`, except the forfeit script which
first emits `forfeityesnobox`. `Cmd_endselectionscript` only writes its
selection-finished flag and neither waits for a controller nor clears the
display latch (`battle_script_commands.c:3999-4002`). Thus none of the ten
concrete opcode-17 entries supplies an in-script `waitmessage` clear.

The source mechanisms that must stay separate are:

- `Cmd_waitstate` advances its one-byte opcode only when all controller
  execution flags are clear; it does not inspect or clear `MSG_DISPLAY`
  (`battle_script_commands.c:3927-3931`).
- `Cmd_waitmessage` first requires that same all-idle condition. If the latch
  is already zero it advances three bytes immediately; otherwise it increments
  `gPauseCounterBattle`, and only at the operand threshold resets that counter,
  advances three bytes, and clears the latch
  (`battle_script_commands.c:2159-2178`).
- `Cmd_attackstring` clears `MSG_DISPLAY` when it advances
  (`battle_script_commands.c:1191-1203`). `Cmd_resultmessage` also clears it
  only in its no-result branch (`battle_script_commands.c:2048-2135`, line
  2126). They are later general battle-message behavior, not hidden effects
  of opcode 17.

## Safe implementation boundary

The narrow safe seam is a typed scheduler acknowledgement plus a semantic
controller event, not a byte buffer or presentation implementation. A future
rules/control layer can express the source operation as:

```ts
type ControllerEvent = Readonly<{
  kind: "printSelectionString";
  battler: BattlerId; // attacker chosen by the opcode
  stringId: BattleStringId;
  message: BattleMessageSnapshot;
}>;

type ScriptScheduler = Readonly<{
  programCounter: ProgramCounter;
  pendingControllers: ReadonlySet<BattlerId>;
  messageDisplay: boolean;
}>;
```

`BattleMessageSnapshot` should have named fields for the explicitly assigned
source snapshot listed above (including a fixed typed three-buffer value), not
expose `gBattleBufferA`, raw byte arrays, or the three stale transport fields.
Executing opcode 17 replaces the active battler with the attacker, appends one
`printSelectionString` event, marks that battler pending, advances by three,
and sets `messageDisplay: true`.
The controller/scheduler boundary must later accept an explicit typed
completion for that battler; only a separately implemented `WAITSTATE` or
`WAITMESSAGE` consumes pending state, and only the latter owns its pause/latch
clear rule. Selection scripts may then independently set their finished flag.

This is the safe next boundary only. It does not implement opcode 17, opcode
20 table resolution, string expansion, input, rendering, audio, PP, move
legality, or a generic controller transport.
