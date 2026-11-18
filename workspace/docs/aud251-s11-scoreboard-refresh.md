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
