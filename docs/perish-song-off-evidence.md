# Perish Song / `B_SCR_OP_TRYSETPERISHSONG` evidence

This SIDE-lane checkpoint adds no engine, controller, rendering, or animation code.

`trysetperishsong` is opcode `0xB2`: one opcode byte plus a four-byte failure pointer ([macro](../reference/pokeemerald/asm/macros/battle_script.inc#L932-L935), [dispatch](../reference/pokeemerald/src/battle_script_commands.c#L509)). The handler iterates every battler index. An already-set `STATUS3_PERISH_SONG` or `ABILITY_SOUNDPROOF` increments the not-affected count; all other battlers receive that status bit and `DisableStruct.perishSongTimer` plus start value `3`. The pointer is taken only if the count equals `gBattlersCount`; therefore partial Soundproof immunity does not make the move fail. `PressurePPLoseOnUsingPerishSong` happens after iteration, before the branch; the handler itself calls neither `Random()` nor a battle controller ([handler](../reference/pokeemerald/src/battle_script_commands.c#L8508-L8534), [timer fields](../reference/pokeemerald/include/battle.h#L84-L85)).

The effect script owns the visible sequence: attack canceler, attack string, PP reduction, setter, animation, “FAINT IN THREE” message, then an all-battler Soundproof-message loop ([effect script](../reference/pokeemerald/data/battle_scripts_1.s#L1567-L1587)). Thus a fully already-affected attempt reaches the normal failure target after PP reduction; status timer manipulation is the opcode's work, while messages/animation are script work.

At end turn, the Wish/Perish state walks `gBattlerByTurnOrder`, skips absent battlers, formats the *current* timer, and routes nonzero timers through decrement/countdown. A timer already at zero clears the Perish bit, assigns current HP as passive damage, and runs the faint script (`healthbarupdate`, `datahpupdate`, `tryfaintmon`) ([orchestration](../reference/pokeemerald/src/battle_util.c#L1837-L1859), [faint/countdown scripts](../reference/pokeemerald/data/battle_scripts_1.s#L3438-L3450)).

Lifetime is source-pinned. A normal switch clears `gStatuses3` and zeroes its active `DisableStruct`; faint does the same ([switch/faint clear](../reference/pokeemerald/src/battle_main.c#L3152-L3217), [faint](../reference/pokeemerald/src/battle_main.c#L3264-L3295)). Baton Pass is the exception: it masks in `STATUS3_PERISH_SONG`, clears the structure, then restores both Perish Song timer fields, so the countdown transfers ([Baton Pass preservation](../reference/pokeemerald/src/battle_main.c#L3173-L3216)).

[`mechanic-perish-song-lapras-chansey-off.json`](../tools/battle-lab/mechanic-perish-song-lapras-chansey-off.json) stages six complete legal records. Lapras uses Perish Song; Chansey's four stock Tackle slots constrain normal Factory AI without choosing for it. Every relied-on frame is captured on a 25-frame grid. Two final replays are byte-identical: manifest SHA-256 `e0f1d6d6488d45e9087afdf60456adf939dfcb93d942e0177b6bfc60a93c6a61`; scenario SHA-256 `fbec908519ea38ed20cd6f83190f602698166163a82947d79f7fd3601ea884bf`.

- Frame 75: initial use is current move `195`, Lapras PP is `5 → 4`, and both active battlers show `status3=32`, timer `3`.
- Frames 375/475: the OFF manifest sees player then opponent descend `3 → 2`, proving turn-order persistence rather than a shared display-only counter.
- Frame 800: the repeat is still current move `195` and spends Lapras PP `4 → 3`, but both marked battlers retain timer `2`; this is the public all-already-affected failure receipt.
- Frames 1050/1150: both timers descend to `1` on the following end turn.

The manifest does not expose script PC, not-affected count, start-value nibble, Pressure bookkeeping, controller buffers, text IDs, Soundproof, terminal faint, or switching. Those details are intentionally source-only; no production opcode is registered.
