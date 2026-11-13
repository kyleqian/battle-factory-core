# enc276: a forced turn goes from FIGHT straight into the turn (no move menu)

ISSUES #213, `docs/factory-finish-scope.md` (presentation corrections; same rules in Scene ON and OFF).

## The change

ROM `HandleTurnActionSelectionState` (battle_main.c:4182-4197): when `AreAllMovesUnusable` the turn goes to
`BattleScript_NoMovesLeft` (Struggle), and with an active Encore the move is auto-confirmed. Neither opens the move menu.
The app used to open the fight menu anyway and wait for a move press.

Now (the decision set is unchanged; only the presentation step is skipped):

- **Encore**: the FIGHT press submits the Encored move (`forcedMove.kind = "encore"`) with no fight-menu phase.
- **Struggle**: the FIGHT press enters the `no-moves-message` phase, printing "<mon> has no moves left!". An A press is ignored
  until the wait arrow is up (`NO_MOVES_MESSAGE_HOLD_AT = 29`), then the dismissing A submits Struggle. The wait arrow is frozen
  through the dismiss hold (`NO_MOVES_DISMISS_HOLD_FRAMES = 9`), the sprite bounce stops at press+6
  (`NO_MOVES_BOUNCE_STOP_AFTER`), and the first glyph lands at +3 (`NO_MOVES_MESSAGE_FIRST_GLYPH_AT`).
- Kernel predicate: `battleScriptForcedMoveSelection` (rules context -> `"encore" | "struggle" | null`).
- Resolution handoff carries `confirmHandoff.forced = {kind, holdRemaining, waitCursorAge}` so the box keeps the typed lines and the frozen arrow
  into the turn (`battleResolutionPresentation.ts`, `...Render.ts`, `battleScene.ts` `forcedBottom`).

Files: `src/engine/battleCommandPresentation.ts`, `factoryRoundBattleOrchestrator.ts`, `battleResolutionPresentation.ts`,
`battleResolutionPresentationRender.ts`, `battleScene.ts`, `tools/compare/appTrace.ts` (4 new APP_STAGES, `enc276Stage`, stage option
`laterTurnsUsedMessageHoldFrames`).

## ROM windows (`npm run compare -- <trace> <out> --summary`)

One Encore and one Struggle turn, both scenes. Traces: `tools/compare/traces/enc276-{encore,struggle}-{on,off}.json`
(labs `tools/battle-lab/enc276-*.json`).

| Trace | matched / captures |
|---|---|
| enc276-encore-off | 181/189 |
| enc276-encore-on | 46/189 |
| enc276-struggle-off | 158/189 |
| enc276-struggle-on | 116/189 (58/189 with the ON later-turn hold at 0) |

Every residual frame:

- **encore-off**: frame 403 (sprite bounce stop, 538 px, 1 frame); frames 626, 628-638 (later-turn text, 29..753 px).
- **encore-on**: frames 698-702 (bounce stop, 538 px); frames 729+ are the Scene ON SPLASH hop body, which the app's staged route does not play,
  and the message-to-message hold differs (hold 39 gives the next text at 898 vs ROM 858). The forced-turn handoff text 703-735 matches. Not caused by this change.
- **struggle-off**: frames 398, 407, 416, 425 (idle-bounce phase 1 frame off; it starts before the A press at 400, so it is a pre-A turn-1 timing
  artifact); frames 598-650 (HP drain / recoil timing after the Struggle animation; the animation 452-597 matches). Likely generic Struggle
  damage/recoil presentation, pre-existing, not analyzed (Mac lane / presentation follow-up).
- **struggle-on**: handoff and text match (frames 704-784). Bounce phase offsets of 2-3 frames (turn 1 has no SPLASH body in the app); the app's
  Struggle Scene ON body starts 8 frames early (a generic body-start residual, the harness applies an 8-frame later-turn hold to line the body up);
  frames 906-950 HP drain, same class as OFF.

Stage hold artifact: the staged route applies SPLASH's 39-frame used-message hold to turn 2 (a route-scoped lab value; the live app uses 0), which made the Struggle
animation 40 frames late. `laterTurnsUsedMessageHoldFrames` overrides it per trace (Struggle: 0 OFF, 8 ON).

## Outcomes unchanged (census)

`tools/integration/lsd194Census.sh` 0..999 in both scenes, base tree (`17af89768`) vs the change tree (`093ee66ed`), compared with
`tools/integration/enc276CensusDelta.py`: `digestMoved: []`, `commandRowsMoved: []`, `errorsMoved: []`, same seed set, in both scenes.
Seeds 796 and 995 end on the census frame budget on both trees (the cut lands on a different turn once frame counts change); their common prefix digests
are identical. Note for the Mac lane (not fixed here): both seeds are Struggle battles that run to the frame budget on both trees, i.e. an endless
battle also at the base tree, so it is pre-existing. 29 seeds hit a forced turn (21 Struggle, 8 Encore), listed in
`.integration/evidence/enc276/census/forced-seeds.json` (git-ignored).
The 8 ROM seeds were re-driven against the oracle on the same tree and still match (`.integration/evidence/enc276/redrive/`).

Caveat: src/ moved after `093ee66ed` (ROM-tuned Struggle handoff, `f9bda90f8`; consumer patches `f26b838df`). Those edits are presentation only, and the
census / re-drive were NOT re-run on the final tree within the worker's time cap.

## Consumers patched

Every route driver that waited for the move menu on a forced turn now follows the forced turn (pattern: read `forcedMove.decision.moveSlot`, press A, if in
`no-moves-message` wait for `NO_MOVES_MESSAGE_HOLD_AT` then press A, wait for the turn to start, then the action menu). 30 tests/tools drivers
(census drivers, soak driver, sa125 / sag130 / apx222 and the other route tests) plus `tests/randomRoundSoak.test.ts` re-pinned seed 21: frames 40_796 -> 41_021,
renderCalls 2_891 -> 2_895; battle 7, turn 3, end state and diagnostics unchanged (timing only).

Test: `tests/enc276ForcedTurnNoMenu.test.ts` (normal turn still opens the menu; Encore submits at FIGHT; Struggle message, early-A ignored, submit at A after
HOLD_AT, no fight phase; constants; ON/OFF share the flow).

## Verification (tree `e711e90371d05f92c380373b6fb082c8a2810b6f` at the verification commit `049bd959daa76df968b3fd938136dd55fcd5db77`)

- `npm run typecheck`: 0 (on `f26b838df`; later commits touch only a test pin).
- `npm run test:gate`: 362 files / 2842 tests green (on `f26b838df`).
- Full `npm test` sharded 6: shards 2, 3 (after fixing sa125 / sag130 / apx222), 4, 6 green; shard 5 had only the randomRoundSoak seed 21 pin, re-pinned and the file is
  64/64 green. Shard 1 (2205 passed) ran BEFORE the driver patches and was not re-run on the final tree.
- `npm run build` and `npm run build:lib`: both built.
- ENGINE_BUILD: `eb-83a3535c3259b331`.
- Soak: NOT obtained. `--seeds 0:20 --policy vanilla --scene off|on --parallel 3` each hit my 580 s guard (`Terminated`, no summary) while the box ran at
  load average ~13 with a sibling worker's full suite; winning 0:12 --parallel 3 was not run. The soak driver itself is patched for the forced turn and
  `tests/randomRoundSoak.test.ts` (64 tests, including vanilla/winning milestone seeds) is green.
- Not done in the cap: shard 1 re-run on the final tree, census / ROM re-drive re-run on the final tree, `npm run test:smoke` on the final tree.

## Final-tree verification (enc276v)

Tree `5b1814cf6eca0e1f2bde74705ebcb0fe8cbf4e17` (master = enc276 merged with lbr-b's Lobby attendant change and aud244b / aud245), worktree branch
`worker/integration-20261113-050415`. No `src/` change was needed for enc276; this step adds only this section. Evidence (git-ignored):
`.integration/evidence/enc276v/` in the worktree.

- **Census 0..999, both scenes** (`LSD194_SPLIT=4 LSD194_CENSUS_JOBS=3 sh tools/integration/lsd194Census.sh <root> <full sha>:off <full sha>:on`, explicit SHA) vs the
  `17af89768` base arms, `tools/integration/enc276CensusDelta.py`: **off and on both** `sameSeedSet: true, digestMoved: [], commandRowsMoved: [], errorsMoved: []`,
  `frameBudgetBoth: [796, 995]`. The common prefix of 796 / 995 (census driver patched to emit the cumulative kernel-events digest after every segment, base tree with its own
  driver): per-segment digests identical over the whole common prefix and the command rows of every complete common segment identical, 4/4 (off 796: 316 of 331 base
  segments; off 995: 328 / 344; on 796: 282 / 293; on 995: 291 / 302; the final tree's cut lands earlier because it needs more frames per forced turn). The census does
  not reach the Lobby: it builds `createFactoryRoundBattleOrchestrator` and drives the battle only, so lbr-b's attendant code is outside it.
- **ROM re-drive** (`tools/audio/romDriveSeed.sh SEED off DIR`, seeds 60 87 89 90 119 159 161 193, first drive each): all 8 stop on `outcome`, `matched == engineStates`
  (82, 69, 96, 73, 21, 63, 35, 21), `frozenTimelineEqualsDrive: true`, `divergence: null`, no engine error.
- **Soaks** (nohup, `--parallel 3`): vanilla `--seeds 0:20 --scene off` OK 20 / CRASH 0 / HANG 0 (774 s); vanilla `--scene on` OK 20 / 0 / 0 (1091 s);
  `--policy winning --seeds 0:12` OK 12 / 0 / 0 (605 s; deepest carry 28).
- **`npm run test:smoke`**: 8 files / 448 tests passed.
- **Full `POKEBENCH_VITEST_MAX_WORKERS=4 npm test`** (nohup, load average 10-15 from a sibling worker): 1822 files, **1776 passed, 1 failed, 44 skipped, 1 unreported**;
  14654 tests passed, 3 failed, 242 skipped; 2004 s. The one unreported file was lost to a `Worker exited unexpectedly` error (box under load);
  `tests/animation/gigaDrainEvidence.test.ts` re-run alone: 4/4 green.
  The 3 failures are all in `tests/randomRoundSoak.test.ts` (seed 32 Baton Pass pin, the max-depth-survives-a-loss pin, the swap-offer pin; 61/64 pass), reproduced alone,
  and **not caused by enc276**: the file is 64/64 at `9f8c9aa7d^` and 3 failed at `9f8c9aa7d` (lbr-b, "ROM attendant conversation at the singles attendant"), which is not in
  the enc276 branch, and 3 failed on the master parent `435515cbd` (no enc276). The earlier enc276 verification had this file 64/64 on the enc276 branch, consistent with that.
  The pins are timing windows the attendant conversation moved (e.g. seed 1 vanilla reaches its swap offers, all "NO", only after 32,000 frames; at 32,000 frames it is on its
  2nd Lobby challenge with `maxBattleDepth` 0). The soaks above still end OK. Re-pinning them is lbr-b / Lobby soak-driver follow-up work (out of scope here).
