# aud240c — battle party-menu sounds, voluntary and forced (S11 step 4, third slice)

Write-only sound events (`emitSound`, `docs/aud239-sound-events.md`) at every `party_menu.c` / `menu.c` sound site reachable on the two Factory battle party menus: the voluntary POKéMON menu (`src/engine/battlePartySelect.ts`) and the forced SEND_OUT menu (`src/engine/partySelect.ts`). No engine state, RNG, kernel `FactoryEvents`, frame hash or pixel changes; both scenes identical (the differential below). Out of scope: lobby / scripts (aud240d), battle controller sounds (aud241, including the SE of the A that dismisses the battle message before the forced menu), playback, ISSUES #191 / #192.

Code: `src/engine/screenSounds.ts` gained `SE_FAILURE = 32` and `playFailureSe()` (pan-less `PlaySE`, next to `playSelectSe`); the callers are the two input handlers above. `factoryRoundBattleOrchestrator.ts` has no other cancel site: both handlers are called directly from `advanceFactoryRoundBattleCommand` and the forced-party-handoff phase, so no extra emitter is needed there.

## ROM rules (measured in step mode, then read in the source)

| ROM site | Sound | Ours |
|---|---|---|
| list cursor move (`ChangeBattlePartySelection` / `HandleChooseMonSelection` -> `MoveCursorToConfirm` / `PlaySE` only when `slotId` changed) | `SE_SELECT` once, only if the cursor moved (LEFT from slot 0 is silent) | `moved.cursor !== state.cursor` |
| A on a mon (`Task_HandleChooseMonInput` -> `CreateSelectionWindow`) | `SE_SELECT` once, window opens | list A branch |
| action-window cursor (`Task_HandleSelectionMenuInput` -> `Menu_ProcessInputNoWrap`) | `SE_SELECT` only if the cursor moved: silent at the top and bottom ends | `actionCursor !== state.actionCursor` |
| action-window A (`InitMenuInUpperLeftCorner(..., APressMuted = TRUE)`) | **one** `SE_SELECT` (the brief predicted two; the ROM disproves it: the menu's own A is muted, the callback plays one) | one SE after the cancel guard, before the CANCEL / SUMMARY / SEND OUT / refusal branches |
| action-window B | **two** `SE_SELECT` on the same frame (`Menu_ProcessInput` plus `CursorCb_Cancel`'s own `PlaySE`); the second appears as a `noop` call in the probe | two SEs, then the window closes |
| voluntary list B or A on CANCEL | one `SE_SELECT` (default cancel path), menu closes | one SE, outcome `cancel` |
| forced list B or A on CANCEL (`ForcedSwitch` / `CANCEL` has no cancel route) | `SE_FAILURE` (32), the menu stays open | `playFailureSe()`, state unchanged |
| refusal message dismiss (`text.c` `TextPrinterWait`) | `SE_SELECT`, only once the text has finished printing | one SE on A or B |
| SUMMARY from the action window | the action-window A SE (one); the summary's own sounds are aud240b's | no extra emit |
| any input while `gPaletteFade.active` (the open fade) | ignored by the ROM | voluntary menu: SEs are gated on `openElapsed >= PARTY_SELECT_OPEN_TOTAL_FRAMES`; forced menu: the existing `PARTY_LIST_INPUT_ELAPSED` early return |

Constants: `SE_SELECT` 5, `SE_FAILURE` 32 (`include/constants/songs.h`).

## Fixtures (ON oracle, `tools/audio/soundEventProbe.py`, step mode)

| Fixture | Staging | Frames | Events |
|---|---|---|---|
| `party-forced-window.json` | canonical `turn15-party-select` (Onix fainted); window opens at the A (frame 19991) that dismisses the faint message | 819 | 25: list moves, B and A-on-CANCEL SE_FAILURE x2, the action window (cursor, NoWrap silent ends, A, the double-SE B), the refusal dismiss |
| `party-voluntary-window.json` | mechanicLab request, three RATTATA (slot 0 active, slots 1 and 2 legal), DOWN + A on the fight menu opens the menu at lab frame 41 | 839 | 25: row moves incl. LEFT / RIGHT no-moves, the action window, the double-SE B, the refusal and dismiss, A on CANCEL |
| `party-summary-entry-window.json` | the forced menu: DOWN, A, DOWN to SUMMARY, A | 360 | 9: three SEs, the single SUMMARY A, then only aud240b's cry / duck / close sounds (no doubling) |

`tests/aud240cPartyMenuSounds.test.ts` replays each fixture's embedded key script (the forced and SUMMARY windows through the full `tick`, the voluntary one through `advanceBattlePartySelect` on a live selector) and requires our `(frame, kind, id, pan)` events to equal the ROM's over the whole window. It also pins state neutrality (collecting sounds changes nothing) and the Tier-1 branches: NoWrap, LEFT / RIGHT no-move, the forced SE_FAILURE with the menu unchanged, the two-SE B, the open-fade gate. `tests/audioProbeFixtures.test.ts` lists the three new files.

## Flow mismatches (recorded, not fixed)

- **Refusal dismiss timing.** The ROM ignores A / B while the refusal text is still printing; ours dismisses the message on the first A or B. The sound is correct whenever the dismiss comes after the text has finished (the fixtures press 99 frames after the refusal). Making the dismiss wait for the print is a presentation change, so it is left for a flow step.
- **Input during the voluntary open fade.** Ours still moves the cursor on keys pressed before the fade completes (pre-existing); the ROM ignores them. Only the sound is gated here, behaviour is untouched.
- **Battle-message A before the forced menu** belongs to the battle controller (aud241), not to this slice.

## Verification

- Tested code commit `b3dbecbd4d1bbbb88d58ac11507bb5072198cfc2`, tree `23306007db8ada2318ccf90f5f99bf5a79eda341` (parent `d11b22e2a`; this doc is committed after it and changes no code).
- `npm run typecheck`: 0.
- `tests/aud240cPartyMenuSounds.test.ts` (14 tests) and `tests/audioProbeFixtures.test.ts`: pass.
- `npm run test:smoke`: 8 files, 448 tests, pass. Every test importing `battlePartySelect` / `partySelect` / `screenSounds` (28 files, 389 tests, plus `randomRoundSoakOracleStrength`, 4 tests) and `audioSinkNeutral` / `audioHeadlessBoundary`: pass. `tests/gate6CoverageManifest.test.ts`: pass (run with `NODE_OPTIONS=--max-old-space-size=8192`).
- Gate-6 manifest regenerated with `tools/report/gate6-coverage-manifest.ts`: byte-identical, so no new file is listed (it only lists mechanics evidence tests, not audio tests).
- `npm run build`: 0. `npm run build:lib`: 0.
- `npm run compare:differential` vs the parent `d11b22e2a`, all 211 standard traces (run as five chunks to fit the 10-minute command limit): **PASS, 38,532 / 38,532 captures byte-identical**.
