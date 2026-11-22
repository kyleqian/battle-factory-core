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

## etp2 (fix-forward: sound timing only)
Tested commit f54e72b82, tree 2f74e86c1777b511fe731685da4d5076662ba34a (branch worker/integration-20261121-234346); base c114f4410. No gameplay, RNG, damage, turn-order or facility-state change.
- aud252 end-turn SE (was [0,-4,-4] after etp1, now [0,0,0]): the ROM `BattleScript_DamagingWeatherLoop` runs printfromtable, waitmessage(64), orword, effectivenesssound, hitanimation, so SE_EFFECTIVE is the row before the hitanimation row, and our hit command starts 3 rows before that row. The SE is now a fixed 3 ticks after our hit command (`WEATHER_LOOP_HIT_SE_AFTER_COMMAND_ROWS` in battleHitSounds.ts; the Scene ON controller lag no longer applies to it). ROM-exact: ON 579 / 988 / 1136, OFF 262 / 514 / 662 (etp1-hail-off). The print glyphs did not move. `tools/integration/etp2SeLab.ts` prints the engine's SE rows of a lab; `tools/battle-lab/etp2-hail-on.json` is the 1500-frame Hail lab. tests/aud252EndTurnSounds.test.ts is re-pinned to 0 / 0 / 0.
- Census (lsd194Census.sh, seeds 0..199, both scenes, c114f4410 vs the final tree): eventsDigest identical 200/200 in both scenes. T1 identical on both arms: ON missing 0 / extra 0; OFF extra 35 (the known Substitute / Transform rows, on both arms), missing 0. Sound rows: same sequences, frames moved in 84/200 seeds per scene (etp1's cumulative shifts; no row added or removed).
- T2 rescore (rescoreAll.sh over .integration/evidence/t2n, base c114f4410 -> final): ON mass 16826 -> 15643, exact 2806 -> 2818; OFF mass 2327 -> 2181, exact 709 -> 713; 0 missing / 0 extra in both (the etp1 note's stale 15596 / 2175 is superseded).
- tests/lbrd.test.ts WIN_TWO_SEED 13 -> 4: etp1 (1/3) shifted the soak player's presses so seed 13's Scene OFF continuation lost (base passes; found by bisecting 33bdace6d). A scan of 0..16 found only 4 passing all 15 cases.
- Not fixed, measured. Leech Seed sap (lsd194 drain, `LEECH_SEED_DRAIN_PRE_ROWS = 8`): after a hit's hp command OFF is +9 rows (ROM pause start to healthbar 35, ours 44), ON +2 (216 vs 218); the constant fits the "was seeded!" print case and ON needs a different value (the ROM is about 7 rows longer than the lsd194 case there), so one rule does not fit both scenes; with a long hit bar (Chansey) the hit-hp to MoveEnd tail is also about 14 rows early. Turn 2 shows the same +9 / +2. Labs etp1-leechseed2-{on,off} and etp1-leechseedc-{on,off} (etp1MakeLabs.py) are committed for the next step. Wrap / trap print after the hit (ON -8 / -7) starts at the preceding hit body (hit-animation E549 vs ROM R557 in Scene ON), not at the end-turn print; OFF -2 as before. The hit command itself is 3 rows early and hp commands 2-3 rows early in the weather loop (residual).
- Verified: typecheck, test:gate (360 files / 2835), build, aud2* / etp1* / fnt* / trp* / hpf* / snd1IceBall, randomRoundSoak* (9 files / 120), lbrd (15).

## Website (etp2)
Yes, the website must know: sound frames move (the weather-loop hit SE only); no state, RNG or timing of the game changes, but lbrd's pinned seed moved with etp1's presentation timing.
