<!-- Read-only worker report (lbr-d scout, 2026-11-13, Sonnet 5.5, ~5 min). Saved verbatim by the supervisor; the next run's lbr-d briefs start here. Not re-verified line by line: re-check each citation before building on it. -->

# lbr-d scout: 7 wins return to the Lobby in the same mount

## 1. ROM flow after the 7th win (re-checked in the decomp)

Paths below are under `reference/pokeemerald/data/maps/`. `BattleRoom` means `BattleFrontier_BattleFactoryBattleRoom/scripts.inc` and `Lobby` means `BattleFrontier_BattleFactoryLobby/scripts.inc`.

- **Win into warp (BattleRoom).** The path runs `DefeatedOpponent` :92 → `IncrementWinStreak` → `IncrementBattleNum` :100-106. The battle number is incremented, and `case 7` goes to `WarpToLobbyWon` :108-110, which sets `CHALLENGE_STATUS_WON` and runs `goto WarpToLobby`. `WarpToLobby` is :222-227 and warps to Lobby (4,8), or (14,8) for doubles.
- **Brain path.** A Noland win goes through `DefeatedNoland` :172-184, which also bumps the streak and rents count, then reaches `WarpToLobbyWon`.
- **Won script (Lobby).** The `OnFrame` table is :17-24. `WonChallenge` is :40-46.
  - `frontier_isbrain` TRUE jumps to `DefeatedFactoryHead` :48-50, which uses `Text_CongratsForDefeatingHead` (:447-450, three lines with `\l`).
  - Otherwise it shows `Text_CongratsSevenWins` (:382-384).
- **BP award.** `GiveBattlePoints` :51-54 runs "In recognition of your wealth of knowledge and keen intelligence, we award you these Battle Point(s)." (:452-455). It then runs `frontier_givepoints`, then `msgbox ObtainedXBattlePoints` with `MSGBOX_GETPOINTS`, which is the fanfare and the "{PLAYER} obtained N Battle Point(s)." text.
- **BP amount.** `frontier_util.c:1853-1910`. For Factory singles Lv50, `challengeNum = factoryWinStreaks/7`, minus 1 unless 0, clamped to the table. The table is `sBattlePointAwards` (:500-).
  - First 7 wins: streak 7 → row 0 → **3 BP**. Rows 0-1 give 3, rows 2-3 give 4, rows 4-5 give 5.
  - Brain adds +10, so Noland silver at streak 21 is 4+10 = **14**.
- **Exchange, save, record, farewell (:55-94).**
  - :55-56 shows `Text_ExchangeMonsAndSave` (:457-461).
  - :57 is `frontier_checkairshow`. It is a silent TV-show check with no dialogue.
  - :58 is `LoadPlayerParty`, :59 is `factory_save 0`, and :60-61 is SE_SAVE plus `waitse`.
  - :62 goes to `AskRecordBattle` :76-85. If `GetCantRecordBattle` is TRUE (:77-78), the question is skipped. Otherwise it asks `Text_RecordLastMatch` with YES/NO, NO preselected.
  - YES runs `RecordBattle` :87-88 with the "…battle was recorded" box. Every answer reaches `EndRecordBattle` :89-94: farewell "We look forward to your next visit.", `closemessage`, `VAR_TEMP_CHALLENGE_STATUS=255`, `releaseall`.
- **Difference from `LostChallenge` (:65-75).** The won script never runs `factory_set FACTORY_DATA_WIN_STREAK_ACTIVE, FALSE`. That is the whole "streak kept" mechanism.
- **Streak flag kept (`battle_factory.c:208-212`).** `InitFactoryChallenge` zeroes `factoryWinStreaks` and `factoryRentsCount` only when the active flag is off. After a win the flag is still set, so both persist.
- **Does the next challenge skip any dialogue lbr-b models? No.** The attendant script (Lobby :108-199) has no streak branching. The welcome, CHALLENGE/INFO/EXIT, level menu, save question and save dialog all run unchanged. `SaveBeforeChallenge` :151-163 calls `factory_init` (keeps the streak) and sets the active flag TRUE again, then the save dialog and "Please step this way." (:167-179, door walk, warp). The lbr-b state machine applies as is.
- **Not covered by lbr-b.** The PreBattleRoom briefing after the warp is still skipped (the known nch231 divergence).

## 2. What the engine does today, and the smallest change list

**Today**
- The 7th win produces a `roundCompleted` command. `createFactoryTerminalPresentation` (`factoryTerminalPresentation.ts:473-481`) builds a round-won terminal.
- That terminal already models the whole won script (profile :221-315):
  - the congratulations text and the Brain variant;
  - the award text, the BP mutation, and the 312-tick fanfare;
  - the exchange text, the party restore, and the record prompt;
  - YES/NO/B, the "recorded" message, and the farewell with box-gone age.
- `core.ts:1327-1348` then chains straight into a fresh draft on the first non-null `recordChoice`.
  - That happens before the YES "recorded" message and before the farewell.
  - It seeds from the orchestrator's end cursor `round.rules.rngValue`, with `advanceFactoryCarry(…, true, …)`.
- `postwin.ts` has no 7-win flow. The "next prompt" menus only exist for battles 1-6. Only the name constants there are involved.
- After a loss, lbra already routes the terminal through the farewell, `factoryTerminalDeclineBoxGoneAge`, and the Lobby free-roam spawn (`core.ts:1350-1381`), and applies a loss carry on Lobby entry. Won has no such branch.

**Smallest change list**
1. **`core.ts` chain removal.** Delete the won-terminal chain block (:1327-1348). The terminal then plays its already-modelled record, farewell and box-gone, and the existing `lobbyFreeRoam` creation (:1355-1359) hands over the walkable Lobby.
2. **`core.ts` carry on Lobby entry.** In the `lossCarry` expression (:1360-1373), drop `!isFactoryTerminalRoundWon` and pass `isFactoryTerminalRoundWon(factoryTerminal)` as `roundWon` to `advanceFactoryCarry`. A win then banks streak +7, symbols, BP and rents once, at Lobby entry. Rename the variable.
3. **Streak-kept flag.** Hand-off currently always calls `carryForNewChallengeAfterLobby`, which zeroes streak and rents (:1241-1245).
   - Retire has no round outcome, so it still needs that zeroing.
   - A carry-value test is not enough: a retire after an earlier win would also carry 7.
   - Add a boolean on `EngineState` (e.g. `lobbyStreakKept`), set at won Lobby entry and cleared in `enterChainedFactoryChallenge` and `createInitialState`. At hand-off, use `factoryCarry` as is when the flag is set.
   - Rents do carry, as in the ROM.
4. **BP amount.** `battlePointAward: 3` (:314) and the text "obtained 3" (:301) are hard-coded in the profile.
   - A first win is correct, and a challenge-2 win also gives 3 (rows 0-1).
   - The Brain win at streak 21 would wrongly show 3 instead of 14.
   - The challenge-3-and-later case existed before too (the chain also reached it).
   - Parametrise the won terminal from `roundOutcome.battlePointsAwarded`. Set it in `createFactoryTerminalRoundWonPresentation` (:438) and use carry BP as `battlePointsBeforeAward` (today it is 0). Make `profile.getPoints` per state, and update the callers in `core.ts` :1117, :1147, :4170 as needed.
5. **`factorySession.ts` guard (important).** `step()` emits `challenge-end retire` on any Lobby entry while `ended === null` (:259-262). After the change the post-win Lobby entry would falsely fire it.
   - Add a flag set at `round-end` that swallows exactly the next Lobby entry (`prevLobby` false→true), then clears.
   - A later retire in the continued challenge must still fire.
   - `ended` stays null, so there is no hold and no `challenge-request` after a win.
6. **Soak driver** (`tools/soak/randomRoundSoakDriver.ts`).
   - The default path walks to the attendant and mashes A (:1722-1727), which now covers wins automatically.
   - `newChallengeFromLobby:false` ends the run OK at the first Lobby entry (:3177-3178). `stopAtFirstRoundDecision` returns OK at Lobby entry (:3160).
   - Decide whether the won-Lobby crossing should count in `lobbyNewChallenges` (:3179-3183). I recommend yes, with a note.

I expect no changes to `postwin.ts`, `factoryTerminalRender.ts`, or the attendant state machine, apart from `Lobby.timeline` budgets.

## 3. Library contract, today vs after

| event | today | after lbr-d |
| --- | --- | --- |
| `round-end` | on the phase change to `roundComplete` (`factorySession.ts:244`), `ended` stays null | **same frame, unchanged** |
| `challenge-end loss` | at `roundLost`, with `battle-end` | unchanged |
| `challenge-end retire` | on first Lobby entry while `ended===null` | unchanged, but the new guard prevents a false one on the post-win Lobby |
| `challenge-request` | only when `ended!==null` and the save dialog started (:263) | **never on a won round**: `ended` is null, so no event and no hold. The attendant door walk hands off in-game (`core.ts:1239-1246`) |

- **What the trace and anti-cheat see.** The trace is the input runs. It continues through the terminal, the Lobby, the attendant conversation, the new draft and challenge 2's battles.
  - `battle-end` streak is `orchestrator.config.factoryWinStreak + index (+1)`, with the carry now 7 and so on, as the chain gave. A later `round-end` or loss reads the same way.
  - Mac and server must tolerate roughly 6,000 or more non-battle frames between `round-end` and the next `battle-end` (terminal about 4,600, plus about 1,500 attendant).
  - The 600-frame run cap already handles that.
  - The next draft's deal changes: it now comes from the Lobby vblank cursor of the hand-off tick, not the orchestrator end cursor. That is ROM-faithful, and the replay is deterministic from the trace.
  - ENGINE_BUILD moves.
- **Doc edits needed.** `docs/library-package.md:52` and `docs/lbrc-challenge-request.md` (the "one mount is one challenge" wording). State that after `round-end` the game continues in the Lobby, with no host action.

## 4. ROM windows and test consumers

**ROM evidence**
- No compare trace in `tools/compare/traces` reaches a 7-win end through the Lobby. `win-terminal-window-off` is a battle-1 win, not the terminal.
- The won terminal was measured by staged RAM probes, not by a real 7-win play:
  - `tools/probe/stage-factory-seventh-win-ending-off.py`;
  - `stage-factory-brain-silver-terminal-off.py`;
  - the `bisect-factory-brain-congrats-gates-off.py` bisect;
  - `docs/factory-seventh-win-ending-off-probe.md`;
  - `docs/brain-terminal-live-verification.md`.
- Their fixture is `tests/fixtures/data/factory-seventh-win-timeline-off.json` (BP at tick 2201, restore at 3549, menu draw at 4422).
- That window stops at the record menu. The won farewell constants (`declineTextClearDelay`, `recordDisabledFarewellEdgeFromRestore` 166, YES-record message) are copied from the loss profile and unmeasured for the won script, as `lbra-lobby-return.md:76-78` warns.
- The existing replay ledger and `tools/compare/traces` have no Scene ON window for the won terminal.

**Windows needed**
- **OFF, new:** extend the staged probe through record NO and YES, the farewell and free control, then the A-press attendant conversation and door walk.
  - It needs the streak-kept state (`factory_set ACTIVE` TRUE, `curChallengeBattleNum` 7).
  - Compare against the app with `appStage` plus a staged `oracleBattleLab`, as `lbra-*` does.
  - Expected frames match the lbr-b `happy-*` windows after the Lobby entry.
- **ON:** the Lobby has no scene, so ON equals OFF from the box open onward. The 7-win battle-to-terminal transition is the only ON difference, and it is already shared with the loss. State that, and add Tier-1 tests for both scenes, as lbra did.
- **Brain variant:** use the existing brain bisect probe for the congratulations text only.

**Tests and consumers that assume the chained new draft after 7 wins (grep)**
- `tests/factoryRoundChaining.test.ts`: the `driveTerminalToNextDraft` helper (:165) is used by (a), (b), (c) and (d).
  - It works only because A-mashing the Lobby runs the lbr-b conversation, within 3000 ticks.
  - (a) asserts `pendingGeneratedRound.rngValueBefore === round1.round.rules.rngValue` (:268-). That breaks.
  - (b) chains 4 wins deep with seeds taken from `pendingGeneratedRound.rngValueBefore`, so its trajectories move. Re-pin by driving `advanceFactoryCarry` plus the orchestrator end cursor directly, and keep one tick-level test.
  - The 3000-tick budget may also be too small for terminal plus conversation. Raise it.
- `tests/randomRoundSoak.test.ts:206/673`: same helper, `maxTicks 3000`.
- `tests/factoryTerminalRecordIssue104.test.ts:349-371`: "YES / B re-chains into a fresh generated draft" with `driveTerminalAnswering` (:314). It breaks, because YES now shows the "recorded" message, then the farewell, then the Lobby. Re-pin to "ends in free-roam Lobby, no pendingGeneratedRound".
- `tests/factoryLibrary.test.ts`: the `round-end` comment at :124 and the `lobbyFreeRoam` guard tests. Add a pinned won-round event sequence.
- `tests/soakLobbyNewChallenge`, `randomRoundSoakCoverage(.Fight/.Draft)`, `goalPlay`, `parityMacBrainReplaySeam`: grep these for `winning` and chain depth before re-pinning.
- Frame budgets: `resolveMaxFrames("winning")` (> 693,051) in `randomRoundSoak.test.ts` is probably fine, but check it.
- `tests/newChallengeFromLobby.test.ts` hand-builds a Lobby state and expects carry zeroing. It stays valid because the flag defaults off.
- Dev-shell and `play:random` consumers: no change needed.

I ran `tests/factoryRoundChaining.test.ts` and `tests/factoryTerminalRecordIssue104.test.ts`, and all 13 tests pass today.

## 5. Step plan (two worker steps)

**lbr-d1: engine and session change plus Tier-1 and re-pins.** Items 1-6 of section 2 (chain removal, carry on Lobby entry, the streak-kept flag, parametrised BP text, the session retire-guard, the soak driver). Then:
- Add `tests/lbrd.test.ts`, pinning both scenes:
  - the 7-win terminal reaches the farewell and the free-roam Lobby;
  - the carry is streak 7, rents kept, BP correct, with 14 BP for a Brain win;
  - the attendant hand-off keeps the streak and the next `battle-end` streak is 8;
  - the event sequence is `round-end` and no `challenge-end` or `challenge-request`;
  - a retire after the continuation still emits `challenge-end retire`, and a challenge-2 loss still fires `challenge-end loss`.
- Re-pin the tests listed in section 4.
- Update `docs/lbrd-win-lobby-return.md`, `docs/library-package.md:52`, the lbr-c doc wording, and the handoff.
- Name the new ENGINE_BUILD in PROGRESS.
- Acceptance:
  - `npm run test:smoke`;
  - `npx vitest run tests/lbrd.test.ts tests/lbra.test.ts tests/lbrc.test.ts tests/factoryRoundChaining.test.ts tests/factoryTerminalRecordIssue104.test.ts tests/factoryLibrary.test.ts tests/newChallengeFromLobby.test.ts tests/goalPlay.test.ts tests/soakLobbyNewChallenge.test.ts tests/randomRoundSoak.test.ts`;
  - then full `npm test`, `npm run build` and `npm run build:lib`, with soaks unchanged where they do not reach a win.

**lbr-d2: ROM windows (evidence-only, ideally first or in parallel).** Extend the staged seventh-win OFF probe through record NO/YES, farewell and free control, then the attendant conversation, with the streak kept. Add compare traces `lbrd-won-*-off` and fix the won farewell constants if they differ. A Scene ON Tier-1 stands in for ON ROM pixels. Acceptance: `npm run compare -- lbrd-<name>-off --summary` shows all frames matched, apart from the known NPC wander and typing-pace residuals named in lbra/lbrb. Keep the lbrb `happy-*` tests green, plus `tests/factoryTerminalPresentation.test.ts` and `tests/factoryLobbyTerminal.test.ts`.

**Risks to flag**
- The won farewell constants are unmeasured, so lbr-d2 may force re-pins that d1 hands over.
- The soak and replay frame budgets grow by about 1,500 frames per win.
- The Mac must be told the new contract: after `round-end` the game keeps running in the Lobby and no hold or `challenge-request` happens.

I found no blocker and nothing mis-scoped.
