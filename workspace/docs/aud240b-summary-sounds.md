# aud240b — summary-screen sounds (S11 step 4, second slice)

Write-only sound events for the summary screen through `emitSound` (`docs/aud239-sound-events.md`): `SE_SELECT`, the mon cry (NORMAL / WEAK), the BGM duck and restore around a cry, and the cry stop. Entries: draft SUMMARY, the swap player-summary, and the in-battle party SUMMARY (sum241). No engine state, RNG, kernel `FactoryEvents`, frame hash or pixel changes, except one behaviour fix: **A on the Info page closes the summary** (ROM does; ours did not on the draft and swap screens, the in-battle summary already did).

Code: `src/engine/screenSounds.ts` (emitters and the scheduled-sound queue), `src/engine/summaryScreen.ts` (the six `playSelectSe()` sites), `src/engine/core.ts` (draft and swap callers, tick hooks), `src/engine/battlePartySummary.ts` (in-battle caller). The headless graph is unchanged (still only `src/audio/soundEvents.ts` under `src/audio/`); `SoundEvent.id` became `number | null` and gained `player` so the song-less cry stop can be represented.

## Sound census (pokemon_summary_screen.c)

| ROM site | Event | Ours |
|---|---|---|
| `Task_HandleInput` B (and A on Info) | `PlaySE(SE_SELECT)`, then the close task | `requestSummaryScreenExit` accepted branch |
| page change (L/R, only if the page changes) | `SE_SELECT` | `requestSummaryPageChange` after the `!toPage` check |
| mon change (UP/DOWN, only if the mon changes) | `SE_SELECT`, +1 `StopCryAndClearCrySongs`, then the cry | `requestSummaryMonChange` after the slot bounds check |
| move select: enter (A on a moves page) / cursor / close | `SE_SELECT` each | `requestSummaryMoveSelect`, `requestSummaryMoveSelectionChange` (before the CANCEL-row test), `requestSummaryMoveSelectClose` |
| `SpriteCB_Pokemon` -> `PlayMonCry` (`:3968-3971`) | duck 85, `PlayCryInternal` (NORMAL or WEAK) | `scheduleSummaryOpenCry` |
| close path (`:1523-1524`, `ShowPokemonSummaryScreenHandleDeoxys`) | `StopCryAndClearCrySongs`, `m4aMPlayVolumeControl(BGM, ALL, 0x100)` unconditionally | `closeSummarySounds` |
| `Task_DuckBGMForPokemonCry` | `0x100` restore once `IsCryPlaying` is false | the restore scheduled by `playCry`, or the stop |
| swap failure `SE_FAILURE` (32) | not reachable: the LOCK_MOVES draft/battle summary has no move swap | no branch, no event |

Mode choice follows `ShouldPlayNormalMonCry`: any status, or an HP bar at yellow or worse (`floor(hp*48/maxHp)`, minimum 1 when hp > 0, at most 24), plays `CRY_MODE_WEAK` (**11** in `constants/sound.h`).

## ROM timing rules (frames after the accepted input P, oracle stepping mode, Scene ON)

- Open cry: P+63 (`SpriteCB_Pokemon`, once the entry palette fade is inactive). In-battle opens at the party-menu A the same way.
- Mon change: stop at P+1; cry at P+21 on the Info page, P+22 on the other pages.
- Close: stop plus an unconditional `0x100` duck at P+22.
- Restore after a NORMAL cry: cry start + `SEND_IN_TAIL_OFF_CRY_FRAMES[species]` + 1 (`src/data/sendInTailOff.ts`). A stop that cuts the cry makes the duck task restore on the stop frame, after the stop event.
- A close accepted on or before the open-cry frame preempts that cry (`Task_HandleInput` runs before the sprite callback): fixtures `summary-close-at-cry` (B at P+63, no cry) and `summary-close-during-cry`.
- BGM ids are constants because the engine has no BGM state: draft and swap `469` (MUS_B_FACTORY, both seen in ROM windows), in-battle `476` (MUS_VS_TRAINER).

## Fixtures and proof

All fixtures are step-mode `tools/audio/soundEventProbe.py` output on the ON oracle (`http://127.0.0.1:8012`, profile battle-scene-on), with the producing trace embedded (`trace.route`, `trace.segments`). `tests/aud240bSummarySounds.test.ts` replays each trace and requires our events to equal the ROM's `(frame, kind, id, pan, mode, volume, priority)` over the whole window, cry frames included; `tests/audioProbeFixtures.test.ts` lists them.

| Fixture | Window |
|---|---|
| `summary-draft-window` | draft anchor, frames 1-900: open, open cry, page changes, 7 mon changes with cries, move-select cursor and close, B close |
| `summary-swap-window` | swap player-summary (battle1-swapyes-a prefix, from 29759): open SE, open cry (BGM 469), **A on Info closes**, stop plus restore |
| `summary-party-window` | in-battle party SUMMARY (turn15-party-select prefix, from 20258): open cry, three mon changes incl. a WEAK Onix cut by a stop, B close |
| `summary-party-weak-window` | same route, undisturbed WEAK Onix cry: restore at +79 |
| `summary-close-at-cry`, `summary-close-during-cry` | close racing the open cry |

Result: all windows equal except the single deviation below. The WEAK Onix cry measures 78 frames (restore 20448 = cry 20369 + 79); other WEAK species have no measured length, so no restore is emitted for them (`WEAK_CRY_FRAMES` in `screenSounds.ts`).

### Documented deviation (+1)

The first mon change in the draft window starts its Info-page cry at P+20 in the ROM (f148) and P+21 in ours (f149). Every other Info-page change (draft f210, f233, f294; party f20369, f20461) is P+21 in the ROM, so ours uses 21. The ROM value wobbles by one frame; the likely cause is the main-loop lag from the m4a mixer load and the absolute frame, but no rule was found. The test pins this one difference explicitly (the duck and the cry at 149 vs 148).

### Probe bug found

`CRY_MODES` in `tools/audio/soundEventProbe.py` had `WEAK` and `WEAK_DOUBLES` swapped (`constants/sound.h`: WEAK 11, WEAK_DOUBLES 12), so weak cries were labelled `WEAK_DOUBLES`. Fixed; no committed fixture carried either label before this step.

## Behaviour change and capture differential

A on the Info page now closes on the draft and swap screens (`requestSummaryScreenExit`). Elsewhere A still enters move select.

- `npm run compare:differential` vs the parent `88c1d309e`: PASS, **2064 / 2064** across 24 traces (`summary-*`, `draft-*`, `turn15-party-select*`) and **2313 / 2313** across 24 traces (`battle1-swap-*`, `battle1-postwin-*`): no standard trace presses A on Info.
- A scratch trace (draft open, then A on Info, not committed) differs from the parent from frame 130 on (9 of 11 captures): the summary closes (transition) where the parent stayed open. That is the intended change.

## Gaps found, not fixed (outside this step)

- Our draft cursor does not follow `gLastViewedMonIndex` after returning from the summary: on reopening, the second open cry was the previous slot's mon, ROM played Quilava. The draft window therefore ends at f900.
- Summary input readiness: the ROM accepts input from open+63, ours from open+59. An early B (open+59..62) closes in ours and is rejected by the ROM. Sounds follow our acceptance.
- The swap summary supports only open and close in ours (no mon change); a ROM window with a DOWN is not reproducible.
- The in-battle summary approximates the entry and exit fades.
- WEAK cry length is measured for Onix only; other species skip the restore.
- BGM ids are constants (no BGM state); the swap id was seen as 469 in `summary-swap-window`, but only on that route.
- Scene OFF was not captured on the ROM; the summary code has no Scene branch and `tests/audioSinkNeutral.test.ts` (ON and OFF) still passes.
- Party-menu SEs (`20191/20206/20246/20257` in the party route) are aud240c; the party fixtures start after them.

## Verification

Tested code commit `7b4ebe41f` (tree `dcdcad4a4`); later commits only add this document and a verification note.

- `npm run typecheck` 0.
- `npm run test:smoke` 0 (8 files, 448 tests).
- Every test file importing a touched module (find via `git grep` on summaryScreen / battlePartySummary / screenSounds / soundEvents / partySelect / battlePartySelect): 41 files, 504 tests, all passing, including `aud240aScreenSounds`, `aud240bSummarySounds`, `audioProbeFixtures`, `audioHeadlessBoundary`, `audioSinkNeutral`, `sum241PartyActionWindow`, the summary and party suites. Full `npm test` was not run, per the step's instructions (the verification contract would normally require it for an engine seam).
- `npm run build` 0, `npm run build:lib` 0.
- `npm run compare:differential`: above.
