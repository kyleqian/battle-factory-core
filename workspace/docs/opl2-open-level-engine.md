# opl2: the engine's Open Level mode (2026-11-22)

Kyle (11-22): make Open Level work in the engine, matching what the ROM produces over real multi-round runs; do not expose it to players.
This doc covers the engine side. ROM facts: `docs/opl1-open-level-rom.md`. The proof over many seeds: `docs/opl4-open-level-proof.md`.

## How to turn it on (tools and tests only)

- `FactorySessionOptions.level: "open"` (src/factorySession.ts): the challenge is an Open Level one. Absent / `"50"` = the Level 50
  game, unchanged. `openLevel` (default: true for an Open Level mount, false otherwise) makes the Lobby attendant's OPEN LEVEL
  choosable for a later challenge in the same mount. An Open Level "draft" start without `gameplaySeed` deals from
  `OPEN_LEVEL_DEFAULT_DEAL_RNG_VALUE` (0x08a74230, the ROM route's own cursor at the deal), so it shows the ROM's own Open draft.
- `startStreak` (tools only): a draft start whose save holds that active streak for the level (a multiple of 7, 0..49).
- The public library contract (`src/factoryContract.ts`, `lib-types/`) is unchanged: the website cannot reach Open Level. Exposing it
  later is one optional `level` field on `FactoryGameOptions` / `ReplayOptions` passed to the session.
- Tools: `tools/soak/randomRoundSoak.ts --level open`, `tools/frame-catcher/makeTrace.mjs --level open [--start-streak N]`,
  `tools/integration/lsd194Census.ts --level=open`.

## What the mode changes (each from the ROM source, ROM-checked as noted)

| rule | source | engine |
|---|---|---|
| Rentals, foes, Noland and swapped-in Pokemon at level 100 | battle_factory_screen.c:1749-1752, battle_factory.c:422-425, battle_tower.c:3247-3265 (foes: the party's highest level, min 60 = the level-100 rentals) | `level` on a generated record (absent = 50), read by `createFactoryCorpusPartyMember` for experience, stats and level |
| Open set rows: 372-467, 468-563, 564-659, 660-755, then 372-881; better range = next row; challenge 7+ pinned | battle_factory.c:169-190, :829-866 | `getFactoryRentalRange(c, better, lvlMode)`; rentals, opponents and Noland pass the mode |
| Sets above 849 allowed (the high-tier guard is Level 50 only) | battle_factory.c:349-351, :783 | the guard checks the mode |
| Streak and rent count per level, win-streak-active flag per level; symbols, heard speech and BP shared | battle_factory.c:145-155, :198-264; Lobby scripts.inc:131-150 | `FactoryCarry.lvlMode` / `otherLevel`; `carryForChallengeLevel` at the attendant's level choice |
| OPEN LEVEL at the attendant | Lobby scripts.inc:131-141 | pickable with the option; `chosenLevel` on the attendant state |
| Noland: per-level streak, shared symbols | frontier_util.c:1656-1690, :1820-1821 | unchanged rule, fed the level's streak |
| The AI: no Open branch (the challenge number from the level's streak) | battle_factory.c:889-911 | the AI views accept level mode 1 |
| Beat Up: the member's own level | battle_script_commands.c:8990 | `calculateBeatUpMemberDamage(..., member.level)` (was a fixed 50) |
| The PreBattleRoom walk goes right | PreBattleRoom scripts.inc:46-48, 382-385 | `OPEN_LEVEL_WALK_STEPS`, ROM-probed (the Level 50 table mirrored, east pictures flipped); 0 differing pixels vs the ROM's walk |
| EXP strip at level 100 | battle_interface.c:2201-2203 | empty, as at Level 50: the ROM draws it empty (opl1) |

One battle-rule fix found by the Open census (Level 50 cannot reach it): a weather with its PERMANENT bit (Tyranitar's Sand Stream)
never runs down at the end of the turn (`ENDTURN_RAIN / SANDSTORM / SUN`, battle_util.c:1340-1411). The engine always decremented, so
the timer went to -1 and the battle threw at the first end turn (2 of 50 Open census battles). Hail has no permanent bit.

What Open newly reaches, and is already in the engine: Outrage (EFFECT_RAMPAGE, the family Thrash and Petal Dance already reach at
Level 50; its animation was built earlier), Sand Stream's switch-in, the sets 850-881 species (Articuno, Zapdos, Moltres, Dragonite,
Tyranitar, Raikou, Entei, Suicune: pictures, icons, palettes and cries, including the cry-task variants, are all present).
`battle-script-topology.json` now carries `openLevelFactoryReachableEffects`: Level 50's 276 moves plus Outrage, the same 166 families.
The move parameterization needs no Open copy: no new family.

## Level 50 unchanged

Level 50 records and carries keep their old shape (no `level` / `lvlMode` field), and every Level 50 path reads the same values as
before. Checked: census 0..199 both scenes byte-identical to master; the frame catcher's engine side identical to master frame for
frame (pictures, sounds, menus, digest) on four traces, and its findings identical on two full runs.
