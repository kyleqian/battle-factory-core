# Staged battles for the (c) list of the finer tally (sixth pass, stopped early)

Each file is an ordinary stage file (`romReplayWide.sh --stage FILE`, `staged-battles.md`), kept in this subdirectory
so the lists that drive `stages/*.json` stay as they were. `rules` names the (c) rules of `rule-coverage-list.md` it is
for (the ids are the order of the (c) list: uncommon rules first, then by name); `cover` names the piece of engine code
the hunter checked it ran (`file`, a `text` that occurs once in it, and `at`, the character of that text where the piece
starts; `romReplayCoverage.count_at`). Each was found by driving the staging with lab seeds, and the seed in the file
matched the ROM to the end on the engine with fixes 29 to 43, with its piece run:

| file | lab seed | states matched |
|---|---|---|
| R011-ai-smelling-salt | 90000 | 14 of 14 |
| R013-ai-superpower-low-hp-faster | 92000 | 11 of 11 |
| R014-ai-superpower-attack-lowered | 93000 | 21 of 21 |
| R015-ai-sweet-scent | 94000 | 33 of 33 |
| R016-ai-charm-clear-body | 95000 | 35 of 35 |
| R017-ai-flash-own-accuracy-cut | 96000 | 69 of 69 |
| R018-endure-fixed-damage | 97001 | 34 of 34 |
| R020-hyper-beam-recharge-asleep | 99001 | 45 of 45 |
| R022-uproar-blocks-hypnosis | 91000 | 21 of 21 |
| R023-pain-split-substitute | 92000 | 64 of 64 |
| R024-pursuit-ko-on-switch | 93000 | 31 of 31 |
| R025-shield-dust-kings-rock | 94001 | 16 of 16 |
| R030-skarmory-toxic-curse-ai-replacement | 900002 | 12 of 12 |
| R032-metronome-rage-miss | 1020122 | 20 of 20 |
| R037-noland-cloyster-dive-sandstorm | 1020059 | 24 of 24 |
| R038-noland-foresight-ghost-user | 1020099 | 14 of 14 |
| R097-alakazam-trick-both-itemless | 1023669 | 20 of 20 |
| R107-baton-pass-onto-ai-spikes | 1020548 | 38 of 38 |
| R109-dusclops-curse-last-pokemon | 1022589 | 19 of 19 |
| R035-clefable-taunt-counter-replacement | 1040873 | 14 of 14 |

The last six came from the luck hunt of 2026-11-17 (luck2; `tools/replay-hunt/luckHunt.sh`, lab seeds 1,020,000 up) instead of the box hunts: their lab seed is the
hunt's, their stage file is the hunt's `found.stage.json` without the hunt's `chance` / `seeds` fields, and each was re-driven on the engine at `master` e06cac9fc
(`romReplayWide.sh --stage`, Scene OFF) to a full match with its `cover` piece run. That makes 59 of the 110 rules of `rule-coverage.md` covered. The luck hunt skips a
design whose rule has a file here.

R030 came from the luck hunt's second day (luck3, 2026-11-17): the design was rebuilt around the AI Dusclops 666 faint from its own Ghost-Curse cost (an end-of-turn poison faint cannot reach the marker), and its lab seed is from the block 900000-900039 that the day job never uses; found by `prehunt.py` (2 of 40 hit), then re-driven from this file on the Scene OFF oracle to a full match. That makes 60 of the 110 rules of `rule-coverage.md` covered.

ice1 (2026-11-18, `docs/hpd1-hp-hold.md` "ice1"): two stage files without a `rules` / `cover` field (no (c) rule; they guard `Cmd_rolloutdamagecalculation`'s five-hit doubling and the Defense Curl bit). Driven on the Scene OFF oracle at `master` d60fce582:

| file | lab seed | states matched | wide states | what happens |
|---|---|---|---|---|
| ice1-iceball-lock | 90102 | 10 of 10 | 2 of 2 | Sealeo 196 locked into Ice Ball, five hits in a row on the opponent's Wobbuffet 185 (foe HP 272 -> 254 -> 223 -> 157 -> 39 -> 0) |
| ice1-rollout-defense-curl | 90101 | 10 of 10 | 3 of 3 | Phanpy 120 uses Defense Curl, then Rollout, five hits with the curl bit on Wobbuffet (foe HP 272 -> 212 -> 147 -> 85 -> 0) |

R080 came from luck4 (2026-11-18, lab seed 910000 of the block 910000-910039 that the day job never uses): the design was rebuilt with an Ampharos 518 lead (Thunder Wave) so the player's Marvel Scale Milotic is paralysed before the next opponent, Whiscash 483, casts Future Sight. Driven by `prehunt.py` on the Scene OFF oracle (`romReplayWide.sh --stage`): match, 16 of 16 states, `stage.ok`.

| file | lab seed | states matched |
|---|---|---|
| R080-spark-whiscash-future-sight-milotic | 910000 | 16 of 16 |

R035 came from the luck hunt's third day (2026-11-18 day job, seeds 1,040,000 up; promoted by the 2026-11-18 daily-run supervisor): the hunt's `found.stage.json`
without `chance` / `seeds`; the hunt's own ROM drive matched 14 of 14 states with `stage.ok` true, and the nightly replay of the same run re-drives it (`docs/replay-ledger.md`).

R073 came from luck5 (2026-11-18, lab seed 920103 of the block 920100-920131 that the day job never uses): the design `tools/replay-hunt/luck-designs/R073-clefable-metronome-hidden-power-odd-iv.json` without `chance` / `seeds`. The player's Clefable 389 (IVs 31, so Hidden Power is Dark, type index 15 past ???) calls Metronome ten times opposite Shuckle 528; one call was Hidden Power. Found by a union-cover trial of six designs sharing this battle, then re-driven from this file on the Scene OFF oracle: full match, `stage.ok` true, 62 -> 63 of the 110 rules covered.

| file | lab seed | states matched | wide states |
|---|---|---|---|
| R073-clefable-metronome-hidden-power-odd-iv | 920103 | 31 of 31 | 29 of 29 |

R052, R051 and R053 came from luck6 (2026-11-18; lab seeds 930003, 936007 and 937010, blocks the day job never uses): the designs `tools/replay-hunt/luck-designs/R05{2,1,3}-ai-clefable-metronome-*.json` without `chance` / `seeds`. Challenge 7, the AI's Clefable 389 against the player's passive Shuckle 528 (Flash 16 turns, then Salamence 753): one of the AI's Metronome calls was Mud Sport (R052), Mist (R051) or Focus Energy (R053), and the AI's next scoring read the matching flag (`factoryAiDecisionPolicy.ts` `mudSportUp` / `mistUp` / `hasFocusEnergy`). Found by `prehunt.py` (union-cover trials), then re-driven from these files on the Scene OFF oracle: full match, `stage.ok` true, 0 diff points, 63 -> 66 of the 110 rules covered.

| file | lab seed | states matched | wide states |
|---|---|---|---|
| R052-ai-clefable-metronome-mud-sport | 930003 | 55 of 55 | 55 of 55 |
| R051-ai-clefable-metronome-mist | 936007 | 35 of 35 | 35 of 35 |
| R053-ai-clefable-metronome-focus-energy | 937010 | 42 of 42 | 40 of 40 |


**rrh5 (2026-11-19, box hunt; stage files and a tool extension, no `src/` change).** These stages carry a `parties` field: hand-built Mechanic Lab
parties for both sides (`staged-battles.md`, "Stage parties"). The ROM and the engine both run the same staged battle; each file below was re-driven
from the committed file with `match True`, 0 diff points and `stage.ok True`.

| file | lab seed | states matched |
|---|---|---|
| R067-slaking-focus-punch-truant | 90000 | 5 of 5 |
| R071-exploud-heal-bell-soundproof | 90000 | 12 of 12 |
| R072-soundproof-party-heal-bell | 90000 | 12 of 12 |
| R075-imprison-twice | 90000 | 13 of 13 |
| R078-lock-on-sheer-cold | 90000 | 5 of 5 |
| R082-mud-sport-twice | 90000 | 18 of 18 |
| R083-spinda-thrash-own-tempo | 90000 | 8 of 8 |
| R085-imprison-pressure | 90000 | 12 of 12 |
| R103a-ai-pursuit-cheri-static | 90000 | 6 of 6 |
| R103b-ai-pursuit-pecha-poison-point | 90007 | 7 of 7 |
| R103c-ai-pursuit-rawst-flame-body | 90000 | 6 of 6 |
| R103g-player-pursuit-cheri-ai-switch-static | 90002 | 15 of 15 |

`R057-beat-up-shedinja.json` is also here but it is a **known failing** stage (0 of 19 states, 7 diff points): the engine gives a Factory Shedinja
88 max HP, the ROM 1. See `tests/factoryCorpusShedinjaHp.test.ts` and `STATUS.md`, "Box hunt rrh5".
