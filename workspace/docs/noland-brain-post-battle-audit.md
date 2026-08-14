# Noland (Frontier Brain) post-battle-resolution audit

Bounded side-lane read-heavy survey. Scope: everything the ROM does **after**
a Factory Level-50-Singles Frontier Brain (Noland) battle resolves — battles
21 and 42, the final battle of challenge indices 2 and 5
(`reference/pokeemerald/src/frontier_util.c:86-95`'s Factory row
`{21, 42, 21, 1}`) — that the staging-design session
(`docs/noland-brain-staging-design.md`) did not survey, because that
document's window stopped at battle resolution (party fill + AI mask, its
§2). This document picks up exactly where that one stops. Every claim below
cites `file:line`; every claim also states what the **engine**
(`src/engine/**`) currently does, distinguishing semantic state changes from
presentation-only text/audio. Docs-only: no code, schema, or oracle files
touched.

## 1. WIN against the brain (battle 21 / battle 42)

### 1a. Battle Points award

`GiveBattlePoints` (`frontier_util.c:1853-1910`, dispatched from the
`frontier_givepoints` special macro,
`asm/macros/battle_frontier/frontier_util.inc:82-85`) computes:

```c
challengeNum = gSaveBlock2Ptr->frontier.factoryWinStreaks[battleMode][lvlMode] / FRONTIER_STAGES_PER_CHALLENGE;  // /7, frontier_util.c:1876, battle_frontier.h:57
if (challengeNum != 0) challengeNum--;
if (challengeNum >= ARRAY_COUNT(sBattlePointAwards)) challengeNum = ARRAY_COUNT(sBattlePointAwards) - 1;  // 30 rows, frontier_util.c:500-592
points = sBattlePointAwards[challengeNum][facility][battleMode];
if (gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN)
    points += 10;                                     // frontier_util.c:1892-1893
gSaveBlock2Ptr->frontier.battlePoints += points;        // and mirrored into cardBattlePoints + daily BP, :1899-1906
```

This runs from the **Lobby**, after the win-streak has already been
incremented (§1c), not from a battle script — confirmed by tracing the
caller: `BattleFrontier_BattleFactoryLobby_EventScript_GiveBattlePoints`
(`data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:44-46`) calls
`frontier_givepoints` after the streak-increment step already ran in the
battle room. The table (`sBattlePointAwards`, `frontier_util.c:500-592`,
indexed `[challengeNum][facility][battleMode]`, facility order
TOWER/DOME/PALACE/ARENA/FACTORY/PIKE/PYRAMID per
`include/constants/battle_frontier.h:9-16`) gives, for FACTORY singles:

| challengeNum (post-win, 0-indexed) | table row | FACTORY singles value | + brain bonus | total BP |
| --- | --- | --- | --- | --- |
| 0 (ordinary 1st-challenge win, e.g. battle 7) | `{3,4}` (`:503`) | 3 | n/a (not brain) | **3** |
| 2 (silver Noland, battle 21) | `{4,5}` (`:509`) | 4 | +10 | **14** |
| 5 (gold Noland, battle 42) | `{5,6}` (`:515`) | 5 | +10 | **15** |

The "ordinary seventh-win award the engine pins at +2201/3 BP for L50" in
the step brief refers to `src/data/gen/factory-seventh-win-timeline-off.json:34`
(`"battlePoints": {"tick": 2201, "from": 0, "to": 3}`) — that fixture is the
*first-challenge* (challengeNum 0) ordinary win, 3 BP, matching row 0 above
exactly. **The brain round's award does differ**: it is not a flat/special
brain-only number, it is the *same table lookup an ordinary trainer at that
challengeNum would get* (4 or 5 BP, not 3 — because Noland's battles sit at
challengeNum 2/5, later than the 3-BP fixture's challengeNum 0), **plus a
flat +10 bonus** applied only when `gTrainerBattleOpponent_A ==
TRAINER_FRONTIER_BRAIN` (`:1892,1902-1905`, applied to both the visible
`battlePoints` total and the `cardBattlePoints`/daily-BP mirror
independently — two separate `+= 10` sites, not one). Cross-checked against
already-extracted engine data: `src/data/gen/factory-ending-policy.json`'s
`seventhWin.battlePoints.factorySinglesByAwardRow` = `[3,3,4,4,5,5,6,6,7,7,
8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15,15,15,15,15]` and `.brainBonus`
= `10` match this derivation exactly (row 2 = 4, row 5 = 5).

**Engine:** NOT PORTED. No `src/engine/**` module computes
`sBattlePointAwards` or the brain bonus. `factoryTerminalPresentation.ts:230`
(`battlePointAward: 3`) is a single fixed presentation-profile constant used
only for the one ordinary-first-win animation-timing fixture; it is not a
general award calculator and has no brain branch. The extracted data exists
(`factory-ending-policy.json`'s `battlePoints` object) but nothing consumes
it. This is not Noland-specific: BP/reward bookkeeping is out of scope for
the whole engine per the user decision recorded at `ROADMAP.md:965-972`
("symbol/BP/reward bookkeeping keeps its existing scope").

### 1b. Symbol grant (`GiveFacilitySymbol`)

Only reachable from the brain-specific win branches, never from the ordinary
`DefeatedOpponent` path. Silver win:
`data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:128-141`
(`EventScript_DefeatedNolandSilver`) — if `frontier_getsymbols` (special
wrapping `GetFacilitySymbolCount`, `frontier_util.c:1912-1916`) returns 0,
plays `MUS_OBTAIN_SYMBOL`, shows "The Knowledge Symbol was embossed..." text,
then calls `frontier_givesymbol`. Gold win: `:154-167`
(`EventScript_DefeatedNolandGold`), symmetric, gated on
`frontier_getsymbols != 2`.

`GiveFacilitySymbol` (`frontier_util.c:1918-1925`):

```c
if (GetPlayerSymbolCountForFacility(facility) == 0)
    FlagSet(FLAG_SYS_TOWER_SILVER + facility * 2);
else
    FlagSet(FLAG_SYS_TOWER_GOLD + facility * 2);
```

**Where the symbol count lives in save state:** it is **not** a SaveBlock2
counter field — it is two event flags. `GetPlayerSymbolCountForFacility`
(`:1847-1851`) is `FlagGet(FLAG_SYS_TOWER_SILVER + facility*2) +
FlagGet(FLAG_SYS_TOWER_GOLD + facility*2)`. For FACTORY (`facility = 4`,
`battle_frontier.h:13`): `FLAG_SYS_TOWER_SILVER = SYSTEM_FLAGS + 0x64`,
`FLAG_SYS_TOWER_GOLD = SYSTEM_FLAGS + 0x65`
(`include/constants/flags.h:1468-1469`) — Factory's own two flags are
`SYSTEM_FLAGS + 0x64 + 8` and `SYSTEM_FLAGS + 0x65 + 8`. The count is
derived (0/1/2), never stored as an integer.

**Engine:** NOT PORTED. `factorySymbolsCount`
(`src/engine/factoryRoundBattleOrchestrator.ts:196`) is a **read-only input**
consumed by `getFactoryFrontierBrainStatus`
(`src/engine/frontierBrainStatus.ts`, PROGRESS 1253/1254) to decide brain
eligibility; nothing in the engine increments it, sets a flag, or emits a
"symbol granted" output after a brain win.

### 1c. Win-streak increment and record handling

The brain win path (`EventScript_DefeatedNoland`,
`BattleFrontier_BattleFactoryBattleRoom/scripts.inc:178-191`) and the
ordinary win path (`EventScript_DefeatedOpponent`, `:92-111`) both mutate the
**same** underlying field
(`gSaveBlock2Ptr->frontier.factoryWinStreaks[battleMode][lvlMode]`,
confirmed via `GetBattleFactoryData`/`SetBattleFactoryData`,
`reference/pokeemerald/src/battle_factory.c:224-267`, case
`FACTORY_DATA_WIN_STREAK`), with the same rental-swap-count persistence
(`FACTORY_DATA_WIN_STREAK_SWAPS`, gated on `sPerformedRentalSwap`,
`battle_factory.c:259-265`) before it. Two literal mechanical differences,
both net-inconsequential on real hardware:

- The ordinary path calls the shared `BattleFrontier_EventScript_IncrementWinStreak`
  subroutine (`data/maps/BattleFrontier_BattleTowerBattleRoom/scripts.inc:187-189`
  — this map's file holds the shared "common" scripts other Frontier map
  scripts `call` into), which dispatches to `frontier_incrementstreak` →
  `IncrementWinStreak()` (`frontier_util.c:2111-2157`), whose
  `FRONTIER_FACILITY_FACTORY` case (`:2144-2147`) is
  `if (factoryWinStreaks[...] < MAX_STREAK) factoryWinStreaks[...]++;`. The
  brain path instead inlines the equivalent `factory_get
  FACTORY_DATA_WIN_STREAK` / manual `MAX_STREAK` check / `factory_set
  FACTORY_DATA_WIN_STREAK` sequence directly
  (`BattleFactoryBattleRoom/scripts.inc:184-187`) rather than calling the
  shared subroutine. Same field, same clamp, same net mutation — a different
  call path to an identical result, not a semantic divergence.
- The ordinary path persists the incremented `FRONTIER_DATA_BATTLE_NUM` via
  `frontier_set` before branching on it (`:100-108`, used by the pre-battle
  room's "Ready for Nth opponent" text on the next visit,
  `BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:83-89`). The brain
  path computes `battleNum + 1` into `VAR_RESULT`
  (`BattleFactoryBattleRoom/scripts.inc:188-189`) but never calls
  `frontier_set` to store it — it jumps straight to `WarpToLobbyWon`
  (`:190`) without the ordinary path's `switch`/`case 7` branch, because
  Noland is always exactly the 7th battle so there is nothing to branch on.
  This leaves `FRONTIER_DATA_BATTLE_NUM` unpersisted after a brain win; it
  is inconsequential because a completed challenge's next visit starts a
  fresh challenge (battle_num reset elsewhere), so nothing ever reads the
  stale value — but it is a literal script-level difference worth recording
  for anyone porting this flow byte-for-byte.

Record handling (`AskRecordBattle`) is identical for both: both routes
converge on `BattleFrontier_BattleFactoryLobby_EventScript_GiveBattlePoints`
→ ... → `EventScript_AskRecordBattle`
(`data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:44-58,73-81`), one
shared code path with no brain branch anywhere in the record-question logic.

**Engine:** NOT PORTED, not brain-specific. `factoryWinStreak`
(`factoryRoundBattleOrchestrator.ts` config field, e.g. `:187,530,593,1188`)
is a caller-supplied starting value; the round loop derives the in-round
effective streak as `config.factoryWinStreak + battleIndex` purely in
memory. No save-state persistence layer exists for **any** win, brain or
ordinary — the engine models one round's battle-by-battle mechanics given
the current streak as an input, not the meta-progression across rounds.

### 1d. Dialogue/flow differences in the post-win script path

All presentation-only, converging on identical state mutations:

- Battle-room intro/win text branches on `VAR_TEMP_F` (the cached
  `frontier_getbrainstatus` result) —
  `EventScript_BattleNoland`'s `switch` (`:113-121`) picks between
  "I'm Noland, the FACTORY HEAD" (first-ever encounter,
  `FRONTIER_DATA_HEARD_BRAIN_SPEECH`-gated) / "Harder look than last time"
  (second symbol) / no intro at all (STREAK/STREAK_LONG, jumps straight past
  the gate — see §3) before an identical `DoNolandBattle` →
  `DoSpecialTrainerBattle` call (`:169-176`) that ordinary trainers also use
  (`:74-86`).
- Win-flavor text differs ("Smart going! Let's see your FRONTIER PASS" vs
  "You're getting out of my league!") — cosmetic strings around the same
  `frontier_givesymbol`/tail-mutation calls.
- BGM: `HandleEndTurn_BattleWon` (`battle_main.c:4970-4981`) plays
  `MUS_VICTORY_GYM_LEADER` for the brain vs `MUS_VICTORY_TRAINER` otherwise
  — audio only, already noted by the staging design (§2.4) as out of scope.
- Lobby congratulations text: `EventScript_WonChallenge`
  (`data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:38-46`) is the
  **only** brain check in the entire Lobby script — `frontier_isbrain`
  (special wrapping `IsTrainerFrontierBrain`, `frontier_util.c:1839-1845`,
  itself just `gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN`) picks
  between "Congratulations! You've won seven straight..." and
  "Congratulations for defeating the FACTORY HEAD...", then **both**
  branches fall into the identical
  `EventScript_GiveBattlePoints`/`AwardBattlePoints`/`ExchangeMonsAndSave`/
  `AskRecordBattle` sequence (`:46-58`). No other Lobby logic distinguishes
  brain from ordinary.

**Engine:** NOT PORTED for the brain-specific text.
`factoryTerminalPresentation.ts:208` hardcodes only
`"Congratulations! You've won seven"` (the ordinary variant); the
`factoryHeadCongrats` string is present as extracted data
(`src/data/gen/factory-terminal-messages.json`) but has no consumer.
`BattleOpponent.frontierBrain` (PROGRESS 1254's typed marker) exists in
`factoryRoundBattleOrchestrator.ts` but nothing in
`factoryTerminalPresentation.ts`/`factoryTerminalRender.ts` reads it.

## 2. LOSS against the brain

**Identical to an ordinary loss**, confirmed at two levels:

- Battle-room: `EventScript_BattleNolandSilver`/`...Gold`'s
  `goto_if_eq VAR_RESULT, 1, Defeated...` / else `goto WarpToLobbyLost`
  (`BattleFactoryBattleRoom/scripts.inc:122-126,148-152`) is the exact same
  branch shape as the ordinary path's `switch VAR_RESULT; case 1,
  DefeatedOpponent` fallthrough to `WarpToLobbyLost` (`:86-90`).
  `WarpToLobbyLost` unconditionally sets
  `FRONTIER_DATA_CHALLENGE_STATUS = CHALLENGE_STATUS_LOST` (`:88-90`) with
  no brain check, then both routes converge on the identical
  `EventScript_WarpToLobby` (`:222-232`).
- Lobby: `EventScript_LostChallenge`
  (`data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:64-72`) contains
  **no** `frontier_isbrain` call anywhere in its body (the only
  `frontier_isbrain` site in the whole file is the WON branch, `:42`) —
  "Thank you for participating..." text, `frontier_checkairshow`,
  `LoadPlayerParty`, `FACTORY_DATA_WIN_STREAK_ACTIVE = FALSE`, `factory_save`,
  then the same `AskRecordBattle`/lobby-warp tail as a win. Streak reset
  itself is deferred: `winStreakActiveFlags` is cleared here, but the
  streak value is only zeroed lazily on the **next** challenge start if that
  flag is unset (`InitFactoryChallenge`, `battle_factory.c:204-212`) — again
  identical mechanics regardless of opponent.

**Engine:** whatever ordinary-loss handling exists in the engine today
already covers Brain losses correctly by construction, since the ROM makes
no distinction — NOT APPLICABLE (no Brain-specific behavior exists to port).

## 3. STREAK / STREAK-LONG cases (symbols already 2)

`GetFrontierBrainStatus`'s `symbolsCount == 2` branch
(`frontier_util.c:1677-1689`) returns `FRONTIER_BRAIN_STREAK` when
`winStreak == sFrontierBrainStreakAppearances[FACTORY][0]` (21, i.e. hitting
streak 21 *again* after a reset-and-reclimb) or `FRONTIER_BRAIN_STREAK_LONG`
when `winStreak == 42` or any further multiple-of-21 past 42
(`(winStreak - 42) % 21 == 0`).

`EventScript_BattleNoland`'s `switch VAR_TEMP_F` (`:113-121`) routes
`FRONTIER_BRAIN_STREAK` to `BattleNolandSilver` directly and
`FRONTIER_BRAIN_STREAK_LONG` to `BattleNolandGold` directly — both **skip**
the `FRONTIER_DATA_HEARD_BRAIN_SPEECH` intro-text gate (presentation only).
On win, `DefeatedNolandSilver`/`...Gold`'s symbol-grant guard
(`frontier_getsymbols != 0` / `!= 2`, `:129-130,155-156`) is now false for
STREAK (symbols already ≥1) / true-equal for STREAK_LONG (symbols already
`== 2`), so **the entire symbol-grant block (fanfare, "Knowledge Symbol..."
text, `frontier_givesymbol` call) is skipped** and control falls straight
into the shared `DefeatedNoland` tail (`:178`). **No symbol is given** in
either STREAK or STREAK_LONG — matches the step brief's expectation exactly.

**BP is unaffected by symbol count.** `GiveBattlePoints`'s brain-bonus check
(§1a) is purely `gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN`,
independent of `GetPlayerSymbolCountForFacility`. A STREAK win (hitting
streak 21 again) awards the same challengeNum-2 row (4) + 10 = **14 BP**
that the original silver win did; a STREAK_LONG win at streak `42 + 21k`
awards `sBattlePointAwards[min(29, challengeNum)][FACTORY][SINGLES] + 10`
for whatever (growing) challengeNum that streak represents. So: dialogue is
shorter (no intro), no symbol, BP is awarded exactly as any other brain win.

**Engine:** NOT PORTED (same gap as §1a/§1b — no BP/symbol computation
exists at all yet, so there is nothing STREAK-specific to have missed beyond
the general gap).

## 4. Continuation after battle 21 (silver Noland)

`GetFrontierBrainStatus` is a pure function of the *current* streak +
symbol count, recomputed fresh every time (no memoized "already fought this
challenge" state). After the silver win: `factoryWinStreaks[SINGLES][LVL50]
= 21` (§1c), symbols count `= 1` (silver flag set, gold flag unset, §1b).
The very next evaluation (at the pre-battle room before the next battle,
`frontier_getbrainstatus`,
`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:61,80-81` — confirmed
already in PROGRESS 1253 to run **before** `factory_generateopponentmons`)
computes `winStreak = 21 + sFrontierBrainStreakAppearances[FACTORY][3] (=1)
= 22`. With `symbolsCount == 1`, status only fires at
`winStreak == sFrontierBrainStreakAppearances[FACTORY][1] (= 42)`; `22 != 42`
→ `FRONTIER_BRAIN_NOT_READY`. So the challenge immediately following silver
(challenge index 3, battles 22-28) generates an **ordinary** opponent via
`factory_generateopponentmons`/`FillFactoryFrontierTrainerParty`'s non-brain
branch exactly like any other challenge — confirmed: no brain-specific
branch exists anywhere in the round-loop bookkeeping (rental-swap
mechanics, `curChallengeBattleNum` increments, `FRONTIER_DATA_BATTLE_NUM`
persistence for battles 1-6 of that challenge) other than the single
`frontier_getbrainstatus` gate itself. Three full ordinary challenges
(indices 3, 4, 5 — 21 more battles) pass before `winStreak` reaches 42 at
the last battle of challenge index 5 (gold Noland, battle 42). This matches
§2.2 of `docs/noland-brain-staging-design.md` ("the round loop... branches
to `generateFactoryBrainOpponent`... instead of the ordinary path when
eligible" and nowhere else) — no further audit surface found.

**Engine:** consistent with `frontierBrainStatus.ts`/
`factoryRoundBattleOrchestrator.ts`'s existing model (PROGRESS 1253/1254) —
the *scheduling* half of this (when to generate a brain party) is already
ported and tested; this section confirms there is no additional
round-loop-bookkeeping surface beyond what's already ported.

## 5. Engine-side gap list

| Semantic consequence (ROM citation) | Status | Seam |
| --- | --- | --- |
| BP award amount, incl. +10 brain bonus (`frontier_util.c:1853-1910`) | **NOT PORTED** | `factoryTerminalPresentation.ts`/`factoryTerminalRender.ts` (award/BP animation state machine has a hardcoded `battlePointAward: 3`, no table, no brain branch) |
| Symbol grant (`frontier_util.c:1918-1925`, `FLAG_SYS_TOWER_SILVER/GOLD`) | **NOT PORTED** | `factoryRoundBattleOrchestrator.ts` (`factorySymbolsCount` is read-only; round-completion path in `roundController.ts` emits no symbol output) |
| Win-streak persistence across rounds (`IncrementWinStreak`, `frontier_util.c:2111-2157`) | **NOT PORTED, not brain-specific** | `factoryRoundBattleOrchestrator.ts` (`config.factoryWinStreak` is caller-supplied per round; no save-state layer exists) |
| Brain-specific Lobby congrats text (`BattleFactoryLobby/scripts.inc:38-46`) | **NOT PORTED** (ordinary variant only) | `factoryTerminalPresentation.ts:208` / `factoryTerminalRender.ts` (congratulations-text selection has no `frontierBrain` branch, despite `BattleOpponent.frontierBrain` already existing as a marker) |
| Loss handling (§2) | **NOT APPLICABLE** | n/a — ROM makes no Brain/ordinary distinction, so whatever the engine's ordinary-loss handling is already covers this case |
| STREAK/STREAK_LONG no-symbol branch (§3) | **NOT APPLICABLE beyond the general BP/symbol gap** | same seams as the BP/symbol rows above — nothing STREAK-specific to separately port |
| `FRONTIER_DATA_BATTLE_NUM` non-persistence quirk after brain win (§1c) | **NOT APPLICABLE** | engine has no `FRONTIER_DATA_BATTLE_NUM`-equivalent persisted state at all |
| Party generation (`FillFactoryBrainParty`) | **PORTED** | `factoryBrainOpponentGeneration.ts` (PROGRESS 1252), reachable via round loop (PROGRESS 1253/1254), unreachable via `mechanicLab` staging pending `docs/noland-brain-staging-design.md` §5.1 |
| AI aggression mask (`GetAiScriptsInBattleFactory`) | **PORTED** | `factoryAiMaskSelection.ts`, same reachability caveat as above |

### Prioritized next-session worklist

1. **Step:** Port a pure `applyFactoryBrainRoundOutcome`-style function
   (given brain status + win/loss, returns `{battlePointsAwarded,
   symbolGranted, newSymbolsCount}`), mirroring `GiveBattlePoints` +
   `GiveFacilitySymbol` exactly, including the STREAK-case "no symbol"
   branch (§3) and the ordinary (non-brain) award table for parity.
   **Acceptance:** new `tests/factoryBrainRoundOutcome.test.ts` pinning
   silver (14 BP, symbol granted), gold (15 BP, symbol granted), streak
   (14 BP, no symbol), streak-long (row-derived BP, no symbol), and one
   ordinary first-win case (3 BP) against this doc's §1a/§3 table;
   `npm run test:smoke` green. **Dependency:** none — pure function, no
   round-controller wiring.
2. **Step:** Wire that function into `factoryRoundBattleOrchestrator.ts`'s
   round-completion path so `battlePointsAwarded`/an updated symbols count
   become round-controller **outputs**, not just brain-status inputs.
   **Acceptance:** extend the existing brain win-path assertions in
   `factoryBrainRoundShape.test.ts` (PROGRESS 1254) to also assert the new
   output fields for the silver/gold/negative cases already staged there;
   full `npm test` green. **Dependency:** step 1.
3. **Step:** Consume `factory-terminal-messages.json`'s `factoryHeadCongrats`
   string in `factoryTerminalPresentation.ts`/`factoryTerminalRender.ts`
   behind a `currentOpponent.frontierBrain`-aware branch (the marker already
   exists per PROGRESS 1254). **Acceptance:** new
   `tests/factoryTerminalPresentation.test.ts` case pinning the Brain-congrats
   byte sequence from `factory-terminal-messages.json`'s pre-expanded
   encoding; `npm run build` green. **Dependency:** none — presentation-only,
   can land independently of 1/2.
4. **Step:** Harness-side `factoryBrain` staging mode
   (`docs/noland-brain-staging-design.md` §5.1) — needed before any of the
   above can be end-to-end oracle-verified against real ROM save-state
   rather than pure-unit-pinned against hand-derived table values.
   **Acceptance:** n/a to this workspace session — user-gated, harness edits
   go through the user (`CLAUDE.md`); flag to the supervisor.
   **Dependency:** none, but blocks live differential verification of steps
   1-3's numbers.

## 6. Mid-battle semantic-site confirmation (independent of the staging design's §2)

The staging design (`docs/noland-brain-staging-design.md` §2) claims exactly
two mid-battle semantic sites gated on `gTrainerBattleOpponent_A ==
TRAINER_FRONTIER_BRAIN`: party fill (`FillFactoryBrainParty`) and AI
aggression mask (`GetAiScriptsInBattleFactory`). Independent re-grep this
session, over a wider surface than that document's own citation list:

```
grep -rn "TRAINER_FRONTIER_BRAIN\|gTrainerBattleOpponent_A ==" \
  reference/pokeemerald/src/battle_main.c reference/pokeemerald/src/battle_util.c \
  reference/pokeemerald/src/battle_util2.c reference/pokeemerald/src/battle_script_commands.c \
  reference/pokeemerald/src/battle_ai_script_commands.c reference/pokeemerald/src/battle_controller_opponent.c \
  reference/pokeemerald/src/battle_message.c
```

Results: `battle_main.c:4978` (BGM select, `HandleEndTurn_BattleWon` —
post-battle, presentation, already known), `battle_message.c:2530,2554`
(trainer-class/name text substitution, already known),
`battle_controller_opponent.c:1249,1333` (trainer-pic index, already known).
**Zero hits** in `battle_util.c`, `battle_util2.c`,
`battle_script_commands.c`. `battle_ai_script_commands.c` has only the
already-known AI-mask site.

**Disobedience checks:** `IsMonDisobedient` (`battle_util.c:3923-3960`)
checks `gBattleTypeFlags & BATTLE_TYPE_FRONTIER` (`:3938`, all seven
Frontier facilities alike, not Brain-specific) and only applies to "modern
fateful encounter" mons (Mew/Deoxys, `:3934`) — Factory rental mons are
never fateful-encounter mons, so this branch is not reachable for this
facility's mons at all, brain or ordinary. Not a semantic site.

**Battle-end money special:** `Cmd_getmoneyreward`/`GetTrainerMoneyToGive`
(`battle_script_commands.c:5578-5645`, indexes `gTrainers[trainerId]` —
notable because `TRAINER_FRONTIER_BRAIN = 1022` exceeds
`TRAINERS_COUNT = 855`, `include/constants/opponents.h:864`, which would be
an OOB read if ever reached with the Brain's id) is only called from
`BattleScript_LocalTrainerBattleWon`
(`reference/pokeemerald/data/battle_scripts_1.s:2919-2941`). Traced the
actual dispatch: `HandleEndTurn_BattleWon`
(`reference/pokeemerald/src/battle_main.c:4959-4977`) routes **every**
`BATTLE_TYPE_FRONTIER`-flagged battle (Factory included — `BATTLE_TYPE_FACTORY`
is one of the bits OR'd into the `BATTLE_TYPE_FRONTIER` mask,
`include/constants/battle.h:78,91`) to `BattleScript_FrontierTrainerBattleWon`
(`data/battle_scripts_1.s:3027-3047`) instead, which never calls
`getmoneyreward` at all (only `pickup`, itself gated to
`BATTLE_TYPE_PYRAMID` only, `:3044-3046`). So the Factory gives **no prize
money for any win**, brain or ordinary — `GetTrainerMoneyToGive(1022)` is
dead code for this facility; no live OOB read occurs, and this is not a
brain-specific finding (it's a Frontier-facility-wide absence of money
rewards). Same reasoning independently rules out the `gTrainers[
gTrainerBattleOpponent_A].items[i]`/`.aiFlags` reads in
`BattleAI_HandleItemUseBeforeAISetup`/`BattleAI_SetupAIData`
(`battle_ai_script_commands.c:282-301,373-376`): the item-read is gated by
`!(...|BATTLE_TYPE_FRONTIER|...)` (`:288`), false for Factory battles, so
never reached; the `aiFlags` read is only reached in the `else` branch after
the `BATTLE_TYPE_FACTORY`/`BATTLE_TYPE_FRONTIER` checks already dispatch
Factory battles to `GetAiScriptsInBattleFactory()` first (`:369-370`), so
`gTrainers[1022].aiFlags` is likewise never evaluated.

**Verdict: CONFIRMS the staging design's exactly-two-site claim.** No third
mid-battle semantic site was found across this session's independently
chosen grep surface (`battle_main.c`, `battle_util.c`, `battle_util2.c`,
`battle_script_commands.c`, `battle_ai_script_commands.c`,
`battle_controller_opponent.c`, `battle_message.c`) plus the disobedience
and money-reward code paths the step brief specifically asked to check.
