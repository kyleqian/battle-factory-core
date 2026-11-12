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
| `lbra-forfeit-off` | OFF | 150-1199 | 896 / 1050 |
| `lbra-forfeit-on` | ON | 150-1199 | 766 / 1050 |
| `lbra-retire-off` | OFF | 6640-8193 | 1315 / 1554 |

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

Only tests that pinned the loss -> new-draft chain were re-pinned (each explained in its own commit `465564c5f`): `randomRoundSoak`,
`randomRoundSoakCoverage`, `goalPlay`, `soakLobbyNewChallenge`, `factoryLibrary` (idle Lobby so the digest covers every frame). The soak driver
keeps its OK semantics by walking back to the attendant and pressing A.

## What lbr-b / c / d need

- lbr-b (attendant conversation): replace A-deals-at-once at the singles attendant (`isFactoryLobbyFacingSinglesAttendant` + A in `core.ts`) with the
  ROM conversation; the soak driver / goalPlay already isolate "press A at the attendant" in one place (`newChallengeFromLobby`).
- lbr-c (challenge-request event): hang the hand-off off the attendant conversation's end; the library `challenge-end` event stays where it is.
- lbr-d (7-win Lobby return): the round-won terminal still uses the old chain; `isFactoryTerminalRoundWon(factoryTerminal)` is the switch in `core.ts`
  and `recordDisabledFarewellEdgeFromRestore` already exists on the round-won profile (166, copied, unmeasured for the won script). `WonChallenge`
  differs from `LostChallenge` (save with streak, symbol / BP); measure before reusing the loss edge.
