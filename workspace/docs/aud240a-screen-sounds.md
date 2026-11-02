# aud240a — screen SE emitters: draft, swap, dialog menus (S11 step 4, first slice)

Write-only `SE_SELECT` (`kind "se"`, `id 5`, `pan null`) emitters through `emitSound` (`docs/aud239-sound-events.md`). Each emit sits in the same branch of the existing input handler. No engine state, RNG, kernel `FactoryEvents` (`play-se`), frame hash, pixel or timing changes. Helper: `src/engine/screenSounds.ts` (`playSelectSe`; in `src/engine`, so the headless graph still holds only `src/audio/soundEvents.ts`).

## Site map

| ROM | Ours | Rule |
|---|---|---|
| `Select_Task_HandleYesNo` (battle_factory_screen.c) | `core.ts` draft `confirmReveal.phase === "shown"` | UP/DOWN on `newAndRepeatedKeys` (JOY_REPEAT); B, A-on-NO, A-on-YES one SE |
| `Select_Task_HandleChooseMons` | `core.ts` draft cursor mode | LEFT/RIGHT (repeat), A (open the menu) |
| `Select_Task_HandleMenu` | `core.ts` draft menu mode | UP/DOWN (repeat), B, A on SUMMARY / RENT / OTHERS |
| `Swap_Task_HandleChooseMons` + `Swap_Update{Ball,Action,Menu}CursorPosition` | `factorySwap.ts` `swapInputPlaysSelect` (player/enemy pickers) | any accepted input |
| `Swap_Task_HandleMenu` / `Swap_Task_HandleYesNo` | `factorySwap.ts` playerOptions, acceptPrompt, quitPrompt | UP, DOWN, A, B |
| `Swap_TaskCantHaveSameMons` | `factorySwap.ts` duplicateSpecies | A, B |
| `Menu_ProcessInput*` (menu.c) for the postwin question, continuation, swap-offer | `core.ts` postwin blocks | see below |

The guard is the existing `inputReady` / not-complete check, so ignored input stays silent.

## Rules (all from the C, `reference/pokeemerald/src/menu.c` / `script_menu.c`)

- `Menu_ProcessInput*` read `JOY_NEW` for A, B and the D-pad. Ours moves the cursor on `newAndRepeatedKeys`; the SE is gated on `newKeys` (the held-key repeat moves the cursor silently, see divergences).
- **B in menu.c emits nothing.** Script multichoices with `ignoreBPress = TRUE` (continuation) ignore B entirely.
- `Menu_ProcessInputNoWrap` (question, swap offer, 3-entry continuation) sounds on UP/DOWN only if the cursor moved. The wrapping menu (4-entry continuation) sounds on every press.
- A sounds in `Menu_ProcessInput*` on any entry. `ScriptMenu_YesNo` (the `MSGBOX_YESNO` swap offer) additionally plays `SE_SELECT` in `Task_HandleYesNoInput` for NO/B, so A on NO is two SEs in one frame. Ours has no B branch on the swap offer (B stays unsounded), so only A-on-NO produces the pair.
- The continuation menu is gone from page 1 on; it must not sound on later pages even though the cursor reducer still accepts input there (fixed during verification, see below).

## ROM proof (`tools/audio/soundEventProbe.py`, Scene ON profile, stepping mode)

Stepping mode matters: the hybrid `--fast` mode drops no-op calls, which hides the second SE of the NO pair (found while verifying: a fast window showed one SE at 29632, step mode shows two, the second `noop`).

| Fixture | Window | ROM events | Ours |
|---|---|---|---|
| `draft-window.json` (existing) | draft anchor, 116 frames | SE_SELECT f21, f43, f85 | identical |
| `draft-trace-window.json` (new) | `battle1-swapyes-b` frames 1-300 | 12 SE_SELECT: 1, 31, 37, 75, 77, 107, 113, 151, 153, 183, 189, 261 | identical |
| `swap-window.json` (new) | `battle1-swapyes-b` frames 29001-30300 (postwin question/continuation, swap offer YES, swap player picker, options, accept prompt) | 10 SE_SELECT: 29602, 29702, 29782, 29802, 30002, 30022, 30042, 30062, 30082, 30182 | identical |
| `swap-decline-window.json` (new) | `battle1-winline-b-swap` frames 29001-29700 (swap-offer DOWN, A on NO) | SE_SELECT 29602; 29632 twice (second `noop`) | identical |

Trace fixtures carry `"from": N` (events use absolute frames); `tests/audioProbeFixtures.test.ts` now reads it. Later events of the full `battle1-swapyes-b` swap trace (SE_EXIT 31165, BGM 33110, ball tray 33469, fight menu, cries) belong to later slices and are outside these windows.

`tests/aud240aScreenSounds.test.ts` (hermetic, no oracle) pins the four windows, the double SE, and that collecting does not change the final engine state. `tests/audioSinkNeutral.test.ts` now asserts hashes / digest / trace are unchanged by a sink and that the sink only receives in-order `se 5 null`, and that a headless replay stays silent.

## Divergences and gaps (noted, not changed)

- Repeat: the ROM D-pad of `Menu_ProcessInput*` is JOY_NEW; ours moves on JOY_NEW or repeat. Held-key repeat steps move the cursor silently. The draft and swap handlers use `JOY_REPEAT` in the ROM too, so they sound on repeats.
- Our postwin continuation cursor stays movable on page 4 (swap offer). It is silent there; behaviour is untouched.
- ROM sites with no branch in ours (no new behaviour added): draft invalid-pick SE (`battle_factory_screen.c:1711`).
- Out of scope, untouched: battle controller, move animation, summary, party menu, lobby/script sounds (aud240b..d, aud241, aud242).

## Verification

Tested commit `0e7df324c` (tree `b940721fb`), code identical to the final commit (only this section was added afterwards).

- `npm run compare:differential` vs clean parent `0f39a60c2`: **PASS**, 641 / 641 (fight-submenu, battle1-postwin-next-prompt, presentation-rng-playable-live-bodies-seeded-on) and **2430 / 2430 byte-identical across 27 traces** (all `battle1-postwin-*`, `battle1-swap-*`, `draft-*`).
- `npm run typecheck` 0; full `npm test` 0 (1737 files passed, 44 skipped, 14384 tests passed, 0 failed); `npm run build` 0; `npm run build:lib` 0.
- No pinned ratchet or ENGINE_BUILD pin moved. `tests/audioSinkNeutral.test.ts` changed (sink no longer empty); `tests/audioProbeFixtures.test.ts` gained the new fixtures and the `from` offset.
