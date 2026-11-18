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

## hpd4: the audited script lead lands (Sonic Boom, Dragon Rage, Defense Curl, Rollout) with the floor-free hold

Presentation only (gameplay, RNG and kernel event order untouched: census 0..99 `eventsDigest` identical, below). Tooling: `tools/integration/hpd4Cmds.ts <trace.json> [maxFrame]` prints the command starts with the
move-animation breakdown (`bodyLead`, `pre`, `idle`, `live`, `post`); the ROM windows are `tools/integration/hpd2Probe.py` (`attackanimation` exec `ex`, `gAnimScriptActive` rise `A = ex + 3`, `len` active rows, hit controller exec `H ~ A + len + 4`).

### Body audit (ROM window vs the app's rows; app columns from `hpd4Cmds.ts` on the lab traces)

| body | ROM release R -> ex / A / len / H | app command start | app `bodyLead` + `pre` + `idle` + `live` + `post` (+ hit tail) | app hit-animation start | verdict: does `live` contain the lead? |
|---|---|---|---|---|---|
| Defense Curl (111) | 59 -> 64 / 67 / 99 / (status) | 61 | 3 + 3 + 0 + 100 + 2 (+3) | next command (stats-change) 172 vs ROM stat anim A 171 | No: the 100-row window is the 99 active rows + 1; the lead (R -> A 8) is missing at the start. Lead added, tail +3 |
| Sonic Boom (49) | 373 -> 382 / 385 / 51 / 440 | 373 | 9 + 3 + 0 + 52 + 2 (+3) | 442 (ROM H + 2, the same constant offset as Dragon Rage) | No (window = len + 1) |
| Dragon Rage (82) | 375 -> 384 / 387 / 177 / 568 | 375 | 9 + 3 + 7 + 150 + 0 (+26) | 570 (ROM H + 2) | No: 150 live + the 7-row idle lead + the 26-row tail stand in for the 177 active rows (the tail is empirical, the body's tail loops are not modelled) |
| Rollout (205), turns 1..5 | 370 -> H 553 (len 166), 967 -> 1149 (166), 1565 -> 1741 (160), 2162 -> 2330 (152), turn 5 len 144 | 370 | 10 + 3 + 0 + 167 + 0 (+3) | 553 on turn 1 (= ROM H) | No |
| Seismic Toss (69), level 0 / 1 / 2 | 376 -> 382 / 385 / 220 / 609; 227 / 616; 231 / 620 | 376 | 0 + 3 + 0 + 228 + 2 | 609 / 609 / 609 (ROM 609 / 616 / 620) | Partly: the 228-row window is the medium (33..65) level's 227 + 1 while ROM len is damage dependent (220 / 227 / 231); the lead (6) cancels against the long low-level body at the hit. **Not landed** (below) |

The tail numbers (`HPD4_BODY_TAIL_ROWS`: Sonic Boom 3, Dragon Rage 26, Defense Curl 3, Rollout 3) are empirical: the value giving the most exact-frame matches against the ROM frames of the lab traces
(`rol1-rollout5-on`, `hpd1-sonicboom-on`, `hpd1-dragonrage-on`), with the hit flicker aligned by first-change lists. They run ~2 above the formula `len - live + 4`.

### What landed

- `BattleMoveAnimationTiming.bodyLeadFrames`: only for the audited move ids (`BODY_LEAD_AUDITED_MOVE_IDS` = 49, 82, 111, 205) the ROM lead (`attackanimation` exec - `used` print - the rows already presented) is
  presented as the command's first rows and is no longer counted in `scriptTailRows`. Every unaudited body keeps the lead in its tail exactly as before (so the whole old model is bit-identical for them, including
  `hie1-sitrus-on` 176 / 1823 and `obr251-opponent-faint-on` 0 / 306 before and after).
- Sound clock (`battleHitSounds.ts`, `moveBodyExtraRows`): sound ages inside the body read the command without the lead (`withoutBodyLead`, AGE_TO_SOUND_ROWS = 7 already absorbs the typical lead), and the controller-side sounds
  anchored to a later command (effectiveness SE, HealthbarDone / SetMonData low-HP, faint cry / SE) subtract the extra rows; the effectiveness SE and the HP handlers that would precede their anchor are scheduled from the
  earlier command. `aud241b` is green unchanged.
- The Rollout / Defense Curl +7 sound-vs-visual gap: the ROM window (aud242o: stats SE at 175, stat anim A 171, command 172) shows the stats-change SE is 4 rows earlier than the generic age once the command starts on the ROM edge, so
  a stats-change command that follows an audited body reads age + 4 (`STATS_CHANGE_AFTER_BODY_AGE_SHIFT`); other stats-change windows keep the old age (their pins are unchanged).
- `e01bfd249` (foe-hit hp command is floor-free, bar + 1 + the measured tail) re-applied on top.

### Trace windows (`npm run compare -- <trace> --summary`, matched frames before -> after; before = master `5dd239c57`)

- `rol1-rollout5-on` 459 -> **502** / 3001. `hie1-sitrus-on` 176 -> 176, `hie1-sitrus-off` 503 -> 503, `obr251-opponent-faint-on` 0 -> 0, `-off` 6 -> 6, `wsh1-*` / `wsh1b-*` 0 / 1 -> 0 / 1 (the wsh compare windows are a single
  frame, bit-identical app frames; `wsh2-fb-opp-on`, `wsh2-fs-opp-on`, `wsh2-wish-opp-on` ran only in the first pass, before == after at 0 / 1).
- hpd1 set (ON): `hpd1-dragonrage` 183 -> 950, `-sonicboom` 151 -> 938, `-toss10` 455 -> 711, `-toss30` 174 -> 715, `-toss50` 149 -> 393, `-toss80` 147 -> 378, `-a-dragonrage` 165 -> 605, `-a-sonicboom` 116 -> 674,
  `-a-toss60` 122 -> 143, `-a-toss90` 94 -> 105 (/ 1023 each).
- hpd1 set (OFF): `dragonrage` 416 -> 865, `sonicboom` 880 -> 880, `toss10` 474 -> 876, `toss30` 422 -> 880, `toss50` 442 -> 885, `toss80` 472 -> 891, `a-dragonrage` 554 -> 626, `a-sonicboom` 630 -> 649, `a-toss60` 570 -> 640, `a-toss90` 568 -> 635.
- The 12 other hpd1-set traces (`turn1..15-*`, `turn5-resolve-off-a/-b`, `turn5-rockslide`, `turn6/7-rockslide-a`, `turn8-bind-a`) are identical before / after (e.g. 256 / 256, 196 / 196, `turn5-rockslide` 7 / 256, `turn14-fly-miss` 2 / 213).
  No trace is worse. The hpd3 all-bodies experiment reached 873 on rol1; this audited subset reaches 502: the rest of that experiment's gain came from bodies that are not audited and stay unchanged here (not diagnosed further).

### Sound fixture re-pins (each row toward its ROM fixture; ROM - ours)

- `aud242o` rollout5-player turn deltas 9 / 14 / 21 / 33 / 54 -> **3 / 2 / 2 / 0 / -1**.
- `aud242q` iceball5-player 9 / 9, 13 / 13, 22 / 22, 40 / 40, 63 / 63 -> **3 / 3, 15 / 15, 27 / 27, 36 / 36, 46 / 46**: turns 1, 4, 5 toward the ROM, **turns 2 and 3 are 2 / 5 frames away** (sum |ROM - ours| 147 -> 127).
  Named reason: the Ice Ball body (301) is not audited (its lead stays in its tail) and the floor-free hold shortens its short-bar hits; it needs its own ROM window (hpd2Probe.py) and is the next audit row.
- `aud248` stat SE residuals: rollout5 2 / 8 / 15 / 27 / 48 -> **0 / 0 / 0 / -2 / -3**; iceball5 2 / 7 / 16 / 34 / 57 -> **0 / 13 / 25 / 34 / 44** (rows 2 and 3 away by 6 / 9 for the same Ice Ball reason; rows 1, 5 toward; row 4 equal).
- `hie3` sitrus-opp / leftovers / cheri drift 9 / 17 / 20 -> **8 / 16 / 19**, command start 722 / 732 / 731 -> 723 / 733 / 732 (the held-item command starts 1 row later, toward the ROM). `hie4` "keeps its 28-row floor" -> floor-free hp with the measured tail (e01's intended change).

### Census 0..99, both scenes (`lsd194Census.sh` + `rst197CensusDelta.py`, base `5dd239c57` vs `ef94a58af`)

0 digest / error / type-sequence diffs in both scenes (100 / 100 `eventsDigest` equal). ON 75 / 100 battles have a command-length change, OFF 74 / 100; the moved classes are the foe-hit `hp` command (28 -> the
bar's frames + tail, per-case -20 .. +4) and, ON only, the Rollout move-animation (+12 / +13: the presented lead 10 and tail, 8 + 5 cases). No other command moves.

### Not landed / open

- **Seismic Toss** is held out: the damage-level tails fit well (toss30 908, toss50 952, toss80 864 of 1023) but with the Toss lead the follow-up sounds anchored on general-animation / start commands
  (counter-player, leechseed x2, recycle, razorwind fixtures) drift away from their ROM rows (leechseed exact -> +2, recycle |4| -> |5|). Those emitters need the same sound clock as the hit SEs; until then Toss keeps its old model (hpd1-toss ON numbers above come from the hold alone).
- The remaining unaudited bodies keep the lead in their tail; each needs its hpd2Probe window (Ice Ball first).
- Gates run on the tested code (`src` tree of `ef94a58af`, unchanged by the later test-only and doc commits): `npm run typecheck` 0; `npm run test:gate` 362 / 362 files, 2843 tests; the sound fixtures
  (`aud24*`, `aud25*`, `aud26*`, `audioProbeFixtures`, `hie*`, `hpd*`, `rol1*`, `wsh*`) 57 / 57 files; `npm run build` and `build:lib` 0; census 0..99 above; vanilla soak Scene OFF 0:20 **20 / 20 OK** (budget).
- **Not run (time cap, named):** vanilla soak Scene ON 0:20 (a 6-way run did not finish in 560 s; not resumable), the winning / winning-swap 0:60 soaks, T2 Scene ON on 6 seeds (matched-delta median / p10 / p90 and missing / extra),
  and so no `randomRoundSoak` / `lbrd` pin check. The Scene ON sound-clock change is covered by the fixtures above and the census (events identical), not by T2.

## hpd5: Ice Ball and Seismic Toss join the audited script leads

Presentation only (gameplay, RNG, damage, turn order and kernel event order untouched; census below). Same tooling as hpd4 (`hpd2Probe.py` windows: `R` print release, `ex` attackanimation exec, `A = ex + 3`, `len` active rows, `H ~ A + len + 4`);
`BODY_LEAD_AUDITED_MOVE_IDS` = 49, 82, 111, 205, **301, 69**; `HPD4_BODY_TAIL_ROWS` adds 301 -> 3 and 69 -> 1.

### Body audit

| body | ROM R -> ex / A / len / H | app lead + pre + live + post (+ tail) = R -> hit start | verdict |
|---|---|---|---|
| Ice Ball (301), turns 1..5 | lead 10 / 9 / 9 / 9 / 9; len 75 x 4, 130 on turn 5; H 463 / 968 / 1478 / 1997 / 2590 | lead 10 / 9 + 3 + live + 2 (+3) | Window did not contain the lead; lead + 3-row tail make the hit start the ROM's `H` on turns 1..3 |
| Seismic Toss (69), damage level low / medium / high | lead 6, len 220 / 227 / 231, H = R + 233 / 240 / 244 | 6 + 3 + 221 / 228 / 232 + 2 + 1 = 233 / 240 / 244 | `liveMoveAnimationDuration` was one 228-row window for every level; now `request.damage < 33` 221, `> 65` 232 (`AnimTask_GetSeismicTossDamageLevel`) |

Ice Ball's lab residual that remains (turns 3..5, +-1 .. 5 frames) is not presentation: the ROM's foe damage in `aud242q-iceball5` is 6 / 11 / 20 / 40 / 89 HP, the kernel's 6 / 11 / 23 / 41 / 82 (reported; gameplay is out of scope), so the 1 HP / frame bars differ.

The Toss lead needed one more rule in the sound clock: `withoutBodyLead` (the pre-lead clock the controller sounds were calibrated on) reads Seismic Toss at the medium level (228) for every damage, because that clock was fitted
when the body was one 228-row window. The low-level attack's hit SE then stays on its ROM frame (without it `aud241b` lowhp moved -1 -> -8: the level-aware 221 plus the lead's `moveBodyExtraRows` subtracted 7 twice).
The earlier hpd4 hold-out reason (follow-up sounds anchored on later commands drifting) is resolved by the level-aware body + the 1-row tail (a 3-row tail made `leechseed` +2 late; R -> H = post 2 + tail 1).

### Pins hpd4 moved, and where they are now (ROM - ours unless the row says drift)

| pin | before hpd4 (`5dd239c57`) | hpd4 | hpd5 |
|---|---|---|---|
| `aud242q` iceball5-player turn deltas | 9 / 13 / 22 / 40 / 63 | 3 / 15 / 27 / 36 / 46 | **3 / 2 / 2 / -1 / -3** (sum abs 147 -> 127 -> 11) |
| `aud248` iceball5 stat SE residuals | 2 / 7 / 16 / 34 / 57 | 0 / 13 / 25 / 34 / 44 | **0 / 0 / 0 / -3 / -5** |
| `aud242o` rollout5 turn deltas | 9 / 14 / 21 / 33 / 54 | 3 / 2 / 2 / 0 / -1 | unchanged |
| `aud248` rollout5 stat SE residuals | 2 / 8 / 15 / 27 / 48 | 0 / 0 / 0 / -2 / -3 | unchanged |
| `hie3` drift sitrus / sitrus-opp / shellbell / leftovers / cheri (app ahead of the ROM) | 9 / 9 / 17 / 17 / 20 | 9 / 8 / 17 / 16 / 19 | **2 / 1 / 3 / 2 / 12** (command start 722 / 723 / 732 / 733 / 732 -> 729 / 730 / 746 / 747 / 739) |
| `aud260` recycle-player rows 1466 / 1490 / 1515 / 1605 | ours = ROM - 4 | ours = ROM - 4 | ours = ROM + 3 |
| `aud241b` lowhp second attack (ours - ROM), `aud252` end-turn deltas | -1; -8 / -2 / -10 | same | same (the Toss lead is on the ROM frame: the sound-clock rule above keeps them) |

### Trace windows (`npm run compare -- <trace> --summary`, Scene ON, matched frames; hpd4 -> hpd5)

`hpd1-toss10-on` 711 -> **861**, `-toss30` 715 -> **865**, `-toss50` 393 -> **927**, `-toss80` 378 -> **863**, `-a-toss60` 143 -> **453**, `-a-toss90` 105 -> **444** (/ 1023 each). Ice Ball: `hpd5-iceball5-on` (new trace, the aud242q lab).

### Pins that were already red at the hpd4 tip (hpd4 skipped them; re-pinned here, hpd5 adds 0)

Measured on `f40209793` before any hpd5 change (the floor-free foe-hit hold moved them):
- `tests/randomRoundSoak.test.ts`: "earns all seven" seed 21 frames 41_221 -> 41_240, renderCalls 2_913 -> 2_914; M-B step 2 "full" seed 0 37_806 -> 37_811, seed 1 21_985 / turn 35 -> 28_708 / turn 46 (same battle 1, depth 0, roundLost); "vanilla" seed 0 9_212 -> 9_219; the
  #104 chain pin: seed 13 carries 7, a scan of seeds 0..31 (`randomRoundSoak.ts --policy winning --max-rounds 3 --render-every 0`) found only seed 4 with carry 14, so it is pinned.
- `tests/lbrd.test.ts`: `WIN_TWO_SEED` 19 and `RETIRE_SEED` 13 each failed (the continuation lost / the retire prompt was not reached); a scan of seeds 1..18 with the seed in both roles found 17 passing every case, so both are 17. `WIN_THEN_LOSE_SEED` 0 unchanged.

### Census 0..99, both scenes (`lsd194Census.sh` + `rst197CensusDelta.py`, base master `ad1254981` vs `6bdfaaa1a`)

0 digest / error / type-sequence diffs in both scenes (100 / 100 `eventsDigest` equal each). ON 75 / 100 battles have a command-length change, OFF 74 / 100: the foe-hit `hp` command (28 rows -> the bar's frames + tail, per-case -20 .. +4) in both scenes,
and ON only the Rollout (+12 / +13, 8 + 5 + 2 + 1 + 1 cases) and Ice Ball (+12 / +13, 6 cases, seed 19) move-animation commands. No census battle uses Seismic Toss, so the Toss change is covered by the fixtures and trace windows above.

### T2 Scene ON, seeds 2 165 2741 3738 5569 8108 (`aud248RunSeed.sh SEED on`, `soundScoreboard.py`; before = the master chain `aud259/chain` of the same seeds, after = this tree `6bdfaaa1a`)

| family | exact before -> after | offset | missing | extra |
|---|---|---|---|---|
| move-animation SE | 147 -> 138 | 1447 -> 1468 | **12 -> 0** | 0 -> 0 |
| stat-change SE | 6 -> 6 | 31 -> 31 | 0 | 0 |
| battle-controller SE | 30 -> 29 | 229 -> 230 | 0 | 0 |
| cry / bgm | 3 / 0 -> 3 / 0 | 54 / 4 | 0 | 0 |

Missing 0 / extra 0 holds (the 12 missing rows of the older master chain, `se:140` and `se:179` x 6, are rows the adapters that landed after aud259 add). Matched-delta (engine - ROM, frames) median / p10 / p90, before -> after:
move-animation SE -2 / -21 / 5 -> -2 / -21 / 5 (n 1594 -> 1606); battle-controller SE -4 / -27 / 2 -> -5 / -27 / 2; stat-change SE -1 / -16 / 4 -> -2 / -15 / 4; cry -10 / -28 / 13 -> -9 / -28 / 13; bgm 5 / -71 / 9 -> 5 / -71 / 10.
The "before" chain is the aud259-era master, so the column also carries hpd4 and the master changes in between.

### Gates (tested code: `src` tree of `6bdfaaa1a` = `a26352df1`'s, later commits are tests and docs only)

`npm run typecheck` exit 0; `npm run test:gate` 362 / 362 files, 2843 tests; the 57-file sound / hie / hpd / rol1 / wsh set + `tests/lbrd.test.ts` + `tests/randomRoundSoak.test.ts` 59 / 59 files, 1913 tests (18 skipped); `npm run build` and `npm run build:lib` exit 0.
The full `npm test` and its shards were not run (the supervisor does).

### Soaks, Scene ON (`tools/soak/randomRoundSoak.ts --scene on`, a frozen `git archive` of `a26352df1`, whose `src` equals `6bdfaaa1a`'s; 4-seed chunks, up to 8 at a time under `nice -n 10`)

vanilla 0:20 **20 / 20 OK**; winning 0:60 **60 / 60 OK**; winning-swap 0:60 **60 / 60 OK** (all budget outcomes, CRASH 0, HANG 0). The `--parallel 3` form was replaced by independent chunk jobs of the same seeds and options (the one-process form exceeded the tool window, as in hpd4).
`tests/randomRoundSoak.test.ts` and `tests/lbrd.test.ts` pins moved at the hpd4 tip and were re-pinned above; the seven-win / winning-chain pins hold on the final tree.

### Not landed / open (hpd5)

- Ice Ball turns 3..5 keep a +-1 .. 5 frame residual that is the ROM-vs-kernel damage difference of that lab (gameplay, out of scope); the other unaudited bodies still keep their lead in the tail (each needs an `hpd2Probe.py` window).
- Seismic Toss high level (damage > 65) and low level are fitted from the ROM windows (220 / 227 / 231) but only the lowhp (Lv27 low) and hpd1 `toss10..80` traces exercise them.

## ice1 (2026-11-18): the Ice Ball x5 damage question is a harness artifact, not a battle rule

hpd5 saw the ROM's foe damage per turn 6 / 11 / 20 / 40 / 89 against the app's 6 / 11 / 23 / 41 / 82 in the `aud242q` Ice Ball x5 lab. ice1 settles whether that is a rule difference. It is not: the real closed-loop replay matches.

**Source vs kernel.** `Cmd_rolloutdamagecalculation` (`battle_script_commands.c:8536-8569`): NO_EFFECT cancels the multi-turn move; the first hit (no `STATUS2_MULTIPLETURNS`) sets `rolloutTimer` and its start value to 5, sets the bit and `gLockedMoves`; `--rolloutTimer == 0` clears the bit; `gDynamicBasePower = power`, doubled `i = 1 .. 4 - timer` times (i.e. hit n doubles n - 1 times), then doubled once more when `STATUS2_DEFENSE_CURL` is set (the bit is never cleared by the lock; `Cmd_setdefensecurlbit` at :8858 sets it). `src/engine/battleScriptRolloutOpcode.ts:30-123` is the same: timer 5 on the first hit, `power * 2 ** (5 - timer - 1)`, `x2` for the Defense Curl bit, bit and lock cleared at timer 0, miss -> `cancelBattleScriptMultiTurnMoves` + `BattleScript_MoveMissedPause`. No difference found line by line.

**Why the lab numbers differ.** The app side of `aud242q-iceball5-player-on` is `aud241bStage(..., 301, ..., 111)` in `tools/compare/appTrace.ts:2256`, a harness stage (Lv50 Rattata vs a Lv100 Rattata with an injected `rngSeed` 111); the ROM side is the `mechanicLab` fixture `tools/battle-lab/aud242q-iceball5-player-on.json` (Rattata Lv50 with Ice Ball x4, lab seed 1) whose dice are the ROM's own (ISSUES #221 "Harness"). Same species and levels, different dice. Each of the five turn pairs differs by at most 15 % (20 vs 23 is the widest, 82 vs 89 the 5th), inside the 85..100 % damage roll window, and the first two are equal, so different rolls explain all of them (consistent with, not proof of, a rule match; the staged drives below are the proof). The lab cannot prove or refute the rule; only a battle both sides roll the same way can.

**The staged battles** (real Factory sets and trainer, written script, Scene OFF oracle :8014, `romReplayWide.sh --stage`; the tool compares HP, `gRngValue` and last moves per turn plus the wide state, including `status2` and the Rollout timer, at every decision). No Factory set has both Ice Ball and Defense Curl, so the Defense Curl case uses Rollout (Phanpy 120), which shares the one command.

| stage (`stages/coverage/`) | lab seed | turn states | wide states | foe HP before each turn (ROM = engine) |
|---|---|---|---|---|
| `ice1-iceball-lock` (Sealeo 196, Ice Ball x5 on Wobbuffet 185, no curl) | 90102 | **10 / 10** | 2 / 2, 0 diff points | 272, 254, 223, 157, 39, then dead (damage 18 / 31 / 66 / 118 / lethal; Charm lowers the user's Attack in between) |
| `ice1-rollout-defense-curl` (Phanpy 120, Defense Curl then Rollout x5 on Wobbuffet 185) | 90101 | **10 / 10** | 3 / 3, 0 diff points | 272, 212, 147, 85, then dead (60 / 65 / 62 / lethal) |

First divergence: none in either (`stage.ok` true; `expect` = `moveid:MOVE_ICE_BALL`, and `MOVE_DEFENSE_CURL` + `MOVE_ROLLOUT`). Both were driven twice (the second time from the promoted `stages/coverage/` paths) with the same numbers. The files were found with an engine-only hunt (request, ROM setup, engine replay; lab seeds 90100..90105, about 12 s per seed): seed 90100 with Clamperl as the foe broke the lock (Double Team evasion made Ice Ball miss), the Wobbuffet foes did not.

Not covered: the Defense Curl bit on Ice Ball itself (no set has both moves), a lock broken by a miss / flinch / paralysis on the ROM (the staging above does not reach it), and the Scene ON sound / animation numbers of the hpd5 lab (unchanged by this step).

Gates: docs-only plus two stage JSON files; no change under `src/` (`git diff d60fce582 -- src` empty). Evidence under `.integration/evidence/ice1*` (ignored).
