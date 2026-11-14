# aud248: S11 (audio) scoreboard against its acceptance (measurement step, no `src/` change)

Tested tree: `3bf10bbcf` (tree `e2a06a3de`, `src/` `29edeb86b`), oracles Battle Scene ON `:8012` and OFF `:8014`. Evidence (ignored dir): `.integration/evidence/aud248/` =
`census/{on,off}-3bf10bbcf/r*.jsonl` (T1 arms), `t1-{on,off}.json`, `chain/<seed>-<scene>.{req,setup,engine,drive,frozen,tl,cmp,snd}.json` (T2 runs), `scoreboard.{txt,json}`, `vitest-audio.txt`.

Finish-plan acceptance (Audio S11): census 0..999 with **0 missing / 0 extra** sound events in both scenes, audio RAM probes byte-pinned, full suite + build, soaks unchanged.
**Verdict: not met.** The emitter is self-consistent with its table (T1: 0 extra, 0 unclassified) and the RAM pins are green, but T2 against the ROM shows large missing families (below).

## Commands (reproducible)

```sh
# T1: rule-table census 0..999 both scenes (~12 min at 3 jobs, resumable)
export LSD194_CENSUS_JOBS=3 LSD194_SPLIT=4
sh tools/integration/lsd194Census.sh <fresh-root> HEAD:on HEAD:off
python3 tools/integration/soundCensusDelta.py --t1 <fresh-root>/on-<sha>  --json t1-on.json
python3 tools/integration/soundCensusDelta.py --t1 <fresh-root>/off-<sha> --json t1-off.json
# T2: per seed/scene = romDriveSeed.sh chain (request -> ROM setup -> engine replay -> closed-loop ROM drive -> timeline -> compare, ~1 min)
#     + ROM sound pass (hybrid `lab` hooks on the frozen trace, ~1.5 min); at most 2 at once under nice -n 19
tools/audio/aud248RunSeed.sh SEED on|off DIR           # new; writes DIR/<seed>-<scene>.{...,snd}.json
python3 tools/audio/soundScoreboard.py DIR --out scoreboard.json   # new; per-family exact / offset / missing / extra
npx vitest run tests/aud2 tests/audio tests/factoryM4a             # pin + aud24x tests (~2 min)
```

## T1: census 0..999 rule-table counts (`soundCensusDelta.py --t1`)

Rows emitted vs gated vs declined (aud243a units: exact / extra / declined / cry-task / other are SE or pan **rows**, gated is table **ops**).

| class | Scene ON | Scene OFF | aud243a ON (older engine) |
|---|---|---|---|
| exact (emitted == table row) | 240969 | 0 | 236527 |
| known-offset | 0 | 0 | 0 |
| missing-gated (ops the table cannot resolve: `end` 11219, `unresolved-branch` 528) | 11747 | 0 | 14353 |
| missing-declined (command with a body request but no live body) | 4 (3 commands: BEAT UP 2, WITHDRAW 1, ROCK SMASH 1) | 0 | 0 |
| missing-cry-task (ROAR 336, HYPER VOICE 27, HOWL 8; reachability upper bound) | 371 | 0 | 240 |
| missing-other (pan task outlives body: SIGNAL BEAM 371, MUD SHOT 50) | 421 | 0 | 400 |
| extra / unclassified | 0 / 0 | 0 / 0 | 0 / 0 |

Commands: ON 39802 = 27177 live + 12622 Scene ON action-transition pauses + 3 declined; OFF 41445, all `HITMARKER_NO_ANIMATIONS`, 0 move-animation SEs (OFF's T1 is vacuous by design).
Emitted rows over 1000 battles: ON 331298 (se 156468 = menu 12767 + controller family 46125 + move-animation 97576; cry 9972; bgm 444; pan 143393; duck 19844; stop 1177), OFF 90334 (se 58897 = menu 12767 + controller 46130; cry 9972; bgm 444; duck 19844; stop 1177).
Top gated moves (ops): SLUDGE BOMB 1764, BLIZZARD 957, STRUGGLE 711, PSYCHIC 615, TRI ATTACK 536, CONFUSE RAY 523, SHADOW BALL 458, FAINT ATTACK 442.
aud243a vs now is not like-for-like: gameplay fixes since changed the battles of the same seeds (ON commands 40091 -> 39802). Gated ops improved (14353 -> 11747); cry-task and declined grew with the new trajectories.
T1 cannot see ROM-vs-engine differences (stat-change SE and the stat rows below are invisible to it, since the table has no stat-change source).

## T2: ROM replays by family (`soundScoreboard.py`)

Seeds: 20+ per scene from `docs/replay-batches/regression-pool.txt` (every 38th-ish, skipping seed % 49 == 26), driven through `romDriveSeed.sh`. **Aligned to battle end (all engine states matched in order, drive stop = outcome):**
ON 21 seeds `2 6 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6912 7295 8108 8612`; OFF 20 seeds `2 165 499 830 1028 1415 1914 2230 2741 3158 3738 4235 4686 5063 5569 6079 6568 6912 7295 7682`.
Not used: ON 6568 and 7682 diverge near the 80000-frame drive cap (battles of 100+ turns; engine states 103/106 and 91/114 matched), OFF 6 (not run). The chain never failed otherwise (0 FAIL, all other runs 100% state-matched: gameplay RNG alignment holds).
Method: per decision segment (menu k, resolution k; `soundSegmentDiff.py` anchors) the ordered `(kind,id,pan)` lists are aligned (difflib). `exact` = matched row at the same offset from the segment start, `offset` = matched at a different offset (the engine's presentation is not ROM-frame-exact, aud243d §5), `missing` = ROM-only, `extra` = engine-only. Menu SE_SELECT (5) is input-driven and excluded; pan / duck / stop / fade rows are not compared; rows before the first menu and after the last resolution are not in the window.

| family | ON exact | ON offset | ON missing | ON extra | OFF exact | OFF offset | OFF missing | OFF extra |
|---|---|---|---|---|---|---|---|---|
| move-animation SE | 204 | 2218 | **1569** | 0 | 0 | 0 | 0 | 0 |
| stat-change SE (239 / 245) | 0 | 0 | **85** | 0 | 0 | 0 | **89** | 0 |
| cries | 4 | 159 | 8 | 0 | 2 | 159 | 0 | 0 |
| battle-controller SE | 61 | 549 | 17 | 31 | 16 | 679 | 6 | 20 |
| BGM | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 4 |
| fanfare | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| screen SE (menu segments) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **total** | 269 | 2926 | **1679** | 36 | 18 | 838 | **95** | 24 |

Matched-row frame delta (engine minus ROM, from segment start): move-animation SE median -2 (p10 -17, p90 +5), controller SE median -6 / -3 (ON / OFF), cries median -10 / -8: the engine is early by a few frames, as in aud243d. The ordered content matches on 2926 + 838 rows; only 287 rows match at the exact frame offset.
Not covered by T2 (the ROM drive starts at the first action menu and stops at the outcome): intro / battle-start BGM, the battle-end fanfare and victory music, screen SEs of draft / swap / summary (aud240 owns those with its own ROM windows). BGM / fanfare / screen rows are therefore 0 by window, not by proof.

Top differing ROM-only SE rows (ON): 152 SE_M_TAKE_DOWN 300, 176 SE_M_DIZZY_PUNCH 216, 148 SE_M_TOXIC 180, 102 SE_SHINY 107, 228 SE_M_MORNING_SUN 106, 197 SE_M_SNORE 69, 196 SE_M_CONFUSE_RAY 65, 212 SE_M_CHARM 54, 239 SE_M_STAT_INCREASE 49, 137 SE_M_ICY_WIND 44, 242 SE_M_HAIL 40, 245 SE_M_STAT_DECREASE 36.
OFF: 239 x47, 245 x42 (stat change), controller SE 13 / 15 / 90 (11 rows).

## Ranked remaining gaps

| # | family (scene) | rows missing / extra (20-21 seeds) | cause | est. step |
|---|---|---|---|---|
| 1 | move-animation SE (ON) | 1569 missing (T1 view: 11747 gated ops, SLUDGE BOMB / BLIZZARD / PSYCHIC / TRI ATTACK ...; 371 cry-task rows; 421 pan-task rows after the body end) | aud242g's list: `unmodelled-lifetime` blockers (`AnimTask_SetPsychicBackground` is the cheapest, `blend_color_cycle`, Blizzard needs a target-species resolver, Sludge Bomb needs a SE-length table + `waitsound` keeping `pending`), `unresolved-branch` variants, `ends`. | many steps; slices of 30-45 min each (aud242g slice plan A/B/C: ~+24 ops); the family is a long tail |
| 2 | stat-change SE 239 / 245 (**both scenes**) | 85 ON + 89 OFF missing, 0 extra | the engine emits no SE for `B_ANIM_STATS_CHANGE`; the ROM plays SE_M_STAT_INCREASE / DECREASE (pan via `BattleAnimAdjustPanning2`, `src/audio/soundEvents.ts:140` already ports it) in both scenes, once per stat-stage animation (aud243d §5 lead). Presentation-only | 1 step (~2 h): find the stat-stage animation owner (`src/animation/statsChange.ts`), emit at its frame with the pan rule, ROM window per direction, per-stat multiples |
| 3 | cries in animation tasks (ON) | 8 missing | `SoundTask_PlayDoubleCry` (ROAR) / HOWL / HYPER VOICE not ported (T1 `missing-cry-task` 371); needs species cry length at the ROAR mode | 1 step, event-model change (aud242g sect. 3) |
| 4 | controller extras (both) | 31 ON / 20 OFF extra, 17 / 6 missing | extra SE_BALL_OPEN (15) x16 in the last resolution and extra victory BGM 412 x5: most likely window-end artifacts (the ROM drive stops at `gBattleOutcome != 0`, the engine's tail goes on), not verified; SE_EFFECTIVE (13) x15 ON / x4 OFF pairs in seed 2741 are missing + extra at neighbouring offsets (an ordering / pan difference); SE_LOW_HEALTH (90) x1, SE_BALL_OPEN missing x1 | small; first a ROM window past the outcome |
| 5 | SE_SHINY (102) 107 ON | ROM-only, 0 in OFF | a shiny-sparkle SE the ROM plays in ON only, tied to move animation scripts (or the sparkle task), unclassified here | investigate (small) |
| 6 | declined bodies (ON) | 4 rows, 3 commands | BEAT UP, WITHDRAW, ROCK SMASH have a body request but no live body (new vs aud243a) | small, check whether the body exists |

Not measured: the literal ROM pass over 0..999 per scene (accepted as the finish-plan method in the 2026-11-01 acceptance once the hybrid was proven; ~1.5 h on 4 jobs, not run: the gap is already visible at 20 seeds); BGM / fanfare / screens (see above); the Brain / loss / win windows.

## Regression since aud243d

No family regressed. aud243d §5 listed exactly these leads (move-animation SE streams, stat-change SE 239 / 245, an extra SE 15 on the last resolution) and the same three remain at the same kinds; they were not fixed by the later aud244-247 steps (`git log d5430cc83..HEAD` on the emitters `src/engine/tickSounds.ts`, `screenSounds.ts` and `anim-sound-timing.json` is empty; the `src/audio` commits are the playback layer). Counts are not comparable one for one (aud243d reported first-differing segments for 3 runs, not totals). The engine-lead seeds of aud243d (#202 pinch abilities, #203 Baton Pass usable party) now match to battle end (seed 6 ON 16/16, seed 2 ON/OFF 23/23). New this step: ON seeds 6568 and 7682 stall near the 80000-frame drive cap (an unrelated gameplay-alignment item for the replay lane).

## Gates

- `npx vitest run tests/aud2 tests/audio tests/factoryM4a`: 50 files / 1123 tests passed, 44 files / 240 tests skipped (env-gated receipt re-derivations of the M4a note-body series), 0 failed: the audio RAM-probe pins (`factoryM4a*`), the aud240-aud247 sound tests, `audioSinkNeutral`, `aud245FrameIdentity` (frame hashes / digest identical with audio attached, both scenes), `audioHeadlessBoundary`. (`vitest-audio.txt`)
- No `src/` change, so no typecheck / build / gameplay-digest question arises: the census gameplay digests are those of the unchanged tree.
- New tooling only: `tools/audio/aud248RunSeed.sh`, `tools/audio/soundScoreboard.py`.

## Part 2: stat-change SE emitter (family 2, presentation only)

Code commit `3db266267` (tree `18f72c9b62584e9632cbef357aefddf1133e1be7`): `emitStatsChangeSounds` (`src/engine/moveAnimSounds.ts`, called from `src/engine/tickSounds.ts`) emits SE_M_STAT_INCREASE 239 / SE_M_STAT_DECREASE 245 with `animSoundPan2(SOUND_PAN_ATTACKER)` at age `STATS_CHANGE_SE_AGE = 7` of a `stats-change` presentation command (`statsChangeSourceAge`, `src/engine/battleResolutionPresentationRender.ts`; none behind a Substitute or for an argument `statsChangeParams` rejects). Both scenes (the animation runs in both). Write-only: nothing it reads is written.

Receipts (all on `3db266267`):
- Gameplay neutrality: `lsd194Census.sh` seeds 0..199 both scenes, baseline `3bf10bbcf` (src identical to the aud248 Part 1 commit) vs `3db266267`; every non-sound field of every seed (`commands`, `eventsDigest`, `error`) equal: **0 of 200 seeds differ in Scene ON, 0 of 200 in Scene OFF**. The sound digest changes on 161 (ON) / 169 (OFF) seeds, as intended.
- Tier-1: `tests/aud248StatChangeSounds.test.ts` (16 tests): ROM-window fixtures (aud242a/c/d/e/f) carrying a stat SE; id and pan equal the ROM's one for one; ROM-minus-ours frame residuals pinned per window (-2..+23, named: they come from the move body's presentation length before the stat command, not from the age clock); two windows (Metal Claw, Steel Wing secondary effects) emit nothing (named gap); Scene OFF emits too.
- T2 re-score, 5 ROM-aligned seeds (2, 165, 499, 830, 1028; `statcal.sh`): stat rows ON 20 of 23 matched / 3 missing / 0 extra; OFF 23 of 23 matched / 0 missing / 0 extra (before: all 46 missing). Matched-row deltas are segment-relative: OFF 7 of 23 at 0 and 5 at +4, the rest carry accumulated move-SE offsets; not frame-exact across the board. Evidence: `.integration/evidence/aud248/statcal-head.txt` (scratch, not committed).
- `npm run typecheck` green; `npm run test:gate` green (362 files / 2843 tests); aud24x sound tests + `executableFrontierRatchet` green (24 files / 275 tests); `git diff --check`, `animation:coverage`, `animation:audit` leave the tree clean.

Not closed (S11 stays "not met"): the 3 ON stat rows still missing (secondary-effect stat changes that the presentation does not run as a `stats-change` command; same cause as the Metal Claw / Steel Wing windows), the OFF +4 group, and the per-window residuals above. The full 0..999 T2 re-score of the stat family was not rerun (ROM drives ~100 min); the Part 1 table's stat-change row (85 ON + 89 OFF missing) is therefore the pre-fix figure.
