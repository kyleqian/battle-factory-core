# lead1m: landing the move-body lead + tail by RULE (Scene ON) - design, measurement only

Step lead1m (side lane, branch `worker/side-20261119-033644`). READ / MEASURE ONLY: nothing under `src/` or `tests/` changed (a temporary probe patch in `moveAnimationScriptLeadTiming` was applied for the census and reverted with `git checkout src`; saved only in /tmp). New kept tool: `tools/integration/lead1mCensus.ts` (a copy of `liveShareCensus.ts` that adds the per-command row decomposition and `--probe=` / `--nextprobe=` dumps; the probe dumps are empty unless the temporary patch is applied). `npm test` was not run (step rule); `npm run build` is the gate for the kept tool.

Inputs: a 200-battle Scene ON census (seeds 0..199, three jobs): **8,043 commands, 5,245 move-body commands, 825,939 frames, every body live** (0 non-live). The audited sets (`HPD4_BODY_LEAD_MOVE_IDS` 6 ids + `HPD8_SHAPE_A_MOVE_IDS` 24 + `STA5_STATUS_BODY_TAIL_ROWS` 5 + `LSE2_BODY_LEAD_MOVE_IDS` 4 = `BODY_LEAD_AUDITED_MOVE_IDS`, 39 ids, no overlaps) cover **1,830 / 5,245 = 34.9 %** of the body commands; **65.1 % still carry no ROM lead** (agrees with phy1m's 63.6 % on its census).

## Answers in one screen

1. **Lead (question 1): yes, by rule.** The instruction counter (`instructionExecution(MOVE_ANIMATION) - (instructionExecution(used print) + 1)`, minus the rows already presented since the print) equals the ROM-measured lead for **every plain body measured in the ROM** (86 ROM lead entries from the hpd3 / hpd4 / hpd7 / hpd7b / hpd7c / lse1 / lse3 / phy1m tables; 75 of those moves occur in the census: **70 match in every one of their 3,124 commands**, and 5 are *variants* (Brick Break, Curse, Petal Dance, Rollout, Ice Ball) where the counter returns two values by branch / turn; for Brick Break, Curse and Petal Dance the ROM entry equals the dominant value, for Rollout / Ice Ball the ROM table entry is not the audited 10 / 9). There is no body where the counter is simply wrong. What the counter does NOT serve: multi-hit hits 2+ (the used print is far back, `presentedSinceUsed = null`, no lead returned), charge turns (`CHARGE_TURN_SCRIPT` is excluded on purpose), and the unaudited ids (the lead is only *kept as `scriptTailRows`*, not as `bodyLeadFrames`: the gate is `BODY_LEAD_AUDITED_MOVE_IDS`, `battleResolutionPresentation.ts:1704`, `:1756`).
2. **Tail (question 2):** `T = 6 - pre - post` (`liveMoveHitTailRows`) holds only when the adapter window is `len + 1` (idle + live) **and** the post-attack gap is 4. Of the 5,245 census commands: **A (exact, s = 0, gap 4) 1,697 audited-or-measured + 960 unmeasured-but-predicted (`A?`) + 216 within +-1 (`A~`)**; B (adapter window != len + 1) 229 + the status bodies; C (gap != 4) 178 + 80 predicted; S (tail-carried status bodies) 1,164; CH (charge turns) 231; V (variant leads) 214; X (next command chain not measured) 276. Full per-body list: Appendix.
3. **Sound clock (question 3):** the generic emitters already key on `bodyLeadFrames > 0` (hit SE, hp bar, faint, `moveBodyExtraRows`, `presentedMoveDurationOnSoundClock`), so a rule-wide lead lands them with no per-id work. Four sites carry per-id tables / hard-coded audited sets that must be turned into rule code or extended in the same batch: `LSE2_SOUND_CLOCK_LEADS`, `statusAnimationScriptAge` (`STA5_STATUS_BODY_TAIL_ROWS`), `statsChangeSourceAge`'s two after-body shifts (4 / 3), and the render effect's `HPD8_SHAPE_A_MOVE_IDS || STA5...` gate (`battleResolutionPresentationRender.ts:2500`).
4. **Pins (question 4):** 71 test files import `tests/helpers/iu120Rows.ts` (61 under `tests/animation/live*Adapters`), whose lead / tail maps are per-id (`HPD8_SHAPE_A_IDS`, `HPD4_BODY_LEAD_ROWS`, `HPD8_DEFAULT_LEAD`); five more test files name the bodyLead / tail API directly. Fix the helper once to the rule and most pins follow; the literal row-count pins (like `Ice Beam 206 -> 214`) and ~6 sound / lab fixtures re-pin per batch. Landing order: batch by census mass (section 4).

## 1. Lead: counter vs ROM

### Mechanism (what the counter returns, and where the lead goes today)

`moveAnimationScriptLeadTiming(events, index)`: `lead = instructionExecution(MOVE_ANIMATION) - (instructionExecution(the used print) + 1)`, then `bodyLead = lead - rows already presented since the used print` (a 2-row `stat` command precedes Double Team, Charm, Smokescreen, Agility, Flash, Defense Curl, so their bodyLead is the counter minus 2; Double Team 3 -> 1).

- audited id (`BODY_LEAD_AUDITED_MOVE_IDS`) and not a charge turn: returns `{ bodyLeadFrames: lead }`, presented as the command's first rows;
- every other id: returns `{}`; the lead is added to `scriptTailRows` instead (`nextExecution - attackExecution + 1 + 1 + lead`, `:1756`) when the next command is a non-hit; for the plain hit bodies (Shadow Ball, Metal Claw, Slash, ...) **no lead row exists at all** (rows = pre 3 + idle + live), which is the phy1m "63.6 % lack the lead".

So the status bodies (class S) already present lead + `Delta + 2` after the body (`tr = Delta + 2 + lead`, e.g. Protect 2 + 2 + 2 = 6, Light Screen 2 + 2 + 3 = 7, Rain Dance 6, Smokescreen / Agility 6 = 3 + 3 + (3 - 2 presented rows = 1)). A rule landing **moves** that lead in front of the body (the row total is unchanged; the sound clock and the position of the attack animation shift by `lead`). For the plain hit bodies it **adds** `lead + T`.

### Table: measured ROM lead vs counter (census n over 200 battles; counter = the value in the dominant probe key, plain; "x/y" = counts)

The counter equals the ROM lead for all of these (ROM L from `docs/hpd1-hp-hold.md` hpd3 / hpd7 / hpd7b / hpd7c / lse1 / lse3 and `docs/phy1m-nonlive-bodies.md`):

| lead | bodies (census n) |
|---|---|
| 5 | Aerial Ace 142, Surf 115, Psychic 111, Rock Slide 97, Faint Attack 89, Double-Edge 85, Bite 77, Quick Attack 74, Ice Beam 72, Mud-Slap 68, Giga Drain 66, Sludge Bomb 62, Thunderbolt 62, Body Slam 55, Icy Wind 49, Water Pulse 48, Ancient Power 44, Dragonbreath 44, Silver Wind 36, Bubble Beam 36, Facade 34, Struggle 33, Fire Punch 33, Flamethrower 32, Mega Kick 32, Frustration 31, Spark 30, Hydro Pump 29, Thunderpunch 27, Magical Leaf 24, Fire Blast 21, Dream Eater 13, Blizzard 13, Mega Drain 11, Defense Curl 9 (after its 2 stat rows), Absorb 4; Dig 107 and Solar Beam 45 (attack turn; the charge turn is 1) |
| 2 | Protect 117, Rain Dance 45, Wish 39, Calm Mind 16, Swagger 16, Cosmic Power 15, Recycle 5, Encore 5, Flatter 4, Bulk Up 3 |
| 3 | Double Team 180, Light Screen 46, Smokescreen 37, Sandstorm 33, Charm 32, Safeguard 28, Agility 23, Hail 18, Flash 7 |
| 4 | Curse 51 (plain), Counter 30 |
| 6 / 7 / 8 / 9 / 10 / 11 | Confuse Ray 94 + Seismic Toss 9 (6); Brick Break 70 + Hypnosis 12 + Spore 2 (7); Yawn 12 (8); Thunder Wave 39 (9); Toxic 29 (10); Earthquake 161 (11) |
| 15 / 16 / 36 | Comet Punch 17, Doubleslap 11 (hit 1: 15); Double Kick 67 (hit 1: 16; hit 2 ROM 19); Leech Seed 12 (36) |

### Variants (the counter returns two values; ROM also has two)

| body | counter | ROM | cause (from the probe key; the exact script branch is **not** verified here) |
|---|---|---|---|
| Brick Break 280 | 7 x 68, 8 x 2 | 7 | the 2 = a target with a screen (the `removelightscreenreflect` path adds an executed instruction); ROM lab has no screen so only the 7 is measured. **Check item:** ROM-measure the 8. |
| Curse 174 | 4 x 49, 6 x 2 | 4 | the 2 = the Ghost-type Curse branch (a different script path; the ROM lab is the non-Ghost branch). **Check item.** |
| Petal Dance 80 | 8 x 16, 7 x 19 | 8 | first turn vs the locked continuation (one skipped instruction); the ROM lab measured turn 1 only. **Check item** for 7. |
| Rollout 205 | 10 x 13, 9 x 17 | 10 (turn 1; hpd2 / hpd3 "Rollout 10 lead"); my table also holds a 5 | turn 1 vs the chained turns (the counter's 10 / 9 split equals the audited `HPD4_BODY_LEAD_ROWS` 10 and the hpd2 chained-turn constant); the extra 5 in my ROM list is not a measured Rollout lead. |
| Ice Ball 301 | 10 x 8, 9 x 11 | my table says 5 | hpd4 audited 10 (turn 1) / 9 (later); the 5 entry is a pre-audit table value, so this is a **table error, not a counter error**. **Check item:** one ROM window for Ice Ball turn 1 and turn 2. |

### Not served by the counter (needs its own rule, not a table)

- **Multi-hit hits 2+** (Double Kick, Doubleslap, Comet Punch, Fury Swipes ...): 34 of 67 Double Kick commands return a lead (hit 1 = 16), the other 33 have `presentedSinceUsed = null`; ROM measured 19 for Double Kick hit 2, 15 for Doubleslap / Comet Punch hit 1. The *later-hit lead* is the instruction count of the multihit loop (`jumpifbyte` / `goto BattleScript_MultiHitLoop`) between the previous hit's `Cmd_end`-less return and the next `attackanimation`; the counter has no "used print" anchor there. Mass 6 bodies, ~230 commands (4.4 %).
- **Charge turns** (Dig 107, Solar Beam 45, Dive 35, Fly 20, Bounce 19; 231 commands, 4.4 %): ROM lead 1 for the charge turn (Dig / Solar Beam `[1, 5]`: 1 = charge turn, 5 = attack turn). `CHARGE_TURN_SCRIPT` is excluded in `moveAnimationScriptLeadTiming`; the charge turn keeps its `scriptTailRows` (the message follows at Delta 6 -> gap 7). Keep excluded; the attack turn (5) is already audited for Dig / Solar Beam (`HPD8_SHAPE_A`: 91, 76).
- **Hit 1 of the later-turn Rollout / Ice Ball chain**: served (9 / 10).

### Caveats

- The counter is census-derived (it IS the app value); the ROM column is from the stored labs. Bodies in the ROM tables that never occurred in 200 battles (Absorb-class rarities: ids 10, 33, 70, 15, 30, 11, 279, 13, 49, 82, 1) are covered by the kernel rule only; they are not re-checked here.
- Sleep Powder-class bodies (class C?, `set-battler-status-data`; counter 7) have no ROM lead entry: predicted only.

## 2. Tail: T = 6 - pre - post

### The rule

Per hpd7 / hpd8: the ROM window from the used print's release R to the hp-hold H is `R -> A = L + 3`, `len` = `gAnimScriptActive` rows (script end plus `Cmd_end`'s `IsSEPlaying` wait, liv1), `gap = H - (A + len)`, so `R -> H = L + 3 + len + gap`. The app presents `bodyLead + pre + (idle + live) + post + tail`; with `bodyLead = L` and `pre = 3`:

`T = 3 + len + gap - pre - (idle + live) - post`.

**Shape A:** `idle + live = len + 1` and `gap = 4` -> `T = 6 - pre - post` (`HPD8_SHAPE_A_ROWS_AROUND_BODY = 6`, `liveMoveHitTailRows`: pre 3 / post 2 -> 1; pre 3 / post 0 -> 3; pre 0 / post 0 -> 6).
**Shape B:** `s = len + 1 - (idle + live) != 0` (the live adapter window is not the ROM script length): the formula needs `s` added (`T = 6 - pre - post + s`), which only makes sense once the adapter window is itself correct.
**Shape C:** `gap != 4`: `T = 2 + gap - pre - post + s` (general form, s = 0). The gap is a function of the *next executed command* and is **predictable from the next-event opcode chain** (measured in the ROM for the bodies below; the probe's next-event key gives the same chain for every unmeasured body):

| next command after `attackanimation > waitanimation` | executed instructions to the next controller command | gap |
|---|---|---|
| `effectivenesssound` / hit (play-se) | 2 | **4** |
| `printfromtable` / `printstring` (message) | 2 | 3 |
| stat-stage-change anim | 3 | 4 (Smokescreen, Agility ...) / 5 (Curse) |
| `setmoveeffect` / set-battler-status-data | 3 | 5 (Thunder Wave, Toxic, Hypnosis ...) |
| status-animation | 4 | 5 (Confuse Ray) |
| play-se Delta 4 (Brick Break `removelightscreenreflect`) | 4 | 6 |
| charge message | 6 | 7 |
| Wish (MoveEnd / action transition) | n/a | 13 |

### ROM length vs adapter window (s) for the bodies with a ROM len (census n)

All of these have gap 4 unless a different gap is listed. **s = 0** (shape A or C): Earthquake 161, Aerial Ace 142, Surf 115, Psychic 111, Rock Slide 97, Double-Edge 85, Bite 77, Quick Attack 74, Ice Beam 72, Giga Drain 66, Sludge Bomb 62, Thunderbolt 62, Body Slam 55, Icy Wind 49, Water Pulse 48, Ancient Power 44, Bubble Beam 36, Facade 34, Struggle 33, Flamethrower 32, Mega Kick 32, Counter 30, Hydro Pump 29, Magical Leaf 24, Fire Blast 21, Comet Punch 17, Mega Drain 11, Doubleslap 11, Double Kick 67 (hit 1); with gap != 4 (C): Confuse Ray 94 (5), Thunder Wave 39 (5), Brick Break 70 (6), Curse 51 (5), Wish 39 (13), Flatter 4 (7), Spore 2 (5).
**s = +-1 (A~):** Faint Attack -1 (89), Mud-Slap +1 (68), Fire Punch +1 (33), Dream Eater -1, Blizzard -1, Charm +1, Smokescreen -1, Swagger +1, Hypnosis +1: probably a side- / level-dependent window (the census mode vs a single lab row); **check item:** per-side ROM lab.
**s != 0 (B):** Dragonbreath +4 (44), Silver Wind -3 (36; the census live duration 196 differs from the phy1m lab 193, so side- or level-dependent), Frustration -37 (31; the ROM lab used one friendship, the script length depends on it), Spark +11 (30), Thunderpunch +32 (27), Toxic +5, Absorb +2, Calm Mind +4, Encore +5, Double Team -80 (180; the 3-animation status body), Light Screen -2, Dig -127 and Solar Beam +130 (charge / attack turns share one id; per-turn lens). **For these the tail cannot be landed by `6 - pre - post` until the adapter window is fixed**; landing the *lead* is still correct (it needs no window).

**Answer to question 2:** T = 6 - pre - post holds for the **20 audited shape-A ids (`HPD8_SHAPE_A`, 1,398 commands, 26.7 %)** and for **9 more measured bodies (Double Kick, Icy Wind, Water Pulse, Facade, Mega Kick, Counter, Comet Punch, Mega Drain, Doubleslap: 299 commands, 5.7 %)**, with 114 + 102 more at +-1. It does not hold for the 6 + 3 B bodies (229) and the C bodies (178 + 80 predicted), which need the general formula with their measured gap.

## 3. The sound clock

`liveMoveSourceAge` ignores `bodyLead` (the "pre-lead clock": `AGE_TO_SOUND_ROWS = 7`, `FIRST_COMMAND_AGE = 1`): the ROM-calibrated sound ages are measured against the release row, so the body's lead rows are subtracted by `withoutBodyLead` before the clock is read.

**Generic (already keyed on `bodyLeadFrames > 0`, so a rule landing moves them with no per-id work):**
- `battleHitSounds.ts:85-93, 106`: hit SE, hp-bar SE and the faint cry use `moveBodyExtraRows(after, false)` (`battleResolutionPresentationRender.ts:1626`: `battleResolutionCommandDuration(command) - battleResolutionCommandDuration(withoutBodyLead(command))`) and `presentedMoveDurationOnSoundClock` (`:1645`); `SCENE_ON_LAG = 7`. Gate `(command.timing.bodyLeadFrames ?? 0) === 0` at `:89` and `:106` = no lead -> old path.
- `moveAnimSounds.ts` move-animation SE via `liveMoveSourceAge(withoutBodyLead(command))` (`:1667-1670`).
- `battleResolutionCommandDuration` (`:1825`) and the render effect (`:2495`) add `bodyLeadFrames` into `seGate`.

**Per-id tables that need the rule (one change each):**
1. `LSE2_SOUND_CLOCK_LEADS` (`battleResolutionPresentation.ts:1679`: 73 -> 7, 322 -> 7, 347 -> 7, 227 -> 3) and `lse2BodySoundAgeShift` (`bodyLead - calibrated`): the *calibrated lead* is the lead the older sound fixtures were fitted with (status bodies whose sounds were calibrated with the lead in the tail). For every other status body (class S, 1,164 commands) landing the lead moves its SE ages by `lead` exactly when its sound clock was calibrated on the lead-in-tail timeline; **each S body needs `calibrated = (the tail lead it carries today)`**, i.e. `LSE2_SOUND_CLOCK_LEADS` becomes "the tail lead the body carried before the rule", = the counter's residual lead (`tr - Delta - 2`) and could be computed instead of tabled. This is the only per-body knowledge needed for S.
2. `statusAnimationScriptAge` (`moveAnimSounds.ts:436-448`): `STA5_STATUS_BODY_TAIL_ROWS`-only (260, 207, 147, 92, 95): after a body with `bodyLeadFrames > 0` the status-animation SE age is `0` instead of the 7 of the tail path. Generalise to `bodyLeadFrames > 0` (the status-animation next command is Delta 4, gap 5: Confuse Ray 94, Thunder Wave 39 (set-battler-status-data), Sleep Powder / Lovely Kiss / Sing / Will-O-Wisp / Glare ... class C / C?).
3. `statsChangeSourceAge` (`:1699-1715`): the `afterStatBody` (4) / `afterBodyLead` (3) shifts after a lead-carrying body; generalise the predicate (it already tests `bodyLeadFrames > 0`, so it follows) but **re-measure** the two constants for the first S-body batch: they were fitted for the audited bodies only.
4. The render effect gate (`:2500`): `HPD8_SHAPE_A_MOVE_IDS.has(id) || STA5_STATUS_BODY_TAIL_ROWS.has(id)` selects the audited hit-tail / status-tail composition; replace by `bodyLeadFrames > 0`.
5. Sound-ROM fixtures calibrated on the lead-in-tail timeline (aud242 family etc.): section 4.

`withoutBodyLead` / `moveBodyExtraRows` need no change (both are lead-presence functions); the four code sites above are the only audited-id tables on the sound path.

## 4. Pin fallout and landing order

### Which tests pin body-relative frames

- `tests/helpers/iu120Rows.ts` (102 lines): per-id maps `HPD8_SHAPE_A_IDS`, `HPD4_BODY_LEAD_ROWS`, `HPD4_BODY_TAIL_ROWS`, `HPD8_DEFAULT_LEAD`, `STA5_STATUS_BODY_TAIL_ROWS`, `iu120Pre/Post`, `hpd4BodyRows`, `iu120Ages`, `iu120EffectAges`. Imported by **71 test files** (61 `tests/animation/live*Adapters`, `liveFirePunchBody`, `liveHowlAdapter` ..., plus `shp116ShadowLeadRow0`, `iu120UniversalRows`, `playable*AnimationLifecycle`, `battleResolutionPresentation`, `substituteDollDefenderLive`, `stl109Struggle`, `land97IdleLeadRows`, `wordsOrderDeferredLend`). Rewriting the helper to compute lead and tail by the same rule as the source moves every ordinary-body expectation in one place; the literal-count pins in the adapter tests (e.g. `liveRockSlideSides` 138 -> 149, `liveAnchor4` Earthquake 198 -> 208) are per batch.
- Direct API pins (`bodyLeadFrames` / `scriptTailRows` / tail functions): `tl204ZeroTailRows`, `ont193SceneOnTails`, `aud242oMoveAnimSounds`, `battleTurnPortability`, `sub157SceneOffSubstitute`.
- Sound fixtures calibrated on the pre-lead clock: `aud242a`..`aud242r` MoveAnimSounds, `aud248StatChangeSounds`, `aud249` / `aud250` GeneralAnimSounds, `aud252*`, `aud257CosmicPowerSounds`, `aud258` .. `aud262`, `hie1..4`, `hpf1/2`, `hpd1HpHold`, `sta3PreMoveStatusTiming`, `sub183SubstituteTurnTiming`, `ais2AiSwitchFrames` (ROM window offset), `lbrd` seeds (the Scene ON deal moves with the row totals).
- Tools: `tools/integration/hpd4Cmds.ts`, `lsd194Census.ts`, `phy1mRank.ts`, `soundCensusRomReplay.ts`, `tl204Compare.ts` name the API.

Precedent (hpd8, 24 bodies, 527 commands changed): pins moved by the uniform **+6 (lead 5 + T 1) / +8 (5 + 3) / +11 (5 + 6)** per body; `aud252LossBallOpen` / `ais2` moved toward the ROM; soundScoreboard sums |delta| 14,818 -> 14,560 with the already-near groups overshooting by the shift. A rule landing will repeat this at larger scale: **expect every pinned ordinary body to move by lead + T** (+6 / +8 / +11 for the plain gap-4 bodies; for the S bodies the row total is unchanged and only sound ages shift by `lead`).

### Landing order (one batch = one source commit, one 200-battle census, the full suite)

Mass is of the 5,245 census commands; "pass" = `eventsDigest` / type sequence unchanged, only fields lead / minimum frames change, Scene OFF 100 / 100 identical, T2 missing / extra 0.

| batch | what lands | bodies | commands | notes |
|---|---|---|---|---|
| **B0** (no behaviour change) | Replace the audited-id sets in `moveAnimationScriptLeadTiming` / the render gates by a rule predicate behind the same ids; rewrite `iu120Rows.ts` to compute lead and tail from a helper; no output change | the 37 audited ids | 0 | proves the rule == the sets on the census (digest equal) |
| **B1** | lead + `T = 6 - pre - post` for the unaudited **A** bodies with a ROM len, s = 0 | Double Kick (hit 1), Icy Wind, Water Pulse, Facade, Mega Kick, Counter, Comet Punch (1), Mega Drain, Doubleslap (1) | 299 (5.7 %) | smallest change that already reproduces hpd8 for new ids; pins +6 / +8 / +11 |
| **B2** | the same for the **A?** unmeasured plain hits (gap 4 by the next-event chain, class predicted) + **A~** (+-1) | 93 + 3 ids: Shadow Ball 102, Metal Claw 40, Rock Tomb 38, Psybeam 30, Knock Off 28, Slash 28, Crunch 26, Ice Punch 24, Flail 21, Headbutt 21, Slam 20 ... + Mud-Slap 68, Fire Punch 33, Dream Eater 13 | 951 + 114 (20.3 %) | the biggest single plain-hit mass; needs **one ROM lab per ~6 bodies as a spot check** (A? has no ROM len; hpd8-style compare of a sample of 6: Shadow Ball, Metal Claw, Rock Tomb, Psybeam, Slash, Crunch) before the census |
| **B3** | **S** bodies: the lead moves from `scriptTailRows` to `bodyLeadFrames` (row total unchanged), `LSE2_SOUND_CLOCK_LEADS` -> residual-lead rule, `statusAnimationScriptAge` generalised, `statsChangeSourceAge` re-measured | 66 ids: Double Team 180, Protect 117, Light Screen 46, Rain Dance 45, Scary Face 38, Smokescreen 37, Sandstorm 33, Charm 32 ... | 1,164 (22.2 %) | pass criterion is stronger here: **every command's total frames unchanged**; the sound shift is the whole effect (T2 sound scoreboard before / after per family, aud242 / aud248 re-fit) |
| **B4** | **C** bodies with the general `T = 2 + gap - pre - post`, gap from the next-event chain | Confuse Ray 94, Thunder Wave 39, Wish 39 (gap 13), Brick Break (V), Curse (V), Sleep Powder / Lovely Kiss / Sing / Will-O-Wisp / Grasswhistle / Stun Spore / Glare (C?) | 172 + 80 + 135 | each gap measured except the C? ones (ROM spot-check Sleep Powder and Sing) |
| **B5** | **B**: fix the adapter window first (s != 0), then the tail | Dragonbreath 44, Silver Wind 36, Frustration 31, Spark 30, Thunderpunch 27, Toxic / Swagger / Hypnosis / Absorb | 229 | this is a separate defect (adapter duration), not the lead / tail rule; lead can land earlier in B2 for these (Silver Wind, Dragonbreath, Spark, Thunderpunch are `A?`-like for the lead) |
| **B6** | multi-hit hits 2+, charge turns, V (variant leads), X (chains not measured: Rest 76, Roar 35, Softboiled 29, Recover 25, Synthesis 19, Baton Pass, Substitute, Explosion ...) | | 276 + 231 + 214 + 230 | needs per-case rules; last |

Gates per batch: `npm run typecheck`; every test importing `liveMoveAnimation` / `battleResolutionPresentation*` / `moveAnimSounds` / `tickSounds` + the batch's moves; `lbrd` / `randomRoundSoak`; a vanilla Scene ON 0:20 soak; the 200-battle census delta (`lsd194Census.sh` + `rst197CensusDelta.py`); T2 sound scoreboard (`aud248RunSeed.sh`).

### Risks

- **Overshoot of already-near sound groups** (the hpd8 T2 result): rows after a lead-carrying body move by the lead, so groups that matched at -1 / 0 / +1 move to +5 / +6: it needs a per-row ROM window follow-up (still open since hpd8), otherwise every batch lowers the "exact" count while the |delta| sum improves.
- **Frustration / Silver Wind / Dragonbreath**: duration depends on friendship / level / side; a rule that uses the census mode would pin the wrong frame for the minority.
- **Double Team -80 (180 commands)**: the biggest single mismatch of the measured bodies; not a lead issue (counter 3 = ROM 3) but its adapter window disagrees with the ROM script length by 80 rows. B3 lands the lead for it without touching the window.

## Check items for the supervisor

1. ROM-measure Brick Break lead 8 (screen), Curse 6 (Ghost), Petal Dance 7 (continuation); the table says the counter predicts them but no ROM window exists.
2. Silver Wind live duration 196 (census) vs lab 193 (phy1m): side- / level-dependent adapter windows (s = -3).
3. A? bodies have no ROM len: confirm gap 4 on six of them in the ROM before B2.
4. `lead1mCensus.ts` usage: `node --experimental-strip-types --no-warnings tools/integration/lead1mCensus.ts --seeds=A..B [--index-from=N] --out=x.json --commands=x.jsonl [--probe=x.probe --nextprobe=x.nprobe]` (the probe dumps need the temporary `src` patch: the instruction counter key `moveId|animation-(used+1)|presentedSinceUsed|charge/plain|aud/unaud`).

## Appendix: every live body by census count (200 battles, 5,245 move-body commands)

`aud` = the audited set it is in (hpd4 / hpd8 / sta5 / lse2 / -); `counter` = the lead the instruction counter returns (plain); `ROM L` = the ROM-measured lead(s); `len/gap/s` = ROM length / gap / `len + 1 - (idle + live)`; class: **A** exact shape A, **A~** s = +-1, **A?** gap 4 by next-event chain but no ROM len, **B** s != 0, **C** gap != 4 (measured), **C?** gap != 4 predicted, **S** status body (lead in `scriptTailRows`), **CH** charge turn, **V** variant lead, **X** next-event chain not measured.

| id | body | n | cum % | aud | counter | ROM L | len/gap/s | class |
|---|---|---|---|---|---|---|---|---|
| 104 | Double Team | 180 | 3.4 | - | 3 | 3 | 158/2/-80 | S |
| 89 | Earthquake | 161 | 6.5 | hpd8 | 11 | 11 | 207/4/+0 | A |
| 332 | Aerial Ace | 142 | 9.2 | hpd8 | 5 | 5 | 49/4/+0 | A |
| 182 | Protect | 117 | 11.4 | - | 2 | 2 | 122/3/+0 | S |
| 57 | Surf | 115 | 13.6 | hpd8 | 5 | 5 | 143/4/+0 | A |
| 94 | Psychic | 111 | 15.7 | hpd8 | 5 | 5 | 144/4/+0 | A |
| 91 | Dig | 107 | 17.8 | hpd8 | 5 | 1,5 | 67/4/-127 | CH |
| 247 | Shadow Ball | 102 | 19.7 | - | 5 | - | - | A? |
| 157 | Rock Slide | 97 | 21.6 | hpd8 | 5 | 5 | 137/4/+0 | A |
| 109 | Confuse Ray | 94 | 23.4 | - | 6 | 6 | 269/5/+0 | C |
| 185 | Faint Attack | 89 | 25.1 | hpd8 | 5 | 5 | 225/4/-1 | A~ |
| 38 | Double-Edge | 85 | 26.7 | hpd8 | 5 | 5 | 140/4/+0 | A |
| 44 | Bite | 77 | 28.2 | hpd8 | 5 | 5 | 40/4/+0 | A |
| 156 | Rest | 76 | 29.6 | - | None | - | - | X |
| 98 | Quick Attack | 74 | 31.0 | hpd8 | 5 | 5 | 32/4/+0 | A |
| 58 | Ice Beam | 72 | 32.4 | hpd8 | 5 | 5 | 202/4/+0 | A |
| 280 | Brick Break | 70 | 33.7 | - | 7 | 7 | 150/6/+0 | V |
| 189 | Mud-Slap | 68 | 35.0 | - | 5 | 5 | 51/4/+1 | A~ |
| 24 | Double Kick | 67 | 36.3 | - | 16 | 16,19 | 35/4/+0 | A |
| 202 | Giga Drain | 66 | 37.6 | hpd8 | 5 | 5 | 229/4/+0 | A |
| 188 | Sludge Bomb | 62 | 38.7 | hpd8 | 5 | 5 | 168/4/+0 | A |
| 85 | Thunderbolt | 62 | 39.9 | hpd8 | 5 | 5 | 236/4/+0 | A |
| 34 | Body Slam | 55 | 41.0 | hpd8 | 5 | 5 | 106/4/+0 | A |
| 174 | Curse | 51 | 41.9 | - | 4 | 4 | 175/5/+0 | V |
| 196 | Icy Wind | 49 | 42.9 | - | 5 | 5 | 286/4/+0 | A |
| 352 | Water Pulse | 48 | 43.8 | - | 5 | 5 | 159/4/+0 | A |
| 113 | Light Screen | 46 | 44.7 | - | 3 | 3 | 85/3/-2 | S |
| 240 | Rain Dance | 45 | 45.5 | - | 2 | 2 | 186/3/+0 | S |
| 76 | Solarbeam | 45 | 46.4 | hpd8 | 5 | 1,5 | 237/4/+130 | CH |
| 246 | Ancientpower | 44 | 47.2 | hpd8 | 5 | 5 | 127/4/+0 | A |
| 225 | Dragonbreath | 44 | 48.1 | - | 5 | 5 | 92/4/+4 | B |
| 232 | Metal Claw | 40 | 48.8 | - | 5 | - | - | A? |
| 273 | Wish | 39 | 49.6 | - | 2 | 2 | 270/13/+0 | C |
| 86 | Thunder Wave | 39 | 50.3 | - | 9 | 9 | 119/5/+0 | C |
| 317 | Rock Tomb | 38 | 51.0 | - | 5 | - | - | A? |
| 184 | Scary Face | 38 | 51.8 | - | 3 | - | - | S |
| 108 | Smokescreen | 37 | 52.5 | - | 3 | 3 | 123/4/-1 | S |
| 318 | Silver Wind | 36 | 53.2 | - | 5 | 5 | 192/4/-3 | B |
| 61 | Bubblebeam | 36 | 53.8 | hpd8 | 5 | 5 | 238/4/+0 | A |
| 291 | Dive | 35 | 54.5 | - | 5 | - | - | CH |
| 80 | Petal Dance | 35 | 55.2 | - | 7 | 8 | 243/4/+0 | V |
| 46 | Roar | 35 | 55.8 | - | 7 | - | - | X |
| 263 | Facade | 34 | 56.5 | - | 5 | 5 | 80/4/+0 | A |
| 201 | Sandstorm | 33 | 57.1 | - | 3 | 3 | 167/3/+0 | S |
| 165 | Struggle | 33 | 57.8 | hpd8 | 5 | 5 | 111/4/+0 | A |
| 7 | Fire Punch | 33 | 58.4 | - | 5 | 5 | 101/4/+1 | A~ |
| 204 | Charm | 32 | 59.0 | - | 3 | 3 | 97/4/+1 | S |
| 53 | Flamethrower | 32 | 59.6 | hpd8 | 5 | 5 | 209/4/+0 | A |
| 25 | Mega Kick | 32 | 60.2 | - | 5 | 5 | 159/4/+0 | A |
| 218 | Frustration | 31 | 60.8 | - | 5 | 5 | 191/4/-37 | B |
| 209 | Spark | 30 | 61.4 | - | 5 | 5 | 125/4/+11 | B |
| 205 | Rollout | 30 | 61.9 | hpd4 | 9 | 5,10 | - | V |
| 68 | Counter | 30 | 62.5 | - | 4 | 4 | 87/4/+0 | A |
| 60 | Psybeam | 30 | 63.1 | - | 5 | - | - | A? |
| 135 | Softboiled | 29 | 63.6 | - | 2 | - | - | X |
| 92 | Toxic | 29 | 64.2 | sta5 | 10 | 10 | 230/5/+5 | B |
| 56 | Hydro Pump | 29 | 64.7 | hpd8 | 5 | 5 | 140/4/+0 | A |
| 282 | Knock Off | 28 | 65.3 | - | 5 | - | - | A? |
| 219 | Safeguard | 28 | 65.8 | - | 3 | 3 | 70/3/+0 | S |
| 163 | Slash | 28 | 66.3 | - | 5 | - | - | A? |
| 266 | Follow Me | 27 | 66.9 | - | 2 | - | - | S |
| 28 | Sand-Attack | 27 | 67.4 | - | 3 | - | - | S |
| 9 | Thunderpunch | 27 | 67.9 | - | 5 | 5 | 135/4/+32 | B |
| 242 | Crunch | 26 | 68.4 | - | 5 | - | - | A? |
| 105 | Recover | 25 | 68.9 | - | 2 | - | - | X |
| 345 | Magical Leaf | 24 | 69.3 | hpd8 | 5 | 5 | 181/4/+0 | A |
| 241 | Sunny Day | 24 | 69.8 | - | 3 | - | - | S |
| 8 | Ice Punch | 24 | 70.2 | - | 5 | - | - | A? |
| 213 | Attract | 23 | 70.7 | - | 3 | - | - | S |
| 97 | Agility | 23 | 71.1 | - | 3 | 3 | 86/4/+0 | S |
| 334 | Iron Defense | 21 | 71.5 | - | 3 | - | - | S |
| 230 | Sweet Scent | 21 | 71.9 | - | 3 | - | - | S |
| 175 | Flail | 21 | 72.3 | - | 5 | - | - | A? |
| 126 | Fire Blast | 21 | 72.7 | hpd8 | 5 | 5 | 196/4/+0 | A |
| 29 | Headbutt | 21 | 73.1 | - | 5 | - | - | A? |
| 151 | Acid Armor | 20 | 73.5 | - | 3 | - | - | S |
| 133 | Amnesia | 20 | 73.9 | - | 3 | - | - | S |
| 79 | Sleep Powder | 20 | 74.3 | - | 7 | - | - | C? |
| 21 | Slam | 20 | 74.6 | - | 5 | - | - | A? |
| 19 | Fly | 20 | 75.0 | - | 5 | - | - | CH |
| 340 | Bounce | 19 | 75.4 | - | 5 | - | - | CH |
| 337 | Dragon Claw | 19 | 75.7 | - | 5 | - | - | A? |
| 315 | Overheat | 19 | 76.1 | - | 5 | - | - | A? |
| 301 | Ice Ball | 19 | 76.5 | hpd4 | 9 | 5 | - | V |
| 248 | Future Sight | 19 | 76.8 | - | 2 | - | - | S |
| 235 | Synthesis | 19 | 77.2 | - | 3 | - | - | X |
| 124 | Sludge | 19 | 77.6 | - | 5 | - | - | A? |
| 51 | Acid | 19 | 77.9 | - | 5 | - | - | A? |
| 258 | Hail | 18 | 78.3 | - | 3 | 3 | 157/3/+0 | S |
| 154 | Fury Swipes | 18 | 78.6 | - | 15 | - | - | A? |
| 93 | Confusion | 18 | 79.0 | - | 5 | - | - | A? |
| 52 | Ember | 18 | 79.3 | - | 5 | - | - | A? |
| 14 | Swords Dance | 18 | 79.6 | - | 3 | - | - | S |
| 313 | Fake Tears | 17 | 80.0 | - | 3 | - | - | S |
| 224 | Megahorn | 17 | 80.3 | - | 5 | - | - | A? |
| 203 | Endure | 17 | 80.6 | - | 2 | - | - | S |
| 4 | Comet Punch | 17 | 80.9 | - | 15 | 15 | 36/4/+0 | A |
| 347 | Calm Mind | 16 | 81.2 | lse2 | 2 | 2 | 107/4/+4 | S |
| 290 | Secret Power | 16 | 81.5 | - | 5 | - | - | A? |
| 207 | Swagger | 16 | 81.8 | sta5 | 2 | 2 | 168/7/+1 | B |
| 197 | Detect | 16 | 82.2 | - | 2 | - | - | S |
| 142 | Lovely Kiss | 16 | 82.5 | - | 7 | - | - | C? |
| 129 | Swift | 16 | 82.8 | - | 5 | - | - | A? |
| 322 | Cosmic Power | 15 | 83.1 | lse2 | 2 | 2 | 240/4/+0 | S |
| 231 | Iron Tail | 14 | 83.3 | - | 5 | - | - | A? |
| 226 | Baton Pass | 14 | 83.6 | - | 3 | - | - | X |
| 47 | Sing | 14 | 83.9 | - | 7 | - | - | C? |
| 349 | Dragon Dance | 13 | 84.1 | - | 2 | - | - | S |
| 309 | Meteor Mash | 13 | 84.3 | - | 5 | - | - | A? |
| 306 | Crush Claw | 13 | 84.6 | - | 5 | - | - | A? |
| 254 | Stockpile | 13 | 84.8 | - | 2 | - | - | S |
| 238 | Cross Chop | 13 | 85.1 | - | 5 | - | - | A? |
| 215 | Heal Bell | 13 | 85.3 | - | 3 | - | - | S |
| 211 | Steel Wing | 13 | 85.6 | - | 5 | - | - | A? |
| 138 | Dream Eater | 13 | 85.8 | - | 5 | 5 | 265/4/-1 | A~ |
| 107 | Minimize | 13 | 86.1 | - | 3 | - | - | S |
| 74 | Growth | 13 | 86.3 | - | 3 | - | - | S |
| 59 | Blizzard | 13 | 86.6 | hpd8 | 5 | 5 | 370/4/-1 | A~ |
| 324 | Signal Beam | 12 | 86.8 | - | 5 | - | - | A? |
| 281 | Yawn | 12 | 87.0 | - | 8 | 8 | 212/3/+0 | S |
| 250 | Whirlpool | 12 | 87.3 | - | 5 | - | - | A? |
| 95 | Hypnosis | 12 | 87.5 | sta5 | 7 | 7 | 168/5/+1 | B |
| 73 | Leech Seed | 12 | 87.7 | lse2 | 36 | 36 | 140/3/+0 | S |
| 341 | Mud Shot | 11 | 87.9 | - | 5 | - | - | A? |
| 180 | Spite | 11 | 88.1 | - | 3 | - | - | S |
| 164 | Substitute | 11 | 88.4 | - | None | - | - | X |
| 161 | Tri Attack | 11 | 88.6 | - | 5 | - | - | A? |
| 72 | Mega Drain | 11 | 88.8 | - | 5 | 5 | 217/4/+0 | A |
| 55 | Water Gun | 11 | 89.0 | - | 5 | - | - | A? |
| 3 | Doubleslap | 11 | 89.2 | - | 15 | 15 | 33/4/+0 | A |
| 348 | Leaf Blade | 10 | 89.4 | - | 5 | - | - | A? |
| 288 | Grudge | 10 | 89.6 | - | 2 | - | - | S |
| 264 | Focus Punch | 10 | 89.8 | - | 5 | - | - | A? |
| 261 | Will-O-Wisp | 10 | 90.0 | - | 8 | - | - | C? |
| 210 | Fury Cutter | 10 | 90.1 | - | 9 | - | - | A? |
| 195 | Perish Song | 10 | 90.3 | - | 2 | - | - | S |
| 115 | Reflect | 10 | 90.5 | - | 2 | - | - | S |
| 103 | Screech | 10 | 90.7 | - | 3 | - | - | S |
| 35 | Wrap | 10 | 90.9 | - | 5 | - | - | A? |
| 320 | Grasswhistle | 9 | 91.1 | - | 7 | - | - | C? |
| 256 | Swallow | 9 | 91.2 | - | 3 | - | - | X |
| 236 | Moonlight | 9 | 91.4 | - | 3 | - | - | X |
| 228 | Pursuit | 9 | 91.6 | - | 5 | - | - | A? |
| 153 | Explosion | 9 | 91.8 | - | None | - | - | X |
| 111 | Defense Curl | 9 | 91.9 | hpd4 | 5 | 5 | - | X |
| 78 | Stun Spore | 9 | 92.1 | - | 9 | - | - | C? |
| 69 | Seismic Toss | 9 | 92.3 | hpd4 | 6 | 6 | - | A? |
| 314 | Air Cutter | 8 | 92.4 | - | 5 | - | - | A? |
| 277 | Magic Coat | 8 | 92.6 | - | 1 | - | - | S |
| 183 | Mach Punch | 8 | 92.7 | - | 5 | - | - | A? |
| 178 | Cotton Spore | 8 | 92.9 | - | 3 | - | - | S |
| 87 | Thunder | 8 | 93.0 | - | 5 | - | - | A? |
| 83 | Fire Spin | 8 | 93.2 | - | 5 | - | - | A? |
| 43 | Leer | 8 | 93.3 | - | 3 | - | - | S |
| 39 | Tail Whip | 8 | 93.5 | - | 3 | - | - | S |
| 20 | Bind | 8 | 93.7 | - | 5 | - | - | A? |
| 252 | Fake Out | 7 | 93.8 | - | 5 | - | - | A? |
| 244 | Psych Up | 7 | 93.9 | - | 2 | - | - | S |
| 243 | Mirror Coat | 7 | 94.1 | - | 4 | - | - | A? |
| 148 | Flash | 7 | 94.2 | - | 3 | 3 | 63/4/+0 | S |
| 106 | Harden | 7 | 94.3 | - | 3 | - | - | S |
| 65 | Drill Peck | 7 | 94.5 | - | 5 | - | - | A? |
| 62 | Aurora Beam | 7 | 94.6 | - | 5 | - | - | A? |
| 23 | Stomp | 7 | 94.7 | - | 5 | - | - | A? |
| 350 | Rock Blast | 6 | 94.8 | - | 15 | - | - | A? |
| 298 | Teeter Dance | 6 | 94.9 | - | 16 | - | - | V |
| 275 | Ingrain | 6 | 95.1 | - | 2 | - | - | S |
| 212 | Mean Look | 6 | 95.2 | - | 4 | - | - | X |
| 167 | Triple Kick | 6 | 95.3 | - | 19 | - | - | A? |
| 131 | Spike Cannon | 6 | 95.4 | - | 15 | - | - | A? |
| 112 | Barrier | 6 | 95.5 | - | 3 | - | - | S |
| 101 | Night Shade | 6 | 95.6 | - | 6 | - | - | A? |
| 67 | Low Kick | 6 | 95.7 | - | 8 | - | - | A? |
| 32 | Horn Drill | 6 | 95.9 | - | 7 | - | - | A? |
| 323 | Water Spout | 5 | 96.0 | - | 5 | - | - | A? |
| 321 | Tickle | 5 | 96.1 | - | 3 | - | - | S |
| 285 | Skill Swap | 5 | 96.1 | - | 3 | - | - | S |
| 278 | Recycle | 5 | 96.2 | - | 2 | 2 | 202/3/+0 | S |
| 259 | Torment | 5 | 96.3 | - | 3 | - | - | S |
| 227 | Encore | 5 | 96.4 | lse2 | 2 | 2 | 219/3/+5 | S |
| 214 | Sleep Talk | 5 | 96.5 | - | 3 | - | - | CH |
| 179 | Reversal | 5 | 96.6 | - | 5 | - | - | A? |
| 172 | Flame Wheel | 5 | 96.7 | - | 5 | - | - | A? |
| 171 | Nightmare | 5 | 96.8 | - | 4 | - | - | X |
| 149 | Psywave | 5 | 96.9 | - | 6 | - | - | A? |
| 136 | Hi Jump Kick | 5 | 97.0 | - | 5 | - | - | A? |
| 114 | Haze | 5 | 97.1 | - | 1 | - | - | X |
| 75 | Razor Leaf | 5 | 97.2 | - | 5 | - | - | A? |
| 36 | Take Down | 5 | 97.3 | - | 5 | - | - | A? |
| 18 | Whirlwind | 5 | 97.4 | - | 7 | - | - | X |
| 326 | Extrasensory | 4 | 97.5 | - | 5 | - | - | A? |
| 319 | Metal Sound | 4 | 97.5 | - | 3 | - | - | S |
| 271 | Trick | 4 | 97.6 | - | 4 | - | - | S |
| 262 | Memento | 4 | 97.7 | - | None | - | - | X |
| 260 | Flatter | 4 | 97.8 | sta5 | 2 | 2 | 218/7/+0 | C |
| 229 | Rapid Spin | 4 | 97.8 | - | 5 | - | - | A? |
| 194 | Destiny Bond | 4 | 97.9 | - | 2 | - | - | S |
| 152 | Crabhammer | 4 | 98.0 | - | 5 | - | - | A? |
| 71 | Absorb | 4 | 98.1 | - | 5 | 5 | 205/4/+2 | B |
| 351 | Shock Wave | 3 | 98.1 | - | 5 | - | - | A? |
| 339 | Bulk Up | 3 | 98.2 | - | 2 | 2 | 107/4/+0 | S |
| 327 | Sky Uppercut | 3 | 98.2 | - | 5 | - | - | A? |
| 310 | Astonish | 3 | 98.3 | - | 5 | - | - | A? |
| 299 | Blaze Kick | 3 | 98.4 | - | 5 | - | - | A? |
| 294 | Tail Glow | 3 | 98.4 | - | 3 | - | - | S |
| 284 | Eruption | 3 | 98.5 | - | 5 | - | - | A? |
| 283 | Endeavor | 3 | 98.5 | - | 10 | - | - | A? |
| 272 | Role Play | 3 | 98.6 | - | 3 | - | - | S |
| 217 | Present | 3 | 98.6 | - | 7 | - | - | V |
| 193 | Foresight | 3 | 98.7 | - | 2 | - | - | S |
| 191 | Spikes | 3 | 98.8 | - | 1 | - | - | S |
| 190 | Octazooka | 3 | 98.8 | - | 5 | - | - | A? |
| 162 | Super Fang | 3 | 98.9 | - | 5 | - | - | A? |
| 158 | Hyper Fang | 3 | 98.9 | - | 5 | - | - | A? |
| 155 | Bonemerang | 3 | 99.0 | - | 16 | - | - | A? |
| 146 | Dizzy Punch | 3 | 99.0 | - | 5 | - | - | A? |
| 122 | Lick | 3 | 99.1 | - | 5 | - | - | A? |
| 118 | Metronome | 3 | 99.2 | - | 32 | - | - | X |
| 66 | Submission | 3 | 99.2 | - | 5 | - | - | A? |
| 50 | Disable | 3 | 99.3 | - | 3 | - | - | S |
| 335 | Block | 2 | 99.3 | - | 4 | - | - | X |
| 330 | Muddy Water | 2 | 99.4 | - | 5 | - | - | A? |
| 325 | Shadow Punch | 2 | 99.4 | - | 5 | - | - | A? |
| 297 | Featherdance | 2 | 99.4 | - | 3 | - | - | S |
| 257 | Heat Wave | 2 | 99.5 | - | 5 | - | - | A? |
| 223 | Dynamicpunch | 2 | 99.5 | - | 5 | - | - | A? |
| 147 | Spore | 2 | 99.5 | sta5 | 7 | 7 | 206/5/+0 | C |
| 137 | Glare | 2 | 99.6 | - | 9 | - | - | C? |
| 123 | Smog | 2 | 99.6 | - | 5 | - | - | A? |
| 42 | Pin Missile | 2 | 99.7 | - | 15 | - | - | A? |
| 27 | Rolling Kick | 2 | 99.7 | - | 5 | - | - | A? |
| 343 | Covet | 1 | 99.7 | - | 5 | - | - | A? |
| 329 | Sheer Cold | 1 | 99.7 | - | 7 | - | - | A? |
| 328 | Sand Tomb | 1 | 99.8 | - | 5 | - | - | A? |
| 305 | Poison Fang | 1 | 99.8 | - | 5 | - | - | A? |
| 304 | Hyper Voice | 1 | 99.8 | - | 5 | - | - | A? |
| 269 | Taunt | 1 | 99.8 | - | 3 | - | - | S |
| 245 | Extremespeed | 1 | 99.8 | - | 5 | - | - | A? |
| 173 | Snore | 1 | 99.8 | - | 8 | - | - | A? |
| 169 | Spider Web | 1 | 99.9 | - | 4 | - | - | X |
| 144 | Transform | 1 | 99.9 | - | 2 | - | - | S |
| 116 | Focus Energy | 1 | 99.9 | - | 3 | - | - | S |
| 110 | Withdraw | 1 | 99.9 | - | 3 | - | - | S |
| 90 | Fissure | 1 | 99.9 | - | 7 | - | - | A? |
| 37 | Thrash | 1 | 100.0 | - | 8 | - | - | A? |
| 16 | Gust | 1 | 100.0 | - | 5 | - | - | A? |
| 12 | Guillotine | 1 | 100.0 | - | 7 | - | - | A? |

## lead2: B0 + B1 landed (2026-11-19, branch worker/integration-20261119-133344, base 0d2973b40)

**B0 = 65cd7edd9** (no behaviour change). `BODY_LEAD_AUDITED_MOVE_IDS` is gone. `battleResolutionPresentation.ts` holds one table `BODY_LEAD_RULE: id -> "lead-table" | "shape-a" | "status-tail" | "lse2"` (built from the hpd4 / hpd8 / sta5 / lse2 sets: the same 39 ids) and the predicates `bodyLeadRuleApplies`, `bodyHitTailRuleApplies` (shape-a), `bodyLeadTailCompositionApplies` (shape-a with lead > 0: the render effect holds the age at `live - 1` through the tail), `bodyStatusTailRuleApplies`, `bodyLse2RuleApplies`. `moveAnimationScriptLeadTiming`, the render gates, `moveAnimSounds.statusAnimationScriptAge` and `tools/integration/phy1mRank.ts` call the predicates. Membership stays a measured table (the ROM gap / s are per body); the table is the one place a batch widens. `tests/helpers/iu120Rows.ts` computes lead and tail from one `IU120_BODY_RULES` map (`{lead?, defaultLead?, tail}`); `HPD4_BODY_LEAD_ROWS` is derived (30 entries, identical).

| B0 proof | result |
|---|---|
| census Scene ON 0..199 vs 0d2973b40 | 200 battles / 62,104 commands identical (eventsDigest and every command field) |
| census Scene OFF 0..99 | 100 battles / 30,730 commands identical |
| sound digest ON | identical |
| `npm run typecheck` | 0 |
| the 71 `iu120Rows` importers | 997 tests green |

**B1 = 6144d5a00** (tree ad075190dc0249642a4ab7504b15d6328ae446c5). `LEAD2_SHAPE_A_MOVE_IDS = {24, 196, 352, 263, 25, 68, 4, 72, 3}` joins the `shape-a` class: lead (the instruction counter) + `T = 6 - pre - post` as for the hpd8 bodies. Ids: Double Kick 24 (hit 1), Icy Wind 196, Water Pulse 352, Facade 263, Mega Kick 25, Counter 68, Comet Punch 4 (hit 1), Mega Drain 72, Doubleslap 3 (hit 1). Multi-hit hits 2+ have no used-print anchor and get no lead and no tail (left for B6).

ROM windows (`npm run compare -- tools/compare/traces/lead2-<x>-on.json --summary`, new labs `tools/battle-lab/lead2-*-player-on.json`, Scene ON, matched frames of 1023):

| body | before | after |
|---|---|---|
| Icy Wind | 73 | 357 |
| Facade | 22 | 480 |
| Mega Drain | 232 | 719 |
| Water Pulse | 157 | 515 |
| Counter | 229 | 505 |
| Mega Kick | 250 | 673 |

Census delta B1 vs base (`lsd194Census.sh` + `rst197CensusDelta.py`): Scene ON 0..199: eventsDigest identical on all 200 seeds; 91 battles change, 109 identical; **248 move-animation commands** change, **+2,226 frames** in total, only fields 16 / 18 (lead and minimum frames), no inserted commands, bad 0. Per command: Water Pulse +8 (49), Icy Wind +8 (49), Mega Drain +8 (11), Facade +6 (34), Mega Kick +6 (32), Counter +5 (30; lead 4 + tail 1), Double Kick hit 1 +19 (34), Comet Punch hit 1 +18 (5), Doubleslap hit 1 +18 (4). Scene OFF 0..99: 100 / 100 identical.

Sound: T1 (self-consistency) on both arms 54,005 exact, known-offset 0 / missing 0 / extra 0; non-move 21,973 exact. Arm vs arm: 109 seeds identical, 86 with the same event sequence at moved frames (`se 131` +6 / +8, `duck 476` +6, `se 148` +8, ...), 5 seeds (31, 90, 102, 130, 132) with the same event count but a different order (not analysed further: the shifted frames reorder events inside the same-count sequence; T1 scores every event exact).

Gates on the B1 tip: `npm run typecheck` 0; `npm run build` 0; `npm run test:gate` 362 files / 2,844 tests green; tests/lbrd.test.ts + tests/randomRoundSoak.test.ts 79 / 79; 7 chunks (604 files = every test importing liveMoveAnimation / battleResolutionPresentation* / moveAnimSounds / tickSounds / iu120Rows plus tests naming the B1 moves) green after the re-pins; `npm run soak -- --policy vanilla --seeds 0:20 --parallel 3 --scene on` (two 10-seed calls) 20 / 20 OK, 0 crash, 0 hang.

Re-pins (each by the lead + T rule):
- `tests/apx217TransformApproximate.test.ts`: Icy Wind opponent rows 290 -> 298 (+8).
- `tests/apx221PresentationGateApproximate.test.ts`: the Castform-form Icy Wind rows 290 -> 298 (+8).
- `tests/animation/liveMultihitMoveAdapters.test.ts`: the helper call passes lead 0 for hits 2+ (`iu120Ages(row.id, row.ages + row.seGates[hit]!, "player", hit === 0 ? undefined : 0)`): the default lead applies to hit 1 only.
- `tests/animation/liveRandom2R1MoveAdapters.test.ts`: Double Kick bodies alternate hit 1 / hit 2; the expected lead is 0 on the second.
- `tests/animation/liveRandom2R4MoveAdapters.test.ts`: no edit; fixed by the helper change (`held` includes shape-a bodies with lead > 0, as production holds the age at `live - 1` through the tail, Water Pulse on Castform).

Limits: hits 2+ of the multi-hit bodies are not covered (no anchor), the residual lead of the adapter windows (s != 0, B5) and the other 93 A? bodies (B2) are unchanged.

### lead2 B2 spot-check (check item 3; NOT landed)

Method: the B1 lab pattern (`lead2-icywind-player-on`, player Rattata Lv50 with the move x4, Seismic Toss Rattata Lv12 opponent, Scene ON, 1023 frames) with the move replaced; `npm run compare -- <trace> --summary` matched frames with the rule off (the committed tip) and with the three ids added to `LEAD2_SHAPE_A_MOVE_IDS` as an uncommitted edit (reverted; the labs and the stage lines are kept under `.integration/evidence/lead2/b2-labs/`, not committed).

| body | id | matched before | matched with the rule | reading |
|---|---|---|---|---|
| Metal Claw | 232 | 68 | 406 | gap 4 / lead + T consistent with the ROM (same direction and size as the B1 bodies) |
| Slash | 163 | 261 | 760 | gap 4 / lead + T consistent with the ROM |
| Shadow Ball | 247 | 29 (identical app frames either way) | not measured | the Rattata target is Normal: Ghost has no effect, so no animation plays and the rule cannot act. Two non-Normal-target labs (Pikachu 25, Moltres 146 via `aud242lBlizzardStage`) matched 3 and 0 of 1023 frames both before and after, i.e. the staging does not align with the ROM from the first frames; Shadow Ball needs a lab staged the way the aud262 Memento labs are (a validated target species) before its gap can be read |

Result for B2: Metal Claw and Slash support gap 4 (the A? class prediction). Shadow Ball (the largest A? body, 102 census commands) is still unmeasured. Nothing of B2 is in the rule.

## lead3: B2 landed (2026-11-19, branch worker/integration-20261119-152419, base 238825627)

`LEAD3_MEASURED_MOVE_IDS` (18) + `LEAD3_PREDICTED_MOVE_IDS` (53) join the `shape-a` class (71 ids; `tests/helpers/iu120Rows.ts` `SHAPE_A_RULE_IDS` / `SHAPE_A_LEADS` mirror them). The move-body rule itself is unchanged: lead = kernel counter, tail `T = 6 - pre - post`.

### ROM spot-check (Scene ON, `tools/compare/traces/lead3-<x>-on.json`, labs `tools/battle-lab/lead3-<x>-player-on.json`, Lv50 Rattata x4 of the move vs a Lv12 Seismic Toss opponent; Shadow Ball vs a Lv12 Machop, Fighting, via `lead3MachopTargetStage` in `tools/compare/appTrace.ts`)

Matched frames of 1023 before / with the rule, and the **first opponent-HP-drain frame** (oracle vs app, with the rule; frames = app - oracle, i.e. the residual offset). The HP-drain start is the more objective window than matched frames (a 24 px blink diff every ~9 frames caps matches near 50 %).

| body | id | matched before | with rule | drain oracle / app | offset |
|---|---|---|---|---|---|
| Shadow Ball | 247 | 246 | 313 | 263 / 256 | -7 |
| Rock Tomb | 317 | 111 | 549 | 279 / 275 | -4 |
| Psybeam | 60 | 90 | 501 | 263 / 259 | -4 |
| Crunch | 242 | 90 | 519 | 244 / 240 | -4 |
| Knock Off | 282 | 39 | 103 | 155 / 155 | 0 (low match count: other, non-timing diffs) |
| Ice Punch | 8 | 162 | 510 | 289 / 285 | -4 |
| Headbutt | 29 | 85 | 578 | 152 / 148 | -4 |
| Slam | 21 | 272 | 773 | 152 / 150 | -2 |
| Flail | 175 | 172 | 580 | 215 / 211 | -4 |
| Mud-Slap (A~) | 189 | 124 | 409 | 156 / 151 | -5 |
| Fire Punch (A~) | 7 | 189 | 467 | 208 / 203 | -5 |
| Metal Claw | 232 | 68 | 406 | 264 / 246 | -18 (the adapter window is ~18 short: a B5-type residual; still 68 -> 406) |
| Slash | 163 | 261 | 760 | 145 / 143 | -2 |
| Fury Swipes (hit 1, lead 15) | 154 | 12 (drain 162 / 145, -17) | 71 | 162 / 161 | -1 |
| Low Kick (lead 8) | 67 | 172 (140 / 127, -13) | 852 | 140 / 136 | -4 |
| Fury Cutter (lead 9) | 210 | 70 (150 / 138, -12) | 859 | 150 / 150 | 0 |
| Psywave (lead 6) | 149 | 21 (306 / 296, -10) | 628 | 306 / 305 | -1 |
| Horn Drill (lead 7) | 32 | 219 (297 / 289, -8) | 864 | 297 / 297 | 0 |

All 18 improve in matched frames and the drain offset falls to 0..-7 (Metal Claw -18). Night Shade (101): no HP drain in either arm to read (matched 34 either way): left out. Bodies whose rule predicts a gap of 4 held up on every one of the 18 (the A? class prediction is supported on a sample of 18).

### Double Kick hit 1 (B1 had no ROM window for the +19 rows)

`lead3-doublekick-on` (Lv50 Rattata x4, Lv30 opponent): first drain frame ROM 151, app 150 with the B1 rule (offset -1); Comet Punch hit 1 and Doubleslap hit 1 matched 19 -> 81 and 44 -> 124. The B1 hit-1 lead + T agrees with the ROM, with a constant -1 frame offset: **no correction needed**. Matched frames for Double Kick itself go the other way (661 without the rule, 429 with it) because hits 2+ (no lead, no tail, the 18-row inter-hit trim) are B6; the first drain frame is the hit-1 read.

### Batch

- **Measured (18):** Shadow Ball 247, Rock Tomb 317, Psybeam 60, Crunch 242, Knock Off 282, Ice Punch 8, Headbutt 29, Slam 21, Flail 175, Metal Claw 232, Slash 163, Mud-Slap 189, Fire Punch 7 (lead 5); Fury Swipes 154 (hit 1, lead 15), Low Kick 67 (8), Fury Cutter 210 (9), Psywave 149 (6), Horn Drill 32 (7).
- **Predicted (53), the remaining single-hit A? / A~ bodies with the plain counter 5:** Dragon Claw 337, Overheat 315, Sludge 124, Acid 51, Confusion 93, Ember 52, Megahorn 224, Secret Power 290, Swift 129, Iron Tail 231, Meteor Mash 309, Crush Claw 306, Cross Chop 238, Steel Wing 211, Dream Eater 138, Tri Attack 161, Water Gun 55, Leaf Blade 348, Pursuit 228, Air Cutter 314, Mach Punch 183, Thunder 87, Drill Peck 65, Aurora Beam 62, Stomp 23, Water Spout 323, Reversal 179, Flame Wheel 172, Hi Jump Kick 136, Razor Leaf 75, Take Down 36, Extrasensory 326, Rapid Spin 229, Crabhammer 152, Shock Wave 351, Sky Uppercut 327, Astonish 310, Blaze Kick 299, Eruption 284, Octazooka 190, Super Fang 162, Hyper Fang 158, Dizzy Punch 146, Lick 122, Submission 66, Muddy Water 330, Shadow Punch 325, Heat Wave 257, Smog 123, Rolling Kick 27, Poison Fang 305, Extremespeed 245. They join by class (gap 4 by the next-event chain, counter lead 5); a ROM window was measured for none of them one by one.
- **Held out, with the reason:**
  - Signal Beam 324 / Mud Shot 341 / Dynamic Punch 223 / Covet 343 / Gust 16: their pan-sweep SE rows score `extra` in the T1 census with the shifted clock (110 extra rows on the first try); not landed until the sound clock of those bodies is read.
  - Night Shade 101: no HP drain to compare (above).
  - Focus Punch 264, Fake Out 252, Whirlpool 250, Wrap 35, Fire Spin 83, Bind 20, Sand Tomb 328: charge / flinch-turn / trap bodies, not plain hits (not measured, not in the rule).
  - Every multi-hit or variant-counter A? body not measured: Rock Blast 350, Triple Kick 167, Spike Cannon 131, Pin Missile 42, Bonemerang 155, Endeavor 283, Mirror Coat 243, Thrash 37, Snore 173, Sheer Cold 329, Fissure 90, Guillotine 12.

### Census delta (`lsd194Census.sh` + `rst197CensusDelta.py`, base 238825627 = src tree of 6144d5a00, final 158f8db94 = the src of the branch tip)

- Scene ON 0..199: eventsDigest identical on all 200 seeds; 179 battles change, 21 identical; **925 move-animation commands** change, **+6,824 frames** in total (an earlier run that still held Signal Beam / Mud Shot / Dynamic Punch / Covet / Gust had 952 commands, +7,024): only fields 16 / 18 (lead and minimum frames), no inserted commands, bad 0. Per-command shifts: +6 (336; lead 5 + T 1), +8 (561; lead 5 + T 3), +9 (Low Kick 6, Psywave 5), +12 (Fury Cutter 10), +16 (Fury Swipes hit 1, 6), +5 (1, a Dream Eater with a different tail).
- Scene OFF 0..99: 100 / 100 identical (30,730 commands).
- Sound: T1 on both arms 54,005 exact, known-offset 0 / missing 0 / extra 0 (non-move 21,973 exact). Arm vs arm: 21 seeds identical, 149 with the same event sequence at moved frames, **30 seeds with the same event multiset in a different order**.

Sound-order analysis. (a) The five lead2 seeds (31, 90, 102, 130, 132) are `same-seq-moved` against this base (the B1 base already carries their order); against the pre-B1 base they differ by one adjacent pair each: `duck 476` vs `se 16` (31, 90) or `se 5` (102, 130, 132). In four of the five the two events are at different frames (e.g. seed 31: `duck 476` 11408 vs `se 16` 11410 became `se 16` 11410 and `duck 476` 11424), in one (102) at the same frame 3167 (tie broken the other way). (b) The 30 seeds of this batch: the final list is sorted by frame in all 30; 74 of the 75 positions that differ are at different frames, 1 is a same-frame tie. All are an adjacent swap of `duck 476` / `se 5` / `se 16` / `se 12`-`13` / `se 90` type events, i.e. an event of the shifted move command crossing a neighbour that is anchored to a different clock (the duck marker, the controller hit SE) now that the command is 6..16 rows longer. So they are **cross-event reorders at distinct frames (the order follows the frames), not a same-frame reordering; the multiset is equal**. Whether the new order matches the ROM is a T2 question (not measured here).

### Gates

`npm run typecheck` 0; `npm run build` 0; `npm run test:gate` 362 files / 2,844 tests: 1 failure on the first run (the Headbutt duration, re-pinned below), 2,844 / 2,844 green on the final run; 6 chunks (747 files = every test importing liveMoveAnimation / battleResolutionPresentation* / moveAnimSounds / tickSounds / iu120Rows plus every test naming a batch move or its MOVE_ constant) green after the re-pins; tests/lbrd.test.ts + tests/randomRoundSoak.test.ts 79 / 79; `npm run soak -- --policy vanilla --seeds 0:20 --scene on --parallel 3` (two 10-seed calls) 20 / 20 OK; `npm run test:gate` re-run on the tip: 362 files green.

Re-pins (each by the lead + T rule, `hpd4BodyRows(id)` = lead + `6 - pre - post`):
- `tests/battleResolutionPresentation.test.ts`: Headbutt duration 48 + P/T -> + `hpd4BodyRows(29, 11)` (+12: this synthetic stream has no used-print rows, counter lead 11; tail 1).
- `tests/animation/liveOam1MoveAdapters.test.ts`: Pursuit 228 and Fury Cutter 210 body lengths + `hpd4BodyRows(id)` (Pursuit 106 -> 114).
- `tests/animation/livePrep10MoveAdapters.test.ts`: Reversal 179 (both bodies) + `hpd4BodyRows` (176 -> 184).
- `tests/animation/livePrep16MoveAdapters.test.ts`: Overheat 315 (both routes) + `hpd4BodyRows`.
- `tests/apx221PresentationGateApproximate.test.ts`: Extrasensory 326 rows 165 -> 173 (three rows), Fury Cutter 210 rows 46 -> 58; the "more than half of the rows are non-static" guard counts the body rows (without the static lead and tail rows).
- `tests/apx222LastStaticClassesApproximate.test.ts`: Sky Uppercut 327 rows 191 -> 199.
- `tests/playableContactAnimationLifecycle.test.ts`: Fury Swipes three bodies: hit 1 carries lead 15 + tail, hits 2+ none.
- Helpers: `tests/helpers/iu120Rows.ts` `SHAPE_A_RULE_IDS` +71 ids, `SHAPE_A_LEADS` + {154: 15, 67: 8, 210: 9, 149: 6, 32: 7}.

## lfx1: fix-forward of three tests the lead2 / lead3 rows moved (2026-11-19, master `71eb036f5` + `4c6075eee`; no src change)

The supervisor's full suite found three tests `test:gate` does not hold. Verdicts: two re-pins, one test invariant corrected; the rule in `src` is unchanged (census, sound and kernel events therefore unchanged by construction).

1. **`tests/sgl138SeGateLive.test.ts` (seed 0, Fury Swipes hit 1 lead 15 + tail 3): the test, not the rule.** The relation "ROM: ctl(hit k) - gate == ctl(hit 1)" is about the controller rows of the `attackanimation` request (sgs134 receipts, `rom-r1`: 16 / 16 stat requests, every attackanimation `delay - seGate` = 2). Hit 1's used-print lead (kernel counter, 15 here) and the hit tail `6 - pre - post` (3) are script rows before and after that request; they are not controller rows and hits 2+ have none (`presentedSinceUsed === null`). The received `[-18, -15]` is exactly `[-(lead + tail), -lead]` (15 + 3 and 15). The test (and the receipt generator's `laterHitShiftEqualsGate`) now compare hit k with hit 1 less its `bodyLead` / `liveMoveHitTailRows`: `[span_k - (span_1 - lead - tail), effectStart_k - (effectStart_1 - lead)] == [gate, gate]`; green on all four seeds. ROM support for hit 1 itself: `lead3-doublekick-on` first drain frame ROM 151 / app 150, Comet Punch 19 -> 81, Doubleslap 44 -> 124 (the lead3 section); Fury Swipes hit 1 drain 162 / 161. No new ROM window for hits 2+ (B6). Side finding: the committed `sgl138-live-receipt.json` summary (98 anchors, 11 later hits, cells incl. `off|stats-change-attacker|0`, `on|multi-hit|1`) is stale against today's routes (the generator now gives 94 anchors, 7 later hits, all 7 on the relation, 27 gated); the test only reads the static summary, so it passes. Not regenerated (out of scope; the fixture is a per-battle dump with the old frame counts).
2. **`tests/aud252LossBallOpen.test.ts` seed 1914: re-pin `[0, 1, -7 x6]` -> `[0, 8, 0 x6]`.** The turn opens with the player's Icy Wind (196, lead2 B1: lead 5 + tail 3 = +8 rows); with the two rule sets emptied (temporary edit, reverted) every row after the move is 8 earlier. The faint SE stays on the ROM frame 999 (0): `battleHitSounds` anchors it to its command start and subtracts `moveBodyExtraRows` (hpd4). Everything after it follows the command starts: the select SE (the accepted A of the loss message, `battleEndSounds`, no subtraction), the item effect's five SEs and SE_BALL_OPEN, so `[0, 1, -7 x6]` -> `[0, 9, 1 x6]` at the lead2 merge (`2227c7e66`). **The second element 1 -> 9 is the select SE:** the only row the +8 moves away from the ROM (ROM 1033, rule-off 1033 exact, rule-on 1041); the six rows behind it (ROM 1060 / 1092 / 1124 / 1156 / 1228 / 1410, the item effect and SE_BALL_OPEN) sat 7 early and are now 1 late. On the current master the numbers are `[0, 8, 0 x6]`: pau5 (`fcef544d8`; found by reverse-applying its src diff: select 1042 -> 1041, items 1061 -> 1060) moves everything from the select on by -1, again toward the ROM. Sum of |offset| 56 -> 8 (rule off: `[0, 0, -8 x6]` with pau5), so the rule moves 6 of 7 rows to the ROM and the select SE 8 away; the remaining +8 is the ROM's 27-row select -> item SE gap against ours 19 (a pre-existing residual of the item effect command, not the body). Seed 2230 unchanged. No rule change: moving the select SE onto the sound clock (subtracting `moveBodyExtraRows`) would restore its exactness but put the six item rows 8 early again, and an input-driven SE follows the presentation.
3. **`tests/aud248StatChangeSounds.test.ts` `aud242e-overheat-player.json`: re-pin 17 -> 9.** The ROM window (Overheat's Sp. Atk fall: SE 245 pan -64 at ROM frame 393). Ours was 376 (residual 17), with Overheat in the lead3 predicted class (lead 5 + tail 3) it is 384: residual 9, i.e. -8 toward the ROM by exactly the rule's rows. First ROM evidence for a predicted-class body (no lab was run for Overheat in lead3); the remaining 9 is the window's presentation-length residual named in the test header (Superpower 12, Growth 23, Scary Face 14 are the same kind).

Other pins: every direct importer of liveMoveAnimation / battleResolutionPresentation* / moveAnimSounds / tickSounds / iu120Rows (265 test files, 2,726 tests) and every test file naming one of the 80 lead2 / lead3 move constants and not in that set (328 files, 2,925 tests) green. The skipped tests of the suite (`it.skipIf` on `reference/`, a built `dist`, an unset `POKEBENCH_CGB4_EVIDENCE`, and the manual `hypnosisEvidence`) do not pin a lead2 / lead3 body (Hypnosis 95 and Sheer Cold 329 are outside both batches). `npm run typecheck` 0, `npm run build` 0, `npm run test:gate` 362 files / 2,844 tests green. Suggestion: the three files above are 7-17 s each and could join `tools/test/test-gate.list` (the generator would drop a hand edit).

## lead4: B3 landed (2026-11-19, branch worker/integration-20261119-211209, base 29fd7cf34)

The "S" status / stat bodies (`BODY_LEAD_RULE` class `"s-lead"`, `LEAD4_S_LEAD_MOVE_IDS`, 50 ids; `tests/helpers/iu120Rows.ts` `S_LEAD_RULE_IDS` mirrors them) used to carry their script lead in `scriptTailRows` after the body. The ROM plays it before the body. Now `bodyLeadFrames` is the counter lead (`instructionExecution(MOVE_ANIMATION) - (used print + 1) - presentedSinceUsed`), it is presented before the body, and `scriptTailRows` is the old value minus the lead (`bodyLeadRuleApplies`). **Every command's total frames is unchanged**; only the body position and its sound clock move by the lead.

### Id set
- **Landed (50):** Double Team 104, Protect 182, Light Screen 113, Rain Dance 240, Scary Face 184, Smokescreen 108, Sandstorm 201, Charm 204 and the rest of `LEAD4_S_LEAD_MOVE_IDS` (the list in `battleResolutionPresentation.ts` is authoritative). The four lse2 ids (Leech Seed 73, Cosmic Power 322, Calm Mind 347, Encore 227) were already lead bodies (B1) and are unchanged.
- **Held out (12), no presented tail frames (old `liveMoveScriptTailFrames` = 0, trail undefined): Growth 74, Recycle 278, Fake Tears 313, Future Sight 248, Psych Up 244, Skill Swap 285, Destiny Bond 194, Foresight 193, Spikes 191, Feather Dance 297, Transform 144, Withdraw 110.** The lead could only be added (not moved out of a tail), which would change their command total; they stay in `scriptTailRows` until their trail row is read. `presentedBodyLead` also keeps the invariant per command: the lead is presented only where the old tail frames were > 0 (Double Team on the opponent side x3 and Attract had +1 / +3 total frames before this).

### Sound clock
The generic SE clock is calibrated on a 7-row counter lead. An S body's SE age therefore shifts by `counterLead - 7` where the counter lead = `bodyLeadFrames + the rows of the preceding stat commands` (the stat rows are part of the counter lead: `lead - 7` alone made Agility / Swords Dance worse). Per-id clocks measured against the ROM: Smokescreen 108 / Scary Face 184 / Metal Sound 319 lead 5, Sweet Scent 230 lead 6, Double Team 104 lead 5 (T2: 98 of 190 Double Team SEs were +2 late with 7). `lse2BodySoundAgeShift` keeps the lse2 calibration as is.

### ROM spot-check (Scene ON, `tools/compare/traces/lead4-<x>-on.json`, labs `tools/battle-lab/lead4-<x>-player-on.json`)
Matched frames before / with the rule: Double Team 420 -> 422, Protect 753 -> 863, Light Screen 569 -> 641, Rain Dance 549 -> 566. None got worse. Double Team's -80 window disagreement (the 3-animation status body, section above) is an adapter-window problem (B5), not this batch.

### Census delta (`lsd194Census.sh` + `rst197CensusDelta.py`, base 29fd7cf34, final = a4a3c34a6 (src tree identical to c13d7b6eb))
- Scene ON 0..199: eventsDigest identical on all 200 seeds, type sequences identical, bad 0; 175 battles change, 25 identical; **1,048 move-animation commands** (of 8,073) change, **0 commands change their total frames (0 frames in total)**; the only changed census field is [17] `scriptTailRows`.
- Scene OFF 0..99: 100 / 100 identical.
- Sound (`soundCensusDelta.py`): the same event sequence in all 200 seeds, **3,025 SE rows move**, all earlier, on the 1,048 batch commands only (the same 175 battles): -2 x 1,840, -4 x 861, -5 x 324.
- T1 on the final arm: exact 54,005, known-offset 0, missing 0, extra 0 (0 / 0 / 0, as on the base).

### T2 (Scene ON ROM-aligned scoreboard, `tools/audio/aud248RunSeed.sh`, 10 seeds 12 15 18 64 92 143 148 166 170 198)
| family | exact before -> after | offset before -> after | missing | extra |
|---|---|---|---|---|
| move-animation SE | 225 -> 452 | 1776 -> 1549 | 30 -> 30 | 0 -> 0 |
| stat-change SE | 9 -> 19 | 85 -> 75 | 2 -> 2 | 2 -> 2 |
| cry / battle-controller SE / bgm | unchanged | unchanged | 0 | 0 |

Missing / extra are unchanged (the 30 missing `se:144` and the `se:239` pair are in the base). Move-SE offset mass falls 1776 -> 1549 (227 rows become exact); the matched-row delta distribution (median -1, p10 -14, p90 5) is unchanged, the remaining offset is the adapter-window / hp-length residual (B5).

### Gates
`npm run typecheck` 0; `npm run build` 0; `npm run test:gate` 362 files / 2,844 tests green. 8 chunks (a failing chunk was re-run after its re-pin; every test importing liveMoveAnimation / battleResolutionPresentation* / moveAnimSounds / tickSounds / iu120Rows, or naming a B3 body) green after the re-pins. `tests/randomRoundSoak.test.ts` has 3 failures (the seven-wins pin 43437 -> 43336 frames / renderCalls 3045 -> 3042, ISSUES #89 seed 28 halt, M-B step 2 "full" seed 0 18678 vs 39365) that are **identical on the base 29fd7cf34** (run in a throwaway worktree): pre-existing, not moved by B3, and the file is not edited. `tests/lbrd.test.ts` green.

Re-pins (each by the lead-before-body rule):
- `tests/aud242aMoveAnimSounds.test.ts`, `aud242c`, `aud242d`, `aud242k`, `aud242p`, `aud242r`, `aud258MoveAnimSounds.test.ts`: the S bodies' sound residuals re-pinned to 0 (frame-exact with the lead presented).
- `tests/animation/liveRandom2R4MoveAdapters.test.ts` (Rain Dance lead 2) and `liveRandom2R5MoveAdapters.test.ts` (Sand-Attack lead 1): the route rows pass the script lead to `iu120EffectAges`.
- `tests/helpers/iu120Rows.ts`: `S_LEAD_RULE_IDS`, `hpd4BodyRows` 0 for S ids, `iu120EffectAges` tail minus the lead.
- `tests/battleTurnPortability.test.ts`: Sand-Attack timing `scriptTailRows` 6 -> 5, `bodyLeadFrames` 1.
- `tests/ont193SceneOnTails.test.ts`: tail frames Bulk Up 4 -> 2, Protect 3 -> 1, Detect 3 -> 1, Sand-Attack 6 -> 5, Double Team window 5 -> 4 (body rows 117 / 131 / 118 / 67 / 244 unchanged).
- `tests/land97IdleLeadRows.test.ts` and `tests/iu120UniversalRows.test.ts`: Bulk Up gets 2 lead rows (age 0) before the body and a script tail of 2 (4 - 2); 117 rows total.
- `tests/tl204ZeroTailRows.test.ts`: tailRows / tailFrames Double Team 6/5 -> 5/4, Rain Dance 6/5 -> 4/3, Scary Face 6/5 -> 5/4, Light Screen 7/6 -> 4/3, Sunny Day 7/6 -> 4/3, Charm 6/5 -> 5/4, Hail 7/6 -> 4/3; every used -> print residual is unchanged.
