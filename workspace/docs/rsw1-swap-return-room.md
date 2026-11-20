# rsw1: the room after the swap screen

Authorized source-proven gameplay-timing / RNG correction (docs/factory-finish-scope.md). One shared engine rule, no scene branch, no seed or battle-number constant: `src/engine/swapReturn.ts` plus the hand-off and render in `src/engine/core.ts`.

## ROM

`CB2_ReturnToFieldContinueScript` (overworld.c:1677), then `BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:43-52, 148-158`:

1. black hold while the map reloads;
2. `FadeInFromBlack`, 15 frames, no message box (field_screen_effect.c:95-99, 150-155);
3. real swap only: `factory_setswapped`, then `msgbox YourSwapIsComplete, MSGBOX_DEFAULT` ("Thank you!\nYour POKéMON swap is complete.", waits for A/B);
4. `msgbox RightThisWay` ("Right this way, please!").

A kept party skips step 3. Before this step the engine showed the box at once and skipped steps 1-3.

## Measured on the ROM (hand-off tick r = 0)

Black r < 13; r = 13 peeks at the fade; fade r = 13..; settled 8 frames; box at r = 37; first text char at r = 38 (1 char/frame). This is the draft's own return to the room (`EXIT_TO_ROOM_BLACK_HOLD_TICKS` + `FADE_IN_TICKS` + `ROOM_HOLD_TICKS`), reused. RNG: 1 `Random()` per frame, plus the map reload's draws, 2 steps in total at r = 2 and 3 at r = 3 (measured on the swapped trace; the kept path uses the same rule and is picture-verified only).

## Compare traces (`npm run compare -- <trace> --summary`, dense captureFrames)

| trace | before | after |
| --- | --- | --- |
| rsw1-swap-return-room-off (swapped, OFF) | 79 / 488 | 482 / 488 |
| rsw1-swap-return-room-on (swapped, ON) | 79 / 488 | 482 / 488 |
| rsw1-swap-kept-return-room-off (swap declined) | 62 / 360 | 360 / 360 |

The 6 left on the swapped traces are frames 30182-30190, the swap-entry fade before the hand-off (outside this step).

## Frame catcher (`tools/frame-catcher`)

| seed | content / timing / picture diffs before | after |
| --- | --- | --- |
| 1 (ON, winning-swap) | 42 / 46 / 287 | 37 / 182 / 238 |
| 8 (OFF, winning-swap) | 56 / 70 / 341 | 54 / 69 / 410 |

Stretch 51 (seed 8, the swap accept prompt to the next menu) was 1221 engine vs 1289 ROM frames before and is 1326 vs 1289 after: the engine overshot by 37 where it undershot by 68. The remaining first difference in the room-after-swap window is the "Right this way" walk to the battle: ours starts about 42 frames later than the ROM (engine frames 12311+ against ROM 12953+, offset 684). The cause is not established; the likely one is how the catcher's ROM side times its A against the "Thank you!" wait (the black / fade / box compare traces match, 482 / 488 and 360 / 360). Not fixed here; next round. Seed 1's ROM side stopped at a battle-2 summary menu (`stuck-at-menu`, frame 20893) well after the swap window, so its counts after the first swap cover less of the run; the raised timing count follows the later battles' trajectory shift (RNG / press phases), not the swap window.

## Tests

`tests/rsw1SwapReturnRoom.test.ts` (4 tests; they fail without the src change: no `swapReturn` state, so the black, fade, box and A-wait tick counts and the RNG steps differ) pins black 13 + peek, fade, 8 settled frames, box at 37, the RNG (1 per frame, 2 at r = 2, 3 at r = 3), the A wait, and the kept path. `tests/interactiveRouting.test.ts` hand-off pins were updated (`factorySwap` null and `swapReturn` set at the hand-off tick; `battleStart` next tick; "Right this way" only after A or ~37 ticks).

## Re-pins (rule change, not a bug)

- `tests/randomRoundSoak.test.ts`, "full" policy seed 1: frames 61456 -> 61528 (+72), same battle 3 / depth 2 / turn 22 / roundLost; the player's presses land on the new room wait.
- `tests/lbrd.test.ts`, the vanilla pins and every other soak pin: re-run, unchanged.

## Gates

`npm run typecheck` 0, `npm run build` 0, `npm run build:lib` 0, `npm run test:gate` 360/360 files (2832 tests), the 84 other tests importing room / swap / postwin / factory flow modules all pass after the one re-pin. Soaks: `--policy vanilla --seeds 0:20 --scene off` 20/20 (OK 20, CRASH 0, HANG 0); `--policy vanilla --seeds 0:5 --scene on` 5/5 (ON run limited to 5 seeds by time); `--policy winning-swap --seeds 0:60 --scene off` 60/60 (run as 0:6, 6:18, 18:32, 32:46, 46:60, 0:6 repeated on the tip).

## Test players

The soak driver (`RandomPlayer.onPostwin`) presses A once `swapReturnThanksInputReady` and holds no buttons before it; the frame catcher's menu model returns null while `swapReturn` is active and names the surface `swapReturn:<kind>`. play:random and the catcher's driver use these.

## Caveats

- The ROM's A-held text speed-up (`canABSpeedUpPrint`) is not modelled for "Thank you!" (same as the existing "Right this way").
- Website note: games recorded on older builds replay on their own build only; the swap return room frame count and RNG changed.

## rsw2: the room's frame count after the swap, walk, warp, battle start

Question: is the engine 42 frames late on the "Right this way" walk (catcher seed 8, offset 684 vs 618), or is the catcher wrong? Settled with direct oracle traces (Scene OFF :8014), not the catcher: base route = `rsw1-swap-return-room-off`'s first 165 segments (accept at 30182), then appended segments.

- `rsw2-walk-coarse-off`: accept -> Thank you! -> Right this way -> walk -> warp -> battle start, stride 3 over 30190-31098: 267/267 exact.
- `rsw2-ready-spam-off` / `-odd-off`: A pressed every other frame (even / odd phase) through the room, dense (256 captures each): exact after the fix below. `rsw2-guide-spam0/1-off`: the same through the "Right this way" box and the walk, 256/256.
- `rsw2-catcher-presses-off`: the ROM's own press schedule from catcher seed 8 (A at +66, +71, +188, B +208, A +216, A +222, B +235, A +245 from the accept) replayed densely: 256/256.

Finding (the only engine difference): the "Thank you!" waitbuttonpress takes A / B two frames after the last glyph shows, not one (the "Right this way" box's gap, postwin.ts). `swapReturnThanksInputReady` was `+1`, now `+2` (ROM ready 30305 vs engine 30304 on the odd-phase spam). `tests/rsw1SwapReturnRoom.test.ts` pins `full + 1` not ready (an A there leaves `guideElapsed` null) and `full + 2` ready; it fails without the src change.

RNG: per-frame `Random()` steps exact through the warp (bursts at 30225/30226 and 30569/30570); raw gRngValue equals the ROM's through 31093 after rebasing at 30190 (the engine's absolute rng on this route differs from the ROM's from 30180, known). Not equal after the battle-room entry (31094): the engine's fixed opponent-party-build draw counts (`opponentSetupExtraRngSteps`, battleRoom.ts) leave it 78 steps behind the ROM by 31121 because the ROM's CreateFacilityMon nature loops are value-dependent; the battle transition then starts 1 frame later with a different type. This is outside the swap return room and is NOT fixed here (follow-up: model the nature loops).

Attribution of the catcher's 42: with the ROM's own presses the engine is exact, so the offset is catcher-side. Its ROM side re-presses the engine's presses at the same offset from the last matched menu and repeats a press with no effect, so each text-tap lands about 2 frames later on the ROM than on the engine and the room window grows by +2..+4 over the menu offset. The 1-frame ready fix above removed 23 of the 37 frames in stretch 51 (+37 -> +14); the rest is catcher press placement, plus the battle-start black (53 vs 44 frames) and a later 14-frame difference in the battle-start / intro presentation (out of scope). The catcher itself was not changed.

Swap-entry fade frames 30182-30190 (6 diffs on the swapped traces, 482/488): not addressed, no time; unchanged.

Re-pins: none moved. `tests/randomRoundSoak.test.ts` (and the coverage / combined soak tests), `interactiveRouting`, `prebattleRoomFlow`, `postwin`, `battleRoom` etc. all green unchanged. Compare: `rsw1-swap-return-room-off` 482/488 and `-on` 482/488 (unchanged), `rsw1-swap-kept-return-room-off` 360/360.

Gates: typecheck 0, build 0, build:lib 0, `npm run test:gate` 360/360 files (2835 tests), `winning-swap --seeds 0:60 --parallel 3` OK 60/60 (run as 0:3, 3:12, 12:21, 21:30, 30:39, 39:48, 48:57, 57:60 because one 60-seed run exceeds the 10-minute tool cap).
