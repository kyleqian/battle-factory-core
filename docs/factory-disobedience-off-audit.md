# Factory Level-50 disobedience audit (Battle Scene OFF)

## Verdict

For every legal Level-50 Battle Factory single, `IsMonDisobedient` returns
`DISOBEDIENCE_OBEDIENT`. `DISOBEDIENCE_OTHER` and `DISOBEDIENCE_IGNORED` are
scope-unreachable. Main may therefore omit the disobedience RNG and all three
non-obedient script/result paths from the Factory-only attack-canceler seam;
it must still model the surrounding source order (the helper is after
move-block and selected-slot PP admission, and before Magic Coat/Snatch/etc.).

This is not a claim about ordinary story battles. Outside Frontier, a player
mon that is not owned by the player and exceeds the current badge obedience
limit can reach the random-move/self-hit (`OTHER`) or ignored/loaf/sleep
(`IGNORED`) branches.

## Source chain

`Cmd_attackcanceler` runs `AtkCanceler_UnableToUseMove`, move-block ability
handling, and selected-slot PP admission before it calls `IsMonDisobedient`;
the helper is then before Magic Coat, Snatch, Lightning Rod, and protect
handling ([battle_script_commands.c:915-1007](../reference/pokeemerald/src/battle_script_commands.c)).

Factory entry assigns `BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY`
([battle_tower.c:2092-2099](../reference/pokeemerald/src/battle_tower.c)).
`BATTLE_TYPE_FACTORY` is a member of `BATTLE_TYPE_FRONTIER`
([battle.h:60-92](../reference/pokeemerald/include/constants/battle.h)). In
`IsMonDisobedient`, after the opponent/link returns, the Factory/Frontier
return is before the OT comparison, badges, level comparison, and the first
`Random()` call ([battle_util.c:3913-4053](../reference/pokeemerald/src/battle_util.c)).

The only possible gate ahead of that Frontier return for a player battler is
`IsBattlerModernFatefulEncounter`. It is automatically true unless the party
species is Mew or Deoxys and its modern-fateful bit is clear
([battle_util.c:3913-3920](../reference/pokeemerald/src/battle_util.c)). The
source-extracted complete Frontier catalog has 882 entries and contains neither
species; the hermetic test pins that corpus fact.

Factory party construction selects `FRONTIER_MAX_LEVEL_50` for Level-50 mode,
builds rental player mons with `CreateMon(..., OT_ID_PLAYER_ID, 0)`, and
copies their level/OT into the battle mons
([battle_factory.c:403-467](../reference/pokeemerald/src/battle_factory.c),
[pokemon.c:2188-2248](../reference/pokeemerald/src/pokemon.c),
[pokemon.c:4647-4712](../reference/pokeemerald/src/pokemon.c)). These facts
are corroborative only: the Frontier early return makes badges, ownership, and
level irrelevant for legal Factory rentals.

## Oracle observation and boundary

`factory-disobedience-off.json` is a legal Battle Scene OFF `factoryLegal`
Level-50 single. Its frame-zero public capture verifies source initialization
and active level 50. The public semantic ABI does not expose battle-type flags
or battle-mon OT IDs, so `audit-factory-disobedience-off.py` makes one
read-only mGBA observation after the same legal construction: flags are
`0x0008000C` (trainer + Factory + the ordinary non-link master bit; not double), Factory contributes to
Frontier, and both constructed active mons are level 50 with OT equal to the
save trainer ID.

The probe deliberately does not call `IsMonDisobedient`: invoking it can write
battle state and consume RNG on branches outside this scope. It records the
post-construction RNG only as a named boundary. Source ordering plus the
observed Factory flag establish the guaranteed no-RNG helper return. The
normalized receipt and its hermetic test are
`tests/fixtures/factory-disobedience-off-evidence.json` and
`tests/factoryDisobedienceOracleEvidence.test.ts`.
