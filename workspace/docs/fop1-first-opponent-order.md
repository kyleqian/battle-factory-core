# fop1: a new challenge's first opponent in the ROM's order (2026-11-21)

fcr2 finding 5 (`docs/fcr2-catcher-round2.md`), the parity-mac lane's Finding 47 (`docs/parity-mac/first-trainer-after-draft-picks.md`,
left unfixed on 2026-11-18 for the re-pin cost). Kyle asked for the fix knowing it changes gameplay: every new challenge's first opponent
moves. Branch `fix/first-opponent-order` (from `claude/distracted-shtern-921c31`).

## What was wrong

At the end of the PreBattleRoom walk the ROM runs `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_EnterRoom`
(`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:30-31`): `factory_generaterentalmons` (`GenerateInitialRentalMons`,
`battle_factory.c:509-601`: the six rental set ids, no personality) and then `factory_generateopponentmons` (`GenerateOpponentMons`,
`:303-377`: the first trainer and his three set ids) in one script run. The six personalities are drawn later, when the select screen opens
(`CreateFrontierFactorySelectableMons`, `battle_factory_screen.c:1736`), and the trainer's three at the battle's start
(`FillFactoryTrainerParty`, `battle_tower.c:1815`). The engine drew the six ids, then the six personalities, then the first opponent
(`createFactoryRoundBattleOrchestrator` rolled him from `initialRentalGeneration.rngValue`). Same six rentals, another first opponent for the
same RNG. Every new challenge takes this script: round 1 (a `start: "draft"` session, the `after-save` Lobby start, the soak's generated
starts) and every later round (the Lobby's new challenge). The anchor round (no gameplay seed) adopts the ROM-recorded trainer 50 and was
not affected.

## ROM evidence that the new order is the ROM's

| where | ROM | engine, old order | engine, new order |
|---|---|---|---|
| round 1, the anchor deal (`docs/anchor-draft-cursor-receipt.md` section 3: `GenerateInitialRentalMons` entry 145179184, frame 5796; its return 1172530733 is where trainer 50's selection starts, same frame) | trainer 50, sets 188 / 184 / 135, selection end 3145421632 | trainer 10 ELISE, 116 / 163 / 111 | trainer 50, 188 / 184 / 135, selection end 3145421632, 11 id draws |
| a Lobby new challenge after a loss (`tools/compare/traces/lbre-prebattle-c-off.json`; `tools/probe/lbre-deal-ram.py` now also reads the opponent): `gRngValue` 0xdb35a7d8 at frame 6659 (the engine's `rngValueBefore`, `tests/lbre.test.ts`) | frame 6660: ids 150 173 123 168 132 124, `gTrainerBattleOpponent_A` 13, `gFrontierTempParty` 133 189 137, `trainerIds[0]` 13, `gRngValue` 0xf6e707e7 | trainer 28 EILEEN, 194 / 197 / 129 | trainer 13 RUSS, 133 / 189 / 137, selection end 0xf6e707e7 (nothing else drawn after the deal in that frame) |
| 14 real-ROM recorded round runs (`tests/parityMacRoundReplayFixtures.test.ts`, the engine rolls from the ROM's cursor) | every chained round's first trainer | 8 known differences (finding 47) | 0: every battle matches outright |
| frame catcher, fresh traces (below) | the ROM's own order at round 2 | (fcr2: other Pokemon in all 8 deals, 7 round 2s and the Head trace's round 3; another trainer in 7) | see "Catcher" |

Both receipts are pinned in `tests/fop1FirstOpponentOrder.test.ts`.

## The change

- `src/engine/factoryRoundBattleOrchestrator.ts` `generateFactoryRoundDeal` (new): the six set ids (`generateInitialFactoryRentals`),
  the first opponent from the cursor right after them (`generateOpponentFor(..., ids.selectionRngValue, ...)`), then the six personalities
  from the cursor after the opponent (`generateInitialFactoryRentals` with `constructionRngValue` = the opponent's end). The orchestrator's
  `generateInitial` round uses it; its segments are now `initial-rental-selection`, `opponent-generation`, `initial-rental-construction`,
  contiguous (the `initial-rentals` kind is gone); the round's battle cursor is the end of the deal.
- `src/engine/factoryRoundChaining.ts` `generateFactoryChallengeDraft` uses the same deal (same inputs as core's
  `createPendingRoundOrchestrator`), so the draft screen's six (personalities, so genders and abilities), the PreBattleRoom briefing
  (`buildBriefingMessages`, which builds the orchestrator) and the battle agree. `src/engine/prebattleEntry.ts`: comment only.
- A staged round whose first battle is the Frontier Brain's (a test-only streak, 20 or 41 at battle 1) keeps his party after the
  personalities, as before: the ROM builds it at the battle's start (`FillFactoryBrainParty`, `battle_tower.c:1857`), after the select
  screen. (The ROM's EnterRoom would also run its ordinary roll there; that unreachable case is not modelled.) Finding 47's prototype made
  the same choice.

## What the personalities now draw from

The six personalities (and a challenge-8 rental's random IVs) start at the cursor after the first opponent's whole generation: his trainer
and three set ids, then his three personalities, back to back (the opponent's own construction stays right after his selection, as for every
later opponent). On the ROM the rentals' personalities come hundreds of frames later at the select screen and the opponent's at the battle's
start, with the overworld VBlank's `Random()` between and inside both; the engine does not follow those draws (ISSUES #55, distribution
parity, parked by Kyle 2026-08-13). So the rentals' set ids and the first trainer and his sets are exact for the ROM's deal cursor; the
personalities stay a distribution match, as before. The live cursor after the deal tick (`core.ts`, `advanceRngValue(generation.rngValue)`)
is the end of the deal, which now counts the opponent's draws too (before, the live stream went on from the personalities and the opponent
was drawn off it), so a generated round's battle-1 transition roll (`selectFrontierTransition` on the live cursor) moves with it. Not
modelled either way (the ROM's walk to the battle room draws VBlank `Random()` every frame).

An alternative order was considered and not taken: ids, opponent selection, rental personalities, opponent personalities (the ROM's call
order without the VBlank draws; Finding 47's prototype). It gives the same trainer and sets; only the opponent's personalities differ, and
neither order is the ROM's for them.

## The census keeps its battles

The animation / timing census (`tools/integration/generatedCommandAnimationReplay.ts` and its siblings, the route searches, and about 95
test files that pin their routes, fixtures and ROM receipts) indexes ordinary legal battles by (seed, streak) and built each with the
orchestrator's `generateInitial` round. The new order re-rolls every seed's first opponent: before the census change the full suite had 322
failing tests in 107 files (Finding 47's prototype: 269 in 103). `tools/integration/censusRound.ts` `censusDeal` builds the census seed's
battle as before fop1 through the public config: the six rentals from the seed (ids, then personalities), `currentRecords`, the cursor after
them (the orchestrator rolls the first opponent there). Checked against the pre-fop1 orchestrator (`git archive 9a28a00fb`) on 3,200
(seed, streak) pairs: the round and the opponent generations are identical. It is not a production deal and does not claim to be: the
census never tested the deal, and the deal is pinned on production paths by `tests/fop1FirstOpponentOrder.test.ts`. Converted: 24
`tools/integration` construction sites, `tests/helpers/btn1Battle.ts` and 16 test files; no assertion changed; `tests/fop1CensusRound.test.ts`
pins the construction. The round replay's chained rounds (`soundCensusRomReplay.ts round`) keep the production deal, which is what made the
ROM fixtures match.

## Re-pins (tests only, each by its own method)

| test | old | new | method |
|---|---|---|---|
| `factoryRoundBattleOrchestrator` "starts challenge 2 generation ..." | segments `initial-rentals` 0..279 + `opponent-generation` 279..459; trainer 87 [245, 212, 248]; calls 459; cursor 2671237774 | `initial-rental-selection` 0..7, `opponent-generation` 7..224, `initial-rental-construction` 224..432; trainer 109 [167, 241, 237]; calls 432; cursor 868353469 (set ids unchanged) | regenerated from the engine |
| `parityMacRoundReplayFixtures` (14 ROM runs) | 8 known differences allowed (`f.expect.knownDifferences` 1 / 5 / 1 / 1) | none: every battle `match`, every roll matched, no `knownDifference` (stricter) | the ROM's recordings |
| `randomRoundSoak` #104 (b), two round wins | seed 19 | seed 13 | seeds 0..49, `--policy winning --max-rounds 3 --render-every 0`: 13, 14, 23 chain two wins |
| `lbrd` | WIN_TWO 14, RETIRE 14, WIN_THEN_LOSE 14 | 2, 13, 2 | seeds 0..20 in all three roles (scratch copies): none passes every case; 2 fails only the retire, 13 only the loss |
| `flow1` cursor test | catcher seed 3 (Scene ON) | 0 | seeds 0..29: lowest with >= 5 checked entries and >= 3 carried cursors (6 / 12) |
| `flow1` Dig recall test | catcher seed 6, GROWLITHE -> VOLBEAT (AZUMARILL) | seed 135, POLIWHIRL -> GRAVELER (battle 2's PUPITAR) | seeds 0..199: lowest with >= 5 recalls and exactly one continuation after the foe's Dig |
| `pic3DrawnFieldCheck` Scene ON | soak seed 3 | 1 | seeds 0..11: none draws a row; 1 is the lowest above 20,000 checked frames inside the budget |
| `audioSinkNeutral` | the SE list lacked General_StatsChange's SEs | + 239 / 245 (SE_M_STAT_INCREASE / DECREASE, both scenes) | seed 7 Scene ON's new first opponent (EEVEE) uses CHARM: SE_M_STAT_DECREASE at 2258 |
| `rnc1RainContinues` played rain turn | catcher seed 19, battle 2, ROM frame 13170 + row hashes | seed 12, battle 1, ROM frame 7622 + row hashes, `ROM_WORDS_SEED12` | the only seed of 0..29 with a rain turn in 20,000 frames; re-recorded on the ROM with rnc1's own RAM watch (`.integration/evidence/fix-first-opponent/rain/`): W 7622, X 7624, SE 7627, words at 7641 + 3k, script end 7744; all 122 command rows of both rain turns pixel-identical with the ROM's words |

No pinned ROM value disagreed with the new order. The ROM-pinned tests that moved (`rnc1`, the `flow1` Dig case) pinned battles that the
seed no longer plays; `rnc1` was re-recorded on the ROM, and the `flow1` case's new seed was compared with the ROM by the catcher (below).

## Tests

- `tests/fop1FirstOpponentOrder.test.ts` (17): the two ROM receipts above; for five cursors and two carries the first opponent is
  `generateFactoryOpponent` at the cursor after the six ids (whole generation), the personalities start at its end, the segments are
  contiguous in that order, the round's cursor is the end of the deal; the draft screen, the briefing and `dealPrebattleEntry` show the
  same deal; a `start: "draft"` session's six and live cursor; a generated challenge played by the soak's player to battle 1's first
  action menu fights the deal's first opponent with the drafted personalities; the staged Brain first battle. Mutation check: with the old
  order put back inside `generateFactoryRoundDeal`, 12 of the file's 16 tests then failed (the 4 that passed check that the paths agree).
- `tests/fop1CensusRound.test.ts` (7): the census seed's battle.
- `npm run typecheck` uses `flock`, which this Mac lacks; its command (`NODE_OPTIONS=--max-old-space-size=8192 tsc -b`) is clean.
- `npm run test:gate`: 360 files, 2,832 tests pass.
- Full `npm test` on the branch tip `807648ecf`: 1,910 files pass, 44 skipped; 16,425 tests pass, 243 skipped, 0 failed
  (baseline on `9a28a00fb`: 1,908 / 16,401, 0 failed; after the fix alone: 107 files / 322 tests failed, then the census helper and the
  re-pins above).
- `python3 -m unittest tools/test_frame_catcher.py`: 32 tests OK.

## Catcher

Fresh traces on this build (`makeTrace.mjs --policy winning-swap --battles 14 --lobby-tail 120 --max-frames 260000`; the old ones no
longer replay): seed 23 Scene OFF reaches the Lobby after round 2 (14 battles). Seed 19 Scene ON now loses round 1, so Scene ON seeds 8,
9, 10, 26, 27, 29 were made: 27 and 29 win both rounds, 8 and 10 reach round 2 and lose its first battle. Run:
`KEEP=1 JOBS=3 tools/frame-catcher/run.sh .integration/evidence/fix-first-opponent/catcher` over 23 OFF, 27 / 29 / 10 / 8 ON. The catcher's
deal record now also says `romOwnOrderSame` / `romCursorIsEngines` (`plan.deal_own_order_check`).

| trace | menus followed | ROM's cursor at GenerateOpponentMons = engine's first-opponent cursor | ROM's own order | trapped roll | rentals |
|---|---|---|---|---|---|
| 23 OFF | 1042 / 1042 | yes (3606079728) | 102: 196 203 194 = engine | = engine | the engine's six |
| 27 ON | 725 / 725 | yes (3472032434) | 102: 208 187 183 = engine | = engine | the engine's six |
| 29 ON | 843 / 843 | yes (4232500037) | 93: 247 181 197 = engine | = engine | the engine's six |
| 10 ON | 474 / 474 | yes (1873793800) | 105: 164 260 175 = engine | = engine | the engine's six |
| 8 ON | 260 / 411 | (round 2 not reached on the ROM) | | | |

Before (fcr2, the same probe on the old build): the ROM's cursor was the engine's `selectionRngValue`, not its first-opponent cursor, in all
8 deals, and the ROM's own order rolled other Pokemon in all 8 (another trainer in 7). After: in all 4 round 2s reached, the ROM's own order
gives the engine's trainer and sets with no cursor written for the opponent. In the four complete runs every battle-start transition (14,
14, 14, 8) and every IV record (54, 54, 54, 36) is the engine's, and no party check failed. Seed 8 Scene ON stopped in round 1 after
battle 5: the player picked RECORD on the after-win menu, which the engine keeps stub-only (Kyle's 2026-08-05 scope decision), so the ROM
went on into its record flow (`unplanned-rom-menu`); not this change.

Round 1 cannot be told by the catcher: the ROM starts from the oracle's draft snapshot, whose deal was made before it, and the catcher writes
the engine's six and first trainer there. Round 1 is covered by the two ROM receipts above (the anchor and the Lobby deal), which take the
same script.

The flow1 Dig case's new seed (135 Scene OFF, `--policy full --battles 2`, `.integration/evidence/fix-first-opponent/catcher-flow1/`): 149 /
149 menus; at the recall (engine 18340-18640, ROM 19368-19668, `flow1-dig-recall-s135.png`) the ROM shows PUPITAR hidden, "POLIWHIRL,
that's enough! Come back!", the recall, "Go for it, GRAVELER!" and "Foe PUPITAR used DIG!", as ours; that stretch's sounds are the same.

## Left open

- The other re-pinned seeds (soak, `lbrd`, `pic3`, the `flow1` cursor test) are engine-only pins, as before.
- `tools/integration` route searches still read `generateInitialFactoryRentals` from the seed, consistent with `censusDeal` (the census);
  none of them looks for a production deal.
- `docs/parity-mac/first-trainer-after-draft-picks.md` says "not fixed"; this doc supersedes it (a status line was added there).
