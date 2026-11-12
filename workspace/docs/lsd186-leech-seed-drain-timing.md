# lsd186 — Leech Seed turn-end drain: HP → print timing, both scenes (sub183 residual; ISSUES #153 / #167 family)

Side lane, 2026-10-16. **Evidence only** (no `src/` or test change). Base `516670b9c`. Convention as sub183 / aud118: a "run" is consecutive
frames on one `gBattlescriptCurrInstr`; "first glyph" is the first screen change inside the print's `waitmessage` run (= production's message
command row 0). Receipts: `tools/integration/fixtures/lsd186/`.

## Method

- ROM: three staged scenarios, each in Scene OFF and Scene ON, **each twice from fresh direct-mGBA processes, r1 == r2 byte-identical (probe rows + raw RGB sha)**:
  `mechanic-leech-seed-player-exeggcute-opponent-onix` (player seeds; the drained mon is the opponent ONIX, 110 HP, 13 HP drained; EXEGGCUTE 156 HP
  tackled 11 first, so it heals 11), `mechanic-leech-seed-opponent-exeggcute-player-onix` (mirror; heals 10), and a receiver-at-full-HP variant
  `fixtures/lsd186/scenarios/lsd186-leech-seed-fullhp-player-exeggcute-opponent-onix.json` (ONIX uses Tail Whip, so the receiver heals 0). HP values
  read from `gBattleMons` by `lsd186RomHp.py`.
- Anchor **A** = the first row after the preceding "ONIX was seeded!" print (ROM: the print's `waitmessage` run ends at D−11, D−10 is its `goto`;
  D = the first row at `BattleScript_LeechSeedTurnDrain`). Production's next command after that print starts at A.
- Production: the real kernel (`createFactoryFullTurnBattleState` / `submitFactoryFullTurnDecision`, real level-50 stats and HP, Scene OFF = `HITMARKER_NO_ANIMATIONS`)
  + `projectBattleResolutionCommands` + `battleResolutionCommandDuration` (`lsd186Production.ts`). The kernel RNG seed is chosen so Tackle's roll equals the ROM's
  (seed 57 → 11 HP, seed 4 → 10 HP). Scene ON and OFF produce the same drain commands. Cross-checked on ordinary census battles (`lsd186Timing.ts`, seeds 0..29 OFF: 7 drains, all in seed 16):
  the same three-command shape in all 7 (below).

## ROM script rows (identical in structure for both sides; BS_ATTACKER = the seeded mon, BS_TARGET = the HP receiver)

`BattleScript_LeechSeedTurnDrain: playanimation LEECH_SEED_DRAIN; orword HITMARKER_PASSIVE_HP_UPDATE; healthbarupdate ATTACKER; datahpupdate ATTACKER; copyword; jumpifability; manipulatedamage; setbyte;`
`goto PrintAndUpdateHp: orword; healthbarupdate TARGET; datahpupdate TARGET; printfromtable; waitmessage; ...`

| Rows (relative to A) | OFF | ON |
| --- | --- | --- |
| print's `goto` + 9 MoveEnd rows (A..D−1) | 10 | 10 |
| D: `playanimation` | 1 row (A+10) | 1 row |
| general animation | `BattleScript_Pausex20` 32 rows + 1 return row (A+11..A+43) | 208 rows, `gAnimScriptActive` = 1 (A+11..A+218; the run also holds the `orword`) |
| `orword`/`healthbarupdate` rows | 2 (A+44, A+45) | 1 (A+219) |
| **seeded bar** = `datahpupdate` run | starts A+46, **bar + 2 rows** (13 HP: 15 rows; first change row 1) | starts A+220, same |
| `copyword … goto` + `orword` + `healthbarupdate` | **7 rows** between the runs | 7 |
| **receiver bar** = `datahpupdate` run | starts A+68, **bar + 2 rows**: 11 HP → 13, 10 HP → 12, **0 HP → 2** | starts A+242, same |
| `printfromtable` | 1 row | 1 |
| `waitmessage` run | starts +1, first glyph at its row 1 | same |

OFF opponent-seeds case: seeded bar run 15 rows with 13 changes (player bar has numerals: one change per HP); receiver run 12 rows, 4 changes.
The player-seeds case: opponent bar 6 pixel changes (110 HP over 48 px); receiver run 13 rows, 11 changes.

## ROM / production / delta (rows from A; Δ = production − ROM)

| Row | Scene | ROM tackled-player-seeds / tackled-opponent-seeds / full-HP | Production (all three; commands identical in both scenes) | Δ |
| --- | --- | --- | --- | --- |
| Lead before the first bar (production: two `sprite-visibility` rows) | OFF | 46 / 46 / 46 | 2 | **−44** |
| | ON | 220 / 220 / 220 | 2 | **−218** |
| Drain general animation | OFF | `Pausex20` 32 + 1 rows | no command | −33 |
| | ON | 208 rows (LEECH_SEED_DRAIN) | no command (no animation command at all) | −208 |
| Seeded bar command: start / length | OFF | 46 / 15 (bar 13) | 2 / **28** (floor `minimumFrames 28`) | −44 / **+13** |
| | ON | 220 / 15 | 2 / 28 | −218 / +13 |
| Gap rows between the bars (5 script + `orword` + `healthbarupdate`) | both | 7 | 0 (the receiver bar starts at the seeded one's end) | −7 |
| Receiver bar: start / length | OFF | 68 / 13, 12, **2** (bar 11, 10, 0) | 30 / **28, 28, 28** | −38 / +15, +16, **+26** |
| | ON | 242 / 13, 12, 2 | 30 / 28, 28, 28 | −212 / +15, +16, +26 |
| Print first glyph | OFF | 83 / 82 / **72** | 58 / 58 / 58 | **−25 / −24 / −14** |
| | ON | 257 / 256 / 246 | 58 / 58 / 58 | **−199 / −198 / −188** |
| Print length, first glyph → next command (`messageLen`) | both | 105 / 101 (= production's ROM-matched 105 / 101) | 105 / 101 | 0 |

The print itself is exact. The drain animation, the two bars' run lengths and the rows between are not: production is **early** by 14–25 rows (OFF) / 188–199 (ON), and
the error is a sum of opposite signs (missing lead −44 / −218, gap −7, 28-row floors +13 … +26).
(Not compared at pixel level; the structure and row counts are the evidence. The seeded bar's change rows are 1..bar in both: production's bar program steps 1 HP per row for
max HP ≥ 48, the ROM's first change is run row 1.)

## Would sub183's tail (+3) or a lead land the print?

First-glyph error (Δ to ROM, OFF tackled-player-seeds / tackled-opponent / full-HP; ON the same minus the 174-row animation difference; `comparison.json` `variants`):

| Candidate production change | OFF Δ | ON Δ |
| --- | --- | --- |
| current | −25 / −24 / −14 | −199 / −198 / −188 |
| `tailFrames 3` on the receiver bar only (the sub183 rule) | −22 / −21 / −11 | −196 / −195 / −185 |
| lead only (+44 OFF / +218 ON) | +19 / +20 / **+30** | +19 / +20 / +30 |
| drop the 28 floor on both bars + tail 3 | −52 / −52 / −52 | −226 / −226 / −226 |
| lead + drop the floor + tail 3 (receiver only) | −8 / −8 / −8 | −8 / −8 / −8 |
| **lead + drop the floor + tail 8 (seeded bar) + tail 3 (receiver)** | **0 / 0 / 0** | **0 / 0 / 0** |

So **neither a +3 tail nor a lead alone lands the print**: the floor (`HP_TIMING.minimumFrames 28`) is longer than the ROM's run for any HP delta below 27, and the seeded
bar is followed by 7 more script rows. The exact production change, which makes the print's first glyph, the receiver bar's start and the seeded bar's start all exact
(the three-case arithmetic is in `comparison.json`; verify by running production):

1. The two `hp` commands of the drain (`datahpupdate` preceded by `healthbarupdate; orword`, the seeded mon's by a `playanimation` LEECH_SEED_DRAIN or its `healthbarupdate`) take
   `minimumFrames` 0 (duration = bar + 1) instead of 28. Bars longer than 27 rows (max HP ≥ ~216) are unaffected.
2. Seeded bar: `tailFrames 8` = 1 (the ROM run is bar + 2) + 7 script rows before the receiver `healthbarupdate`/`datahpupdate`.
3. Receiver bar: `tailFrames 3` = exactly sub183's `HP_PRINT_TAIL_FRAMES` (1 + `printfromtable` + the `waitmessage` row before the first glyph). With a 0-HP receiver change the command is 1 + 3 = 4 rows (ROM 2 + 1 + 1).
4. A lead before the seeded bar: **44 rows in Scene OFF** (8 of the print's `goto` + MoveEnd rows beyond the two `sprite-visibility` rows, 1 `playanimation`, `Pausex20` 32 + 1,
   `orword`, `healthbarupdate`), **218 in Scene ON**, of which 208 are the LEECH_SEED_DRAIN general animation (`gAnimScriptActive` 1; prep43 has its sprite-order plan).
   OFF is a static hold. ON needs the animation itself drawn (a held frame would be pixel-wrong), so ON is an animation-lane item; the OFF lead + floor + tails are pure
   timing and could land alone.

This is also why sub183's restriction held: the Substitute rule's `attackanimation; waitanimation; healthbarupdate` lead-in does not match the Leech Seed script, and
extending the tail without the floor and lead would worsen nothing but fix nothing (row 2 above).

## Observations (not changed)

- Every census drain has the same shape (7 of 7, seeds 0..29, OFF): `hp` (seeded) 28 → `hp` (receiver) 28 → `message` (101/105/107). `from == to` receiver commands (full-HP) are common.
- The preceding **"ONIX was seeded!" print** is held 88 rows in production (`max(24, printable) + 64`) against the ROM's first glyph → next command 80 (16 chars) / 84 ("Foe ONIX …", 20 chars): production is +8 / +4 late.
  The `minimumFrames 24` floor over-holds short prints here. Out of this step's scope; measured from the same probes (waitmessage run D−91..D−11 and D−95..D−11).
- Not staged: Liquid Ooze (`BattleScript_LeechSeedTurnPrintLiquidOoze`, same tail shape), a faint on the drain (`tryfaintmon` after the print), a 2nd drain in one turn end, bars > 27 rows.

## Reproduce

```sh
source /etc/pokebench-runner.env
OUT=<fresh> bash tools/integration/lsd186Probes.sh                      # 4 tackled scenarios x 2 fresh runs, <= 2 concurrent mGBA; JOBS="<path.json>:off ..." for others
python3 tools/integration/lsd186RomRuns.py <rom.json>... > rom-drain-runs.json
node --experimental-strip-types --no-warnings tools/integration/lsd186Compare.ts tools/integration/fixtures/lsd186 tools/integration/fixtures/lsd186/comparison.json
node --experimental-strip-types --no-warnings tools/integration/lsd186Timing.ts --seeds=0..29 --scene=off      # census drain shape
```
