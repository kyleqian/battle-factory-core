<!-- Read-only worker report (aud241c scout, 2026-11-05, Sonnet 5.5, 14 min; probe outputs /tmp/aud241c-scout copied to .integration/validation/sv-20261104/aud241c-scout-scratch). Saved verbatim by the supervisor; UNVERIFIED — ON windows were hybrid (no no-ops); re-probe in step mode before pinning. -->

# aud241c scout report: battle-end and return sounds

Nothing in the repo was touched: `git status` is clean, and I made no edits or commits. The probes used step mode for the OFF windows and hybrid for the ON windows, so the ON windows have no no-ops. All probe output is under `/tmp/aud241c-scout`.

I ran out of time before verifying the ON Brain win, an ON step window and the aud241c-win-on lab, so those are open. The ON win and loss were checked in hybrid only.

## 1. Ordinary win

Frames are absolute ROM frames. They come from `soundEventProbe.py` step windows. P is the frame of the SE_SELECT that dismisses the trainer's lose text.

| Event | OFF Explosion lab | OFF Rattata lab | ON Rattata lab (hybrid) |
|---|---|---|---|
| Faint cry | 3487 (cry 198, pan +25, duck 85) | 1392 | 2189 |
| Duck restore | 3545 | 1420 | 2217 |
| **SE_FAINT** | **3553** | **1458** | **2255** |
| SE_SELECT (A on "fainted!") | 4207 (+654) | 1501 (+43) | 2301 (+46) |
| no-op stop 90 (`BattleStopLowHpSound`), same frame as the BGM | 4225 | 1523 | not captured |
| **bgm 412** (`MUS_VICTORY_TRAINER`) | 4225 (select +18) | 1523 (select +22) | 2323 (select +22) |
| SE_SELECT | 4609 | 1601 | not captured |
| **P** | 5011 | 1701 | 2501 |
| fade 412, out speed 5 | P+6 | P+6 | P+6 |
| no-op stop 90 (`SpecialStatusesClear`) | P+43 | P+43 | not captured |
| **bgm 469** | P+53 | P+53 | P+53 |
| **SE_EXIT 9** | P+79 | P+79 | P+79 |

- The tail from P onward is identical in ON and OFF. The A-gated frames before P are input-dependent.
- Between the victory BGM and P there are only the two A-driven SE_SELECTs. The first dismisses PLAYERDEFEATEDTRAINER1 and the second dismisses TRAINER1LOSETEXT.
- I found no money or pickup sound in the Frontier path. `BattleScript_FrontierTrainerBattleWon` is at battle_scripts_1.s:3027-3048.
- `HandleEndTurn_BattleWon` is at battle_main.c ~4959-4981. It calls `BattleStopLowHpSound` and then PlayBGM(412).
- `HandleEndTurn_FinishBattle` is at battle_main.c ~5144. It calls `FadeOutMapMusic(5)`.
- The last faint has no ball-tray sounds and no replacement cry. Intermediate faints have SE_BALL_TRAY_ENTER (114), SE_BALL_OPEN and a replacement cry.
- **Unresolved:** the SE_SELECT-to-victory-BGM gap is +18 in the Explosion lab (a self-faint) and +22 in both Rattata labs. I reproduced the +22 in a step window in OFF, so it is not a hybrid artefact. The likely cause is a self-faint versus an attacker faint, but I didn't test it. The worker should use +22 for the attacker-faint path. Anchor the BGM to the dismiss edge (below) and don't hard-code a gap.

## 2. Loss

Probe: OFF Explosion lab `loss-terminal-explosion-dusclops-off`, in step mode. ON was run in hybrid with doubled idle gaps.

| Event | OFF | ON |
|---|---|---|
| Faint cry | 2809 | 5495 |
| Duck restore | 2867 | 5553 |
| **SE_FAINT** | **2875** (pan -64) | **5561** |
| no-op stop 90 (low-HP loop handler) | 2875 and 2891 | not captured (hybrid) |
| SE_SELECT (A on "fainted!") | 2929 | 5729 |
| **SE_BALL_OPEN 15** (opponent's mon returns to its ball) | 2953 (select +24) | 5753 (+24) |
| no-op duck 256 | 2981 | not captured |
| **P** | **3231** | **6331** |
| fade 476 (`MUS_VS_TRAINER`) | P+6 | P+6 |
| no-op stop 90 | P+43 | not captured |
| bgm 469 | P+53 | P+53 |
| SE_EXIT 9 | P+79 | P+79 |

- There is no victory BGM and no `BattleStopLowHpSound` at the loss start. Only `FadeOutMapMusic(5)` fades the battle BGM.
- After P+79 comes SE_SELECT at 3533. That is the lobby script, already covered by `loss-terminal-window.json`.
- The loss path is `BattleScript_LocalBattleLost` (battle_scripts_1.s:2945) and then `BattleScript_LocalBattleLostPrintTrainersWinText`.

## 3. Frontier Brain win

The Brain win is stageable in OFF. I used `/tmp/aud241c-scout/labs/aud241c-brain-win-off.json`: a factoryBrain lab, challengeNum 2 (silver), `overrides.parties` with opponent mons at level 12 and Seismic Toss Rattata player mons at level 50, and the A-cadence trace. I did not run the ON variant.

| Event | OFF (step) |
|---|---|
| SE_FAINT | 1458 |
| SE_SELECT | 1501 |
| no-op stop 90 and **bgm 354** (`MUS_VICTORY_GYM_LEADER`) | 1523 (+22) |
| P | 1701 |
| fade 354 | 1707 (P+6) |
| no-op stop 90 | 1744 (P+43) |
| bgm 469 | **1753 (P+52)** |
| SE_EXIT | **absent** |
| stop 469 and fanfare 466 (`MUS_OBTAIN_SYMBOL`) | 1920 |
| fanfare-end continue 469 | 2238 |

- The Brain win differs from the ordinary win in four ways.
  - The victory BGM is 354 instead of 412.
  - The fade is of 354.
  - bgm 469 comes at P+52, not P+53. This is one frame earlier and I have not explained it.
  - There is no SE_EXIT at P+79.
- The first SE_EXIT in the window is at 2502. That is a later script SE, not the return.
- The battle BGM is 471, as the ducks show.
- The symbol ceremony follows.
  - Its fanfare 466 at 1920 is P+219.
  - The later SE_SELECTs, SE_EXIT and fanfare 459 are the script, which is aud240d territory.
- Treat the Brain tail as its own acceptance window, not as the ordinary win with 354 swapped in.

## 4. Code ownership

**What our timeline already has.** The generated route already models the A-gated terminal messages and the trainer slide:
- `battleResolutionPresentation.ts:1740` `TERMINAL_SEAM_BUTTON_MESSAGE_IDS` covers PLAYERDEFEATEDTRAINER1, TRAINER1LOSETEXT and TRAINER1WINTEXT.
- `battleResolutionPresentation.ts:4441` makes those messages `advance: "button"`.
- `battleResolutionPresentation.ts:4483-4489` emits the `trainer-slide` command with `TRAINER_SLIDE_TIMING` (:1730, 38 frames).
- The "fainted!" box dismiss is `awaiting-message-dismiss`.
- The faint cry and SE_FAINT are already emitted by `battleHitSounds.ts:83-92`.

| ROM frame | Owner | State edge, or derived clock |
|---|---|---|
| SE_FAINT | `battleHitSounds.ts:88-92` | Exists (aud241b). |
| Dismiss SE_SELECT on "fainted!" | the A edge of `awaiting-message-dismiss` (`factoryRoundBattleOrchestrator.ts` ~2731-2774) | Exists. SE_SELECT is pan-less. Check whether aud240d's `playSelectSe` already fires for these dismisses. I did not trace it. |
| Victory BGM, and the stop 90 if the loop was playing | The message-dismiss edge that moves the presentation into the terminal message segment | No tick edge at +22. Needs a derived delay from the dismiss edge. |
| Dismiss SE_SELECTs for the two terminal texts, and P | Same `awaiting-message-dismiss` mechanism | Exists. P is the dismiss of TRAINER1LOSETEXT. |
| Fade at P+6, bgm 469 at P+53 (Brain +52), SE_EXIT at P+79 | Creation of the postwin or return hold at `core.ts:1138-1172` (`createPostwinStateFromRound` for `battleWon`; `createBattleReturnHoldState` for `roundLost` or `roundCompleted`). `roundController.ts:515` issues `battleWon`. | The creation edge is P. The offsets are derived clocks (use `scheduleAfter`). The no-op stop 90 at +43 needs no emission. |
| Loss SE_BALL_OPEN at dismiss +24 | The `returnopponentmon1toball` equivalent in the loss segment | Check whether a `ball-return` command exists for the opponent mon. I did not trace this. If not, it is a derived +24 clock from the "fainted!" dismiss. |

The canonical battleScene route also creates the postwin and loss state, at `core.ts` ~2040-2080 (`storeBattleTerminalPresentationDismiss(...,"loss",...)` then `createPostwinState`), plus `core.ts:1469`, `1886`, `1895`, `3589` and `4111`. The terminal-presentation route (`core.ts:1130-1133` and `1160`) goes through `createFactoryTerminalPresentation`.

The sound hooks live in the `soundCollecting()` block at `core.ts:1040-1100`, with `scheduleTerminalStepSounds` at `core.ts:1256`.

## 5. Proposed aud241c step

Target: 100-120 minutes.

1. **New `src/engine/battleEndSounds.ts`**, modelled on `battleHitSounds.ts`. Call it from the `soundCollecting()` block at `core.ts:1065` with the same before/after presentation pair.
   - It detects the dismiss edge of the final-faint message when the segment's `battleWon` outcome is set.
   - On that edge it schedules the stop 90 and `playBgm(frontierBrain ? 354 : 412)` after the delay. Use +22, and keep the +18 as a flagged exception.
   - The stop 90 is a real stop only if the aud241b low-HP loop flag is set. Clear that flag here (see `docs/aud241b-battle-sounds.md:74`).
2. **Return clock at P.**
   - At the postwin or return-hold creation sites (`core.ts` ~1138-1172, plus the canonical route ~2040-2080), emit:
     - fade 412 or 354 or 476 at P+6,
     - bgm 469 at P+53 (P+52 for the Brain),
     - SE_EXIT at P+79 (not for the Brain).
   - Add `SE_EXIT=9` and a fade helper in `screenSounds.ts`. The `fade` kind already exists in `soundEvents.ts`.
   - The fade id must be the id that is actually playing: 412 or 354 on a win, 476 on a loss.
3. **Loss.**
   - Emit SE_BALL_OPEN at dismiss +24.
   - Emit no victory BGM and no stop.
4. **Staging.** `tools/compare/appTrace.ts` `aud241bStage` calls `midBattleSwitchStage` with `trainerBenchHp: [105,105]`. A win stage needs a new option, such as a bench HP of 0 or a one-mon trainer. The existing `win-terminal-window-off` and `loss-terminal-window-off` stages are OFF-only and use a scaffold battle.

**Acceptance windows (fixtures to add):**

| Fixture | Scene | Window | Must show |
|---|---|---|---|
| `aud241c-win-off` | OFF | lab aud241c-win-off, ~1380-1820 | SE_FAINT 1458, bgm 412 +22 after the select, fade P+6, bgm 469 P+53, SE_EXIT P+79 |
| `aud241c-win-on` | ON | lab aud241c-win-on, ~2150-2640 | same tail, hybrid-comparable |
| `aud241c-loss-off` | OFF | lab loss-terminal-explosion-dusclops-off from ~2300 | SE_BALL_OPEN +24 after the select, fade 476 P+6, bgm 469 P+53, SE_EXIT P+79 |
| `aud241c-brain-off` | OFF | lab aud241c-brain-win-off, ~1380-1930 | bgm 354 +22, fade 354 P+6, bgm 469 P+52, no SE_EXIT, fanfare 466 at 1920 |

I did not run an ON Brain win. An ON loss exists in hybrid only, and the lab needs doubled idle gaps.

## Risks

- **Input-dependent frames.** The A-gated dismiss frames are input-dependent, so the lab traces fix the cadence. Don't compare absolute frames outside the cadence.
- **+18 versus +22 victory-BGM gap.** Unexplained: the ordinary-win +22 is reproduced, and the +18 appeared only in the self-faint Explosion lab.
- **Brain +52 and no SE_EXIT.** I measured these in one OFF lab only.
- **Hybrid versus step.** Hybrid drops no-ops, so the ON stop 90 (at the win and at P+43) is untested. The ON frames match OFF everywhere I could compare.
- **ON loss lab.** The ON loss lab is fragile. The OFF-tuned trace derails on ON, and the doubled-idle trace is what completes it.

## Probe outputs (copied to `.integration/validation/sv-20261104/aud241c-scout-scratch/`)

- `show.py`
- `labs/`: `aud241c-win-on.json`, `aud241c-win-off.json`, `aud241c-loss-on.json`, `aud241c-loss-off.json`, `aud241c-loss-expl-on.json`, `aud241c-brain-win-on.json`, `aud241c-brain-win-off.json`
- Step probes: `win-explosion-off-step.json`, `win-explosion-off-faint-step.json`, `loss-explosion-off-step.json`, `rattata-win-off-step.json`, `brain-win-off-step.json`
- Hybrid probes: `win-on-hybrid.json`, `win-off-hybrid.json`, `loss-on-hybrid.json`, `loss-off-hybrid.json`, `loss-expl-on-hybrid.json`, `loss-expl-on2-hybrid.json`, `brain-win-off-hybrid.json`
- Each probe also has a `.log` file.

The `aud241c-loss-on.json`, `aud241c-loss-off.json` and `loss-expl-on-hybrid.json` outputs are partly derailed, as noted above. The labs `aud241c-loss-expl-on.json` and `aud241c-brain-win-on.json` are the ones I'd keep: the first completes the ON loss, and the second is an untested ON Brain lab.
