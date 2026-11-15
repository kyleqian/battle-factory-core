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

## lbw2: cursor classification (evidence only, no `src/` change)

Question: is the engine's `rngValue` at Lobby entry wrong on the production route, or only in the traces' `appStage` constants?
**Both.** The stage constants are harness-only and arbitrary. Independent of them, the engine has four real accounting gaps between the end of a battle and the Lobby, all proved with the stage constant removed.

**Method.** There is no trace that reaches the Lobby from the canonical boot: every lbra / lbrd trace is a battle-lab checkpoint (`oracleBattleLab`) on the ROM side and an `appStage` on the app side. So I removed the stage constant instead: `tools/probe/lbw2-app-rng.ts` re-bases the app cursor to the ROM's `gRngValue` at a frame where the engine's `rngValue` is the live cursor, and `tools/probe/lbw2-classify.py` reports the draw-count offset (app minus ROM) per frame, using the ROM's own `sRandCount`. `tools/probe/lbw2-draw-source.py` single-steps the ROM through a frame and logs every `Random()` caller (backtrace resolved against the pinned ELF, statics included). Evidence: `.integration/evidence/lbw2/` (not in git).

### Offset timeline (offset k = engine is k draws ahead of the ROM; entry = Lobby map first frame)

| span | forfeit (rebase @250) | loss (rebase @3233) | retire (rebase @6700) | won x3 (rebase @entry = stage) | source |
|---|---|---|---|---|---|
| after the rebase | 0 | 0 | 0 | 0 | harness |
| engine resumes per-VBlank draws; ROM still `gMain.inBattle` | 0 -> +40 (f 250-290, entry-99..-59) | 0 -> +40 (f 3233-3273) | n/a (no battle) | n/a | **E1** |
| ROM exit frame (`entry-58`) | +39 | +39 | n/a | n/a | **E2** |
| ROM return-to-field (`entry-56`, `-55`) | +36 | +36 | n/a | n/a | **E2** |
| Lobby map load, `entry+3` | +34 | +34 | -2 | -2 | **E3** |
| Lobby map load, `entry+4` | +31 | +31 | -5 | -5 | **E3** |
| NPC window, `entry+34` | +29 | +29 | -7 | -7 | **E4** |

Flat everywhere else (every other frame from the rebase to entry+40 has delta 0). Loss and forfeit are identical, so the pattern is the battle-exit code, not the trace. Won-yes and won-attendant re-run to entry+40 give the same numbers as won-no.

### Source of each ROM draw (decomp, `reference/pokeemerald`)

| id | frame (forfeit) | draws | ROM function | decomp |
|---|---|---|---|---|
| E1 | 250-291 | engine draws 41, ROM 0 | `Random()` in `VBlankIntr` is gated by `!gMain.inBattle \|\| !(flags & (LINK\|FRONTIER\|RECORDED))`; `gMain.inBattle` stays 1 until `ReturnFromBattleToOverworld` (frame 291, `entry-58`) | `main.c:366`, `battle_main.c:5217-5230` |
| E2a | 291 | 2 | `ReturnFromBattleToOverworld` -> `RandomlyGivePartyPokerus` + `PartySpreadPokerus`, before `inBattle = FALSE`; the VBlank of that frame is still suppressed | `battle_main.c:5221-5222` |
| E2b | 293-294 | 3 | `CB2_ReturnToFieldLocal` -> `ReturnToFieldLocal` -> `ResetMirageTowerAndSaveBlockPtrs` -> `MoveSaveBlocks_ResetHeap`: 1 in `SetSaveBlocksPointers` (`offset + Random()`), then the 2-draw encryption key. It straddles two frames | `load_save.c:74,129`, `overworld.c:2074` |
| E3a | 352 (`entry+3`) | 2 | `LoadMapFromWarp`: `RoamerMoveToOtherLocationSet` (1; `overworld.c:862`, in `LoadMapFromWarp`, `overworld.c:827`), then `UpdateTVScreensOnMap` -> `FindAnyTVShowOnTheAir` -> `GetRandomActiveShowIdx` (1; indoors only) | `overworld.c:862,872`, `tv.c:826` |
| E3b | 353 (`entry+4`) | 3 | `DoMapLoadLoop` -> `LoadMapInStepsLocal` -> `ResetMirageTowerAndSaveBlockPtrs` -> `MoveSaveBlocks_ResetHeap` (same 1 + 2 as E2b) | `overworld.c:2074` |
| E4 | 383 (`entry+34`) | 2 | `MovementType_WanderAround_Step2` (woman) and `MovementType_LookAround_Step2` (fat man): her/his first delay draw. Plain NPC draws, not map load | lbw1 sim |

So the lbw1 "5 extra draws at entry+3 / entry+4, source unpinned" are **2 (Roamer + TV show) + 3 (`MoveSaveBlocks_ResetHeap`)**; and the "+2 at the window" are the NPCs, not the map. The engine already knows the 2 + 3 pattern for the attendant door warp (`PREBATTLE_ENTRY_TIMING.warpExtraRng`, fade tick 27 / 28, `src/engine/prebattleEntry.ts:43`), so E3 is the same warp, missing on the Lobby-entry side.

### Per-trace offsets of lbw1, explained

| trace | lbw1 offset | explanation |
|---|---|---|
| retire | constant +1592 from stage to entry, then -5, -2 | +1592 = **stage constant** (`win-terminal-window-off` injects 1939465134, which is the ROM cursor at frame **6636**, not at the stage frame 4623). From f 4624 to entry+2 the engine is exactly in lockstep (2100 frames, delta 0 each; no E1/E2 because retire warps from the PreBattleRoom, no battle exit). After the rebase at 6700: 0, -2, -5, -7 = E3 + E4 only. |
| forfeit | +1639 at stage, +1603 at entry (a "36-draw gap") | stage value 1 = lab seed (the ROM lab consumed 1639 draws before its checkpoint, `1 -> 3031698222`); the engine's own first tick takes the cursor from `battle.rng.value`, so a rebase at frame 0 does not stick (it re-reads the stage seed). The 36 are **real**: E1 (+41) minus E2 (-5) = +36. |
| loss | no relation within +-6000 | stage value 9 (`loss-terminal-window-off`), lab seed 305419896: different constants. With the rebase at 3233 it is identical to forfeit: +40, +36, then -5, -2 (**E1 / E2 / E3 / E4**). |
| won x3 | no relation, same constant on all | `seventh-win-terminal-off` stage cursor 2994853427 (a generated round driven to completion, seed 17) vs ROM lab cursor 3758091126 at the same frame. Rebase at the stage frame: offset 0 at entry..entry+2, then -2, -5, -7 (**E3 / E4**). The won battle exit (E1 / E2 upstream) is not covered: the stage sits at entry. |

### Verdict

| gap | verdict | fix | proof |
|---|---|---|---|
| stage rngValue constants (all six traces) | **harness-only** | add `appRngRebase` (frame, ROM cursor): forfeit @250 = 3031698222, loss @3233 = 1298389302, retire @6700 = value of `rom-lbra-retire-off` row 6700, won x3 @5113 = 3758091126. A rebase before the battle ends does not stick (the engine reads `battle.rng.value` while a battle is live), so use a frame after it; the experiment runs show where. | retire lockstep for 2100 frames; won 0 offset at entry..entry+2 |
| **E1** engine draws per VBlank 41 frames before the ROM | **engine** | keep `rngMode: "frontierBattle"` (no per-frame advance) from the forfeit / loss battle end until the `ReturnFromBattleToOverworld` frame (ROM `entry-58`; forfeit tick 291, loss tick 3274); resume VBlank draws the frame after | lbra-forfeit-off, lbra-loss-off (identical) |
| **E2** missing `ReturnFromBattleToOverworld` + `MoveSaveBlocks_ResetHeap` draws | **engine** | 2 draws at the exit frame (Pokerus x2, VBlank not drawn that frame), then 1 draw at exit+2 and 2 at exit+3 (save-block move) | same two traces |
| **E3** missing Lobby map-load draws | **engine** | 2 draws at `entry+3`, 3 at `entry+4`, on top of the VBlank draw; same 2 + 3 as `warpExtraRng`; reached by every path that warps into the Lobby (retire, forfeit, loss, won all proved) | all six traces |
| **E4** NPC draws from `entry+34` | **engine (next step)** | the wander port itself (lbw1 simulator is the oracle); not a map-load rule | six traces, sim matches |

Production-route consequence: on a real forfeit or loss the engine's cursor at the attendant is the ROM's +36 (E1/E2) -5 (E3) minus every NPC draw (E4 and after, about 1 per 30-130 frames plus the two NPCs' whole timeline), so the next draft after a Lobby wait would not match the ROM draft for the same inputs. After a retire it is -5 and the NPC draws. This is a real engine bug for the in-game new-challenge deal (nch231), not a harness artifact. It does not affect the lbra / lbrd pixel windows (they are rendering-only).

Not measured: the won route's battle exit (E1 / E2 expected, same code, unproved because the stage sits at entry); whether the PreBattleRoom -> battle return (non-terminal win, `warp to PRE_BATTLE_ROOM`) lacks the same E3 draws (its own 2 + 3 at the map load are likely, not probed); a full from-boot route (draft -> battle -> forfeit) on the ROM.

### Reproduce (lbw2)

```
python3 tools/run-mgba-probe.py --rm-log-on-success OUT/rom-N.json -- python3 tools/probe/lbw1-lobby-wander-rom.py tools/compare/traces/N.json OUT/rom-N.json START END
node tools/probe/lbw2-app-rng.ts tools/compare/traces/N.json OUT/app-N.json keep REBASE_FRAME ROM_RNG_AT_THAT_FRAME     # or STAGE_RNG REBASE... for the stage-frame variant
python3 tools/probe/lbw2-classify.py N [FIRST [LAST]]      # reads .integration/evidence/lbw2/{rom,app}-N.json
python3 tools/run-mgba-probe.py --rm-log-on-success OUT/src.json -- python3 tools/probe/lbw2-draw-source.py tools/compare/traces/N.json OUT/src.json 291,293,294,352,353,383
```

## lbr-g: engine fix for E1 + E2 + E3 (ISSUES #221)

`src/engine/battleExitRng.ts` (wired in the `factoryTerminal` branch and the retire part of the `postwin` branch of `tickEngineState`, `core.ts`), identical in both scenes. Per tick draw counts, keyed on `PostwinState.elapsed` (43 = the ROM exit frame):

| rule | ages (loss / won) | forfeit | decomp |
|---|---|---|---|
| E1 no draws while `gMain.inBattle` | < 43 | < 43 | `main.c:366`, `battle_main.c:5217-5230` |
| E2a Pokerus pair on the exit frame (VBlank suppressed) | 43: 2 | 43: 2 | `battle_main.c:5221-5222` |
| E2b `MoveSaveBlocks_ResetHeap` 1 + 2, over two frames | 45: 2, 46: 3 | same | `load_save.c:74,129`, `overworld.c:2074` |
| E3 Lobby map load, `entry + 3` / `entry + 4` | 105: 3, 106: 4 | 104: 3, 105: 4 | `overworld.c:862,872`, `tv.c:826`, `overworld.c:2074` |
| E3 without a battle exit (retire; staged 7th-win terminal) | `entry + 3`: 2 extra, `entry + 4`: 3 extra | | same |

The forfeit return reaches the Lobby one tick sooner than the loss return after the same exit frame (ROM: exit-to-entry 58 vs 59 frames), so its E3 age is 104. Retire keys E3 on the RETIRE-YES delay (`entry` = fade-in delay 38 - 13); the staged won terminal on its own age (0 = the Lobby map load).

Method: lbw2's (`tools/probe/lbw2-app-rng.ts` rebased at a frame where the engine cursor is live, `lbw2-classify.py`). Offset = engine draws minus ROM draws. Rebases: forfeit @250 = 3031698222, loss @3233 = 1298389302, retire @6700 = 2155949550, won x3 @5113 = 3758091126.

| span | forfeit before -> after | loss before -> after | retire before -> after | won x3 before -> after |
|---|---|---|---|---|
| after the rebase | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| E1 window (f 250-290 / 3233-3273) | +40 -> 0 | +40 -> 0 | n/a | n/a |
| ROM exit frame (entry-58 / -59) | +39 -> 0 | +39 -> 0 | n/a | n/a |
| return-to-field (+2, +3 frames later) | +36 -> 0 | +36 -> 0 | n/a | n/a |
| Lobby map load, `entry+3` | +34 -> 0 | +34 -> 0 | -2 -> 0 | -2 -> 0 |
| Lobby map load, `entry+4` | +31 -> 0 | +31 -> 0 | -5 -> 0 | -5 -> 0 |
| through `entry+33` | +31 -> 0 | +31 -> 0 | -5 -> 0 | -5 -> 0 |
| NPC window, `entry+34` (E4, out of scope) | +29 -> -2 | +29 -> -2 | -7 -> -2 | -7 -> -2 |

Every span from the rebase to `entry+33` is delta 0 per frame on all six traces (forfeit, loss, retire, won-no, won-yes, won-attendant). The remaining -2 is the two NPC delay draws of E4.

Not covered (no ROM measurement): the won route's real battle exit (the production 7th win reuses the loss rule: same `ReturnFromBattleToOverworld` code, but the won trace stages at `entry`), and the PreBattleRoom entry of a non-terminal win keeps its existing table (`postwinRngSteps`, already 43 / 45 / 46 / 105 / 106).
