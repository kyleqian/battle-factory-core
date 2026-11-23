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

Per-lab ROM vs engine timing (the b4m / bdt1 / gsp3 labs): `tools/integration/labCompare.sh LAB.json...` (cln12; `tools/battle-lab/README.md` "Lab compare"), not the per-step `b4mRun.sh` / `bdt1Run.sh` / `gsp3Cmp.py` copies.

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

Still open (controller family) at the end of aud252 was the opponent's AI switch and SE_LOW_HEALTH 90; both are handled in the next section.

## aud253: the opponent's AI mid-battle switch, SE_LOW_HEALTH at the player's switch-in (sound-only: `battleStartSounds.ts`, `midBattleOpponentPartySummary.ts`, `screenSounds.ts`)

Evidence: `.integration/evidence/aud253/` (ROM step windows `2741-off-step.json` / `2-on-lowhp.json`, rescored chain files `chain/`); committed windows `tools/audio/fixtures/aud253-ai-switch-2741-off.json`, `aud253-lowhp-switchin-2-on.json`.

**(1) AI switch (seed 2741 res5).** The ROM path is `BattleScript_ActionSwitch`: printstring RETURNMON, `returnatktoball` (`EmitReturnMonToBall`; SE_BALL_OPEN 2 ticks into the ball return), `drawpartystatussummary`
(SE 114 pan 0), printstring SWITCHINMON, `hidepartystatussummary`, `switchinanim` (SE_BALL_OPEN at +18, the cry +16). ROM step window (OFF, hooks on the controller emits): SE 15 at 2821, 114 at 2852 (31 later),
SE 15 at 3007 (155 after the 114), cry 57 at 3023. The kernel's AI switch emits only draw-party-status-summary / switch / SWITCHINMON / hide / switch-in-animation (no RETURNMON, no return-to-ball), so the recall
SE_BALL_OPEN was missing and the whole sequence is **~75-77 frames shorter than the ROM's** (the RETURNMON message + ball-return animation, a presentation gap, out of scope: pixels). Sounds keep following the engine's own
presentation, with one new row: the recall SE_BALL_OPEN rides the tick of an opponent `party-summary` draw with no lead (a draw after an opponent faint has `OPPONENT_SUMMARY_FAINT_LEAD_FRAMES`, so it is not
an AI switch), ahead of the tray SE (`emitOpponentPartySummarySounds`). Pinned by `tests/aud253AiSwitchLowHp.test.ts` (live replay of seed 2741 OFF): same four rows in the ROM's order; engine minus ROM = +31 (recall ball open: the ROM's
is 31 earlier than the tray SE), 0, -2, -2 (send-in ball open / cry).

**(2) SE_LOW_HEALTH 90 (seed 2).** Not a hit: it is `HandleLowHpMusicChange` called by `SwitchIn_HandleSoundAndEnd` (`battle_controller_player.c:1087`) on the frame the cry is done and the BGM is restored
(`m4aMPlayVolumeControl 0x100`), when the incoming mon's bar is red (a Blastoise at low HP switched in, 9). Two parts were missing: the call itself, and the BGM restore, which the engine schedules only for known cry lengths and a WEAK
(CRY_MODE_WEAK, pitch 15000) cry's length was known for Onix only. `startCry` / `playSendOutCry` take an on-restore callback; the player's mid-battle switch-in passes `handleLowHpMusicChange(hp, maxHP)`. `WEAK_CRY_FRAMES` gains the
species measured in the aud251 chain windows (duck-to-restore 62 / 25 / 65 / 54 frames for 9 / 83 / 130 / 198, i.e. length 61 / 24 / 64 / 53; the model `ceil(2^(360/3072) * native)+3` fits 3 of 5, not used). Scene OFF: the SE is on the restore frame (seed 2 OFF res: restore 7148 = SE 90 7148).
**Scene ON: SE 90 comes 71 frames after the restore** (window 10860+200: restore 10948, `HandleLowHpMusicChange` 11019; the healthbox's special animation still runs): one oracle window, taken as a constant
(`SWITCH_IN_LOW_HP_AFTER_RESTORE_SCENE_ON`, chosen by the segment's NO_ANIMATIONS hit marker); seed 2 ON is exact (engine minus ROM 0 for the cry, both ducks and the SE). Pinned by the same test (seed 2 ON). Not wired: the
party-menu forced send-out (`emitPartySendOutSounds`: no scene flag there, no low-HP ROM window; the faint-replacement low-HP SE is still unmodelled) and WEAK species without a measured length (their restore, and so this SE, stay silent).

T2 rescore (current engine, ROM files reused: `aud249Rescore.sh`, seeds 2 and 2741 both scenes): controller SE missing / extra **0 / 0** in OFF and in ON (before this step ON missing 6 / extra 4 and OFF missing 6 / extra 4 on these two seeds,
of which SE 15 / 90 and the SE 13 pair were aud252's and this step's); ON still lists the move-animation SE rows (se 214 / 123 / 131 ..., other worker). Census 0..99 (`lsd194Census.sh`, `2cdf86ba3` vs `7a8b8cec4`): commands identical 100 / 100 in
Scene ON and OFF; `soundCensusDelta.py`: 88 / 100 seeds identical in each scene, the 12 that move differ only by added rows: 11 x SE 15 (the AI-switch recall, 11 AI switches in 100 seeds) and 1 x duck 476 (a WEAK restore); no
other row moved. Only seed 2741 has a ROM window for the AI-switch recall; the other 10 AI-switch seeds are unmeasured. `compare:differential` (`--base 2cdf86ba3`, `turn5-switchin` / `turn13-switchin`): 483 captures byte-identical.

Still open (ais1, `docs/ais1-ai-switch-withdraw.md`, closed the AI switch's RETURNMON text + ball return and moved the recall SE to its ROM frame): the forced party-menu send-out low-HP SE, WEAK cry lengths for the other species, and the Scene ON +71 constant needs a second window.

## aud254: the forced send-in's low-HP SE, the Scene ON low-HP delay model, the restore-vs-next-cry order (sound-only: `screenSounds.ts`, `battleStartSounds.ts`)

Source: `SwitchIn_HandleSoundAndEnd` (`battle_controller_player.c:1087`) is shared by the voluntary and the forced (after a faint, party menu) send-in: once the healthbox slide and the cry are done (Scene ON also the back-sprite animation,
`SpriteCB_PlayerMonFromBall` -> `BattleAnimateBackSprite`) it runs `m4aMPlayVolumeControl(BGM, 0x100)` and `HandleLowHpMusicChange` (SE_LOW_HEALTH if red, else a logged stop of 90). Callback order: `main.c:190-194` runs callback1 (the battle
controllers and scripts) before callback2 (`RunTasks`), so `PlayCry_ByMode` (counter = 2, `sound.c:316`) beats `Task_DuckBGMForPokemonCry` (`sound.c:542`) on a shared frame.

(1) Forced send-in: `emitPartySendOutSounds` now schedules `handleLowHpMusicChange` at the controller end, `blankStart - 13` in the party-menu send-out elapsed domain (= B + D - 2, `switchInTail.ts`'s forced switch-in duration D; `blankStart` = B + D + 11), at the
restore frame when that is already past. (2) The Scene ON "+71 after the restore" constant is gone: both the mid-battle switch-in and the forced send-in use one model, delay after the cry start = D - 65 (D = `sceneOn/OffPlayerForcedSwitchInDuration`),
from the cry's restore. The second ROM window (seed 237 T2 chain, `aud248RunSeed.sh 237 on|off`; other species, other pan) refutes the constant: cry -> SE 90 / stop 90 is ROM 36 (Gligar) and 28 (Pupitar) in OFF, 86 and 38 in ON, engine the same; the +71 rule was right
for Blastoise (seed 2, ON, still exact: 133) and wrong by -10 (Pupitar) / +50 (Gligar) for these. OFF Pupitar's SE (10/164, red) is on the restore frame (controller end 26 < restore 28), as the ROM. (3) seed 71 ON: no natural ROM window has a restore on a
cry-start frame (scan of the three T2 chains: none), so it is argued from source: the restore task is flagged and runs after the frame's other scheduled sounds, a cry starting on that frame supersedes it (no restore row; the next restore is the new cry's). ROM
evidence for the same-frame order of ordinary rows: the restore duck follows an SE of the same frame (`aud242e-toxic-player` 366, `faint-cry-length-129` 257, `71-on` 1641).

Fixtures / tests: `tools/audio/fixtures/aud254-forced-sendin-237-{off,on}.json` (ROM step windows, registered in `tests/audioProbeFixtures.test.ts`); `tests/fixtures/aud254-switchin-lowhp.json` + `tests/aud254SwitchInLowHp.test.ts` (4 windows: Gligar
healthy and Pupitar red, both scenes; engine minus ROM 0 on every row incl. the SE / stop 90); `tests/aud254CryRestoreOrder.test.ts` (restore vs next-cry, same frame / one frame later).

Acceptance: census 0..99 (`lsd194Census.ts` in place, `75338ad61` vs HEAD): commands identical 100 / 100 in Scene ON and OFF (`rst197CensusDelta.py`). `soundCensusDelta.py`: 98 / 100 seeds identical in each scene; the 4 that move (all intended):
OFF seed 95: SE 90 added at the forced send-in's controller end (5553) and the later SE 90 (5998) gone, since the loop is already playing (`lowHpPlaying`); ON seed 95: the same pair (+SE 90 6837, -SE 90 7474) and the healthy voluntary switch-in's stop 90 moved 3778 -> 3707
(+71 constant -> model, -71); ON seed 71: one duck 476 removed (the restore on the next faint cry's frame, 1642); OFF seed 21: an order-only change on one frame (6541: duck 256 restore now after stop 90 / bgm 412, the battle-end rows are callback1's). Count: +2 SE 90, -2 SE 90,
1 stop 90 moved, -1 duck, 1 order swap. `compare:differential` (`--base 75338ad61`, `turn5-faint`, `turn13-dragonbreath-faint`, `turn5-switchin`, `turn13-switchin`): 734 captures byte-identical. Gates: `typecheck` 0, `test:gate` 362 files green, `tests/aud2*` + `tests/cry*` 46 files green.

Caveats: the census battle is not the T2 replay's battle (different player sets), so most red-bar census events do not reproduce in a ROM chain; only seed 237 does (Pupitar 10/164), so the SE side rests on that seed's windows (two species, two scenes, one forced and one voluntary-shaped model).
The seed 21 order swap has no ROM window. Both coincidence cases (3) are source-argued.

## aud255 (2026-11-17): T2 re-run on `57bb082ac` (measurement only, no `src/` change)

Tested tree: `57bb082ac` (tree `608417723`), oracles Battle Scene ON `:8012` / OFF `:8014`. Evidence (ignored dir): `.integration/evidence/aud255/` = `chain/<seed>-<scene>.{req,setup,engine,drive,frozen,frozen-tail,tl,cmp,snd}.json`, `chain/summary.log`,
`scoreboard.{txt,json}`, `aud251-scoreboard4.json` (the baseline copied from aud251), `jobs.txt`, `npmtest.log`. No census `tree/` copies were made. Since aud251: aud252 (weather-damage pan, loss-path ball open, Double Team stat SE), aud253 (AI switch, low-HP SE), aud254 (forced send-in low-HP), ais1 / ais3, sta3.

Commands (identical to aud251, the 500-frame outcome tail is the `aud248RunSeed.sh` default; 2 runs at a time, `nice -n 19`, 41 runs took ~58 min wall with another worker on the ROM):

```sh
( for s in 2 6 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6912 7295 8108 8612; do echo "$s on"; done
  for s in 2 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6568 6912 7295 7682; do echo "$s off"; done ) > .integration/evidence/aud255/jobs.txt
nohup sh -c "cat .integration/evidence/aud255/jobs.txt | xargs -P 2 -L 1 sh -c 'nice -n 19 tools/audio/aud248RunSeed.sh \$0 \$1 .integration/evidence/aud255/chain' > .integration/evidence/aud255/chain/summary.log" &
python3 tools/audio/soundScoreboard.py .integration/evidence/aud255/chain --out .integration/evidence/aud255/scoreboard.json > .integration/evidence/aud255/scoreboard.txt
```

**Alignment: all 41 seeds still align to battle end** (21 ON / 20 OFF, same lists as aud251; every engine state matched, drive stop = outcome, `frozenTimelineEqualsDrive`, 0 chain FAIL). No seed was replaced.

### Family table, aud251 -> aud255

| family | ON missing | ON extra | ON exact+offset | OFF missing | OFF extra | OFF exact+offset |
|---|---|---|---|---|---|---|
| move-animation SE | 206 -> **76** | 0 -> 0 | 3785 -> 3915 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| stat-change SE (239 / 245) | 15 -> **0** | 0 -> 0 | 70 -> 85 | 0 -> 0 | 0 -> 0 | 89 -> 89 |
| cries | 0 -> 0 | 0 -> 0 | 171 -> 171 | 0 -> 0 | 0 -> 0 | 161 -> 161 |
| battle-controller SE | 19 -> **0** | 17 -> **0** | 624 -> 643 | 6 -> **0** | 4 -> **0** | 711 -> 717 |
| BGM | 0 -> 0 | 0 -> 0 | 5 -> 5 | 0 -> 0 | 0 -> 0 | 4 -> 4 |
| fanfare / screen SE | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 / 0 | 0 |
| **total** | 240 -> **76** | 17 -> **0** | 4655 -> 4795 | 6 -> **0** | 4 -> **0** | 965 -> 971 |

Exact-offset rows: ON 337 -> 370 exact / 4318 -> 4425 offset; OFF 34 -> 38 exact / 931 -> 933 offset. Matched-row frame delta (engine minus ROM, from the segment start): ON move-animation median -2 (p10 -20, p90 +7), controller -5 (-28 / +2), stat-change -1, cries -10, BGM -23;
OFF controller -3 (-13 / +8), stat-change +2, cries -7, BGM +12: the same character as aud251 (engine a few frames early; content and order match, offsets are presentation lengths).

**Scene OFF T2 is at 0 missing / 0 extra in every family** (aud251: 6 / 4). **Scene ON has 76 ROM-only rows and 0 engine-only rows**, all of them move-animation SE.

### Top ROM-only / engine-only rows per scene (kind, id, count over the seeds)

Scene ON missing (76): SE_M_ROCK_THROW 131 x15, SE_M_THUNDERBOLT 118 x12, SE_M_ABSORB_2 179 x8, SE_M_STRENGTH 214 / SE_M_METRONOME 186 / SE_M_MEGA_KICK 140 / SE_M_TRI_ATTACK2 221 / SE_M_MORNING_SUN 228 x6 each,
SE_M_SWAGGER2 194 / SE_M_SKETCH 205 / SE_M_SUPERSONIC 184 x2 each, SE_M_EXPLOSION 178 / SE_M_LEER 192 / SE_M_ATTRACT 226 / SE_M_DRAGON_RAGE 171 / SE_M_PSYBEAM 189 x1 each. Engine-only: none.
Gone since aud251: SE_M_CONFUSE_RAY 196 (x65), SE_M_ENCORE 222 (x18), SE_M_COMET_PUNCH 139 (x12), SE_M_BIND 170 (x8), SE_M_STAT_INCREASE 239 (x15), SE_EFFECTIVE 13 (x15 missing, x15 extra), SE_BALL_OPEN 15, SE_LOW_HEALTH 90, and the ids at 2-5 rows
(SE_M_VITAL_THROW2 123, SE_M_STRING_SHOT2 130, SE_M_ENCORE2 223, SE_M_MEGA_KICK2 141, SE_M_HYPER_BEAM 215, SE_M_THUNDERBOLT2 119, SE_M_SWAGGER 193; SE_M_DRAGON_RAGE 3 -> 1; SE_M_SKETCH 205 and SE_M_SUPERSONIC 184 unchanged at 2). Scene OFF: no row at all (was SE_EFFECTIVE x4 / x4, SE_LOW_HEALTH x1, SE_BALL_OPEN x1).

Where the 76 sit (seed ON, resolution: rows, from `score_run` detail): 6 res6: 131 x12 + 178 x1; 2741 res1 / res5: 131 + 214 x2 each (2 res); 2 res7: 131 + 214 x2; 3738 res4 / 6 / 12 / 22 / 26 / 30: 140 + 179 each (6 res); 5569 res0 / 1 / 3 / 5 / 13 / 14: 118 x2 + 221 each (6 res);
8108 res5 / 9 / 13 / 17 / 21 / 25: 228 each (6 res); 165 res9: 186 x6 + 194 x2, res17: 192 + 205 x2; 1028 res9 / 13: 179 each; 830 res3: 226; 4235 res2: 171; 6079 res6: 184 x2 + 189. The groups repeat with the same ids and counts every time the same move is used in a seed,
so each group is one move's SE set missing from its live window (the seed 165 res9 row of six SE 186 + two SE 194 is a Metronome-called move; ids map to the animation modules by `grep SE_M_<name> src/animation`, the move name per resolution was not resolved in this pass).

### Re-ranked list of what is left for S11 acceptance

Acceptance is still the "Audio (S11)" census 0..999 at 0 missing / 0 extra in both scenes. S11 stays **not met**.

| # | item | rows (T2) | cause class |
|---|---|---|---|
| 1 | move-animation SE (Scene ON): 16 SE ids over 11 seeds (list above); largest: Rock Throw-family 131 x15 (seeds 6, 2, 2741), Thunderbolt-family 118 x12 (5569), Absorb 179 x8 (3738, 1028), 6-row groups for 214 / 186 / 140 / 221 / 228 | 76 missing (aud251: 206), 0 extra | **unresolved lifetime** (ISSUES #219, the other worker's move-SE lifetimes); down 63% in one refresh |
| 2 | Scene ON per-move SE content that appears in a single seed (SKETCH 205, SUPERSONIC 184, EXPLOSION 178, LEER 192, ATTRACT 226, DRAGON_RAGE 171, PSYBEAM 189, SWAGGER2 194) | 11 missing | **unresolved lifetime**, one-off windows (possibly a **per-battle dimension**: a Metronome / status-move variant that only these seeds roll; not checked) |
| 3 | frame offsets of matched rows (ON 4425, OFF 933 at a different offset than the ROM) | 0 missing / 0 extra | **presentation offset** (engine median -2..-10 frames; not a census count; aud243d section 5) |
| 4 | Scene OFF T2 | 0 / 0 | closed on these 20 seeds; not a census claim |
| 5 | census 0..999 and the T1 classes (declined bodies BEAT UP / WITHDRAW / ROCK SMASH, gated ops, cry-task, pan-task) | not re-measured | **not measured** here (the census has no ROM rows; the latest T1 gated counts are in the aud242k / l PROGRESS entries) |
| 6 | the unmeasured sound-model gaps named by aud252-254: AI-switch recall for the 10 AI-switch seeds without a ROM window, WEAK-cry lengths for unmeasured species (their restore and low-HP SE stay silent), Substitute behind Double Team, Metal Claw / Steel Wing stat SE, the party-menu low-HP seam beyond seed 237 | none seen in T2 | **not measured** (no T2 row; T2 closes them for these seeds only) |
| window artifacts | none left: the 500-frame outcome tail removed the BGM / SE_BALL_OPEN window-end extras (aud251 Part 2), and no extra / missing row of this refresh is one | | closed |

Gates: no `src/` file changed; `npm run build` green (the doc is the only committed change); `npm test`: 1835 files / 15323 tests pass, **2 fail at the base commit, not from this step**: `tests/ais2AiSwitchFrames.test.ts` seed 2741 Scene OFF / ON ("withdraw, return-to-ball, recall ball effect and opponent tray are the ROM's frames": 111 / 115 frames differ from the pinned ROM md5s, first at 2727; reproduces alone, deterministic). Suspect: the ais3 recall-anchor commit `0a3d82624` (player recall feet anchor / scale ramp) moved frames the ais2 pin covers; not investigated (no `src/` change allowed here).

## t2cls (2026-11-17): cause class of the 76 Scene ON ROM-only move-animation SE rows (analysis only, no `src/` / `tests/` change)

Method: re-ran the `soundScoreboard.py` alignment over `.integration/evidence/aud255/chain/<seed>-on.{engine,drive,snd,tl}.json` (21 ON seeds) and kept every ROM-only row with its segment; the move is the ROM's `gCurrentMove` (`tl.json` column 2) at the row's frame, cross-checked with the `PlaySE12WithPanning` caller (`snd.json` `calls[].via`) and the op's script line in `reference/pokeemerald/data/battle_anim_scripts.s`.
Table facts: `src/data/gen/anim-sound-timing.json` read as committed; the extractor was re-run to a scratch dir (`npm run extract:anim-sound-timing -- --out-dir /tmp/t2cls`, `ANIM_SOUND_BLOCKERS_BY_MOVE=/tmp/t2cls/byMove.json`): byte-identical to the committed table, nothing under `src/` touched. The 76 rows are 29 (seed, resolution) groups; all sum: 13 + 9 + 8 + 3 + 1 + 2 + 12 + 1 + 3 + 18 + 6 = 76. No ROM drive, no census.
Caveat: "which SE ids are engine-silent" is exact (aud255); the cause column is read from the table / emitter code, not from an engine run, so (b) and (e) rows are the most probable cause, not a measured one.

Class key: (a) table-gated lifetime (blocker named, from `byMove.json`) / (b) ungated table entry, the live path has no emitter for it / (c) per-battle dimension / (d) branch resolved wrongly / (e) other.

| # | move (gCurrentMove) | seeds / resolutions | ROM-only SE rows (ids, script op line) | rows | class | cause |
|---|---|---|---|---|---|---|
| 1 | Shock Wave | 5569 res0 1 3 5 13 14 | 118 x2 (pan 21 / -21, **inside** `AnimTask_ShockWaveProgressingBolt`, line 4563, no script op) + 221 (4567, after `waitforvisualfinish` 4565) per res | 18 | (a) | 3 blockers: `AnimTask_ElectricChargingParticles@30`, `gGrowingShockWaveOrbSpriteTemplate@44`, `AnimTask_ShockWaveProgressingBolt@76`; the table stops after SE_M_CHARGE 213 (frame 30), which the engine does emit |
| 2 | Eruption | 6 res6 | 178 (3813, the 2nd `waitplaysewithpan` 60) + 131 x12 (`loopsewithpan` 3825, 16 / 12) | 13 | (e) | table is **ungated** and complete for Eruption (variants 288 / 291: 178 @78, 178 @160 / 169, loop 131 @238 / 256); ROM gaps 82 and 78 frames equal the table gaps, the engine emits only the first 178. Truncation of the emission after the first op (Eruption has a live adapter; `liveMoveSourceAge` / waitsound cut not investigated) |
| 3 | Wish heal (`General_WishHeal`, `gCurrentMove` = 0xFFFF) | 3738 res4 6 12 22 26 30 | 140 (10671 `SE_M_MEGA_KICK`) + 179 (`HealingEffect`, 10048) per res, 75 frames apart | 12 | (b) | table entry `General_WishHeal` (variant 377: 140 @35, 179 @110) is ungated, but `emitGeneralAnimSounds` (`src/engine/moveAnimSounds.ts:411`) handles only status, weather, Castform, Focus Punch set-up, held item, Leech Seed drain: no `WISH_HEAL` branch |
| 4 | Seismic Toss | 2 res7; 2741 res1 res5 | 214 (9474 `SeismicTossRockScatter1`) + 131 (9483 `Scatter2`) + 214 per res | 9 | (a) + (c) | blocker `AnimTask_MoveSeismicTossBg@31`; table ends `unresolved-branch` at `jumpreteq` 9440-9442 (`AnimTask_GetSeismicTossDamageLevel`, keyed on the move damage). All three ROM windows took the Medium branch (S1, S2, S1, 9466-9470); Seismic Toss damage is the attacker level, so at Lv 50 it is constant and the branch can be fixed, if `gAnimMoveDmg` is the move damage (not checked) |
| 5 | Torment | 165 res9 | 186 x6 (`SE_M_METRONOME`, 25 / 25 / 15 / 15 / 15 frames apart, **inside** `AnimTask_TormentAttacker`, 3504, `via` `AnimTask_TormentAttacker`) + 194 x2 (3508 / 3511, 22 apart, after the task) | 8 | (a) | blocker `AnimTask_TormentAttacker@6` (table variant 31 is empty); the 6 SE are task-internal |
| 6 | Cosmic Power | 8108 res5 9 13 17 21 25 | 228 (9072, `createvisualtask SoundTask_PlaySE1WithPanning` after `delay 70`) | 6 | (a) | blocker `AnimTask_BlendNonAttackerPalettes@3` (the table holds only 243 at frame 3) |
| 7 | Future Sight hit (`General_FutureSightHit`) | 6079 res6 | 189 (10584) + 184 x2 (10587 / 10588, 38 and 9 frames later) | 3 | (b) | ungated table entry (variant 374: 189 @3, 184 @41, 184 @49; the second 184 is 1 frame earlier than the ROM's 9), no `FUTURE_SIGHT_HIT` emitter in `emitGeneralAnimSounds` |
| 8 | Focus Band (`General_FocusBand`) | 4235 res2 | 171 (10502 `SE_M_DRAGON_RAGE`, pan -64, 49 frames after the Psychic hit SEs 184 x2 / 12) | 1 | (b) | ungated table entry (variant 372: 171 @0), no `FOCUS_BAND` emitter (the held-item emitter covers `HELD_ITEM_EFFECT` only) |
| 9 | Soft-Boiled | 1028 res9 res13 | 179 (`HealingEffect2`, 10060 via 7705), 74 frames after the 166 (`SE_M_HORN_ATTACK`) the engine does emit | 2 | (a) | blocker `gSoftBoiledEggSpriteTemplate@12` (the final `waitforvisualfinish` before `call HealingEffect2`) |
| 10 | Sweet Kiss | 830 res3 | 226 (7800 `SE_M_ATTRACT`, after the `waitforvisualfinish` at 7798), ~100 frames after the 3rd 195 | 1 | (a) | blocker `gAngelSpriteTemplate@6` |
| 11 | unresolved (window of the opponent's Block; `gCurrentMove` stays BLOCK 11119..11392 while the player's Fake Out is already over) | 165 res17 | 205 x2 (`SE_M_SKETCH`, 32 apart) + 192 (`SE_M_LEER`, 31 later), every `via` = `AnimTask_MonToSubstitute` (caller names are nearest-symbol guesses) | 3 | (e) | not Block's script (it plays only 193, which the engine emits) and not Fake Out's (SKETCH once, no LEER); no single script line carries SKETCH, SKETCH, LEER at 32-frame steps, so it is a different animation (suspect an ability / item / status animation in the same turn). **Needs a ROM look at the gCurrentMove / script pointer; do not guess** |

Per-seed counts (ON): 5569 x18, 6 x13, 3738 x12, 165 x11 (8 + 3), 2741 x6, 8108 x6, 2 x3, 6079 x3, 1028 x2, 4235 x1, 830 x1 = 76.
Class totals: (a) 44 (Shock Wave 18, Seismic Toss 9, Torment 8, Cosmic Power 6, Soft-Boiled 2, Sweet Kiss 1; Seismic Toss also has a (c)-type branch, listed as a sub-cause), (b) 16 (Wish heal 12, Future Sight 3, Focus Band 1), (e) 16 (Eruption 13, unidentified 3); 44 + 16 + 16 = 76. No row is a branch the table resolves **wrongly** (d): the only branch (Seismic Toss) the table leaves unresolved, and it never emits a wrong SE (engine-only rows are 0).
Two of the largest "ids" are therefore not one move each: Rock Throw 131 x15 = Eruption x12 + Seismic Toss x3; Strength 214 x6 = Seismic Toss; Thunderbolt 118 x12 = Shock Wave; Absorb 179 x8 = Wish heal x6 + Soft-Boiled x2; Mega Kick 140 x6 = Wish heal; Metronome 186 x6 + Swagger2 194 x2 = Torment.

### Ranked next steps (rows x moves x cost; cost is a guess, S = one commit, no new ROM window needed beyond the ones in `aud255/chain`)

| rank | step | rows | cost | why this order |
|---|---|---|---|---|
| 1 | **General-animation emitters** for `WISH_HEAL`, `FUTURE_SIGHT_HIT`, `FOCUS_BAND` in `emitGeneralAnimSounds` (table entries exist, ungated; one command-age constant each, fit from the 6 / 1 / 1 ROM windows already in the chain; the command must be a `general-animation` with that name, not checked) | 16 (21%) | S (3 branches + 3 pins; T1 test per animation) | no extractor work, three moves, and Wish alone is 12 rows |
| 2 | **Shock Wave** lifetimes (`AnimTask_ElectricChargingParticles`, `gGrowingShockWaveOrbSpriteTemplate`, `AnimTask_ShockWaveProgressingBolt` + the SE 118 pair the bolt task plays) | 18 (24%) | M (3 lifetimes + a task-internal SE with pans 21 / -21; 6 identical ROM windows to pin) | the biggest single move |
| 3 | **Eruption** emission truncation: why only the first `waitplaysewithpan` 178 is emitted though the table has all three ops | 13 (17%) | S-M (a debug of `liveMoveSourceAge` / `emitOpsAt` for the Eruption live source; may be a one-line bound; no table change) | ungated, so cheapest per row after step 1 |
| 4 | **Seismic Toss**: fix the `GetSeismicTossDamageLevel` branch to Medium for the L50 case (confirm damage = 50) + `AnimTask_MoveSeismicTossBg` lifetime | 9 (12%) | M (one branch rule + one bg-task lifetime, 3 ROM windows) | one branch + one task |
| 5 | **Torment** `AnimTask_TormentAttacker` (6 task-internal SE + lifetime) | 8 (11%) | M | per-row cost like Shock Wave |
| 6 | **Cosmic Power** `AnimTask_BlendNonAttackerPalettes` lifetime (a plain palette blend; the SE is a `SoundTask_PlaySE1WithPanning` task already modelled elsewhere: aud242c section 7) | 6 (8%) | S | one palette-blend lifetime, 6 identical windows |
| 7 | Soft-Boiled egg lifetime (2) and Sweet Kiss `gAngelSpriteTemplate` lifetime (1) | 3 (4%) | S each | tail |
| 8 | the 165 res17 window (205 x2 + 192): identify the animation first (ROM probe of the script pointer) | 3 (4%) | unknown (investigation S, port unknown) | cause not known |

Order by rows per cost: 1 (16 / S), 6 (6 / S), 3 (13 / S-M), 4, 2, 5, 7, 8. Steps 1 + 3 + 6 together would take the T2 ON ROM-only count from 76 to 41 with no extractor work beyond Cosmic Power. All steps 1-7 close 73 of 76; S11 still needs the census 0..999 clean in both scenes (this section is T2, 21 seeds).
Reproduce: `soundScoreboard.score_run` per `<seed>-on` with a print of the ROM-only opcodes (`detail`), then a `tl.json` lookup of `gCurrentMove` at the row frame (segment start + row offset); scratch script not committed.

## eru1 (2026-11-17): why only Eruption's first SE 178 is emitted on seed 6 (diagnosis only, no `src/` / `tests/` change; cause NOT yet found)

Result: **the cause is not in the table, `variantOf`, `emitOpsAt` or the live body length.** What was checked, all by reading plus one throwaway vitest (the existing `aud242r-eruption-player` fixture replayed through `collectSoundTick`, file deleted, nothing committed from it):
1. Table (`src/data/gen/anim-sound-timing.json`, move 284): every one of the 12 (turn, side) slots resolves, through `pic` grids 1 / 2 (`timing.picGrids`, variants 287..291) or the flat variants 288 / 291, to a **complete** 3-op list (178 @78, 178 @160..172, loop 131 x12 @238..262). No pic-Y class and no turn index (`variantOf`, `moveAnimSounds.ts:222`, turn >= 6 folds to 4 + (turn & 1), same variants) yields a shortened list, so a wrong variant / turn index is ruled out.
2. Emitter (`emitMoveAnimSounds`, `moveAnimSounds.ts:342-356`): it emits only while the presented command is the live move-animation command (`liveMoveSourceAge`, `battleResolutionPresentationRender.ts:1581`, which returns null when `liveMoveAnimationDuration(command.animation, field)` is null for the *current* command field), at `scriptRow = age - 1 - 7`; there is no clip at the body end, so a body that is long enough emits all ops.
3. Body length: replaying the `aud242r-eruption-player` Scene ON fixture (player Eruption, stage `aud242r-eruption-player-on`), the engine emits **all 14 rows** (178 @140, 222; 131 x12 @300..486), and its hit SE (13) follows the last 131 by 51 frames (537). On seed 6 the engine's own hit SE (14, 4939) is 397 frames after the first 178 (4542), the same 397 as the stage (140 -> 537). So the live body length of the seed-6 Eruption equals the stage's, long enough for ops up to script frame 441: the "body ends before the later ops" theory is **ruled out**.
4. The seed-6 chain (`.integration/evidence/aud255/chain/6-on.engine.json`): Eruption (284) is the 7th decision (commit frame 4422, player attacker: SE pan -64); the engine's SE list in 4400..5200 is only `[4542 se 178 -64]` and `[4939 se 14 63]`.

So the same code, same move, same timing emits 14 rows in the isolated stage and 1 in the seed-6 drive. The remaining differences are in the **state at the presented command**, not in the emission code: candidates, in the order to check: (a) `liveMoveSourceAge` returning null from the 2nd op on because `liveMoveAnimationDuration(command.animation, currentCommandField(state))` flips to null once the field changes mid-presentation (HP / status / Substitute / species of the target; the seed-6 target is a different species and HP than the stage's Lv 12 / species 69 setup); (b) `request.turn` / `request.rolloutCounter` values the stage never has (turn 6+ reaches `turnIndex` 4 / 5, rolloutCounter set from an earlier move); (c) the census drive's tick path (a tick that advances the presentation by more than one row would skip an exact-frame `scriptRow` match in `emitOpsAt`, `row.offset === base`; only the first op would survive if the later ops fall on skipped ticks); (d) a `hitMarker & NO_ANIMATIONS` toggle (`moveAnimSounds.ts:345`) once the first hit/resolve step runs.
Exact next step (S, ~10 minutes, no census): print in `emitMoveAnimSounds` (temporarily, not committed) `age`, `scriptRow`, `request.turn`, `request.rolloutCounter`, `liveMoveAnimationDuration(...) === null` and `phase` on every presenting tick of the seed-6 Eruption command, by replaying seed 6 to frame 4422 with the single-seed drive (`tools/compare` census driver, one seed, ~4500 frames); the first tick where the print goes missing or `null` names the cause. (c) is the cheapest to rule in or out first: compare the frame numbers of consecutive ticks in that window.
Other moves sharing it: not scanned. The "last op age vs `liveMoveAnimationDuration`" scan was dropped because the duration theory is ruled out; the other (b) rows (Wish, Future Sight, Focus Band) are a different, already-named cause (no `emitGeneralAnimSounds` branch), and Eruption is the only move whose ungated complete entry emits only its first op in the ROM comparison (t2cls). Ranked step 3 of t2cls stays valid but its cost is S-M, not "a one-line bound".

## eru2 (2026-11-17): the seed-6 Eruption "only first SE" row is a stale artifact, not an engine bug (diagnosis only, no `src/` / `tests/` change)

Result: **none of eru1's four candidates (a)-(d) is the cause, and there is nothing to fix in `src/`.** The aud255 `6-on.engine.json` was produced on `57bb082ac` (2026-11-17 01:11 UTC, the aud255 tested tree; file mtime 01:11:58), and on that tree the table's Eruption entry (move 284) was a **single op**, `waitplaysewithpan 178 @78` (`src/data/gen/anim-sound-timing.json`, variant 284 at `57bb082ac`, variant 286 at `2a162d6b2~1`). `2a162d6b2` ("aud242r: Eruption timed", 01:31 UTC, 20 minutes after the aud255 tree) replaced it with the 3-op, pic-Y dependent variants 288 / 291 (178 @78, 178 @160/169, loop 131 x12 @238/256). eru1 read the HEAD table (complete) and compared it with the pre-timing evidence, so the two never matched; the "same code, same move, same timing" premise of eru1 was wrong, the timing was not the same.

Measured (throwaway `console.error` in `emitMoveAnimSounds`, reverted before this commit; engine-only replay on HEAD `92215dd13`, no ROM, 4 s: `node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts replay --seed=6 --scene=on --setup=.integration/evidence/aud255/chain/6-on.setup.json --out=/tmp/x.engine.json`). One Eruption command (segment 0, command 1, attacker player), 479 consecutive presenting ticks, `phaseElapsed` 0..478:
- (a) `liveMoveSourceAge` never null (`srcNull` false on every tick; age -3 .. 475, scriptRow -11 .. 467): ruled out.
- (b) `request.turn` = 0, `rolloutCounter` undefined: slot 0, the same variant family as the stage; ruled out.
- (c) every consecutive tick pair steps `phaseElapsed` by exactly 1 (step set {1}), so no `row.offset === base` match is skipped: ruled out.
- (d) `hitMarker & NO_ANIMATIONS` false on every tick: ruled out.
Engine SEs in 4400..5200 on HEAD: `178 @4542, 178 @4624, 131 x12 @4702, 4718, 4735, ..., 4888 (pan 63), 14 @4939`, i.e. all 14 rows (first 178 -> hit SE 397 frames, same as the stage); the HEAD replay's sound list has 318 rows vs 305 in the evidence file, and the first difference is exactly this window (index 82).

Consequence: the t2cls "Eruption: ungated complete entry emits only its first op" row and its ranked step 3 ("emitter bound") are closed as **stale evidence**; the cause class for those 13 ROM-only rows is "table entry not yet timed when aud255 ran". Not measured here (no ROM): whether the 14 engine rows now line up with the ROM rows frame for frame (aud242r's Eruption window was +2 flat on the stage, `2a162d6b2`). Same staleness risk for any other aud255-based t2cls row whose move was timed after `57bb082ac` (`git log --since='2026-11-17 01:11' -- src/data/gen/anim-sound-timing.json`: Heal Bell `896763bb6`, Spike Cannon `41e12c418`, Eruption `2a162d6b2`, Moonlight `3a1901d33`, Curse `161c1958c`): a scan of the t2cls rows for those moves was not done. Next step (S): a T2 re-run of seed 6 ON on HEAD (`tools/audio/aud248RunSeed.sh 6 on <outdir>`, needs the ROM oracle, ~2 min) plus the other seeds with Heal Bell / Spike Cannon / Moonlight / Curse rows, then `soundScoreboard.py`, before ranking any more t2cls steps.

## aud256 (2026-11-17, ON re-run on HEAD): Scene ON T2 on `ce04ab20e` (measurement only, no `src/` / `tests/` change)

Tested tree: `ce04ab20e` (includes aud242q / aud242r / t1dt and the Heal Bell, Spike Cannon, Eruption, Moonlight, Curse timings that aud255's `57bb082ac` lacked). Scene ON seeds only (the ROM ON oracle half); OFF was not re-run. Evidence (ignored dir): `.integration/evidence/aud256/` = `chain/<seed>-on.*`, `chain/summary.log`, `jobs.txt`, `scoreboard.{txt,json}`. Commands: the aud255 ON job list, `xargs -P 4`, `nice -n 10 tools/audio/aud248RunSeed.sh SEED on .integration/evidence/aud256/chain`, then `python3 tools/audio/soundScoreboard.py .integration/evidence/aud256/chain --out .integration/evidence/aud256/scoreboard.json`.

**All 21 seeds finished** (the two slowest, 5063 and 8108, completed their ROM sound pass late; the first table pass over 19 seeds read 57 missing, the final 21-seed pass reads 63). 0 chain FAIL, every `summary.log` row `engineError null`, `frozenTimelineEqualsDrive true`, `divergence null`, all 21 aligned to battle end.

### ON family table, aud255 -> aud256 (21 seeds both)

| family | exact+offset | missing | extra |
|---|---|---|---|
| move-animation SE | 3915 -> 3928 | 76 -> **63** | 0 -> 0 |
| stat-change SE | 85 -> 85 | 0 -> 0 | 0 -> 0 |
| cries | 171 -> 171 | 0 -> 0 | 0 -> 0 |
| battle-controller SE | 643 -> 643 | 0 -> 0 | 0 -> 0 |
| BGM | 5 -> 5 | 0 -> 0 | 0 -> 0 |
| fanfare / screen SE | 0 | 0 | 0 |

Exact / offset split: move-animation 287 exact / 3641 offset (aud255 total 3915), stat 13 / 72, cry 4 / 167, controller 66 / 577, bgm 0 / 5. Matched-row delta (engine minus ROM): move-animation median -2 (p10 -20, p90 +6), controller -5: same character as aud255. **0 engine-only rows.**

### Remaining ROM-only rows (63) by move, with the t2cls class

63 = aud255's 76 minus Eruption (13, now matched: the missing 178 / 131 rows are gone; eru2's "stale evidence" conclusion is confirmed by the ROM run). Cosmic Power (8108) still has its 6 rows. Every other t2cls row reproduces with the same ids and counts, so no other t2cls class changed.

| move | seeds | ROM-only ids | rows | t2cls class |
|---|---|---|---|---|
| Shock Wave | 5569 | 118 x12, 221 x6 | 18 | (a) 3 blockers |
| Wish heal | 3738 | 140 x6, 179 x6 | 12 | (b) no `WISH_HEAL` emitter |
| Seismic Toss | 2, 2741 | 214 x6, 131 x3 | 9 | (a) + (c) |
| Torment | 165 | 186 x6, 194 x2 | 8 | (a) |
| Future Sight hit | 6079 | 189, 184 x2 | 3 | (b) |
| unresolved (res17 window) | 165 | 205 x2, 192 | 3 | (e) |
| Soft-Boiled | 1028 | 179 x2 | 2 | (a) |
| Cosmic Power | 8108 | 228 x6 | 6 | (a) |
| Sweet Kiss | 830 | 226 | 1 | (a) |
| Focus Band | 4235 | 171 | 1 | (b) |

Class totals: (a) 44 (Shock Wave 18, Seismic Toss 9 incl. its (c) branch, Torment 8, Cosmic Power 6, Soft-Boiled 2, Sweet Kiss 1), (b) 16, (e) 3; 44 + 16 + 3 = 63 = the t2cls 76 minus the 13 Eruption rows. The other moves timed after `57bb082ac` (Heal Bell, Spike Cannon, Moonlight, Curse) had no ROM-only row in aud255 and have none now, so that part of eru2's "scan not done" caveat is closed for these 19 seeds.

Next: the ranked steps of t2cls stand with rank 3 (Eruption) removed; rank 1 (the three general-animation emitters, 16 rows) is now the largest ungated-table item after Shock Wave (18). Not measured here: Scene OFF (aud255: 0 / 0 on 20 seeds), the census.

## aud257: Cosmic Power, Sweet Kiss, and why the general-animation emitters are blocked (2026-11-17)

Tested tree: base `e06cac9fc`, code commits `c4a6deb32` (Cosmic Power) and `b3a5d1a44` (Sweet Kiss). Scene ON only. Evidence (ignored dir): `.integration/evidence/aud257/` = `chain/` (the 6 re-run seeds 8108 1028 3738 6079 4235 830 plus the other 15 aud256 ON runs copied unchanged), `scoreboard.{txt,json}`, `census/`, `diff/`. Commands: `nice -n 10 tools/audio/aud248RunSeed.sh SEED on .integration/evidence/aud257/chain` (two at a time), `python3 tools/audio/soundScoreboard.py .integration/evidence/aud257/chain --out .integration/evidence/aud257/scoreboard.json`.

| family | matched (exact + offset) | ROM-only | engine-only |
|---|---|---|---|
| move-animation SE | 3928 -> 3935 | 63 -> **56** | 0 -> 0 |
| stat-change SE / cries / battle-controller SE / BGM / fanfare / screen SE | unchanged | 0 -> 0 | 0 -> 0 |

Exact / offset: 287 / 3641 -> 287 / 3648 (every newly matched row is an offset row). Matched-row delta (engine minus ROM) of the seven new rows: SE 228 (Cosmic Power) +5 x5 and +16 x1, SE 226 (Sweet Kiss) -12. Per-id multisets of every other id are identical to aud256.

Removed ROM-only rows: Cosmic Power 228 x6 (seed 8108) and Sweet Kiss 226 x1 (seed 830). Seed 1028 (Soft-Boiled 179 x2) is unchanged: the egg lifetime is not ported. The result is 63 -> 56, not the 41 the step aimed at, because part (1) below was not done (16 rows).

### Part (1): WISH_HEAL / FUTURE_SIGHT_HIT / FOCUS_BAND are NOT `general-animation` commands

The brief's first check ("do they play as `general-animation` commands, and how does command age map to script row") fails. `general-animation` presentation commands exist only for FOCUS_PUNCH_SETUP, HELD_ITEM_EFFECT, LEECH_SEED_DRAIN, CASTFORM_CHANGE and the weather-continues family (`src/engine/battleResolutionPresentation.ts`). Wish heal, Future Sight / Doom Desire hit and Focus Band produce a message or hp command only, no command with a live clock. In seed 3738's Wish resolution (res4) the engine segment is 894 frames against the ROM's 1119, and nothing in it carries an age that could index the General_WishHeal script rows; an emitter would have to be keyed to a message frame by fit, which aud250 rejected. Giving these animations a real presentation command (with a duration) changes segment lengths and frame hashes, like hie1 / hie2 did for HELD_ITEM_EFFECT, so it is outside this sound-only step. No emitter was added. The question "why is the table's second 184 one frame earlier than the ROM's" was not investigated.

Remaining (56): Shock Wave 18, Wish heal 12, Seismic Toss 9, Torment 8, Future Sight hit 3, unresolved (res17 window) 3, Soft-Boiled 2, Focus Band 1. Class totals: (a) 37 (Shock Wave 18, Seismic Toss 9, Torment 8, Soft-Boiled 2), (b) 16 (blocked as above), (e) 3.

### Census and sound-only proof

T1 census (seeds 0..99 Scene ON, `soundCensusDelta.py --t1`, each arm scored inside its own tree, trees deleted; base arm `on-e06cac9fc`, final arm `on-b3a5d1a44`): exact 26,057 -> **26,060**, missing-gated 38 -> 38, missing-other 54 -> **51** (the three "inside the command" rows were Cosmic Power's SE 228, classified missing-other on this arm; with them the gated-class total was 41 -> 38), missing-declined 1, extra 0, unclassified 0. Arm-vs-arm: 99 / 100 seeds identical, seed 86 gains three SE 228 (-64) rows (272 -> 275 events). Sweet Kiss is not in the least-used-move census, so it shows no row there. `rst197CensusDelta.py`: 100 / 100 battles, 31,470 commands identical, `eventsDigest` identical, bad 0.

Frame hashes: `npm run compare:differential -- <Cosmic Power player trace, Sweet Kiss player trace (stage aud257-sweetkiss-player-on)> --base e06cac9fc --harness-from-head --summary --capture-range 0:900`: 1724 / 1724 captures byte-identical (823 + 901).

## aud258: Seismic Toss, Torment, Shock Wave (2026-11-17, Scene ON T2 + T1 census)

Table ports (docs/aud242-move-anim-sounds.md section 24): Seismic Toss (damage-level branch + bg task exact 119), Torment (`AnimTask_TormentAttacker`, lifetime 128 + six SE 186 rows), Shock Wave (charging particles 49, orb 61, progressing bolt simulated on the attacker pic Y, SE 118 pair with runtime pans, SE 221). L50 emitted / gated 807 / 51 -> 821 / 47; all-moves resolved ops 1034 -> 1048.

### T2 (Scene ON, 21 aligned seeds, aud257's 17 runs plus 5569 / 2 / 2741 / 165 re-run on the final tree)

| Family | exact | offset | missing | extra |
| --- | --- | --- | --- | --- |
| move-animation SE (aud257) | 287 | 3648 | 56 | 0 |
| move-animation SE (aud258) | **308** | **3662** | **21** | 0 |

Stat-change, cry, battle-controller, bgm, fanfare and screen rows are unchanged (13 / 72 / 0, 4 / 167 / 0, 66 / 577 / 0, 0 / 5 / 0). The 35 rows that left "missing" are all matched; the matched-row frame delta (engine - ROM, relative to the segment start) of the new rows:

| SE | rows | delta |
| --- | --- | --- |
| 118 (Shock Wave bolt, pans -22 / 20) | 12 | 0 on all 12 |
| 221 (Shock Wave) | 6 | 0 on all 6 |
| 186 (Torment) | 6 | -9 on all 6 |
| 194 (Torment) | 2 | -9 on both |
| 214 (Seismic Toss) | 6 | 0 x2, -10 x2, -12 x2 |
| 131 (Seismic Toss) | 3 | 0, -10, -12 |

Matched-row median / p10 / p90 for move-animation SE: -2 / -20 / 6 (3935 -> 3970 rows). Remaining 21 ROM-only move-animation rows: SE 179 x8 (Soft Boiled / the egg wait), 140 x6, 205 x2 and 192 (the res17 window), 184 x2, 171, 189.

### T1 census and sound-only proof

T1 census (seeds 0..99 Scene ON, `soundCensusDelta.py --t1`, each arm scored inside its own tree with `reference/` linked in, trees deleted; base `9feafd881`, final `3b365acc2`): exact 26,060 -> **26,079**, missing-gated 38 -> **33**, missing-other 51, missing-declined 1, extra 0, unclassified 0. Arm-vs-arm: 98 / 100 seeds identical; seed 27 gains the Shock Wave SE 118 x2 / 221 rows (446 -> 449 events) and seed 67 the Torment rows (360 -> 376). `rst197CensusDelta.py`: 100 / 100 battles, 31,470 commands identical, `eventsDigest` identical, bad 0.

Frame hashes: `npm run compare:differential -- <Torment, Shock Wave, Seismic Toss Medium player traces (the aud258 fixtures' traces, captureFrames 0..900)> --base 9feafd881 --harness-from-head --summary --capture-range 0:900`: 2469 / 2469 captures byte-identical (3 x 823).

## aud259: Soft-Boiled, Block, Dynamic Punch, Fake Out, Crabhammer (2026-11-17, Scene ON T2 + T1 census)

Table ports (docs/aud242-move-anim-sounds.md section 25): Soft Boiled's egg lifetime, Move_BLOCK's X sprite, Dynamic Punch's `waitsound` (exact from the m4a tick loop), Fake Out (`AnimTask_FakeOut` 15), Crabhammer (hit splat animation 0). L50 emitted / gated 821 / 47 -> **832 / 39**; all-moves resolved ops 1048 -> **1059**.

### T2 (Scene ON, the same 21 aligned seeds; 1028 and 165 re-run on the new tree, the other 19 engine replays re-run on the final head, ROM sound passes unchanged)

| Family | exact | offset | missing | extra |
| --- | --- | --- | --- | --- |
| move-animation SE (aud258) | 308 | 3662 | 21 | 0 |
| move-animation SE (aud259) | 308 | **3667** | **16** | 0 |

Stat-change, cry, battle-controller, bgm, fanfare and screen rows are unchanged (13 / 72 / 0, 4 / 167 / 0, 66 / 577 / 0, 0 / 5 / 0). The five rows that left "missing" are SE 179 x2 (Soft Boiled), 205 x2 and 192 (Block); all matched with `extra` 0 and the engine-only count staying 0. None of the 19 other seeds' engine replays changed. Remaining 16 ROM-only rows: SE 140 x6, 179 x6, 184 x2, 171, 189.

### T1 census and sound-only proof

T1 census (seeds 0..99 Scene ON, `soundCensusDelta.py --t1`, each arm scored inside its own tree with `reference/` linked in, trees deleted; base `1ab7ddd6b`, final `4fa0e8bea`): exact 26,079 -> **26,100**, missing-gated 33 -> **15**, missing-other 51 -> 53 (Dynamic Punch's fifth SE 177 x2: "after the command's last presenting frame"), missing-declined 1, extra 0, unclassified 0. Remaining gated: Memento 4, Air Cutter 4, Recycle 2, Glare 2, Brick Break 2, Will-O-Wisp 1. Arm-vs-arm: 91 / 100 seeds identical, 9 gain rows (added only). `rst197CensusDelta.py`: 100 / 100 battles, 31,470 commands identical, `eventsDigest` identical, bad 0.

Frame hashes: `npm run compare:differential -- turn5-switchin turn13-dragonbreath-faint --base 1ab7ddd6b --harness-from-head`: 382 / 382 captures byte-identical (141 + 241).

Gates: `typecheck` 0, `test:gate` 362 files / 2843 tests green, the 47 `aud24x` / `aud25x` / `audioProbeFixtures` files green, `build` and `build:lib` 0.

## aud260: Brick Break turn 2, Glare, Will-O-Wisp, Recycle, Air Cutter, move-animation sound-only tail (2026-11-17, T1 census 0..999)

Table ports and the tail mechanism (docs/aud242-move-anim-sounds.md section 26). L50 emitted / gated 832 / 39 -> **839 / 35**. Each new row has a ROM window (`tools/audio/fixtures/aud260-*.json`) and a Tier-1 pin (`tests/aud260MoveAnimSounds.test.ts`); ROM minus ours: Brick Break turn 2 +2, Glare +2, Will-O-Wisp +1 (both attacker sides), Recycle -4, Air Cutter 0 (both sides); each constant over its window (the #198 class). Memento (4 gated rows in 0..99) is deferred (section 26.1).

### T1 census 0..99 Scene ON (each arm scored inside its own tree with `reference/` linked in; base `e0f64e82f`, final `76ae8fd0d`)

| | exact | missing-gated | missing-other | missing-declined | extra | unclassified |
| --- | --- | --- | --- | --- | --- | --- |
| base `e0f64e82f` | 26,100 | 15 | 53 | 1 | 0 | 0 |
| final `76ae8fd0d` | **26,176** | **4** | **0** | 1 | 0 | 0 |

The 11 gated rows that closed are Brick Break 2, Glare 2, Recycle 2, Will-O-Wisp 1 and Air Cutter 4 (each Air Cutter command now scores its 4 rows exact: +16); the 4 left are Memento. The 53 "after the command's last presenting frame" rows are the sound-only tail (Signal Beam / Mud Shot `panse` sweeps 51, Dynamic Punch's fifth SE 177 x2): now emitted and scored exact (53 tail rows). Arm-vs-arm (`soundCensusDelta.py`): 87 / 100 seeds identical, 13 gain rows, added only (no row removed or moved).

### T1 census 0..999 (final `76ae8fd0d`, 10 shards x 4 parts per scene, `LSD194_CENSUS_JOBS=4 LSD194_SPLIT=4`)

| Scene | move-animation commands | exact | known-offset | missing-gated | missing-declined | missing-other | extra | unclassified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ON | 41,331 | **268,952** | 1 | **467** | 5 | 1 | 0 | 0 |
| OFF | 47,199 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Scene OFF has `HITMARKER_NO_ANIMATIONS` on every command, so no move-animation row is expected or emitted (the non-move families score 4,621 exact, 0 missing / extra there; ON: 118,656 exact, 0 missing / extra, 439 move tail rows + 1,088 status tail rows claimed). The ON arm's one known-offset / one missing-other row are both Seismic Toss seed 567 (+2, SE 214 pan -63). Gated rows by the table's `ends` reason: `end` 440, `unresolved-branch` 27.

Top-20 remaining missing rows, Scene ON (all `missing-gated`, 464 of the 467; the other 3 are on moves ranked below Gust; the OFF scene has none): Extreme Speed 116, Milk Drink 60, Pain Split 58, Flame Wheel 35, Swallow 35, Octazooka 26, Magnitude 23, Razor Wind 22, Rapid Spin 20, Covet 14, Aromatherapy 9, Water Spout 8, Needle Arm 8, Smelling Salt 8, Memento 6, Spider Web 5, Present 4, Refresh 4, Zap Cannon 2, Gust 1. Missing-declined: Rock Smash 2, Beat Up 2, Withdraw 1. Non-move families: no missing rows.

### Sound-only proof

`rst197CensusDelta.py` (0..99 Scene ON, `e0f64e82f` vs final): 100 / 100 battles, 31,470 commands identical, bad 0. `npm run compare:differential -- <Air Cutter, Glare, Will-O-Wisp, Brick Break, Recycle player traces (the aud260 fixtures' traces, captureFrames 0..end)> --base e0f64e82f --harness-from-head --summary`: 6,154 / 6,154 captures byte-identical (822 x 3 + 1844 x 2).

Gates: `typecheck` 0, `test:gate` 362 files / 2843 tests green, the 51 `aud24x` / `aud25x` / `aud260` / `audioProbeFixtures` files (1600 tests, 18 skipped) green, `build` and `build:lib` 0.

## aud261: T1 0..999 missing-gated tail, 14 moves (2026-11-17)

Lifetimes, per-window ROM-minus-ours offsets, named residuals and the deferred moves: docs/aud242-move-anim-sounds.md section 27. Base `276aff82b` (aud260), final = the aud261 head (`381accfa0` for the census arm). L50 emitted / gated (`factory-animation-inventory.json` level50 moves, turn 0, player attacker) 839 / 35 -> **862 / 12**.

Moves landed (each with both attacker sides' ROM windows and Tier-1 pins; ROM minus ours): Extreme Speed 0, Milk Drink -2, Pain Split -4, Flame Wheel +2, Swallow -4 (player), Octazooka +2, Zap Cannon +2 / +3 / +3 (named +1 across the wait), Razor Wind -10 (charge) / +1 / +14 (unleash, player / opponent), Covet +2, Needle Arm +3, Aromatherapy and Refresh (rows after the StatusCleared task +4, named), Smelling Salt +4, Gust +1, Spider Web -3.

### T1 census 0..999 Scene ON (`LSD194_CENSUS_JOBS=3 LSD194_SPLIT=4`, 10 shards, `soundCensusDelta.py --t1`)

exact 269,486, known-offset 1, **missing-gated 467 -> 64**, missing-declined 5, missing-other 1, extra 0, unclassified 0. The known-offset / missing-other rows are the same Seismic Toss seed 567 as in aud260. Gated rows by the table's `ends` reason: `end` 37, `unresolved-branch` 27. Non-move families unchanged (118,656 exact; the 398 extras are the Focus Band / Future Sight / Wish Heal commands of the parallel wsh2 step).

Remaining missing-gated (64): Magnitude 23, Rapid Spin 20, Water Spout 8, Memento 6, Present 4, Odor Sleuth 1, False Swipe 1, Pay Day 1. Magnitude, Water Spout, Present need a power / HP variant dimension, Rapid Spin an elevation dimension, Memento a per-species height grid (section 27.1).

### Sound-only proof

`rst197CensusDelta.py` (0..99 Scene ON, `276aff82b` vs final): 100 / 100 battles, 31,487 commands identical, bad 0. `npm run compare:differential -- <Smelling Salt player, Spider Web opponent, Gust player traces (the aud261 fixtures' traces)> --base 276aff82b --harness-from-head --capture-range 60:260`: 603 / 603 captures byte-identical.

Gates: `typecheck` 0, `test:gate` 362 files / 2843 tests green, the 49 `aud24x` / `aud25x` / `aud26x` / `moveAnimSounds` / `tickSounds` / `audioProbeFixtures` files (1775 tests, 18 skipped) green, `build` and `build:lib` 0.

## aud262: T1 0..999 missing-gated tail closed (2026-11-17)

Dimensions, lifetimes, per-window ROM-minus-ours offsets and named residuals: docs/aud242-move-anim-sounds.md section 28. Base `3d0c7ad41`, census arm `ac48debb7` (the final head `8500d4eaf` only adds narrowing / unused-helper typecheck fixes with no runtime change). L50 emitted / gated (`factory-animation-inventory.json` level50 moves, turn 0, player attacker) 862 / 12 -> **878 / 0**.

Moves landed (ROM minus ours): Magnitude +3, Rapid Spin +2 (four elevation classes), Water Spout +11 / +7 / +7 / +2 by HP quarter (+2 Snorlax target and opponent), Memento -108 (constant lead, gaps equal), Present +1 (damage) / +2 (heal), Odor Sleuth -4, False Swipe 0, Pay Day +2, Luster Purge +2 (player) / +5 (opponent).

### T1 census 0..999 Scene ON (`LSD194_CENSUS_JOBS=3 LSD194_SPLIT=4`, 10 shards, `soundCensusDelta.py --t1`)

exact 269,801 (269,486 + 315), known-offset 1 -> 0, **missing-gated 64 -> 0**, missing-declined 5, missing-other 1 -> 0, extra 0, unclassified 0. The Seismic Toss seed 567 known-offset / missing-other pair was a scorer limit (Weak branch on a target below 33 HP scored against the Medium reference), fixed in the census tooling (section 28.1); the 5 declined rows are Rock Smash 2, Beat Up 2, Withdraw 1 (no live presentation adapter). Non-move families unchanged (118,656 exact; 398 extras = the wsh2 step's Focus Band / Future Sight / Wish Heal commands). Two battles (seeds 796, 995) end in `frame budget` in both arms, with identical digests and commands.

### Sound-only proof

`rst197CensusDelta.py` (0..99 Scene ON, `3d0c7ad41` vs `ac48debb7`): 100 / 100 battles, 31,487 commands identical, bad 0. Arm-vs-arm sound delta: 4 seeds change, all by added SE 189 rows. `npm run compare:differential -- <Magnitude, Memento, Luster Purge player traces (the aud262 fixtures' traces)> --base 3d0c7ad41 --harness-from-head --capture-range 60:260`: 603 / 603 captures byte-identical.

Gates: `typecheck` 0, `test:gate` 362 files / 2843 tests green, the 50 `aud24x` / `aud25x` / `aud26x` / `moveAnimSounds` / `tickSounds` / `audioProbeFixtures` files (1944 tests, 18 skipped) green, `build` and `build:lib` 0.

## aud263: S11 acceptance table (T1 0..999) (2026-11-17)

Base `3d8026f20` (aud262). Tooling commits `d8e807b20` (census rules) and `f6edfc6b9` (`--t1` prints the families it has no table for + Tier-1 pin `tests/aud263CensusGeneralRows.test.ts`); no `src/` file changed. Census arms: `LSD194_CENSUS_JOBS=3 LSD194_SPLIT=4 sh tools/integration/lsd194Census.sh <fresh-root> HEAD:on HEAD:off` at `d8e807b20` (the later commit only touches the scorer's printout, not the engine or the census), scored with `soundCensusDelta.py --t1`, `tree/` dirs deleted after scoring.

### 1. The 398 extras (wsh1 General_* streams)

`soundCensusExpected.ts --nonmove` now resolves `WISH_HEAL`, `FUTURE_SIGHT_HIT`, `FOCUS_BAND` general-animation commands from the aud242 table (`General_WishHeal` variant 424, `General_FutureSightHit` 421, `General_FocusBand` 419) with the command's battler as attacker, through the same `moveAnimOpRows` walk as every other family; the rows are not copied from engine emission.

| Family | commands | emitted | exact | extra | missing | lead (first row - table frame 0) |
| --- | --- | --- | --- | --- | --- | --- |
| Focus Band | 45 | 45 | 45 | 0 | 0 | 0 (table age 0, `FOCUS_BAND_SCRIPT_AGE` 0) |
| Future Sight hit | 39 | 117 | 117 | 0 | 0 | 0 (`FUTURE_SIGHT_HIT_SCRIPT_AGE` 0) |
| Wish heal | 118 | 236 | 236 | 0 | 0 | 6 (`WISH_HEAL_SCRIPT_AGE` 6) |

**398 extras -> 0**; non-move exact 118,656 -> **119,054** (+398), known-offset 0, missing 0, unclassified 0 (Scene ON; Scene OFF skips the whole stream under `HITMARKER_NO_ANIMATIONS`, 4,621 exact unchanged). The leads equal the engine's command-age constants independently (they come from the command start, the table gives the offsets), so a wrong age would show as a `known-offset`, not as exact.

### 2. T1 census 0..999, both scenes (`d8e807b20`, 10 shards x 4 parts, 1000 / 1000 seeds each)

Move-animation commands (the aud242 table classes):

| Scene | move-animation commands | exact | known-offset | missing-gated | missing-declined | missing-cry-task | missing-other | extra | unclassified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ON | 41,331 | **269,801** | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| OFF | 47,402 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

(ON: 27,103 live, 14,225 action-transition pauses with no body by design, 3 declined; 927 optional Double Team rows and 477 tail rows counted exact. OFF: all 47,402 commands carry `HITMARKER_NO_ANIMATIONS`, so no move row is expected or emitted.)

Non-move families (`t1cls`, per command window against the table's general / status variant):

| Family | ON commands | ON emitted = exact | OFF commands | OFF emitted = exact | offset / extra / missing |
| --- | --- | --- | --- | --- | --- |
| status animations (PSN, CONFUSION, BRN, INFATUATION, SLP, PRZ, FRZ, CURSED, NIGHTMARE) | 8,005 | 27,083 | 0 | 0 | 0 / 0 / 0 |
| weather continues (RAIN, SUN, SANDSTORM, HAIL) | 2,058 | 60,270 | 0 | 0 | 0 / 0 / 0 |
| HELD_ITEM_EFFECT | 4,636 | 23,180 | 0 | 0 | 0 / 0 / 0 |
| LEECH_SEED_DRAIN | 434 | 4,340 | 0 | 0 | 0 / 0 / 0 (6 not animated) |
| FOCUS_PUNCH_SETUP | 71 | 71 | 0 | 0 | 0 / 0 / 0 (17 not animated) |
| CASTFORM_CHANGE | 12 | 24 | 12 | 24 | 0 / 0 / 0 |
| Wish heal / Future Sight hit / Focus Band (new) | 202 | 398 | 0 | 0 | 0 / 0 / 0 |
| stats-change | 3,688 | 3,688 | 4,597 | 4,597 | 0 / 0 / 0 |
| **non-move total** | | **119,054** | | **4,621** | exact / known-offset / missing / extra / unclassified: 119,054 / 0 / 0 / 0 / 0 (ON), 4,621 / 0 / 0 / 0 / 0 (OFF) |

Families T1 has no table for (`soundCensusDelta.py --t1` now prints their counts; a count is not a score, T2 is their scorer):

| Family | ON | OFF |
| --- | --- | --- |
| battle-controller SE (ids 5, 12-16, 90, 114-116) | 58,884 | 58,949 |
| cries (modes 0 / 5 / 7 / 8 / 11 / 4 / 6 / 3) | 10,352 | 9,972 (modes 0 / 5 / 11) |
| BGM start (412 x 441, 354 x 3) / duck (476, 471) / stop (90, stop-all) | 444 / 20,309 / 1,204 | 444 / 19,939 / 1,177 |
| fanfare, screen SE | 0 | 0 |

Classes per scene, all families: exact 269,801 + 119,054 = 388,855 (ON), 4,621 (OFF); known-offset 0 / 0; missing 5 (declined) / 0; extra 0 / 0; unclassified 0 / 0. The only non-zero residual in either scene is the 5 declined rows.

Frame-budget seeds: 796 and 995 end in `Error: frame budget` in **both** scenes (ON 3,643 / 3,311 commands, OFF 4,724 / 4,824; same census error text in the aud262 arm, so not new). Their commands are scored like any other seed: no missing / extra / unclassified row in either; the sound rows stop where the battle's frame budget does, so a battle-end tail (fanfare / bgm after the last command) is not expected for them.

### 3. The 5 declined rows: Rock Smash 2, Beat Up 2, Withdraw 1 (finding, no code)

Seeds 51 (Withdraw), 492 (Rock Smash), 835 (Beat Up), all Scene ON.

- **Do they animate in Scene ON live play today?** No. `liveMoveAnimationDuration` (`src/engine/liveMoveAnimation.ts`) has no `case` for MOVE_WITHDRAW (110), MOVE_ROCK_SMASH (249), MOVE_BEAT_UP (251), so `liveMovePlayback.ts` classes the command `static:other:no-adapter-unscripted`: a `SCENE_OFF_MOVE_PAUSE_FRAMES` (32) placeholder pause on the static field, no sprites, no tasks, no body clock. `liveMoveUniversalRows` give the pre / post rows 0, and `liveMoveSourceAge` returns null, so `emitMoveAnimSounds` never runs. In the ROM all three run a script (Rock Smash: the fist hit plus `gRockFragmentSpriteTemplate` fragments and a shake; Beat Up: a two-hit fist script (the table's two SE 123 rows); Withdraw: `AnimTask_Withdraw` shell-in squash). In `src/animation/` none of `gRockFragmentSpriteTemplate`, `AnimTask_Withdraw`, nor a Beat Up script exists, and the three moves are absent from `ANIMATION_COVERAGE.json` (276 entries). `docs/gate6-coverage-manifest.md` lists Rock Smash and Beat Up as not-in-level50-roster and Withdraw as level50-roster-only, so Withdraw is the only one the Factory's level-50 pool can ever reach (and it did, once, in 1000 seeds).
- **What is missing, per move.** Rock Smash: the adapter (a `liveMoveAnimationDuration` case, the fragment sprite template, the screen shake) and the Fighting-type fist hit of its script. Beat Up: the adapter and the two-hit fist script's sprites / tasks. Withdraw: the adapter and the shell task (`AnimTask_Withdraw`) with its Scene ON attacker-mon squash. No variant / branch is missing in the table: the aud242 table does carry rows for all three (Withdraw SE 162 @0 pan -64; Rock Smash SE 123 @15, SE 131 @26 pan 63; Beat Up SE 123 @9 and @19 pan 63, player attacker; the opponent attacker's pans flip), each `ends: end`, `gated: 0` for all 12 turn / side slots.
- **Could the SEs be emitted from the table without an adapter?** Mechanically yes (the aud260 tail mechanism schedules rows past a command's last frame, and the 32-frame placeholder is a command), but it is **not source-proven**, so no code: (1) no ROM window exists for the three moves (`tools/audio/fixtures` has no Withdraw / Rock Smash / Beat Up window; the aud242 table rows come from the script text alone), so the ROM-minus-ours offset and the command-age constant that every landed move carries are unknown; (2) Rock Smash's second row (frame 26 + the 8-frame lead = 34, past the 32-frame placeholder) and every row's age depend on the body the adapter would define, so a sound-only guess would pin a clock nothing in the engine owns; (3) sounds over a silent static field would be a presentation the ROM never shows. Doing it needs the adapter first (presentation, hpd4's lane) and then a ROM window per move; the table side is already finished.

### 4. T2 (41 ROM seeds, rescored on `f6edfc6b9`)

`aud248RunSeed.sh` / `aud249Rescore.sh` / `soundScoreboard.py` on the existing ROM passes (aud259 ON, aud255 OFF); the ROM files depend only on engine decisions, and this step changed no engine behaviour, so rescoring is exact. Evidence: `.integration/evidence/aud263/t2*` (ignored).

| Scene | seeds | family | exact | offset | missing | extra |
| --- | --- | --- | --- | --- | --- | --- |
| ON | 21 | move-animation SE | 308 | 3,683 | 0 | 0 |
| | | stat-change SE | 13 | 72 | 0 | 0 |
| | | cry | 4 | 167 | 0 | 0 |
| | | battle-controller SE | 66 | 577 | 0 | 0 |
| | | bgm | 0 | 5 | 0 | 0 |
| | | fanfare, screen SE | 0 | 0 | 0 | 0 |
| OFF | 20 | move-animation SE | 0 | 0 | 0 | 0 |
| | | stat-change SE | 16 | 73 | 0 | 0 |
| | | cry | 2 | 159 | 0 | 0 |
| | | battle-controller SE | 22 | 695 | 0 | 0 |
| | | bgm | 0 | 4 | 0 | 0 |
| | | fanfare, screen SE | 0 | 0 | 0 | 0 |

**0 missing and 0 extra rows in all 41 seeds, both scenes**; no differing (kind, id, pan) row. Every matched row is present in order with the right id / pan; the frame is not always equal ("offset" = matched with a different frame). Engine minus ROM, relative to the segment start (median / p10 / p90): ON move-animation SE -2 / -20 / +7 (n 3,991), battle-controller -5 / -28 / +2 (643), stat-change -1 / -19 / +4 (85), cry -10 / -28 / +7 (171), bgm -23 / -71 / +9 (5); OFF controller -3 / -13 / +8 (717), stat-change +2 / -7 / +11 (89), cry -7 / -17 / +15 (161), bgm +12 / -19 / +22 (4). The named per-window constants are in sections 21-28 of docs/aud242-move-anim-sounds.md and the aud252-aud262 sections above.

### 5. Audio RAM probes byte-pinned: the receipts and their result

The S11 pass rule ("both players' audio-RAM probes (`issue55-m4a-*`) stay byte-pinned") names these, all green on this tree (`npx vitest run` of the 124 audio files: **80 files passed, 44 skipped; 2,110 tests passed, 240 skipped**, 126 s):

- `tests/audioProbeFixtures.test.ts` over `tools/audio/fixtures/*.json` (the ROM-window fixtures of every aud24x / aud25x / aud26x row) and `tests/fixtures/factory-m4a-*` (the m4a receipts);
- the 67 `tests/factoryM4a*.test.ts` files (note-body, post-command, MPlay execution / command-read contract, ...) and the 2 `tests/issue55-*` audits, each regenerating its additive evidence byte for byte;
- the sound census / T1 tests (`aud243*`, `aud252` ... `aud262`, `moveAnimSounds`, `tickSounds`, and the new `aud263CensusGeneralRows`).

The 44 skipped files are the CGB4 V1..V44 family, opt-in by design (`POKEBENCH_CGB4_EVIDENCE=1`, `npm run test:cgb4`; `factoryM4aNoteBodyCgb4Digest.test.ts` pins their digest in the default run); they were not run here.

### 6. What still blocks S11 acceptance

1. **Frame offsets, not events.** T2 has 0 missing / 0 extra, but 3,683 of 3,991 Scene ON move-animation rows (and most controller / cry / bgm rows in both scenes) match with a constant per-window frame offset (ROM minus ours up to tens of frames: bgm -71, cry -28, controller -28, move SE -20 at p10). The finish-plan acceptance ("0 missing / 0 extra sound events in both scenes", census 0..999) is met for **events** by T1; whether "same frame" (the S11 pass rule's T2 line: events equal `(frame, kind, id, pan[, mode])`) is required is the open question of docs/s11-audio-design.md. If it is, the offsets are presentation timing (Scene ON command ages, controller / cry / bgm anchors) and belong to the hpd4 / presentation lane, not to table work.
2. **T2 coverage.** 41 seeds of the 1000 have a ROM replay, and no move table row outside those windows has a ROM frame check other than its fixture window; fanfare and screen SE rows have no instance in T2 (and none in the 1000 T1 seeds' engine output).
3. **The 5 declined rows** (section 3): need the Rock Smash / Beat Up / Withdraw adapters first (presentation), then a ROM window each.
4. **T1 is self-consistency.** Controller SE, cries, BGM / duck / stop have no T1 table (counts only, section 2); their only parity evidence is the 41 T2 seeds.
5. **Frame-budget seeds 796 / 995** end in `frame budget` in both scenes (a battle that never finishes: gameplay, not audio).
6. **CGB4 V1..V44 receipts** were not re-run (opt-in); the digest pin in the default run holds.
7. **Playback** (finish-plan item 3) and the assets are out of this step.

## t2off (2026-11-18): per-body attribution of the Scene ON move-animation SE frame offsets vs the hpd7 lead table (measurement / analysis only, no `src/` / `tests/` change)

Method: the aud263 rescored T2 evidence (`.integration/evidence/aud263/t2/<seed>-on.{engine,drive,snd,tl}.json`, main tree, read-only; 21 aligned ON seeds). I re-ran the `soundScoreboard.py` alignment (same segments, same `difflib` match on (kind, id, pan), Menu SE_SELECT left out) in a scratch script and kept every **matched** move-animation SE row (`kind se`, not controller / stat-change) with its offset (engine minus ROM, relative to segment start): **3,991 rows, median -2, 308 exact (offset 0)** = the scoreboard's n 3,991 / median -2 (checked). Each row's body is the ROM `gCurrentMove` (`tl.json` column 2) at the row's ROM frame, as t2cls did. The hpd7 / hpd7b / sta4 lead table (`docs/hpd1-hp-hold.md`, 33 bodies incl. Dig / Solar Beam charge turns) gives the **predicted correction for a body SE** = ROM `R -> A` minus the app's `bodyLead + pre` (= L, or L + 3 where the app has pre 0: Struggle, Rock Slide, Faint Attack = 8; Dig uses its attack turn, 5; Double Team / Protect / Rain Dance and the six audited bodies = 0, already modelled). "Mass" = sum of abs(offset) over rows = **39,997** for all rows. Scratch only (`/tmp/t2off/{an,agg}.py`), nothing under `src/` touched, no ROM run, no `npm test`.

### 1. What the lead landing can and cannot remove

- **By design the planned lead landing moves no body SE.** `withoutBodyLead` (`battleResolutionPresentationRender.ts:1592`) feeds the sounds the pre-lead clock: the lead rows are added to the presentation, and the sound tables already carry the typical lead (`AGE_TO_SOUND_ROWS`). The hpd7 lead + tail therefore moves the *visuals* and the *next command* (hit, HP, status anim, message) by d = L + T, not the move's own SE frames. Under that landing the predicted change of the body-SE offsets is **0 rows / 0 mass**.
- **If the lead did move the body SE (the naive "+L" reading, an upper bound).** 28 of the table bodies have L > 0 and rows in T2: **1,379 rows, mass 13,809 (34.5 % of all)**. Adding L to each row: mass 13,809 -> 13,588, i.e. **-221 = 1.6 % of those bodies' mass and 0.55 % of the total**; only **57 rows become exact** and 618 of 1,379 (45 %) get closer (the other 55 % move away). The six audited bodies and the three modelled ones (Double Team, Protect, Rain Dance) have 174 rows in T2 (Seismic Toss 17, Sonic Boom 6, Double Team 135, Protect 12, Rain Dance 4; the other four audited bodies have none), per-body median offsets -9 ... +7, so they are not at 0 either: the audited lead leaves the same spread.
- **Why it cannot explain the mass.** The offset is not lead-sized: 579 rows with abs(offset) >= 20 hold **22,132 = 55.3 %** of the mass, 1,406 rows with abs(offset) <= 2 hold 35 % of the rows. L is 2 .. 16. The median offsets of the biggest in-table bodies (-2 .. -4 for Ice Beam / Double Edge / Thunderbolt / Toxic / Confuse Ray) are already smaller than L = 5 .. 10, so a +L shift overshoots them (Double Edge 1,246 -> 1,342, Dig 791 -> 961, Earthquake 527 -> 734, Giga Drain 51 -> 306, Quick Attack 0 -> 60 rows that are exact now).
- **Where the lead does match (net of the sound clock being unchanged: these are rows that sit *after* the body, attributed to it only because `gCurrentMove` stays set).** Spore (147): all 12 rows exact after +7; Toxic (92): 36 of 132 rows exact after +10. Their uniform shift suggests these are rows of the *following* status command (Status_Sleep / Status_Poison, which hpd7 says the lead + tail lands at net 7 / 17), not tested row by row. That is the part of the lead / tail rule that does show in the offsets: **48 rows**, which is where the +d correction of the following command lands.

### 2. Coverage: whose offsets the hpd7 table covers

| class of rows | rows | mass | share of mass |
|---|---|---|---|
| in the hpd7 / hpd7b / sta4 table (33 bodies, incl. modelled / audited with L 0) | 1,553 | 14,544 | 36.4 % |
| gCurrentMove 0 at the row frame (no move running: status / send-in / shiny anims, see below) | 681 | 11,643 | 29.1 % |
| other bodies not in the table (94 moves) | 1,757 | 13,810 | 34.5 % |

The "not explained by the lead" set is therefore everything outside the table (63.6 % of the mass) **plus** most of the table's own mass, since the table bodies' median offsets are not L.

**`gCurrentMove` 0 rows (681, mass 11,643, median -4).** These are not a move body: the ROM clears `gCurrentMove` between the move and the next command, so every general / status animation after it reads 0. By SE id: **148 SE_M_TOXIC x120** (poison status anim, median **-22**, mass 3,600), **152 x246 + 228 x82 + 102 SE_SHINY x82 + others** in 82 five-SE groups (152 x3, 228, 102; median -3, mass 5,655 for 152 / 228 / 102), the rest 151 rows (142 / 127 / 219 / 144 / ..., mass 2,388). These have no move lead; they follow whatever command precedes them, so their offset is the d = L + T of the *preceding* body or a status-command start offset (hpd7 "shape C" note: Confuse Ray / Thunder Wave / Curse have `gap` 5 and a status next command). Seeds carrying them: 1415 (171), 5063 (150), 3738, 2230, 499, 165, 2741, 6912.

### 3. Top 10 bodies by rows x abs(offset) (gCurrentMove 0 is the separate class above)

| # | body (gCurrentMove) | rows | median / mean offset | rows x abs(offset) | share of 39,997 | hpd7 lead L | hpd7 table has it |
|---|---|---|---|---|---|---|---|
| 1 | Rock Slide (157) | 102 | -7 / -29.8 | 3058 | 7.6% | 8 | yes |
| 2 | Swagger (207) | 33 | -17 / -43.7 | 1471 | 3.7% | 2 | yes |
| 3 | Double Edge (38) | 96 | -2 / 5.3 | 1246 | 3.1% | 5 | yes |
| 4 | Bubble Beam (61) | 264 | -2 / -2.8 | 1224 | 3.1% | - | no |
| 5 | Ice Beam (58) | 179 | -2 / -6.0 | 1107 | 2.8% | 5 | yes |
| 6 | Fire Blast (126) | 97 | -2 / -10.7 | 1099 | 2.7% | - | no |
| 7 | Magical Leaf (345) | 119 | -1 / -7.6 | 1022 | 2.6% | - | no |
| 8 | Dig (91) | 112 | 6 / 0.7 | 791 | 2.0% | 5 | yes |
| 9 | Toxic (92) | 132 | -3 / -3.8 | 720 | 1.8% | 10 | yes |
| 10 | Confuse Ray (109) | 100 | -4 / -7.1 | 712 | 1.8% | 6 | yes |

Two things dominate this ranking and are **not lead effects**:

- **Three single windows hold 4,404 = 11 % of all mass:** Rock Slide seed 165 res18 (100 rows of SE 131, offset about -115, mass 2,300 of Rock Slide's 3,058; its other 2 windows are -5 .. -7), Swagger seed 6 res14 (rows at about -110 .. -121, mass 1,276 of 1,471), Fire Blast seed 1028 res10 (SE 144 rows at -69, mass 828 of 1,099). Their offsets are 8 .. 60 x L. Not diagnosed here; likely a whole-window length difference (a long ROM loop / a window the engine ends or starts much earlier), see "Unexplained by the lead" below.
- Outside those three windows the top bodies sit at median -1 .. -4 with a long left tail (Bubble Beam quartiles -9 .. 2, Ice Beam p10 -21, Magical Leaf p10 .. p25 -25 .. -24), i.e. a few windows with a constant per-window offset (the t2off premise), not a per-body constant.

### 4. Per-body comparison for every table body with T2 rows (naive +L)

"closer / exact" counts rows whose abs(offset) shrinks / hits 0 when L is added; the mass columns are rows x abs(offset) before -> after.

| body | rows | median offset | exact (0) | naive +L: rows closer / exact | mass now -> after naive +L |
|---|---|---|---|---|---|
| Rock Slide (157) | 102 | -7 | 0 | 101 / 0 | 3058 -> 2538 |
| Swagger (207) | 33 | -17 | 0 | 28 / 0 | 1471 -> 1425 |
| Double Edge (38) | 96 | -2 | 0 | 32 / 5 | 1246 -> 1342 |
| Ice Beam (58) | 179 | -2 | 0 | 67 / 0 | 1107 -> 894 |
| Dig (91) | 112 | 6 | 0 | 35 / 0 | 791 -> 961 |
| Toxic (92) | 132 | -3 | 0 | 36 / 36 | 720 -> 816 |
| Confuse Ray (109) | 100 | -4 | 34 | 60 / 0 | 712 -> 660 |
| Thunderbolt (85) | 84 | -3 | 0 | 48 / 0 | 583 -> 523 |
| Struggle (165) | 45 | -9 | 0 | 30 / 0 | 575 -> 425 |
| Ancient Power (246) | 53 | 0 | 4 | 16 / 4 | 543 -> 622 |
| Earthquake (89) | 33 | 9 | 0 | 5 / 0 | 527 -> 734 |
| Double Team (104) (audited / modelled, L 0) | 135 | 2 | 0 | - | 468 |
| Aerial Ace (332) | 27 | 0 | 12 | 11 / 0 | 431 -> 460 |
| Sludge Bomb (188) | 76 | -4 | 0 | 38 / 0 | 380 -> 304 |
| Thunder Wave (86) | 47 | -2 | 0 | 17 / 0 | 301 -> 322 |
| Curse (174) | 33 | 2 | 0 | 14 / 0 | 253 -> 271 |
| Psychic (94) | 29 | -2 | 6 | 10 / 0 | 219 -> 218 |
| Surf (57) | 21 | -4 | 0 | 17 / 0 | 163 -> 114 |
| Bite (44) | 19 | -9 | 1 | 10 / 0 | 151 -> 114 |
| Seismic Toss (69) (audited / modelled, L 0) | 17 | -9 | 4 | - | 133 |
| Facade (263) | 34 | -2 | 0 | 10 / 0 | 114 -> 130 |
| Solar Beam (76) | 5 | -24 | 0 | 5 / 0 | 95 -> 90 |
| Spore (147) | 12 | -7 | 0 | 12 / 12 | 84 -> 0 |
| Protect (182) (audited / modelled, L 0) | 12 | 7 | 0 | - | 84 |
| Brick Break (280) | 22 | -1 | 0 | 7 / 0 | 83 -> 137 |
| Body Slam (34) | 7 | -14 | 0 | 4 / 0 | 68 -> 51 |
| Faint Attack (185) | 12 | -3 | 0 | 4 / 0 | 64 -> 64 |
| Giga Drain (202) | 51 | 1 | 0 | 0 / 0 | 51 -> 306 |
| Rain Dance (240) (audited / modelled, L 0) | 4 | 5 | 0 | - | 32 |
| Sonic Boom (49) (audited / modelled, L 0) | 6 | -3 | 0 | - | 18 |
| Double Kick (24) | 1 | -15 | 0 | 1 / 0 | 15 -> 1 |
| Mud Slap (189) | 2 | -2 | 0 | 0 / 0 | 4 -> 6 |
| Quick Attack (98) | 12 | 0 | 12 | 0 / 0 | 0 -> 60 |

### 5. Which bodies the lead does NOT explain

- **Not in the table, ranked by mass:** Bubble Beam 61 (264 rows, 1,224), Fire Blast 126 (97, 1,099), Magical Leaf 345 (119, 1,022), Bulk Up 339 (39, 633, median +9), Yawn 281 (30, 618), Rest 156 (56, 567), Soft-Boiled 135 (6, 483, median -80.5), Calm Mind 347 (18, 465), Leech Seed 73 (11, 462, median -42), Blizzard 59 (52, 442), Hydro Pump 56 (34, 427), Drill Peck 65 (54, 423), Focus Punch 264 (36, 356), Safeguard 219 (21, 340), Follow Me 266 (65, 315). Several are non-attack bodies (Bulk Up, Yawn, Rest, Calm Mind, Safeguard, Follow Me, Wish) with no `EffectHit` lead: they need their own hpd-style measurement, the lead table is attack-shaped. Next candidates by census-weighted mass for a hpd7c measurement: Bubble Beam, Fire Blast, Magical Leaf, Blizzard, Hydro Pump, Drill Peck (all plain `EffectHit` shape, so a shape-A lead of 5 is the prior).
- **In the table, offset far from -L:** Rock Slide, Swagger, Solar Beam (median -24 on 5 rows), Bite (-9), Body Slam (-14), Struggle (-9), Double Kick (-15, 1 row): the offset is larger than L; Double Edge, Dig (+6), Earthquake (+9), Giga Drain (+1), Ancient Power (0), Aerial Ace (0), Quick Attack (0): the engine is already at or **after** the ROM, so a +L would overshoot.
- **Mixed-sign bodies:** Double Edge (quartiles -5 / -2 / +24), Dig (median +6, mean 0.7; charge turn L 1 and attack turn L 5 are mixed in one `gCurrentMove`), Earthquake: positive offsets are the next-command rows, not the body.

### 6. Verdict and next steps

1. **The planned lead landing is not the cure for the T2 offsets**: <= 1.6 % of the offset mass of its own bodies even in the naive reading (0 under the sound-clock design), 0.55 % of the total. Its worth is in the hit / HP / status rows after the body (about 48 of the rows here, Spore + Toxic), plus the visual frame alignment, not the SE offsets.
2. **Largest identifiable mass is outside the lead:** (a) 681 `gCurrentMove` 0 rows (29 %): per-class constants for SE 148 (-22) and the 152 / 228 / 102 group (-3); (b) the three single windows (Rock Slide s165 res18, Swagger s6 res14, Fire Blast s1028 res10, 11 %); (c) 94 bodies without a table row (34 %). Suggested order (measure first, no code): the 120 SE 148 rows (one status anim, 3,600, constant -22, so the likeliest single fix), the three windows (a ROM drive per window, `tl.json` + `snd.json` already hold the frames), then hpd7c on Bubble Beam / Fire Blast / Magical Leaf.
3. Not measured: per-window attribution of offset to the SE's position inside the body (head vs tail of the animation); which of the 1,553 table rows are body rows versus following-command rows (needs the app command spans per row); whether the engine's `gCurrentMove` equivalent differs from the ROM's at the row frame (the attribution is the ROM's, `tl.json`). `gCurrentMove` stays set after a body, so status / stat animations right after a move are attributed to that move (part of the Toxic / Spore "exact after +L" rows, explained in section 1).

## out1 (2026-11-18): where the ~100 frames of the three single T2 windows come from (diagnosis only, no `src/` / `tests/` change, nothing landed)

Result: **three different causes, no shared one.** In every window the first SE of the segment sits at -2 .. -5 and the offset then jumps by ~65 .. 113 frames inside the *first mover's* script, after its visible body and before the second mover's "used" line; every later SE of the window carries the constant. The three stages are: (A) Rock Slide s165 res18: Knock Off's `BattleScript_KnockedOff` item animation (a general-animation command the app does not present, only a 15-row stub after the message); (B) Swagger s6 res14: the Flamethrower body is presented as its 115 live rows while the ROM waits 215 rows from `attackanimation` to `hitanimation` (a damaging body with no hpd7 lead / tail row); (C) Fire Blast s1028 res10: Horn Drill's `BattleScript_KOFail` starts with `pause B_WAIT_TIME_LONG` (64) which the used-message hold ignores (it knows only `B_WAIT_TIME_SHORT`). None of the three is a faint / send-in / stat change; none is in the SE tables.

Method. ROM side: the aud263 `<seed>-on.frozen.json` traces (the lab request with the engine-driven inputs; `replay` note removed, as `romStateTimeline.py` does) re-run in a fresh direct mGBA process with `tools/integration/hpd2Probe.py <req> on <out> <maxFrame>` (16 s per window; frame numbers equal `tl.json`'s: `gCurrentMove` 157 at 12002 in both for s165): per frame `gBattlescriptCurrInstr`, `gBattleControllerExecFlags`, `gAnimScriptActive`, decoded to battle-script labels with `reference/pokeemerald/pokeemerald.map`; the SE rows come from `snd.json`, `gCurrentMove` from `tl.json`. Engine side: a scratch copy of `soundCensusRomReplay.ts` (untracked, deleted again) that logs every presentation command start (segment.command, type, lines, timing) while replaying `--seed N --scene on --setup <aud263 setup>` on this tree (master `6b2f15b14`; its SE rows are 1 .. 2 frames later than the aud263 engine files, and the windows' offsets are the same: s165 131 rows at 11610.. vs 11608.., s6 193 at 10393 vs 10392, s1028 144 at 7813 both). All frames below are relative to the segment start (ROM: the commit anchor of the segment, engine: the same decision's anchor; s165 res18 ROM 11613 / engine 11287, s6 res14 10311 / 10012, s1028 res10 7786 / 7631). Scratch only; `/tmp/out1/`.

### A. Rock Slide seed 165 res18 (offset -115 on 20 SE 131 rows, mass 2,300)

Turn: foe Sableye Knock Off (Sudowoodo's HARD STONE) then Sudowoodo Rock Slide (the t2off row attribution `gCurrentMove` 157 is right for the SEs; the gap is before it).

| stage | ROM frame (script) | engine frame (command) | engine - ROM |
|---|---|---|---|
| Knock Off "used" print | 12 (`HitFromAtkString`, 33 rows) | 2 / 11 (message) | ~0 |
| Knock Off body | anim active 47 .. 96, SE 122 at 60 | move-animation 37 (SE 122 at 58) | -2 |
| hit anim | exec 100 | hit-animation 94 | -6 |
| HP bar | exec 135, datahpupdate 148 | hp 129 .. 157 | ~ -3 |
| **KnockedOff** | `BattleScript_KnockedOff`: **playanimation `B_ANIM_ITEM_KNOCKOFF` exec 154, anim active 172 .. 266 (94 rows), print exec 268, print done 315, `waitmessage` 64 -> 379, return 380** = 227 rows | **message "knocked off HARD STONE" 157 (110 rows), then a 15-row move-animation stub 267, sprite-visibility 282 / 283** = 125 (+2) rows, animation AFTER the message | **-100** |
| MoveEnd, Rock Slide set | MoveEnd 381, `gCurrentMove` 157 at 389 | - | |
| Rock Slide "used" print | exec 395 | 284 | -111 |
| Rock Slide body | `attackanimation` exec 427, SE 131 at 436 .. 512 | move-animation 309, SE 131 at 321 .. | -115 (SE) |

Cause: `General_ItemKnockoff` (`battle_anim_scripts.s:10356`, a single `createsprite gKnockOffItemSpriteTemplate`) runs 94 rows + a launch lead on the Scene ON controller before `printstring STRINGID_PKMNKNOCKEDOFF` (`battle_scripts_1.s:3643`: `playanimation BS_TARGET, B_ANIM_ITEM_KNOCKOFF; printstring; waitmessage B_WAIT_TIME_LONG; return`). The app presents the message first (110 rows = print 47 + wait 64 - 1, which matches the ROM's 268 .. 379 = 111) and then a 15-row command; the animation is ~114 rows (playanimation exec 154 -> print exec 268). The message text (`battleResolutionPresentation.ts:2990`) and the held-item / Wish / Future Sight / Focus Band general-animation commands (`WISH_HEAL_COMMAND_FRAMES` 201, `FUTURE_SIGHT_HIT_COMMAND_FRAMES` 172, `FOCUS_BAND_COMMAND_FRAMES` 129, `battleResolutionPresentation.ts:178-180`, used at :4821) exist; `B_ANIM_ITEM_KNOCKOFF` is a fourth uncovered `playanimation` site (wsh1 listed three). Other Knock Off windows in T2 (s165 res13 -11, s499 res1 -19, res14 -2) show the SE rows of the body only, not the SEs after it, so they do not measure this.

Proposed fix (not landed): present the ITEM_KNOCKOFF animation as a general-animation command **before** the knocked-off message (frames `playanimation exec -> print exec` = 114 on this window; two fresh ROM runs to confirm), and drop the 15-row stub after the message if that stub is the same site (not traced in this step: the stub is a `move-animation` command without `animation`, 15 rows at 267; check which receipt creates it). Predicted: +99 rows -> the offset -115 -> about -16 (the other Rock Slide windows sit at -5 .. -7, s165 res24 -20), i.e. ~ -2,000 of the 2,300 mass. Scene ON only (`Cmd_playanimation` is `pause B_WAIT_TIME_SHORT` in Scene OFF; the OFF app should be checked before landing).

### B. Swagger seed 6 res14 (offset -110 on 5 SE 193 / 194 rows, -121 on 6 SE 176 rows, mass 1,276)

Turn: Quilava Flamethrower on Politoed ("It's not very effective..."), then foe Politoed Swagger. The SEs measured (193 / 194 / 176) are Swagger's, the Flamethrower SE 146 is at -5.

| stage | ROM frame | engine frame | engine - ROM |
|---|---|---|---|
| "QUILAVA used FLAMETHROWER!" print | 12 .. 39 | 1 / 10 | ~ -2 |
| **Flamethrower body** | **`attackanimation` exec 44, anim active 46 .. 255 (209 rows, release 257), SE 146 at 61, panse to 124** | **move-animation 35, live window 115 rows -> hit-animation 150** | **-9 at the start, -107 at the end: the body is 100 rows short (215 vs 115 from `attackanimation` to `hitanimation`)** |
| hit anim | exec 259 (34 rows) | 150 (35) | -109 |
| HP bar | exec 294, datahpupdate 346 | hp 185 (51 rows) | -109 |
| "not very effective" | resultmessage exec 349, wait done 438 (89 rows) | message 236 (88 rows) | -113 |
| MoveEnd, Swagger set | MoveEnd 440, `gCurrentMove` 207 at 448 | 13-row stub 324, sprite-visibility 337 / 338 | |
| Swagger "used" print | exec 452 | 339 | -113 |
| Swagger SEs | 193 at 490 .. 543, 194 at 619 .. 633, 176 at 893 .. 921 | -110 / -110 / -121 | |

Cause: `liveMoveAnimation.ts:1433` `case 53: return 115; // Flamethrower (395..520 / 449..574 ...); script ends 600/654.` The live window is the visible rows only; the script runs 80 rows past it (`FlamethrowerCreateFlames` x11 then `waitforvisualfinish`, `Move_FLAMETHROWER` at `battle_anim_scripts.s:6311`), and Flamethrower is a **hit body**, so `moveAnimationScriptTailTiming` (`battleResolutionPresentation.ts:1625-1662`: null for "a hit body") gives no `scriptTailRows`, `LIVE_MOVE_SCRIPT_TAIL_TRAIL_ROWS` (`battleResolutionPresentationRender.ts:1536`) has no 53, and the hpd7 / hpd7b / sta4 lead table (`docs/hpd1-hp-hold.md`) has no Flamethrower row. Everything after the body (hit, HP, message, the next mover) therefore starts ~100 rows early. The same cause is visible in a second window outside the three: **s1028 res12** (Flamethrower SE 146 at -5, then SE 144 at -108, Calm Mind SE 184 x3 at -114, SE 144 at -128; mass ~ 580), plus every other Flamethrower that is followed by an SE inside its segment (the Flamethrower row itself is always -5, so the scoreboard only shows it through the next command).

Note on t2off section 1: that section says the lead landing "moves no body SE" and is not the cure of the T2 offsets. Correct for body SEs, but this window's SEs are the *next command's* SEs, and the d = L + T rule (the app's body length from `attackanimation` to the hit) does move them. Window B is exactly what a hpd7 row for Flamethrower removes (R -> H 215 here, i.e. L + T ~ +100 against the app's 115), so the hpd7c measurement list should put Flamethrower first (it is a plain `EffectHit` shape with the longest live-window / script gap seen so far).

Proposed fix (not landed): measure Flamethrower with the hpd7 method (this probe already gives R = 44 (`attackanimation` exec), A = 46, `hitanimation` exec 259 = R + 215 on the Scene ON ROM; confirm on a second fresh run and on the opponent side, `ageOffset -11` is in the live row table), add it to the lead / tail table. Predicted: +100 rows -> the Swagger SEs -110 / -121 -> about -10 / -20 (the -5 start offset plus the usual next-command lead), ~ -1,100 of 1,276 mass (+ ~ -500 of s1028 res12).

### C. Fire Blast seed 1028 res10 (offset -69 on 12 SE 144 / 145 rows, mass 828)

Turn: foe Nidoking Horn Drill (misses) then Blissey Fire Blast. The window's first SE is Fire Blast's.

| stage | ROM frame | engine frame | engine - ROM |
|---|---|---|---|
| "Foe NIDOKING used HORN DRILL!" print | `EffectOHKO` +0x2 exec 8, 30 rows -> 38 | message 0 / 9 | ~0 |
| `tryKO`, jump | 39 .. 41 | - | |
| **`BattleScript_KOFail` `pause B_WAIT_TIME_LONG`** | **42 .. 106 (64 rows), "used" stays on the box** | **message "used" ends at 37: 28 rows, no hold** | **-70 from here** |
| `printfromtable` "attack missed!" | exec 107, done 136, `waitmessage` 64 -> 200 (93 rows) | message 37 (92 rows) | -70 |
| MoveEnd, Fire Blast set | 201 .. 208, `gCurrentMove` 126 at 209 | 13-row stub 129, sprite-visibility 143 / 144 | |
| Fire Blast "used" print | exec 215 | 145 | -70 |
| Fire Blast body | `attackanimation` exec 245, SE 144 at 251 .. 350 (10 rows), SE 145 at 362 / 368 | move-animation 168, SE 182 .. | -69 (SE) |

Cause: the used-message hold of the source pause. `sourcePauseUsedMoveHoldFrames` (`battleResolutionPresentation.ts:1333-1376`, called at :4695) holds "X used Y!" for the interpreter executions up to the first print when a `pause` precedes it, but it accepts only `operands[0].expression === "B_WAIT_TIME_SHORT"` (:1357-1358; the fix122 no-effect `Pausex20` list is the other entry). `BattleScript_KOFail` (`battle_scripts_1.s:772`: `pause B_WAIT_TIME_LONG; printfromtable gKOFailedStringIds; waitmessage B_WAIT_TIME_LONG; goto BattleScript_MoveEnd`) pauses for `B_WAIT_TIME_LONG` = 64 (`battle.h:324`), so the used message of an OHKO miss is released 64 + ~6 dispatch rows early (the SHORT constant is 38 = 32 + 6, `USED_MESSAGE_B_WAIT_TIME_SHORT_HOLD_FRAMES` :923). The miss message itself (92 vs ROM 93) is right. The only other Horn Drill window in T2 (s1028 res4, 13 SE rows at offset 0) was not checked for a miss; Guillotine / Fissure / Sheer Cold misses take the same label.

Proposed fix (not landed): accept `B_WAIT_TIME_LONG` in the pause test (hold = executions from the attack string to the print + 1, the kernel's own count, which includes the 64 blocked retries as it does for SHORT; check the `ppreduce` / `jumpifstatus2` / `tryKO` receipts between do not make the "first presented receipt after the attack string" test return null for the OHKO path). Predicted: +70 rows -> -69 -> about +1; ~ -820 of 828 mass. The ROM held "used" for 7794 .. 7893 = 99 rows (30 print + 64 pause + 5), the app 28.

### Totals and caveats

| window | rows | mass now | predicted residual | fix |
|---|---|---|---|---|
| Rock Slide s165 res18 | 20 | 2,300 | ~ 5 .. 16 per row -> ~ 300 | A: ITEM_KNOCKOFF general-animation command before the message |
| Swagger s6 res14 | 11 | 1,276 | ~ 10 .. 20 per row -> ~ 150 | B: Flamethrower row in the hpd7 lead / tail table |
| Fire Blast s1028 res10 | 12 | 828 | ~ 1 per row -> ~ 10 | C: `B_WAIT_TIME_LONG` in the used-message pause hold |
| (also B) s1028 res12 | 6 | ~ 580 | ~ 100 | same as B |

Net of the three fixes: about -3,900 of the 39,997 mass (9.8 %), plus ~ -480 from s1028 res12; these are predictions from ROM frame arithmetic, not an engine run. Fix B and the hpd7 landing share the lead / tail machinery (B moves the next command's rows; it should not touch the Flamethrower SEs), fix A is Scene ON only, fix C touches only the pre-print hold of the KOFail path (any other `pause B_WAIT_TIME_LONG` before a first print would also change: grep `pause B_WAIT_TIME_LONG` in `battle_scripts_1.s` before landing; the sound clock of those rows is separate). Not measured: whether the 15-row stub after the Knock Off / Swagger / Horn Drill messages (`move-animation minimumFrames 15 / 13 / 14`, no `animation`, then two sprite-visibility commands) is the same command in all three (it appears at the same place, between the first mover's last message and the second mover's "used" line, and its length varies 13 .. 15; the ROM spends 8 .. 13 rows there: MoveEnd + the next script's canceler / `EffectHit` steps); the Scene OFF twin of any of these (the named OFF service was not used); other Knock Off / Flamethrower / OHKO windows beyond the T2 set. Evidence: the ROM probe JSON / label dumps live only in `/tmp/out1/` (`<seed>.ram.json`, `<seed>.engine.json.cmds`); to regenerate: `hpd2Probe.py /tmp/out1/<seed>.req.json on <out> <maxFrame>` on the aud263 frozen trace with `replay` removed, and the scratch replay logger described above. No `npm test` / build (docs only).

## out2 (2026-11-18): the Scene OFF twins of out1's Knock Off item animation and Horn Drill KOFail pause (measurement only, no `src/` / `tests/` change, nothing landed)

Result: **both bugs exist in Scene OFF, and Horn Drill's is exactly the same size in both scenes; Knock Off's is much smaller in OFF.** (1) Horn Drill / OHKO miss: the ROM runs `BattleScript_KOFail` `pause B_WAIT_TIME_LONG` (64 rows) before the "is unaffected!" print in ON and OFF alike; the app (both scenes) goes straight from the used message to the miss message, so everything after the used message is **-70** rows (64 pause + 6 script steps) in ON and OFF. (2) Knock Off: `Cmd_playanimation` with `HITMARKER_NO_ANIMATIONS` pushes `BattleScript_Pausex20` (34 rows `KnockedOff+0x0` -> `+0x7`) instead of the 94 / 43 row `General_ItemKnockoff` animation; the app presents neither, so the "knocked off X's ITEM!" message arrives **-18 .. -39** (OFF) / **-57 .. -105** (ON) rows early.

Method. Labs `tools/battle-lab/out2-*.json` (new, mechanicLab, `overrides.parties`, derived from the `hpd1Labs.py` template `aud242o-rollout5-player-on.json`: Rattata vs Rattata, the Lv100 foe uses Defense Curl first, then the player's move): `out2-horndrill-{on,off}` (player Lv10 Horn Drill 32 vs Lv100 -> the ROM's level check misses: "Foe RATTATA is unaffected!"), `out2-knockoff-{on,off}` (player Lv50 Knock Off 282, foe Lv100 holds Leftovers 200; the foe is the target), `out2-knockoffnoitem-{on,off}` (the same, foe item 0: the control), `out2-knockoffrev-{on,off}` (the foe Lv100 uses Knock Off 282 on the player's Lv50 Defense Curl Rattata holding Leftovers: the player is the target). ROM: `hpd2Probe.py <lab> <on|off> <out> 900` (fresh mGBA, `PYTHONPATH=/srv/pokebench/vendor/libmgba-py`), `gBattlescriptCurrInstr` decoded to labels with `pokeemerald.map` (scratch decoder `/tmp/out2dec.py`; frames are lab trace frames, the same axis as the app). App: `tools/integration/hpd4Cmds.ts` on a compare trace of the lab (`appStage` ids `out2-*`, temporary stages in `tools/compare/appTrace.ts` built with `aud241bStage(..., "off"|"on", 10, 100, 32, undefined, false, 111)` for Horn Drill and `midBattleSwitchStage(..., player: rattataAtLevel(50, 282), trainer: rattataAtLevel(100, 111, 200), usedMessageHoldFrames: 0, sceneOffNoAnimations: scene === "off")` for Knock Off; reverted again, not committed; the patch is `/tmp/out2-appTrace.patch`, the compare traces were deleted). Master `663ac0866`, battle-scene-off oracle :8014 (the ROM runs were direct mGBA, no oracle call). The ROM probes and the app agree at the first segment (Defense Curl at frame ~27 / ~21) and at the used message (+1).

### A. Horn Drill miss (`out2-horndrill-{off,on}`)

| stage | ROM OFF frame | app OFF frame | ROM ON | app ON |
|---|---|---|---|---|
| "RATTATA used HORN DRILL!" print | `EffectOHKO+0x2` exec 280 .. 304 (24 rows) | message 281 .. 304 (23) | exec 349 .. 373 (24) | 350 .. 373 (23) |
| `EffectOHKO+0x3 .. +0x16` script steps | 305 .. 308 (5 rows) | - | 374 .. 377 | - |
| **`KOFail+0x0` `pause B_WAIT_TIME_LONG`** | **309 .. 373 (64 rows)** | **none** | 378 .. 442 (64) | none |
| `printfromtable` "is unaffected!" | exec 374 .. 400 (26 rows) | message 304 .. 393 (89 incl. wait) | exec 443 .. 469 | 373 .. 462 (89) |
| `waitmessage B_WAIT_TIME_LONG` | 400 .. 464 (64) | (inside the 89) | 469 .. 533 | |
| MoveEnd / turn end | MoveEnd 465, menu exec=3 at 477 | turn-end 395, NORES 409 | MoveEnd 534, menu 546 | turn-end 464, NORES 478 |
| app - ROM at the miss message | | **-70** (304 vs 374) | | **-70** (373 vs 443) |
| app - ROM at the menu | | **-68** | | **-68** |

The two scenes are identical to the frame (the pause is a plain script `pause` and the OFF print is the same 24 / 26 rows as ON), and the app's miss-message hold is within 2 of the ROM's (89 vs 91): **the whole defect is the missing pre-print `pause B_WAIT_TIME_LONG` (64 rows) plus the 6 script-step rows**, i.e. out1 stage C holds in OFF, and a fix in `sourcePauseUsedMoveHoldFrames` (`battleResolutionPresentation.ts:1357-1358`, only `B_WAIT_TIME_SHORT` is read) is scene-independent. Fissure / Guillotine / Sheer Cold use the same `BattleScript_EffectOHKO` -> `BattleScript_KOFail` (`battle_scripts_1.s`); not run separately (one script, one label). Not measured: the other OHKO miss variants (`gKOFailedStringIds` "protected" / "avoided" paths use the other `BattleScript_PrintMoveMissed` / KOFail targets and may or may not carry the pause), and a Sturdy / Focus-Band-like fail.

### B. Knock Off item animation (`out2-knockoff*`)

ROM `BattleScript_KnockedOff` (`playanimation BS_TARGET, B_ANIM_ITEM_KNOCKOFF; printstring STRINGID_PKMNKNOCKEDOFF; waitmessage B_WAIT_TIME_LONG; return`):

| lab | scene | `KnockedOff+0x0` | playanimation -> print exec | print exec .. wait end | app message |
|---|---|---|---|---|---|
| `knockoff` (foe target) | OFF | 395 | **34 rows (`Pausex20` 396 .. 428)**, print exec 430 | 430 .. 538 (108) | 412 .. 519 (107) |
| `knockoff` (foe target) | ON | 483 | **70 rows (anim active 509 .. 552 = 43)**, print exec 554 | 554 .. 662 | 496 .. 603 (107) |
| `knockoffrev` (player target) | OFF | 169 | **35 rows (`Pausex20` 169 .. 203)**, print exec 204 | 204 .. 312 | 161 .. 268 (107) |
| `knockoffrev` (player target) | ON | 188 | **105 rows (anim active 193 .. 287 = 94)**, print exec 289 | 289 .. 397 | 176 .. 283 (107) |

- **OFF**: `Cmd_playanimation` is a 34-row `BattleScript_Pausex20` for `B_ANIM_ITEM_KNOCKOFF` (a 32-frame pause + 2 script steps), not a short pause. The app presents nothing for it: its HP command (`minimumFrames 28`) is followed straight by the 107-row message. Net: the message is **-18** rows early in `knockoff` (app print 412 vs ROM 430; ROM hp exec 384 .. 389 is only 5 rows, so the app's fixed 28-row HP hold already covers 16 of the 34) and **-43** in `knockoffrev` (161 vs 204; ROM hp exec 137 .. 163, 26 rows, so the HP hold covers none of the pause; after removing the hit-animation baseline of -4: -39). The turn end moves the same amount: `knockoff` ROM menu 552 vs app NORES 535 (-17), `knockoffrev` ROM 569 vs 528 (-41). Control `knockoffnoitem-off` (the same hit, no item, no KnockedOff): ROM menu 408 vs app NORES 412 (+4), so the item adds ROM +144 rows (34 pause + 108 message + 2) and app +123 (16 hold extension + 107).
- **ON**: the animation is side dependent, 43 rows of animation when the foe is the target (`knockoff`, 70 rows from `playanimation` to print) and **94 rows when the player's own mon is the target** (`knockoffrev`, 105 rows, the same 94 as out1's Sudowoodo window; out1's "114 rows" is this 105 + the first rows of the next step). ON message offsets: `knockoff` app 496 vs ROM 554 = -58 (baseline of the hit window is +1 .. +3 in this lab: the shortfall is ~-60), `knockoffrev` app 176 vs ROM 289 = -113 (baseline -8: shortfall ~-105). Turn end: `knockoff` ON 619 vs 676 (-57), `knockoffrev` ON 612 vs 723 (-111).
- The short `move-animation` stub (no `animation`, 10 .. 14 rows) is not Knock Off specific: it sits between a first mover's last message and the second mover's next command in every timeline (`horndrill` / `knockoff` at 270 after Defense Curl's "rose!" message, 10 / 14 rows, where the ROM runs MoveEnd + the next canceler, 271 .. 278; `knockoffrev` at 268 / 283 after the KnockedOff message, 11 rows), and it is absent after a last message with no second mover (`horndrill`: unaffected message -> sprite-visibility directly). That answers out1's open question: it is the generic mover-to-mover gap, not part of Knock Off / Swagger / Horn Drill.

Fix scope (not landed): (A) scene-independent; add the 64-row KOFail pause (and the 6 script rows) before the miss message, with an OFF and an ON lab above as the checks (`out2-horndrill-*`, expect app - ROM -68 -> ~0 at the menu). (B) Scene dependent: OFF needs a **34-row pause command before the message** (not the 94-row animation) and ON needs the animation (43 rows foe target / 94 rows player target, +2 script rows, before the message), i.e. `B_ANIM_ITEM_KNOCKOFF` is the fourth `playanimation` site after the Wish / Future Sight / Focus Band commands (`WISH_HEAL_COMMAND_FRAMES`, etc., `battleResolutionPresentation.ts:178-180`, :4821); the OFF case shares the `Pausex20`-after-`playanimation` pattern with the other `playanimation` sites in OFF (the app should check the held-item / Wish / Focus Band OFF commands the same way; not measured here). The app's 28-row HP hold before the message overlaps part of the pause, so the OFF insertion should be the pause minus the HP-hold slack, or the HP hold should be derived from the ROM HP drain (ROM hp exec 5 / 26 rows here, app fixed 28).

Reproduce: the labs are committed; `hpd2Probe.py tools/battle-lab/out2-<case>-<on|off>.json <on|off> /tmp/x.json 900` then decode `ptr` with `pokeemerald.map`; the app side needs the temporary `appTrace.ts` stages above plus a compare trace `{"appRoute":"generated-orchestrator","oracleProfile":...,"appStage":{"id":"out2-<case>-<scene>","frame":0},"oracleBattleLab":{"scenario":"../../battle-lab/out2-<case>-<scene>.json"},"segments":<the lab's trace segments>}`. No `npm test` / build (docs and labs only; the lab JSONs are not referenced by any test).

## t2r (2026-11-18): Scene ON T2 re-measured on master `d02f829c8` after pau2 / pau3 / mem2 / kno3 / hpd8 / ais4 (measurement only, no `src/` / `tests/` change)

Method: the aud248 chain (`tools/audio/aud248RunSeed.sh SEED on DIR`: request, ROM setup, engine replay, closed-loop ROM drive, `romStateTimeline`, compare, then the ROM sound pass) run **fresh** for 25 Scene ON seeds on a detached worktree of `d02f829c8` (so a mid-run merge could not mix engines; `nice -n 10`, 2 seeds at a time, 3-4 min per seed). Seeds: the **21 aud263 ON seeds** (2 6 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6912 7295 8108 8612) plus **4 new census seeds never T2-driven: 97, 310, 319, 648** (picked from census 0..999 by how many not-yet-T2-sampled bodies they carry: 97 Soft-Boiled / Blizzard / Calm Mind / Fire Blast / Rock Slide; 310 Focus Punch / Leech Seed / Yawn / Calm Mind / Rest / Rock Slide; 319 Leech Seed / Safeguard / Calm Mind / Rest / Fire Blast; 648 Hydro Pump / Leech Seed / Rest / Swagger; the declined-row seeds 51 / 492 / 835 were left out on purpose: adp1 has since landed Withdraw / Rock Smash / Beat Up, but their T2 coverage is a separate question). Every seed's closed-loop drive ended `stop outcome`, `matched == engineStates`, no divergence. Scoring: `soundScoreboard.py` (unchanged). Attribution: new tool `tools/audio/t2Attribute.py` (the t2off scratch scripts, promoted: same `difflib` alignment as the scoreboard, every matched row kept with its offset and cause = ROM `gCurrentMove` at the row frame from `tl.json` for move-animation SEs, as t2cls / t2off did), run once per engine build over the **same ROM files** so only the engine varies. Evidence (ignored): `.integration/evidence/t2r/` (`<seed>-on.*`, `steps/<commit>/` engine replays, `t2r-attr*.json`, `t2r-all.txt`, `t2r-21.txt`). No `src/` / `tests/` file touched; `npm test` not run (measurement step).

**Validation of the method.** The aud263 engine (`f6edfc6b9`) replayed against the NEW ROM files reproduces the aud263 rows exactly (4,895 / 4,895 matched rows, same offset each; ROM frame of every row identical), so aud263 -> now is an engine-only difference and the per-step replays below are exact, not estimates.

### 1. Missing / extra (the headline): 0 / 0

**0 missing and 0 extra rows in every family, 25 / 25 seeds** (also at every one of the 12 intermediate engine builds replayed in section 3). Same (kind, id, pan) in order everywhere; the only thing that differs is the frame.

### 2. Family table, aud263 (21 seeds) vs now (the same 21 seeds, and all 25)

Engine minus ROM, frames, relative to the segment start (median / p10 / p90). aud263 = `t2-scoreboard` ON.

| family | aud263 (21): exact / offset, med / p10 / p90 | now, same 21: exact / offset, med / p10 / p90 | now, all 25 (4 new seeds in) |
| --- | --- | --- | --- |
| move-animation SE | 308 / 3,683, -2 / -20 / 7 (n 3,991) | **292** / 3,699, -2 / **-16** / **8** | 334 / 4,477, -2 / -17 / 7 (n 4,811) |
| stat-change SE | 13 / 72, -1 / -19 / 4 | 13 / 72, -1 / **-16** / 4 | 15 / 86, 0 / -16 / 3 |
| cry | 4 / 167, -10 / -28 / 7 | 5 / 166, **-9** / **-23** / **13** | 6 / 196, -9 / -24 / 13 |
| battle-controller SE | 66 / 577, -5 / -28 / 2 | 66 / 577, -5 / **-23** / **3** | 74 / 684, -5 / -23 / 3 |
| bgm | 0 / 5, -23 / -71 / 9 | 0 / 5, -23 / -71 / **18** | 0 / 5, -23 / -71 / 18 |
| fanfare, screen SE | 0 / 0 | 0 / 0 | 0 / 0 |

Total sum of abs(offset) over the 21 seeds' 4,895 matched rows: **52,769 -> 44,707 (-15.3 %)**; move-animation SE 39,997 -> 33,401 (-16.5 %), controller 8,842 -> 7,899, cry 2,857 -> 2,387, stat 920 -> 868, bgm 153 -> 152. The p10s moved toward 0 by 3-5 frames in four families; the medians barely moved (they sit on the many small constant per-window offsets, not on the fixed windows). The four new seeds alone (982 rows, mass 11,363; move-animation SE median -2 / p10 -23 / p90 +4, controller -6 / -92 / 0, cry -9 / -102 / +11): same shape as the old seeds, with new open bodies (section 4).

**Got worse, p90 only:** cry p90 7 -> 13 and bgm p90 9 -> 18 (n 5; the bgm rows follow the move-end tail), move-animation p90 7 -> 8. **Exact rows 308 -> 292 in move-animation SE (all families 391 -> 376, -15; over the chain 36 rows lost, 21 gained)**: the move-animation family is the only one where "exact" fell; the rows lost are listed in section 5 (rows that matched at 0 and moved to the next command's real offset).

### 3. Which step moved which rows (25 seeds, 5,877 matched rows, sum abs(offset) 66,137 at `f6edfc6b9` -> 56,070 now; 0 missing / 0 extra at every build)

Each line is the engine commit, replayed over the fixed ROM rows; "moved" = rows whose offset changed; the causes are the ROM `gCurrentMove` at the row (so a following-command row is named after the move that is still set).

| step (commit) | rows moved (toward 0 / away) | mass | biggest movers (rows, shift) |
| --- | --- | --- | --- |
| adp1 (Withdraw / Rock Smash / Beat Up bodies, `0c30cdc60`) | 0 | 66,137 | none: no seed here plays those three moves |
| **hpd4** (`ef94a58af`: Sonic Boom / Dragon Rage / Defense Curl / Rollout leads + floor-free hit hold; landed after aud263) | 424 (358 / 54) | 66,137 -> 66,043 | Bubble Beam 48 rows +1 (-48); **SE 242 (Hail) general anim 10 rows -16 (+160, away)**, Cosmic Power 3 rows -17 (-45), Wish 16 rows -8 .. -4 (+44, away), Charm 3 rows +12 (+36, away) |
| hpd5 Ice Ball (`93306ce12`) | 0 | 66,043 | none |
| hpd5 Seismic Toss (`a26352df1`) | 16 (7 / 9) | 66,043 -> 66,003 | Seismic Toss 5 rows +7 (-35), Sand Attack +7 |
| **pau2** (`ccbf70269`: KOFail / AlreadyPoisoned pause LONG, SafeguardEnds SHORT) | 67 (67 / 0) | 66,003 -> 62,675 (**-3,328**) | **SE 148 (Toxic) general anim 18 rows by +32 / +72 / +104 (-1,248)**, **Fire Blast 12 rows +71 (-804: the s1028 res10 Horn Drill window of out1)**, SE 142 16 rows (-576), Soft-Boiled 3 rows +71 (-183), cry / controller rows of the same windows |
| mem2 (`652e53159`: 0x7FFF instant HP drop) | 0 | 62,675 | none: none of the 25 seeds plays Memento / Explosion / Self-Destruct (checked: `gCurrentMove` 120 / 153 / 262 absent), so mem2 has no T2 row to move; its evidence is the visual windows (aud242 section 30) |
| **kno3** (`f047ca4f5`: Knock Off item animation) | 50 (47 / 3) | 62,675 -> 59,112 (**-3,563**) | **"Rock Slide" 20 rows +110 (-2,200: the s165 res18 window of out1; the rows are the Knock Off item animation's, named after the Rock Slide that is still `gCurrentMove`)**, SE 148 12 rows +50 / +59 (-594), cry / controller of that window |
| **hpd8** (`b6245066e` via `2a4fef0b1`: shape-A lead + hit tail, 16 bodies) | **770 (576 / 183)** | 59,112 -> 56,190 (**-2,922**) | the NEXT command of every shape-A body moves by its +6 / +8 / +11: SE 142 48 rows (-384), Ice Beam 27 (-234), Blizzard 26 (-208, +8), Leech Seed 22 (-154), controller SE 15 28 rows (-153), Psychic 35 (-144), Double Edge 28 (-134); **away: Confuse Ray 20 rows +6 (+108, a shape-C body at gap 5 now overshoots), Hypnosis / Agility / Encore / Light Screen / SE 152 / 228 / 102 group rows already at -1 .. +1 move to +5 .. +8** |
| pau3 (`87bf77283`: SafeguardEnds pre-print row +10) | 17 (12 / 5) | 56,190 -> 56,168 | SE 148 12 rows +10 (-72), 5 rows away +10 (cry, three controller rows) |
| ais4 (`047a1a3dd`, plus dl3 which has no sound effect) | 112 (89 / 23) | 56,168 -> **56,070** | send-in SE / cry open elapsed 18 -> 17: controller SE 15 and cry 39 rows each by -1 / +1, SE 242 10 rows +2 (-20); exact rows 425 -> 429 |
| **net `f6edfc6b9` -> now** | | **66,137 -> 56,070 (-10,067, -15.2 %)** | |

What this says: **kno3 + pau2 landed the two largest single windows** (Rock Slide s165 res18 -2,200 and Fire Blast s1028 res10 -804 are exactly out1's predictions; Horn Drill's pause and Knock Off's item animation removed 6,891 of the 10,067 = 68 % of the net mass between them, in 117 rows). **hpd8 moved the most rows (770) for 2,922 of mass**: it is the only step with a large "away" count (183 rows), because the uniform +6 / +8 / +11 lands on rows that were already at 0 .. +1 (the hpd8 doc names this overshoot; section 5 lists it). mem2 and adp1 move zero rows in these 25 seeds (no Memento / Explosion / Self-Destruct / Rock Smash / Withdraw / Beat Up in them): their wins are not visible to T2 here.

### 4. t2off-style table: top 15 causes by rows x abs(offset) now (25 seeds, total mass 56,070 over 5,877 rows)

| # | cause (ROM `gCurrentMove` at the row, or SE id) | rows | median | rows x abs(offset) | share | class | of which new seeds | aud263 (21 seeds) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | SE 152 (Take Down) with no move set | 282 | -2 | 3,675 | 6.6 % | status / general anim (the 152 / 228 / 102 five-SE group; s5063: 27 rows, 1,167) | 309 | 3,393 |
| 2 | controller SE 13 (effective) | 305 | -3 | 3,572 | 6.4 % | controller / message row | 884 | 2,851 |
| 3 | cry | 202 | -9 | 3,087 | 5.5 % | cry (modes 0 / 5 / 7 / 8 / 11 mixed) | 700 | 2,857 |
| 4 | SE 142 (Crabhammer id) with no move set | 160 | -6.5 | 1,856 | 3.3 % | status / general anim | **1,472** | n/a |
| 5 | **Leech Seed (73)** | 55 | **-29** | 1,771 | 3.2 % | **unaudited body** (constant -29 / -29 / -36 / -38 per window on s648 / s319 / s6912 / s310) | **1,375** | 462 |
| 6 | controller SE 16 (faint) | 105 | -5 | 1,707 | 3.0 % | controller / message row | 441 | 1,448 |
| 7 | controller SE 15 (ball open) | 111 | -12 | 1,702 | 3.0 % | controller / message row | 416 | 1,609 |
| 8 | SE 148 (Toxic) with no move set | 120 | -9.5 | 1,602 | 2.9 % | status play (poison tick); **was 3,600 at median -22**, pau2 / kno3 / pau3 took 1,998 | 0 | 3,600 |
| 9 | controller SE 12 (not effective) | 102 | -4 | 1,484 | 2.6 % | controller / message row | 84 | 1,404 |
| 10 | **Swagger (207)** | 33 | -11 | 1,405 | 2.5 % | unaudited body (s6 res14: 11 rows, 1,276; out1 B) | 0 | 1,471 |
| 11 | Ice Beam (58) | 206 | -2 | 1,239 | 2.2 % | shape-A (hpd8-landed) | 209 | 1,107 |
| 12 | SE 228 (Morning Sun id) with no move set | 94 | -2 | 1,225 | 2.2 % | status play (same five-SE group as 13) | 103 | 1,131 |
| 13 | SE 102 (Shiny) with no move set | 94 | -2 | 1,225 | 2.2 % | status / shiny anim | 103 | 1,131 |
| 14 | Bubble Beam (61) | 264 | -2 | 1,176 | 2.1 % | shape-A (hpd8-landed) | 0 | 1,224 |
| 15 | **Solar Beam (76)** | 20 | **-62** | 1,145 | 2.0 % | **shape B (open: unleash turn ROM window 237 vs app 160, hpd7b)**; s97: 13 rows at -99 .. -101 = 1,000, s830 -18 | **1,058** | 95 |

Next five: Double Edge 1,112 (shape-A, median +2: the engine is now after the ROM on its next-command rows), Magical Leaf 1,036, Rock Slide 998 (was 3,058; 140 new), Calm Mind 858 (unaudited; 435 new), Blizzard 856 (unaudited; 635 new, median -5).

By class (all 5,877 rows, 56,070): unaudited bodies 1,667 rows / 14,675 (26.2 %), status / general anims with no move running 912 / 12,032 (21.5 %), shape-A bodies already landed 1,561 / 10,192 (18.2 %), controller / message rows 758 / 10,071 (18.0 %), cry 202 / 3,087 (5.5 %), shape B 184 / 2,496 (4.5 %), shape C 232 / 1,480 (2.6 %), stat-change 101 / 1,050, audited / modelled (hpd4 / hpd5 / Double Team / Protect / Rain Dance) 255 / 835, bgm 5 / 152. **Rows at abs(offset) >= 20: 811 rows hold 29,150 (52 %)**; the largest groups are single (seed, cause) windows: s6 Swagger 1,276, s5063 SE 152 1,167, **s97 Solar Beam 1,000 (new)**, s5063 Double Edge 864, s3738 Magical Leaf 840, **s648 Leech Seed 638 (new)**, **s97 Blizzard 546 (new)**, s1415 Bulk Up 489. A "landed shape-A" body keeps 18 % of the mass: the lead landed on the body's *next* command, so its own SEs still carry the audited ROM ages (median -2 .. +2) and the remaining mass is the next-command spread, not the lead.

**New findings from the four new seeds** (not visible in aud263's 21): (1) **Leech Seed (73)** constant -29 .. -38 per window (44 of 55 rows from s310 / s319 / s648; 11 more on s6912): a whole unmeasured body, 1,771 mass, no hpd7-style window; (2) **Solar Beam unleash** -99 .. -101 on s97 is hpd7b's known 237-vs-160-row window, shape B, unlanded: the hpd8 doc lists it as open; (3) the SE 142 no-move rows (1,472 of 1,856 mass from the new seeds, 128 rows); (4) Blizzard (635 new mass), Calm Mind (435), Psychic (634 new: a landed shape-A body whose own rows sit at -5 .. +1; the mass is a few outlier rows after it, -108 on s310, -45 on s5063, +25 on s97, i.e. following-command rows still labelled Psychic).

### 5. What got WORSE than aud263 (the same 21 seeds; every one is a shift toward the ROM's next-command offset or a small overshoot, none changes an event)

By cause, mass up (rows worse of rows): **Encore 50 -> 130 (+80; 10 of 20 rows by +8; hpd8)**, **SE 242 (Hail) general anim 320 -> 380 (+60; 10 rows by -16; hpd4: rows that were exact are now -16)**, **Charm 33 -> 69 (+36; 3 rows by +12; hpd4)**, **Agility 75 -> 105 (+30; 5 rows by +6; hpd8)**, **Wish 152 -> 180 (+28; 8 rows by -6 / -5; hpd4)**, **Hypnosis 113 -> 137 (+24; 4 rows by +6, exact -> +6; hpd8)**, Magical Leaf 1,022 -> 1,036 (+14; 7 rows by -7; a hpd8 body whose next-command rows now sit before the ROM's), Flash 36 -> 44 (+8; -17, hpd4), SE 219 (+6), SE 197 (+5), Light Screen (+2). All are small-mass rows (the biggest, Encore, 80 frames) against -8,062 for the whole set; no family or body of consequence got worse in total. The two steps that cause them are **hpd4** (SE 242 / Charm / Wish / Flash, the post-hit-hold shift of the rows after Sonic Boom / Dragon Rage / Defense Curl / Rollout turns, a few rows already at the ROM jump by 12 .. 17) and **hpd8** (+6 / +8 on rows that already sat at 0 .. +1: Hypnosis, Agility, Encore, Confuse Ray in section 3).

Exact rows (offset 0) lost, by step, 36 in all families: hpd4 22 (SE 242 10, Low Kick 6, Wish 4, controller 13 / 114 one each); hpd8 14 (SE 152 6, SE 228 2, SE 102 2, Hypnosis 4). Gained 21: hpd4 5 (SE 152 3, 228 1, 102 1); hpd8 14 (Double Edge 5, Swagger 5, Calm Mind 3, controller 15 1); ais4 2 (controller 15, cry). pau2 / mem2 / kno3 / pau3 / adp1 / hpd5 lose or gain no exact row.

Best movers aud263 -> now (mass): Rock Slide 3,058 -> 858 (-2,200, kno3), SE 148 3,600 -> 1,602 (-1,998, pau2 / kno3 / pau3), Fire Blast 1,099 -> 271 (-828, pau2), cry 2,857 -> 2,387 (-470), controller SE 15 1,609 -> 1,286 (-323), SE 114 676 -> 425 (-251), Blizzard 442 -> 221 (-221, hpd8), Soft-Boiled 483 -> 300 (-183, pau2), controller SE 16 -182, SE 13 -163.

### 6. Verdict and next steps

1. **Event parity is unchanged: 0 missing / 0 extra, 25 seeds, at every intermediate build.** Nothing landed this run regressed an event.
2. The landed steps removed **15.2 % of the T2 offset mass** (66,137 -> 56,070; 15.3 % on aud263's own 21 seeds); two thirds of that is the two single-window fixes (kno3 Knock Off item animation, pau2 Horn Drill pause) that out1 / out2 predicted to within a few frames, and hpd8 is a broad small win (-2,922 over 770 rows) with an overshoot on rows already near 0.
3. What is left, by mass: **unaudited bodies 26 %** (Leech Seed 1,771 is the top single body and a measured constant, -29 .. -38; Swagger's s6 window 1,276; Blizzard, Calm Mind, Toxic, Bulk Up), **status / general anims 21.5 %** (SE 152 / 228 / 102 group -2 and SE 142 -6.5, SE 148 -9.5 at 1,602), **controller / message rows 18 %**, **shape B 4.5 %** (Solar Beam unleash -62), shape C 2.6 %.
4. Suggested order (measurement first; each moves frames, so census eventsDigest identity + soaks + the pin notes + the FULL suite): Leech Seed (a window per side: one constant, 1,771 mass), Solar Beam unleash length (shape B, hpd7b already measured), Swagger's s6 window (out1 B), then hpd7c-style bodies Blizzard / Calm Mind / Toxic / Bulk Up.
5. Tooling: `tools/audio/t2Attribute.py ROMDIR OUT.json LABEL=ENGINEDIR ...` replays nothing; it scores engine dirs from `soundCensusRomReplay.ts replay` against one ROM dir, so a step bisect is 4 s per seed per commit (`git worktree` at each commit; an aud249Rescore-style loop). Reusable for any future step.

## ctl1 (2026-11-18): controller / message sound rows (SE 13 / 12 / 16 / 15, cry) split into inherited vs the emitter's own offset (measurement only, no `src/` change)

Tooling added: `soundCensusRomReplay.ts --cmdtrace=1` (adds `cmds` to the engine JSON: frame, segment, command index, type, battler, timing lead / bodyLead of every presented resolution command) and `tools/audio/t2Anchor.py ENGDIR OUT.json [seeds]` (matches the rows the way `soundSegmentDiff` does and adds, per row, the engine / ROM spacing to the neighbouring matched row and the engine command in progress). Engine = master `34563dbd0` (no `src/` change in this step), seeds 2 165 1028 2741 3738 5569 8108 648, Scene ON: **2,359 matched rows, 0 missing, 0 extra.**

### 1. Scoreboard (engine minus ROM, frames from the segment start)

| row | n | exact | median | p10 | p90 | sum abs |
| --- | --- | --- | --- | --- | --- | --- |
| SE 13 effective | 145 | 19 | -3 | -18 | 2 | 1,364 |
| SE 12 not effective | 36 | 5 | -8 | -24 | 0 | 496 |
| SE 16 faint | 36 | 3 | -4 | -22 | 24 | 484 |
| SE 15 ball open | 38 | 2 | -11 | -23 | 0 | 504 |
| cry | 73 | 4 | -8 | -24 | 14 | 960 |
| all rows | 2,359 | 205 | -2 | -20 | 5 | 19,497 |

### 2. Result of the split: the emitters' own offsets are exact; what is left is inherited

Within a window the emitters' spacings to their anchors equal the ROM's: SE 15 -> cry 16 / 16, faint cry -> SE 16 66 / 66, SE 114 -> SE 15, and the lead-body SE 13 / 12 / 14 sit at 0 from the move-animation end. Every residual offset of these rows is the offset of the whole window at the anchor, i.e. the anchor command itself is early or late; **no emitter constant (`SCENE_ON_LAG`, `FAINT_SOUND_OFFSET`, `FAINT_CRY_BEFORE_SE`, `SWITCH_*_BALL_OPEN_*`) can be moved toward the ROM without moving another row of the same window away from it** (tried: the faint cry own offset against the hp end, which is about 9 early; shifting it only trades one row for the other). So no Tier-1 test or emitter change was made.

### 3. Top inherited sources (rows x |offset|, 8 seeds)

| # | source (command the row hangs from) | rows | sum abs | median | what it is |
| --- | --- | --- | --- | --- | --- |
| 1 | SE 13 after `hit-animation` | 132 | 1,308 | -2 | the move-body tails of the bodies still on the old lead-in-tail (hpd4 / hpd5 audited six) and the hp command's 28-frame floor (below); hit start itself is early by the body tail |
| 2 | faint cry + SE 16 after `faint` | 36 + 36 | 484 + 484 | -4 | the hp end the faint command is chained on (about 9 early) plus the HP floor of the lethal hit; spacings inside are exact |
| 3 | SE 12 after `hit-animation` | 32 | 431 | -7 | same bodies as 1; not-effective moves are the long-tail bodies |
| 4 | SE 15 + cry after `switch-in` | 19 | 255 + 255 | -10 | forced-switch anchor artifact (below) |
| 5 | SE 15 + cry after `sprite-visibility` / `trainer-slide` | 13 + 4 | 148 + 86 | -12 / -19 | species-dependent ball-open lag (0 / 3 / 7 in the ROM, the engine uses one `PARTY_SEND_OUT_BALL_OPEN_RELEASE_CLOCK = 143`) and the trainer-slide window |

Findings behind the table:
- **Forced-switch anchor artifact.** `romDecisionDriver.py:275` sets the ROM commit frame at the FIRST A in the party menu (`commitFrame = frame + 1`); the engine's commit is when the SEND OUT confirm closes `forcedSelector()`. That shifts the T2 segment start by 9-12 frames for forced-switch windows. Re-anchored on the ROM's own events the switch-in SE 15 / cry offset goes -12 -> -3. A harness anchor, not an engine timing error.
- **HP 28-frame floor.** `HP_TIMING.minimumFrames = 28` (battleResolutionPresentation.ts) puts the engine's hit start -> hp end about +16 frames over the ROM on non-foe-hit shapes (n about 91 of the SE rows). docs/hpd1-hp-hold.md calls it a fit, not a ROM rule, but player-hit and shape-b hits keep it because removing it moved the off108 anchor -3 -> -14. Moving it is hp / window work, not a controller emitter change; left for a step that owns the HP command.
- **Weather loop.** SE 13 of `BattleScript_DamagingWeatherLoop` is scheduled from the loop's hit start, which has no move body; a constant lag fits the window it sits in only.
- **Ball-open lag by species** 0 / 3 / 7 (the Magby-calibrated 143 is the middle); the ROM value depends on the sprite / ball sequence, not a script constant.

### 4. Open remainder
The offset mass of these families is the offset of their anchor commands (move-body tails, HP floor, forced-switch anchor, ball-open species lag). Out of scope here (liv2 / sta5 own the bodies); the next lever is the HP command timing with the off108 anchor re-measured, then the per-species ball-open lag.

## t2o (2026-11-18): Scene OFF T2 re-measured on master `e768c82b4` after pau2 / pau3 / mem2 / kno3 / hpd8 / ais4 / hpf1 (measurement only, no `src/` / `tests/` change)

Method: the aud248 chain (`tools/audio/aud248RunSeed.sh SEED off DIR`: request, ROM setup, engine replay, closed-loop ROM drive, `romStateTimeline`, compare, ROM sound pass) run **fresh** on `e768c82b4` (the worktree's base, pinned; no engine file changed) for **24 Scene OFF seeds**: the **20 aud263 OFF seeds** (2 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6568 6912 7295 7682) plus the **4 census seeds t2r added for ON, never T2-driven OFF: 97, 310, 319, 648** (same seeds, so ON / OFF are comparable per seed). OFF oracle `:8014` only, `nice -n 10`, 2 seeds at a time, ~1.6 min per seed. Every drive ended `stop outcome`, `matched == engineStates`, no divergence, `engineError null` (24 / 24). Scoring: `soundScoreboard.py` (unchanged). Attribution: `tools/audio/t2Attribute.py` gained `--scene=off`: Scene OFF has no move bodies, so an OFF row's cause is the **engine presentation command it falls in** (`soundCensusRomReplay.ts replay --cmdtrace=1`, the ctl1 trace), as `ctl:<id>@<command>`, `cry@<command>`, `stat:<id>@<command>`, `bgm@<command>`; the key of a row is its ROM frame, so the same row is followed through every build and takes its cause from the HEAD trace. Step attribution: the engine at each landed step replayed over the **same ROM files** (git worktrees at `f6edfc6b9` aud263, `ef94a58af` hpd4, `a26352df1` hpd5 (Ice Ball `93306ce12` is an ancestor), `ccbf70269` pau2, `652e53159` mem2 (contains the OFF fix `0d229f5ed`), `f047ca4f5` kno3, `2a4fef0b1` hpd8, `87bf77283` pau3, `26477cf4b` ais4, `5675eed7a` hpf1, then HEAD), with HEAD's `soundCensusRomReplay.ts` copied into each so the replay driver is identical (`bal1` changed the driver's switch commit anchor, below). Evidence (ignored): `.integration/evidence/t2o/` (`<seed>-off.*`, `steps/<commit>/`, `t2o-attr.json`, `scoreboard.txt`). No `src/` / `tests/` file touched; `npm test` not run (measurement step, per the assignment). `lbw7` / `lbw8` (Lobby) and `luck6` (designs) are outside the battle sound path and were not replayed as steps; `dl3` / `ctl1` / `bal1` / `lse1` were checked as one build (`d777ff89b`, the hpf1 parent): 0 rows moved vs ais4.

### 1. Missing / extra (the headline): 0 / 0

**0 missing and 0 extra rows in every family, 24 / 24 seeds** (also at every one of the 10 engine builds replayed in section 3, 1,133 matched rows each). `move-animation SE`, `fanfare`, `screen SE`: 0 rows (Scene OFF plays no move body, no fanfare in the compared window). Same (kind, id, pan) in order everywhere; only the frame differs.

### 2. Family table, aud263 vs now (engine minus ROM, frames from the segment start; median / p10 / p90)

Three columns, because `bal1` (T2 driver: a switch is committed at the SEND OUT / SHIFT confirm, not the first party-menu A) moved the **measurement** of 81 send-in rows by +5 .. +12 between aud263 and now: (A) aud263 as scored then, (B) the aud263 **engine** (`f6edfc6b9`) replayed over today's ROM files and driver (the engine-only baseline; 81 of its 971 rows differ from (A), 33 of them the SE 15 + cry pairs after `sprite-visibility`, +9, mass 7,664 -> 6,935), (C) now.

| family (20 aud263 seeds) | A aud263 as scored: exact / offset, med / p10 / p90 | B aud263 engine on today's ROM | C now: exact / offset, med / p10 / p90 | all 24 (4 new seeds in) |
| --- | --- | --- | --- | --- |
| battle-controller SE | 22 / 695, -3 / -13 / 8 (n 717) | 40 / 677, -3 / -12 / 8 | **44** / 673, -3 / **-10** / **4** | 67 / 765, -3 / -10 / 2 (n 832) |
| stat-change SE | 16 / 73, 2 / -7 / 11 (n 89) | 16 / 73, 2 / -7 / 11 | **21** / 68, **0** / -6 / **4** | 24 / 81, 0 / -6 / 4 (n 105) |
| cry | 2 / 159, -7 / -17 / 15 (n 161) | 20 / 141, -3 / -17 / 15 | **23** / 138, -3 / **-11** / **11** | 32 / 160, -3 / -11 / 11 (n 192) |
| bgm | 0 / 4, 12 / -19 / 22 (n 4) | 0 / 4, 12 / -19 / 22 | 0 / 4, **-2** / **-13** / 23 | 0 / 4, -2 / -13 / 23 |
| move-animation SE, fanfare, screen SE | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

(aud255's OFF numbers on the same 20 seeds are the same to within a frame: controller -3 / -13 / 8, stat 2 / -8 / 10, cry -7 / -17 / 15; 0 / 0.) Sum of abs(offset) over the 20 seeds' 971 rows: **7,664 (A) / 6,935 (B) -> 5,213 (C) = -32.0 % / -24.8 %** (controller 5,159 -> 3,766, cry 1,931 -> 1,032, stat 519 -> 373, bgm 55 -> 42). All 24 seeds, 1,133 rows: **7,979 (B) -> 6,125 (C), -23.2 %**; exact rows 107 -> 123. The four new seeds alone: 162 rows, mass 912 (controller median -2 / p10 -13 / p90 1, cry -1 / -15 / 12, stat 3 / -11 / 3): same shape as the old seeds. The Scene OFF offsets are already small next to Scene ON (aud263 ON / t2r: median -2 .. -10, p10 -20 .. -28): median -3, p10 -10 .. -12.

**Worse than aud263 (every one a shift toward the next command's offset or a small overshoot, no event moved).** Rows by family worse than the engine-only baseline B: controller 48 rows (+213 mass; better 193 rows, -1,305), cry 22 (+84; better 83, -686), stat 5 (+5; better 24, -152), bgm 1 (+1). Net worse 76 rows / **+303 mass against 302 rows / -2,157**. The p90 of nothing rose against A or B: controller p90 8 -> 4, cry 15 -> 11, stat 11 -> 4; **bgm p90 22 -> 23 (n 4, one frame)**. By cause: `ctl:13@hit-animation` 8 rows +78, `cry@faint` and `ctl:16@faint` 14 rows +62 each, `ctl:15@switch-in` / `cry@switch-in` 8 rows +22 each, `ctl:114@party-summary` 8 rows +16, `ctl:14@hit-animation` 2 rows +15, `ctl:15@trainer-slide` 6 rows +12, `ctl:90@hp` 1 row +7. Which step: **hpf1** 60 rows +241 (its +5 on faint-chain rows that already sat at 0 .. +1: of the 63 cry@faint / SE 16 rows it moved, 12 end worse), **hpd4** 36 rows +100 (16 `ctl:13@hit-animation` rows +1 and a few rows that moved -16 / -17, the post-hit-hold shift t2r saw ON), **pau3** 5 rows +50 (s499 faint / send-in window +7 -> +17: the +10 SafeguardEnds pre-print row lands on a window that pau2 had already brought to +7; the ROM row is measured, the residual is another anchor), ais4 30 rows +30 (the 18 -> 17 send-in elapsed, +/-1), pau2 / kno3 3 rows +3 each. Nothing in the OFF family got worse in total.

### 3. Which step moved which rows (24 seeds, 1,133 matched rows; mass = sum abs(offset); 0 / 0 at every build)

| step (commit) | rows moved (toward 0 / away) | mass | biggest movers (rows, shift) |
| --- | --- | --- | --- |
| aud263 engine on today's ROM (`f6edfc6b9`) | | 7,979 (exact 107) | |
| hpd4 (`ef94a58af`) | 103 (67 / 36) | 7,956 (-23) | 16 `ctl:13@hit-animation` rows +1; away: 2 SE 13 rows -16, SE 245 -17 (post-hit hold shifts) |
| hpd5 Ice Ball / Seismic Toss | 0 | 7,956 | none (Scene ON bodies) |
| **pau2** (`ccbf70269`) | 14 (11 / 3) | **7,615 (-341)** | **s1028 res: SE 13 -70 -> +1, the faint / send-in rows after it -49 .. -52 -> +19 .. +22 (+71 / +72 shift)**; s499 faint / send-in window -25 .. -31 -> +1 .. +7 (+32). Both windows are Horn Drill-type KOFail / AlreadyPoisoned used-move holds; the s1028 window now overshoots by +19 .. +22 on its tail rows (s1028 and s165 are the Horn Drill / Knock Off windows t2r found ON) |
| mem2 (`652e53159`, OFF no-hit pause `0d229f5ed`) | 0 | 7,615 | none: no Memento / Explosion / Self-Destruct in these 24 seeds (`gCurrentMove` 120 / 153 / 262 absent), so no row to move |
| **kno3** (`f047ca4f5`) | 12 (9 / 3) | **7,377 (-238)** | the 35-row Knock Off Pausex20 hold: s165 window -29 .. -35 -> -1 .. -7 (6 rows, +28), s499 window -25 / -35 -> +14 / +4 (+39: overshoot on the SE 13) |
| hpd8 (`2a4fef0b1`) | 0 | 7,377 | none (Scene ON lead + tail) |
| pau3 (`87bf77283`) | 5 (0 / 5) | 7,427 (+50) | s499 window +7 -> +17 (faint cry / SE 16 / party summary / send-in SE + cry), see section 2 |
| ais4 (`26477cf4b`) | 80 (50 / 30) | 7,405 (-22) | send-in SE 15 + cry elapsed 18 -> 17: 32 pairs +1, 7 pairs -1; exact rows 106 -> 112 |
| **hpf1** (`5675eed7a`; parent `d777ff89b` = ais4 row for row) | **293 (231 / 60)** | **6,125 (-1,280)** | **the largest step OFF**: hit hp command floor-free on the player: `cry@faint` / `ctl:16@faint` 63 + 63 rows (-315 each), `ctl:15@switch-in` + `cry@switch-in` 24 + 24 (-116), `ctl:114@party-summary` 22 (-108), `ctl:13@hit-animation` 37 (-104), `stat:245@stats-change` 17 (-103); shifts +5 (74 rows), +3 (40), +1 (22), -17 (13: SE 245 rows), -6 (11) |
| HEAD (`e768c82b4`) | 0 vs hpf1 | **6,125 (exact 123)** | the lbw / luck6 / ctl1 / bal1 / dl3 / lse1 commits after hpf1 move no OFF row |
| **net aud263 engine -> now** | | **7,979 -> 6,125 (-1,854, -23.2 %)** | |

What this says: **hpf1 (the floor-free hit hp command; bisected: the engine at its parent `d777ff89b` is identical to ais4 on all 1,133 rows, so dl3 / ctl1 / bal1 / lse1 move none) is 69 % of the whole OFF gain** (1,280 of 1,854; mass 7,405 -> 6,125 over 293 rows) and **pau2 + kno3 are the two single windows** (579 together, 26 rows). **hpd8, hpd5, mem2 and adp1 move zero OFF rows**: hpd8's lead + tail is Scene ON only, hpd5 bodies are ON, mem2's OFF fix has no Memento / Explosion in these seeds. The OFF family had no move-animation SE at all, so the ON steps with the largest ON effect (kno3 item animation 2,200 of ON mass) show up here as 238.

### 4. t2off-style table: top 15 causes by rows x abs(offset) now (24 seeds, total mass 6,125 over 1,133 rows)

Cause = `row id @ the engine command the row falls in`; SE 16 (faint) and the faint cry, SE 15 (ball open) and the send-in cry are always a pair (same rows, same offset: their rows are chained 66 / 16 frames apart, ctl1), so each pair is one window counted twice.

| # | cause | rows | median | rows x abs(offset) | share | class | of which new seeds | aud263 engine (B) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `ctl:13@hit-animation` (SE_EFFECTIVE) | 380 | -3 | 1,690 | 27.6 % | controller row after the hit: the message / script pause + hp hold before it; one window dominates the tail (s7682 Struggle 10 rows +20 .. +29 = 243) | 144 | 1,886 |
| 2 | `ctl:16@faint` (SE_FAINT) | 103 | -3 | 794 | 13.0 % | controller row on the faint command (the hp-end chain; spacing to the cry exact) | 130 | 1,190 |
| 3 | `cry@faint` | 103 | -3 | 794 | 13.0 % | cry, same rows as 2 (pair) | 130 | 1,190 |
| 4 | `ctl:12@hit-animation` (SE_NOT_EFFECTIVE) | 117 | -3 | 524 | 8.6 % | controller row after the hit (3738 Aerial Ace window -42 x 2 = 84; 319 Brick Break +63) | 75 | 589 |
| 5 | `ctl:15@switch-in` (ball open) | 42 | -5.5 | 379 | 6.2 % | controller / send-in (forced and AI switch, anchor + ball-open lag) | 90 | 585 |
| 6 | `cry@switch-in` | 42 | -5.5 | 379 | 6.2 % | cry, same rows as 5 (pair) | 90 | 585 |
| 7 | `ctl:114@party-summary` | 34 | -6.5 | 335 | 5.5 % | controller row (party summary tray) | 86 | 519 |
| 8 | `stat:239@stats-change` (stat up) | 63 | 2 | 247 | 4.0 % | stat-change message / Pausex20 rows | 66 | 271 |
| 9 | `ctl:14@hit-animation` (SE_SUPER_EFFECTIVE slot) | 51 | -3 | 241 | 3.9 % | controller row after the hit (6568 Brick Break +63) | 34 | 245 |
| 10 | `ctl:15@trainer-slide` | 20 | -8 | 218 | 3.6 % | send-in at the trainer slide (first send-out) | 38 | 235 |
| 11 | `stat:245@stats-change` (stat down) | 42 | 0 | 192 | 3.1 % | stat-change rows (s1914 one row -69 = 36 %) | 0 | 315 |
| 12 | `ctl:90@hp` | 24 | -1 | 79 | 1.3 % | controller row on the hp command | 10 | 99 |
| 13 | `ctl:15@sprite-visibility` | 43 | 0 | 77 | 1.3 % | send-in ball open (first send-out) | 7 | 77 |
| 14 | `cry@sprite-visibility` | 43 | 0 | 77 | 1.3 % | cry, same rows as 13 | 7 | 77 |
| 15 | `bgm@message` (victory BGM) | 4 | -3 | 42 | 0.7 % | BGM after the last message | 0 | 55 |

The top 15 hold 6,068 of 6,125 (99.1 %). By the engine command the row hangs from (rows / mass now / mass B): `hit-animation` 548 / 2,455 / 2,720 (40.1 %), `faint` 206 / 1,588 / 2,380 (25.9 %), `switch-in` 84 / 758 / 1,170, `stats-change` 105 / 439 / 586, `party-summary` 34 / 335 / 519, `trainer-slide` 20 / 218 / 235, `sprite-visibility` 86 / 154 / 154, `hp` 28 / 85 / 105, `message` 13 / 71 / 86, other 9 / 22 / 24. By class: controller / message rows 4,385 (71.6 %), cry 1,259 (20.6 %), stat-change 439 (7.2 %), bgm 42 (0.7 %). **Rows at abs(offset) >= 20: 48 rows hold 1,561 (25.5 %)**; the largest windows are single (seed, cause) groups: **s7682 Struggle (`gCurrentMove` 165) SE 13 +20 .. +29 on 10 consecutive hits = 243, plus its KO faint cry / SE 16 +63 x 2 = 126** (~6 % of all OFF mass, one window, unchanged since aud263: +21 .. +29 then), s3738 Aerial Ace (332) SE 12 -42 x 2 and faint -44 x 2, s2741 one SE 13 -37 (no move set), s1914 SE 245 -69, **s319 Brick Break (280) SE 12 +63 and s6568 Brick Break SE 14 +63** (a Brick Break window the engine is 63 late on, in two seeds), s6568 Struggle faint +37 x 2, s648 Earthquake (89) faint / send-in chain -43 .. -34 (new seed). These are named from the ROM `gCurrentMove` at the row, not yet traced to a script command.

### 5. Verdict and next steps

1. **Event parity unchanged: 0 missing / 0 extra, 24 Scene OFF seeds (20 aud263 + 4 new), at every intermediate build.** Nothing landed this run regressed an OFF event.
2. The OFF offsets were already small (median -3, p10 -12): the landed steps removed **23.2 % of the OFF mass** (7,979 -> 6,125; 24.8 % on aud263's 20 seeds on the same ROM files), 69 % of it from hpf1, 31 % from pau2 + kno3's two windows. The p10 / p90 tails narrowed in controller (-13 / 8 -> -10 / 4), cry (-17 / 15 -> -11 / 11) and stat (-7 / 11 -> -6 / 4); the medians sit at -3 (controller, cry) and 0 (stat). Nothing family- or cause-level is worse than aud263 beyond the small overshoots listed in section 2.
3. What is left, by mass: **controller rows after the hit-animation command (40 % of all mass, 380 SE 13 rows median -3: the inherited hit offset, ctl1 section 3)**, the **faint chain (26 %: SE 16 + faint cry, median -3, a few outliers at +63 / -44)**, the send-in chain (switch-in / party-summary / trainer-slide, 18 %), stat-change rows (7 %). Single windows that stand out: **s7682 Struggle (+20 .. +29 x 10, 6 % of the mass)** and **Brick Break +63 (two seeds, 126)**, **Aerial Ace -42**, **Earthquake faint chain -43**: each a candidate for a ROM probe of the script command (OFF has no animation, so these are pauses / message holds). Not measured here: OFF-specific causes inside a move (no OFF body exists, so no per-body table), ON vs OFF per-seed difference, other seeds beyond census 0..999's four.
4. Suggested order (measurement first; each moves frames: census eventsDigest identity + soaks + pin notes + the full suite): the s7682 Struggle window (one body, 10 rows), the Brick Break +63 window (two seeds), then the send-in anchor (ctl1 / bal1 numbers).
5. Tooling: `tools/audio/t2Attribute.py --scene=off ROMDIR OUT.json LABEL=ENGINEDIR ...` (engine dirs from `soundCensusRomReplay.ts replay --cmdtrace=1 --scene=off`); the `soundScoreboard.py` subset of 20 seeds needs `cmp` / `drive` / `snd` / `engine` files in one directory (symlinks work).

## c1k (2026-11-19): census 0..999 both scenes on `93dc3201d` vs the aud263 arms (verification only)

Base `93dc3201dcdbb81070d2e7d2f80a441cae6674b0` (`workspace/src` tree `30aab9b15a26d7ba50b6755597177120942cc700`; the last commit before this section). Method of aud263: `LSD194_CENSUS_JOBS=4 LSD194_SPLIT=10 sh tools/integration/lsd194Census.sh <fresh-root> HEAD:on HEAD:off` (10 shards x 10 parts, one `git archive` tree per arm, the HEAD `lsd194Census.ts` copied in), 1000 / 1000 seeds per scene, 9 min 14 s wall for both arms. Compared with the aud263 arms `.integration/evidence/aud263/census/{on,off}-d8e807b20` (main tree). `d8e807b20..HEAD` holds 46 commits that touch `src/`. No `src/` or `tests/` file changed here; no `npm test`; one census-tool fix (section 4). Evidence (ignored): `.integration/evidence/c1k/` (`census/`, `census2/` = the ON arm re-run with the fixed census tool, `t1-*.txt|json`, `bis*/` intermediate-commit arms, `fb/` frame-budget seeds).

### 1. eventsDigest / error per seed vs aud263

| Scene | seeds identical (digest + error) | different | cause |
| --- | --- | --- | --- |
| ON | 998 / 1000 | **796, 995** | both end `Error: frame budget` in both arms; the budget cuts the battle at a different point, so the digest of the truncated run differs |
| OFF | 998 / 1000 | **796, 995** | same |

Not a gameplay change, checked two ways. (a) The aud263 run's sequence of `message` / `faint` / `switch-in` commands (type, battler, text) is an exact **prefix** of this run's in all four arms (ON 796 1,336 -> 1,342 messages, ON 995 1,092 -> 1,097, OFF 796 1,714 -> 1,745, OFF 995 1,593 -> 1,611): the same battle, cut later. (b) Where the cut moved, by census of seeds 796 / 995 on intermediate trees (digest, command count):

| Scene | aud263 `d8e807b20` | after hpd8 `b6245066e` | after hpf2 `d6ef8fb3a` (= HEAD values) |
| --- | --- | --- | --- |
| ON 796 | `c9d29127` 3,643 | `32face0d` 3,621 | `efe27c72` 3,661 |
| ON 995 | `14d7e6e6` 3,311 | `6773bc0e` 3,295 | `3361d459` 3,326 |
| OFF 796 | `9475af7a` 4,724 | unchanged (also at `2a4fef0b1`, `87bf77283`, `70b797e28`) | `cc877d94` 4,812 |
| OFF 995 | `0bf40a52` 4,824 | unchanged | `54bc3c76` 4,880 |

ON moved first at `2a4fef0b1` (merge carrying hpd8; `b6245066e` alone, `047a1a3dd` ais4 alone still the aud263 value) and again at hpf2 (`d6ef8fb3a`, a single commit on top of `70b797e28`); OFF moved only at hpf2. Both are presentation-length commits (hp holds), so the frame budget reaches a different turn. The other 998 seeds: eventsDigest and error identical in both scenes, so no gameplay / RNG / damage / order / facility difference; the seed-0..99 shard is also identical to aud263 at nine intermediate commits (`f047ca4f5 2a4fef0b1 26477cf4b d2e439d06 70b797e28 26ed71da7 f9cdc9c47 79cb88491` + HEAD, 0 differences).

**Command sequences** (`rst197CensusDelta.py`: 906 / 1000 battles changed some command's frames in both scenes, expected from the timing commits): **92 seeds per scene (the same 92) have a different command-type sequence**, all pure insertions (no deletion) of a command the aud263 build did not present:

| Scene | inserted | cause (bisected on seeds 0..99 / 0..9 across commits) |
| --- | --- | --- |
| ON | 98 `move-animation` (`pause`, 42 rows) | `87bf77283` pau3 (SafeguardEnds pre-print row 32 + 10): `87bf77283^` 0, `87bf77283` 2 on seeds 0..9, both scenes |
| ON | 65 `general-animation ITEM_KNOCKOFF` | kno3 (`173bd72fd` / `2e95de37b`, in merge `f047ca4f5`): 0 -> 7 on seeds 0..99 at `f047ca4f5` |
| OFF | 98 `move-animation` (`pause`, 42 rows) | pau3, as above |
| OFF | 65 `move-animation` (`pause`, 35 rows) | kno3 (`173bd72fd`, Scene OFF 35-row Pausex20 hold) |

The 42-row pause carries the segment's last "used" text (e.g. seed 0 "Foe WOBBUFFET used COUNTER!"), it is not a Counter command. `move-animation` commands in the census (the T1 command count): ON 41,331 -> 41,430 (+99 = the 98 pau3 pauses + 1 in the extra tail of the two frame-budget seeds; as classes: pause 14,225 -> 14,323, live +4 incl. the three adp1 moves, static -3); OFF 47,402 -> 47,584 (+182 = 98 pau3 + 65 kno3 pauses + 19 in the longer tails of seeds 796 / 995, whose OFF runs now end 88 / 56 commands later).

### 2. T1 (`soundCensusDelta.py --t1`)

OFF, `off-93dc3201d`: 47,584 move-animation commands, all `HITMARKER_NO_ANIMATIONS`; exact / known-offset / missing (all classes) / extra / unclassified **0 / 0 / 0 / 0 / 0**; non-move exact 4,621 (same as aud263), 0 / 0 / 0 / 0; Castform 24 + stats-change 4,597.

ON, first reading `on-93dc3201d` (census tool unchanged): exact 268,935, missing-declined **876**, extra **876**, other classes 0, unclassified 0 (non-move exact 119,064 = aud263 119,054 + 10, 0 / 0 / 0 / 0). **Headline, then explained**: the 876 + 876 are Calm Mind (347) 112 commands / 336 rows, Cosmic Power (322) 60 / 180, Encore (227) 36 / 360. A scratch rescoring (`.integration/evidence/c1k/scratch_t1.py`, the scorer with the age-0 frame voted from the emitted rows) shows every one of the 208 commands emits **all** its table rows under one per-command shift, no leftover row: the emission is the table's, the scorer just had no age-0 frame. Cause: `lsd194Census.ts` records the body age-0 frame only on the row where `liveMoveSourceAge(...).age === 0`; lse2 (`8debeebd8` Cosmic Power / Calm Mind, `5fe920b5a` Encore; `lse2BodySoundAgeShift`) starts the sound clock at age 1 / 2 on the first presenting row, so age 0 is never seen, `soundAnim[7]` stays null and the scorer calls the command "declined" and its rows "extra". Bisect (seeds 0..99, ON): `70b797e28` 0 / 0 / 0, `8debeebd8` 11 / 0 / 3, `5fe920b5a` 11 / 1 / 3 (Calm Mind / Encore / Cosmic Power null-age commands), unchanged through HEAD.

### 3. Scene ON static-field commands

`static:*` playback class (census field 21, Scene ON): **1** (`static:other:unattributed-gate-301`, seed 950, "Foe SEALEO used ICE BALL!"), **not 0**. It is not new: aud263 had 4 (the same Ice Ball one + `no-adapter-unscripted` Withdraw 51 / Rock Smash 492 / Beat Up 835, which adp1 then made live). The `approx:*` classes are unchanged (44 + 19 + 9 + 2 + 6 + 10 + 33 + 28 + 3 + 13 + 1 + 6 = 174, same counts as aud263). Scene OFF `live` 51 / `pause` 47,535 (aud263 51 / 47,353).

### 4. Tool fix and final T1

`tools/integration/lsd194Census.ts`: `if (src && src.age === 0) a[7] = frame` -> `if (src && src.age >= 0) a[7] = frame - src.age` (the age-0 frame of a body whose first presenting row is already past age 0; any move that reaches age 0 on its first seen row or later records the same frame as before). Commit `2f88532bd`; `npm run build` exit 0. ON re-run into `census2/` (same HEAD tree, fixed tool, 1000 seeds, 6 min): against the first ON arm **eventsDigest / error 0 differences, commands 0, sound rows 0, soundAnim differences only `[7]` null -> value on exactly those 208 commands** (347: 112, 227: 36, 322: 60). T1 ON then: **exact 269,811 (= 268,935 + 876), known-offset 0, missing 0 (gated 0, declined 0, cry-task 0, other 0), extra 0, unclassified 0**; non-move exact 119,064, 0 / 0 / 0 / 0; the 5 aud263 declined rows (adp1) are gone. OFF needs no re-run (its T1 does not use the age).

### 5. Verdict

1. Gameplay / RNG / events: **identical on 998 / 1000 seeds in both scenes; the two others are the frame-budget seeds, the same battle cut later (hpd8 for ON, hpf2 both scenes)**. No unintended gameplay change.
2. Presentation: 92 seeds gain commands (pau3 42-row pauses 98 both scenes, kno3 65 both scenes), nothing is removed.
3. T1 **0 / 0 / 0 in both scenes after the census-tool fix**; before it, ON read 876 declined / 876 extra, a scorer blind spot (age-0 frame) opened by lse2, not a sound defect. Any census arm made with the older `lsd194Census.ts` will show those 876 rows again (the aud263 arms predate lse2).
4. Static-field commands: 1, not 0 (Ice Ball seed 950, pre-existing).
5. Not done: no `npm test` (verification step); T1 is self-consistency, not ROM parity (T2 is the scorer, last run in the t2r / t2o sections).

## t2n (2026-11-20): Scene ON and OFF T2 re-measured on master `29688b8cd` after pau4 / pau5 / btn1 / hpf5 / lead2 / lead3 / lead4 and the lse / hpf1-2 / sta5 steps since t2r / t2o (measurement only, no `src/` / `tests/` change)

Method: the t2r / t2o chain unchanged (`tools/audio/aud248RunSeed.sh SEED on|off DIR`, fresh ROM drive, then `soundScoreboard.py`, `t2Attribute.py`), on this worktree (base `29688b8cd`; this doc's first commit repairs the file, see the end), `nice -n 19`, at most 2 ROM drives at a time. Seeds: **the same 25 Scene ON seeds as t2r** (2 6 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6912 7295 8108 8612 97 310 319 648) and **the same 24 Scene OFF seeds as t2o** (2 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6568 6912 7295 7682 97 310 319 648). Every one of the 49 drives ended `stop outcome`, `matched == engineStates`, `engineError null`, no divergence. Step attribution: the engine replayed at nine master merge points over the **same ROM files** (git worktrees, each tree's own `soundCensusRomReplay.ts`: HEAD's driver does not run on the old trees, so the step columns include any driver difference between trees; `now` uses HEAD's driver). Evidence (ignored): `.integration/evidence/t2n/` (`<seed>-<scene>.*`, `steps/<commit>/`, `t2n-attr-{on,off}.json`, `t2n-steps-{on,off}.json`, `scoreboard.txt`, `cen/` = rank1mCensus ON 0..999). `npm test` not run (measurement step: the assignment forbids it).

### 1. Missing / extra (the headline): 0 / 0, 49 / 49 seeds, at every build

**0 missing and 0 extra rows in every family in all 25 ON and all 24 OFF seeds, and at all nine replayed intermediate builds in both scenes.** The matched rows are the same count as before: **5,877 ON rows, 1,133 OFF rows** (t2r / t2o: the same). Nothing landed since t2r / t2o changed an event; only frames moved.

### 2. Family tables (engine minus ROM, frames from the segment start)

Scene ON, 25 seeds, 5,877 matched rows. Columns: t2r as published; **B** = the t2r engine (`d02f829c8`) replayed over today's ROM files and driver (the engine-only baseline; t2r's published exact counts differ from B only in cry / controller, the `bal1` driver anchor); now.

| family | t2r published: exact / offset, med / p10 / p90 | B: exact, mass | now: exact / offset, med / p10 / p90 | now mass |
| --- | --- | --- | --- | --- |
| move-animation SE | 334 / 4,477, -2 / -17 / 7 | 334, 42,242 | **820** / 3,991, -2 / **-11** / 7 | **26,897** |
| battle-controller SE | 74 / 684, -5 / -23 / 3 | 99, 9,625 | 111 / 647, -4 / **-19** / **0** | 6,484 |
| cry | 6 / 196, -9 / -24 / 13 | 31, 2,651 | 40 / 162, -3 / -17 / 0 | 1,638 |
| stat-change SE | 15 / 86, 0 / -16 / 3 | 15, 1,041 | 36 / 65, 0 / -11 / 4 | 458 |
| bgm | 0 / 5, -23 / -71 / 18 | 0, 152 | 0 / 5, -12 / -72 / -5 | 115 |
| fanfare, screen SE | 0 / 0 | 0 | 0 / 0 | 0 |
| **all** | 429 exact (7.3 %), mass 56,070 | 479, **55,711** | **1,007 exact (17.1 %)**, offset 4,870 | **35,592 (-36.1 % vs B)** |

Move-animation SE exact rows **334 -> 820** (13.9 % -> 17.1 % of all rows overall, 7 % -> 17 % of the family). Rows at abs(offset) >= 20: **414 rows hold 12,001 (33.7 %)**, against 811 rows / 29,150 (52 %) at t2r.

Scene OFF, 24 seeds, 1,133 matched rows (t2o published; B = the t2o engine `e768c82b4` over today's files, identical to the published mass 6,125 / 123 exact):

| family | t2o published: exact / offset, med / p10 / p90 | now: exact / offset, med / p10 / p90 | mass t2o -> now |
| --- | --- | --- | --- |
| battle-controller SE | 67 / 765, -3 / -10 / 2 | 67 / 765, -3 / -11 / **1** | 4,385 -> 4,005 |
| cry | 32 / 160, -3 / -11 / 11 | 34 / 158, -3 / -13 / **1** | 1,259 -> 1,054 |
| stat-change SE | 24 / 81, 0 / -6 / 4 | 25 / 80, **2** / -6 / 4 | 439 -> 353 |
| bgm | 0 / 4, -2 / -13 / 23 | 0 / 4, -4 / -13 / -3 | 42 -> 25 |
| **all** | 123 exact, mass 6,125 | **126 exact**, mass **5,437** | **-11.2 %** |

OFF rows at abs >= 20: 27 rows hold 884 (16 %) against 48 / 1,561 (25.5 %). The OFF family has no move-animation SE (Scene OFF plays no body). The cry p90 11 -> 1 and controller p90 2 -> 1 are the faint / send-in chain anchored on shorter hp holds (hpf2, section 3).

### 3. Which step moved which rows (same ROM files; mass = sum abs(offset); 0 / 0 at every build)

| step (merge point) | what it carries | ON rows moved (toward / away), mass | OFF rows moved (toward / away), mass |
| --- | --- | --- | --- |
| `d02f829c8` (t2r) / `e768c82b4` (t2o) baseline | | 55,711 | 6,125 |
| `3787679f1` (everything between the t2r base and the Mac handoff: lse1 / lse2 / lse3 tables, hpf1-2 heal / recoil / drain holds, sta5, bal1 driver, ais4) | one bulk step; I did not split it | **1,727 (1,397 / 309), 39,379 (-16,332)** | 108 (77 / 31), 5,557 (-568) |
| `2227c7e66` pau4 + btn1 + lead2 B0 / B1 | entry scripts, `\p` / `\l` gates, nine B1 bodies | 54 (40 / 14), -204 | 7 (7 / 0), -15 |
| `0d142ab71` shd1 / rrh5 (stages, Shedinja HP) | no sound change | 0 | 0 |
| `4d68f1456` bgm1 + pau5 mid-battle Intimidate / Trace | stat-decrease SE row 50 frames | 10 (9 / 1), -130 (stat 245 3 rows, -125) | 3, -74 (stat 245 2 rows, -75) |
| `71eb036f5` **lead3 B2** | 76 shape-A bodies | **488 (437 / 33), -2,562** (Bubble Beam 72 rows -480, Magical Leaf 49 -378, Confuse Ray 20 -180, SE 148 42 -168, SE 152 27 -132; away: body 67 13 rows +90, body 68 6 rows +36) | 0 |
| `29fd7cf34` **hpf5** | tick / wrap / weather / Substitute hp lengths | 29 (18 / 10), -17 | 18 (10 / 8), -31 |
| `1e5665469`, `c51ca9044` | no sound change | 0 | 0 |
| HEAD (**lead4 B3**, trn225) | S-class status bodies' lead | **562 (393 / 122), -874** (body 266 65 rows -275, Double Team 216 -198, Bulk Up 21 -81, bodies 258 / 288 -40 each; away: body 259 8 rows +32, 50 10 rows +30) | 0 |
| **net** | | **55,711 -> 35,592 (-20,119, -36.1 %)** | **6,125 -> 5,437 (-688, -11.2 %)** |

The single big ON number is the bulk step `3787679f1`: its biggest movers are Leech Seed (body 73) **1,771 -> 66** (55 rows, the lse1 / lse2 landing), Swagger (207) **1,405 -> 85** (lse1 / sta5), Solar Beam (76) **1,145 -> 246** (the hpd7b / lse unleash window), controller SE 13 -1,027, cry -916: the three bodies t2r named as the top single unaudited ones are done. lead2 B1 alone moves nothing measurable here (the nine B1 bodies sit in 2227c7e66 with pau4 / btn1; -204 total: none of the 25 seeds carries many B1 commands at a measurable offset), hpf5 is a ~0 step in T2 (-17 ON, -31 OFF: its windows are the end-of-turn ticks, a few rows), lead3 B2 is the second largest (-2,562 over 488 rows), lead4 B3 -874 (it was predicted to move rows by the +2 lead on S bodies; 98 of 190 Double Team SE were +2 late before it, now 216 Double Team rows still carry mass 351, see section 4). **OFF**: no step is larger than the bulk 568 (hpf2's heal / recoil / drain holds: `ctl:13@hit-animation` -207, `cry@faint` / `ctl:16@faint` -201 each; the same step makes 31 rows worse by +26 on the party-summary / switch-in chain, `ctl:114` / `ctl:15` / `cry@switch-in` at -1) plus pau5's two stat rows (-75).

**Got worse than t2r (same seeds, engine-only B vs now, per cause):** only small groups: body 67 +90 / 13 rows (+6, lead3), body 68 +36 (+6), SE ctl 15 / ctl 114 / ctl 90 about +13 / +3 / +11 in the `29fd7cf34` step (the hpf5 hold lands on rows that already sat at 0 .. -1), body 259 +32, body 50 +30 (lead4, +4 on rows already late). None is above 90 frames; the net of the worse groups is under 400 against -20,119.

### 4. Top 10 remaining offset groups (cause, scene, mass), and where each comes from

Cause = the row's ROM `gCurrentMove` (`body:<id>` move-animation SEs, `gen:<se id>` = general / status-animation SEs with no move running, `ctl:` controller SEs, `cry`), ranked by sum abs(offset). ON total 35,592 over 5,877 rows; OFF 5,437 over 1,133 rows. By class: ON **bodies 3,899 rows / 17,955 (50.4 %)**, **general / status animations (`gen:*`) 912 / 8,942 (25.1 %)**, controller hit rows (SE 12 / 13 / 14) 475 / 3,968 (11.1 %), controller chain rows (SE 15 / 16 / 114) 251 / 2,334 (6.6 %), cry 202 / 1,638 (4.6 %), stat 101 / 458, bgm 5 / 115. OFF: hit rows 548 / 2,255 (41 %), chain rows 248 / 1,624 (30 %), cry 192 / 1,054 (19 %), stat 105 / 353 (6.5 %).

| # | group | scene | rows | mass | share of scene | largest windows | likely cause (existing docs) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **general / status animations with no move: SE 152 + 228 + 102 (one five-SE group, 4,650), SE 142 1,432, SE 148 1,248, SE 242 380, 219 296, 179 229** (`gen:*` total 8,942) | ON | 912 | **8,942** | 25.1 % | s5063 SE 152 1,143 (-18 .. +27 inside one window), s1415 SE 152 699, s2230 405; SE 142: s648 / s310 / s319 / s6912; SE 148 (Toxic tick): s165 552, s499 516 | **not a lead problem**: the offset changes along one battle (-18 .. +27), i.e. spacing of consecutive status / general plays (lead1m B4: C bodies `T = 2 + gap - pre - post`, gap from the next-event chain; sta5 landed only Flatter / Swagger / Spore / Toxic first plays). t2r had these at 12,032 (21.5 %): 3,090 lower, mostly lse1 / lead3 (SE 148 42 rows -168, SE 152 27 -132) |
| 2 | **controller hit SE 13 / 12 / 14** after `hit-animation` | ON 3,968 (13: 2,553, 12: 832, 14: 583); **OFF 2,255** (13: 1,490, 12: 521, 14: 244) | 475 / 548 | **6,223** | 11.1 % / **41 %** | OFF: s7682 (Struggle) 78 rows now -19 .. +11 (mass 373; was +20 .. +29 x 10 + faint +63 x 2), s3738 Aerial Ace SE 12 -42 x 2 (177), s6568 Brick Break SE 13 / 14 (162 + 72), s2741 one -37; ON: s5063 SE 13 461, s8108 SE 13 449 (-99 .. -76 .. -30 on one move) | inherited hit offset (ctl1 section 3: the move-body tail on old-lead bodies and the hp command's 28-row floor on non-foe-hit shapes, `off108` anchor): hp-command work, both scenes, a few single windows (Brick Break +63 in s319 / s6568 = 126, Aerial Ace -42, Earthquake faint chain, B6 / lse3 residuals) |
| 3 | **faint / send-in chain: controller SE 16 / 15 / 114 + cry** | ON 2,334 + cry 1,638 = **3,972**; OFF 1,624 + cry 1,054 = **2,678** | 453 / 440 | **6,650** | 11.2 % / 49 % | OFF: `ctl:16@faint` + `cry@faint` 577 x 2 (s3738 -44 x 2, s648 +43 x 2 = 86 each), `ctl:15@switch-in` + cry 391 x 2 (median -7), `ctl:114@party-summary` 348 | #222 / ais1-4 (AI switch, forced-switch anchor: ctl1 found a 9-12 frame harness anchor artifact on forced switches), the species-dependent ball-open lag (0 / 3 / 7; bal1: not in the ROM send-out path), the faint hp end 9 early (ctl1), `\p` box clear (#200 / #222). Median of the pair is -3 .. -7; only s3738 / s648 / s97 / s3158 faint windows are far |
| 4 | **Double-Edge (38)** body | ON | 96 | **1,181** | 3.3 % | **s5063 48 rows, +24 x 36 (mass 888)**, s2230 36 rows | landed shape A (hpd8): the +24 rows are the commands AFTER the body (recoil hp print / next command), not the body's own SEs (median +1): a single-window ROM probe of recoil, in the lse3 / lead1m B5 family; unattributed |
| 5 | **Ice Beam (58)** body (+ Bubble Beam 504, Psychic 496, Thunderbolt 433 = the landed shape-A next-command spread) | ON | 206 | **898** | 2.5 % | 132 of 206 rows sit at -2; the mass is a tail of -5 .. -21 on 11 seeds | shape A landed; the residual is the next command's own offset (the t2r finding 'landed shape-A bodies keep 18 % of the mass'); not a lead rule |
| 6 | **Dig (91)** body (charge turn) | ON | 117 | **760** | 2.1 % | **s8108 78 rows, median +6 (481)**, s3738 28 rows | lead1m B6 charge turns (Dig 107 commands per 200 battles, ROM lead 1 for the charge turn and 5 for the attack turn; `CHARGE_TURN_SCRIPT` excluded from the lead rule); census 596 commands in 120 battles / 1000 |
| 7 | **Magical Leaf (345)** body | ON | 119 | **616** | 1.7 % | s3738 70 rows (-16 x 35 = 560) | shape A (hpd8 / lead3 `A`); one window of -16 on the second half of a turn: s3738 only (2 seeds in T2: s499 49 rows at 0 .. -2); census only 162 commands in 57 battles |
| 8 | **Rock Slide (157)** body | ON | 142 | **598** | 1.7 % | s165 60 rows at -5 (the kno3 window's rest), s97 / s310 / s1914 20 rows each | shape A landed; the remaining -5 / -2 / +3 are constant-per-window offsets, small; was 3,058 at aud263, 858 at t2r |
| 9 | **Bulk Up (339)** + **Yawn (281)** | ON | 39 + 33 | **552 + 510** | 1.6 % + 1.4 % | s1415 Bulk Up 36 rows (+35 x 9, +24 x 6, +9 x 9), s1415 / s2230 / s5063 Yawn +22 / +24 | S / status bodies: lead4 B3 landed Bulk Up's lead; Yawn is an unlanded S shape (lead1m 'Yawn 12 (S)', `lse2` Encore / Yawn turn windows); the +24 / +35 rows are later commands of a status turn |
| 10 | **Earthquake (89)** + **Aerial Ace (332)** + **Drill Peck (65)** + **Struggle (165)** single windows | ON | 45 + 33 + 54 + 45 | 474 + 362 + 423 + 425 | 1.3 .. 1.2 % each | Drill Peck s1914 36 rows at 0 and **-45 x 9 (405)**; Aerial Ace s3738 -77 / -41 (318); Earthquake s1415 +35 x 6 | lead1m B5 / B6 (adapter windows, multi-hit second hits, `live` long windows landed in liv2: Earthquake); each is one seed, probe-sized |

Of the ON bodies, the lse3 measured-not-landed set (Absorb 71, Mega Drain 72, Revenge, Recycle, Razor Wind, Wish, Pound / Scratch / Tackle, Giga Drain 202) holds only **297 mass in 163 rows** in these 25 seeds (Wish 148, Giga Drain 141), lead1m **B4** C bodies (Confuse Ray, Thunder Wave, Brick Break, Curse, sleep / paralysis moves) **990 in 270 rows** (Confuse Ray 260, Thunder Wave 259, Curse 221, Stun Spore 150), **B5** (Dragonbreath, Silver Wind, Frustration, Spark, Thunderpunch, Toxic, Swagger, Hypnosis) **846 in 222 rows** (Toxic 360, Hypnosis 157, Frustration 144), **B6** (charge / multi-hit / X: Dig 760, Rest 491, Bounce 127, Solar Beam 246) **1,748 in 229 rows**. So the documented-but-unlanded body classes total about **3,900 mass (11 % of ON)**; the larger remainder (landed bodies' next-command spread, status / general plays, controller chains) is not in those lists.

OFF top groups by (command, mass): `ctl:13@hit-animation` 1,490 (27.4 %), `cry@faint` and `ctl:16@faint` 577 each (10.6 %), `ctl:12@hit-animation` 521, `ctl:15@switch-in` / `cry@switch-in` 391 each, `ctl:114@party-summary` 348, `ctl:14@hit-animation` 244, `stat:239@stats-change` 236, `ctl:15@trainer-slide` 222. The t2o headline windows: **s7682 Struggle +20 .. +29 x 10 is gone** (rows now -19 .. +11, 373 over 78 rows; the faint +63 x 2 is gone too); **Brick Break +63 stays in both seeds** (s319 SE 12, s6568 SE 14: 126); Aerial Ace -42 x 2 stays (s3738); Earthquake faint chain s648 is now +43 x 2 (was -43 .. -34); s1914 SE 245 -69 is gone (pau5 stat rows -75).

### 5. Ranked next steps (rank1m-style; impact = T2 mass in these 25 / 24 seeds, breadth = Scene ON census 0..999 of 1,000 battles, count only)

Census breadth (ON `rank1mCensus`, 1,000 battles, 41,430 move-animation commands, 27,107 `soundAnim` animations): `hit-animation` 18,646 commands in 1,000 battles, `faint` 4,332 / 1,000, `switch-in` 3,640 / 1,000, `general-animation` 7,506 in 864, `status-animation` 8,006 in 775, `stats-change` 3,688 in 828. Per body (commands / battles): Earthquake 908 / 382, Aerial Ace 676 / 274, Dig 596 / 120, Rock Slide 427 / 227, Ice Beam 388 / 190, Double-Edge 335 / 172, Solar Beam 227 / 80, Swagger 128 / 74, Yawn 94 / 51, Drill Peck 96 / 49, Magical Leaf 162 / 57, Bulk Up 51 / 21, Leech Seed 72 / 48.

| rank | item | scenes | T2 mass now | breadth | direction | cost / risk |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **general / status-animation spacing** (`gen:152 / 228 / 102 / 142 / 148 / 242`): one ROM window on s5063 (SE 152 -18 .. +27 across one battle) and one on s1415 / s2230 to find which status command pair carries the drift (lead1m B4 gap rule or a missing hold), then a rule | ON | **8,942 (25 %)** | 7,506 general + 8,006 status commands, 864 / 775 battles | both ways (rows -18 .. +27) | M; the largest single class; new rows, so census digest + the soaks |
| 2 | **hit-controller rows (SE 13 / 12 / 14) = the hp command's remaining shapes** (ctl1 open remainder: the 28-row floor on non-foe-hit shapes with the `off108` anchor re-measured), plus the Brick Break +63 and Aerial Ace -42 windows | both | ON 3,968 + **OFF 2,255** (the largest OFF class, 41 %) | 18,646 `hit-animation` commands in 1,000 battles | mostly toward 0 (median -3) | M-L; touches the pins of many hit tests (hpf1 precedent: -1,280 OFF in one step) |
| 3 | **faint / send-in chain** (ctl 15 / 16 / 114 + cry): the forced-switch harness anchor (a driver fix, not an engine one: -12 -> -3), then the ball-open species lag | both | ON 3,972, OFF 2,678 | 4,332 faint, 3,640 switch-in per 1,000 | mixed | S for the anchor in `romDecisionDriver.py` (measurement side; changes no frames of the app); M for the engine |
| 4 | **single windows >= 20** (414 rows, 12,001 mass in ON; the biggest: s5063 Double-Edge +24 x 36 888, s1415 Bulk Up 459, s1914 Drill Peck -45 x 9 405, s165 SE 148 330, s3738 Aerial Ace 318, s8108 SE 13 288, s5063 SE 13 300; OFF s3738 / s2741 / s319 / s6568 / s648) | both | about **3,000** in the top 8 | per window one seed | toward 0 | S each, out1 style (one ROM window per cause); do these before a rule |
| 5 | **lead1m B6 charge turns** (Dig 760, Solar Beam 246, Fly / Dive / Bounce 127) | ON | 1,200 | 596 Dig / 120 battles, 227 Solar Beam / 80, + Fly / Dive / Bounce | toward 0 (Dig +6, others -13) | M (ROM lead for the charge turn is already measured: 1) |
| 6 | **lead1m B4 C bodies** (Confuse Ray 260, Thunder Wave 259, Curse 221, Stun Spore 150) | ON | 990 | per census table (B4 172 + 80 + 135 commands in 200 battles) | toward 0 | M (gaps measured except the C? ones) |
| 7 | **lead1m B5 adapter windows** (Toxic 360, Hypnosis 157, Frustration 144) | ON | 846 | | | M, separate defect (adapter duration) |
| 8 | lse3 landing (Wish 148, Giga Drain 141, Absorb / Mega Drain / Counter) | ON | 297 | Absorb 0 .. in T2 | | S, small: lowest mass of the documented items |

What not to chase: the landed shape-A bodies' own next-command spread (Ice Beam 898, Bubble Beam 504, Psychic 496, Thunderbolt 433 = about 2,300): the lead moved rows toward the ROM's next-command offset there already; the remainder is the next command's own offset, closed by 1-3 above, not by a per-body rule.

### 6. Findings

1. **0 missing / 0 extra everywhere**, 25 ON + 24 OFF seeds and nine intermediate builds each: no event regressed since t2r / t2o. Offset mass **ON 55,711 -> 35,592 (-36.1 %; exact rows 479 -> 1,007), OFF 6,125 -> 5,437 (-11.2 %; exact 123 -> 126)**; ON move-animation SE exact 334 -> 820.
2. **Top three single bodies of t2r are closed**: Leech Seed 1,771 -> 66, Swagger 1,405 -> 85, Solar Beam 1,145 -> 246.
3. The biggest ON class left is not a body: **general / status-animation rows with no move running, 8,942 (25 %)**, followed by the hit-controller rows (both scenes) and the faint / send-in chain.
4. Scene OFF is already near the floor: median -3, 16 % of mass at |offset| >= 20; the next OFF gain is the hit-controller rows (41 %).
5. **Doc repair (finding, not a measurement):** commit `b0e4cf53d` ("c1k: itemise the move-animation command count delta") turned this file into **62 MB / 1,040 lines** (a replacement with an empty pattern inserted its text between every pair of characters). Master's copy of this doc was unusable (every `grep` / `Read` returned the sentence). The first commit of this branch restores `85570820a`'s text (157,494 bytes) with the intended itemised sentence applied in the one place it belonged (the ON / OFF move-animation command-count delta in the c1k section 2). The wording of that sentence is `b0e4cf53d`'s; nothing else changed.
6. Tooling: nothing new under `tools/`. `step.sh` / `stream.sh` / `runq.sh` (resumable per-seed queues with a time cutoff, per-commit replays over fixed ROM files) are in `.integration/evidence/t2n/` (ignored).

## gsp1m (2026-11-20): general / status animations with no move running, ROM vs app per command (measurement only)

Step gsp1m answers the t2n section 4 group 1 / section 5 rank 1 item: why the five-SE group `gen:152 / 152 / 152 / 228 / 102` (4,650 mass in the 25 ON seeds, 94 groups) and the other no-move general rows drift by -18 .. +27 inside one battle. Measurement only: no `src/` or `tests/` change is committed (a temporary probe patch to the `status` command timing was applied, run and reverted; `git status` is clean of src / tests). Scene ON, seeds 5063 (main), 1415 (check), 2230 / s310 / s8612 (sweep only). ROM side: per-frame `hpd2Probe.py` probe (`gBattlescriptCurrInstr`, `gBattleControllerExecFlags`, `gAnimScriptActive`, hp) on `reference/pokeemerald/pokeemerald.map`, opcode name = the NEXT instruction at an exec rise. App side: `soundCensusRomReplay.ts replay --scene=on --cmdtrace=1`. Frames are relative to the segment's commit frame (R = ROM, E = app).

### 1. What the five-SE group is

`B_ANIM_HELD_ITEM_EFFECT` = `General_HeldItemEffect` (`data/battle_anim_scripts.s:10440-10460`): three `playsewithpan SE_M_TAKE_DOWN` (152) each followed by `AnimTask_RotateMonToSideAndRestore` + `waitforvisualfinish`, then SE_M_MORNING_SUN (228), then SE_SHINY (102). It is started by Leftovers (`src/battle_util.c:3400-3413`, `BattleScript_ItemHealHP_Ret` -> `ItemHealHP_End2`, `data/battle_scripts_1.s:4373-4384`) and by the cure berries (`RemoveItem`, `:4356-4364`). The group is **not** where the drift is made: its internal intervals are within +1 of the ROM, constant over turns and seeds (the per-SE offsets inside a group are flat, e.g. +27 x5 in the s5063 res16 table below). The group's own contribution (offset of its SE1 minus the offset of the previous matched row) is small and constant: lead +4 after a message, +2 after a recoil message, +3 after a `HitFromAtkAnimation` print, -1 after an hp row, +8 / +9 after a `status-icon`; the animation tail +1; message -> hp -3. Over the 94 groups the mass would be **4,205 if the group's own jump were zero (4,650 now)**, so a group-only lead rule would gain about 10 % of the class. The mass is inherited from earlier commands of the same turn.

### 2. Per-command table, seed 5063 (ROM vs app, frames after commit)

Turn res16 (also res8 / 12 / 20 / 24 / 28 / 32 / 36 / 40: the same wake-up turn shape, 36 Double-Edge rows at +24 = t2n group 4 "+24 x 36", 888 mass). ROM script rows are from the probe, app rows from `cmds`.

| command | ROM row (source) | ROM frame | app frame | app - ROM | note |
| --- | --- | --- | --- | --- | --- |
| wake-up print | `BattleScript_MoveUsedWokeUp+14` waitmessage (`data/battle_scripts_1.s`) | 12 | status 9, message 41 | **+29** | the app's leading `status` command is the 32-frame `STATUS_TIMING.minimumFrames` default (`battleResolutionPresentation.ts:2220`; `sceneOnStatusFrames` returns null for a wake-up, 1574-1612); ROM prints the wake-up message at commit + 9 .. 12 and returns at +94 |
| Double-Edge string / status-icon | `BattleScript_HitFromAtkString+1` ppreduce | 99 | status-icon 121, message 122 | +22 | follows the wake-up shift |
| Double-Edge animation | `HitFromAtkAnimation+1` waitanimation, SE 206 / 193 / 193 / 141 / 13 | 130, SE1 136 | move-animation 146, SE1 160 | **+24** | all five SEs of the move at +24 / +24 / +24 / +24 / +24 |
| hit + hp | `datahpupdate` after `HitFromAtkAnimation+8` | 311 | hp 333 | +22 | |
| recoil | `DoRecoil+11` datahpupdate / waitmessage | 338 / 346 | hp 360 / message 369 | +22 / +23 | |
| Yawn | `EffectYawn+2` ppreduce, SE 237 / 232 / 237 | 450, SE 488 | move-animation 459, message 473, SE1 510 | +22 (SE) | Yawn's own lead +0 .. -2 |
| Yawn tail -> held item | `EffectYawn+57` waitmessage, `ItemHealHP_Ret+7` printstring | 699, 808 | message 722, general-animation 820 | +23, +12 | group SE1 816 vs 843: **+27** (the group's lead is +4 after the Yawn message) |
| held-item group | SE 152 x3, 228, 102 | 816, 848, 880, 912, 984 | 843, 875, 907, 939, 1011 | +27 x 5 | flat inside the group |
| held-item message / hp | `ItemHealHP_Ret+10` waitmessage / datahpupdate +24 / `End2+5` | 1021 / 1137 / 1155 | message 1049, hp 1162, turn-end 1173 | +28 / +25 / +18 | |

The turn's offset trajectory (all SEs): +24 x5 (Double-Edge), +22 x3 (Yawn), +27 x5 (group). So **24 of the 27 is the wake-up `status` command, +3 .. +5 is Yawn's tail / held-item lead (the group's own +4)**.

Turn res0 (no wake-up; Double-Edge + Curse + Leftovers): ROM Double-Edge `ppreduce` 12, hit `waitstate` 189, `datahpupdate` 224 / recoil 277; app hit-animation 185 (+0 .. +4 vs ROM `ANIM-` 185), hp 220, recoil hp 273. Curse (body 174): ROM `EffectCurse+9` ppreduce 399, `CurseTrySpeed+17` waitanimation 428, SE1 +10 late in the app (move-animation 419, hit rows `stat` 598 / 689 / 783 vs ROM `waitmessage` 610 / 703 / 797: the app's stat-change message arrives 12 .. 14 earlier than the ROM's, the tail to the first message is 9 short). Group at ROM printstring 900 vs app general-animation 879 + the SE lead; group SE offsets in this turn are -3 .. +4 (Curse 221 mass, lead1m B4 C-body).

Turn res40 (wake-up + Double-Edge + Struggle + Leftovers): ROM Double-Edge hp `datahpupdate` 311 vs app hp 333 (+22, the wake-up shift); Struggle (body 165) `datahpupdate` 642 / recoil 720 / waitmessage 740 vs app hp 664 / 742 / message 763: +22 / +22 / +23 = the same +22 carried (no new Struggle error beyond +1); group printstring 850 vs app 858.

### 3. Seed 1415 check

Same shape. res10: wake-up (status 9 -> message 41 vs ROM waitmessage 9 -> return 91) -> infatuation (`BattleScript_MoveUsedIsInLove+3` waitmessage 95 vs app status-icon 121 / message 122; ROM `ANIM+` 197, SE 212 at 200 / 217 / 234, app status-animation 225 INFATUATION, SE 235 / 252 / 269) -> Bulk Up (ppreduce 297, SE 193 / 193 / 193 / 239) -> Yawn (701 ppreduce, SE 739) -> held-item group. Offsets per SE: **+35 x3 (infatuation: 32 from the wake-up `status` + 3 from the infatuation message order), +24 x3 (Bulk Up SE 193: the status-animation tail is 11 short), +28 (Bulk Up SE 239: a 4-frame move-animation lead), +24 x3, +29 x5 (the group)**. res1 (Yawn -> asleep -> Chesto berry cure): the `status-icon` -> group lead is 25 vs the ROM's 16 (+9, the +8 / +9 "after a status-icon" jump of section 1). res17 (infatuation + wake-up): +29 .. +34 like res10. Seed 2230 (11 groups, 675 mass) was not decomposed per command; it only appears in the section 5 probe sweep (-138 at N = 6, -168 at N = 12).

### 4. Causes, ranked by mass

| rank | cause | rows / turns | where | measured size |
| --- | --- | --- | --- | --- |
| 1 | **wake-up `status` command default 32 frames** | all wake-up turns (s5063 res8 / 12 / 16 / 20 / 24 / 28 / 32 / 36 / 40, s1415 res10 / 14 / 17 ...) | `status` emission for `set-battler-status-data` ~5530-5540, `STATUS_TIMING` 2220 | +24 .. +29 per turn at every following SE, inherited by every later command in the turn, incl. the five-SE group; wake-up message ROM +9 .. +12, app +41 |
| 2 | held-item restart / continue lead after a message / status-icon (`HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES = 15`, `..._CONTINUE_LEAD_FRAMES = 9`, `..._AFTER_STATUS_EXTRA_FRAMES = 1`, lines 160-214) | 94 groups | | +4 after a message, +8 / +9 after a status-icon (the group's own jump, 4,650 -> 4,205 if zero) |
| 3 | status-animation (infatuation / Yawn) tail + Bulk Up lead | s1415 res10 / 14 / 17 | | +3 .. +5 each |
| 4 | Curse lead / tail (body 174) | s5063 res0 and 5 more | `lead1m` B4 C-body | lead +10, tail to the first message -9 |
| 5 | Rest (156) / Struggle (165) hit / recoil hp bars | s5063 res40, s1415 | | +22 .. +23 late (in res40 this is the wake-up shift carried; the "body:156" label on the first group of s5063 seg 1 is a Rest berry-cure group, not a Rest hp row) |
| 6 | faint / cry chain before a group | s5063 / s1415 | ctl 15 / 16 + cry | +18 / +21 |

Over the 25 seeds: 94 groups, 4,650 mass; by seed s5063 30 groups 1,905, s1415 31 / 1,165, s2230 11 / 675, s310 10 / 325, s2 1 / 220, s6 2 / 125, s8108 3 / 105, s3738 2 / 100, s648 2 / 25.

### 5. Probe: what the wake-up fix would move (temporary patch, reverted)

Patch (not committed): in the `status` command emission, when the update clears the sleep bits (`(before.status1 & 7) != 0 && (after.status1 & 7) == 0`) and `sceneOnStatusFrames` is null, use `minimumFrames = N` instead of 32. Replayed all 25 ON seeds with N = 0 / 3 / 6 / 12 and aligned the app's SE rows to the ROM's per segment (ordered sequence match on SE id; metric = sum of |app - ROM offset| over the matched rows, the same 5,830 rows in every run; this is a proxy and does not equal the scoreboard's mass, which is rank-based on a different alignment):

| N | all-seed sum of \|offset\| | s5063 | s1415 | s2230 | s8612 | s310 | s499 |
| --- | --- | --- | --- | --- | --- | --- |
| 32 (now) | 35,239 | 4,546 | 3,784 | 2,315 | 1,382 | 1,489 | 1,785 |
| 0 | 31,926 | 2,681 | 2,394 | 2,241 | 1,321 | 1,568 | 1,783 |
| 3 | 31,588 | 2,465 | 2,354 | 2,213 | 1,287 | 1,548 | 1,783 |
| 6 | **31,265** | **2,200** | 2,410 | 2,177 | 1,236 | 1,519 | 1,785 |
| 12 | 31,565 | 2,408 | 2,638 | 2,147 | 1,190 | 1,459 | 1,785 |

All other 19 seeds are unchanged (no regression elsewhere; one segment, s5063 res44, +1). At N = 6 the whole-class change is -3,974 (-11.3 % of the matched-row mass); restricted to SE ids 152 / 228 / 102 (all uses) it is 5,812 -> 4,276 (-1,536, -26 %), and for the eight ids of this class (152 228 102 142 148 242 219 179) 9,786 -> 8,250 (-1,536, -16 %). The s5063 res16 offsets go +24 x5 / +22 x3 / +27 x5 -> **-2 x5 / -4 x3 / +1 x5** (N = 6), -5 / -7 / -2 (N = 3); s1415 res10 +35 x3 / +24 x3 / +28 / +24 x3 / +29 x5 -> +9 x3 / -2 x3 / +2 / -2 x3 / +3 x5 (the +9 left is the infatuation message order, section 3). The best N differs per seed (s5063 6, s1415 3, s2230 / s8612 / s310 12): the wake-up print's lead is not constant in the ROM (it follows the preceding command), so the per-seed spread of 3 .. 12 is the residual to measure before landing, not a precise constant.

### 6. Proposed landing (not done: out of scope for gsp1m)

1. **Wake-up `status` duration** (rule, `src/engine/battleResolutionPresentation.ts`, the `status` emission for `set-battler-status-data` ~5530-5540, or an entry in `sceneOnStatusFrames` 1574-1612 for a sleep-clearing update): replace the 32-frame default with a ROM-measured head (the ROM prints the wake-up message at commit + 9 .. 12, so the head is 0 .. 12 frames; start from 6, then split by what precedes it). Expected: **about -4,000 of 35,239 matched-row mass on the 25 ON seeds (-11 %), about -1,500 on the five-SE group ids and the t2n group 4 "+24 x 36" 888 rows to ~0**. Pins it will move: `status` command timing tests in the wake-up / sta / off121 family (grep `STATUS_TIMING` / `minimumFrames: 32` in `tests/`), the hie1 / sa125 held-item-effect pins that carry the +1 `AFTER_STATUS_EXTRA_FRAMES` and the restart / continue leads, and the Scene ON census digest. Scene OFF: unaffected if the rule is Scene ON only (`sceneOnStatusFrames` is the ON entry).
2. **Held-item lead after a message / status-icon** (hie1 constants, lines 160-214): trim `RESTART_LEAD_FRAMES` 15 -> about 11 (the group's +4 after a message) and the after-status-icon extra +8 .. +9 -> about 0. Expected: **about -(4,650 - 4,205) = -445 on the five-SE group alone** (about -1,200 if the +4 is applied to all ~60 groups after a message, an estimate not measured). Do this after item 1, since the lead measure must be taken on turns without the wake-up shift.
3. **Infatuation / status-animation tail + Bulk Up lead** (s1415 +9 / +4): small, s1415 only in these seeds; measure after item 1.
4. **Curse C-body lead / tail** (lead1m B4: +10 lead, tail -9) and **Struggle / Rest hp** (already inside the +22 of the wake-up turns; recheck after item 1).

No new defect found in the group's own script (General_HeldItemEffect): its intervals are correct. The `-18 .. +27` is one 32-frame wake-up `status` default (rank 1) and a handful of 3 .. 5 frame command leads.

Tooling note: the probe and the per-turn comparison scripts live in `/tmp/gsp1m` (not committed); the engine replay command is `node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts replay --seed=<s> --scene=on --setup=.integration/evidence/t2n/<s>-on.setup.json --cmdtrace=1 --out=<f>` (4 s per seed).

## hcr1m (2026-11-20)

Scene OFF controller hit SEs 13 / 12 / 14 (after `hit-animation`; OFF 2,255 = 41 % of the OFF mass) lined up ROM vs app per command, classified by cause, and probed with a temporary patch (reverted; `src/`, `tests/` and `tools/` are unchanged by this step; nothing else was edited; `npm test` was not run, measurement step).

### 1. Method

- Evidence: `.integration/evidence/t2n/<seed>-off.{setup,drive,snd,cmp,engine,frozen-tail}.json` for the 24 OFF seeds (copied to the git-ignored `.integration/evidence/hcr1m/`). ROM per-frame probe `tools/integration/hpd2Probe.py` (main, gBattlescriptCurrInstr, exec flags, anim, hp); app side `soundCensusRomReplay.ts replay --scene=off --setup=... --cmdtrace=1`.
- Alignment per decision segment k: both sides start at the segment's commitFrame (engine decision vs ROM drive anchor); SE / cry rows are matched by ordered id (SequenceMatcher). This reproduces the scoreboard's OFF numbers exactly: hit rows mass **2,255**, matched-row mass of the remaining families 3,155, all-row 5,410 (the proxy for the probe table below).
- To read each turn's command stream the cmdtrace rows were given the USEDMOVE print's `provenance.instructionExecution` (u = commands executed from the effect script entry up to the first used-move print), temporarily, via a tooling patch (reverted).

### 2. Where the frames go (per command, seed 7682, segments 58 / 59)

ROM costs: GetWhoStrikesFirst at commit +3, SpecialStatusesClear +4 .. 5, then each battlescript command is one frame, so the first `attackstring` (`BattleScript_HitFromAtkString+1`, `data/battle_scripts_1.s:245`) runs at **commit + 6 + u**. The app emits the first message at a fixed **commit + 9** (the confirm-handoff stage walk, `advanceBattleResolutionConfirmHandoff`, `src/engine/battleResolutionPresentation.ts` ~6231-6345). It is exact for u = 3 only.

| seg | move (effect script) | u | ROM first print | app first message | ROM hit SE (13 / 12) | app hit SE | offset |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 58 | Struggle (`EffectRecoil` 897 -> `EffectHit` 236; recoil + Struggle counter before the hit) | 8 | 14 | 9 | 80 | 75 | **-5** |
| 59 | SpeedDownHit (`EffectSpeedDownHit` 1048: `setmoveeffect` + `goto EffectHit`) | 6 | 12 | 9 | 76 (12) / 295 (13) | 72 / 291 | **-3 / -4** |

The interval print -> hit SE is identical in ROM and app (71 / 71 rows checked), so the whole offset is the commit -> first-print lead, inherited by every later row of the turn (the row count after the first row is why the mass is large). The ROM rows that gain frames are the commands before the first print that the app collapses into its 9-frame walk: `setmoveeffect` / `goto` / `jumpifnotmove` / `incrementgamestat` (1 frame each), then `attackcanceler` (241), `accuracycheck` (243), `attackstring` (245).

### 3. Classification of the OFF hit mass (2,255)

Cause: the first-print lead, by effect-script class (u = commands from the effect entry to the first used-move print; segment count over the 24 seeds in brackets, u None = no used-move first print):

| u | effect classes | first print (ROM) | vs app 9 | segs |
| --- | --- | --- | --- | --- |
| 2 | Earthquake, status moves, RestoreHp, FollowMe, Confuse, Toxic, Yawn, Attract, LowKick, OHKO | +8 | -1 | 188 |
| 3 | Absorb, Curse, BrickBreak, Sonicboom, LevelDamage | +9 | 0 | 54 |
| 4 | plain EffectHit | +10 | +1 | 68 |
| 5 | | +11 | +2 | 12 |
| 6 | secondary-effect hits (`setmoveeffect` + `goto EffectHit`) | +12 | +3 | 157 |
| 7 | | +13 | +4 | 1 |
| 8 | Struggle, EffectRecoil | +14 | +5 | 44 |
| 12, 16 | SemiInvulnerable charge turn (u 12 x1, 16 x2; rise 16 .. 18) | +18, +22 | +9, +13 | 3 |
| None | no used-move first print (turn starts with a status / ability / wake-up / confusion message, forced / flinch / NoMovesLeft Struggle) | | | 158 |

By hp shape / hold: hit rows with the target hp bar moving make the bulk of the 2,255; holds (Brick Break +63 x2, charge turns) are the long tail, see section 5.

### 4. Probe: used-move print lead = 6 + u (temporary patch, reverted)

Patch (not committed), in `advanceBattleResolutionConfirmHandoff` before the `nextStage` lookup: on the `action-dispatch` stage of a plain `use-move` decision (not forced, not the Focus Punch pre-pass), read u from `state.segments[0].events[0]` when it is a `STRINGID_USEDMOVE` message with `provenance.instructionExecution` in 2 .. 20, then hold the walk for u - 3 extra frames (u > 3) or skip `accuracy-check` for one frame (u = 2). Replayed the 24 OFF seeds, same alignment and metric as section 1 (matched rows 1,128 in both runs: no event added or lost):

| metric | HEAD | patched | change |
| --- | --- | --- | --- |
| hit rows summed \|offset\| | 2,255 | 1,458 | **-797 (-35 %)** |
| all-row summed \|offset\| | 5,410 | 4,154 | **-1,256 (-23 %)** |
| exact-offset rows (all families) | 126 | 560 | +434 |
| rows improved / worse | | 643 (-1,426) / 94 (+170) | |

The 94 worse rows are mostly stat SE 245 / 239 rows that were already at a positive offset (the shift moves them further; the lead there is a different cause). Per seed (all before -> after, hit before -> after): 7682 642 -> 419, 484 -> 300; 3738 526 -> 388, 319 -> 201; 6568 366 -> 317, 241 -> 212; 97 343 -> 257, 94 -> 54; 2741 316 -> 260, 157 -> 131; 1415 285 -> 267, 62 -> 54; 648 253 -> 237; 5063 244 -> 165, 128 -> 88; 2230 203 -> 168, 100 -> 80; no seed gets worse in the hit family.

### 5. Residual hit mass after the patch (1,458)

97 rows with |offset| >= 6 hold 1,200 of it. They are not the lead:

- Brick Break +63 x2 (126): screen-break message chain, separate hold.
- s3738 -39 x2 and -30 after `EffectSpeedDown2` / stat-down; s2741 -33 / -26 / -23 / -20; s7682 -19 x2 (Confuse / Attract turns); s2230 -14; s6568 NoMovesLeft Struggle -14.
- Charge turns: s310 SolarBeam turn 2 -18; semi-invulnerable -16 / -14 (u 10 .. 17, rise 16 .. 18; the probe cap u <= 20 covers them but the rise is the charge animation, not the print).
- Turns with no used-move first print (mass 213 + 221 + 15 + 38 + 4): the lead there is whatever message comes first (wake-up, confusion, flinch, ability). Out of the rule below; the Scene ON wake-up section (gsp1m) already covers the 32-frame wake-up default.

### 6. Proposed landing (not done: out of scope for hcr1m)

1. **Rule**: the first used-move message of a plain `use-move` turn appears at commit + 6 + u, u = `provenance.instructionExecution` of the USEDMOVE print (the engine already carries it; `FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_BASE_FRAMES = 5` + u at ~265 / 336 is the same idea for the Focus Punch pre-pass).
2. **File**: `src/engine/battleResolutionPresentation.ts`, the confirm-handoff stage walk (`CONFIRM_HANDOFF_NEXT`, `advanceBattleResolutionConfirmHandoff` ~6231-6345): either hold `action-dispatch` for u - 3 frames, or replace the fixed walk with the 6 + u lead; keep forced / Focus Punch / no-used-move paths as they are (the Struggle forced path enc276 carries its own +19).
3. **Expected change**: Scene OFF on the 24 T2 seeds, hit-row mass **2,255 -> about 1,458 (-797)**, all-row **5,410 -> 4,154 (-1,256)**, exact rows 126 -> 560. Scene ON uses the same walk: not measured here (the ON census must be re-run; expect the same sign).
4. **Pins it will move**: the `confirm-handoff` first-message timing pins in `tests/battleResolutionPresentation.test.ts`, `tests/factoryRoundBattleOrchestrator.test.ts`, `tests/factoryVoluntarySwitchSeam.test.ts`, `tests/presentationStringIssue72Batch2.test.ts` (grep `confirmHandoff` / first message frame 9), the Scene OFF and ON census digests, and any T2 frozen-tail expectation that bakes a first-SE frame. u = 3 turns (Absorb / Curse) are unchanged.
5. **After it**: re-measure the 94 worse rows (stat 245 / 239 lead), then the residuals of section 5 one by one (Brick Break chain first, 126).

Not measured: Scene ON; the u = 10 .. 17 charge-turn rise split; seeds with no used-move print. Tooling note: scripts live in `/tmp/hcr1m` (`lib.py`, `cmp.py <seed> <k>`, `mass.py`, `first.py`), not committed; evidence copies in the ignored `.integration/evidence/hcr1m/`.

**hcr2m (2026-11-20): Scene ON, same stage walk (measurement only: no change under `src/`, `tests/`, `tools/`; the two temporary probe patches were reverted, `git status` clean; `npm test` not run).** The ON T2 seeds (the 25 of t2n), evidence `.integration/evidence/t2n/<seed>-on.{setup,drive,snd}.json`; ROM per-frame probe re-run for all 25 (`tools/run-mgba-probe.py ... tools/integration/hpd2Probe.py <req> on <out>`; the `-on.req.json` carries a `replay` field the probe rejects, so the probe request is the same descriptor with `trace.segments` = the drive's segments, `overrides {}`); app side `soundCensusRomReplay.ts replay --scene=on --cmdtrace=1` on HEAD `0dfdeb140` (the cmdtrace rows temporarily carried the first event's message id and `provenance.instructionExecution`). Alignment, metric and u as in sections 1 and 4 (scripts in `/tmp/hcr2m`: `lib.py`, `tab.py`, `iv.py`, not committed).

- **The rule holds in ON: first used-move print = commit + 6 + u, the app prints at a fixed 9.** 605 decision segments over the 25 seeds; 418 start with a plain `use-move` USEDMOVE print at segment 0 / command 0 and u in 2 .. 7 (u: 2 x156, 3 x41, 4 x69, 5 x12, 6 x139, 7 x1; same classes as the OFF table). ROM exec rise - 6 equals u in **417 of 418** (the one exception: s2230 res20, u 6, ROM rise 31 = another earlier ROM event, not the rule). The app first message is 9 in all 418. No u >= 8 (charge turn) occurs in these 418. Not covered by the rule (first row is something else): `status` command 65, EMPTYSTRING3 26, in-love 13, confusion 12, healed-confusion 3, return-mon 2, switch-decision turns 47, 15 `move` segments whose first cmdtrace row is a later-segment USEDMOVE.
- **The temporary probe (hold `action-dispatch` for u - 3 frames when u > 3, skip `accuracy-check` when u = 2; the OFF patch, only `sourceDecision.kind "use-move"` / first event USEDMOVE / u 2 .. 20)** moves the app first print to exactly the ROM's (emsg - rise: 0 in 415, -1 in 2, the s2230 outlier -22), but it does **not** carry the OFF gain. Same alignment, matched rows 5,871 in both runs (no event added or lost):

| metric (25 ON seeds) | HEAD | patched | change |
| --- | --- | --- | --- |
| all-row summed \|offset\| | 35,288 | 33,116 | **-2,172 (-6.2 %)** (OFF: -23 %) |
| hit rows (SE 12 / 13 / 14, 475 rows) | 3,954 | 3,613 | **-341 (-8.6 %)** (OFF: -35 %) |
| exact-offset rows | 1,007 | **402** | **-605** (OFF: +434) |
| stat 239 / 245 rows | 458 | 453 | -5 |
| seeds worse | | all rows: only s5569 (651 -> 733); hit rows: s1415 165 -> 167, s6912 16 -> 21, s5569 74 -> 71 better | |

- **Why not: in ON the rows after the first print already absorb part of u, so the shift only helps where the absorption is incomplete.** Per u (segments / all-row mass before -> after / exact rows before -> after): **u 2** (156): 7,380 -> 7,876 (**+496, worse**), exact 360 -> 74; **u 3** (41): 1,474 -> 1,475 (unchanged, as predicted); **u 4** (69): 2,042 -> 2,182 (**+140, worse**), exact 371 -> 19; **u 5** (12): 444 -> 310 (-134); **u 6** (139): 10,398 -> 7,725 (**-2,673**), exact 61 -> 75. Baseline offset histograms by u (all matched rows): u 2: 0 x360, +2 x171, -2 x145; u 4: 0 x371, -2 x94; **u 6: -2 x841** of 1,833, -4 x134, -5 x130. So at HEAD the ON u = 2 and u = 4 turns already land their hit / stat / cry rows at offset 0 although the first print is +1 (u 2: ROM 8, app 9) or -1 (u 4: ROM 10, app 9): the print -> first-hit interval in the app is about -1 (u 2) / +1 (u 4, and u 6: +1 while the lead error is -3) against the ROM's (mode of ROM vs app rise -> hit by u, `iv.py`: u 4 (222, 223) (303, 302) (91, 92) (75, 76); u 6 (234, 233) (235, 234) (180, 181); the u 2 sample is noisy: 76 turns, (254, 247) x8, mean app - ROM -7). I.e. the ON downstream chain is not the "identical in ROM and app" interval of OFF section 2 (71 / 71 rows): ON carries other per-turn constants (the Scene ON move-animation / message leads) that were tuned against rows at the fixed 9 and cancel the lead for u = 2 and u = 4. Moving the print alone therefore breaks 605 exact rows; only u 5 / u 6 (secondary-effect hits, 151 segments, 10,842 mass before) gain, and there -2,807.
- **Verdict for the ON landing.** The 6 + u rule is right for the first print, but in ON it cannot be landed as the OFF patch (-23 % all / -35 % hit) without also re-deriving the downstream interval; as is, it is **-6.2 % all rows** (all of it from the u 5 / 6 secondary-effect turns), exact rows 1,007 -> 402. Expect a Scene-ON-gated version (`u >= 5` only: hold u - 3 frames) to keep about **-2,807** and drop the +636 of u 2 / u 4; not run (cheap but out of the 25-minute cap). Open follow-up: measure the ON print -> hit interval per u from the per-command probe (`/tmp/gsp1m`-style `cmp.py`) on one u 2 turn and one u 4 turn (e.g. s2 res0 u 4, s2 res1 u 2) to find which ON constant absorbs the lead; until that is known the OFF section 6 landing must stay Scene OFF only, and the pins listed there move only for OFF.

## fsc1m (2026-11-20): Scene OFF faint / send-in chain, ROM vs app per command, split into lead / harness anchor / engine rows (measurement only)

Scene OFF, the 24 T2 seeds of t2n. Measurement only: no change under `src/`, `tests/` or `tools/`, no probe patch this time (everything below is read from the t2n evidence plus the hcr1m per-frame ROM probe rows; `npm test` not run, as assigned). Evidence: `.integration/evidence/t2n/` (`t2n-attr-off.json`, per-seed `-off.{engine,drive,snd,cmp}.json`), the hcr1m copies of the per-frame ROM probe (`<seed>-rom.json`: gBattlescriptCurrInstr, exec flags, anim, hp) and `first.json` (per-segment first-print lead); scripts in `/tmp/fsc1m` (`lib.py`, `cmp.py <seed> <k>`, `chain.py`, `agg.py`, not committed). Alignment as in hcr1m: per decision segment both sides start at the commit frame, SE / cry rows matched by ordered id.

### 1. Which seed, and what the chain is

Chain rows = `ctl:16@faint` + `cry@faint` (faint), `ctl:114@party-summary` + `ctl:15@switch-in` + `cry@switch-in` (AI replacement send-in), `ctl:15` / `cry` `@sprite-visibility` (forced switch send-in), `ctl:15@trainer-slide`. 430 of the 440 rows, 2,660 of 2,678 mass are reproduced by the segment mapping (the 10 rows / 18 mass left are the zero rows booked under `@switch-out`).

| seed | chain mass | seed | chain mass |
| --- | --- | --- | --- |
| **648** | **225** | 2741 | 136 |
| 97 | 202 | 1914 | 134 |
| 3738 | 180 | 3158 | 126 |
| 1415 | 172 | 7682 | 121 |
| 830 | 150 | (15 others) | 21 .. 118 |

**Seed 648** is the one analysed per command (it also carries the Earthquake faint chain +43 x 2 of t2n section 4 group 3). Its 225 = seg 0 **196** (cry@faint +43, ctl:16 +43, ctl:114 +34, ctl:15 +38, cry@switch-in +38) + 29 (seg 2 / 8 -1 x 4, seg 12 -4 x 2, trainer-slide -17).

### 2. Per command, seed 648 segment 0 (ROM vs app, frames after the segment's commit; ROM = the probe, app = `cmds`)

The turn: the foe uses Dig (charge turn), the player's Earthquake hits the underground foe (`BattleScript_DoHitAllWithUndergroundBonus`, `data/battle_scripts_1.s:1848`), the foe (Golduck, cry 55) faints, the AI sends in the next mon.

| command | ROM (source) | ROM frame | app frame | app - ROM |
| --- | --- | --- | --- | --- |
| first print (charge turn) | exec rise at `BattleScriptFirstChargingTurn+4` | 16 | message 9 | **-7** (the hcr1m first-print lead, here u = 10: 6 + u) |
| hit SE 13 | `effectivenesssound` (+13) then `hitanimation` (+14) | 232 | hit-animation 225, SE 225 | -7 (inherited) |
| hit blink | `OpponentHandleHitAnimation`, `src/battle_controller_opponent.c:1804-1817`: **sprite `invisible` (Dig underground) -> `OpponentBufferExecCompleted()` at once**, no blink | bar starts 235 (SE + 3) | hp 260 (SE + **35**) | **+25** (app 35-frame `HIT_ANIMATION_TIMING`, `battleResolutionPresentation.ts:1139`, emitted at 5430-5447, is unconditional; ROM blink is 33 frames when the target is visible: SE + 1 .. + 34, bar + 36, checked on 7 other segments) |
| hp bar 187 -> 0 | `healthbarupdate` / `datahpupdate` (+19 / +21) | 235 .. 383 (148) | 260 .. 407 (147) | +24 (-1 own) |
| empty box | `printstring STRINGID_EMPTYSTRING3` + `waitmessage 1` (`:1865-1866`) then `tryfaintmon` (+35) | 388 (hp end + 5), FaintTarget at 391 | message 407 -> faint cmd 431 (**24**) | +43 at the faint cmd: **+19 own** |
| faint cry (`playfaintcry`, `:2818`) | `BattleScript_FaintTarget+2` | 392 | cry 435 (faint cmd 431 + 4) | **+43** |
| `pause B_WAIT_TIME_LONG` + `dofaintanimation` -> SE 16 | `:2819-2820`, `OpponentHandleFaintAnimation` (`PlaySE12WithPanning(SE_FAINT)`) | 458 (cry + 66) | 501 (cry + 66) | **+43** (interval exact) |
| faint message (`printstring STRINGID_TARGETFAINTED`, `:2822`) | exec 478 .. 509 (31) | 478 | status 520 / message 521 | +43 |
| rest of the faint script, `BattleScript_GiveExp` (517), `HandleFaintedMon` (523), `FaintedMonTryChoose` (526 .. 532; the AI's `openpartyscreen` choice: no sound, 7 frames here) | `:2830-2847` | 534 = SE 114 (`drawpartystatussummary` rise) | sprite-visibility 543 / 544, party-summary 545, SE 114 at **568** (lead 23) | **+34** (-9 against the faint) |
| `SWITCHINMON` print (`printstring`, +11) | `:2888` | 633 | message 668 | +35 |
| `switchinanim` (+16): ball SE 15 / new mon cry 279 | `:2890`; SE 15 at exec + 18, cry at + 34 | 689 / 705 | switch-in cmd 708; SE 15 727 / cry 743 | **+38 / +38** (the SE 114 -> SE 15 interval is +4: print +1, print -> switchinanim +2, SE +1) |
| `end2` | `BattleScript_FaintedMonEnd` | 794 | next menu 836 (segment 827 vs 798) | +29 |

Arithmetic of the faint rows: **+43 = -7 (lead) + 32 (invisible-target blink: app 35 vs ROM 3) - 1 (hp bar 147 vs 148) + 19 (empty box 24 vs 5)**. Then the faint -> send-in step is **-9** (ROM 76 frames SE 16 -> SE 114, app 67), and the send-in's own SE 114 -> SE 15 / cry is **+4**.

The forced-switch segments of this seed (segs 3 and 9, after the player's mon faints in segs 2 and 8): SE 15 / cry 217 / cry 200 at **0 / 0** (ROM and app both at commit + 146 / 162 and 148 / 164); the faint rows of the preceding player-side faints are -1 (seg 2, 8) and -4 (seg 13): inherited, no own offset.

### 3. The split (a) / (b) / (c)

**(a) Inherited from the turn's first-print lead (hcr1m).** The app's first message is at a fixed commit + 9, ROM at 6 + u. Using `emsg - rise` per segment (first.json) as the carried lead, over the faint rows of 190 matched rows in segments with a known lead: sum of the lead |a| = 429. If the lead were exact everywhere (an **upper bound**: the hcr1m rule only covers plain `use-move` turns, u = 2 .. 20; the charge-turn first print of 648 seg 0 may be outside it), the chain mass would move as: faint rows 1,017 -> 724 (-293), AI send-in 1,097 -> 983 (-114), trainer-slide 222 -> 187 (-35): **-435 of the 2,387 mass in segments with a known lead (-18 %), -16 % of the 2,660 total**. In 648 seg 0 the lead is -7 and **moves the 5 chain rows the wrong way** (43 -> 50, 34 -> 41, 38 -> 45: +35 mass) because the own rows are +50: on the top seed the lead fix alone makes the chain worse; the (c) rows have to land with it. 78 of the 99 `cry@faint` rows equal the hit-row offset of their segment exactly (own = 0; mass 234): these are pure inheritance.

**(b) The driver's forced-switch anchor.** 47 forced-switch segments (decision kind `switch`, the replacement after the player's mon faints): the engine's menu-open -> commit is a fixed 8 / 11 frames, the ROM's 32 .. 41 (27 .. 28 more), and the harness anchors on the commit. The SE 15 / cry send-in lands exactly (offset 0) in **25 of 47**, at **-3 in 17, -7 in 5** (ROM commit -> SE 15 is 144 .. 153, app 144 .. 148: the quantum is the ROM driver's party-menu confirm input phase, 3 .. 4 frames, not an engine row). Mass: SE 15 86, cry the same, **about 170** by direct count (t2n books 83 of it under `@sprite-visibility`, the rest under other labels): **6 % of the chain**. This is smaller than ctl1's 9 .. 12 frame anchor artifact (now at most 7, median 0): the t2n "-12 -> -3" driver fix is already in. On seed 648 this is **0** (both forced switches at 0). It is measurement side; it does not move any app frame.

**(c) The engine's own faint / send-in rows** (rows and source lines; these are what is left after (a) and (b)):

| # | row | own offset | rows / mass | ROM source | app source |
| --- | --- | --- | --- | --- | --- |
| c1 | **hit-animation on an invisible (Dig / Fly / Dive underground) target is 35 frames; ROM skips it (0 frames)** | +25 .. +32 on every later row of the turn (648 seg 0: +32 on the five chain rows plus the hp / message rows) | 648: 5 chain rows, 196; other seeds: s6912 seg 7 (+26 own) likely, not decomposed | `src/battle_controller_opponent.c:1804-1817` (and the player controller's twin), `OpponentHandleHitAnimation` | `HIT_ANIMATION_TIMING` 35 (`battleResolutionPresentation.ts:1139`), hit-animation emission 5430-5447, no invisibility test |
| c2 | **`printstring STRINGID_EMPTYSTRING3` + `waitmessage 1` in the hit-all loop is a default 24-frame message; ROM spends ~5 frames hp end -> cry** | **+17 .. +20 own** on the faint rows of every Earthquake KO: 6 segments (s648 +19, s1415 +19 / s3158 +19 x 2 / s5063 +17 / s6912 +19 .. +26 / s97 seg 20 +20, own = faint - hit) | 6 segments x 2 faint rows + the send-in rows behind them; about 200 mass | `data/battle_scripts_1.s:1865-1866` (`BattleScript_DoHitAllWithUndergroundBonus`; same print in `BattleScript_HitAllNoUndergroundBonus`) | `MESSAGE_TIMING` 24 (`:956`); the empty-box timing exists only for the Focus Punch pre-pass (`focusPunchPrePassMessageTiming`, `:297-330`), where it is `kernel instruction count + 1` |
| c3 | **faint message -> party-summary SE: the app interval SE 16 -> SE 114 is 64 .. 70 (median 67), ROM 66 .. 83 (median 75)** | **-8 median (-1 .. -15)** on SE 114 / SE 15 / cry@switch-in of every AI replacement (30 of 30 faints with a send-in in the same segment at -15 .. -1 except 3) | 118 rows, 1,130 mass (81 rows with their faint in the segment: own sum 614 of 921) | ROM: faint print `printstring STRINGID_TARGETFAINTED` (`:2822`, exec 31 frames in 648) + `GiveExp` / `HandleFaintedMon` (a constant +6, +3) + the AI `openpartyscreen` choice (`FaintedMonTryChoose`, `:2843-2847`, **6 .. 10 frames before `FaintedMonSendOutNew`**) + 1; the SE 16 -> GiveExp part alone ranges 48 .. 65 | app: `faint` command lead 68 (exact), then the faint message (22 frames) + 2 sprite-visibility + party-summary lead 23 (648) |
| c4 | send-in tail: print -> `switchinanim` -> SE 15 / cry | **+1 .. +4** (648 +4) | small | `:2888-2893` | |
| c5 | attacker faint (`BattleScript_FaintAttacker`: confusion, Perish Song, turn damage, recoil) and the battle-ending faint (`BattleScript_LocalBattleLostPrintTrainersWinText`) | -6 .. -12 own (s499 seg 14 -11, s1028 seg 16 -12, s97 seg 14 -10, s3738 seg 62 -8, s2741 seg 5 -3, s7295 seg 1 -10) | ~10 faint rows, ~110 mass | `BattleScript_FaintAttacker`, `LocalBattleLost...` | not examined per command |
| c6 | trainer-slide after the last faint (battle end -> next battle) | -4 .. -29 | 20 rows, 222 mass (lead explains 35) | | not examined (not a send-in path; unmeasured) |

Mass accounting of the 2,660: **faint rows 1,154** (own part 502 over 190 rows: 78 of 99 `cry@faint` rows are 0 own, 21 carry 277 / own 252: 6 Earthquake rows +17 .. +50, 8 attacker-faint rows -6 .. -12, a few +9 / +13 / -1 .. -3), **AI send-in 1,130** (own c3 614 of the 921 in segments with the faint, 209 in segments where no faint row is attributed: 37 rows, 14 of them at -7 .. -15), **forced switch ~170 (b)**, trainer-slide 222, other 71. The pieces cancel in sign (faint -3 plus send-in own -7 = -10), so |a| + |own| exceeds the mass.

### 4. Answer

1. **Seed 648 is dominated by c1 + c2, not by (a) or (b)**: +50 of the +43 faint offset is the engine (c1 32 + c2 19 - 1), the lead is -7 against it, the forced switch is 0. Fixing the hcr1m lead alone would **worsen** this seed's chain by 35.
2. **Across the 24 seeds the chain is mostly inherited on the faint rows** (78 / 99 faint cry rows own 0, offset = the turn's hit offset -1 .. -9) and engine-own on the send-in rows: **c3 (the faint -> party-summary interval, median -8) is the biggest single engine row: 118 rows, 1,130 mass**, then c2 (Earthquake empty box, +17 .. +20), c1 (invisible target blink, 648 only in these seeds), c5 / c6 (attacker-faint and battle-end, ~330).
3. The part the lead (a) would clear is **about 435 of 2,660 (16 %)**, the harness anchor (b) is **~170 (6 %), measurement side, already down to 0 / -3 / -7**, the engine's own rows (c) are **about 1,200 (45 %)**; the rest is the hit chain carried (hp bar lengths, other turns' earlier commands).

### 5. Proposed landing (not done: out of scope for fsc1m)

1. **c1**: skip the 35-frame hit-animation when the target is semi-invulnerable-invisible (the engine knows STATUS3_UNDERGROUND / ON_AIR / UNDERWATER; ROM test is the sprite `invisible` flag): -32 on every later row of those turns (Dig / Fly / Dive hits on Earthquake / Surf / Gust / Thunder / Twister; 6 EQ KOs in these seeds, only 648 has the blink skip).
2. **c2**: time the hit-all loop's EMPTYSTRING3 box like the Focus Punch pre-pass one (kernel instruction count + 1, about 5 frames): -17 .. -19 on the 6 Earthquake KO chains (about -200 mass).
3. **c3**: model the faint message -> party-summary interval: ROM = faint print length (48 .. 65 from SE 16 to GiveExp; suspected to depend on the fainted mon's name / text length, **not tested**) + 6 + 3 + AI choice 6 .. 10 + 1. This needs the AI choice's frame cost (a ROM probe on `FaintedMonTryChoose`) and the text-length rule; expected -614 own mass on 81 rows.
4. Land the hcr1m lead together with c1 / c2 (on the top seed they cancel; on the rest the lead alone is -435).
5. Not measured: Scene ON (the same scripts run, the chain should carry the same c1 / c2 / c3 rows); c5 and c6 per command; what drives the 6 .. 10 frame AI choice; the 10 chain rows under `@switch-out` (zero offset).

## hcr1 (2026-11-20): Scene OFF used-move print lead landed as a rule, with an unresolved pixel conflict

**Change** (`src/engine/battleResolutionPresentation.ts`, commits 5f05c8867 + c33b56567): in Scene OFF only (`segment.beforeRules.rulesContext.hitMarker & HITMARKER_NO_ANIMATIONS`), a plain `use-move` turn whose first event is a `STRINGID_USEDMOVE` message with u = `provenance.instructionExecution` in 2 .. 20 prints at commit + 6 + u instead of the fixed commit + 9: hold `action-dispatch` for u - 3 frames when u > 3, skip `accuracy-check` for one frame when u = 2, u = 3 unchanged. Forced (Encore / Struggle), the Focus Punch pre-pass, non-`use-move` decisions and Scene ON keep the fixed walk. The hand-built handoff in `tools/integration/fpp150Anchors.ts` now carries `segments: []` (the fixed walk): `STOP_BOUNCE_REQUEST_LAG = 3` was fitted on a u = 6 control arm with the old walk and would double-count.

**T2 OFF scoreboard (the 24 t2n OFF seeds), base 94c2a6da6 -> new**: missing / extra 0 / 0 on both. All-row mass 5,438 -> 4,182 (-1,256, -23 %); hit rows (SE 12 / 13 / 14) 2,255 -> 1,458 (-797, -35 %); exact rows 126 -> 561 (probe 560); cry 1,054 -> 866; controller 4,006 -> 2,899; **stat SE 353 -> 398 (worse, the "94 rows" of hcr1m section 4; cause not re-measured in this step)**.
**Census** (`lsd194Census.sh`): Scene OFF 0..199 eventsDigest identical, 0 changed commands (the census records per-command durations, not the confirm-handoff frames; the OFF sound clock moves in all 199 shifted seeds, seed 80 has one same-frame SE 114 / duck 476 reorder); Scene ON 0..99 identical. T1 sound 0 / 0 / 0 on both scenes.

**Re-pins (presentation timing, not a rule change)**: `tests/lbrd.test.ts` seeds 14 / 14 / 14 -> 10 / 0 / 10 (WIN_TWO / RETIRE / WIN_THEN_LOSE; the pinned 7-win deal for seed 14 became a loss; scan 0..15, one seed per role). `tests/randomRoundSoak.test.ts`: seed 21 frames 43,334 -> 43,411, renderCalls 3,044 -> 3,043; seed 0 "full" frames 22,844 -> 22,840; seed 1 "full" frames 61,456 -> 60,534 and turn 22 -> 19 (same battle 3 / depth 2 / roundLost). The four tests hcr1m section 6 item 4 named passed unchanged; the 67 test files grepping `confirmHandoff` pass; `test:gate` green.

**OPEN: the pixel oracle contradicts the rule on u = 2 turns.** `npm run compare -- <trace> --summary` on Scene OFF battle-lab traces, base -> new:
- `battle-command-generated-off`: 128/128 -> 84/128. The first diff is frame 42: the oracle still shows the move menu, the new app already shows the first glyph (one frame early; base matched every frame). The turn's u is 2.
- `hpd1-sonicboom-off` 880 -> 655, `hpd1-dragonrage-off` 865 -> 637, `hpd1-toss10-off` 876 -> 650 of 1023 (first new diff at frame 29 / 30 / 29, again the app one frame early; the engine reports u = 2 for the Sonicboom first turn although hcr1m's table lists Sonicboom at u = 3). `hie1-cheri-off` (477/823) and `hpf1-pa-dragonrage-off` (607/1023) are unchanged; the `canonical-recorded` traces `turn11-rockslide-off` (256/256, Rock Slide) and `turn11-featherdance-off` (191/191, Feather Dance) match before and after because they replay recorded timing and never run the handoff.
- No pixel trace with a u = 6 first turn was found among the OFF traces, so u > 3 was not pixel-checked.

So the fixed commit + 9 is pixel-exact for the first glyph on these u = 2 turns, while the T2 ROM-drive probe says the ROM's `attackstring` runs at commit + 8. The two measurements disagree by the one frame between the ROM `printstring` row and the first glyph (hcr1m compared the app's first-glyph frame with the ROM row). **Decision for the supervisor before merging**: either drop the u = 2 skip (keep only the u > 3 holds, whose pixel behaviour is unmeasured) or anchor the rule on the glyph frame (6 + u + 1) and re-measure T2 and the pixel traces. Revert is `git revert b9257543f 406437ed6 499fd597a c33b56567 5f05c8867` (tests and pins go with it).

## hcr1b (2026-11-20): Scene OFF used-move glyph grounded in pixels (commit + 7 + u), sound lead limited to ruled turns

**Pixel finding.** Scene OFF oracle traces built with `tools/integration/hcr1bLabs.py` (mechanicLab `overrides.parties`, first actor level 100 with the move, second actor level 50 Seismic Toss, dense captures over commit -> first glyph and the second action; 28 `tools/compare/traces/hcr1b-*-off.json` over 22 moves: status, Sonicboom / Dragon Rage / Seismic Toss, Absorb / Mega Drain / Curse, Tackle / Scratch, Ember / Bite / Thunderbolt, Take Down / Double-Edge, Earthquake / Fissure / Low Kick, foe and player first-actor cases) show the first used-move glyph at **commit + 7 + u** (u = the USEDMOVE print's `instructionExecution`) for every u tested (2 / 3 / 4 / 6 / 8), and the engine's u equals the ROM's in every case (Sonicboom is u = 2 in both, so hcr1m's "3" was the table's printstring-row offset, not a count error). The ROM `printstring` row is commit + 6 + u and the oracle swaps the text box one frame later. hcr1 (glyph at 6 + u) was therefore one frame early for every u, and the old fixed walk (commit + 9) is exact only for u = 2.

**Rule** (`usedMovePrintLeadAdjust`, `src/engine/battleResolutionPresentation.ts`): the hold on `action-dispatch` is `u - 2` (was `u - 3`, with `u = 2` skipping `accuracy-check`; that skip branch is gone). Same predicate as hcr1 (Scene OFF, plain `use-move`, first event USEDMOVE, u in 2..20, not forced / Focus Punch pre-pass). `tests/battleResolutionPresentation.test.ts` pins the walk 9 / 10 / 11 / 12 / 13 / 14 / 15 / 23 frames for u = 2 .. 8, 16.

**Pixel acceptance**: all 28 hcr1b traces 109/109 (frames 24.. exact, both actions); `battle-command-generated-off` 128/128 (hcr1: 84); `hpd1-sonicboom-off` 880, `-dragonrage-off` 865, `-toss10-off` 876 of 1023 (hcr1: 655 / 637 / 650; = base 94c2a6da6); `turn11-rockslide-off` 256/256 and `turn11-featherdance-off` 191/191 unchanged; `hie1-cheri-off` 477 -> 654 of 823 and `hpf1-pa-dragonrage-off` 607 -> 863 of 1023 (better than base: their ruled turns are now exact).

**Sound residual and its limit.** The ROM plays script-row sounds at the script row while the pixels follow one frame later, and the app anchors its SEs to presentation-command starts. With pixel-exact visuals the app's SEs on a ruled turn therefore come one tick late (hit SE 12 / 13 / 14, 16, 90, partly 15 / 114, the faint cry). Pixel-only (no sound change): T2 OFF 24 t2n seeds mass **4,591**, exact **97**. So that the sound clock keeps hcr1's gain, a ruled turn now carries `usedMoveSoundLead = 1` on its presentation (set when the confirm handoff ends, same predicate), and `emitTickSounds` stamps that tick's unstamped Scene OFF events one session frame earlier (`SoundTickCollector.lead`, `setSoundTickLead` in `src/audio/soundEvents.ts`). Only the event stamps move, never a presented frame, the RNG or the kernel event order. Non-ruled turns are unchanged.

**T2 OFF scoreboard (24 t2n OFF seeds), missing / extra 0 / 0 in all three**: base 94c2a6da6 mass 5,438, exact rows 126; hcr1 (4a743643d) 4,182 / 561; **hcr1b 4,257 / 533** (controller 2,941, cry 901, stat SE 397, bgm 18; rows 1,133). Pixel-only intermediate 4,591 / 97. hcr1b is 74 mass / 28 exact rows behind hcr1 on sound (cries +18 mass, the rest controller / stat) and -1,181 / +407 against base, with the pixel conflict closed. Left: the stat SE (239 / 245, out of scope, median +3 ticks), cries on the same faint anchors as SE 16 (median -1), and the non-ruled turns (status heads, forced, charge) that hcr1 never covered.

**Census** (`lsd194Census.sh`, base 94c2a6da6 vs c6a7f5c25): Scene OFF 0..199 eventsDigest identical (200 / 200 battles, 60,744 commands, 0 changed); Scene ON 0..99 byte-identical `r0.jsonl` (100 battles, 31,593 commands). T1 (`soundCensusDelta.py --t1`) 0 / 0 / 0 missing / extra / unclassified in both scenes (ON exact 26,181 move-animation rows).

**Re-pins** (presentation timing, not a rule change): `tests/randomRoundSoak.test.ts` seed 21 frames 43,411 -> 43,559 and renderCalls 3,043 -> 3,056; seed 0 full 22,840 -> 22,858; seed 1 full 60,534 -> 64,227 (turn 19, battle 3 / depth 2 unchanged); the ISSUES #89 Baton Pass pin seed 12 -> 3 (scan 0..29, candidates 3, 10, 16, 17, 20, 23, 24, 26; commits 2, first commit 49,232, halt 49,444 on MAWILE in battle 0, three Lobby new challenges); the winning carry-14 chain seed 19 -> 0 (scan 0..49: seeds 0, 10, 14, 47). `tests/lbrd.test.ts` 10 / 0 / 10 -> 23 / 23 / 23 (WIN_TWO / RETIRE / WIN_THEN_LOSE; scan 0..47 with the seed in all three roles: 23, 33, 44, 47 pass every case, 0..15 all fail at least the two WIN_TWO continuation cases).

**Gates**: `npm run typecheck` 0, `npm run build` 0, `npm run test:gate` 360 files / 2,834 tests green, the 67 files grepping `confirmHandoff` green (642 tests), `tests/lbrd.test.ts` and `tests/randomRoundSoak.test.ts` green after the re-pins.

**Papercuts**: the compare-trace app stages are a hard-coded registry in `tools/compare/appTrace.ts` (`APP_STAGES`; `hcr1bStages()` added), so a new lab trace needs a code change; PIL exists only in `vendor/mgba-venv`'s python.

## gsp2 / gsp2b: Scene ON wake-up presentation rule, re-pins, census (2026-11-20)

Branch `worker/integration-20261120-140843`; base `94c2a6da6`, rule commit `66ade13b6` (gsp2), final fix `27acadfce` (gsp2b).

### The rule (Scene ON only)

`BattleScript_MoveUsedWokeUp` is entered by attackcanceler's sleep check: the cleared status write (the `status` receipt), then `STRINGID_PKMNWOKEUP`, then `updatestatusicon`. ROM per-frame probe on the 25 t2n Scene ON seeds:

| piece | rule | constant |
|---|---|---|
| turn-start status head | the status command lasts `print instructionExecution u - 3` | `TURN_START_PRINT_BASE_U = 3` |
| mid-turn wake | the status command lasts `print - status` executions | none |
| transition into the wake-up print | `STRINGID_PKMNWOKEUP` is a transition print of `actionTransitionPauseFrames`, **Scene ON only** | `SCENE_ON_ACTION_TRANSITION_NEXT_PRINT` |
| wake-up message tail | 64 + 2 hold | `WAKE_UP_MESSAGE_TAIL_ROWS = 2` |
| wake-up `status-icon` | instructionExecution delta to the next print + 1 | `wakeUpStatusIconFrames` |

### Defect found and fixed in gsp2b

The first census of `66ade13b6` against `94c2a6da6` showed Scene OFF **not** identical: 11 of 100 battles (seeds 13, 17, 19, 46, 48, 52, 60, 64, 65, 87 ...) gained an inserted `move-animation` pause (9 .. 18 frames, `eventsDigest` equal). Cause: `ACTION_TRANSITION_NEXT_PRINTS` is the one rule for both scene modes, so adding `STRINGID_PKMNWOKEUP` to it inserted the transition pause in Scene OFF too. `27acadfce` moves it to a Scene ON only constant (the caller passes `(hitMarker & NO_ANIMATIONS) === 0`). Scene OFF 0..99 after the fix: 100 / 100 battles identical to base (`rst197CensusDelta.py`: bad 0).

### Re-pins (old -> new)

| test | old | new |
|---|---|---|
| `tests/randomRoundSoak.test.ts` "ISSUES #89 ... Baton Pass" | `runSeed(12, ...)`: seed 12 no longer commits Baton Pass (0 commits in 80,000 frames) | `runSeed(6, ...)`: `tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 3` candidates 6, 16, 35, 38; seed 6 lowest (4 commits, first 61360, halt 61558, LEDIAN, battleIndex 0) |
| `tests/sa125StatusAnimationCommand.test.ts` SA3 seed 19 `STRINGID_PKMNWOKEUP` status command | 32 | the rule: head `u - 3` (`head u3->0, u6->3, u8->5`), mid-turn `mid 2->2`; `STRINGID_PKMNWENTTOSLEEP|false` stays `32->32` |

No other soak / lbrd pin moved (every test grepping STATUS_TIMING / minimumFrames / HELD_ITEM_EFFECT / hie1 / sa125 / wake / WOKEUP: 95 files, 2,155 tests, green).

### Census 0..199 Scene ON (base `94c2a6da6` vs `27acadfce`)

- `eventsDigest` and `error` identical on 200 / 200 battles; 162 battles identical command lists, 38 changed (all wake-up turns).
- Command types: the only type-sequence change is **76 inserted action-transition `move-animation` pauses** (27 battles; 9 x18, 10 x10, 11 x10, 12 x21, 13 x1, 14 x12, 15 x2, 18 x2 frames), each directly before a `sprite-visibility` MoveEnd run, none anywhere else.
- Changed commands per rule in the 11 type-aligned changed battles (24 wake-ups): head / mid `status` 32 -> rule (-32 x11, -31 x2, -30 x8, -29 x1, -24 x2); wake-up `message` +2 x24; wake-up `status-icon` 1 -> 4 / 5 / 6 (+3 x17, +4 x6, +5 x1). The 27 battles with inserted pauses were checked for type sequence only, not histogrammed.
- Sound (`soundCensusDelta.py` arm vs arm): 162 identical, 38 seeds with the same event sequence and moved frames. T1 (`--t1` on both arms): exact 54,005, known-offset 0, missing 0 (gated / declined / cry-task / other), extra 0, unclassified 0, identical on both arms; only the "action-transition pause" command count rises 2,827 -> 2,903 (+76).

### T2 (25 t2n Scene ON seeds, `soundScoreboard.py`)

| arm | offset mass | exact rows | offset rows | missing / extra |
|---|---|---|---|---|
| base `94c2a6da6` | 32,966 | 980 | 4,897 | 0 / 0 |
| wake-up rule | **28,701** | **997** | 4,880 | 0 / 0 |
| wake-up rule + held-item item 2 | not landed (below) | | | |

The scoreboard ran on `66ade13b6`; `27acadfce` only gates a Scene ON constant behind the Scene ON flag, and the Scene ON census numbers above are the same on both tips.

### Six rows the rule made worse (seeds 2230 / 8612)

Report only, not changed. Before the rule, every wake-up interval defaulted to 32 frames, and on these turns that default happened to land close to two short non-wake intervals: seed 2230's charging-turn gap and seed 8612's Rest turn. The rule shortens the wake-up interval correctly, which exposes the two other intervals as the real offset; they are not wake-up rows and are outside this rule.

### gsp1m landing item 2 (held-item restart / after-status-icon leads): measured, **not landed**

Env-knob sweep over the held-item lead (T2 mass, 25 seeds; wake-up rule baseline 28,701):

| variant | mass | exact |
|---|---|---|
| restart lead -2 / +2 / +4 / +6 | 29,033 / 28,549 / 28,631 / 28,929 | 997 / 1,017 / 997 / 1,002 |
| continue lead -3 / +3 / +6 / +9 | 29,218 / 28,312 / 28,195 / 28,218 | 995 / 995 / 989 / 989 |
| after-status extra -4 / +4 / -8 / +8 | 28,841 / 28,561 / 28,541 / 28,541 | 997 / 1,012 / 997 / 997 |
| lead after a `message` command -4 / -6 (restart and continue) | 29,541 / 30,361 | 1,020 / 970 |
| restart lead after `sprite-visibility` +3 | 28,471 | 1,014 |
| continue lead after `sprite-visibility` +3 / after `message` +6 | 28,422 / 28,701 | 995 / 997 |

Trimming leads (gsp1m's hypothesis) **worsens** mass everywhere (restart -2 +332, continue -3 +517, message -4 +840). The variants that lower mass add frames (continue +3 .. +9, restart +2), which contradicts the hie1 ROM labs (leftovers / sitrus 229, shellbell 223, cheri 192, `tests/hie1HeldItemEffect.test.ts`); the held-item group offset is inherited from other commands (hp bar / turn-end intervals). hie1 constants (214 / 15 / 9 / +1) are unchanged; `heldItemEffectExecutionsAndLead` is shared with Scene OFF, so any later change must be Scene ON only. Item 3 not started.

### Gates

`npm run typecheck` 0; `npm run build` 0; `npm run test:gate` 360 files / 2,832 tests green; grep-matched tests 95 files / 2,155 tests green; `npm run soak -- --policy vanilla --seeds 0:20` 20 / 20 OK and `--scene on --parallel 4` 20 / 20 OK.

### Oracle compare trace

Not obtained: no existing lab keeps the engine's sleep duration in step with the oracle past the first turn. A 3-turn extension of `lse1-hypnosis-player-on` is in step at frame ~1690 (0.6 % diff) but the oracle foe wakes on turn 2 and the engine's on turn 3 (oracle player HP 93 / 105 against the engine's 105 / 105 at the wake-up frame), so the frames cannot be paired.

## hcr1c (2026-11-20): the ruled-turn sound lead limited to the move-script sounds; the other seven failing pins restored or re-pinned by rule

Fix-forward of hcr1b (full suite on fold-a `9a12931d7`: 8 failed in 6 files). Scene OFF presentation / sound timing only: no logical outcome, RNG, kernel event order or presented pixel changes; Scene ON byte-identical.

**Cause, per test** (lead zeroed locally, rerun):

| failing pin | cause | action |
| --- | --- | --- |
| `aud241c` win / brain / loss OFF end windows | the lead: SE_SELECT dismiss, victory / return BGM, fade, SE_EXIT, SE_BALL_OPEN scheduled in the same ruled turn were stamped one frame early (relative deltas `0, -1, -1, -1, -1, 0..`) | lead restricted (below); pins unchanged, all `0` again |
| `ais4` SE_BALL_OPEN + cry (680 vs 681), `obr251` SE_BALL_TRAY_ENTER (525 vs 526) | the lead, same leak (send-in / tray scheduled in a ruled turn) | lead restricted; pins unchanged |
| `aud241b` super-effective OFF | not a leak: the pin was a stale `-1` ("one early in Scene OFF"); with the lead the SE, cry and SE_FAINT are **ROM-exact (0)**. With the lead zeroed every aud241b OFF window is `+1` (pixel rule moved the presentation, the ROM plays the script-row sound one frame earlier), so the lead is ROM-supported for hit / faint / cry sounds | pin updated `[-1 x5]` -> `[0 x5]` (a ROM frame) |
| `ais2` seed 2741 OFF | **not the lead** (it hashes rendered pixels; fails with the lead zeroed, passes with `u - 2` forced to 0). The hcr1b hold makes the ruled turns before the window longer (ROM-exact in the lab), so the window is the same ROM frames 2 engine frames later | the hpd1 precedent: `romFrameOffset` 40 -> 38, `lo` / `hi` 2745 / 3032 -> 2747 / 3034, md5s unchanged (same ROM frames; Scene ON untouched) |
| `pic9SwitchLines` | trajectory / coverage pin: every line still follows the foe's HP, but seeds 0 and 1 now reach come-back scales `[0, 2, 3]` (not `1`) | soak seeds `[0, 1]` -> `[0, 1, 4]` (seed 4 alone: back 0/1/3, in 0/1/2; scan 2..7), expectation `[0,1,2,3]` unchanged |

**Rule.** `usedMoveSoundLead` still marks the ruled turn, but the lead is now applied to the move-script rows only. `emitTickSounds` sets `setSoundTickLead` just around `emitBattleHitSounds` / `emitMoveAnimSounds` / `emitStatsChangeSounds` / `emitDoubleTeamStatsChangeSound` / `emitGeneralAnimSounds` and clears it after; `scheduleAfter` (`screenSounds.ts`) records the lead in force when a sound is scheduled (`getSoundTickLead`) and `runScheduledScreenSounds` restores it around that callback. Hit SE, effectiveness SE, faint cry and SE_FAINT (scheduled by `battleHitSounds`) keep the lead; everything scheduled by the battle-end, mid-battle switch, party send-out, loss-ball and forfeit emitters (all after the lead is cleared) is stamped on its own tick. Only event stamps move.

**Acceptance.** All 8 listed tests green; every test file grepping `usedMoveSoundLead` / `confirmHandoff` / `tickSounds` / `scheduleAfter` plus `aud241*`, `ais*`, `obr251*`, `pic9*` (66 files, 550 tests) green. Pixels unchanged: `battle-command-generated-off` 128/128, `hcr1b-absorb-foe-off` and `hcr1b-doubleedge-foe-off` 109/109, `hpd1-sonicboom-off` 880/1023. **T2 OFF, 24 t2n seeds, missing / extra 0 / 0: mass 4,083, exact rows 571** (hcr1b 4,257 / 533, hcr1 4,182 / 561, base 94c2a6da6 5,438 / 126; of 1,133 matched rows: controller 832 rows mass 2,836, cry 192 / 832, stat SE 105 / 397, bgm 4 / 18). Method: `tools/audio/aud249Rescore.sh .integration/evidence/t2n TO SEED off` over the same ROM files, then `soundScoreboard.py`; mass is the sum of abs(engine - ROM) over matched rows. **Census** (`lsd194Census.sh`, seeds 0..99, one shard): Scene OFF `eventsDigest` identical vs `94c2a6da6` (100 / 100, 0 errors, commands equal); Scene ON `r0.jsonl` byte-identical vs fold-a `9a12931d7`. `npm run typecheck` 0, `npm run build` 0, `npm run test:gate` 360 files / 2,834 tests green.

**Left** (not re-attributed here): the stat SE (105 rows, median +3, out of scope), and the non-ruled turns hcr1 never covered. Papercut: `lsd194CensusDelta.py` named in `lsd194Census.sh`'s header does not exist; the digests were compared with a 5-line script over `r0.jsonl`.

## fsc1: hit animation on an invisible target, hit-all loop EMPTYSTRING3 box

Presentation timing only; logical outcomes, RNG and kernel event order are unchanged (census `eventsDigest` identical, below).

**c1, Scene OFF only: a hit on a semi-invulnerable (invisible) target completes at once.** ROM: `battle_controller_opponent.c:1804-1817` (the hit-animation handler completes immediately when the target sprite is hidden). ROM bar start is SE+3 against SE+36 for a visible hit (seed 648, `fsc1m`), so the 35-frame blink becomes 2 command frames (`HIT_ANIMATION_INVISIBLE_FRAMES`, `HIT_ANIMATION_INVISIBLE_TIMING` with `invisibleTarget: true`; the renderer then draws no hit reaction). A target counts as invisible when STATUS3 (ON_AIR | UNDERGROUND | UNDERWATER) is set before the hit, or when a charge-turn script's `MOVEEND` hid it (`set-battler-sprite-visibility` is honoured only with `opcodeName === "B_SCR_OP_MOVEEND"`; switch-in visibility events must not count, which snd2 caught). Gate: `HITMARKER_NO_ANIMATIONS`.

**Scene ON finding: c1 is not applied.** `fsc1-fly-gust-on` (500-frame capture) shows the ROM bar starting at 358 although the sprite is hidden, so the ROM does not skip the blink with the Scene on; applying c1 there made the compare worse (123 -> 108 matched). The Scene ON rule is unmeasured (the app's Gust animation also ends about 20 frames before the ROM's, a lead-in offset that belongs to the Scene ON sound/animation steps). `tests/fsc1HitTiming.test.ts` pins Scene ON fly-gust at 35.

**c2: the hit-all loop's EMPTYSTRING3 box** (`BattleScript_DoHitAllWithUndergroundBonus`) is timed from the kernel instruction count, `hitAllLoopEmptyBoxTiming`:
- non-KO box: `to - from + 1` rows up to the next event's `instructionExecution` (5 rows in dig-eq, was 24 held);
- KO box (next event is `play-faint-cry`): 1 row, cleared at once; the existing faint lead (`faintScriptPreCryFrames`) presents the remaining rows up to `playfaintcry`;
- the hp command before such a box takes the hit-effect message tail (`hpMessageLeadRows`: `messageExec - hpExec + 2`, 7 for hp 53 -> box 58).

**Compare** (`npm run compare -- <trace> --summary`, before -> after; Scene ON cases that are not listed are unchanged from base):
- `fsc1-dig-eq-off` 152 -> 154 raw at a constant shift of 8, with the drain exact (app 248..302 = oracle 256..310);
- `fsc1-fly-gust-off` 165 -> 218; `fsc1-dive-surf-off` 151 -> 153;
- `fsc1-eqko-off` 533 -> 742 of 899 matched (box clear at 193 and faint sink at 264..270 align); `fsc1-eqko-on` 782 / 899;
- `fsc1-{dig-eq,fly-gust,dive-surf}-on` unchanged at base.
Residuals, all attributed: (1) the charge-turn EMPTYSTRING3 box is 8 frames early (pre-existing, first diff at frame 30; hence the shift of 8); (2) the transition at about 165..173; (3) the faint print leads the ROM by 1 frame after the sink (oracle 279, app 280), growing to 2 at about 308..310 (the faint message -> party summary interval, c3's subject); (4) periodic 24 px idle-animation diffs; (5) Scene ON animation lead-in offsets.

**T2 OFF, 24 t2n seeds, missing / extra 0 / 0: mass 3,817 (base 4,083), exact rows 571** (`aud249Rescore.sh` over the same ROM files, `soundScoreboard.py` DELTAS). **Census** 0..199, both scenes: `eventsDigest` identical to base `04b595cc1`; presentation commands changed: 182 box + 79 hp (+1 hit-animation, Scene OFF) in 78 / 77 seeds. **T1** 0 / 0 / 0 on both scenes, identical to base (ON exact 54,005). `npm run typecheck` 0, `npm run build` 0, `npm run test:gate` 360 files / 2,834 tests green; all aud2* / snd* / cry1* / hie* / adp1* / ais* / obr251* / pic9* files and every test grepping `HIT_ANIMATION_TIMING` / `EMPTYSTRING3` (83 files, 1,068 tests) green. No ROM-exact pin moved away from the ROM.

**Re-pins** (`tests/randomRoundSoak.test.ts`, each with a history note; `tests/lbrd.test.ts` green unchanged): (a) seed 21 "all seven generated wins": frames 43_559 -> 43_550, renderCalls 3_056 -> 3_054; (b) ISSUES #89 Baton Pass halt: seed 3 no longer commits Baton Pass, `batonPassSearch.ts --seeds 0:30 --parallel 3` finds 6, 27, 28, pinned 3 -> 6 (6 commits, first 47503, halt 47543 on MAWILE, battleIndex 0); (c) ISSUES #104 (b) winning carry >= 14: seed 13 now carries 7, `randomRoundSoak.ts --policy winning --max-rounds 3 --render-every 0 --seeds 0:50 --parallel 3` finds 19, 23, 40, pinned 13 -> 19.

**c3 not attempted** (faint message -> party summary interval): the 1..2 frame drift above is its entry point; FaintedMonTryChoose's cost and the text-length dependence are unmeasured.

Evidence: `.integration/evidence/fsc1/` (git-ignored: compare outputs `base-*` / `c12-*`, `t2/`, `t2base/`, `t2-scoreboard.txt`, `census/{off,on}-{04b595cc1,5edacd5ab}/`). Labs: `tools/integration/fsc1Labs.py` (regenerates `tools/battle-lab/fsc1-*.json` and `tools/compare/traces/fsc1-*.json`). Papercuts: the compare summary prints only the tail line; `soundScoreboard.py` has no `__main__` guard and no mass output (the mass needed an import with `sys.argv` set); the harness auto-backgrounds any command over 120 s unless `timeout` is passed.

## hcr2: Scene ON first used-move glyph (oracle pixels), hold u - 2

Question: does the hcr1b rule (first glyph at commit + 7 + u) hold in Scene ON, and is "Scene ON absorbs u downstream" (hcr2m) a pixel fact or a sound-anchoring one?

### Pixel finding

`tools/integration/hcr2Labs.py` builds 28 ON labs (the hcr1b designs, ON profile: `tools/battle-lab/hcr2-*.json`, traces `tools/compare/traces/hcr2-*.json`, stages `hcr2Stages()` in `tools/compare/appTrace.ts`; foe u = 2 / 3 / 4 / 6 moves plus six player-side labs). The ON oracle prints the used-move text at the **same commit + 7 + u** as Scene OFF; the app's fixed confirm-handoff walk reaches it at commit + 9, so it was early by u - 2 in ON too. In pixels the adapted bodies are already exact relative to the print, so "ON absorbs u downstream" is a sound-anchoring effect, not a pixel one.

### Rule (`battleResolutionPresentation.ts`)

`usedMovePrintLeadU` no longer requires `NO_ANIMATIONS`: `action-dispatch` holds u - 2 frames in both scenes (Tier-1 pin in `tests/battleResolutionPresentation.test.ts`: 9 / 10 / 11 / 12 / 13 / 14 / 15 / 23 frames for u = 2..8, 16 in ON and OFF). Nothing downstream was stacked: no counter lead was touched. The OFF one-tick sound stamp lead stays OFF only (`usedMoveSoundLeadOf`).

### Results (tested code a4bd32997 + test re-pins; ON labs against the ON oracle)

- All 167 ON traces with a parsed summary, base -> rule: 85 more matched frames, 82 equal, 1 lower (`lead3-knockoff-on` 103 -> 98 of 1023; it differs from frame 0 in both, incidental). Named: hie1-*-on (cheri 279 -> 566, leftovers 851 -> 1558, shellbell 851 -> 1560, sitrus 982 -> 1715), hie2-sitrus-opp-on 343 -> 994, hpd1 / hpd8 / hpd5 / hpf1 / lse1 / lse4 / lead2 / lead3 / liv2 ON all up (hpd1-sonicboom-on 938, hpd8-bodyslam-on 574 -> 914 of 1023). battle-command-generated is OFF only (unchanged). turn11-* are OFF traces (unchanged).
- New hcr2 traces: exact 3 -> 8 of 28, 21 improved. The first glyph is exact on all of them; what remains is not the print: an app-only foe-sprite pose change (410 px, from the end of the print, e.g. absorb / ember / growl / tackle / scratch / fissure / lowkick / megadrain) and unadapted move bodies (Tackle, Scratch, Fissure, Megadrain, Curse: wrong print -> animation / hit interval, animation lane).
- T2 Scene ON, 25 t2n seeds: missing / extra 0 / 0; exact rows 997 -> 722, offset mass 28,701 -> 26,893 (the exact count drops while mass improves: the pixel-exact bodies now sit at a constant sound offset instead of an accidental zero).
- Census (`lsd194Census.sh`, base 6968cc666 vs a4bd32997): Scene ON 0..199 eventsDigest identical (200 / 200 battles, 62,327 commands, `rst197CensusDelta.py` bad 0); Scene OFF 0..99 `r0.jsonl` byte-identical to base. T1 (`soundCensusDelta.py --t1`, ON 0..199): exact 54,005, known-offset 0, missing 0, extra 0, unclassified 0 (= base).

### Sound: not landed

The ROM plays script-row SEs ahead of the pixels. Measured on the labs (engine - ROM, frames): with the hold and no lead, move SEs sit at +2 (u = 3), +2 (u = 4), +2 (u = 6), 0 (u = 2); a **two-tick** stamp lead for u > 2 (zero for u = 2) makes them 0 on adapted bodies (absorb, megadrain, bite, doubleedge, ember, takedown, thunderbolt, harden), T2 ON exact 997 -> **1707**, mass 25,927, missing / extra 0 / 0 (commit a63e1ee58). It was **not** kept: the T1 census windows then shift (known-offset -2 on 35,590 commands, 61 missing after the last presenting frame, 103 unclassified), because the scorer anchors rows to the command's presenting frames. To land it, the T1 window must follow the lead (as the SE rows already do); that scorer change was out of the time box. Other leftovers: dragonrage / sonicboom / earthquake / toxic / lowkick SEs (-3 .. -5, u = 2 / 3 bodies with their own table lead), defensecurl +4.

### Re-pins (`tests/randomRoundSoak.test.ts`)

- ISSUES #89 Baton Pass pin: seed 6 -> seed 3 (`batonPassSearch.ts --seeds 0:40 --parallel 6`: candidates 3, 10, 16, 17, 20, 23, 24, 26, 36; seed 3 commits 2, first 49232, halt 49444 MAWILE battleIndex 0, three Lobby new challenges).
- M-B step 2 (c) "full" pin, seed 1: frames 64,227 -> 64,299 (same turn 19 / battle 3 / depth 2 / roundLost).
- `tests/lbrd.test.ts`: unchanged (passes).

### Gates

`npm run build` 0 and `npm run test:gate` 360 files / 2,835 tests green on a4bd32997; the 66 `confirmHandoff` test files / 638 tests green; `randomRoundSoak` + `lbrd` green after the re-pins; `npm run typecheck` 0 on a63e1ee58 (a4bd32997 only deletes a constant; re-run on the final tip below).

## hcr2b: Scene ON sound lead per emitter (ROM-measured), T1 in emission ticks

Question: why do the ROM's Scene ON sounds lead the pixels, by what, and can the lead ride hcr1c's scoped mechanism (per scheduled sound, no global stamp shift)?

### Measurement (hold-only labs, `tools/battle-lab/hcr2-*.json`, ROM sound log vs engine stamps at a4bd32997)

- Move-body table SEs (`playMoveAnimSound` rows): ROM leads the pixels by **2 for u > 2**, by **0 for u = 2** (u = the USEDMOVE print's `instructionExecution`). Adapted bodies (absorb, megadrain, bite, doubleedge, ember, takedown, thunderbolt, harden) land on the ROM frame exactly.
- Hit / effectiveness / faint-chain SEs and the faint cry: **1** (the aud241b faint / low-HP windows: 4 of the 5 tests that were red at base go green at a uniform lead 1; `super-effective-window` goes 2 -> 1, see residuals).
- Stat-change SEs and the Double Team stat SE: same lead as the move body (2 for u > 2). `aud252DoubleTeamStatSe` (gap 34 -> 36) pins this.
- General-animation (status / weather-continues) rows: **0**. A lead of 2 there was worse (T2 mass 25,442 vs 25,108) and was not kept.
- Not constant: Curse (-3) and Seismic Toss (-1) sit off the two-tick rule on the labs; they are residuals, not a second rule. The reason the lead depends on u (a link to seGate / bodyLeadFrames / the sound shift) is not established; the rule is stated as measured.

### Rule

- `usedMoveSoundLeadsOf(state, u)` (`battleResolutionPresentation.ts`) is set once at confirm-handoff end. Scene OFF: `{hit 1, script 1, anim 1}` (unchanged). Scene ON: `{hit 1, script 0, anim u > USED_MOVE_LEAD_MIN_U ? 2 : 0}`. State fields `usedMoveSoundLead` (hit / effectiveness / faint), `usedMoveScriptSoundLead` (general animation, ON 0), `usedMoveAnimSoundLead` (move body, stat change, Double Team stat SE).
- `tickSounds.ts` calls `setSoundTickLead` per emitter; `scheduleAfter` (`screenSounds.ts`) records the lead per scheduled sound and `runScheduledScreenSounds` restores it, so a lead set at one emission survives a later flush. The collector (`soundEvents.ts`) stamps unstamped events `frame - lead` and now also returns `leads` (what was subtracted). Battle-end, send-in, tray and screen sounds carry no lead and keep their frames.
- T1 follows the lead without loosening: `lsd194Census.ts` records a `soundLead` array parallel to `sound`; `soundCensusDelta.py --t1` converts each row back to its emission tick (`frame + lead`) before the window / classifier, so the class table is unchanged and the tolerance is untouched. Arm-vs-arm mode is untouched.
- Considered and not kept: faint cry at lead 0 with SE_FAINT at lead 0 (T2 exact 1,988, mass 25,068) breaks 4 aud241b faint windows; cry 0 / SE_FAINT 1 gives the same T2 as the uniform lead and also breaks the windows. The uniform hit lead is what the ROM labs pin.

### Results (tested commit 0b4bdda63 = tree of the tip before the doc commit; base 0a63934b2)

- **T2 Scene ON, 25 t2n seeds: missing / extra 0 / 0.** Exact rows 722 -> **1,960** (move-animation 1,614, stat-change 16, cry 29, battle-controller 300, bgm 1), offset mass 26,893 -> **25,090** (5,670 rows, 1,930 at delta 0). Matched-row delta (engine - ROM): move-animation median 0 (p10 -10, p90 5), battle-controller median 0, stat-change median 0, cry median -3. For reference the global two-tick stamp (hcr2) gave 1,707 / 25,927.
- **T1 Scene ON 0..199: exact 54,005, known-offset 0, missing 0, extra 0, unclassified 0**, class table byte-identical to the base arm (`sed 1d` diff empty). Known-offset count is 0, so there is nothing to explain; the tick-space conversion is what keeps it 0.
- Census: Scene ON 0..199 eventsDigest identical and command frames unchanged (`rst197CensusDelta.py`: 200 / 200 battles, 62,327 commands, bad 0); Scene OFF 0..99 identical (100 / 100, 30,813 commands, bad 0).
- Pixels: `npm run compare -- <trace> --summary` equal to base on hcr2-tackle-plr-on 38/229, hcr2-ember-plr-on 105/229, hcr2-absorb-plr-on 229/229, hcr2-takedown-foe-on 229/229, hcr2-toss-foe-on 198/229, hcr2-harden-foe-on 229/229 (hcr2-doubleedge-foe-on 228/229 and hcr2-bite-foe-on 187/229 also equal on the pre-commit tree). Sounds never feed pixels.
- Gates on 0b4bdda63: `npm run typecheck` 0, `npm run build` 0, `npm run test:gate` 360 files / 2,835 tests green. The full `npm test` was not run (not asked for).

### Re-pins (tests moved TO the ROM; `delta` = ROM - ours, every other field unchanged)

- aud242a..m (13 files): per-body Scene ON `delta` pins updated to the measured values (most go to 0 or toward it).
- aud248 (stat-change SE residuals, six rows), aud249 (flatter / swagger first and second SE 0), aud261 (six pins to 0), aud262 (waterspout windows 0, odorsleuth -4 -> -3, payday 2 -> 0, lusterpurge player 2 -> 0, Memento -7 -> -6).
- aud241b `super-effective-window` 2 -> 1 (residual of one tick; the same turn's faint windows are 0). Also `audioSinkPlumbing` (`leads: [0]`) and `aud252EndTurnSounds` ([-1, -2, 1] -> [0, -1, 2] on the lead split) at the first commit 2a374b683.

### Not re-pinned (moved away from the ROM or unmeasured; red, flagged)

The sound set (`tests/aud24*`, `aud25*`, `aud26*`, `snd*`, `*Sound*`, `adp*`, `hie*`; 75 files, 615 tests) has 41 failures at 0b4bdda63 against 177 at the hold-only base. 33 of the 41 were green at base and moved: adp1 beatup / rocksmash; aud242b dragonrage x2; aud242c flamethrower x2; aud242d thunderbolt / metalclaw / steelwing; aud242n spark x2; aud242o petaldance; aud242p encore / mistball / reversal; aud242q extrasensory / secretpower / superfang; aud242r eruption / spikecannon; aud258 counter / seismictoss / seismictossstrong; aud260 brickbreak / recycle; aud261 zapcannon x2; aud262 present; hie3 cheri / leftovers / shellbell / sitrus x2 (ours 731 vs the pinned 730 and the like). The two-tick body rule moves these bodies 1..2 ticks away from where their old pin sat (dragonrage, flamethrower, spark, petaldance, brickbreak, superfang, spikecannon, present and lusterpurge opponent were measured as moving away from the ROM; the rest were not attributed in this step). They are the residual the next step has to attribute with per-body ROM labs, not a bigger constant. The other 8 (aud242e x5, aud252LossBallOpen x2, snd1RoomSounds) were red at base too and were not re-pinned. None of these is in the gate.

### Papercuts

- `lsd194Census.sh` archives a tree-ish only, so the uncommitted tree was measured through a throwaway tree object (`GIT_INDEX_FILE=... git add -u; git write-tree`).
- A first-row-only shift estimate misjudges multi-row bodies (flamethrower, spark): the pins were taken per row.

## hcr2c: Scene ON move-body sound lead per body (fix-forward of hcr2 / hcr2b)

Scene ON sound timing only; logical outcomes, RNG, kernel event order and presented frames unchanged; Scene OFF untouched. Base `f555ba685`.

### Cause

hcr2 holds action-dispatch u - 2 frames (u = the first used-move print's `instructionExecution`), so every later body of the turn runs u - 2 ticks later than the sound tables expect. hcr2b answered with one flat lead (2 for u > 2) for all move bodies. Pins that were ROM-exact on master (delta 0) therefore moved by (u - 2) - 2: `pin_new = pin_master - (u - 2) + lead`, i.e. the ROM-exact lead of a body is `c = (u - 2) - pin_master`, and it is not one constant. The sound tables are calibrated at a script lead of 7 frames; the kernel's presented script lead of a body is `bodyLeadFrames` (L). For every audited plain body (L >= 4) c = 7 - L at every u (L 5 -> 2, Seismic Toss L 6 -> 1, Counter L 4 -> 3, Dragon Rage L 9 -> -2).

### Rule (`usedMoveBodySoundLeadOf`, `tickSounds.ts` before `emitMoveAnimSounds`)

- Audited plain body (`bodyLeadFrames` >= 4, `lse2BodySoundAgeShift` = 0): lead = 7 - L (the table's clock minus the body's presented lead). No per-move list.
- Everything else (L < 4 or no body: Present, Memento, Double Team, ...): `min(u - 2, 2)`. The unaudited bodies' c varies per body (Present 0, Memento 8, Double Team 2 at u = 3); the cap is the best T2 compromise. Tried and rejected: flat 2 (moves Present / Brick Break away), 2 for 1 <= L < 4 (T2 exact 1,883 / mass 24,340).
- LSE2 / LEAD4 "S" bodies (Leech Seed L 36 ...) already carry the difference in `lse2BodySoundAgeShift`; applying 7 - L to them raised T2 mass by 594, so they keep the cap.
- Stat-change / Double Team stat SEs, general-animation and hit leads as in hcr2b (the stat / Double Team lead is `min(u - 2, 2)`, Scene OFF 1 for everything). `usedMovePrintU` is stored at confirm-handoff end.

### Results (tested commit `0af7d2016`)

- **T2 Scene ON, 25 t2n seeds: missing / extra 0 / 0.** Exact rows 1,960 -> **2,359** (move-animation 2,001, stat-change 28, cry 29, battle-controller 300, bgm 1), offset mass 25,090 -> **24,219** (5,670 rows, 2,329 at delta 0).
- **T1 Scene ON 0..199: exact 54,005, known-offset 0, missing 0, extra 0, unclassified 0**; class table byte-identical to the base arm.
- Census (`lsd194Census.sh`, base `f555ba685` vs `0af7d2016`, `rst197CensusDelta.py`): Scene ON 0..199 200 / 200 battles, 62,327 commands identical, bad 0 (`eventsDigest` identical); Scene OFF 0..99 100 / 100, 30,813 commands, bad 0.
- Pixels equal to base: hcr2-tackle-plr-on 38/229, ember-plr-on 105/229, absorb-plr-on 229/229, takedown-foe-on 229/229, toss-foe-on 198/229, harden-foe-on 229/229.
- Gates: `npm run typecheck` 0, `npm run build` 0, `npm run test:gate` 360 files / 2,835 tests. The 71 sound files (aud2*, snd*, cry1*, hie*, adp1*, ais2*) all green; the full `npm test` was not run.

### Pins moved

Moved to the ROM (the old pin was a hold artefact): aud242b dragonrage 3 -> 0; aud242c flamethrower 5 -> 3; aud242d thunderbolt / metalclaw / steelwing (engine-frame keys re-keyed); aud242e toxic 3 -> 0, overheat 3, counter 0 (no extras), poisontail / thunderbolt keys, absorb extra 2 -> 1; aud242n spark 5 -> 3; aud242o rollout 3 -> 0; aud242p reversal / mistball 0; aud242q furycutter 0, secretpower 0 x4, extrasensory 0 x3, superfang 0 x2; aud242r eruption 0; aud258 swordsdance 1 -> 0; aud261 zapcannon [2, 3, 3] -> [0, 1, 1]; adp1 rocksmash [2, 2] -> [0, 0]; aud262 Memento -6 -> -7 and Odor Sleuth -3 -> -4 (back to the master values); cry1 command starts +1 / +2 (offsets 16 / 16 / 16 / 43 / 14 / 14, drifts unchanged); hie3 commandStart +1 (drifts 1 / 2 / 12 -> 0 / 1 / 11).

Moved away from the ROM (known non-ROM residuals, named in each test): Haze / Seismic Toss second-mover row 2 -> 3 (aud242b rowDelta, aud258 haze offset); rollout5 turns 4 / 5 [-2, -3] (was 0, -1); iceball5 turns 5 / 6 [-3, -3, -5, -5] (was -1, -1, -3, -3). Cause: the hold and the lead are set once per presentation from the first print's u, so a later turn / second mover keeps that u. Fixing it needs a per-print u, which is hcr2's presentation, not a sound lead.

Pixel / presentation re-pins (not sound leads; pure uniform shifts carried by the hcr2 hold):
- `ais2AiSwitchFrames` Scene ON: all 251 md5s identical at engine frames +2 (offset 57 -> 55, window 3824..4074 -> 3826..4076; the sweep found 0 mismatches at +2 and >= 147 at every other shift). The AI switch's turn starts with a u = 4 print, so the hold delays it by 2. The window was ROM-exact at base: hcr2's hold made this downstream pixel window 2 frames late relative to the ROM lab.
- `aud252LossBallOpen`: seed 1914 [0, 8, 0 x6] -> [3, 12, 4 x6] (Icy Wind, u = 6, hold 4; the faint SE keeps its 1-tick hit lead), seed 2230 [7, 3, 1 x5, 0] -> [10, 6, 4 x5, 3] (u = 5, hold 3). These rows were ROM-exact at base (1914). A general-animation / end-sound lead of the hold fixes the select SE and ball open but moves the item-effect rows of 2230 the wrong way and costs T2 (mass 24,219 -> 24,863), so it was not kept.
- `snd1RoomSounds` reads the stamped event frame (the ROM clock) instead of the tick frame; no pin moved (SE 135 = Double Team at 1967, the ROM frame).

### Unreconciled

- aud252 seeds 1914 / 2230 and the ais2 Scene ON window: the hold itself leaves the turn's later rows / pixels late by u - 2 against the ROM lab. A sound lead cannot repair pixels; if the ROM has no such delay downstream, the hold of hcr2 needs a matching shortening of a later command (presentation change, out of this step's scope).
- Unaudited bodies (L < 4, Present / Memento / Double Team): c varies per body; kept on min(u - 2, 2).
- Second-mover / later-turn bodies (Haze, rollout5, iceball5): stale u as above.

### Papercuts

- The `aud242*` `rowDelta` / `extra` keys are raw engine frames, so every engine-frame move needs a re-key; a key relative to the body's start would survive.
- `snd1RoomSounds` pinned the tick frame, which silently differs from the stamped frame the scoreboards use once a lead is set.

## hcr2d (2026-11-20): per-print u and the hold's downstream absorption, fix-forward of hcr2 / hcr2b / hcr2c (no engine change; the pins are back at master and RED)

Scene ON only; Scene OFF untouched. Source `src/` is byte-identical to the base `65d40ffa6` (tip commits touch `tests/` and this doc only), so T1 / T2 / census / the six hcr2-*-on traces are the hcr2c numbers by construction: T1 ON 0..199 0 / 0 / 0 / 0, T2 ON 25 seeds missing / extra 0 / 0 with 2,359 exact rows / mass 24,219 (id-row sum, same script), the six traces 38 / 105 / 229 / 229 / 198 / 229 of 229. `npm run typecheck` 0, `npm run build` 0, `npm run test:gate` 360 files / 2,835 tests green (none of the listed pins is in the gate list). The `aud2* / snd* / cry1* / hie* / adp1* / ais* / obr251* / pic9* / flow1* / rol* / ice*` files are green except the seven pins below, which are left RED on purpose.

### 1. Per-print u for the sound lead: built, measured, dropped

`usedMoveBodySoundLeadOf` reads `state.usedMovePrintU`, set once from the segment's first print. Per-print version (commit 44e680a77, reverted): the lead of a body is taken from the USEDMOVE print that precedes its own animation event. The Haze row (Seismic Toss, the second mover: first print u 2, own print u 3, L 6) needs lead 0 to reach the master offset 2; the hcr2c rule gives it `7 - L` = 1 (offset 3). Data of the four second-mover bodies in the sound pins (first u, own u, L, lead the pin needs): Swords Dance -> Seismic Toss (4, 3, 6, **1**), Haze -> Seismic Toss (2, 3, 6, **0**), Defense Curl / foe -> Counter (3, 4, 4, **3**), foe -> Revenge (4, 6, 5, **2**). No function of the own u alone fits both Seismic Toss rows (same own u 3 and L 6, leads 1 and 0); the only separating feature is that the first print had no hold (u 2). The rule "a second print behind a u = 2 first print carries no lead" restores Haze 3 -> 2, rollout5 [0, 0, 0, -2, -3] -> [3, 2, 2, 0, -1] and iceball5 -> [3, 3, 2, 2, 2, 2, -1, -1, -3, -3] (all three ROM-better only in the sense of the master pins), every other sound file stays green, **but** T2 ON drops: exact rows 2,359 -> 2,210 (move-animation 2,001 -> 1,852), mass 24,219 -> 24,567 (SE 124 162 -> 108 exact, 126 84 -> 56, 137 148 -> 137, 144 93 -> 82, 193 50 -> 39, 200 24 -> 16). Narrowing it to a first mover that dealt no damage barely changes that (2,212 / 24,521): the second movers behind a u = 2 print in the T2 population (Facade u 4 / L 5, Flamethrower u 6 / L 5, Knock Off u 6 / L 5, Counter-class bodies) are ROM-exact with the `7 - L` lead. The rule would be a compensating constant that fits three lab fixtures at the cost of the population, so it was not kept.

rollout5 / iceball5 need no per-print u: every print of those locks is u 2 (hold 0), so their turn deltas never depended on the hold or a first-print lead. The hcr2c values [0, 0, 0, -2, -3] / [0 x6, -3, -3, -5, -5] come from the `7 - L` lead of the player's body behind the foe's u 2 print (hcr2c turned turns 1..4 exact with it), and turns 4 / 5 drift by the HP-bar / turn-start differences the aud242o / aud242q comments already name (ROM foe damage 6 / 11 / 20 / 40 / 89 vs the kernel's 6 / 11 / 23 / 41 / 82). With the lead the early turns are ROM-exact and the late turns are 2 off; without it the master residuals return.

### 2. The hold's downstream absorption: there is none in the engine

Hold on / off (temporary `NOHOLD` switch in the action-dispatch stage, removed) on the two seeds of the pins, per-command start frames of the whole drive (`--cmdtrace=1`), difference between the runs by command index: seed 1914 (195 commands) the difference only changes at the turn-start `message` commands (+4, +8, +11, +10, +14, +16, +18, +20, +24, +28, +30, +34 at turns 1..12), seed 2741 (266 commands) the same (+1, +2, +6, +10, +13, +12, ...). Inside a turn the difference is constant but for three one-frame drops (1914 cmd 50, 2741 cmds 162 / 224, sprite-visibility commands). So the hold shifts every later row of its turn rigidly: no downstream constant divides u, and the hcr2m "ON absorbs part of u" is the engine chain after the print having been **fitted to the ROM's absolute frames at the old fixed print** (print at commit + 9). The ROM print is at commit + 6 + u, so a chain that is exact at the old fixed print is longer than the ROM's print -> row interval by u - 3 (hcr2m's mode intervals: u 2 -1, u 4 +1, u 6 +1 with its -2 offset) and the hold exposes it. Seed 1914's final turn (Icy Wind, u 6): the engine's hit SE -> stat SE interval is 89, the ROM's 77 (the lead2 Icy Wind "lead 5 + tail 3 = +8 rows" and the hp-command 28-frame floor are the fitted constants in that chain); the ROM tl rows of that turn show HP changing only at +380 / +385 after the commit. Shortening those by the hold is an interval re-derivation per body (Icy Wind, the AI-switch window, the 28-frame floor), not one constant, and each is fitted against T2 rows, so it was not attempted inside this step.

### 3. Pins: back at master, RED (not re-pinned away from the ROM)

| pin | master (restored) | at the hcr2c engine (actual) |
| --- | --- | --- |
| aud242b haze-player rowDelta (keys 433 / 553 / 571) | 2 | engine frames 432 / 552 / 570 at 3 |
| aud258 aud242b-haze-player offset | 2 | 3 |
| aud242o rollout5-player turnDeltas | [3, 2, 2, 0, -1] | [0, 0, 0, -2, -3] |
| aud242q iceball5-player deltas | [3, 3, 2, 2, 2, 2, -1, -1, -3, -3] | [0 x6, -3, -3, -5, -5] |
| aud252LossBallOpen seed 1914 | [0, 8, 0 x6] | [3, 12, 4 x6] |
| aud252LossBallOpen seed 2230 | [7, 3, 1 x5, 0] | [10, 6, 4 x5, 3] |
| ais2 Scene ON (seed 2741) | window 3824..4074, romFrameOffset 57 | the 251 md5s match only at 3826..4076 / 55 (156 mismatching frames at the master window) |

All seven failing tests (the aud258 haze row counts once) carry a comment pointing here. The still-green hcr2c re-pins that were not on the list (swordsdance 1 -> 0, the aud24x / 25x / 26x leads that moved to the ROM, cry1, hie3, adp1) are unchanged.

### 4. What would close them

- Haze second mover: a ROM probe of the Haze -> Seismic Toss turn against the Swords Dance -> Seismic Toss turn (same second print u 3 and L 6, leads 0 vs 1); the separating variable is either the first body's tail or the hold, and T2 needs a second-mover-behind-u-2 population with a known ROM lead to test it.
- aud252 / ais2: re-derive the Icy Wind engine hit -> stat interval (89 vs 77) and the AI-switch turn's chain from the ROM per-command probe (`hpd2Probe.py`) with the hold on, so the fitted constants drop by u - 3 where they were tuned at the fixed print; one body at a time, each validated against its T1 lab, T2 and the hcr2 pixel labs.

**Supervisor decision (2026-11-20 23:30, reversible):** the hcr2 chain is folded at the hcr2c tip (`65d40ffa6`) with hcr2c's re-pins. The seven checks above keep hcr2c's values (named residuals in ISSUES #219), not the RED master values: hcr2d showed the master values were fitted to the old fixed first print (every command of the turn shifts by the hold), while the hold itself is pixel-exact on the 28 hcr2-*-on labs; closing them needs per-body interval re-derivation (e.g. the Icy Wind hit -> stat SE interval 89 vs ROM 77), not a compensating lead.

## fsc2m (2026-11-21): faint message -> party-summary interval (fsc1 item c3), measured on the ROM (measurement only)

Scene OFF (:8014) and ON (:8012). No change under `src/` or `tests/`; no probe patch; `npm test` not run, as assigned. Tools (new, committed): `tools/integration/fsc2mLabs.py` (labs: a Lv50 player Tackle KOs a Lv5 foe; names / replacement mons vary), `fsc2mProbe.py` (per-frame ROM probe: `hpd2Probe` + the battle text printer `sTextPrinters[0]` active / state / delay + a scripted A policy), `fsc2mReplay.py` + `fsc2mRun.sh` (replay the probe's A schedule through `soundEventProbe.py` for exact SE frames; probe frame k = sound frame k). Evidence `.integration/evidence/fsc2m/` (git-ignored: `r-*` probe rows, `s-*` sound, `labs/`).

### 1. Headline: c3 is mostly the harness's A-press cadence, not an engine row

The faint box is `Foe NAME\nfainted!\p` (`sText_TargetFainted`): a Factory battle prints with `autoScroll` off, so the printer sits in `state 2` (wait for a NEW A / B) until a press. The two drivers dismiss it differently:

- **ROM driver** (`tools/audio/romDecisionDriver.py:33` `PULSE_PERIOD = 16`, `pulse()` :280): outside menus A is held one frame every 16 calls, plus the release frame = **one A every 17 frames**, the phase carried across the whole run (`pulse_phase` only advances in `pulse()` calls). ROM 648-off drive A frames 19, 36, 53 ... confirm the period 17.
- **Engine driver** (`tools/integration/soundCensusRomReplay.ts:410-411`): in `awaiting-message-dismiss` it presses A **on every even frame**, i.e. the dismissal is 0 .. 2 frames after the typing ends. (In 648 the engine presses A at 551, once per message.)

So ROM = engine + a pulse wait L of 0 .. 16 frames (mean 8) on every faint, with the same text and chain on both sides. **Seed 648 seg 0 check:** Golduck, 18 glyphs, ROM printstring exec 478, typing ends 496, ROM pulse at 495 (during typing: no effect) and 512 -> L = 10 against ROM-ready 1: exactly the -9 measured in fsc1m section 2 ("-9 against the faint"). Across the 24 t2n OFF seeds: 30 ROM faints with a send-in (SE 16 then SE 114 in one segment, from `*-off.snd.json` + `*-off.drive.json` segments): **SE 16 -> SE 114 = 66 .. 83, median 74** (the app 64 .. 70, median 67): the c3 offset -1 .. -15, median -8 is the L distribution, not a text length or AI row. The "suspected name-length dependence" is real but small (section 2), and the AI choice is a 0 .. 4 frame term (section 3).

### 2. ROM tables (Scene OFF, A policy `ready` = A on the first frame the printer is in state 2; frames from the commit; all probe + sound replay)

| fainted foe (name chars) | SE 16 | printer start | typing (state 2 reached) | A | GiveExp (A +) | TryChoose | SendOut | SE 114 | SE 16 -> start | typing T | A -> SE 114 | SE 16 -> SE 114 | SE 114 -> SE 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MEW (3) | 252 | 270 | 285 | 286 | 9 | 304 | 310 | 311 | 18 | **15** | 25 | 59 | 155 |
| ABRA (4) | 252 | 270 | 286 | 287 | 9 | 305 | 311 | 312 | 18 | **16** | 25 | 60 | 155 |
| RATTATA (7) | 252 | 268 | 287 | 288 | 9 | 306 | 312 | 313 | 16 | **19** | 25 | 61 | 155 |
| BLASTOISE (9) | 251 | 271 | 292 | 293 | 9 | 311 | 317 | 318 | 20 | **21** | 25 | 67 | 155 |
| FERALIGATR (10) | 252 | 272 | 294 | 295 | 9 | 313 | 319 | 320 | 20 | **22** | 25 | 68 | 155 |

- **Typing T = name chars + 12** exactly (`Foe ` 4 + `fainted!` 8, one glyph per frame: Rattata 7 + 12 = 19). Scene ON identical (RATTATA 16 / 19 / 25 / 61, FERALIGATR 20 / 22 / 25 / 68). A pressed during typing (pulse at 278 in the Rattata run) does not speed it up (typing ends at 287 either way).
- **SE 16 -> printer start 16 .. 20**: the `dofaintanimation` wait (exec 251 .. 266 for Rattata) depends on the species' sprite, not on the name (Mew / Abra 18, Rattata 16, Blastoise / Feraligatr 20).
- **A -> SE 114 = 25 in every case** (A, exec clear +2, `BattleScript_MoveEnd` +3, `GiveExp` +9, `HandleFaintedMon` +15, `FaintedMonTryChoose` +18, `FaintedMonSendOutNew` +24 with the base AI choice, `drawpartystatussummary` rise = SE 114 +25). The doc's "+6 + 3" is GiveExp + HandleFaintedMon: 9 + 6 + 3 = the 18 frames A -> TryChoose.
- **Pulse sweep** (RATTATA, OFF, `pulse:17:PHI` policy = A when (k - commit) % 17 == PHI, PHI 0 .. 16): SE 16 -> SE 114 = 67, 68, ..., 77 (PHI 0 .. 10), 61, 62, ..., 66 (PHI 11 .. 16): **61 + L, L = 0 .. 16** (the first pulse at or after the typing end), A -> SE 114 25 in all 17 runs. That is the whole 66 .. 83 ROM spread with typing 15 .. 22 and sprite 16 .. 20 (min 16 + 15 + 25 = 56 + L).

### 3. The AI replacement choice (`FaintedMonTryChoose` -> `FaintedMonSendOutNew`)

Script commands run one per frame: `openpartyscreen` (+0), `switchhandleorder` (+6), then four jump commands (+9 / +23 / +37 / +51, `BATTLE_TYPE_FRONTIER` taken) -> `SendOutNew` = **6 frames** when the opponent controller's `OpponentHandleChoosePokemon` -> `GetMostSuitableMonToSwitchInto` (`src/battle_ai_switch_items.c:629`) is cheap. When it is not, `openpartyscreen` / `switchhandleorder` waits for the controller (`gBattleControllerExecFlags` = 2 for 1 .. 2 extra frames: the CPU cost of the candidate loop runs over a frame):

| replacements (all four moves unless a list) | TryChoose -> SendOut |
| --- | --- |
| Rattata x2, Seismic Toss (Fighting is super effective on the Normal player: the first candidate returns at once) | **6** |
| Rattata x2, `[Seismic Toss, Tackle x3]` | 6 |
| Gyarados `[Thunderbolt, Tackle x3]` / Alakazam `[Seismic Toss, Tackle x3]` (Alakazam is chosen: a super-effective move on the 2nd candidate) | 7 |
| Rattata x2, Tackle (no super-effective move: both candidates are marked invalid, the damage fallback runs) | **8** |
| Gyarados / Alakazam, Tackle; or four different moves (no SE move) | **8** |

ROM per-frame rows of the 24 t2n seeds (`/tmp/fsc1m/*-rom.json` from hcr1m, labelled with the map): 32 AI choices: **6 x 8, 7 x 8, 8 x 11, 9 x 3, 10 x 2** (median 7); the forced (player) choices wait for the party menu input (150 .. 160, driver-dependent, not an engine row). So the AI cost is a **0 .. 4 frame, move-set / type-chart dependent term** (this lab reaches 6 .. 8; 9 .. 10 need a third candidate or more damage-calc work; not isolated). The engine has no model of it; its replacement chain has the fixed lead 23 (648) after the dismissal. Scene ON has the same script (RATTATA ON: TryChoose A + 18, SendOut A + 24 as OFF).

### 4. Rule and landing (for the next run; not done: measurement only)

c3 splits into three terms, in decreasing mass:

1. **Harness (dominant, about -8 median on 118 rows, 1,130 mass; own 614 on the 81 rows with their faint in the segment): make the engine census driver's dismiss cadence the ROM driver's.** `tools/integration/soundCensusRomReplay.ts:410-411`: replace "A on every even frame while `awaiting-message-dismiss`" by the ROM pulse: keep a `pulsePhase` counter advanced exactly where `romDecisionDriver.py` calls `pulse()` (every frame that is not an action / move / party-choose menu frame and not the release frame after a press; `PULSE_PERIOD = 16`, A on phase 0, one release frame), press A when the counter hits 0. The engine's `lifecycle.phase === "awaiting-message-dismiss"` then ends L frames after typing like the ROM. Acceptance before landing: simulate the counter on the 24 `*-off.drive.json` segments (A frames relative to the `anchors[].commitFrame`) and require the predicted pulse frames to match the ROM's per segment (the menu frame classification is the only risk: a 1 .. 2 frame miss costs 1 .. 2 frames, against the 0 .. 16 now). This changes the sound / command timelines of every button-gated message (faint, attacker faint, terminal win / loss, the `\p` / `\l` pieces of `promptGatedMessageCommands`), not only the faint chain: expect the move / faint chains of all 24 seeds to shift, so re-run T2 for the whole scoreboard; the Scene ON census / `tests/` pins that replay `inputs` (`soundCensusRomReplay` JSON users: the aud24* fixtures are ROM-frozen and do not move) must be checked by name.
2. **Engine (small, +/- 1): the typing length.** The engine's typed rows are already `battleStringPrintableLength` (`battleResolutionPresentation.ts:2570-2577`), i.e. glyph count; ROM T = name chars + 12, which the template gives (`{B_DEF_NAME_WITH_PREFIX}` = `Foe NAME`); verify only that the prefix is counted for the foe side and that nicknames / the 10-char names are not clipped. The SE 16 -> printer start (16 .. 20, sprite dependent) is `FAINT_SCRIPT_LEAD_FRAMES` 66 + the sink: the 648 interval was exact (+43 -> +43), so not an own row.
3. **Engine (0 .. 4 frames, median 1 .. 2): the AI choice.** Model 6 + extra where extra = f(candidates / moves): 0 when the first type-best candidate has a super-effective move; 1 .. 2 in the damage fallback (lab: 8); 9 .. 10 unexplained. A first cut: `TryChoose -> SendOut` 6 plus 2 when no remaining AI mon has a move that is super effective against the active player mon (`TypeCalc`), else 0. The 32 t2n choices (median 7) pin it. This changes `FaintedMonSendOutNew`'s lead (the fixed 23 in 648 = `A -> SE 114 25` minus the dismiss chain) by that extra; no Scene ON rule differs (same scripts).

**Expected T2 OFF change** (not run: the optional probe patch was out of the time cap): item 1 alone removes the pulse wait from the 81 faint-in-segment rows (own sum 614) and from the later rows of each turn that carry it (SE 15 / cry@switch-in, trainer-slide; 118 rows, 1,130 mass listed in fsc1m): an upper bound of **about -600 .. -900 of the 3,817 mass (16 .. 24 %)**, with exact rows up by the rows whose residual is the 6 .. 10 frame AI term. Items 2 and 3 are second order (about 1 .. 2 frames x 30 faints). Pins that move: none in `src/` for item 1 (driver only); `tests/` that replay the engine census (`soundCensus*`, `lsd194*`) need a recount if they run the engine driver; T1 / randomRoundSoak do not use the driver. Items 2 and 3 move `tests/fsc1*`, `aud24*` faint-chain frames and the `randomRoundSoak` frame pins only if the Scene OFF chain length changes.

**Not measured:** the optional reverted probe patch (T2 gain); the 9 .. 10 frame AI choices (third candidate); non-faint button-gated messages under the same cadence; whether the `hold` / menu-state classification of the ROM driver and the engine agree per segment (the acceptance check above); PAPERCUT: `fsc2mProbe.py` needs `sTextPrinters` (a `static`), found with `arm-none-eabi-nm pokeemerald.elf`, offsets 0x1B / 0x1C / 0x1E (`active` / `state` / `delayCounter`), ~10 minutes.

## chg1 (2026-11-20): Scene OFF two-turn moves, pixel-grounded

16 labs / traces `chg1-<move>-<foe|plr>-off` (`tools/integration/chg1Labs.py`; Dig 91, Fly 19, Bounce 340, Dive 291, Solar Beam 76, Razor Wind 13, Skull Bash 130, Sky Attack 143; charger on either side, captures 24..694). ROM per-frame probes via `tools/run-mgba-probe.py ... hpd2Probe.py`. Rules (all Scene OFF only; logical outcome, RNG and kernel event order untouched; Scene ON byte-identical):
1. **Charge box lead**: the hcr1b `usedMovePrintLeadU` hold now also covers the charge-turn EMPTYSTRING3 box (`CHARGE_TURN_SCRIPT`).
2. **Semi-invulnerable hide split**: the hide is drawn on the MoveEnd receipt row (`SCENE_OFF_SEMI_INVULNERABLE_HIDE_LEAD = 2`); the action-transition pause splits into rows to the receipt and rows after it.
3. **Miss-tail +1** (`sceneOffMissTurnEnd`): a turn ending on `STRINGID_ATTACKMISSED` clears one row late (ROM 340 vs 339), only on a turn with a semi-invulnerable battler (start of turn, or a hide receipt in it). The first version applied to every miss and moved ais2 seed 2741 Scene OFF away from its ROM frames (160 frames); narrowed and the pin is green again.
4. **Locked-action continuation walk**: the foe's locked action across the player's command now runs the confirm-handoff walk (`confirmHandoff` passed by the orchestrator); the player's own locked action with no menu prepends a pause of u - 3 (`lockedTurnPrintLead`, `TURN_START_PRINT_BASE_U = 3`, 3 < u <= 20).
5. **Skull Bash**: the Defense boost's `stat` command waits `chargeTurnStatTiming` (+1) after the charge box.
6. **Kernel RNG start values per lab** (app stage `rngSeed`; ROM lab seed stays 1): bounce-foe 2, bounce-plr 5, skyattack-plr 4, dive-foe 5, others 1 (chosen by scan so accuracy / damage rolls agree with the ROM).

**Compare, frames matched of 671** (foe / plr charger): Dig 660 / 664, Fly 661 / 664, Solar Beam 668 / 666, Razor Wind 667 / 666, Sky Attack 666 / 666, Skull Bash 671 / 671, Bounce 663 / 664, Dive 661 / 506. After the miss narrowing only the Dig pair was re-compared (660 / 664, unchanged); the other 14 were measured with the broader rule. Residuals attributed: frames 377 / 378 / 386 / 395 (menu open, player bounce, foe HP box; the same pixels differ on hcr1b-earthquake frames 14-23 captured from 0), faint-slide 1-frame phase, foe healthbox hide and wait-cursor blink in the tails (~640-694): generic, not chg1. **Dive plr (506)**: the unleash first print is 1 frame late in the app; the ROM's Dive turn 1 ends 2 frames later than Dig's while Dig plr is exact; root cause not found.

**Acceptance.** battle-command-generated-off 128/128 and hcr1b-earthquake-foe / hcr1b-tackle-foe / hcr1b-doubleedge-plr / hcr1b-tackle-plr 109/109 verified on `9451431da` (before the miss narrowing; not re-run after it). **T2 OFF, 24 t2n seeds, missing / extra 0 / 0: mass 3,875, exact rows 584** (base 4,083 / 571; hit-row mass 1,297). **Census** (`lsd194Census.sh`, base 04b595cc1): Scene OFF 0..199 eventsDigest identical (0 differ, 0 errors), Scene ON 0..99 byte-identical `r0.jsonl`. T1 0 / 0 / 0 on both scenes. `npm run typecheck` 0, `npm run build` 0, `npm run test:gate` 360 files / 2,834 tests green (run before the miss narrowing). Named families (aud2*, snd*, cry1*, hie*, adp1*, ais*, flow1*, adp1*, Dig / Fly / Bounce / Dive / SolarBeam / SEMI_INVULNERABLE greps: 114 files, 1,956 tests): all green except `ais2AiSwitchFrames` Scene OFF, which the first miss rule broke and the narrowing fixed (file re-run green, 6 / 6); the rest of the family was not re-run after the narrowing. New `tests/chg1SceneOffTwoTurn.test.ts` (3 tests). The full `npm test` was NOT run (assignment forbids it); test:gate and the named files were used instead. No randomRoundSoak / lbrd pin was run or re-pinned. Frame catcher seed 18 Dig turn offset: not re-measured (out of time).

Papercuts: the first seed sweep silently hit the hcr1b stage (string replace matched the first occurrence), ~25 min; `hpd2Probe.py` needs `run-mgba-probe.py` (no mgba module bare), ~5 min; a bare `tsc --noEmit` ran out of heap, ~3 min; `lsd194CensusDelta.py` does not exist (digests compared with a short script), ~3 min.

## hcr3m: the engine command that differs from the ROM, per residual Scene ON pin (measurement only)

Scope: after hcr2 the Scene ON hold is pixel-exact on its 28 labs; seven pins stay off the ROM. This step names, per pin, the engine presentation command whose interval differs from the ROM script / controller interval, and the exact next landing. No `src/` or `tests/` change (two temporary `applyHpHitTails` patches were measured and reverted). Frames are taken relative to each side's own commit (the ROM and engine clocks differ by an accumulated offset). Evidence: git-ignored `.integration/evidence/hcr3m/` (`<seed>-on.{rom,snd,drive,eng-cmd,eng-base}.json`, `aud242{b-haze,o-rollout5,q-iceball5}-player.{rom,eng}.json`).

Tools (new, committed): `tools/integration/hcr3mProbe.py` (per-frame ROM script / exec-flag / hp trace of a frozen T2 request, symbol-named), `hcr3mCmp.py DIR SEED [--decision N] [--span A:B]` (T2 turn: ROM script rows + ROM SEs + engine SEs + engine cmds side by side), `hcr3mLabEngine.ts <fixture> <out.json>` and `hcr3mLab.py DIR NAME [A:B]` (the same for a `tools/audio/fixtures` sound lab). Run the probe under `tools/run-mgba-probe.py`.

### Residuals

| Pin | ROM interval | Engine interval | Cause (engine command) | ROM source | Landing |
|---|---|---|---|---|---|
| aud252 seed 1914 (Icy Wind), end rows +3 | hit SE 331 -> SE_M_STAT_DECREASE 408 = 77. hp command 17 frames (`HitFromAtkAnimation+0x8` 367, bar done 379, datahpupdate 380), `BattleScript_StatDown+0` 385, `+0x7` playanimation 386 | 331 -> 420 = 89. hp 367 -> stat 395 = 28 | `hp` command of a hit followed by a `stat` command keeps `HP_TIMING.minimumFrames` 28 (`battleResolutionPresentation.ts:2100`); `applyHpHitTails` (~2330-2360) has no shape for `hit && rest[0].type === "stat"` | data/battle_scripts_1.s `BattleScript_HitFromAtkAnimation` (healthbarupdate / datahpupdate), `BattleScript_StatDown`; `waitstate` per-frame controller exec | `applyHpHitTails`: new shape `hit && rest[0]?.type === "stat"` -> `{minimumFrames: 0, tailFrames: 4}` (measured: stat SE and select SE become ROM-exact). It then exposes the second-order rows below (A); land those in the same step |
| aud252 seed 2230 (Double-Edge recoil), end rows +4 | recoil bar -> recoil print 11 frames (342 -> 353, `BattleScript_DoRecoil+0xb` / `+0x10`); effectiveness print `waitmessage` -> recoil bar has 7 script rows (338-342: `MoveEffectRecoil`, `DoRecoil` orword) = ROM print -> faint SE 87 | recoil `hp` keeps the 28 floor (+17); the 7 script rows are not presented (79, -8). Net +10 at the faint SE | same `hp` floor (recoil hp after the hit's hp); plus unmodelled `MoveEffectRecoil` / `DoRecoil` rows | data/battle_scripts_1.s `BattleScript_EffectRecoil` / `BattleScript_DoRecoil` | `applyHpHitTails`: recoil hp (`afterHp`, `to < from`, battler is the attacker) -> `{minimumFrames: 0, tailFrames: ~11 - bar}`, and add 7 lead rows in front of the recoil hp (a tail-only patch over-corrects to -9; with the 7 rows about -1 / -2). Same A chain below |
| (A) shared by 1914 / 2230: faint SE and item-effect rows after the stat / recoil fix | A -> clear +2, `MoveEnd` +3, `ItemHealHP_Ret+0` +7, `playanimation` +8 | engine reaches general-animation at A+2 (6 rows short, +2 SE offset); Hydro Pump SE and the super-effective SE -2, faint SE -9, item rows -8, SE_BALL_OPEN -8 | (1) second print -> `attackanimation` = engine 28 + L 5 vs ROM 35 (`bodyLeadFrames` L, hcr2c `7 - L`); (2) `battleHitSounds.ts:85` subtracts `moveBodyExtraRows` (-8, lead2's presented rows) from the faint anchor, a compensation that is wrong once the hp interval is right; (3) the item chain (`MoveEnd` -> `ItemHealHP_Ret` -> playanimation) has no presented script rows | `BattleScript_MoveEnd`, `ItemHealHP_Ret` | `battleHitSounds.ts:85` faint anchor: drop the `moveBodyExtraRows` term once the hp tail is the ROM interval; item-effect command: 6 lead rows after the clear. Pins moving: `tests/aud252LossBallOpen.test.ts` DELTAS (1914 `[3,12,4,...]`, 2230 `[10,6,4,...]`), the T2 end rows of both seeds. Open: the item SE offset after `playanimation` is 19 (1914) vs 13 (2230), cause not found |
| Haze / Seismic Toss second mover +1 (aud242b rowDelta 3, aud258 offset 3) | second print -> `attackanimation`: 364 -> 401 = 37 (7 rows from print clear 394) | 29 + L 6 = 35; first-print -> second-print message 108 equal; second print starts 2 early; SEs 432 / 552 / 570 / 623 vs ROM 435 / 555 / 573 / 626 (3 early) | the second mover's `message` -> `move-animation` interval is 2 short because the body lead L is 1 short of the ROM rows, and hcr2c's `7 - L` lead overshoots on it | data/battle_scripts_1.s `BattleScript_EffectHaze` / `BattleScript_EffectSeismicToss` (printstring -> waitmessage -> attackanimation) | `bodyLeadFrames` of the second mover (`usedMoveBodySoundLeadOf`): L + 1 for a second-mover plain body, or derive L from the ROM rows for the second print; check the 28 hcr2 labs (the first mover must not move) |
| rollout5 turns 4 / 5 (aud242o, turnDeltas `[0,0,0,-2,-3]`) | hp start (`HitFromAtkAnimation+0x8` ex2) -> `MoveEnd+0` = D + 8 frames for D hp lost: 7 -> 15, 9 -> 17, 14 -> 22, 24 -> 32, 44 -> 52 | the engine's hp -> sprite-visibility is D + 8 for 7 / 9 / 24, D + 10 for 14 (24) | the `hp` command's duration is not a pure function of D: at D = 14 it is 2 frames long, and the drift (+1 at turn 0 to +3 / +4 at turns 3 / 4) is that and the same turn-end -> next turn message (ROM `MoveEnd+0` -> `DefenseCurl+0x2` = 22 each turn, engine 22 equal) | `BattleScript_MoveEnd`, `Cmd_healthbarupdate` bar loop | `battleResolutionCommandDuration` for `hp` (bar frames for the fractional pixel of the player / foe bar): derive from `maxHP` and D as `D + 8` for the non-floor shape; find where D = 14 gets +2 (not located in this step) |
| iceball5 turns 5 / 6 (aud242q, `[0 x6,-3,-3,-5,-5]`) | hp start -> `MoveEnd+0` = D + 8: 6 -> 14, 11 -> 19, 20 -> 28, 40 -> 48, 89 -> 97 | 14, 19, D = 20: 31 (+3), D = 40: 49 (+1); turn 4 starts 3 / 7 late | same `hp` duration as rollout5 (identical D + 8 law in the ROM, engine over by +2..+3 for D 14..20), accumulating into later turns | as above | same landing as rollout5; one fix should move both labs |
| ais2 seed 2741 ON window +2 | not measured (probe not run) | not measured | not attributed | AI switch turn (u = 4 print) | measure with `hcr3mProbe.py --from <commit-30>` and `hcr3mCmp.py` (the 2741 ROM / engine files are in `evidence/hcr3m/2741-on.*` from t2n, not yet probed) |

### Shared causes

1. Fitted per-shape constants that the hcr2 hold exposes: the legacy 28-frame `hp` floor (1914 / 2230), `bodyLeadFrames` L (Haze second mover, aud252 print -> attackanimation), and the `moveBodyExtraRows` subtraction on the faint / hit sound anchors. None is a compensating lead: each should be re-derived per shape from the ROM script interval.
2. hp bar length: the ROM law is `D + 8` frames from `healthbarupdate` to `MoveEnd` (10 turns of two labs, exact); the engine meets it only on some D. This is one landing for rollout5 and iceball5.
3. Unpresented script rows (`MoveEffectRecoil`, `DoRecoil`, the item `MoveEnd` -> `ItemHealHP_Ret` chain): add as lead rows, not as extra hold.

### Expected T2 change

1914 / 2230: the end rows move from +3 / +4 to the second-order values only after (A) is also landed; landing the stat / recoil tail alone makes the stat SE and select SE ROM-exact but moves the faint SE to -9 and the item rows to -8, so it must go with (A). rollout5 / iceball5: the three late turns move to 0 if the `hp` law is exact. Haze: -1 on the second mover (pins aud242b / aud258 go to 0 if L + 1 does not move the first mover).

Papercuts: the engine `--cmdtrace` key is `cmds` (not `commands`), ~5 min; the lab engine state lives under `factoryRoundBattleOrchestrator.battleResolutionPresentation`, ~10 min; the ROM and engine clocks differ by an accumulated offset so every table is relative to each side's own commit, ~15 min; ROM script rows without dedupe flooded the table, ~10 min.

## b4m (2026-11-21): the B4 "C" bodies, Scene ON ROM vs engine per command, and the ais2 seed 2741 window (measurement only)

No `src/` or `tests/` change. Tools (kept): `tools/integration/b4mRun.sh OUTDIR LAB...` (ROM probe + engine + table in one go), `b4mEngine.ts LAB OUT` (the engine's presentation commands of a battle lab with their timing, and the frame the move body's source clock reaches age 0), `b4mTable.py DIR NAME [--span A:B]` (summary line, the ROM's next commands after `gAnimScriptActive` 1 -> 0, the engine's next commands, a merged row table). Labs: `tools/battle-lab/b4m-*.json` (Rattata Lv50 with the move x4 against a Seismic Toss Rattata Lv12, friendship 0, Scene ON; Sing / Grasswhistle at seed 2 (`-s2` labs; seed 1 misses in the engine); `b4m-curseghost` is ROM-only). Existing labs reused: `aud242n-confuseray-{player,opponent}-on`, `aud242k-{wish,lovelykiss}-player-on`, `aud260-{brickbreak,willowisp,glare}-player-on` (their own `APP_STAGES` entries). Evidence (git-ignored): `.integration/evidence/b4m/` (`*.rom.json`, `*.eng.json`, `se/` ROM SE logs of the five new labs, `trial/` engine runs with the candidate landing below, `2741-on.*` and `ais2chain/` for the ais2 row).

Reading the ROM per lab (frames of the lab clock): P = used print starts, R = its release (ex -> 0), E = the `attackanimation` instruction, A0 / A1 = `gAnimScriptActive` 0 -> 1 / 1 -> 0. R -> A0 = L + 3, so **L = A0 - R - 3** is the ROM's body lead (the instruction rows R..E). The engine's `move-animation` starts at R in every lab (R eq +0) and its source clock is age 0 at R + 3: **none of the 12 bodies has a lead presented today** except Wish (`bodyLeadFrames` 2, landed in lse4).

### Per-body table (Scene ON)

"Next" = the first presented command after the body (the status animation / stat / hit animation). d = (ROM next - R) - (engine next - R), engine as of this tip. "Lead-only trial" = a temporary patch adding the ids to `BODY_LEAD_RULE` as `lead-only` (reverted): its `bodyLeadFrames` came out equal to the ROM L for all 11 bodies (the kernel's instruction counter is the lead), and the table shows what that alone leaves (r = ROM next - trial next; positive = engine still early).

| Body (id) | Lab | ROM R / A0 / A1, L | ROM gap A1 -> next (next) | Engine now: lead, d to ROM next | Lead-only trial: r | SE pins (ROM-exact SEs of the lab, now -> trial) |
|---|---|---|---|---|---|---|
| Thunder Wave (86) | b4m-thunderwave | 55 / 67 / 186, **9** | 5 (`MoveEffectParalysis+2`, status animation) | 0, d = 9 | **0** | 0 -> 5 of the first 5 body SEs (95/117/127/138/149 exact); later PRZ SE 192 (-2) -> 201 (+7) |
| Stun Spore (78) | b4m-stunspore | 53 / 65 / 258, **9** | 5 (`MoveEffectParalysis+2`) | 0, d = 9 | **0** | 0 -> 6 of 6 body SEs exact; PRZ SE 264 (-2) -> 273 (+7) |
| Sleep Powder (79) | b4m-sleeppowder | 55 / 65 / 258, **7** | 5 (`MoveEffectSleep+2`) | 0, d = 7 | **0** | 8 of 8 exact now (7 - L = 0 so the clock already fits), trial 6 of 8: the status SE moves +7 |
| Sing (47), seed 2 | b4m-sing-s2 | 47 / 57 / 302, **7** | 5 (`MoveEffectSleep+2`) | 0, d = 10 | **+3** | body SE 64 exact both; SLP SE 307 (-3) -> 314 (+4) |
| Grasswhistle (320), seed 2 | b4m-grasswhistle-s2 | 55 / 65 / 285, **7** | 5 (`MoveEffectSleep+2`) | 0, d = 5 | **-2** | body SE 84 exact both; SLP SE 295 (+2) -> 302 (+9) |
| Lovely Kiss (142) | aud242k-lovelykiss-player-on | 54 / 64 / 216, **7** | 5 (`MoveEffectSleep+2`) | 0, d = 10 | **+3** | body SEs 2 of 4 exact both; SLP SE 221 (-3) -> 228 (+4) |
| Will-O-Wisp (261) | aud260-willowisp-player-on | 54 / 65 / 278, **8** | 5 (`MoveEffectBurn+2`) | 0, d = 10 | **+2** | 0 -> 3 of 23 ROM SEs (75 / 85 + one); later rows still off by the tail |
| Glare (137) | aud260-glare-player-on | 48 / 60 / 272, **9** | 5 (`MoveEffectParalysis+2`) | 0, d = 11 | **+2** | 0 -> 2 of 4 (67, 174 exact); 280 -> 285 (+5) |
| Confuse Ray (109), player / opponent | aud242n-confuseray-{player,opponent}-on | 54 / 63 / 332, **6** (opponent 58 / 67 / 336, 6) | 5 (`MoveEffectConfusion+7`) | 0, d = 8 | **+2** (both sides) | 14 -> 11 of 25: every SE is 1 early in the trial (the 7 - L sound lead is already applied by hcr2c, so the lead shifts the clock twice) |
| Curse (174), non-Ghost | b4m-curse / aud242r-curse-player-on | 49 / 56 / 231, **4** | 5 (`CurseTrySpeed+0x23`, stat) | 0, d = 8 | **+4** | aud242r-curse: 0 -> 4 of 4 exact (179 / 222 / 265 / 358; the engine is 1 early now) |
| Curse (174), Ghost | b4m-curseghost (ROM only) | 49 / 58 / 430, **6** (6 script rows `DoGhostCurse+3..+0x28` between R and E) | not read | not run: the generic lab stage supports Rattata pairs only | - | - |
| Brick Break (280) | aud260-brickbreak-player-on | 55 / 65 / 215, **7** | **6** (`BrickBreakDoHit+4`, hit animation) | 0, d = 10 | **+3** | 2 -> 9 of 13 exact (90 / 119 / 180 ...); later 220 vs trial 217 (-3) |
| Wish (273) | aud242k-wish-player-on | 47 / 52 / 322, **2** | 13 (generic action transition) | **2 (landed)**, d = 0 (the next message is on ROM frame 335 on both sides) | - | pinned `delta -5` in `aud242kMoveAnimSounds` (ROM first SE 91, engine 96): the whole offset is the body SE clock, not the lead |

Length of the animation (`A1 - A0`): 119 / 193 / 193 / 245 / 220 / 152 / 213 / 212 / 269 / 175 / 372 / 150 / 270 (same order). Brick Break's screen branch (L 8 by the design table, `removelightscreenreflect` gap 6) was not run: it needs the foe's screen set up on turn 1 (a two-turn lab, `APP_STAGES` entry); not measured.

### What the rows say

1. **L is the kernel lead for every body** (`bodyLeadFrames` computed by `moveAnimationScriptLeadTiming` equals the ROM's R -> A0 - 3: 9, 9, 7, 7, 7, 4, 6, 7, 7, 8, 9). B4 needs no lead table: only the ids joining `BODY_LEAD_RULE` (the table's `lead-table` entries carry explicit tails, `lead-only` has no tail, so this is a new class).
2. **Three bodies are pure lead** (Thunder Wave, Stun Spore, Sleep Powder): the engine's body -> status-animation interval already equals the ROM's (Thunder Wave 124 = 119 + 5 from age 0), only the 7 / 9 rows in front are missing, every later row shifts by L and the next command lands on the ROM frame (r = 0).
3. **The other eight also have a tail error** the lead does not hide: Sing +3, Lovely Kiss +3, Brick Break +3, Will-O-Wisp +2, Glare +2, Confuse Ray +2, Curse +4 (the engine's next command is early) and Grasswhistle -2 (late). The ROM gap is 5 for all (Brick Break 6), so the engine's tail composition (`T = 2 + gap - pre - post`, the generic live tail, `liveMoveHitTailRows`) is not the source: the difference is in the accepted window the engine presents for that animation (A0 -> A1 plus pre / post rows), per animation. Landing it as a per-id tail adjust, like `LSE4_WINDOW_SHORT_ROWS`, is the smallest change.
4. **The status-animation SE sits 10 rows after the engine's `status-animation` command, 3 rows after the ROM's** (Thunder Wave: engine 182 -> 192, ROM 191 -> 194; Sing: 297 -> 307 vs 307 -> 310; the same +7 in every lab). Today that +7 hides the missing lead: the later SEs are 2 / 3 early and the pins were fitted that way. A lead landing without re-fitting the status-animation SE offset to 3 puts them +7 minus the tail residual late (the "SE pins" column). The status SE offset is part of the landing.

### Landing (not applied)

- Rule: a new `BodyLeadRule` class (say `"c-lead"`) in `BODY_LEAD_RULE`, `src/engine/battleResolutionPresentation.ts` ~1949, ids 86, 78, 79, 47, 320, 109, 174, 142, 261, 137, 280 (273 stays `lead-only`). The class presents `bodyLeadFrames` = the kernel lead (as `lead-only` does, tested above), keeps the existing tail composition (`bodyLeadTailCompositionApplies` true, so the render effect's age hold is unchanged), and adds a per-id window adjust `{47: +3, 142: +3, 280: +3, 261: +2, 137: +2, 109: +2, 174: +4, 320: -2, 86: 0, 78: 0, 79: 0}` to the rows after the body (same path as `LSE4_WINDOW_SHORT_ROWS` in `moveAnimationScriptTailTiming`).
- Sound: the hcr2c sound lead `7 - L` (`usedMoveBodySoundLeadOf`) must drop for these ids (the lead is now real, so body SEs follow the body); the trial shows the body SEs exact for Thunder Wave / Stun Spore / Curse (4 of 4) / Brick Break / Will-O-Wisp (first two) / Glare (first two) without it, and Confuse Ray 1 early with it. The status-animation SE offset (`status-animation` SLP / PRZ / BRN / confusion) is re-fit from +10 to +3 (-7, one table row per status animation).
- Pins that move: `tests/aud242nMoveAnimSounds.test.ts` (Confuse Ray), `aud242rMoveAnimSounds` (Curse), `aud242kMoveAnimSounds` (Lovely Kiss), `aud260MoveAnimSounds` (Brick Break, Will-O-Wisp, Glare), `audioProbeFixtures`, and every seed whose rounds contain these bodies (T2 census totals, `randomRoundSoak` frames / `renderCalls`); the seeds were not enumerated.
- Expected T2 change: the body SEs of these labs go to the ROM frames (lab exact counts above; Thunder Wave 0 -> 5 of 5 body SEs, Stun Spore 0 -> 6 of 6, Curse 0 -> 4 of 4, Brick Break 2 -> 9 of 13); every later row after the body moves by the body's L (9 / 9 / 7 / 7 / 7 / 4 / 6 / 7 / 8 / 9 / 7). With the tail adjust and the status SE re-fit the predicted result is every status SE on the ROM frame (not run: the tail adjust is not in the trial).

### ais2 seed 2741 Scene ON window

| Pin | Measurement | Engine command | Cause | Pin landing |
|---|---|---|---|---|
| ais2 seed 2741 ON window +2 (`tests/ais2AiSwitchFrames.test.ts`, `romFrameOffset` 55) | The window is exact at commit + 16 on both sides, and the AI-switch turn is ROM-exact through the switch-in within the +1 text lag: no command inside the turn is late. | none | The +2 is two 1-frame hcr2 holds in earlier turns (u = 3: decision 1 the foe's Thunder Wave, decision 4 the foe's Double Team; `usedMovePrintLeadAdjust` holds `u - 2` rows). They move the engine's absolute commit frame from 3808 to 3810, which is why the pin's `romFrameOffset` went 57 -> 55. Decision 5's own first print is the `ActionSwitch` message, which gets no hold. | Not a window fix: the offset is the hold's downstream absorption (hcr2d). Landing Thunder Wave's lead (above) changes decision 1's turn by +9 rows, so `romFrameOffset` must be re-measured after it. |

Papercuts: PAPERCUT: the generic lab stage (`labBackedStage`) supports only Rattata pairs with default friendship, so the aud242 template labs had to be regenerated with `AUD242_FRIENDSHIP=0` and the Ghost Curse lab could not run on the engine, ~15 min; PAPERCUT: Sing / Grasswhistle (55%) hit in the ROM but missed in the engine at the lab's seed 1, so the lab seed had to be scanned (2, 4, 5 hit on both), ~8 min; PAPERCUT: `run-mgba-probe.py` refuses an existing output path, so a re-probe needs a fresh file name, ~3 min; PAPERCUT: reading a whole `*.rom.json` into the session flooded the context, ~5 min (pipe through `cut` / `head`).

## drv1 (2026-11-21): the engine census driver presses A on the ROM driver's A frames (tools only; `src/` untouched)

**Change.** `soundCensusRomReplay.ts replay --romdrive=DRIVE.json` (or `ROM_REPLAY_ROMDRIVE`): the engine's `awaiting-message-dismiss` press (was: A on every even frame) now follows the A frames of the ROM drive (`drive.segments` of the `lab --drive` output, 0 = the first advance after the action menu). Without the flag nothing changes (the ROM-frozen fixtures / tests replay without it). `tools/audio/aud249Rescore.sh` passes it (the drive file is already one of the files it copies; `AUD249_NO_ROMDRIVE=1` restores the old cadence). A fresh `aud248RunSeed.sh` chain runs its engine pass BEFORE the ROM drive exists, so its `engine.json` still has the old cadence: run `aud249Rescore.sh` after it. Decisions do not depend on the cadence.
Clock (`--romdrive-clock=segment|absolute`, default `segment`): a press at engine frame k in the resolution of decision i uses the ROM A frame `romCommit_i + (k - engineCommit_i)`, kept inside the ROM's segment (before decision i+1's `menuOpenFrame`; outside it, or before the first commit, the old even-frame rule). Reason: T2 compares per decision segment, and the engine's drift from the ROM at decision i (a few frames, accumulated over earlier segments) otherwise moves the engine's ready time onto another pulse (below).

**Check against the 24 t2n OFF drive files (and the 25 ON).** A-frame gaps in the drives: OFF 22,141 of 24,467 are exactly 17 (ON 26,702 of 28,669); the rest are menu presses (2 .. 14). `PULSE_PERIOD = 16` + release = 17 holds on every file. Seed 648 faint (OFF): ROM A at 512; the engine's A is 512 now (the stale t2n `engine.json` of the 1st t2n run had 552; the current-tree even-frame baseline about 511). ROM SE 16 464, SE 114 540; engine 468 / 541 now, 468 / 537 on the even-frame baseline.

**Absolute clock is the wrong clock (measured).** Drive-numbered frames as they are: OFF mass 3,537 -> 3,517, exact 584 -> 582; faint -> party-summary offset median -7 -> +3.5 (the engine's own drift of a few frames puts its ready time on the next / previous pulse: the 17-frame cliff both ways). Segment-relative clock (the default, below) is the one that measures the engine.

**T2 (all 24 OFF / 25 ON seeds, `aud249Rescore.sh` over `.integration/evidence/t2n`, `soundScoreboard.py`; missing / extra 0 / 0 in both scenes, before and after).** Baseline re-measured on this tree (c6117abdc + docs): ON 26,640 mass / 2,348 exact (the assigned 26,673 / 2,362 is not reproduced: 33 mass / 14 exact lower here; OFF 3,537 / 584 is), OFF 3,537 / 584.

| family (mass / exact) | OFF before | OFF after | ON before | ON after |
| --- | --- | --- | --- | --- |
| move-animation SE | 0 / 0 | 0 / 0 | 20,173 / 1,996 | 19,895 / 2,006 |
| stat-change SE | 414 / 2 | 403 / 2 | 412 / 27 | 410 / 27 |
| cry | 614 / 92 | 517 / 97 | 1,372 / 28 | 1,231 / 31 |
| battle-controller SE | 2,491 / 490 | 2,225 / 500 | 4,579 / 296 | 4,235 / 301 |
| bgm | 18 / 0 | 19 / 1 | 104 / 1 | 69 / 2 |
| TOTAL | **3,537 / 584** | **3,164 / 600** (-373, -10.5 %) | **26,640 / 2,348** | **25,840 / 2,367** (-800, -3.0 %) |

Matched-row delta medians (engine - ROM): OFF battle-controller 0 / p10 -9 -> -7 / p90 0 -> 0; OFF cry p10 -9 -> -6; ON battle-controller p10 -16 -> -16 (unchanged), ON cry p10 -15 -> -14.

**Faint -> party-summary rows (SE 16 -> SE 114 within one segment, interval engine - ROM, rows paired in order, both intervals <= 110; evidence `.integration/evidence/drv1/fsc.py`):**

| | n | median | sum of abs | exact | histogram (offset: rows) |
| --- | --- | --- | --- | --- | --- |
| OFF before | 30 | -7 | 196 | 1 | -13:2 -12:1 -11:3 -10:1 -9:5 -8:1 -7:3 -6:1 -5:2 -4:2 -3:4 -2:1 -1:2 0:1 1:1 |
| OFF after | 30 | -0.5 | 123 | 4 | -13:1 -4:2 -3:3 -2:4 -1:5 0:4 1:2 3:3 5:1 6:1 13:1 15:3 |
| ON before | 31 | -7 | 252 | 1 | -23:1 -16:1 -15:1 -14:1 -12:1 -11:2 -10:3 -9:3 -8:2 -7:3 -6:2 -5:1 -4:2 -3:1 -1:2 0:1 3:1 5:1 8:1 10:1 |
| ON after | 31 | 0 | 188 | 1 | -23:1 -17:1 -13:1 -12:1 -7:1 -6:1 -5:2 -3:2 -2:2 -1:3 0:1 1:1 2:3 3:4 4:1 6:1 8:2 10:1 13:1 19:1 |

The -8 bias is gone (OFF median -7 -> -0.5, 15 of 30 rows within +-2 now against 5). The positive tail (+13 / +15 x3 OFF; seeds 1028, 319, 3738, 5063) is a cliff, not cadence: in 3738 the ROM's pulse A is at 16706 (SE 16 + 38) and the engine's ready lands 1 .. 3 frames after it, so it waits for the next pulse (16723): the engine's SE 16 -> ready is 1 .. 3 frames longer than the ROM's on those rows (the typing / printer-start terms of fsc2m section 4 item 2 are the suspects). With the cadence removed these rows are now visible as an engine row; fixing it flips them by 17 frames each (about 4 x 15 = -60 of the remaining OFF mass).

**Why the gain (-373 OFF, -800 ON) is below the fsc2m estimate (-600 .. -900 OFF).** The estimate assumed the engine is ready on the frame the ROM is; after the cadence change the faint rows are +-2 around 0, but the other terms the old -8 was hiding (AI choice 0 .. 4, the cliff rows above, `\p` pieces whose ROM-ready is later than the engine's) are now visible and do not shrink. The other A-waits the engine crosses (`\p` / `\l` pieces, terminal win / loss) are covered by the same press path and moved with it (battle-controller exact +10 OFF, +5 ON); the forced party-menu messages (`forcedSelector`, `pulse("A")` 3-frame idiom) and the no-moves message still use the engine's own cadence (not touched; the ROM drive's `party` block pulses are `pulse()` too).

**Gates.** No `src/` change; `npm run build` exit 0; `npm run test:gate` 360 files / 2,835 tests green; the 9 test files importing `soundCensusRomReplay` (ais1 / ais2 / ais3, aud252 x2, aud253, aud254, parityMacRoundReplayFixtures, pic3DrawnFieldCheck): 41 / 41 (they replay without `--romdrive`). `npm test` not run, as assigned.

**Next (not done).** (1) The engine ready-time cliff rows (4 OFF, ~5 ON) are the next measurable engine term; (2) a ROM-clocked cadence for the forced party-menu messages; (3) the AI-choice term (fsc2m item 3). PAPERCUT: `aud249Rescore.sh` over 49 seeds takes about 5 minutes and a foreground command over 2 minutes is moved to the background by the harness (the t2n rescore needed a per-seed loop plus a wait), ~10 minutes lost; a `rescoreAll.sh` wrapper (the `.integration/evidence/drv1/rescore-all.sh` of this step) would help.

## b4l (2026-11-21): the B4 "C" bodies land (c-lead), the status-animation SE offset re-fitted to the ROM (S11, ISSUES #219)

Scene ON only. Scene OFF is untouched (T2 OFF byte-identical: 600 exact / 533 offset / mass 3,164, missing / extra 0 / 0; census OFF arm byte-identical shards 2 / 2).

**Changes (`src/` 3 files, +37 / -9).**
1. `BodyLeadRule` `c-lead` for ids 86 78 79 47 320 109 174 142 261 137 280 (Wish 273 stays `lead-only`): `bodyLeadFrames` = the kernel lead (ROM L = A0 - R - 3), the `tail-composition` of lse4 kept, and a per-id window adjust added after the body through `liveMoveHitTailRows` (`C_LEAD_WINDOW_ADJUST`: 47 / 142 / 280 +3, 261 / 137 / 109 +2, 174 +4, 320 -2, 86 / 78 / 79 0; the b4m table, re-derived on the ROM below). A substitute-swap move takes no adjust (same exemption as the lse4 window rows).
2. The hcr2c sound lead 7 - L (`usedMoveBodySoundLeadOf`) is 0 for these ids, and the sound clock follows the presented lead for real: `lse2BodySoundAgeShift` = L - 7 (the sound table is calibrated at lead 7). Confuse Ray (109) was fitted on its own L = 6 lab, so its clock lead is 6 (`C_LEAD_SOUND_CLOCK_LEADS`); with 7 it went 1 early on all 25 rows.
3. Status-animation SE offset (`statusAnimationScriptAge`, moveAnimSounds.ts): the ROM's script age is **0** after a c-lead body (the +10 offset was +7 late there and hid an early command) and 0 everywhere for Sleep / Confusion (`STATUS_ANIMATION_AUDITED_BODY_SCRIPT_AGE`); Poison / Burn / Paralysis keep 7 outside a B4 body (T2 variants A / B / C were scored per id; C kept: every id that improved did so on a ROM row, no id got worse; no pin was fitted).

**ROM re-derivation.** `b4mRun.sh` on the 14 labs: the ROM's next-command frame equals the engine's for every body with the b4m adjust table, so the table is unchanged; the ROM wins and there is no difference to report. Ghost Curse (`b4m-curseghost-player-on`) runs on the generic lab stage: ROM R 49 / A0 58 / A1 430 (L 6), the engine's first command after the body (hp, 433) is the ROM's 433; its second row (message 486 vs ROM 488) is 2 early, not pinned.

**b4m labs, ROM-exact SEs of the lab (before -> after; matched rows are unchanged).**

| Lab | before | after | Lab | before | after |
|---|---|---|---|---|---|
| b4m-thunderwave | 0 / 7 | 6 / 7 | aud242n-confuseray-player | 14 / 25 | 25 / 25 |
| b4m-stunspore | 0 / 8 | 7 / 8 | aud242n-confuseray-opponent | 14 / 25 | 25 / 25 |
| b4m-sleeppowder | 8 / 8 | 8 / 8 | aud242r-curse-player | 0 / 4 | 4 / 4 |
| b4m-sing-s2 | 1 / 3 | 3 / 3 | aud260-brickbreak-player | 0 / 11 | 9 / 11 |
| b4m-grasswhistle-s2 | 1 / 3 | 3 / 3 | aud260-glare-player | 0 / 4 | 3 / 4 |
| aud242k-lovelykiss-player | 2 / 4 | 4 / 4 | aud260-willowisp-player | 18 / 23 | 19 / 23 |
| aud242k-wish-player (lead-only, out of scope) | 0 / 8 | 0 / 8 | | | |

Per-body r (ROM next - engine next) is 0 for all 11 bodies. Left over (not analysed further): Thunder Wave 1 row, Stun Spore 1, Glare 1, Brick Break 2 (frames 1369 / 1570, -2 / -7), Will-O-Wisp 4 (frames 499 / 619 / 637 / 690, all -4).

**T2 rescore** (25 ON + 24 OFF seeds over `.integration/evidence/t2n`, `tools/audio/rescoreAll.sh` into `.integration/evidence/b4l/t2-{base,after}`, `soundScoreboard.py`):

| | exact | offset | missing | extra | mass |
|---|---|---|---|---|---|
| ON before | 2,366 | 3,511 | 0 | 0 | 25,747 |
| ON after | **2,476** | 3,401 | 0 | 0 | **23,423** (-9.0 %) |
| OFF before = after | 600 | 533 | 0 | 0 | 3,164 |

move-animation SE family ON: 2,005 -> 2,110 exact, mass 19,810 -> 17,571. Status SEs after the body: SE 197 -39 %, SE 176 -45 %, SE 212 -73 % of their mass, none worse.

**Census 0..199 both scenes** (`lsd194Census.sh`, base 5fbac1476 vs HEAD d652fc667, JOBS 2, SPLIT 2): `rst197CensusDelta.py --digest` eventsDigest + error identical 200 / 200 on ON (122 battles have changed presentation commands, 0 type-sequence changes) and 200 / 200 on OFF (byte-identical). No gameplay / RNG change. T1 (`soundCensusDelta.py --t1`): ON exact 53,965 -> 54,127, known-offset 197 -> 35 (Will-O-Wisp +1 x162 gone; left: Substitute -7 x33, Transform -5 x2, both non-B4), missing 0, extra 0, unclassified 13 -> 13 (unchanged); OFF identical on both arms (0 exact, 35 extra, 13 unclassified; the OFF arm is not what T1 scores, cause not examined).

**Pins re-pinned toward the ROM** (commit d652fc667): ais2 ON window 3826..4076 / romFrameOffset 55 -> 3835..4085 / 46 (same ROM frames, the engine 9 later; md5 match 0 bad at the +9 shift); hie3 cheri command start 740 -> 749, drift 11 -> 2; aud260 Brick Break / Glare constant offset 2 -> 0; aud242r Curse deltas +1 -> 0. No pin moved away from the ROM; none left red.

**Gates.** `npm run typecheck` ok; `npm run test:gate` 360 files / 2,835 tests; the 228 files importing `battleResolutionPresentation.ts` / `tickSounds.ts` plus `aud2*` and `randomRoundSoak*` (3 batches: 77 / 79 / 72 files, 710 / 770 / 581 tests) green; `npm run build` ok. Full `npm test` not run (brief).

**Residuals.** Wish (273) lead-only: SE rows 0 / 8, hp floors / Rollout / second-mover lead (hcr3m), AI choice (fsc2m) and non-B4 body leads are out of scope. The Scene OFF timing is unchanged. PAPERCUT: a concurrent side-lane session committed my uncommitted `moveAnimSounds.ts` edit (5cb0b6acd) in the shared tree, so stage by file name, never `git add -A`.

## t2k (2026-11-21): the remaining S11 sound-timing mass re-ranked on tree 5fbac1476 (measurement only; no `src/` / `tests/` change)

**Method.** All 25 ON + 24 OFF t2n seeds rescored with `aud249Rescore.sh` (drv1's `--romdrive` A cadence) over `.integration/evidence/t2n`, then `soundScoreboard.py OUT --per-seed --out OUT/score.json` (both scenes; ON at the 8012 oracle's ROM files). Every scored row is attributed with `t2Attribute.py`'s alignment plus the ROM `gCurrentMove` from `tl.json` (body / `gen:<se>`), the controller SE, cry, stat, bgm; OFF rows also carry the engine command type (`--cmdtrace=1`). A "step" is the offset change between consecutive matched rows of a segment (the first row steps from 0): it separates where an offset is *introduced* from where it is only *inherited*. Evidence (git-ignored): `.integration/evidence/t2k/` (`t2/` rescored sets + `score.json` + `scoreboard.txt`, `p/` and `po/` ROM probes, `attr-{on,off}.json`, `gain-{on,off}.json`, `final.py` = the disjoint item table below).

### 1. Rescore (missing / extra 0 / 0 in both scenes)

| family (mass / exact) | OFF drv1 | OFF now | ON drv1 | ON now |
| --- | --- | --- | --- | --- |
| move-animation SE | 0 / 0 | 0 / 0 | 19,895 / 2,006 | 19,810 / 2,005 |
| stat-change SE | 403 / 2 | 403 / 2 | 410 / 27 | 410 / 27 |
| cry | 517 / 97 | 517 / 97 | 1,231 / 31 | 1,227 / 31 |
| battle-controller SE | 2,225 / 500 | 2,225 / 500 | 4,235 / 301 | 4,231 / 301 |
| bgm | 19 / 1 | 19 / 1 | 69 / 2 | 69 / 2 |
| TOTAL | **3,164 / 600** | **3,164 / 600** | **25,840 / 2,367** | **25,747 / 2,366** |

OFF is identical to drv1. ON is 93 mass / 1 exact lower than drv1's 25,840 / 2,367 (-85 move-animation, -4 cry, -4 controller); the master moved from drv1's tree to 5fbac1476 (the mvs1 x hcr1b and box-merge re-pin commits), not bisected.

### 2. Attribution (row mass; classes sum to TOTAL)

| class | ON rows / mass / exact | OFF rows / mass / exact |
| --- | --- | --- |
| body (move running at the row) | 3,899 / 13,024 / 1,974 | n/a (no body rows in OFF) |
| gen (gCurrentMove 0) | 912 / 6,786 / 31 | n/a |
| controller hit SE 12 / 13 / 14 | 475 / 2,378 / 260 | 548 / 1,361 / 368 |
| controller faint / send-in 15 / 16 / 114 | 283 / 1,853 / 41 | 284 / 864 / 132 |
| cry | 202 / 1,227 / 31 | 192 / 517 / 97 |
| stat | 101 / 410 / 27 | 105 / 403 / 2 |
| bgm | 5 / 69 / 2 | 4 / 19 / 1 |

**Shape (window = seed x segment x cause; mass):** ON constant 17,878 (1,374 windows), one-off >= 20 4,253 (108), varies (growing / tail) 3,616 (122), exact 681. OFF constant 2,487 (477), one-off 522 (17), varies 155 (14). Constant dominates: most mass is an offset introduced once and *inherited* by the later rows of the segment, so the cost of a lead is its row count, not its size.

**Top bodies ON (mass):** Dig 736, Ice Beam 686, Drill Peck 594 (one window: s1914 seg21, -66 x 9 rows), Rock Slide 518, Magical Leaf 490, Rest 468, Ancient Power 383, Psychic 373, Double-Edge 363, Blizzard 351, Aerial Ace 346 (+ 205 inherited, s3738), Double Team 324, Struggle 310. Metal Claw's 745 is the rows after its body in s3738. **B4 bodies (being landed, not proposed): 863 = Thunder Wave 243, Confuse Ray 196, Curse 188, Stun Spore 134, Brick Break 88, Sleep Powder 14** (Sing / Grasswhistle / Lovely Kiss / Will-O-Wisp / Glare have no ON mass rows in these seeds).

**Where offsets are introduced (steps):** segment-entry first rows (Dig +6 charge turn x10, Rest -2 x17 / +9 x6, ball-open -3 / -7, Ice Beam / Solar Beam first windows), body tails (Metal Claw -14), OFF stat +3 (x60), OFF first hit after the hit animation (-7 x18, -3 x10, -4 x7), and single windows (s1914 Drill Peck -66, s3738 Aerial Ace -39 / -79, s8108 Confusion -65 x2).

### 3. Ranked top 8 (rows assigned disjointly in this order; the B4 line and the remainder make the sum-check)

| rank | item | scenes | T2 mass now (ON / OFF) | breadth (ON census, of 1,000 battles) | direction | cost / risk | lands in | ROM window |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Metal Claw body tail: engine move-animation 14 frames short | ON | 745 / 0 | 99 commands in 38 battles | lengthen Metal Claw's tail by 14 (rows after the last body SE) | low: one table row; T2 sample is 6 windows of ONE seed, so re-measure with a second Metal Claw seed | `src/engine/battleResolutionPresentationRender.ts` body tail tables (`HPD4_BODY_TAIL_ROWS` / `LSE2_BODY_TAIL_ROWS` / `LIVE_MOVE_SCRIPT_TAIL_TRAIL_ROWS`, read by `battleResolutionCommandDuration`) | s3738 decision 4 (ROM commit 2436, engine 2420); also seg 1, 9, 17, 33, 41, 49 |
| 2 | First hit SE after a hit-animation (self-confusion hit: message -> hit-animation gap 5 short) | OFF (ON shares the controller rows) | 1,207 / 662 | hit-animation 18,646 commands in 1,000 battles; OFF steps: -7 x18, -3 x10, -4 x7 of 71 | delay the hit-animation command (and its SE 13) by 5-7 frames after the confusion message | medium: the hit lead differs by cause (confusion self-hit vs woke-up chain), so land per cause; the ON half is mostly inherited drift | `src/engine/battleResolutionPresentation.ts` (segment builder of the message -> hit-animation chain; `BattleScript_DoSelfConfusionDmg`, `battleScriptActionAdmission.ts:3089`) | s7295 decision 4 (ROM 3333 / eng 3282); s7682 decision 2 (1160 / 1167) |
| 3 | OFF stat SE +3 (SE 239 / 245) | OFF | 0 / 403 (ON stat median 0) | stats-change 3,688 commands in 828 battles; 60 of 100 OFF steps are exactly +3 | stats-change SE 3 frames earlier (SE age 6 -> ~4 after the command start, and the preceding move-animation 39 -> 37) | low: constant offset, one emitter; ON already has the `STATS_CHANGE_AFTER_*_AGE_SHIFT` family | `src/engine/moveAnimSounds.ts` `STATS_CHANGE_SE_AGE` / `emitStatsChangeSounds`, `battleResolutionPresentationRender.ts` `statsChangeSourceAge` (the generic age without a body shift is what OFF runs) | s2 decision 1 (ROM 369 / eng 373), frames 205-252 |
| 4 | Aerial Ace s3738 -39 / -79 (twin in both scenes: the OFF rows have no body, so it is a controller / event gap, not a table) | ON + OFF | 551 / 160 | Aerial Ace 676 commands in 274 battles (one seed shows it) | engine plays the hit SE 39 frames before the ROM; unknown which ROM event waits | medium / unknown: unprobed, single seed; probe before any landing | to be found (hit SE 12 + SE after Dig in seg63) | s3738 decision 15 (seg31) ROM rf 6618; decision 27 (seg55) rf 11608; ON decision 31 rf 22049 (-79) |
| 5 | Dig: charge-turn first SE +6, attack-turn tails (+9 / +11) | ON | 736 / 0 | 596 commands in 120 battles | shorten Dig's charge-turn lead by 6; trim the attack-turn tail | medium: two terms; the +6 first row repeats in 10 windows (4 seeds) | `battleResolutionPresentationRender.ts` live-move lead / tail tables for DIG | s8108 decision 11 (seg23) rf ~10424 (+9 / +11); s3738 seg71 / 79 / 87 |
| 6 | Faint SE 16 + cry@faint | ON + OFF | 1,408 / 458 | faint 4,332 commands in 1,000 battles | scattered +-1 with a long negative tail (16@faint median -4, cry -2 ON) | high: mostly inherited drift; the -41 one-off in s3738 is its biggest window | faint / cry rows in `src/engine/tickSounds.ts` + `battleHitSounds.ts` | s3738 decision 27 (seg55) rf 11825 (cry) / 11891 (SE 16), -41 both scenes |
| 7 | Rest: move-animation#4 -2 and status-animation +9 | ON | 468 / 0 | 462 commands in 149 battles | -2 lead on 17 windows, +9 on 6 | medium: two terms, non-B4 | `battleResolutionPresentationRender.ts` Rest status-animation lead | s6079 decision 7 (seg15) rf 6206 (-27 x 6 rows); 17 windows at -2 |
| 8 | gen:148 poison tick (general animation) | ON | 1,104 / 0 | general-animation 7,506 commands in 864 battles | engine plays 25-30 frames early in two windows | medium: first row of each window, 3 seeds | general-animation command timing (`moveAnimSounds.ts` `emitGeneralAnimSounds`) | s165 decision 11 (seg23) rf 7437 (-30 x 6); decision 14 (seg29) rf 9882 (-25 x 6) |
| | **Items 1-8** | | **6,219 / 1,683** | | | | | |
| | B4 bodies (being landed) | ON | 863 / 0 | | | | | |
| | remainder (items below; not chased) | | 18,665 / 1,481 | | | | | |
| | **TOTAL** | | **25,747 / 3,164** | | | | | |

Sum-check: ON 745 + 1,207 + 551 + 736 + 1,408 + 468 + 1,104 + 863 + 18,665 = 25,747; OFF 662 + 403 + 160 + 458 + 1,481 = 3,164 (ON items 1-8 = 6,219; OFF items 2-4 and 6 = 1,683). "T2 mass now" is the row mass of the item's class, not the saving: the counterfactual gain of removing the item's step is lower (Metal Claw 728, Aerial Ace 537, Drill Peck 660, OFF stat +3 only ~100-180, Dig ~600, Rest ~660 incl. neighbours). Runners-up not in the top 8: Drill Peck s1914 one-off 594 (the next best single window), gen:142 1,112 (s6912 / s319 -25 .. -17 windows), weather / general 219 / 127 / 242 1,001, Ice Beam first windows 686.

### 4. The three ROM windows (hcr3mProbe + hcr3mCmp, frames from each side's own commit)

1. **Metal Claw, s3738 decision 4.** ROM: Harden SE 120 at 47 / 77, Razor Wind SE 136 at 151 / 165, `HitFromAtkAnimation+0x1` at 201, SE 13 at 203. Engine: SE 120 at 47 / 75, SE 136 at 151 / 165, hit-animation cmd 0.2 at 190 with SE 13 at 189. Last body SE to the hit SE is 38 frames in the ROM, 24 in the engine: the differing command is `move-animation` cmd 0.1 (bodyLead 5), 14 frames short. Repeats in 6 windows of the seed.
2. **Self-confusion hit, OFF s7295 decision 4 (and s7682 decision 2).** ROM `BattleScript_DoSelfConfusionDmg+0x0` at 104, `+0x7` ex2 at 107..139, SE 13 (SE_EFFECTIVE) at 204 (100 frames). Engine `message` cmd 0.1 at 102 -> `hit-animation` cmd 0.2 and SE 13 at 197 (95 frames): the engine's message-to-hit gap is 5 short (2 more from the message start skew = the -7). s7682: 97 -> 192 (95) vs 99 -> 199 (100). Not every -7 is a self-hit: s5063 decision 8 (Double-Edge after a wake-up) is 11 short in the `message` / `status-icon` pre-chain (engine cmd 0.0 at 9 -> move-animation cmd 0.4 at 116 vs ROM `EffectDoubleEdge` 6 -> attackstring end 124), then a 1-frame move-animation difference.
3. **OFF stat +3, s2 decision 1 (Evasion up).** ROM: `StatUpAttackAnim` at 208 -> `StatUpPrintString` ex2 at 245 (37) -> SE 239 at 249 (exec + 4). Engine: `move-animation` cmd 0.7 at 207 (min 39) -> `stats-change` cmd 0.8 at 246 -> SE 239 at 252 (age 6). Both `move-animation` (39 vs 37) and the stats-change SE age (6 vs 4) are long: +2 and +1 against a 1-frame earlier start, +3 in total.

### 5. What not to chase

- **Held-item group gen:152 / 228 / 102 (3,160) and the 100-odd other bodies' scatter (10,125):** accumulated drift, with per-previous-body tails (Yawn +5, Rest -3, Cross Chop -12) that are items above; landing these directly moves nothing until the introducing rows (items 1-7) are fixed. Re-score after items 1-3 and re-rank.
- ON hit SE @move-animation / message (846) and send-in / out chain + cry (1,571): inherited more than introduced; first-row rows already at 0 for 244 of 343.
- Out of scope here, being landed by the parallel worker: the B4 bodies above.

Not applied: no `src/` or `tests/` change; PROGRESS / ISSUES / ROADMAP untouched.

## stc1 (2026-11-21): Scene OFF stat-change SE and the confusion self-hit gap (presentation / sound timing only)

Base 5cb0b6acd (b4l landed on it, so the ON baseline is 24,399 mass / 2,465 exact, not t2k's 25,747 / 2,366). Part 1 = e34ecca44, Part 2 = 6eda1a86f. Gameplay, RNG, damage, turn order and facility state are untouched.

**Part 1: stat-change SE, Scene OFF (t2k item 3).** The ROM plays the stat SE at the stats-change `playanimation` exec + 4. The engine's command starts at exec + 1 after the OFF body (`attackanimation` -> `BattleScript_Pausex20` -> `waitanimation` -> `setgraphicalstatchangevalues` -> `playanimation`), so the SE age was 3 frames late (engine start + 6 vs ROM start + 3); after a secondary effect's hit chain it was 2 late (start + 4 vs ROM start + 2). `statsChangeSourceAge` (battleResolutionPresentationRender.ts) now takes `STATS_CHANGE_SCENE_OFF_AFTER_BODY_AGE_SHIFT = 3` / `STATS_CHANGE_SCENE_OFF_SECONDARY_AGE_SHIFT = 2` when the segment's hitMarker has HITMARKER_NO_ANIMATIONS; the entry-phase (battle-start Intimidate) explicit age and every Scene ON age are unchanged. Up and down, move-caused and secondary-effect, both sides (tests/stc1SceneOffStatChangeSe.test.ts, labs tools/battle-lab/stc1-*-off.json + hcr1b-*):

| path (lab) | ROM SE frame | engine before | engine after |
| --- | --- | --- | --- |
| Harden, up, foe (hcr1b-harden-foe-off) | 99 | 102 | 99 |
| Swords Dance, up, foe (stc1-swordsdance-foe-off) | 105 | 108 | 105 |
| Growl, down, foe (hcr1b-growl-foe-off) | 100 | 103 | 100 |
| Growl, down, player (hcr1b-growl-plr-off) | 96 | 99 | 96 |
| Icy Wind secondary Speed drop, foe (stc1-icywind-foe-off) | 210 | 212 | 210 |
| Rock Tomb secondary, foe (stc1-rocktomb-foe-off) | 246 | 250 (+4) | 248 (+2) |
| Icy Wind secondary, player (stc1-icywind-plr-off) | 214 | 208 (-6) | 206 (-8) |

The last two rows keep a residual that is not the SE age: the hit chain's hp rows start the stats-change command off the ROM's exec (hcr3m hp floors, out of scope). The 3 and 2 frame rules are exact wherever the command start is. The "37 vs 39" of the t2k note is not a wrong move-animation length: the engine's command starts at exec + 1, so the error was the SE age alone.

**Part 2: the self-confusion hit gap (t2k item 2).** ROM `BattleScript_DoSelfConfusionDmg` (battle_scripts_1.s:3801-3817) runs `status2animation` (3799, from `BattleScript_MoveUsedIsConfused`), `jumpifbyte` (3800), `cancelmultiturnmoves` (3802), `adjustnormaldamage2` (3803) and `printstring STRINGID_ITHURTCONFUSION` (3804) before the first glyph (5 script rows after the "is confused!" wait ends); `waitmessage B_WAIT_TIME_LONG`, then `effectivenesssound` (SE 13) and `hitanimation`. The engine started typing the ITHURTCONFUSION message on the row after the wait, so its hit / SE 13 came 7 rows early (ROM from the decision's commit, Scene OFF: seed 7295 decision 4 = 204 vs 197; seed 7682 decision 2 = 199 vs 192). Landed Scene OFF only: the message gets `leadFrames = 5` (the five rows, first glyph moves 5 later) and a 66-row hold (`SELF_CONFUSION_OFF_HIT_MESSAGE_TIMING`, 64 + 2; the 2 rows are the typed-to-wait term the ROM spends and the engine did not), `SELF_CONFUSION_*` in battleResolutionPresentation.ts. **Scene ON is not changed:** ON seed 7295 decision 4 already plays SE 13 on the ROM's frame (ROM 304, engine 304; the ON self-hit sits behind the 100-row `status2animation` command, which is a different interval), so the OFF rule must not move it. The s5063 Double-Edge-after-wake-up case is untouched.

| path | ROM SE 13 (from commit) | engine before | engine after |
| --- | --- | --- | --- |
| OFF seed 7295 decision 4 | 204 | 197 | 204 |
| OFF seed 7682 decision 2 | 199 | 192 | 199 |
| ON seed 7295 decision 4 | 304 | 304 | 304 |

Pin: tests/stc1SelfConfusionHit.test.ts (fixture tests/fixtures/stc1-selfconfusion-off.json: the two seeds' setups + the ROM frames).

**T2 rescore** (`RESCORE_SCENES=off|on tools/audio/rescoreAll.sh OUT .integration/evidence/t2n`, `soundScoreboard.py`; 0 missing / 0 extra before and after in every family). Scene OFF, 24 aligned seeds, mass 3,164 -> 2,873 (exact 600 -> 667, offset 533 -> 466):

| family (OFF) | exact before -> after | offset before -> after | mass before -> after |
| --- | --- | --- | --- |
| stat-change SE | 2 -> 65 | 103 -> 40 | 403 -> 244 |
| cry | 97 -> 97 | 95 -> 95 | 517 -> 496 |
| battle-controller SE | 500 -> 504 | 332 -> 328 | 2,225 -> 2,114 |
| bgm | 1 -> 1 | 3 -> 3 | 19 -> 19 |
| TOTAL | 600 -> 667 | 533 -> 466 | 3,164 -> 2,873 |

The stat-change matched-row delta (engine - ROM, relative to the segment start) went median +3 / p10 -4 / p90 +3 to median 0 / p10 -7 / p90 0; the p10 is the hp-floor residual above (and SE 90, +7, unrelated). The cry / battle-controller gain comes with Part 2 (the segments after a self-hit start 7 rows later); it is not attributed row by row. Scene ON, 25 aligned seeds: 24,399 mass / 2,465 exact / 3,412 offset, byte-identical before and after (every ON family, delta table and top-differing rows identical). Evidence (git-ignored): .integration/evidence/stc1/t2-before, t2-after.

**No gameplay / RNG change.** `tools/integration/lsd194Census.sh` seeds 0..199 (`LSD194_SHARDS="0 1"`), 5cb0b6acd vs 6eda1a86f: `rst197CensusDelta.py --digest` Scene OFF "eventsDigest+error identical 200/200, type-sequence changes 0", 145 battles identical / 55 changed commands (all `message, message, hit-animation` +7 on the self-hit); Scene ON "identical 200/200, type-sequence changes 0, 200 battles identical / 0 changed, byte-identical shards 2/2".

**Tests.** `npm run typecheck` exit 0; `npm run test:gate` 360 files / 2,835 tests green; `npm run build` exit 0. The 232 test files that import the changed files (grep -l battleResolutionPresentation / battleResolutionPresentationRender / moveAnimSounds) + `tests/aud2*.test.ts` + `tests/randomRoundSoak*.test.ts` + the two new stc1 files: all green except five failures that are red on the pre-stc1 base 5cb0b6acd too (not touched, reported): aud260MoveAnimSounds brickbreak-player and glare-player, aud242rMoveAnimSounds curse-player (b4l's ON B4 body pins), ais2AiSwitchFrames seed 2741 Scene ON, hie3HeldItemSounds hie3-cheri-on. Pins moved by this step, all toward the ROM or trajectory-only: tests/randomRoundSoak.test.ts "(c) leaves full byte-identical" seed 1 frames 60,582 -> 60,525 (frames only; same battle 3 / depth 2 / turn 19 / roundLost; the exploring presses land on new phases after the +7 self-hit rows) and the ISSUES #89 Baton Pass pin seed 4 -> 11 (seed 4 no longer commits Baton Pass; re-scanned seeds 0..39 with batonPassSearch.ts, candidates 11, 13, 27, 36, 39). No other randomRoundSoak* pin moved. sa125 / sag130 ("unanchored < total / 5") went red with the first Part 2 shape (a separate hold command before the print changed the OFF command shape against ON); the `leadFrames` form keeps the shape and both are green with unchanged counts.

**Residuals / next.** Rock Tomb +2 and Icy Wind player -8 (hp-row command start, hcr3m), SE 90 +7. The ON self-hit's `status2animation` SE 176 sits 6 rows after the ROM's (engine 112 vs ROM 106 from the commit, seed 7295): a separate, ON-only term, not measured further here.

## hcr3 (2026-11-21): stat-next hp tail, recoil hp rows, faint SE lag clip (Scene ON; OFF follows where the rule is scene-free)

Commit `88369e3d7` on top of `006eab809` (src: `battleResolutionPresentation.ts`, `battleHitSounds.ts`). Steps 1 and 3 landed nothing; step 2 landed the safe subset; the item-chain rows stay open.

**Step 1, hp bar law: no engine bug, nothing landed.** The engine's hit `hp` command already lasts exactly D + 8 (`max(minimumFrames, barFrames + 1) + tail`, bar 1 HP / frame for maxHP >= 48). The rollout5 / iceball5 drift comes from the lab engines rolling a different damage D than the ROM (rollout turn 2: engine 16 vs ROM 14; iceball 23 / 41 / 82 vs ROM 20 / 40 / 89, RNG not synchronised) plus hcr2c's stale-u +1. aud242o / aud242q are therefore unchanged (rollout5 [0, 0, 0, -2, -3], iceball5 [0 x 6, -3, -3, -5, -5]); they close only with an RNG-synchronised lab, not a duration change. The Scene OFF check was not run for the same reason (no law to port).

**Step 2 (landed).**
- hp of a hit followed by a `stat` command (Icy Wind, seed 1914): `HP_STAT_NEXT_TAIL_FRAMES = 4` (ROM: bar 12, then `datahpupdate` .. `BattleScript_StatDown`'s playanimation 6 rows, the stat command takes the last 2; no 28-row floor). The stat SE and the select SE are ROM-exact on 1914.
- recoil hp (Double-Edge, seed 2230): `HpLeadRows.recoil` (the hp event's PC is `BattleScript_DoRecoil`'s datahpupdate), `HP_RECOIL_LEAD_ROWS = 7` on the previous message (the unpresented `MoveEffectRecoil` / `DoRecoil` orword rows), bar -> recoil print = E + 1 rows (hp tail = `messageRows - 1`). Recoil hp / print frames 342 / 353, ROM-exact in the romdrive cadence.
- faint SE: `lag = max(0, sceneLag - moveBodyExtraRows)` (battleHitSounds.ts:85): earlier bodies' extra rows are already in the command start, so the hpd4 compensation must not go negative.

| pin | ROM | before | after |
|---|---|---|---|
| aud252 1914 faint SE / select SE | 0 / 0 | +3 / +12 | **-2 / 0** |
| aud252 1914 item chain (5 SEs + SE_BALL_OPEN) | 0 | +4 x 6 | **-8 x 6 (moved away; test pin left at +4, RED)** |
| aud252 2230 faint SE / select SE | 0 / 0 | +10 / +6 | **0 / -4** |
| aud252 2230 item chain | 0 | +4 x 5, +3 | **-6 x 5, -7 (moved away; test pin left, RED)** |
| aud242o rollout5 turnDeltas | 0 | [0, 0, 0, -2, -3] | unchanged (damage-roll difference) |
| aud242q iceball5 deltas | 0 | [0 x 6, -3, -3, -5, -5] | unchanged |
| aud242b / aud258 Haze second mover | 0 | 3 | unchanged (see step 3) |
| ais2 2741 | 0 | not measured | not measured (out of reach) |

**Item chain, open.** After the faint script the general-animation starts 6 rows before the ROM `playanimation` (ROM `FaintTarget+0xc` -> `MoveEnd+0` -> `ItemHealHP_Ret+0` -> `+0x7`: 1035 -> 1041 on 1914, 560 -> 566 on 2230); the engine's message, hp and `SE_BALL_OPEN` that follow are 6 early with it. A +6 lead on the preceding `sprite-visibility` (Scene ON, faint before it) brought the lab pins to 1914 [-2 x 6] / 2230 [0 x 5, -1], but T2 mass 22,835 -> 22,889 (1914 -66, seeds 2 / 97 / 2230 +80 / +30 / +10): the first SE offset after `playanimation` is 19 rows on 1914 and 13 on 2230 in the ROM (engine fixed 11), and seeds 2 / 97 have chains the 6 rows over-shift. Not landed; needs the ROM rule that makes the SE offset 19 vs 13 (script-entry dependent).

**Step 3, second mover: not landed.** Experiment: +1 on `bodyLeadFrames` for any body after an earlier `STRINGID_USEDMOVE` in the segment. aud258 Haze 3 -> 2 (toward the ROM, not 0), but aud242a-swordsdance-opponent 0 -> -1 (a second mover whose L is already right) and aud242b's own rows re-key. A per-body rule would be a new body lead (out of scope). The two pins stay at 3.

**Seen but not changed.** Seed 648 ON regressed +7 mass (550 -> 557); every other of the 25 seeds improved or held.

**T2** (`rescoreAll.sh` over `.integration/evidence/t2n`, `soundScoreboard.py`; `.integration/evidence/hcr3/t2-{base,after}`; 0 missing / 0 extra):

| scene | exact before | exact after | offset | mass before | mass after |
|---|---|---|---|---|---|
| ON (25 seeds) | 2,476 | **2,541** | 3,401 -> 3,336 | 23,423 | **22,835** (-2.5 %) |
| OFF (24 seeds) | 600 | 600 | 533 -> 533 | 3,164 | **3,056** (-3.4 %) |

**Census** (`lsd194Census.sh`, base `006eab809` vs `88369e3d7`, seeds 0..999, JOBS 6, SPLIT 2): Scene ON eventsDigest + error identical 1000 / 1000, 0 type-sequence changes (306 battles with changed command timing). Scene OFF identical 999 / 1000 (305 battles with changed timing): seed 796 differs, a `frame budget` error in both arms, so the digest depends on where the budget cut the run (outside 0..199; 0..199 identical). T1 (`soundCensusDelta.py --t1`, ON): move table exact 270,049, known-offset 152, missing 0, extra 0, unclassified 77 = base; non-move missing 0 -> 4, all one HELD_ITEM_EFFECT command (seed 995, command 3323 of 3330) cut by the same `frame budget` error. No gameplay / RNG change.

**Re-pins** (named in each file): `randomRoundSoak.test.ts` seed 1 frames 60582 -> 58672 (frames only; same battle 3 / depth 2 / turn 19 / roundLost; Icy Wind hits no longer pay the 28-row floor); ISSUES #89 Baton Pass pin seed 4 -> 8 (`tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 4`: candidates 8, 10, 11, 13, 16, 27, 36, 39; seed 8 commits 3, first 25185, halt 25492 on MAWILE). `aud252LossBallOpen.test.ts`: faint / select rows re-pinned toward the ROM, item rows left at the old pin and red (moved away).

**Gates.** `npm run typecheck` ok; `npm run test:gate` 360 files / 2,835 tests; the 207 files importing `battleResolutionPresentation` / `battleHitSounds` plus `aud2*` and `randomRoundSoak*` (3 batches): green except the two `aud252LossBallOpen` item-row pins above; `npm run build` ok. Full `npm test` not run (assignment).

## b4l2 (2026-11-21): the c-lead pins follow the ROM (tests only), Ghost Curse re-measured

No `src/` change; Scene ON presentation is as b4l landed it, so no T2 rescore (the b4l numbers stand). The supervisor's full suite on fold-a had 11 failures in 8 files, all on the 11 c-lead bodies of b4l (ids 86 78 79 47 320 109 174 142 261 137 280): their body rows gained the kernel lead L (hold rows at age 0 in front of the body) plus the per-id window adjust after it (`C_LEAD_WINDOW_ADJUST`), so lengths grew by L + adjust (Thunder Wave +9, Glare +11, Will-O-Wisp +10, Curse +8, Lovely Kiss +10, Confuse Ray +8).

**Verdict: every new value is the ROM presentation (b4m table, re-derived by b4l with `b4mRun.sh` on the 14 labs: the ROM's next-command frame equals the engine's with L + adjust), so the tests move, not the code.**

**Tests.** `tests/helpers/iu120Rows.ts` gets a test-side copy of the c-lead class (`C_LEAD_RULE_IDS`; L / adjust per id as `defaultLead` / `tail`, same convention as the lead-only / lse2 entries: `hpd4BodyRows` adds `lead + tail`, `iu120Ages` and `iu120EffectAges` follow, the effect age holds the last body row through the tail as the render effect does). The five tests that hard-coded a length now add `hpd4BodyRows(id)` to their base (liveCurseStatsAdapter 174, liveOam1MoveAdapters 261, playableAnimationLifecycle 109); liveAnchor3 / liveNext5 / liveProfile (Lovely Kiss effect ages) / playableAnimationIntegration go through `iu120Ages` / `iu120EffectAges` and needed only the helper. Their invariants (adapter active every age, ON/OFF rules / RNG / boundary parity, prompt reached) are untouched.

**Ghost Curse (apx222 374 -> 384).** `b4mRun.sh` on `b4m-curseghost-player-on` (ROM): R 49 / A0 58 / A1 430, L 6; the ROM's next command after A1 is `DoGhostCurse+0x2c` at 433 (+3). Engine: the hp command at 433 (age0 51 + 382; non-Ghost Curse: age0 49 + 187 = 236 = the ROM's, the same constant 7 between the engine's age0 and the ROM's A0 in both branches). So the Ghost branch (L 6 + adjust 4 = +10 rows) lands on the ROM's next command exactly and 384 is the ROM value; the b4l note stands (the second row, message 486 vs ROM 488, is 2 early, not pinned). The ROM's second command after A1 (`DoGhostCurse+0x31`, 488) is a message row; no further Ghost-specific adjust was fitted. The apx222 pin is `374 + hpd4BodyRows(174, 6)` (rows of the approximate body + the Ghost lead 6 + adjust 4).

**Verification** (all foreground): the 8 failing files 136 / 136; the 311 files that import battleResolutionPresentation / battleResolutionPresentationRender / moveAnimSounds, `tests/animation/live*`, `playableAnimation*`, `apx2*`, `aud2*`, `randomRoundSoak*` 3,087 / 3,087 green (this includes the b4l ON pins aud260 / aud242r that the stc1 note listed red on its base); `npm run typecheck` exit 0; `npm run test:gate` 360 files / 2,835 tests; `npm run build` exit 0. Evidence: `.integration/evidence/b4l2/` (worktree, git-ignored: `ghost/*.rom.json`, `*.eng.json`, logs).

## bdt1 (2026-11-21): Metal Claw, Dig and Rest bodies landed from ROM labs (Scene ON presentation / sound timing only; S11, ISSUES #219)

Scene ON only; Scene OFF untouched. Method: per-body battle labs (`tools/battle-lab/bdt1-*.json`, a Rattata pair, the player and then the foe using the move; Dig / Rest are two-turn traces A, 18, A, 1000, A, 18, A, 800) probed with `tools/integration/bdt1Run.sh OUTDIR FRAMES lab` (new: `hcr3mProbe.py` ROM script rows + `soundEventProbe.py lab` ROM SEs + `b4mEngine.ts` engine commands / SEs, merged by `bdt1Table.py`; `ENGINE_ONLY=1` reruns the engine side over the cached ROM files). Evidence (ignored): `.integration/evidence/bdt1/` (`labs0/`, `t2-base`, `t2-after`, `cen/`). Diff = ENG - ROM frame.

**1. Metal Claw (t2k item 1), commit c8faea1e3.** The shortfall reproduces on a second, independent window, on both sides: the adapter window `liveMoveAnimationDuration` case 232 was 140 (the source body through its final row) while the ROM script holds 14 more rows (`gAnimScriptActive` 157 = idle 4 + 154 - 1), so the hit SE / next command came 14 early. Fixed at the source: `case 232: return 154`. Lab, foe: SE 13 215 vs ROM 229 (-14) and SE 16 374 vs 389 (-15) -> exact (0 / 0), next command (hit-animation) exact; player lab: SE 13 and the next command exact. Residuals: the body's second SE 120 -2 (ROM gap 30, the table waits 28); the player lab's ROM StatUp SE 239 / SE 16 order (stat chain, out of scope).

**2. Dig (t2k item 5), commit dbcc6a1c5.** Two differing commands, both found from the labs (player and foe agree):
- *Charge turn* (`BattleScriptFirstChargingTurn`): the duration is already exact (the next print lands on the ROM's A1) but SE 175 x5 is +6 late (66 / 100 / 134 / 168 / 202 vs ROM 60 / 94 / 128 / 162 / 196, both labs): the ROM's used-print release to `gAnimScriptActive` is 4 rows (R -> A0 = 4), the generic sound clock assumes 10. New sound-only timing field `soundAgeLeadFrames` (`BattleMoveAnimationTiming`, read by `liveMoveSourceAge`, never the duration): Dig charge turn 6. -> exact x5 on both labs.
- *Attack turn* (a locked continuation, no move menu): the engine's first command is the used print at the press, the ROM runs EffectSemiInvulnerable -> SecondTurnSemiInvulnerable -> TryHit -> HitFromAtkString first (press 1043 -> `printstring` row 1060 = press + 6 + u, u = 11 = the kernel `instructionExecution` of the print). The print's message `leadFrames` is now 17 (6 + 11) for a Scene ON Dig `BattleScript_HitFromAtkString` USEDMOVE. Player lab SE 141 570 vs 585 (-15), SE 13 607 vs 623 (-16), (SE 16 783 not measured before) -> SE 141 +2, SE 13 +1, SE 16 783 exact; foe lab SE 141 1105 vs 1121 (-16), SE 13 1142 vs 1159 (-17), SE 16 1301 vs 1319 (-18) -> +1 / 0 / -1 (hp command 1194 vs ROM 1193, +1). 16 rows put SE 141 exact but SE 13 -1 / SE 16 -2 / hp exact (sum 3 vs 2 at 17): 17 is the ROM-derived value.
- The t2k "attack-turn tails +9 / +11" are not Dig's tail: in `.integration/evidence/t2k` the +9 rows are the confusion status-animation SE 176 (SE_M_DIZZY_PUNCH) and the +11 are SE 175 of a charge turn that follows the Sandstorm + confusion chain in s8108 decision 11 (a carried offset: the chain's own SE 176 is +2 there); the clean Dig attack-turn rows were -15 / -23 / -24 (SE 141, seeds 3738 / 6), the engine-early print above. Residual: player-lab SE 141 +2 / SE 13 +1 (foe +1 / 0); the player lab's send-in SE 15 after the faint is -10 (faint chain, out of scope).

**3. Rest (t2k item 7), commit 732ef62a7.**
- *Body SE*: SE 197 (SE_M_SNORE) 1198 vs ROM 1200 (-2; T2: 17 windows, all -2): the clock's 7-row calibration meets Rest's script lead 9, so `soundAgeLeadFrames` -2 for move 156 -> exact (player 1200, foe 1208).
- *Next action*: the foe's Seismic Toss after a successful Rest was -10 on every SE (238 1487 vs 1497, 214 1607 / 1617, 131 1625 / 1635, 13 1678 / 1688). Cause: the engine's Rest tail ends exactly on the ROM's MoveEnd row (1416 both) but the next action's used print is `EffectLevelDamage+0x9` ex2 at 1426 (MoveEnd + 10; the failed-Rest turn hides the same 10 rows in a misplaced 11-row pause), so the heal print (`BattleScript_PresentHealTarget`, move 156) takes `holdFrames` + 10 -> next action exact on both labs (238 1497 / 1505, 214, 131, 13 all +0).
- *Not landed (named):* (a) the asleep turn (`bdt1-rest3-*` labs): SLP status-animation SE 197 2167 vs ROM 2164 (+3, the shared PRE_MOVE_STATUS_ANIMATION_TIMING hold 67 vs the ROM's 64 + a 1-2 row late head) and the next action -7 (the same MoveEnd + 10 rows, 2259 -> 2269): this is the generic asleep script (`BattleScript_MoveUsedIsAsleep`), not Rest's body, shared with every sleeper; the T2 "status-animation +9" (seed 1415 SE 212 x3 at 17 spacing, six windows) is SE_M_CHARM (Attract's infatuation animation) and precedes Rest's SE in its windows, so it is not a Rest row either; (b) the T2 -27 on s6079 decision 7 is a carried offset (the same decision's other rows).

**T2 rescore** (`rescoreAll.sh` over `.integration/evidence/t2n` into `bdt1/t2-{base,after}`, base = 9e5a45dbc, after = 732ef62a7; `soundScoreboard.py`): Scene ON TOTAL mass 23,423 -> 21,692, exact 2,476 -> 2,601, offset 3,401 -> 3,276, missing 0 / extra 0 (both). Scene OFF 667 exact / 466 offset / mass 2,873 unchanged, missing 0 / extra 0, all 192 OFF result files byte-identical (`cmp`).

**Census 0..199 both scenes** (`lsd194Census.sh`, `LSD194_SHARDS="0 1"`, JOBS 2, SPLIT 2, 9e5a45dbc vs 732ef62a7): `rst197CensusDelta.py --digest` ON eventsDigest + error identical 200 / 200 (54 battles have changed presentation commands, 0 type-sequence changes), OFF identical 200 / 200 and byte-identical shards 2 / 2. T1 (`soundCensusDelta.py --t1`) ON identical on both arms: exact 54,127, known-offset 35 (Substitute -7 x33, Transform -5 x2), missing 0, extra 0, unclassified 13. No gameplay / RNG change.

**Tests.** `npm run typecheck` exit 0; `npm run test:gate` 360 files / 2,835 tests green; `npm run build` exit 0; the 256 files that import `battleResolutionPresentation` / `liveMoveAnimation` plus `tests/aud2*.test.ts` and `tests/randomRoundSoak*.test.ts` (grep -l, three batches): 255 files green, 1 red: `tests/playableAnimationIntegration.test.ts` "renders both opponent damaging and no-hit moves ..." (Shadow Punch 325 / 109 ages, 274 vs 266 rows) - red on the base 9e5a45dbc too (checked by restoring the three `src/engine` files to the base), not touched by this step. No pin was re-pinned and none moved away from the ROM. The full `npm test` was not run (the assignment forbids it).

**Residuals / next.** Metal Claw SE 120 #2 -2; Dig attack turn player +2 / +1, foe +1 / -1; the asleep-turn hold (+3) and the MoveEnd + 10 gap after the sleep animation (-7), shared by every sleeper (a status-script step, not a body); SE 212 Attract infatuation +9 (its own step); the Dig charge-turn sound lead and Rest's -2 are per-move constants (Fly / Bounce / Solar Beam charge turns were not measured here).

## gsp3 (2026-11-21): general status animations that run with no move: poison / burn tick, asleep turn, infatuation (Scene ON presentation / sound timing; S11, ISSUES #219)

Scene ON sound / presentation timing only; no gameplay or RNG change. Scene OFF changed only where the OFF ROM shows the same rows (checked with OFF labs). Method: `tools/integration/gsp3MakeLabs.py` builds 8 status labs (`tools/battle-lab/gsp3-{toxic,willowisp,sleeppowder,attract}-{player,foe}-on.json`; unequal levels, Seismic Toss for the other side); ROM rows / SEs through `bdt1Run.sh` (`hcr3mProbe.py` + `soundEventProbe.py`), engine through `b4mEngine.ts`, aligned and printed (ENG - ROM per SE and per script label) by `tools/integration/gsp3Cmp.py`. OFF labs are the same files with `battle-scene-off` (`gsp3-{toxic,willowisp}-player-off`, `bdt1-rest3-player-off`, `gsp3-attract-foe-off`), ROM via `run-mgba-probe.py ... hcr3mProbe.py --profile off`. `gsp3-sleeppowder-player-on` diverged structurally between ROM and engine (RNG / turn structure), so the asleep turn is measured on the bdt1 `rest3` labs.

**1. Poison / burn tick, commit dc9d7decc.** The b4l / s165 premise (a missing ~7-row lead) was wrong; two things were off, both found from the labs: the tick print's hold (`BattleScript_PoisonTurnDmg` 3 -> 2 rows, `BattleScript_BurnTurnDmg` 0 -> 3 rows, `END_TURN_STATUS_DAMAGE_LEAD_ROWS`, both scenes), and the SE age (a tick animation outside a B4 body used the generic Poison / Burn age 7; the ROM plays it at the launch row, age 0, selected by the command's `sourceLabel` `BattleScript_DoStatusTurnDmg`). Labs, ENG - ROM: toxic-player SE 148 +8 -> +0 on turns 2 / 3; willowisp-player SE 144 +4 -> +0 on turns 2 / 3; the foe labs agree. OFF: the ROM DoTurnDmg rows 2504 / 2478 now equal the engine's hp command.

**2. Asleep turn, commit 4839373ba.** The first action after the asleep print is no longer walked through the confirm handoff's before-turn -> action-dispatch stages (`turnOpensWithAsleepPrint`): the print lands on the attackcanceler row + 1, and the action transition after the sleep animation is anchored on the status animation (`actionTransitionPauseFrames` takes a `status-animation` as the anchor). `bdt1-rest3-player-on`: SE 197 +3 -> +0; the next action's SEs (238 / 214 / 131 / 13) -7 -> +0; the print row 2075 -> 2072 (ROM 2072). OFF (`bdt1-rest3-player-off`): print 2072 (ROM 2072).

**3. Infatuation, commit 0cdc2e4dc.** `STRINGID_PKMNINLOVE` is an action-transition print (`IN_LOVE_TRANSITION_ROWS` -2), and the INFATUATION (like SLP / CONFUSION) status animation plays its SE at age 0. `gsp3-attract-foe-on`: SE 212 at 697 / 714 / 731 -1 -> +0 (+9 was the pre-change reading); `gsp3-attract-foe-off`: print 188 / 1202 (ROM 188 / 1202, was 180 / 1194).

**Labs summary (ENG - ROM, frames, before -> after).** SE 148 +8 -> 0, SE 144 +4 -> 0, SE 197 +3 -> 0, next action -7 -> 0, SE 212 -1 (+9 intermediate) -> 0.

**T2 rescore** (`rescoreAll.sh` over `.integration/evidence/t2n`, `soundScoreboard.py`, base 22c58649b, after 0cdc2e4dc; evidence `.integration/evidence/gsp3/t2-{base,after}`, `score-{base,after}.json`): Scene ON (25 seeds) TOTAL exact 2,667 -> 2,701, offset 3,210 -> 3,176, mass 21,104 -> 20,063, missing 0 / extra 0 (both). Per family mass: move-animation SE 16,256 -> 15,443, stat-change 390 -> 376, cry 1,015 -> 977, battle-controller 3,391 -> 3,215, bgm 52 -> 52. Scene OFF (24 seeds) exact 667 -> 669, offset 466 -> 464, mass 2,767 -> 2,703, missing 0 / extra 0.

**Census 0..199 both scenes** (`lsd194Census.sh`, `LSD194_SHARDS="0 1"`, JOBS 2, SPLIT 2, 22c58649b vs 0cdc2e4dc; arms in `.integration/evidence/gsp3/census`): `rst197CensusDelta.py --digest` eventsDigest + error identical 200 / 200 on ON and on OFF (no gameplay / RNG change). Command timing: ON 33 battles changed (39 with a command-type-sequence change), OFF 40 battles changed (15 with a type-sequence change); every type-sequence change is one inserted Scene-ON-style `move-animation` action-transition pause before a used print (ON 107 after a status-animation, 44 after a message, 8 after an hp command; OFF 45 after a message, 8 after an hp command: the infatuation / asleep transitions the OFF labs show in the ROM). T1 (`soundCensusDelta.py --t1`, ON) identical on both arms: exact 54,127, known-offset 35 (Substitute -7 x33, Transform -5 x2), missing 0, extra 0, unclassified 13; the "action-transition pause" command count 2,913 -> 3,072 (+159).

**Tests.** `npm run typecheck` exit 0; `npm run test:gate` 360 files / 2,835 tests green; `npm run build` exit 0; every `tests/` file importing `battleResolutionPresentation` / `moveAnimSounds`, `tests/aud2*`, `tests/sta*`, `tests/animation/live*`, `tests/randomRoundSoak*` (312 files): all green except the 2 `tests/animation/liveAnchorMoveAdapters.test.ts` Metal Claw failures ("expected 154 to be 140"), which are red at the base 22c58649b too (bdt1's Metal Claw 140 -> 154, not re-pinned; verified by reverting `src` and re-running). There are no `tests/gsp*.test.ts` files. Re-pins (toward the ROM, ROM frame in the commit messages): `tests/randomRoundSoak.test.ts` seed 0 "full" frames 68529 / turn 21 and seed 2 frames 58583 (trajectory re-pins, the sleeping / in-love turns of those seeds moved to the ROM rows).

**Residuals.** (a) The turn-1 tick SEs carry a constant -4 from the previous action: the foe's Seismic Toss hit SEs after a Toxic / Will-O-Wisp body are -4 (the status-body tail, b4l). (b) The Toxic / Will-O-Wisp / Attract move-body SEs (227 / 148) are about -3 (body, not touched). (c) The "immobilized by love" print after the infatuation animation is 1 row early (ON ROM label 792 vs engine 791, OFF 1305 vs 1304). (d) OFF asleep turn: the first action after the sleep animation is about +4 late in OFF (print row exact). (e) `gsp3-attract-player-on` ROM / engine RNG diverge (the aligned SEs 697 / 2325 are +0).

## fch1 (2026-11-21): the AI faint-replacement choice costs 0..4 script frames (term 1 landed; terms 2 and 3 measured, not landed)

Commit `966063f8d` on top of `d2c0f88f5` (src: `battleAiSwitchInto.ts`, `battleScriptOpenPartyScreenOpcode.ts`, `midBattleOpponentPartySummaryTiming.ts`, `battleResolutionPresentation.ts`; tools: `appTrace.ts`, `fch1LabEngine.ts`). Presentation timing only: the choice itself (which mon) is untouched, the work model only counts what the real scorer port reads.

**Term 1 (landed). ROM rule.** TryChoose -> SendOut is 6 script frames plus the CPU time `GetMostSuitableMonToSwitchInto` (`battle_ai_switch_items.c:629`) burns inside one script frame. The ROM extra, probed on 32 (reads, frames) pairs of the Scene OFF labs (`.integration/evidence/fch1/rom-choice.json`), is 0..4 (ROM range 6..10) and tracks the scorer's move reads: `extra = round(0.16 * moveReads - 0.3)`, floored at 0 (21 / 32 exact, sum of |error| 13, max |error| 2; pinned by `tests/fch1AiChoiceTiming.test.ts`). A pass-1 hit on the first read (a super-effective move on the first candidate) costs 0, the damage fallback pass (Splash forces it) costs +2. The extra is the lead of the opponent party-status-summary draw (`opponentPartySummaryDrawTiming(afterFaint, voluntarySwitch, choiceExtraFrames)`: lead 23 + extra).

ROM vs engine, SE 16 / SE 114 / SE 15 (ROM frames; before -> after is engine minus ROM), six fsc2m Scene OFF labs on the ROM probe's button schedule:

| lab | ROM 16 / 114 / 15 | before | after |
|---|---|---|---|
| ai-nose-normal | 252 / 315 / 470 | 0, -2, -12 | **0, 0, -10** |
| ai-nose-mixed | 252 / 315 / 471 | 0, -2, -12 | **0, 0, -10** |
| ai-four-moves | 252 / 315 / 471 | 0, -2, -12 | **0, 0, -10** |
| ai-se-first | 252 / 314 / 470 | 0, -1, -11 | **0, 0, -10** |
| ai-same-se | 252 / 313 / 468 | 0, 0, -10 | **0, 0, -10** |
| n7-rattata | 252 / 313 / 468 | 0, 0, -10 | **0, 0, -10** |

SE 114 is ROM-exact on all six (the SE 15 -10 is the same in every lab and unchanged by this term: a separate offset after the send-out, not part of the choice). The T2 seeds move with it (SE 16 -> 114 interval, ROM / engine before -> after): 165 res18 70 / 66 -> 68, 1914 res11 83 / 81 -> 83, 2741 res9 82 / 81 -> 82, 3158 res5 76 / 74 -> 76, 5569 res18 72 / 71 -> 72, 2230 res11 79 / 76 -> 78. Rows with a ready-time cliff (term 2) get 2 later, as expected (1028 res10 83 -> 85, 3738 res38 81 -> 83).

T2 (`rescoreAll.sh` over `.integration/evidence/t2n`, `.integration/evidence/fch1/t2-{base,after}`, `soundScoreboard.py`; 0 missing / 0 extra everywhere):

| scene | exact before | exact after | offset | mass before | mass after |
|---|---|---|---|---|---|
| ON (25 seeds) | 2,541 | **2,571** | 3,336 -> 3,306 | 22,835 | **22,721** (-0.5 %) |
| OFF (24 seeds) | 667 | **695** | 466 -> 438 | 2,767 | **2,710** (-2.1 %) |

Census (`lsd194Census.sh`, `d2c0f88f5` vs `966063f8d`, seeds 0..199, JOBS 6, SPLIT 2, `.integration/evidence/fch1/census`): eventsDigest + error identical 200 / 200 in both scenes, 0 type-sequence changes (commands changed in 148 / 200 battles per scene, timing only). T1 (`soundCensusDelta.py --t1`) identical to base: ON exact 54,127, known-offset 35 (Substitute -7 x 33, Transform -5 x 2), missing 0, extra 0, unclassified 13; OFF reads the same 35 Substitute / Transform rows as extra and 13 unclassified in both arms (no new row). The chosen mon is unchanged (digest identical).

**Term 2 (drv1 ready-time cliff): measured, not landed.** The ROM message-ready is `SE16 + 2*steps + 4 + T + 1` (steps = 8 - floor(front-pic yOffset / 8); T = name chars + 12 for `Foe ` + `fainted!`; Rattata starts at 16, Mew / Abra 18, Blastoise / Feraligatr 20; A is accepted on the driver's 17-frame pulse). The engine matches this formula exactly in the labs for seven species (the n4 Abra, n9 Blastoise, n10 Feraligatr labs are copied into `tools/battle-lab/`; `tools/integration/fch1ReadySweep.ts` sweeps the species), so the foe-prefix typing length and the printer start are NOT the differing command: both agree with the ROM in the labs. In situ the engine is ready 1..3 frames later than the ROM. Measured by shifting the census driver's A press (temporary `FCH1_SHIFT`, reverted): the pulse is accepted only when shifted earlier by 3738 res38: 2, 1028 res10: 3, 319 res18: 1, 5063 res47: 2 (with the shift, 3738 collapses to 68 / ROM 66+2, 5063 to 69 / ROM 69, 1028 to 71 / ROM 70, 319 to 71 / ROM 70 + 1). The foe species and preceding messages differ per seed (Nidoking none, Venusaur ONEHITKO, Togetic CRITICALHIT), the segment-start `fieldArt` is not the cause (tested), and SE16 -> awaiting-message-dismiss start is 32..43 across the rows. The remaining candidate is the faint command's `leadFrames` (`faintScriptPreCryFrames`) or the message lead after the sink in the in-situ chain, which the labs (one fixed prefix) cannot show. Not found in the time box, so nothing landed; the four rows stay at +13..+17 (`fsc-a1.txt`: 1028 res10 +15, 3738 res38 +17, 5063 res47 +15, 319 res18 not in the printed set).

**Term 3 (hcr3 item chain): not investigated.** No time was left in the 150-minute cap after terms 1 and 2 and the acceptance runs, so the ROM rule behind first-SE offset 19 (1914) vs 13 (2230) is still open exactly as hcr3 left it; the aud252 item-row pins stay red at +4 (moved away in hcr3, not touched here).

**Tests / pins.** `tests/randomRoundSoak.test.ts` seed 21 `renderCalls` 3,043 -> 3,042 (re-pinned, fch1 comment line; frames pins unchanged). New `tests/fch1AiChoiceTiming.test.ts`: the cost-model pin (>= 21 / 32 exact, total |error| <= 13, max |error| <= 2) and the six lab SE 114 ROM frames (313 / 313 / 314 / 315 / 315 / 315). The trainer bench of `aud241bStage` now uses a Seismic Toss Rattata (Splash would force the damage fallback and add 2); that fixed obr251 / ais4 / aud242j. `tests/stc1*.test.ts` has 3 failures that are present at HEAD before this step (checked with `git stash`), not touched.

PAPERCUT: `npm run typecheck` / `test:gate` queue behind other worktrees' `tsc` flock (`/tmp/pokebench-typecheck.lock`), ~10 min idle wait with no output, ~10.

## stc2 (2026-11-21): hcr3's stat-next hp tail vs stc1's Scene OFF stat timing; Metal Claw test pin (presentation / sound timing only)

Base fold-a 22c58649b had five red tests: three `stc1SceneOffStatChangeSe` rows (Icy Wind foe SE 214 vs ROM 210, Rock Tomb +6, Icy Wind player -4) and two `liveAnchorMoveAdapters` Metal Claw rows (140 -> 154). Gameplay, RNG and Scene ON presentation are untouched.

**The ROM interval is scene-free.** ROM labs `stc1-icywind-foe`, `stc1-icywind-plr`, `stc1-rocktomb-foe` (Scene OFF = the committed labs, Scene ON = the same labs with `profile` battle-scene-on and a 700-frame tail), `hcr3mProbe.py` + `soundEventProbe.py lab`; hp row = the `HitFromAtkAnimation+0x8` exec, frames from the lab start:

| lab (drop = hp change) | hp row | hp changes | StatDown+0x7 exec (`playanimation`) | stat SE | hp row -> exec | SE - exec |
| --- | --- | --- | --- | --- | --- | --- |
| icywind-foe OFF (105 -> 43, 62) | 136 | 200 | 206 | 210 | 70 = drop + 8 | 4 |
| icywind-foe ON | 392 | 456 | 462 | 466 | 70 = drop + 8 | 4 |
| icywind-plr OFF (105 -> 35, 70) | 132 | 204 | 210 | 214 | 78 = drop + 8 | 4 |
| icywind-plr ON | 388 | 460 | 466 | 470 | 78 = drop + 8 | 4 |
| rocktomb-foe OFF (105 -> 8, 97) | 137 | 236 | 242 | 246 | 105 = drop + 8 | 4 |
| rocktomb-foe ON | 280 | 379 | 385 | 389 | 105 = drop + 8 | 4 |

The bar is `drop + 2` rows, then 6 rows to the stat script's `playanimation`; the SE is that exec + 4. The engine's three labs do not roll the ROM's damage (RNG not synchronised in the lab stage: engine drops 67 / 67 / 104 vs ROM 62 / 70 / 97), so the old "exact" icywind-foe row (stc1) was the +5 damage difference cancelling the hcr3-less 5-row tail shortfall by coincidence; the player row (-8) and Rock Tomb (+2) were the same shortfall minus / plus their own damage difference. In the engine the stats-change command starts at hp (bar + 1) + tail + the 2-row `stat` command, and stc1's Scene OFF secondary age (shift 2, SE at command age 4) wants it ON the exec: tail 5. hcr3's tail 4 stays for Scene ON (ROM-exact on aud252 seed 1914 with Scene ON's own stat age; T2 ON is byte-identical).

**Landed.** `HP_STAT_NEXT_TAIL_FRAMES_OFF = 5` (battleResolutionPresentation.ts; `HpLeadRows.sceneOff` = HITMARKER_NO_ANIMATIONS), Scene ON keeps `HP_STAT_NEXT_TAIL_FRAMES = 4`.

| path | ROM | fold-a | stc2 |
| --- | --- | --- | --- |
| stc1 icywind-foe OFF, engine SE - ROM | engine drop - 62 = +5 | +4 | +5 |
| stc1 icywind-plr OFF | engine drop - 70 = -3 | -4 | -3 |
| stc1 rocktomb-foe OFF | engine drop - 97 = +7 | +6 | +7 |

i.e. exactly the damage difference on every row (a 1-frame step each). `tests/stc1SceneOffStatChangeSe.test.ts`: the three secondary rows are now pinned as `SE - ROM frame == engine hp drop - ROM drop` (the engine drop is read from the presented hp command), the four move-caused rows stay exact (99 / 105 / 100 / 96). `tests/aud252LossBallOpen.test.ts` (Scene ON) is unchanged and green.

**Metal Claw.** `tests/animation/liveAnchorMoveAdapters.test.ts`: `duration: 140 -> 154` (bdt1: the source body is 140 rows, the ROM script holds 14 more; the ages go through `iu120Ages(row.id, row.duration)`, so the ages follow). No src change.

**T2** (`RESCORE_SCENES=off|on tools/audio/rescoreAll.sh OUT .integration/evidence/t2n`, `soundScoreboard.py`; `.integration/evidence/stc2/t2-{base,after}`; 0 missing / 0 extra everywhere). Scene OFF, 24 aligned seeds: exact 667 -> 670, offset 466 -> 463, mass 2,767 -> 2,761; stat-change SE exact 65 -> 68 / offset 40 -> 37 / mass 217 -> 214 (three -1 rows exact; tails 4 -> 5 beat 4 and 6: tail 6 left stat at 65 / 40); cry 480 -> 479, battle-controller 2,051 -> 2,049. Scene ON, 25 aligned seeds: totals, deltas and per-id deltas identical (2,667 exact / 3,210 offset / 21,104 mass).

**Census** (`lsd194Census.sh`, seeds 0..199, `LSD194_SHARDS="0 1"`, 22c58649b vs HEAD, `rst197CensusDelta.py --digest`): Scene OFF eventsDigest + error identical 200 / 200, type-sequence changes 0, 145 battles identical / 55 changed (the only changed commands: the `hp` after a hit followed by `stat`, +1 frame); Scene ON identical 200 / 200, 0 changed, byte-identical shards 2 / 2.

**Tests** (all foreground): the 311 files that import battleResolutionPresentation / `aud2*` / `stc1*` / `randomRoundSoak*` / `animation/live*` / `playableAnimation*` / `apx2*` 3,087 / 3,087 green with no trajectory pin moved (`randomRoundSoak*` unchanged: seed 1 frames, the #89 Baton Pass seed 8); `tests/aud252*` green; `npm run typecheck` ok; `npm run test:gate` 360 files / 2,835 tests; `npm run build` ok. Full `npm test` not run (assignment).

**Residuals.** Scene ON's tail 4 vs the ROM law bar + 8: ON's command start is 1 row before the exec with its own stat age (not re-derived; ROM-exact on seed 1914). The T2 OFF stat rows still at -1 (12) / -3..-22 are not secondary-after-hit rows by this law (move-caused after-body and item chains; not measured here). Evidence (git-ignored): `.integration/evidence/stc2/` (`labs/` ROM rows + SEs for both scenes, `t2-base`, `t2-after`, `cen`).

## t2k2 (2026-11-21): the remaining S11 sound-timing mass re-ranked on the current tree (measurement only; no `src/` / `tests/` change)

**Method** as t2k (drv1 `--romdrive` rescore of all 25 ON + 24 OFF t2n seeds, `aud249Rescore.sh`, then `soundScoreboard.py OUT --per-seed --out OUT/score.json`; every row attributed with `t2Attribute.py`'s alignment + ROM `gCurrentMove` + the engine `--cmdtrace=1` commands). Disjoint "windows" own rows from one nonzero offset step to the next, so the item table sums exactly. Evidence (git-ignored): `.integration/evidence/t2k2/` (`t2/` sets + `score.json` + `scoreboard.txt`, `p/` ROM probes + `d-{on,off}` cmp dirs, `attr-{on,off}.json`, `final2.txt` = the item table, `agg.txt`, `shape2.txt`, `gain.txt`).

### 1. Rescore (missing / extra 0 / 0 in both scenes)

| family (mass / exact) | OFF t2k | OFF now | ON t2k | ON now |
| --- | --- | --- | --- | --- |
| move-animation SE | 0 / 0 | 0 / 0 | 19,810 / 2,005 | 15,401 / 2,247 |
| stat-change SE | 403 / 2 | 206 / 68 | 410 / 27 | 377 / 31 |
| cry | 517 / 97 | 455 / 107 | 1,227 / 31 | 953 / 69 |
| battle-controller SE | 2,225 / 500 | 1,960 / 524 | 4,231 / 301 | 3,166 / 382 |
| bgm | 19 / 1 | 19 / 1 | 69 / 2 | 52 / 2 |
| TOTAL | 3,164 / 600 | **2,640 / 700** | 25,747 / 2,366 | **19,949 / 2,731** |

ON -5,798 mass (-22.5%), +365 exact; OFF -524 (-16.6%), +100 exact. The stc2 section's own last numbers were ON 21,104 / 2,667 and OFF 2,761 / 670 (its base); what landed since (hcr3, bdt1, gsp3, fch1) is -1,155 ON / -121 OFF more. 0 missing / 0 extra, so no new finding on row counts.

### 2. Attribution (row mass; classes sum to TOTAL)

| class | ON rows / mass / exact | OFF rows / mass / exact |
| --- | --- | --- |
| body (move running at the row), excl. B4 | ~3,790 / 8,927 / ~2,185 | n/a (no body rows in OFF) |
| B4 bodies (reported separately) | 111 / 298 / 7 | n/a |
| gen (gCurrentMove 0: status / general animations) | 912 / 6,176 / 32 | n/a |
| controller hit SE 12 / 13 / 14 | 475 / 1,797 / 284 | 548 / 1,215 / 338 |
| controller faint / send-in 15 / 16 / 114 | 283 / 1,369 / 98 | 244 / 745 / 152 |
| cry | 202 / 953 / 69 | 192 / 455 / 107 |
| stat | 101 / 377 / 31 | 105 / 206 / 66 |
| bgm | 5 / 52 / 2 | 4 / 19 / 1 |

**Shape** (window = seed x segment x cause), ON mass: body const 5,168 / one-off 2,248 / varies 1,514; gen const 4,613 / one-off 1,402 / varies 161; ctl-hit const 700 / one-off 899 / varies 198; ctl-chain const 807 / one-off 562; cry const 628 / one-off 325; stat const 337. OFF: ctl-hit const 812 / one-off 294 / varies 109; ctl-chain const 637 / one-off 108; cry const 391 / one-off 64; stat const 184 / one-off 22. Constant offsets still dominate (a lead is paid once per row inherited), but the t2k gen term is now ~6.2k, not 6.8k, and the gen class is the largest non-body bucket. The gen causes are, ON: gen:152 1,533 + 228 / 102 1,022 (the held-item group, one chain), gen:148 1,362, gen:142 944, gen:219 262, 242 / 127 ~436.

### 3. Ranked top 8 (rows assigned disjointly; items 1-8 + the lower lines + remainder = TOTAL)

Breadth is t2k's census (not re-run; command counts per 1,000 battles: general-animation 7,506 in 864 battles, faint 4,332, hit-animation 18,646, Earthquake / Struggle are rare, <1% of battles).

| rank | item | scenes | T2 mass now (ON / OFF) | breadth | direction | cost / risk | lands in | ROM window |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Held-item effect group (Leftovers / berry heal gen:152 -> 228 -> 102): first SE ~21 frames late | ON | 2,360 / 0 (440 rows, 10 seeds, 88 windows; 5 exact) | general-animation 7,506 cmds / 864 battles (held items a subset) | pull the HELD_ITEM_EFFECT general-animation SE age from 23 to 8 after the cmd start (cmd starts 6 after the ROM exec), so the group's inherited offset goes away | low-medium: one lead + one age; both constants exist (`HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES` 15 / `CONTINUE_LEAD_FRAMES` 9), 10 seeds to re-verify | `src/engine/moveAnimSounds.ts` `emitGeneralAnimSounds` (HELD_ITEM_EFFECT age) + `battleResolutionPresentation.ts` general-animation lead | s2230 decision 6 (ROM 8089 / eng 8030): `ItemHealHP_Ret+0x7` ex2 at 306, SE 152 at 314; engine cmd 2.4 at 312, SE 152 at 335 |
| 2 | Other general animations after a body (gen:142 / 180 / 202 / 144, 242, 127 ...): the command starts ~25 short | ON | 1,713 / 0 (254 rows, 11 seeds, 47 windows) | as above | lengthen the interval between the previous body's last command and the general-animation command by the ROM's `EffectRestoreHp` -> animation gap (Recover -25 / Soft-Boiled -10 .. -17) | medium: per-previous-body tails (Recover, Soft-Boiled) | `battleResolutionPresentationRender.ts` post-body tail tables + `moveAnimSounds.ts` general-animation start | s6912 decision 5 (ROM 3450 / eng 3446): Recover `EffectRestoreHp+0x2` ex1 at 244; engine `move-animation` cmd 0.8 for 105 at 266 is where the -25 starts |
| 3 | Faint -> party-summary / switch chain (SE 114 / 15, cry): chain lead 23-25 vs ROM ~2 on the same-turn faint, plus ball-open timing | ON + OFF | 926 / 516 (114 rows ON, 88 rows OFF; 24 / 22 seeds, 52 + 45 windows) | faint 4,332 cmds / 1,000 battles: the widest breadth of any item | cut the `party-summary` cmd lead (23 + extra) to the ROM's SE at script exec + 0 for the after-faint, no-choice case; the OFF side has the same 23 | medium: `opponentPartySummaryDrawTiming(afterFaint, voluntarySwitch, choiceExtraFrames)` has 3 callers; fch1 touched only the extra term; re-run the OFF ball-open (SE 15) rows after | `src/engine/battleResolutionPresentation.ts` `opponentPartySummaryDrawTiming` / the party-summary segment builder | s2 OFF decision 6 (ROM 3431 / eng 3249): `FaintedMonSendOutNew+0x2` ex2 at 502 with SE 114 at 502; engine party-summary cmd 0.13 (lead=25) at 500, SE 114 at 525 |
| 4 | gen:148 poison / status tick, first row | ON | 1,354 / 0 (110 rows, 3 seeds, 18 windows; 0 exact) | general-animation: 3 seeds | the engine tick SE is 25-31 frames early; unprobed beyond t2k's note | medium: three seeds, gsp3 closed the burn / poison hold but not this animation | `moveAnimSounds.ts` `emitGeneralAnimSounds` status-tick arm | s165 decision 11 (seg23) rf 7437 (-31 x 6); s499 decision 13 |
| 5 | ON single windows >= 20 (Aerial Ace -50, Confusion -48, Supersonic -34, Psychic +24, Rock Slide -9 x 20, ...) | ON | 1,287 / 0 (130 rows, 12 seeds, 38 windows) | per move, not general | each its own one-off; chase only if a body recurs across seeds (Supersonic / Safeguard share s5569 seg25, -34) | high: composite, no common cause | per body, `battleResolutionPresentationRender.ts` | s5569 decision 12 (seg25) rf 6516 (-34 x 12 rows); s97 decision 11 (seg23) rf 11037 (+24 / +25 x 8) |
| 6 | Earthquake hit-all: ~11 rows after the body are not presented, the next mover starts 10 frames early | ON + OFF | 957 / 140 (91 + 13 rows, 7 / 6 seeds, 13 + 11 windows; 0 exact) | EARTHQUAKE is one move, rare in battles but appears in 7 of 25 seeds | lengthen the hit-all segment tail by 9-15 frames (`cmd 0.4 -> next` after the SE 13) | **low**: one move, a clean step (-9 .. -15), cause confirmed in the ROM; the clearest single cause in this list | `src/engine/battleResolutionPresentationRender.ts` hit-all body tail (Earthquake / Surf-style hit-all) | s97 decision 14 (ROM 14519 / eng 14228): ROM `DoHitAllWithUndergroundBonus+0xc` ex0 at 260, `+0x10` ex1 at 263; engine hit-animation cmd 0.2 at 263, hp cmd 0.3 at 298; the body SE 234 at 53 matches |
| 7 | Drill Peck s1914 seg21: one window -66 x 9 rows | ON | 660 / 0 (10 rows, 1 seed) | 1 seed | unknown: a one-off of the t2k 594 window; probe first | unknown: single seed | to find (`probe` s1914 decision 10) | s1914 decision 10 (seg21) rf 7758, -66 |
| 8 | Struggle hit SE / body | ON + OFF | 276 / 305 (61 + 51 rows, 3 / 4 seeds, 18 + 31 windows) | Struggle only when out of PP | Struggle's recoil + body: -3 median | medium: both scenes, 31 OFF windows | `battleResolutionPresentation.ts` Struggle presentation | s7295 OFF decision 8; ON s499 |
| | **Items 1-8** | | **9,533 / 961** | | | | | |
| 9 | Ice Beam first-mover windows (below the cut) | ON | 545 / 0 | | | | | s830 decision 1; s2230 decision 20 (-21 x 11) |
| 10 | OFF hit SE 13 @hit-animation (Double-Edge -7, Focus Punch -3) | OFF | 0 / 242 | | | | | s5063 decision 8; s7682 decision 2 |
| 11 | weather gen:219 (s8108) | ON | 262 / 0 | | | | | s8108 |
| 12 | faint SE 16 / cry (wtl1 overlaps) | ON + OFF | 668 / 186 | | | | | wtl1 in flight |
| X | chg2 (in flight; not proposed) | ON + OFF | 1,001 / 247 | | | | | |
| B | B4 bodies (being landed; reported separately) | ON | 298 / 0 | | | | | |
| R | remainder | | 7,642 / 1,004 | | | | | |
| | **TOTAL** | | **19,949 / 2,640** | | | | | |

Sum-check: ON 2,360 + 1,713 + 926 + 1,354 + 1,287 + 957 + 660 + 276 (= 9,533) + 545 + 262 + 668 + 1,001 + 298 + 7,642 = 19,949; OFF 516 + 140 + 305 (= 961) + 242 + 186 + 247 + 1,004 = 2,640. The B4 mass is 295 in the body-shape table and 298 here (the item split by window); "T2 mass now" is row mass, not saving (the counterfactual gain of the step alone is 30-60% of it: `gain.txt`).

### 4. The top three ROM windows (hcr3mProbe + hcr3mCmp)

1. **Held-item group, s2230 decision 6.** ROM: `BattleScript_ItemHealHP_Ret+0x7` ex2 at 306, SE 152 at 314 / 346 / 378, SE 228 at 410. Engine: general-animation **cmd 2.4** (HELD_ITEM_EFFECT, min 229) at 312, SE 152 at 335 / 367 / 399. The cmd starts 6 after the ROM exec (right) but the first SE comes 23 frames after the cmd start instead of 8, so every row of the chain is +21 and the offset is inherited by the 228 / 102 rows (2,360 across 10 seeds). Differing command: the general-animation cmd's SE age, not the command start.
2. **General animation after a body, s6912 decision 5.** ROM `HitFromAtkAnimation+0xa` at 228 -> `MoveEnd` 234 -> `EffectRestoreHp+0x0` 242 (Recover, mv105). Engine: move-animation cmd 0.4 at 228, sprite-visibility 243 / 244, message cmd 0.7 at 245, **move-animation cmd 0.8 for 105 at 266**; the engine's Recover animation SE row arrives ~25 frames before the ROM's (gen:180, med -25). The differing command is the move-animation / general-animation start after the message cmd 0.7: the ROM waits for the exec flag at `EffectRestoreHp+0x2`, the engine does not.
3. **After-faint party summary, s2 OFF decision 6.** ROM: `FaintedMonSendOutNew+0x2` ex2 at 502 with SE 114 at 502, SE 15 later. Engine: **`party-summary` cmd 0.13, lead=25, min=125** at 500, SE 114 at 525 = +23. Differing command: `party-summary`'s lead (23 + extra) against the ROM's 2. The same chain on ON (s2230 dec 6 after the held-item chain, s97 dec 14 ball open at 429 / 433) shows the SE 15 only -4.

### 5. What not to chase

- chg2's bodies and wtl1's faint prints: excluded as instructed (X 1,001 / 247; item 12 668 / 186 overlaps wtl1).
- The 7,642 / 1,004 remainder is inherited drift plus ~650 / 130 windows of < 20 frames each; re-rank after items 1-3, 6.
- B4 bodies: 298 mass, being landed; no proposal here.

Not applied: no `src/` or `tests/` change; PROGRESS / ISSUES / ROADMAP untouched.

## chg2 (2026-11-21): two-turn move family, Scene ON sound / print timing; Aerial Ace s3738 named and landed

Base `ad09bdf9d`. Scope: ISSUES #219, S11 frame alignment; no gameplay / RNG change (census below). Item 1: Fly 19, Bounce 340, Dive 291, Solar Beam 76, Razor Wind 13, Sky Attack 143 on both sides, Scene ON; item 2: Aerial Ace s3738 -39 / -79.

**Labs.** `tools/integration/chg2MakeLabs.py` writes `tools/battle-lab/chg2-<move>-{player,opponent}-on.json` (the bdt1 Dig labs with move 91 replaced), `chg2Trace.py` the compare traces (`tools/compare/traces/chg2-<lab>.json`); ROM rows / SEs / engine commands through `tools/integration/bdt1Run.sh OUT FRAMES lab` (`ENGINE_ONLY=1 SPAN=0:0` re-measures the engine only). `b4mEngine.ts` gained `ENGINE_RNG_SEED` (the engine kernel RNG start value of a lab; the ROM lab keeps seed 1): Bounce player 5 and Sky Attack player 4 are the first seeds whose accuracy rolls agree with the ROM (at the default seed the engine's Bounce / Sky Attack missed and the attack turn had no SEs). Evidence (ignored): `.integration/evidence/chg2/{labs0,labs-base,t2-base,t2-after,census,s3738off}`.

**Rule 1: charge-turn sound lead from the opener's kernel execution** (`chargeTurnSoundLead`, `8fff17edb`; bdt1's Dig +6 generalized). The generic sound clock assumes R -> A0 = 10 rows after the used print's release (Dig). On the ROM, R -> A0 = E - 6, where E is the kernel `instructionExecution` of the charge opener (`STRINGID_EMPTYSTRING3`, label `BattleScriptFirstChargingTurn`); the engine clock therefore moves by 16 - E rows (`CHARGE_TURN_SOUND_LEAD_BASE_ROWS = 16`). E on these labs: Dig 10, Fly 7, Bounce 10, Dive 9, Solar Beam 9, Razor Wind 6, Sky Attack 6; the value is read from the kernel event, not tabled. The command duration and the body pixels are untouched (a 3-row earlier Fly body was measured and made the pixels worse). Guard (`713d684c8`): when the opener continues an earlier script run (the preceding event has a lower execution count: the charger woke up / thawed first, s2230 Bounce E = 79) there is no lead; without the guard T2 ON lost SE 203 (missing 1).

**Rule 2: locked second-turn used print waits press + 6 + u** (`twoTurnSecondPrintLead`, `b1d59791a`; bdt1's Dig constant 17 generalized to the ids 13 / 19 / 76 / 91 / 130 / 143 / 291 / 340 with STATUS2_MULTIPLETURNS, `BattleScript_HitFromAtkString` and `HitFromAccCheck`). ROM: print row = press + 6 + u, u = the print's kernel `instructionExecution` (Dig u = 11 -> 17, the old constant). A foe-charger's second turn needs the player's menu press (SE 5 at 1023 / 1043); a player-charger's second turn auto-continues with no press.

**Dig rules hold** (item 1): the charge-turn R -> A0 lead (Dig E = 10, 0 change) and the attack-turn used print typed after the effect-script rows (17 = 6 + 11) both fall out of rules 1 / 2 unchanged; `bdt1-dig-player-on` identical before / after (175 x5 +0, 141 +2, 13 / 16 +1).

**Labs, ENG - ROM per SE (frames), before -> after** (before = base `ad09bdf9d` source on the same ROM files):

| Lab | Charge SEs | Attack-turn SEs |
|---|---|---|
| Fly foe / player | 158: +9 -> 0 / +9 -> 0 | foe 135 / 136: -16 -> +1, 13 / 16: -18 -> -1; player 135 / 136: -12 -> +5, 13 / 16: -14 -> +3 |
| Dive foe / player | 162 / 233: +7 -> 0 / +7 -> 0 | foe 178 / 216: -16 -> +1, 13 / 16: -18 -> -1; player 178 / 216: -14 -> +3, 13 / 16: -16 -> +1 |
| Solar Beam foe / player | 140: +7 -> 0 / +7 -> 0 | foe 201 / 13 / 16: -18 -> 0; player: -15 -> +3 |
| Razor Wind foe / player | 132 / 133: +10 -> 0 / +10 -> 0 | foe 160 x3 / 136: -14 -> +1, 13 / 16: -15 -> 0; player 160 x3 / 136: -4 -> **+11**, 13 / 16: -5 -> **+10** |
| Sky Attack foe / player (seed 4) | 239 x8: +10 -> 0 / +10 -> 0 | foe 238 / 141: -16 -> +1, 13 / 16: -20 -> -3; player 238 / 141: -11 -> +6, 13 / 16: -14 -> +3 |
| Bounce foe / player (seed 5) | 203: +6 -> 0 / +6 -> 0 | foe: no attack-turn SEs in the ROM window; player 203: +6 -> 0, 193 / 141: -16 -> +2, 13: -18 -> 0 (the faint SE 16 +61 -> +79 is the faint chain, out of scope) |

Every charge-turn SE is on the ROM frame (14 labs-sides, 0 residual). Foe-charger attack turns are within +-3 of the ROM (were -14 .. -20, the print the engine did not wait for). Player-charger attack turns carry +2 .. +6 (Dig +2 / +1; Razor Wind +10 / +11).

**Not landed (measured, rejected).** A signed charge-turn duration adjustment E - 10 (the player-charger attack-turn residual equals the charge-turn body's error: Fly +5 -> +2, Dive +3 -> +2) moves the SEs of the other side's action between the two turns the wrong way on three moves (Razor Wind +1 -> -3, Sky Attack -4 -> -8, Solar Beam -6 -> -7), so the charge body's end error is per body (`liveMoveAnimation.ts` turn-0 windows: 19 43, 340 64, 76, 13 45, 143, 291), not an E rule. Left: (a) the other side's action SEs between the charge and the attack turn: Solar Beam -6, Razor Wind +1, Sky Attack -4, Bounce -17 (Bounce player 238 / 214 / 131 / 13 at 623 .. 814, ENG 606 .. 797), unchanged; (b) player-charger attack turn +2 .. +6 (the charge body's end), Razor Wind player +10 / +11 (before: -4 / -5; one lead for every move overshoots here: the base engine's Razor Wind player gap was already within 4); (c) Skull Bash not measured (0 Factory uses). Pixels: the Fly charge turn matches the ROM (S11 compare); the attack-turn pixels were not re-compared.

**Item 2: Aerial Ace s3738 -39 / -79 is not an Aerial Ace interval.** Windows: Scene OFF decision 15 (ROM commit 6364, engine 6283) and decision 27 (ROM 11354, engine 11130), opened with `hcr3mProbe.py` / `hcr3mCmp.py` (OFF files copied as `-on`) and the engine `soundCensusRomReplay.ts --cmdtrace=1`. Both windows: the player's String Shot (move 184, `BattleScript_EffectStatDown`) against a foe whose Speed cannot fall, then the foe's Aerial Ace (SE 12). The can't-change path is `pause B_WAIT_TIME_SHORT; goto BattleScript_StatDownPrintString`. ROM: String Shot used print at row 12, "won't go lower" print at 73 (61 rows later); engine: message -> message 22 rows. Everything after is 38 .. 39 early: Aerial Ace used print ROM row 185 vs engine 147, SE 12 ROM 254 vs engine 215. The engine command whose interval differs is the used-print `message` command's hold (`holdFrames` via `sourcePauseUsedMoveHoldFrames`, off108): it looks back from the print for a `pause B_WAIT_TIME_SHORT`, stopped at the `goto`, and the `stat-stage-change` receipt ended its scan. `713d684c8`: that receipt is skipped and a print at `BattleScript_StatDownPrintString` is the pause path (hold = executions + 1 = 38, the Splash hold value). Result: SE 12 is on ROM frame 254 in both windows (the engine's decision-27 commit moved 11130 -> 11208, 2 x 39). It is a general rule for every stat change that cannot happen, in both scenes, not an Aerial Ace one.

**T2** (`tools/audio/rescoreAll.sh`, 25 ON + 24 OFF t2n seeds, `soundScoreboard.py`; base = the base source file swapped in on the same ROM files): **ON TOTAL exact 2,701 -> 2,715, offset 3,176 -> 3,162, mass 20,063 -> 19,196 (-867), missing 0 / extra 0** (move-animation SE 15,443 -> 14,909, battle-controller 3,215 -> 2,941, cry 977 -> 918); **OFF exact 669 -> 671, offset 464 -> 462, mass 2,703 -> 2,547 (-156), missing 0 / extra 0** (battle-controller 1,999 -> 1,882, cry 474 -> 435; the s3738 Aerial Ace -42 x 2 and the faint -44 x 2 rows are the stat-print interval above). A first "after" ON run had missing 1 (s2230 Bounce SE 203: the woke-up charge, E = 79); the guard in rule 1 removed it.

**Census 0..199** (`lsd194Census.sh`, `LSD194_SHARDS="0 1"`, `ad09bdf9d` vs `713d684c8`): `rst197CensusDelta.py --digest` eventsDigest + error identical 200 / 200 on ON (37 battles changed command timing, 0 type-sequence changes) and 200 / 200 on OFF (8 battles changed). No gameplay / RNG change. T1 (`soundCensusDelta.py --t1`, ON) identical on both arms: exact 54,127, known-offset 35, missing 0, extra 0, unclassified 13.

**Tests.** `npm run typecheck` exit 0; `npm run test:gate` 360 files / 2,835 tests green; `npm run build` exit 0; the 346 `tests/` files importing `battleResolutionPresentation` / `liveMoveAnimation` plus `tests/aud2*`, `tests/chg*`, `tests/animation/live*`, `tests/randomRoundSoak*`: green except (i) the 2 `tests/animation/liveAnchorMoveAdapters.test.ts` Metal Claw failures (red at base, not mine; `tests/stc1SceneOffStatChangeSe.test.ts` was not in the set), and (ii) `tests/aud261MoveAnimSounds.test.ts` "aud261-razorwind-player" unleash offset (pin 4, now -11: moved away from the ROM, left red, the Razor Wind player residual above). Re-pins toward the ROM: `tests/aud242oMoveAnimSounds.test.ts` dive-player delta -7 -> 0 (ROM SE 162 / 233 at 51 / 109); `tests/aud261MoveAnimSounds.test.ts` Razor Wind charge offsets -10 -> 0 (ROM SE 42 / 83) and the opponent unleash 14 -> -1 (ROM SE 1104 / 1108 / 1112 / 1131). No `randomRoundSoak` pin moved.

**Papercuts.** `hcr3mCmp.py` reads `<seed>-on.*` only (Scene OFF windows need the files copied under that name); `hcr3mProbe.py --from` must be below the decision's commit frame (the first run used 6560 > 6364 and the window had no ROM rows until the first change), ~10 min; `run-mgba-probe.py` refuses an existing output path.

### chg3 (2026-11-21): the player-charger attack turn follows the ROM (Scene ON sound / print timing only)

chg2 left the Razor Wind PLAYER unleash pin (`tests/aud261MoveAnimSounds.test.ts`) red (4 -> -11). chg3 labbed the player attack turn of all seven two-turn bodies (13 labs, engine vs the chg2 ROM captures; `chg2-{razorwind,skyattack,solarbeam,fly,dive,bounce}-{player,opponent}-on`, `bdt1-dig-player-on`; evidence `.integration/evidence/chg3/{before,exp6}`).

**Two rules.** (1) A player-charger's second turn has no press: the locked unleash print waits the ROM's `6 + u` less `TWO_TURN_PLAYER_NO_PRESS_ROWS` = 10 (the engine's message command for a no-press player turn starts at turn-end + 22, the ROM's MoveEnd + 19 / 20, 3 - 4 rows after the effect-script row; with the press term's +7 the lead was uniformly ~10 rows long once the chain before it was exact). (2) After the charge print the ROM's chain to the next action is E - 2 rows longer than the presented one (E = the opener's `instructionExecution`: Sky 6, Fly 7, Solar 9, Dive 9, Dig 10, Bounce 10; the gap-print class, Razor Wind, already carries it before its glyph). The rows are carried (`chargeChainCarry`) to the next STRINGID_USEDMOVE print: onto its hold (after its glyph) when the other side acts, onto its lead when the charger itself does. A hold on the charge print or a lead on the foe's print moved the foe's used glyph +7 / +8 off `tests/chg161ChargeTurnPrint.test.ts`' off108 pins (exact 0 there); carrying it after the glyph keeps those pins at `[0, 4, 0]` and still lands the foe's SEs (the off108 probe and the bdt1 trace measure the foe print's glyph and command rows differently by about E - 2; the SE rows, which T2 scores, follow bdt1).

**Lab table (player attack turn, ENG - ROM per SE; before -> after).**

| Move | before | after |
|---|---|---|
| Razor Wind | +11 (13/16 +10) | +1 (13/16 0) |
| Sky Attack (seed 4) | +6 (13/16 +3) | 0 (13/16 -3) |
| Solar Beam | +3 | 0 |
| Fly | +5 (13/16 +3) | 0 (13/16 -2) |
| Dive | +3 (13/16 +1) | 0 (13/16 -2) |
| Bounce (seed 5) | +2 | 0 (13 -2) |
| Dig | +2 (13/16 +1) | 0 (13/16 -1) |

The foe-acts-between SEs: Razor +1 -> +1, Sky -4 -> +1, Solar -6 -> +1, Bounce -17 -> -9; the opponent-charger labs' attack turns went +1 / 0 (Solar 0), 13/16 -1 .. -3. Aud261 pin: Razor Wind player `[-64, 4]` -> `[-64, -1]` (opponent `63, -1`).

**Residuals.** Bounce's foe action between the turns is still -9; its faint SE 16 is +77 (a different cause, out of scope); Sky 13/16 -3; Skull Bash has no lab; the Sky player lab shows extra engine SEs after the ROM window ends (a probe-window artifact).

**T2** (`rescoreAll.sh` over `.integration/evidence/t2n` into `.integration/evidence/chg3/t2-after`, `soundScoreboard.py`; base = chg2 after): **ON TOTAL exact 2,715 -> 2,727, offset 3,162 -> 3,150, mass 19,196 -> 19,125 (-71), missing 0 / extra 0**; OFF unchanged (671 exact, mass 2,547, 0 / 0).

**Census 0..199** (`lsd194Census.sh`, `LSD194_SHARDS="0 1"`, JOBS 2, SPLIT 2, `26dbd479f` vs `ada6a6cba`): `rst197CensusDelta.py --digest` eventsDigest + error identical 200 / 200 on ON (40 battles changed command timing, 0 type-sequence changes) and 200 / 200 on OFF (0 changed). No gameplay / RNG change.

**Tests.** `aud261MoveAnimSounds` (44) + `aud242oMoveAnimSounds` (4) green; the 281 files of `tests/chg*`, `tests/aud2*`, `tests/randomRoundSoak*` and every `tests/` file importing `battleResolutionPresentation` green except the two known-red `tests/animation/liveAnchorMoveAdapters.test.ts` cases (not from this change); `npm run typecheck` exit 0; `npm run test:gate` 360 files / 2,835 tests green; `npm run build` exit 0. `tests/chg161ChargeTurnPrint.test.ts` keeps its `[0, 4, 0]` pins. The one re-pin is Razor Wind's player unleash 4 -> -1 (toward the ROM). New lab `tools/battle-lab/chg3-solarbeam-tackle-player-on.json` (Solar Beam player vs a Tackle foe; ROM foe print row 258 vs the engine's 259 after the fix, 252 before).

## hie5: held-item effect after a print-ended script, restore-HP body tails (t2k2 items 1 and 2)

**Item 1 premise corrected.** The hie3 held-item SE clock (SE 152 at script frames 8 / 40 / 72, 228 at 104, 102 at 176) is exact: hie1-leftovers-on -1, hie1-sitrus-on / hie2-sitrus-opp-on 0, Double-Edge lab -1. t2k2's "SE age 23 vs 8" is the command's *start*: after a print-ended status script the engine started the held-item command 5-6 rows after the ROM. ROM: item SE = print end + T + 19 (T = script rows between the print's `waitmessage` and `MoveEnd`: Yawn 1, Curse 1, StatUpPrintString 1, DoRecoil 3); engine: print end + 25. New labs (`tools/integration/hie5MakeLabs.py`, foe Rattata + Leftovers vs Seismic Toss, trace A,18,A,1500): `hie5-{yawn,curse,detect,doubleedge,bubblebeam,swordsdance}-foe-on` (Detect has no heal; Bubble Beam diverges from the ROM by RNG, unused).

**Rule** (`heldItemEffectAfterPrintLead`, Scene ON only; the shared `heldItemEffectExecutionsAndLead` that Scene OFF reads is untouched): a restart held-item event whose previous non-MoveEnd event is a print followed by `waitmessage` gets lead 9 + T (T from the kernel's instruction executions: MoveEnd - print - waitmessage frames - 2) instead of 15. Not per item.

| Lab (foe Leftovers) | held-item SE ENG-ROM before -> after |
|---|---|
| hie5-yawn-foe-on | +5 / +6 -> 0 |
| hie5-curse-foe-on | +6 -> +1 |
| hie5-swordsdance-foe-on | +5 -> 0 |
| hie5-doubleedge-foe-on (recoil, T = 3) | -1 -> -4 (mass 5 -> 20; the engine's recoil message ends ~3 rows early upstream, so the ROM-correct lead exposes it) |
| hie1-leftovers-on, hie1-shellbell-on | -1 unchanged (mass 5) |
| hie1-sitrus-on, hie2-sitrus-opp-on | 0 unchanged |
| hie1-cheri-on (cure berry, status command) | -2 unchanged |

Not fixed (reported): the held-item command after a status animation (+4 / +6), after a hit animation (mixed -9 .. +4), and after the faint send-in (cry / sprite-visibility, +21, three groups: faint chain, out of scope).

**Item 2.** The Recover lab (aud242k-recover-player-on) shows the engine's body fine at its start (+2) but the `hp` command 23 rows before the ROM's `healthbarupdate` (EffectRestoreHp+0x16): the ROM's animation script stays active 186 rows from the +0xa exec, the engine's body ends on its last visible row (169). The sub-swap pins (`substituteSwapAttdollCells`) prove the 169-row body is ROM-right, so the durations stay and `HIE5_RESTORE_HP_BODY_TAIL_ROWS` (`battleResolutionPresentationRender.ts`) holds the last row: Recover 25, Soft-Boiled 10, Milk Drink 27, Moonlight 8. Labs, later SEs ENG-ROM before -> after: aud242k-recover-player-on -23 -> +2 (mass 100 -> 16), aud242r-softboiled-player-on -5 -> +5 (35 -> 35, the SE step now uniform), aud242r-moonlight-player-on -4 -> +4 (24 -> 24, uniform), aud261-milkdrink-player-on / -opponent-on -25 -> +2 (110 -> 18). Remaining uniform +2 / +5 / +4 / +2 is the front of the body (command start after the message), not touched. Morning Sun / Synthesis / Slack Off have no body duration case (no live body), so no tail; the Synthesis lab misses the ROM's SE 139 (unrelated).

**T2** (`RESCORE_SCENES=on|off tools/audio/rescoreAll.sh OUT .integration/evidence/t2n`, `soundScoreboard.py`; `.integration/evidence/hie5/t2-{base,after,after2}`; 0 missing / 0 extra everywhere; base = c440fdf4b, after = item 1, after2 = items 1 + 2): Scene ON TOTAL exact / mass 2,731 / 19,949 -> 2,801 / 19,628 (item 1) -> 2,811 / 19,358 (items 1 + 2); move-animation SE 15,401 -> 14,781, stat-change 377 -> 381, cry 953 -> 958, battle-controller 3,166 -> 3,186 (the held-item and recover rows moved other families' attributed windows by a few frames). Scene OFF 700 exact / 2,640 mass unchanged. The 1,713 mass t2k2 booked for item 2 did not reproduce on the labs beyond the 270 above (its rows are mostly the +2 / +5 front and per-seed print-chain offsets).

**Census** (`lsd194Census.sh`, seeds 0..199 both scenes, `LSD194_SHARDS="0 1"`, JOBS 2, SPLIT 2, c440fdf4b vs HEAD; `.integration/evidence/hie5/census`): `rst197CensusDelta.py --digest` eventsDigest + error identical 200 / 200 on ON and OFF (no gameplay / RNG change); ON 129 battles identical / 71 changed commands (timing only, type-sequence changes 0), OFF 200 / 0 byte-identical. `soundCensusDelta.py --t1`: ON exact 54,127 both arms, missing 0 / extra 0; OFF extra 35 (Substitute 33, Transform 2) identical in both arms.

**Tests.** typecheck, `test:gate` (360 files), every `tests/` importer of `battleResolutionPresentation` / `liveMoveAnimation`, aud2* / hie* / lse* / animation live* / randomRoundSoak*, `npm run build` green. No pin moved for item 1. Item 2 moved only the `iu120Rows.ts` mirror of `LIVE_MOVE_LEADLESS_TAIL_ROWS` (the held-row ages of the Milk Drink / Moonlight ordinary-route pins, ROM: the 25 / 10 / 27 / 8 rows above); no trajectory pin was re-pinned.

## eqk1: Earthquake hit-all tail, forced Struggle, s1914 Drill Peck window (2026-11-21)

Main/ts lane, Battle Scene OFF oracle; presentation timing only, no gameplay / RNG change. Labs: `tools/integration/eqk1Labs.py` writes `tools/battle-lab/eqk1-*.json` (Earthquake / Magnitude / Explosion / Selfdestruct x player / foe = 8, plus `eqk1-struggle`, `eqk1-eq-imm`, `eqk1-tackle-imm`); `tools/integration/labCompare.sh --scene both`. Evidence `.integration/evidence/eqk1/` (git-ignored).

### Causes landed (all `battleResolutionPresentation.ts`)

1. **Hit-all tail (item 1).** The next mover's action transition returned null for the hit-all loop's `printstring STRINGID_EMPTYSTRING3` box (`BattleScript_DoHitAllWithUndergroundBonus`), so the next used-move box / SE started 8 frames early in both scenes. The box now anchors the transition at the loop's last execution (e1): `P = e1 - E - 1 + 6 + u - presented` with `E = e1`, i.e. `P = 5 + u` (ROM eq-p / eq-imm: next mover 8 rows after the box; 9 after a no-effect hit). Earthquake player: ON 56 -> 0, OFF 16 -> 0.
2. **No-effect damaging move, Scene ON (item 3 cause).** `Cmd_attackanimation`'s `MOVE_RESULT_NO_EFFECT` branch pushes `BattleScript_Pausex20` in both scenes. Scene OFF already presents it (`SCENE_OFF_ATTACK_PAUSE`); Scene ON emits no kernel event, so its ~53 rows were missing before "It doesn't affect". `sourcePauseUsedMoveHoldFrames` now holds the used-move box through them when a `RESULTMESSAGE` `STRINGID_ITDOESNTAFFECT` follows an `attackanimation` (ROM: eq-imm ON first message hold 55). eq-imm ON 570 -> 20, tackle-imm ON 63 -> 14.
3. **Magnitude, Scene OFF.** Magnitude's `pause B_WAIT_TIME_SHORT; printstring MAGNITUDESTRENGTH; waitmessage B_WAIT_TIME_LONG` rows (used print -> print + 64) are presented by the message commands but were counted again in the `SCENE_OFF_ATTACK_PAUSE` move command (first SE +100). They are now subtracted (move min 147 -> 47, first SE exact). mag-p OFF 292 -> 8, mag-f 200 -> 8.

### Lab compare, before -> after (exact / offset / missing / extra, mass)

| lab | scene | before | after |
|---|---|---|---|
| eqk1-eq-p | ON | 2 / 7 / 0 / 0, 56 | 9 / 0 / 0 / 0, **0** |
| eqk1-eq-p | OFF | 1 / 2 / 0 / 0, 16 | 3 / 0 / 0 / 0, **0** |
| eqk1-eq-f | ON | 2 / 5 / 0 / 0, 55 | 2 / 5 / 0 / 0, 15 |
| eqk1-eq-f | OFF | 1 / 1 / 0 / 0, 11 | 1 / 1 / 0 / 0, 3 |
| eqk1-eq-imm | ON | 0 / 10 / 0 / 0, 570 | 0 / 10 / 0 / 0, 20 |
| eqk1-eq-imm | OFF | 0 / 1 / 0 / 0, 2 | 0 / 1 / 0 / 0, 2 |
| eqk1-tackle-imm | ON | 0 / 1 / 1 / 0, 63 | 0 / 1 / 1 / 0, 14 |
| eqk1-tackle-imm | OFF | 1 / 0 / 0 / 0, 0 | 1 / 0 / 0 / 0, 0 |
| eqk1-mag-p | OFF | 0 / 3 / 0 / 0, 292 | 1 / 2 / 0 / 0, 8 |
| eqk1-mag-f | OFF | 0 / 2 / 0 / 0, 200 | 1 / 1 / 0 / 0, 8 |
| eqk1-mag-p | ON | 0 / 18 / 0 / 0, 53 | 0 / 18 / 0 / 0, **81** (regression, below) |
| eqk1-mag-f | ON | 0 / 16 / 0 / 0, 49 | 0 / 16 / 0 / 0, **89** (regression, below) |
| eqk1-expl-p / -f, eqk1-sd-p / -f | both | unchanged (ON 76-84, OFF 8-10) | unchanged |
| eqk1-struggle | OFF / ON | 0 / 1 / 0 / 0, 1 / 0 / 11 / 3 / 0, 466 | unchanged |

### Item 2: Struggle (276 ON / 305 OFF)

A forced player Struggle (`eqk1-struggle`, after `BattleScript_NoMovesLeft`) is within +-1 of the ROM in both scenes (OFF +1; ON body -1 / hit +1): there is no Struggle-specific command that differs. EFFECT_RECOIL goes through `BattleScript_EffectHit`, the same rows as a plain hit plus the recoil `hp` command already pinned by hcr3. The T2 s7295 OFF decision 8 window is a Struggle that follows the player's no-effect Earthquake: its -3 is the hit-all / no-effect transition fixed above, not Struggle. A forced **foe** Struggle lab could not be built (the foe never reached Struggle in the ROM window: the player's `NoMovesLeft` ran first); the foe shares the player's commands, so no separate error is expected. The ON `eqk1-struggle` missing 3 / mass 466 is the Splash body SE (167) the engine does not present on the player's turn 1 (a Splash gap, not Struggle).

### Item 3: Drill Peck s1914 single window (660 ON, -66 x 9)

Cause (hcr3mProbe.py + hcr3mCmp.py, seg 21): the player's Earthquake hits a Flying foe ("It doesn't affect ..."), then the foe uses Drill Peck. In Scene ON the NO_EFFECT `Pausex20` rows were unpresented before "It doesn't affect", and the hit-all transition (item 1) was also missing, which made the whole Drill Peck body ~66 early (9 SE rows). General rule (2 above), landed. eq-imm ON Drill Peck body -57 -> -2.

### T2 rescore (25 ON + 24 OFF seeds, drv1 cadence; base `fad9fdfc6`)

| scene | mass before -> after | exact before -> after | missing / extra |
|---|---|---|---|
| ON | 19,862 -> 17,764 (-10.6 %) | 2,737 -> 2,780 | 0 / 0 |
| OFF | 2,640 -> 2,483 (-5.9 %) | 700 -> 707 | 0 / 0 |

(The Magnitude change moved neither scene: no T2 seed plays Magnitude.)

### Census and tests

- census (200 battles, both scenes, base `fad9fdfc6`): eventsDigest + error identical 200 / 200; T1 missing 0 / extra 0 (ON exact 54,127 / known-offset 35; OFF extra 35 / unclassified 13, as the base). 38 type-sequence changes per scene are the new presented commands; command stream changed on 32 ON battles, 0 OFF battles in the fold before the Magnitude commit, OFF digest / T1 re-run at the final HEAD identical.
- tests: `npm run typecheck` 0; `npm run test:gate` 360 files / 2,835 tests; importers + aud2* + fsc* + animation/live* + randomRoundSoak* + `tests/eqk1HitAllTail.test.ts` 307 files / 3,058 tests; `npm run build` green. New `tests/eqk1HitAllTail.test.ts` pins eq-p next mover 8 rows after the box (both scenes), eq-imm ON hold 55 / next mover 9, Magnitude OFF move min 47. No re-pins; no pins left red. The full `npm test` is the supervisor's.

### Residuals (not landed)

- **Magnitude Scene ON (regression, named).** The hit-all transition is now ROM-correct, but Magnitude's own ON move body is 12 frames too long between the last body SE (-3) and the hit SE (+9; mv222 body tail), which the old 8-row-short transition was hiding: next mover -2 -> +6 (mag-p), mass 53 -> 81 / 49 -> 89. Fix belongs in the mv222 body-length model, not in the transition; not part of eqk1's scope. Net ON mass over all labs and T2 is still down.
- eq-f (foe Earthquake): ON 15 / OFF 3, the hp-drain phase and the lab's damage roll.
- Explosion / Selfdestruct (they use `BattleScript_ExplosionLoop`, no EMPTYSTRING3 box): pre-hit +5 OFF / +7 ON body, faint-chain offsets, unchanged.
- Splash body SE (167) missing in ON on the player's turn 1 (eqk1-struggle ON missing 3); Tackle body SE 139 missing in ON (tackle-imm missing 1). (cln13, supervisor note: not a lab artifact and not a production gap: Tackle 33 / Pound 1 / Scratch 10 / Splash 150 have no live body adapter, `liveMoveAnimationDurationCaseMissing`, so no body SE; their sets sit below the Level-50 Factory ranges (rentals start at FRONTIER_MON_GRIMER, battle_factory.c), so only hand-built labs reach them. Use Factory moves in labs.)
- Foe forced-Struggle lab not buildable (see item 2).

## itm1: the held-item animation after a faint waits for SE_FAINT (hcr3 "item chain", #219 named residual)

**ROM rule (not hie5's T).** `OpponentHandleBattleAnimation` / `PlayerHandleBattleAnimation` hold a general animation while `IsBattleSEPlaying` (battle_controller_opponent.c:1992; the controller's soundTimer force-stops a still-playing SE after 30 polls). After a faint, `playanimation HELD_ITEM_EFFECT` therefore starts no earlier than SE_FAINT + 53 rows, and the first item SE (152) is the animation start + 8. aud252 ROM rows: SE16 -> SE152 is **61 in both seeds** (1914: select +34, 2230: select +40), so the 19 vs 13 rows after the select SE is `max(select + 19, SE16 + 61)` with a different A-press time per seed, not a script / T difference: the PC rows are identical in both seeds (select + 8 = `BattleScript_ItemHealHP_Ret+0x7`), `gAnimScriptActive` rises +11 (1914) / +5 (2230) after that exec and the animation lasts 211 rows in both. The same fit holds on 5 other T2 faint -> select -> 152 chains.

**Engine.** `src/engine/heldItemFaintSeGate.ts` (`applyHeldItemFaintSeGate`, called where the faint's button message is dismissed, both A-press sites of `factoryRoundBattleOrchestrator.ts`): when only `status` / `sprite-visibility` commands lie between the faint's message and a Scene ON held-item animation, the animation command's `minimumFrames` gets `clamp(51 - age - lead, 0, 29)` extra rows (age = rows since SE_FAINT, `faintSeOffsetRows` in `battleHitSounds.ts`; 51 = 53 less the engine's 2-row convention, calibrated on both seeds). The gate is dynamic (it depends on the press time), and a rebuilt plan breaks the identity guards of the next-command handoff / retained resolution (a first version that replaced the segments changed 29 / 200 ON battles), so the held-item command's `timing` is planned unfrozen (`battleResolutionPresentation.ts`) and written in place with `baseMinimumFrames` kept beside it (idempotent, a pure function of the dismissal row).

**aud252 (pins in `tests/aud252LossBallOpen.test.ts`).** 1914 `[-2,0,-8x6]` -> `[-2,0,-2x6]` (the -2 is the faint's own, the item chain is now relative to it exact); 2230 `[0,-4,-6x5,-7]` -> `[0,-4,0x5,-1]`.

**T2 (`.integration/evidence/itm1/t2-{base,after}`, ROM-driven rescore of `t2n`).** ON TOTAL mass 15,676 -> **15,600**, exact 2,918 -> **2,923**, 0 missing / 0 extra; OFF unchanged (mass 2,186, exact 721). **Census 0..199** (`lsd194Census.sh`, `LSD194_SHARDS="0 1"`, JOBS 2, SPLIT 2, `8fef84655` vs `05f0557f8`): `rst197CensusDelta.py --digest` eventsDigest + error identical 200 / 200 in ON (200 battles / 0 changed commands) and OFF (byte-identical shards 2 / 2); `soundCensusDelta.py` ON: 29 / 200 seeds move frames only (same sequence), `--t1` exact 54,127 on both arms. No gameplay / RNG change.

**Residual.** The faint SE itself is -2 on 1914 (unchanged); the item chain's last row (SE_BALL_OPEN, loss path) is -1 on 2230. Trees deleted.

## mxp1: Magnitude Scene ON body, Explosion / Self-Destruct sounds

**Magnitude (222), Scene ON.** The live window was the power-70 constant (174); the ROM's `gAnimScriptActive` is `118 + 8 * floor(power / 10)` rows (142 at power 30, 158 at 50, 174 at 70, 190 at 90, 206 at 110, 238 at 150: the HorizontalShake's decay). The window is now `magnitudeFirstInactiveAge(power) + 1` (`src/animation/magnitude.ts`, `liveMoveAnimation.ts`); the body joins the shape-A class (`LSE4_SHAPE_A_MOVE_IDS`) with a 10-row lead presented after the `STRINGID_MAGNITUDESTRENGTH` print's `waitmessage` (the kernel counter includes the 64-row hold: lead = A - (print + 1 + 64)). The first SE is on the ROM frame (`aud262` first-SE offset 3 -> 0).

**Explosion (153) / Self-Destruct (120).** Differing commands (ROM `eqk1-{expl,sd}-{p,f}`, both scenes): ON the body SE clock carried the generic 7-row controller lag although the window already starts on the ROM's `gAnimScriptActive` rise (A + 4 = the frame-3 op); the hit command (A end + 10 = `hitanimation` exec) was on the ROM row for Self-Destruct but its SE (`effectivenesssound`, the row before) was scheduled +6 / +7 after it; the faint SE kept the 7-row lag; Explosion's window was 212 (older accepted 76..287) against A 216 - 3 = 213 and it had no 9-row hit tail (hit command 10 rows early). OFF the body was `1 + (hit - used) + 32` = 48 rows but the user's `hp` command already presents `tryexplosion; setatkhptozero; waitstate` (ROM attackanimation 58 -> hitanimation exec 101 = 43). Rules: `NO_SOUND_LAG_MOVE_IDS` {120, 153} (moveAnimSounds), the hit SE scheduled from the body command at its duration (battleHitSounds `EXPLOSION_FAMILY_MOVE_IDS`), no lag on the faint SE and +2 rows for the user's own faint (the second `tryfaintmon`), window 213 + `LIVE_MOVE_LEADLESS_TAIL_ROWS` [153, 9], OFF body `hit - attackanimation + 1`.

**Labs** (`labCompare.sh --scene both`, `.integration/evidence/mxp1/{x1,final}`):

| lab | before | after |
|---|---|---|
| eqk1-mag-p.on | exact 0 / offset 18, mass 81 | exact 10 / offset 8, mass 284 (power-roll mismatch below) |
| eqk1-mag-f.on | exact 0 / offset 16, mass 89 | exact 10 / offset 6, mass 136 (same) |
| eqk1-mag-p.off / -f.off | mass 8 / 8 | mass 8 / 8 (damage difference, not presentation) |
| mxp1-mag-p5.on / .off (new, power 30) | - | exact 18 / 0, mass 0 / exact 3 / 0, mass 0 |
| mxp1-mag-p9.on / .off (new, power 70) | - | exact 18 / 0, mass 0 / exact 3 / 0, mass 0 |
| eqk1-expl-p.on / .off | exact 0 / offset 12, mass 78 / offset 2, mass 8 | exact 12, mass 0 / exact 1 offset 1, mass 2 |
| eqk1-expl-f.on / .off | exact 0 / offset 12, mass 76 / offset 2, mass 10 | exact 12, mass 0 / exact 2, mass 0 |
| eqk1-sd-p.on / .off | exact 0 / offset 12, mass 82 / offset 2, mass 8 | exact 12, mass 0 / exact 1 offset 1, mass 2 |
| eqk1-sd-f.on / .off | exact 0 / offset 12, mass 84 / offset 2, mass 10 | exact 12, mass 0 / exact 2, mass 0 |

SUMMARY lines (after): `eqk1-expl-p.on: exact 12 / offset 0 / missing 0 / extra 0, mass 0`, `eqk1-expl-f.on: ... mass 0`, `eqk1-sd-p.on: ... mass 0`, `eqk1-sd-f.on: ... mass 0`, `eqk1-expl-p.off: exact 1 / offset 1 / missing 0 / extra 0, mass 2`, `eqk1-sd-p.off: ... mass 2`, `mxp1-mag-p5.on / p9.on: exact 18 / offset 0 / missing 0 / extra 0, mass 0`.

**Residuals.** (1) The eqk1-mag-p/f labs stay inexact: ROM and engine roll different Magnitude powers in those labs (ROM 50, the engine's lab RNG 90 / 70), so the engine's window is the power-90 / 70 one: hit offsets +32 / +16 = the window difference. The mxp1 labs pick seeds (5, 9) where both agree and are exact. No seed in 2..25 matched the foe lab's ROM roll. (2) The OFF user faint SE after Explosion / Self-Destruct (player attacker) is 2 rows early (ROM 328 / 327): the +2 for the second `tryfaintmon` is applied in Scene ON only (the OFF move-animation command carries no move id there).

**T2** (`RESCORE_SCENES=on|off tools/audio/rescoreAll.sh OUT .integration/evidence/t2n`, `soundScoreboard.py`; `.integration/evidence/mxp1/t2-{base,after}`; base = `src/` of 54ee65135 swapped in): Scene ON 25 seeds TOTAL exact 2,918 / offset 2,959 / mass 15,676, Scene OFF 24 seeds exact 721 / offset 412 / mass 2,186, identical base and after (no t2n seed uses Magnitude, Explosion or Self-Destruct), 0 missing / 0 extra on both.

**Census** (`lsd194Census.sh`, seeds 0..199, `LSD194_SHARDS="0 1"`, JOBS 2, SPLIT 2, 54ee65135 vs 886009d75; `.integration/evidence/mxp1/census`): `rst197CensusDelta.py --digest` eventsDigest + error identical 200 / 200 on ON (9 battles changed command timing, 0 type-sequence changes; Explosion hit command 32 -> 32 rows, hp 16 -> 18 rows) and 200 / 200 on OFF (8 battles; Explosion body 48 -> 43). T1 (`soundCensusDelta.py --t1`, ON): missing 0 / extra 0 on both arms; exact 54,127 -> 54,037: the 90 Explosion body SEs (9 battles x 10) moved to known-offset (Explosion +1 x 81, -79 x 9) because T1 reads the same table through the old 7-row clock (self-consistency, not ROM parity; the labs above are the ROM parity).

**Re-pins toward the ROM** (ROM frame per pin): `aud262MoveAnimSounds` Magnitude first-SE offset 3 -> 0 (ROM 179 / 183); `livePrep10MoveAdapters` Magnitude windows 174 / 206 -> 175 / 207 (ROM A + 1, lab p9 A 174) and route body 177 -> 191; `livePrep2MoveAdapters` Explosion duration 212 -> 213 (ROM A 61..276 = 216, expl-p.on); `tests/helpers/iu120Rows.ts` Explosion tail [153, 9] (ROM `hitanimation` exec 287 = A end 277 + 10); `mem2InstantHpDrop` Scene OFF Explosion / Self-Destruct hp + body 54 -> 49 (ROM attackanimation 58 -> hitanimation exec 101); `apx215SubstituteDollApproximate` Explosion doll rows 219 -> 229 (window 213 + tail 9), non-static ratio 0.9 -> 0.89 (the tail holds the last picture: 206 / 229). New `tests/mxp1MagnitudeWindow.test.ts` pins the Magnitude body length. No pin was left red.

## t2k3 (2026-11-22): the remaining S11 sound-timing mass re-ranked on the frozen tree 30cd3dfac (measurement only; no `src/` / `tests/` change)

**Method** as t2k2 (drv1 `--romdrive` rescore of all 25 ON + 24 OFF t2n seeds with `aud249Rescore.sh`, then `soundScoreboard.py OUT --per-seed --out OUT/score.json`; rows attributed with `t2Attribute.py`'s alignment + ROM `gCurrentMove`; OFF rows carry the engine command from a second `--cmdtrace=1` replay; windows own the rows from one nonzero offset step to the next). Evidence (git-ignored, main tree): `.integration/evidence/t2k3/` (`t2/` rescored set + `score.json`, `c-off/` cmdtrace replays, `attr-{on,off}.json`, `agg.txt`, `shape2.txt`, `step.txt`, `gain.txt`, `own.py` = the ownership table below, `p/{on,off}/` ROM probes + `*.cmp.txt`).

### 1. Rescore (missing / extra 0 / 0 in both scenes; the Mac merge introduced none)

| family (mass / exact) | OFF t2k | OFF t2k2 | OFF now | ON t2k | ON t2k2 | ON now |
| --- | --- | --- | --- | --- | --- | --- |
| move-animation SE | 0 / 0 | 0 / 0 | 0 / 0 | 19,810 / 2,005 | 15,401 / 2,247 | 11,187 / 2,427 |
| stat-change SE | 403 / 2 | 206 / 68 | 177 / 69 | 410 / 27 | 377 / 31 | 339 / 32 |
| cry | 517 / 97 | 455 / 107 | 340 / 112 | 1,227 / 31 | 953 / 69 | 718 / 75 |
| battle-controller SE | 2,225 / 500 | 1,960 / 524 | 1,504 / 543 | 4,231 / 301 | 3,166 / 382 | 2,139 / 399 |
| bgm | 19 / 1 | 19 / 1 | 19 / 1 | 69 / 2 | 52 / 2 | 52 / 2 |
| TOTAL | 3,164 / 600 | 2,640 / 700 | **2,040 / 725** | 25,747 / 2,366 | 19,949 / 2,731 | **14,435 / 2,935** |

ON -5,514 mass vs t2k2 (-27.6%), +204 exact; OFF -600 (-22.7%), +25 exact. Against the run start: ON -11,312 (-43.9%), OFF -1,124 (-35.5%).

### 2. Attribution (row mass; classes sum to TOTAL: ON 14,435, OFF 2,040)

| class | ON rows / mass / exact | OFF rows / mass / exact |
| --- | --- | --- |
| body (move running at the row), incl. B4 | 3,899 / 7,202 / 2,289 | n/a |
| of which B4 bodies (reported separately) | 108 / 274 / 7 (Confuse Ray 98, Stun Spore 56, Curse 41, Thunder Wave 40, Brick Break 22, Sleep Powder 14 by row mass) | n/a |
| gen (gCurrentMove 0: status / general / held-item animations) | 912 / 3,985 / 138 | n/a |
| controller hit SE 12 / 13 / 14 | 475 / 1,108 / 295 | 548 / 934 / 384 |
| controller faint / send-in 15 / 16 / 114 | 283 / 1,031 / 104 | 284 / 570 / 159 |
| cry | 202 / 718 / 75 | 192 / 340 / 112 |
| stat | 101 / 339 / 32 | 105 / 177 / 69 |
| bgm | 5 / 52 / 2 | 4 / 19 / 1 |

**Shape** (window = seed x segment x cause; mass, windows). ON: body const 4,440 (311) / varies 1,354 (53) / one-off >= 20 1,137 (11); B4 const 237; gen const 3,502 (340) / one-off 387 (11) / varies 96; ctl-hit const 519 / varies 259 / one-off 330; ctl-chain const 666 / one-off 365; cry varies 348 / const 257 / one-off 113; stat const 279 / one-off 44. OFF: ctl-hit const 733 / one-off 169 / varies 32; ctl-chain const 570; cry const 340; stat const 155 / one-off 22. Constant offsets still dominate; the gen class (3,985) is the largest non-body bucket and its windows change sign (+21 .. -23) between contexts, so it is a per-context lead, not one constant.

**Top causes ON (row mass):** gen:152 969 + gen:228 / 102 323 each (held-item group 1,615), gen:142 800, cry 718, controller SE 13 @? 680, Dig 589, gen:148 540, Rock Slide 514, Ice Beam 492, Psychic 379, Rest 259, Struggle 230, Double-Edge 226, Supersonic 216, Solar Beam 215, Safeguard 214. **OFF:** SE 13 @hit-animation 492 (95 rows, median -4, 7 exact), faint SE 16 / cry@faint 140 + 140, SE 13 @move-animation 135, stat 239 132, ball-open 15 @switch-in 114 / @switch-out 104 / @sprite-visibility 77, SE 114 @party-summary 93, SE 12 / 14 @message 63 + 63 (two one-offs). **Closed since t2k2 (no longer in the lists):** Metal Claw, Aerial Ace (71 left), Earthquake hit-all, Drill Peck s1914 (-66), Magnitude, Explosion; Recover / Soft-Boiled tails moved to +-13 first-row windows (item 4).

**A-press cadence cliff.** Windows whose first step is +13 .. +18 (one A-cadence step of the ROM driver): ON 11 windows / 39 rows / 478 mass in 8 seeds; OFF 10 windows / 16 rows / 252 mass in 9 seeds. They overlap items 1, 2 and the OFF stat / bgm lines; s2 OFF decision 6 (below) shows the mechanism.

### 3. Ranked top 8 (rows owned disjointly by window; items + lines + remainder = TOTAL)

Breadth: the census (`rank1mCensus.ts`) was not re-run (kept light for the wind-down gates); command counts per 1,000 battles are t2k's: faint 4,332, hit-animation 18,646, general-animation 7,506 (864 battles), Dig 596 (120 battles).

| rank | item | scenes | T2 mass now (ON / OFF) | direction | cost / risk | lands in | first ROM window (seed, decision, ROM frame) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Faint / send-in chain: SE 114 (party-summary) 414 / 211, ball-open SE 15 519 / 364 (switch-in 110, switch-out 100, sprite-visibility 154), cry 597 / 0 (cry@faint) , faint SE 16 + cry 0 / 128, misc 0 / 18 | ON + OFF | 1,530 / 721 (2,251; 22-23 seeds, ~150 windows) | engine rows early / late by the A-press slip (+13 .. +17 cliff) and +-1..9 elsewhere; first-row steps are +17 / +15 (OFF party-summary x5) and -7 (OFF ball-open @sprite-visibility x5) | high: mixed cause; but the cliff term is one mechanism (fch1 term 2, fsc2m) | `src/engine/battleResolutionPresentation.ts`: the faint `message` command's ready frame (engine min 24 vs ROM A accepted 21 after the print start) and the harness A-press deferral | OFF s2 decision 6 (ROM 3933 / 4088 / 4104; mapped below), ON s310 decision 22 (seg45, rf 22842, +14), s4235 decision 9 (seg19, rf 6066, +13) |
| 2 | Hit SE 12 / 13 / 14 lead (OFF: 13 @hit-animation 701 over 92 windows / 15 seeds, median -4, net step -302; @move-animation 236, @message 174 = two +63 one-offs) | ON + OFF | 1,075 / 1,111 (2,186) | engine hit SE early by 3 .. 14 after a used-print that is shorter than the ROM's (OFF) | medium: per-cause (recoil / Struggle chain -14, confusion self-hit -7, ordinary -3 / -4) | `battleResolutionPresentation.ts` the bodyless OFF used-print `move-animation` -> `hit-animation` interval (and `battleHitSounds.ts` for ON) | OFF s2230 decision 21 (seg43, ROM 12945, -14 x2), s6568 decisions 99 / 101 / 102 (rf 52126 / 53422 / 53900, -14 / -14 / -10 x2), ON s5063 decision 52 (rf 43275, -33 / -43 after Psychic) |
| 3 | Held-item group gen:152 / 228 / 102 (Leftovers / berry): +21 after the send-in chain (3 windows, 300 mass), the rest signed scatter (-23 .. -7) after hits | ON | 1,510 / 0 (360 rows, 11 seeds, 72 windows) | the first SE of the chain after a send-in is 15 frames late (age 23 vs ROM 8) | low-medium for the +21 term (same constants t2k2 named; not landed: hie5 / itm1 did other held-item terms); the scatter is inherited | `src/engine/moveAnimSounds.ts` `emitGeneralAnimSounds` HELD_ITEM_EFFECT first-SE age, only in the post-faint context (end-turn Leftovers windows are already negative) | ON s2230 decision 6 (seg13, rf 8403, +21 x3), decision 8 (seg17, rf 9987); s5063 decision 45 (seg91, rf 37924, +18) |
| 4 | gen:180 first row + the gen:142 / 202 chain it owns (restore-HP style animations) | ON | 980 / 0 (180 rows, 4 seeds, 18 windows; 10 exact) | first-row lead of mixed sign (+13 s6912 x2, -12 s310, -7 / -6 s648, +7 s310 x3) | medium: sign changes with context; probe the press phase before any table | `moveAnimSounds.ts` general-animation start + `battleResolutionPresentationRender.ts` restore-HP body tail (hie5's `HIE5_RESTORE_HP_BODY_TAIL_ROWS`) | ON s6912 decision 2 (seg5, rf 1844, +13 x10), s310 decision 16 (seg33, rf 17429, -12 x10) |
| 5 | Dig (charge turn / attack tails) | ON | 615 / 0 (65 rows, 3 seeds, 13 windows, 0 exact) | -19 / -17 / -12 on the tails, +18 first row (s6) | medium: two terms; chg2 / bdt1 left it | `battleResolutionPresentationRender.ts` DIG lead / tail rows | ON s8108 decision 19 (seg39, rf 17762, -19 x5), s6 decision 2 (seg5, rf 2180, +18) |
| 6 | gen:148 poison / status tick, first row | ON | 534 / 0 (114 rows, 3 seeds, 19 windows) | start lead of both signs (-12 .. +6), constant per window | medium: gsp3 closed the hold, not the lead | `moveAnimSounds.ts` `emitGeneralAnimSounds` status-tick arm | ON s499 decision 3 (seg7, rf 3856, -12 x6), s165 decision 22 (seg45, rf 15457, -9) |
| 7 | Ice Beam first-mover windows | ON | 517 / 0 (51 rows, 4 seeds, 7 windows) | -21 / -13 / -6 on the first window of a body (11 rows each) | medium: single-body lead | `battleResolutionPresentationRender.ts` Ice Beam body lead | ON s2230 decision 20 (seg41, rf 18099, -21 x11), s830 decision 1 (seg3, rf 685, -13 x11) |
| 8 | Rock Slide body | ON | 514 / 0 (122 rows, 6 seeds, 8 windows) | -13 / -10 / -9 and +5 over 20-row windows | medium: both signs | `battleResolutionPresentationRender.ts` Rock Slide body | ON s8612 decision 8 (seg17, rf 8016, -13 / -9 x20), s165 decision 18 (seg37, rf 12049, +5 x20) |
| | **Items 1-8** | | **7,275 / 1,832** | | | | |
| 9 | Supersonic / Safeguard (one window s5569 seg25 -34 x12 + -2) | ON | 454 / 0 | | | | s5569 decision 12 (rf 6516 / 6588) |
| 10 | Psychic (s97 +24 / +25 x8; s5063 -43 x3) | ON | 296 / 0 | | | | s97 decision 11 (rf 11037) |
| 11 | B4 bodies (reported separately) | ON | 274 / 0 | | | | |
| 12 | Rest 263, gen:242 (s2741 +11 / +8 x10) 260, Solar Beam 253, Confusion s8108 -48 x2 217 | ON | 993 / 0 | | | | s2741 decision 11 (rf 10115); s830 decision 10 (Solar Beam rf 7904) |
| 13 | stat SE 239 / 245 | ON + OFF | 249 / 184 | | | | OFF s4235 decision 2 (rf 1267, +17) |
| 14 | OFF bgm 19, SE 90 5 | OFF | 0 / 24 | | | | |
| R | remainder (about 80 bodies, each < 215, mostly inherited) | ON | 4,894 / 0 | | | | |
| | **TOTAL** | | **14,435 / 2,040** | | | | |

Sum-check: ON 1,530 + 1,075 + 1,510 + 980 + 615 + 534 + 517 + 514 (= 7,275) + 454 + 296 + 274 + 993 + 249 + 4,894 = 14,435; OFF 721 + 1,111 (= 1,832) + 184 + 24 = 2,040. "T2 mass now" is row mass, not saving (the counterfactual gain of one step is 30-60% of it: `gain.txt`; ON posgain total 12,483 over 1,021 steps).

### 4. The top three ROM windows (hcr3mProbe + hcr3mCmp, frames from each side's own commit)

1. **Chain: OFF s2 decision 6 (rf 3933, +17) is the A-press cadence, not the party-summary command.** ROM: the faint print starts at `FaintTarget+0xc` ex1 299, the A press (SE 5) lands at 320 (21 frames), SE 114 at `FaintedMonSendOutNew+0x2` ex2 502, SE 15 at 657. Engine: `status` cmd 0.6 at 299, **`message` cmd 0.7 (min 24)** at 300, SE 5 at 337, `party-summary` cmd 0.13 (lead 19, min 119) at 500, SE 114 at 519, SE 15 at 674. SE 5 -> SE 114 is 182 on both sides and SE 114 -> SE 15 155 on both: the party-summary lead is right. The whole +17 is the faint message becoming ready at 324 (min 24) when the ROM driver pressed A at 320, so the replay slips one cadence step (17 frames). Differing command: the faint-print `message` (ready 3+ frames late), the "fch1 term 2" of the t2k2 item 3, which that item mis-assigned to `opponentPartySummaryDrawTiming` (the lead 25 -> 19 since landed).
2. **Hit SE: OFF s2230 decision 21 (Struggle, then Double-Edge recoil; ROM commit 12819, engine 12729).** ROM Struggle: `HitFromAtkString+0x1` ex1 at 63 -> SE 13 at 126 (63 frames: print, `HitFromCritCalc`, `Pausex20`, +2); engine: **`move-animation` cmd 0.1 (min 42)** at 70 -> `hit-animation` cmd 0.2 with SE 13 at 112 (42): 21 short, started 7 late = -14. Double-Edge: ROM print ex2 303 -> SE 13 373 (70); engine cmd 0.10 317 -> `hit-animation` cmd 0.11 359 (42): 28 short, 14 late = -14. Differing command: the bodyless OFF used-print `move-animation` (flat min 42) before `hit-animation`; the ROM interval is print + 63-70, and the cmd after the recoil `message` (cmd 0.9 -> 0.10: 28 vs ROM MoveEnd 289 -> print 303 = 14) starts 14 late. Only these two windows were opened; the common -3 / -4 OFF steps (68 of 95 rows) are not explained by them.
3. **Held-item: ON s2230 decision 6 (rf 8403).** ROM `ItemHealHP_Ret+0x7` ex2 at 306 -> SE 152 at 314 / 346 / 378, SE 228 at 410, SE 102 at 482. Engine **general-animation cmd 2.4 (HELD_ITEM_EFFECT, min 229)** at 312, SE 152 at 335 / 367 / 399, 228 at 431, 102 at 503: the spacing is identical (32 / 32 / 72); the cmd starts 6 after the ROM exec and the first SE comes 23 after the cmd start instead of 8, so the group is +21. The numbers are those of t2k2 item 1 (ROM 306 / 314, engine 312 / 335): the proposal there is still open. The negative held-item windows (-23 s8108 seg89, -17 s310 seg7 / s1415 seg99, -14 s2230 seg11) follow hits or end-turn rows, so lowering the age globally would push them further negative; land it for the post-send-in context only.

### 5. What not to chase

- The 4,894 remainder (about 80 bodies, each < 215) is inherited drift plus single windows; re-rank after items 1-3.
- Rows 13-14 and the OFF +63 one-offs (s319 decision 16 SE 12, s6568 decision 31 SE 14, both at the `message` command, 126 mass) are small; the +63 pair is worth one probe if a worker has spare time.
- B4 bodies (274) are reported, not proposed.

Not applied: no `src/` or `tests/` change; PROGRESS / ISSUES / ROADMAP untouched; no `.ts` added, so no typecheck / `npm test` / build run (the supervisor's wind-down gates cover the unchanged tree). The step text named both `.integration/evidence/t2k3/` and `t2k/`; t2k3 was used.

## fch2m (2026-11-22): the faint / send-in "cliff" is the census driver's A gate, not an engine command (tools only; `src/` and `tests/` untouched)

Scene OFF (:8014). Evidence (git-ignored, main tree): `.integration/evidence/fch2m/` (`p/` baseline ROM probes + engine `--cmdtrace` for the 5 windows, `pa/` the same engine replays with the new press, `t2-base/` / `t2-acc/` + `score-{base,acc}.txt` = the 49-seed T2 rescore on this tree without / with it, `probe.sh`, `rescoreAll.sh`). New tools: `tools/integration/fch2mWin.py` (one faint window: ROM SE 16 / printer start / state 2 / pulse A / SE 114 next to the engine's `message` command, A and SE 114 in two runs); `soundCensusRomReplay.ts replay --dismiss-accept=1` and `AUD249_DISMISS_ACCEPT=1` for `aud249Rescore.sh` (opt-in; default behaviour unchanged, the baseline rescore reproduces t2k3's ON 14,435 / 2,935 and OFF 2,040 / 725 exactly).

### 1. Result: the differing "command" is the harness press gate

The engine's faint `message` is ready on the same frame as the ROM's in all five windows. t2k3 item 1 / fch1 term 2 read the `message` command's `min=24` as its ready time; that field is not used for a button message (`isBattleResolutionCommandComplete` hands a button message to `isBattleResolutionButtonMessageReady`, `battleResolutionPresentationRender.ts:2018-2023`). What gates it is the typed rows: a `\p`-ended faint box (`promptClear`) **accepts** an A from `phaseElapsed >= typedRows + 1 - GATE_ACCEPT_LEAD_ROWS` (`:2102-2113`, taken in the `presenting` branch at `factoryRoundBattleOrchestrator.ts:3170-3180`; the tick that reads it is message start S + T, T = glyph count = name chars + 12) and only **enters** `awaiting-message-dismiss` at `typedRows + 1` (`:3200-3210`). The census driver presses only in the awaiting phase (`soundCensusRomReplay.ts:442` at HEAD), so its first press is S + T + 3 (decided on the frame before the tick, after the phase flips): a 3-frame dead zone after the engine already accepts. The ROM driver's pulse is a fixed 17-frame cadence, so with probability 3 / 17 the pulse lands in S + T .. S + T + 2, is not taken, and the engine waits the next pulse: +17 (or +15 after the AI-choice extra). That is the whole "ready 1 .. 3 frames late in situ" of fch1 (its shift experiment: 2, 3, 1, 2 = 3 minus the pulse's distance past the accept frame) and why 5 of 32 OFF faints show the cliff (3 / 17 x 32 = 5.6).

### 2. The five windows (frames from each side's own commit; `fch2mWin.py`)

| window | ROM SE 16 -> printer start / T (state 2) / pulse A / SE 114 | engine SE 16 -> `message` cmd (ROM start + 1, flat in all 5) / accept frame S + T | pulse - accept | engine A, baseline -> SE 114 (vs ROM) | engine A with the press -> SE 114 (vs ROM) |
| --- | --- | --- | --- | --- | --- |
| s2 d6 | 281 -> 299 (+18) / 19 (318) / 320 / 502 | 300 (min 24) / 319 | +1 | 337 (pulse + 17) -> 519 (**+17**) | 320 -> 502 (0), SE 15 0 |
| s3738 d38 | 303 -> 321 (+18) / 19 (340) / 342 / 369 | 322 / 341 | +1 | 359 -> 386 (**+17**) | 342 -> 369 (0), SE 15 -1 |
| s1028 d10 | 397 -> 417 (+20) / 20 (437) / 438 / 467 | 418 / 438 | 0 | 455 -> 482 (**+15**) | 438 -> 465 (-2) |
| s319 d18 | 386 -> 406 (+20) / 20 (426) / 429 / 456 | 407 / 427 | +2 | 446 -> 473 (**+17**) | 429 -> 456 (0), SE 15 0 |
| s5063 d47 | 535 -> 555 (+20) / 20 (575) / 577 / 604 | 556 / 576 | +1 | 594 -> 619 (**+15**) | 577 -> 602 (-2), SE 15 -3 |

Per-command intervals agree everywhere before the press: SE 16 on the same frame (+0), faint `status` 1 row then `message` at ROM start + 1, typing = T glyphs both sides (19 / 20 for a 7 / 8-character name). A -> SE 114 with the press: 27 / 27 on s3738 and s319, 182 / 182 on s2 (a held-item heal chain, `ItemHealHP_Ret`, sits between the faint and the send-in; both sides run it), but 29 vs 27 on s1028 and 27 vs 25 on s5063: the engine is 2 short there, the AI-choice term of fch1 (a residual of that choice, not the cliff). Nothing is wrong in the faint print, the faint SE / sprite-drop rows or the hp drain (all five SE 16 exact), and no earlier hold carries into it.

**Why the labs match and the windows do not.** `fch1ReadySweep.ts` and the fsc2m `ready` policy press A on every frame, so they measure the accept frame; the census replay presses on the ROM pulse cadence and only once the phase says "awaiting". A lab has one pulse phase chosen by the A policy; in situ the pulse phase is whatever the run carried, and 3 of the 17 phases fall in the dead zone. The species / foe name, the sprite drop (SE 16 -> start 18 / 20) and the preceding message do not matter (all 5 windows have accept = ROM ready + 1).

### 3. Measured on the whole T2 (49 seeds, this tree, `AUD249_DISMISS_ACCEPT=1`, 0 missing / 0 extra both)

| | mass base -> press | exact base -> press | battle-controller | cry | bgm |
| --- | --- | --- | --- | --- | --- |
| OFF (24) | 2,040 -> **1,841** (-199, -9.8 %) | 725 -> 730 | 1,504 -> 1,378 | 340 -> 284 | 19 -> 2 |
| ON (25) | 14,435 -> 14,518 (+83, +0.6 %) | 2,935 -> 2,929 | 2,139 -> 2,188 | 718 -> 752 | 52 |

Faint -> SE 114 rows (ROM and engine both have the pair): OFF 32 rows, sum |error| 93 -> 33, exact 17 -> 19: the five windows above fix (+17 / +15 -> 0 / -2) and one flips (**s97 d13** 0 -> -17). ON 33 rows: no cliff row at the baseline; two flip (**s3738 d57** and **s5569 d18**, 0 -> -17, +51 mass each). The flips are the cliff the other way: in those windows the engine's SE 16 is 3 .. 6 frames earlier than the ROM's, so with the press the engine is ready before the ROM's pulse accepts and the ROM waits one more pulse; the baseline's exact SE 114 was the two errors cancelling. Opened: s97 d13 (OFF): engine `message` -> SE 13 41 frames (cmd 0.10 `move-animation` min 42, started 331) vs ROM print 313 -> SE 13 378 (65): the item-2 hit-SE interval of t2k3 (SE 13 -6, SE 16 -6, then the faint chain). The other six per-seed deltas: OFF s648 +17 (a non-faint button message; not opened), s499 -9, s5569 -9, s830 bgm -17, ON s310 -11, s1415 -9, s3158 -7, s4235 -9, s5063 +17 (controller; not opened).

### 4. Landing recipe (tools only; not flipped here)

1. `tools/integration/soundCensusRomReplay.ts`: make `dismissAccept` default true when `--romdrive` is given (`arg("dismiss-accept") !== "0"`), keep it off without a drive; `aud249Rescore.sh` / `aud248RunSeed.sh` then need nothing. The rule is the engine's own: press when `isBattleResolutionButtonMessageAcceptable` (the first row the engine takes an A), not 3 frames later. Pins it moves: none in `tests/` (the nine `soundCensusRomReplay` importers replay without `--romdrive`; not run here); `src/` none. It moves every T2 baseline: record OFF 1,841 / ON 14,518 as the new reference (OFF: the 5 windows -232, other gates -35 = s499 / s5569 / s830 bgm, flips +51 s97 and +17 s648; ON: -36 over s310 / s1415 / s3158 / s4235, flips +119 = s3738 d57 + s5569 d18 + s5063 +17).
2. Decide the ON +83 first: it is three windows whose cause is upstream (SE 16 early by 3 .. 6 after an OFF / ON hit-SE interval, t2k3 item 2 and the faint SE lag clip), so landing the press makes them visible rather than creating them; land it with item 2, or accept +83 ON for -199 OFF.
3. No engine row remains in the cliff: after the press the faint chain in the five windows is 0 / 0 / -2 / 0 / -2 at SE 114 (the -2 pair is fch1 term 1's AI-choice extra, `aiReplacementChoiceExtraFrames`, 2 early on those two choices; the next small engine term). t2k3 item 1's 2,251 mass is therefore mostly NOT this cliff: the cliff is 5 OFF windows (5 x 15 .. 17 rows of offset, about -232 mass); the +-1 .. 9 remainder of item 1 (ball-open @sprite-visibility -7 x5, party-summary lead) is untouched and needs its own windows.

Gates: `npm run typecheck` only (a `.ts` tool changed); no `npm test` / build (assigned); `src/`, `tests/`, PROGRESS / ISSUES / ROADMAP untouched.

## hie6m (2026-11-22): t2k3 item 3 (held-item group gen:152 / 228 / 102) — one class is a lead error, the scatter is inherited (measurement only; `src/` and `tests/` untouched)

Scene ON (:8012). Evidence (git-ignored, main tree): `.integration/evidence/hie6m/` (`chains.json` = every 5-SE held-item chain in the t2k3 ON replays with its first-SE offset, mass, `min=` and the 4 engine commands before it; `p/` = hcr3mProbe ROM probes + engine `--cmdtrace` + `hcr3mCmp` windows for s5063 d45, s1415 d47 / d49, s8108 d44, s310 d2 / d3 / d4, s2230 d6; `c-on/` = the `--cmdtrace=1` replays), worktree `.integration/evidence/hie6m/lab{1..4}`. Tools: `tools/integration/hie6mWin.py` (rows around a window), `hie6mMakeLab.py` (writes `tools/battle-lab/hie6m-sendin-leftovers-on.json`, see section 4).

### 1. Result

The held-item command's own interval is right: ROM exec -> SE 152 = 8, and the engine's command start -> SE 152 = lead + 8 (restart lead 15 -> 23) with the 15 fitted by hie1 on hit / end-turn tails, where the Leftovers / Sitrus / Shell Bell labs are -1 / 0 / -1. Only **one context** puts the command at the wrong place because of the lead: the end-turn Leftovers heal that **follows the player's own faint replacement** (party screen -> send-in), 3 windows, 300 mass, +21 / +21 / +18 on all five SEs. Everything else in the group (the signed scatter -23 .. -7) is the preceding hit / print / status command being early, not the item command.

### 2. Classes (94 chains, 1,615 mass in my count; t2k3 attributed 1,510 to the group, the 105 difference was not chased)

Class = what precedes the item animation (the last retained commands in `chains.json`, plus the ROM label). `mass` = sum |off| over the chain's 5 SEs; `|off|>2` = windows, mass.

| class | windows | mass | signed first-SE sum | \|off\|>2 (mass) | ROM interval | engine interval | differing command | source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **send-in** (foe b1 end-turn Leftovers after the player's faint replacement; `status`, `message`, 2 x `sprite-visibility`, then `min=229`) | 3 (s2230 segment 13 +21, s2230 segment 17 +21, s5063 segment 91 = d45 +18; s2230 d6 was opened as the ROM window for one of the s2230 pair) | 300 | +60 | 3 (300) | ball SE 15 -> item exec 133 (s5063: 148 -> 281); exec -> SE 152 = 8 | ball SE 15 -> command start 139 (145 -> 284); start -> SE 152 = 23 (284 -> 307) | the held-item command **start**: the retained segment starts 6 frames later (relative to SE 15, constant in both windows) than the ROM's `playanimation` exec, then the 15-frame restart lead is added on top; SE 152 = ball offset + 6 + 15 (s2230 0 + 21, s5063 -3 + 18) | `battleResolutionPresentation.ts:6037` (`lead` of the `HELD_ITEM_EFFECT` command), the send-in phase in `partySelect.ts` (`PartySendOutTiming`) |
| print-ended (`message`, 2 x sprite): end-turn Leftovers, Focus Punch / Yawn-type prints | 53 | 635 | -119 | 9 (440): -23, -17, -17, -9, -5, -5, -4 x 3 | exact where opened (s8108 d44 print -> SE 152 interval 106 / 106) | same | **not the held-item command**: s8108 d44 (-23) the hit SE 14 is already -24 before the print; s310 d3 and s1415 d49 (-17) the Focus Punch print is 16 early. 44 of the 53 are within +-2 | t2k3 item 2 (hit SE / hit -> print), `hcr3mCmp` 8108 d44, 310 d3, 1415 d49 |
| hit (`hp`, 2 x sprite): Sitrus / Shell Bell / Leftovers right after a hit's hp update | 10 | 195 | -39 | 4 (160): -11, -11, -7, -3 | ROM b0-defender hit animation -> hp 36 | engine 28 | **not the held-item command**: hp (and with it the item) starts 10 early on a b0 defender (s1415 d47, s310 d2: -11); the lead error left over is about -1 | `hcr3mCmp` 1415 d47, 310 d2 |
| stat (`stat` / `stats-change`, `message`, sprite) | 14 | 145 | -9 | 2 (75): -10, -5 | not opened | | no engine command named (12 of 14 within +-2) | `chains.json` |
| status-animation | 3 | 110 | +8 | 3 (110): -7, +7, +8 | s310 d4: lead about 7 after a sleep status animation (ROM) | restart lead 15 | **mixed**, one window opened: the 15 is 8 too long after a status animation, the other two (+7 / +8, -7) are not explained by it | `hcr3mCmp` 310 d4 |
| other (`message, status-icon`, `message, message`, ...) | 11 | 230 | -28 | 7 (195): -8, -7, -6, -5, -4, +4, +5 | not opened | | none named | `chains.json` |

Windows by `min=` (229 = restart + 15, 224 / 225 / 226 = the hie5 after-print lead): the send-in windows are the only +18 .. +21 ones, all with `min=229`; the +4 .. +8 positives elsewhere are status-animation / `general-animation, message, status-icon`.

### 3. Why the send-in start is 6 late (and why the lead then double-counts)

ROM (s5063 d45, frames from the decision commit): `FaintedMonSendOutNew` ball SE 15 at 148, script end 268, `FaintedMonEnd` 273, `ItemHealHP_End2` 279, `ItemHealHP_Ret+0x7` exec 281 (playanimation), SE 152 at 289, 321, 353, SE 228 385, SE 102 457. The ball -> exec distance is 133. The engine runs the send-in as an orchestrator phase, not plan commands, and the next retained segment starts with the held-item command: ball SE 145, command 1.4 at 284 (139 later), SE 152 307 (`min=229` = 214 + 15). The 15-row lead exists because a hit's tail has the item script's own rows before the animation (hie1); here the segment already starts 6 late after the send-in phase, so the lead is surplus. s2230 d6: ROM exec 306, SE 152 314; engine command 312, SE 152 335 (ball offset 0), i.e. +6 start +15 lead.

### 4. Lab

- `labCompare.sh --scene on` on `hie6m-sendin-leftovers-on` (AI-replacement variant: foe lv 5 lead faints to a lv 50 player, the foe's replacement then Leftovers): SE 15 -10, SE 152 -5, mass 35, +5 relative to the ball SE. This is the foe's `switch-in` command (`switchInTail.ts`), **not** the T2 class; it does not reproduce the +21.
- Player-faint-replacement variant (`hie6mMakeLab.py`, now the committed file: lead lv 12 Quick Attack, foe lv 50 Leftovers + Seismic Toss, party screen by DOWN / A / A as `pic7-player-faint-send-in-on`): **ROM only**. The engine refuses it (`partySelect.ts:236`: the party screen checks `playerParty[i].maxHp` against the rental record's 165; `pic7-player-faint-send-in-on` fails identically), so any lab with override parties and a player forced switch has no engine side. ROM: SE 15 at 968, SE 152 at 1043 (interval 75, against 133 / 141 in the T2 windows), so the lab's send-in is not the T2 flow either; it is kept as the ROM capture (`lab3/`) and not used for numbers.
- The hie1 labs (end-turn Leftovers, Sitrus, Shell Bell after a hit) stay -1 / 0 / -1 (hie5), consistent with the table: the lead is right in those contexts.
- So the send-in class rests on the two T2 ROM windows (s2230 d6, s5063 d45) plus the third chain in `chains.json`, all three from real replays; no lab reproduces it.

### 5. Landing recipe (not flipped here)

1. `src/engine/battleResolutionPresentation.ts:6037` (`lead` / `frames` of the `HELD_ITEM_EFFECT` command, `heldItemEffectExecutionsAndLead` near 1830): when the retained segment's first command is the item animation and the previous phase was a player forced-switch send-in, use a lead of **-6** (`frames` 208) instead of the restart 15. The segment context has to come from the orchestrator (`factoryRoundBattleOrchestrator` / `partySelect.ts` send-in phase): the plan builder sees only the kernel events, which are the same as for any end-turn restart. Alternative with the same effect: shorten the send-in phase's tail by 21 frames in `PartySendOutTiming`, but that moves the ball-SE-relative cry / "Go!" rows, so prefer the lead.
2. Rule: the send-in phase already ends 6 after the ROM exec (relative to SE 15), so the command's lead is the rest of that, `-6`, not the 15 fitted on hit tails. New constant beside `HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES`; leave 15 / 9 untouched.
3. Pins that will move: `tests/hie1HeldItemEffect.test.ts` pins the constants `[214, 15, 9]` (unchanged if the new lead is a separate constant); the pins carrying `minimumFrames: 229` (or the SE 152 / 228 / 102 frames) after a player faint send-in in `tests/factoryRoundBattleOrchestrator.test.ts` and `tests/battleEndTurnOrchestration.test.ts` move by -21; I did not run or read these.
4. Expected T2 change (ON, 25 seeds): the 3 windows go +21 / +21 / +18 -> 0 / 0 / -3 (the -3 is s5063's ball SE, an earlier term), ON mass -300 + 15 = about **-285** of 14,435 (-2.0 %); OFF unchanged (item animation is Scene ON). Fixing it will not remove the rest of the held-item group: 1,315 of the 1,615 is hit / print / status inheritance, handled by t2k3 item 2 and the b0-defender hit-animation -> hp interval (28 vs 36).
5. Verification when landing: rerun `hie6mWin.py 5063 45 270 300` and `2230 6` (SE 152 at +0 / -3), then `labCompare.sh` on `hie1-leftovers-on` / sitrus / shellbell (must stay -1 / 0 / -1).

Gates: no `.ts` added, only `.py` and a lab json, so no typecheck; `npm test` / build **not run** (the step overrides the generic line); `src/`, `tests/`, PROGRESS / ISSUES / ROADMAP untouched.

## hse1m (2026-11-22): the engine command behind t2k3 item 2 (hit SE 12 / 13 / 14 after a used print) -- it is not the OFF used-print `move-animation`

Post-freeze measurement; `src/` and `tests/` untouched. Tools: `tools/integration/hse1mSplit.py` (per hit-SE window: ROM script path from the `hcr3mProbe` rows, ROM used-print start / release, engine `message` -> `move-animation` -> `hit-animation` frames, commit-relative; `--ctx` adds the ROM labels before the print) and `hse1mTable.py` (ownership windows as t2k3 `own.py`, classed by the ROM labels before the print; a third argument adds the "after" mass of a re-scored attr file); `soundCensusRomReplay.ts` (tools change, below). Evidence: `.integration/evidence/hse1m/` (`split.json`, `table-off.txt`, `table-on.txt`, `p/off/*-full.*` 15 OFF seeds, `p/on/*-full.*` 24 ON seeds, `p/cmp/*.txt` windows, `lab/`).

### 1. Correction of t2k3 item 2

t2k3 read the 92 OFF windows as "engine flat 42-frame `move-animation` is 21-28 frames short". Decomposed on the 106 OFF hit rows that have a ROM used-print chain: ROM print release -> SE 41 (`HitFromCritCalc`, `Pausex20`, +2) against the engine's `move-animation` 42 (+1); the used print itself is 24 / 25 (engine / ROM, -1); **print start -> SE is exact (+-1) in every decomposed window**. The step lives between the previous event (commit, MoveEnd, an earlier print) and the used-print start: the script rows or the A press that sit in front of the print. 97 windows own 701 of the OFF mass; they split by the ROM labels in front of the print (the first three are the cause table; ROM / engine intervals are print / press start to the used print, then to SE 13):

| Cause (OFF windows / rows / mass / median step) | ROM interval | Engine interval | Differing command | Source |
|---|---|---|---|---|
| **Struggle after `NoMovesLeft`**: 23 / 43 / 289 / -7 (s6568, s7682, s2230, s7295) | s7682 d91: no-moves print 2..40, A accepted +38 (ROM driver pulse: A frames -1, 3, 20, 37, 54 ...), used print +55, SE 13 +118 | dismiss +31 (the census presses the no-moves box on its own even-frame cadence), used print +49, SE 13 +112: -6 (-2 .. -14 over the windows: where the 17-frame pulse falls) | not a presentation command: the census driver's `no-moves-message` dismiss press | `soundCensusRomReplay.ts` `pulse("A")` after `NO_MOVES_MESSAGE_HOLD_AT` (drv1 left it on the engine cadence) |
| **Wake-up print** (`MoveUsedWokeUp`): 10 / 13 / 91 / -7 (s5063 x5, s7682) | s5063 d40: wake print 12 -> `updatestatusicon` 94 (82) -> `HitFromAtkCanceler`, `AccCheck`, `AtkString` -> used print 99 (icon + 5) -> release 124 (25) -> SE 13 165 (41) | message 11 -> `status-icon` 91 (80) -> used `message` 92 (+1) -> `move-animation` 116 (24) -> SE 13 158 (42): -2 -4 -1 +1 = -6 (the window's -7: 1 frame unattributed) | wake-up `message` hold 80 (ROM 82) and `status-icon` 1 frame (ROM icon -> next print = exec delta + 1 = 5) | `battleResolutionPresentation.ts:1265` (`!sceneOff &&` before `WAKE_UP_MESSAGE_TIMING`) and `:6310-6314` (`wakeUpIconTiming` only when NO_ANIMATIONS is clear); the gsp2 rules (:1951-2000) were measured on Scene ON only |
| **Confusion head** (`MoveUsedIsConfused[NoMore]`): 7 / 15 / 77 / -6 (s7295, s499, s648, s830) | s7295 d5: print row 11 -> used print 108 (97), release 141 (33), SE 13 182; s499 d11: 105 - 11 = 94; lab `hpf4m-confuse-off` print 1323 -> used print 1417 (94) | s7295 9 -> 102 (93); s499 9 -> 99 (90); lab 1323 -> 1413 (90): **-4** at the used print, then print -1, `move-animation` +1 | confusion `message` hold: `PRE_MOVE_STATUS_ANIMATION_TIMING` (64 + 3 rows) is right for Scene ON (the launch is a real `status2animation`); OFF skips the launch and runs `return`, `HitFromAtkCanceler`, `AccCheck`, `AtkString` (rows 101-104) before the print | `battleResolutionPresentation.ts:1204-1210` + `:1272-1276` (no scene branch), cf. `MOVE_INFLICTED_STATUS_SCENE_OFF_LEAD_ROWS` (sta6m: the same +4) |
| Plain (previous `MoveEnd` / end-turn / item rows): 21 / 25 / 64 / -1 | | | no single command; steps -1 .. -10, carried offsets | not ranked |
| Two-turn / semi-invulnerable second turn 4 / 7 / 48; Focus Punch 9 / 14 / 46 (+-5); infatuation 6 / 12 / 33 (-3); hit SE with no used-print chain (hit-all, parse miss) 13 / 14 / 31; after a miss 4 / 6 / 22 | | | not opened | |

Struggle is not a Factory move: its lab is `enc276-struggle-off` (a PP-out Splash party); the confusion lab uses Confuse Ray (Factory). `labCompare.sh --scene off` results (`lab/summary.txt`): `enc276-struggle-off`: the used print first glyph exact (464 / 464), SE 13 +1 (526 / 527); `hpf4m-confuse-off`: confuse print exact (1323), used print ROM 1417 against engine 1413 (-4), the later rows of that lab desync (counts differ), so only the first confusion turn is read. A clean OFF wake-up lab was not obtained (`gsp3-sleeppowder-player-on` run OFF and a new Double-Edge / Sleep Powder OFF lab both desync on the lab's ON-timed presses and the engine / ROM sleep turns); the wake-up window above is the ROM census window s5063 d40, repeated with the same -7 in s5063 si 17 / 25 / 49 / 57 / 65 / 73 / 81 and s7682 d47.

### 2. Tools change landed (measured): the no-moves dismiss follows the ROM drive

`soundCensusRomReplay.ts`: after `NO_MOVES_MESSAGE_HOLD_AT` the engine's `no-moves-message` is dismissed on the ROM driver's A frame (`dismissPress()`, drv1's segment clock) instead of `pulse("A")`; without `--romdrive`, or with `ROM_REPLAY_NOMOVES_EVEN=1`, it is the old cadence. `npm run typecheck` green. Re-score of the 24 OFF seeds (`aud249Rescore.sh`, same ROM files; baseline = the same tree with `ROM_REPLAY_NOMOVES_EVEN=1`, which reproduces t2k3's 2,040 / 725 / 408):

- **OFF T2 mass 2,040 -> 1,819 (-221)**, exact 725 / offset 408 / missing 0 / extra 0 unchanged: the 23 Struggle windows' 289 -> 67; every s7682 / s6568 / s2230 Struggle SE 13 row goes from -2 .. -14 to **+1** (s7682 d91 now: engine SE 5 38 (ROM 38), used print 56 (ROM 55), SE 13 119 (118)). The +1 is left in the engine: dismiss -> used print is 18 frames against the ROM's 17 (census), SE 13 +1 also in `enc276-struggle-off` (lab, whose presses are the lab's own) -- the Struggle forced-handoff hold, `battleResolutionPresentation.ts` ~7163, `tests/enc276ForcedTurnNoMenu.test.ts`. Two rows (s5063 / s7295) that the first classing put here are wake-up / confusion windows and are unchanged.
- ON: 14,435 -> 14,451 (+16): the three ON Struggle windows are not the same cause (their step is +2 and the s2230 window carries -17 from the animation rows); one frame moved. Kept: OFF -221 against ON +16.

### 3. ON split (24 seeds probed, `table-on.txt`; ON hit-SE windows 92 / owned mass 727 / step mass 301)

The Struggle / wake-up / confusion windows are already within +-2 in ON (gsp2 / sta3 land them); the ON hit-SE offset comes from other commands: **the end-of-turn weather tick** (`DamagingWeatherLoop`, s8108 / s2741: 12 windows, step -8 each; s8108 d20: ROM `playanimation` row 459 / SE 219 +3 -> damage print 637 = 178, engine `general-animation` (SANDSTORM_CONTINUES min 172) 413 -> `message` 585 with the SE at +12; engine print -> SE 13 116 against ROM 109) and **`EffectParalyzeHit`** (s5063 si 105 -33, s6079 si 7 / 15 -11: ROM release -> SE 146 / 136, engine 110 / 121 = the secondary-effect animation rows), plus 33 plain windows (459 mass, median step -1: carried offsets). The ON arm needs its own recipe (not opened further here).

### 4. Landing recipe for the next run (OFF; one `src/engine/battleResolutionPresentation.ts` change per row, each by the rows above)

1. **Wake-up (largest after the tools fix, 91 mass):** drop the Scene gates at `:1265` (`!sceneOff &&`) and `:6310-6314`; the OFF wake-up message holds `WAITMESSAGE_LONG_HOLD_FRAMES + 2` and the icon lasts `wakeUpStatusIconFrames` (exec delta + 1), as ON. Rows: print -> icon 82, icon -> print 5 (ROM s5063 d40). Pins it will move: OFF wake-up pins in `tests/factoryBattleScriptWakeUpFullTurn.test.ts`, `tests/battleScriptAttackCancelerAsleep.test.ts`, `tests/off121StatusCommand.test.ts` (grep only, not run). Expected: -6 of -7 per window, OFF T2 mass about -75 (91 -> ~15), exact about +10.
2. **Confusion head (77 mass):** in OFF, when the next command after the confusion print is the used print (`BattleScript_MoveUsedIsConfusedRet` -> `HitFromAtkCanceler` ...), hold `WAITMESSAGE_LONG_HOLD_FRAMES + PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS + 4` (the skipped `status2animation` leaves the `return` + three script rows: ROM print row 11 -> used print 108 / 105 / lab 1417). Pins: `tests/sta3PreMoveStatusTiming.test.ts`, `tests/confusedAdmissionPresentation.test.ts` (OFF rows). Expected: -4 of -6, OFF mass about -45; ON unchanged (gate by NO_ANIMATIONS).
3. **Struggle +1:** shorten the forced-handoff hold before the used print by 1 (dismiss -> print 17), `tests/enc276ForcedTurnNoMenu.test.ts`; 43 rows, +43 exact, mass -43. Then re-run `hse1mSplit.py` / `hse1mTable.py` on the new engine to rank infatuation (-3), Focus Punch, two-turn.
4. Do not touch the `move-animation` min 42 / `hit-animation` (their interval is exact) and do not land t2k3's "21-28 short" proposal.

### 5. wkl1m (2026-11-22): the clean Scene OFF wake-up lab pair (labs and docs only; `src/` and `tests/` untouched)

Labs: `tools/battle-lab/wkl1m-wakeup-player-off.json` (the player's Snorlax L50 sleeps) and `wkl1m-wakeup-foe-off.json` (the foe's Snorlax sleeps; the name says which side wakes, the reverse of the gsp3 "user" naming). Parties: Snorlax L50 with Rest (156) in all four slots against Rattata L50 with Seismic Toss (69) in all four; Snorlax is slower, so Seismic Toss (fixed 50) lands first each turn; four turns of `A`, 18 idle, `A`, 700 idle (the last idle 900). Run: `labCompare.sh --scene off --out .integration/evidence/wkl1m/run wkl1m-wakeup-player-off wkl1m-wakeup-foe-off` (tables: `run/*.table.txt`, git-ignored).

**Why Rest, not Spore.** A Spore lab (`Rattata L50` Spore x4 against a Seismic Toss L12 foe, seeds 1-6, 3-7 turns) is not usable: the sleep length is a roll, and the engine's and the ROM's differ for the same lab seed. ROM wakes the foe in turn 2 (seeds 1 / 3 / 5) or turn 4 (seed 2); the engine one turn later each time (turn 3 for odd seeds, 5 for even), so the ROM foe is awake and re-slept by the next Spore while the engine foe is still asleep (rows desync from the wake turn on: SUMMARY mass 707 = the engine's wake-up attack matched with the ROM's earlier one). That engine-vs-ROM sleep-length roll is its own open question (not a timing rule; untouched). Rest has a fixed length (Snorlax asleep turns 2 and 3, wakes in turn 4 in the ROM and in the engine) and no accuracy roll, so both labs reach the same wake-up turn; the only press-timing care is that the last idle outlasts the long wake + Rest turn (a fifth turn's `A` fell inside the ROM's turn 4 end in the first 5-turn trace).

**Result (`labCompare.sh --scene off`).**

- `wkl1m-wakeup-player-off.off`: `PRINTS exact 7 / offset 6 / missing 4 / extra 0, mass 105 (first glyph: ROM 17 / ENG 13)`; `SUMMARY exact 4 / offset 0 / missing 0 / extra 0, mass 0 (ROM 4 / ENG 4 se)`.
- `wkl1m-wakeup-foe-off.off`: the same two lines, identical numbers.
- The four SEs (the four Seismic Toss hit SE 13) are exact +0 in both, so the wake-up window is entered with no carried offset; the 4 "missing" prints are ROM-only `MoveEnd+0x9` rows (the ROM prints the next message row where the engine has none).

Wake-up window (turn 4; ENG - ROM, frames; player lab / foe lab are the same except the battler side; wake print exec `MoveUsedWokeUp+0xe`):

| Row | ROM | ENG | ENG - ROM |
|---|---|---|---|
| wake-up print first glyph (player lab / foe lab) | 2374 / 2370 | 2359 / 2355 | **-15** |
| status icon clear (ROM `MoveUsedWokeUp+0x13` updatestatusicon exec; ENG `status-icon` command) | 2455 | 2439 | **-16** |
| next used print first glyph (`EffectRest+0x2`, the woken Snorlax's Rest) | 2460 | 2440 | **-20** |

The -15 at the wake print is not the wake-up rule: the same -15 is on the `MoveUsedIsAsleep` print of turns 2 and 3 (ROM 929 / 1651, ENG 914 / 1636, both labs) with the Seismic Toss hit SE exact in front of them, so it is the engine's asleep / wake print head after a hit (a separate step). The wake-up rule is the two deltas *inside* the window, and the lab reads exactly hse1m's: print -> icon is **81** ROM glyph-to-icon (82 from the print exec 2373 to the updatestatusicon exec 2455) against the engine's **80** (-1 glyph basis, -2 on hse1m's exec basis), and icon -> next print is **5** ROM (updatestatusicon exec 2455 -> `EffectRest+0x2` exec 2459, glyph 2460) against the engine's **1** (-4). Wake print -> next print is 86 ROM / 81 ENG = -5; the step goes -15 -> -16 -> -20. So the Scene ON rules are what OFF needs: `WAITMESSAGE_LONG_HOLD_FRAMES + 2` for the message and `wakeUpStatusIconFrames` (exec delta + 1) for the icon (`battleResolutionPresentation.ts:1265`, `:6310-6314`), after which the three rows should read -15 / -15 / -15 (next print -20 -> -15); anything left on top is the asleep / wake print head (-15). The row after the next used print (Rest `status` / heal prints, -20) carries the same -5 and moves with it.

**Landing check for the next run:** after the `:1265` / `:6310-6314` change run `labCompare.sh --scene off wkl1m-wakeup-player-off wkl1m-wakeup-foe-off` (about 40 s for both); the wake print row stays -15, the icon row goes -16 -> -15 and the used-print row -20 -> -15; all four SEs must stay +0 and SUMMARY mass 0. Pins to re-check by the recipe above (`tests/factoryBattleScriptWakeUpFullTurn.test.ts`, `tests/battleScriptAttackCancelerAsleep.test.ts`, `tests/off121StatusCommand.test.ts`) were not run.

## g180m (2026-11-22): the engine commands behind t2k3 items 4 and 5 (gen:180 / 142 / 202 chain, Dig)

Post-freeze measurement; `src/` and `tests/` untouched. Tools: `tools/integration/g180mProbe.sh` (probe + `hcr3mCmp` for one seed / decision; `SUB=<dir>` keeps one `rom.json` per decision), `g180mClass.py gen|dig` (window first rows with the five engine commands before them), `g180mTwoTurn.py` (first-turn windows of two-turn moves with the previous ROM cause). Evidence: `.integration/evidence/g180m/` (`p/*/*.cmp.txt`, `c-on/` cmdtraces, `lab/leech.txt`).

### 1. Correction of t2k3 item 4: it is the Leech Seed drain, not a restore-HP body

gen:180 / 142 / 179 are the three SE ids of `BattleScript_LeechSeedTurnDrain` (`general-animation LEECH_SEED_DRAIN`: SE 180 `SE_M_ABSORB`, then 142 `SE_M_CRABHAMMER` / 179), gen:202 is `SUN_CONTINUES`. ON: 207 drain rows, mass 1,028, 22 exact; engine SE = command start + 34 (`LEECH_SEED_DRAIN_SCRIPT_AGE = 7`, `moveAnimSounds.ts:573, 688-690`; command min 218 = `LEECH_SEED_DRAIN_PRE_ROWS` 8 + exec + 207).

| Window class (first row) | ROM interval | Engine interval | Differing command | Source |
|---|---|---|---|---|
| **Post send-in**: s6912 d2 (+13 x2, 5 windows' rows ~260 mass) | send-in script -> `LeechSeedTurnDrain+0x7` exec 233, SE 180 260 (+27) | `general-animation` starts 239 (+6 against the ROM exec), SE 273 | the drain command itself starts 6 rows after the ROM exec (the hie6m send-in constant: the retained segment starts 6 late) and the age adds 7: 6 + 7 = **+13** | `p/on/6912-d2.cmp.txt`; `battleResolutionPresentation.ts` drain command, `moveAnimSounds.ts:688` |
| **After end-turn weather / side-status prints**: s310 d16 (-12), s648 d6 (-6 / -7) | `SideStatusWoreOff`, weather print, then drain | `turn-end` / `message` heads 9 rows (ROM 7-8), holds 97 / 88 against ROM 92 / 83 (-5 each) | the `message` commands before the drain (not the drain): the print head and hold shortfall accumulate before the drain starts | `p/on/310-d16.cmp.txt`, `p/o648d6/` |
| **After a b0 hit**: s648 d10 (-2 .. -6) | `MoveEnd` 548 -> drain exec 558, SE 585 | `hp` b0 (floor 28) 428 -> drain 556 -> SE 590 | `hp` interval: engine floor 28 rows, the ROM bar length depends on the damage | `p/o648d10/` |
| `SUN_CONTINUES` (gen:202): s310 d12 (+10, +7 x3) | weather `playanimation` exec -> SE 202 | first SE at command start + `WEATHER_SCRIPT_AGE` 8 | the age 8 for Sun / Sandstorm / Hail has no weather-window receipt (Rain is pinned by rnc1) | `p/on12/`, `battleResolutionPresentation.ts:249-295`, `moveAnimSounds.ts:654-662` |
| Exact / single-row (s319 0 / -2, s648 +5, others) | | | not opened | |

Labs (`labCompare.sh`, ON): `aud250-leechseed-player-on`, `aud250-leechseed-opponent-on`, `etp1-leechseed-on` are **exact (every SE +0, mass 0)** including the drain (SE 180 / 142). So the drain's own interval is right when it follows an ordinary hit-and-end-turn; the T2 windows are context chains. Open: in the labs ROM exec -> anim lag is 7, in T2 it is 0 (SE 180 = exec + 27 with the anim script active on the exec row); an `IsBattleSEPlaying` gate is the hypothesis, unconfirmed. A global age change fails: -7 turns drain mass 1,028 into 1,677 (exact 30), -6 1,570, -5 1,463.

### 2. Item 5: the Dig windows are a charge-turn start gap after a previous move

13 ON Dig-first windows, mass 615. 488 (79%) of it is **a charge turn that follows another move in the same turn** (first-turn Dig after Light Screen x3 -8, Rock Slide -10, Follow Me -10, stat -11 / -14, Sandstorm -19); the same Dig after turn start (`prev start`, 10 windows) is exact. Solar Beam / Fly show the same sign (-10, -13, -14, -18). Ordinary moves after Sandstorm / Rain / Hail are exact (Facade, Blizzard, Bulk Up, Light Screen +0), so it is a charge-turn rule, not the weather chain.

ROM s8108 d6 (Light Screen -> Dig): `MoveEnd` 229 -> `EffectSemiInvulnerable` 236 (7) -> `FirstChargingTurn+0x6` exec 249 (+13) -> SE 175 269 (+20). Engine: `sprite-visibility` 230, used `message` (min 8) 231 = `MoveEnd` + 2, `move-animation` 239, SE 261: **-8**. After turn start the engine puts the same `message` at `EffectSemi` + 3 (s648 d0: message 9, `EffectSemi` 6, exec 19, SE 39 +0), i.e. the used print of a first charge turn starts 8 rows earlier after a previous move than it does after the turn start. s8108 d19 (Sandstorm -> Dig): `WeatherFormChanges` 293 -> `Loop` 294 -> `MoveEnd` 302 -> `EffectSemi` 309 (16 rows after the form-change row), the engine places the used `message` at 293 (the command after `sprite-visibility` 292): -8 plus **-11** more = **-19** (that extra -11 is not explained: ordinary moves after Sandstorm are exact). s6 d1 (Snore asleep -> Dig): -13 = -8 + -5.

| Window class | Step | Mass | Reading |
|---|---|---|---|
| After Light Screen (s8108 si13 / 29 / 45) | -8 | 144 | pure charge-turn gap |
| After Rock Slide / Follow Me (s6 si3, s3738 si63) | -10 | 115 | -8 + -2 |
| After stat change (s3738 si95, s8108 si51) | -14 / -11 | 115 | -8 + the stat chain |
| After Sandstorm (s8108 si39) | -19 | 114 | -8 + -11 |
| Dig after Dig, Sandstorm second-turn, Brick Break (+18) | +9 / -5 / +2 / +18 | 127 | carried offsets, not opened |

### 3. Landing recipe for the next run

1. **Charge-turn used print after a previous move (item 5, ~490 mass ON): `battleResolutionPresentation.ts`, the `STRINGID_USEDMOVE` message of a `CHARGE_TURN_SCRIPT` event (`chargeChainCarry` / `twoTurnSecondPrintLead`, ~5859-5892)**: when a previous action chain precedes the first charge turn in the same turn, delay the used print by 8 rows (the ROM `MoveEnd` -> `EffectSemi` 7 + the 3 the turn-start context already carries), keep the turn-start case (`prev start`) untouched. Pins it will move: bdt1 / chg2 / chg3 Dig and Solar Beam labs only if they contain a previous move in the same turn (their turn-start windows are exact and must stay so). Expected T2: ON Dig -8 x3 windows exact, -10 / -11 / -14 / -19 windows reduce by 8 per window row (~ -250 mass); Solar Beam / Fly after a move likewise. Verify: `labCompare.sh` on a Light Screen -> Dig lab (new, Factory moves), then `g180mTwoTurn.py`.
2. **Sandstorm -> Dig extra -11**: measure the `WeatherFormChanges` loop (`MoveWeatherChange+0xf` -> `MoveEnd` 9 rows) against the engine's `message` min 8 after the weather `sprite-visibility`; likely the same carried rows the ordinary-move path absorbs. Expected: s8108 si39 -19 -> -8 -> 0 with rule 1.
3. **Post send-in drain (item 4, s6912 ~260 mass)**: the drain after a player forced-switch send-in starts 6 late (hie6m), so subtract the 6 + 7 age only in that context: `moveAnimSounds.ts:688` age 7 -> 0 when the command was reached from a send-in, or fix the segment start once (hie6m item). Pins: the leech send-in pins in `tests/`; expected s6912 +13 x2 -> 0.
4. **End-turn print head / hold before the drain (s310 d16 -12, s648 d6 -6)**: `turn-end` / `message` head 9 -> 7 rows and the weather / side-status print hold 97 -> 92, 88 -> 83 (ROM `SideStatusWoreOff`). Pins: end-turn pins (`tests/endTurn*`). Expected -12 -> 0, -6 -> 0.
5. **`SUN_CONTINUES` / Sandstorm / Hail age 8**: lab a multi-turn Sunny Day (Factory move) before changing `WEATHER_SCRIPT_AGE`; the first SE is +7 .. +10 in T2.
6. Do not change `LEECH_SEED_DRAIN_SCRIPT_AGE` globally (-7 raises T2 drain mass 1,028 -> 1,677); the labs are exact at 7. Resolve the lab-lag-7 / T2-lag-0 question first (one cmp of s6912 d2 against `etp1-leechseed-on`).

Gates: no `.ts` added (python / shell only), so no typecheck; `npm test` not run (the step overrides the generic line); `src/`, `tests/`, PROGRESS / ISSUES / ROADMAP and the acceptance / supervisor ledgers untouched.

## t68m (2026-11-22): the engine commands behind t2k3 items 6, 7 and 8 (gen:148 tick, Ice Beam, Rock Slide) -- none of the three is a rule of its own (measurement only; `src/` and `tests/` untouched)

Tools: `tools/integration/t68mWin.py` (windows of one cause with the previous row's cause / offset and, with `--cmd DIR`, the engine cmds before the first row) and `t68mPress.py` (per window, last ROM SE 5 -> row vs last engine SE 5 -> row; second arg `cmd` names the owning engine cmd). Frozen input: t2k3 `attr-on.json`; ROM windows from the hse1m full probes, `hcr3mCmp.py` on the frozen T2 request. Evidence (git-ignored): `.integration/evidence/t68m/` (`win-*.txt`, `press-*.txt`, `<seed>-d<n>.cmp.txt`).

**Result.** In all three items the *interval of the item's own command is exact* (ROM = engine): poison tick message -> status animation 95 = 95; Ice Beam press -> SE 67-73 identical; Rock Slide s97 55 = 55. The offset on the first row is whatever precedes the item. There is no per-item constant to change.

### 1. Item 6: gen:148 poison / status tick first row (ON 534, 19 windows, -12 .. +6) is five inherited classes

| Class | Mass | Windows | What precedes (ROM vs engine) | Command |
|---|---|---|---|---|
| A. offset inherited from the previous row (same sign, same size) | 222 | 9 | the previous row already carries the offset; the tick adds 0 | not a tick |
| B. first command after a player send-in, +6 | 72 | n/c | the retained segment after a player send-in starts 6 late (hie6m constant) | send-in -> next segment start |
| C. after a foe replacement `switch-in` tail, -9 | 54 | 1 | engine `switch-in` tail 9 shorter than the ROM `SwitchInEnd` hold | `switch-in` tail |
| D. after a side-status / Encore message chain, -4 / -5 | 84 | n/c | the g180m item 4 family (`DisabledNoMore` / `SideStatusWoreOff` print hold ~5 short) | message hold |
| E. after a body tail: Knock Off +5, miss -3, Block -8 | 102 | n/c | the previous move's own end (`KnockedOff` / `MoveEnd` tail), not the tick | previous body |
| Sum | 534 | 19 (A 9, C 1; B / D / E split not counted) | | |

Source rows: tick message -> `BattleScript_PoisonTurnDmg` -> `DoStatusTurnDmg` status animation 95 frames on both sides; the first-row error equals the previous row's error in A, so fixing B / C / D / E moves A with it (the 222 collapses only when the 3 inherited roots are fixed).

### 2. Item 7: Ice Beam first-mover windows (ON 517; -21 / -13 / -6) are a harness gate, a continuation segment and a print hold

| Window | Step | Mass | Cause | ROM vs engine |
|---|---|---|---|---|
| s2230 d20 si41 | -21 | 231 | **harness press gate, not an engine rule**: the ROM is still in the `DisabledNoMore` end2 tail and accepts the census retry press at +19, the engine accepts at 0 | press -> SE 5: ROM 19 later; press -> SE 67..73 equal |
| s830 d1 si3 | -13 | 156 | engine continuation segment (`seg 1`, lead 0) after the opponent's first charging turn; the ROM waits 12 before the used print | engine commit -> first message 0 vs ROM 12 |
| s830 si11 | -6 | 66 | the confusion-ended print (`MoveUsedIsConfusedNoMore`) hold ~5 short | message hold 5 |
| s6079 si1 | -4 | 56 | not opened to the end (s6079 d0: engine commit 9, ROM 7; first message 9 vs ROM `EffectEarthquake` 6; the prior row is `ctl-hit:13` off +0) | |
| s830 si19, s2230 si31 | -3 / -3 | 6 | single rows | |
| s8612 si33 | +2 | 2 | after Rest | |
| Sum | | 517 | 231 + 156 + 66 + 56 + 6 + 2 | |

Only 2 decisions in 24 seeds are the gate (s2230 d20, d21; d21 probably owns the Struggle -17 of t2k3). It is a `soundCensusRomReplay` / driver artefact: the fix is the census press gate (accept the A press only on the ROM's accepted frame), never `src/`.

### 3. Item 8: Rock Slide body (ON 514; -13 / -10 / -9 and +5) is inherited from the previous move

| Window | Step | Mass | Cause |
|---|---|---|---|
| s8612 si17 | -13 | 180 | first row off -9 after Belly Drum (prev off +4): -13 is the step, the Belly Drum tail is +4 on the ROM side |
| s165 si37 | +1 (off +5) | 100 | inherited: prev `ctl-hit:13` row already +4 |
| s165 si45 | -5 | 60 | prev `stat:245` off +2 (not opened) |
| s165 si49 | -3 | 40 | prev `ctl-hit:13` off +1 (not opened) |
| s310 si43, s1914 si23 | -3 / -3 | 120 | segment start, the engine's 9 .. 13 commit -> first message vs ROM 12 |
| s2741 si5, s6 si3 | -10 / -3 | 14 | after Perish Song / segment start |
| Sum | | 514 | 180 + 100 + 60 + 40 + 120 + 14 |

Rock Slide's own interval is exact (s97 55 = 55): the item is not a Rock Slide rule.

### 4. Landing recipes for the next run

1. **Used-print lead of a continuation segment after an opponent's first charging turn (s830 d1, -13, 156 mass, item 7): `battleResolutionPresentation.ts` `usedMovePrintLeadU` (~7057).** In Scene ON the hold reads `state.segments[0]`, and its comment says continuation segments were measured in Scene OFF only; the ROM waits 12 before the used print, the engine `seg 1` (lead 0) waits 0. Rule: when the print belongs to a continuation segment (`segmentIndex >= 1`, no commit of its own) hold the OFF `lockedTurnPrintLead` base (`TURN_START_PRINT_BASE_U`, ~7390) instead of 0. Pins: the Scene ON continuation / charge pins in `tests/` (`usedMovePrintLead*`, charge-turn pins around `chargeChainCarry`). Expected T2: item 7 -156 mass (s830 d1) and possibly the s165 / s6 / s830 / s8108 first-row mixes (not uniform: lab one cmp per seed first). **Not resolved**: whether the lead-0 `seg 1` rule is uniform.
2. **Send-in -> next segment +6 (class B of item 6, 72 mass)**: the hie6m constant (see its recipe); do it once, it moves item 3 and item 6.
3. **Side-status / Encore message hold ~5 short (class D, 84; item 7 s830 si11, 66)**: the g180m item 4 recipe (`SideStatusWoreOff` / `DisabledNoMore` hold 97 -> 92); `MoveUsedIsConfusedNoMore` shows the same shape. Pins: the end-turn side-status print pins.
4. **s2230 d20 (-21, 231 mass) and Struggle -17**: census press gate in `soundCensusRomReplay.ts` / `tools`, not an engine change (fch2m class). After fixing, expect item 7 -231 and, if d21 is the same gate, the item's Struggle row.
5. **Engine commit -> first message 9 .. 13 vs ROM 12** is unexplained (it makes the ±3 rows of item 8 and s6079 item 7); open s6079 d0 (`6079-d0.cmp.txt`: engine commit 9 / ROM 7, engine first message 9, ROM `BattleScript_EffectEarthquake` 6) before any change.
6. **Do not add a poison tick, Ice Beam or Rock Slide rule**: the three are inherited; the only direct engine moves of this step are 1, 2 and 3.

Gates: no `.ts` added (python only), so no typecheck; `npm test` / build not run (docs / tools step); `src/`, `tests/`, PROGRESS / ISSUES / ROADMAP and the acceptance / supervisor ledgers untouched.

## hse2: Scene OFF wake-up / confusion / Struggle heads (main/ts lane, 2026-11-22)

Three OFF presentation items, each its own commit, measured with `tools/audio/rescoreAll.sh` (OFF, then ON) on the same 24 OFF + 25 ON seeds. Evidence: `.integration/evidence/hse2/` (`t2-base`, `t2-i1..i3`, `lab-*`, `census/`, `table-off-new.txt`, `split-new.json`, `baton-scan.jsonl`; git-ignored).

| Step | Commit | T2 OFF mass | exact / offset | missing / extra |
|---|---|---|---|---|
| base (3dd105fbc) | | 1,819 | 725 / 408 | 0 / 0 |
| 1 wake-up: OFF uses the ON message hold and icon rule | d84490954 | 1,675 | 732 / 401 | 0 / 0 |
| 2 confusion head: OFF hold = 64 + 3 + 4 | 5be0a2c3b | 1,629 | 736 / 397 | 0 / 0 |
| 3 Struggle forced handoff 1 frame shorter (OFF only) | f660ee691 | **1,588** | **776 / 357** | 0 / 0 |

Scene ON did not move: 13,629 mass, 2,951 exact / 2,926 offset, 0 missing / 0 extra, before and after.

Labs (`labCompare.sh --scene off`, PRINTS mass; SUMMARY = sound rows):

| Lab | before | after |
|---|---|---|
| wkl1m-wakeup-player-off | 105 | 90 |
| wkl1m-wakeup-foe-off | 105 | 90 |
| hpf4m-confuse-off | 514 | 506 |
| enc276-struggle-off | 53 (SE exact 0 / offset 1) | 55 (SE exact 1 / offset 0) |

enc276: the hit-animation SE now lands on ROM frame 526; the used print row moves 1 frame the other way (PRINTS mass +2), which the SE row is worth more than. hpf4m-confuse-off's own 1323 turn is a self-hit turn and keeps 67; the rule applies to the non-hurt turns (frame 3396: 71).

Findings worth keeping:
- Item 3 first tried the shared hold (`NO_MOVES_DISMISS_HOLD_FRAMES` 9 -> 8): Scene ON moved +16 (13,629 -> 13,645), so it is OFF-only (`NO_MOVES_DISMISS_HOLD_OFF_FRAMES`, `forced.holdTotal`); ON's 9 is untouched.
- ROM rows behind the numbers: wake print -> status icon 82 (player) / 86 (foe), icon -> next print 4, confusion print -> used print 94 (ON 90). Pinned in `tests/hse2OffStatusHeads.test.ts`.

Census (seeds 0..199, both scenes, `lsd194Census.sh` + `rst197CensusDelta.py`, 3dd105fbc vs f660ee691): eventsDigest identical in both scenes, so no gameplay / RNG change.

Pins moved (each re-pinned after reading why):
- `tests/randomRoundSoak.test.ts`: seed-21 render calls 3,052 -> 3,054 (the OFF holds above); Baton Pass seed 16 -> 20 (the old seed's trajectory moved; `tools/soak/batonPassSearch.ts` candidates 20, 25, 27).
- `tests/sa125StatusAnimationCommand.test.ts`, `tests/sag130StatusSeGate.test.ts`: the ON-vs-OFF span comparison reads the OFF confusion print (hold 71) at the ON hold 67, since those tests check the status animation / SE gate, not the item 2 head (it left 46 / 34 unanchored spans against a limit of 34).

Ranking after hse2 (`hse1mSplit.py` / `hse1mTable.py`, OFF, 97 hit windows, owned mass 280): plain 61, Focus Punch 45, hit SE without used-print chain 35, two-turn 28, infatuation 28, Struggle after NoMovesLeft 27, confusion path 26, after miss 17, wake-up 13.

Still open (not done here): the asleep / wake print head -15 after a hit; infatuation (-3 rows, 28); Focus Punch (45); two-turn second turn (28). Out of scope and untouched: Scene ON rules, move-animation min 42, hit-animation interval.

## chg4: first charging turn after another action (main/ts lane, 2026-11-22)

Item 1 landed (commit 2ba5774f4); item 2 is explained by the same rule; item 3 is NOT landed (the rule is not uniform; finding below). Evidence (git-ignored): `.integration/evidence/chg4/` (`lab-*`, `t2-dig1`, `t2-seg`, `g180m-before` / `g180m-after`, `i3/`, `census/`).

**Item 1: the first charging turn of Dig / Fly / Solar Beam / Dive / Bounce / Skull Bash / Razor Wind / Sky Attack after another action in the same turn is an action-transition print.** Labs `tools/battle-lab/chg4-dig-lightscreen-{on,off}.json` (faster foe Light Screen, the player's Dig; Factory moves, overrides.parties). ROM rows (Scene OFF): MoveEnd 197 -> EffectSemiInvulnerable 204 -> charge box 215; the engine had the box at 197 (+18 over the old 0). Scene ON's chain already carries 2 of the rows and its box opens 8 rows before the printstring row, so ON takes -10 (`CHARGE_TURN_OPENER_SCENE_ON_ROWS`); the second ON instance (turn 3, no inherited +2) is the T2-fitted -10 (-8 would break the T2 -8 windows). Implementation: `isChargeTurnOpener` joins the accepted next prints of `actionTransitionPauseFrames` (`battleResolutionPresentation.ts`); the turn-start case is untouched.

| | before | after |
|---|---|---|
| T2 ON mass / exact / offset (0 missing, 0 extra) | 13,629 / 2,951 / 2,926 | 13,166 / 2,966 / 2,911 |
| T2 OFF mass / exact / offset (0 missing, 0 extra) | 1,588 / 776 / 357 | 1,552 / 776 / 357 |
| lab chg4-dig-lightscreen-on: SE 175, first / second Dig instance | -8 / -10 | 0 / -2 (SUMMARY mass 142 -> 30) |
| lab chg4-dig-lightscreen-off: used box row (ROM 215) | 197 | 215 (SUMMARY mass 42 -> 6; the labCompare print aligner mis-pairs OFF Dig rows, -60 / -114 / -42 are aligner artefacts, `--rows` shows the dug print 257 = ROM 257) |
| `g180mTwoTurn.py` summed window mass | 880 | 482 (the three s8108 Light Screen -8 windows gone) |

**Item 2: Sandstorm -> Dig extra -11 (s8108 si39) needs no rule of its own.** It was -19 with the rows the transition now carries and is -2 after (mass 95 -> 10): the same carried rows, one rule. Nothing separate landed.

Census (seeds 0..199, both scenes, `lsd194Census.sh` + `rst197CensusDelta.py`, fc2f7ce85 vs 2ba5774f4): eventsDigest identical 200/200 in both scenes (no gameplay / RNG change); 21 battles change command type sequence in each scene (the added transition pause). `tree/` copies deleted.

Tests: `tests/chg4ChargeTurnOpener.test.ts` (new; OFF Dig pause 18, OFF Solar Beam 17, ON Dig 8; ROM rows 197 / 204 / 215 above). Pins moved: `tests/randomRoundSoak.test.ts` Baton Pass seed 20 -> 24 (scan candidates 24, 25, 27) and winning carry seed 0 -> 19 (carry 14 on 19, 37, 46); both because the new pause shifts the soak's press phases (no assertion changed). bdt1 / chg1 / chg2 / chg3 charge-turn pins, `tests/lbrd.test.ts`, the 166 test files importing `battleResolutionPresentation`, `npm run typecheck`, `npm run test:gate` (360 files) and `npm run build` are green.

**Item 3 (t68m recipe 1, continuation segment lead): not landed, not uniform.** s830 d1 lab (`i3/on/830-d1.cmp.txt`): ROM Ice Beam printstring at commit + 12 (EffectFreezeHit +6, u = 6), engine first message at 0 (the Scene ON locked-action continuation segment is appended with no confirm walk, `appendBattleResolutionLockedActionContinuation`, `sceneOffWalk` is OFF-only, and `usedMovePrintLeadU` reads `segments[0]` in ON). Trial: run the same confirm walk in ON (`sceneOffWalk` without the hitMarker test) and read `segments[segmentIndex]` in `usedMovePrintLeadU`: s830 d1 becomes exact (message 13 = ROM 12 + 1, SE 183 at 71 = 71), but the other seeds that have such a segment disagree.

| ON seed (first-row segments) | T2 mass before -> trial | Window |
|---|---|---|
| s830 | 487 -> 375 | d1: exact |
| s8108 | 1,294 -> 1,173 | gains |
| s165 | 876 -> 958 | d11: the player's Psybeam misses; the used print is exact (13 = ROM PrintMoveMissed + 1) but the foe's next Double Team SE lands +17 (was +4): the engine's miss tail after the print already carries a lead |
| s310 | 936 -> 1,007 | d10: the foe's own unleash Solar Beam goes first; print exact (19 = 18 + 1) but its SE 201 112 vs ROM 95 (was -2): `twoTurnSecondPrintLead` / the unleash chain already carries the 17 |
| s6 | 221 -> 227 | small |
| total | ON 13,166 -> 13,092, OFF unchanged 1,552 | |

The trial is net -74 ON but two of the five windows get worse because the miss tail and the unleash chain already contain the ROM's wait, so the rule needs a per-chain split (first print of a plain hit only), which is not "uniform over the windows checked" and was not landed. Next step for whoever picks it up: apply the walk only when the segment's first print is a plain hit (not `MoveMissed`, not a locked unleash), then re-lab s165 d11 and s310 d10 and re-run T2 ON (s830 -112, s8108 -121 are the available mass).

Out of scope and untouched: the hie6m send-in lead, the Leech Seed drain, move-animation min 42 / hit-animation interval, the Open Level files.

## hie7: the segment after the player's forced send-in starts on the ROM row (integration lane, 2026-11-22)

Cause (one, in two layers; no per-family offset). After a player faint send-in, the orchestrator's `presenting-switch-in` phase ends at `partySendOutBattleMenuReady`, i.e. the action prompt at B + D + 17 (B = 91 + name length). The ROM's script continues at B + D + 11 (item exec / next print), so every continuation started 6 frames late (hie6m / g180m / t68m). Separately, the held-item restart lead (15) and the Leech Seed drain age (`LEECH_SEED_DRAIN_SCRIPT_AGE` 7) model a controller launch lag that does not exist here (the controller is idle after the send-in): ROM exec -> SE is 8 for the item (150 + 8 against the command's 214 + 15 minimum) and 27 for the drain (34 in the labs).

Fix:
1. `playerFaintReplacementSendOutTimingOfSegment` (`battleResolutionPresentationRender.ts`): a segment that continues after the send-in with anything but the bare prompt (a lone `turn-end` and the pau5 entry-script case keep their own leads) gets `followingFrames` 6 (`PLAYER_FAINT_REPLACEMENT_SCRIPT_RESUME_LEAD_FRAMES`), so the next command starts at B + D + 11.
2. The command built right after a player `BattleScript_FaintedMonSendOutNew` send-in (`battleResolutionPresentation.ts`, `playerSendInEnd`) carries the context: the held-item lead is `HELD_ITEM_EFFECT_AFTER_SEND_IN_LEAD_FRAMES` (0, against `HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES` 15 elsewhere) and the Leech Seed drain command gets `afterPlayerSendIn: true`, which `moveAnimSounds.ts` reads as age 0 instead of 7. `LEECH_SEED_DRAIN_SCRIPT_AGE` stays 7 globally (it moved to the Render file only to avoid an import cycle; `moveAnimSounds` re-exports it). The chg4 charge-turn print regions are untouched.

T2 (`rescoreAll.sh` + `soundScoreboard.py`, `.integration/evidence/hie7/t2-{base,after}`):

| Scene | mass | exact / offset | missing / extra |
|---|---|---|---|
| ON before | 13,629 | 2,951 / 2,926 | 0 / 0 |
| ON after | **12,942** (-687) | 2,994 / 2,883 | 0 / 0 |
| OFF before | 1,588 | 776 / 357 | 0 / 0 |
| OFF after | 1,588 (unchanged) | 776 / 357 | 0 / 0 |

ON by family: move-animation SE 10,852 -> 10,165; stat-change 323, cry 643, battle-controller 1,759, bgm 52 unchanged. More than hie6m's expected -285: the start shift (-6 per resume), the item lead and the drain age all land in the same windows (start shift alone: `t2-s1`; start + the rest: `t2-s2` = final).

ROM rows (`hie6mWin.py` on hie7 copies of the probes, `p-{base,after}`; `g180mProbe.sh`'s `hcr3mCmp.py` for s6912):
- s5063 d45: engine HELD_ITEM_EFFECT command 284 -> 278 (min 229 -> 214; ROM item exec row 281), SE 152 now at 286 against ROM 289 (-3, carried from the earlier ball SE, not the item).
- s2230 d6: engine item command 312 -> 306 = ROM exec row 306; SE 152 x3 / 228 / 102 at 314 / 346 / 378 / 410 / 482 = ROM, all exact (before: +21 each).
- s6912 d2: drain command 239 -> 233 = ROM exec row 233 (BattleScript_LeechSeedTurnDrain+0x7); SE 180 at 260 (was 273), the eight SE 142 rows 278..320 step 6 and SE 179 at 373 all equal to ROM. The later hp / message / turn-end rows (451 / 481 / 485 / 596 against ROM 465 / ... ) are the end-turn print heads, out of scope.

Labs (`labCompare.sh --scene on --reuse-rom`, `.integration/evidence/hie7/lab-*`): hie1-leftovers-on -1 (mass 5), hie1-sitrus-on 0, hie1-shellbell-on -1 (mass 5): unchanged; etp1-leechseed-on, aud250-leechseed-opponent-on, aud250-leechseed-player-on 25 / 25 exact, mass 0: unchanged.

Census 0..199 (`lsd194Census.sh`, `LSD194_SHARDS="0 1"`, JOBS 2, SPLIT 2, fc2f7ce85 vs f8d68ea67; `.integration/evidence/hie7/census`, tree/ copies deleted): `rst197CensusDelta.py --digest` eventsDigest + error identical 200 / 200 on ON (9 battles changed command timing, 0 type-sequence changes) and 200 / 200 on OFF (0 changed). No gameplay / RNG change.

Pins moved: `tests/randomRoundSoak.test.ts` seed 0 "full" frames 68,945 -> 68,927 (three post-send-in script resumes x 6; same battle 3 / depth 2 / turn 21 / roundLost; a trajectory pin, now matching the ROM exec rows s5063 d45 / s6912 d2 / s2230 d6 above). New `tests/hie7SendInResume.test.ts` pins the timing lead, the item lead 0 / 15 and the age 7.

Caveats for the supervisor: the drain's renderer body start follows the same flag (21 -> 14 frames after the command start in this context, so the picture matches the sound); this is not pixel-measured, only the SE rows are ROM-measured. If a pixel capture says otherwise, `leechSeedDrainBodyStartAge` is the one place to change. Residual after hie7: s2741 d11 (mass 62, a message chain), the 5063 d45 -3 above, the end-turn print heads.

## t2k4 (2026-11-22): the remaining S11 sound-timing mass re-ranked on fold-a + hie7 (measurement only; no `src/` / `tests/` change)

Tree: `8febdabd5` (fold-a = master + hit1 / tri1 / sst1 + hse2 + chg4 + hie7). Method as t2k3 (`rescoreAll.sh` per scene into `.integration/evidence/t2k4/t2`, `soundScoreboard.py --per-seed`, a second `--cmdtrace=1` replay of every seed (`c/`), `t2Attribute.py` alignment + ROM `gCurrentMove`, windows own the rows from one nonzero offset step to the next, `hcr3mProbe` / `hcr3mCmp` for the probed windows). The t2k3 analysis scripts are now committed, parameterised by `T2K4_DIR`, in `tools/integration/t2k4/` (`attr.py` -> `agg.py` / `shape2.py` / `step.py` / `gain.py` / `own.py`; new `win.py SCENE GROUP [N]` lists the owned windows of a group; `probe.sh SEED SCENE DECISION [SPAN]`). Evidence (git-ignored, main tree): `.integration/evidence/t2k4/` (`t2/`, `c/`, `attr-{on,off}.json`, `agg.txt`, `shape2.txt`, `step.txt`, `gain.txt`, `own.txt`, `own-full.txt`, `w-*.txt`, `p/{on,off}/` probes + `*.cmp.txt`). Decision index of a window = segment index // 2 (`si 11` = decision 5).

### 1. T2 on this tree (missing / extra 0 / 0 in both scenes)

| scene | mass | exact / offset | move-animation SE | stat | cry | battle-controller | bgm |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ON (25 seeds) | **12,479** | 3,009 / 2,868 | 9,718 | 323 | 643 | 1,743 | 52 |
| OFF (24 seeds) | **1,552** | 776 / 357 | 0 | 161 | 319 | 1,053 | 19 |

Against the task's expectation (ON 12,942 / OFF 1,552): OFF is equal. ON is **-463 lower, exactly chg4's ON gain** (chg4 13,629 -> 13,166, hie7 measured 13,629 -> 12,942 on a base without chg4; 13,166 - 687 = 12,479). So the hie7 "after" figure did not include chg4; this tree has both. Against t2k3 (frozen 30cd3dfac): ON 14,435 -> 12,479 (-1,956, -13.6 %), exact 2,935 -> 3,009; OFF 2,040 -> 1,552 (-488, -23.9 %), exact 725 -> 776. The ON ranking classes sum to TOTAL: body 6,311 (incl. B4 274), gen 3,407, controller chain 904, controller hit 839, cry 643, stat 323, bgm 52; OFF: controller hit 631 + chain 729 + stat 168 + bgm 19 + SE 90 5 = 1,552 (OFF family table above splits it by sound kind).

### 2. Ranked top 10 (rows owned disjointly by window; items + B4 + remainder = TOTAL)

Recipe status: **M** = a measured recipe exists, **new** = first measured here, **inh** = inherited from the previous command, no rule of its own.

| rank | item | scenes | mass ON / OFF | windows | rule of its own? | recipe status | files / lines a landing touches | expected mass |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Faint / send-in chain: SE 15 ball 500 / 392, SE 16 + cry@faint 465 / 126, SE 114 party-summary 363 / 211 | ON + OFF | 1,328 / 729 (2,057) | 127 / 89 | mostly inherited: ON 722 of 1,328 starts from a carried offset (hit -49 / -15 / -6 ...); the OFF cliff +13 .. +17 is 8 windows / 218 mass (3 / 40 in ON) = the harness A gate | cliff: **M** (fch2m: `soundCensusRomReplay.ts` `dismissAccept` default when `--romdrive`, OFF -199 / ON +83, not flipped); rest **new**: Earthquake KO (below) | tools only for the cliff; the KO drain in `battleResolutionPresentation*.ts` hp command | cliff OFF -200 (ON +83 until the hit-SE interval is fixed); KO window -70 |
| 2 | Hit SE 12 / 13 / 14: ON 747 (178 windows, 640 carried), OFF 631 (114 windows, 602 from a clean offset) | ON + OFF | 747 / 631 (1,378) | 178 / 114 | OFF: yes, two of them: **Brick Break screen-break `move-animation` +63** (126, 2 windows, new, below) and the plain -3 / -4 / -9 / -13 steps (hit-animation 274, move-animation 193); ON: inherited (after Psychic 151, Confusion 115, Triple Kick 77, Struggle 52) | Brick Break **new**; OFF plain steps: **M** hse1m (+ hse2 landed three of its rows; Focus Punch 45, two-turn 28, infatuation 28 remain); ON weather tick -8: **M** hse1m ON (not landed) | `battleResolutionPresentation.ts` (the Brick Break used-print / screen-break `move-animation` min 112 -> 45; commands list in 5) | Brick Break -126 OFF; the rest per hse1m rows |
| 3 | Held-item group gen:152 / 228 / 102 (Leftovers / berry) | ON | 1,210 / 0 (69 windows, 345 rows, 11 seeds, 25 exact) | 69 | no: the post-send-in +21 is landed (hie7: s2230 d6 exact); the rest is signed scatter after hits / end-turn (-14 after `hit-animation` x2 = 170, -9 after the SE-90 / stat rows x2 = 110, +1 after a -24 carried offset 115) | inherited; hie6m: 1,315 of the group is the preceding hit / print / status command | none of its own; move with items 2 and 4 | 0 on its own (collapses with the hit-SE and end-turn print heads) |
| 4 | gen:180 chain (Leech Seed drain) and the gen:202 / 142 rows it owns | ON | 890 / 0 (17 windows, 10 exact) | 17 | partly: (a) s6912 d5 **+17 after Recover** (170): drain command 10 late (the Recover hp / message tail: hp cmd 477 vs ROM 458, message hold 88 vs 98) **plus the age 7** the drain keeps outside the send-in context (SE 180 at ROM exec + 27, engine command + 34); (b) s310 si33 -12 (120) end-turn print head; (c) s310 si27 / 29 / 31 -1 x10 each (210) carried +8 from the gen:202 row before | (a) **new** (the same lab-lag-7 / T2-lag-0 question as g180m 6, now with a measured context); (b) **M** g180m recipe 4 (`SideStatusWoreOff` / print-head hold 97 -> 92, not landed); (c) inherited | `moveAnimSounds.ts` drain age (`LEECH_SEED_DRAIN_SCRIPT_AGE` / the `afterPlayerSendIn` flag from hie7), `battleResolutionPresentationRender.ts` restore-HP tail rows | (a) -170, (b) -120, (c) -210 |
| 5 | Ice Beam first-mover windows | ON | 517 / 0 (7 windows, 0 exact) | 7 | no: s2230 d20 -21 (231) is the census press gate (t68m recipe 4, fch2m class); s830 d1 -13 (156) is **chg4 item 3 narrowed** (continuation-segment first print, plain hit only); s830 d5 -6 (66) side-status print hold | all three **M** (t68m recipes 4 / 1 / 3) | tools; `usedMovePrintLeadU` (`battleResolutionPresentation.ts` ~7057) | -231 tools, -156 with chg4 item 3 narrowed (net -112 measured), -66 |
| 6 | Rock Slide body | ON | 514 / 0 (8 windows, 122 rows) | 8 | no: inherited (s8612 -13 after Belly Drum 180, s165 +1 after a +4 hit-SE carry 100 ...) | inherited (t68m 3) | none | 0 on its own |
| 7 | Recoil family: Double-Edge 245 + Struggle 235 | ON | 480 / 0 (24 windows) | 24 | Struggle: s2230 d21 -18 (90) and s7295 d8 -11 (55) from a clean start = the first-mover gate / OFF-style print lead; Double-Edge: carried -16 | Struggle first row: **new** (s2230 d21 is next to the d20 press gate: probe after the tools fix); Double-Edge inh | `battleResolutionPresentation.ts` (Struggle lead) | about -145 |
| 8 | gen:148 poison / status tick, first row | ON | 462 / 0 (17 windows) | 17 | no: five inherited classes (t68m 1); the largest (s499 d3 -1 after a -11 carried, s165 d22 -9 after a foe `switch-in` tail 54) | **M** t68m item 6 (class C `switch-in` tail -9) | `battleResolutionPresentationRender.ts` `switch-in` tail | -54 (class C) |
| 9 | Two-turn second family: Solar Beam 241 + Dig 196 | ON | 437 / 0 (18 windows) | 18 | partly: s97 d9 -13 x2 (91 + 26) first-charging-turn lead on a clean start (the chg4 print region is another case: this one is Solar Beam after a hit); s830 d10 +18 (24) after Giga Drain | **M** chg4 item 3 + hit1 Open "lead-body sound clock" do not cover the s97 -13 pair: **new** | `battleResolutionPresentation.ts` charge-turn print (`isChargeTurnOpener`) | -117 |
| 10 | stat SE 239 / 245 / 23 / 24 | ON + OFF | 233 / 168 (401) | 53 / 34 | inherited (stat rows after a hit step) except OFF s4235 d2 +17 (the press gate) | tools (fch2m class) | none | OFF -39 |
| | **Items 1-10** | | **6,818 / 1,528** | | | | | |
| | B4 bodies (reported separately) | ON | 274 / 0 | | | | | |
| R | remainder (about 100 bodies / groups, each < 220; also gen:242 200, Confusion 217, Focus Punch 219, Calm Mind 216, Double Team 210 ...; cry 52, bgm 51 / 19, SE 90 28 / 5) | ON + OFF | 5,387 / 24 | | | | | |
| | **TOTAL** | | **12,479 / 1,552** | | | | | |

Sum-check: ON 1,328 + 747 + 1,210 + 890 + 517 + 514 + 480 + 462 + 437 + 233 = 6,818; + 274 + 5,387 = 12,479. OFF 729 + 631 + 168 = 1,528; + 24 = 1,552. Counts are row mass, not saving (one step's gain is 30-60 % of it, `gain.txt`).

**Which items have a measured recipe.** hse1m: the OFF hit-SE interval rows (partly landed by hse2) and the ON end-of-turn weather tick -8 (s8108 / s2741; gen:219 131 and gen:242 200 still carry it); g180m: item 4 print-head hold 97 -> 92 (s310 si33), item 5 weather age 8, the drain age (now partly hie7); t68m: recipes 1 (= chg4 item 3 narrowed, net -74 ON measured, -112 s830 + s8108 available), 3 (side-status hold) and 4 (press gate); hit1 Open: Future Sight's hit -14 and the hail damage SE +4 (neither owns a window above 30 mass on this tree: not worth a step now), the lead-body sound clock (touches Double Slap / Fury Swipes hit 1, no top window). **New this step:** Brick Break OFF +63 (rank 2), the Recover -> drain +17 context (rank 4a), the Earthquake KO hp drain (rank 1), s97 d9 Solar Beam -13 pair, Struggle first row after the press gate.

### 3. The probed windows (ROM `hcr3mProbe` + engine `--cmdtrace`, frames from each side's commit)

1. **OFF s6568 d31 (+63, SE 14 @`message`, rf 18207; the s319 d16 SE 12 window is the same move, Brick Break, +63).** ROM: Brick Break `BrickBreakAnim+0x0` 45, `Pausex20` 46, the wall-shattered print `+0x10` 82, `BrickBreakDoHit+0x0` 166, SE 14 168. Engine: `message` 0.0 at 10, **`move-animation` cmd 0.1 at 37 with min 112**, `message` cmd 0.2 at 149, `hit-animation` 0.3 at 232 with SE 14 at 231. The print -> hit interval is right (ROM 82 -> 166 = 84, engine 149 -> 232 = 83); the `move-animation` before it is 112 against the ROM's 45 -> 82 = 37 (+8 head): the engine gives the screen-breaking Brick Break the full OFF body min and then the message, the ROM prints at once. One rule of its own, two windows, +63 each (126 mass; exact: 63 -> 0). Where the 112 comes from was not found in the time (no Brick Break match in `battleResolutionPresentation.ts` beyond the c-lead table at 2245 / 6310; start with the OFF `move-animation` min for a `removelightscreenreflect` event).
2. **ON s6912 d5 (+17, gen:180 after Recover, rf 4098).** ROM: Recover `BattleScript_EffectRestoreHp+0x16` print 458 / hp 94 at 521 / print `+0x1b` 522, `MoveEnd` 612, `LeechSeedTurnDrain+0x7` exec 621, SE 180 648, SE 142 x8 666 .. 708, SE 179 761. Engine: hp cmd 0.9 at 477, message 0.10 542 (min 0), sprite-visibility 630, `general-animation` LEECH_SEED_DRAIN cmd 0.12 at **631** (+10), SE 180 665 (+17), SE 142 683 .. (+17), SE 179 778 (+17). Two terms, both inherited from other rows: the restore-HP tail ends 10 late (hp 19 late, message hold 88 vs ROM 98), and the drain keeps its age 7 (ROM exec -> SE 180 = 27, engine command -> SE 180 = 34) because hie7's no-lag rule is flagged only after a player send-in. The ROM interval is the same in both contexts, so the age 7 is not a launch lag of the send-in path; the open lab-lag-7 / T2-lag-0 question of g180m 6 now has its second T2 context. Not landed.
3. **ON s648 d0 (+34 / +35, cry@faint / SE 16, rf 738).** Earthquake hit-all KO of the foe: ROM SE 13 572, hp update exec 723 (hp 146 -> 0), `FaintTarget` 731, SE 16 798; engine SE 13 573, `hit-animation` 573 (min 35), **hp cmd 608 (146 -> 0)**, faint `message` 762 (+31), SE 16 833 (+35). SE 13 -> message is 150 on the ROM and 189 on the engine: the engine runs the hit blink (35) and then a 154-frame drain where the ROM's drain is 112 from the end of a 35-frame blink. Ordinary hits agree to a frame (s6912 d5: hp 137 -> next 228 = 91 vs ROM 90), so this is the long full-bar KO drain after a hit-all (Earthquake after a Dig turn of the foe), not the A press. Root cause (hit-all KO drain length vs `hp` command `min`) not found; one window, 70 mass; the other `cry:@faint` windows (s8108 d50 96, s6 d3 +23 46) are carried offsets or a Giga Drain KO.

### 4. Windows that are not engine rules (harness / carried)

- **Press gate (tools only), ON + OFF 321 + 218:** s2230 d20 Ice Beam -21 (231) and d21 Struggle -18 (90) = the census A gate; the OFF cliff +13 .. +17 (8 windows, 218); stat s4235 d2 +17. One tools change (fch2m recipe 1) takes about OFF -200 and shows the ON +83 (SE 16 early after the hit-SE interval).
- **Carried offsets:** 640 of the 747 ON hit-SE mass and 722 of the 1,328 ON chain mass start with a nonzero previous offset; they move only when the preceding body / hit command is fixed.

### 5. Engine commands behind the probed windows

| window | ROM script rows | engine command | file |
| --- | --- | --- | --- |
| Brick Break OFF | `EffectBrickBreak+0x9`, `BrickBreakAnim+0x0` 45 / `+0x10` 82, `BrickBreakDoHit` 166 | `move-animation` min 112 -> `message` -> `hit-animation` | `battleResolutionPresentation.ts` (the OFF `move-animation` command build, 5911-6250) |
| Recover -> drain ON | `EffectRestoreHp+0x16` / `+0x1b`, `MoveEnd`, `LeechSeedTurnDrain+0x7` | `hp` 0.9, `message` 0.10, `general-animation` LEECH_SEED_DRAIN 0.12 | `moveAnimSounds.ts` (drain age), `battleResolutionPresentationRender.ts` (hie7 `afterPlayerSendIn`, restore-HP tail rows) |
| Earthquake KO ON | `DoHitAllWithUndergroundBonus+0x13`, `FaintTarget+0x0`, `+0x7` | `hit-animation` 0.7, `hp` 0.8 146 > 0, faint `message` 0.9 / `faint` 0.10 | `battleResolutionPresentation.ts` hp / hit-all tail |

### 6. What not to chase

- The 5,387 ON remainder (about 100 groups, each < 220) and the held-item scatter (1,210): inherited; fix the preceding commands.
- ON hit-SE 640 and chain 722 carried mass: do not add per-family offsets; the rows follow when the hit / print head before them is fixed.
- Rock Slide (514), gen:148 first row (462), Double-Edge (245): inherited from the previous move, no rule of their own (t68m).
- The press-gate windows (321 + 218 + stat s4235): a tools decision (fch2m recipe 1), not engine work; land it once and re-rank (it shows the ON +83).
- B4 bodies (274, reported), Future Sight's hit / hail damage SE (hit1 Open; no window over 30 mass here), gen:219 / gen:242 weather rows until the hse1m weather tick is done once.
- A `LEECH_SEED_DRAIN_SCRIPT_AGE` global change (g180m 6: ON drain mass 1,028 -> 1,677): the drain age is context (send-in, after Recover), not a constant.

Not applied: no `src/` or `tests/` change; PROGRESS / ISSUES / ROADMAP and acceptance / supervisor ledgers untouched; no `.ts` added (python / shell tools only), so no typecheck / `npm test` / build; the evidence replays are the gates.

## drv2 (2026-11-22): the T2 replay presses where the ROM drive pressed; two harness gates removed (tools only; `src/` and `tests/` untouched)

Scene OFF (:8014). Evidence (git-ignored, main tree): `.integration/evidence/drv2/` (`t2-base/` = fold-a tree before, `t2-after/` = dismiss-accept default, `t2-after2/` = + forced anchor fix, `score-{base,after,after2}.txt`, `attr2-{on,off}.json` + `delta2-{on,off}.txt` per-window before / after, `pr/p/` probes). ROM files = `t2n` (unchanged). New tools: `tools/audio/romForcedAnchorFix.py`, `tools/integration/drv2/delta.py ATTR.json DRIVEDIR SCENE` (per window the rows that got worse / better; build ATTR with `t2Attribute.py` once per rescore dir, the ROM drive of each).

### 1. Tools changes

1. **Dismiss-accept is the default with `--romdrive`** (`soundCensusRomReplay.ts`, fch2m recipe 1): the census driver presses a button message from its first acceptable frame, as the ROM pulse does. Opt out: `--dismiss-accept=0` / `ROM_REPLAY_DISMISS_ACCEPT=0` / `AUD249_DISMISS_ACCEPT=0` (the old awaiting-only gate; reproduces t2k4 exactly: ON 12,479 / OFF 1,552). Without `--romdrive` the gate is unchanged.
2. **Forced-move ROM anchors move to the accepted press** (`aud249Rescore.sh` runs `romForcedAnchorFix.py` on the copied drive; `AUD249_FORCED_ANCHOR=0` keeps the driver's). `romDecisionDriver.py` closes a forced decision (Encore / Struggle, FIGHT commits) on its first A, but the ROM can still be in the previous end-of-turn script (s2230 d20: `DisabledNoMore` end2) and ignores that press; the 17-frame pulse is accepted later (SE 5). Engine and ROM segments both start at "the press taken", so the ROM segment was early by the gap and the whole window read engine-early. This is what t68m / t2k4 called the s2230 d20 / d21 "census press gate": it is **not an engine press** (delaying the engine's press cannot change a segment-relative offset), it is the ROM anchor. Moved anchors: ON s2230 d20 +19, d21 +13; OFF s2230 d20 +5, d21 +12 (every other forced anchor of the 49 seeds has its SE 5 on the commit frame, +0, and is untouched). The T2 files on disk are not rewritten (fix is applied on the rescore copy); `aud248RunSeed.sh` fresh ROM runs still write the driver's anchor.

### 2. T2 (missing / extra 0 / 0 in both scenes, 49 seeds)

| scene | mass base -> dismiss default -> + anchor fix | exact / offset base -> after | battle-controller | cry | bgm | stat |
| --- | --- | --- | --- | --- | --- | --- |
| ON (25) | 12,479 -> 12,494 -> **11,949** (-530, -4.2 %) | 3,009 / 2,868 -> 3,006 / 2,871 | 1,743 -> 1,692 | 643 -> 660 | 52 | 323 |
| OFF (24) | 1,552 -> 1,353 -> **1,348** (-204, -13.1 %) | 776 / 357 -> 781 / 352 | 1,053 -> 922 | 319 -> 263 | 19 -> 2 | 161 |

**New T2 baseline: ON 11,949 (3,006 / 2,871), OFF 1,348 (781 / 352).** The ON +83 of fch2m is +15 net here (hie7 / chg4 moved two of its three un-hidden windows): +51 in one window against -36 in four.

### 3. The named windows (offset base -> after)

| window | before | after | cause |
| --- | --- | --- | --- |
| ON s2230 d20 Ice Beam (17 rows, 323 mass) | -21 (SE 12 -22, Disable body -24) | **-2** | ROM anchor gate (item 2); the -2 left is the forced-commit constant of every forced window |
| ON s2230 d21 Struggle / Encore (16 rows, 222 mass) | -18 / -16 / -15 / -14 | **-1 / +1 / +2 / +3** | same; +1 .. +3 is the carried Struggle hold of hse1m |
| OFF s2230 d20 / d21 | -8 / 0 | -3 / 0 (d21's engine dismiss now lands on the ROM's real dismiss A: both sides moved 12, net 0) | same |
| OFF stat s4235 d2 (SE 239 +17; ON the same chain +15 .. +19) | +17 | **+17, not a press gate** | an engine window, below |

**s4235 d2 is an engine rule, not the A gate** (probe `pr/p/off/4235-d2.cmp.txt`): a Focus Band survive on the player's Pokemon. ROM: hp drain 115 -> 123 (8 frames, 8 -> 1 of 159), `FocusBandActivates` 127, `Pausex20`, print 162. Engine: `hp` cmd 0.3 at 115 with **min 28** (ends 143), Focus Band `move-animation` 0.4 min 40, `message` 0.5 at 183: the print is 21 late (ROM 47 after the hp start, engine 68), then -3 later, +17 at SE 239 (print 367 vs 385 = +18). The next engine step: the `hp` command's minimum for a small drain that leaves 1 HP (8 -> 1 of 159: 28 against the ROM's 8 + 4). Not landed.

### 4. Windows that got worse (the three that fch2m un-hides; engine command probed with `tools/integration/t2k4/probe.sh`, frames from each side's commit)

All three are the ROM pulse missing the box by 1 .. 6 frames while the engine, 3 .. 6 frames earlier upstream, is ready at the pulse and takes it: the SE 114 / SE 15 pair goes 0 -> -17.

1. **OFF s97 d13 (+51: SE 114, SE 15, cry@faint 0 -> -17).** The engine's SE 13 -> SE 16 chain is 6 early from the second move's used print: ROM `BattleScript_ItemHealHP_Ret+0x1a` hp 301 -> `MoveEnd+0x6` 302 -> `EffectBurnHit` 307 -> print `HitFromAtkString+0x1` 313; engine `hp` 0.8 (Leftovers 47 > 49) at 302 -> `message` 0.9 at **308**: the used-print head after a held-item heal is 6 against the ROM's 12 (SE 13 378 vs 372, SE 16 538 vs 532). Engine command: the segment's `message` after the Leftovers `hp` command (hie5 / hie7 class: print head after a held-item heal in the next move's segment), `battleResolutionPresentation.ts`.
2. **ON s3738 d57 (+51: SE 114, SE 15, cry 365 0 -> -17).** Poison tick KO: ROM SE 148 first row 622, engine `status-animation` PSN 0.12 at 617 (-5, spacing 14 both), `hp` 7 > 0 688, `faint` 698, SE 16 768 vs ROM 772 (-4). Engine command: the end-of-turn `message` 0.10 / 0.11 -> `status-animation` PSN head (t2k4 rank 8 / t68m item 6 class C, gen:148 first row).
3. **OFF s6568 d104 (+17: SE 15 -3 -> -20).** Last Struggle turn; SE 16 exact (505), engine `switch-out` 0.16 at 543 -> SE 15 at 565, ROM SE 15 585 (80 after SE 16 against the engine's 60): the faint `message` 0.13 box is taken by the engine on the pulse the ROM did not take. Engine command: `message` 0.13 (faint box, `switch-out` follows); the engine is ready 1 .. 3 frames before the ROM's accept frame (not opened further).

### 5. Gates

- Census path unchanged: `lsd194Census.sh` seeds 0..19, `7b8861ed6` vs `HEAD`, both scenes: `rst197CensusDelta.py --digest` ON 20/20 identical (7,146 commands), OFF 20/20 identical (6,942), byte-identical shards (`soundCensusRomReplay.ts` is not imported by the census orchestrator).
- The 11 `tests/` files that import `soundCensusRomReplay.ts` (`grep -l soundCensusRomReplay tests/*.test.ts`; they replay without `--romdrive`): 11 files / 46 tests pass (2 workers). `npm run typecheck` green.
- Not run (assigned): the full `npm test` (two other workers share the machine) and `npm run build`; no `src/` or `tests/` change.

## bbk1: Brick Break through a screen (OFF), the OFF asleep print head, chg4 item 3 narrowed (main/ts lane, 2026-11-22)

All three landed (commits a5d7e4d7b, 092b01639, 8accfc5b0; typecheck fix + soak re-pin after). Evidence (git-ignored): `.integration/evidence/bbk1/` (`lab-*`, `t2-*`, `score-*`, `census/`). T2 start on master: ON 11,911 / OFF 1,348.

| item | rows matched | labs before -> after | T2 ON | T2 OFF |
|---|---|---|---|---|
| 1 Brick Break OFF (`bbk1-brickbreak-{lightscreen,reflect,none}-{on,off}`) | used print 25, OFF body 46 (was 112: it counted the wall print's own waitmessage), wall print 86 = 19 glyphs + 64 + 3 (`BrickBreakAnim+0x10`, ROM used 208 -> print 278 -> SE 14 363) | both OFF screen labs: SE mass 126 -> 0 (exact); no-screen OFF unchanged | 11,911 -> 11,880 (-31) | 1,348 -> 1,222 (-126, exact 781 -> 783) |
| 2 OFF asleep print head (`wkl1m-wakeup-{player,foe}-off`) | `BattleScript_MoveUsedIsAsleep+0x3` print 929 / 1651 (foe lab 925 / 1647): the sleep-counter write kept `sceneOnStatusFrames` null in OFF, so no transition pause; it now carries the OFF `status` command's 1 frame, and `STRINGID_PKMNWOKEUP` is a transition print in both scenes | asleep prints -15 -> 0, SEs +0, SUMMARY mass 0 | 11,880 (unchanged) | 1,222 -> 1,203 (-19, exact 784) |
| 3 chg4 item 3 narrowed | s830 d1 Ice Beam printstring at commit + 12 (SE 183 71 = 71): ON continuation after the foe's charging turn runs the confirm walk when the first print is the player's own damaging hit (not the locked battler's unleash, no miss) | s830 d1 -13 -> exact; s165 d11 (miss) and s310 d10 (unleash) excluded, unchanged | 11,880 -> 11,750 (-130; only seed 830 moves, 487 -> 357; every other ON seed identical) | unchanged |

Totals: **ON 11,911 -> 11,750 (-161), OFF 1,348 -> 1,203 (-145), 0 missing / 0 extra both scenes.** Gates: census 0..199 (`d5157ab74` vs `HEAD`) eventsDigest identical 200/200 both scenes (one battle each with changed command timing); all 183 `tests/` files importing `battleResolutionPresentation` green; `npm run typecheck`, `npm run test:gate` (360 files / 2,835 tests) and `npm run build` green.

Not landed / left: Brick Break ON labs keep small residuals (body +1 row; the lightscreen-on own SE +1 on top of Light Screen's +2); the ON rule for item 3 is a plain damaging hit only, a first print that is a status move is untouched (no T2 window owns one). Re-pin: `tests/randomRoundSoak.test.ts` seed 0 `full` 68927 / battle 3 / depth 2 / turn 21 -> 40465 / battle 2 / depth 1 / turn 24 (the exploring policy plays Brick Break through a screen; with the wall-print code off the old pin passes), a trajectory pin, not a ROM frame. Pre-existing, not mine: `tests/audioProbeFixtures.test.ts` 3 failures (hit2 fixtures mode `hybrid` vs expected `step`, fixture list differs by 2; same on the tree before bbk1, not in the gate).

## etp3 — Scene ON Hail / Sun end-turn SEs, side-status wore-off print head

Tree: fold-a `8ed6d8a58` (master + hie7 + t2k4) + two commits (item 1 `6cc636f80`, item 2 `09b2432cf`). Method: `labCompare.sh` (both scenes) before / after each item, then `rescoreAll.sh` + `soundScoreboard.py` per scene on the 25 ON / 24 OFF t2n seeds. Evidence (git-ignored, main tree): `.integration/evidence/etp3/` (`lab-base-on`, `lab-hail-on`, `lab-ls`, `lab-sw1`, `t2-base` (ON), `t2-hailsun`, `t2-sw1`, `score-*.{txt,json}`, `census/`, `t2k/p/on/{310-d16,648-d6}.cmp.txt`). New labs (`tools/integration/etp1MakeLabs.py`): `etp3-sandstormu3` (a Sandshrew, immune, moves first), `etp3-{lightscreen6,reflect6}` (screens expiring on turn 5), `etp3-{lightscreenls6,reflectls6}` (the same plus the foe's Leech Seed: the wore-off print followed by the drain).

**Item 1 — the damaging-weather tick: no rule left, but Hail / Sun were 8 rows late (landed).** The Sandstorm tick is already exact: SE_M_SANDSTORM plays on the body's own clock since sst1, the weather-loop hit SE is pinned by etp2 (3 ticks after the hit command), and `etp3-sandstormu3` (the immune first mover: the first damaging pass is skipped, the buffeted print comes at the second battler's lead) is SE mass 0 / 19 rows. The s8108 / s2741 "weather tick -8" of hse1m was measured before sst1: on this tree SE 219 is at command + 4 in all 16 `SANDSTORM_CONTINUES` T2 cases (the remaining windows there are charge-turn related, out of scope). The real remainder was `WEATHER_SCRIPT_AGE` (8) still applied to Hail and Sun: every `SE_M_HAIL` (242, x10 per tick, stride 9) and `SE_M_SUNNY_DAY` (202) row was exactly +8 on `etp1-{hail5,sun5}-on`. `moveAnimSounds.ts`: `scriptRow = age` for Sun / Hail / Sandstorm (Rain keeps `elapsed - RAIN_CONTINUES_SCRIPT_START_ROWS`); the constant is gone. Labs (ON SE mass): hail5 320 -> 0 (74 / 74 exact), sun5 32 -> 0 (25 / 25), sandstorm5 / rain5 0 -> 0. OFF has no animated weather command, so the change cannot reach it. T2 ON 12,479 / 3,009 exact -> 12,437 / 3,023 (move-animation SE 9,718 -> 9,676), OFF unchanged 1,552 / 776; 0 missing / 0 extra. Pin: `tests/etp3WeatherSounds.test.ts` (ROM SE frames of both labs).

**Item 2 — the side-status end-turn print: head landed, hold not.** `BattleScript_SideStatusWoreOff` was not in `END_TURN_PRINT_SCRIPTS`, so its print started at MoveEnd's first row; on the ROM its printstring executes 10 rows after it (`etp3-lightscreenls6`: MoveEnd 4862 -> `SideStatusWoreOff+0x3` 4872), as the weather prints (wtl1). Added to `END_TURN_PRINT_SCRIPTS` (the Mist / Safeguard / Reflect / Light Screen expiries all run this script). The print was -10 in both scenes on the lab, now 0 in both. Labs: lightscreenls6 PRINTS mass ON 31 -> 21, OFF 15 -> 5, SE mass ON 152 -> 112; reflectls6 ON PRINTS 15 -> 5, SE 170 -> 130, OFF 15 -> 5; lightscreen6 ON PRINTS 9 -> 8, SE 16 -> 16 (the +2 rows are the first-turn Light Screen body, the move-body end, out of scope). T2: ON 12,437 / 3,023 -> 12,329 / 3,023 (s310 -100, s3738 -8, no seed worse), OFF 1,552 / 776 -> 1,550 / 776 (s3738 -2); 0 missing / 0 extra. `tests/randomRoundSoak.test.ts` seed 0 full frames pin 68,927 -> 68,949 (frames only; battle 3 / depth 2 / turn 21 / roundLost unchanged; a trajectory pin). New pin: the wore-off print's first glyph on `etp3-lightscreenls6-{on,off}` = ROM 4873.

*Not landed: the print-to-next-script hold (g180m recipe 4: 97 vs 92 / 88 vs 83).* The hold is measured, but it is not one rule: on the lab the engine's hold after the wore-off print is the 92 the T2 window has (ROM print 4872 -> `LeechSeedTurnDrain+0x0` 4968 = 96), yet with the head fixed the drain SE that follows is +3 (it was -7; every other turn of the lab is -2, so the engine's drain command start already sits 9 rows before the ROM's row and the hie7 / g180m drain age of 7 is calibrated on that); lengthening the hold by 5 as T2 s310 d16 asks (wore-off -> `SunlightFaded` 97 vs 92, `SunlightFaded` -> drain 88 vs 83) would put the lab's drain at +8. The two contexts disagree on the sign, so the drain's command-start / age pair has to be fixed first (the lab `etp3-lightscreenls6` is the receipt: ROM SE 180 4996 / 142 5014 .. / 179 5109, ENG +3). Encore / Disable ends: the ON labs are already -1 (etp1), nothing to change. s648 d6 (-6) is a Leech Seed drain after a hit (`hp` command min 28 -> drain command 437 vs ROM `LeechSeedTurnDrain+0x0` 449), not a side-status / Encore window; it stays with the drain-after-hit context of g180m item 6.

Census 0..199 both scenes (`lsd194Census.sh`, `LSD194_SHARDS="0 1"`, JOBS 2, SPLIT 2; `8ed6d8a58` vs `09b2432cf`; `rst197CensusDelta.py --digest`): eventsDigest + error identical 200 / 200 on ON and OFF (no gameplay / RNG change); command type sequences change in 31 (ON) / 30 (OFF) battles (the wore-off print's added head rows), no command timing changes otherwise. No `tree/` copies left. Tests: every tests/ file importing `battleResolutionPresentation.ts` or `moveAnimSounds.ts` (157 files incl. `sst1*`, `etp*`, `fnt*`, `trn178*`, `randomRoundSoak*`, `lbrd`, the greps for `SANDSTORM_CONTINUES` / `SideStatusWoreOff` / `WEATHER_SCRIPT_AGE`) pass; `npm run typecheck`, `npm run test:gate` (360 files / 2,835 tests), `npm run build` pass.

## t2k5 (2026-11-22): the remaining S11 sound-timing mass re-ranked on fold-d = master + abs1 + hpb3 (measurement only; no `src/` / `tests/` change)

Tree: `ab55ab029` (fold-d; landed since t2k4's `8ed6d8a58`: drv2, etp3, hit2, bbk1, hpb3; abs1 / lbf1 / bob1 are not T2 steps). Method as t2k4: `rescoreAll.sh` per scene into `.integration/evidence/t2k5/t2` (49 seeds, 25 ON / 24 OFF, ROM files = `t2n`), `soundScoreboard.py --per-seed`, `tools/integration/t2k4/cmd.sh` (new: the second `--cmdtrace=1` replay of every seed into `c/`, parameterised by `T2K4_DIR`), `attr.py` -> `agg.py` / `shape2.py` / `step.py` / `gain.py` / `own.py` / `win.py`, `probe.sh` for the probed windows. New tools in `tools/integration/t2k4/`: `cmd.sh`, `rank.py` (the item table below, each window owned by one item; items + B4 + remainder = TOTAL), `stepclass.py SCENE [MINMASS]` (owned windows grouped by step value, clean start vs carried: a recurring clean step is one rule), `stepctx.py SCENE STEP` (where the clean windows of one step sit). Evidence (git-ignored, main tree): `.integration/evidence/t2k5/` (`t2/`, `c/`, `attr-{on,off}.json`, `agg.txt`, `shape2.txt`, `step.txt`, `gain.txt`, `own.txt`, `rank.txt`, `score-{on,off}.{txt,json}`, `p/{on,off}/` probes + `*.cmp.txt`).

### 1. T2 on this tree (missing / extra 0 / 0 in both scenes)

| scene | mass | exact / offset | move-animation SE | stat | cry | battle-controller | bgm |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ON (25 seeds) | **11,531** (t2k4 12,479, drv2 baseline 11,949) | 3,059 / 2,818 (t2k4 3,009 / 2,868) | 8,859 (9,718) | 303 (323) | 639 (643) | 1,678 (1,743) | 52 (52) |
| OFF (24 seeds) | **1,186** (t2k4 1,552, drv2 baseline 1,348) | 784 / 349 (t2k4 776 / 357) | 0 (0) | 146 (161) | 262 (319) | 776 (1,053) | 2 (19) |

ON by class (agg): body 5,652 (B4 274 inside), gen 3,207, controller chain 883, controller hit 795, cry 639, stat 303, bgm 52. OFF: chain 408, hit 368, cry 262, stat 146, bgm 2.

**Drop since t2k4 (ON -948, -7.6 %; OFF -366, -23.6 %), per landed step as its section gives it:**

| step | ON | OFF | source |
| --- | --- | --- | --- |
| drv2 (dismiss-accept default + forced-anchor fix) | -530 (12,479 -> 11,949) | -204 (1,552 -> 1,348) | drv2 section |
| hpb3 (floor-free hp before Shell Bell / Focus Band / no-change drain heal) | -87 (11,949 -> 11,862) | -15 (1,348 -> 1,333) | hpb3 doc |
| bbk1 (Brick Break screen; asleep head; chg4 item 3 narrowed) | -161 (-31, 0, -130) | -145 (-126, -19, 0) | bbk1 section (start 11,911 / 1,348 on master) |
| etp3 (Hail / Sun age, side-status wore-off head) | -150 (-42, -108) | -2 | etp3 section |
| hit2 (General_Hail on the body clock -80, Future Sight -18) | -98 | 0 | hit2 commits (13,166 -> 13,068, on the pre-hie7 base) |
| hse2 / chg4 / hie7 | already in the t2k4 baseline | | |
| **sum of the sections** | -1,026 | **-366** | |
| **measured** | **-948** | **-366** | this rescore |

OFF is additive to the row. ON is 78 less than the sum: hit2's Hail rows (-80) and etp3's Hail / Sun age (-42) are the same `SE_M_HAIL` rows (both steps fixed the General_Hail age; each measured it on a tree without the other), so about 80 of the two is one gain counted twice. Neither is worse than its section's claim; no step in the list regressed a window that was not already named in its own section.

### 2. Ranked top 10 (rows owned disjointly by window, `rank.py`; items + B4 + remainder = TOTAL)

**M** = a measured recipe exists, **new** = first measured here, **inh** = inherited from the previous command (no rule of its own).

| rank | item | mass ON / OFF (sum) | windows ON / OFF | rule of its own? | recipe status | files / lines a landing touches | expected mass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Faint / send-in chain: SE 15 / 16 / 114, cry@faint (not counting rank 9) | 1,048 / 385 (1,433) | 106 / 67 | mostly inherited (carried offsets from the hit / print before); two own rules are open: the **Earthquake KO drain** (s648 d0, +34 cry@faint, party-summary 99 carried: t2k4 3, still open) and the OFF `message` 0.13 faint box on the pulse the ROM does not take (s6568 d104, -20, drv2 4.3) | KO: **M** t2k4 5 (root cause not found); d104: **M** drv2 4.3; rest inh | `battleResolutionPresentation.ts` hit-all tail / `hp` command (KO); none for the rest | -70 (KO), -20; the rest moves with ranks 2 / 3 |
| 2 | Held-item group gen:152 / 228 / 102 | 1,210 / 0 (1,210; 69 windows, 25 exact) | 69 / 0 | no (identical to t2k4: 1,210, 69 windows): the 345 rows are the previous hit / print / status command's step, hie6m. The one own term is the **foe-battler Shell Bell script row**: SE 152 / 228 / 102 are -4 in s97 d12 / d13 (probe below) | **M** hpb3 Open (foe battler +12 vs +8) and hie6m | `battleResolutionPresentation.ts` `hpItemAnimationRows` (hpb3 shape 1) | -4 x 3 x 2 on s97, plus the carried rows of items 8 / 11 below |
| 3 | Hit SE 12 / 13 / 14 | 565 / 481 (1,046) | 174 / 111 | OFF: yes, the same plain clean steps as t2k4 -3 / -4 / -9 / -13 (hit-animation 269, move-animation 184; s97 d7 / d9 Solar Beam -13 x2 first-hit SE, s1914 d2 / s7295 d8 -9 x2). ON: inherited (after Psychic, Confusion, Triple Kick) | OFF: **M** hse1m rows (hse2 landed three) + hit2 item 1 (+6 / +7 tail bodies, traced and not landed); ON: inh | `battleResolutionPresentation.ts` hit-animation lead | OFF -150 .. -250 |
| 4 | gen:180 Leech Seed drain | 760 / 0 | 17 / 0 | partly: s6912 d5 **+17 after Recover** (170, unchanged), s310 si27 / 29 / 31 +7 x3 after gen:202 (210), s648 si25 / si13 -7 / -6 (130) | (a) **M** t2k4 4a (not landed; the etp3 hold section shows the lab and T2 disagree on sign: the drain command-start / age pair first), (b) **M** g180m 4 | `moveAnimSounds.ts` drain age, `battleResolutionPresentationRender.ts` restore-HP tail | -170 .. -380, see etp3 caveat |
| 5 | Rock Slide body | 514 / 0 | 8 / 0 | no: inherited (s8612 -13 after Belly Drum 180, s165 +1 after a +4 hit-SE carry 100, three 20-row clean -3 windows 60 x3) | inh (t68m 3); the clean -3 is rank 9's constant | none | 0 on its own |
| 6 | gen:148 poison / status tick | 456 / 0 | 17 / 0 | no: five inherited classes (t68m 1) | **M** t68m 6 class C (`switch-in` tail -9) | `battleResolutionPresentationRender.ts` `switch-in` tail | -54 |
| 7 | Two-turn second family: Solar Beam 254 + Dig 196 | 450 / 0 | 19 / 0 | partly: s97 d7 / d9 -13 x2 first-charging-turn lead on a clean start (26 + 26 mass, the 70 + 70 after it carry -13), s830 +17 / +18 after Giga Drain / hit-SE | **M** t2k4 9 (new there, still open); chg4 item 3 narrowed does not cover it | `battleResolutionPresentation.ts` charge-turn print (`isChargeTurnOpener`) | -117 + -70 x2 carried |
| 8 | Psychic + Calm Mind (s97 d11 / d12 only) | 443 / 0 | 15 / 0 | no: **hpb3 Open** (the Shell Bell hp tail leaves s97 d12 / d13 4 rows early; Psychic +24 carried, +25 on a clean first row) | **M** hpb3 Open | `hpItemAnimationRows` (foe battler script row +12) | -75 -115 -56 -92 (the s97 d11 / d12 windows) |
| 9 | Forced player send-in after a faint: SE 15 at the segment start | 213 / 160 (373) | 19 / 19 | **yes, one rule in both scenes: the same 19 windows**: the player's replacement send-in ball SE is -7 (6 windows) or -3 (13 windows) from the ROM, clean from the segment start (2 rows each: SE 15 + next row) | **new** (probe 1 below) | `battleResolutionPresentation.ts` 6655-6700 (`switchInTiming`, `sceneOffPlayerForcedSwitchInVisualDelay`), `forcedPlayer` path | -373 |
| 10 | Confusion 217 + Supersonic 155 (status-animation / Dig no-effect) | 372 / 0 | 7 / 0 | Confusion: yes, s8108 d41 / d44 / d50 **-48 / -32 / -48 after a Dig unleash** (probe 3); Supersonic: s5569 d12 -9 after itself (143), Sweet Kiss -9 (72) is the same class | Confusion **new** (probe 3); Supersonic / Sweet Kiss **new**, not probed | `battleResolutionPresentation.ts` (message hold after a Dig unleash; status-animation head) | -144 (Confusion) -215 (status -9) |
| 11 | Fire Blast after a Shell Bell heal (s97 d13) | 333 / 0 | 3 / 0 | **hpb3 Open's d13 window** (+100 in hpb3): SE 144 -17 = -4 (item SE) -10 (the used print after the heal) -3 (rest), probe 2 | **M** hpb3 Open + new used-print head | same as 2 plus the OFF s97 d13 head (drv2 4.1, 6 vs 12) | -306 |
| 12 | stat SE 239 / 245 / 23 / 24 | 216 / 153 (369) | 53 / 34 | inherited (stat rows after a hit step); OFF stat:23 -9 / -10 clean x5 are the stat row after a move-animation | inh | none | 0 |
| | **Items 1-12** | **6,580 / 1,179** | | | | | |
| | B4 bodies (reported separately) | 274 / 0 | | | | | |
| R | remainder (433 / 5 windows; none above 143 mass except gen:242 Hail s2741 -11 after a switch-in cry 121 and Double Team s2 -11 after Hydro Pump 110) | 4,677 / 7 | | | | | |
| | **TOTAL** | **11,531 / 1,186** | | | | | |

Sum-check: ON 1,048 + 1,210 + 565 + 760 + 514 + 456 + 450 + 443 + 213 + 372 + 333 + 216 = 6,580; + 274 + 4,677 = 11,531 (`rank.txt`). OFF 385 + 481 + 160 + 153 = 1,179; + 7 = 1,186. Rank 9 and rank 1 are one chain family split by window (the 19 segment-start windows are rank 9). Counts are row mass, not saving.

**What moved against t2k4's list.** Ice Beam 517 -> 152 (drv2 anchor fix + chg4 3 narrowed), Struggle 235 -> 150 (drv2), Brick Break OFF 126 -> 0 (bbk1), OFF controller 1,053 -> 776 (drv2 -277), gen:242 / 202 Hail 169 (hit2 / etp3). **Unchanged to the row:** held-item 1,210, Rock Slide 514, the Earthquake KO window (+34), the Recover -> drain +17 (170), s97 Solar Beam -13 pair, gen:148 456 (462).

**Which items have a measured recipe.** M: rank 1 KO (t2k4 5) and s6568 d104 (drv2 4.3), rank 2 / 8 / 11 (hpb3 Open: one change in `hpItemAnimationRows`, foe battler script row +12 instead of +8, covers 2, 8 and the first term of 11), rank 3 OFF (hse1m rows + hit2 item 1), rank 4 (t2k4 4a, g180m 4), rank 6 (t68m 6 C), rank 7 (t2k4 9). **New this step:** rank 9 (forced send-in ball SE), rank 10 (the Dig -> Confusion gap; Supersonic / Sweet Kiss), rank 11's used-print head after a heal.

### 3. The three probed new windows (ROM `hcr3mProbe` + engine `--cmdtrace`, frames from each side's commit)

1. **Forced player send-in SE 15 (rank 9), OFF s6079 d1 (-7) and s165 d7 (-3), the same windows in ON.** ROM: the replacement pick `FaintedMonTryChoose+0x6` 72, `FaintedMonSendOutNew+0x0` 77, `+0x4` 79, `+0xb` print 83, the print ends 104 (s6079) / 98 (s165), `+0x10` 106 / 100, **SE 15 (SE_BALL_OPEN) 153 / 147**. Engine: SE 15 at **146 / 144**. The ROM commit -> SE 15 differs by 6 between the two windows (print hold 21 vs 15: the glyph time of the sent-in mon's name in the "Go! X!" print); the engine's differs by 2. So the engine's SE 15 is the right constant for a mid-length name and falls short by 1 .. 3 per extra glyph: -3 for the short names (13 windows), -7 for the longest (6 windows). Engine command: the forced player `switch-in` (`forcedPlayer`, `battleResolutionPresentation.ts` 6655-6700; `switchInTiming(... incoming.field.name ...)`, `sceneOffPlayerForcedSwitchInVisualDelay`), which already takes the species name; no `message` command exists for the "Go!" print here. One rule, 19 windows x 2 rows, ON 213 + OFF 160. Not landed (needs the per-glyph rate and the name list: 6 / 13 split by `incoming.field.name.length`).
2. **ON s97 d13 Fire Blast (rank 11, 306 + 27 mass, -4 carried then -13).** ROM: the Shell Bell script `ItemHealHP_Ret+0x7` 261 (SE 152 x3 273 / 305 / 337, SE 228 369, SE 102 441), hp print `+0x18` 594, hp write 598, `MoveEnd+0x6` 599, `EffectBurnHit` 604, **used print `HitFromAtkString+0x1` 610 -> animation `+0x1` 640 -> SE 144 646**. Engine: SE 152 269 (-4), `hp` 0.8 47 > 49 at 588, `message` 0.9 at 594, **`move-animation` 0.10 at 617 (min 32), SE 144 at 629 (-17)**. Two terms: (a) the foe-battler Shell Bell SE is -4 (hpb3 Open: tail 1 leaves d12 / d13 four rows early), (b) the engine's `message` (594) -> animation (617) is 23, ROM print 610 -> animation exec 640 is 30, and the ROM print itself starts 16 after the heal's hp row (594 -> 610) against the engine's 6: the print head after a held-item heal is 10 short, the same term drv2 4.1 measured for OFF s97 d13 (6 vs 12) and the OFF s97 si27 party-summary -11 / hit -6 rows here. Engine command: `message` 0.9 after the `hp` 0.8 of a Shell Bell hit in a following move's segment, `battleResolutionPresentation.ts` (hie5 / hie7 class, print head after a held-item heal).
3. **ON s8108 d41 Confusion (rank 10, -48 on SE 184, the d44 / d50 windows -32 / -48).** ROM: Dig's unleash turn (`SecondTurnSemiInvulnerable` 7, print 17, `HitFromAtkAnimation+0xf` 88 -> 135, no hp change), then **`MoveEnd+0x0` at 201** (66 rows after the animation ended), `EffectConfuseHit` 209, print 215 -> 239, animation 245, SE 184 317. Engine: `message` 1.0 / 1.1 (0 / 39), `move-animation` 1.2 at 149 (min 15), two `sprite-visibility`, **`message` 1.5 at 166, `move-animation` 1.6 (the Confusion body) at 189**, SE 184 at 269 (-48). The ROM leaves 66 rows between the Dig animation's end and `MoveEnd`; the engine has 2 and then a 23-row message before the next body: the gap after a Dig unleash that does no damage (hp unchanged on the ROM: read as the no-effect / miss print and its hold) is about 43 short. Cause of the 66 not read from the ROM script (the probe shows only `ex0` rows in it: a wait, not a print). Engine command: the `message` 1.5 hold before the second mover after a Dig unleash (`battleResolutionPresentation.ts`, two-turn unleash tail). Three windows in s8108 (d41 / d44 / d50), 144 + the cry@faint -49 chain 96 + the gen:152 after it 115 on the same seed are downstream.

### 4. Windows that are not engine rules (harness / carried)

- The drv2 press gate is gone: s2230 d20 / d21 are -2 / +1 .. +3 and own no window above 20. OFF top window is now 51 (s97 d13 party-summary, rank 11's head); the OFF tail is 236 windows of mass 5 .. 27 each, 111 hit-SE and 67 chain.
- Carried offsets: the ON controller / hit groups start from a nonzero previous offset in 640 of 747 rows at t2k4; the steps here are the same ones.
- `-3 clean` is the most frequent single step (ON 72 windows / 636 mass, OFF 37 / 204 over `stepclass.py`): 14 + 13 of them are rank 9's SE 15, the rest are the first row of a resolution segment (Surf x12, Flamethrower x8, Faint Attack, Spark) = the forced-commit constant of drv2 3 (the -2 / -3 left of every forced-move window), a tools-side offset, not a body rule.

### 5. Engine commands behind the probed windows

| window | ROM script rows | engine command | file |
| --- | --- | --- | --- |
| forced send-in SE 15 | `FaintedMonSendOutNew+0xb` print (name-length hold 15 .. 21) -> `+0x10` -> SE 15 at +47 | the player's forced `switch-in` (timing `forcedPlayer`, name-dependent) | `battleResolutionPresentation.ts` 6655-6700 |
| Fire Blast after Shell Bell | `ItemHealHP_Ret+0x18` hp print 594 / write 598, `MoveEnd+0x6`, `EffectBurnHit`, `HitFromAtkString+0x1` 610 | `hp` 0.8 -> `message` 0.9 -> `move-animation` 0.10 | `battleResolutionPresentation.ts` (`hpItemAnimationRows`, print head after a held-item heal) |
| Dig unleash -> Confusion | `HitFromAtkAnimation+0xf` 135 -> `MoveEnd+0x0` 201 -> `EffectConfuseHit` 209 | `move-animation` 1.2 -> `message` 1.5 -> `move-animation` 1.6 | `battleResolutionPresentation.ts` (two-turn unleash tail) |

### 6. What not to chase

- The 4,677 ON remainder (433 windows, none above 143 except the two named) and the held-item scatter (1,210): inherited; fix the preceding command (ranks 8 / 11 first, they are the d12 / d13 of the same seed).
- ON hit-SE and chain carried mass: no per-family offsets.
- Rock Slide (514), gen:148 first row (456), the OFF hit-animation / move-animation steps (-13 .. -3, 453) beyond the hse1m rows: no rule of their own.
- The drv2 press gate and fch2m recipe 1: landed; the s2230 d20 / d21 rows are -2 / +1 now. The `-3 clean` first-row constant is a tools / commit anchor, not a body to tune.
- A `LEECH_SEED_DRAIN_SCRIPT_AGE` global change, or lengthening the side-status hold by 5 (etp3: the lab and T2 disagree on the sign), until the drain command-start / age pair is fixed once.
- B4 bodies (274), Future Sight / hail damage SE (hit2 landed it), `HP_TIMING.minimumFrames` -> 0 globally (hpb3: +621).

Not applied: no `src/` or `tests/` change; PROGRESS / ISSUES / ROADMAP untouched; tools are python / shell only; `npm test` / `npm run typecheck` / `npm run build` not run (assigned: other workers share the machine; no `.ts` touched).

## shb1 - the Shell Bell script rows after a hit (both scenes; S11 #219 item 0)

Tree: master `b97c6ae68` + two commits (item 2 `625729d46`, item 1 `7722ce273`), presentation / sound timing only. Method: `labCompare.sh --scene both` before / after, `rescoreAll.sh` + `soundScoreboard.py` into `.integration/evidence/shb1/t2-{base,print,gate}` (git-ignored; `segmass.py` = per-resolution mass), census 0..199 (`lsd194Census.sh` WORKTREE vs HEAD + `rst197CensusDelta.py --digest`). New labs: `tools/battle-lab/shb1-holder-first-{player,foe}.json` (a Shell Bell holder hits first, then the other side attacks; Seismic Toss x4, two turns).

**Item 2 (used print after a Shell Bell heal, both scenes).** The heal is `ItemHealHP_Ret ... datahpupdate; return` into MoveEnd and straight into the next action; there is no MoveEnd sprite-visibility receipt in the kernel events, so `actionTransitionPauseFrames` (trn176: E + 1 + d + n + 6 + u) never fired and the print opened 10 rows early in the labs (both scenes, both holder sides). Rule (`shellBellNextUsedPrint`): when the heal's hp event is followed directly by the next action's STRINGID_USEDMOVE, the hp command's tail is 3 + 1 + ACTION_TRANSITION_ROWS + u (u = that print's instructionExecution) instead of 3. One rule for both scenes.
- Labs (mass ENG - ROM, ON / OFF): shb1-holder-first-player 60 / 20 -> 0 / 0, shb1-holder-first-foe 50 / 10 -> 0 / 0; hie1-shellbell-on, hie1-leftovers-{on,off}: unchanged (0 / 0, 5 / 0, 2 / 0: no next action).
- T2: ON 11,531 (exact 3,059) -> 10,905 (3,070); OFF 1,186 (784) -> 1,039 (793); 0 missing / 0 extra. s97 ON res7 212 -> 167, res11 270 -> 306 (+36: the engine is already +25 at the start of that window; the heal rows are now exact relative to the ROM, 217 vs 217, and the old 9-row deficit used to cancel part of the carry), res12 50 -> 23, res13 326 -> 80; OFF s97 res13 69 -> 21. Also s2 ON 487 -> 301, OFF 71 -> 29, s1914 ON 331 -> 194, OFF 70 -> 31.
- Open: OFF s97 d13 is now ~7 late (ROM `MoveEnd+0x6` 302 -> print 313 = 11 rows; the engine's heal hp starts 5 rows after the ROM's `healthbarupdate`, the OFF stand-in command for the item's `playanimation; Pausex20` is 45 rows against the ROM's 35 (exec 146 -> printstring 181) and ends 7 late before the heal's print). It is the OFF item-animation length in a window the labs (bar 40+) do not exercise, not the print rule.

**Item 1 (foe battler's Shell Bell +12 vs +8): not foe-specific, an IsBattleSEPlaying gate (Scene ON).** The labs do not reproduce it (the foe-holder SE 152 is exact there). In T2 s97 d12 / d13 the hit's SE 13 (73 rows) plays at 192 and the item's `playanimation` row is at 261, 69 rows later: HandleBattleAnimation waits 73 - 69 = 4 rows, so the SEs sit at exec + 4 + 8 = +12. d11 (bar 25): hit SE -> exec 74 rows, no wait (+8); the labs have bars >= 40 (gap >= 99). Hence hit SE -> item exec = 49 fixed rows + bar, gate = `seg127StatusSeGateRows(songId, 49 + bar)` = 0 for bars >= 24, 4 for bar 20; applied Scene ON only (Scene OFF has no animation script: ROM OFF exec 146 = `datahpupdate` 135 + 11, no wait). It is added to the hit's hp tail (`hpItemAnimationSeGate`). The d12 / d13 bar-20 windows fix one point (49); d11 and the labs bound it from the other side (>= 48), so the constant is measured on 3 windows only.
- Labs: identical to item 2 (every lab bar >= 24: gate 0).
- T2: ON 10,905 (3,070) -> 10,811 (3,095); OFF unchanged by construction (the T2 OFF figures of item 2 were copied, not re-run); only s97 changes (778 -> 684): res12 23 -> 9, res13 80 -> 0, res11 unchanged. Totals vs base: ON 11,531 -> 10,811 (-720), OFF 1,186 -> 1,039 (-147).
- The hpb3 "foe battler / pan 63" reading is wrong: the SE pan is the animation's, not a battler rule.

**Census 0..199** (WORKTREE vs `b97c6ae68`, `rst197CensusDelta.py --digest`): item 2 both scenes eventsDigest + error identical 200 / 200, type-sequence changes 0 (ON 18 / OFF 18 battles change command timing); item 1 ON identical 200 / 200 (20 battles change timing; OFF code path unchanged). tree/ copies removed (`LSD194_FINAL=1`).

**Tests:** `tests/hpb3HpBarLength.test.ts` +2 Tier-1 pins (tail 14 = 3 + 1 + 6 + u with u = 4; bar 22 -> tail 1 + 2). `tests/hie*.test.ts`, `hpb3*`, `lbrd`, `randomRoundSoak*` (16 files, 174 tests) green, no pin moved.

Not landed / not done: the OFF s97 d13 item-animation length (above); a gate for other HELD_ITEM_EFFECT users after a hit (Leftovers / berries are turn-end, no hit SE before them).

## fsi1: the player faint-replacement ball SE follows the printed Go! string

Cause: t2k5 rank 9 (SE 15 after a forced player send-in, -3 x13 / -7 x6 windows) was not name length. `STRINGID_SWITCHINMON` picks one of four strings by `gBattleStruct->hpScale` (`hpthresholds` from the foe's HP%: >69% "Go! X!", >39% "Do it! X!", >9% "Go for it, X!", else "Your foe's weak!\nGet 'em, X!"). FAST text prints one glyph a frame and the ball spawns when the print ends, so from the SEND OUT confirm: print starts at 83, ball B = 86 + printable glyphs, SE 15 (SE_BALL_OPEN) at 133 + glyphs (49 frames after the print end). The old model 91 + name length is the "Go!" row only (glyphs = name + 5); "Do it!" is name + 8 (+3), "Go for it," name + 12 (+7), and "Your foe's weak!" / "Get 'em, X!" name + 26 (+21; no window in T2, see caveat). `CHAR_NEWLINE` returns `RENDER_REPEAT` (text.c:968-971, one frame loop), so a line break costs no frame, as `battleStringPrintableLength` counts.

Change (presentation / sound timing only, no rule / damage / RNG): `playerFaintReplacementSendOutTiming` (`switchInTail.ts`) takes `goTextChars` (already passed from the segment's message lines) and drops `nameLength`: `ball = 86 + goTextChars`. One rule for both scenes, no per-species table. `soundCensusRomReplay.ts` cmdtrace rows now carry the incoming name and a `party-sendout` row (tool only).

| T2 (`rescoreAll.sh` + `soundScoreboard.py`, both scenes, 0 missing / 0 extra) | mass before -> after | exact | offset |
| --- | --- | --- | --- |
| ON | 11,531 -> 11,300 (-231) | 3,059 -> 3,120 | 2,818 -> 2,757 |
| OFF | 1,186 -> 1,008 (-178) | 784 -> 830 | 349 -> 303 |

- The 19 windows (-7 x6, -3 x13) are 0; all 47 send-in SE 15 windows per scene are at offset 0. ON by family: cry 639 -> 549, battle-controller 1,678 -> 1,582, move-animation SE 8,859 -> 8,814, stat 303 unchanged. OFF: cry 262 -> 176, battle-controller 776 -> 684, stat 146 unchanged.
- Census seeds 0..199: eventsDigest + error identical 200/200 in both scenes (63,514 ON / 62,209 OFF commands, 0 changed). Trees deleted.
- Tests: pfr192 fixtures (all "Go!") unchanged and green; new pfr192 pin for the three single-line strings (ball 86 + glyphs, SE clock 133 + glyphs, both scenes). One trajectory pin moved: `randomRoundSoak.test.ts` (c) "full" seed 1, frames 57626 -> 57623 (battle 3 / depth 2 / turn 15 / roundLost unchanged; the seed sends in HAUNTER "Your foe's weak!" +21 and BUTTERFREE "Go for it," +7, the exploring presses land on other phases; the ROM row it now matches is the T2 SE 15 rel = 133 + glyphs). Every other pin in the send-in, replacement, soak, lbrd and replay files is unmoved.
- Labs: the labCompare engine stage cannot stage a forced player faint replacement (every faint lab uses `overrides.parties.player`, which the engine's party menu rejects against the default rental records: "playerParty[0] max HP 18 does not match rental record max HP 165"; set-id labs have no stage; legacy `overrides.battlers` are rejected). `snd2-switchin-faint-*` is a voluntary switch (same rows before / after). The T2 windows are the real ROM send-ins (the "Go!", "Do it!" and "Go for it," strings occur in them).
- Caveat: no ROM window with the hpScale-3 two-line string; its +21 comes from the glyph count and the text.c line-break rule, not a measured SE.

## ekd1 — hit on a hidden (Dig / Fly / Dive) target, Scene ON and KO case; Leech Seed drain start measured, not landed

Tree: `2a907fec7` (one src commit on `da8e7b61b`). Evidence (git-ignored): `.integration/evidence/ekd1/` (`t2-base`, `t2-i1`, `lab-*`, `ls-base`, `ls-rows`, `census`).

**Item 1 (landed): Earthquake KO of a Dig user, ON s648 d0 (+34 cry@faint / SE 16).** The engine's hit -> faint was 31-35 rows long because the ON path never used the 2-row hidden-target hit step (fsc1 had it for Scene OFF only: `HIT_ANIMATION_INVISIBLE_TIMING`), and in the KO case the hidden state was also gone: the KO clears status3 before the segment ends, so `hitTargetSpriteInvisible` read "visible". ROM `Cmd_hitanimation` skips the blink when the target sprite is invisible; fsc1-fly-gust-on already had the receipt (datahpupdate 3 rows after the effectiveness SE) and the new lab `ekd1-dig-eqko-on` (foe Dig, player Earthquake, KO on the unleash turn) has the Earthquake one (ROM SE 13 592, SE 16 762). Rule: the hit step is invisible when the target is semi-invulnerable at the segment start, or the segment shows a charge-turn Fly / Dig / Dive / Bounce print by that battler and the hit KOs it (a `play-faint-cry` follows). Magnitude / Surf / Sky Uppercut take the same branch (Surf: Dive, in `SEMI_INVULNERABLE_CHARGE_MESSAGES`); census seed 81 (Foe Hitmonchan Sky Uppercut on a Fly user) is the one command change in 0..199, hit-animation 35 -> 2 rows.
- T2: ON mass 10,580 -> 10,418 (-162), only s648 moves, 0 missing / 0 extra; OFF unchanged (s648 is not an OFF seed; the OFF path already had the rule). The remaining +2 at the faint SE is the faint chain's own calibration (lab +1 / +2), left as is.
- Labs (32 lab-scene runs, Factory moves + fsc1 set): mass 646 -> 646. New lab ON 41 -> 8, OFF 1 -> 1.
- Census 0..199 both scenes: eventsDigest + error identical 200 / 200 (ON 63,514 commands, 1 battle changed: s81 above; OFF 62,209 commands, 0 changed). Trees deleted.
- Tests: `fsc1HitTiming` (ON Gust now 2 rows, new "ekd1" describe for both scenes) 9 / 9; eqk1, etp1, etp3, hie7, hpb3, lbrd, every Leech Seed pin file (aud250, lsd194, lsd198, lsd199, leechSeed*, liveSpriteOrderHost, spriteOrderEventTransform) and randomRoundSoak* (9 files, 120 tests) green, no pin moved. `tests/aud245bLibRestore.test.ts` fails (BGM frame 695 vs 701, seed 3 Scene OFF soak) identically with the change stashed: pre-existing, not touched.

- `npm run typecheck` green; `npm run test:gate` 360 files / 2,839 tests green; `npm run build` green.

**Item 2 (not landed): Leech Seed drain start after a Recover.** Measured on the existing labs (`ls-base`, `ls-rows`; ROM label rows), not enough for one rule:
- Plain hit -> drain: ROM datahpupdate start -> `LeechSeedTurnDrain+0x7` exec is **bar rows + 17** (datahpupdate end -> MoveEnd 7 -> drain +0x0 9 -> +0x7 1) in both `etp1-leechseed-on` (bar 13: 633 -> 663 = 30) and `etp1-leechseedc-on` (Chansey, bar 51: 640 -> 708 = 68). The engine `hp` command runs `max(28, bar + 2)`: 30 on the first lab (exact), 53 on the second, so the drain command starts 15 rows before the ROM exec.
- The ROM's launch lag (exec -> animation start, `anim start A0`) is **7 on the short-bar lab (663 -> 670) and 0 on the long-bar lab (708 -> 708)**: the engine's single `LEECH_SEED_DRAIN_SCRIPT_AGE` 7 therefore fits the first and is 7 too late against the 15-early command start of the second; net `etp1-leechseedc-on` drain SE -8 x10 (mass 80, ON; OFF exact). That is the same shape as the s648 d6 -6 / -7 (hp min 28 -> drain) and probably as the Recover +17 (hp cmd 477 vs ROM 458 on the other side of the sign), so the pair to fix is (command start = datahpupdate start + bar + 17 on a long bar, launch lag by the controller's remaining busy rows), not the age constant alone.
- Not settled: what the 7 is (the controller still busy for 7 rows after a short bar's datahpupdate, 0 after a long one), and no Recover / Light Screen lab was run, so no rule was landed. Next: a lab Recover -> drain (foe Recover x4, player Leech Seed x4, Rattata lvl 12 foe), read ROM `anim start` against exec, then set (command start, lag) from the bar length; `etp1-leechseed-on` / `-2-on` / aud250 labs must stay exact, `etp1-leechseedc-on` and `etp3-lightscreenls6-on` (+3 drain after the head fix) are the movers.

**Item 3 (not started): OFF s6568 d104 faint box -20 (drv2 4.3).** Out of time before the probe; nothing measured.

## cfs1 (Scene ON presentation / sound timing, S11 #219 item 0)

Presentation only: no battle-rule, damage or RNG change. Evidence: `.integration/evidence/cfs1/` (git-ignored; `t2-{base,item10,item10b}`, `score-*`, `lab-*`, `census/`).

| Item | Result | Commit |
| --- | --- | --- |
| 10 Confusion after a Dig unleash (s8108 d41 / d44 / d50, -48 / -32 / -48) | landed | `b8ffef15f` |
| 10b Sweet Kiss -> Confusion | landed for Sweet Kiss; Supersonic not landed | `6516aaefb` |
| 7 Solar Beam lead (s97 d7 / d9, -13 x2) | not landed | - |

**Item 10.** The foe in those windows is a Lunatone: the Dig unleash is a `MOVE_RESULT_MISSED` Levitate print ("makes Ground moves miss with LEVITATE!"), not a damaging hit. `Cmd_attackanimation` takes the NO_EFFECT branch (`BattleScript_Pausex20`, 32 rows) for MISSED as for DOESNT_AFFECT_FOE, so the used print is held 69 rows before the miss print (ROM 1061 -> 1130). `sourcePauseUsedMoveHoldFrames` (eqk1) already did this for `STRINGID_ITDOESNTAFFECT`; it now also takes `STRINGID_PKMNMAKESGROUNDMISS` and `STRINGID_AVOIDEDDAMAGE` (Wonder Guard). Only Levitate is lab-verified (`cfs1-digconf-levitate-{on,off}`); Wonder Guard is source-equivalent. Lab `cfs1-digconf-levitate-on`: SE 184 -48 -> +1, mass 97 -> 1, the OFF twin is exact before and after; the immune and hit controls (`cfs1-digconf-immune-on`, `cfs1-digconf-hit-on`) are unchanged. Test: `tests/cfs1DigLevitate.test.ts`.

**Item 10b.** The -9 is the gap from the last body SE to the Confusion status animation. Confuse Ray (109) is in the b4l c-lead body class (`C_LEAD_WINDOW_ADJUST`) and exact; Sweet Kiss (186) was not and was 2 rows early; it is now in the class with adjust 2. Labs `mechanic-sweet-kiss-player-luvdisc-opponent-onix` 128 -> 20 and `...opponent-luvdisc-player-onix` 155 -> 47 (every Confusion SE -2 -> +0; the rest is the final hit, not touched). Test: `tests/cfs1SweetKiss.test.ts`. Supersonic (48) was tried in the same class with the same adjust: it moved the s5569 d12 Confusion animation 15 rows the wrong way (T2 ON mass +164 over the base, s5569 +208), and its two labs have no body SE to calibrate on, so it stays out. s5569 d12's -9 therefore remains.

**Item 7.** s97 d7 / d9 are not a charging turn: the sun makes Solar Beam single-turn (`EffectSolarBeam` -> `SolarBeamOnFirstTurn` -> `TwoTurnMovesSecondTurn` -> `HitFromAtkString`). The engine starts the used print at ROM row 9 (`SolarBeamOnFirstTurn+0`) while the ROM print is at row 22, and the body SE is -13 from that. No sun Solar Beam lab exists, so the 13 rows cannot be separated from the chg4 / bbk1 charge-turn rules without one; next step is a lab (Sunny Day turn, then Solar Beam) and the ROM rows of `EffectSolarBeam` .. `HitFromAtkString+0x1`.

**T2** (25 ON / 24 OFF seeds, ROM-driven; 0 missing / 0 extra throughout):

| Scene | Mass base -> item 10 -> item 10b | Exact / offset (base -> final) |
| --- | --- | --- |
| ON | 11,531 -> 11,208 -> 11,164 | 3,059 / 2,818 -> 3,061 / 2,816 |
| OFF | 1,186 -> 1,186 -> 1,186 | 784 / 349 unchanged |

**Census** 0..199 (base `9754cddbf` vs `6516aaefb`): eventsDigest and error identical 200 / 200 in both scenes; ON 8 battles with changed presentation commands (63,514 commands), OFF 0 changed. The `tree/` copies are deleted.

**Tests:** every tests/ file importing `battleResolutionPresentation.ts`, `tests/chg*`, `bbk1*`, `sta3*`, `randomRoundSoak*`, `lbrd` (177 files): all pass except `tests/postwin.test.ts` ("rejects the early JENSON quote edge", `transitionClockAhead: 1`), which fails identically on base `9754cddbf` (rmw1's room transition clock; not this step). No trajectory pin moved. `npm run typecheck`, `npm run test:gate` (360 files / 2,839 tests) and `npm run build` pass.

## sep1 (Scene ON presentation / sound timing, S11 #219 item 0): one IsBattleSEPlaying gate for shb1's Shell Bell and ekd1's Leech Seed drain

Presentation only: no battle-rule, damage or RNG change. Tree: `f34f17740` + `219676c82` / `985f3464b` / `17354087d`. Evidence (git-ignored): `.integration/evidence/sep1/` (`lab-base`, `lab-final`, `t2-{base,final}`, `t2-*-score.{json,txt}`).

**Hypothesis (confirmed for hit -> drain).** The ROM polls `IsBattleSEPlaying` (battle_gfx_sfx_util.c:554, up to 29 polls) before every `HandleBattleAnimation` / `HandleMoveAnimation` / `HandleStatusAnimation`; `Cmd_end` drains a script's own SEs, so the only SE still playing at a later request is the effectiveness SE (12 = 18 rows, 13 = 73, 14 = 88; `se-song-rows.json`). The animation therefore starts at max(script row, end of that SE). Modelled once with `seg127StatusSeGateRows` (the sgs134 / kno3 / shb1 machinery):
- shb1: `49 + bar` is structural: hit SE -> hp start 36 + hp start -> exec 13 + bar rows. No value changed.
- Leech Seed after a hit: ROM hp start -> drain exec is bar rows + 1 + 17; the engine hp command ran `max(28, bar + 2)` and put the drain 15 rows early on a long bar. Now hp -> drain tail 15 (Scene ON, hit-preceded, animated drain, not after a send-in) and the drain's launch lag = the gate: short bar (SE end 670 > exec 663) 7, long bar (SE end 677 < exec 708) 0. `launchLagFrames` on the drain command carries it to `moveAnimSounds` / the body start.

**Labs (Scene ON SE mass, before -> after):** `etp1-leechseedc-on` 80 -> 0; `etp1-leechseed-on`, `etp1-leechseed2-on`, `aud250-leechseed-{player,opponent}-on`, `lse1-leechseed-player-on`, `shb1-holder-first-{player,foe}`, `hie1-sitrus-on`, `hie1-shellbell-on` 0 -> 0; `hie1-leftovers-on` 5 -> 5 (turn-end heal, no hit SE: untouched). Scene OFF labs unchanged (the OFF hit tail is not touched: the same +15 there put OFF s648's battle-controller SE 11 -> 16 because the OFF drain command carries its own +9, ROM `Pausex20` row to the seeded healthbarupdate 35 vs 44).

**Recover / Light Screen -> drain: not a gate term.** New lab `etp3-recoverls4-{on,off}` (foe Recover x4 while seeded; `etp1MakeLabs.py recoverls4`). ROM: Recover animation end -> `MoveEnd` 1672 -> drain exec 1681 = anim start 1681 (lag 0, no SE pending). Engine turn 2: Recover `hp` -> "regained health" print **+19** (1599 vs 1580), drain SE +17: the drain is **2 rows early against the print** (same -2 on `etp3-lightscreenls6-on` turns 1-3). So s6912 d5 +17 = Recover body +19 - 2. Landed the -2: SE rows of a drain reached from a print run 7 + 2 after the command start (`LEECH_SEED_DRAIN_AFTER_PRINT_EXTRA_AGE`); the body pixels keep 7 (the lsd198 dense receipt is a recorded fixture, the +2 there is not re-measured). Labs: `etp3-lightscreenls6-on` exact 22 -> 32 / mass 112 -> 112 (the first-turn Light Screen print's own +2 stays), `etp3-recoverls4-on` exact 11 -> 21, mass 554 -> 594 (the +19 Recover body now shows on the drain rows too).

**T2** (25 ON / 24 OFF seeds, ROM-driven; `rescoreAll.sh` + `soundScoreboard.py`; 0 missing / 0 extra):

| Scene | Mass base -> hit gate -> + drain after a print | Exact / offset (base -> final) |
| --- | --- | --- |
| ON | 10,051 -> 10,019 -> 9,939 | 3,158 / 2,719 -> 3,218 / 2,659 |
| OFF | 861 -> 861 | 839 / 294 unchanged |

**Census** 0..199 (`f34f17740` vs `17354087d`): eventsDigest and error identical 200 / 200 both scenes, 0 changed presentation commands (ON 63,514, OFF 62,209); only ON `sound` rows differ. Trees deleted.

**Tests:** new `tests/sep1HitSeedDrainGate.test.ts` (short bar SE 180 / 179 on ROM 697 / 810, long bar 735 / 848, Light Screen turns 2 / 3 on ROM 1533 / 2655; the long-bar pin fails on the old code at 727). All 158 files importing the changed files, `hie*`, `hpb3*`, `etp*`, `hit1*`, `randomRoundSoak*`, `lbrd`, the Leech Seed pins (aud250, lsd194, lsd198, lsd199, hie7, liveSpriteOrderHost, spriteOrderEventTransform): green, no pin moved. `npm run typecheck`, `npm run test:gate` (360 files / 2,839 tests) and `npm run build` green.

**Terms left:** (1) Recover `hp` -> "regained health" print +19 in `etp3-recoverls4-on` (not the gate); (2) Scene OFF Leech Seed drain command +9 constant (ROM 35 vs engine 44 from the `Pausex20` row to the seeded healthbarupdate; +9 on aud250 x2, etp1-leechseed, lse1, 18 on etp1-leechseed2): needs its own ROM measurement before the OFF hit tail can follow; (3) the drain body pixels (age 21) against the +2 SE rows; (4) the SE gate's SE lengths come from `se-song-rows.json` (hit SE 13 = 73 rows) while the older SEG127 table holds the status-SE rows: same data, not unified.

**Item 3 (probed, not landed): OFF s6568 d104 faint box -20 is an engine ready-frame error amplified by the harness's 17-frame pulse spacing.** `tools/integration/t2k4/probe.sh 6568 off 104` on the sep1 tree (evidence `.integration/evidence/sep1/it3/p/off/`), frames from the decision commit (ROM 55269). The ROM drive presses A once every 17 frames (`drive.segments`: +506, +523, **+540**, **+557**, +574); both sides start the faint box at +523 (ROM `FaintTarget+0xc` ex2, engine `message` 0.13). The engine takes the **+540** pulse (SE 5 at 541, `switch-out` 543, SE 15 565); the ROM does not take it (no SE 5, box still waiting) and takes **+557** (SE 5 558, `FaintTarget+0xc` ex0 560, `GiveExp` 567, SE 15 585). So the ROM's wait-for-button state begins between 541 and 557 and the engine's before 540: the engine gate is early by the doc's 1-3 frames, and the harness's pulse period turns that into the 17-row step (SE 15 -3 -> -20). Not a harness bug (the ROM pulses are the recorded ROM input and the ROM ignores the +540 one); the rule to fix is the engine's faint-box button-ready frame, which needs the ROM printer's wait-for-button frame measured (a one-frame-resolution press scan on a faint-box lab), not done here.

## sbm1 (Scene ON / OFF presentation timing: Solar Beam in sun, four ClearMonBg tail windows)

Tree: fold-f `8b38fd60a` + item 1 `54a275c14` + item 2 `ce76321bc` (presentation / sound timing only; no rule, damage or RNG change). Evidence (git-ignored, main tree): `.integration/evidence/sbm1/` (`lab-{base,after}-*`, `lab2-{base,after}-*`, `t2-{base,item1,item2}`, `census/`). New labs: `tools/battle-lab/sbm1-sun-{next,same}-player-{on,off}.json` (Sunny Day by the faster side, Solar Beam the next turn / the same turn; unequal levels, Seismic Toss foe).

### Item 1: Solar Beam in sun (committed)

Cause (not the two-turn rule): in sun `SolarBeamOnFirstTurn` runs `ppreduce` (kernel `set-battler-pp-data`, u = 7) BEFORE the used print (USEDMOVE, u = 16), so the print is the first message but not the first event. `usedMovePrintLeadU` (the print lead u - 2) and `actionTransitionPauseFrames` (the E + 1 + d + n + 6 + u transition) both looked at the first event only and fell back to the plain lead, so the used print, the body and everything after sat 33 rows early. Both now skip a leading `set-battler-pp-data`. Same shape: Substitute (`ppreduce` before `attackstring`).

| Lab (mass ENG-ROM) | before -> after |
| --- | --- |
| sbm1-sun-next-player-on | 126 -> 36 (print exact; SE 13 exact; SE 201 -1; the rest is the foe's next print -7) |
| sbm1-sun-same-player-on | 101 -> 2 (print 347 exact; SE 201 / second print -1) |
| sbm1-sun-next-player-off | 33 -> 7 (Solar Beam hit exact; the foe's next print -7) |
| sbm1-sun-same-player-off | 33 -> 0 |

Prints line: next ON/OFF 56 -> 14, same ON/OFF 100 -> 1. Pins moved (`tests/mvs1CalledMoveSounds.test.ts`, Substitute labs, the same ppreduce order): OFF player / opp SEs -1 / 40 / 65 -> 0 / 41 / 66 = the ROM rows; ON player drawn first shrink row 63 -> 64 = the ROM's 64 (its SEs stay -1: the hcr2c tick lead min(u - 2, 2) = 2 where the ROM needs 1, the same -1 as the Solar Beam SE 201); ON opp unchanged. New pin `tests/sbm1SunSolarBeam.test.ts` (SE 201 417 / ROM 418, hit SE 615 exact, OFF hit SE 281 exact).

Open: (1) the foe's action after a sun Solar Beam hit is 7 rows early in both scenes (ROM after the hit: `MoveEnd+0x0` 1286, `+0x6` 1287, `+0x9` 1290..1293, `EffectLevelDamage+0x0` 1294, print 1297 + 1 in the OFF lab; cause not found: the MoveEnd rows after a charging-flag turn, or an `actionTransition` shape; the earlier "-13 and 70 + 70 carried" for s97 is probably this family); (2) the SE 201 -1 (hcr2c lead min(u - 2, 2), a family fix, not a per-move number). Side effect: the transition pause now exists before a Substitute / sun Solar Beam action, so census shows an extra short `move-animation` hold (11 / 18 / 29 frames) in 9 battles (command type sequence changed, eventsDigest not).

### Item 2: the four ClearMonBg tail windows (committed)

The ROM script of Water Gun, Acid, Dizzy Punch and Pay Day ends `waitforvisualfinish; clearmonbg; (blendoff;) end`, with no wait after the clear: clearmonbg runs on the row the visual count reads 0 and creates `Task_ClearMonBg`, whose first run does nothing and whose second destroys the monbg tasks `Cmd_end` waits for (battle_anim.c:852-883), so gAnimScriptActive falls 5 rows after that row (hit2 endProbe, every such move I - c0 = 5). One helper, `clearMonBgTailWindow` (`liveMoveAnimation.ts`), adds those 5 rows to the four windows (51, 55, 146, 6 via `approxScriptDuration`); Crabhammer / Ice Beam / Ice Punch already end after the clear and are not touched.

| Lab (Scene ON mass) | before -> after | effectiveness SE (ROM) |
| --- | --- | --- |
| mechanic-water-gun-player-horsea-opponent-onix | 12 -> 2 | SE 14 196 -> 201 (202) |
| mechanic-acid-player-ekans-opponent-onix | 24 -> 14 | SE 12 209 -> 214 (214 exact) |
| mechanic-dizzy-punch-player-spinda-opponent-onix | 23 -> 13 | SE 12 161 -> 166 (166 exact) |
| aud262-payday-player-on | 35 -> 25 | SE 13 145 -> 150 (151) |

What is left in those labs is not the tail: Acid / Dizzy Punch's foe Confusion-hit `mv33` has no body adapter (-14 / -13, missing SE 139), Pay Day's coin message is -31 (its own print path), Dizzy Punch's following prints +1. Water Gun and Pay Day stay -1: their windows already ended one row before Acid's / Dizzy Punch's relative to the ROM's count-0 row; closing it is a per-move fit, not done. Pins: `tests/sbm1ClearMonBgTail.test.ts` (the four SE frames), `tests/apx222LastStaticClassesApproximate.test.ts` Pay Day window 85 -> 90 (aud262-payday-player-on SE 13 145 -> 150, ROM 151).

### Acceptance

**T2** (25 ON / 24 OFF seeds, 0 missing / 0 extra throughout):

| Scene | Mass base -> item 1 -> item 2 | Exact / offset (base -> final) |
| --- | --- | --- |
| ON | 10,213 -> 9,960 -> 9,960 | 3,158 / 2,719 -> 3,170 / 2,707 |
| OFF | 861 -> 822 -> 822 | 839 / 294 -> 842 / 291 |

Item 2 does not move T2 (none of the 49 seeds plays those four moves). **Census** 0..199 (`8b38fd60a` vs `ce76321bc`): eventsDigest and error identical 200 / 200 in both scenes; ON 17 battles with changed commands + 9 type-sequence (the hold above), OFF 0 changed + 9 type-sequence. `tree/` copies deleted.

**Tests:** every tests/ file importing `battleResolutionPresentation.ts` (163) or `liveMoveAnimation.ts` (59), `tests/chg*`, `bbk1*`, `cfs1*`, `hit1*`, `randomRoundSoak*`, `lbrd`, and the files naming WATER_GUN / ACID / DIZZY_PUNCH / PAY_DAY pass after two pin moves (`mvs1CalledMoveSounds`, `apx222LastStaticClassesApproximate`, both above); no randomRoundSoak trajectory pin moved. `npm run typecheck`, `npm run test:gate` (360 files / 2,839 tests) and `npm run build` pass.

## swt1 (Scene ON presentation / sound timing: the foe send-in tail, Supersonic s5569 d12)

**Item 1 (landed, `70f0d8b11`): the next command after an opponent faint replacement / AI send-in starts 9 frames later.** ROM rows (s165 d22, and lab `swt1-foe-faint-poison`, Scene ON): `FaintedMonSendOutNew+0x10` ex0 (the `waitstate` release, T) -> `FaintedMonEnd+0x0` T+5 -> next script label (`PoisonTurnDmg` / `BurnTurnDmg` / `RainContinuesOrEnds`) T+11 -> its first print glyph T+12 (T+13 / +14 for the damaging-weather and used-print variants). The engine's next command started at T+3, so every row after a foe send-in (tick print, status animation SEs, the weather line) was -9 (-10 / -11 in the other variants). SE_BALL_OPEN and the cry are on the send-in's own clock and were already exact; the rule leaves them alone. Rule: `battleResolutionPresentation.ts`, after the faint-replacement turn-end hold, an opponent `switch-in` with `aiSwitch` (faint replacement or `DoSwitchOut`), no `entryScriptHoldFrames` (pau5 entry scripts keep their own holds) and a following command that is not the `turn-end` (that case keeps its measured +11 menu hold) gets `settleHoldFrames += OPPONENT_SEND_IN_NEXT_PRINT_FRAMES (9)`. TrainerBattleForceOut (Roar / Whirlwind on the foe, 2 d10) and Leech Seed (319 d18, ekd1) are not `aiSwitch` and are untouched.

- Lab `tools/battle-lab/swt1-foe-faint-poison.json` (3x Rattata; the foe Toxics the player, Seismic Toss KOs the foe, then the replacement and the player's poison tick; trace extended with A presses past the faint and 4200 frames; `labCompare.sh --scene both --frames 4200`). Before -> after: ON SE mass 2540 -> 2486 (the 6 poison-tick SEs 9 closer each), prints mass 395 -> 386, tick print -21 -> -12; OFF SE mass 10 -> 10 (no SE after the tick), prints mass 178 -> 169, tick print -20 -> -11. The lab's remaining -10 / -11 is not the tail: the lab trainer's "sent out RATTATA!" box is 25 frames in the engine and 36 in the ROM (`FaintedMonSendOutNew+0xb` 1801 -> 1837), so the switch-in starts and SE_BALL_OPEN are -10 (same in fnt2's `hpf4m-faintpoison-off`); the real s165 window has that message exact. Not touched here. The ON Toxic SE rows (-92 / -95) and the 3 Splash SEs without a body adapter are the lab's other, unrelated misses.
- **T2** (`rescoreAll.sh` into `.integration/evidence/swt1/t2-{base,a1}`, 25 ON / 24 OFF seeds; 0 missing / 0 extra both): ON mass 10,213 -> 9,928, exact / offset 3,158 / 2,719 -> 3,165 / 2,712; OFF mass 861 -> 825, exact / offset 839 / 294 unchanged. Targeted scene (ON) improves, OFF does not get worse (it improves too).
- **Census** 0..199 (WORKTREE vs `9b07370b3`, `lsd194Census.sh` + `rst197CensusDelta.py --digest`): eventsDigest and error identical 200 / 200 in both scenes; 68 battles with changed presentation commands in each scene (ON 63,514 / OFF 62,209 commands), no type-sequence change. The `tree/` copies are deleted.
- **Tests**: 194 files (every tests/ file importing `battleResolutionPresentation`, `randomRoundSoak*`, `lbrd`) run; pins that moved, each because the soak / scripted players' presses land on shifted phases or a foe replacement is 9 frames longer, ROM row `FaintedMonSendOutNew+0x10` release -> next print +12:
  - `tests/randomRoundSoak.test.ts` seven-win pin (seed 21): frames 43,698 -> 43,712, renderCalls 3,060 -> 3,058 (same battle 7 / turn 3 / roundComplete); the M-B `full` seed 0 pin: frames 40,479 -> 40,489 (same battle 2 / depth 1 / turn 24 / roundLost); the Baton Pass halt pin: seed 12 no longer commits Baton Pass, re-scan `batonPassSearch.ts --seeds 0:40` candidates 5, 14, 25, pin 12 -> 5 (3 commits, first 76136, halt 76176).
  - `tests/sst1SandstormContinues.test.ts` (seed 44): 5 -> 6 sandstorm end turns within the cap, the per-turn ROM values (SE 88, buffeted 264 / 264 / 258 x4) unchanged.
  - `tests/lbrd.test.ts`: `WIN_TWO_SEED` 14 -> 0 (14's Scene OFF first round now loses, 6 WIN_TWO cases; scan 0..5 in that role: 0 passes 15 / 15, 2 / 4 fail the two continuation cases, 1 / 3 / 5 fail 10; RETIRE and the loss keep 10).
  - New `tests/swt1OpponentSendInNextPrint.test.ts` (lab trace, Scene ON): the foe switch-in carries `settleHoldFrames` 11 + 9 and the poison-tick message starts 160 frames after it (was 151).
  - `npm run typecheck` clean, `npm run test:gate` (360 files / 2,839 tests) and `npm run build` pass.

**Item 2 (not landed): Supersonic s5569 d12 -9 "after itself".** Probe `t2k4/probe.sh 5569 on 12` (ON). ROM: `EffectConfuse+0x2` ex0 at 37 -> `+0x2e` ex2 (anim launch A0) 44 -> the six SE_M_SUPERSONIC at 53 .. 73 (every 4) -> anim end `+0x2e` ex0 118 -> `MoveEffectConfusion+0x0` 121 -> `+0x7` ex1 122 -> SE_M_DIZZY_PUNCH 125 .. 195 (every 14). Engine: `move-animation` at 37 (min 32, 74 rows to the status), SE 184 at 51 .. 71 (-2, constant), `status-animation` at 111, SE 176 at 114 (-11). So the -9 "after itself" is two terms on top of the body's -2: (a) the ROM spends 7 rows (`+0x2` -> `+0x2e`, the kernel lead L before `attackanimation`) in front of the body that the engine does not present (Supersonic is not in `C_LEAD_WINDOW_ADJUST` / `BODY_LEAD_RULE`: no lead, body window ends 7 early, -2 SE but -7 end); (b) the status script's own launch gap `MoveEffectConfusion+0x0` -> `+0x7` = 4 rows (3 + 1 for the SE), which the engine's status command does not carry after this body. Measured: the anim end is -7 and the status SE start another -4, so the SE goes -2 -> -11 (the 2 of the body's own offset is separate). Tried: `[48, 0]` in `C_LEAD_WINDOW_ADJUST` (c-lead class): the body lead appears (6), the SEs move to -3, but the status command lands at 94 (-28 SE): the Supersonic body window composition (ring count 6 x period 4 + 30) is ~25 rows shorter than the ROM tail, so the adjust that closes it is +28, far outside the table's -2 .. 4 range, i.e. a free fit and not a ROM-row rule. Not landed because: Supersonic occurs in exactly one T2 window (s5569 d12; the other SE_M_SUPERSONIC rows belong to moves 93 / 94 / 347 / 95), and both `mechanic-supersonic-*` labs (Loudred / Onix) have no live body adapter in the engine ("unsupported staged SUPERSONIC pair": 0 exact, 19 / 18 SEs missing both before and after), so no second ROM window can check a rule. Next step: a lab with a pair the SUPERSONIC adapter supports (the s5569 pair), to fit the tail from two windows, then c-lead with `[48, ~28]` and a sound clock lead near 4.

## t2k6 (2026-11-22): the remaining S11 sound-timing mass re-ranked on fold-g = master + shb1 + fsi1 + ekd1 + cfs1 + sbm1 (measurement only; no `src/` / `tests/` change)

Tree: fold-g (`9c70b6443` is its head; landed since t2k5's `ab55ab029`: shb1, fsi1, ekd1, cfs1, sbm1; hse2 / chg4 / hie7 / drv2 / hit2 / etp3 / bbk1 / hpb3 were already in t2k5). Method as t2k5: `rescoreAll.sh` per scene into `.integration/evidence/t2k6/t2` (49 seeds, 25 ON / 24 OFF, ROM files = `t2n`; per-scene symlink dirs `t2-on` / `t2-off` for `soundScoreboard.py`, which reports 0 aligned seeds on the mixed dir), `soundScoreboard.py --per-seed`, `cmd.sh` (`T2K4_DIR`), `attr.py` -> `agg.py` / `own.py` / `stepclass.py` / `win.py`, `probe.sh` for the probed windows. New tools in `tools/integration/t2k4/`: `rank6.py` (the item table below, each window owned by one item; items + remainder = TOTAL; the Focus Punch segment rule: a segment containing cause gen:171 or body:FOCUS_PUNCH owns its held-item / FOCUS_PUNCH / gen:171 / chain:90 windows), `topwin.py SCENE [N]` (largest owned windows), `segstart.py SCENE [MINMASS]` (first-row-of-segment windows grouped by move and step). Evidence (git-ignored, main tree): `.integration/evidence/t2k6/` (`t2/`, `c/`, `attr-{on,off}.json`, `agg.txt`, `own.txt`, `rank.txt`, `stepclass-*.txt`, `topwin-on.txt`, `segstart-*.txt`, `score-{on,off}.{txt,json}`, `p/on/` probes + `*.cmp.txt`).

### 1. T2 on this tree (missing / extra 0 / 0 in both scenes)

| scene | mass | exact / offset | move-animation SE | stat | cry | battle-controller | bgm |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ON (25 seeds) | **9,798** (t2k5 11,531) | 3,170 / 2,707 (t2k5 3,059 / 2,818) | 7,966 (8,859) | 274 (303) | 340 (639) | 1,215 (1,678) | 3 (52) |
| OFF (24 seeds) | **822** (t2k5 1,186) | 842 / 291 (t2k5 784 / 349) | 0 (0) | 92 (146) | 135 (262) | 593 (776) | 2 (2) |

ON by class (agg): body 4,846, gen 3,120, controller hit 644, controller chain 571, cry 340, stat 274, bgm 3. OFF: no body / gen mass; a tail of small windows (largest 27).

**Drop since t2k5 (ON -1,733, -15.0 %; OFF -364, -30.7 %), per landed step as its section gives it:**

| step | ON | OFF |
| --- | --- | --- |
| shb1 (Shell Bell script rows after a hit) | -720 | -147 |
| fsi1 (forced / foe send-in) | -231 | -178 |
| ekd1 (items 2-3: Earthquake KO drain) | -162 | 0 |
| cfs1 (Levitate hold, Supersonic, status heads) | -367 | 0 |
| sbm1 (Solar Beam in sun, ClearMonBg tail windows) | -253 | -39 |
| **sum of the sections** | **-1,733** | **-364** |
| **measured** | **-1,733** (11,531 -> 9,798) | **-364** (1,186 -> 822) |

The step sections add up to the measured drop exactly in both scenes. One regression is hidden inside it: s8108 d12 gen:219 / SE 13 (+48) was -1 at t2k5 and is 96 mass now (cfs1 item 10, the Levitate hold: rel 567 -> 616); probe 4 below.

### 2. Ranked top 10 (rows owned disjointly by window, `rank6.py`; items + B4 + remainder = TOTAL)

**M** = a measured recipe exists, **new** = first measured here, **inh** = inherited from the previous command (no rule of its own). "clean" = windows that start from a previous offset of 0.

| rank | item | mass ON / OFF (sum) | windows ON / OFF | rule of its own? | recipe status | files / lines a landing touches | expected mass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Faint / send-in chain: SE 15 / 16 / 114, cry@faint | 739 / 280 (1,019) | 103 / 62 | mostly inherited (clean mass only 170 ON / 152 OFF); own: the OFF `message` 0.13 faint box (s6568 d104 -20, drv2 4.3) and the forced player send-in ball SE (t2k5 probe 1: -3 / -7 by name length, 2 rows x windows) | **M** t2k5 rank 9 (per-glyph rate), drv2 4.3; rest inh | `battleResolutionPresentation.ts` `switchInTiming` / `forcedPlayer` path, `message` 0.13 pulse | -90 clean (the carried 849 ON / 128 OFF moves with ranks 2 / 3) |
| 2 | Hit SE 12 / 13 / 14 | 465 / 436 (901) | 176 / 109 | OFF: yes, plain clean steps (-3 / -4 / -9 / -13; clean 407 of 436); ON: inherited (clean 76 of 465) | OFF **M** hse1m rows + hit2 item 1 (traced, not landed); ON inh | `battleResolutionPresentation.ts` hit-animation lead | OFF -150 .. -250 |
| 3 | Held-item group gen:152 / 228 / 102 (outside Focus Punch segments) | 815 / 0 | 61 / 0 | no: each window is the previous hit / print / status command's step (clean 190); shb1 landed the script rows | inh (shb1 M landed) | none | 0 on its own (fix the preceding command: ranks 5 and 10 first) |
| 4 | gen:180 Leech Seed drain | 760 / 0 | 17 / 0 | partly: clean 680 of 760; the (drain command start, lag) pair is unsettled (ekd1 item 2: the lab and T2 disagree on sign) | **M** ekd1 item 2 / t2k4 4a / g180m 4 (not landed) | `moveAnimSounds.ts:403` (`elapsed - (afterPlayerSendIn ? 0 : LEECH_SEED_DRAIN_SCRIPT_AGE)`), `battleResolutionPresentationRender.ts` 1897-1900 | -170 .. -380 |
| 5 | **Focus Punch family** (setup SE 171, lost-focus print, item rows after) | 640 / 0 | 22 / 0 | **yes**: the lost-focus print head after a not-very-effective message is ~13 short; the item exec -> SE age is 18 vs ROM 8 (SE 152 -17, then -9 after the SE 90 chain) | **new** (probe 2) | `battleResolutionPresentation.ts` lost-focus message head, `hpItemAnimationRows` age (shb1 `hpItemAnimationSeGate`) | -250 .. -400 (22 windows; clean 61, the rest carries) |
| 6 | Rock Slide body | 514 / 0 | 8 / 0 | no: inherited (s8612 -13 after Belly Drum 180, s165 +1 after a +4 hit-SE carry 100, three 20-row clean -3 windows 60 x3) | inh (t68m 3) | none | 0 |
| 7 | gen:148 poison / status tick | 456 / 0 | 17 / 0 | no: five inherited classes (s499 d3 / d5 / d7 carry -11 / -6, s165 -9 after a switch-in cry) | **M** t68m 6 class C (`switch-in` tail -9) | `battleResolutionPresentationRender.ts` `switch-in` tail | -54 |
| 8 | Weather tick: Sandstorm gen:219 / Hail gen:242 | 312 / 0 | 11 / 0 | yes, two own: **s2741 d9 hail after a foe faint replacement** (weather print head 10 rows short after a send-in; hie7's `afterPlayerSendIn` covers the player side only; 121 + 48 on s2741 d12) and **s8108 d12 gen:219** (cfs1 regression, 96); the Sandstorm -8 tick after Dig is the hse1m recipe | hail: **new** (probe 3); s8108 d12: **new** (probe 4, regression); Dig -8: **M** hse1m | `battleResolutionPresentation.ts` ~827 / ~6401 (`afterPlayerSendIn`, foe-side send-in), `sourcePauseUsedMoveHoldFrames` (Levitate hold, cfs1) | -169 (hail), up to -96 (s8108 d12) |
| 9 | stat SE 239 / 245 / 23 / 24 | 209 / 99 (308) | 53 / 31 | inherited (stat rows after a hit step; OFF clean 85 of 99, the -9 / -10 after a move-animation) | inh | none | 0 |
| 10 | **Psychic: s97 d11 natural thaw** (+ the Shell Bell rows after it) | 287 / 0 | 6 / 0 | **yes**: the engine inserts a `status` command (min 32) before the thaw print; the ROM runs `BattleScript_MoveUsedUnfroze` with no pre-hold | **new** (probe 1) | `battleResolutionPresentation.ts` `sceneOnStatusFrames` (2068; returns null for the attackcanceler thaw, so `STATUS_TIMING` min 32 applies) and the status command (~6446-6464); thaw string case `STRINGID_PKMNWASDEFROSTEDBY` (~3915) | -280 |
| | **Items 1-10** | **5,197 / 815 (6,012)** | | | | | |
| 11 | Confusion 123 + Supersonic 155 | 278 / 0 | 7 / 0 | Confusion: s8108 d17 -7 and d89 -32 after ctl-hit:13 (72 + 48); Supersonic: s5569 d25 -9 after itself (143) | Supersonic **M** cfs1 (c-lead class +164 ON: not landed); Confusion inh | `battleResolutionPresentation.ts` status-animation head | 0 |
| 12 | Two-turn second family (Dig, Solar Beam) | 260 / 0 | 17 / 0 | partly (s97 -13 x2 first charging turn, t2k4 9) | **M** t2k4 9 | `battleResolutionPresentation.ts` `isChargeTurnOpener` | -50 .. -117 |
| | B4 bodies (reported separately) | 274 / 0 | 32 / 0 | | | | |
| R | remainder (412 / 5 windows) | 3,789 / 7 | | per-move segment-start constants 1,418 over 158 windows, each tiny (see section 6) | | | |
| | **TOTAL** | **9,798 / 822** | | | | | |

Sum-check: ON 739 + 465 + 815 + 760 + 640 + 514 + 456 + 312 + 209 + 287 = 5,197; + 278 + 260 + 274 + 3,789 = 9,798 (`rank.txt`). OFF 280 + 436 + 99 = 815; + 7 = 822. Counts are row mass, not saving; the "expected" column is the window mass a rule of its own can remove, not the owned sum.

**What moved against t2k5's list** (same-class rows compared by `rank.txt` vs t2k5's table; classes were re-cut, so only the unchanged ones are exact). Held-item group 1,210 -> 815 outside Focus Punch segments (shb1, plus 640 now owned by rank 5), Psychic + Calm Mind 443 -> 287, Confusion + Supersonic 372 -> 278. **Unchanged to the row:** Rock Slide 514, gen:148 456, Leech Seed 760.

**Which items have a measured recipe.** M: rank 1 (drv2 4.3, forced send-in per-glyph), rank 2 OFF (hse1m + hit2 item 1), rank 4 (ekd1 item 2, g180m 4), rank 7 (t68m 6 C), rank 8 Dig tick (hse1m), rank 11 Supersonic (cfs1), rank 12 (t2k4 9). **New this step:** rank 5 Focus Punch, rank 8 hail-after-foe-send-in and the s8108 d12 regression, rank 10 Psychic thaw.

### 3. The probed new windows (ROM `hcr3mProbe` + engine `--cmdtrace`, frames from each side's commit)

1. **Psychic s97 d11, natural thaw (rank 10).** ROM: `BattleScript_MoveUsedUnfroze` (printfromtable, waitmessage, updatestatusicon) with no pre-hold, then the used print and the animation. Engine: a `status` command with min 32 first (the attackcanceler thaw returns null from `sceneOnStatusFrames`), then the thaw print. Cumulative deltas from the commit: thaw print +30, status-icon +28, used print +24, animation +17, first SE 184 +25; the Psychic body itself lags only +8 (ROM 72 vs engine 80), so the +25 is the head, not the body. Engine command: the `status` command from `set-battler-status-data` (`battleResolutionPresentation.ts` ~6446-6464). Expected about -280.
2. **Focus Punch family (rank 5), s310 d3 / d2, s1415 d49 / d47.** The lost-focus print head after a not-very-effective message is about 13 short; the item exec -> SE age is 18 against ROM 8, giving SE 152 -17 and -9 after the SE 90 chain. 22 windows, 640 mass, clean mass only 61: one rule at the head carries the rest. Engine commands: the lost-focus `message` after the `hit-animation` and the shb1 held-item rows (`hpItemAnimationRows`).
3. **Hail s2741 d9 after a foe faint replacement (rank 8).** ROM: send-in ends 848, weather print 861; engine print 851: the weather print head after a send-in is 10 rows short, so SE 242 is -11 (mass 121; s2741 d12 repeats it, 48). hie7's `afterPlayerSendIn` (827 / 6401) covers only the player's send-in; a foe-side replacement does not set it. Engine command: the general-animation weather row at end of turn (tables ~265-294) after `switch-in`.
4. **s8108 d12 gen:219 / SE 13 +48 (rank 8, post-cfs1 regression, 96 mass).** t2k5 had -1. The earlier heads are -12 / -12 / -23 / -35, then the engine used-print -> Levitate-print gap is 155 against ROM 71 (cfs1 item 10 Levitate hold; rel 567 -> 616). Engine command: the Levitate hold in `sourcePauseUsedMoveHoldFrames`. Not a new rule: cfs1 over-held on this seed; the cfs1 claim for it should be re-checked before any follow-up.

### 4. Windows that are not engine rules (harness / carried)

- OFF is a tail of small windows (largest 27; s6568 d104 -20 is drv2 4.3); no OFF window above 27 remains.
- Per-move first-row constants of a resolution segment (`segstart.py`): 1,418 ON mass over 158 windows, each tiny; this is the forced-commit anchor (drv2 3), not a body rule.
- Carried offsets: ON hit-SE / chain windows start from a nonzero previous offset in most rows (clean 76 of 465 hit SE, 170 of 739 chain).

### 5. Engine commands behind the probed windows

| window | ROM script rows | engine command | file |
| --- | --- | --- | --- |
| Psychic natural thaw | `BattleScript_MoveUsedUnfroze` (printfromtable, waitmessage, updatestatusicon) | `status` (min 32) before the thaw `message` | `battleResolutionPresentation.ts` `sceneOnStatusFrames` 2068, status command ~6446-6464 |
| Focus Punch lost focus | lost-focus print, `ItemHealHP_Ret` exec -> SE age 8 | `message` after a not-very-effective hit; `hp` item rows | `battleResolutionPresentation.ts` (`hpItemAnimationRows`) |
| Hail after a foe replacement | send-in end 848 -> weather print 861 | `general-animation` after the foe `switch-in` | `battleResolutionPresentation.ts` ~827, ~6401, tables ~265-294 |
| s8108 d12 Levitate | used print -> Levitate print 71 | `message` gap 155 | `sourcePauseUsedMoveHoldFrames` |

### 6. What not to chase

- The 3,789 ON remainder (412 windows) and the per-move segment-start constants (1,418 over 158 windows; each tiny); the Rest / Yawn / Wish / Dig bodies (about 190 each, carried or one-sided).
- ON hit-SE and chain carried mass (no per-family offsets); Rock Slide (514, inherited); the held-item scatter outside Focus Punch (815).
- A global `LEECH_SEED_DRAIN_SCRIPT_AGE` change (the lab and T2 disagree on sign), until the drain command-start / age pair is settled once (ekd1 item 2).
- `HP_TIMING.minimumFrames` -> 0 globally (hpb3: +621), B4 bodies (274), Supersonic in the c-lead class (cfs1: +164 ON), the OFF tail (5-27 per window).

Not applied: no `src/` or `tests/` change; PROGRESS / ISSUES / ROADMAP and all ledgers untouched; tools are python only; `npm test` / `npm run typecheck` / `npm run build` not run (assigned; no `.ts` touched).

## rcv1 (Scene ON + OFF presentation / sound timing, S11 #219 item 0): restore-HP body tails re-fit to the ROM print row; Scene OFF hit -> Leech Seed drain 35 rows

Presentation only: no battle-rule, damage or RNG change. Commits `ac70e23a3` (restore-HP tails), `e66ff81e6` (Synthesis tail + six ls2 labs), `492d78b67` (Scene OFF drain). Evidence (git-ignored): `.integration/evidence/rcv1/` (`lab-*`, `t2-*`, `score-*`, `census/`).

**Item 1: restore-HP bodies, hp -> "regained health" print (Scene ON).** The 19-row gap was not the hp -> print hold: the restore body's own tail (`HIE5_RESTORE_HP_BODY_TAIL_ROWS`, the rows held after the body's last visible row) overshot the ROM's `healthbarupdate` row (`BattleScript_EffectRestoreHp+0x16`) by the hie5 fit (25 / 10 / 27 / 8). Re-fit to the ROM print rows of the labs: Recover (105) 6, Soft-Boiled (135) 5, Milk Drink (208) 6, Moonlight (236) 4, Synthesis (235) 7 (also mirrored in `tests/helpers/iu120Rows.ts`). One rule for both scenes: Scene OFF has no bodies and its restore labs were already exact (print 0), so only the ON tail table moves. Labs (ON, regained-health print, engine - ROM): etp3-recoverls4 +19 -> 0, Soft-Boiled +5 -> 0, Milk Drink +21 -> 0, Moonlight +4 -> 0 (aud242k / aud242r labs), Synthesis -7 -> 0 (etp3-synthesisls2). New labs `etp3-{slackoff,morningsun,synthesis,moonlight,softboiled,milkdrink}ls2-{on,off}` (player Leech Seed vs foe heal move; `etp1MakeLabs.py`): print rows 0 on all six in OFF; ON mass milkdrink 10, moonlight 8, softboiled 15, synthesis 2. **Not fixed:** Slack Off (303, print -91) and Morning Sun (234, print +94) have no live body adapter in the engine (labCompare marks their ROM body SEs missing), so there is no tail to fit; a ROM-proven rule would need the body adapters first.
T2 ON: mass 9,441 -> 9,241, exact 3,237 -> 3,248 (0 missing / 0 extra); the Synthesis tail and the OFF rule do not move ON.

**Item 2: Scene OFF Leech Seed drain after a hit (sep1's +9).** ROM rows (etp1-leechseed-on.off): hit bar ends 346, `LeechSeedTurnDrain+0x0` 362, `Pausex20` 363, seeded `healthbarupdate` 396 -> **35 rows** from the Pausex20 start (a print-preceded OFF drain is 36 and was already exact with 44). Long bar (etp1-leechseedc-on.off): bar 333 -> 384, Drain+0 400, Pausex20 401, `healthbarupdate` 436: 35 again, but the engine hp command was 15 rows short (its 28-row floor ends the command at 384 + 2 where the ROM runs 16 more rows to the script), which is why the drain-only change moved that lab +6 -> -15. One rule (`battleResolutionPresentation.ts` `OFF_HIT_SEED_DRAIN_EARLY_ROWS` 9 and the hit hp command's `tailFrames` `HIT_TO_SEED_DRAIN_TAIL_ROWS` 15, the ON hit -> drain tail): the turn-end print `BattleScript_LeechSeedTurnPrintAndUpdateHp+0x12`, engine - ROM, OFF labs: aud250-leechseed-{player,opponent}-on +9 -> 0, etp1-leechseed-on +9 -> 0, lse1-leechseed-player-on +9 -> 0, etp1-leechseedc-on -6 -> 0 (was mass 6 with the +9 and the missing tail cancelling), etp1-leechseed2-on 18 -> 0. T2 OFF: mass 786 -> 782, exact 842 -> 843, battle-controller SE 566 -> 562, 0 missing / 0 extra, no family worse. Pin: `tests/sep1HitSeedDrainGate.test.ts` (rcv1 describe: turn-end print on ROM rows 422 / 529).

**Item 3 (faint box press-ready frame, OFF s6568 d104): not attempted.** It needs a one-frame ROM press scan on a faint-box lab; the verification chain took the remaining time.

**Census 0..199** (`lsd194Census.sh` + `rst197CensusDelta.py --digest`, base `44c9243ba`): eventsDigest + error identical 200 / 200 in both scenes. OFF: 0 changed commands. ON: 29 battles changed, all the restore-HP `hp` command minimumFrames (Recover -19, Soft-Boiled -5, Milk Drink -6, Moonlight -4, Synthesis +7) after a `move-animation` / `message`.
**Tests:** the 233 test files importing the changed files (+ `iu120Rows`), `tests/hpb3*`, `sep1*`, `lsd19*`, `fnt*`, `lbrd`, `randomRoundSoak*`: green except 5 failures that fail identically on the pre-rcv1 baseline (`tests/animation/liveNext5MoveAdapters.test.ts` x2, `liveAnchorMoveAdapters.test.ts` x3; unrelated, not touched). No pin moved. `npm run typecheck`, `npm run test:gate` (360 files / 2,839 tests) and `npm run build` green.

## pso1 (print holds: the foe send-in box, Perish Song's count prints)

Tree: fold-g (master + sbm1 + swt1) + three commits (`ab905ee33` lab stage, the Perish rule + ais2 re-pin, the Tier-1 pin). Presentation / sound timing only: no battle rule, damage or RNG change. Evidence: `.integration/evidence/pso1/` (`lab-*`, `t2-{base,after}`, `census/`, `2741-*`).

**Item 1 (a lab artifact, not an engine rule): the swt1 lab's "sent out RATTATA!" box is 25 frames in the engine and 36 in the ROM because the two sides name different trainers.** The lab's trace says `trainerId` 110 (BLACK BELT SHIZUKA); the engine's staged orchestrator draws its own opponent (LADY ZOE), so the box text is a different length ("LADY ZOE sent out RATTATA!" vs "BLACK BELT SHIZUKA sent out RATTATA!" wraps onto a second line). The engine already prints the ROM's length for the same text: with the staged opponent set to the lab's trainer the switch-in SE and the next print land on the ROM rows. Not reachable in ordinary play (a factory battle's opponent is the one it names), so nothing in `src/` changes. Tooling: `appTrace.ts` `labBackedStage(..., romTrainer)` (opt-in, `withOpponentTrainerId`; only `b4mEngine.ts` passes it, so `tests/cln11GenericLabStage.test.ts` and every other appTrace user keep the old stage). `swt1-foe-faint-poison` before -> after (`labCompare.sh --scene both --frames 4200`): ON SE mass 2,486 -> 2,416, prints 386 -> 376; OFF SE mass 10 -> 0 (6 / 6 exact), prints 169 -> 159. The remaining print mass is the lab's other offsets (ON poison-tick SEs, not the send-in).

**Item 2 (landed): Perish Song's count prints start the rows the ROM spends before them.** ROM rows (`hcr3mProbe.py` over `etk1-perish-*` / `etp1-perish-*`, Scene OFF; first glyph = the frame `sTextPrinters[0]` goes active + 1). The engine presented one `MoveEnd` receipt row between the previous print's release and the count print; the ROM runs the whole `MoveEnd` / `PerishSongCountGoesDown` / end-turn walk:

| Count print follows | ROM rows release -> glyph | engine lacked | source |
|---|---|---|---|
| a move's last print (Splash "But nothing happened!" lab) | release 368 -> `MoveEnd` -> `PerishSongCountGoesDown+0x3` ex1 378 -> glyph 379 | 10 | `etk1-perish-*` labs (OFF exact) |
| the cast's print (`STRINGID_FAINTINTHREE`, `waitmessage 64`; `PerishSongLoop` x4, `MoveEnd`, the end-turn step) | release +0x10 3857 -> `PerishSongTakesLife+0x3` 3874 -> glyph 3875 | 17 (the etk1 "-46 / -47" gap) | `etk1-perish-*` labs |
| the first count (second battler: `end2`, the turn-effect battler increment, next iteration) | 475 -> 479 | 5 | labs, and seed 2741 (every second count) |
| a paralysis print (`MoveUsedIsParalyzed`) | seed 2741 ROM glyphs 1181, 2545 | 5 | seed 2741 ROM rows, not the lab |
| "But it failed!" | seed 2741 ROM glyph 2439 | 12 | seed 2741 ROM rows, not the lab |

The rule is `perishCountChainLeadRows` (`battleResolutionPresentation.ts`), a `leadFrames` on a message whose source label is `BattleScript_PerishSongCountGoesDown` / `PerishSongTakesLife`; the previous message picks the row count (Splash-type / missed 10, paralysis 5, But it failed 12, the cast 17, another count 5). Any other predecessor (hp / animation: the Seismic Toss labs) keeps its own existing lead. The two seed-2741 values differ from the lab's 10 because the engine's own rows after those two prints differ from after Splash's; they are the seed-2741 glyph errors of the old engine (ROM glyph - engine start, Scene OFF: 3 / 8 / 10 / 5 / 12 / 5 in the three Perish turns), not lab-measured. `labCompare.py` / `b4mEngine.ts` now carry the message `leadFrames` (`msgLead`), so the lab tables show the first glyph, not the command start (the old tables could not show any lead on a message).

Labs before -> after (`labCompare.sh`, prints mass of the message first glyphs / SE mass; the ROM captures are shared between base and after):

| Lab | prints | SE |
|---|---|---|
| `etk1-perish-hold-off` / `spam-off` (OFF) | 111 -> 2 (exact 16 / 8 -> 23 / 1) | 18 -> 1 |
| `etp1-perish-off` (OFF) | 57 -> 8 | 18 -> 1 |
| `etp1-perish-on` (ON) | 61 -> 12 | 15 -> 8 |
| `etk1-perish-hold-on` / `spam-on` (ON) | 76 -> 45 (table pairing artifact, below) | 15 -> 8 |

Scene ON `etk1-perish-*`: the lab's Splash body is three animation loops the engine does not present (`ENG has no live body adapter for mv150`), so the ROM's Splash print is at 596 and the engine's at 504, and `labCompare.py` pairs the prints one row off (the engine's extra 504 print against the ROM's 596, then every count against the previous ROM print). The count prints themselves are a constant 92 frames early (600 vs 692, 701 vs 793) and their gap is the ROM's (101; before the rule they were 102 / 107 early: 10 and 5 rows off), the cast -> takes-life gap is 128 = ROM. Residuals: the Seismic Toss labs' count after the hp tail is 1 early (ROM 360, engine 359; both counts, both scenes: the hp tail path, not the Perish rule), the FaintAttacker print -2 / -3 (not Perish).

**ais2 seed 2741 windows re-pinned, same ROM frames.** The windows are keyed by engine frame, and the Perish counts in seed 2741 (the turns before the AI switch) now start the rows the ROM spends, so the window is later in engine time. The fixture md5 list matches the engine render at a shift of exactly 42 (OFF, 288 / 288 frames) and 37 (ON, 251 / 251): `romFrameOffset` 38 -> -4 and 46 -> 9, `lo` / `hi` 2747 / 3034 -> 2789 / 3076 and 3835 / 4085 -> 3872 / 4122, md5s unchanged (the hpd1 precedent). The new OFF offset is the one at the start of the battle (ROM glyph - engine message start -2 .. -5 over the first prints), i.e. the engine is now in step with the ROM at the window where it was 40 frames early. etp1 withdrew its rule because the ais2 windows moved 258 / 219; that rule (label +1) was a different, one-row-per-print rule and I could not reproduce those numbers: the md5 search over shifts -10..120 finds the pinned frames at exactly 42 / 37 with this one. Not isolated: seed 2741 has an engine -20 on the `MoveUsedIsParalyzed` print after the cast (ROM 131 rows after the cast's print, engine 111) and each Perish turn's tail (last count -> next turn's first print: engine 8 / 9 / 6 rows longer than the ROM's 27 / 30 / 29); they cancel against the leads to within 2 frames at the window (the ROM-axis offset at the window is -4 = the start-of-battle value).

- **T2** (`rescoreAll.sh` into `.integration/evidence/pso1/t2-{base,after}`, 25 ON / 24 OFF seeds; 0 missing / 0 extra both): ON exact / offset 3,177 / 2,700, mass 9,513 -> 9,513; OFF 842 / 291, mass 786 -> 786. Identical (the sound rows are on the ROM-driven cadence: only seeds 2741 ON / OFF's engine.json differ, in presentation command frames, not in sound rows). Not worse.
- **Census** 0..199 (`HEAD` vs `ab905ee33`, `lsd194Census.sh` + `rst197CensusDelta.py --digest`): eventsDigest and error identical 200 / 200 in both scenes; 9 battles with changed presentation commands in each scene (ON 63,530 / OFF 62,225 commands), no type-sequence change. The `tree/` copies are deleted.
- **Tests**: 264 files (every tests/ file importing `battleResolutionPresentation`, `appTrace`, `b4mEngine`, `labCompare`, `soundCensusRomReplay`, plus `ais*`, `fnt*`, `randomRoundSoak*`, `lbrd`, `etp1*`, `aud252*`; there is no `tests/etk1*`) pass, one exception that predates pso1: `tests/aud252LossBallOpen.test.ts` seed 2230 (engine minus ROM `[0, -3, 0 x5, -1]` vs the pinned `-4`; identical failure with the pre-pso1 presentation file swapped in, so it comes from fold-g, one frame toward the ROM; not re-pinned here). Moved pin: `ais2` (above). New `tests/pso1PerishCountPrints.test.ts` (4 Tier-1 tests: Scene OFF count first glyphs = the ROM's 379 / 480 / 1460 / 1561 / 2582 / 2683 / 3875, Scene ON count gaps = 101 / 128; each fails on the pre-pso1 source).
- `npm run typecheck` clean; `npm run test:gate` / `npm run build`: see the final report.

## ftp1: thaw, confusion-then-two-turn, hail, Focus Punch (integration lane, Scene ON presentation only)

Four items from the t2k6 ranking, each its own commit; no rule, damage or RNG change (eventsDigest identical on seeds 0..199, both scenes). Baseline re-measured on fold-g 251840769: ON 9,513 / OFF 786 (the 9,798 / 822 in the t2k6 text was stale).

| item | commit | rule | ROM row it now matches | ON mass | OFF mass |
| --- | --- | --- | --- | --- | --- |
| base | 251840769 | | | 9,513 (3,177 exact / 2,700 offset) | 786 (842 / 291) |
| 1 Psychic natural thaw (s97 d11) | 278b16e2b | `BattleScript_MoveUsedUnfroze` prints one row after the status write (`thawPrintExecution`); thaw message and icon use the wake-up script timing | s97 d11 print row; off121's OFF thaw command is 1 frame | 9,226 | 776 |
| 2 cfs1 regression (s8108 d12 gen:219) | 6439b89d5 | the two-turn second-turn used print no longer re-counts the confusion-ended script's wait rows (`TWO_TURN_AFTER_CONFUSION_PRINT_ROWS` = 46) | s8108 d12 (+48 -> -1) | 9,132 | 776 |
| 3 hail after foe-faint replacement (s2741 d9) | none | none needed | s2741 d9 hail SE 242 is -2 since swt1's +9 next-print fix (was -11); the print head is exact (860 vs ROM 860 / 861); d12 (no send-in) is -4 | | |
| 4 Focus Punch lost-focus print (s310 d3) | fb2ad56fc | `BattleScript_EffectFocusPunch` print starts 16 rows after the command start (`FOCUS_PUNCH_LOST_FOCUS_PRE_PRINT_ROWS`) | `EffectFocusPunch+0xa` print at 560 (engine 544); held-item SE 152 688 vs 687 (was -17), SE 228 / 102 -1 | 8,956 (3,180 / 2,697) | 776 (842 / 291) |

0 missing / 0 extra at every stage, both scenes. ON -557 (-5.9%), OFF -10.

Corrections to the t2k6 text:
- s8108 d12 was not cfs1's Levitate hold. The cause was the two-turn used-print lead (84 vs 35) re-counting the confusion print's wait rows; cfs1's lab pin (184 -> 1359) is untouched.
- Focus Punch: the held-item "exec -> SE age 18 vs 8" is not a separate rule. The ENG command start is not the ROM exec row; with the print head moved the SE lands -1 with no `hpItemAnimationRows` change.

Checks: labs (29: cfs1-digconf-*, etp3-*, hie1-*, shb1-holder-first-*, swt1-foe-faint-poison, sbm1-*; labCompare --scene auto) before == after, 29 labs / mass 2,807 both. Census seeds 0..199: eventsDigest + error identical 200/200 in both scenes; 9 changed-command battles per scene (the thaw status 32 -> 1 and its print leads, the lost-focus lead). Tests: 140 files (every importer of `battleResolutionPresentation`, cfs1*, swt1*, hie7*, lbrd, randomRoundSoak*) pass; `sa125StatusAnimationCommand` SA3 pin moved (thaw status 32 -> 1, ROM s97 d11 / off121). typecheck, `test:gate` (360 files / 2,839 tests), build pass.

Open: no Tier-1 pin for item 2's confusion-then-two-turn lead or for the lost-focus lead (only the T2 windows s8108 d12 / s310 d3); the ON sleep status-animation SE after a held-item heal (s310 d3 SE 197 -9) is the next Focus Punch-family row; s1415 d49 / d47 were not re-probed (no ROM probe on disk).

## ohs1: Scene OFF pre-move status prints without a launch (ConfusedNoMore, InLove)

Side lane, presentation timing only (Scene OFF; no rule / damage / RNG change). S11 #219 item 0: re-rank the OFF hit-SE windows, probe the largest clean-start class, land a rule only if it is one rule over the windows checked.

**Re-rank** (`hse1mSplit.py` / `hse1mTable.py` on the hse1m ROM captures, T2 OFF base 842 exact / 291 offset, mass 786; 94 hit-SE windows, owned mass 225; evidence `.integration/evidence/ohs1/table-base.txt`):

| Class | Windows | Mass | Note |
|---|---|---|---|
| plain (previous `MoveEnd`, end-turn, item / status rows) | 21 | 47 | heterogeneous, seed 97 d23 -7 alone is 7 |
| Focus Punch | 9 | 45 | seed 1415, up to +5 |
| `MoveUsedIsInLove` path | 6 | 28 | -3 on the largest |
| Struggle after `NoMovesLeft` | 23 | 27 | one window -9 (seed 7295 d17) |
| `MoveUsedIsConfused[NoMore]` path | 7 | 26 | -7 / -2 |
| hit SE with no used-print chain | 12 | 20 | |
| after a missed / failed action | 4 | 17 | |
| `MoveUsedWokeUp` | 10 | 13 | -1 each |

**Probe** (the -9 pair first: s7295 d8 and s6568 d29, `probe.sh` + `attr.py` + `stepclass.py`; cmp tables under `.integration/evidence/ohs1/p/off/`). The differing rows are the same in both: `BattleScript_MoveUsedIsConfusedNoMore` / `BattleScript_MoveUsedIsInLove` are `printstring; waitmessage B_WAIT_TIME_LONG (64); [status2animation]; return`; Scene OFF skips the `status2animation` launch, and the used move's `HitFromAtkCanceler` / `AccCheck` / `AtkString` rows then run before the used print. hse2 had already landed this for `MoveUsedIsConfused` (64 + 3 + 4); the two sibling heads were keyed on neither the label nor the OFF hold. ROM rows: ConfusedNoMore s7295 d8 wait release 53 -> `HitFromAtkCanceler` 118 -> used print 121 (64 + 5); InLove s6568 d29 print 9 -> 46 -> used print 115 (64 + 3 + 3). Also s7295 d19 / s6568 d21 / s7682 d4 (same shape).

**Rule** (`preMoveOffUsedPrintTiming`, `battleResolutionPresentation.ts`): in Scene OFF (`BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS`), a message whose source label is `MoveUsedIsConfused` / `MoveUsedIsConfusedNoMore` / `MoveUsedIsInLove` and whose next message is `STRINGID_USEDMOVE` holds 64 + 3 + 4 / 64 + 5 / 64 + 3 + 3 (minimum 0). Any other follower (the self-hit, the can't-attack print) keeps the old hold; Scene ON is not touched.

**Labs** (`labCompare.sh --scene off`, before -> after): `gsp3-attract-foe-off` prints 17 -> 17 (summary 0), `gate6-r10-attract-off` 0 -> 0, `hpf4m-confuse-off` prints 503 -> 493 (summary 1424 unchanged, desynced lab), `hpf4m-confuse-off-s3` 273 -> 273 (no ConfusedNoMore + used print in it). `mechanic-attract-in-love-pass-off` is not supported by labCompare (legacy `overrides.battlers`). No battle lab has an in-love print followed by a used print, so that hold is pinned by T2 only.

- **T2** (`rescoreAll.sh` into `.integration/evidence/ohs1/t2-{base,after}`, both scenes, `soundScoreboard.py`): OFF exact / offset 842 / 291 -> 848 / 285, mass 786 -> 733, 0 missing / 0 extra; ON 3,237 / 2,640 mass 9,441 unchanged, 0 / 0.
- **Census** 0..199 (`HEAD` vs `HEAD~1`, `lsd194Census.sh` + `rst197CensusDelta.py --digest`): eventsDigest and error identical 200 / 200 in both scenes; ON 0 changed commands, OFF 52 battles with changed presentation commands (62,225 commands). `tree/` copies deleted.
- **Tests**: every tests/ file importing `battleResolutionPresentation` (about 220 files), `hse2*`, `bbk1*`, `randomRoundSoak*`, `lbrd`. Moved pins, each read first: `randomRoundSoak` "full" seed 0 frames 40489 -> 40494 and seed 1 57622 -> 57634 (frames only, same battle / turn / end state; the +5 is the ConfusedNoMore hold, ROM s7295 d8), `lbrd` WIN_THEN_LOSE_SEED 10 -> 0 (10's challenge-2 loss no longer plays out; scan 0..15 found 0 / 2 / 4 passing, the other two roles unchanged), `sa125` "each status-animation command sits at its receipt" (`confusionOffHold` also reads the OFF NoMore / InLove holds at the ON hold, as hse2 did for the confusion print). New `tests/ohs1PreMoveOffHeads.test.ts` pins the NoMore 64 + 5 on `hpf4m-confuse-off` (the hse2 67 / 71 holds unchanged). `tests/animation/liveAnchorMoveAdapters.test.ts` (3) and `liveNext5MoveAdapters.test.ts` (2) fail on `HEAD~1` as well (not ohs1).
- `npm run typecheck` clean; `npm run test:gate` 360 files / 2,839 tests pass; `npm run build` ok.

**Not landed (findings).** Remaining OFF window mass is the segment-start head: the ROM's first print after the A press depends on the rows from the effect entry to `EffectHit` (`AllStatsUpHit` / `PoisonHit` 2 rows, Recoil / Struggle 4), the engine uses a constant +9, and the per-move constants are heterogeneous and partly driver anchors. Struggle s7295 d8 -4 and s7295 d5 / d7 -2 are this (engine A + 9 vs ROM A + 11 / 13). s7682 d103 (Struggle after a Poison Hit status animation, -9) is one window. Focus Punch (45) and the plain class (47) have no single owner row. Not one rule over the windows checked, so no change.

## t2k7 (2026-11-23): the remaining S11 sound-timing mass re-ranked on the run's final engine `74e01547a` + the soak driver fix (measurement only; no `src/` / `tests/` change)

Tree: master at the 2026-11-23 wind-down (landed since t2k6's fold-g: swt1, sep1, rcv1, pso1, ftp1, ohs1, sbx1; hse2 / chg4 / hie7 / drv2 / hit2 / etp3 / bbk1 / hpb3 / shb1 / fsi1 / ekd1 / cfs1 / sbm1 were already in t2k6 or before). The T2 replay was not re-run: `.integration/evidence/t2final-20261123` (49 seeds, 25 ON / 24 OFF, `rescoreAll.sh`, ROM files = `t2n`) is linked as `t2` and re-scored with `soundScoreboard.py` per scene (symlink dirs `t2-on` / `t2-off`), the scores reproduce the run's final figures exactly. Then the t2k6 chain: `cmd.sh` (`T2K4_DIR`, `SEEDS_DIR` = absolute path of `t2n`) -> `attr.py` -> `agg.py` / `rank6.py` / `topwin.py` / `segstart.py` / `probe.sh`. New tool in `tools/integration/t2k4/`: `remainder7.py [N]` (the `rank6.py` remainder windows grouped by cause group, mass / windows / clean-start mass, ON and OFF). Evidence (git-ignored, main tree): `.integration/evidence/t2k7/` (`t2` -> `../t2final-20261123`, `t2-{on,off}`, `c/`, `attr-{on,off}.json`, `agg.txt`, `rank.txt`, `remainder.txt`, `topwin-{on,off}.txt`, `segstart-on.txt`, `score-{on,off}.{txt,json}`, `p/on/` probes + `*.cmp.txt`). Note: `cmd.sh` needs `SEEDS_DIR` absolute (its default is relative to `workspace/`, which a worktree session does not have).

### 1. T2 on this tree (missing / extra 0 / 0 in both scenes)

| scene | mass | exact / offset | move-animation SE | stat | cry | battle-controller | bgm |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ON (25 seeds) | **8,684** (t2k6 9,798) | 3,251 / 2,626 (t2k6 3,170 / 2,707) | 6,981 (7,966) | 253 (274) | 331 (340) | 1,116 (1,215) | 3 (3) |
| OFF (24 seeds) | **719** (t2k6 822) | 849 / 284 (t2k6 842 / 291) | 0 (0) | 97 (92) | 115 (135) | 505 (593) | 2 (2) |

ON by class (`agg.py`): body 4,558 (3,899 rows, 2,386 exact), gen 2,423, ctl-chain 560, ctl-hit 556, cry 331, stat 253, bgm 3. OFF: ctl-hit 268, ctl-chain 237, cry 115, stat 97, bgm 2; no body / gen mass; the largest OFF window is 21 (s97 d13 Fire Blast hit SE +7 x3), s6568 d104 -20 (faint box) next.

**Drop since t2k6 (ON -1,114, -11.4 %; OFF -103, -12.5 %), per landed step as its section gives it** (each section measured on its own base, so the sum is not exactly the measured drop):

| step | ON | OFF |
| --- | --- | --- |
| swt1 (foe send-in -> next command +9) | -285 (10,213 -> 9,928) | -36 (861 -> 825) |
| sep1 (hit -> Leech Seed drain gate) | -112 (10,051 -> 9,939) | 0 |
| rcv1 (restore-HP body tails; OFF drain 35 rows) | -200 (9,441 -> 9,241) | no T2 number in the section (OFF rule only) |
| pso1 (Perish Song count prints) | 0 | 0 |
| ftp1 (Psychic thaw -287, two-turn print -94, hail 0, Focus Punch lost-focus -176) | -557 (9,513 -> 8,956) | -10 (786 -> 776) |
| ohs1 (OFF NoMore / InLove -> used print) | 0 | -53 (786 -> 733) |
| sbx1 (end-turn box clear) | 0 (byte-identical) | 0 |
| **sum of the sections** | **-1,154** | **-99** |
| **measured vs t2k6** | **-1,114** (9,798 -> 8,684) | **-103** (822 -> 719) |

The residual (+40 ON, -4 OFF) is the bases: ftp1 found t2k6's own text stale (fold-g was 9,513 / 786, not 9,798 / 822), and the sections' chains overlap on different trees; no step is hiding a regression of size here. The one t2k6 hidden regression (s8108 d12 gen:219, +48) was fixed by ftp1 item 2.

### 2. Ranked top 10 (rows owned disjointly by window, `rank6.py`; items + B4 + weather + Psychic + remainder = TOTAL)

**M** = a measured recipe exists, **new** = first measured here, **inh** = inherited from the previous command (no rule of its own). "clean" = windows that start from a previous offset of 0 (`rank.txt`).

| rank | item | mass ON / OFF (sum) | windows ON / OFF | rule of its own? | recipe status | files / lines a landing touches | expected mass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Faint / send-in chain: SE 15 / 16 / 114, cry@faint | 721 / 252 (973) | 103 / 60 | mostly inherited (clean 184 ON / 152 OFF). Own: **the faint print -> party-summary SE 114 leg** (probe 3: ROM SE 16 -> SE 114 76-84 rows, engine 62-69; windows s6079 d3 -15, s3738 d57 -14, 159) and OFF s6568 d104 -20 | 114 leg **new** (probe 3); s6568 d104: **M** sep1 item 3 / handoff (1) (press-ready frame, one-frame press scan on an lsf2 lab) | `battleResolutionPresentation.ts` `faint` command lead 68 / `message` 24 / `party-summary` lead 24-25 (~6440-6540) | -110 ON (114 leg incl. its carried SE 15), -20 OFF |
| 2 | Hit SE 12 / 13 / 14 | 442 / 359 (801) | 176 / 107 | OFF: yes, plain clean steps (clean 330 of 359; largest 21); ON: inherited (clean 77 of 442) | OFF **M** hse1m rows + hit2 item 1 (traced, not landed); ON inh | `battleResolutionPresentation.ts` hit-animation lead | OFF -150 .. -250 |
| 3 | Held-item group gen:152 / 228 / 102 (outside Focus Punch segments) | 800 / 0 | 61 / 0 | no: each window is the previous hit / print / status command's step (clean 190). Two classes with a front: s310 d2 / s1415 d47 -9 after the SE 90 chain (110) and s8108 d44 +1 after the confusion self-hit (115, prev -24) | -9 after SE 90: **M** handoff (2) (Focus Punch family next row, sleep status-animation SE 197 after the item heal; ftp1 open); rest inh | `hpItemAnimationRows`, shb1 `hpItemAnimationSeGate` | -110; the rest 0 on its own |
| 4 | gen:180 Leech Seed drain | 520 / 0 | 11 / 0 | **yes** (probe 1): the drain launch lag after a weather tick is 9, the ROM's is 0 (SE 180 = exec + 27); s310 d13 / d14 / d15 +9 x 10 rows (270), s319 d18 +8 after a switch-in cry (80) probably the same class (not probed), s648 d10 +3 / d12 -5 (120, other contexts) | **new** (probe 1); the sep1 / ekd1 lab-vs-T2 sign question is this: the lab context (drain after a hit) needs the +9, a drain after a weather tick or a send-in does not | `battleResolutionPresentation.ts` ~6537-6545 (drain command build: set `launchLagFrames: 0` when the previous command is a weather `general-animation`), `battleResolutionPresentationRender.ts` 1899-1907 (`leechSeedDrainBodyStartAge`, `leechSeedDrainLaunchLag`); the body pixels keep age 7 (sep1 term 3) | -270 .. -350 |
| 5 | Rock Slide body | 514 / 0 | 8 / 0 | **yes** (probe 2, was "inherited" in t2k6): the first SE 131 is 3 rows early in the clean windows (s1914 d11: ROM exec 42 -> SE 51, engine cmd 36 -> SE 48; Flame Wheel is exact on the same command shape); s8612 d8 is -9 after Belly Drum (the same -3 plus the self-target print leg -6, 180) | **new** (probe 2) | the move-animation script row table for Rock Slide (`animSoundOps.ts` / `moveAnimSounds.ts` per-move first row; `moveAnimationScriptStartRow` 1806 gives the generic 4) | -180 (three clean 20-row windows) .. -400 |
| 6 | Focus Punch segments (SE 171, lost-focus print, item rows after) | 480 / 0 | 22 / 0 | partly: ftp1 moved the print head; what is left is carried (clean 61); s1415 d50 -2 after gen:171 (91) | **M** ftp1 open terms (the constant 16 for one window; s1415 d47 / d49 not re-probed) | `battleResolutionPresentation.ts` `FOCUS_PUNCH_LOST_FOCUS_PRE_PRINT_ROWS` | -60 .. -150 |
| 7 | gen:148 poison / status tick | 402 / 0 | 16 / 0 | no: s499 d3 / d5 carried -11 after stat SEs (72 + 42 + 30), s165 -9 after a switch-in cry | **M** t68m 6 class C (`switch-in` tail -9) | `battleResolutionPresentationRender.ts` `switch-in` tail | -54 |
| 8 | stat SE 239 / 245 / 23 / 24 | 209 / 105 (314) | 53 / 33 | inherited (OFF clean 95 of 105: the -9 / -10 after a move-animation) | inh | none | 0 |
| 9 | Confusion + Supersonic | 278 / 0 | 7 / 0 | Supersonic s5569 d12 -9 after itself (143); Confusion s8108 d8 -7 (72) and d44 -32 (48) after ctl-hit:13 | Supersonic **M** swt1 item 2 / cfs1 (needs a lab pair the SUPERSONIC adapter supports; handoff (3)); Confusion inh | `battleResolutionPresentation.ts` status-animation head | -143 (with the lab pair) |
| 10 | Two-turn second family (Dig, Solar Beam) | 260 / 0 | 17 / 0 | partly (s97 -13 x2 first charging turn) | **M** t2k4 9 | `battleResolutionPresentation.ts` `isChargeTurnOpener` | -50 .. -117 |
| | **Items 1-10** | **4,626 / 716 (5,342)** | | | | | |
| 11 | Weather tick: Sandstorm gen:219 / Hail gen:242 | 119 / 0 | 11 / 0 | s2741 d12 hail -7 with no send-in (48), the rest carried (t2k6's 312 -> 119 after swt1 / ftp1) | inh | none | 0 |
| 12 | Psychic natural thaw + Shell Bell rows | 23 / 0 | 5 / 0 | landed (ftp1 item 1: 287 -> 23) | done | | 0 |
| | B4 bodies (reported separately) | 265 / 0 | 32 / 0 | | | | |
| R | remainder (411 / 4 windows) | 3,651 / 3 | | segment-start per-move constants (below) | | | |
| | **TOTAL** | **8,684 / 719** | | | | | |

Sum-check: ON 721 + 442 + 800 + 520 + 514 + 480 + 402 + 209 + 278 + 260 = 4,626; + 119 + 23 + 265 + 3,651 = 8,684 (`rank.txt`). OFF 252 + 359 + 105 = 716; + 3 = 719. Counts are row mass, not saving; the "expected" column is the part a rule of its own can remove, not the owned sum.

**Moved against t2k6** (same classes): Psychic 287 -> 23 (ftp1), Focus Punch 640 -> 480 (ftp1), weather 312 -> 119, held-item group 815 -> 800, Leech Seed 760 -> 520 (sep1 / rcv1 / ekd1), faint chain 1,019 -> 973, hit SE 901 -> 801 (OFF 436 -> 359), gen:148 456 -> 402, stat 308 -> 314 (OFF +6). **Unchanged to the row:** Rock Slide 514, Confusion + Supersonic 278, two-turn 260, B4 265 (274 -> 265).

**Which items have a measured recipe.** M: rank 1 OFF s6568 (sep1 item 3), rank 2 OFF (hse1m + hit2 item 1), rank 3 SE 90 pair (handoff 2), rank 6 (ftp1 open), rank 7 (t68m 6 C), rank 9 Supersonic (swt1 item 2), rank 10 (t2k4 9). **New this step (probed):** rank 4 (drain launch lag after a weather tick), rank 5 (Rock Slide first SE +3), rank 1's SE 114 leg. Not new and not recipe-able: ranks 2 ON, 8, rest of 3.

**Recommended landing order** (largest certain saving per rule): (1) rank 4, one `launchLagFrames: 0` case, -270+ with an existing seam and labs (`etp1-leechseed*-on`, `etp3-recoverls4-on`, `aud250-leechseed-*`, `hie1-*` must stay at their pins: the lab contexts are drain-after-hit / after-print, which this does not touch); (2) rank 5, a per-move constant checked against the Rock Slide windows (-180 certain); (3) rank 2 OFF hit-SE rows (hit2 item 1, -150 .. -250); (4) rank 1 SE 114 leg (-110, needs the faint-print length discriminator, below).

### 3. The probed windows (ROM `hcr3mProbe` + engine `--cmdtrace`, frames from each side's commit; `probe.sh`; the three new ones)

1. **s310 d13 (d14 / d15 identical), Leech Seed drain after the Sun tick (rank 4, 90 each).** ROM: `BattleScript_SunlightContinues+0xd` ex0 1017 -> `LeechSeedTurnDrain+0x0` 1020 -> `+0x7` ex2 (animation launch) 1021 -> SE 180 at **1048** (exec + 27), SE 142 x9 every 6 from 1066, SE 179 at 1161, `+0x12` ex2 1230, seeded hp / print 1250 / 1255. Engine: SE 202 (Sun) 879 exact; drain command start 1021 exact; SE 180 **1057** (command + 36 = 27 + `LEECH_SEED_DRAIN_SCRIPT_AGE` 7 + `LEECH_SEED_DRAIN_AFTER_PRINT_EXTRA_AGE` 2), SE 142 from 1075, SE 179 1170: every drain SE +9, and the hp commands (1239 / 1266) and prints are exact. So the weather-tick context behaves like the player-send-in one (hie7: ROM exec -> SE is 27 there too): launch lag 0, not 9. Engine command: the drain `general-animation` (`LEECH_SEED_DRAIN`) following a weather `general-animation` (`SUN_CONTINUES`). Expected -270 for the three windows (+ s319 d18 +8 after a switch-in cry, 80, unprobed).
2. **s1914 d11 (clean) and s8612 d8 (after Belly Drum), Rock Slide (rank 5).** s1914 d11: ROM `EffectFlinchHit` -> `HitFromAtkString+0x1` ex1 12 -> ex0 36 -> anim exec `HitFromAtkAnimation+0x1` 42 -> first SE 131 **51**, then every 4 (20 rows); engine `message` 13, `move-animation` 36 (bodyLead 5), first SE **48**: constant -3 on all rows. The same command shape for Flame Wheel (s310 d13: exec 45 -> SE 51, engine 39 -> 51) is exact, so the engine's generic command -> first SE of 12 does not hold for Rock Slide: ROM anim exec -> first SE is 9 here against 6 for Flame Wheel. s8612 d8: after Belly Drum (ROM `MoveEnd` 367, Rock Slide `EffectHit` 376, `HitFromAtkString+0x1` ex1 380 -> ex0 406 -> exec 412) the first SE is ROM 421 vs engine 412 (-9 = the -3 plus a -6 print-to-animation leg after a self-target stat move; Belly Drum's own SEs are +4: 55 vs 51, carried). Expected -180 (three clean windows) up to -400.
3. **s6079 d3 (Spark KO, foe faints; -15) and s3738 d57 (poison tick KO; -14), the faint -> party-summary SE 114 leg (rank 1).** s6079 d3: ROM `FaintTarget+0x7` ex2 366 -> SE 16 367 -> ex0 385 -> print `+0xc` ex1 387 -> ex0 424 -> `MoveEnd` 425 -> `GiveExp+0x0` 431 -> `HandleFaintedMon+0x0` 437 -> `FaintedMonTryChoose+0x6` ex2 441 -> SE 114 (`SE_BALL_TRAY_ENTER`) **451**; engine: `faint` 287 (lead 68, min 89) -> SE 16 363 -> `status` 376 -> `message` 377 (min 24) -> sprites 405 / 406 -> `party-summary` 407 (lead 25) -> SE 114 **432**: ROM SE 16 -> SE 114 is 84 rows, engine 69; s3738 d57 ROM 772 -> 848 = 76, engine 62 (SE 15 -17 after it). The same leg is exact in s165 d22 and s3738 d38, so the ROM length depends on something the engine takes as constant (the faint print's glyph count, the fsi1 per-glyph recipe, is the first suspect; not resolved here: the ROM probes in `p/on/` carry the print rows, the faint print text per window is the next measurement). Engine command: `faint` / `message` / `party-summary` lead (`battleResolutionPresentation.ts` ~6440-6540). Expected -110 ON.

### 4. Windows that are not engine rules (harness / carried)

- The 3,651 ON remainder is a long tail of per-move first-row constants (`remainder7.py`; `segstart.py` total 1,209 over 155 windows): Rest 196 (18 windows), Yawn 190, Wish 164, Ice Beam 152, Struggle 150, Double-Edge 138, Double Team 100, Surf 92 (23 windows, -3 x12 each), Torment 80 (one -9 window, s165 d9), Bubble Beam 79, Thunderbolt 75, Ancient Power 73, Agility 70 ... each below 200; many are the drv2 forced-commit anchor or one-window carries (clean-start mass 2,301 of 3,651, but spread over 411 windows).
- OFF is a tail (largest window 21); the s6568 d104 -20 faint box is the harness's 17-frame press pulse spacing (sep1 item 3).
- Carried offsets: ON hit-SE / chain windows start from a nonzero previous offset in most rows (clean 77 of 442 hit SE, 184 of 721 chain).

### 5. Engine commands behind the probed windows

| window | ROM script rows | engine command | file |
| --- | --- | --- | --- |
| Leech Seed drain after Sun | `SunlightContinues+0xd` -> `LeechSeedTurnDrain+0x7` ex2 -> SE 180 at exec + 27 | `general-animation` `LEECH_SEED_DRAIN` after `general-animation` `SUN_CONTINUES` (launch lag 9, ROM 0) | `battleResolutionPresentation.ts` ~6537, `battleResolutionPresentationRender.ts` 1899-1907 |
| Rock Slide | `HitFromAtkAnimation+0x1` ex1 -> SE 131 at +9 | `move-animation` (bodyLead 5) -> script row of the first SE | `moveAnimSounds.ts` / `animSoundOps.ts` per-move row; `moveAnimationScriptStartRow` (`MOVE_SCRIPT_START_ROWS_AFTER_LEAD` 4) |
| faint -> SE 114 | `FaintTarget+0xc` print -> `GiveExp` -> `FaintedMonTryChoose+0x6` ex2 -> SE 114 | `faint` (lead 68) / `message` (24) / `party-summary` (lead 24-25) | `battleResolutionPresentation.ts` ~6440-6540 |

### 6. What not to chase

- The 3,651 ON remainder (411 windows) and the segment-start per-move constants (Rest, Yawn, Wish, Ice Beam, Struggle, Double-Edge, ...): each is below 200 and most are one-window or the forced-commit anchor.
- ON hit-SE and chain carried mass (no per-family offsets); the held-item scatter outside the SE 90 pair; stat SE (inherited); Rock Slide's s8612 -9 print leg until the -3 constant is in (it may close it).
- A global `LEECH_SEED_DRAIN_SCRIPT_AGE` / `AFTER_PRINT_EXTRA_AGE` change: the lab (drain after a hit / print) and T2 (after a weather tick / send-in) disagree because the context differs; change the lag per context only (rank 4).
- `HP_TIMING.minimumFrames` -> 0 globally (hpb3: +621), B4 bodies (265), Supersonic in the c-lead class (cfs1: +164 ON), the OFF tail (5-21 per window), weather (119, carried), Psychic (done).

Not applied: no `src/` or `tests/` change; PROGRESS / ISSUES / ROADMAP and all ledgers untouched; the one new tool is python only; `npm test` / `npm run typecheck` / `npm run build` not run (the step forbids them; no `.ts` / test touched).
