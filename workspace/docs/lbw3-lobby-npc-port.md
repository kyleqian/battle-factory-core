# lbw3 -- the Lobby NPC wander port (ISSUES #221 E4)

The Battle Factory Lobby's woman (`MOVEMENT_TYPE_WANDER_AROUND`) and fat man (`MOVEMENT_TYPE_LOOK_AROUND`) draw `Random()` from the same
stream as the per-frame VBlank draw. They are now run by the engine, so the Lobby `rngValue` is the ROM's `gRngValue` and the NPCs are
drawn from their own state. Evidence and the simulator they were calibrated on: `docs/lbw1-lobby-wander-evidence.md`.

## Design

- `src/engine/lobbyNpcs.ts` (pure): `createLobbyNpcs` (map-load state: woman grid (10,18), fat man (13,17), range 1, facing S, Step 0),
  `stepLobbyNpcs(npcs, rng, frozen, world)` (woman then fat man, each `while (callback())`, after the tick's VBlank draw), `lobbyNpcDraw`.
  Grid = map tile + 7. `frozen` = the ROM's `lockall`: no callbacks, no draws, state kept. The drawn sprite is the previous tick's state
  (the OAM lags the callbacks by one tick).
- `src/engine/lobbyNpcDriver.ts`: the Lobby map as the NPCs see it (collision from `factory-lobby-terminal-layout.json`, elevation 0,
  objects = the player's current + previous tile and the four static object events' tiles) and the freeze timeline.
- `core.ts`: `EngineState.lobbyNpcs` (null until the first Lobby tick; reset to null by `enterPrebattleEntry`, so every Lobby entry
  re-seeds from map load like the ROM). Renderer: `factoryTerminalRender.ts` takes the NPC state; `womanAtTick` is gone (the old table
  lives on only as the oracle in `tests/factoryLobbyFreeRoam.test.ts`). The fat man's S / N / W stand poses are extracted (E = W flipped).

## Freeze timeline (engine state, no absolute tick)

Ticks since the Lobby entry (`t`, the map load): frozen for `t < 11` (map not running), **unfrozen only at `t = 34` and `t = 35`**
(`LOBBY_NPC_SCRIPT_UNFROZEN_TICKS`: the gap between two script locks), frozen otherwise until the final `releaseall`, then running.
Derivation of `t` and of the release, per path (all in the Lobby terminal branch of `tickEngineState`):

- won terminal with postwin (7-win): `elapsed - (recordDisabled ? 104 : 105) + 3`; staged won terminal: `factoryTerminal.age`;
  loss / forfeit / retire hand-off terminal: `age - (FACTORY_LOSS_TERMINAL_PROFILE.fieldFirstAge - LOBBY_FADE_IN_AFTER_ENTRY)`.
- Release = the tick before the engine first creates `lobbyFreeRoam` (`age >= freeRoamBoxGoneAge - 1`). The ROM's first unfrozen frame
  is one tick before the app's first free-roam tick; one tick late was measured (delay 94 vs 93).
- The A-press that starts the attendant talk is frozen, and so is every attendant-conversation tick (the script holds `lockall`).
  Plain free roam runs unfrozen.

## Result

- Tier-1 replay (`tests/lbw3LobbyNpcs.test.ts`, fixtures `tests/fixtures/lbw3/*.json.gz`, generator `tools/probe/lbw3-make-fixture.py`):
  every frame's tiles, facing, `sTypeFuncId`, delay, anim index and the full 32-bit cursor, on lbra-loss / forfeit / retire-off and
  lbrd-won-no / won-yes / won-attendant-off.
- Engine route (`tools/probe/lbw3-engine-npcs.ts` + `lbw3-engine-compare.py`): with `appRngRebase` on the six traces the app cursor equals the
  ROM `gRngValue` on every frame from the rebase to the end, max |offset| 0; NPC state identical on all of those frames.
- `npm run compare`, before -> after: loss-beyond-boundary 183/183 -> 183/183, loss-lobby-walk 177/177 -> 177/177, lbra-loss-off 2258/2258 ->
  2258/2258, forfeit 1087-1199 0/113 -> 109/113, retire-off 1315/1554 -> 1476/1554, won-no 9580-9633 0/54 -> 54/54, won-yes 9660-9713 0/54 ->
  54/54, won-attendant 9580-9596 0/17 -> 17/17, 10195-10200 0/6 -> 6/6, 10895-10938 0/44 -> 44/44. The two loss fixtures needed an
  `appRngRebase` (3233 / 1298389302) once the app cursor had to be ROM-exact.
- Residuals, none NPC: forfeit 1126-1129 (4 frames, the player sprite at 113,78-126,87); retire-off 7544-7627 (78 frames, the dialog text
  printer runs ahead of the ROM's: "Would you like t" vs "Would you").

## Unproven / by shared rule

- **Not measured on the ROM:** the player standing inside the woman's range or in her way (the collision follows `GetCollisionAtCoords`,
  and the replay traces only have the player at the counter / door); the other collision inputs (directional-impassable metatile
  behaviours, `ObjectEventIsTrainerAndCloseToPlayer`, `TryGetTrainerEncounterDirection` for the fat man) are inert here; elevation is
  always 0.
- **Entry paths:** loss, forfeit, retire, 7-win no / yes / attendant are measured (the six traces). Retire after a won battle (hand-off to the
  loss terminal), the staged terminals the tests inject and the attendant return use the same rule (`t` from the terminal's own clock);
  their ROM behaviour is unmeasured. The new-challenge Lobby return after `start: "after-save"` re-seeds like any entry.
- **Still static:** the player-vs-NPC collision in free roam uses the hard-coded `LOBBY_NPC_CELLS` (spawn tiles), and the depth sort uses
  the spawn tiles: a walking woman is not an obstacle for the player and does not re-sort. Out of scope here.
- Moved pins (deliberate, all Lobby new-challenge deals): `tests/lbrd.test.ts` `WIN_TWO_SEED` 35 -> 13; `tests/randomRoundSoak.test.ts`
  ISSUES #89 Baton Pass seed 1 -> 0. `tests/factoryLobbyTerminal.test.ts`: fat man frames 1 -> 3.
