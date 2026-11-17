# hpd1: the ordinary hit's post-bar hold (source rule measured; production change built, NOT landed)

Presentation only. Scenes ON (8012) and OFF (8014). Tooling: `tools/integration/hpd1Labs.py` (writes the 20 labs `tools/battle-lab/hpd1-*.json` and
traces `tools/compare/traces/hpd1-*.json`; stages in `tools/compare/appTrace.ts`), `hpd1AppOnly.ts` (app-only renderer, ~13 s a lab),
`hpd1Measure.mjs` (drain start / end, text-box change, action menu from the frames), ROM receipts `tools/integration/fixtures/hpd1/rom-holds.json`,
test `tests/hpd1HpHold.test.ts`. Evidence under `.integration/evidence/hpd1/` (ignored).

## Result

1. **The 28-frame floor (`HP_TIMING`, `max(28, bar + 1)`) is a fit, not a ROM rule.** In 20 ROM windows (fixed damage 10..90 by Seismic Toss,
   Dragon Rage 40, Sonic Boom 20; both scenes) the hold after the drain start is `damage + K` with **K constant per shape**:
   K = 17 when the hit ends the turn (shape c, 12 windows), K = 18 when the foe's USEDMOVE follows (shape a, 8 windows); identical in Scene ON and OFF.
   There is no bar-size term and no floor (a 9-frame bar holds as the 90-frame bar does, relative to its own end).
2. **A source-shaped replacement matches the ROM exactly for those shapes.** `hp` = bar frames + 1, plus `tailFrames`: shape a +1 (the `datahpupdate` row;
   the action-transition pause presents the rows after it), shape c + d where d = rows from `datahpupdate` to the first MoveEnd receipt (7 here:
   `critmessage`, `waitmessage`, `resultmessage`, `waitmessage`, `seteffectwithchance`, `tryfaintmon`, `moveendall`; kernel `instructionExecution`
   difference). Measured ROM minus ours, drain end -> next text-box change, all 20 labs (both scenes): **0** (before: shape c sonicboom 0, toss10 -10,
   others +7; shape a sonicboom -6, others +1). Remaining, not hold: drain end -> action menu +2 in shape c (ROM turn-end 8 frames, ours 6), and +8 in
   shape a Scene ON (the foe's action that follows; unchanged by this work).
3. **It is not landed.** The same change made `rol1-rollout5-on` worse (below), which the step's rule forbids. The implementation is commit
   `bab95ae43` (`src/engine/battleResolutionPresentation.ts`: `hpMoveEndLeadRows` / `applyHpHitTails`; re-pins of `battleTurnPortability` and
   `aud242oMoveAnimSounds`); the next commit restores production and those tests, so production is unchanged vs the step's base.

## Why rol1 got worse (the stop evidence)

`rol1-rollout5-on`: 383/3001 matched before, 261/3001 after; frames 0..530 (turn 1 incl. its hit and hold) identical in both, the later turns' chance
matches (static frames) are gone. The aud242o `turnDeltas` (ROM = ours + n, per turn) were 9 / 22 / 37 / 57 / 86; with the exact hold they are
**9 / 35 / 61 / 85 / 110**: the per-turn *increment* is now the near-constant 26 / 26 / 24 / 25 (was 13 / 15 / 20 / 29), but the deltas do not collapse to
one constant. The floor's over-hold (about 13 frames at counter 1, 0 at counter 5) was masking a **separate per-turn constant of ~26 frames in the
chained Rollout turns** (no action menu between turns; rol1 listed 9-10 frames stat print -> Rollout print, +3 body end -> hit blink, +6 hold end ->
next Defense Curl, plus the +2 turn-end). That constant is outside the hit hold; modelling it is the prerequisite for landing the hold.

## Other findings

- Everything else in the representative set is unchanged by the change: 21 traces, both scenes, identical matched counts before / after (turn1 / 3 / 4 / 9
  rockslide, turn10 / 12 aerialace, turn5-resolve a / b, turn2 dragonbreath / endeavor, hie1-sitrus off / on 503/823 / 176/1823, obr251 faint off / on,
  turn5 / 6a / 7a rockslide, turn15 fly-strike 229/256, turn13 dragonbreath faint, turn8 bind, turn11 rockslide).
- **Hits on the player have no ROM window here** and the floor is not safely removable: the off108 Rest window's anchor (foe Tackle on the player)
  moves `anchorEndDelta` -3 -> -14 (`tests/ont193SceneOnTails.test.ts`) when the floor goes. The built change therefore limited itself to foe hits.
- **Shape b** (hit followed by an effectiveness / crit print, a faint, a held item) has no ROM window; it stays on the floor in the built change.
- `src/engine/sceneOffPresentation.ts` (retired staged pipeline) has its own `hp: 28`; untouched.
- No census / soak / gate run: production is unchanged at the end of the step.

## Next step (named)

Measure and model the chained-turn constant of Rollout (turn end -> next turn's first action with no menu, ROM vs ours, in the aud242o window and a
non-Rollout chain), then re-apply `bab95ae43` (`git cherry-pick`), re-pin `turnDeltas` to the resulting constant, and extend to hits on the player
(a ROM window of a foe hit with fixed damage, e.g. a foe Seismic Toss) and shape b.

PAPERCUT: no app-only renderer existed, so each lab compare costs ~45 s of oracle time; `hpd1AppOnly.ts` renders the app side in ~13 s. The pngjs-based
hash scripts replace the Pillow ones (no Pillow in the system python).

# hpd2: the chained Rollout turn's constant (source found; the chain fix landed, the hold NOT)

Presentation only. Scene ON (8012) / OFF (8014). Tool: `tools/integration/hpd2Probe.py <scenario> <on|off> <out.json> [frames]` (per-frame `gBattleMainFunc`,
`gBattlescriptCurrInstr`, `gBattleControllerExecFlags`, `gBattleCommunication[0..3]`, `gCurrentActionFuncId`, `gAnimScriptActive`, controller funcs, in a fresh direct mGBA
process; no capture). Window: `tools/battle-lab/aud242o-rollout5-player-on.json` (player Rollout x4+ vs a foe Defense Curl), trace `rol1-rollout5-on`.

## Source of the chained-turn constant

The old ~26 frames per chained turn (hpd1: 26 / 26 / 24 / 25 with the hold) are **8 + 18**:

- **+8 = the locked player's turn transition (landed).** `BattleTurnPassed` -> `HandleTurnActionSelectionState` (`battle_main.c`, the states `TURN_START_RECORD` ..
  `CONFIRMED`): the locked player (`STATUS2_MULTIPLETURNS` / `RECHARGE`) is auto-confirmed (no menu), but the foe's action selection (EmitChooseAction, the AI
  ChooseMove, its confirm states) still runs, 9 frames, then `SetActionsAndBattlersTurnOrder` / `RunTurnActionsFunctions` 3 -> the script's first instruction.
  RAM probe, both scenes: **13 / 13 / 13 / 12** frames from `BattleTurnPassed` to the script start (ON 13/13/13/12 = OFF 13/13/13/12); the box clears 2 frames after
  `BattleTurnPassed`, so the blank box between chained turns is **15 / 15 / 15 / 14** frames vs the menu path's 7 (6 + 1). The app had the menu's handoff
  (`BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES` 6) for the locked continuation too: `BATTLE_RESOLUTION_LOCKED_CONTINUATION_HANDOFF_FRAMES` = 6 + 8 = 14 is used when the
  pending boundary is the foe's trainer command (the player is the locked one; `factoryRoundBattleOrchestrator.ts`, the `next-command-handoff` phase).
- **+18 = in-turn constants of this particular turn, not chain-specific** (the first turn already drifts the same; ROM turn period 597 / 598 vs the app's 580 now):
  by sound anchors A +6 Defense Curl -> stat-increase (ROM 765..768 script rows before the stat animation, then 77 + 91), B +3 Rollout lead to its first SE, C +2 hit SE -> `SE_EFFECTIVE`,
  D ~+7 post-hit tail / turn-end (hpd1's open "ROM turn-end 8 vs ours 6"). By the RAM script timeline (ROM minus app, per stage): "used" print -> first animation -7, Defense Curl
  body +2 (103 vs 105), animation -> stat animation -3, "rose!" -1, "rose!" -> Rollout print +1, Rollout print -> animation -11, hit hold / turn end +1. Every one of them sits in
  code ROM-calibrated for other shapes (stat change: `docs/issue69-omniboost-off-ground-truth.md`, sc106 / scd112; the plain move lead), so none was changed here.

## What landed, and the numbers

- `rol1-rollout5-on`: **383 -> 459 / 3001** matched (the floor-free hold on top: 321; the hold alone: 261). The aud242o `turnDeltas` 9 / 22 / 37 / 57 / 86 -> **9 / 14 / 21 / 33 / 54**
  (8 per chained turn off), `aud248` residual 2 / 16 / 31 / 51 / 80 -> 2 / 8 / 15 / 27 / 48; remaining increments 5 / 7 / 12 / 21 are the old floor's over-hold (13 at counter 1,
  0 at counter 5), the same masking hpd1 found.
- The 23 traces (hpd1's 21-trace set plus `turn14-fly-miss`, `rol1-rollout5-on`): app frames **bit-identical** before / after (SHA-1 over all frames, `.integration/evidence/hpd2/hashset.ts`),
  except `rol1-rollout5-on`.
- **The floor-free hold (`e01bfd249`, = hpd1's `bab95ae43` + production assertions) is NOT landed again**: with the chain fix the Rollout window is still worse with it (459 -> 321),
  because the per-turn deltas become 9 / 27 / 45 / 61 / 78 (constant increments 18 / 18 / 16 / 17, but a first-turn offset of 9 and an in-turn 18 that no hold fix removes). It is reverted in
  the same commit that adds the chain fix; the implementation stays at `e01bfd249` for the next step.
- Not done (time / disk): hits on the player and effectiveness / crit shapes (goal 3).

## Next step (named)

Model the in-turn constants of the foe stat move + player Rollout turn (A -3 / -6, "used" -> animation -7, Rollout print -> animation -11, hit blink -2, turn end) against the ROM script
timeline (`romseq`-style dump of `hpd2Probe.py` output, `.integration/evidence/hpd2/romseq.py`), then re-apply `e01bfd249` and re-pin `turnDeltas` to the one constant.

Verified (ANIMATION_VERIFICATION.md): code commit `4c90747ce`, `workspace/src` tree `eae87492b`; full `npm test` (15293 passed; the 2 `tests/randomRoundSoak.test.ts` failures — seed 32 Baton Pass,
"leaves full byte-identical" — are identical on the base source), `npm run test:gate` 2843/2843, `npm run build` and `build:lib` 0, typecheck 0, census seeds 0..99 both scenes identical (commands 31285 / 30601; the
census drives the orchestrator without `tick()`, so the handoff is not in it), soaks winning 0:20 both scenes 20/20 + 20/20, vanilla OFF 0:20 20/20.

# hpd3: the Scene ON script lead (source rule found and verified; NOT landed, production unchanged; the hold stays unlanded)

Presentation only. Scene ON (8012) / OFF (8014). Production at the end of the step is byte-identical to the base (`034306eb7`); the experiment is kept as
`tools/integration/fixtures/hpd3/script-lead-experiment.patch` and the ROM receipts as
`tools/integration/fixtures/hpd3/rom-script-leads.json`. Evidence (ignored): `.integration/evidence/hpd3/` (`match.mjs` exact-frame matcher, `shift.mjs` per-stage shift runs, `chg2.mjs` first-change frames, `renderset.sh` app-only render of the 51-trace set).

## What the A / B / C / D constants are: one rule (the script lead), verified in the ROM

The app starts every Scene ON move body on the used print's release row (`msg175`: the print occupies L rows, the next event is G + 1). The ROM does not reach
`attackanimation` there: the interpreter is blocked while the print's controller `exec` flag is set (`gBattleControllerExecFlags`), and only after the release does it
run the remaining instructions (one per frame) up to `attackanimation`. `hpd2Probe.py` (ptr / exec / anim per frame), release row -> the frame `attackanimation` executes
-> `gAnimScriptActive` rises:

| window | release | attackanimation executed | anim active from | lead (executed - release) |
| --- | --- | --- | --- | --- |
| foe Defense Curl (`aud242o-rollout5-player-on`) | 59 | 64 | 67 | 5 |
| Rollout counter 1 (same window) | 370 | 380 | 383 | 10 |
| Seismic Toss (`hpd1-toss30-on`) | 376 | 382 | 385 | 6 |
| player move (`aud241b-opponent-faint-on`) | 56 | 62 | 65 | 6 |

The kernel already counts these instructions: lead = `instructionExecution(MOVE_ANIMATION) - (instructionExecution(used print) + 1)` less the rows the app presents in between
(Defense Curl's 2-row `stat` command: 5 - 2 = 3). That is the `sub183` `scriptLeadFrames` rule, which production applies only when the next instruction is `waitstate`
(Substitute); the experiment generalises `moveAnimationScriptLeadTiming` to every body (`commandsPresentedSinceUsedPrint` supplies the presented rows) and drops `lead` from
`moveAnimationScriptTailTiming`'s no-hit tail (the total of a no-hit body is unchanged). Pixel-shift runs against the ROM confirm each stage: `rol1-rollout5-on` text / stat
animation / Rollout animation were +6 / +6 / +16 (ROM later); with the rule they are +3 / +3 / +3 (uniform: the lead is the whole in-turn error of the Rollout body, A and B
are the Defense Curl 3 and Rollout 10 leads); `hpd1-toss30-on` text / animation +6 / +12 -> +3 / +3.

## Numbers of the experiment (`script-lead-experiment.patch`), exact-frame matches (`npm run compare` metric; "before" = the base app frames against the same ROM frames)

- Changed app frames: 13 of the 51 traces, all Scene ON; every OFF trace, `wsh1-fs-on/off`, `wsh1-wish-*`, `wsh1-fb-*`, `wsh1b-*` and the other hpd1-set traces (38 of the 51) are **bit-identical**
  (hash over every frame): the Future Sight / Wish windows are not ordinary move scripts here, so the Future Sight +14 / +8 floors are untouched.
- Matched frames before -> after: `rol1-rollout5-on` 459 -> **873** / 3001 (with the hold re-applied on top: 682), `hpd1-toss30-on` 174 -> 404, toss50 149 -> 284, toss80 147 -> 285,
  dragonrage 183 -> 620, sonicboom 151 -> 455, a-toss60 122 -> 222, a-toss90 94 -> 147, a-dragonrage 165 -> 257, a-sonicboom 116 -> 636, `hie1-sitrus-on` 176 -> 718 / 1823,
  `obr251-opponent-faint-on` 0 -> 5 / 306; **`hpd1-toss10-on` 455 -> 292 (worse)**.
- Why it is not landed (the named, source-backed reasons):
  1. **The ROM-calibrated absolute sound frames move.** The sounds follow the body's age, so the lead moves every body SE by the lead. The old model's absolute sound frames equal
     the ROM's to the pinned residuals in dozens of fixtures: `aud241b` hit SEs frame for frame (delta 0 -> +6, 5 tests fail), `aud242c` / `e` / `o` / `259` named residuals (+2 -> -4 .. -8;
     more than 40 tests fail, output truncated), `aud242o` petal dance +2 -> -6, rollout-player +3 -> -7. Re-pinning them would encode a larger sound error; the sound table is not
     the part that is wrong.
  2. **The old model's bodies are 6-14 rows too long and that hides the lead.** For Seismic Toss the app's release -> hit-animation start is 233 rows (move-animation 370 -> 603) = the ROM's
     233 (376 -> 609, the lead 6 + attackanimation -> hit 227); the app's `live` is 228 (`liveMoveAnimationDuration` case 69, "81..308" window rows) against the ROM's `gAnimScriptActive`
     window of 220 rows (385..604) + 3 pre + 4 post (the app's post is 2). So the lead is missing at the start and the body is long at the end, cancelling at the hit. After the
     rule the toss body's content is +3 at the start, but its fade-out is 11 rows late (ROM 577..592, app 588..603) and the hit blink 3 late (ROM 610, app 613). Rollout (the
     rol1 body) is the opposite case: its content is uniformly +3 after the rule and only its sound is wrong (ROM first SE 396, first visible change 398; app 400 / 395: the app's
     SE is 5 rows after its first visible change, the ROM's 2 rows before; the sound-to-visual gap of the body is 7 rows off, independent of the lead). The tables were measured
     from the print's release, so whether a body's `live` already contains its lead is per body, not a rule.
  3. `hpd1-toss10-on` worsens only because the old model's 14-row body excess happened to match its 9-row bar window (the same masking as hpd1's floor).
- With the hold (`e01bfd249`, cherry-picked on top for the measurement only; its aud242o pin conflicted and was not re-pinned) on top of the lead, `rol1-rollout5-on` is 682 and the
  per-turn drift is a constant +3 (ROM minus app per turn start: +3 / +6 / +9 / +12..15 / +16..19): the Rollout turn's remaining in-turn constant is **3 per turn** (hit -> hold end -> next
  Defense Curl text), not the 26 of hpd1 or the 18 of hpd2. The hold is therefore ready to land the moment the lead lands; it did not land because the lead did not.

## Next step (named)

A body audit, not a rule: for each live body class compare the app's `pre + idle lead + live + post` (and its SE ages) with the ROM's `attackanimation` execution -> `gAnimScriptActive` window
-> hit controller exec from `hpd2Probe.py` (the four rows above are the first), move the lead to the start of every body whose `live` includes it (Seismic Toss: 6 of its 228 rows are the
lead; the post rows 2 vs 4), shift the body SE ages by the same amount where the ROM sound is on the ROM's own script (the Rollout / Defense Curl +7 sound-vs-visual gap), then re-apply the
lead, then `e01bfd249`. Until then the sound fixtures are the ones that fail, which is why the lead is not landed alone.

No census / soak / gate run: production is unchanged at the end of the step.

PAPERCUT: `tools/compare/out` keeps only the last ~3 runs, so a ROM frame set cannot be re-used across a long session; `npm run compare` per trace (~47 s) is the only way back to it (the receipts above are the per-stage numbers).
