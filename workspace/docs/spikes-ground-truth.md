# Spikes: source and Battle Scene OFF evidence

This is a bounded source/evidence handoff for a later main-lane registration;
it does not add an opcode or broaden a switch controller. The machine currently
has an intentional Spikes branch barrier in
`src/engine/battleScriptSwitchinOpcode.ts` because no writer can set bit 4.

## Source contract (hidden facts)

`B_SCR_OP_TRYSETSPIKES` is opcode `0xb0` (enum line 182, table line 507) and
the one observed script emission has one four-byte relocation pointer, so its
encoded length is five bytes. `trysetspikes` in `battle_script.inc:923-926`
emits the opcode plus `.4byte`; `BattleScript_EffectSpikes` calls it with
`BattleScript_FailedFromAtkString` before `attackstring` and `ppreduce`
(`battle_scripts_1.s:1544-1552`).

`Cmd_trysetspikes` (`battle_script_commands.c:8485-8500`) derives
`targetSide = BATTLE_OPPOSITE(GetBattlerSide(gBattlerAttacker))`. Thus it
writes the *attacker's opposing side*, never a battler-selected target:

| `gSideTimers[targetSide].spikesAmount` before | Result |
| ---: | --- |
| 0 | set `SIDE_STATUS_SPIKES`, increment to 1, PC `+= 5` |
| 1 | set `SIDE_STATUS_SPIKES`, increment to 2, PC `+= 5` |
| 2 | set `SIDE_STATUS_SPIKES`, increment to 3, PC `+= 5` |
| 3 | set attacker's `ppNotAffectedByPressure`, jump to pointer at `PC+1` |

The equality predicate means a manually-corrupted value above 3 would also
increment. Normal source writers establish the 0--3 invariant, so this is not
a gameplay fourth layer. The handler contains no `Random`, controller emit, or
controller-exec call.

`SIDE_STATUS_SPIKES` is bit 4; `SIDE_STATUS_SPIKES_DAMAGED` is bit 9
(`include/constants/battle.h:210-217`). `struct SideTimer.spikesAmount` is a
byte (`include/battle.h:149-162`). At switch-in, `Cmd_switchineffects`
(`battle_script_commands.c:5219-5299`) checks the active/entering battler's
own side: no bit 9, bit 4 set, not Flying, and not Levitate. It sets bit 9,
clears Destiny Bond state, calculates `maxHP / ((5 - spikesAmount) * 2)` with
a minimum of one, pushes the script cursor, then selects an attacker/target/
fainted-battler Spikes script by selector. This gives floor(maxHP/8),
floor(maxHP/6), and floor(maxHP/4) at layers 1, 2, and 3. The scripts apply
the passive HP update and print the hurt message.

Bit 9 is a per-switch guard: the ordinary no-effect completion clears it at
`battle_script_commands.c:5268`; a Spikes faint path clears it in
`Cmd_tryfaintmon` (`:2978`). Bit 4 and `spikesAmount` are *not* turn cleanup:
they persist until `Cmd_rapidspinfree` clears both (`:8845-8850`) or battle
state is initialized anew. `TurnValuesCleanUp` does not clear either.

## Public OFF receipt

`tools/battle-lab/mechanic-spikes-opponent-set-player-switch-off.json` uses
two fully constructed legal three-Pokémon parties. Cloyster (opponent, all
four slots Spikes) moves before Shuckle; the player then uses the real party
controller to switch to grounded Rhyhorn. The manifest is reproducible over
two runs: scenario SHA-256 `3e582345baf432a935aa6ed8318bb14dde407cadf1b1506c6c88739a9f8ee425`,
manifest SHA-256 `42ce49883bdd9687f7eb4ea76b161846b9f8b8b82de8df8fbcb973f2604c742d`.
It captures each frame 1002--1250 plus frames 0, 50, 250, 700, 950, 1350,
and 1606 (256 captures total).

| Frame | Public fact |
| ---: | --- |
| 50 | player side status 16 / Spikes 1; Cloyster's current move is 191 |
| 1065 | real player switch data is Rhyhorn, party index 1, 155/155 HP |
| 1203 | player side status is 528 (Spikes + damaged guard), Rhyhorn still 155 |
| 1226 | Rhyhorn is 136/155: a 19 HP loss, exactly `floor(155/8)` |
| 1350 | Cloyster's next real Spikes use leaves player Spikes at 2 |
| 1606 | second layer persists at the next settled input state |

Exact framebuffer hashes, semantic observations, source file hashes, and the
explicit source-only remainder are in
`tests/fixtures/spikes-off-evidence.json`, guarded by
`tests/spikesOracleEvidence.test.ts`.
