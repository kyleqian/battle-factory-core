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
| Earthquake (89) | 207 (R 53, A 67, H 278), lead 11 | `2599-2608`: two `AnimTask_HorizontalShake 10, 50` at the first row, two `complex_palette_blend` at +13 / +31, `end` (no `waitforvisualfinish`) | 198; `liveMoveAnimation.ts:1367` "accepted window (197 rows from presentation age 1)"; `src/animation/earthquake.ts` `horizontalShakeAtAge(age, 10, 50)` (run here: last active age 196, so the task is destroyed on the age-197 callback) | **tail** (consistent / open): the app's 198 = the shake task's destroy row (the script has nothing else to wait for: `end` waits on `gAnimVisualTaskCount`, battle_anim.c:476). The 9 rows after it (207 - 198) can only be `end`'s `IsSEPlaying` wait on `SE_M_EARTHQUAKE` (a long rumble made of `PATT` patterns, which the extractor's `seExact` refuses, so the exact length was not computed; 9 << the 90-row cap, so it is a plain song end) | **207** (= the ROM window; the 2 extra relative to `len + 1` in the hpd7 table is the one convention row, check against `len + 1` = 208 before landing) |
| Solar Beam (76), unleash turn | 237 (R 630, A 638, H 879) | `5437-5460` (`SolarBeamUnleash`, 21 orbs x `delay 4` + `ShakeMon2 2, 0, 65, 1` + `BlendBattleAnimPal 10 -> 0` + `UnsetSolarBeamBg` = `restorebg; waitbgfadein`, then `SolarBeamEnd: waitforvisualfinish; end`); `SetSolarBeamBg` `10200-` | 160 = `SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE` + 1 (`liveMoveAnimation.ts:1325-1326`, `src/animation/solarBeam.ts:19`); the reducer models the shake 22 .. 150, BG back at 151, target palette blend to 159 (`solarBeam.ts:243-270`) | **tail, 78 dead rows** (open on the exact end, derived on "nothing is drawn"): after the BG restore and the palette blend (the last commands, both in the app's 0..159) the script has only `goto SolarBeamEnd; waitforvisualfinish; end` left - no sprite, task, BG or palette command exists in rows 160 .. 237, so nothing can be drawn there; the only thing still alive is `end`'s wait (sound: the `panse` task `Task_PanFromInitialToTarget` is 64 pan steps and is over long before; `IsSEPlaying` on `SE_M_SOLAR_BEAM`, whose flat song is **194 VBlanks** by a port of the extractor's `seExact` run here). 78 < the 90-row cap, so the window ends with the song, not the cap. **Open: 4 (the app's sound age) + 194 = 198, not 237** - the song would have to start at about row 43, or the sound is retriggered; I could not reconcile it without a sound probe | **238** (= `len + 1`); a pure timing hold, no renderer work |
| Mud-Slap (189) | 51 (R 55, A 63, H 118) | `5220-5236` (slide out, `waitforvisualfinish`, slide back, 6 x `MudSlapMud` (5 sprites, `delay 2` = 4-row stride, `MUD_SLAP_MUD_WAVE_STRIDE`), `waitforvisualfinish`, `end`; mud lifetime 21, `mudSlap.ts:41-44`) | 51; `liveMoveAnimation.ts:1572` "A..A+50 (prep17: 77..127 / 81..131 / alt 72..122)" | **convention** (consistent): the prep17 accepted window is the inclusive A .. A + 50 = the ROM's 51 rows, i.e. it does not own the first inactive row every other body's `live` includes (shape A = `len + 1`); the row after the last mud sprite draws nothing | **52** (= `len + 1`; lead 5 + T 3 then lands the hit on H, equivalent to the hpd7b "T 4 with live 51") |

What this changes for a landing:

- **The four hpd7 shape-B bodies are two different faults.** Faint Attack's missing rows are at the **head** (the window opens 4 rows after A; nothing is drawn there, so extending the end is a dead hold either way) and Bite's are at the **tail** (`delay 1` + `end`, derived to the row); Sludge Bomb and Earthquake are tail shortfalls whose last 5 / 9 rows are `end`'s own wait and are not derived. In all four the rows to add are rows where the ROM draws nothing new, so lengthening `live` is a timing change only, **except that any sound age counted from the window end or start must be re-checked** (hpd7: `withoutBodyLead`, `AGE_TO_SOUND_ROWS`, the `aud242b/e/f/i` fixtures).
- **Solar Beam** needs no renderer work: 78 rows of hold after the beam (rows 160 .. 237), which is the largest single shortfall in the tables (`d = 86` of which 8 = lead 5 + T 3). The one thing worth a probe before landing is *why* the window is exactly 237 (sound end), because that decides whether the same 78 rows hold on the opponent-attacker side and on a seeded second use; if the `end` wait is the SE, the value is the same on both sides (the song does not depend on side) and `live` = 238 is a constant.
- **General rule found (new)**: the ROM window = script end + `Cmd_end`'s `IsSEPlaying` wait (<= 90 rows). Any body whose app `live` ends at the last visual row will be short by (its SE's remaining length after the visuals, or the `delay` / `end` rows); this is the likely cause of the remaining shape-B-like shortfalls (`Mud-Slap` is a convention row, not this). The extractor's `seExact` (`tools/extract/extract-anim-sound-timing.ts:1463`) gives the song length for flat songs (Solar Beam 194, Faint Attack 32, Bite 19, Dig 17, Bubble3 19, Sand Attack 26 VBlanks) and refuses `PATT` songs (Earthquake), so it can fill the SE-wait part of every body without a new probe once the SE start row is known.
- Not done: no landing, no sound-fixture check, no opponent-side run; Faint Attack's opponent-lag +1 and Sludge Bomb's SE wait are assumptions.
