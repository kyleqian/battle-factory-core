# aud241a — battle start and send-out sounds (S11 step 5, first slice)

Write-only sound events (`emitSound`, `docs/aud239-sound-events.md`) for every ROM sound of the Factory singles battle start and of send-outs: the battle BGM, the ball tray, `SE_BALL_OPEN` at each release, the send-out cries with their BGM duck and restore, and the same ball-open + cry on mid-battle send-ins (voluntary switch, faint replacement, forced party-menu send-out). No engine state, RNG, kernel `FactoryEvents`, frame hash or pixel changes (`emitSound` is a no-op unless a tick is being collected). Both scenes follow their own presentation timeline: every frame comes from the queue that owns the visual, never from a fixed ON offset.

Out of scope (later slices): effectiveness / faint SE, faint cry, low-HP (aud241b); victory, end fade, battle return (aud241c); move-animation SEs (aud242); playback.

Code: `src/engine/battleStartSounds.ts` (`factoryBattleBgm`, `emitBattleStartBgm`, `emitBattleStartIntroSounds`, `emitMidBattleSwitchSounds`, `emitPartySendOutSounds`), wired in the `soundCollecting()` block of `tick()` in `src/engine/core.ts`; `src/engine/screenSounds.ts` (`cryModeFor`, `playSendOutCry`, `playBallOpenSe`, `startBattleBgm`, the tray ids); `src/engine/battleScene.ts` exports the intro clocks (`generatedBattleStartOpponentHandoffTick`, `generatedPlayerDispatchDelay`, `generatedPlayerVisualLag`) and `ballTraySoundTicks`.

## ROM rules (measured in step mode, then read in the source)

| ROM site | Sound | Ours |
|---|---|---|
| `PlayBattleBGM` at the battle transition start (`m4aMPlayAllStop` of the map BGM, then `PlayBGM`) | `stop` 469 then `bgm` 476 (`MUS_VS_TRAINER`); 471 (`MUS_VS_FRONTIER_BRAIN`) for the Factory Head's class (`GetBattleBGM`) | `startBattleBgm` on the same frame (`emitBattleStartBgm`) |
| Ball tray (`Task_...ShowTray` / `SE_BALL_TRAY_*`) | `SE_BALL_TRAY_ENTER` (114, `PlaySE12WithPanning` pan 0) x2, then per party ball `SE_BALL_TRAY_BALL` (115) and `SE_BALL_TRAY_EXIT` (116) with pan opponent -64 / player +63 | `ballTraySoundTicks(partySummaries)` crossed on `generatedBattleIntroSourceClock` |
| Intro text A | `SE_SELECT` (5) | emitted when `acknowledgedElapsed` is first set |
| Intro opponent release (`SpriteCB_ReleaseMonFromBall` -> `AnimateBallOpenParticles`) | `SE_BALL_OPEN` (15) at handoff + 17 | `generatedBattleStartOpponentHandoffTick + 17` |
| Intro opponent cry (`Task_PlayCryWhenReleasedFromBall` case 0, waits for the affine anim) | cry, pan +25, NORMAL (WEAK if status or low HP), BGM duck 85 on the same frame, restore at cry length + 1 | `playSendOutCry`, +17 after the ball open |
| Intro player release | `SE_BALL_OPEN` at handoff + dispatch delay + visual lag + 77 | `generatedPlayerDispatchDelay` carries go246's Scene ON animation hold, `generatedPlayerVisualLag` the line length |
| Intro player cry | pan -25, +13 after the ball open | same |
| Voluntary recall (`switch-out`) | `SE_BALL_OPEN` 2 ticks into the command (forced removals and `targetAtRest` play none) | `emitMidBattleSwitchSounds`, elapsed 2 |
| Mid-battle send-in release (`switch-in`) | `SE_BALL_OPEN` at command elapsed 47 (player, measured); 18 (opponent, **inferred**, see mismatches); `sendInVisualDelay` shifts both | elapsed `47 / 18 + sendInVisualDelay` |
| Mid-battle send-in cry | 16 ticks after the ball open (the emerge's affine anim); pan -25 player / +25 opponent; mode from `cryModeFor(hp, maxHP, status)`; duck 85 and restore | `playSendOutCry` |
| Party-menu forced send-out (faint replacement / forced selection) | `SE_BALL_OPEN` 143 ticks after the SEND OUT confirm, cry 16 later (pan -25), restore 42 after the cry | `emitPartySendOutSounds` on `partySendOutReleaseClock(sendOutElapsed, timing)`, so a longer nickname (`ballShift`) or CASTFORM's late release (`releaseExtra`) moves both |

Constants: `SE_BALL_OPEN` 15, `SE_BALL_TRAY_ENTER` 114, `SE_BALL_TRAY_BALL` 115, `SE_BALL_TRAY_EXIT` 116, `SE_SELECT` 5, `MUS_VS_TRAINER` 476, `MUS_VS_FRONTIER_BRAIN` 471.

Engine paths: the intro rides `FactoryBattleStartIntroState`; mid-battle switches ride the round's `battleResolutionPresentation` current command; the forced party-menu send-out rides `PartySelectState.sendOutElapsed` on both the canonical route (`battleScene.resolutionOwner.forcedPartySelect`) and the generated route (`factoryRoundBattleOrchestrator.battleForcedPartySelect`). The generated route's selected switch-in command is skipped afterwards, so there is no double emission.

## Fixtures (`tools/audio/soundEventProbe.py`, step mode; embedded key script, no emulator needed by the test)

| Fixture | Staging | Frames | Equality |
|---|---|---|---|
| `intro-yoshi-off-window.json` / `intro-yoshi-on-window.json` | generated route, stage `factory-arbitrary-intro-yoshi-{off,on}` at frame 1171; setup events pin the BGM start (`stop` 469 @991, `bgm` 476 @992) | 678 / 684 | every sound (tray, SE_SELECT, both ball opens, both cries with duck and restore) equal: frame, kind, id, pan, mode |
| `intro-magneton-off-window.json` / `intro-magneton-on-window.json` | same, stage `factory-arbitrary-intro-magneton-{off,on}` at frame 1178 | 689 / 728 | OFF exact; ON exact except the player side is 1 frame early (mismatch 1) |
| `intro-canonical-window.json` | canonical `battle1-swapyes-b` Scene ON lab replay, BGM start through both cries | 930 | **relative only** (no engine replay route): BGM-to-tray gap and tray / release spacing |
| `switch-player-off-window.json` | stage `mid-battle-switch-dense-off`, Scene OFF voluntary player switch RATTATA -> RATTATA, from 800 | 460 | exact: party-menu SE_SELECT 883 / 923 / 963, recall SE_BALL_OPEN 1088, send-in 1187, duck + cry 19 pan -25 @1203, restore 1227 |
| `switch-player-forced-sendout-on-window.json` | canonical-recorded route, Scene ON, forced SEND OUT (MAGBY), from 20760 | 690 | exact: SE_SELECT 20771, SE_BALL_OPEN 20914, duck + cry 240 pan -25 @20930, restore 20972 |
| `switch-opponent-replacement-off-window.json` | lab, Scene OFF opponent faint replacement | | **relative only**: SE_BALL_OPEN 535, duck + cry 66 pan +25 NORMAL @551, restore 590 (spacing 16, the lab has no engine route) |

`tests/aud241aBattleStartSounds.test.ts` (27 tests) replays each embedded key script and requires our events to equal the ROM's over the whole window; pins state neutrality (collecting sounds leaves the engine state byte-identical) for the exact windows; the BGM setup pin; the tray spacing and BGM-to-tray gap on the relative fixtures; and Tier-1 emitters on synthetic clocks (mid-battle send-in spacing, player pan and `sendInVisualDelay`, WEAK mode, the 471 duck, recall vs forced removal; party-menu send-out clock, `ballShift`, WEAK, 471, no sound on the cancel row). `tests/audioProbeFixtures.test.ts` lists the new fixtures; `tests/audioSinkNeutral.test.ts` now allows SE 5 / 15 / 114 / 115 / 116 and the stop / bgm / cry / duck kinds from the screen and battle-start sinks.

## Flow mismatches (recorded, not fixed)

1. **Magneton ON, player side 1 frame early.** Ball open, cry and restore of the player's side are one frame before the ROM (go246's animation hold); the opponent side and everything else are exact. The fixture test pins the shift.
2. **BGM to tray gap.** The labs measure 348 / 359 / 368 / 374 frames from the BGM start to the first tray ENTER; the engine uses 359 (equal to the canonical lab). The lab's `stop` / `bgm` are 0 or +1 frame apart; ours are on the same frame.
3. **No engine-replayable BGM window.** The canonical-recorded route has no intro state, so the canonical intro fixture is relative only; the BGM start is pinned by setup events on the generated windows and by a Tier-1 test.
4. **Old d4a `battle-intro-window{,-off}.json`** fixtures are checked relatively (tray spacing, ON - OFF = the 48-tick hold).
5. **The intro `SE_SELECT` is emitted here** (the A that dismisses the intro text); the fight-menu SE_SELECTs at 1 / 21 / 723 / 763 of the dense switch lab are not part of this step.
6. **Frontier Brain 471 is Tier-1 only**, and so is the WEAK send-out cry (no stageable ROM window in the time). WEAK restore is scheduled only for Onix (cry length known: 95 -> 78); other WEAK cries get the duck but no restore.
7. **RandomPlayer presses** shift the tray clock by a tick, so the tray comparison in the 359-gap test uses the first 9 events.
8. **Opponent mid-battle release placement (elapsed 18) is inferred**, not proven: the mon is visible at 19 and the release is one tick earlier (the same relation as the player's 48 / 47). Only the ROM's SE-to-cry spacing (16, pan +25, NORMAL) is pinned, relatively. The lab has no engine route and its documented frame numbers did not agree with the model.
9. **Scene ON mid-battle voluntary and opponent timings are unprobed.** The ON proof is the canonical forced send-out and the intro windows only.
10. **An opposing switch-in inside the forced-selector prefix** is consumed by the selector renderer and gets no sound.
11. **Baton Pass hidden-attacker recall** (the semi-invulnerable hidden path) is not distinguished from a plain recall.
12. **Not fixtured:** the generated route's forced party-menu send-out (it shares `emitPartySendOutSounds` and the same clock, proven on the canonical route) and the faint-replacement send-in of the generated route's `switch-in` command.

## Verification

- Tested code commit `abe35f729c65ab19e7ef688d74ce18df4142a7b3`, tree `501bdd36afcfb427f5c895d3e64e785c5a09de89` (parent chain `203a4957a` intro, `be331d6ad` mid-battle switch, `abe35f729` party-menu send-out; base `de7557c52`). This doc is committed after it and changes no code.
- `npm run typecheck`: 0.
- `tests/aud241aBattleStartSounds.test.ts` (27), `audioProbeFixtures`, `aud240a`-`aud240d`, `audioAnimSoundPan`, `audioHeadlessBoundary`, `audioSinkNeutral`, `audioSinkPlumbing`, `audioSoundSources`, `battlePartySelect`, `partySelect`, `presentationRngSession`, `factoryRoundBattleOrchestrator`, `factoryBattleStartIntroAckAlignment`, `issue56ActionMenuHandoffFrame`, `battleScriptAudioCommands`: 17 files, 233 tests, pass (the final run of the party-menu slice).
- `npm run test:smoke`: 8 files, 448 tests, pass.
- `npm run build`: 0. `npm run build:lib`: 0.
- Gate-6 manifest regenerated with `NODE_OPTIONS=--max-old-space-size=8192 node --experimental-strip-types tools/report/gate6-coverage-manifest.ts`: byte-identical, so no new file is listed.
- `npm run compare:differential` vs the parent `de7557c52`: **not the whole standard set** (211 traces do not fit the time). Run: 16 traces, **4,668 / 4,668 captures byte-identical**: `fight-submenu`, `battle1-postwin-next-prompt`, `presentation-rng-playable-live-bodies-seeded-on`, `battle2-intro-dense`, `factory-arbitrary-intro-{yoshi,magneton}-off`, `interactive-generated-intro-off`, `turn13-switchin`, `turn5-switchin` (3,592) and `turn15-party-select{,-delayed}`, `turn13-dragonbreath-faint`, `turn5-faint`, `factory-brain-silver-walkup-swapask-no-off`, `battle1-swap-{player,enemy}-picker` (1,076).
- Full `npm test` is left to the supervisor.
