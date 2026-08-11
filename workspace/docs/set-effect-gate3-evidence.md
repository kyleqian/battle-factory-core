# `SETEFFECTPRIMARY` / `SETEFFECTSECONDARY` Gate-3 evidence

Scope: pinned-source/catalog audit only for Battle Script opcode 22
(`0x16`) and opcode 23 (`0x17`). This is not an implementation proposal for
move effects.

## Encoding and source coverage

`B_SCR_OP_SETEFFECTPRIMARY` and `B_SCR_OP_SETEFFECTSECONDARY` occupy enum
rows 28 and 29 respectively (`include/constants/battle_script_commands.h`,
SHA-256 `842cce6dd704b09b24a49abdca67ee7a8062a2e3a465e1b764fc63c0d230580f`).
The dispatch rows are 353--354 of `src/battle_script_commands.c` (file
SHA-256 `e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c`):
they select `Cmd_seteffectprimary` and `Cmd_seteffectsecondary`.

The macros have no declared parameters and each emits only its opcode byte:
`seteffectprimary` is lines 99--101 and `seteffectsecondary` lines 103--105
of `asm/macros/battle_script.inc` (SHA-256
`0a8e1c3bdf4c49d07b2e09ff8ab524812a5217b9735106e1b79b6be261a6db7e`).
Thus both instructions are exactly one encoded byte with **zero operands**.

The generated macro catalog confirms one direct `.byte` emission for each
macro, and the observation/program catalogs agree on every concrete start:

| opcode | generated starts | operand-width sequence | whole-source direct macro calls |
| --- | ---: | --- | ---: |
| 22 / `SETEFFECTPRIMARY` | 17 | `[]` at all 17 | 17 |
| 23 / `SETEFFECTSECONDARY` | 1 | `[]` at the sole start | 1 |

All 18 direct invocations are in `data/battle_scripts_1.s` (SHA-256
`4ac3e610b68c11ef0f4e4c0fc62ddba7fda5a8400e43705428868978ec7551a6`),
with no additional `*.s`, `*.S`, or `*.inc` invocation outside the committed
generated program. Primary's lines are 297, 702, 803, 915, 1002, 1022, 1126,
1454, 1471, 1628, 1916, 2171, 2188, 2588, 4206, 4248, and 4406; secondary's
sole call is line 4201 (`BattleScript_ApplySecondaryEffect`). The raw program
has 3,306 typed opcode starts; its matching counts are 17 and 1. Catalogs
audited: `battle-script-command-handlers.json`
`b065d380af048cff9f1f4574c9f4a679d95ac7918b7ab9a2ebda2a2cf3c8b32a`,
`battle-script-handler-lexical-facts.json`
`c7528e7afce898835a23ede8e3fafd174c4f0f9b8a68edf59d8f533348517174`,
`battle-script-opcode-observations.json`
`9f6c162de155a337355e17423302f372911913a8aa706ead5b08c72159f1dda3`,
`battle-script-program.json`
`77dd161fa630f6245beeee29efbaa6068e5f258a7eb8eb517bfc73e5479255f6`,
and the lossless candidate audit
`2f54df1d993c05eeb517a90a00023d79b00285ef7411670618880979953d3c91`.

## Handler and advance behavior

The complete handlers are deliberately only four source lines each:

```c
// battle_script_commands.c:2941-2949
Cmd_seteffectprimary()   { SetMoveEffect(TRUE, 0); }
Cmd_seteffectsecondary() { SetMoveEffect(FALSE, 0); }
```

Their extracted lexical facts contain no direct
`gBattlescriptCurrInstr` read, write, or literal advance. They are therefore
not fixed-width-advance candidates in the joined audit. The instruction's
encoded width is one byte, but its *execution advance* belongs to
`SetMoveEffect` (lines 2234--2906), not to either wrapper:

- blocked/no-change paths clear `gBattleCommunication[MOVE_EFFECT_BYTE]` and
  increment the current script byte (for example 2253--2267, 2514--2518,
  2524--2527);
- successful status/volatile and many special-effect paths push `PC + 1` and
  redirect to an effect script (2476--2512, 2541--2545, 2571--2576,
  2618--2625, 2641--2642, 2815--2820, 2886--2887); and
- other cases mutate battle state before incrementing, route to a prevention
  script, or retain specialised control flow (2300--2319, 2342--2359,
  2396--2419, 2550--2559, 2770--2802). It is consequently false to model
  either opcode as an unconditional `PC += 1` simply because it has no
  operands.

The wrappers differ syntactically only by the `primary` boolean, with
`certain` always zero, but the difference is materially observable inside the
callee. Shield Dust and Safeguard reject only `!primary` paths
(2253--2259). Ability/type prevention scripts for poison, burn, and paralysis
are entered when `primary || certain` (2300--2319, 2342--2359, 2396--2419),
and Inner Focus's flinch-prevention route makes the same distinction
(2547--2559). They must remain two typed modes even though they share one
resolver.

## What the resolver owns

`SetMoveEffect` first derives `gEffectBattler` and
`gBattleScripting.battler` from attacker/target plus the
`MOVE_EFFECT_AFFECTS_USER` bit, clearing that bit in the latter case
(2240--2251). It then reads/mutates substantially more than a status flag:

- ability, type, HP, substitute, Safeguard, hit-marker, status, weather,
  turn-order, held-item, side, party-index, and battle-type state gate the
  outcome (2253--2474, 2524--2590, 2738--2804, 2863--2895);
- it consumes RNG for sleep/confusion/uproar/Tri Attack/wrap/thrash durations
  or selection (2480--2483, 2541, 2573, 2601--2603, 2618, 2860);
- it writes major and volatile status, locks, recharge/trap data, stat stages,
  damage for recoil, money/items, and synchronization bookkeeping
  (2476--2511, 2605--2736, 2785--2802, 2839--2849, 2851--2900);
- it pushes/redirects the Battle Script stack, selects message state, and
  emits/marks status or held-item controller commands
  (2303--2318, 2476--2512, 2789--2798, 2831--2836).

`SetMoveEffect` itself has no PP write in lines 2234--2906; PP reduction is a
separate instruction in the normal hit script (`battle_scripts_1.s`:246--247).
That does not make this pair PP-safe: the resolver's conditional script
transition determines which later instructions execute, including such
adjacent scripting and controller waits.

## Gate-3 recommendation: defer implementation

Decode these as operand-free one-byte IR instructions only when the generic
interpreter can call an atomic, typed **move-effect rules port**. Its minimum
honest input is the effect-byte protocol plus `primary`/`certain`, attacker,
target, current move, full mutable battle context, script stack/PC, and RNG;
its output must atomically carry the resulting context, RNG consumption,
PC/stack transition, and typed controller/message events. This boundary must
own all effect-table lookup, immunity/ability/item/status/weather/turn-order
rules, damage/recoil, and branching above. Presentation may consume emitted
events only.

Until that port exists, **defer opcode 22 and opcode 23**. A four-line wrapper
or a one-byte automatic advance would silently omit rules, RNG, controller,
and script-routing behavior and is not a source-safe Gate-3 command.
