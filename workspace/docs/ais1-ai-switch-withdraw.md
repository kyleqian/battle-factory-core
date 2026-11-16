# ais1: the AI mid-battle switch's "withdrew" message and return-to-ball

Scope: presentation only (`docs/factory-finish-scope.md`: logical outcomes, RNG and kernel events are unchanged). Files: `src/engine/battleResolutionPresentation.ts`
(`withSynthesizedAiSwitchRecallEvents`), `src/engine/midBattleOpponentPartySummary.ts` (aud253 stop-gap removed). Tests: `tests/ais1AiSwitchWithdraw.test.ts`, `tests/aud253AiSwitchLowHp.test.ts`.

## Cause

The kernel's `runVoluntarySwitchAction` starts at `BattleScript_PursuitSwitchDmgLoop` and skips the `BattleScript_ActionSwitch` prelude (`printstring STRINGID_RETURNMON`,
`returnatktoball`), and its `returnatktoball` handler only advances. So an AI switch had no "<TRAINER> withdrew <MON>!" message and no return-to-ball for the opponent,
and the opponent's party-summary draw followed the faint-less action directly. aud253 compensated with a stop-gap: the recall SE_BALL_OPEN rode the tray draw (31 frames late).

## Change

The player's recall is already synthesized in the presentation layer (`withSynthesizedSwitchRecallEvents`, negative sequences, dispatcher `synthesized-voluntary-switch`).
The AI gets the same with its own dispatcher `synthesized-ai-switch` (the Focus Punch pre-pass and menu-SE terms keyed on the player's dispatcher do not move): before the first
battler-1 `draw-party-status-summary` labelled `BattleScript_DoSwitchOut` it inserts `message STRINGID_RETURNMON` (seq -4) and `set-battler-sprite-visibility {battler 1, invisible}`
(seq -3, `returnatktoball`). Existing projection turns these into message (`RETURN_MON_TIMING` 24/9), `switch-out` (32 frames) and a healthbox-hiding `sprite-visibility` (1); the
renderer's `midBattleSwitchOutAt` is generic over battler. The recall SE_BALL_OPEN is now the `switch-out` command's (`emitMidBattleSwitchSounds`, +2), so the stop-gap
`if (lead === 0) playBallOpenSe()` in `midBattleOpponentPartySummary.ts` is deleted. Not synthesized (kept as before): a Pursuit interception (a MOVE_ANIMATION or a hidden battler-1
event precedes the draw), and a presentation with no `opponentTrainer` (unreachable in real play; the text needs the trainer name).

## Evidence (seed 2741 Scene OFF, ROM chain 19/19, `.integration/evidence/ais1/chain/`)

AI-switch segment, rows relative to the segment's commit frame, engine minus ROM:

| row | ROM | engine | delta |
|---|---|---|---|
| recall SE 15 | +53 | +53 | 0 (was +9 vs ROM +53: -44, stop-gap) |
| tray SE 114 | +84 | +84 | 0 (was +9: -75) |
| send-in SE 15 | +239 | +237 | -2 |
| cry 57 | +255 | +253 | -2 |

The segment grew by +74 frames (ROM's gap 75-77); the residual 1-3 frames is the same send-in -2 the aud253 pin already carried. No 31-frame row. Later rows of that segment
(+372 vs +385 SE 13, ...) are the post-switch move body (integration lane). Seed 71 / 15 / 26 / 28 chains also match to battle end (decisions 8 / 24 / 16 / 18).

## Census seeds 0..99, both scenes (`lsd194Census.sh`, base `1aef6552d` vs this tree)

- Outcomes / errors identical (0 error diffs). Commands: 7 battles per scene (seeds 15, 26, 28, 41, 52, 61, 99) gain exactly one triple `message(24f) + switch-out(b1, 32f) +
  sprite-visibility(b1, 1f)`, 21 new rows per scene, no other command changes (difflib: only inserts). `rst197CensusDelta.py` reports those 7 as `digest` diffs because the events
  digest includes the synthesized events; the logical events are the same (the ROM-chain runs above agree on decisions / outcome).
- Sound: 11 seeds change per scene. 7 are the AI-switch seeds (recall SE 15 + tray + send-in move later by the new 74 frames). 4 (71, 79, 80, 93) lose one SE 15 with no replacement:
  a double faint replacement's opponent summary has lead 0, so the aud253 stop-gap played a spurious SE_BALL_OPEN there; seed 71's ROM chain shows 0 missing / 0 extra after the removal.
- Scene ON uses the same commands (same 7 seeds, same triple).

## Pins re-pinned

`tests/aud253AiSwitchLowHp.test.ts` `DELTAS["2741"]` `[31, 0, -2, -2]` -> `[0, 0, -2, -2]`: the 31 was the stop-gap's offset; the recall SE is now at its ROM frame. Seed 2 (Scene ON) unchanged.

## Residuals / open

- Pixel comparison of the opponent return-to-ball at the pre-segment offset was not done in this step (no ROM window of the withdraw frames captured); only the sound rows and the
  command timings (message 24 / switch-out 32, the player's measured values) are verified.
- Scene ON: the renderer's `midBattleSwitchOutFeetAnchorY2` uses the player RATTATA y_offset 13 constant; the opponent sprite's anchor / elevation is not specialised. The recall ball
  particles / fade (`AnimTask_SwitchOutBallEffect`) are not drawn for either side.
- Pursuit-interception AI switches, Focus Punch pre-pass + AI switch, and Frontier Brain battles are unprobed (no seed in the census exercises them; the Brain path should carry
  `opponentTrainer`).
