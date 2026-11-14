# lobby-wander-scout -- plan for the Lobby field NPC wander after script release

Read-only scout, 2026-11-14 CAX31 run (Sonnet 5.5 worker, supervisor-committed verbatim; nothing was probed or run: Step 1 is the measurement).

**wander-scout report (read-only, nothing edited)**

**1. Which Lobby NPCs move**

All six sit in `reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryLobby/map.json`:

| NPC | Start | Movement type | Range | Draws `Random()`? |
|---|---|---|---|---|
| Woman (`WOMAN_1`) | (3,11) | `WANDER_AROUND` | x1, y1 | yes, at Step2 and Step4 |
| Fat man | (6,10) | `LOOK_AROUND` | 1,1 | yes, turns only, never walks |
| Singles attendant | (4,7) | `FACE_DOWN` | 1,1 | no |
| Doubles attendant | (14,7) | `FACE_DOWN` | 1,1 | no |
| Camper | (14,11) | `FACE_DOWN` | 0,0 | no |
| Picnicker | (13,11) | `FACE_RIGHT` | 1,1 | no |

- `FaceDirection` (`event_object_movement.c:3041`) never draws.
- Only the woman walks, and she is the named residual in x 96-125.
- The fat man's turns are probably part of the "NPC turn / wander" bbox 96,100-157,134 in lbra (`docs/lbra-lobby-return.md:39`).
- The engine models only her, as a hard-coded tick table: `womanAtTick`, `src/engine/factoryLobbyFreeRoam.ts:496`. It covers ticks 5185-5422 of one trace and says a general model is "out of scope (ISSUES #55)" (`:464`).

**2. ROM algorithm**

- **Woman** (`event_object_movement.c:2566-2630`):
  - Step0 clears movement and Step1 sets a face action.
  - Step2 waits for the face action to finish, then draws `Random()` (`:2584`). It sets the delay to `sMovementDelaysMedium[Random() % 4]` = {32, 64, 96, 128} (`:709`).
  - Step3 counts down, `--data[3]==0` (`:8537`).
  - Step4 draws `Random()` (`:2605`) and picks `directions[Random() & 3]`. If `GetCollisionInDirection` is non-zero, she goes back to Step1 with that direction already set and no walk. Step1 therefore re-faces, and Step2 then draws a new delay.
  - Step5 starts `WALK_NORMAL`, which takes 16 frames per tile. Step6 waits for it to finish, then returns to Step1.
  - A turn costs 2 draws (delay and direction). A cycle that walks costs 2 draws plus the walk. A blocked cycle costs 2 draws plus the next cycle's delay draw.
- **Collision** (`GetCollisionAtCoords`, `:4659`):
  - outside range (initial ±1)
  - impassable metatile or map border
  - elevation mismatch
  - `DoesObjectCollideWithObjectAt`, which includes the player and the other NPCs.
  - So her draws and moves depend on where the player stands.
- **Fat man** (`:2860-2890`):
  - Step2 draws a delay, then Step4 draws `directions[Random()&3]` after `TryGetTrainerEncounterDirection`. That call should return `DIR_NONE`, but I did not read it.
  - He draws two numbers per cycle and never collides.
- **Frozen vs running:**
  - `UpdateObjectEventCurrentMovement` (`:4929`) runs `while(callback())` only if `!objectEvent->frozen`.
  - `lockall` / `lock` freeze every NPC (`scrcmd.c:1202`, `FreezeObjectEvents` at `:8157`).
  - `release` / `releaseall` unfreeze them (`scrcmd.c:1240-1262`).
  - While frozen there are no draws and no delay countdown.
  - The state (`sTypeFuncId`, `data[3]`, in-flight action) survives the freeze and resumes on release. This is why the trace residuals start only after release.
- **Held movement:** `ObjectEventIsHeldMovementActive` (`:4934`) is a separate branch, and I did not trace it.

**3. RNG coupling**

- **ROM:**
  - `VBlankIntr` calls `Random()` once per VBlank (`main.c:366`), except in link, frontier or recorded battles.
  - The overworld `Random()` calls at `overworld.c:1255-1301` are the ambient-cry code. I did not confirm that the Lobby doesn't use them, so check that before trusting the draw count.
- **Probe evidence:** `docs/factory-lobby-freeroam-ground-truth.md §6c` (RAM probe) shows 1 LCG step per frame, plus extra draws at walk start (5185) and settle (5201, 5218).
- **Engine:**
  - `tickEngineState` already advances `rngValue` once per tick while `rngMode === "vblank"` (`core.ts:1115`).
  - The Lobby branch (`core.ts:1330-1340`) keeps `rngMode: "vblank"`, so the per-frame advance already matches the ROM.
  - The Lobby hand-off deals from the live cursor (`docs/nch231-new-challenge.md:24`, `dealPrebattleEntry(…, state.rngValue)` at `core.ts:1261`).
  - `ISSUES #55` is about the draft-construction interleave and is parked. It is not about this per-frame stream, so §6c(b)'s claim that the stream is unmodelled looks stale for the Lobby.
- **What the engine lacks:**
  - Per-NPC state: `sTypeFuncId`, delay counter, facing, tile, action phase.
  - A freeze flag that follows script lock and release. The attendant, terminal and door-walk states already exist, so it can be derived from them.
  - Draws on the shared `rngValue`, in object-event order.
  - Collision against the player, other NPCs and range. The free-roam grid code already has a collision predicate.
  - The exact initial NPC state at each Lobby entry, and the exact `rngValue` there. Without both, the port can't be exact.
  - I did not check whether the app's cursor at Lobby entry equals the ROM's `gRngValue` on each trace (loss, forfeit, retire, won). `core.ts:1303` has some `warp.extra` adoption, which suggests the cursors are not always exact.

**4. Plan (2 steps)**

- **Step 1: evidence only, no `src/`.**
  - Use `tools/probe/dump-lobby-wander-npc.py` through `tools/run-mgba-probe.py` to dump `gRngValue` and the woman and fat man's object events at Lobby load (`gObjectEvents[16]` per the §6 probe), at release, and for 200 frames after, on:
    - lbra-loss-off
    - lbra-forfeit-off
    - lbra-retire-off
    - lbrd-won-no-off
    - lbrd-won-yes-off
    - lbrd-won-attendant-off
  - Check whether the engine's `rngValue` at Lobby entry equals the ROM cursor on each.
  - Check the initial `data[3]` and `sTypeFuncId` at map load.
  - Pass criterion: a hand-simulation of the algorithm above reproduces the probed schedule on every trace.
  - If the cursors differ, the plan is blocked on a cursor-adoption step, and it should say so rather than improvise.
- **Step 2: engine port.**
  - Add `lobbyNpcs` state, with a pure `stepLobbyNpcs(npcs, rng, frozen, collision)` that returns the new `rngValue`.
  - Wire it into the Lobby branch of `tickEngineState` (`core.ts:1330`) after the per-frame advance.
  - Replace `womanAtTick` and the renderer use at `factoryTerminalRender.ts:845` and `:901` with real NPC state.
  - Keep the 5185-5422 table as a test oracle.
  - Proving compares:
    - the free-roam fixtures at their current 183/183 and 2258/2258
    - lbra-forfeit-off 1087-1199 and the retire-off tail, which are residual today
    - lbrd-won-no-off 9580-9633
    - lbrd-won-yes-off 9660-9713
    - lbrd-won-attendant-off 9580-9596, 10195-10200 and 10895-10938.
  - Also run `npm run compare:differential`.

**Risks**

- **Deal shift:** NPC draws come out of the same stream, so every in-game new-challenge deal changes. That matches the ROM only if the Lobby-entry cursor and NPC state are exact; otherwise it only moves the deal. Pinned deals will shift in `tests/newChallengeFromLobby.test.ts`, `soakLobbyNewChallenge.test.ts`, `lbrb.test.ts` and `retireYesLobby.test.ts`.
- **Player-dependent walks:** her collision checks depend on the player's tile, so the port must read it exactly. The compare traces replay fixed inputs, so they won't catch a mismatch for different input.
- **Freeze timing:** draws and countdown stop between lock and release. Off-by-one at the freeze or release boundary breaks every later draw.
- **Fat man:** he is a second shared-stream consumer. Omitting him would shift the woman's draws.
- **Run scope:** I did not run any comparison or probe, and I did not verify the engine's `rngValue` against the ROM at any Lobby entry. Those are Step 1.

The main worktree is clean; I made no edits.
