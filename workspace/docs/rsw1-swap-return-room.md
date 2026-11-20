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
