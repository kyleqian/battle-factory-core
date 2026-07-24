# `INITMULTIHITSTRING` Gate-3 source evidence

Scope: mechanical audit only for `B_SCR_OP_INITMULTIHITSTRING` / `Cmd_initmultihitstring`; no rules, controller, PP, or renderer implementation is implied.

## Opcode and exact write

`B_SCR_OP_INITMULTIHITSTRING` is enum/table slot **142** (`0x8e`):
`include/constants/battle_script_commands.h:148` names it and
`src/battle_script_commands.c:473` maps it to `Cmd_initmultihitstring`.
The macro has no operands and emits exactly that one opcode byte
(`asm/macros/battle_script.inc:771-773`). The handler calls
`PREPARE_BYTE_NUMBER_BUFFER(gBattleScripting.multihitString, 1, 0)` then
advances the script pointer by one (`src/battle_script_commands.c:7157-7162`).

`multihitString` is a six-byte member of the global `gBattleScripting`
structure (`include/battle.h:487-504`), addressed by script aliases as
`sMULTIHIT_STRING = gBattleScripting + 0x08`
(`include/constants/battle_script_commands.h:257-265`). The macro writes all
six bytes (`include/battle_message.h:114-122`):

| byte | value | meaning |
| --- | --- | --- |
| 0 | `0xfd` | `B_BUFF_PLACEHOLDER_BEGIN` |
| 1 | `0x01` | `B_BUFF_NUMBER` |
| 2 | `0x01` | one-byte integer width |
| 3 | `0x01` | maximum decimal digits |
| 4 | `0x00` | number payload / hit count |
| 5 | `0xff` | `B_BUFF_EOS` terminator |

The control-code constants are `B_BUFF_PLACEHOLDER_BEGIN = 0xfd`,
`B_BUFF_NUMBER = 1`, and `B_BUFF_EOS = 0xff`
(`include/battle_message.h:65-80`). Thus this command does **not** write the
glyph `"0"`; it writes a complete, terminated byte-number placeholder.
The battle-text expander reads byte 2 as the integer-width selector, byte 3
as the decimal width, and byte 4 as the one-byte value
(`src/battle_message.c:2764-2796`).

There is no allocation or ownership transfer: the durable source is the
fixed six-byte `gBattleScripting` member. The later `copyarray` explicitly
copies six bytes (`src/battle_script_commands.c:3837-3848`), so copying to
`gBattleTextBuff1` does not consume or clear the source. The only direct C
write naming `multihitString` is this initializer. `gBattleScripting` itself
has static zero initialization (`src/battle_main.c:215-224`), but the battle
and per-turn cleanup excerpts reset selected neighboring scripting fields,
not this member (`src/battle_main.c:3093-3109`, `3974-3986`,
`4857-4892`). Correct per-effect lifetime therefore comes from each of the
four entry scripts fully overwriting all six bytes before their loop; no
separate reset is required or evidenced.

## Complete script occurrence and result-string inventory

The source has exactly four `initmultihitstring` invocations:

| effect label | source invocation | generated instruction-start index |
| --- | --- | --- |
| `BattleScript_EffectMultiHit` | `data/battle_scripts_1.s:604-611` | 286 |
| `BattleScript_EffectDoubleHit` | `data/battle_scripts_1.s:839-847` | 480 |
| `BattleScript_EffectTwineedle` | `data/battle_scripts_1.s:1075-1083` | 655 |
| `BattleScript_EffectTripleKick` | `data/battle_scripts_1.s:1384-1390` | 904 |

The generated command catalog independently records slot 142, the enum/table
provenance, and handler span 7157-7162 in
`src/data/gen/battle-script-command-handlers.json` (`slots[index=142]`). The
generated observation catalog independently records exactly those four
zero-operand starts, their labels/source lines, macro declaration 771, and
the single `.byte` emission in
`src/data/gen/battle-script-opcode-observations.json`
(`instructionStarts[opcode.id=142]`). The generated program catalog retains
the same four label statements in
`src/data/gen/battle-script-program.json`; its stated total is 3,306 concrete
typed opcode starts, so this is a four-start subset, not an inferred schema.

The complete `sMULTIHIT_STRING` downstream path is likewise confined to the
two shared result flows below.

1. Each successful standard multi-hit iteration executes
   `addbyte sMULTIHIT_STRING + 4, 1`
   (`data/battle_scripts_1.s:617-640`, line 636). `Cmd_addbyte` adds its
   immediate to the addressed `u8` (`src/battle_script_commands.c:3823-3828`),
   changing only the number payload. `BattleScript_MultiHitPrintStrings`
   subsequently runs `resultmessage`, skips the count message if the move had
   no effect, then copies all six bytes to `gBattleTextBuff1` and prints
   `STRINGID_HITXTIMES` (`data/battle_scripts_1.s:643-649`).
2. Triple Kick uses the same payload increment at line 1400
   (`data/battle_scripts_1.s:1396-1421`). Its result path first suppresses
   the count message when payload byte 4 is still zero (lines 1424 and
   1429), then copies/prints the same six-byte buffer and string ID (lines
   1426-1433). There are no other source uses of `sMULTIHIT_STRING`.

`STRINGID_HITXTIMES` is ID 34
(`include/constants/battle_string_ids.h:30-36`) and maps to the template
`"Hit {B_BUFF1} time(s)!"` (`src/battle_message.c:79-83`, `537-543`).
`Cmd_printstring` calls `PrepareStringBattle`, advances three bytes, and sets
the message-display latch (`src/battle_script_commands.c:2137-2146`);
placeholder expansion recognizes `B_TXT_BUFF1`, expands `gBattleTextBuff1`
when it begins with `B_BUFF_PLACEHOLDER_BEGIN`, and substitutes it into the
template (`src/battle_message.c:2312-2367`). The mutable result count is thus
message context until the generic text path consumes its copied value; it is
not a damage, RNG, turn-order, or controller outcome mutation.

## Safe next interface recommendation

This opcode itself **can** be represented as a bounded immutable
rules/message-context mutation with no battle mechanics: `INITMULTIHITSTRING`
should replace a typed `multiHitMessageCount` (or a typed
`ByteNumberPlaceholder { byteWidth: 1, maxDigits: 1, value: 0 }`) in the
interpreter context, then advance one byte. Do not expose a raw pointer or a
general writable battle-text byte array merely to mirror `sMULTIHIT_STRING`.

The first safe completion boundary is a small typed message-context seam that
also gives the existing source `ADDBYTE ... +4, 1` a dedicated
`incrementMultiHitMessageCount` operation and lets the two result labels emit
`HitTimes { count }` only on their source-stated success guards. It may encode
the six bytes at the presentation/string-expansion boundary if byte fidelity
is required. That preserves the source's value/terminator contract without
claiming multi-hit selection, accuracy, damage, fainting, RNG, PP, scheduler,
or controller behavior. Until that seam is defined, landing opcode 142 alone
would create a private raw-buffer field with no safe consumer and is not
recommended.
