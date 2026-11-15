# lbw1 -- Lobby woman / fat man wander: ROM evidence (step 1 of lobby-wander-scout.md)

Evidence only, no `src/` change. Battle Scene OFF oracle, six traces: lbra-loss / forfeit / retire, lbrd-won-no / won-yes / won-attendant.
Raw per-frame dumps live in `.integration/evidence/lbw1/` (not in git); regenerate with the scripts below.

## Verdict

- **A bit-exact port of the NPC wander is possible, and a hand simulator already reproduces the ROM.** `tools/probe/lbw1-lobby-wander-sim.py` matches the full 32-bit `gRngValue`, the Random() call count, and both NPCs' tile / previous tile / facing / `sTypeFuncId` / delay on **every frame** of all six traces, from NPC spawn to 454-1816 frames past the script release (>= 200 asked).
  - The draw order inside a frame is: the VBlank draw, then the woman (sprite 2), then the fat man (sprite 5). Flipping it to NPC-first fails at the first window frame, so the check discriminates.
- **Step 2 is blocked today on the cursor.** The engine's `rngValue` equals the ROM's `gRngValue` on **no frame of any of the six traces**, at Lobby entry or at release. A port written now would be exact only against its own cursor.
- The blocker has three separable causes, listed in "Where the cursor first diverges". Two are fixable with trace-level rebasing plus two small draw rules, which are the preconditions below. The third (forfeit's 36-draw gap before the Lobby) needs its own look.

## Per-trace table

Frames are compare-trace frames (frames advanced since the lab checkpoint; state after the tick). "window" is the two-frame unfrozen script boundary (below). "release" is the first frame whose tick runs unfrozen after the final `releaseall`.

| trace | Lobby map 1st frame (entry) | NPC spawn | window | script release | player at release | ROM frames past release | sim match | ROM cursor @entry | app cursor @entry | ROM @release | app @release | cursors equal |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lbra-loss-off | 3333 | 3339 | 3367-3368 | 5092 | (11,15) N | 562 | yes | 3758091126 | 2875873117 | 3748775060 | 2338428978 | no |
| lbra-forfeit-off | 349 | 355 | 383-384 | 1024 | (11,15) N | 576 | yes | 1094291463 | 2722723498 | 3931539857 | 1968932071 | no |
| lbra-retire-off | 6745 | 6751 | 6779-6780 | 8032 | (11,15) N | 562 | yes | 2781583749 | 664400925 | 369881267 | 110752602 | no |
| lbrd-won-no-off | 5113 | 5119 | 5147-5148 | 9579 | (11,15) N | 454 | yes | 3758091126 | 2994853427 | 1679972105 | 159792005 | no |
| lbrd-won-yes-off | 5113 | 5119 | 5147-5148 | 9659 | (11,15) N | 454 | yes | 3758091126 | 2994853427 | 849296793 | 1364792597 | no |
| lbrd-won-attendant-off | 5113 | 5119 | 5147-5148 | 9579 | (11,15) N | 1816 (frozen again 9593: attendant talk) | yes | 3758091126 | 2994853427 | 1679972105 | 159792005 | no |

Grid coords are map + 7. The ROM probes ran 400 no-input frames past each trace's end so every release has >= 200 frames after it (attendant: 14 unfrozen frames, then the conversation freezes them again; its wander evidence is the window only).

Same-start cursors: loss and all three won traces reach the Lobby with the same cursor (3758091126 at entry, 2215710315 at spawn), so they share the same NPC delays.

## Initial NPC state the port must seed (identical on all six traces)

At spawn (map-load frame `entry+6`), both unfrozen, `sTypeFuncId = 0`, `data[3] = 0`, no action, facing SOUTH (1), movement direction SOUTH:

| NPC | slot / sprite | gfx | movement type | spawn tile (grid; map) | range | elevation |
|---|---|---|---|---|---|---|
| woman | 2 / 2 | 16 (WOMAN_1) | 2 WANDER_AROUND | (10,18); (3,11) | x1 y1 | 0 |
| fat man | 5 / 5 | 17 | 1 LOOK_AROUND | (13,17); (6,10) | x1 y1 | 0 |

State at the final release (after the release frame's own tick), derived by the simulator from the spawn state and the cursor, so it is an output not a seed:

| trace | woman (Step, delay left) | fat man (Step, delay left) |
|---|---|---|
| loss, won-no, won-yes, won-attendant | 3, 93 | 3, 126 |
| forfeit | 3, 93 | 3, 62 |
| retire | 3, 125 | 3, 62 |

Both are standing at their spawn tile, facing SOUTH, in the delay-countdown step (Step 3).

## What the ROM does, as probed (frame structure, constant across the six traces)

1. `entry`: `CB2_LoadMap` starts, Lobby map is current. `entry+3` / `entry+4`: **5 extra `Random()` calls inside `CB2_LoadMap`** (2 then 3 extra on top of the VBlank draw; sRandCount deltas 3 and 4). NPCs spawn at `entry+6`. The source of the 5 draws is not pinned (not an NPC, not the ambient cry); it is the same on all six traces.
2. `entry+10` first `CB2_Overworld` frame. `lockall` is in effect from there (`frozen = 1` from `entry+11`), so there are **no NPC draws and no countdown** until:
3. **window** = `entry+34` and `entry+35` (all six traces): both NPCs run unfrozen for 2 frames between two scripts. Frame `entry+34`: VBlank draw, woman draws her delay (`Step2`, delay = {32,64,96,128}[Random()%4]) and decrements (`Step3`), fat man draws his delay (his decrement is the next frame, `LookAround_Step2` returns FALSE). Frame `entry+35`: both decrement. Then frozen again.
4. Frozen (no draws, state kept) until the final `releaseall`. The release frame's tick is the first unfrozen tick: it is the ROM frame **before** the engine's free-roam first frame (app `lobbyFreeRoam` starts at release + 1 on every trace), so the port's first NPC tick is one frame earlier than the engine's free-roam handoff.
5. After release: the simulator's WanderAround / LookAround machines run, 1 VBlank draw per frame plus the NPC draws; nothing else draws.

## Task 2: other `Random()` users in the Lobby

- `sAmbientCrySpecies` (`S_AMBIENT_SPECIES`) is 0 on every Lobby frame of all six traces, so `UpdateAmbientCry` goes to IDLE and `PlayAmbientCry` never fires. No ambient-cry draws.
- From NPC spawn to the end of every trace the simulator's modelled draws (VBlank + woman + fat man) equal the ROM's `sRandCount` delta **on every frame**, so there are no other draws in that window.
- The only unexplained draws are the 5 in `CB2_LoadMap` at `entry+3` / `entry+4` above.

## Simulator coverage

Union over the six traces: the woman completes 17 walks (all four standard directions are drawn), and is blocked 5 times by the range limit and 3 times by the map grid (the border row y=19, outside the room, reads `0x3FF` = impassable), each reproduced exactly. The fat man turns 3-8 times per trace (attendant: none, frozen again). Her walkable ring is grid x 9..11, y 17..18 (collision 0, elevation 3; she has elevation 0, so elevation never blocks her). The ROM collision grid is identical on all six traces (34x26 backup grid).

**Not exercised by any trace** (the code follows the C source but nothing proves it): blocked by another object / by the player (the player stands at (11,15) and never enters her range; the fat man's range x 12..14 never overlaps hers), elevation mismatch, directional-impassable metatile behaviours (the 3x2 area has none in the metatile ids dumped, not checked against attribute data), and `ObjectEventIsTrainerAndCloseToPlayer` for the fat man (trainerType NONE, so it stays FALSE).

## Where the cursor first diverges (task 4)

The app route is `tools/compare/appTrace.ts` (`createInitialState` + `tick` per `traceAdvances`, same stage / rebase handling), run by `tools/probe/lbw1-app-rng.ts`; none of the six traces carries an `appRngRebase`.

1. **Stage constant (all six).** The traces inject state at `appStage` and the injected `rngValue` is not the ROM's cursor at that frame: loss stage @2996 sets 9 (ROM 1298389302), forfeit @0 sets 1 (ROM 3031698222), retire @4623 sets 1939465134 (ROM 1298389302), the won traces stage at 5113 = the Lobby entry frame itself (app 2994853427, ROM 3758091126). Cursors differ from the stage frame on and are never equal again.
2. **retire is otherwise exactly in lockstep.** From the stage to the Lobby entry the app is a constant 1592 draws ahead of the ROM. After entry the offset shifts by exactly -5 at the map-load draws and -2 at the window (1592 -> 1587 -> 1585), then by each NPC draw. So the engine's 1-draw-per-frame model is right up to the Lobby; what is missing is the stage constant, the 5 load draws and the NPC draws.
3. **forfeit has a real accounting gap before the Lobby.** The ROM cursor is the app's advanced by 1639 draws at the stage (frame 0) but only 1603 at the Lobby entry: the engine draws 36 more than the ROM somewhere in frames 0-348 (the ROM cursor is held longer, e.g. through battle / fade frames). Then -5 and -2 as in retire. Not investigated further (outside this step).
4. loss and won: no relation within +-6000 draws of the stage constant, so these are just different constants; I have not computed the true offset.

## Step-2 preconditions (exact)

1. **Cursor**: add an `appRngRebase { frame, rngValue }` (existing compare-only mechanism, `traceTypes.ts:33`) to each of the six traces at a frame on or before the engine's Lobby handoff, using the ROM cursor of that frame. For frame = ROM Lobby-entry the values are the "ROM cursor @entry" column. forfeit additionally needs the 36-draw gap understood, or the rebase placed after it (at `entry`, which then costs nothing). Without this the engine cursor is wrong from the first Lobby frame and cannot be made exact by NPC logic alone.
2. **Engine Lobby tick = ROM entry tick**: the engine must be able to say which tick is `entry` (the Lobby map's first frame) so the draw rules key off `entry+N`. Check this alignment with the rebase: after it, app cursor == ROM cursor on frames `entry .. entry+2`.
3. **Map-load draws**: 2 extra draws at `entry+3`, 3 extra at `entry+4` (on top of the VBlank draw), unconditional. Source unpinned; if a different Lobby entry path (e.g. a save-load or the lbrd attendant return) ever skips them, the port is wrong there.
4. **NPC timeline**: both NPCs unfrozen exactly on `entry+34`, `entry+35`; frozen from `entry+11` otherwise until the final release; the first unfrozen tick of the final release is the ROM release frame = engine `lobbyFreeRoam` first frame - 1. Needs the engine's script timeline for those boundaries; the engine currently has no NPC tick before free-roam.
5. **Per-frame order**: VBlank draw, then woman, then fat man; each NPC ticks `while (callback())` per the simulator (woman: Step1/2 draw+decrement in one frame; walk = 16 frames, first pixel on the Step5 frame; settle frame Step6 returns FALSE; fat man: Step2 returns FALSE).
6. **Collision data**: the port needs the woman's range tiles (grid x 9..11, y 17..18 walkable; y 19 border impassable; range check first) and, to be fully general, player/object collision using current and previous tiles. Check the engine's Lobby layout grid (`factoryLobbyFreeRoam.ts`, §3b) against the ROM dump for those tiles; I did not compare it.
7. **Oracle for the port's tests**: `tools/probe/lbw1-lobby-wander-sim.py` (re-run with `python3 tools/probe/lbw1-lobby-wander-sim.py .integration/evidence/lbw1/rom-<trace>.json`; exit 0 = every frame matched). Step 2's unit test should replay the simulator's per-frame NPC state, not just the cursor.
8. Not covered, so the port must either pin it with a new probe or leave it out of scope: the player walking into her range (object collision), a different player position at release, and the fat man with a trainer-type NPC.

## Reproduce

```
python3 tools/run-mgba-probe.py --rm-log-on-success OUT.json -- python3 tools/probe/lbw1-lobby-wander-rom.py TRACE.json OUT.json --extra=400
python3 tools/probe/lbw1-lobby-wander-sim.py OUT.json            # --order=npc-first / --seed=lock for the discrimination checks
python3 tools/probe/lbw1-lobby-wander-table.py OUT.json          # entry / spawn / lock / release frames, player tile, rng
node tools/probe/lbw1-app-rng.ts tools/compare/traces/TRACE.json APP.json [FRAME0_RNG]
python3 tools/probe/lbw1-cursor-compare.py TRACE_NAME...         # needs rom-NAME.json and app-NAME.json in .integration/evidence/lbw1/
```
