# lbra: loss / forfeit / retire end in the walkable Lobby (lbr-a)

User decision 2026-11-12 (`docs/cax31-session-handoff.md` "Next work" item 0b, step 1). On the production route
(`appRoute === "generated-orchestrator"`) a LOSS, a FORFEIT and a RETIRE end as the ROM does: warp to the Lobby, play the Lobby OnFrame
`LostChallenge` result script, then free control in the walkable Lobby (`factoryLobbyFreeRoam.ts`). The loss -> new-draft chain
(`enterChainedFactoryChallenge` on terminal A) is gone for these three end types. The 7-win path is unchanged (lbr-d).

## ROM lines (re-checked)

- Lobby `scripts.inc` :65-75 `LostChallenge`: clear the win-streak-active flag, `factory_save 0`, SE_SAVE wait; text :370-375.
- :76-85 record question YES/NO, NO preselected; :77-78 `GetCantRecordBattle` TRUE jumps to `EndRecordBattle` (question skipped); :89-94 farewell.
- `battle_main.c:5058-5062`: `B_OUTCOME_FORFEITED` sets `frontier.disableRecordBattle`. So a forfeit never asks the record question.
- `InitFactoryChallenge` resets win streak and rents count; symbols and BP stay (`advanceFactoryCarry(..., false, ...)`).

## What changed

- `core.ts`: the loss carry (`advanceFactoryCarry` loss branch) is applied on Lobby entry (`state.lobbyFreeRoam` null -> set while a round outcome exists
  and the terminal is the loss terminal). The old terminal-decline chain now only runs for the round-won terminal.
- `factoryTerminalPresentation.ts` / `battleForfeit.ts` / `factoryTerminalRender.ts`: `recordDisabled` on the terminal state (forfeit sets it); with it
  the farewell edge is `restoreAge + recordDisabledFarewellEdgeFromRestore (166)` and the render shows the SE_SAVE-wait page until the box clear.
- Consumers: the soak driver, `goalPlay` and `play:random` walk to the attendant and press A after every loss (nch231 path, `newChallengeFromLobby`
  default true; `false` plays the Lobby idle). `FactorySession` is unchanged: `challenge-end loss` still fires on the `battle-end` frame
  (`roundLost`), `challenge-end retire` on the Lobby-entry frame; Tier-1 pins in `tests/lbra.test.ts`.
- RNG: the Lobby runs on the free-running per-VBlank RNG (nch231, `docs/nch231-new-challenge.md`), so A at the attendant seeds the next draft from the
  cursor the Lobby advanced. The removed chain used the orchestrator's end cursor, so the draft after a loss differs from the old chain. That is the ROM
  behaviour; nothing is kept for compatibility.

## ROM windows (`npm run compare -- <trace> --summary`, `oracleProfile` explicit)

| trace | scene | window | frames matched |
| --- | --- | --- | --- |
| `lbra-loss-off` | OFF | last battle frame -> free control (2996-5253) | **2258 / 2258** |
| `lbra-forfeit-off` | OFF | 150-1199 | **1050 / 1050** (lbw7) |
| `lbra-forfeit-on` | ON | 150-1199 | 805 / 1050 (lbw7; 764 before) |
| `lbra-retire-off` | OFF | 6640-8193 | **1554 / 1554** (lbw7) |

Residuals (all named; none is in the result-script text / box / cursor path except the retire typing pace):

- forfeit OFF and ON, frames 1087-1199: Lobby NPC turn / wander (bbox 96,100-157,134). The lab holds the player still after the farewell; the app's
  free-roam NPC schedule differs from the ROM's. Pre-existing Lobby free-roam item, not result-script.
- forfeit ON only: 155-284 the battle window (Scene ON forfeit lab was never pixel-parity; same as before lbra), 304-343 battle-room trainer sprite,
  362 one-frame transition frame.
- retire OFF: 7544-7627 record-text typing pace (pre-existing, byte-identical on the pre-lbra baseline worktree); the tail (to 8193) is the NPC
  turn / wander residual above.
- loss OFF: none.

## SE_SAVE (sound 55)

| window | ROM | app |
| --- | --- | --- |
| forfeit OFF | 895 | 895 (equal) |
| loss OFF | 4007 | not emitted |
| retire OFF | 7503 | not emitted |

The app emits SE_SAVE only on the forfeit path today; loss / retire emission and an extra Lobby A / DOWN SE_SELECT are audio-lane items (aud245
player is not wired to these). Also seen, not understood: `lbra-loss-off` cry events differ between this tree (species 67) and a pre-lbra worktree (239)
while the compare frames match; audio-only observation, not investigated.

## Not measured: ON loss / ON retire

No compare-ready Scene ON lab exists for loss or retire (the ON loss stages `aud241c-loss-on` are sound anchors only, and the OFF loss schedule derails
in ON). Measuring them needs a closed-loop ON lab (`romDecisionDriver`). The ON behaviour is covered by Tier-1 (`tests/lbra.test.ts`, both scenes)
and by the soak / play:random gates, not by ROM pixels. Follow-up candidate.

## Old-chain re-pins

Only tests that pinned the loss -> new-draft chain were re-pinned (each explained in its own commit `7b0806799`): `randomRoundSoak`,
`randomRoundSoakCoverage`, `goalPlay`, `soakLobbyNewChallenge`, `factoryLibrary` (idle Lobby so the digest covers every frame). The soak driver
keeps its OK semantics by walking back to the attendant and pressing A.

## What lbr-b / c / d need

- lbr-b (attendant conversation): replace A-deals-at-once at the singles attendant (`isFactoryLobbyFacingSinglesAttendant` + A in `core.ts`) with the
  ROM conversation; the soak driver / goalPlay already isolate "press A at the attendant" in one place (`newChallengeFromLobby`).
- lbr-c (challenge-request event): hang the hand-off off the attendant conversation's end; the library `challenge-end` event stays where it is.
- lbr-d (7-win Lobby return): the round-won terminal still uses the old chain; `isFactoryTerminalRoundWon(factoryTerminal)` is the switch in `core.ts`
  and `recordDisabledFarewellEdgeFromRestore` already exists on the round-won profile (166, copied, unmeasured for the won script). `WonChallenge`
  differs from `LostChallenge` (save with streak, symbol / BP); measure before reusing the loss edge.

## lbw7: forfeit tail, retire save wait, harness rebases (ISSUES #221)

Matched frames, `npm run compare -- <trace> --summary`, before (master `f047ca4f5`) -> after:

| trace | before | after |
| --- | --- | --- |
| `lbra-forfeit-off` | 1009 / 1050 | **1050 / 1050** |
| `lbra-forfeit-on` | 764 / 1050 | 805 / 1050 (the rest is the Scene ON battle window 155-284 and the NPC wander tail, unchanged) |
| `lbra-retire-off` | 1476 / 1554 | **1554 / 1554** |
| `retire-yes-lobby-freeroam-off` | 1325 / 1482 | **1482 / 1482** |
| `lbra-loss-off`, `loss-terminal-window-off`, `win-terminal-window-off` | 2258 / 2258, 1943 / 1943, 3590 / 3590 | same (kept by `appStage.opponentTrainerId`, below) |
| `lbrb-*` (17) | 0..60 matched, ten at 0 | ten exact (256 / 256 or 60 / 60); none worse (list in the lbw7 commit / step report) |

Causes, each from ROM measurement (no gameplay RNG, kernel event or battle outcome changed; census 0..99 both scenes `eventsDigest` identical vs `f047ca4f5`):

1. **Forfeit room drew the wrong opponent.** The post-battle room (`renderPostwinState`, phase `battleRoom`) always drew the generic Bug Catcher sheet; the ROM draws the battle's
   own trainer class (`factoryTrainerPresentationForOpponent(round.rules.currentOpponent)`, lab trainer 110 = Black Belt on frf250b). Frames 304-343.
   Harness side: the traces' staged orchestrator is created with `rngValue: 4` and draws another trainer than the lab's, so `appStage` gained the optional
   `opponentTrainerId` (`tools/compare/appTrace.ts` `applyTraceStage`, `traceTypes.ts`), set to the lab's `trainerId` on `lbra-forfeit-off` / `-on` (110) and
   `lbra-loss-off` / `loss-terminal-window-off` / `win-terminal-window-off` (50). Without it the engine change regressed those four (39 frames each).
2. **Forfeit black / room / black tail runs one tick ahead.** ROM: black 19 frames (not 20), room 56..94 of the post-battle age, the Lobby field one frame earlier (terminal age 114).
   `PostwinState.tailLead` (`FORFEIT_RETURN_TAIL_LEAD = 1`, set only by the forfeit hand-off; `postwinTailAge` applies it from the black phase on, so the fade stays on the WIN clock).
   Win / loss postwin phases are unchanged (`tests/factoryBattleReturnPresentation.test.ts`). Frames 343-362.
3. **Retire's `factory_save` waits 6 ticks longer than a loss's.** The retire hand-off runs the same `LostChallenge` script, but ROM SE_SAVE is at second-page release + 179
   (`lbra-retire-off` A 7324 -> 7503) vs + 173 on a loss (A 3834 -> 4007); the "event results" page clears 6 ticks later and the record question types from there.
   `FACTORY_RETIRE_TERMINAL_PROFILE` = loss profile with `statusClearDelayFromSecondRelease` 50 + `RETIRE_SAVE_EXTRA` 6 (swept 6 / 7 / 8 against the ROM: 6 is exact, 7 and 8 are not).
   **Why the save takes longer is not proven from source**: `factory_save` runs the same `SaveGameFrontier` in both scripts; the extra ticks look like flash-write time
   that depends on the saved data (mGBA models program / erase cycles). Treated as a measured retire constant.
4. **Harness: no `appRngRebase`.** `retire-yes-lobby-freeroam-off` has `lbra-retire-off`'s lab and inputs (identical 8194 buttons) and gets its rebase (6700 = 2155949550): its 8094-8172 NPC
   region (the whole 157-frame residual) was the wrong cursor, not a Lobby rule. The 17 `lbrb-*` traces share `lbra-loss-off`'s lab, stage and input prefix, so they take its rebase
   (3233 = 1298389302, the ROM cursor of that frame).

Tier-1: `tests/lbw7ForfeitReturn.test.ts` (tail boundaries, black / room frames, the room's opponent; red without the engine change), `tests/lbw7RetireSave.test.ts`
(the retire terminal restores 56 ticks after the second release, a loss's 50; red with the loss profile).

Open remainder (named): `lbrb-bcancel / exit / levelb / levelexit / overwriteno / saveb / savedlgno` still differ in 15-105 frames each, all in the Lobby NPC region
(bbox about 96,99-157,134, first diffs 5735-6135): the record-battle menu flows press A / B / DOWN in the free Lobby, and the app's NPC cursor leaves the ROM's after those
inputs (the cursor is rebased only once, at 3233). Not measured further here. Forfeit ON: the Scene ON battle window (155-284) was never pixel-parity.
