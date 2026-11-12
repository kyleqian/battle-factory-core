# Mac battle-parity lane: status

Branch `worker/parity-mac`. Method: every seed is played by the engine and replayed on the real ROM
(`tools/audio/romDriveSeed.sh SEED off DIR`; HP of both sides, `gRngValue` and last moves compared after every turn). A seed
"matches" when every engine state is found in order on the ROM to battle end. Lists and decision: `docs/cax31-session-handoff.md`
item 0d, `docs/gameplay-parity-audit-2026-11-12.md` sections 7 and 8. Evidence is kept outside git; every row re-derives from the seed.

## Third pass (2026-11-12): Frontier Brain (Noland) battles

Noland battles can now be replayed on the real ROM like any other battle (`brain-replay-seam.md`). Before this pass no
Brain battle had ever been compared with the ROM (the bulk batch counted them as "rc 12, not drivable").

| | silver Noland (challenge 2, streak 20) | gold Noland (challenge 5, streak 41) |
|---|---|---|
| seeds | 204: every seed with seed % 49 == 33 in 1..10000 | 204: every seed with seed % 49 == 26 in 1..10000, driven with `ROM_REPLAY_SYMBOLS=1` |
| staged by the lab and driven | 204 | 203 |
| **match to battle end** | **204** (203 with the stock chain, 9098 with higher caps) | **203** (202 with the stock chain, 6347 with higher caps) |
| engine mismatch | **0** (first drive: 1, seed 7922, fixed by fix 27) | **0** |
| the long one (both sides Struggle, Leftovers) | 9098: 1,823 / 1,823 states, 1,212,712 ROM frames | 6347: 2,043 / 2,043 states, 1,526,588 ROM frames |
| not drivable | 0 | 1 (seed 1447: the lab does not reach the action menu; see "Still open") |

How the counts were made:

- Silver, first drive on engine `af798050e` (the seam, before any fix of this pass): 202 match, 7922 does not, 9098 hits
  the stock frame caps. 7922 was the only rule difference in the 407 staged Brain battles; it is fix 27 below.
- Gold, first drive on the engine with fix 27: 202 match, 6347 hits the stock frame caps, 1447 fails in the lab.
- 9098 and 6347 were then driven on the final engine with the engine budget at 2,000,000 frames and the ROM drive cap
  at 1,500,000 / 1,900,000 frames: both reach the battle's end on the ROM and every state matches.
- Fixes 27 and 28 change two AI move scripts only (Synthesis / Morning Sun / Moonlight; Fly / Dig / Dive / Bounce). A
  battle whose opponent has none of those seven moves plays the same on every engine of this pass. So after the fixes
  the seeds whose Brain party has one of them were re-driven on the final engine `24ad564bd`: silver 54 seeds (53 match
  with the stock chain, among them 7922 with 16 / 16 states; the 54th is 9098), gold 19 seeds (19 match).
- Every member of every Brain party was checked against the ROM read-back before its battle was played (species, level,
  personality, OT id, nature, ability, item, moves, PP, IVs, EVs, friendship, HP, stats; silver IV 15, gold IV 31). No
  seed failed that check.
- Census "battle 1 at streak 20" against the lab's "battle 7 of challenge 2": no battle input depends on the
  difference (`brain-replay-seam.md`, last section), and 407 matching battles agree.

Ordinary battles on the final engine `24ad564bd` (one fresh batch per list):

| list | result |
|---|---|
| regression list (handoff 0d) | **64 / 64** |
| every earlier seed of this lane whose opponent runs the full AI and has one of the seven moves (49 of 1,114 seeds) | **49 / 49** (47 stock chain; 2658 and 3504 with the long caps) |
| random sample of 120 other seeds from the earlier lists, on the engine with fix 27 | **120 / 120** |

For the bulk replay session: the engine to re-drive against is this tip. Only seeds whose opponent has one of the seven
moves above and runs all three AI scripts (streak 28 and up, or Noland) can differ from `680b907f3`.

## Where it stands (2026-11-12, second pass)

| | seeds |
|---|---|
| open list at the start (audit doc section 8) | 115 |
| **now matching to battle end** | **114** (113 with the stock chain, 705 with a higher driver frame cap) |
| not drivable to its end | 1 (796: see "Still open") |
| regression list (handoff 0d), must keep matching | **64 / 64** |
| new seeds 1161-7056 that did not match on the old engine (bulk replay batch) | 542 (290 up to 4341, 154 up to 6014, 98 up to 7056) |
| of those, now matching to battle end | **529** (516 with the stock chain, 13 long battles with higher caps) |
| of those, endless battles with every state matching up to the cap | 11 |
| of those, not replayable (lab staging, not the engine) | 2 (3623, 5736) |
| random sample of seeds that already matched on the old engine, re-driven on the final engine | **400 / 400** still match |

The bulk batch (another session, engine `a86909863e`) had replayed seeds 1161 to about 7190 when this pass ended: 5,345
matched, 542 did not, 121 are Brain battles. The 542 were re-driven here on this branch. **No seed in any list shows an
engine mismatch now.** Of the 5,345 seeds that already matched on the old engine, a random sample of 400 was re-driven
on the final engine and all 400 still match; the bulk session should re-drive the rest.

Now matching (114), to join the regression list (705 needs `--frames` above 82,835 on the ROM drive):
60 79 87 89 90 94 95 107 109 114 119 123 137 138 152 159 161 165 183 193 203 218 225 228 236 265 284 292 332 342 343 345 392 417
426 444 454 457 475 483 484 491 492 499 522 525 529 542 547 553 566 573 576 577 614 616 631 643 651 675 702 705 707 715 737 758 769
783 799 804 813 830 838 839 848 857 862 867 881 897 898 899 900 904 905 906 907 912 918 926 929 959 965 968 973 986 992 996 1005
1014 1017 1021 1030 1032 1066 1072 1081 1083 1095 1112 1117 1125 1153 1157.

New seeds, by what made them match:

| what | seeds |
|---|---|
| already matched on the first-pass engine (fixes 1-16) | 267 |
| fixes 17-21 below, stock chain | 1414 2215 3375 3704 |
| replay tool false alarms (`replay-tool-fixes.md`), stock chain | 1181 1816 2722 4270 |
| long battles, match to the end with engine `--frame-budget=2000000` and ROM `--frames 600000` | 1338 (154 states) 1904 (155; needs fix 19) 2546 (588) 2658 (127) 2742 (171) 3504 (642) 3589 (125) 3789 (162) |
| endless Struggle / Leftovers stalls: every state matches up to the 600,000-frame ROM cap, no mismatch | 1986 (720 states) 2297 (943) 2716 (941) 2907 (817) 3009 (821) 3807 (929) |
| lab staging played a turn before the snapshot; cannot be replayed | 3623 |

The 154 later seeds (4342-6014), all on the final engine:

| what | seeds |
|---|---|
| match with the stock chain | 146 |
| long battles, match to the end with the higher caps | 4485 (139 states) 5437 (161) 5950 (260) |
| endless stalls, every state matches up to the 600,000-frame ROM cap | 4560 (876 states) 4924 (894) 5464 (770) 5632 (913) |
| lab staging played a turn before the snapshot | 5736 |

No new cause was needed for them: fixes 1-26 and the tool fixes cover all 154.

The 98 seeds after that (6023-7056), all on the final engine: 95 match with the stock chain, 6720 (206 states) and 6765
(162) match to the end with the higher caps, 6430 is one more endless stall (685 states match up to the cap). Again no
new cause.

### Seeds for the regression list

Brain battles (new in the third pass), stock chain:

- silver Noland: every seed with seed % 49 == 33 in 1..10000 (33, 82, 131, ... 9980) except 9098: 203 seeds;
- gold Noland, driven with `ROM_REPLAY_SYMBOLS=1`: every seed with seed % 49 == 26 in 1..10000 (26, 75, 124, ... 9973)
  except 1447 and 6347: 202 seeds.

The 516 new seeds that match to battle end with the stock chain (old-engine mismatches of the bulk batch, seeds 1161-7056):

1164 1174 1181 1184 1185 1193 1194 1215 1225 1233 1234 1243 1267 1274 1277 1280 1302 1321 1350 1368 1389 1400 1414 1415 1420 1437
1440 1448 1461 1467 1469 1473 1478 1499 1507 1522 1545 1585 1602 1618 1629 1684 1687 1692 1705 1714 1724 1745 1750 1757 1759 1779
1787 1811 1816 1822 1842 1843 1851 1859 1862 1880 1884 1890 1914 1928 1937 1939 1940 1951 1958 1959 1964 1966 1967 1976 1988 1994
2000 2004 2006 2015 2016 2025 2027 2035 2039 2049 2061 2071 2082 2097 2108 2118 2121 2127 2132 2134 2173 2178 2182 2188 2193 2200
2203 2215 2230 2235 2250 2265 2270 2274 2275 2303 2311 2318 2324 2347 2349 2355 2358 2363 2380 2416 2421 2430 2440 2459 2475 2484
2510 2513 2542 2554 2575 2583 2613 2634 2641 2653 2664 2699 2713 2722 2738 2741 2783 2797 2800 2801 2804 2812 2834 2846 2850 2851
2871 2873 2918 2922 2944 2947 2955 2965 2967 2984 3011 3020 3023 3025 3027 3033 3041 3044 3067 3088 3089 3096 3097 3102 3103 3131
3134 3152 3158 3162 3173 3209 3231 3240 3262 3305 3330 3335 3344 3356 3375 3377 3379 3387 3388 3397 3420 3455 3461 3465 3478 3493
3495 3501 3534 3539 3540 3547 3573 3590 3591 3602 3671 3672 3689 3704 3706 3710 3738 3741 3745 3772 3775 3776 3784 3787 3788 3792
3804 3825 3832 3839 3843 3849 3867 3887 3892 3901 3914 3923 3931 3934 3945 3959 4001 4009 4020 4072 4073 4108 4111 4179 4191 4194
4204 4206 4214 4222 4235 4237 4243 4266 4268 4270 4284 4306 4322 4331 4341 4357 4360 4369 4373 4401 4408 4410 4412 4413 4419 4447
4457 4498 4509 4513 4526 4533 4534 4535 4540 4564 4576 4608 4612 4636 4651 4666 4667 4671 4686 4689 4690 4698 4707 4732 4734 4742
4743 4748 4764 4767 4777 4787 4804 4809 4814 4850 4863 4888 4895 4896 4919 4925 4927 4932 4934 4964 4965 4974 4975 4988 4992 5001
5005 5010 5039 5055 5056 5060 5063 5077 5088 5104 5113 5120 5128 5198 5210 5226 5233 5245 5250 5254 5272 5281 5282 5287 5290 5295
5297 5309 5313 5378 5382 5400 5420 5436 5461 5474 5482 5486 5488 5489 5491 5493 5526 5540 5549 5569 5583 5584 5607 5612 5614 5623
5641 5647 5660 5676 5682 5684 5686 5709 5721 5731 5753 5756 5761 5811 5822 5823 5837 5883 5903 5907 5908 5918 5919 5922 5923 5928
5951 5966 5981 6003 6014 6023 6069 6079 6116 6117 6130 6143 6152 6155 6168 6174 6181 6197 6224 6244 6249 6260 6269 6279 6288 6298
6310 6317 6351 6370 6373 6379 6385 6407 6412 6423 6434 6444 6447 6464 6480 6491 6497 6506 6531 6547 6556 6559 6568 6581 6595 6619
6635 6643 6661 6662 6672 6680 6684 6701 6704 6713 6727 6740 6757 6774 6784 6790 6805 6806 6808 6813 6816 6817 6819 6834 6838 6839
6843 6849 6876 6880 6881 6882 6884 6888 6894 6912 6946 6948 6995 7009 7013 7020 7024 7025 7027 7035 7037 7056.

## Fixes (one commit each, C-cited, each with a test that fails without it)

"First cleared" = the seeds that started matching in the re-drive where the fix was added (fixes stack, so a seed listed
late may also need the earlier ones).

| # | What was wrong (for the game) | Audit lead | Doc | First cleared |
|---|---|---|---|---|
| 1 | A badly poisoned Pokémon kept its growing Toxic damage after leaving the field and coming back. The game restarts it at 1/16. | B1 | `toxic-counter-switch.md` | 94 165 183 343 499 1014 1030 |
| 2 | After an opponent fainted, the engine sometimes sent in the wrong replacement: it counted status moves as "super effective moves" and ignored Levitate. | A2, A3 | `opponent-replacement-pass1.md` | 79 107 109 138 284 332 392 457 484 491 566 573 616 675 715 830 838 839 857 899 900 904 905 907 918 926 986 1017 |
| 3 | When the opponent chose to switch by itself (Perish Song), it took the first bench Pokémon instead of scoring them. | A4 | same doc, second section | 123 906 1072 (driven together with fix 4) |
| 4 | A confused Pokémon that had picked Explosion / Selfdestruct hurt itself too little (the game halves its Defense for that hit). | B6 | `confusion-self-hit-explosion.md` | 218 |
| 5 | Encore: the Encored side lost its action choice (the player could not switch; the opponent's switch check was skipped). Forced Struggle / Encore: the opponent's move picker still ran and spent random numbers. | B2, dia272 seed 60 | `encore-struggle-selection.md` | 60 87 89 90 119 159 161 193 203 225 228 265 292 345 417 444 492 522 542 553 577 631 702 737 758 769 804 813 862 897 912 929 973 992 1021 1095 1112 1125 1157 |
| 6 | The opponent AI scored only the moves it could select. The game scores every move that still has PP (a Choice Band lock, Disable, Taunt, Torment do not stop the scoring) and spends random numbers on them. | new (dia275 group C) | `ai-scripts-unusable-slots.md` | 95 137 454 525 529 576 614 707 783 799 848 881 965 968 996 1032 1066 1081 1153 |
| 7 | Four AI move scripts spent a random number (the speed-tie draw, or a roll) before the script reached that step: Explosion / Memento, Recover-type moves, Baton Pass, Mirror Move. | new | `ai-speed-tie-draw-order.md` | 114 152 426 1005 1117 (driven together with fix 8) |
| 8 | The AI's "switch to something that resists" search skipped one bench slot too few (a quirk of the game's loop). | new | `ai-resist-switch-battlerin1.md` | (with fix 7) |
| 9 | AI "try to faint": a move that is not the strongest gets -1 and stops. The engine went on to roll the 4x bonus. | new | `ai-try-to-faint-not-strongest.md` | 236 |
| 10 | When the last Pokémon to act stayed "frozen solid", the next turn's first move skipped its charge turn, its message and its PP cost (Solar Beam fired at once). | new | `turn-passed-hitmarker-clear.md` | 342 547 |
| 11 | Shell Bell healed its holder off a Future Sight hit. | B4 | `shell-bell-future-sight.md` | 475 867 |
| 12 | Pain Split was recorded as a physical hit (Counter worked after it; Revenge / Focus Punch saw a hit). | B7 | `pain-split-not-physical.md` | 483 |
| 13 | Castform kept its weather form after the weather ended. | B5 | `castform-reverts-with-weather.md` | 643 651 |
| 14 | A second Intimidate (or Trace) Pokémon entering the same field slot before any action finished still activated. | new | `intimidate-once-per-slot.md` | 1083 |
| 15 | The AI's "no effect" check ignored Foresight on its target. | new | `ai-effectiveness-foresight.md` | 959 |
| 16 | AI penalty for two-stat moves when both stats are maxed: -10 only, not -18 (Curse, Bulk Up, Cosmic Power, Calm Mind, Dragon Dance, Tickle). | new | `ai-dual-stat-penalty.md` | 898 |
| 17 | A Pokémon that used Endure survived a Future Sight landing the same turn. The game lets it faint. | B3 | `endure-future-sight.md` | 2215 |
| 18 | After a faint the engine sometimes sent in the wrong replacement when a bench Pokémon had two types: the type score was multiplied in the wrong order (the game follows its type table and rounds down after every step). | new | `replacement-type-score-table-order.md` | 1414 |
| 19 | Rage never ended: once used, every later hit raised Attack. The game drops Rage as soon as another move is chosen. | new | `rage-status-clear.md` | 1904 |
| 20 | The player's Curse (non-Ghost) lost 2 PP against Pressure. The game takes 1 (the opponent's Curse does lose 2). | new | `curse-player-target.md` | 3375 |
| 21 | A player's lead Slaking loafed on turn 1 when the opponent's lead had Cloud Nine or Forecast; an opponent lead's weather ability did nothing at battle start. | new | `battle-start-switchin-battler.md` | 3704 |
| 22 | Hidden Power of a special type could be answered by Mirror Coat and not by Counter. In the game it is always Counter. | B8 | `hidden-power-damage-record.md` | Mechanic Lab |
| 23 | The opponent AI's turn count was always 0 (Swagger with Psych Up kept its first-turn bonus). | A5 | `ai-turn-counter.md` | source only |
| 24 | The AI's move scoring did not see the player's Sp. Atk stage (Roar, Psych Up) or a trapping ability (Skill Swap, Role Play), and spent a different number of random draws. | A6, A7 | `ai-cv-target-ability-spatk.md` | Mechanic Lab |
| 25 | White Herb did nothing when a lowered stat was Baton Passed to its holder; the game uses it at once. | suspected | `white-herb-baton-pass.md` | Mechanic Lab |
| 26 | The AI kept its memory of a Pokémon that left and came back while the AI was locked into a multi-turn move. | suspected | `ai-history-reentry.md` | source only |
| 27 | Full AI (Noland; ordinary trainers from challenge 4): in clear weather the game's weather check for Synthesis / Morning Sun / Moonlight reads a leftover value, and when the opponent's last move is its strongest that value reads "sandstorm" and costs the heal 2 points. The engine never applied it, so the opponent healed where the game attacks. | new (Brain replay) | `ai-heal-weather-stale-register.md` | 7922 (silver Noland) |
| 28 | The same leftover read in the Fly / Dig / Dive / Bounce script: an Ice-type opponent (or a Ground / Rock / Steel one when the leftover reads "hail") makes one extra roll for +1 in clear weather. The engine skipped the roll, so every later random number differed. | new (source read after fix 27) | same doc, second part | Mechanic Lab |

Group view against the handoff's queue (a seed can sit in two groups):

| group (handoff 0d) | seeds | now matching | still open |
|---|---|---|---|
| (a) the ROM sends in a different opponent | 21 | 21 | - |
| (b) Struggle | 24 | 23 | 796 |
| (c) Encore | 10 | 10 | - |
| (d) confusion self-hit | 5 | 5 | - |
| (e) infatuation | 5 | 5 | - |
| older open seeds and the unsigned rest | 55 | 55 | - |

A signature was a lead, not a cause: group (a) was four causes (fixes 1, 2, 3, 11), most "confusion" and "infatuation" seeds
were fixes 2, 5 and 10, and the unsigned rest was almost entirely the opponent AI spending a different number of random draws
(fixes 6, 7, 9, 16).

## Audit doc section 2: where each lead stands

| lead | state |
|---|---|
| A1 | fixed on box master (`aiv271`: the AI damage sims take the real hit chain's terms); nothing left for this lane |
| A2, A3, A4 | fixed (fixes 2, 3), ROM seeds 332 / 284 / 123 |
| A5 | fixed (fix 23), source only: the lab cannot stage a target already at -3 Attack |
| A6, A7 | fixed (fix 24), Mechanic Lab ROM proof |
| B1, B2, B4, B5, B6, B7 | fixed (fixes 1, 5, 11, 13, 4, 12), each with a ROM seed |
| B3 | fixed (fix 17), ROM seed 2215 |
| B8 | fixed (fix 22), Mechanic Lab ROM proof |
| suspected: White Herb on Baton Pass | fixed (fix 25), Mechanic Lab ROM proof |
| suspected: AI history on a swap during a move lock | fixed (fix 26), source only |
| suspected: end-turn re-sort priority on a forced Struggle | **not a bug.** The ROM does what the engine did (`endturn-order-forced-struggle.md`); the wrong "known gap" comment is replaced and a test pins the ROM order |
| suspected: cure berries after Pursuit-on-switch | open, low value: `HandleFaintedMonActions` state 6 runs the item pass for the player's battler (`ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)`); the engine ports only White Herb there. A status berry would cure a few steps earlier than the engine's end-of-turn pass. The only rule effect found by reading: a paralysis cured before the end-turn speed re-sort |

New source-read leads found on the way (no ROM seed yet):

- AI try-to-faint and check-viability type checks do not take Foresight (`ai-effectiveness-foresight.md`).
- AI final pick: a slot masked by a Choice lock / Disable can only win if every usable slot falls to its score;
  each `score` command clamps at 0 in C and the engine does not clamp (`ai-scripts-unusable-slots.md`).
- After White Herb on a Baton Pass switch-in the game skips the rest of `switchineffects`; the "Spikes already damaged"
  flag then stays set for that side (modeled by fix 25, never seen on the ROM).

## Still open

| seed | state | next step |
|---|---|---|
| 796, 1986, 2297, 2716, 2907, 3009, 3807, 4560, 4924, 5464, 5632, 6430 | Both sides are out of PP and trade Struggle while Leftovers heals; the battle does not end. Driven with the engine budget at 2,000,000 frames and the ROM drive at 600,000 frames: 720 to 943 engine states match in order and no mismatch appears (796: 894). | none: they cannot be driven "to battle end" in practical time. Keep them off the regression list; they are long-run checks, not open rule bugs. |
| 1447 with `ROM_REPLAY_SYMBOLS=1` (gold Noland; request `factoryBrain`, challenge 5, player sets 569 649 605, seed 1447) | The lab fails before the battle is staged: `RuntimeError: battle lab route did not reach the player action menu` (`oracle/battle_lab.py` `_finish_intro_to_action_menu`). Same message as bulk seed 6048. | top layer (lab code; this lane does not edit `oracle/`). |
| 3623, 5736 | The lab staging itself plays turn 1 before the snapshot (an A press of the intro acknowledgement lands on the first action menu; `oracle/battle_lab.py` `_finish_intro_to_action_menu`). The replay now refuses such a setup (rc 13) instead of reporting a mismatch. | top layer: make the staging stop pressing A once the action menu is up. |

Long battles that do end need higher caps than the stock chain (engine 200,000 frames, ROM drive 80,000): 705 (82,835 ROM
frames), 1338, 1904, 2546 (426,522), 2658, 2742, 3504 (398,092), 3589, 3789, 4485, 5437, 5950 (144,657), 6720, 6765.
All match to the end. The staging race is rare (2 of about 6,000 seeds). Brain battles: 9098 (silver, 1,212,712 ROM
frames) and 6347 (gold, 1,526,588) need the ROM cap above those values; both match to the end.

## Known gap left on purpose (presentation, not battle rules)

Encore / forced Struggle: the engine still opens its move menu after FIGHT with the forced move as the only legal slot; the
real game goes straight to the turn (and prints "… has no moves left!" for Struggle). See `encore-struggle-selection.md`.

## Re-pins (tests anchored to a fixed census / generated battle that really changed)

Commits "re-pin the census-anchored tests ..." and "re-pins for the Castform revert ...". Invariants are unchanged in every case.

| test | change | why |
|---|---|---|
| `factoryRoundBattleOrchestrator` round census | seed 5 calls 1694 -> 1493, seed 15 1503 -> 1672 (both still win at battle 7) | whole-round RNG cursor |
| `factoryRoundBattleOrchestrator` #84(5) | the party record keeps Toxic counter 0 | it asserted the wrong rule (fix 1) |
| `factoryWholeBattle` | self-authored 3v3 trajectory regenerated (ends in a player win) | AI draw counts |
| `factoryRoundChaining` (b) | curated seed 5 -> 9 (first of 0..30 that chains four wins) | every trajectory moved |
| `randomRoundSoak` (b) | seed 2 -> 0 (lowest of 0..30 reaching carry 14) | same |
| `liveSpriteOrderHost` | later 80 -> 73, laterKnown 71 -> 64, postKoLent 12 -> 5, compared 898 -> 840, hostKnown 798 -> 740, laterAfter 72 -> 65 | the 20 sweep battles hold fewer bodies; 0 mismatches as before |
| `playableAnimationLifecycle` | 466 -> 467 | generated matchups changed |
| `fix122AuditDefects` move 113 | census battle 41 -> 2 | battle 41 lost its failed Light Screen |
| `apx222LastStaticClassesApproximate` | battles 41 -> 50 and 138 -> 133, same row counts | those commands moved |
| `sa125StatusAnimationCommand` | + battle 101 (opponent burn) | the listed battles lost that route |
| `stl109Struggle` route 2 | opponent Struggles four times before the player's first (was two) | fix 5 |
| `cf78CastformForm` (battle 950) | 11 transformed bodies (was 21), 31 other live bodies (was 22) | fix 13 |
| `apx221PresentationGateApproximate` | the "opponent Fly at a hail-form CASTFORM" row left | no census seed carries it after fix 13 |
| `factoryBattleScriptInLoveFullTurn` | the UNABLE_TO_USE_MOVE marker is cleared at the turn boundary | it pinned the leak (fix 10) |
| `factoryBattleScriptEncoreFullTurn`, `issue138EncoreDisableReceipt` control arm | the Encored side gets its request | fix 5 |
| `factoryAiCheckBadMove` six "both at the limit" cases, `factoryAiCheckViability` Mirror Move case | -10; no roll | they pinned the wrong rule (fixes 16, 7) |
| `tools/report/ability-item-parity-census.ts`, `docs/ability-item-parity-census.md`, `docs/gate6-coverage-manifest.json` | pinned source lines moved | edits above them |
| `presentationStringIssue108` | the staged Rage holder now chooses Rage | fix 19 drops a staged Rage flag when another move is chosen |
| `tools/integration/sst200Compare.ts` (used by `sst200SecondStatRows`) | the player's Curse decision targets the user | fix 20; the Curse stat rows still equal the ROM's in both scenes |
| `battleScriptRulesContext` key list | + `battleTurnCounter`, `aiHistoryClears` | fixes 23, 26 |
| `tools/report/ability-item-parity-census.ts` | five pinned `factoryAiCheckViability.ts` lines + 6, then + 5 | fixes 27, 28 added lines above them; the census doc and the gate-6 manifest regenerate byte-identical |

One presentation lead seen while re-pinning and not looked at: census battle 32 trips `sa125`'s ON - OFF row check on a
CONFUSION anchor (139 vs 100).

## Gates

Typecheck, full suite and build are run on a clean checkout of the branch tip (a separate gate worktree).

Third pass, engine tip `24ad564bd` (with box master `1e4019b9c` merged in): typecheck ok, build ok, **14,612 tests pass,
0 fail**. The five animation evidence tests that failed on the older master `43b0b22e5` were fixed on master
(`1e4019b9c`, three digest re-pins) and pass here.

Replay on that engine: see the third-pass section at the top (regression 64 / 64, the 49 seeds the two AI fixes can
touch 49 / 49, Brain silver 204 / 204 and gold 203 / 203 of the staged battles).

Second pass, engine tip `e05bdf321`: typecheck ok, build ok, 14,592 tests passed; the only failures were those five
animation evidence tests, which failed on the master of that day. Replay on that engine, one fresh batch (stock chain):
regression 64 / 64; the eight seeds fixed in that pass 8 / 8; old open list 113 / 115 (705 and 796 are the two long
ones); the 290 list 267 / 267 of its stock-chain seeds; the 154 list 146 / 146 of its stock-chain seeds; the 98 list
95 / 95; a random sample of 400 seeds that matched on the old engine 400 / 400. The long battles that end (705 and the
thirteen of the new lists) were driven on that engine too and match to the end; the endless ones of the 290 list were
driven on engine `462d6429d` (before fixes 22-26), the later ones on `e05bdf321`.
