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

## hpd6: fix-forward of the 14 full-suite failures hpd4 / hpd5 left (`a7cf4dfdb`, 9 files)

`src/` is unchanged (tests, a fixture and one tool import only). The supervisor's full suite on `a7cf4dfdb` had 14 failures in 9 files; the hpd4 / hpd5 workers ran only `test:gate` and a 57-file set.

| failure | class | fix, with the evidence |
|---|---|---|
| `iss215ToolPixelInstall` | tooling | `tools/integration/hpd4Cmds.ts` imports `engine/core.ts` without `monPicPixelsInstall.ts`: import added. |
| `ais2AiSwitchFrames` seed 2741 OFF and ON (189 / 183 frames) | **pre-segment drift, not a window regression**: the window is the same ROM frames, 7 (OFF) / 14 (ON) engine frames later | The first differing frame is the window's first frame, and every rendered frame matches the fixture md5 list shifted by exactly 7 (OFF) / 14 (ON) (`romFrameOffset` 58 -> 51, 88 -> 74; `lo` / `hi` + 7 / 14, md5s unchanged, so the test pins the same ROM frames). Cause, by command timeline (`soundCensusRomReplay.ts` `timeline`, commits `5dd239c57` / `ef94a58af` / `93306ce12` / `a26352df1`): the lab's turn 2 is Hitmontop's Seismic Toss on the Murkrow. OFF: its `hp` command is 51 -> 58 frames (hpd4 floor-free hold, tail 7: the hit goes to a turn end), frame 835 -> 842, every later turn start +7. ON: hpd4 +7 the same way, hpd5 +7 (Toss lead 6 + 1-row tail + level body; the Toss's ROM `H` is now exact). Same class as the earlier sta3 re-baseline (OFF 61 -> 58). The send-in / tray / recall frames themselves are unchanged. |
| `aud262` Water Spout q0 / q1 / q2 offsets 11 / 7 / 7 | **closer to the ROM** | The staging hit is the faster Rattata's Seismic Toss (damage 80 / 60 / 52 -> high / medium / medium level). hpd5 adds the lead 6 + tail 1 and, for the high level, the 232-row body over the old 228 window: +11 / +7 / +7, exactly the old offsets. The offsets are now 0 against the ROM fixtures (`aud262-waterspout-q0/q1/q2-player`: ROM - ours = 0). Re-pinned 11 / 7 / 7 -> 0 / 0 / 0. |
| `cry1CryTasks` `cry1-roar-pidgey-opp-on` (first cry, second cries) | self-consistency (per-lab drift) | The lab is a Rattata Seismic Toss, then the foe's Roar. hpd4's floor-free hold makes the Toss hit's `hp` command 1 row longer (hit SE still frame 295, ROM 288: the +7 lab drift is older, same on `5dd239c57`). ROM hit SE -> first cry 120; ours 114 (`5dd239c57`) -> 115 (hpd4 .. now): closer. Pins: drift 1 -> 2, command start 392 -> 393 (the +17 command-start offset and every row after the first cry unchanged). |
| `liveFieldfx` SONIC_BOOM, `liveHBufferS1` DEFENSE_CURL, `liveOrderConsumer` DRAGON_RAGE, `livePrep8` SEISMIC_TOSS, `liveIceBall` x2 | self-consistency: the helpers' expected row counts were pre-lead | Measured on the routes: ages stay consecutive 0..n-1 and `adapterActive` is true on every row. Sonic Boom 57 -> 69 (lead 9 + tail 3), Defense Curl 105 -> 111 (3 + 3), Dragon Rage 160 -> 195 (9 + 26), Seismic Toss 233 -> 240 (6 + 1), Ice Ball bodies 79 -> 92 / 91 / 91 / 91 (lead 10 / 9 / 9 / 9 + 3; effect age zeros 4 -> 14 / 13). `tests/helpers/iu120Rows.ts` gains the test-side copy `HPD4_BODY_LEAD_ROWS` / `HPD4_BODY_TAIL_ROWS` and an opt-in `lead` argument (`iu120Ages`, `iu120EffectAges`; the default is unchanged, so no other body's pin moves). |

Adapter check under the new lead (item 5): the lead rows hold the age-0 picture (as the iu120 pre rows), then the body plays every age; the hit-tail rows run past the body. The presentation of an age >= D equals age D - 1 for every audited body (Sonic Boom, Dragon Rage, Defense Curl, Rollout, Ice Ball, Toss, both sides; `liveMoveAnimationPresentation` config identical), and the rendered frames of the tail are identical to the last body row for Sonic Boom, Rollout 1..5, Ice Ball, Toss on the hpd1 / rol1 / hpd5 traces. **Dragon Rage's 26 tail rows draw differently from the last body row** (the age keeps counting; the 177-row ROM body is longer than the 150-row live window). That is intentional: `liveMoveUniversalRowAge` returns the unclamped age when post and script tail are both 0, and clamping it (tried, not kept) lowers `hpd1-dragonrage-on` 950 -> 925 matched frames. So there is no static frame and no change under `src/`.

## hpd7: next audit rows (measured, not landed)

Measurement only: no change under `src/` or `tests/`, production is the base `282e93c62`. Scene ON (8012) RAM probes of existing labs + the app's per-command rows; nothing here is a pin or a landed constant.
Evidence (ignored): `.integration/evidence/hpd7/` (`census-rank.txt`, `census-on-live.json`, `scen/` the 27 lab scenarios, `ram/` the `hpd2Probe.py` timelines, `app/` the `hpd4Cmds` outputs, `traces/` the app-side traces, `joined.json` / `table.json`
the join, `an.py` / `join.py` / `seq.py` the analysis, `appTrace.hpd7.ts` + `hpd7Cmds.ts` the temporary stage patch, deleted from `tools/` again).

### Method

- **Census.** `.integration/evidence/aud263/census/on-d8e807b20` (main tree, read-only): 1000 seeds, field [15] = move id, field [21] = `live`; 26 928 `live` move-animation commands over 274 move ids (`census-rank.txt`). **The six audited bodies (49 / 82 / 111 / 205 / 301 / 69) are 455 commands = 1.7 %** (Rollout 190, Seismic Toss 109, Defense Curl 78, Ice Ball 70, Sonic Boom 6, Dragon Rage 2); the 24 bodies below are **10 785 = 40.1 %**.
- **ROM** (`hpd2Probe.py <lab> on out.json 1000`, 7 s each, 8 in parallel): per `gAnimScriptActive` window `A`, `ex = A - 3`, `R` = the end of the last controller-exec run before `ex` (the used print's release), lead `L = ex - R`, `len` = active rows, `H` = the first exec rise after the window (`gap = H - (A + len)`, 4 normally),
  `R -> H` = the ROM's release-to-hit/next-controller span. The method reproduces the audited rows exactly (Sonic Boom `373 / 382 / 385 / 51 / 440`, Dragon Rage `375 / 384 / 387 / 177`; `an.py`).
- **App** (`hpd4Cmds.ts` on a trace with the lab's `appStage`; moves with no existing stage got `aud241bStage(..., 50, 12, moveId, ..., 69)` entries in a temporary copy of `appTrace.ts`, the same Lv50 vs Lv12 Rattata shape as the `aud242*` labs, ROM scenario = `aud242j-struggle-player-on` with the player moves replaced): `S` = the move-animation command's start, `E` = the next command's start; rows `bodyLead + pre + idle + live + post` (+ `tail` / `tailRows`).
- **Implied correction** `d = (R -> H) - (E - S)` = rows missing between the app's command start and the ROM's next exec. `d = L + T`: **proposed lead L = ROM lead** (the `BODY_LEAD` rule), **tail T = d - L** puts the next command on the ROM's `H` exactly. The landed bodies sit at `H` (Toss, Ice Ball) or `H + 2` (Sonic Boom: T 1 exact, landed 3; Dragon Rage the same +2), the compare-fitted choice
  needs an exact-frame run, not measured here: **land T .. T + 2**. Calibration of the app side: Sonic Boom `S = 373 = R`, `E - S = 69` = `R -> H` 67 + 2.

### The table (Scene ON, ranked by census count; rank = position among all 274 moves)

| rank | move (id) | census | ROM lead L | ROM R -> A | ROM window len | ROM R -> H (gap) | app `bodyLead + pre + idle + live + post` | app E - S | d | proposed L + T | `live` contains the lead? | evidence lab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Double Team (104) | 926 | 3 | 6 | 158 + 75 (two windows: the move + the evasion stat anim) | 245 (gap 2 between them) | `0+0+0+239+0` (+ tail 5, tailRows 6) | 244 | 1 | already 3 + 3 inside the 6-row `scriptTailRows`; d = 1 | **already modelled** (merged command, tail rows) | `gen-doubleteam-player-on` |
| 2 | Earthquake (89) | 908 | **11** | 14 | 207 | 225 (4) | `0+3+0+198+0` | 201 | 24 | 11 + 13 | **partly: live is 10 short of `len + 1`** (see shape B) | `gen-earthquake-player-on` |
| 3 | Aerial Ace (332) | 670 | 5 | 8 | 49 | 61 (4) | `0+3+0+50+2` | 55 | 6 | 5 + 1 | no | `gen-aerialace-player-on` |
| 4 | Struggle (165) | 631 | 5 | 8 | 111 | 123 (4) | `0+0+0+112+0` | 112 | 11 | 5 + 6 | no (live = len + 1, but pre 0 / post 0) | `aud242j-struggle-player-on` |
| 5 | Psychic (94) | 615 | 5 | 8 | 144 | 156 (4) | `0+3+5+140+2` | 150 | 6 | 5 + 1 | no (idle 5 + live 140 = len + 1) | `aud242f-psychic-player-on` |
| 6 | Dig (91), charge turn | 589 | 1 | 4 | 194 | 205 (7) | `0+3+0+195+0` | 198 | 7 | 1 + 6 | no | `aud242j-dig-player-on` |
| 6 | Dig (91), attack turn | (same) | 5 | 8 | 67 | 79 (4) | `0+3+0+68+0` | 71 | 8 | 5 + 3 | no | same |
| 7 | Surf (57) | 584 | 5 | 8 | 143 | 155 (4) | `0+3+0+144+0` | 147 | 8 | 5 + 3 | no | `gen-surf-player-on` |
| 8 | Protect (182) | 560 | 2 | 5 | 122 | 130 (3) | `0+3+0+123+2` (+ tail 3, tailRows 6) | 131 | -1 | none: already lead + tail rows, d = -1 | **already modelled** (`tailRows` 6) | `gen-protect-player-on` |
| 9 | Confuse Ray (109) | 519 | 6 | 9 | 269 | 283 (5; next = the confusion status anim) | `0+3+0+270+2` | 275 | 8 | 6 + 2 | no | `aud242n-confuseray-player-on` |
| 10 | Shadow Ball (247) | 458 | - | - | - | - | - | - | - | not measured: the Rattata lab is Normal-type, Shadow Ball has no effect, no body in either side | - | `aud242b-shadowball-player-on` |
| 11 | Rest (156) | 458 | - | - | - | - | - | - | - | not measured: Rest at full HP fails, no body | - | `gen-rest` (no window) |
| 12 | Faint Attack (185) | 442 | 5 | 8 | 225 | 237 (4) | `0+0+0+220+0` | 220 | 17 | 5 + 12 | **yes, 6 rows (live = len - 5)** | `aud242i-faintattack-player-on` |
| 13 | Rock Slide (157) | 427 | 5 | 8 | 137 | 149 (4) | `0+0+0+138+0` | 138 | 11 | 5 + 6 | no | `gen-rockslide-player-on` |
| 14 | Giga Drain (202) | 391 | 5 | 8 | 229 | 241 (4) | `0+3+0+230+0` | 233 | 8 | 5 + 3 | no | `aud242e-gigadrain-player-on` |
| 15 | Ice Beam (58) | 388 | 5 | 8 | 202 | 214 (4) | `0+3+0+203+0` | 206 | 8 | 5 + 3 | no | `aud242f-icebeam-player-on` |
| 16 | Thunderbolt (85) | 357 | 5 | 8 | 236 | 248 (4) | `0+3+0+237+2` | 242 | 6 | 5 + 1 | no | `aud242b-thunderbolt-player-on` |
| 17 | Bite (44) | 336 | 5 | 8 | 40 | 52 (4) | `0+3+10+26+0` | 39 | 13 | 5 + 8 | **yes, 5 rows (idle 10 + live 26 = len - 4)** | `gen-bite-player-on` |
| 18 | Double-Edge (38) | 332 | 5 | 8 | 140 | 152 (4) | `0+3+0+141+2` | 146 | 6 | 5 + 1 | no | `aud242b-doubleedge-player-on` |
| 19 | Brick Break (280) | 316 | **7** | 10 | 150 | 166 (**6**) | `0+3+0+151+2` | 156 | 10 | 7 + 3 | no | `aud260-brickbreak-player-on` |
| 20 | Quick Attack (98) | 297 | 5 | 8 | 32 | 44 (4) | `0+3+0+33+2` | 38 | 6 | 5 + 1 | no | `gen-quickattack-player-on` |
| 21 | Sludge Bomb (188) | 294 | 5 | 8 | 168 | 180 (4) | `0+3+4+160+0` | 167 | 13 | 5 + 8 | **yes, 5 rows (idle 4 + live 160 = len - 4)** | `aud242i-sludgebomb-player-on` |
| 22 | Double Kick (24) | 273 | **16** | 19 | 35 (first hit only) | 58 (4) | `0+3+0+36+0` | 39 | 19 | 16 + 3 (first hit) | no | `gen-doublekick-player-on` |
| 24 | Body Slam (34) | 241 | 5 | 8 | 106 | 118 (4) | `0+3+0+107+2` | 112 | 6 | 5 + 1 | no | `aud242h-bodyslam-player-on` |
| 25 | Thunder Wave (86) | 235 | **9** | 12 | 119 | 136 (5; next = the paralysis status anim) | `0+3+0+120+2` | 125 | 11 | 9 + 2 | no | `gen-thunderwave-player-on` |
| 26 | Curse (174) | 228 | 4 | 7 | 175 | 187 (5; next = the stat command) | `0+3+0+176+0` | 179 | 8 | 4 + 4 | no | `aud242f-curse-player-on` |
| 27 | Ancient Power (246) | 226 | 5 | 8 | 127 | 139 (4) | `0+3+0+128+2` | 133 | 6 | 5 + 1 | no | `aud242k-ancientpower-player-on` |
| 50 | Toxic (92) (sta4) | 156 | **10** | 13 | 230 | 248 (5; next = `Status_Poison`) | `0+3+7+219+0` | 229 | 19 (**17** net of the 2-row `status` command that follows) | 10 + 7 (net) | **yes, 5 rows (idle 7 + live 219 = len - 4, shape B)** | `aud242e-toxic-player-on` |
| 61 | Swagger (207) (sta4) | 128 | 2 | 5 | 168 | 180 (7; next = the stat-change anim) | `0+3+7+161+0` | 171 | 9 (**7** net of the 2-row `stat` command) | 2 + 5 (net) | 1 row short (idle 7 + live 161 = len, not len + 1) | `aud242f-swagger-player-on` |
| 132 | Dream Eater (138) (sta4), turn 3 of the sleep lab | 55 | 5 | 8 | 265 | 277 (4) | `0+3+0+266+0` | 269 | 8 | 5 + 3 (shape A) | no | `aud242g-dreameater-sleep-player-on` (R 759, A 767, H 1036) |
| 161 | Flatter (260) (sta4) | 36 | 2 | 5 | 218 | 230 (7; next = the stat-change anim) | `0+3+0+219+0` | 222 | 8 (**6** net of the 2-row `stat` command) | 2 + 4 (net) | no | `aud242b-flatter-player-on` |
| 218 | Spore (147) (sta4), turn 1 of the sleep lab | 16 | **7** | 10 | 206 | 221 (5; next = `Status_Sleep`) | `0+3+0+207+2` | 212 | 9 (**7** net of the 2-row `status` command) | 7 + 0 (net) | no | `aud242g-dreameater-sleep-player-on` (R 48, A 58) |

Rows 50 / 61 / 132 / 161 / 218 were added by sta4 (`docs/aud249-general-anim-sounds.md`): the bodies in front of the first `Status_*` play of the sta3 labs. For the status-followed rows (Toxic, Swagger, Flatter, Spore) the next command is a 2-row `stat` / `status` command, so `d` is given as measured against the command's end and net of those 2 rows; the net number is the one that puts the following command on the ROM's launch row. Dream Eater's `d` is the plain shape-A hit row (the hit lands 8 rows later than the app's relative span; the lab's print-side offset adds 3 more in absolute frames: 5 script rows before `attackstring` against the app's fixed 2, the `accuracycheck` / `jumpifstatus*` rows of the pre-print family).

Not run (labs exist or are one `aud241bStage` line away): Icy Wind (196, rank 23, `aud242b-icywind-opponent-on`), Solar Beam (76), Water Pulse (352), Rain Dance (240), Mud-Slap (189), Facade (263).

### What the rows say

- **The lead is the instruction count of the move's effect script, not a constant**: 5 for every plain `EffectHit`-family body (Psychic, Ice Beam, Thunderbolt, ...), 11 Earthquake (`HitsAllWithUndergroundBonus*` instructions), 16 Double Kick (`MultiHitLoop`), 9 Thunder Wave (`EffectParalyze+2 .. +68`), 7 Brick Break (`BrickBreakAnim`), 4 Curse, 2 Protect. Where those instructions are one per frame the kernel's instruction counter
  (`instructionExecution(MOVE_ANIMATION) - (used print + 1)`, the hpd3 rule) should supply them; a per-move table like `HPD4_BODY_LEAD_ROWS` would hard-code 25 more numbers.
- **Shape A (the common case, 14 of the 25 measured rows, Dig counted per turn): `live` (+ `idle`) = ROM `len + 1`, ROM `gap` 4.** Pre 3 + post 2 -> T = 1 (Aerial Ace, Psychic, Thunderbolt, Double-Edge, Quick Attack, Body Slam, Ancient Power); pre 3 + post 0 -> T = 3 (Giga Drain, Ice Beam, Surf, Dig attack turn, Double Kick first hit); pre 0 + post 0 -> T = 6 (Struggle, Rock Slide). So `L + 3 + (len + 1) + 3` is the whole body and
  the 'tail' is only the pre / post rows the command does not present. These are the next rows that need no new rule: **Earthquake aside, the top shape-A bodies by census are Aerial Ace 670, Struggle 631, Psychic 615, Dig 589, Surf 584, Rock Slide 427, Giga Drain 391, Ice Beam 388, Thunderbolt 357** (4 652 commands, 17.3 % of Scene ON; Dig's census count mixes its charge turn, shape C, with the attack turn).
- **Shape B (breaks the lead + tail rule): `live` is `lead` rows short of `len + 1`** - Faint Attack (-6, lead 5), Sludge Bomb (-5, lead 5), Bite (-5, lead 5), Earthquake (-10, lead 11). The live window of these four was cut by about the lead (it starts at the release, not at `A`), so `T` is 12 / 8 / 8 / 13 (Faint Attack / Sludge Bomb / Bite / Earthquake) = the shape-A tail (6 / 3 / 3 / 3) **plus the shortfall** (6 / 5 / 5 / 10): adding lead + the shape-A tail would
  leave the hit 5-10 rows early and a tail that long would hold the last frame instead of animating it (the Dragon Rage 26-row tail pattern). They want the `live` window lengthened to `len + 1` (the `liveMoveAnimationDuration` case) and then the shape-A lead + tail; the sound ages (`withoutBodyLead`, `AGE_TO_SOUND_ROWS`) were fitted on the short window, so each needs the sound fixture
  (`aud242b/e/f/i` rows) checked first - not measured.
- **Shape C (non-standard post-window instructions): Brick Break `gap` 6** (the `BrickBreakAnim` script keeps running 2 rows after the window; T 3 where the shape rule gives 1), **Dig charge turn gap 7** (T 6 where the rule gives 3: the next command is the 'dug a hole' message, not a hit), Confuse Ray / Thunder Wave / Curse `gap` 5 and a next command that is a status / stat command (T 2 / 2 / 4 against 1 / 1 / 3): their `H` is the next controller's exec, not a hit, so the extra row is the status-command start offset; compare against the ROM status frames before choosing T.
- **Already modelled: Double Team (104, rank 1) and Protect (182, rank 8).** Their commands carry `scriptTailRows` 6 (lead 3 / 2 + 3, the `sub183` rule) and the app span is 244 vs ROM 245 and 131 vs 130: no row to land. Together with Earthquake, these three of the top 8 are therefore the largest census mass (2 394) the audited table does not need or cannot take as a plain row.
- **Multi-hit (Double Kick): only the first hit was measured** (the Lv12 foe faints on it; lead 16 includes `MultiHitLoop`); a second-hit window and its `hit-animation` repeat are not covered and the row should not be landed from this lab.
- Scale: the six audited bodies are 1.7 % of the census, a plain shape-A landing of the nine bodies above is ~ 17 %, the full 24 measured rows 40 %; the lead rule is therefore where the remaining Scene ON in-turn drift of most battles sits (the hpd3 finding for Rollout, 3 rows of constant drift per turn after the lead + hold).

### Caveats

- One lab per body (Rattata Lv50 attacker vs a Lv12 Rattata target, player side); `len` of a damage-dependent body (Seismic Toss is the only audited one) was not varied. Foe-side and level variants are expected equal (hpd4: the foe-side Sonic Boom / Dragon Rage match), not measured.
- `R` and `ex` are RAM frames; the app's `S` differs from the ROM's `R` by 0 .. 4 frames in these labs (print-side offset of `aud241bStage`, not part of the body), so only the relative spans above are used.
- Hit-frame and sound alignment (the pins that moved with every hpd4 / hpd5 landing) were not re-measured: each row will move the `aud24*` / `hie*` sound fixtures of its move and needs the hpd4 sound-clock treatment (`withoutBodyLead`, `moveBodyExtraRows`).

### hpd7b: the six "not run" rows + Double Kick's second hit (measured, not landed)

Measurement only, same base `a8c06fb1a`, no change under `src/` or `tests/`; Scene ON (8012) RAM probes + the app's per-command rows, same method as hpd7 (`hpd2Probe.py` ROM timeline, `an.py` windows, `hpd4Cmds.ts` app rows with a temporary `appTrace` stage patch, deleted from `tools/` again).
Evidence (ignored): `.integration/evidence/hpd7b/` (`scen/` the 8 lab scenarios, `ram/` the ROM timelines, `app/` the app command rows, `traces/`, `appTrace.hpd7b.ts` + `hpd7bCmds.ts` the temporary patch, `an.py` / `seq.py` copied from hpd7). Labs: Icy Wind `aud242b-icywind-opponent-on` and Water Pulse `aud242e-waterpulse-player-on` as they are; Solar Beam / Rain Dance / Mud-Slap / Facade are `gen-surf-player-on` with the player moves replaced (+ `aud241bStage(..., 50, 12, id, ..., 69)` entries, the same Lv50 vs Lv12 Rattata shape as hpd7); Double Kick second hit = the same lab against a Lv30 and a Lv50 foe (`hpd7b-doublekick2-lv30-player-on`, `hpd7b-doublekick2-player-on`: the foe survives hit 1, so the second window exists). Solar Beam / Rain Dance traces were extended 822 -> 1400 frames (the unleash window and the weather-continues window run past 822).
Calibration of the app side on the same traces: the foe's Seismic Toss (audited body) has `d = 0` in all three labs that contain it (ROM R -> H / app E - S = 240 / 240 Double Kick Lv50, 233 / 233 Rain Dance, 233 / 233 Solar Beam).

| rank | move (id) | census | ROM lead L | ROM R -> A | ROM window len | ROM R -> H (gap) | app `bodyLead + pre + idle + live + post` | app E - S | d | proposed L + T | `live` contains the lead? | evidence lab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 23 | Icy Wind (196), **foe side** (atk 1) | 248 | 5 | 8 | 286 | 298 (4) | `0+3+0+287+0` | 290 | 8 | 5 + 3 (shape A) | no | `aud242b-icywind-opponent-on` |
| 29 | Water Pulse (352) | 221 | 5 | 8 | 159 | 171 (4) | `0+3+0+160+0` | 163 | 8 | 5 + 3 (shape A) | no | `aud242e-waterpulse-player-on` |
| 32 | Facade (263) | 202 | 5 | 8 | 80 | 92 (4) | `0+3+0+81+2` | 86 | 6 | 5 + 1 (shape A) | no | `hpd7b-facade-player-on` |
| 31 | Mud-Slap (189) | 204 | 5 | 8 | 51 | 63 (4) | `0+3+0+51+0` | 54 | 9 | 5 + 4 (**live = len, not len + 1**: shape A, one row short) | no | `hpd7b-mudslap-player-on` |
| 30 | Rain Dance (240) | 207 | 2 | 5 | 186 | 194 (**3**; next = "It started to rain!") | `0+3+0+187+0` (tail 5, tailRows 6) | 195 | -1 | none: already lead 2 + tail rows (as Protect), d = -1 | **already modelled** (`tailRows` 6) | `hpd7b-raindance-player-on` |
| 28 | Solar Beam (76), charge turn | 223 (both turns) | 1 | 4 | 107 | 118 (**7**; next = "took in sunlight") | `0+3+0+108+0` | 111 | 7 | 1 + 6 (shape C, same as Dig's charge turn) | no | `hpd7b-solarbeam-player-on` |
| 28 | Solar Beam (76), unleash turn | (same) | 5 | 8 | **237** | 249 (4) | `0+3+0+160+0` | 163 | **86** | 5 + 3 **and** `live` 160 -> 238 (+78) | no | same |
| 22 | Double Kick (24), hit 1 (Lv30 foe) | 273 | 16 | 19 | 35 | 58 (4) | `0+3+0+36+0` | 39 | 19 | 16 + 3 (= hpd7, same on the Lv50 foe) | no | `hpd7b-doublekick2-lv30-player-on` |
| 22 | Double Kick (24), **hit 2** | (same) | **19** | 22 | 35 | 61 (4) | `0+3+0+36+0` | 39 | 22 | 19 + 3 **but see the inter-hit trim below** | no | same (Lv50 foe: `hpd7b-doublekick2-player-on`, identical L / len / R -> H) |

(R, A, H as in hpd7. Census count and rank: `census-on-live.json`; the six moves are 1 305 commands = 4.8 % of the 26 928, so the 24 hpd7 rows + these six cover about 45 % of Scene ON.)

What the rows say:

- **Icy Wind, Water Pulse, Facade are plain shape A** (`live` = ROM `len + 1`, ROM gap 4): lead 5 and the pre / post tail (T 3 / 3 / 1) take them to the ROM's next exec exactly. Icy Wind is the **foe side** and its numbers equal the player-side Water Pulse's (lead 5, gap 4, pre 3 + post 0, T 3): no side asymmetry in the lead rule (one lab per side, not more). Together 671 commands (2.5 %).
- **Mud-Slap's `live` is `len`, not `len + 1`** (51 rows for a 51-row window; every other shape-A body is `len + 1`), so the tail is 4 (3 + the missing row), not 3. The `liveMoveAnimationDuration` value for 189 is one row short; the lead + tail rule alone would leave the hit on the ROM's H, the body one row short.
- **Rain Dance needs nothing**: the Rain Dance command already carries `tailRows` 6 (as Double Team / Protect, hpd7) and d = -1 (app span 195 vs ROM 194). Its weather-continues turn-end window (ROM `BattleScript_RainContinuesOrEnds`: lead 63 = the "Rain continues to fall." print wait, `len` 120, `R -> H` 192; the app has the message at 679 and a `general-animation` of 191 rows at 766 -> turn-end 957, ROM window 769 .. 888, next exec 895) was only sampled, not row-matched: the anchors differ (the app command starts at the print start, `R` is the print's release), so no number is proposed.
- **Solar Beam, charge turn = shape C** (gap 7, the next command is the "took in sunlight" message; app `live` 108 = ROM `len + 1`): T 6, the same as Dig's charge turn (gap 7, T 6).
- **Solar Beam, unleash turn is the one real finding: the ROM window is 237 rows, the app's `live` is 160** (`liveMoveAnimationDuration` case 76: `SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE + 1`, i.e. the visual end of the beam, age 159). `gAnimScriptActive` stays 1 for 237 contiguous rows (638 .. 874) and the next exec (the hit) is at 879, so the app's hit-animation starts 86 rows earlier, relative to the command start, than the ROM's (E - S 163 against R -> H 249); `d = 86 = (lead 5 + T 3) + the 78-row window shortfall`. Whether the ROM draws anything in rows 160 .. 237 was not checked here (a dead hold would make it a pure timing row, a drawn tail needs the renderer). It is the largest single per-command miss in the hpd7 / hpd7b tables (shape B in hpd7 has shortfalls of 5 .. 10). The charge turn is fine (107 / 108).
- **Double Kick, hit 2 (the "not run" item)**: ROM lead 19 (`MultiHitLoop` 4 + `DoMultiHit+0 .. +27`, vs 16 for the first hit, whose lead is `EffectDoubleHit+9 .. DoMultiHit+27`), window 35, R -> H 61, so the per-hit rule is lead 19 + T 3 for hit 2, T 3 as for hit 1 (the app presents both hits as `move-animation` commands of `0+3+0+36+0`, E - S 39, with a `hit-animation`, `hp`, `message []`, two `sprite-visibility` commands between).
  **Applying the per-hit rule to both hits overshoots**: over the whole two-hit span the app is short by only **23** rows (ROM first R -> second H = 217 / 200, app first S -> second E = 194 / 177, Lv30 / Lv50 foe), not 19 + 22 = 41. The extra **18** rows are in the app's between-hit commands: ROM first H -> second R = 98 / 81, app first hit-animation start -> second S = 116 / 99 (the HP drain differs by foe level, the 18 does not). The likely home is the app's 24-row empty `message []` + 2 `sprite-visibility` rows after `hp` (the ROM has 5 rows between the HP update and the next script exec); not verified command by command. So a landing must either give hit 1 the lead 16 + T 3, hit 2 the lead 19 + T 3 **and** trim the inter-hit commands by 18, or put the net +23 on the two-hit span some other way; the 1st-hit-only landing from hpd7 is unaffected (hit 1: 16 + 3 on both foes). The Lv12 foe of hpd7 never gets this far (it faints on hit 1), so hit 2 matters only for a surviving foe (the common case in a real battle).
- Not measured: Double Kick's end of hit 2 -> "Hit 2 time(s)!" / "It's super effective!" messages (app 337 / 422 rows after), sound ages and hit frames, any foe-side or level variant except Icy Wind, Rain Dance's weather-continues row, whether Solar Beam's unleash tail draws.

### liv1: why the six `live` windows are short (measurement only, nothing landed)

Base `1a5d25553`, no change under `src/` / `tests/`, no new RAM probe: the ROM windows are the hpd7 / hpd7b timelines (main-tree `.integration/evidence/hpd7*/ram/`, re-run through `hpd7/an.py` here: Faint Attack `225`, Sludge Bomb `168`, Bite `40`, Earthquake `207`, Solar Beam unleash `237`, Mud-Slap `51`, leads `5 / 5 / 5 / 11 / 5 / 5` - identical to the hpd7 / hpd7b tables), the causes come from `data/battle_anim_scripts.s`, `src/battle_anim.c` and the app's own reducers. Evidence level is marked per row: **derived** = the script / C arithmetic reproduces the measured shortfall, **consistent** = the app source says the same but I did not count rows against the ROM, **open** = hypothesis only.
(The step named the Scene ON oracle; none was driven, only the existing ON timelines were read.)

C facts used (`reference/pokeemerald/src/battle_anim.c`): `Cmd_delay` (:444) `delay w` resumes the script `w + 2` rows later (`WaitAnimFrameCount` :313; `delay 0` = 2); `Cmd_waitforvisualfinish` (:455) polls every row; **`Cmd_end` (:476) keeps `gAnimScriptActive` set while `gAnimVisualTaskCount` / `gAnimSoundTaskCount` is non-zero, then while `IsSEPlaying()` for up to 90 more rows, and only then clears it** - so the ROM window = the script's last command + whatever `end` still waits for, not the last visible row.

| move (id) | ROM window (R -> A -> end) | source (script / C) | app `live` (+ idle) and where it comes from | cause (level) | proposed `live` |
|---|---|---|---|---|---|
| Faint Attack (185) | 225 (R 57, A 65, H 294) | `battle_anim_scripts.s:5156-5190` (ends `delay 1; restorebg; waitbgfadein; end`, so the last visible write is the restore fade, then `end` the same / next row) | 220 player (221 opponent lag); `liveMoveAnimation.ts:1453-1454` + `src/animation/faintAttack.ts:12-27` (`FAINT_ATTACK_DONE_AGE` 219, owned ages 0..220); the case comment: "the window starts 4 frames after the script activation (row -4)" | **head, not tail** (consistent): the app's window opens at A + 4 (rows A .. A + 3 draw nothing, first visible age is the BG fade-out at 5) and closes at the ROM's last row; 225 - 220 = 5 = 4 head rows + 1 (the player-side restore fade-in one row earlier, `faintAttackRestoreProfile`). The missing rows are dead rows, not animation | **226** player (= `len + 1`; opponent 227 by the same lag, not measured). Appending is safe for the picture (the last frame is the restored default scene); the sound ages (`withoutBodyLead`) were fitted on the short window |
| Sludge Bomb (188) | 168 (R 58, A 66, H 238) | `5962-5992` + `PoisonBubblesEffect` (10 projectile calls, 12 particles, `waitsound`, `waitforvisualfinish`, 4 bubbles `delay 6` apart, `waitforvisualfinish`, `end`) | idle 4 + live 160 = 164; `liveMoveAnimation.ts:1309` "source body through its final row" | **tail** (open): the app's row is the last bubble's visual end; the ROM adds 5 rows after it (the `waitforvisualfinish` poll + `end`, and `end`'s `IsSEPlaying` wait: `SE_M_TOXIC` x4 started by the bubbles; `se_m_dig` 17 / `se_m_bubble3` 19 VBlanks are already over by then). The SE-wait part not computed (`SE_M_TOXIC` not run through `seExact`) | **165** (idle 4 stays; idle + live = len + 1 = 169) |
| Bite (44) | 40 (R 51, A 59, H 103) | `5289-5303`: `... waitforvisualfinish; clearmonbg; blendoff; delay 1; end` | idle 10 + live 26 = 36; `liveMoveAnimation.ts:1240` "first sharp-teeth row through inactive cleanup" | **tail** (**derived**): the app's window ends at the `clearmonbg` / `blendoff` row; the ROM then runs `delay 1` (1 + 2 = 3 rows, `Cmd_delay` :444) and the `end` row, = 4 rows = `len - 36` exactly (5 against the shape-A `len + 1`). No SE wait (`se_m_bite` 19 VBlanks, over long before) | **31** (idle 10 stays; 41 = len + 1) |
| Earthquake (89) | 207 (R 53, A 67, H 278), lead 11 | `2599-2608`: two `AnimTask_HorizontalShake 10, 50` at the first row, two `complex_palette_blend` at +13 / +31, `end` (no `waitforvisualfinish`) | 198; `liveMoveAnimation.ts:1367` "accepted window (197 rows from presentation age 1)"; `src/animation/earthquake.ts` `horizontalShakeAtAge(age, 10, 50)` (run here: last active age 196, so the task is destroyed on the age-197 callback) | **tail** (consistent / open): the app's 198 = the shake task's destroy row (the script has nothing else to wait for: `end` waits on `gAnimVisualTaskCount`, battle_anim.c:476). The 9 rows after it (207 - 198) can only be `end`'s `IsSEPlaying` wait on `SE_M_EARTHQUAKE` (a long rumble made of `PATT` patterns, which the extractor's `seExact` refuses, so the exact length was not computed; 9 << the 90-row cap, so it is a plain song end) | **208** (= `len + 1`, +10 over the current 198; the hpd7 "10 short") |
| Solar Beam (76), unleash turn | 237 (R 630, A 638, H 879) | `5437-5460` (`SolarBeamUnleash`, 21 orbs x `delay 4` + `ShakeMon2 2, 0, 65, 1` + `BlendBattleAnimPal 10 -> 0` + `UnsetSolarBeamBg` = `restorebg; waitbgfadein`, then `SolarBeamEnd: waitforvisualfinish; end`); `SetSolarBeamBg` `10200-` | 160 = `SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE` + 1 (`liveMoveAnimation.ts:1325-1326`, `src/animation/solarBeam.ts:19`); the reducer models the shake 22 .. 150, BG back at 151, target palette blend to 159 (`solarBeam.ts:243-270`) | **tail, 78 dead rows** (open on the exact end, derived on "nothing is drawn"): after the BG restore and the palette blend (the last commands, both in the app's 0..159) the script has only `goto SolarBeamEnd; waitforvisualfinish; end` left - no sprite, task, BG or palette command exists in rows 160 .. 237, so nothing can be drawn there; the only thing still alive is `end`'s wait (sound: the `panse` task `Task_PanFromInitialToTarget` is 64 pan steps and is over long before; `IsSEPlaying` on `SE_M_SOLAR_BEAM`, whose flat song is **194 VBlanks** by a port of the extractor's `seExact` run here). 78 < the 90-row cap, so the window ends with the song, not the cap. **Open: 4 (the app's sound age) + 194 = 198, not 237** - the song would have to start at about row 43, or the sound is retriggered; I could not reconcile it without a sound probe | **238** (= `len + 1`); a pure timing hold, no renderer work |
| Mud-Slap (189) | 51 (R 55, A 63, H 118) | `5220-5236` (slide out, `waitforvisualfinish`, slide back, 6 x `MudSlapMud` (5 sprites, `delay 2` = 4-row stride, `MUD_SLAP_MUD_WAVE_STRIDE`), `waitforvisualfinish`, `end`; mud lifetime 21, `mudSlap.ts:41-44`) | 51; `liveMoveAnimation.ts:1572` "A..A+50 (prep17: 77..127 / 81..131 / alt 72..122)" | **convention** (consistent): the prep17 accepted window is the inclusive A .. A + 50 = the ROM's 51 rows, i.e. it does not own the first inactive row every other body's `live` includes (shape A = `len + 1`); the row after the last mud sprite draws nothing | **52** (= `len + 1`; lead 5 + T 3 then lands the hit on H, equivalent to the hpd7b "T 4 with live 51") |

What this changes for a landing:

- **The four hpd7 shape-B bodies are two different faults.** Faint Attack's missing rows are at the **head** (the window opens 4 rows after A; nothing is drawn there, so extending the end is a dead hold either way) and Bite's are at the **tail** (`delay 1` + `end`, derived to the row); Sludge Bomb and Earthquake are tail shortfalls whose last 5 / 9 rows are `end`'s own wait and are not derived. In all four the rows to add are rows where the ROM draws nothing new, so lengthening `live` is a timing change only, **except that any sound age counted from the window end or start must be re-checked** (hpd7: `withoutBodyLead`, `AGE_TO_SOUND_ROWS`, the `aud242b/e/f/i` fixtures).
- **Solar Beam** needs no renderer work: 78 rows of hold after the beam (rows 160 .. 237), which is the largest single shortfall in the tables (`d = 86` of which 8 = lead 5 + T 3). The one thing worth a probe before landing is *why* the window is exactly 237 (sound end), because that decides whether the same 78 rows hold on the opponent-attacker side and on a seeded second use; if the `end` wait is the SE, the value is the same on both sides (the song does not depend on side) and `live` = 238 is a constant.
- **General rule found (new)**: the ROM window = script end + `Cmd_end`'s `IsSEPlaying` wait (<= 90 rows). Any body whose app `live` ends at the last visual row will be short by (its SE's remaining length after the visuals, or the `delay` / `end` rows); this is the likely cause of the remaining shape-B-like shortfalls (`Mud-Slap` is a convention row, not this). The extractor's `seExact` (`tools/extract/extract-anim-sound-timing.ts:1463`) gives the song length for flat songs (Solar Beam 194, Faint Attack 32, Bite 19, Dig 17, Bubble3 19, Sand Attack 26 VBlanks) and refuses `PATT` songs (Earthquake), so it can fill the SE-wait part of every body without a new probe once the SE start row is known.
- Not done: no landing, no sound-fixture check, no opponent-side run; Faint Attack's opponent-lag +1 and Sludge Bomb's SE wait are assumptions.

### hpd7c: Flamethrower, Bubble Beam, Fire Blast, Magical Leaf (measured, not landed)

Measurement only, base `663ac0866`, no change under `src/` / `tests/` (no `npm test`); Scene ON (8012) RAM probes + the app's per-command rows, the hpd7 / hpd7b method unchanged (`hpd2Probe.py` ROM timeline, `an.py` windows, `hpd4Cmds.ts` rows through a temporary `appTrace` stage patch, deleted from `tools/` again).
Evidence (ignored): `.integration/evidence/hpd7c/` (`scen/` four labs, `ram/` the ROM timelines, `app/` the command rows, `traces/`, `stages.txt` the four `aud241bStage` lines, `an.py` / `seq.py` copied from hpd7b). Labs = hpd7b's `hpd7b-facade-player-on` with the player moves replaced by 53 / 61 / 126 / 345 and the trace run 1000 frames, app stage `aud241bStage(..., "on", 50, 12, <move>, undefined, false, 69)` (Lv50 Rattata vs Lv12 Rattata, the hpd7 shape; one window per lab, so no burn / second anim intervened). No existing lab was usable as is: the `aud242c-flamethrower-*` / `aud242c-fireblast-player` / `aud242g-bubblebeam-player` fixtures are audio-fixture labs with no Scene ON app stage, and Magical Leaf only has the `anchor4-*` / `magicalLeafProbe.py` labs.

| rank | move (id) | census | ROM lead L | ROM R -> A | ROM window len | ROM R -> H (gap) | app `bodyLead + pre + idle + live + post` | app E - S | d | proposed L + T / live | `live` contains the lead? | evidence lab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 34 | **Flamethrower (53)** | 194 | 5 | 8 | **209** (A 67, H 280) | 221 (4) | `0+0+0+115+0` | 115 | **106** | **`live` 115 -> 210 (+95)**, then 5 + 6 (shape A, pre 0 / post 0); equivalently 5 + 101 with `live` unchanged | no (live = len - 94) | `hpd7c-flamethrower-player-on` |
| 53 | Bubble Beam (61) | 145 | 5 | 8 | 238 (A 65, H 307) | 250 (4) | `0+3+0+239+2` | 244 | 6 | 5 + 1 (shape A) | no | `hpd7c-bubblebeam-player-on` |
| 97 | Fire Blast (126) | 81 | 5 | 8 | 196 (A 65, H 265) | 208 (4) | `0+3+0+197+2` | 202 | 6 | 5 + 1 (shape A) | no | `hpd7c-fireblast-player-on` |
| 44 | Magical Leaf (345) | 162 | 5 | 8 | 181 (A 65, H 250) | 193 (4) | `0+3+0+182+2` | 187 | 6 | 5 + 1 (shape A) | no | `hpd7c-magicalleaf-player-on` |

(R = 57 / 57 / 57 / 59 for Bubble Beam / Fire Blast / Magical Leaf / Flamethrower; app S / E = 53 / 297, 53 / 255, 55 / 242, 55 / 170. Census count and rank: `census-rank.txt` of hpd7: the four are 582 commands = 2.2 % of the 26 928; with hpd7 + hpd7b the measured rows now cover about 47 % of Scene ON.)

What the rows say:

- **Bubble Beam, Fire Blast, Magical Leaf are plain shape A** (`live` = ROM `len + 1`, ROM gap 4, pre 3 + post 2, d = 6 = lead 5 + T 1): the same numbers as Aerial Ace / Psychic / Thunderbolt / Double-Edge. Nothing new; they take the hpd7 lead + `T 1` row exactly (together 388 commands = 1.4 %).
- **Flamethrower is a shape-B-like body with by far the largest per-command shortfall after Solar Beam's unleash turn: ROM window 209 rows, app `live` 115** (`liveMoveAnimation.ts:1433` `case 53: return 115`; `FLAMETHROWER_TEARDOWN_AGE` 114 in `src/animation/flamethrower.ts`). The app command is 115 rows (E - S 115) against the ROM's R -> H 221, so `d = 106`: 11 = lead 5 + the pre-0 / post-0 shape-A tail 6, plus **95** = `len + 1` (210) - 115. The command carries no pre / post / idle / tail rows at all (`0+0+0+115+0`, `scriptTailRows` 0), as Struggle / Rock Slide / Faint Attack (the "pre 0 + post 0" family), and the out1 note was right: a damaging body with no hpd7 row.
- **The 95 rows are dead rows, a pure timing hold (cause level: derived for "nothing is drawn", consistent for the end).** `Move_FLAMETHROWER` (`battle_anim_scripts.s:6311-6335`): `createvisualtask ShakeMon` at the first row, `delay 6`, 11 x `FlamethrowerCreateFlames` (2 sprites + 2 x `delay 2` = 8 rows each, 22 flames at a 4-row cadence = `FLAMETHROWER_FLAME_INTERVAL`), then `waitforvisualfinish; clearmonbg; blendoff; end`. The last flame sprite lives 29 rows (`FLAMETHROWER_FLAME_LIFETIME`), after which the script has no sprite, task, BG or palette command left, so the app's ages 0 .. 114 (+ the 11 negative-age mon-bg rows before them) are the whole visible body. What keeps `gAnimScriptActive` set for the further ~84 rows is `Cmd_end`'s `IsSEPlaying` wait (`battle_anim.c:476`, the liv1 rule): `SE_M_FLAMETHROWER` (`panse` at about row 15 of the window; the out1 ROM probe has the SE at A + 15) is a flat 192-tick song (`sound/songs/midi/se_m_flamethrower.s`, track 2 `W` sum 192, tempo 150 = 1 tick per frame), 15 + ~194 = the 209 measured, below the 90-row cap on `end`'s own post-script wait. The exact SE row was **not** run through `seExact`, so the last 1 .. 2 rows are an estimate; the same open as Solar Beam (liv1, 4 + 194 against 237 there, here 15 + ~194 against 209 fits).
- **Proposed landing = the same two pieces as Solar Beam / the shape-B bodies**: lengthen `case 53` to `len + 1` = **210** and add the shape-A pre-0 / post-0 lead + tail (5 + 6), or leave `live` at 115 and give the command lead 5 + tail 101 (holds the last frame for the 95 dead rows; the rows are dead, so the picture is identical either way, but a long `tail` is the Dragon Rage 26-row-tail pattern and the `live` form keeps the age counting). Either puts the next command (hit-animation) on the ROM's H. Predicted effect (out1 / t2off): the Swagger s6 res14 window (Flamethrower then Swagger, mass ~ 1 276) and the s1028 res12 window (~ 580) lose the ~ -100 row drift, ~ 1 100 + ~ 500 of the T2 mass, plus every later SE in a Flamethrower turn (194 commands = 0.7 % of Scene ON, but each carries a body-length offset of ~ 100 rows, which is why it dominates the T2 table far beyond its census share). Sound ages are the open check: `withoutBodyLead` / `AGE_TO_SOUND_ROWS` for 53 and the `aud242b/c` Flamethrower fixtures (`aud242c-flamethrower-player` SE at frame 82, hit SE 279) were fitted on the 115-row window; extending the end of the window does not move the SE start, but any sound age counted from the window end must be re-checked first.
- **Cross-check against out1**: out1 had ROM `attackanimation` exec 44, anim 46 .. 255 (209 rows), `hitanimation` exec 259 = 215 from `attackanimation`; this lab has A -> H 213 (= 209 + 4) from the same window length 209, so the two independent probes agree on the 209 / gap 4; the 215 vs 221 R -> H is only the different `R` anchor (out1 R = the `attackanimation` exec, here R = the print's release 8 rows before A).
- Not measured: the opponent side of any of the four (the aud242b / c Flamethrower opponent fixtures exist; hpd4 / hpd7b found no side asymmetry for the lead rule), Lv / defender variants, burn / flinch secondary effects (one window per lab, so a burn animation is a separate command), Fire Blast's own `SoundTask_FireBlast` sound ages, Magical Leaf's per-leaf sound, the sound / hit-frame alignment after a landing, and the exact `IsSEPlaying` end of Flamethrower (estimate above).

## hpd8: shape-A lead + hit tail for the 16 measured bodies (landed)

Lane: integration, Scene ON (:8012) ROM frames, base `f047ca4f5`. Presentation timing only: kernel events, RNG, damage, turn order and facility state are unchanged (census eventsDigest identical, below). Evidence (ignored): `.integration/evidence/hpd8/` (`base/` + `a2/` frames, `base1.txt` / `base2.txt` / `a2.txt` match counts, `census/`, `census-delta-*.txt`, `t2after/`, `t2master/`, `score-*.json`, `soak*.log`, `t*.log` test chunks, `gate.log`).

### What landed

- **Set** (`src/engine/battleResolutionPresentation.ts`): `HPD8_SHAPE_A_MOVE_IDS` = Aerial Ace 332, Psychic 94, Thunderbolt 85, Double-Edge 38, Quick Attack 98, Body Slam 34, Ancient Power 246, Giga Drain 202, Ice Beam 58, Surf 57, Dig attack turn 91, Struggle 165, Rock Slide 157, Bubble Beam 61, Fire Blast 126, Magical Leaf 345 (all `live` = ROM len + 1, ROM gap 4, hpd7 / hpd7b / hpd7c); `BODY_LEAD_AUDITED_MOVE_IDS` = the hpd4 / hpd5 set + these. The Dig charge turn (`CHARGE_TURN_SCRIPT`) is excluded: only the attack turn is shape A. Shapes B / C are not in the set.
- **Lead is counter-derived (hpd3 rule), unchanged code**: `moveAnimationScriptLeadTiming` = `instructionExecution(MOVE_ANIMATION) - (instructionExecution(used print) + 1)` = 5 for the EffectHit family, now presented as `bodyLeadFrames` (the first rows) for these ids instead of `scriptTailRows`.
- **Hit tail is a formula, not a table** (`liveMoveHitTailRows`, `battleResolutionPresentationRender.ts`): the whole body is lead + 3 pre + (len + 1) + 3 in the ROM, so T = 6 - pre - post (pre 3 + post 2 -> 1; 3 + 0 -> 3; 0 + 0 -> 6), taken from the existing `liveMoveUniversalRows`. Why a formula and not the counter: the tail is the measured pre / post wrapper rows around the `live` window (hpd7 / hpd7b / hpd7c ROM windows, whole body = 5 + 3 + (len + 1) + 3 at gap 4), not a kernel instruction count; the measured table was replaced by this derivation so a new shape-A id needs only its set entry. A substitute-swap body gets tail 0 (its composite owns the rows). Post-0 bodies hold their last age through the tail (`holdHitTail` in `liveMoveUniversalRowAge`), which fixed an `iceBeamAtAge` "age out of range" crash found in the first run.
- **Sound clock**: unchanged code. Body SEs keep their ROM ages (`withoutBodyLead`, `moveBodyExtraRows`; `battleHitSounds.ts` is already generic on `bodyLeadFrames > 0`); the NEXT command's SEs move with the lead + tail. Every aud242* / aud248 / hie / cry fixture passed untouched; only `aud252LossBallOpen` seed 2230 and `ais2` ON moved (below).
- **Scene OFF unchanged.** Census OFF 0..99: 100 / 100 battles identical (digest, error and every command field).

### Compare (`hpd1AppOnly.ts` app render vs the stored ROM frames, exact RGB md5, 1023 frames; labs: the 7 new `hpd8-*-player-on` stages, the aud242 labs for the other 8)

| lab | before | after | | lab | before | after |
|---|---|---|---|---|---|---|
| Aerial Ace 332 | 276 | **771** | | Ice Beam 58 | 161 | **509** |
| Psychic 94 | 84 | **507** | | Surf 57 | 42 | **508** |
| Thunderbolt 85 | 5 | **352** | | Struggle 165 | 76 | **550** |
| Double-Edge 38 | 390 | **684** | | Rock Slide 157 | 241 | **510** |
| Quick Attack 98 | 263 | **768** | | Bubble Beam 61 | 98 | **459** |
| Body Slam 34 | 103 | **574** | | Fire Blast 126 | 96 | **485** |
| Magical Leaf 345 | 255 | **660** | | Giga Drain 202 | 441 | 337 |
| Ancient Power 246 | 123 | 83 | | | | |

`hpd1-dragonrage-on` 950 -> 950, `rol1-rollout5-on` 2028 -> 2028 / 3001 (identical frames: neither move is in the set). The Dig attack turn has no standalone lab here (covered by the live Dig adapter tests).
**Giga Drain and Ancient Power totals drop although their pre-hit region improves** (Giga Drain frames 0..hit 45 -> 117, blink 9 early -> 1 early; Ancient Power 68 -> 77): the frames lost are static post-hit frames that matched by chance. Giga Drain's drain-message hold is a pre-existing shape-b / floor residual (ROM barEnd -> boxChange 18, app 30, -12; out of scope) that the old early timing masked. A tail sweep of -3..+2 rows gave no improvement for either (the hpd1 / hpd3 "masking" precedent).

### Pins (every re-pin moves toward the ROM)

- `tests/helpers/iu120Rows.ts`: `HPD8_SHAPE_A_IDS`, `HPD4_BODY_LEAD_ROWS` + 5 for every shape-A id, `hpd4BodyTail`, default lead `HPD8_DEFAULT_LEAD` (Dig 91 has none: charge turn), so ordinary-body row-count expectations add lead 5 + T. `livePrep13MoveAdapters` Ice Beam (206 -> 214), `liveDigAdapter` attack turn (+8), `liveRockSlideSides` (138 -> 149), `stl109Struggle` (112 -> 123), `apx217` Bubble Beam transform (244 -> 250), `battleTurnPortability` Rock Slide timing gains `bodyLeadFrames: 5`.
- `aud252LossBallOpen` seed 2230 (engine minus ROM, frames): [7, -3, -5, -5, -5, -5, -5, -6] -> **[7, 2, 0, 0, 0, 0, 0, -1]** (|delta| 3 / 5 / 6 -> 2 / 0 / 1; the first row unchanged).
- `ais2AiSwitchFrames` seed 2741 ON: the window is the same ROM frames, 6 engine frames later (`romFrameOffset` 74 -> 68, `lo` / `hi` + 6, md5s unchanged; a 6-frame (lead 5 + tail 1) shift in the lab's pre-window turns, the individual body not isolated). Same class as the hpd6 re-baseline.
- `tests/lbrd.test.ts` `WIN_TWO_SEED` / `RETIRE_SEED` 17 -> **4** (the Scene ON deal moved; a scan of 1..24 with the seed in both roles found only 4 passing every case; `WIN_THEN_LOSE_SEED` 0 unchanged). `tests/randomRoundSoak.test.ts` needed no re-pin.

### Census 0..99 (`lsd194Census.sh`, `LSD194_CENSUS_JOBS=3 LSD194_SPLIT=4 LSD194_SHARDS=0`, arms = `git archive` of `f047ca4f5` and of the tested commit, `rst197CensusDelta.py`)

Scene ON: 100 battles / 31,507 commands, **0 bad** (eventsDigest, error and the command type sequence equal in all 100); 91 battles changed, **527 move-animation commands** changed (fields 16 / 18 only = the lead and the minimum frames), +3,852 frames: **+6** x 266 (lead 5 + tail 1), **+8** x 205 (5 + 3), **+11** x 56 (5 + 6: the pre-0 / post-0 bodies, e.g. Struggle and the player's Rock Slide); no other command type moved. Scene OFF: 100 / 100 identical.

### T2, Scene ON (`aud248RunSeed.sh` seeds 2 165 2741 3738 5569 8108, 2 at a time, `nice -n 10`; `soundScoreboard.py`)

Missing **0** / extra **0** hold on every family, before (base `f047ca4f5`, a detached worktree running the same chain: `t2base/`) and after (`t2after/`). Exact / offset rows, base -> after: move-animation SE 138 / 1468 -> 133 / 1473, stat-change 6 / 31 -> 6 / 31, cry 3 / 54 -> 3 / 54, battle-controller 29 / 230 -> 29 / 230, bgm 0 / 4 -> 0 / 4. The ROM drive frames per seed are identical (18904 / 17322 / 14708 / 42837 / 11906 / 39841).
Matched-delta median / p10 / p90 (engine - ROM, frames), base -> after: move-animation SE -2 / -20 / 5 -> -2 / -20 / 5 (n 1606 both); battle-controller -5 / -24 / 2 -> -5 / -24 / 2; stat-change -2 / -15 / 4 -> -2 / -15 / 4; cry -9 / -27 / 13 -> -9 / -27 / 13; bgm 5 / -71 / 10 -> 5 / -71 / 18 (n = 4).
Per SE row (all 1902 matched SE rows, engine - ROM): sum |delta| 14,818 -> **14,560** (mean 7.79 -> 7.66, rows with |delta| >= 20: 230 -> 216), so the net movement is toward the ROM, but it is not monotone: the rows after a shape-A body moved by the uniform +6 / +8 / +11, and the groups that were already at -1 / 0 / +1 (se 102 / 119 / 152 / 228 at -1 / 0 / 1 -> 5 / 6 / 7, se 207 16 -> 22, se 219 5 -> 11, se 138 1 -> 7) now overshoot by that amount, while the groups at -9 .. -33 (se 148 -29 -> -19 x 6, se 242 -28 -> -20 x 10, se 15 / 114 / 136 / 195) move toward 0. Cause of the overshoot not isolated (follow-up: a per-row ROM window for those SE groups); no pinned fixture moved away (aud242* / aud248 / hie / cry pass unchanged; `aud252` seed 2230 and `ais2` ON moved toward the ROM).
An earlier draft compared against the aud259 master chain; its 12 missing rows (`se:140` / `se:179` x 6) were adapters that landed after aud259, not hpd8.

### Gates (tested code commit `b6245066e`, tree `6bec3b68e`)

`npm run typecheck` exit 0; `npm run test:gate` 362 / 362 files, 2844 tests; every test importing `liveMoveAnimation` / `battleResolutionPresentation*` / `moveAnimSounds` / `tickSounds`, every test naming these moves, the hpd6 list, `lbrd` and `randomRoundSoak` = a 532-file union, 5 chunks, all passing (0 failed); `npm run build` and `npm run build:lib` exit 0; vanilla Scene ON soak 0:20 **20 / 20 OK** (budget outcomes, 4 ranges of 5 seeds in parallel; the last seed of each range re-run alone after the tool window). The full `npm test` was not run (the supervisor does).

### Not landed / open (hpd8)

- Shape B / C bodies (Flamethrower, Solar Beam unleash, Hyper Beam family, ...) per hpd7 / hpd7b / hpd7c; Giga Drain's drain-message hold (-12) and Ancient Power's residual (the totals above); Scene OFF timing; the Dig charge turn.

## liv2: shape-A lead + tail for seven `live`-window bodies (landed)

Lane: integration, Scene ON (:8012) ROM frames, base `2a4fef0b1`, tested code commit `1d4bbc28d`. Presentation timing only: kernel events, RNG and damage are unchanged. Evidence (ignored): `.integration/evidence/liv2/` (`ram/` the `hpd2Probe.py` timelines of the 7 labs, `an.py` the window analysis, `base/` + `fin/` frames and match counts, `warp2.mjs` best-offset scan, `census/` + `census-delta-*.txt`, `t2base/` + `t2new/` + `score-*.txt`, `soak/`, `*.log` test chunks).

### ROM windows (lab = Lv50 vs Lv12 Rattata, `tools/integration/liv2Labs.py`, `tools/battle-lab/liv2-*-player-on.json`, 7 `appTrace.ts` stages)

R = end of the last exec run before `attackanimation`, lead = exec - R, len = `gAnimScriptActive` rows, gap = rows from the window end to the hit controller, R -> H = release-to-hit span.

| move | lead | len | gap | R -> H | landed (idle + live) | app span after |
|---|---|---|---|---|---|---|
| Flamethrower 53 | 5 | 209 | 4 | 221 | 18 + 192 = 210, tail 6 | 221 |
| Solar Beam unleash 76 | 5 | 237 | 4 | 249 | 39 + 199 = 238, tail 3 | 249 |
| Self-Destruct 120 | 3 | 126 | **10** | 142 | 4 + 123 = 127, tail 9 (leadless) | hit on the ROM row (200) |
| Bite 44 | 5 | 40 | 4 | 52 | 10 + 31 = 41, tail 3 | 52 |
| Sludge Bomb 188 | 5 | 168 | 4 | 180 | 4 + 165 = 169, tail 3 | 180 |
| Earthquake 89 | **11** | 207 | 4 | 225 | 0 + 208 = 208, tail 3 | 225 |
| Faint Attack 185 | 5 | 225 | 4 | 237 | 0 + 226 (player) / 227 (opponent, restore lag) = len + 1, tail 6 | 237 |

Each landed window is `live + idle = len + 1` and the whole body is lead + pre + (len + 1) + tail = R -> H (post 0 everywhere; pre 3 for Solar Beam, Bite, Sludge Bomb and Earthquake and 0 for Flamethrower and Faint Attack (`LIVE_MOVE_NO_PRE_ROW_SIDES`), so T = 6 - pre - post = 3 or 6 as in the table; the 9-row Self-Destruct tail is its measured gap 10 less the one hit row).

### What landed

- **Set**: `HPD8_SHAPE_A_MOVE_IDS` gains 53, 76 (unleash turn only: `(request.turn & 1) === 1`), 44, 188, 89, 185. The lead is counter-derived (hpd3 rule, unchanged code): 5 for the EffectHit family, **11 for Earthquake** (no table entry). The `hpd8` tail formula `6 - pre - post` reproduces every row above.
- **Solar Beam unleash head**: the 39 head rows (the ROM's SetSolarBeamBg FadeToBg, BLDY 0 -> 16 -> 0) are idle age-0 rows (`SOLAR_BEAM_UNLEASH_IDLE_ROWS`); the reducer does not model the fade (bldy stays 0), so the fade picture is a residual, the timing is exact. Constants: `SOLAR_BEAM_UNLEASH_LIVE_ROWS` 199 (was 160).
- **Self-Destruct** has no derived body lead (its `hp` command carries the lead), so it is NOT in the shape-A set: `LIVE_MOVE_LEADLESS_TAIL_ROWS` (`[120, 9]`) gives the leadless 9-row tail and the age hold.
- **Faint Attack**: the window opens at the ROM's `anim` rise (A) with live = len + 1 and no idle rows; the pre rows stay 0 (`LIVE_MOVE_NO_PRE_ROW_SIDES` 185 = 3). Best-offset scan of the whole body: one near-constant ROM offset (8..9 rows, 0 px), i.e. the body is not shifted.
- **Rule used: per-move constants, not the `Cmd_end` IsSEPlaying rule.** `seExact` song lengths (Solar Beam 194, Faint Attack 32, Bite 19, Self-Destruct 50, Flamethrower ~192..194) explain the length of the SE-bound tails only qualitatively and PATT songs (Earthquake) are refused, so the measured len + 1 is used for all seven. A general rule is not derived here.
- Doll framing (`LIVE_SUBSTITUTE_SWAP_BODY_FRAMING`): the framed adapter figures become 89: 208, 188: 165, 44: 31, 53: 192 (ROM rows 208 / 169 / 41 / 210 are unchanged and now equal idle + adapter exactly, shift unchanged). Scene OFF is unchanged.

### Compare (`hpd1AppOnly.ts` app render vs the stored base ROM frames, exact RGB md5, 1023 frames; Solar Beam lab 1423)

| lab | before | after |
|---|---|---|
| Flamethrower 53 | 495 | 448 |
| Solar Beam 76 | 244 | **301** |
| Self-Destruct 120 | 602 | 440 |
| Bite 44 | 353 | **586** |
| Sludge Bomb 188 | 293 | **490** |
| Earthquake 89 | 280 | **667** |
| Faint Attack 185 | 363 | **631** |

`hpd1-dragonrage-on` 950 -> 950 and `rol1-rollout5-on` 2028 / 3001 -> 2028 / 3001 (`npm run compare -- <trace> --summary`; neither move is in the set).
**Flamethrower and Self-Destruct totals drop although the timing now matches the ROM**: Flamethrower's body is aligned at a constant +4 offset and Self-Destruct's hit lands on the ROM's H row (app 200 = ROM 200); the frames lost are static / periodic post-hit frames (text-cursor blink period 10) that matched the old timing by chance (the hpd8 Giga Drain / Ancient Power precedent). Self-Destruct's post-hit app timeline is ~6 rows longer than the ROM's (hp + faint 143 vs 137), pre-existing and not isolated here.

### Pins (every re-pin moves toward the ROM)

- `liveOrderConsumerMoveAdapters` 53: 115 -> 192; `liveAnchor4` Earthquake 198 -> 208; `liveAnchor` Sludge Bomb 160 -> 165; `liveBasic` Bite 26 -> 31; `livePrep6` Self-Destruct 113 -> 123 and Faint Attack 220 / 221 -> 226 / 227; `liveFa185Timing` / `liveFaintAttackSides` the same (the retained fixture-window receipts stay 220 / 221 rows: they pin the reducer, not the live window); `liveSelectorsMoveAdapters` unleash 160 -> 199; `iu120UniversalRows` Bite 39 -> 44 and the shp116 composition (52 rows: 9 pre / lead + 10 age 0 + ages 1..30 + 3 tail); `shp116ShadowLeadRow0` Bite P + 36 -> P + 44, Sludge Bomb pre rows 1 + P -> 1 + P + 5; `substituteDollDefenderLive` Earthquake 198 -> 208 (+ lead 11 + tail 3); `substituteSwapAttdollCells` framed adapter figures (above); `apx215SubstituteDollApproximate` Solar Beam seed 587 241 -> 285; `land97IdleLeadRows` 40 -> 41 lead ids (+ Flamethrower 18); `iu120UniversalRows` Flamethrower is the one LAND97 no-pre side.
- Helpers: `tests/helpers/iu120Rows.ts` (`HPD8_SHAPE_A_IDS` + 53 76 44 188 89 185, Earthquake lead 11, Solar Beam unleash lead passed explicitly, `LIVE_MOVE_LEADLESS_TAIL_ROWS`).
- **No sound re-pin**: every aud242* / aud248 / aud262 / tick / hie / cry fixture passed unchanged (ROM-minus-ours before = after for every pinned sound); `lbrd` and `randomRoundSoak` needed no re-pin.

### Census 0..99 (`lsd194Census.sh`, `LSD194_CENSUS_JOBS=3 LSD194_SPLIT=4 LSD194_SHARDS=0`, arms = `git archive` of `2a4fef0b1` and of `1d4bbc28d`, `rst197CensusDelta.py`)

Scene ON: 100 battles / 31,507 commands, **0 bad** (eventsDigest, error and the type sequence equal in all 100); 65 battles changed, **259 move-animation commands** changed, fields 16 / 18 only (the lead and the minimum frames; no static-field command), +6,749 frames: Faint Attack +17 (lead 5 + 6 + tail 6), Bite / Sludge Bomb +13, Earthquake +24 (11 + 10 + 3), Solar Beam +86, Flamethrower +106. Scene OFF: 100 / 100 identical.

### T2, Scene ON (`aud248RunSeed.sh` seeds 2 165 1028 2741 3738 5569 8108, 2 at a time, `nice -n 10`; `soundScoreboard.py`; base = a detached worktree of `2a4fef0b1` running the same chain)

Missing **0** / extra **0** on every family, before and after; exact / offset rows unchanged (move-animation SE 149 / 1635, stat-change 6 / 34, cry 3 / 63, battle-controller 29 / 261, bgm 0 / 4); the ROM drive frames per seed are identical (18904 / 17322 / 15442 / 14708 / 42837 / 11906 / 39841). Matched-delta median / p10 / p90 (engine - ROM, frames), base -> after: move-animation SE -2 / -20 / 5 -> -2 / -16 / 5 (n 1784); battle-controller -5 / -24 / 2 -> -4 / -22 / 3; stat-change -2 / -16 / 4 -> -2 / -14 / 4; cry -9 / -27 / 13 -> -9 / -22 / 13; bgm 5 / -71 / 18 unchanged.

### Gates (tested code commit `1d4bbc28d`)

`npm run typecheck` 0; every test importing `liveMoveAnimation` / `battleResolutionPresentation*` / `moveAnimSounds` / `tickSounds`, every test naming the seven moves (by name and id), the hpd6 list, `lbrd` and `randomRoundSoak` = a 646-file union (553 + 93), all passing after the pin updates above; vanilla Scene ON soak 0:20 **20 / 20 OK** (4 ranges of 5 seeds; the last seed of each range re-run alone after the tool window). The full `npm test` was not run.

### Not landed / open (liv2)

- A general `Cmd_end` IsSEPlaying rule (per-move constants are landed); Solar Beam's unleash FadeToBg picture (timing exact, bldy unmodeled); Self-Destruct's post-hit hp + faint timeline (+6 vs the ROM); the Faint Attack opponent / lag side (+1) is not re-measured (the lab is player-on); shape C bodies, multi-hit second hits, Scene OFF timing.

## lse1: hpd7 table for the t2r-ranked status / stat bodies and the Leech Seed SE offset (measurement only)

Step lse1 changed nothing under `src/` or `tests/` (the temporary appTrace stage lines were removed again); `npm test` was deliberately not run (the step brief overrides the generic gate).
Labs: Scene ON, Lv50 Rattata (player, 4 x the move) vs Lv12 Rattata (opponent, Seismic Toss), the aud242b Calm Mind scenario with the moves replaced (`tools/integration/lse1Labs.py <out> name=id ...`, stage lines `"lse1-<name>-player-on": (state) => aud241bStage(state, "lse1-<name>-player-on", "on", 50, 12, <id>, undefined, false, 69)` added by hand to `tools/compare/appTrace.ts` for the run; Hypnosis needs rngSeed 5 as the tenth argument, seed 1 misses at 60%).
ROM = `hpd2Probe.py` (ptr / exec / anim per frame), app = `hpd4Cmds.ts`; the table method is the hpd7 one (R = the used print's release, L = ex - R with ex = A - 3, len = gAnimScriptActive rows, gap = H - (A + len), d = (R->H) - (E - S) = L + T, the 2-row stat / status command that follows the body subtracted for Hypnosis).
`tools/integration/lse1/an.py` + `join.py` regenerate the table from `<evidence>/ram/*.json` and `<evidence>/app/*.txt` (evidence is git-ignored: `.integration/evidence/lse1/`).

| move (id) | ROM L | R->A | len | H gap | R->H | app bodyLead/pre/idle/live/post (tailRows) | d | e2e R->R'toss ROM-app | shape | proposed |
|---|---|---|---|---|---|---|---|---|---|---|
| Agility (97) | 3 | 6 | 86 | 4 | 96 | 0/3/0/87/2 (6) | +1 | +2 | A | as-is; the tail already carries L |
| Blizzard (59) | 5 | 8 | 370 | 4 | 382 | 0/3/0/372/0 (0) | +7 | n/a | B (live = len + 2) | L 5 + T 2, live 372 |
| Bulk Up (339) | 2 | 5 | 107 | 4 | 116 | 0/3/4/104/2 (7) | -1 | 0 | A | as-is |
| Calm Mind (347) | 2 | 5 | 107 | 4 | 116 | 0/3/3/101/0 (7) | +3 | +4 | A | L 2 + T 1 |
| Charm (204) | 3 | 6 | 97 | 4 | 107 | 0/3/4/93/0 (6) | +2 | +3 | A | as-is within 3; e2e +3 open |
| Cosmic Power (322) | 2 | 5 | 240 | 4 | 249 | 0/3/0/241/0 (7) | +5 | +6 | A | add to shape A with lead 2 (T 3 = 6 - 3 - 0) |
| Flash (148) | 3 | 6 | 63 | 4 | 73 | 0/3/0/64/2 (6) | +1 | +2 | A | as-is |
| Hail (258) | 3 | 6 | 157 | 3 | 166 | 0/3/0/158/0 (7) | -1 | 0 | A, gap 3 | as-is |
| Hydro Pump (56) | 5 | 8 | 140 | 4 | 152 | 0/3/0/141/2 (0) | +6 | n/a | A | add to shape A with lead 5 (T 1 = 6 - 3 - 2) |
| Hypnosis (95) | 7 | 10 | 168 | 5 | 183 | 0/3/0/169/2 (0) | +9 (7 net of the 2-row status cmd) | n/a | C (gap 5) | lead 7, live as-is |
| Leech Seed (73) | 36 | 39 | 140 | 3 | 182 | 0/3/0/141/0 (40) | -1 | 0 | A, L as a tail | length exact; the SE rows are 29 early (below) |
| Light Screen (113) | 3 | 6 | 85 | 3 | 94 | 0/3/0/88/0 (7) | -3 | -2 | A | as-is (tail 3 too long) |
| Safeguard (219) | 3 | 6 | 70 | 3 | 79 | 0/3/0/71/2 (7) | -1 | 0 | A | as-is |
| Wish (273) | 2 | 5 | 270 | 13 | 288 | 0/3/0/271/0 (0) | +14 | +14 | C (gap 13) | L 2 + 12 post rows |
| Yawn (281) | 8 | 11 | 212 | 3 | 226 | 0/3/0/213/2 (12) | -1 | 0 | A | as-is |
| Encore (227, turn 2) | 2 | 5 | 219 | 3 | 227 | 0/0/0/215/0 (6) | +12 | +13 | C (gap 3) | bodyLead 2 + pre 3 + live 220 + post 2 (= 227) |

Soft-Boiled (135) has no body in the lab (HP full). Every body above is measured on the player side only; the opponent-side bodies were not re-measured (Leech Seed's two sides are compared by SE below).

### Causes (data/battle_anim_scripts.s, battle_anim.c Cmd_end)

- **Blizzard** (live len + 2): the script ends `delay 20; restorebg; waitbgfadeout; setarg 7, 0xFFFF; waitbgfadein; clearmonbg` with no closing `waitforvisualfinish`. Cmd_end keeps gAnimScriptActive set while the fade / sound tasks run and then through `IsSEPlaying()` (SE_M_BLIZZARD2 tail, up to 90 rows), which is the +1 row over the standard len + 1. L 5 is the usual lead.
- **Hydro Pump** (+6): shape A with L 5; the script ends `waitforvisualfinish; clearmonbg; blendoff; end`, so nothing beyond the standard len + 1. The shortfall is the lead (5) plus T 1 only.
- **Cosmic Power** (+5): `waitbgfadein; waitforvisualfinish; end` after `delay 40`; shape A once L 2 is added.
- **Hypnosis** (+9): BattleScript_EffectSleep runs `attackanimation; waitanimation; setmoveeffect` so the post-window gap is 5, not 4 (the extra instruction). The ROM status-animation windows start at 234 and 527 where the app has 227 and 520: exactly the L 7 the app does not model (the Spore pattern). The status-animation lengths are right (ROM 96, app 97).
- **Wish** (+14, e2e +14): the battle script is plain `attackanimation; waitanimation; goto MoveEnd`, the anim script ends with `simple_palette_blend; waitforvisualfinish; end` (standard). The 13-row gap (9 over the normal 4) is NOT explained by either script; it is after the animation window and before the next exec rise. Open: needs a per-frame ptr trace of the gap rows (hpd2Probe `ptr`) to see which callback holds exec.
- **Encore** (+12): the app has pre 0 / live 215 / tail 6, the ROM window is 219 rows from A = R + 5 and the next exec rises at gap 3. The script ends `waitforvisualfinish; createvisualtask AnimTask_RemoveSpotlight; end`; Cmd_end waits on that visual task (the +1 over the plain len). The failed first Encore (no body) is correct.
- **Calm Mind** (+3), **Charm** (+2), **Flash / Agility** (+1): sub183 tails already model L; the residual is T (rounding of the counter-derived tail), within 3 rows.

### Leech Seed: the T2 offsets -29 / -36 / -38 are the BODY SE rows, not the drain

The t2r attribution rows `body:73` (seeds 310 -38, 319 / 648 -29, 6912 -36; 3 x SE 169 then 8 x SE 167) are the Leech Seed BODY sounds. The aud250 labs (player and opponent) reproduce the same offset in isolation, no emulator needed (`node --experimental-strip-types` over `collectSoundTick`, the aud250 test's `ourEvents`):

- player: ROM 169 @ 96 / 106 / 116, 167 @ 130 .. 206; app 169 @ 67 / 77 / 87, 167 @ 101 .. 177 (8 rows, 29 early; the last 167 is 29 early too).
- opponent: ROM 169 @ 100, 167 @ 134 .. 210; app 169 @ 71, 167 @ 105 .. 181 (29 early).
- The drain (SE 180 / 142 x 8 / 179) and the Seismic Toss rows (238 / 214 / 131) match exactly (180 @ 697 / 693 etc.), as the aud250 test pins.

Why: the body window is ROM A = R + 39 (L 36), the first SE is A + 4. The app models the 36-row lead as a 39-row TAIL after the body (`lead=0 bodyLead=0 pre=3 live=141 tail=39 tailRows=40`), so the total length is exact (d -1, e2e 0) but the visible body and its SEs sit at R + 14 instead of R + 43. 36 - 7 = 29: the SE anchor inside the body is 7 rows later than the ROM's A + 4 (row 11 vs 4), which is the calibration against the lead-less body. A landing has to move the lead back in front of the body (bodyLead ~29 for the SE rows, 36 for the window, with the SE anchor -7 if 36 is used) and shrink the tail 39 to ~3. T2 offsets -36 / -38 are other routes of the same body with more earlier drift on top.
The end-of-turn drain itself (General_LeechSeedDrain, Absorb's body inside the drain command) is correct in the aud250 labs: window ROM A 670 / len 206, app drain 663 + 8 pre + 194 body; no change needed there.

### Proposed landing (not done here)

- **Into `HPD8_SHAPE_A_MOVE_IDS` as-is**: none of the new bodies without their lead; with the lead added (hpd8 rule `bodyLead = L`, T = 6 - pre - post): Hydro Pump 56 (L 5), Cosmic Power 322 (L 2). Agility 97, Bulk Up 339, Charm 204, Flash 148, Hail 258, Light Screen 113, Safeguard 219, Yawn 281 are already within +-3 rows through the sub183 tail and need no change (Light Screen's tail is 3 too long).
- **Need `live` / tail changes**: Blizzard 59 (live 372, L 5 + T 2), Calm Mind 347 (L 2 + T 1), Encore 227 (bodyLead 2, pre 3, live 220, post 2), Hypnosis 95 (lead 7, gap 5), Wish 273 (gap 13, cause open), Leech Seed 73 (lead as bodyLead, tail 39 -> ~3, SE anchor -7).
- Expected effect of the Leech Seed change: the 32 body:73 rows of the t2r ranking (-29 .. -38) close; the other bodies' SE offsets are small (+-3).
- Open: Wish gap trace, the opponent side of every body above, Charm's e2e +3 and Calm Mind's e2e +4 (more than d).

## hpf1: the 28-frame floor is a fit; hp commands get the ROM's own length for three shapes

Duration of an `hp` command is `max(minimumFrames, bar frames + 1) + tailFrames`. The ROM has no floor: `healthbarupdate` starts the bar controller, `Cmd_datahpupdate` waits for the exec flags to clear, then the script runs one instruction per frame (critmessage, waitmessage, resultmessage ..., tryfaintmon, moveendall). The old 28 floor overshoots small bars (Seismic Toss B=10: 10 frames late) and undershoots large bars whose message follows (5 short). Rules landed (both scenes, no scene difference measured; logical events, RNG and the kernel event order unchanged: census 0..99 both scenes, identical eventsDigest vs base 3bdb6cf11):

| shape | rule | ROM lab before -> after |
|---|---|---|
| hit -> MoveEnd receipts, then turn end (now also hits ON THE PLAYER) | `{minimumFrames: 0, tailFrames: d}`, d = rows datahpupdate -> first MoveEnd receipt (7) | pc-toss10 on/off base 10 late -> exact; pa-sonicboom-on 7 late -> exact; pc/pa-dragonrage on/off box change ROM 20 / app 7 short -> exact (8 player-hit labs) |
| hit -> next action's move transition | tail 1 (0 when no MoveEnd receipt follows) | exact |
| hit -> `critmessage` / `resultmessage` | tail = delta + 2 (delta = rows datahpupdate -> message instruction), no floor | Rolling Kick delta 3 -> 5, Substitute 1 -> 3; aud241b super-effective windows now on the ROM frame |
| hit -> faint chain (`play-faint-cry` next) | `{minimumFrames: 0}`, tail 0 | aud241b lowhp-faint 11 -> 0 bar exact (was 16 late); hpf1-pk-dragonrage hp end exact (1-frame residual is the faint's own lead, not hp) |

The low-HP loop SE is anchored to the bar end (HealthbarDone), so `battleHitSounds.ts` subtracts `tailFrames` from the command duration. The player-hit rule applies only when a same-battler hit-animation precedes the hp command (otherwise the shape keeps the floor).

Unproven shapes KEEP the 28 floor (no ROM lab at the time): heals (Rest / Recover / Soft-Boiled), recoil, drain user / target (except Leech Seed's drain body), poison / burn / sandstorm / Curse ticks, Struggle recoil, faint-next at small bars beyond lowhp-faint. The synthetic-route Rest anchor in `tests/ont193SceneOnTails.test.ts` moves -3 -> -14 because the rule now reaches the Rest turn's hit; that pin moved AWAY from its fixture value and is flagged, not a ROM statement.

Re-pins (each toward its ROM fixture): aud241b effectiveness / low-HP / faint deltas -> 0; aud248 superpower 17 -> 12; hie3 sitrus-on / shellbell-on drift; hpd1 player-hit `{minimumFrames: 0, tailFrames: 7}`. New: `tests/hpf1HpHold.test.ts` (4 tests, each fails without the fix). Labs: `tools/battle-lab/hpf1-*.json`, traces `tools/compare/traces/hpf1-*.json`, `tools/integration/hpf1Cmds.ts` (ROM hp command lengths per trace).

T2 sound scoreboard (ROM chain, base 3bdb6cf11 -> new; 0 missing / 0 extra both): Scene ON 8 seeds, battle-controller SE exact 34 -> 43, cry exact 4 -> 14, cry delta median -8 -> -4 (p10 -24 -> -21, p90 14 -> 0), battle-controller median -5 -> -4 (p10 -24 -> -23, p90 3 -> 1), move-animation exact 161 -> 166 (p10 -18 -> -16). Scene OFF 4 seeds, controller exact 10 -> 16, cry exact 3 -> 8, cry median -6 -> -3 (p10 -15 -> -11, p90 15 -> 0), controller p10 -15 -> -11, p90 5 -> 1.

## hpf2: heals, recoil, drains and the hit -> end-turn print get the ROM's own hp length (floor-free)

Base `70b797e28` (hpf1 + sta5) -> `d6ef8fb3a` (rules) + `e22a29062` / the aud262 pin commit (tests). Duration is still `max(minimumFrames, bar + 1) + tailFrames`; the 28 floor is a fit and the ROM has none. Measured with `tools/integration/hpd2Probe.py` (+ `hp` / `mhp` per frame) and paired with `tools/integration/hpf2Shape.py <lab> <on|off> <evidence-dir>`, one ROM lab per shape, both scenes where a lab exists (`aud242b/e/g/j/k/r` hail, Double-Edge, Giga Drain, Dream Eater, Struggle, Recover, Soft-Boiled player labs, Rest, Rolling Kick). Convention: the app message command = ROM RISE + 1 for hit / heal -> print (pixel-verified at the per-lab constant offset ROM bar rise - app hp start; same-frame compares are meaningless because of the out-of-scope move-body lead offsets).

Rules (`applyHpHitTails`, `src/engine/battleResolutionPresentation.ts`):

| | shape | rule | ROM numbers |
|---|---|---|---|
| R1 | heal hp -> print; hp right after another hp (recoil / drain) -> print; a hit -> print only when the print is the hit-effect message (CRIT / RESULT, the hpf1 rule) | tail = `messageExec - hpExec + 2` (CRITMESSAGE / RESULTMESSAGE / PRINTSTRING / PRINTFROMTABLE), no floor | heal bar 9 / 13 rows prints at bar + 2 (Recover tail 3, Rest next rise +11 = bar 9 + 3 hold); Double-Edge recoil next-rise 60 (recoil tail 3), Struggle 59; Giga Drain drain 61 (tail 4), Dream Eater 58 |
| R2 | hit -> hp (recoil / drain follows) | tail = difference of the two `healthbarupdate` executions | Double-Edge hit 10, Giga Drain hit 11 |
| R3 | hit -> `sprite-visibility` x2 -> end-turn print (hail / toxic ON, sandstorm OFF) | tail = MoveEnd rows + 8 (`HP_END_TURN_PRINT_LEAD_ROWS`) | bar -> print +17 |

Scene OFF has no hit-animation command, so `hit` is false there; the rules are restricted (R1 to hitEffectMessage / heal / afterHp) so ON and OFF command shapes stay equal for the unproven shapes (the sag130 hit-secondary anchors compare `minimumFrames + holdFrames`; the first, wider version broke them: ON `hp::28` vs OFF `hp::0`).

Re-pins (each toward its ROM fixture / a constant lab offset): `aud262MoveAnimSounds` Water Spout q0 / q1 / q2 0 -> -1 (this is the pre-existing hpf1 floor-free Toss residual, not an hpf2 effect: ours 1 frame later; root cause not isolated); `ais2` seed 2741 off `romFrameOffset` 51 -> 40, on 68 -> 57 (window lo / hi +11, md5 unchanged); `cry1CryTasks` roar pidgey / jynx drift 13 -> -1; `randomRoundSoak` seed 21 frames 41_048 / renderCalls 2_892 and the "full" seed 1 pin (frames 92558, battle 5, turn 27, maxBattleDepth 4); `trn181ActionTransitionOn` Rest residual -3 -> -14 (below). New: `tests/hpf2HpHold.test.ts` (4 Tier-1 tests: Recover heal tail 3, Double-Edge hit 10 / recoil 3, Giga Drain hit 11 / drain 4, Sandstorm hit -> end-turn print tail 15; each fails on the base source).

### Rolling Kick 313 -> 148 matched frames
Explained, not a regression of the hp command: a constant 10-frame move-body lead (out of scope: move-body windows) plus chance cursor-blink matches in the old count. The hp command itself is within 1 frame of the ROM.

### Rest and the ont193 synthetic anchor
Rest ROM lab: heal bar 9 rows, next rise +11 = heal tail 3 (landed). The ont193 synthetic route's anchor moved -3 -> -14 because its bars are 15 rows vs the lab's 8 (-7 each over the two bars); the pin is a measured model value of that route, not the ROM's; `ont193SceneOnTails` stays {anchorStartDelta -22, anchorEndDelta -14}, the trn181 Rest residual is -14.

### Labs (frames matched, before -> after, identical)
hpd1-dragonrage-on 950 -> 950, out2-horndrill-on / off 568 / 558 -> 568 / 558, rol1-rollout5-on 2028 -> 2028; hpf1 pa-dragonrage on / off 78 / 607, pa-sonicboom 623 / 619, pc-dragonrage 512 / 927, pc-sonicboom 819 / 923, pc-toss10 892 / 922: all unchanged (not worse; these shapes are hits with MoveEnd / faint, not touched by R1..R3). The gains are on the heal / recoil / drain labs: ROM-vs-app pixel match near-exact at the lab offset (hail, Recover, Double-Edge, Giga Drain, Dream Eater, Struggle, Soft-Boiled, Rest).

### Census 0..99, both scenes (`lsd194Census.sh` jobs 3 / split 4 + `rst197CensusDelta.py`, base `70b797e28` vs `e22a29062`)
0 digest / error / type-sequence diffs in both scenes (100 / 100 `eventsDigest` equal each). Command-length changes: ON 66 / 100 battles (31 507 commands), OFF 66 / 100 (30 730): Rest / Recover / Soft-Boiled / Moonlight / Synthesis heal -> message (+1 .. +3, tail 3), Struggle hit -> recoil (-13 / +9) and recoil -> message (-23 / -16), Giga / Mega Drain and Dream Eater hit -> drain (+8 .. +11), drain -> message (-23 .. -10), hit -> end-turn print (+8 .. +15).

### T2 sound scoreboard (ROM chain, base `70b797e28` tree via git archive vs this tree; 0 missing / 0 extra both, both scenes)
Scene ON seeds 2 165 1028 2741 5569: move-animation SE exact 116 -> 119 (p10 -12 -> -11), stat-change p10 -11 -> -10, cry exact 10 / 10 (p10 -15 -> -14, median -4 -> -4, p90 0 -> 0), battle-controller exact 28 / 28 (median -3, p10 -15, p90 0 unchanged), bgm p90 18 -> -10. Scene OFF seeds 2 165: controller exact 8 -> 9, cry exact 4 -> 5 (median -1, p10 -8, p90 0 unchanged), bgm 23 -> -5. Not run (time cap): ON 3738 8108 648, OFF 1028 2741 (~40k-frame seeds; 8 seeds ON / 4 OFF were asked for, 5 / 2 were run).

### Gates
`npm run typecheck` 0 (re-run at the end, below); `npm run build` 0; `npm run test:gate` 362 / 362 files (2844 tests); `npm run soak -- --policy vanilla --seeds 0:20 --parallel 4` 20 / 20 OK; the affected set (every test importing `battleResolutionPresentation*` / `battleHitSounds` / `tickSounds`, hpd* / hpf1 / rol1 / hie* / aud241* / aud253* / aud248* / ont193, lbrd, randomRoundSoak) 157 files passing after the aud262 Present-heal pin was put back to 2 (below). The full `npm test` was not run (the supervisor does).

### Open remainder
- Tick bars (poison / burn / Curse / Nightmare / wrap), sandstorm / hail damage bars, faint-next on small bars, confusion self-hit (hp -> status-animation -> message) and Substitute `printfromtable` have no ROM lab here; they keep the 28 floor.
- `aud262-presentheal-player`: the staging foe hp (162 -> 81) follows a `move-animation` with no hit-animation, so it is not a `hit` and keeps its floor; an intermediate (wider) rule had moved that offset 2 -> -1, the final rule leaves it at 2.
- Water Spout q0 / q1 / q2 -1 (hpf1 Toss, above).
- The ont193 synthetic Rest anchor (-14) is model-derived (bars 15 vs 8 rows), not a ROM value.

## lse2: Leech Seed, Hydro Pump, Cosmic Power, Blizzard, Calm Mind, Encore, Hypnosis on the ROM rows (Scene ON presentation timing)

Lane: integration, Scene ON (:8012) ROM frames, base `70b797e28`, tested code commit `5fe920b5a`. Presentation timing only: kernel events, RNG and damage are unchanged (census 0..99, both scenes: eventsDigest identical, see Gates). Evidence (ignored): `.integration/evidence/lse2/` (`ram/` hpd2Probe timelines, `snd/` soundEventProbe labs, `app/` / `app_base/` hpd4Cmds timelines, `cmp.txt` / `cmp-base-*` matched frames, `t2base/` / `t2after/` T2, `census-*.txt`, `run2_*.log`).

### What landed
| move (id) | rule | ROM d (R->H minus the app's next-command gap), base -> now |
|---|---|---|
| Leech Seed (73) | body lead 36, hit tail 3 (`LSE2_BODY_LEAD_MOVE_IDS`) | -1 -> **0** (SE rows now exact too, the lead moves the body SEs by the ROM's 36) |
| Hydro Pump (56) | HPD8 shape A (lead 5, tail 1) | +6 -> **0** |
| Cosmic Power (322) | body lead 2, tail 3 | +5 -> **0** |
| Calm Mind (347) | body lead 2, tail 3 | +3 -> **0** |
| Blizzard (59) | HPD8 shape A id (lead 5) + `LSE2_BODY_TAIL_ROWS` 2 | +7 -> **0** |
| Encore (227, turn 2) | body lead 2, tail 10 (`LSE2_BODY_TAIL_ROWS`) | +12 -> **0** |
| Hypnosis (95) | STA5 body: lead 7, STA5 tail 0 (added to `BODY_LEAD_AUDITED_MOVE_IDS` through the STA5 key) | +9 (7 net of the status cmd) -> **0**, status-animation windows at 234 / 527 = ROM |

Matched frames on the lse1 labs (`npm run compare -- <trace> --summary`), before -> after: Leech Seed 452 -> 617 / 780, Hydro Pump 216 -> 485, Cosmic Power 218 -> 487, Calm Mind 251 -> 393, Blizzard 22 -> 127, Hypnosis 174 -> 670, Encore 303 -> 336 / 1000.

Sound clock. A body's SEs run on a sound clock calibrated with a K-row lead; a body that now presents lead L must shift its SE ages by `L - K` or the body SEs move with the lead (`lse2BodySoundAgeShift`, `LSE2_SOUND_CLOCK_LEADS`: Leech Seed 7, Cosmic Power 7, Calm Mind 7, Encore 3). Encore's K is 3 (zero crossing of the turn-2 SE rows: K 7 gave +4, none gave -1). The stat-change SE after these bodies uses age shift 3 instead of 4 (`STATS_CHANGE_AFTER_LSE2_BODY_AGE_SHIFT`): it was +1 with 4 after the lead, 0 with 3 (Cosmic Power and Calm Mind labs, SE 239 now +0). Body SEs keep their ROM ages (the hit SEs and the other body SEs are unchanged vs the base except where the table above says otherwise).

Lab change: the Encore lab (`lse1-encore-player-on`, battle-lab json + compare trace) never reached turn 2 (NORES at frame 510), so it got a second A press and 1420 frames (captureFrames range(1000)); `lse1Labs.py` takes a seed, and 7 `lse1-*-player-on` stages are in `tools/compare/appTrace.ts` (the lse1 step left them out).

`tools/integration/tl204Compare.ts` now counts a body's lead and hit tail as script rows (`productionLeadRows` / `productionHitTailRows`); the tl204 pins (Calm Mind -1, Leech Seed) and the substitute-swap pins were re-pinned toward the ROM.

### Gates (tested code commit `5fe920b5a`)
- Census 0..99 (`lsd194Census.sh`, base vs this tree, `rst197CensusDelta.py`): **Scene OFF 100 / 100 identical** (30730 commands); **Scene ON 78 / 100 identical, 22 changed battles**, eventsDigest identical, no error / type-sequence differences; every changed field is a move-animation timing field (indices 16 / 17 / 18); no new static-field command.
- T2 Scene ON, 8 seeds (648 319 310 6912 2 165 2741 5569; `aud248RunSeed.sh`, `soundScoreboard.py`; before = the base archive, after = this tree): **missing 0 / extra 0** in every family, both arms. Move-animation SE exact / offset 166 / 1223 -> **208 / 1181**; delta (engine - ROM) median / p10 / p90 -2 / -17 / 4 -> **-2 / -12 / 4** (n 1389 both); stat-change, cry, battle-controller and bgm unchanged (stat-change 8 / 27, cry 22 / 50, battle-controller 54 / 171, bgm 0 / 3).
- `npm run typecheck` exit 0 (3 m 45 s alone); `npm run test:gate` 362 / 362 files, 2844 tests; `npm run build` and `build:lib` exit 0; vanilla Scene ON soak 0:20 **20 / 20 OK** (4 runs of 5 seeds, `--parallel 4`).
- Test union (every test importing `liveMoveAnimation` / `battleResolutionPresentation*` / `moveAnimSounds` / `tickSounds`, every test naming the seven moves, the hpd6 list, aud249* / sta3*, `lbrd`, `randomRoundSoak*`): 369 files in 6 chunks; 363 files pass. The 11 failing tests in 6 files fail identically on the base archive (`70b797e28`), so they are not this step's: cry1 x4 (`cry1CryTasks`, ROAR first / second cries), `aud242e` counter-player, `aud242p` revenge-player, `aud260` Recycle, `aud262` Water Spout x3, `trn181` Rest (-3 expected vs -14). The full `npm test` was not run.

### Not landed / open
- **Blizzard body SEs +2, hit SE +3** (unchanged from the base): the app's print length depends on glyph count (S = 51) while the ROM's R is a fixed 55; shape B, not a lead / tail issue. Its remaining frame diffs are backdrop-palette pixels (127 / 780 matched frames).
- Calm Mind hit SE 13 @ 699 is -4 (unchanged from the base).
- **Wish (273) not landed**: its 13-row gap (shape C) was not traced per frame in this step, so the L 2 + 12 post rows proposal from lse1 stays unproven.
- The `liveMoveUniversalRowAge` hold-flag condition for the LSE2 ids (render ~2500) was not needed on any lab and was left alone.

## hpf3: the nine full-suite failures of hpf1 / hpf2 (tests only, `src/` unchanged)

Base `26ed71da7`. The supervisor's full suite on `4839b5b80` had 9 tests in 7 files failing (bisected to hpf1 / hpf2); cry1CryTasks / aud262MoveAnimSounds / trn181ActionTransitionOn (seen failing on lse2's base) already pass on this base (hpf2 re-pinned them). Each failure was classified from the test's assertion plus a ROM RAM timeline of the same lab: `tools/integration/hpf2Shape.py <lab> on <dir>` (ROM hp bar rise / exec / next rise vs the app's hp command) and the new `tools/integration/hpf3Cmds.ts <audio fixture>` (the app's command timeline for an audio fixture's trace). Result: no regression of an hp command; 8 windows moved toward the ROM or onto an out-of-scope body offset that the 28-row floor had hidden, 1 is a wash (Razor Wind). `src/` is untouched, so no census / typecheck delta applies.

| test | ROM minus ours, before -> after | class and evidence |
|---|---|---|
| `adp1Sounds` beatup-player | hit 2 / 3: +61 / +122 -> -2 / -4 (offsets 89 / 150 -> 26 / 24) | toward ROM. ROM bar rise -> next rise +91 for hits 1 and 2 (`adp1s-beatup-player-on`), the app's hp command is now 91 long; the old comment blamed the multi-hit loop, it was the 28-row floor. The -2 per hit remains (hit-to-hit 195 vs ROM 193), not hp |
| `aud242e` counter-player | Counter body -16 -> -2 | toward ROM. The opponent's hit on the player: ROM bar rise 328 exec 13, next rise +32 = the Counter ATTACKSTRING at 360; the app hp command 327 len 14, ATTACKSTRING at 360 (exact). The pre-body rows keep ROM = ours |
| `aud242e` absorb-player (closing SE238) | -1 -> +11 | not a regression of the hp command, flagged: ROM hit bar rise 302 vs app 291 (+11) and the second player hit +12 (764 vs 752), so the closing SE sits at the lab's constant hit offset (the move-body lead, out of scope); the 28-row floors had hidden it. hit -> drain bar ROM 47 vs app 46; the full-HP drain bar is 1 exec frame in the ROM (app 5) |
| `aud242p` revenge-player | -10 -> +13 | the opponent's Pound hit: ROM bar rise 134 -> next rise +25 vs app +26, ATTACKSTRING -> first Revenge SE 36 vs 37: the hit chain and the Revenge body are exact within 1; the 13 is the opponent body offset (hit rise ROM 134 vs app 119 = +15). The old -10 was the floor overshooting the hit |
| `aud260` recycle-player | -3 -> -4 | the hit -> next ATTACKSTRING is exact (ROM bar rise 1357 + 73 = 1430 = ours); ATTACKSTRING -> first SE is ROM 36, ours 40: Recycle's own body, not hp |
| `aud261` razorwind-player (unleash) | +1 -> +9 | a wash, not exact either way: hit -> next (continuation, no menu) turn is ROM +49 (bar 13), ours 44 now, 4 too long (+1) with the floor. The turn-end command's 8 rows are the open remainder: it was fitted with the floor-held hp |
| `aud252LossBallOpen` 1914 | [-5, -11, -19 x6] -> [0, 1, -7 x6] | toward ROM on every row |
| `aud252LossBallOpen` 2230 | [7, 2, 0 x5, -1] -> [7, 3, 1 x5, 0] | one frame, mixed: the item-effect rows +1, SE_BALL_OPEN exact; re-pinned, flagged (seed replay, no RAM lab) |
| `trn178ActionTransition` (Scene ON Rest anchor) | -3 -> -14 | the same re-pin hpf2 made in `trn181ActionTransitionOn` / `ont193SceneOnTails` (model value: bars 15 rows vs the ROM lab's 8); trn178 duplicates that assertion |

Open from this step: the turn-end command's length when the next turn is a locked continuation (Razor Wind: 5 short); Absorb / Revenge / Counter body offsets (move-body leads); a zero-change drain bar costs 5 app frames vs 1 ROM frame (`aud242e-absorb-player-on`: ROM next rise +47 vs app 46 holds the hit -> drain; the drain -> print part was not isolated).

## lse3: the hpd7 table for the open bodies (measurement only, `src/` / `tests/` unchanged)

Base `f9cdc9c47`. Scene ON (:8012) ROM RAM probes (`tools/integration/hpd2Probe.py`, per-frame ptr / exec / anim / comm / act / ctl / hp) against the app per-command timeline (`tools/integration/hpd4Cmds.ts`). hpd7 method: R = end of the last controller-exec run before `ex = A - 3` (the used print's release); L = ex - R; R->A = A - R; len = `gAnimScriptActive` rows; H = first exec rise after the window; gap = H - (A + len) (normally 4); R->H = H - R; app rows = E - S (the app's move-animation command start to the next command start); d = (R->H) - (E - S) (ROM longer = positive). All labs are existing scenarios except the four `lse3-*` stages (Wish; Pound / Scratch / Tackle on the opponent's side, via a temporary `aud241bStage` entry in `appTrace.ts`, removed again; the scenarios are in the evidence dir). Evidence (git-ignored): `.integration/evidence/lse3/{scen,ram,traces,app}`.

### The table

| move (lab) | ROM L | R->A | len | gap | R->H | app rows | d | shape | proposed landing |
|---|---|---|---|---|---|---|---|---|---|
| Absorb 71 (`aud242e-absorb-player`) | 5 | 8 | 205 | 4 | 217 | 207 (pre 3, idle 10, live 194) | **+10** | A | bodyLead 5, adapter idle + live 204 -> 206 (len + 1), tail 3; the hit bar then lands +11 earlier, closing SE238 included (hpf3's +11) |
| Revenge 279 (`aud242p-revenge-player`) | 5 | 8 | 144 | 4 | 156 | 148 (pre 3, live 145) | **+8** | A | bodyLead 5, tail 3 (live 145 = len + 1 already) |
| Counter 68 (`aud242e-counter-player`) | 4 | 7 | 87 | 4 | 98 | 93 (pre 3, live 88, post 2) | **+5** | A | bodyLead 4, tail 1 (T = 6 - pre 3 - post 2) |
| Recycle 278 (`aud260-recycle-player`) | 2 | 5 | 202 | **3** | 210 | 206 (pre 3, live 203) | **+4** | A, gap 3 | bodyLead 2, tail 2 (T - 1 for the gap 3; the existing `tailRows` 6 is the action-transition anchor, not this tail) |
| Razor Wind 13, unleash (`aud261-razorwind-player`, 2nd window) | 5 | 8 | 72 | 4 | 84 | 75 (pre 3, live 72) | **+9** | A, live = len (1 short) | bodyLead 5, live 73, tail 3 |
| Razor Wind 13, charge turn (1st window) | 1 | 4 | 45 | 4 | 56 | 48 (live 45) | +8 | A, live = len | bodyLead 1, live 46, tail 3 + the 4 "whirlwind" print rows (not a body lead) |
| Mega Drain 72 (`aud242e-megadrain-player`) | 5 | 8 | 217 | 4 | 229 | 221 (pre 3, live 218) | **+8** | A | bodyLead 5, tail 3 |
| Giga Drain 202 (`aud242e-gigadrain-player`) | 5 | 8 | 229 | 4 | 241 | 241 (bodyLead 5, pre 3, live 230) | **0** | A, already exact | none (hpf2 closed the drain-message hold) |
| Wish 273 (`lse3-wish-player`) | 2 | 5 | 270 | **13** | 288 | 274 (pre 3, live 271) | **+14** | C (gap 13) | bodyLead 2 + 12 post rows (see the trace) |
| Pound 1, opponent (`lse3-pound-opp`) | 5 | 8 | 33 | 4 | 45 | 32 (generic pause) | **+13** | not a live adapter | new adapter case: bodyLead 5, live 34, tail 3 |
| Scratch 10, opponent (`lse3-scratch-opp`) | 5 | 8 | 32 | 4 | 44 | 32 (generic pause) | **+12** | not a live adapter | bodyLead 5, live 33, tail 3 |
| Tackle 33, opponent (`lse3-tackle-opp`) | 5 | 8 | 41 | 4 | 53 | 32 (generic pause) | **+21** | not a live adapter | bodyLead 5, live 42, tail 3 |

Every proposed landing is arithmetic on the rule `R->H = bodyLead + pre 3 + live + post + tail`, which reproduces the ROM R->H on all ten rows (Mega 5 + 3 + 218 + 0 + 3 = 229, Counter 4 + 3 + 88 + 2 + 1 = 98, Revenge 5 + 3 + 145 + 3 = 156, Recycle 2 + 3 + 203 + 2 = 210, Razor Wind 5 + 3 + 73 + 3 = 84, Absorb 5 + 3 + 206 + 3 = 217, Pound 5 + 3 + 34 + 3 = 45, Scratch 5 + 3 + 33 + 3 = 44, Tackle 5 + 3 + 42 + 3 = 53). **None of it was run**: this step changes no source.

### Are Pound / Scratch / Tackle live adapters with the lead? No

`liveMoveAnimationDuration` returns null for ids 1 / 10 / 33 (no adapter case), they are not in `HPD8_SHAPE_A_MOVE_IDS` / `BODY_LEAD_AUDITED_MOVE_IDS`, and the timeline shows `move=1 ... pre=0 live=null` (and 10, 33): the move-animation command is the generic `SCENE_OFF_MOVE_PAUSE_FRAMES = 32` with no lead. The ROM windows are 33 / 32 / 41 rows (Pound hitsplat + shake; Scratch has an extra `waitforvisualfinish`; Tackle a lunge + `delay 6` + hitsplat) with the same lead 5 / R->A 8 / gap 4 as the other shape A bodies, so the +13 / +12 / +21 are the missing lead (8) + gap (4) + the window length difference (+1 / 0 / +9). This is where Revenge's +13..+15 (hpf3: the opponent's Pound hit) comes from: the opponent's Pound is 13 rows short, and it is side-agnostic by construction (the opponent labs are measured here; a player-side Pound / Tackle lab was not run). Moves that get a live adapter change every Scene ON battle that uses them, so this wants the census, not just a lab.

### Wish's 13-row gap, per frame (`lse3-wish-player-on`, ROM RAM)

| frame | ptr | exec | act | event |
|---|---|---|---|---|
| 318..321 | `BattleScript_EffectWish+0x9` (`waitanimation`) | 1 | 10 | window rows (A 52 + len 270 = 322) |
| 322 | same | 1 | 10 | `gAnimScriptActive` falls (gap row 0) |
| 323 | same | **0** | 10 | exec falls: `waitanimation` done |
| 324 | `EffectWish+0xb` | 0 | 10 | `goto BattleScript_MoveEnd` |
| 325 | `MoveEnd+0x0` | 0 | 10 | |
| 326..328 | `MoveEnd+0x6` / `+0x8` | 0 | 10 | `end` reached |
| 329 | `MoveEnd+0x8` | 0 | **11** | TRY_FINISH |
| 330 | same | 0 | **12** | FINISHED |
| 331 | same | 0 | **0** | back to USE_MOVE: the next battler's action |
| 332..334 | next script (`EffectDisable+0x1b` / `EffectLevelDamage+0x1..+0x7`, the Seismic Toss prologue; the map has several overlapping labels) | 0 | 10 | |
| 335 | `EffectLevelDamage+0x9` | **2** | 10 | exec rises: the opponent's "used SEISMIC TOSS!" print starts (H) |

The cause is the generic action transition, not a Wish body gap: `BattleScript_EffectWish` ends at `waitanimation; goto BattleScript_MoveEnd`, so exec is low 323 -> 335 = **12 rows** (13 from the window's fall) of `MoveEnd` + act 11 / 12 / 0 + the next script's pre-print rows. A body that ends with a visible print (shape A) hides these rows behind the print; Wish has none. In the app `actionTransitionPauseFrames` returns null when the anchor is the used print (here: the Wish window is the last command), so Scene ON has **no pause**: the app's next command (sprite-visibility 321, message 322) starts 13 rows before the ROM's 335. Landing: bodyLead 2 (L = 2) + a ~12-row action transition anchored on the Wish live window (the lse1 "L 2 + 12 post rows" proposal is now traced).

### Razor Wind's turn-end rows (`aud261-razorwind-player-on`, between the opponent's Seismic Toss and the unleash)

ROM: bar change at 510 (hp 105 -> 93), `MoveEnd+0x0` 516, `+0x6` 517..519, `+0x8` 520, act **11 / 12 / 0** at 521 / 522 / 523, then **523..535 = 13 rows with the pointer frozen at `MoveEnd+0x8`**: the action-selection state of a locked continuation (no menu), then the script: `EffectRazorWind+0x0` 536, `TwoTurnMovesSecondTurn+0x0..0x18` 537..542, `HitFromAtkCanceler` 543, `HitFromAtkString` 544, **exec rise (the used print) 545**, fall 569, anim window 577 (R 569, L 5).

App: hp command ends 511, sprite-visibility 511 / 512, **turn-end 513 (8 rows), next-command-handoff 521 (14 rows), message 535**, move-animation 558.

Measured as MoveEnd receipt -> the print's exec rise, the ROM has 27 rows and the app 22: **the app is 5 short** (about 5-6 depending on the anchor; the unleash's own +9 above is separate and independent). The missing rows are the locked-continuation action selection (ROM 523..535) plus the script's pre-print rows (536..544), neither of which exists in the app's turn-end (8) + handoff (14) constants, which were tuned on menu-driven turns. The charge turn's own turn-end (ROM `MoveEnd` 187 -> act 0 at 194 -> exec rise 198, app message 194) is the ordinary 4-row offset and is fine. Proposal: when the next battler's action is a locked continuation, lengthen the handoff by 5 (not confirmed on a second lab: `aud242o-rollout5-player-on` was probed and timed, but its turns are Defense Curl + Rollout chains and the turn-end comparison was not done).

### Sound clock note

Counter's and Recycle's SE residuals in hpf3 (-2 / -4) are the calibrated K = 7 (`LSE2_SOUND_CLOCK_LEADS` / `lse2BodySoundAgeShift`) minus how early the window sits: Counter's window is 5 rows earlier than the app's (bodyLead 4 + gap), Recycle's 3. Whether the SE residuals close with the leads is not measured here; settle it in the landing run, not by re-pinning first.

### Proposed landing for the next run (one commit per group, census after each)

1. **Plain shape A: Mega Drain 72, Counter 68 (bodyLead 4, tail 1), Revenge 279** into `HPD8_SHAPE_A_MOVE_IDS` with the leads above (each +8 / +5 / +8 to ROM exact). Re-pin the hpf3 Revenge and Counter rows.
2. **Recycle (bodyLead 2, tail 2, gap 3) and Razor Wind unleash (bodyLead 5, live 73, tail 3)**; Absorb separately (bodyLead 5, idle + live 204 -> 206 needs the adapter's idle 10 re-derived first; its +10 persists to the next action).
3. **Wish: bodyLead 2 + the ~12-row action transition** (extend `actionTransitionPauseFrames` to accept a live-window anchor with no print). Needs the Scene ON census.
4. **Pound / Scratch / Tackle live adapter cases** (windows 33 / 32 / 41) with bodyLead 5, tail 3: the widest blast radius (every Scene ON battle with those moves), land last with the 0..99 census and T2.
5. **Locked-continuation handoff +5** after a second lab confirms it.
6. Giga Drain: nothing.

Not done: the 75-minute brief's "npm test green" line was overridden by the step brief (no tests were run, nothing under `src/` or `tests/` changed); `PROGRESS.md` / `ISSUES.md` untouched.

## hpf4m: the shapes still on the fitted 28-row floor, measured on the ROM (measurement only, `src/` / `tests/` unchanged)

Every hp command not yet moved by hpf1 / hpf2 / hie4 still has `max(28, bar + 1)` (`HP_TIMING`, `{minimumFrames: 28}`). One lab per shape, both scenes, built with `overrides.parties` (a Lv50 Rattata / Gastly player against a Rattata foe; `tools/integration/hpf4mLabs.py` writes `tools/battle-lab/hpf4m-<case>-{on,off}.json`). ROM side = `tools/integration/hpd2Probe.py` (per-frame `gBattlescriptCurrInstr`, `gBattleControllerExecFlags`, hp), app side = `hpf1Cmds.ts` through `tools/integration/hpf4mShape.py` (the hpf2Shape tool with per-mode profiles); pointers are named with `hpf4mPtrs.py <ram.json> <from> <to>` (linker map). Evidence (gitignored): `.integration/evidence/hpf4m/{ram,trace}/` and `<case>-<scene>.txt`.

Notation: **E** = the ROM's bar exec run (bar rise to fall) = `battleHealthBarAnimationFrames + 1`, checked on every row below. **next** = bar rise to the next controller exec rise (ROM). **app** = our hp command length (`len`) before the next command.

### Result: ON and OFF agree on every row

All 14 shapes give the same E / next in Scene ON and OFF (the scenes only differ in the hit-animation / sprite windows before the bar, never in the bar-to-next rows), so one rule per shape is enough. Rows with E < 27 are the point: the app's 28-row floor makes them (27 - E) rows too long.

### Table

| shape (lab) | ROM E / next | script source | app now | rule |
|---|---|---|---|---|
| poison tick (`poison`) | E 14 / +22 (E+8) | `BattleScript_PoisonTurnDmg`: `healthbarupdate; datahpupdate; printfromtable; waitmessage` -> `MoveEnd`; the next controller exec is the action prompt | 28 -> turn-end 8 | **T1** |
| toxic tick (`toxic`) | E 7 / 13 / 19 (grows with the counter) -> +15 / +21 / +27 (E+8) | same + toxic counter | 28 | T1 |
| burn tick (`burn`) | E 14 / +22 (E+8) | `BattleScript_BurnTurnDmg` | 28 | T1 |
| Curse tick (`curse`, Gastly, Ghost) | E 27 / +35 (E+8) | `BattleScript_CurseTurnDmg` | 28 | T1 (E 27: no change) |
| Nightmare tick (`nightmare`) | E 27 / +35 (E+8) | `BattleScript_NightmareTurnDmg` | 28 | T1 (no change) |
| Curse cost (`curse`) | E 53 / +55 (E+2) | `EffectCurse` `healthbarupdate; datahpupdate; printstring` | `len 53 -> message` | already exact |
| wrap-family tick (`wrap`, `bind`, `firespin`, `whirlpool`, `sandtomb`, `clamp`) | E 7 on every tick of all six / +15 (E+8) | `BattleScript_WrapTurnDmg` (`healthbarupdate; datahpupdate; printstring; waitmessage; jumpifword...`) | 28 | T1 |
| wrap-family first hit -> secondary message | E 16 (Wrap / Bind), 7 (Fire Spin / Whirlpool), 11 (Sand Tomb), 14 (Clamp) / **E+7** | the hit's `healthbarupdate; datahpupdate; critmessage; waitmessage; ...; seteffectwithchance` -> `BattleScript_MoveEffectWrap` printstring | 28 | **T2** |
| wrap-family later hit (ends in `MoveEnd`, no secondary print) | E 15 / 7 / 10 / 13 / **E+17** | the same bar, but the next exec is the next action's | 28 | already the hpf1 shape (hit -> `MoveEnd`) |
| sandstorm damage, the player's tick (`sandstorm`) | E 7 / +17 (E+10) | `BattleScript_DamagingWeatherContinues` -> `printfromtable gSandstormHailContinuesStringIds; healthbarupdate ... jumpifword; ...` | 28 -> message | **T3** |
| sandstorm damage, the foe's (last) tick | E 7 / +19 (E+12) | same, last battler: `BattleScript_DamagingWeatherContinues` -> `cbf cc8` (end) | 28 -> turn-end | **T3** (+2 over the player's) |
| faint-next tick (`faintpoison`, 5 ticks then faint) | ticks E 4 / 7 / 9 / 12 / 14 -> +12 / 15 / 17 / 20 / 22 (E+8); last tick E 12, next rise **+80** (the `BattleScript_FaintAttacker` chain: `playfaintcry` at E+2, then the 64-row pause) | `BattleScript_PoisonTurnDmg` -> `7aa 7ac 7af 7b1` (faint path) | 28 -> faint | **T4** |
| confusion self-hit (`confuse` seed 3, `hpf4m-confuse-{on,off}-s3`) | E 26 / 35 / 23 / 32 -> +42 / +52 / +39 / +51 (E+16..+17 to the next action) | `BattleScript_MoveUsedIsConfused` -> `BattleScript_DoSelfConfusionDmg` -> `healthbarupdate; datahpupdate; resultmessage; tryfaintmon; goto MoveEnd` | `{minimumFrames: 0, tailFrames: 5..7}` from hpd1 (len 36 / 38 / 30) | **already exact**; the open-remainder note that lists it is stale |
| Substitute cost (`substitute`, `subhit`) | E 27 / **+29 (E+2)** | `EffectSubstitute`: `healthbarupdate; datahpupdate; printstring` | `len 31 -> message` (28 + tail 3) | S1 (off by one on short bars) |
| hit on a Substitute (`subhit`, Lv12 foe) | **no bar**: hit animation 347..379, `datahpupdate` prints `STRINGID_SUBSTITUTEDAMAGED` (`battle_script_commands.c:1818`, string `sText_SubstituteDamaged` ends in `\p`) at 382 | `BattleScript_HitFromAtkAnimation+0x8` | hit-animation 347 -> message 382 `{minimumFrames: 24, holdFrames: 0}`, then sprite-visibility 420 | **S2** (see below) |

Hail is the same script as sandstorm (`BattleScript_DamagingWeatherContinues`, same string table); the hail tick was measured in hpf2 (R3) and not repeated here.

### Rules

- **T1 (end-of-turn status tick: poison / toxic / burn / Curse / Nightmare / wrap family).** The ROM's next controller exec after a tick bar is **E + 8** after the bar rise (the next action prompt, 8 rows of `MoveEnd`), for every bar length from E = 4 to 27, and the app already adds the 8 rows as `TURN_END_TIMING`. So the tick's `hp` is `{minimumFrames: 0}` (the hie4 `ITEM_HEAL_HP_TIMING`, bar + 1 + nothing), not 28. Changes poison / toxic / burn / wrap-family ticks (E < 27); Curse / Nightmare ticks (E 27) stay put. Where it lands: the hp-timing selector next to `ITEM_HEAL_HP_TIMING` for the end-of-turn `B_SCR_OP_HEALTHBARUPDATE` (it is the one that the end2 handlers emit with no preceding hit animation).
- **T2 (wrap family, the hit that applies the wrap).** E + 7 to the secondary-effect message (E 16 / 7 / 11 / 14 by move). Tail 7 on a floor-free hp. It is not covered by the hpf1 critmessage rule (it is a plain `printstring`). Keep ON and OFF equal (the sag130 note).
- **T3 (sandstorm / hail tick).** The player's tick: E + 10 to the weather message (a `printfromtable`, hpf2's R1 tail of kernel executions + 2 applies, the message sits 10 rows after the bar); the foe's / last tick: E + 12 (4 more than T1 because the last battler leaves through `cbf..cc8`). So `{minimumFrames: 0, tailFrames: 10}` for the player and `{minimumFrames: 0, tailFrames: 4}` + turn-end 8 for the last tick.
- **T4 (faint on a small bar).** Every tick except the last is T1. The last tick's faint chain starts at **E + 2** (`playfaintcry`), so `{minimumFrames: 0, tailFrames: 2}`. The current `applyHpHitTails` `faint` rule needs `hit && leads.faintNext` and its `battler === 0` guard skips non-hit commands on the player: drop both for the tick path.
- **S1 (Substitute cost).** E 27 -> +29. App len 31 is one over (tail 3 was fitted on a longer bar); tail 2 with the 28 floor gives 30 = ROM + 1 (the usual +1). Only short bars are affected (cost bars E >= 28 are exact).
- **S2 (hit on a Substitute).** There is no bar: the hit animation ends at 379, `datahpupdate` prints the string at 382, i.e. **3 rows after the hit animation**, the string ends in `\p` (a wait-for-A text, unlike every other battle string measured, which auto-advance after `waitmessage`): the ROM holds the exec at `HitFromAtkAnimation+0x8` until the A press (the lab pressed A at 1122; exec fell at 1125, 719 rows after it started). The app presents a 24-row message and moves on (sprite-visibility 420). In a script-driven lab that is a stall; for the player it means the substitute message waits for input. Decide before landing whether the app should hold the message for a button (it has no wait-for-A command) or keep 24.

### Not verified / caveats

- Not pixel-verified: `tools/compare` matched 0 / 201 frames on these labs (no frame-alignment tooling here); every number is the ROM exec / pointer trace against the app command timeline.
- The app's rng seed does not correspond to the lab seed: app misses / hits can differ from the ROM's (the confusion self-hit needed a ROM seed scan, seed 3). The comparison is the static per-shape timing, not the outcome.
- The player / foe species are Rattata / Gastly (Curse needs a Ghost) and the foe Lv12 Rattata for the hit on a Substitute; the app's stat for those can differ from the ROM's, so hp values differ while E is read per row.
- Seed-scan labs `hpf4m-confuse-*-s2 / s4..s7` were deleted; `hpf4m-confuse-{on,off}-s3` are kept.

### Proposed landing for the next run (one commit per group, census after each)

1. **T1** (poison / toxic / burn / wrap-family ticks) -> `{minimumFrames: 0}` at the end-of-turn hp: poison E 14 (-13), toxic E 7 / 13 / 19, burn E 14, wrap-family E 7. Pin the new lengths on the two scenes; this one has the widest effect (every status tick on a small bar).
2. **T4** faint-next tick (`tailFrames: 2`, drop the `hit` / `battler === 0` guards for the tick path).
3. **T3** sandstorm / hail tick tails (10 for the player, 4 + turn-end for the last).
4. **T2** wrap-family first hit tail 7.
5. **S1** Substitute cost tail 2.
6. **S2** after a decision on the `\p` wait-for-A string.
7. Nothing for Curse cost, Curse / Nightmare ticks (E 27), the confusion self-hit, Leftovers (hie4).

Not done: the brief's "npm test green" line was overridden by this step (no tests were run, nothing under `src/` or `tests/` changed, `tools/compare/appTrace.ts` was patched during measurement and reverted); `PROGRESS.md` / `ISSUES.md` untouched.

## hpf5: the hpf4m rules landed (T1 / T4 / T3 / T2 / S1, both scenes; sta6m is in aud249)

`src/engine/battleResolutionPresentation.ts` only (`applyHpHitTails` + `HpLeadRows`, plus `appTrace.ts` stages `hpf4m-<case>-<on|off>` for the shape comparison). Logical outcomes, RNG and kernel event order are untouched: census 0..199 in both scenes has an identical `eventsDigest` / error / command-type sequence on every seed; only `hp` commands change (and, in Scene OFF, the 22 Flatter / Swagger messages of sta6m). One commit per group.

| group | rule landed | commands changed (census 0..199, vs the previous group; ON = OFF) |
|---|---|---|
| T1 `081574f4a` | end-of-turn tick hp (`BattleScript_DoTurnDmg`'s `datahpupdate`: poison / toxic / burn / Curse / Nightmare / wrap tick) is `{minimumFrames: 0}`; the 8 turn-end rows stay `TURN_END_TIMING` (ROM next exec = E + 8) | 357 / -3280 frames |
| T4 `55575eb4c` | a tick whose next command is the faint chain with `faintNext` is `{0, tailFrames 2}` (faint at E + 2); the `hit` / `battler === 0` guards no longer apply to the tick path | 43 / +86 |
| T3 `754d30a72` | sandstorm / hail tick (`BattleScript_DamagingWeatherLoop`): tail 10 before the next battler's message (E + 10), tail 4 for the last tick, which keeps the 8 turn-end rows (E + 12) | 154 / -1925 |
| T2 `3d62466aa` | the wrap-family hit whose next kernel event is `BattleScript_MoveEffectWrap`'s printfromtable (secondary message): `{0, tailFrames 7}` (E + 7) | 13 / -149 |
| S1 `cbcd44e1b`, corrected `0f4d14e3b` | **Deviation from the hpf4m proposal (tail 2).** Tail 2 was landed first and moved 11 census Substitute-cost bars (all E >= 28) one frame off the ROM; the sub183 dense windows (tools/integration/fixtures/sub183, E 44 -> print at +47, 291 / 291 rows, 4 windows) are exact at tail 3, as hpf4m itself notes ("cost bars E >= 28 are exact"). Landed: `{minimumFrames: 0, tailFrames: 3}` (`SUBSTITUTE_COST_HP_TIMING`): long bars unchanged, the short bar E 27 -> +29 now 30 (ROM + 1, was 31) | 0 frames on the long cost bars (timing object only); 2 short bars change: -5 / -7 frames (seeds 177 / 26: the 28 floor was binding) |

Net per scene at the tip (`443d2f87b`, census 0..199 vs `55b49c3f1`, both scenes, 0 `eventsDigest` / error / type-sequence differences): 543 hp commands, -5280 frames (ON 81 / OFF 92 of 200 battles changed); Scene OFF also 22 Flatter / Swagger messages, +154 (sta6m); Scene ON 0 messages. Sound census (ON): sequences identical on all 200 seeds, frames moved on 74; T1 sound (`soundCensusDelta.py --t1`): extra 0 / missing 0 / unclassified {} in both scenes (non-move exact 21973 ON / 901 OFF, same as base).

**Not changed**: S2 (btn1), Curse cost, the confusion self-hit, Leftovers (hie4), the 28 floor of `HP_TIMING` itself.

### Re-pins (all by the rule; none moves a logical outcome)
- `sub183SubstituteTurnTiming` (4 tests): kept at tail 3 (no re-pin) after the S1 correction; they were the test that showed tail 2 was wrong.
- `aud252EndTurnSounds` weather SE rows (ROM minus ours): `[-8, -2, -10]` -> `[-8, -2, 1]` (T3: the last tick's tail 4 + turn-end 8 replaces the 28 floor; the third row 10 -> 1 toward the ROM).
- `aud248StatChangeSounds` overheat-player residual 17 -> 9 and `aud252LossBallOpen` seed 1914 `[0, 1, -7 x6]` -> `[0, 9, 1 x6]`: **pre-existing, red on the lead3 base (`55b49c3f1`) before hpf5** (identical commands base vs head for overheat-player; the 1914 rows are the same on base); re-pinned to the base value (overheat 8 frames toward the ROM; 1914 rows 3..8 toward the ROM, the select row away).
- `randomRoundSoak` (the exploring / winning policies' presses land on new phases): seed 21 `41_151` / renderCalls 2_898 -> `41_066` / 2_900 (same battle 7, turn 3, end state); M-B (c) full seed 0 `39365` / battle 2 turn 24 / depth 1 -> `18_681` / battle 1 turn 23 / depth 0 (still roundLost), seed 1 `92558` / turn 27 -> `95_266` / turn 29 (same battle 5 / depth 4); the Baton Pass halt pin seed 4 -> seed 7 (batonPassSearch 0:48 hits 7, 8, 10, 15, 16; commits 2, first 31951, halt 32775 on MAWILE); the carry >= 14 pin seed 13 -> seed 2 (winning, max-rounds 3, seeds 0..39: 2, 14, 17, 19).

## ice950m: why seed 950's Ice Ball is the last static command of the census (measurement only, `src/` / `tests/` unchanged)

Question (docs/aud251 "c1k"): census 0..999 Scene ON leaves one static-field command, `static:other:unattributed-gate-301`, seed 950, Ice Ball. Why does the live adapter decline it, and what is the fix. Measured on `c56ae9e19` (tree `bf121f62e`), Scene ON, read / measure only: temporary `console.error` patches in `liveMoveAnimation.ts`, `factoryRoundBattleOrchestrator.ts`, `spriteOrderEventTransform.ts`, each reverted (`git status` clean, `git diff` empty). Evidence under `/tmp/ice950m/` (`s950.jsonl` = unpatched HEAD, `s950q.jsonl` = the attribution fix below).

Reproduce: `node --experimental-strip-types --no-warnings tools/integration/lsd194Census.ts --seeds=950..950 --scene=on --out=/tmp/ice950m/s950.jsonl` (6 s). Command 264 of 488 carries `static:other:unattributed-gate-301`; the same battle's Ice Ball commands 195 and 213 are `approx:castform-form`, so the adapter draws Ice Ball here and only this one body is static.

### Cause (one chain, three links)

1. **Not a lock-turn / Defense Curl gate.** Command 264 is the first body of a fresh Ice Ball lock (`rolloutCounter` 1, adapter counter 0). `liveIceBallCounter` accepts it, no Defense Curl bit is read anywhere in case 301 (`friendship` / curl are not inputs of the Ice Ball adapter), shiny is false. The decline is the very first line of `case 301` in `liveMoveAnimationPresentationProven` (`liveMoveAnimation.ts` ~4599): `if (counter === null || !spriteOrderInput?.known) return null;`. Measured: `counter=0 rollout=1 turn=0`, `spriteOrderInput` **undefined** (no lend at all, not a deferred marker). That bare `return null` is the "unattributed gate": the sibling adapters (many; `grep -c 'declined(declineSink, "sprite-order-unknown")' src/engine/liveMoveAnimation.ts`) write `return declined(declineSink, "sprite-order-unknown")` for the same condition; case 301 was written before the reason codes and never got it. `liveMovePresentationDeclineReason` then falls to `other:unattributed-gate-301`, and `byPolicy` treats an unknown `other:` reason as static (only `LIVE_MOVE_APPROXIMATE_OTHER_REASONS` members are approximate).
2. **Why the lend is undefined.** At the orchestrator the body is lent a deferred words marker (`lend deferred`, tracker `known=false`, `deferred.moveId 301`, rc 2: the pending marker of the earlier Ice Ball chain, commands 195 / 213). At the render seam `resolveWordsOrderLend` -> `resolveSpriteOrderDeferredLend` replays the units recorded since that marker on the post-Ice-Ball order (liveMoveAnimation.ts ~2035) and returns **null**, so `spriteOrderInput` becomes undefined ("an unresolved marker leaves no lend and the body declines", the comment in case 301). Units since the marker (event-sequence numbering of the lends): Hail continues, Water Pulse 352 (replays, known), then the player's **Shock Wave 351**, Icy Wind 196, Ember 52, then this Ice Ball.
3. **The replay breaks on Shock Wave 351.** `applySpriteOrderPresentationEvent` for `move-animation 351:player` logs `invalidate: no EXACT plan: body 351:player` (46 + 8 times over the repeated renders; every other unit replays). 351 is in `SPRITE_ORDER_GEOMETRY_KEYED_BODIES`: its plan needs `liveShockWaveSpriteOrderPlanText(field, attackerSide, lentFree)`, and `lentFree` is the order the body is lent. `advanceLiveSpriteOrderHost` (liveSpriteOrderHost.ts ~556) asks `bodyPlanAt(..., spriteOrderTrackerLend(tracker) ?? undefined)` **at record time**; while a words marker is pending the tracker is unknown, `lentFree` is undefined, the plan text is null, and the unit is recorded without `geometryPlan`. The replay at resolve time has the lent order (the replayed tracker's), but only reads the recorded plan. Water Spout 323 (same `lentFree` keying) is the same class; Giga / Mega Drain / Dream Eater / Eruption / Hail / Blizzard plans do not use `lentFree` and replay fine.

Same root as the battle's other two `approx:sprite-order-unknown` commands (272 Water Pulse, 291 Shock Wave: later bodies after the same pending marker). Those are approximate because their adapters attribute the gate; Ice Ball's is the only adapter that does not, which is why it is the only static one.

### Proposed fixes (two independent steps)

**A. Attribution (one line, no ROM window).** In `case 301`: `if (counter === null) return null; if (!spriteOrderInput?.known) return declined(declineSink, "sprite-order-unknown");` (the counter-null case stays: an out-of-range rollout counter). The existing apx219 fallback then draws the body with the known-entry first-body order, as every other body in this state. Verified by a temporary patch of exactly that line (reverted): seed 950 command 264 -> `approx:sprite-order-unknown`; census class totals 420 none / 36 live / 25 pause / 3 castform / **3 sprite-order (was 2)** / 1 endeavor / **0 static (was 1)**; commands 0..488, every field [0..20] (frames, hp / tail timing, sound rows) identical to HEAD (`diffs excl [21]: 0`), `eventsDigest` / `soundDigest` / `sound` / `soundAnim` identical. So no gameplay, RNG, sound or timing change: only command 264's picture changes from the static field to the Ice Ball body drawn on the fallback sprite order (approximate class, counter 0, whose order is the proven known-entry state: the adapter's counter-0 first-body proof is the aud242q / hpd5 lab). It stays approximate (ordering of the shard sprites may differ from the ROM), not live. Pins to add with it: `tests/apx210LivePlaybackClassification.test.ts` (an Ice Ball counter-0 command with an unresolved lend classifies `approx:sprite-order-unknown`) plus the census static count 1 -> 0 in the aud251 scoreboard. No other test pins `unattributed-gate-301` (`grep -rn unattributed-gate tests tools docs` is empty).

**B. Make it live (exact lend), needs a ROM window.** Record the lent-order-keyed bodies (351, 323) in a pending words marker with their inputs (the displayed field + attacker side) instead of a plan text, and let `resolveSpriteOrderDeferredLend` / `applySpriteOrderPresentationEvent` compute `liveShockWaveSpriteOrderPlanText(field, side, spriteOrderTrackerLend(replayTracker))` at replay time (the order the body is lent is exactly the replayed tracker's). With that the marker resolves through Water Pulse -> Shock Wave -> Icy Wind -> Ember and command 264 (and 272 / 291) leave `sprite-order-unknown`. The plan is a model computation, not a ROM fact at that composed order: the Ice Ball post-free (ice72) is ROM-checked, Shock Wave's plan (sw67) was proven at the lends its own windows staged (not re-checked here which), not at an order composed through an Ice Ball marker. **A window is needed before B may be called exact**: Sealeo (opponent) Ice Ball counters 0 and 1, then a player Shock Wave user (any species with 351; Castform forms are not required, a species without form art removes the `castform-form` approximation), then Sealeo's Ice Ball counter 0 again, ROM OAM draw order of the final body's shards vs the model's; one probe plus one extra with Water Pulse between (the seed-950 order). A second case with Water Spout in place of Shock Wave covers 323. B alone is ~20 lines in `liveSpriteOrderHost.ts` / `spriteOrderEventTransform.ts` and moves the sprite-order pins (`tests/spriteOrderEventTransform.test.ts`, `liveSpriteOrderHost`); do A first (zero-risk, closes the c1k census), then B behind the window.

### Gates / caveats

Docs only: no change under `src/` or `tests/`, no `npm test` run (as instructed), no ledger edited (`PROGRESS.md` / `ISSUES.md` untouched). Only seed 950 was measured; other seeds' Ice Ball commands are not static (census c1k). Whether fix A's drawn body is visually acceptable was not checked against the ROM (no window was run; the sampled class is read on the first presenting row, and the fallback path is age-independent).
