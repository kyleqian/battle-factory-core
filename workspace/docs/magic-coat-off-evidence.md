# Magic Coat / `B_SCR_OP_TRYSETMAGICCOAT` evidence

This is a SIDE-lane source-and-Battle-Scene-OFF checkpoint only. It adds no
production interpreter, controller, rendering, or animation code.

`trysetmagiccoat` is opcode `0xDF`: one opcode byte plus a four-byte failure
pointer. `Cmd_trysetmagiccoat` first makes the attacker its own target and
sets that attacker's `ppNotAffectedByPressure`. If it acts last, it takes the
encoded failure pointer; otherwise it sets that attacker's
`gProtectStructs[].bounceMove` and advances five bytes. There is no
pre-existing-bit duplicate guard. The command itself has no `Random()` call,
controller emission, or controller-exec mark.

`Cmd_attackcanceler` later reads the **current target**'s `bounceMove` and the
incoming move's `FLAG_MAGIC_COAT_AFFECTED`, then delegates `PressurePPLose`,
clears that target-owned bit, pushes its cursor, and jumps to
`BattleScript_MagicCoatBounce`. That script sets the no-repeat-PP markers and
uses `setmagiccoattarget BS_ATTACKER`; its `VARIOUS_SET_MAGIC_COAT_TARGET`
consumer swaps attacker/target roles (with a Follow Me exception in doubles)
before returning to the canceler. These target swaps, PC/stack, flags, and
Pressure/controller causality are source facts, not public-manifest claims.

[`mechanic-magic-coat-spoink-onix-off.json`](../tools/battle-lab/mechanic-magic-coat-spoink-onix-off.json)
builds six complete legal party records before battle init. Spoink has four
Magic Coat slots and Onix has four Tail Whip slots, constraining real AI
without injecting its choice. Two full OFF manifests are byte-identical:
`5b737f68…0a303870`; scenario SHA-256: `65c738a5…cd72d574`.

At frame 100 Spoink's Magic Coat PP is 14/15. At frame 250 Onix's Tail Whip
PP is 29/30. By frame 400 only Onix's public Defense stage changed (6 → 5),
while Spoink remains 6; frame 650 is settled with that same result. This
public PP/current-move/stat-stage receipt distinguishes an actual reflected
Tail Whip from a no-op. The manifest cannot prove hidden ProtectStruct flags,
action selection, script PC, result flags, target swaps, or command causality;
whole-turn RNG snapshots are not attributed to either command.
