# Foresight / `B_SCR_OP_SETFORESIGHT` evidence

`setforesight` is opcode `0xb1`, a one-byte, operand-free command. Its exact
handler ORs `STATUS2_FORESIGHT` (`1 << 29`) into the target's `status2` and
advances one byte. There is no encoded branch or duplicate-failure path:
repeating it leaves the bit set. The command itself contains neither `Random()`
nor a controller emission.

[`mechanic-foresight-machoke-haunter-off.json`](../tools/battle-lab/mechanic-foresight-machoke-haunter-off.json)
constructs six legal records before regular battle initialization. Machoke uses
Low Kick against Haunter, then Foresight, then Low Kick again, then repeats
Foresight; Haunter has four Splash slots, which constrains but does not inject
the Factory AI choice. Two full manifests are byte-identical:
`2c4a774e…05c181864`; scenario SHA-256:
`5c10cc95…80653d5c5`.

- Frame 225: the first Low Kick spent PP (`20 → 19`) but Haunter stayed at
  152 HP with `status2 = 0`.
- Frame 900: Foresight spent PP (`40 → 39`) and the public semantic receipt
  exposes Haunter `status2 = 536870912`.
- Frame 1650: the second Low Kick spent PP (`19 → 18`) and Haunter is at
  141 HP. This public before/after window distinguishes the effect from a
  no-op without asserting unobservable action internals.
- Frame 2225: repeated Foresight spent PP (`39 → 38`) while the bit remained
  set; it is not a duplicate-failure receipt.

Source-only bounds: the effect script's pre-setter accuracy/PP order, the
setter's PC/RNG/controller behavior, Foresight's accuracy/evasion and
type-chart consumers, and clear-on-switch/faint/Baton-Pass behavior cannot be
proven by this public capture. In particular, whole-turn RNG snapshots do not
attribute a change to this one command.
