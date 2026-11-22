# opl3: the ROM replay at Open Level

**Result.** The whole-battle ROM replay now runs at Open Level (level-100 parties from the Open Level sets). Every Open battle
driven so far matches the stock ROM to the end: every turn state (both HP values, `gRngValue`, the last moves), every wide
state at every decision, and the winner. **165 battles, 3,299 states, 0 divergences.** Level 50 is unchanged byte for byte.

| batch | battles | match | states |
|---|---|---|---|
| census player, seeds 0..59, Scene OFF | 60 | 60 | 1,248 |
| census player, seeds 1 8 30 33 57, Scene ON | 5 | 5 | 92 |
| `ai-v1` player, seeds 0..59, Scene OFF | 60 | 60 | 1,119 |
| census player at the eighth challenge (`c7`: full AI, sets 372..881), seeds 0..29, Scene OFF | 30 | 30 | 650 |
| Noland: silver 82, gold 26 and 75 (`SYMBOLS=1`), Scene OFF | 3 | 3 | 34 |
| staged battles for the level-dependent rules (below), Scene OFF | 7 | 7 | 156 |

Five battles needed a second try, none of them for a rule difference (see "Triage"): seeds 10 (census) and 18 (`ai-v1`) are
long Struggle stalls that need the long caps; `c7` seeds 22, 26 and 27 matched on the second drive.

## How to run it

From `workspace/`, with `PYTHONPATH=<pokebench>/vendor/libmgba-py`:

```sh
REPLAY_OUT=/abs/dir REPLAY_LEVEL=open tools/audio/romReplayWide.sh SEED [POLICY [SYMBOLS [CHALLENGE]]]   # the nightly chain; ID gets -open
REPLAY_OUT=/abs/dir REPLAY_LEVEL=open REPLAY_SCENE=on tools/audio/romReplayWide.sh SEED                   # Scene ON
REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh --stage docs/parity-mac/stages/opl3/NAME.json            # a staged battle (its level is in the file)
REPLAY_LEVEL=open tools/audio/romDriveSeed.sh SEED off DIR                                                # the older one-line chain; files SEED-off-open.*
python3 tools/audio/romReplayBatchReport.py DIR                                                           # the table of a batch
```

Long battles: `REPLAY_FRAME_BUDGET=2000000 REPLAY_DRIVE_FRAMES=600000`. One battle takes about 12 s alone on the Mac.

## What changed

- **`oracle/battle_lab.py`.** A request with `level: 100` stages an Open Level battle: `frontier.lvlMode` = 1 (instead of
  cleared), the streak and rent count in the Open Level singles slots (`factoryWinStreaks[0][1]` at 0xDE4,
  `factoryRentsCount[0][1]` at 0xDF4), set ids checked against the Open Level rows (`battle_factory.c:181-189`: 372..467,
  468..563, 564..659, 660..755, then 372..881 from challenge 4; high-tier rows allowed). The Tower streak that the stock IV
  bug reads stays the Level 50 one (`battle_tower.c:1840-1842`). The ROM builds both parties itself: the select screen at
  `FRONTIER_MAX_LEVEL_OPEN`, the foes at `GetFrontierEnemyMonLevel` (100). `oracle/test_battle_lab.py`: 7 new Open cases.
- **`tools/integration/soundCensusRomReplay.ts`.** `--level=open` (or `ROM_REPLAY_LEVEL=open`, or `lvlMode: "open"` in a
  stage file) on `request` / `replay` / `compare` / `native`: the census battle at Open Level (as `lsd194Census.ts
  --level=open`), a level-100 lab request, the engine battle rebuilt from the ROM read-back with level-100 records (it
  refuses a ROM member at another level, and a Level 50 replay refuses an Open staging). A stage's hand-built player member
  may be built at 50 or 100, so the player can stand above or below the foes. The round replay refuses Open (not wired).
- **`romReplayWide.sh` / `romDriveSeed.sh`**: `REPLAY_LEVEL=50|open`; Open IDs end in `-open`. `romReplaySummary.py`
  writes `level: 100` for an Open battle only.
- **Tier 1:** `tests/opl3OpenLevelRomReplay.test.ts` replays census seed 8 at Open (high-tier set 863, Tyranitar's Sand
  Stream, challenge 5's full AI) from a ROM fixture (`tests/fixtures/opl3-open-seed8.json`) and checks every state.

**Level 50 is unchanged.** Requests of seeds 0..59 in both scenes are byte-identical to the old tool's; engine replays of
census seed 1 and of five Level 50 stages (R057, shd1, imprison, foresight-noland, R049) are byte-identical; the old and
the new lab stage five Level 50 requests (two ordinary census battles, silver Brain, a Mechanic Lab stage, a Brain stage) to the same
descriptor, snapshot and whole emulator state. The 13 test files that run the replay tool pass; `tsc -b` is clean.

**The Open slots, checked on the ROM** (`.integration/evidence/opl3/slots/`): Open challenge 3 with rent count 15 builds
all six at level 100, rental slot 0 at IV 15 (rank 1: the next challenge's IV) and the rest at 12; rent count 0 gives 12 for
all; challenge 0 gives 3. So the ROM reads the streak and the rent count from 0xDE4 / 0xDF4 when `lvlMode` is 1.

## Census seeds 0..59, Scene OFF

Streak `(seed * 11) % 49`, challenges 0 to 6. `*` = long caps; `B` = Noland. Every row matches; the drive stopped at the
battle's end with every decision used.

| seed (challenge): states | seed (challenge): states | seed (challenge): states | seed (challenge): states | seed (challenge): states | seed (challenge): states |
|---|---|---|---|---|---|
| 0 (c0): 20/20 | 1 (c1): 15/15 | 2 (c3): 13/13 | 3 (c4): 12/12 | 4 (c6): 10/10 | 5 (c0): 11/11 |
| 6 (c2): 21/21 | 7 (c4): 19/19 | 8 (c5): 15/15 | 9 (c0): 17/17 | 10 (c1, *): 158/158 | 11 (c3): 20/20 |
| 12 (c4): 13/13 | 13 (c6): 13/13 | 14 (c1): 14/14 | 15 (c2): 15/15 | 16 (c4): 10/10 | 17 (c5): 18/18 |
| 18 (c0): 39/39 | 19 (c1): 11/11 | 20 (c3): 8/8 | 21 (c5): 15/15 | 22 (c6): 12/12 | 23 (c1): 30/30 |
| 24 (c2): 16/16 | 25 (c4): 98/98 | 26 (c5): 13/13 | 27 (c0): 22/22 | 28 (c2): 22/22 | 29 (c3): 13/13 |
| 30 (c5): 11/11 | 31 (c6): 53/53 | 32 (c1): 13/13 | 33 (c2, B): 12/12 | 34 (c4): 15/15 | 35 (c6): 24/24 |
| 36 (c0): 17/17 | 37 (c2): 18/18 | 38 (c3): 10/10 | 39 (c5): 7/7 | 40 (c6): 9/9 | 41 (c1): 17/17 |
| 42 (c3): 6/6 | 43 (c4): 11/11 | 44 (c6): 18/18 | 45 (c0): 21/21 | 46 (c2): 12/12 | 47 (c3): 13/13 |
| 48 (c5): 11/11 | 49 (c0): 55/55 | 50 (c1): 22/22 | 51 (c3): 9/9 | 52 (c4): 11/11 | 53 (c6): 13/13 |
| 54 (c0): 25/25 | 55 (c2): 14/14 | 56 (c4): 12/12 | 57 (c5): 39/39 | 58 (c0): 21/21 | 59 (c1): 16/16 |

Open-only content in these: high-tier sets (850..881) in seeds 8 16 30 31 43 57; Tyranitar (Sand Stream) in 8 30 57 (the
permanent-weather fix of opl2 holds on the ROM); silver Noland at Open in 33.

## The rules that depend on the level

Each was proven at 50 only. Now each is in a battle that matches the ROM to the end (stage files in
`docs/parity-mac/stages/opl3/`, a sibling of the Level 50 folders so the nightly's globs do not pick them up; evidence
`.integration/evidence/opl3/stages/`). The numbers are the engine's, and the battle matched the ROM state for state.

| rule | where | what happened |
|---|---|---|
| Seismic Toss, Night Shade (damage = the user's level) | `opl3-level-damage` (the player's Dusclops 378, Xatu 385; Open challenge 0) | 16 uses: every hit 100 (73 on a finishing hit), one miss, one Protect |
| the same, chosen by the trainer AI | `opl3-level-damage-foe` (the foe's Blissey 558) | 5 Seismic Tosses by the AI, each 100 |
| Psywave (`level * (10r + 50) / 100`, r rerolled above 10) | `opl3-psywave` (hand-built level-100 Hypno; no Open set has Psywave) | 17 uses: 60 70 130 50 50 70 70 140 110, three finishing hits, 5 misses (all in 50..150, steps of 10) |
| Beat Up (each member's own level) | `opl3-beat-up-levels` (Clefable 100 using it, Snorlax 50 and Magikarp 100 behind it; no set has Beat Up) | 10 uses, three hits each (for example 57 49 9), two critical hits |
| OHKO, equal levels (30 + 0) | `opl3-ohko-equal` (Lapras 822, Walrein 644; Open challenge 4) | Sheer Cold 9 tries: 3 KOs, 6 misses |
| OHKO, target above the user | `opl3-ohko-target-above` (level-50 Lapras against level-100 foes) | 10 tries, all "unaffected", the `Random()` still drawn each time |
| OHKO, user above the target (30 + 50) | `opl3-ohko-user-above` (level-100 Lapras against level-50 foes, a Level 50 battle) | 3 tries, 3 KOs |
| damage formula and stat formula at 100 | every Open battle above | every damaging hit of the 165 battles; the wide state checks the five battle stats and max HP of both active Pokemon at every decision |
| the AI's damage scoring at level-100 numbers (`TRY_TO_FAINT`, `CHECK_VIABILITY`) | challenge 4 and later, and Noland | 26 census seeds (3 4 7 8 12 13 16 17 21 22 25 26 30 31 33 34 35 39 40 43 44 48 52 53 56 57), the same 26 with `ai-v1`, all 30 `c7` seeds, 3 more Noland battles |

The two OHKO stagings with unequal levels cannot happen in a real Factory battle (everyone is 50, or everyone is 100);
they check the level clause of `Cmd_tryKO` (`battle_script_commands.c:7522-7570`) on both sides of it.

## Triage

No engine rule differs from the ROM in any Open battle. What did not match on the first try:

- **Seed 10 (census) and seed 18 (`ai-v1`): the ROM drive's frame cap.** Both are Struggle stalls; the drive stopped at
  80,000 frames with every state so far matching (110 / 158 and 146 / 152) and no wide difference. With the long caps:
  158 / 158 (119,291 ROM frames) and 152 / 152 (83,315). Level-100 battles last longer (more HP per hit taken), so Open
  needs the long caps a little more often than Level 50.
- **`c7` seeds 22, 26, 27: matched 0 states on the first drive, all states on the second.** The ROM side of those runs
  started from another `gRngValue` on the same request (22: the drive; 26 and 27: the setup probe). This is the "re-drive
  once" flake of the handoff (item 0d, "cause not found"). **Cause found:** the host clock reaches the ROM through the
  emulated real-time clock. `oracle/emerald_core.py` calls `core.rtc.use_simulated_time()` with no argument, and
  libmgba-py's default `starting_time=datetime.datetime.now()` (`vendor/libmgba-py/mgba/core.py:505`) is evaluated once,
  when the module is imported. So the game's clock starts at the process start time. Measured
  (`.integration/evidence/opl3/triage/rtc-scan-26*.txt`): staging `c7` seed 26 with the clock forced to 11:39:55,
  11:40:00, 11:40:15 or 11:40:20 local gives menu `gRngValue` 3449723833; 11:39:45 and 11:40:30 and every other time tried
  (10:40, 11:38..11:41 every 15 s, 11:50, 12:10, 12:40, 13:40) give 2488679507; the next day at 11:40:05 gives 3449723833
  again. So once a day a window of about 30 seconds of process start gives another ROM battle. Inferred, not traced to a
  source line: the game's once-a-day update falls inside the staging then and spends extra `Random()` calls. The three
  seeds were driven inside that window today. It hits Level 50 the same way (the bulk run's nine seeds in a row,
  4777..4812).
  **Not fixed here** (it changes the shared oracle for every Level 50 run): the fix is to pass a fixed start time,
  `use_simulated_time(<fixed datetime>)`, in `oracle/emerald_core.py`, chosen outside the window, then re-check the
  Level 50 pins. Until then the handoff rule stands: a battle with 0 matched states is driven again.

## What is left

- The nightly does not drive Open battles. Adding a few Open seeds to it (and the `opl3` stage folder) is a decision for
  the planning layer.
- The round replay (`round` / `round-compare`, `romRoundDriver.py`) is Level 50 only: a whole Open round (swaps, the next
  opponent at GO ON) is not driven yet.
- The lab stages Open from the Level 50 checkpoint by writing `lvlMode` (the PreBattleRoom walk goes right instead of left,
  same length). Open Level bootstrap profiles are another worker's job (`oracle/bootstrap/`).
- The RTC start time (above). What is inferred there: which once-a-day update spends the extra draws. The 0xDE4 / 0xDF4
  offsets were inferred from `include/global.h` and are now checked on the ROM (above).
