# fcr1: the frame catcher's player Pokémon are now the engine's (2026-11-20)

A fix to the frame catcher's set-up (`tools/frame-catcher/`), not to the game. Found by snd2 (`docs/snd2-catcher-sounds.md`, "Found, not
fixed").

## What was wrong

The catcher writes the engine's six rentals into the ROM's save and enters the select screen again. But the select screen builds its six
Pokémon afresh from the set ids alone, each with a new personality of the set's nature (`CreateFrontierFactorySelectableMons` →
`CreateMonWithEVSpreadNatureOTID`, `battle_factory_screen.c:1736`, `pokemon.c:2562`), and the three rented become the party
(`Select_CopyMonsToPlayerParty`). The personality decides gender and, for a species with two abilities, which one it has
(`CreateBoxMon`). So on the ROM the player's Pokémon could be another gender or have the other ability:

- seed 6: GROWLITHE female with Flash Fire on the ROM, male with Intimidate in ours. Its switch-ins cut the foe's Attack only on our
  side (five SE_M_STAT_DECREASE only in ours), and the battle drifted from the first switch-in (turn 14: HP 138 against 136);
- seed 1: POLIWHIRL with Damp on the ROM, Water Absorb in ours (turn 4: HP 133 on the ROM, 158 in ours after a Water move), and the ROM
  run got stuck at anchor 75 of 130;
- every seed: the gender symbol in the HP box, the party menu and the summary differed wherever the gender did (seed 3's ELEKID, seed
  8's DUSTOX: about 70 to 130 picture differences each).

## The fix

`romRun.py` `patch_select_mons`: on the first frame the select screen's cursor task runs, each of the six is re-stored with the engine's
personality and OT id, as `CreateMon` would have built it (`mons.with_personality`): new key and substructure order, the ability bit set
to `personality & 1` when the species has a second ability (`gSpeciesInfo[].abilities[1]`), the rest of the record (stats, moves, item,
IVs, EVs) the ROM's own. The nature has to stay the same (it decides the stats); a personality of another nature is refused and logged.
Not mid-build: the six are built by one call in `CB2_InitSelectScreen` case 5 (it can run over many frames), the cursor task is
created in case 10. Nothing reads the personality before that (the Pokémon picture is made when the player picks one). The rented three
then carry the engine's personalities into the party, the save's rental records and any swap.

Check: at each battle's first turn, `check_player_party` compares the player's three with the engine's (personality, species, ability
bit, gender, level, HP, stats; `engineRun.mjs` now writes the battle's `playerKernelParty`) and logs either "player party is the
engine's at battle start" or the difference in the report's set-up list. Tests: `tools/test_frame_catcher.py` `MonRecordTest` (4 tests,
no emulator; the module the logic lives in, `tools/frame-catcher/mons.py`, needs no emulator).

## Runs before and after

Traces: `makeTrace.mjs --seed N --scene off --policy full --battles 2 --max-frames 45000`, seeds 6, 3, 1, 8. Engine digests are the same
before and after (the engine side is untouched). "Turn states": the battle state at the first frame of each action menu (both Pokémon's
species, HP, Speed, stat stages, status, and gRandomTurnNumber), ours against the ROM's, in order.

| seed | ROM menus followed | content / timing stretches | picture / sound differences | turn states |
|---|---|---|---|---|
| 6 before | 177 / 197 | 149 / 27 | 743 / 5 | differ from turn 14 (Intimidate) |
| 6 after | 197 / 197 | 96 / 100 | 410 / 2 | all 92 match |
| 1 before | 75 / 130 (stuck) | 64 / 7 | 527 / 43 | differ from turn 4 (Water Absorb) |
| 1 after | 130 / 130 | 49 / 80 | 314 / 1 | all 56 match |
| 3 before | 127 / 127 | 85 / 41 | 557 / 0 | all 58 match |
| 3 after | 127 / 127 | 50 / 76 | 423 / 0 | all 58 match |
| 8 before | 75 / 75 | 36 / 38 | 391 / 1 | all 27 match |
| 8 after | 75 / 75 | 34 / 40 | 318 / 1 | all 27 match |

- After the fix the player's party is the engine's at every battle start on all four seeds (personality, gender, ability, stats).
- Seeds 3 and 8: the battles were already the same; what went away is the gender symbol (5x8 pixels next to the name, for example seed 3
  ELEKID ♂ on the ROM, ♀ in ours). The ROM shows the same menus in the same order; its frame timing moved by one frame here and there
  (seed 3: 11 frames at most over 31,000; seed 8: 1 frame), from the ROM itself with the same presses (personality-dependent CPU time),
  not from the catcher.
- Seeds 6 and 1: the ROM now follows the whole engine trace, so stretches it had not reached, or had played as another battle, are
  compared now. Their new picture differences (seed 6: 27, 15 of them in the last stretch; seed 1: 137) are of kinds the catcher shows
  elsewhere: the end of the run after the last battle (the ROM's GO ON / Lobby against the engine's trace end, not staged per the
  README), the party-icon bob phase, the send-out sparkles' phase, a fade. None of the ones looked at is a gender or ability difference.
- Sounds left: seed 6's missing SE_BALL_OPEN is the known missing "GROWLITHE, that's enough! Come back!" recall (snd2); the seven extra
  SE_SELECT in the last stretch of seeds 1, 6 and 8 are the engine trace's presses after the ROM stopped following (seed 8 had them
  before).
- No rules difference is left in these four seeds, so nothing needed the battle-only replay (`tools/audio/romDriveSeed.sh`).

Evidence (outside git): `.integration/evidence/catcher-party/{before,after}/<seed>/` (reports, kept frame stores) and
`<seed>.engine-turns.json` (the engine's turn states, from a scratch probe over `FactorySession`).
