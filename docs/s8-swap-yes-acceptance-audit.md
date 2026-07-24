# S8 OFF swap-YES acceptance audit

Audit date: 2026-07-23. Scope is only the Battle Scene OFF post-win YES
branch. This is a read/evidence audit; it changes no presentation, controller,
trace, or shared-stage policy.

## Verdict

**Gate 2 is not ready to close, and the seventh-win ending is not its sole
remainder.** The canonical ONIX -> GROVYLE acceptance route is completely
implemented and dense-compare green.  Four source-defined, unique swap-screen
interactions still lack a live OFF presentation and committed dense comparison:

1. `SUMMARY` from the player options popup and its return through
   `CB2_InitSwapScreen` with `fromSummaryScreen = TRUE`.
2. Quit swapping: player/enemy picker `B`, player/enemy `CANCEL`, its
   `Quit swapping?` YES/NO popup, YES's no-mutation exit, and NO/B return to
   the originating picker.
3. Enemy `PKMN FOR SWAP`, which transitions back to the player picker.
4. Duplicate-species rejection (`This POKéMON is already in your party!`) and
   its A/B close/return to the enemy picker.

The last case cannot occur in the committed ONIX/MAGBY/BAYLEEF versus
GROVYLE/MURKROW/PIDGEOTTO fixture, but it is a real source branch and needs a
deterministic staged fixture plus a short OFF oracle window. It must not be
addressed by extending a canonical Battle 2 replay.

## Source-to-evidence map

| Source path (battle_factory_screen.c) | Current implementation / Tier-1 evidence | Dense OFF comparison evidence | Audit result |
| --- | --- | --- | --- |
| `CB2_InitSwapScreen` -> `Swap_Task_HandleChooseMons` player picker; three party balls and picker cursor | `factorySwapPresentation.test.ts`: offer-YES route and input gates; `factorySwap.test.ts`: picker cursor/display-copy rules | `battle1-swap-player-picker.json`, 29601--29701, **101/101** | Covered for the three party-ball picker route. |
| Player ball -> `Swap_ActionMon` -> `Swap_Task_HandleMenu`; `SUMMARY`/`SWAP`/`RECHOOSE` popup | `factorySwap.test.ts`: named menu dispatch; `factorySwapPresentation.test.ts`: mon-picture/open, popup gate, menu cursor | `battle1-swap-player-options.json`, 29702--29759, **58/58**; `battle1-swap-player-options-popup.json`, 29758--29801, **44/44** | Popup and the SWAP navigation mechanism are covered. `RECHOOSE` uses the same close/transition-in mechanism as B below. |
| Player popup B or `Swap_OptionRechoose` -> `CloseMonPic` -> `Swap_Task_ScreenInfoTransitionIn` -> player picker | `factorySwapPresentation.test.ts`: source-relative close, reverse fade, CANCEL slide, re-enabled input; `factorySwap.test.ts`: B/RECHOOSE dispatch | `battle1-swap-player-options-b-close.json`, 29759--29817, **59/59** | Covered; source makes RECHOOSE and B share this exact callback/transition path. |
| `Swap_OptionSummary` -> `Swap_Task_OpenSummaryScreen` states fade/clean/show -> normal summary -> `CB2_InitSwapScreen` | Only logical `summaryFade` selection is asserted (`factorySwap*.test.ts`). `advanceFactorySwapPresentation` has no summary transition/return, and `core.ts` continues rendering the picker. | No swap-summary OFF trace. The draft-only `summary-info-{onix,magby}.json` is a different entry/return contract. | **Unimplemented unique UI state.** |
| `Swap_OptionSwap` -> `Swap_Task_SwitchPartyScreen` -> `Swap_InitActions(SWAP_ENEMY_SCREEN)` -> enemy `Swap_Task_HandleChooseMons` | `factorySwapPresentation.test.ts`: source-named switch callbacks, independent balls, two action-button slides, five-action state, first input gate | `battle1-swap-enemy-picker.json`, 29810--29939, **130/130** | Covered through enemy-picker entry/input and action-button navigation. |
| Eligible enemy ball -> transition out -> `Swap_AskAcceptMon` -> `Swap_Task_HandleYesNo` | `factorySwapPresentation.test.ts`: early-edge rejection, prompt open/window/palette/button timing | `battle1-swap-enemy-accept-prompt.json`, 29935--30000, **66/66** | Covered. |
| Accept prompt default YES -> `Swap_HandleAcceptMonResponse` -> `Swap_Task_Exit` -> `CopySwappedMonData` -> field callback | `factorySwap.test.ts`: exact party/rental mutation; `factorySwapPresentation.test.ts`: result FALSE + mutation boundary + field handoff | `battle1-swap-enemy-accept-exit.json`, 29999--30041, **43/43** | Covered. |
| Accept prompt NO/B -> `Swap_HandleAcceptMonResponse` -> `Swap_Task_ScreenInfoTransitionIn` -> enemy picker | `factorySwap.test.ts`: no mutation; `factorySwapPresentation.test.ts`: both source-relative return paths and fresh input gate | `battle1-swap-enemy-accept-no-return.json`, 30019--30087, **69/69**; `battle1-swap-enemy-accept-b-return.json`, 30019--30087, **69/69** | Covered. |
| Player picker `CANCEL` / picker B -> transition out -> `Swap_AskQuitSwapping` -> `Swap_Task_HandleYesNo` -> `Swap_HandleQuitSwappingResponse` | `factorySwap.test.ts` only asserts logical `quitPrompt`, keep-party outcome, and originating-picker return. The live state has no source-relative transition, popup renderer, or exit handoff. Also, source player actions contain 4 entries (three balls + CANCEL), while the live player picker exposes `actionsCount: 3`. | No quit/cancel OFF trace. | **Unimplemented unique UI state.** |
| Enemy `PKMN FOR SWAP` action (cursor 3) -> transition out -> `Swap_Task_SwitchPartyScreen` -> player picker | `factorySwap.test.ts` checks five-action cursor wrapping, but `handleFactorySwapInput` returns unchanged for `cursor >= 3`; no selection route exists. | No OFF trace selecting cursor 3. | **Unimplemented unique UI interaction.** |
| Enemy `CANCEL` (cursor 4) / picker B -> quit path | Same logical `quitPrompt` placeholder as above; source's cursor-4 action is not dispatched by the live controller. | No OFF trace. | **Unimplemented; included in quit remainder.** |
| Enemy duplicate -> `Swap_AlreadyHasSameSpecies` -> `Swap_TaskCantHaveSameMons` -> A/B close -> enemy picker | `factorySwap.test.ts` proves eligibility and logical `duplicateSpecies` return only. The live renderer has no message/open/close/return timeline for this phase. | No staged duplicate OFF trace; canonical offered party has no duplicate relative to either non-replaced player slot. | **Unimplemented unique UI state.** |

Source anchors: action arrays at lines 1042--1057; picker/menu/YESNO tasks at
2465--2695; screen transitions at 3001--3250; option/action dispatch at
3983--4062; and duplicate rejection at 4120--4169. In particular,
`Swap_AlreadyHasSameSpecies` intentionally excludes the player slot being
replaced, so only either remaining player party member makes the rejection
reachable.

## Re-run evidence

All commands were run on 2026-07-23 against the selected
`battle-scene-off` oracle. Each exited zero; `--summary` suppresses individual
matching-frame lines only.

| Exact command | Result |
| --- | --- |
| `npm run compare -- tools/compare/traces/battle1-swap-player-picker.json --summary` | **101/101** matched |
| `npm run compare -- tools/compare/traces/battle1-swap-player-options.json --summary` | **58/58** matched |
| `npm run compare -- tools/compare/traces/battle1-swap-player-options-popup.json --summary` | **44/44** matched |
| `npm run compare -- tools/compare/traces/battle1-swap-player-options-b-close.json --summary` | **59/59** matched |
| `npm run compare -- tools/compare/traces/battle1-swap-enemy-picker.json --summary` | **130/130** matched |
| `npm run compare -- tools/compare/traces/battle1-swap-enemy-accept-prompt.json --summary` | **66/66** matched |
| `npm run compare -- tools/compare/traces/battle1-swap-enemy-accept-exit.json --summary` | **43/43** matched |
| `npm run compare -- tools/compare/traces/battle1-swap-enemy-accept-no-return.json --summary` | **69/69** matched |
| `npm run compare -- tools/compare/traces/battle1-swap-enemy-accept-b-return.json --summary` | **69/69** matched |

The nine windows overlap at each handoff and cover every frame in their named
dynamic spans. They establish the implemented accepted route; they do not
implicitly cover a source branch whose control is absent from their button
scripts.

## Precisely bounded next work

Use short state-driven OFF fixtures, preserving the existing post-win prefix
only where it is needed to enter the swap screen:

1. Implement and densely compare the player-summary fade, shared summary
   screen, and `fromSummaryScreen` return.
2. Implement one reusable quit presentation for B and the two CANCEL actions,
   then compare YES exit and NO/B return from both player and enemy origins.
3. Implement and compare enemy `PKMN FOR SWAP` back to player picker.
4. Stage a party containing one offered species equal to a non-replaced player
   species; implement and compare the duplicate message and A/B return.

These are source-named, phase-relative mechanisms. No absolute-tick branch,
oracle framebuffer asset, or additional canonical Battle 2 turn window is
appropriate. After they are green, the seventh-win/round-summary ending would
be the remaining Gate 2 UI obligation.
