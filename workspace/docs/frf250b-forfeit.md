# frf250b: RUN -> YES forfeits the match

Handoff 4b(g) step 2. Step 1 (frf250a) added the BAG message and the forfeit prompt with NO / B.

## ROM

`B_ACTION_RUN` in a Factory trainer battle runs `BattleScript_AskIfWantsToForfeitMatch`. YES sets `B_OUTCOME_FORFEITED`
(`HandleEndTurn_RanFromBattle`) and `BattleScript_PrintPlayerForfeited` prints "<PLAYER> forfeited the match!" with a 64-frame
waitmessage; `HandleEndTurn_FinishBattle` then fades out and the Factory room script sends any non-win result to
`WarpToLobbyLost`. `HandleAction_Run` / `TryRunFromBattle` call no `Random()`, so the forfeit consumes no RNG.

## Measured (lab `tools/battle-lab/frf250b-run-yes-off.json`, Scene OFF, A on YES = app frame 151)

| app frame | event |
|---|---|
| 151 | SE_SELECT (A), question box closes |
| 161 | first glyph of the forfeit text |
| 249 | message done, battle over |
| 254 | BGM fade (speed 5), value 476 |
| 300 | `MUS_B_FACTORY` (lobby), value 469 |
| 326 | SE_EXIT |

Fixture: `tools/audio/fixtures/frf250b-run-yes-off-window.json`. Compare trace: `tools/compare/traces/frf250b-run-yes-off.json`
(Scene OFF: 250 / 250 captured frames identical).

## Design

- `battleCommandPresentation.ts`: new phase `forfeit-message` (A on YES with the cursor on YES). Constants
  `FORFEIT_MESSAGE_FIRST_GLYPH_AT = 10`, `FORFEIT_MESSAGE_END_AT = 98`. The player sprite bounce is frozen in the phase.
- `battleForfeit.ts`: when the phase is done, `factoryRoundBattleOrchestrator` calls `finishBattle` with a synthesized terminal
  boundary (`outcome: "trainer-win"`, which is how the engine labels a loss; there is no separate "forfeited" kernel outcome).
  `roundLost` and the Lobby return are then the normal lost-battle path. `core.ts` builds the frozen scene and return hold.
- The decision is only the A key press in the input stream, so `replayChallenge` / `FactorySession.replayStep` replay it with no
  hidden state. No kernel RNG is touched; existing trace and soak digests are unchanged.
- Sounds: `emitForfeitEndSounds` in `battleEndSounds.ts` (fade, lobby BGM, SE_EXIT at +5 / +51 / +77 frames after the end).
- Soak driver: unchanged for every policy (still answers B). `forfeitRate` is an opt-in field used by the tests only, so the soak
  trajectories stay as they were.

## Known gap: Scene ON

Rules, text timing and the lobby return match in Scene ON (library tests cover both scenes). Cosmetic differences remain: the
healthbox bounce step near frame 155 (the ROM steps, the app is frozen) leaves a persistent healthbox offset, and the opponent
sprite region differs during the fade (frames 249-284). No ON compare trace is committed.
