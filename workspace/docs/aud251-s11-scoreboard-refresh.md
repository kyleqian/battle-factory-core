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

`B_ANIM_HELD_ITEM_EFFECT` = `General_HeldItemEffect` (`data/battle_anim_scripts.s:10440-10460`): three `playsewithpan SE_M_TAKE_DOWN` (152) each followed by `AnimTask_RotateMonToSideAndRestore` + `waitforvisualfinish`, then SE_M_MORNING_SUN (228), then SE_SHINY (102). It is started by Leftovers (`src/battle_util.c:3400-3413`, `BattleScript_ItemHealHP_Ret` -> `ItemHealHP_End2`, `data/battle_scripts_1.s:4373-4384`) and by the cure berries (`RemoveItem`, `:4356-4364`). The group is **not** where the drift is made: its internal intervals are within +1 of the ROM, constant over turns and seeds (app 32, 32, 32, 27 vs ROM 32, 32, 32, 72 .. 6 are the same script lengths; the per-SE offsets inside a group are flat, e.g. 27 27 27 27 27 below). The group's own contribution (offset of its SE1 minus the offset of the previous matched row) is small and constant: lead +4 after a message, +2 after a recoil message, +3 after a `HitFromAtkAnimation` print, -1 after an hp row, +8 / +9 after a `status-icon`; the animation tail +1; message -> hp -3. Over the 94 groups the mass would be **4,205 if the group's own jump were zero (4,650 now)**, so a group-only lead rule would gain about 10 % of the class. The mass is inherited from earlier commands of the same turn.

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

Same shape. res10: wake-up (status 9 -> message 41 vs ROM waitmessage 9 -> return 91) -> infatuation (`BattleScript_MoveUsedIsInLove+3` waitmessage 95 vs app status-icon 121 / message 122; ROM `ANIM+` 197, SE 212 at 200 / 217 / 234, app status-animation 225 INFATUATION, SE 235 / 252 / 269) -> Bulk Up (ppreduce 297, SE 193 / 193 / 193 / 239) -> Yawn (701 ppreduce, SE 739) -> held-item group. Offsets per SE: **+35 x3 (infatuation: 32 from the wake-up `status` + 3 from the infatuation message order), +24 x3 (Bulk Up SE 193: the status-animation tail is 11 short), +28 (Bulk Up SE 239: a 4-frame move-animation lead), +24 x3, +29 x5 (the group)**. res1 (Yawn -> asleep -> Chesto berry cure): the `status-icon` -> group lead is 25 vs the ROM's 16 (+9, the +8 / +9 "after a status-icon" jump of section 1). res17 (infatuation + wake-up): +29 .. +34 like res10. Seed 2230 (11 groups, 675 mass) is the same set (wake-up + Yawn + Leftovers): 2 of its 4 drift turns carry the wake-up `status`.

### 4. Causes, ranked by mass

| rank | cause | rows / turns | where | measured size |
| --- | --- | --- | --- | --- |
| 1 | **wake-up `status` command default 32 frames** | all wake-up turns (s5063 res8 / 12 / 16 / 20 / 24 / 28 / 32 / 36 / 40, s1415 res10 / 14 / 17 ...) | `status` emission for `set-battler-status-data` ~5530-5540, `STATUS_TIMING` 2220 | +24 .. +29 per turn at every following SE, inherited by every later command in the turn, incl. the five-SE group; wake-up message ROM +9 .. +12, app +41 |
| 2 | held-item restart / continue lead after a message / status-icon (`HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES = 15`, `..._CONTINUE_LEAD_FRAMES = 9`, `..._AFTER_STATUS_EXTRA_FRAMES = 1`, lines 160-214) | 94 groups | | +4 after a message, +8 / +9 after a status-icon (the group's own jump, 4,650 -> 4,205 if zero) |
| 3 | status-animation (infatuation / Yawn) tail + Bulk Up lead | s1415 res10 / 14 / 17 | | +3 .. +5 each |
| 4 | Curse lead / tail (body 174) | s5063 res0 and 5 more | `lead1m` B4 C-body | lead +10, tail to the first message -9 |
| 5 | Rest (156) / Struggle (165) hit / recoil hp bars | s5063 res40, s1415 | | +22 .. +23 late (probably the wake-up shift in res40; Rest in res0 of the first group, ignore the "body:156" label) |
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
