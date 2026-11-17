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
