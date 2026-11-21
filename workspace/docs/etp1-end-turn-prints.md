# etp1: end-turn prints (presentation timing, both scenes)

Tested commit 19c4af5a9, tree 7a6d6d9825a37f0051c6b56cff388e0a091bfcc4 (branch worker/integration-20261121-211406). Commits: 33bdace6d (1/3 weather), bf7ede0b8 (2/3 ticks), 4a9fdba37 (2b), 19c4af5a9 (3/3 dragged out).
Labs: `tools/battle-lab/etp1-*-{on,off}.json` (made by `tools/integration/etp1MakeLabs.py`); ROM rows by `tools/integration/hcr3mProbe.py`, paired by `etp1Pairs.py` / `etp1Table.py`. ROM first glyph = exec-flag row + 1.

## Rules (all in `src/engine/battleResolutionPresentation.ts`)
- `END_TURN_PRINT_SCRIPTS` (rain / sandstorm / hail / sun continues and ends, poison / burn / curse tick, Future Sight hit): the first end-turn print after MoveEnd takes the wtl1 +1 row pause (`END_TURN_WEATHER_PRINT_EXTRA_ROWS`).
- DamagingWeatherLoop: first print lead ON 2 / OFF 7, +3 after the pass's hp command. Wish "regained health" after its hp: +5.
- Roar / Whirlwind: the end-turn print after "was dragged out!" (which waits for an A press P) takes +13 rows (`DRAGGED_OUT_END_TURN_PRINT_ROWS`): ROM first glyph P + 15, ours was P + 2.

## Result (ENG - ROM first glyph, after)
Exact (0, both scenes): Sandstorm / Hail / Sun continue + damage + end prints, poison / burn / toxic ticks (turn 2+), Future Sight hit, Wish heal, Ingrain, Roar and Whirlwind end-turn prints (OFF {334, 425, 580}, ON {661, 919, 1074}); Leftovers OFF 0.
Residuals (not fixed): Leech Seed sap OFF +9 / ON +2; Wrap / trap print after the hit OFF -2 / -1, ON -8 / -7; Ghost Curse "laid a curse" -3; Uproar CAUSEDUPROAR -12 / -21; Taunt 0; Encore OFF 0 / ON -1; Shell Bell 0; Leftovers ON -1; turn-1 first tick -2 both scenes; ON status print after the status animation -2 (pinned by sa125 / sag130 receipts). Disable lab misaligned. twave, curse turn 2+ and wrap faint have ROM RNG divergence. The weather-loop turn-end event is ~10 rows early and the SEs inside the loop are late.

## Backed out (ROM picture fixtures contradict the lab rules)
- Perish Song label +1 / second-battler +5 (lab exact) and the status-icon "+2 rows for the next used print" rule: both moved seed 2741's ais2 ROM-picture windows by 258 / 219 frames. Not shipped; Perish is not pinned.

## Tests
- New: `tests/etp1EndTurnPrints.test.ts` (labs sandstorm, hail, sun, sandstorm5, sun5, toxic3, willowisp3, futuresight, wish, ingrain, roar, whirlwind; both scenes).
- Re-pinned toward the ROM: hpf2 (Sandstorm hit -> first print), factoryRoundBattleOrchestrator #95, trn181 Toxic pauses.
- Trajectory pins re-pinned (not ROM frames): randomRoundSoak seed 21 (43638 -> 43732, renderCalls 3059 -> 3055), seed 0 (75618 -> 57508, battle 3 / depth 2 / turn 12), seed 1 (58583 -> 57984, turn 15), Baton Pass seed 11 -> 5.
- LEFT RED: tests/aud252EndTurnSounds.test.ts "same three rows with the same pans": [0,-1,2] -> [0,-4,-4] (mass 3 -> 8). The weather-loop leads lengthen the command, so the SE after the print is late; the print glyphs are ROM-exact. Moved away from the ROM, so not re-pinned.
- Green at 19c4af5a9: aud2*, fnt*, trp*, hpf*, etp1*, wtl1*, orchestrator, trn181, randomRoundSoak (64/64) except aud252.

## Not done in the 150-minute cap
- Final T2 rescore on the final tree and the 0..199 census (rst197 digest / soundCensusDelta T1). Earlier T2 (with the Perish + icon rules still in; stale): ON mass 16826 -> 15596, exact 2806 -> 2816; OFF mass 2327 -> 2175, exact 709 -> 715; 0 missing / 0 extra.
- `npm run typecheck`, `npm run test:gate`, `npm run build` not completed on the final tree (typecheck flock held by other workers).

## Website
Yes, the website must know: this is a play change (end-turn print timing moves, so the press phases of recorded games move); older recorded games replay on their own build only.
