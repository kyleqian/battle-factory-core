# aud251: S11 (audio) T2 scoreboard refresh (measurement + one controller fix)

Tested tree: `466ad7724` (tree `683edf05c`), oracles Battle Scene ON `:8012` / OFF `:8014`. Evidence (ignored dir): `.integration/evidence/aud251/` =
`chain/<seed>-<scene>.{req,setup,engine,drive,frozen,tl,cmp,snd}.json` (T2 runs), `chain/summary.log`, `scoreboard.{txt,json}` (first pass, no tail), `scoreboard4.{txt,json}` (final, with tail), `toprows.txt`, `tail/` (Part 2 ROM windows).
Baseline: `docs/aud248-s11-scoreboard.md` (tree `3bf10bbcf`, its Part 1 table). Since then: aud248 Part 2 (stat-change SE emitter), aud249 / aud250 (general
animation SEs), aud242h-l (move-SE lifetimes), cry2 (cry-task samples), psn2.

## Commands (identical to aud248)

```sh
# per seed / scene: request -> ROM setup -> engine replay -> closed-loop ROM drive -> timeline -> compare, then the ROM sound pass (hybrid lab on the frozen trace)
nice -n 19 tools/audio/aud248RunSeed.sh SEED on|off .integration/evidence/aud251/chain      # 2 at a time (xargs -P 2); 41 runs, ~55 min wall on a loaded box
python3 tools/audio/soundScoreboard.py .integration/evidence/aud251/chain --out .integration/evidence/aud251/scoreboard4.json   # the first pass ran before the Part 2 tail (see below)
```

Seeds unchanged: ON 21 (`2 6 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6912 7295 8108 8612`), OFF 20
(`2 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6568 6912 7295 7682`). **All 41 still align to battle end** (every engine state
matched, drive stop = outcome, 0 chain FAIL), so no seed needed replacing from the pool rule.

## Family table, before (aud248 Part 1) vs now

Rows: matched `exact` (same offset from the segment start) / `offset` (matched, different offset) / ROM-only `missing` / engine-only `extra`.

| family | ON missing before -> now | ON extra before -> now | ON exact+offset before -> now | OFF missing before -> now | OFF extra before -> now | OFF exact+offset before -> now |
|---|---|---|---|---|---|---|
| move-animation SE | 1569 -> **206** | 0 -> 0 | 2422 -> 3785 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| stat-change SE (239 / 245) | 85 -> **15** | 0 -> 0 | 0 -> 70 | 89 -> **0** | 0 -> 0 | 0 -> 89 |
| cries | 8 -> **0** | 0 -> 0 | 163 -> 171 | 0 -> 0 | 0 -> 0 | 161 -> 161 |
| battle-controller SE | 17 -> 19 | 31 -> **17** | 610 -> 624 | 6 -> 6 | 20 -> **4** | 695 -> 711 |
| BGM | 0 -> 0 | 5 -> **0** | 0 -> 5 | 0 -> 0 | 4 -> **0** | 0 -> 4 |
| fanfare / screen SE | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |
| **total** | 1679 -> **240** | 36 -> **17** | 3195 -> 4655 | 95 -> **6** | 24 -> **4** | 856 -> 965 |

Now (full counts, after Part 2's tail window below): ON exact 337 / offset 4318 / missing 240 / extra 17; OFF exact 34 / offset 931 / missing 6 / extra 4. Without the tail (first pass of the 41 runs): ON 238 / 36, OFF 6 / 24; the controller and BGM rows of this table are the tail-window figures.
Matched-row frame delta (engine minus ROM, from segment start): move-animation SE median -2 (p10 -20, p90 +6), controller SE -5 / -3 (ON / OFF), cries -9 / -7, stat-change -2 / +2: same character as aud248 (engine a few frames early; ordered content matches, few exact offsets).
SE_SHINY (102), 107 ROM-only rows in aud248 Scene ON, is gone from the list (the shiny sparkle is now emitted with the general animation sounds).

## Top ROM-only / engine-only rows per scene (kind, id, count over the seeds)

Scene ON: missing SE_M_CONFUSE_RAY 196 x65, SE_M_ENCORE 222 x18, SE_M_STAT_INCREASE 239 x15, SE_M_ROCK_THROW 131 x15, SE_EFFECTIVE 13 x15, SE_M_THUNDERBOLT 118 x12, SE_M_COMET_PUNCH 139 x12,
SE_M_SWAGGER2 194 x8, SE_M_ABSORB_2 179 x8, SE_M_BIND 170 x8, SE_M_STRENGTH 214 / SE_M_METRONOME 186 / SE_M_MEGA_KICK 140 / SE_M_TRI_ATTACK2 221 / SE_M_MORNING_SUN 228 x6 each, then 21 more ids at 1-5.
Engine-only (with tail): SE_EFFECTIVE 13 x15, SE_BALL_OPEN 15 x2 (no-tail pass: x16, plus MUS_VICTORY_TRAINER 412 x5).
Scene OFF: no move-animation row at all. missing SE_EFFECTIVE 13 x4, SE_LOW_HEALTH 90 x1, SE_BALL_OPEN 15 x1; engine-only SE_EFFECTIVE 13 x4 (no-tail pass: SE_BALL_OPEN x16, victory BGM x4 as well).

## Re-ranked gap list

| # | family (scene) | rows | note |
|---|---|---|---|
| 1 | move-animation SE (ON) | 206 missing (was 1569): Confuse Ray 65, Encore 18, Rock Throw 15, Thunderbolt 12, Comet Punch 12, Swagger / Absorb / Bind 8 each | the other worker's lifetime family (ISSUES #219); long tail, now 13% of aud248's size |
| 2 | controller (both) | 17 ON / 4 OFF extra (was 31 / 20: SE_EFFECTIVE x15 / x4 pairs in seed 2741 plus SE_BALL_OPEN x2 ON), 19 / 6 missing | the artifact half is closed (Part 2); the rest is an ordering / pan difference in seed 2741 and 2 + 3 SE_BALL_OPEN rows ON in a different place |
| 3 | stat-change SE (ON) | 15 missing (OFF 0) | secondary-effect stat changes the presentation does not run as a `stats-change` command (aud248 Part 2 "not closed") |
| 4 | frame offsets | 4318 ON / 931 OFF matched at a different offset, median -2..-9 | presentation lengths, not content; aud243d section 5 |
| closed since aud248 | cries (8 -> 0), SE_SHINY (107 -> 0), stat-change OFF (89 -> 0) | | |

Not re-measured: T1 census classes (declined bodies BEAT UP / WITHDRAW / ROCK SMASH, gated ops, cry-task, pan-task): only the T2 table was in scope; the aud242k / l entries in `PROGRESS.md` hold the latest T1 gated count (0..99 ON 308).
S11 stays "not met" (acceptance is the 0..999 census at 0 missing / 0 extra).

## Part 2: the controller "extras" are window-end artifacts (tooling fix, no `src/` change)

Cause: `romDriveSeed.sh` stops the closed-loop drive at `gBattleOutcome != 0` and the sound pass replays only those frames, so the ROM window of the last resolution ends before the victory BGM
(`PlayBGM(MUS_VICTORY_TRAINER)`, ROM +22 after the last faint box is dismissed) and before the loss path's `returnopponentmon1toball` SE_BALL_OPEN; the engine plays both (aud241c-proven: `src/engine/battleEndSounds.ts:35`, `:70`).
Proof: `soundEventProbe.py lab` on the frozen trace plus 500 idle frames (`.integration/evidence/aud251/tail/`, Scene OFF seeds 2, 499, 1028): the ROM plays victory BGM 412 at +377 (window end +376) and SE_BALL_OPEN 15 at +350 / +975 (window ends +343 / +968)
and the ordered rows equal the engine's (pinned: `tests/aud251OutcomeTail.test.ts`, `tests/fixtures/aud251-outcome-tail.json`; engine-minus-ROM offsets 0..+28 / -29..0 per row).
Fix: `tools/audio/aud248RunSeed.sh` appends `AUD_TAIL_FRAMES` (default 500) idle frames to the frozen trace for the sound pass (`<seed>-<scene>.frozen-tail.json`); the matched rows of the pre-existing windows are the same ROM frames.
All 29 ROM-only-window extras of SE 15 / BGM 412 lay in the last resolution of their run (checked on the no-tail pass); the whole 41-run table was re-run with the tail. Result: BGM extras 5 / 4 -> 0 (all 9 now matched, offsets -71..+23), SE 15 extras 16 -> 2 ON / 0 OFF.
Not closed: ON SE_BALL_OPEN 2 extra + 3 missing (a different position in the last resolution of a few ON seeds; not looked at), SE_EFFECTIVE pairs in seed 2741 (missing + extra at neighbouring offsets), SE_LOW_HEALTH 90 x1.
Sound-only by construction: tooling and a test fixture only, no `src/` change (frame hashes and census commands untouched).

## aud252: controller rows left after Part 2 (sound-only fixes, `src/engine/battleHitSounds.ts`, `battleEndSounds.ts`, `tickSounds.ts`)

Same 41 seeds and chain (rescored with `tools/audio/aud249Rescore.sh` on the ROM files of aud251; the engine side is ~7 s / seed). Battle-controller SE, before (aud251 + the engine at `fcaa41542`) -> now:

| | ON missing | ON extra | OFF missing | OFF extra |
|---|---|---|---|---|
| SE_EFFECTIVE 13 pairs (item 1) | 19 -> **4** (all controller rows) | 17 -> **2** | 6 -> **2** | 4 -> **0** |
| SE_BALL_OPEN 15, loss path (item 2) | 4 -> **2** | 2 -> **0** | 2 -> 2 | 0 -> 0 |

**(1) End-turn weather damage pans by `gBattlerTarget`, not by the damaged battler** (seed 2741). `BattleScript_DamagingWeatherLoop` runs `effectivenesssound; hitanimation BS_ATTACKER`
(`data/battle_scripts_1.s:3212`). `Cmd_effectivenesssound` (`battle_script_commands.c`) plays through `gActiveBattler = gBattlerTarget`, and `PlayerHandlePlaySE` pans by that battler's side (player -64, else +63).
`DoFieldEndTurnEffects` (`battle_util.c:1186-1191`) sets `gBattlerTarget` to the first present battler, the player, before the loop, so the SE is **always -64**, also when the opponent takes the damage.
The engine panned by the damaged battler (so the opponent's hit played +63 and the pair sat at neighbouring rows of the scoreboard). `effectivenessSong` now carries `weatherLoop` (event provenance `sourceLabel === "BattleScript_DamagingWeatherLoop"`)
and `emitBattleHitSounds` pans such a row by battler 0. ROM window: `tools/audio/fixtures/aud252-hail-damage-player.json` (Scene ON Hail lab: Rattata Lv50 Hail vs Lv12 Rattata Seismic Toss, step mode, 1500 frames):
the ROM plays SE 13 at 579 / 988 / 1136, all pan -64, the second one damaging the opponent; ours are the same rows, engine-minus-ROM -8 / -2 / -10 (presentation length, not this step). `tests/aud252EndTurnSounds.test.ts`
(registered in `tests/audioProbeFixtures.test.ts`).

**(2) The loss path's SE_BALL_OPEN is `returnopponentmon1toball`, which runs after the turn's remaining commands.** `BattleScript_LocalBattleLostPrintTrainersWinText` (`battle_scripts_1.s:2960-2968`) is entered from
`HandleEndTurn_BattleLost`, i.e. after anything else the turn's script still does. The engine fired the ball open at the faint box's dismissal + 24 (`OPPONENT_BALL_OPEN_AFTER_FAINT_DISMISS`, calibrated on the
aud241c windows, where nothing lies between the two). When the opponent has a held-item effect to run after the faint (Shell Bell heal, ON seeds 1914 / 2230, and 25 / 61 / 73 in the census) the SE fell inside the
HELD_ITEM_EFFECT animation: engine SE 15 at the item's first SE + 5, ROM after its last one + 182 (1914 ON: ROM `16, 5, 152, 152, 152, 228, 102, 15`; the engine had `16, 5, 152, 15, 152, 152, 228, 102`).
Now `emitLossBallOpenSound` (`battleEndSounds.ts`, called from `tickSounds.ts`) plays it `OPPONENT_BALL_OPEN_AFTER_RETURN_TO_BALL = 22` ticks after the first tick of the presented
`sprite-visibility` command whose provenance is `BattleScript_LocalBattleLostPrintTrainersWinText` (the ball-return command); the old dismissal branch is gone. 22 is the measured delta that keeps both
aud241c loss windows frame-exact (`aud241c-loss-on-window` / `-off-window`, deltas 0): there the return-to-ball command starts 2 ticks after the faint box's dismissal (24 - 22).
Pinned by `tests/aud252LossBallOpen.test.ts` (live `soundCensusRomReplay.ts replay` of seeds 1914 / 2230 Scene ON from `tests/fixtures/aud252-loss-itemeffect.json` = T2 setup + the ROM's rows from the faint SE on):
same ordered rows as the ROM, engine-minus-ROM of the ball open **+1 / +14** (it was -364 / -350 before). OFF: 1914 / 2230 ball-open error 168 -> 19 / 18.

Acceptance: census seeds 0..99 (`lsd194Census.sh`, `6d6b5cf36` vs `0a61fd169`): commands identical 100 / 100 in Scene ON and in Scene OFF; `soundCensusDelta.py` arm-vs-arm: 95 / 100 seeds identical in each scene,
the 5 that move differ only in SE 15 rows (no other row or frame changed; the shifts are the loss-path ball opens, +187 / +365 where an item effect now sits before it). `compare:differential` on the Hail / Spark traces
(`--base fcaa41542`): 133 captures byte-identical. T2 rescore: ON controller missing 19 -> 2 and extra 17 -> 0, OFF 6 -> 2 / 4 -> 0.

**(3) Scene ON Double Team: the stat SE lives in the move window, not in a stats-change command.** The 15 ROM-only SE 239 rows of aud251 were not secondary effects (Metal Claw / Steel Wing) but Double Team
(seed 2 x5 and the other ON seeds): sc106 presents its STATS_CHANGE inside the 230-row live move window (`STATS_CHANGE_OWNING_LIVE_MOVE_IDS`, `battleResolutionPresentation.ts`), so there is no `stats-change` command and
`emitStatsChangeSounds` stayed silent. `General_StatsChange` plays SE_M_STAT_INCREASE (`battle_anim_utility_funcs.c`) with pan SOUND_PAN_ATTACKER; the ROM rows are **34 frames after the last SE_M_DOUBLE_TEAM** (script row 131 + 34 = 165,
seed 2 ROM 1174 -> 1208, 3121 -> 3155, 4420 -> 4454, pan +64 for the opponent). `emitDoubleTeamStatsChangeSound` (`battleHitSounds.ts`, called from `tickSounds.ts`) emits it from the live move source age
(`age - 8 == 165`, the same clock as the move's SEs) only when the segment's next events (before the next USEDMOVE) hold a STATS_CHANGE animation of the attacker (so not at +6). Pinned by
`tests/aud252DoubleTeamStatSe.test.ts` (live replay of T2 seed 2 ON from `tests/fixtures/aud252-doubleteam-statse.json`: same 135 / 239 rows and pans as the ROM, the 239 gap to the last 135 = 34 as the ROM; the rows
carry the move's own presentation residual, e.g. -22 / +82 / +136). T2 ON: stat-change SE missing 15 -> **0**, extra 0. Census 0..99 ON (`0a61fd169` vs `2a5b424a9`): commands 100 / 100 identical; sound differs
only by added SE 239 rows (18 pan -64, 14 pan +64); differential (`--base 441805b40`, Hail / Spark traces): 90 captures byte-identical. Scene OFF is unchanged (its Double Team has a stats-change command).
Not modelled: a Substitute behind the Double Team user (the ROM skips the stats animation; the live window does not either). Metal Claw / Steel Wing secondary effects: the lab fixtures show the engine's staged roll does not
run the effect; no ROM-only 239 row in T2 comes from them, so that gap is not measured (`tests/aud248StatChangeSounds.test.ts` keeps the named null residuals).

Still open (controller family): seed 2741 res5 ON and OFF, the opponent's mid-battle switch (AI switch): the ROM has an extra SE_BALL_OPEN at +53 (the recall) and the tray (114) / ball open / cry 75 later than the engine (114 at +9 vs ROM +84);
the engine models player switches only (aud241a); needs a ROM step window of an AI switch. SE_LOW_HEALTH 90 x1 (seed 2, ROM +581 in both scenes).
