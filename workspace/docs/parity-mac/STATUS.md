# Mac battle-parity lane: status

Branch `worker/parity-mac`. Method: every seed is played by the engine and replayed on the real ROM
(`tools/audio/romDriveSeed.sh SEED off DIR`; HP of both sides, `gRngValue` and last moves compared after every turn). A seed
"matches" when every engine state is found in order on the ROM to battle end. Lists and decision: `docs/cax31-session-handoff.md`
item 0d, `docs/gameplay-parity-audit-2026-11-12.md` sections 7 and 8. Evidence is kept outside git; every row re-derives from the seed.

## Where it stands (2026-11-12)

| | seeds |
|---|---|
| open list at the start (audit doc section 8) | 115 |
| **now matching to battle end** | **114** (113 with the stock chain, 705 with a higher driver frame cap) |
| not drivable to its end | 1 (796: see "Still open") |
| regression list (handoff 0d), must keep matching | **64 / 64** |

Now matching (114), to join the regression list (705 needs `--frames` above 82,835 on the ROM drive):
60 79 87 89 90 94 95 107 109 114 119 123 137 138 152 159 161 165 183 193 203 218 225 228 236 265 284 292 332 342 343 345 392 417
426 444 454 457 475 483 484 491 492 499 522 525 529 542 547 553 566 573 576 577 614 616 631 643 651 675 702 705 707 715 737 758 769
783 799 804 813 830 838 839 848 857 862 867 881 897 898 899 900 904 905 906 907 912 918 926 929 959 965 968 973 986 992 996 1005
1014 1017 1021 1030 1032 1066 1072 1081 1083 1095 1112 1117 1125 1153 1157.

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
| A2, A3, A4 | fixed (fixes 2, 3), ROM seeds 332 / 284 / 123 |
| B1, B2, B4, B5, B6, B7 | fixed (fixes 1, 5, 11, 13, 4, 12), each with a ROM seed |
| A1 (rest: attacker burn, pinch `maxHp`, Guts, weather, Flash Fire in the AI damage estimate) | open, no ROM seed among the 115; needs a Mechanic Lab scenario |
| A5 (AI turn counter), A6, A7 (CheckViability target drops `ability` / `spAtkStage`) | open, no ROM seed |
| B3 (Endure vs a same-turn Future Sight), B8 (Hidden Power damage record) | open, no ROM seed |
| suspected: cure berries after Pursuit-on-switch (state 6 item pass is the player's White Herb only), AI history on a swap during a move lock, White Herb on Baton Pass, end-turn re-sort priority on forced Struggle | open |

New source-read leads found on the way (no ROM seed yet):

- AI try-to-faint and check-viability type checks do not take Foresight (`ai-effectiveness-foresight.md`).
- AI final pick: a slot masked by a Choice lock / Disable can only win if every usable slot falls to its score;
  each `score` command clamps at 0 in C and the engine does not clamp (`ai-scripts-unusable-slots.md`).

## Still open

| seed | state | next step |
|---|---|---|
| 796 | Both sides are out of PP and trade Struggle while Leftovers heals; the battle does not end. With the engine budget raised to 2,000,000 frames (3,323 decisions, still not over) and the ROM drive to 600,000 frames (891 decisions), **894 engine states match in order and no mismatch appears** (it was 124 of 333 at the default limits). | none: it cannot be driven "to battle end" in practical time. Keep it off the regression list; it is a long-run check, not an open rule bug. |

Seed 705 was the same kind of limit and nothing else: it ends after 82,835 ROM frames, just past the driver's default 80,000-frame
cap (`soundEventProbe.py lab --drive ... --frames N`), and matches 188 / 188.

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

One presentation lead seen while re-pinning and not looked at: census battle 32 trips `sa125`'s ON - OFF row check on a
CONFUSION anchor (139 vs 100).

## Gates

Typecheck, full suite and build are run on a clean checkout of the branch tip. The full suite's only failures are five
animation evidence tests that fail on box master `43b0b22e5` itself (hash re-point commit: `hyperVoiceEvidenceCheckpoint`,
`hyperVoiceReducer`, `hyperVoiceActualCore`, `overheatEvidenceCheckpoint`, `psychUpEvidenceCheckpoint`); this lane did not
touch them.
