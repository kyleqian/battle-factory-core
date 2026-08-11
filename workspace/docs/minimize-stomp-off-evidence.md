# Minimize / Stomp — Battle Scene OFF evidence

`EFFECT_MINIMIZE` dispatches to `BattleScript_EffectMinimize`: `attackcanceler`,
one-byte `setminimize`, `setstatchanger STAT_EVASION, 1, FALSE`, then the shared
stat-up path. `B_SCR_OP_SETMINIMIZE` is `0xc7`, has no operands, and advances
the script PC by one. Its only state write is guarded by
`HITMARKER_OBEYS`: `gStatuses3[gBattlerAttacker] |= STATUS3_MINIMIZED` (`1 <<
8`). Thus the bit is attacker-owned, and it is set before the stat-up failure
path. If evasion is already maxed, `statbuffchange` marks the move missed via
`STAT_CHANGE_ALLOW_PTR`; this command does not roll the bit back.

The bit has no targeted source clear. Battle initialization clears every
`gStatuses3` slot; ordinary switch and `FaintClearSetData` clear the active
slot. Baton Pass preserves stat stages before `SwitchInClearSetData`, but its
`gStatuses3` retention mask excludes `STATUS3_MINIMIZED`, so Minimize's
evasion stage transfers while its Stomp-doubling bit does not.

`BattleScript_EffectStomp` tests `BS_TARGET` for that bit. The true branch
writes `sDMG_MULTIPLIER = 2` before the ordinary flinch/hit route; the false
branch enters that route without the write. This is source semantics—not an
HP-only inference.

The checked-in mechanic-lab trace uses complete legal parties and source
carriers `FRONTIER_MON_STARYU` (128; Minimize) and
`FRONTIER_MON_GIRAFARIG_1` (235; Stomp). It requests frames 0, 200, 300, 450,
600, and 816. At 200, Staryu has used Minimize (`PP 20→19`, evasion `6→7`,
`status3=256`); at 450 Girafarig's current move is Stomp (`PP slot 3:
20→19`) while that bit remains. Frame 600 observes Staryu at `0/105`, and
frame 816 observes the faint lifecycle clear (`status3=0`, evasion 6). All six
party checksums are valid. Two full manifest replays are byte-identical:
`67c617f7e38f3ce045008e9ed8b78dd8b0fb1918f8a23fa55fd86fd08c842977`.

The manifest exposes HP, PP, stats, stages, `status3`, current move, RNG,
checksums, and framebuffer hashes. It does not expose the script PC,
`gHitMarker`, attacker/target globals, `sDMG_MULTIPLIER`, damage rolls, or a
runtime Baton Pass mask; those points remain source-pinned. No equal-roll or
hidden-bit conclusion is drawn from the KO.
