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

- **Measured since (lbw4, below):** the player in the woman's way. **Not measured on the ROM:** the other collision inputs (directional-impassable metatile
  behaviours, `ObjectEventIsTrainerAndCloseToPlayer`, `TryGetTrainerEncounterDirection` for the fat man) are inert here; elevation is
  always 0.
- **Entry paths:** loss, forfeit, retire, 7-win no / yes / attendant are measured (the six traces). Retire after a won battle (hand-off to the
  loss terminal), the staged terminals the tests inject and the attendant return use the same rule (`t` from the terminal's own clock);
  their ROM behaviour is unmeasured. The new-challenge Lobby return after `start: "after-save"` re-seeds like any entry.
- Moved pins (deliberate, all Lobby new-challenge deals): `tests/lbrd.test.ts` `WIN_TWO_SEED` 35 -> 13; `tests/randomRoundSoak.test.ts`
  ISSUES #89 Baton Pass seed 1 -> 0. `tests/factoryLobbyTerminal.test.ts`: fat man frames 1 -> 3.

## lbw4 -- the player <-> Lobby NPC interaction (free roam)

Trace `tools/compare/traces/lbw4-woman-block-off.json` (Battle Scene OFF, lbra-loss-off's route + `appRngRebase`, DOWN held 5761..5875, capture
5700..6200); ROM dump `tools/probe/lbw1-lobby-wander-rom.py` (player events also carry `anim` and `sx` / `sy`). The player walks into the woman's ring
(grid x 9..11, y 17..18) and is blocked by her tile and by her previous tile, and she is blocked by the player's current / previous tile.

- **Frame order (source):** CB1 `DoCB1_Overworld` runs the player's step / collision check first and sees the NPC state at the END of the previous frame;
  then `AnimateSprites` runs the object-event callbacks in slot order (player slot 0 before the woman, slot 2), so the woman sees the player's
  already-updated current / previous tile. Engine ticks: continuation steps decide at T = ROM frame R against the live NPC state; a buffered press
  or a turn commit starts at T = R + 1 against the renderer's lagged state (`shownWoman` / `shownFatMan`, end of T-2).
- **Collision (`factoryLobbyFreeRoam.ts`):** `isFactoryLobbyCellWalkable` rejects a wanderer's current OR previous tile (`DoesObjectCollideWithObjectAt`);
  the static NPCs (attendants, camper, picnicker) stay in `LOBBY_STATIC_NPC_CELLS`. `lobbyFreeRoamRomObject` is the player's ROM object for the
  woman's step: moving (rem >= 2) cur = destination, prv = origin; the last step frame cur = prv = destination; at rest cur = prv, except a
  pending press / turn commit with a free target is already moving.
- **Bump (`TryInterruptObjectEventSpecialAnim`):** while the walk-in-place-slow bump runs, a held SAME direction with a clear static target clears
  the bump and starts the step in that frame (a wall never does; a released direction keeps the bump). The bump pose follows the GO anim
  command index (2, 3, 0, 1 per 16-frame cycle = walk-2, stand, walk-1, stand; the rendered pose lags the index by a frame), and the step after the
  interrupt starts at that index run through `SetStepAnimHandleAlternation` (1 -> 2, 3 -> 0). An idle same-direction press starts its step one
  tick earlier than before (`pressStart`, step remaining 15; the old one-tick-late start was never ROM-exact; `tests/factoryLobbyFreeRoam.test.ts` pinned it as `TILE_FRAMES - 1` at 3 advances, now `- 2`).
- **Depth sort (`factoryTerminalRender.ts`):** `SetObjectSubpriorityByElevation` puts the sprite lower on the screen in front (16 px buckets, then OAM y
  as the tie), so the draw order is the drawn top y of each object (player fixed at 56 under the follow camera), not the spawn tile. Pinned by a render
  test from source; the ROM trace never overlaps the two sprites (the compare is exact with both the old and the new order).
- **Talking to a moving woman / fat man:** nothing wired. `BattleFrontier_BattleFactoryLobby_Text_NeedKnowledgeOfMonsMoves` / `_SwappedForWeakMon` (MSGBOX_NPC) exist
  as map scripts, but the engine keeps these NPCs silent (A on an NPC is a no-op, user decision 2026-08-05), so there is no talk target and no turn-to-player on A.
- **Proof:** engine NPC state and cursor equal the ROM on every frame of the trace (max |offset| 0, `lbw3-engine-compare.py`); `npm run compare` on the free-roam window
  501 / 501 (5700..6200); no regression on lbra-loss-off 2258 / 2258, loss-beyond-boundary 183 / 183, loss-lobby-walk 177 / 177, won-no 9580-9633 54 / 54, won-yes 9660-9713 54 / 54,
  won-attendant 17 / 17 + 6 / 6 + 44 / 44. Tier-1: `tests/lbw4LobbyNpcPlayer.test.ts` + `tests/fixtures/lbw4/woman-block.json.gz` (generator `tools/probe/lbw4-make-fixture.py`) replay 440 frames
  of player cur / prv, both wanderers and the cursor.
- **Unproven at lbw4 (all four proven in lbw5, below):** a same-frame race for one tile, a turn-commit refusal by the woman, a direction change during a bump, the fat man in the player's way.

## lbw5 -- the four lbw4 "Unproven" player <-> NPC cases, on the ROM

Method: `tools/probe/lbw5-sweep.py` replays `lbw4-woman-block-off` to frame 5254 (a segment boundary: player idle at grid (11,15), facing south, woman and fat man
mid-wander), saves the raw emulator state and runs many button timelines from there (Scene OFF); each branch is a fixture row set
`[held mask, gRngValue, player cur / prv, woman, fat man]`. `tools/probe/lbw5-check.ts` replays a sweep through the engine and prints the first mismatch per branch.
Release timing was swept to the frame (the woman's ring walk is deterministic from 5254, so a press one frame earlier or later flips the outcome).
Per case a committed compare trace (the lbw4 route to 5254 + the branch; `tools/probe/lbw5-make-trace.py`) and, for all four together, one Tier-1 fixture
(`tests/fixtures/lbw5/player-npc.json.gz`, 11 branches, `tools/probe/lbw5-make-fixture.py`; `tests/lbw5LobbyNpcPlayer.test.ts`).

| case | branches swept | ROM result | engine |
| --- | --- | --- | --- |
| 1 fat man in the way | RIGHT, a 24-frame release, DOWN held 130 from (13,15): bump at (13,16) | `LOOK_AROUND` never moves and never gives way; the bump runs for the whole hold; the player never enters (13,17) | already exact (tiles, cursor) |
| 2 direction change during a bump | 20 (LEFT / RIGHT after 60..105 frames of the fat-man bump) | the other direction interrupts at once and starts its step that frame (`TryInterruptObjectEventSpecialAnim`: `movementDirection != direction` clears the held movement; runningState is still MOVING, so there is **no turn in place**) | **fixed**: the engine finished the bump cycle, then turned 8 frames |
| 3 turn-commit refusal by the woman | 18 (`tdep`: press 5838..5857 against her departing tile, `tarr`: 5946..5958 against her arriving tile) | arriving: pressed up to P5952 the step starts, from P5953 the woman is already on the tile and it bumps; departing: the bump lasts 2 / 1 / 0 ticks for P5855 / P5856 / P5857 and the step starts on the same ROM frame (611) | **fixed**: the commit tick decided against the renderer's lagged NPC state (end of T-2) and was one tick late on the departing side |
| 4 same-frame race for one tile | 11 (`race`: DOWN pressed 5940..5950 while the woman steps onto (11,17)) | the player is first up to P5944, the woman from P5945 (the player's CB1 runs before the woman's callback: she sees the player's moved cur / prv and turns away) | already exact |

- **Fix 1 (case 2, `advanceFactoryLobbyFreeRoam`):** in the bump branch a held direction different from the facing now calls `startStep` at once (the old cycle-end turn-after-bump
  branch is gone); the walk starts at the GO anim command index the bump had reached, run through `SetStepAnimHandleAlternation` (it preserves the index across a direction change).
- **Fix 2 (case 3):** at `turnRemaining === 1` (the ROM frame that decides the committed step) a target the woman holds, seen against `live` (end of the previous tick),
  starts the bump then; the same-direction interrupt that follows starts the step on the ROM frame the tile clears.
- **Player idle GO-anim index (`idleIdx`, 1 or 3):** the sweep showed the walk / turn poses depend on history the engine's `animClock` did not carry. `SetStepAnimHandleAlternation` maps 1 -> 2, 3 -> 0
  and a walk / turn ends one command later, so every turn and every tile step toggles the idle index; the turn shows walk-2 then stand from I = 1 and walk-1 then stand from I = 3; a fresh
  walk after the turn starts at walk-1 (I after the turn = 3) or walk-2 (= 1); a bump starts at command 2 (I = 1) or 0 (I = 3) and advances one per 16 frames, the idle pose settling on the last
  command's index (<= 1 -> 1, else 3). Spawn I = 1 (facing north, command 1; ROM `lbw4` route 4800). This replaces the old "north fresh = walk-2, others walk-1" heuristic, which held only for the
  histories the walk fixtures had. Verified exact on loss-lobby-walk 177 / 177, loss-beyond-boundary, lbra-loss-off and every won / forfeit window (forfeit 1087-1199 improves 109 / 113 -> 113 / 113).
  `tests/factoryLobbyFreeRoam.test.ts` "resets the walk cycle after a turn": a direction change **while moving** (not ROM behaviour: see below) now ends in walk-2 (west frame 8) instead of walk-1,
  because the history now decides the first pose; the pin documents the engine's own turn path.
- **Proof:** per trace ROM dump (`lbw1-lobby-wander-rom.py`) vs engine (`lbw3-engine-npcs.ts` + `lbw3-engine-compare.py`): max |offset| 0 and NPC state identical on every frame of all four.
  `npm run compare`, capture windows from 5254: `lbw5-fatman-off` 254 / 254, `lbw5-bump-turn-off` (chg-LEFT-d75) 269 / 269, `lbw5-turn-refuse-off` (tdep-P5856) 745 / 745, `lbw5-race-off` (race-P5944) 796 / 796.
  All 64 sweep branches (6 fat man + 20 bump + 44 race / turn) match on player cur / prv, both wanderers and the cursor except the 3 pre-existing no-release-gap `fatN-j*-g0` branches (last bullet); retire-off stays 1476 / 1554 (the dialog-text residual above). No regression: lbw4-woman-block-off 501 / 501, lbra-loss-off 2258 / 2258,
  loss-beyond-boundary 183 / 183, loss-lobby-walk 177 / 177, won-no 54 / 54, won-yes 54 / 54, won-attendant 17 + 6 + 44, lbra-forfeit 113 / 113.
- **Residuals (pose only, one frame each, excluded from the committed capture lists):** the first step frame after a bump interrupt (5394 in bump-turn, 5866 in turn-refuse: the ROM shows the new walk pose
  on that frame and keeps it nine frames, the engine's lagged clock shows stand); a bump-cycle boundary one frame early at 5946 (turn-refuse) and 6009 (race, after a bump settles); the fat-man bump
  settle after a release 5455 (the ROM runs one extra 16-frame cycle). None moves a tile, an NPC or the cursor.
- **Pre-existing, not changed:** a held direction change while a step is in flight (RIGHT -> DOWN with no release gap: `fatN-j*-g0`, 3 of 6 branches) mismatches: the ROM has no turn in place while MOVING, the engine turns
  for 8 frames at the tile center. Not reachable from the lab route in the fixtures (they release first) and out of this step's four cases.
