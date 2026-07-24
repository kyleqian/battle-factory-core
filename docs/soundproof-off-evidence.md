# Battle Scene OFF Soundproof evidence

This is a narrow, read-only S10 Gate-3 evidence checkpoint. The three
`mechanicLab` fixtures use legal Level-50 Factory parties, pre-battle active
loadouts only, and ordinary controller input; none injects HP, status,
volatile state, weather, or stat stages.

## Proved by public semantic captures

`mechanic-soundproof-hyper-voice-off.json` gives a native Soundproof Mr. Mime
(`ABILITY_SOUNDPROOF` / 43) a normal, source-listed sound move, Hyper Voice.
At frame 734 its HP remains 137 while the user's PP falls 10→9. The paired
`mechanic-soundproof-tackle-control-off.json` changes only the selected move
to non-sound Tackle: Mr. Mime falls 137→126 and PP falls 35→34. That proves
the normal Soundproof block is not a generic inability to affect that target.

`mechanic-uproar-soundproof-switch-off.json` starts an AI Uproar normally
against Dugtrio (frame 734: Uproar user PP 10→9, `status2` 4128). The player
then opens the ordinary party menu and switches to the legal, native
Soundproof Mr. Mime. At frame 1634 Mr. Mime is active at its full 137 HP, the
Uproar user is still multi-turn (`status2` 4112), and its Uproar PP remains 9.
This is a compact legal continuation observation: Soundproof blocks the
continuation without another PP loss.

The normalized hashes, frame hashes, and exact values are in
`tests/fixtures/soundproof-off-evidence.json`; its hermetic integrity test is
`tests/soundproofOracleEvidence.test.ts`.

## Source basis and boundary

`sSoundMovesTable` explicitly includes `MOVE_UPROAR` and `MOVE_HYPER_VOICE`
([battle_util.c:686-692](../reference/pokeemerald/src/battle_util.c)). In
`AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK)`, the Soundproof match tests
that table, sets `HITMARKER_NO_PPDEDUCT` when the attacker already has
`STATUS2_MULTIPLETURNS`, then dispatches `BattleScript_SoundproofProtected`
([battle_util.c:2659-2675](../reference/pokeemerald/src/battle_util.c)). That
script runs `attackstring`, `ppreduce`, then prints the block message
([battle_scripts_1.s:4158-4164](../reference/pokeemerald/data/battle_scripts_1.s)).
The Uproar program checks multi-turn state before its normal `ppreduce`
([battle_scripts_1.s:2072-2081](../reference/pokeemerald/data/battle_scripts_1.s)).

The public semantic ABI does not expose `gHitMarker`, the script pointer, or
`gLastUsedAbility`; this note therefore does **not** claim a direct transient
marker capture. It claims the source ownership plus the observable PP/HP/
multi-turn consequence. No mGBA probe was added because these public captures
are sufficient for the requested behavior, while the marker itself would need
an intentionally narrow internal-RAM observation.

Untested: every other sound-table entry, Pressure, Soundproof as user,
doubles redirection, and the direct transient marker/script pointer.
