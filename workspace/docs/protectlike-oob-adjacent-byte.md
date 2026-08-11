# `sProtectSuccessRates`'s fifth entry: measured adjacent byte, not a guess

Status: measured from the built artifacts (`reference/pokeemerald/`
`pokeemerald.map`, `pokeemerald.elf`, `pokeemerald.gba`). This resolves the
old `(b)` barrier in `src/engine/battleScriptProtectlikeOpcode.ts`
(dispatcher item 9 of `docs/barrier-reachability-triage.md`).

## The source problem

`Cmd_setprotectlike` (`reference/pokeemerald/src/battle_script_commands.c:
6503-6536`) rolls

```c
if (sProtectSuccessRates[gDisableStructs[gBattlerAttacker].protectUses] >= Random() && notLastTurn)
```

`gDisableStructs[].protectUses` increments on every successful Protect/
Detect/Endure, so after four consecutive successes it reaches 4 -- one past
`sProtectSuccessRates`'s four entries (`battle_script_commands.c:719`):

```c
static const u16 sProtectSuccessRates[] = {USHRT_MAX, USHRT_MAX / 2, USHRT_MAX / 4, USHRT_MAX / 8};
```

That read is out of bounds in C but deterministic on this ROM: it returns the
`u16` the linker laid down immediately after the table. The question is which
symbol that is and what its first `u16` equals.

## Measurements (all three artifacts agree)

- `nm -aS pokeemerald.elf`:
  - `0831c3d8 00000008 r sProtectSuccessRates`
  - `0831c3e0 00000028 r sMovesForbiddenToCopy`
  - i.e. the table is exactly 8 bytes (4 u16) and the **next symbol in link
    order is `sMovesForbiddenToCopy` at `0x0831c3e0`**, exactly 8 bytes later.
- Raw bytes read from both `pokeemerald.gba` and the ELF's `.rodata` section
  at VMA `0x0831c3d8`:
  - `ff ff | ff 7f | ff 3f | ff 1f` == 65535, 32767, 16383, 8191 (the four
    real table entries, intact).
  - next two bytes at `0x0831c3e0..0x0831c3e1`: `76 00` == `0x0076` ==
    **118** == `MOVE_METRONOME` (`include/constants/moves.h:122`), the first
    entry of `sMovesForbiddenToCopy` (`battle_script_commands.c:725`).

The supervisor's hypothesis is confirmed: **`sProtectSuccessRates[4] == 118`**.

## Consequence

A fifth consecutive Protect-like use succeeds only when `Random() <= 118` --
about `119/65536` ≈ **0.18%** of draws -- and otherwise fails (resets
`protectUses` to 0, `MOVE_RESULT_MISSED`). `notLastTurn` still gates the same
way: the `Random()` call is spent unconditionally (left operand of the C
`&&`), and the whole expression fails on the turn's last action regardless of
the draw.

The engine now reads `PROTECT_SUCCESS_RATE_OOB = 118` for `protectUses >= 4`
(`src/engine/battleScriptProtectlikeOpcode.ts`), with this measurement quoted
in the constant's comment so a future reader can re-verify without redoing
the archaeology.

## How to re-verify

```sh
nm -aS reference/pokeemerald/pokeemerald.elf | grep -E 'sProtectSuccessRates|sMovesForbiddenToCopy'
python3 - <<'EOF'
d = open('reference/pokeemerald/pokeemerald.gba','rb').read()
for a in (0x0831c3d8, 0x0831c3e0):
    o = a - 0x08000000
    print(hex(a), d[o:o+2].hex(), int.from_bytes(d[o:o+2],'little'))
EOF
```
