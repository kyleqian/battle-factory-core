# Noland (Frontier Brain) party generation — ROM ground truth

Side-lane deliverable for the main lane's `FillFactoryBrainParty` port
(`reference/pokeemerald/src/battle_factory.c:759-826`). Two receipts —
**silver** (streak 20, entering battle 21, `challengeNum` 2) and **gold**
(streak 41, entering battle 42, `challengeNum` 5) — captured from the real
ROM running headless in mGBA, each with full `Random()` attribution and
each reproduced byte-identically on a second, fully independent
(fresh-process) run. This document is the receipt dossier; the raw JSON
receipts are committed at `tools/probe/receipts/noland-brain-party-{silver,gold}.json`,
the capture probe at `tools/probe/dump-noland-brain-party.py`, and the
PASS/FAIL structural check at `tools/probe/verify-noland-brain-receipts.ts`.

## Method

Direct source citations for every step below are in the probe script's own
docstring and inline comments; this section summarizes them.

`FillFactoryBrainParty` is source-self-contained given six inputs, all of
which are ordinary (non-transient) SaveBlock/var fields:
`gSaveBlock2Ptr->frontier.lvlMode`, `VAR_FRONTIER_BATTLE_MODE`,
`gSaveBlock2Ptr->frontier.factoryWinStreaks[battleMode][lvlMode]`,
`gSaveBlock2Ptr->frontier.rentalMons[0..5].monId`,
`gSaveBlock2Ptr->playerTrainerId`, and `gRngValue`. The dispatch into it
(`FillFactoryFrontierTrainerParty`, called from `FillFactoryTrainerParty`,
called from the ROM's own battle-init path once the map is the Factory
battle room — `battle_factory.c:812-820`/`InBattleFactory`) is a single
`if (trainerId == TRAINER_FRONTIER_BRAIN) { FillFactoryBrainParty(); return; }`
check against `gTrainerBattleOpponent_A` (`battle_tower.c:1852-1855`).

The probe reuses the exact, already-proven route from
`tools/probe/dump-win-battle2-opponent-rng.py`: replay the committed
`tools/battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json`
mechanicLab fixture verbatim (11308 frames — walks a real Level 50 Singles
Battle Factory run from the rental screen through to the point right before
battle 2's own opponent-party construction). At that point — *after* the
fixture's own RNG-driven trainer-id selection has already run and resolved
(so nothing later in the flow re-derives or depends on
`gTrainerBattleOpponent_A`) — the probe RAM-pokes:

| field | address | poked value |
| --- | --- | --- |
| `factoryWinStreaks[SINGLES][LVL_50]` | `*gSaveBlock2Ptr + 0xDE2` (global.h:423) | 20 (silver) / 41 (gold) |
| `curChallengeBattleNum` | `*gSaveBlock2Ptr + 0xCB2` (global.h:390) | 6 (last of 7 battles; record-only — `FillFactoryBrainParty` never reads it) |
| `lvlMode` (low 2 bits) | `*gSaveBlock2Ptr + 0xCA9` (global.h:385) | 0 (`FRONTIER_LVL_50`) |
| `VAR_FRONTIER_BATTLE_MODE` | `*gSaveBlock1Ptr + 0x139C + 2*(0x40CE-0x4000)` (global.h:1021, constants/vars.h:226) | 0 (`FRONTIER_MODE_SINGLES`) |
| `gTrainerBattleOpponent_A` | `0x02038bca` (plain global, not a bitfield) | 1022 (`TRAINER_FRONTIER_BRAIN`, constants/trainers.h:12) |

`gSaveBlock2Ptr->frontier.rentalMons[0..5]` and `gSaveBlock2Ptr->playerTrainerId`
are **not** poked — they're read as staged by the fixture's own real rental
draft, matching the step brief's "player's 6 `frontier.rentalMons` monIds"
precondition honestly (both cases share the same fixture, so both receipts
carry the same rental pool and OT id).

`FillFactoryBrainParty` is then entered for real: 2× `A` (dismissing the
held pre-battle quote, matching the sibling probe's exact button pattern),
then CPU single-stepping frames 11311+ watching `cpu.pc`/`cpu.lr`. Every
`Random()` entry (`0x0806f5ce`, pipelined) is LR-attributed by bisecting a
full local+global symbol table (`arm-none-eabi-nm --defined-only -n`,
matching the already-proven technique in
`tools/probe/attribute-factory-ai-random-callers.py`). `GetFactoryMonId`
(`0x081a6ef2`) calls are additionally paired with the `u16` they return in
`r0` at their single (compiler-deduplicated) call site inside
`FillFactoryBrainParty`'s `while` loop, which lets the probe replay the same
accept/reject decision tree the C source runs
(`species==SPECIES_UNOWN` → L50-high-tier (`monId > 849`) → already-a-rental-monId
→ duplicate species → duplicate item; `battle_factory.c:777-808`) against
the **real**, live-memory-read `gFacilityTrainerMons`/`gBattleFrontierHeldItems`
ROM tables (`0x0203bc8c`/`0x085cecb0`), not a hardcoded copy — and
cross-checks that reconstruction against the realized `gEnemyParty`.

**Bug found and fixed during this capture** (recorded here per the step
brief, not a scope violation): `EmeraldOracle.read_u32` performs a native
word read (`core.memory.u32[addr]`) that **silently rounds a
non-4-byte-aligned address down** to the nearest word boundary.
`gSaveBlock2Ptr->playerTrainerId` sits at SaveBlock2 offset `0x0A`
(2 mod 4, unaligned), so the first capture attempt read the wrong 4 bytes —
its value didn't match the OT id actually baked into the realized
`gEnemyParty` mons. Confirmed by a raw byte scan of the first 0x20 bytes of
`*gSaveBlock2Ptr`, which found the real `playerTrainerId` bytes sitting
exactly at offset `0x0A`, matching the source's own `T1_READ_32` byte-by-byte
macro rather than a native word load. Fixed by reading it byte-by-byte
(`read_u32_unaligned` in the probe). This is a probe-infrastructure gotcha,
not a Factory-generation finding — worth flagging for any other tool in this
harness that calls `read_u32` on a struct field not already known to be
4-byte aligned.

Every other single-step Random()-attribution field in both receipts
(`fillEntry`/`fillReturn`/`randomCalls[*].pre`) uses `gRngValue`
(`0x03005d80`, 4-byte aligned) and needed no such fix.

## Silver receipt (streak 20 → battle 21, `challengeNum` 2)

### Staged pre-conditions

| field | value |
| --- | --- |
| `factoryWinStreaks[SINGLES][LVL_50]` | 20 |
| `curChallengeBattleNum` | 6 |
| `lvlMode` / `battleMode` | 0 (LVL_50) / 0 (SINGLES) |
| `gTrainerBattleOpponent_A` | 1022 (`TRAINER_FRONTIER_BRAIN`) |
| player `frontier.rentalMons[0..5]` monIds | `[156, 149, 180, 188, 184, 135]` |
| `playerTrainerId` (used as every created mon's OT id) | 416049562 |
| `gRngValue` immediately before the first `Random()` call inside `FillFactoryBrainParty` | **798334452** (= `fillEntry.rngAtEntry`; the `otId`/`SetFacilityPtrsGetLevel()` prologue makes no `Random()` calls, so this equals the RNG value at function entry) |
| derived `challengeNum` | 2 (= 20 // 7) |
| derived fixed IV (`GetFactoryMonFixedIV(challengeNum+2, FALSE)` = `sFixedIVTable[4][0]`) | **15** |
| derived monId draw range (`sInitialRentalMonRanges[2]`, Level 50 half) | **[267, 371]** |

### Draw ledger

All 3 draws accepted on the first try (0 rejections this run).

| # | frame | monId | species | held item | outcome | personality Random() calls (Random32 retries × 2) |
| - | - | - | - | - | - | - |
| 0 | 11313 | 324 | SEADRA (117) | SHELL BELL (219) | accept (slot 0) | 58 (29 attempts) |
| 1 | 11319 | 354 | CRAWDAUNT (327) | QUICK CLAW (183) | accept (slot 1) | 10 (5 attempts) |
| 2 | 11329 | 268 | SABLEYE (322) | LUM BERRY (141) | accept (slot 2) | 168 (84 attempts) |

Total `Random()` calls attributed to `FillFactoryBrainParty`
(`GetFactoryMonId` + `CreateMonWithEVSpreadNatureOTID`): 3 + 236 = **239**.
271 total `Random()` calls were observed in the single-stepped window;
the other 32 (31 `VBlankIntr`, 1 `GetSpecialBattleTransition`) are
background music/transition-effect draws unrelated to party generation,
correctly excluded from the ledger by caller-symbol classification.

`gRngValue` after the last construction draw (`fillReturn.rngAtReturn`,
frame 11341): **2643602241**.

### Realized `gEnemyParty`

| slot | species | item | nature | IVs (all 6) | EVs (hp/atk/def/spe/spa/spd) | moves | friendship | OT id | personality |
| - | - | - | - | - | - | - | - | - | - |
| 0 | SEADRA | SHELL BELL | 6 | 15/15/15/15/15/15 | 255/0/0/0/0/255 | HYDRO PUMP, FRUSTRATION, DRAGON BREATH, DRAGON DANCE | 0 | 416049562 | 3690712431 |
| 1 | CRAWDAUNT | QUICK CLAW | 3 | 15/15/15/15/15/15 | 255/0/0/0/0/255 | GUILLOTINE, FRUSTRATION, ANCIENT POWER, AERIAL ACE | 0 | 416049562 | 1465692053 |
| 2 | SABLEYE | LUM BERRY | 24 | 15/15/15/15/15/15 | 170/170/0/0/170/0 | SHADOW BALL, FAINT ATTACK, CONFUSE RAY, RECOVER | 0 | 416049562 | 2385905149 |

All three box checksums valid; all six IVs uniformly 15 (matches derived
fixed IV); no duplicate species; no duplicate held item; no accepted monId
equals any of the 6 staged `rentalMons`; every accepted monId inside
[267, 371].

## Gold receipt (streak 41 → battle 42, `challengeNum` 5)

### Staged pre-conditions

Identical fixture/rental pool/OT id as silver (same underlying replay):
`rentalMons = [156, 149, 180, 188, 184, 135]`, `playerTrainerId = 416049562`,
`gRngValue` before the first `Random()` call inside `FillFactoryBrainParty`
= **798334452** (same value as silver — the poke changes only the streak,
not anything upstream of `FillFactoryBrainParty`'s entry).

| field | value |
| --- | --- |
| `factoryWinStreaks[SINGLES][LVL_50]` | 41 |
| derived `challengeNum` | 5 (= 41 // 7) |
| derived fixed IV (`sFixedIVTable[7][0]`, clamped: `min(5+2, 7)=7`) | **31** |
| derived monId draw range (`sInitialRentalMonRanges[5]`) | **[564, 659]** |

### Draw ledger

All 3 draws accepted on the first try (0 rejections this run).

| # | frame | monId | species | held item | outcome | personality Random() calls (attempts) |
| - | - | - | - | - | - | - |
| 0 | 11313 | 576 | WHISCASH (324) | CHESTO BERRY (134) | accept (slot 0) | 20 (10 attempts) |
| 1 | 11324 | 580 | QUAGSIRE (195) | QUICK CLAW (183) | accept (slot 1) | 74 (37 attempts) |
| 2 | 11331 | 626 | TENTACRUEL (73) | SHELL BELL (219) | accept (slot 2) | 52 (26 attempts) |

Total `Random()` calls attributed to `FillFactoryBrainParty`: 3 + 146 = **149**.
179 total observed in-window (30 background/transition, excluded the same way).
`gRngValue` after the last construction draw (frame 11339): **4099675733**.

### Realized `gEnemyParty`

| slot | species | item | nature | IVs (all 6) | EVs (hp/atk/def/spe/spa/spd) | moves | friendship | OT id | personality |
| - | - | - | - | - | - | - | - | - | - |
| 0 | WHISCASH | CHESTO BERRY | 0 | 31/31/31/31/31/31 | 0/0/255/0/0/255 | SLEEP TALK, REST, SURF, FISSURE | 0 | 416049562 | 2924614575 |
| 1 | QUAGSIRE | QUICK CLAW | 3 | 31/31/31/31/31/31 | 0/255/0/0/0/255 | EARTHQUAKE, SLUDGE BOMB, DOUBLE-EDGE, CURSE | 0 | 416049562 | 2856969503 |
| 2 | TENTACRUEL | SHELL BELL | 15 | 31/31/31/31/31/31 | 0/0/170/170/170/0 | SURF, GIGA DRAIN, ICE BEAM, MIRROR COAT | 0 | 416049562 | 2802900590 |

All three box checksums valid; all six IVs uniformly 31; no duplicate
species/item; no accepted monId in `rentalMons`; every accepted monId
inside [564, 659].

## Both-runs-identical confirmation

Each receipt was captured **twice**, from a **fresh mGBA process each time**
(`python3 tools/run-mgba-probe.py <fresh-output.json> -- tools/probe/dump-noland-brain-party.py <fresh-output.json> silver|gold`,
per-run process isolation per this harness's standing rule for receipts).
`diff` between the two fresh runs' output JSON was empty (byte-identical)
for both `silver` and `gold` — the same result held both before and after
the `read_u32` alignment fix above (i.e. the fix changed correctness, not
determinism; both the broken and fixed versions were independently
twice-fresh-reproducible, which is why the bug needed the cross-check
against the realized `gEnemyParty` OT id to surface at all, not a
run-to-run diff).

## Verification

```
node --experimental-strip-types tools/probe/verify-noland-brain-receipts.ts
```

24 checks per receipt (48 total), all passing, including: draw count =
rejections + 3 accepts + personality draws; fixed IVs uniform per case;
no duplicate species/item among the 3 accepted mons; no accepted monId
equal to any staged `rentalMons` entry; every accepted monId inside the
challengeNum's real draw range; every realized mon's OT id matches the
staged `playerTrainerId`; `rngValueBeforeFirstFactoryDraw` matches the
first `GetFactoryMonId`-attributed `Random()` call's pre-value;
`rngValueAfterLastConstructionDraw` matches `fillReturn.rngAtReturn`.

The checks genuinely discriminate: mutating a copy of the silver receipt
(setting draw 1's `species` to draw 0's species, simulating data
corruption) makes the "no duplicate species" and "realized species/order
matches the accepted draw order" checks fail, as expected — demonstrated
during this step's development, not committed as a fixture (see the final
worker report for the exact commands run).

## Source citations

- `reference/pokeemerald/src/battle_factory.c:729-757` — `GetFactoryMonFixedIV`, `sFixedIVTable`.
- `reference/pokeemerald/src/battle_factory.c:759-826` — `FillFactoryBrainParty` (the ported function).
- `reference/pokeemerald/src/battle_factory.c:157-167` — `sFixedIVTable` literal values.
- `reference/pokeemerald/src/battle_factory.c:169-188` — `sInitialRentalMonRanges`.
- `reference/pokeemerald/src/battle_factory.c:828-866` — `GetFactoryMonId`.
- `reference/pokeemerald/src/battle_tower.c:1815-1859` — `FillFactoryFrontierTrainerParty`, including the `trainerId == TRAINER_FRONTIER_BRAIN` dispatch to `FillFactoryBrainParty`.
- `reference/pokeemerald/src/pokemon.c:2562-2594` — `CreateMonWithEVSpreadNatureOTID` (the `Random32()`-retry personality loop).
- `reference/pokeemerald/src/pokemon.c:2206-2249` — `CreateBoxMon` / `OT_ID_PRESET` (confirms the OT id parameter is used literally, no transform).
- `reference/pokeemerald/src/random.c` — `Random()` (`sRandCount`, `gRngValue`), `include/random.h:12` — `Random32()` macro (= two `Random()` calls).
- `reference/pokeemerald/include/global.h:508-544` — `struct SaveBlock2` (`playerTrainerId` @ 0x0A, `TRAINER_ID_LENGTH` = 4).
- `reference/pokeemerald/include/global.h:378-449` — `struct BattleFrontier` (`lvlMode` @ 0xCA9, `curChallengeBattleNum` @ 0xCB2, `factoryWinStreaks` @ 0xDE2, `rentalMons` @ 0xE70 — all absolute SaveBlock2 offsets per `tools/probe/dump-rentalmons.py`'s already-documented offset-comment convention).
- `reference/pokeemerald/include/battle_tower.h:27-51` — `struct FacilityMon` (16-byte agbcc-rounded stride, confirmed against `oracle/battle_lab.py`'s `FACILITY_MON_SIZE` and empirically against `gBattleFrontierMons`'s linked size / `NUM_FRONTIER_MONS`).
- `reference/pokeemerald/include/constants/trainers.h:12` — `TRAINER_FRONTIER_BRAIN` = 1022.
- `reference/pokeemerald/include/constants/vars.h:226` — `VAR_FRONTIER_BATTLE_MODE` = 0x40CE.
- `reference/pokeemerald/include/constants/battle_frontier_mons.h:862` — `FRONTIER_MONS_HIGH_TIER` = 849.
- `oracle/battle_lab.py` — cross-checked `SB2_FRONTIER_LVL_MODE`/`SB2_FRONTIER_BATTLE_NUM`/`SB2_FACTORY_WIN_STREAK_SINGLES_50`/`SB2_RENTAL_MONS`/`FACILITY_MON_SIZE` constants (this step derived its own copies independently, from source, before finding this file already agreed).
