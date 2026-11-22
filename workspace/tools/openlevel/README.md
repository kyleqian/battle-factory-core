# Open Level ROM tools (opl1)

ROM-side tools for the Open Level work. They run mGBA in process (`oracle/emerald_core.py`), never the oracle servers on
:8012 / :8014, and never write outcomes into the ROM. Findings: `docs/opl1-open-level-rom.md`. Every command runs from
`workspace/` with `PYTHONPATH=<pokebench>/vendor/libmgba-py` and plain `python3`. One mGBA core per process: a third core in
one process crashes, so each tool runs one profile per process (`romGenLab.py` starts one child per level by itself).

| file | what it does |
| --- | --- |
| `romlib.py` | Shared: `Rom(profile)` loads the ROM and the bootstrap's save without running the bootstrap, replays the bootstrap frame by frame (`replay`), and steps a frame instruction by instruction with PC traps (`frame`). `decode_mon` reads a struct Pokemon with names. Profiles: `lv50-on`, `lv50-off`, `open-on`, `open-off` (`oracle/bootstrap/factory.json`, `factory-battle-scene-off.json`, `factory-open.json`, `factory-open-battle-scene-off.json`). |
| `bootCheck.py` | Replays a profile with traps on the deal and the draft build; writes the canonical screen sha256 (checked against `EmeraldOracle`), the rentals, trainer, cursors at each function entry and return. `python3 tools/run-mgba-probe.py OUT.json -- python3 tools/openlevel/bootCheck.py OUT.json PROFILE` |
| `firstBattle.py` | From a profile's anchor, plays the lab's canonical route (rent slots 1-3, YES, through "Right this way, please!", to battle 1's first action menu) and logs the PreBattleRoom walk per frame, the enemy party build (trapped), both parties and the EXP bar at the menu. `--summary` screenshots the draft's SUMMARY pages instead. `python3 tools/run-mgba-probe.py OUTDIR/PROFILE.json -- python3 tools/openlevel/firstBattle.py OUTDIR PROFILE` |
| `romGenLab.py` | The ROM generation lab, below. |

## romGenLab.py: the ROM's deal for given inputs

```sh
python3 tools/openlevel/romGenLab.py SAMPLES.json OUT.json [--build] [--keep-vblank]
```

`SAMPLES.json` is a list of samples:

```json
[{"lvlMode": 1, "winStreak": 14, "rentsCount": 45, "battleNum": 2, "dealCursor": "0x08a74230",
  "opponentCursor": "0x12345678", "constructionCursor": "0x9abcdef0", "towerLv50Streak": 21, "priorTrainerIds": [10, 20]}]
```

- `lvlMode` 0 = Level 50 (the control), 1 = Open Level. It picks the bootstrap; it is never written.
- `winStreak`, `rentsCount`: written to `factoryWinStreaks[0][lvlMode]` (SaveBlock2 + 0xDE2 + 2 * lvlMode) and
  `factoryRentsCount[0][lvlMode]` (+ 0xDF2 + 2 * lvlMode). The ROM confirms both slots: `GetFactoryMonId` is called with
  challengeNum = winStreak / 7 and `GetNumPastRentalsRank` returns the rank of the written count (both trapped, in the output).
- `battleNum`: `curChallengeBattleNum` (+ 0xCB2) before the opponent roll; 6 is battle 7 (the hard trainer table, and
  `trainerIds[6]` is not written by the ROM).
- `dealCursor`: gRngValue at `GenerateInitialRentalMons`' entry. `opponentCursor` (optional): gRngValue at
  `GenerateOpponentMons`' entry; absent = the ROM's own, the cursor right after the six rentals. `constructionCursor`
  (optional, `--build` only): gRngValue at `CreateFrontierFactorySelectableMons`' entry; absent = the ROM's own.
- `towerLv50Streak` (optional): `towerWinStreaks[0][0]` (+ 0xCE0). Battle Factory opponents read it for their fixed IV at
  battle start (`FillFactoryFrontierTrainerParty`, the non-BUGFIX branch); nothing this lab reads depends on it.
- `priorTrainerIds` (optional): `trainerIds[0..]`, the earlier battles' trainers, which the roll will not repeat. Absent = the
  save's own values (shown as `trainerIdsBefore`; the bootstrap holds 1, 2, 0, ...).

Method: one child process per level loads that level's state saved just before frame 5795 (0-indexed), the frame of the
PreBattleRoom deal, from `.integration/openlevel-cache/` (built on first use, about 2 s), writes the inputs, and steps the
deal frame with traps: the cursors are set at the function entries; a VBlankIntr `Random()` inside either function is undone
(none happens in practice: both run inside one frame, with no VBlank between them); frames are stepped until
`GenerateOpponentMons` returns, so a frame boundary inside the deal would be handled.

`--build` plays on with the bootstrap's own inputs (the attendant's comment pages) until `CreateFrontierFactorySelectableMons`
has returned and reads the six built Pokemon (personality, nature, level, experience, IVs, EVs, stats, moves, PP, item,
ability bit). That function runs for about 50 frames and the overworld VBlank draws `Random()` once per frame inside it
(36 to 62 draws per build in the test set); by default these are undone (the build reads one unbroken stream from the cursor, as the engine
draws it). `--keep-vblank` keeps them, as the real game does: with the ROM's own cursor this reproduces the bootstrap's own six
exactly (checked at both levels).

Output: one JSON with each sample's inputs, `romBefore` (the frontier slots after the writes), `deal` (six set ids, rental
rank, `GetFactoryMonId` arguments, draws, cursors at entry and return, the ROM's own cursor at entry), `opponent` (trainer from
`gTrainerBattleOpponent_A` and from `trainerIds[battleNum]`, the three set ids, every trainer roll with its arguments, cursors),
and with `--build` the six Pokemon.

Time (Mac, 2026-11-22): deal only 0.01-0.02 s per sample plus about 1 s per level to start (2 s more the first time, to build
the cache); `--build` 1.1-1.6 s per sample.

Things to know:
- The real game rolls battle 2-7's opponent at the GO ON answer (`AskSwapMon`), with `rentalMons` holding the player's three
  and the last opponent's three. The lab rolls it at the deal, so the species it avoids are the six fresh rentals.
- The written streak is read at the deal only; in a real game a non-zero streak at the deal means the streak flag was set
  when `InitFactoryChallenge` ran in the Lobby (it zeroes the streak and rents count otherwise). The lab writes after that.
- Cursors in the samples must not be consecutive LCG states: neighbouring samples would then share most of their draws.
