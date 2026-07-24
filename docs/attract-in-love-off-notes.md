# Attract → in-love canceler, Battle Scene OFF

The two compact Mechanics Lab scenarios use legal Level-50 Factory set IDs
278 (Illumise, female) and 277 (Volbeat, male), replace only the active
loadouts, then select Attract and a second player action through ordinary
controller input. No transient battle state is supplied by either scenario.

At frame 734, the real ROM has consumed one player Attract PP and exposes
Volbeat's `status2` as `0x00010000`: bit 16 is exactly
`STATUS2_INFATUATED_WITH(0)` from
`reference/pokeemerald/include/constants/battle.h:142-143`. The status comes
from the opposite-gender success path in
`reference/pokeemerald/src/battle_script_commands.c:7654-7695`.

At frame 1468, seed 1 has reduced a second Volbeat PP while seed 5 leaves its
already-reduced PP unchanged. This is a reproducible public observation of
the affected battler's next action after real Attract. It is not a claim that
the endpoint RNG difference identifies the internal `Random() & 1` call:
the semantic ABI does not expose per-call ownership.

That ABI also does not expose `gBattleScripting.battler`,
`ProtectStruct::loveImmobility`, `gHitMarker`, the script target/stack, or
the multi-turn helper mutation. Their source receipts are deliberately kept
separate: `battle_util.c:2200-2219` assigns the source battler, chooses the
cursor/script branch, and invokes `CancelMultiTurnMoves`; the helper is
defined at `battle_util.c:877-888`, and the two scripts are at
`data/battle_scripts_1.s:3840-3849`.
