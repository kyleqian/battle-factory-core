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
