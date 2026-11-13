# lbr-b — the singles attendant conversation

Step lbr-b (handoff item 0b, step 2). Replaces "A at the singles attendant deals a draft at once" (nch231 / lbra) with the ROM
conversation. Scene ON and OFF alike (the Lobby has no battle scene); measured against the Battle Scene OFF oracle.

## Flow (`src/engine/factoryLobbyAttendant.ts`, drawn by `factoryLobbyAttendantRender.ts`)

A at the attendant (`isFactoryLobbyFacingSinglesAttendant`) sets `EngineState.lobbyAttendant` (`createFactoryLobbyAttendantState(frame)`);
the free-roam field stays rendered under it and the player no longer moves. `advanceFactoryLobbyAttendant` runs once per engine tick
(edge-triggered A/B, repeated UP/DOWN) and is a pure state machine; core.ts clears it on `done`.

1. `welcome` (3 pages: "Where the intelligence of TRAINERS / is put to the test!", "Welcome to the BATTLE FACTORY!", guide line) then
   `ask` "Would you like to take the Battle Swap Single challenge?" with the CHALLENGE / INFO / EXIT multichoice.
2. EXIT, or B anywhere in a menu: `farewell` "We look forward to your next visit.", A closes the box and returns to free roam
   (`done: "freeRoam"`; `lobbyFreeRoam` is kept, the lobby stays on the vblank RNG).
3. INFO: `explain`, 9 pages (the `\l` scroll pair and the `\p` page turns as the ROM prints them), the last page returns to `ask`.
4. CHALLENGE: `level` "Level 50 or Open Level?" with LV. 50 / OPEN LEVEL / EXIT. **Open Level is drawn but unselectable** (A on it is a
   no-op); see the scope note in `docs/factory-finish-scope.md`.
5. LV. 50: `saveQuestion` "Before you begin your challenge, I need to save the game. Is that okay?" YES/NO. NO / B: farewell.
6. YES: the save dialog (`saveInfo` with the BATTLE FRONTIER save-info window, `overwrite`, `saving` 259-tick auto hold, `saved`), NO / B at
   either YES/NO closes the window and gives the farewell. Then `step` "Please step this way.", the box closes, the attendant and the player
   walk 4 tiles north at 1 px/frame (64 frames), the screen fades out (37 frames) and the existing draft handoff runs
   (`enterChainedFactoryChallenge` with `carryForNewChallengeAfterLobby`).

RNG: every conversation frame is a normal Lobby frame, so the vblank cursor keeps advancing (`rngMode` stays `"vblank"`). The draft is
generated from the cursor of the tick that hands off, i.e. conversation length now moves the deal (lbra/nch231 pinned the cursor of the A
press). Soak / goalPlay / `play:random` seeds therefore deal differently from before this step.

## Timing (`ATTENDANT_TIMING`)

All constants were read off dense oracle captures (every frame 5140..7351 of the happy path, plus a window per branch), not from the
decomp's script ticks: box opens 5 frames after A; 1 glyph per frame; `\p` first glyph 3 frames after A; `\l` scroll holds the arrow 1 frame, then 4
ticks x 4 px, third-line glyph 8 frames after A; multichoice windows appear 4 (CHALLENGE / LEVEL) or 3 (YES/NO) frames after the last glyph; per-menu
clear / first-glyph delays; the LEVEL and YES/NO cursors move one frame after the press (CHALLENGE moves on the press frame); a YES/NO declined to the
farewell clears one frame later than any other choice; the save-info window opens 10 frames after YES.

## Consumers

Everything that presses A at the attendant taps A with release gaps (the engine reads edges): `tools/soak/randomRoundSoakDriver.ts`
(`pressAdvance(state, "lobby attendant A", false)` — no B, so the conversation is never cancelled) and `tools/browser/goalPlay.ts` `walkToAttendant`
(keeps pressing A while the player stands at the attendant, which now drives the whole conversation; the policy ignores `lobbyAttendant` frames).
Tests drive it with `tests/helpers/lobbyAttendant.ts`.

## ROM windows (`tools/compare/traces/lbrb-*.json`, base = the lbra-loss-off route to the Lobby)

`npm run compare -- lbrb-<name>-off --summary`; matched / captures:

| trace | window | result | residual frames |
|---|---|---|---|
| happy-a | 5140–5396 (A, welcome, menu open) | 256/256 | none |
| happy-b | 5440–5696 | 256/256 | none |
| happy-c | 5640–5896 | 256/256 | none |
| happy-d | 5845–6101 | 256/256 | none |
| happy-e | 6300–6556 (door walk, fade) | 256/256 | none |
| happy-f | 6540–6600 | 16/60 | 6556–6599 |
| exit | 5636–5892 | 145/256 | 5763–5809, 5828–5891 |
| bcancel | 5556–5812 | 147/256 | 5703–5811 |
| levelb | 5648–5900 | 133/252 | 5763–5809, 5828–5899 |
| levelexit | 5656–5912 | 207/256 | 5863–5911 |
| saveno | 5656–5912 | 247/256 | 5903–5911 |
| saveb | 5748–6000 | 205/252 | 5903–5949 |
| savedlgno | 5826–6082 | 177/256 | 6003–6081 |
| overwriteno | 5926–6150 | 177/224 | 6103–6149 |
| info1 / info2 / info3 | 5596–5852 / 5852–6108 / 6380–6636 | 256/256 each | none |

Named residuals:

* **NPC wander after release (all the exit-type branches).** The ROM freezes the field NPCs while the script runs and the wandering woman
  (bottom-left) and the fat man resume at once on release with RNG-driven turns/steps (bbox x 96–125 / 146–157 in the compare diffs: nothing
  else differs). The app has no wander model beyond the bounded `womanAtTick` schedule, so those two sprites differ after release. Pixels outside
  the NPC boxes are identical in every residual frame (checked by diff bbox).
* **happy-f 6556–6599.** The app hands off to the draft at ~6556 and shows the draft; the ROM shows the PreBattleRoom fade-in and its briefing
  (~6556–6970, skipped). Named divergence since nch231; the briefing is not modelled, the first-challenge PreBattleRoom still comes after the draft.
* **Save-info window name.** The oracle harness names the player "MEMORY"; the app prints `PLAYER_NAME` (identical pixels in the compares).
* The `saving` auto hold (259 ticks) is taken from the ROM captures; the SAVING… window itself is the existing save presentation.

## Not done here

lbr-c (library events), lbr-d, Open Level, audio, battle rules.
