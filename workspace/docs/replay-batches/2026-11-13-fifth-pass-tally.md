# The tally of the fifth pass (2026-11-13)

Written by `tools/audio/romReplayTally.py` from the matching battles listed in `2026-11-13-fifth-pass.json`: the final run on the engine with fix 41 (the proof list,
the mixed list, the pool of 962, the Brain lists, the eighth-challenge list, the former lab-failure seeds, the staged battles, the Metronome sweep), the discovery
batches, the Metronome shapes and the staged battles of the fifth pass. Rules of the rows: `docs/parity-mac/tally.md`. `covered` is a count of occurrences, not of
battles; a row with a text instead of a number cannot occur in a Level 50 Factory battle (the text is the reason). One column per player.

| row | covered | ai-v1 | census | random-v1 | script | used / worked | first battle |
|---|---|---|---|---|---|---|---|
| ability:ABILITY_ARENA_TRAP | 5 | 0 | 0 | 5 | 0 |  | 20334-random-v1 |
| ability:ABILITY_BATTLE_ARMOR | 507 | 142 | 234 | 73 | 58 |  | 20028-random-v1 |
| ability:ABILITY_BLAZE | 132 | 54 | 38 | 17 | 23 |  | 20018-random-v1 |
| ability:ABILITY_CHLOROPHYLL | 588 | 125 | 290 | 52 | 121 |  | 20003-random-v1 |
| ability:ABILITY_CLEAR_BODY | 25 | 2 | 8 | 6 | 9 |  | 20338-census |
| ability:ABILITY_CLOUD_NINE | 48 | 23 | 13 | 12 | 0 |  | 20339-random-v1 |
| ability:ABILITY_COLOR_CHANGE | 329 | 26 | 60 | 13 | 230 |  | 20113-census |
| ability:ABILITY_COMPOUND_EYES | 400 | 81 | 289 | 30 | 0 |  | 20264-random-v1 |
| ability:ABILITY_CUTE_CHARM | 87 | 9 | 31 | 6 | 41 |  | 20440-ai-v1 |
| ability:ABILITY_DAMP | 8 | 0 | 5 | 1 | 2 |  | 7433-census |
| ability:ABILITY_EARLY_BIRD | 178 | 36 | 126 | 11 | 5 |  | 20271-ai-v1 |
| ability:ABILITY_EFFECT_SPORE | 39 | 6 | 20 | 4 | 9 |  | 20135-ai-v1 |
| ability:ABILITY_FLAME_BODY | 61 | 15 | 21 | 14 | 11 |  | 20046-random-v1 |
| ability:ABILITY_FLASH_FIRE | 118 | 26 | 44 | 28 | 20 |  | 20006-random-v1 |
| ability:ABILITY_FORECAST | 23 | 2 | 16 | 3 | 2 |  | 20006-random-v1 |
| ability:ABILITY_GUTS | 116 | 33 | 40 | 19 | 24 |  | 20332-ai-v1 |
| ability:ABILITY_HUGE_POWER | 221 | 62 | 70 | 35 | 54 |  | 20011-random-v1 |
| ability:ABILITY_HUSTLE | 266 | 48 | 118 | 47 | 53 |  | 20304-random-v1 |
| ability:ABILITY_HYPER_CUTTER | 15 | 4 | 5 | 0 | 6 |  | 20576-ai-v1 |
| ability:ABILITY_ILLUMINATE | field ability only (wild encounter rate) | 0 | 0 | 0 | 0 |  |  |
| ability:ABILITY_IMMUNITY | 35 | 13 | 18 | 4 | 0 |  | 20338-census |
| ability:ABILITY_INNER_FOCUS | 102 | 25 | 27 | 13 | 37 |  | 20159-random-v1 |
| ability:ABILITY_INSOMNIA | 37 | 2 | 15 | 4 | 16 |  | 20050-random-v1 |
| ability:ABILITY_INTIMIDATE | 1260 | 356 | 475 | 253 | 176 |  | 20002-random-v1 |
| ability:ABILITY_KEEN_EYE | 31 | 12 | 6 | 7 | 6 |  | 20003-random-v1 |
| ability:ABILITY_LEVITATE | 298 | 28 | 196 | 46 | 28 |  | 20032-random-v1 |
| ability:ABILITY_LIGHTNING_ROD | redirects Electric moves to itself in doubles; no effect in singles (Gen 3) | 0 | 0 | 0 | 0 |  |  |
| ability:ABILITY_LIMBER | 33 | 6 | 21 | 3 | 3 |  | 20234-random-v1 |
| ability:ABILITY_LIQUID_OOZE | 23 | 14 | 2 | 5 | 2 |  | 20127-ai-v1 |
| ability:ABILITY_MAGMA_ARMOR | 6 | 2 | 3 | 1 | 0 |  | 20969-random-v1 |
| ability:ABILITY_MAGNET_PULL | 1 | 0 | 0 | 0 | 1 |  | stage-magnet-pull |
| ability:ABILITY_MARVEL_SCALE | 101 | 4 | 94 | 3 | 0 |  | 20036-random-v1 |
| ability:ABILITY_MINUS | needs a partner with Plus on the field (doubles) | 0 | 0 | 0 | 0 |  |  |
| ability:ABILITY_NATURAL_CURE | 39 | 8 | 9 | 11 | 11 |  | 20030-random-v1 |
| ability:ABILITY_OBLIVIOUS | 76 | 18 | 43 | 14 | 1 |  | 20569-random-v1 |
| ability:ABILITY_OVERGROW | 199 | 58 | 70 | 33 | 38 |  | 20037-random-v1 |
| ability:ABILITY_OWN_TEMPO | 74 | 27 | 13 | 13 | 21 |  | 20033-random-v1 |
| ability:ABILITY_PICKUP | after-battle item pick-up; not in a Frontier battle | 0 | 0 | 0 | 0 |  |  |
| ability:ABILITY_PLUS | needs a partner with Minus on the field (doubles) | 0 | 0 | 0 | 0 |  |  |
| ability:ABILITY_POISON_POINT | 171 | 36 | 42 | 27 | 66 |  | 20037-random-v1 |
| ability:ABILITY_PRESSURE | 2625 | 1028 | 901 | 337 | 359 |  | 20004-random-v1 |
| ability:ABILITY_PURE_POWER | 205 | 113 | 58 | 29 | 5 |  | 20008-random-v1 |
| ability:ABILITY_RAIN_DISH | 142 | 34 | 101 | 7 | 0 |  | 20288-census |
| ability:ABILITY_ROCK_HEAD | 72 | 32 | 34 | 6 | 0 |  | 20023-random-v1 |
| ability:ABILITY_ROUGH_SKIN | 73 | 13 | 24 | 6 | 30 |  | 20247-ai-v1 |
| ability:ABILITY_RUN_AWAY | fleeing from a wild battle only | 0 | 0 | 0 | 0 |  |  |
| ability:ABILITY_SAND_VEIL | 204 | 43 | 109 | 36 | 16 |  | 20020-random-v1 |
| ability:ABILITY_SERENE_GRACE | 1447 | 59 | 247 | 46 | 1095 |  | 20022-random-v1 |
| ability:ABILITY_SHADOW_TAG | 99 | 0 | 0 | 55 | 44 |  | 20029-random-v1 |
| ability:ABILITY_SHED_SKIN | 97 | 7 | 63 | 14 | 13 |  | 20384-random-v1 |
| ability:ABILITY_SHELL_ARMOR | 1524 | 409 | 540 | 182 | 393 |  | 20011-random-v1 |
| ability:ABILITY_SHIELD_DUST | 240 | 38 | 103 | 32 | 67 |  | 20282-ai-v1 |
| ability:ABILITY_SOUNDPROOF | 11 | 0 | 10 | 1 | 0 |  | 20508-census-gold |
| ability:ABILITY_SPEED_BOOST | 436 | 95 | 124 | 38 | 179 |  | 20024-random-v1 |
| ability:ABILITY_STATIC | 127 | 46 | 53 | 20 | 8 |  | 20036-random-v1 |
| ability:ABILITY_STENCH | field ability only (wild encounter rate) | 0 | 0 | 0 | 0 |  |  |
| ability:ABILITY_STICKY_HOLD | 4 | 1 | 1 | 1 | 1 |  | 21021-ai-v1 |
| ability:ABILITY_STURDY | 49 | 6 | 22 | 18 | 3 |  | 1469-census |
| ability:ABILITY_SUCTION_CUPS | 9 | 0 | 5 | 4 | 0 |  | 20934-random-v1 |
| ability:ABILITY_SWARM | 82 | 26 | 25 | 14 | 17 |  | 20001-random-v1 |
| ability:ABILITY_SWIFT_SWIM | 718 | 208 | 386 | 64 | 60 |  | 20007-random-v1 |
| ability:ABILITY_SYNCHRONIZE | 70 | 21 | 28 | 17 | 4 |  | 20044-random-v1 |
| ability:ABILITY_THICK_FAT | 512 | 63 | 277 | 60 | 112 |  | 20006-random-v1 |
| ability:ABILITY_TORRENT | 177 | 50 | 61 | 29 | 37 |  | 20008-random-v1 |
| ability:ABILITY_TRACE | 399 | 126 | 158 | 56 | 59 |  | 20021-random-v1 |
| ability:ABILITY_TRUANT | 735 | 197 | 418 | 61 | 59 |  | 20044-random-v1 |
| ability:ABILITY_VITAL_SPIRIT | 11 | 0 | 6 | 0 | 5 |  | 4777-census |
| ability:ABILITY_VOLT_ABSORB | 52 | 22 | 22 | 2 | 6 |  | 20107-ai-v1 |
| ability:ABILITY_WATER_ABSORB | 353 | 38 | 267 | 42 | 6 |  | 20013-random-v1 |
| ability:ABILITY_WATER_VEIL | 25 | 5 | 12 | 3 | 5 |  | 20798-census |
| ability:ABILITY_WHITE_SMOKE | 37 | 0 | 3 | 3 | 31 |  | 7351-census |
| hold:HOLD_EFFECT_ATTACK_UP | 404 | 84 | 124 | 46 | 150 |  | 20002-random-v1 |
| hold:HOLD_EFFECT_BUG_POWER | 91 | 11 | 62 | 18 | 0 |  | 20919-random-v1 |
| hold:HOLD_EFFECT_CHOICE_BAND | 1167 | 309 | 730 | 124 | 4 |  | 20022-random-v1 |
| hold:HOLD_EFFECT_CURE_ATTRACT | 1 | 0 | 0 | 0 | 1 |  | stage-mental-herb |
| hold:HOLD_EFFECT_CURE_BRN | 3 | 0 | 0 | 0 | 3 |  | stage-metronome-camouflage |
| hold:HOLD_EFFECT_CURE_CONFUSION | 270 | 59 | 76 | 27 | 108 |  | 20002-random-v1 |
| hold:HOLD_EFFECT_CURE_PAR | 70 | 19 | 24 | 7 | 20 |  | 20264-random-v1 |
| hold:HOLD_EFFECT_CURE_PSN | 4 | 0 | 2 | 1 | 1 |  | 20683-census |
| hold:HOLD_EFFECT_CURE_SLP | 673 | 217 | 367 | 70 | 19 |  | 20012-random-v1 |
| hold:HOLD_EFFECT_CURE_STATUS | 500 | 164 | 226 | 88 | 22 |  | 20004-random-v1 |
| hold:HOLD_EFFECT_DARK_POWER | 432 | 56 | 79 | 26 | 271 |  | 20046-random-v1 |
| hold:HOLD_EFFECT_DEEP_SEA_SCALE | 48 | 20 | 25 | 3 | 0 |  | 20041-random-v1 |
| hold:HOLD_EFFECT_ELECTRIC_POWER | 178 | 62 | 72 | 24 | 20 |  | 20043-random-v1 |
| hold:HOLD_EFFECT_EVASION_UP | 16332 | 3925 | 6523 | 1733 | 4151 |  | 20001-random-v1 |
| hold:HOLD_EFFECT_FIGHTING_POWER | 290 | 57 | 42 | 17 | 174 |  | 20113-census |
| hold:HOLD_EFFECT_FIRE_POWER | 101 | 24 | 37 | 21 | 19 |  | 20001-random-v1 |
| hold:HOLD_EFFECT_FLINCH | 88 | 24 | 29 | 12 | 23 |  | 20207-ai-v1 |
| hold:HOLD_EFFECT_FLYING_POWER | 224 | 60 | 53 | 19 | 92 |  | 20109-random-v1 |
| hold:HOLD_EFFECT_FOCUS_BAND | 21 | 6 | 7 | 2 | 6 |  | 5056-census |
| hold:HOLD_EFFECT_GRASS_POWER | 38 | 21 | 5 | 10 | 2 |  | 20101-ai-v1 |
| hold:HOLD_EFFECT_GROUND_POWER | 239 | 66 | 63 | 27 | 83 |  | 20162-ai-v1 |
| hold:HOLD_EFFECT_ICE_POWER | 422 | 101 | 132 | 60 | 129 |  | 20011-random-v1 |
| hold:HOLD_EFFECT_LEFTOVERS | 25207 | 4290 | 16225 | 2109 | 2583 |  | 20004-random-v1 |
| hold:HOLD_EFFECT_NORMAL_POWER | 625 | 151 | 189 | 45 | 240 |  | 20002-random-v1 |
| hold:HOLD_EFFECT_POISON_POWER | 79 | 36 | 18 | 18 | 7 |  | 20126-ai-v1 |
| hold:HOLD_EFFECT_PSYCHIC_POWER | 568 | 153 | 171 | 64 | 180 |  | 20011-random-v1 |
| hold:HOLD_EFFECT_QUICK_CLAW | 676 | 196 | 373 | 91 | 16 |  | 20003-random-v1 |
| hold:HOLD_EFFECT_RESTORE_HP | 1577 | 279 | 329 | 112 | 857 |  | 20001-random-v1 |
| hold:HOLD_EFFECT_RESTORE_PP | 4 | 2 | 1 | 1 | 0 |  | 7879-census |
| hold:HOLD_EFFECT_RESTORE_STATS | 312 | 115 | 144 | 44 | 9 |  | 20007-random-v1 |
| hold:HOLD_EFFECT_ROCK_POWER | 196 | 64 | 46 | 25 | 61 |  | 20122-ai-v1 |
| hold:HOLD_EFFECT_SCOPE_LENS | 5780 | 1496 | 1939 | 675 | 1670 |  | 20001-random-v1 |
| hold:HOLD_EFFECT_SHELL_BELL | 3694 | 966 | 1397 | 577 | 754 |  | 20007-random-v1 |
| hold:HOLD_EFFECT_SPEED_UP | 716 | 188 | 380 | 114 | 34 |  | 20014-random-v1 |
| hold:HOLD_EFFECT_SP_ATTACK_UP | 408 | 105 | 100 | 50 | 153 |  | 20024-random-v1 |
| hold:HOLD_EFFECT_STEEL_POWER | 164 | 30 | 30 | 8 | 96 |  | 20238-census |
| hold:HOLD_EFFECT_STICK | 111 | 67 | 34 | 10 | 0 |  | 20010-random-v1 |
| hold:HOLD_EFFECT_THICK_CLUB | 254 | 102 | 125 | 12 | 15 |  | 20132-ai-v1 |
| hold:HOLD_EFFECT_WATER_POWER | 364 | 69 | 51 | 42 | 202 |  | 20039-random-v1 |
| move:EFFECT_ABSORB | 2106 | 542 | 1135 | 260 | 169 | 2373 / 2106 | 20001-random-v1 |
| move:EFFECT_ACCURACY_DOWN | 1279 | 223 | 493 | 142 | 421 | 2047 / 1279 | 20001-random-v1 |
| move:EFFECT_ACCURACY_DOWN_HIT | 578 | 95 | 210 | 51 | 222 | 1179 / 815 | 20042-random-v1 |
| move:EFFECT_ALL_STATS_UP_HIT | 195 | 54 | 79 | 19 | 43 | 2136 / 1826 | 20001-random-v1 |
| move:EFFECT_ALWAYS_HIT | 6742 | 1597 | 2269 | 718 | 2158 | 7242 / 6742 | 20006-random-v1 |
| move:EFFECT_ASSIST | 29 | 2 | 1 | 0 | 26 | 29 / 29 | 3784-census |
| move:EFFECT_ATTACK_DOWN | 20 | 0 | 1 | 1 | 18 | 21 / 20 | 20774-random-v1 |
| move:EFFECT_ATTACK_DOWN_2 | 600 | 87 | 240 | 74 | 199 | 1016 / 600 | 20010-random-v1 |
| move:EFFECT_ATTACK_DOWN_HIT | 67 | 5 | 6 | 4 | 52 | 1132 / 795 | 20011-random-v1 |
| move:EFFECT_ATTACK_UP | 74 | 4 | 9 | 8 | 53 | 75 / 74 | 20389-random-v1 |
| move:EFFECT_ATTACK_UP_2 | 532 | 162 | 170 | 59 | 141 | 602 / 532 | 20013-random-v1 |
| move:EFFECT_ATTACK_UP_HIT | 126 | 35 | 36 | 20 | 35 | 1289 / 919 | 20006-random-v1 |
| move:EFFECT_ATTRACT | 531 | 165 | 242 | 96 | 28 | 2435 / 531 | 20001-random-v1 |
| move:EFFECT_BATON_PASS | 276 | 55 | 114 | 50 | 57 | 704 / 276 | 20013-random-v1 |
| move:EFFECT_BEAT_UP | 14 | 0 | 1 | 0 | 13 | 14 / 14 | stage-metro-chansey-125 |
| move:EFFECT_BELLY_DRUM | 50 | 14 | 18 | 3 | 15 | 69 / 50 | 20172-ai-v1 |
| move:EFFECT_BIDE | 56 | 0 | 3 | 0 | 53 | 56 / 56 | 9801-census |
| move:EFFECT_BLAZE_KICK | 7 | 0 | 1 | 0 | 6 | 61 / 45 | 20400-ai-v1 |
| move:EFFECT_BRICK_BREAK | 1933 | 435 | 783 | 236 | 479 | 2388 / 1933 | 20002-random-v1 |
| move:EFFECT_BULK_UP | 198 | 56 | 76 | 30 | 36 | 217 / 198 | 20102-ai-v1 |
| move:EFFECT_BURN_HIT | 191 | 48 | 64 | 20 | 59 | 3543 / 2868 | 20001-random-v1 |
| move:EFFECT_CALM_MIND | 718 | 242 | 350 | 97 | 29 | 1006 / 718 | 20005-random-v1 |
| move:EFFECT_CAMOUFLAGE | 2 | 0 | 0 | 0 | 2 | 24 / 2 | stage-metronome-camouflage |
| move:EFFECT_CHARGE | 20 | 0 | 1 | 0 | 19 | 20 / 20 | 4412-census |
| move:EFFECT_CONFUSE | 3112 | 562 | 1367 | 396 | 787 | 3840 / 3112 | 20002-random-v1 |
| move:EFFECT_CONFUSE_HIT | 447 | 90 | 90 | 31 | 236 | 5975 / 4385 | 20001-random-v1 |
| move:EFFECT_CONVERSION | 6 | 0 | 0 | 0 | 6 | 28 / 6 | stage-metro-clefable-20 |
| move:EFFECT_CONVERSION_2 | 7 | 0 | 0 | 0 | 7 | 21 / 7 | stage-metro-chansey-185 |
| move:EFFECT_COSMIC_POWER | 396 | 107 | 165 | 54 | 70 | 560 / 396 | 20007-random-v1 |
| move:EFFECT_COUNTER | 487 | 123 | 206 | 58 | 100 | 2345 / 487 | 20012-random-v1 |
| move:EFFECT_CURSE | 1337 | 485 | 673 | 158 | 21 | 1560 / 1337 | 20004-random-v1 |
| move:EFFECT_DEFENSE_CURL | 4799 | 136 | 168 | 72 | 4423 | 15602 / 4799 | 20011-random-v1 |
| move:EFFECT_DEFENSE_DOWN | 203 | 21 | 40 | 21 | 121 | 248 / 203 | 20006-random-v1 |
| move:EFFECT_DEFENSE_DOWN_2 | 396 | 82 | 142 | 50 | 122 | 672 / 396 | 20011-random-v1 |
| move:EFFECT_DEFENSE_DOWN_HIT | 288 | 58 | 127 | 45 | 58 | 1332 / 1036 | 20001-random-v1 |
| move:EFFECT_DEFENSE_UP | 172 | 21 | 53 | 2 | 96 | 265 / 172 | 20296-ai-v1 |
| move:EFFECT_DEFENSE_UP_2 | 738 | 170 | 288 | 108 | 172 | 1465 / 738 | 20012-random-v1 |
| move:EFFECT_DEFENSE_UP_HIT | 37 | 10 | 8 | 5 | 14 | 443 / 358 | 20003-random-v1 |
| move:EFFECT_DESTINY_BOND | 195 | 36 | 137 | 22 | 0 | 195 / 195 | 20020-random-v1 |
| move:EFFECT_DISABLE | 205 | 32 | 93 | 17 | 63 | 654 / 205 | 20011-random-v1 |
| move:EFFECT_DOUBLE_EDGE | 1589 | 576 | 745 | 214 | 54 | 1882 / 1589 | 20004-random-v1 |
| move:EFFECT_DOUBLE_HIT | 376 | 90 | 141 | 63 | 82 | 490 / 376 | 20037-random-v1 |
| move:EFFECT_DRAGON_DANCE | 664 | 210 | 329 | 78 | 47 | 706 / 664 | 20008-random-v1 |
| move:EFFECT_DRAGON_RAGE | 34 | 11 | 7 | 3 | 13 | 39 / 34 | 20136-ai-v1 |
| move:EFFECT_DREAM_EATER | 345 | 102 | 176 | 50 | 17 | 645 / 345 | 20110-ai-v1 |
| move:EFFECT_EARTHQUAKE | 4430 | 1621 | 2062 | 641 | 106 | 5452 / 4430 | 20007-random-v1 |
| move:EFFECT_ENCORE | 255 | 23 | 156 | 15 | 61 | 393 / 255 | 20011-random-v1 |
| move:EFFECT_ENDEAVOR | 145 | 23 | 37 | 29 | 56 | 355 / 145 | 20002-random-v1 |
| move:EFFECT_ENDURE | 669 | 129 | 393 | 91 | 56 | 752 / 669 | 20014-random-v1 |
| move:EFFECT_ERUPTION | 110 | 17 | 43 | 3 | 47 | 122 / 110 | 20252-ai-v1 |
| move:EFFECT_EVASION_DOWN | 279 | 50 | 124 | 25 | 80 | 429 / 279 | 20015-random-v1 |
| move:EFFECT_EVASION_UP | 4770 | 1403 | 2446 | 485 | 436 | 7325 / 4770 | 20004-random-v1 |
| move:EFFECT_EXPLOSION | 267 | 70 | 122 | 39 | 36 | 299 / 267 | 20014-random-v1 |
| move:EFFECT_FACADE | 849 | 190 | 290 | 133 | 236 | 1056 / 849 | 20002-random-v1 |
| move:EFFECT_FAKE_OUT | 213 | 99 | 57 | 32 | 25 | 800 / 241 | 20039-random-v1 |
| move:EFFECT_FALSE_SWIPE | 23 | 0 | 1 | 0 | 22 | 24 / 23 | 3832-census |
| move:EFFECT_FLAIL | 511 | 116 | 305 | 62 | 28 | 628 / 511 | 20008-random-v1 |
| move:EFFECT_FLATTER | 99 | 30 | 33 | 21 | 15 | 116 / 99 | 20037-random-v1 |
| move:EFFECT_FLINCH_HIT | 539 | 98 | 170 | 58 | 213 | 5571 / 4221 | 20001-random-v1 |
| move:EFFECT_FLINCH_MINIMIZE_HIT | 66 | 10 | 8 | 7 | 41 | 647 / 568 | 20024-random-v1 |
| move:EFFECT_FOCUS_ENERGY | 90 | 17 | 17 | 8 | 48 | 220 / 90 | 20104-random-v1 |
| move:EFFECT_FOCUS_PUNCH | 284 | 97 | 149 | 38 | 0 | 423 / 284 | 20044-random-v1 |
| move:EFFECT_FOLLOW_ME | 1393 | 109 | 537 | 73 | 674 | 1393 / 1393 | 20024-random-v1 |
| move:EFFECT_FORESIGHT | 201 | 21 | 84 | 20 | 76 | 217 / 201 | 20126-ai-v1 |
| move:EFFECT_FREEZE_HIT | 178 | 36 | 101 | 24 | 17 | 3750 / 3130 | 20007-random-v1 |
| move:EFFECT_FRUSTRATION | 892 | 250 | 495 | 109 | 38 | 1106 / 892 | 20047-random-v1 |
| move:EFFECT_FURY_CUTTER | 414 | 34 | 119 | 53 | 208 | 548 / 414 | 20028-random-v1 |
| move:EFFECT_FUTURE_SIGHT | 514 | 114 | 126 | 47 | 227 | 635 / 514 | 20033-random-v1 |
| move:EFFECT_GRUDGE | 255 | 56 | 87 | 34 | 78 | 255 / 255 | 20028-random-v1 |
| move:EFFECT_GUST | 15 | 0 | 1 | 0 | 14 | 16 / 15 | 4764-census |
| move:EFFECT_HAIL | 448 | 93 | 203 | 42 | 110 | 716 / 448 | 20006-random-v1 |
| move:EFFECT_HAZE | 55 | 5 | 25 | 5 | 20 | 55 / 55 | 20273-census |
| move:EFFECT_HEAL_BELL | 340 | 46 | 103 | 40 | 151 | 340 / 340 | 20007-random-v1 |
| move:EFFECT_HELPING_HAND | always fails in singles: Cmd_trysethelpinghand needs BATTLE_TYPE_DOUBLE (battle_script_commands.c:9170-9186) | 0 | 0 | 0 | 0 | 835 / 0 | 20002-random-v1 |
| move:EFFECT_HIDDEN_POWER | 18 | 0 | 0 | 0 | 18 | 19 / 18 | stage-metro-chansey-144 |
| move:EFFECT_HIGH_CRITICAL | 2770 | 789 | 838 | 277 | 866 | 3743 / 2770 | 20001-random-v1 |
| move:EFFECT_HIT | 7387 | 2332 | 2965 | 943 | 1147 | 9393 / 7387 | 20002-random-v1 |
| move:EFFECT_IMPRISON | 9 | 0 | 0 | 0 | 9 | 20 / 9 | stage-imprison |
| move:EFFECT_INGRAIN | 110 | 31 | 46 | 9 | 24 | 397 / 110 | 20027-random-v1 |
| move:EFFECT_KNOCK_OFF | 605 | 66 | 145 | 43 | 351 | 811 / 605 | 20010-random-v1 |
| move:EFFECT_LEECH_SEED | 374 | 89 | 203 | 39 | 43 | 1147 / 374 | 20004-random-v1 |
| move:EFFECT_LEVEL_DAMAGE | 928 | 240 | 278 | 114 | 296 | 1276 / 928 | 20030-random-v1 |
| move:EFFECT_LIGHT_SCREEN | 1042 | 179 | 440 | 111 | 312 | 1843 / 1042 | 20003-random-v1 |
| move:EFFECT_LOCK_ON | 39 | 0 | 2 | 0 | 37 | 42 / 39 | 577-census |
| move:EFFECT_LOW_KICK | 187 | 43 | 52 | 13 | 79 | 212 / 187 | 20126-ai-v1 |
| move:EFFECT_MAGIC_COAT | 459 | 34 | 41 | 27 | 357 | 474 / 459 | 20033-random-v1 |
| move:EFFECT_MAGNITUDE | 369 | 19 | 34 | 4 | 312 | 598 / 369 | 20153-census |
| move:EFFECT_MEAN_LOOK | 277 | 63 | 106 | 27 | 81 | 376 / 277 | 20050-random-v1 |
| move:EFFECT_MEMENTO | 27 | 3 | 9 | 1 | 14 | 29 / 27 | 20240-ai-v1 |
| move:EFFECT_METRONOME | 6624 | 56 | 293 | 19 | 6256 | 6624 / 6624 | 20024-random-v1 |
| move:EFFECT_MINIMIZE | 3255 | 67 | 135 | 47 | 3006 | 6732 / 3255 | 20158-census |
| move:EFFECT_MIRROR_COAT | 164 | 60 | 67 | 21 | 16 | 1250 / 164 | 20012-random-v1 |
| move:EFFECT_MIRROR_MOVE | 10 | 2 | 0 | 0 | 8 | 19 / 10 | 20296-ai-v1 |
| move:EFFECT_MIST | 15 | 0 | 0 | 0 | 15 | 15 / 15 | stage-metronome-lock-on |
| move:EFFECT_MOONLIGHT | 147 | 26 | 59 | 18 | 44 | 147 / 147 | 20001-random-v1 |
| move:EFFECT_MORNING_SUN | 12 | 1 | 2 | 0 | 9 | 12 / 12 | 20296-ai-v1 |
| move:EFFECT_MUD_SPORT | 15 | 0 | 0 | 0 | 15 | 15 / 15 | stage-metro-chansey-18 |
| move:EFFECT_MULTI_HIT | 898 | 83 | 165 | 77 | 573 | 1329 / 898 | 20011-random-v1 |
| move:EFFECT_NATURE_POWER | 23 | 0 | 0 | 0 | 23 | 23 / 23 | stage-metro-chansey-147 |
| move:EFFECT_NIGHTMARE | 55 | 13 | 41 | 1 | 0 | 103 / 55 | 20106-ai-v1 |
| move:EFFECT_OHKO | 277 | 97 | 126 | 37 | 17 | 1119 / 277 | 20009-random-v1 |
| move:EFFECT_OVERHEAT | 570 | 187 | 275 | 78 | 30 | 708 / 570 | 20007-random-v1 |
| move:EFFECT_PAIN_SPLIT | 178 | 24 | 51 | 43 | 60 | 178 / 178 | 20128-census |
| move:EFFECT_PARALYZE | 3134 | 549 | 1177 | 273 | 1135 | 4411 / 3134 | 20001-random-v1 |
| move:EFFECT_PARALYZE_HIT | 539 | 151 | 232 | 73 | 83 | 6081 / 4949 | 20004-random-v1 |
| move:EFFECT_PAY_DAY | 14 | 0 | 1 | 0 | 13 | 15 / 14 | 4322-census |
| move:EFFECT_PERISH_SONG | 160 | 41 | 84 | 11 | 24 | 175 / 160 | 20102-ai-v1 |
| move:EFFECT_POISON | 20 | 0 | 0 | 0 | 20 | 38 / 20 | stage-metro-chansey-17 |
| move:EFFECT_POISON_FANG | 42 | 4 | 13 | 4 | 21 | 207 / 166 | 20002-random-v1 |
| move:EFFECT_POISON_HIT | 259 | 64 | 110 | 42 | 43 | 2010 / 1632 | 20013-random-v1 |
| move:EFFECT_POISON_TAIL | 7 | 0 | 1 | 1 | 5 | 138 / 112 | 20189-random-v1 |
| move:EFFECT_PRESENT | 49 | 12 | 8 | 6 | 23 | 59 / 49 | 20518-census |
| move:EFFECT_PROTECT | 3054 | 824 | 1228 | 289 | 713 | 3585 / 3054 | 20001-random-v1 |
| move:EFFECT_PSYCH_UP | 506 | 78 | 269 | 96 | 63 | 506 / 506 | 20162-ai-v1 |
| move:EFFECT_PSYWAVE | 127 | 29 | 31 | 4 | 63 | 193 / 127 | 20238-census |
| move:EFFECT_PURSUIT | 258 | 47 | 63 | 35 | 113 | 337 / 258 | 20006-random-v1 |
| move:EFFECT_QUICK_ATTACK | 1791 | 369 | 447 | 204 | 771 | 2244 / 1791 | 20002-random-v1 |
| move:EFFECT_RAGE | 25 | 0 | 0 | 0 | 25 | 25 / 25 | stage-rage-builds |
| move:EFFECT_RAIN_DANCE | 992 | 312 | 423 | 117 | 140 | 1264 / 992 | 20007-random-v1 |
| move:EFFECT_RAMPAGE | 1326 | 220 | 261 | 144 | 701 | 1514 / 1326 | 20019-random-v1 |
| move:EFFECT_RAPID_SPIN | 36 | 3 | 9 | 3 | 21 | 46 / 36 | 20145-ai-v1 |
| move:EFFECT_RAZOR_WIND | 99 | 12 | 22 | 4 | 61 | 132 / 99 | 20033-random-v1 |
| move:EFFECT_RECHARGE | 150 | 10 | 32 | 8 | 100 | 171 / 150 | 20189-random-v1 |
| move:EFFECT_RECOIL | 13129 | 767 | 8235 | 348 | 3779 | 20715 / 13129 | 20022-random-v1 |
| move:EFFECT_RECOIL_IF_MISS | 83 | 20 | 19 | 6 | 38 | 96 / 83 | 20150-ai-v1 |
| move:EFFECT_RECYCLE | 78 | 11 | 18 | 7 | 42 | 353 / 78 | 20273-census |
| move:EFFECT_REFLECT | 738 | 73 | 339 | 37 | 289 | 1262 / 738 | 20031-random-v1 |
| move:EFFECT_REFRESH | 221 | 4 | 11 | 0 | 206 | 6302 / 221 | 20158-census |
| move:EFFECT_REST | 3461 | 633 | 2301 | 329 | 198 | 3461 / 3461 | 20012-random-v1 |
| move:EFFECT_RESTORE_HP | 1327 | 225 | 834 | 148 | 120 | 1327 / 1327 | 20012-random-v1 |
| move:EFFECT_RETURN | 11 | 0 | 0 | 0 | 11 | 12 / 11 | stage-metro-chansey-119 |
| move:EFFECT_REVENGE | 88 | 19 | 24 | 6 | 39 | 102 / 88 | 20118-census |
| move:EFFECT_ROAR | 764 | 118 | 403 | 137 | 106 | 1032 / 764 | 20001-random-v1 |
| move:EFFECT_ROLE_PLAY | 139 | 12 | 40 | 19 | 68 | 143 / 139 | 20157-ai-v1 |
| move:EFFECT_ROLLOUT | 2831 | 241 | 474 | 292 | 1824 | 3685 / 2831 | 20001-random-v1 |
| move:EFFECT_SAFEGUARD | 553 | 77 | 128 | 41 | 307 | 940 / 553 | 20015-random-v1 |
| move:EFFECT_SANDSTORM | 726 | 166 | 264 | 94 | 202 | 1060 / 726 | 20020-random-v1 |
| move:EFFECT_SECRET_POWER | 270 | 57 | 49 | 21 | 143 | 1029 / 698 | 20019-random-v1 |
| move:EFFECT_SEMI_INVULNERABLE | 2313 | 572 | 854 | 247 | 640 | 3101 / 2313 | 20002-random-v1 |
| move:EFFECT_SKILL_SWAP | 318 | 23 | 89 | 24 | 182 | 326 / 318 | 20178-census |
| move:EFFECT_SKULL_BASH | 15 | 0 | 0 | 0 | 15 | 17 / 15 | stage-metro-chansey-1 |
| move:EFFECT_SKY_ATTACK | 9 | 1 | 0 | 0 | 8 | 33 / 29 | 20228-census |
| move:EFFECT_SKY_UPPERCUT | 186 | 33 | 43 | 19 | 91 | 250 / 186 | 20015-random-v1 |
| move:EFFECT_SLEEP | 2891 | 515 | 1597 | 299 | 480 | 5072 / 2891 | 20003-random-v1 |
| move:EFFECT_SLEEP_TALK | 168 | 67 | 60 | 30 | 11 | 401 / 168 | 20110-ai-v1 |
| move:EFFECT_SMELLINGSALT | 42 | 8 | 18 | 1 | 15 | 47 / 42 | 20168-census |
| move:EFFECT_SNORE | 1 | 1 | 0 | 0 | 0 | 296 / 41 | 20380-ai-v1 |
| move:EFFECT_SOFTBOILED | 744 | 157 | 377 | 100 | 110 | 744 / 744 | 20012-random-v1 |
| move:EFFECT_SOLAR_BEAM | 649 | 199 | 329 | 79 | 42 | 789 / 649 | 20003-random-v1 |
| move:EFFECT_SONICBOOM | 67 | 2 | 9 | 5 | 51 | 94 / 67 | 20434-random-v1 |
| move:EFFECT_SPECIAL_ATTACK_DOWN_HIT | 22 | 4 | 5 | 4 | 9 | 51 / 45 | 20158-census |
| move:EFFECT_SPECIAL_ATTACK_UP | 203 | 38 | 89 | 28 | 48 | 476 / 203 | 20016-random-v1 |
| move:EFFECT_SPECIAL_ATTACK_UP_2 | 41 | 8 | 14 | 2 | 17 | 43 / 41 | 20145-ai-v1 |
| move:EFFECT_SPECIAL_DEFENSE_DOWN_2 | 388 | 91 | 172 | 64 | 61 | 469 / 388 | 20019-random-v1 |
| move:EFFECT_SPECIAL_DEFENSE_DOWN_HIT | 723 | 217 | 375 | 93 | 38 | 7711 / 6432 | 20003-random-v1 |
| move:EFFECT_SPECIAL_DEFENSE_UP_2 | 735 | 176 | 308 | 71 | 180 | 1394 / 735 | 20012-random-v1 |
| move:EFFECT_SPEED_DOWN | 22 | 0 | 2 | 0 | 20 | 22 / 22 | 6568-census |
| move:EFFECT_SPEED_DOWN_2 | 1097 | 210 | 385 | 141 | 361 | 1621 / 1097 | 20001-random-v1 |
| move:EFFECT_SPEED_DOWN_HIT | 1785 | 322 | 534 | 225 | 704 | 4623 / 3305 | 20006-random-v1 |
| move:EFFECT_SPEED_UP_2 | 659 | 149 | 250 | 92 | 168 | 1114 / 659 | 20003-random-v1 |
| move:EFFECT_SPIKES | 265 | 22 | 44 | 18 | 181 | 501 / 265 | 20030-random-v1 |
| move:EFFECT_SPITE | 270 | 44 | 55 | 34 | 137 | 485 / 270 | 20042-random-v1 |
| move:EFFECT_SPIT_UP | 20 | 4 | 1 | 3 | 12 | 119 / 20 | 20140-ai-v1 |
| move:EFFECT_SPLASH | 17 | 0 | 2 | 1 | 14 | 17 / 0 | 20189-random-v1 |
| move:EFFECT_STOCKPILE | 262 | 36 | 50 | 32 | 144 | 262 / 262 | 20109-random-v1 |
| move:EFFECT_SUBSTITUTE | 831 | 142 | 586 | 89 | 14 | 831 / 831 | 20004-random-v1 |
| move:EFFECT_SUNNY_DAY | 720 | 220 | 327 | 90 | 83 | 899 / 720 | 20003-random-v1 |
| move:EFFECT_SUPERPOWER | 41 | 10 | 9 | 7 | 15 | 47 / 41 | 20575-ai-v1 |
| move:EFFECT_SUPER_FANG | 38 | 6 | 17 | 0 | 15 | 51 / 38 | 20221-ai-v1 |
| move:EFFECT_SWAGGER | 724 | 129 | 294 | 95 | 206 | 1118 / 724 | 20002-random-v1 |
| move:EFFECT_SWALLOW | 93 | 14 | 39 | 15 | 25 | 244 / 93 | 20109-random-v1 |
| move:EFFECT_SYNTHESIS | 766 | 162 | 343 | 80 | 181 | 766 / 766 | 20003-random-v1 |
| move:EFFECT_TAUNT | 123 | 16 | 45 | 18 | 44 | 155 / 123 | 20010-random-v1 |
| move:EFFECT_TEETER_DANCE | 120 | 36 | 54 | 15 | 15 | 129 / 120 | 20020-random-v1 |
| move:EFFECT_TELEPORT | always fails in a trainer battle: BattleScript_EffectTeleport jumps to BattleScript_ButItFailed on BATTLE_TYPE_TRAINER (battle_scripts_1.s:1929); only Metronome can call it | 0 | 0 | 0 | 0 | 24 / 0 | stage-metro-chansey-17 |
| move:EFFECT_THAW_HIT | 19 | 0 | 5 | 0 | 14 | 194 / 181 | 20148-census |
| move:EFFECT_THIEF | 126 | 11 | 11 | 9 | 95 | 230 / 126 | 20153-census |
| move:EFFECT_THUNDER | 61 | 22 | 29 | 7 | 3 | 670 / 483 | 20009-random-v1 |
| move:EFFECT_TICKLE | 203 | 33 | 31 | 34 | 105 | 299 / 203 | 20050-random-v1 |
| move:EFFECT_TORMENT | 188 | 33 | 66 | 28 | 61 | 376 / 188 | 20010-random-v1 |
| move:EFFECT_TOXIC | 1082 | 225 | 539 | 97 | 221 | 2167 / 1082 | 20004-random-v1 |
| move:EFFECT_TRANSFORM | 14 | 0 | 0 | 0 | 14 | 14 / 14 | stage-metronome-transform |
| move:EFFECT_TRAP | 916 | 127 | 210 | 106 | 473 | 1555 / 916 | 20010-random-v1 |
| move:EFFECT_TRICK | 210 | 60 | 138 | 12 | 0 | 228 / 210 | 20022-random-v1 |
| move:EFFECT_TRIPLE_KICK | 72 | 4 | 9 | 5 | 54 | 93 / 72 | 20033-random-v1 |
| move:EFFECT_TRI_ATTACK | 30 | 9 | 17 | 2 | 2 | 457 / 399 | 20021-random-v1 |
| move:EFFECT_TWINEEDLE | 7 | 1 | 1 | 1 | 4 | 58 / 55 | 20625-ai-v1 |
| move:EFFECT_TWISTER | 4 | 0 | 0 | 0 | 4 | 23 / 23 | 4322-census |
| move:EFFECT_UPROAR | 277 | 7 | 62 | 10 | 198 | 332 / 277 | 20211-ai-v1 |
| move:EFFECT_VITAL_THROW | 10 | 0 | 0 | 0 | 10 | 11 / 10 | stage-metro-chansey-157 |
| move:EFFECT_WATER_SPORT | 19 | 0 | 1 | 0 | 18 | 19 / 19 | 7869-census |
| move:EFFECT_WEATHER_BALL | 18 | 0 | 0 | 0 | 18 | 19 / 18 | stage-metro-chansey-129 |
| move:EFFECT_WILL_O_WISP | 295 | 39 | 105 | 28 | 123 | 462 / 295 | 20208-census |
| move:EFFECT_WISH | 856 | 142 | 293 | 51 | 370 | 1049 / 856 | 20031-random-v1 |
| move:EFFECT_YAWN | 517 | 80 | 321 | 47 | 69 | 956 / 517 | 20034-random-v1 |
| moveid:MOVE_ABSORB | 39 | 6 | 8 | 4 | 21 | 42 / 39 | 20246-ai-v1 |
| moveid:MOVE_ACID | 356 | 50 | 128 | 40 | 138 | 428 / 356 | 20001-random-v1 |
| moveid:MOVE_ACID_ARMOR | 265 | 63 | 118 | 37 | 47 | 589 / 265 | 20206-ai-v1 |
| moveid:MOVE_AERIAL_ACE | 3236 | 839 | 1160 | 388 | 849 | 3385 / 3236 | 20008-random-v1 |
| moveid:MOVE_AEROBLAST | 16 | 0 | 1 | 0 | 15 | 18 / 16 | 8426-census |
| moveid:MOVE_AGILITY | 659 | 149 | 250 | 92 | 168 | 1114 / 659 | 20003-random-v1 |
| moveid:MOVE_AIR_CUTTER | 277 | 73 | 66 | 28 | 110 | 359 / 277 | 20003-random-v1 |
| moveid:MOVE_AMNESIA | 735 | 176 | 308 | 71 | 180 | 1394 / 735 | 20012-random-v1 |
| moveid:MOVE_ANCIENT_POWER | 974 | 290 | 420 | 120 | 144 | 1184 / 974 | 20001-random-v1 |
| moveid:MOVE_ARM_THRUST | 20 | 0 | 1 | 0 | 19 | 20 / 20 | 3775-census |
| moveid:MOVE_AROMATHERAPY | 69 | 7 | 32 | 4 | 26 | 69 / 69 | 20132-ai-v1 |
| moveid:MOVE_ASSIST | 29 | 2 | 1 | 0 | 26 | 29 / 29 | 3784-census |
| moveid:MOVE_ASTONISH | 45 | 15 | 12 | 6 | 12 | 56 / 45 | 20037-random-v1 |
| moveid:MOVE_ATTRACT | 531 | 165 | 242 | 96 | 28 | 2435 / 531 | 20001-random-v1 |
| moveid:MOVE_AURORA_BEAM | 795 | 53 | 79 | 41 | 622 | 1132 / 795 | 20011-random-v1 |
| moveid:MOVE_BARRAGE | 16 | 0 | 1 | 0 | 15 | 21 / 16 | 7820-census |
| moveid:MOVE_BARRIER | 261 | 57 | 110 | 46 | 48 | 548 / 261 | 20012-random-v1 |
| moveid:MOVE_BATON_PASS | 276 | 55 | 114 | 50 | 57 | 704 / 276 | 20013-random-v1 |
| moveid:MOVE_BEAT_UP | 14 | 0 | 1 | 0 | 13 | 14 / 14 | stage-metro-chansey-125 |
| moveid:MOVE_BELLY_DRUM | 50 | 14 | 18 | 3 | 15 | 69 / 50 | 20172-ai-v1 |
| moveid:MOVE_BIDE | 56 | 0 | 3 | 0 | 53 | 56 / 56 | 9801-census |
| moveid:MOVE_BIND | 79 | 9 | 19 | 10 | 41 | 140 / 79 | 20144-random-v1 |
| moveid:MOVE_BITE | 1426 | 286 | 447 | 176 | 517 | 1788 / 1426 | 20001-random-v1 |
| moveid:MOVE_BLAST_BURN | 21 | 0 | 2 | 0 | 19 | 27 / 21 | 4764-census |
| moveid:MOVE_BLAZE_KICK | 45 | 11 | 11 | 0 | 23 | 61 / 45 | 20400-ai-v1 |
| moveid:MOVE_BLIZZARD | 494 | 139 | 277 | 56 | 22 | 766 / 494 | 20029-random-v1 |
| moveid:MOVE_BLOCK | 113 | 26 | 32 | 10 | 45 | 180 / 113 | 20122-ai-v1 |
| moveid:MOVE_BODY_SLAM | 944 | 233 | 524 | 139 | 48 | 1212 / 944 | 20007-random-v1 |
| moveid:MOVE_BONEMERANG | 57 | 22 | 18 | 1 | 16 | 74 / 57 | 20132-ai-v1 |
| moveid:MOVE_BONE_CLUB | 16 | 0 | 1 | 0 | 15 | 24 / 16 | 4666-census |
| moveid:MOVE_BONE_RUSH | 15 | 0 | 1 | 0 | 14 | 25 / 15 | 4742-census |
| moveid:MOVE_BOUNCE | 178 | 57 | 49 | 20 | 52 | 221 / 178 | 20010-random-v1 |
| moveid:MOVE_BRICK_BREAK | 1933 | 435 | 783 | 236 | 479 | 2388 / 1933 | 20002-random-v1 |
| moveid:MOVE_BUBBLE | 11 | 0 | 1 | 0 | 10 | 12 / 11 | 9801-census |
| moveid:MOVE_BUBBLE_BEAM | 1061 | 165 | 193 | 98 | 605 | 1394 / 1061 | 20011-random-v1 |
| moveid:MOVE_BULK_UP | 198 | 56 | 76 | 30 | 36 | 217 / 198 | 20102-ai-v1 |
| moveid:MOVE_BULLET_SEED | 19 | 0 | 4 | 0 | 15 | 19 / 19 | 265-census |
| moveid:MOVE_CALM_MIND | 718 | 242 | 350 | 97 | 29 | 1006 / 718 | 20005-random-v1 |
| moveid:MOVE_CAMOUFLAGE | 2 | 0 | 0 | 0 | 2 | 24 / 2 | stage-metronome-camouflage |
| moveid:MOVE_CHARGE | 20 | 0 | 1 | 0 | 19 | 20 / 20 | 4412-census |
| moveid:MOVE_CHARM | 462 | 66 | 202 | 64 | 130 | 800 / 462 | 20010-random-v1 |
| moveid:MOVE_CLAMP | 18 | 2 | 0 | 0 | 16 | 21 / 18 | 20385-ai-v1 |
| moveid:MOVE_COMET_PUNCH | 51 | 22 | 10 | 5 | 14 | 56 / 51 | 20046-random-v1 |
| moveid:MOVE_CONFUSE_RAY | 2833 | 535 | 1275 | 377 | 646 | 3293 / 2833 | 20002-random-v1 |
| moveid:MOVE_CONFUSION | 806 | 228 | 195 | 75 | 308 | 1033 / 806 | 20006-random-v1 |
| moveid:MOVE_CONSTRICT | 35 | 0 | 1 | 0 | 34 | 38 / 35 | 3784-census |
| moveid:MOVE_CONVERSION | 6 | 0 | 0 | 0 | 6 | 28 / 6 | stage-metro-clefable-20 |
| moveid:MOVE_CONVERSION_2 | 7 | 0 | 0 | 0 | 7 | 21 / 7 | stage-metro-chansey-185 |
| moveid:MOVE_COSMIC_POWER | 396 | 107 | 165 | 54 | 70 | 560 / 396 | 20007-random-v1 |
| moveid:MOVE_COTTON_SPORE | 212 | 53 | 80 | 20 | 59 | 312 / 212 | 20108-census |
| moveid:MOVE_COUNTER | 487 | 123 | 206 | 58 | 100 | 2345 / 487 | 20012-random-v1 |
| moveid:MOVE_COVET | 126 | 11 | 11 | 9 | 95 | 230 / 126 | 20153-census |
| moveid:MOVE_CRABHAMMER | 128 | 22 | 20 | 10 | 76 | 173 / 128 | 20028-random-v1 |
| moveid:MOVE_CROSS_CHOP | 536 | 202 | 234 | 63 | 37 | 754 / 536 | 20102-ai-v1 |
| moveid:MOVE_CRUNCH | 860 | 251 | 429 | 148 | 32 | 977 / 860 | 20007-random-v1 |
| moveid:MOVE_CRUSH_CLAW | 351 | 97 | 174 | 56 | 24 | 449 / 351 | 20016-random-v1 |
| moveid:MOVE_CURSE | 1337 | 485 | 673 | 158 | 21 | 1560 / 1337 | 20004-random-v1 |
| moveid:MOVE_CUT | 23 | 0 | 0 | 0 | 23 | 26 / 23 | stage-metro-chansey-0 |
| moveid:MOVE_DEFENSE_CURL | 4799 | 136 | 168 | 72 | 4423 | 15602 / 4799 | 20011-random-v1 |
| moveid:MOVE_DESTINY_BOND | 195 | 36 | 137 | 22 | 0 | 195 / 195 | 20020-random-v1 |
| moveid:MOVE_DETECT | 254 | 58 | 96 | 27 | 73 | 301 / 254 | 20114-random-v1 |
| moveid:MOVE_DIG | 1298 | 293 | 478 | 126 | 401 | 1860 / 1298 | 20002-random-v1 |
| moveid:MOVE_DISABLE | 205 | 32 | 93 | 17 | 63 | 654 / 205 | 20011-random-v1 |
| moveid:MOVE_DIVE | 378 | 120 | 156 | 50 | 52 | 437 / 378 | 20015-random-v1 |
| moveid:MOVE_DIZZY_PUNCH | 111 | 37 | 36 | 7 | 31 | 128 / 111 | 20144-random-v1 |
| moveid:MOVE_DOOM_DESIRE | 17 | 0 | 1 | 0 | 16 | 18 / 17 | 7869-census |
| moveid:MOVE_DOUBLE_EDGE | 1570 | 576 | 744 | 214 | 36 | 1862 / 1570 | 20004-random-v1 |
| moveid:MOVE_DOUBLE_KICK | 319 | 68 | 123 | 62 | 66 | 416 / 319 | 20037-random-v1 |
| moveid:MOVE_DOUBLE_SLAP | 33 | 4 | 19 | 0 | 10 | 42 / 33 | 20776-ai-v1 |
| moveid:MOVE_DOUBLE_TEAM | 4770 | 1403 | 2446 | 485 | 436 | 7325 / 4770 | 20004-random-v1 |
| moveid:MOVE_DRAGON_BREATH | 666 | 176 | 226 | 99 | 165 | 765 / 666 | 20015-random-v1 |
| moveid:MOVE_DRAGON_CLAW | 425 | 172 | 131 | 62 | 60 | 468 / 425 | 20018-random-v1 |
| moveid:MOVE_DRAGON_DANCE | 664 | 210 | 329 | 78 | 47 | 706 / 664 | 20008-random-v1 |
| moveid:MOVE_DRAGON_RAGE | 34 | 11 | 7 | 3 | 13 | 39 / 34 | 20136-ai-v1 |
| moveid:MOVE_DREAM_EATER | 345 | 102 | 176 | 50 | 17 | 645 / 345 | 20110-ai-v1 |
| moveid:MOVE_DRILL_PECK | 540 | 233 | 199 | 53 | 55 | 627 / 540 | 20014-random-v1 |
| moveid:MOVE_DYNAMIC_PUNCH | 88 | 38 | 28 | 15 | 7 | 192 / 88 | 20031-random-v1 |
| moveid:MOVE_EARTHQUAKE | 4430 | 1621 | 2062 | 641 | 106 | 5452 / 4430 | 20007-random-v1 |
| moveid:MOVE_EGG_BOMB | 15 | 0 | 1 | 0 | 14 | 19 / 15 | 6310-census |
| moveid:MOVE_EMBER | 825 | 105 | 112 | 51 | 557 | 1093 / 825 | 20001-random-v1 |
| moveid:MOVE_ENCORE | 255 | 23 | 156 | 15 | 61 | 393 / 255 | 20011-random-v1 |
| moveid:MOVE_ENDEAVOR | 145 | 23 | 37 | 29 | 56 | 355 / 145 | 20002-random-v1 |
| moveid:MOVE_ENDURE | 669 | 129 | 393 | 91 | 56 | 752 / 669 | 20014-random-v1 |
| moveid:MOVE_ERUPTION | 35 | 6 | 9 | 2 | 18 | 36 / 35 | 20252-ai-v1 |
| moveid:MOVE_EXPLOSION | 242 | 69 | 115 | 38 | 20 | 270 / 242 | 20014-random-v1 |
| moveid:MOVE_EXTRASENSORY | 165 | 28 | 18 | 16 | 103 | 194 / 165 | 20344-random-v1 |
| moveid:MOVE_EXTREME_SPEED | 74 | 14 | 33 | 11 | 16 | 79 / 74 | 20266-ai-v1 |
| moveid:MOVE_FACADE | 849 | 190 | 290 | 133 | 236 | 1056 / 849 | 20002-random-v1 |
| moveid:MOVE_FAINT_ATTACK | 1880 | 414 | 607 | 208 | 651 | 1934 / 1880 | 20010-random-v1 |
| moveid:MOVE_FAKE_OUT | 241 | 118 | 59 | 35 | 29 | 800 / 241 | 20039-random-v1 |
| moveid:MOVE_FAKE_TEARS | 310 | 75 | 138 | 49 | 48 | 364 / 310 | 20019-random-v1 |
| moveid:MOVE_FALSE_SWIPE | 23 | 0 | 1 | 0 | 22 | 24 / 23 | 3832-census |
| moveid:MOVE_FEATHER_DANCE | 138 | 21 | 38 | 10 | 69 | 216 / 138 | 20109-random-v1 |
| moveid:MOVE_FIRE_BLAST | 649 | 203 | 334 | 100 | 12 | 849 / 649 | 20022-random-v1 |
| moveid:MOVE_FIRE_PUNCH | 474 | 142 | 179 | 109 | 44 | 553 / 474 | 20023-random-v1 |
| moveid:MOVE_FIRE_SPIN | 264 | 28 | 61 | 23 | 152 | 459 / 264 | 20010-random-v1 |
| moveid:MOVE_FISSURE | 78 | 29 | 43 | 4 | 2 | 363 / 78 | 20138-census |
| moveid:MOVE_FLAIL | 294 | 55 | 182 | 41 | 16 | 351 / 294 | 20010-random-v1 |
| moveid:MOVE_FLAMETHROWER | 873 | 285 | 400 | 129 | 59 | 997 / 873 | 20013-random-v1 |
| moveid:MOVE_FLAME_WHEEL | 166 | 47 | 45 | 19 | 55 | 178 / 166 | 20148-census |
| moveid:MOVE_FLASH | 240 | 20 | 98 | 13 | 109 | 618 / 240 | 20135-ai-v1 |
| moveid:MOVE_FLATTER | 99 | 30 | 33 | 21 | 15 | 116 / 99 | 20037-random-v1 |
| moveid:MOVE_FLY | 459 | 102 | 171 | 51 | 135 | 583 / 459 | 20010-random-v1 |
| moveid:MOVE_FOCUS_ENERGY | 90 | 17 | 17 | 8 | 48 | 220 / 90 | 20104-random-v1 |
| moveid:MOVE_FOCUS_PUNCH | 284 | 97 | 149 | 38 | 0 | 423 / 284 | 20044-random-v1 |
| moveid:MOVE_FOLLOW_ME | 1393 | 109 | 537 | 73 | 674 | 1393 / 1393 | 20024-random-v1 |
| moveid:MOVE_FORESIGHT | 185 | 21 | 83 | 20 | 61 | 200 / 185 | 20126-ai-v1 |
| moveid:MOVE_FRENZY_PLANT | 24 | 0 | 0 | 0 | 24 | 25 / 24 | stage-metro-chansey-111 |
| moveid:MOVE_FRUSTRATION | 892 | 250 | 495 | 109 | 38 | 1106 / 892 | 20047-random-v1 |
| moveid:MOVE_FURY_ATTACK | 5 | 0 | 0 | 0 | 5 | 8 / 5 | stage-metro-clefable-20 |
| moveid:MOVE_FURY_CUTTER | 414 | 34 | 119 | 53 | 208 | 548 / 414 | 20028-random-v1 |
| moveid:MOVE_FURY_SWIPES | 95 | 11 | 38 | 15 | 31 | 156 / 95 | 20144-random-v1 |
| moveid:MOVE_FUTURE_SIGHT | 497 | 114 | 125 | 47 | 211 | 617 / 497 | 20033-random-v1 |
| moveid:MOVE_GIGA_DRAIN | 1814 | 446 | 1069 | 224 | 75 | 2047 / 1814 | 20003-random-v1 |
| moveid:MOVE_GLARE | 618 | 33 | 42 | 16 | 527 | 1025 / 618 | 20002-random-v1 |
| moveid:MOVE_GRASS_WHISTLE | 412 | 53 | 269 | 35 | 55 | 996 / 412 | 20004-random-v1 |
| moveid:MOVE_GROWL | 20 | 0 | 1 | 1 | 18 | 21 / 20 | 20774-random-v1 |
| moveid:MOVE_GROWTH | 203 | 38 | 89 | 28 | 48 | 476 / 203 | 20016-random-v1 |
| moveid:MOVE_GRUDGE | 255 | 56 | 87 | 34 | 78 | 255 / 255 | 20028-random-v1 |
| moveid:MOVE_GUILLOTINE | 53 | 20 | 22 | 7 | 4 | 197 / 53 | 20105-ai-v1 |
| moveid:MOVE_GUST | 15 | 0 | 1 | 0 | 14 | 16 / 15 | 4764-census |
| moveid:MOVE_HAIL | 448 | 93 | 203 | 42 | 110 | 716 / 448 | 20006-random-v1 |
| moveid:MOVE_HARDEN | 154 | 21 | 52 | 2 | 79 | 245 / 154 | 20296-ai-v1 |
| moveid:MOVE_HAZE | 55 | 5 | 25 | 5 | 20 | 55 / 55 | 20273-census |
| moveid:MOVE_HEADBUTT | 637 | 70 | 97 | 83 | 387 | 999 / 637 | 20012-random-v1 |
| moveid:MOVE_HEAL_BELL | 271 | 39 | 71 | 36 | 125 | 271 / 271 | 20007-random-v1 |
| moveid:MOVE_HEAT_WAVE | 47 | 9 | 21 | 5 | 12 | 51 / 47 | 20436-ai-v1 |
| moveid:MOVE_HELPING_HAND | always fails in singles: Cmd_trysethelpinghand needs BATTLE_TYPE_DOUBLE (battle_script_commands.c:9170-9186) | 0 | 0 | 0 | 0 | 835 / 0 | 20002-random-v1 |
| moveid:MOVE_HIDDEN_POWER | 18 | 0 | 0 | 0 | 18 | 19 / 18 | stage-metro-chansey-144 |
| moveid:MOVE_HI_JUMP_KICK | 61 | 20 | 19 | 6 | 16 | 69 / 61 | 20150-ai-v1 |
| moveid:MOVE_HORN_ATTACK | 20 | 1 | 2 | 0 | 17 | 20 / 20 | 20385-ai-v1 |
| moveid:MOVE_HORN_DRILL | 83 | 25 | 34 | 17 | 7 | 324 / 83 | 20116-ai-v1-gold |
| moveid:MOVE_HOWL | 39 | 4 | 9 | 8 | 18 | 39 / 39 | 20389-random-v1 |
| moveid:MOVE_HYDRO_CANNON | 33 | 0 | 0 | 2 | 31 | 34 / 33 | 20189-random-v1 |
| moveid:MOVE_HYDRO_PUMP | 781 | 279 | 353 | 82 | 67 | 1122 / 781 | 20007-random-v1 |
| moveid:MOVE_HYPER_BEAM | 72 | 10 | 30 | 6 | 26 | 85 / 72 | 20213-census |
| moveid:MOVE_HYPER_FANG | 48 | 9 | 23 | 2 | 14 | 55 / 48 | 20154-random-v1 |
| moveid:MOVE_HYPER_VOICE | 73 | 16 | 25 | 7 | 25 | 90 / 73 | 20235-ai-v1 |
| moveid:MOVE_HYPNOSIS | 512 | 105 | 261 | 69 | 77 | 996 / 512 | 20015-random-v1 |
| moveid:MOVE_ICE_BALL | 674 | 83 | 209 | 69 | 313 | 785 / 674 | 20006-random-v1 |
| moveid:MOVE_ICE_BEAM | 2094 | 605 | 1102 | 311 | 76 | 2338 / 2094 | 20007-random-v1 |
| moveid:MOVE_ICE_PUNCH | 524 | 175 | 201 | 97 | 51 | 626 / 524 | 20009-random-v1 |
| moveid:MOVE_ICICLE_SPEAR | 13 | 1 | 0 | 0 | 12 | 14 / 13 | 20296-ai-v1 |
| moveid:MOVE_ICY_WIND | 1228 | 208 | 383 | 138 | 499 | 1737 / 1228 | 20006-random-v1 |
| moveid:MOVE_IMPRISON | 9 | 0 | 0 | 0 | 9 | 20 / 9 | stage-imprison |
| moveid:MOVE_INGRAIN | 110 | 31 | 46 | 9 | 24 | 397 / 110 | 20027-random-v1 |
| moveid:MOVE_IRON_DEFENSE | 212 | 50 | 60 | 25 | 77 | 328 / 212 | 20041-random-v1 |
| moveid:MOVE_IRON_TAIL | 313 | 64 | 177 | 51 | 21 | 435 / 313 | 20009-random-v1 |
| moveid:MOVE_JUMP_KICK | 22 | 0 | 0 | 0 | 22 | 27 / 22 | stage-metronome-twister-flinch |
| moveid:MOVE_KARATE_CHOP | 117 | 11 | 14 | 10 | 82 | 151 / 117 | 20011-random-v1 |
| moveid:MOVE_KINESIS | 10 | 0 | 0 | 0 | 10 | 14 / 10 | stage-metro-chansey-152 |
| moveid:MOVE_KNOCK_OFF | 605 | 66 | 145 | 43 | 351 | 811 / 605 | 20010-random-v1 |
| moveid:MOVE_LEAF_BLADE | 260 | 91 | 100 | 46 | 23 | 316 / 260 | 20048-random-v1 |
| moveid:MOVE_LEECH_LIFE | 21 | 0 | 0 | 0 | 21 | 26 / 21 | stage-metro-chansey-181 |
| moveid:MOVE_LEECH_SEED | 374 | 89 | 203 | 39 | 43 | 1147 / 374 | 20004-random-v1 |
| moveid:MOVE_LEER | 98 | 3 | 16 | 7 | 72 | 129 / 98 | 20015-random-v1 |
| moveid:MOVE_LICK | 93 | 23 | 27 | 7 | 36 | 200 / 93 | 20148-census |
| moveid:MOVE_LIGHT_SCREEN | 1042 | 179 | 440 | 111 | 312 | 1843 / 1042 | 20003-random-v1 |
| moveid:MOVE_LOCK_ON | 15 | 0 | 1 | 0 | 14 | 17 / 15 | 577-census |
| moveid:MOVE_LOVELY_KISS | 190 | 59 | 79 | 26 | 26 | 251 / 190 | 20039-random-v1 |
| moveid:MOVE_LOW_KICK | 187 | 43 | 52 | 13 | 79 | 212 / 187 | 20126-ai-v1 |
| moveid:MOVE_LUSTER_PURGE | 18 | 2 | 4 | 1 | 11 | 18 / 18 | 265-census |
| moveid:MOVE_MACH_PUNCH | 310 | 40 | 72 | 40 | 158 | 357 / 310 | 20015-random-v1 |
| moveid:MOVE_MAGICAL_LEAF | 719 | 134 | 260 | 52 | 273 | 750 / 719 | 20024-random-v1 |
| moveid:MOVE_MAGIC_COAT | 459 | 34 | 41 | 27 | 357 | 474 / 459 | 20033-random-v1 |
| moveid:MOVE_MAGNITUDE | 369 | 19 | 34 | 4 | 312 | 598 / 369 | 20153-census |
| moveid:MOVE_MEAN_LOOK | 121 | 26 | 63 | 14 | 18 | 142 / 121 | 20151-ai-v1 |
| moveid:MOVE_MEDITATE | 15 | 0 | 0 | 0 | 15 | 15 / 15 | stage-metro-chansey-158 |
| moveid:MOVE_MEGAHORN | 251 | 75 | 126 | 33 | 17 | 323 / 251 | 20110-ai-v1 |
| moveid:MOVE_MEGA_DRAIN | 232 | 90 | 58 | 32 | 52 | 258 / 232 | 20001-random-v1 |
| moveid:MOVE_MEGA_KICK | 757 | 264 | 381 | 89 | 23 | 1079 / 757 | 20014-random-v1 |
| moveid:MOVE_MEGA_PUNCH | 46 | 14 | 4 | 6 | 22 | 65 / 46 | 20024-random-v1 |
| moveid:MOVE_MEMENTO | 27 | 3 | 9 | 1 | 14 | 29 / 27 | 20240-ai-v1 |
| moveid:MOVE_METAL_CLAW | 597 | 128 | 126 | 54 | 289 | 844 / 597 | 20006-random-v1 |
| moveid:MOVE_METAL_SOUND | 78 | 16 | 34 | 15 | 13 | 105 / 78 | 20283-census |
| moveid:MOVE_METEOR_MASH | 322 | 97 | 143 | 62 | 20 | 445 / 322 | 20043-random-v1 |
| moveid:MOVE_METRONOME | 6624 | 56 | 293 | 19 | 6256 | 6624 / 6624 | 20024-random-v1 |
| moveid:MOVE_MILK_DRINK | 138 | 22 | 47 | 19 | 50 | 138 / 138 | 20012-random-v1 |
| moveid:MOVE_MIND_READER | 24 | 0 | 1 | 0 | 23 | 25 / 24 | 22453-census-c7 |
| moveid:MOVE_MINIMIZE | 3255 | 67 | 135 | 47 | 3006 | 6732 / 3255 | 20158-census |
| moveid:MOVE_MIRROR_COAT | 164 | 60 | 67 | 21 | 16 | 1250 / 164 | 20012-random-v1 |
| moveid:MOVE_MIRROR_MOVE | 10 | 2 | 0 | 0 | 8 | 19 / 10 | 20296-ai-v1 |
| moveid:MOVE_MIST | 15 | 0 | 0 | 0 | 15 | 15 / 15 | stage-metronome-lock-on |
| moveid:MOVE_MIST_BALL | 45 | 10 | 14 | 9 | 12 | 51 / 45 | 20158-census |
| moveid:MOVE_MOONLIGHT | 147 | 26 | 59 | 18 | 44 | 147 / 147 | 20001-random-v1 |
| moveid:MOVE_MORNING_SUN | 12 | 1 | 2 | 0 | 9 | 12 / 12 | 20296-ai-v1 |
| moveid:MOVE_MUDDY_WATER | 44 | 7 | 25 | 0 | 12 | 59 / 44 | 20296-ai-v1 |
| moveid:MOVE_MUD_SHOT | 218 | 53 | 47 | 15 | 103 | 318 / 218 | 20108-census |
| moveid:MOVE_MUD_SLAP | 603 | 94 | 239 | 57 | 213 | 847 / 603 | 20042-random-v1 |
| moveid:MOVE_MUD_SPORT | 15 | 0 | 0 | 0 | 15 | 15 / 15 | stage-metro-chansey-18 |
| moveid:MOVE_NATURE_POWER | 23 | 0 | 0 | 0 | 23 | 23 / 23 | stage-metro-chansey-147 |
| moveid:MOVE_NEEDLE_ARM | 109 | 32 | 17 | 12 | 48 | 118 / 109 | 20024-random-v1 |
| moveid:MOVE_NIGHTMARE | 55 | 13 | 41 | 1 | 0 | 103 / 55 | 20106-ai-v1 |
| moveid:MOVE_NIGHT_SHADE | 180 | 34 | 42 | 17 | 87 | 319 / 180 | 20122-ai-v1 |
| moveid:MOVE_OCTAZOOKA | 168 | 25 | 48 | 7 | 88 | 273 / 168 | 20140-ai-v1 |
| moveid:MOVE_ODOR_SLEUTH | 16 | 0 | 1 | 0 | 15 | 17 / 16 | 6412-census |
| moveid:MOVE_OUTRAGE | 48 | 0 | 6 | 0 | 42 | 49 / 48 | 577-census |
| moveid:MOVE_OVERHEAT | 551 | 187 | 274 | 78 | 12 | 686 / 551 | 20007-random-v1 |
| moveid:MOVE_PAIN_SPLIT | 178 | 24 | 51 | 43 | 60 | 178 / 178 | 20128-census |
| moveid:MOVE_PAY_DAY | 14 | 0 | 1 | 0 | 13 | 15 / 14 | 4322-census |
| moveid:MOVE_PECK | 16 | 0 | 1 | 0 | 15 | 16 / 16 | 1618-census |
| moveid:MOVE_PERISH_SONG | 160 | 41 | 84 | 11 | 24 | 175 / 160 | 20102-ai-v1 |
| moveid:MOVE_PETAL_DANCE | 1092 | 186 | 230 | 111 | 565 | 1273 / 1092 | 20019-random-v1 |
| moveid:MOVE_PIN_MISSILE | 243 | 4 | 24 | 10 | 205 | 415 / 243 | 20452-ai-v1 |
| moveid:MOVE_POISON_FANG | 166 | 16 | 44 | 18 | 88 | 207 / 166 | 20002-random-v1 |
| moveid:MOVE_POISON_GAS | 9 | 0 | 0 | 0 | 9 | 19 / 9 | stage-metro-chansey-189 |
| moveid:MOVE_POISON_POWDER | 11 | 0 | 0 | 0 | 11 | 19 / 11 | stage-metro-chansey-17 |
| moveid:MOVE_POISON_STING | 16 | 0 | 0 | 0 | 16 | 17 / 16 | stage-metro-chansey-78 |
| moveid:MOVE_POISON_TAIL | 112 | 16 | 14 | 2 | 80 | 138 / 112 | 20189-random-v1 |
| moveid:MOVE_POUND | 22 | 1 | 1 | 0 | 20 | 24 / 22 | 20251-ai-v1 |
| moveid:MOVE_POWDER_SNOW | 18 | 0 | 1 | 0 | 17 | 20 / 18 | 6491-census |
| moveid:MOVE_PRESENT | 49 | 12 | 8 | 6 | 23 | 59 / 49 | 20518-census |
| moveid:MOVE_PROTECT | 2800 | 766 | 1132 | 262 | 640 | 3284 / 2800 | 20001-random-v1 |
| moveid:MOVE_PSYBEAM | 2301 | 207 | 292 | 108 | 1694 | 3303 / 2301 | 20033-random-v1 |
| moveid:MOVE_PSYCHIC | 3283 | 1223 | 1583 | 406 | 71 | 3794 / 3283 | 20005-random-v1 |
| moveid:MOVE_PSYCHO_BOOST | 19 | 0 | 1 | 0 | 18 | 22 / 19 | 3775-census |
| moveid:MOVE_PSYCH_UP | 506 | 78 | 269 | 96 | 63 | 506 / 506 | 20162-ai-v1 |
| moveid:MOVE_PSYWAVE | 127 | 29 | 31 | 4 | 63 | 193 / 127 | 20238-census |
| moveid:MOVE_PURSUIT | 258 | 47 | 63 | 35 | 113 | 337 / 258 | 20006-random-v1 |
| moveid:MOVE_QUICK_ATTACK | 1407 | 315 | 342 | 153 | 597 | 1808 / 1407 | 20002-random-v1 |
| moveid:MOVE_RAGE | 25 | 0 | 0 | 0 | 25 | 25 / 25 | stage-rage-builds |
| moveid:MOVE_RAIN_DANCE | 992 | 312 | 423 | 117 | 140 | 1264 / 992 | 20007-random-v1 |
| moveid:MOVE_RAPID_SPIN | 36 | 3 | 9 | 3 | 21 | 46 / 36 | 20145-ai-v1 |
| moveid:MOVE_RAZOR_LEAF | 296 | 74 | 83 | 42 | 97 | 369 / 296 | 20015-random-v1 |
| moveid:MOVE_RAZOR_WIND | 99 | 12 | 22 | 4 | 61 | 132 / 99 | 20033-random-v1 |
| moveid:MOVE_RECOVER | 1311 | 225 | 834 | 148 | 104 | 1311 / 1311 | 20012-random-v1 |
| moveid:MOVE_RECYCLE | 78 | 11 | 18 | 7 | 42 | 353 / 78 | 20273-census |
| moveid:MOVE_REFLECT | 738 | 73 | 339 | 37 | 289 | 1262 / 738 | 20031-random-v1 |
| moveid:MOVE_REFRESH | 221 | 4 | 11 | 0 | 206 | 6302 / 221 | 20158-census |
| moveid:MOVE_REST | 3461 | 633 | 2301 | 329 | 198 | 3461 / 3461 | 20012-random-v1 |
| moveid:MOVE_RETURN | 11 | 0 | 0 | 0 | 11 | 12 / 11 | stage-metro-chansey-119 |
| moveid:MOVE_REVENGE | 88 | 19 | 24 | 6 | 39 | 102 / 88 | 20118-census |
| moveid:MOVE_REVERSAL | 217 | 61 | 123 | 21 | 12 | 277 / 217 | 20008-random-v1 |
| moveid:MOVE_ROAR | 561 | 94 | 274 | 105 | 88 | 804 / 561 | 20021-random-v1 |
| moveid:MOVE_ROCK_BLAST | 115 | 11 | 13 | 13 | 78 | 190 / 115 | 20149-random-v1 |
| moveid:MOVE_ROCK_SLIDE | 2017 | 608 | 860 | 332 | 217 | 2598 / 2017 | 20007-random-v1 |
| moveid:MOVE_ROCK_SMASH | 16 | 0 | 0 | 0 | 16 | 20 / 16 | stage-metro-chansey-150 |
| moveid:MOVE_ROCK_THROW | 291 | 6 | 20 | 5 | 260 | 482 / 291 | 20296-ai-v1 |
| moveid:MOVE_ROCK_TOMB | 752 | 185 | 276 | 108 | 183 | 1124 / 752 | 20036-random-v1 |
| moveid:MOVE_ROLE_PLAY | 139 | 12 | 40 | 19 | 68 | 143 / 139 | 20157-ai-v1 |
| moveid:MOVE_ROLLING_KICK | 77 | 6 | 11 | 4 | 56 | 107 / 77 | 20149-random-v1 |
| moveid:MOVE_ROLLOUT | 2157 | 158 | 265 | 223 | 1511 | 2900 / 2157 | 20001-random-v1 |
| moveid:MOVE_SACRED_FIRE | 15 | 0 | 2 | 0 | 13 | 16 / 15 | 8176-census |
| moveid:MOVE_SAFEGUARD | 553 | 77 | 128 | 41 | 307 | 940 / 553 | 20015-random-v1 |
| moveid:MOVE_SANDSTORM | 726 | 166 | 264 | 94 | 202 | 1060 / 726 | 20020-random-v1 |
| moveid:MOVE_SAND_ATTACK | 504 | 101 | 181 | 69 | 153 | 625 / 504 | 20001-random-v1 |
| moveid:MOVE_SAND_TOMB | 27 | 4 | 6 | 5 | 12 | 41 / 27 | 20168-census |
| moveid:MOVE_SCARY_FACE | 885 | 157 | 305 | 121 | 302 | 1309 / 885 | 20001-random-v1 |
| moveid:MOVE_SCRATCH | 17 | 0 | 4 | 0 | 13 | 21 / 17 | 4412-census |
| moveid:MOVE_SCREECH | 396 | 82 | 142 | 50 | 122 | 672 / 396 | 20011-random-v1 |
| moveid:MOVE_SECRET_POWER | 698 | 121 | 152 | 40 | 385 | 1029 / 698 | 20019-random-v1 |
| moveid:MOVE_SEISMIC_TOSS | 748 | 206 | 236 | 97 | 209 | 957 / 748 | 20030-random-v1 |
| moveid:MOVE_SELF_DESTRUCT | 25 | 1 | 7 | 1 | 16 | 29 / 25 | 20194-random-v1 |
| moveid:MOVE_SHADOW_BALL | 2271 | 647 | 1250 | 308 | 66 | 2922 / 2271 | 20003-random-v1 |
| moveid:MOVE_SHADOW_PUNCH | 210 | 46 | 55 | 21 | 88 | 407 / 210 | 20028-random-v1 |
| moveid:MOVE_SHARPEN | 20 | 0 | 0 | 0 | 20 | 21 / 20 | stage-metro-chansey-114 |
| moveid:MOVE_SHEER_COLD | 63 | 23 | 27 | 9 | 4 | 235 / 63 | 20009-random-v1 |
| moveid:MOVE_SHOCK_WAVE | 338 | 79 | 79 | 29 | 151 | 374 / 338 | 20006-random-v1 |
| moveid:MOVE_SIGNAL_BEAM | 196 | 66 | 87 | 25 | 18 | 216 / 196 | 20264-random-v1 |
| moveid:MOVE_SILVER_WIND | 852 | 190 | 310 | 108 | 244 | 952 / 852 | 20001-random-v1 |
| moveid:MOVE_SING | 564 | 135 | 264 | 38 | 127 | 1135 / 564 | 20038-random-v1 |
| moveid:MOVE_SKILL_SWAP | 318 | 23 | 89 | 24 | 182 | 326 / 318 | 20178-census |
| moveid:MOVE_SKULL_BASH | 15 | 0 | 0 | 0 | 15 | 17 / 15 | stage-metro-chansey-1 |
| moveid:MOVE_SKY_ATTACK | 29 | 6 | 4 | 0 | 19 | 33 / 29 | 20228-census |
| moveid:MOVE_SKY_UPPERCUT | 186 | 33 | 43 | 19 | 91 | 250 / 186 | 20015-random-v1 |
| moveid:MOVE_SLACK_OFF | 16 | 0 | 0 | 0 | 16 | 16 / 16 | stage-metro-chansey-119 |
| moveid:MOVE_SLAM | 244 | 57 | 61 | 31 | 95 | 451 / 244 | 20002-random-v1 |
| moveid:MOVE_SLASH | 1140 | 316 | 320 | 78 | 426 | 1603 / 1140 | 20001-random-v1 |
| moveid:MOVE_SLEEP_POWDER | 902 | 129 | 507 | 90 | 176 | 1361 / 902 | 20003-random-v1 |
| moveid:MOVE_SLEEP_TALK | 168 | 67 | 60 | 30 | 11 | 401 / 168 | 20110-ai-v1 |
| moveid:MOVE_SLUDGE | 209 | 57 | 75 | 29 | 48 | 252 / 209 | 20126-ai-v1 |
| moveid:MOVE_SLUDGE_BOMB | 1369 | 416 | 672 | 187 | 94 | 1684 / 1369 | 20013-random-v1 |
| moveid:MOVE_SMELLING_SALT | 42 | 8 | 18 | 1 | 15 | 47 / 42 | 20168-census |
| moveid:MOVE_SMOG | 38 | 9 | 18 | 3 | 8 | 57 / 38 | 20139-random-v1 |
| moveid:MOVE_SMOKESCREEN | 525 | 102 | 214 | 60 | 149 | 790 / 525 | 20008-random-v1 |
| moveid:MOVE_SNORE | 41 | 15 | 10 | 8 | 8 | 296 / 41 | 20380-ai-v1 |
| moveid:MOVE_SOFT_BOILED | 606 | 135 | 330 | 81 | 60 | 606 / 606 | 20022-random-v1 |
| moveid:MOVE_SOLAR_BEAM | 649 | 199 | 329 | 79 | 42 | 789 / 649 | 20003-random-v1 |
| moveid:MOVE_SONIC_BOOM | 67 | 2 | 9 | 5 | 51 | 94 / 67 | 20434-random-v1 |
| moveid:MOVE_SPARK | 452 | 133 | 152 | 60 | 107 | 589 / 452 | 20028-random-v1 |
| moveid:MOVE_SPIDER_WEB | 43 | 11 | 11 | 3 | 18 | 54 / 43 | 20050-random-v1 |
| moveid:MOVE_SPIKES | 265 | 22 | 44 | 18 | 181 | 501 / 265 | 20030-random-v1 |
| moveid:MOVE_SPIKE_CANNON | 273 | 30 | 54 | 34 | 155 | 363 / 273 | 20011-random-v1 |
| moveid:MOVE_SPITE | 270 | 44 | 55 | 34 | 137 | 485 / 270 | 20042-random-v1 |
| moveid:MOVE_SPIT_UP | 20 | 4 | 1 | 3 | 12 | 119 / 20 | 20140-ai-v1 |
| moveid:MOVE_SPLASH | 0 | 0 | 0 | 0 | 0 | 17 / 0 | 20189-random-v1 |
| moveid:MOVE_SPORE | 311 | 34 | 217 | 41 | 19 | 333 / 311 | 20038-random-v1 |
| moveid:MOVE_STEEL_WING | 358 | 87 | 133 | 38 | 100 | 443 / 358 | 20003-random-v1 |
| moveid:MOVE_STOCKPILE | 262 | 36 | 50 | 32 | 144 | 262 / 262 | 20109-random-v1 |
| moveid:MOVE_STOMP | 249 | 31 | 32 | 28 | 158 | 279 / 249 | 20295-ai-v1 |
| moveid:MOVE_STRENGTH | 25 | 0 | 0 | 0 | 25 | 27 / 25 | stage-metro-chansey-116 |
| moveid:MOVE_STRING_SHOT | 22 | 0 | 2 | 0 | 20 | 22 / 22 | 6568-census |
| moveid:MOVE_STRUGGLE | 12876 | 720 | 8195 | 337 | 3624 | 20306 / 12876 | 20022-random-v1 |
| moveid:MOVE_STUN_SPORE | 929 | 72 | 360 | 43 | 454 | 1416 / 929 | 20001-random-v1 |
| moveid:MOVE_SUBMISSION | 130 | 29 | 11 | 5 | 85 | 210 / 130 | 20113-census |
| moveid:MOVE_SUBSTITUTE | 831 | 142 | 586 | 89 | 14 | 831 / 831 | 20004-random-v1 |
| moveid:MOVE_SUNNY_DAY | 720 | 220 | 327 | 90 | 83 | 899 / 720 | 20003-random-v1 |
| moveid:MOVE_SUPERPOWER | 41 | 10 | 9 | 7 | 15 | 47 / 41 | 20575-ai-v1 |
| moveid:MOVE_SUPERSONIC | 209 | 13 | 49 | 17 | 130 | 445 / 209 | 20011-random-v1 |
| moveid:MOVE_SUPER_FANG | 38 | 6 | 17 | 0 | 15 | 51 / 38 | 20221-ai-v1 |
| moveid:MOVE_SURF | 3329 | 1141 | 1568 | 530 | 90 | 3834 / 3329 | 20004-random-v1 |
| moveid:MOVE_SWAGGER | 724 | 129 | 294 | 95 | 206 | 1118 / 724 | 20002-random-v1 |
| moveid:MOVE_SWALLOW | 93 | 14 | 39 | 15 | 25 | 244 / 93 | 20109-random-v1 |
| moveid:MOVE_SWEET_KISS | 70 | 14 | 43 | 2 | 11 | 102 / 70 | 20157-ai-v1 |
| moveid:MOVE_SWEET_SCENT | 279 | 50 | 124 | 25 | 80 | 429 / 279 | 20015-random-v1 |
| moveid:MOVE_SWIFT | 359 | 85 | 108 | 20 | 146 | 392 / 359 | 20033-random-v1 |
| moveid:MOVE_SWORDS_DANCE | 532 | 162 | 170 | 59 | 141 | 602 / 532 | 20013-random-v1 |
| moveid:MOVE_SYNTHESIS | 766 | 162 | 343 | 80 | 181 | 766 / 766 | 20003-random-v1 |
| moveid:MOVE_TACKLE | 13 | 0 | 1 | 0 | 12 | 15 / 13 | 7869-census |
| moveid:MOVE_TAIL_GLOW | 41 | 8 | 14 | 2 | 17 | 43 / 41 | 20145-ai-v1 |
| moveid:MOVE_TAIL_WHIP | 105 | 18 | 24 | 14 | 49 | 119 / 105 | 20006-random-v1 |
| moveid:MOVE_TAKE_DOWN | 123 | 18 | 29 | 6 | 70 | 199 / 123 | 20037-random-v1 |
| moveid:MOVE_TAUNT | 123 | 16 | 45 | 18 | 44 | 155 / 123 | 20010-random-v1 |
| moveid:MOVE_TEETER_DANCE | 120 | 36 | 54 | 15 | 15 | 129 / 120 | 20020-random-v1 |
| moveid:MOVE_TELEPORT | 0 | 0 | 0 | 0 | 0 | 24 / 0 | stage-metro-chansey-17 |
| moveid:MOVE_THRASH | 186 | 34 | 25 | 33 | 94 | 192 / 186 | 20186-ai-v1 |
| moveid:MOVE_THUNDER | 483 | 178 | 204 | 75 | 26 | 670 / 483 | 20009-random-v1 |
| moveid:MOVE_THUNDERBOLT | 2194 | 951 | 947 | 215 | 81 | 2532 / 2194 | 20004-random-v1 |
| moveid:MOVE_THUNDER_PUNCH | 570 | 202 | 215 | 80 | 73 | 714 / 570 | 20009-random-v1 |
| moveid:MOVE_THUNDER_SHOCK | 15 | 0 | 0 | 0 | 15 | 18 / 15 | stage-metro-chansey-11 |
| moveid:MOVE_THUNDER_WAVE | 1587 | 444 | 775 | 214 | 154 | 1970 / 1587 | 20012-random-v1 |
| moveid:MOVE_TICKLE | 203 | 33 | 31 | 34 | 105 | 299 / 203 | 20050-random-v1 |
| moveid:MOVE_TORMENT | 188 | 33 | 66 | 28 | 61 | 376 / 188 | 20010-random-v1 |
| moveid:MOVE_TOXIC | 1082 | 225 | 539 | 97 | 221 | 2167 / 1082 | 20004-random-v1 |
| moveid:MOVE_TRANSFORM | 14 | 0 | 0 | 0 | 14 | 14 / 14 | stage-metronome-transform |
| moveid:MOVE_TRICK | 210 | 60 | 138 | 12 | 0 | 228 / 210 | 20022-random-v1 |
| moveid:MOVE_TRIPLE_KICK | 72 | 4 | 9 | 5 | 54 | 93 / 72 | 20033-random-v1 |
| moveid:MOVE_TRI_ATTACK | 399 | 122 | 221 | 38 | 18 | 457 / 399 | 20021-random-v1 |
| moveid:MOVE_TWINEEDLE | 55 | 15 | 14 | 11 | 15 | 58 / 55 | 20625-ai-v1 |
| moveid:MOVE_TWISTER | 23 | 0 | 1 | 0 | 22 | 23 / 23 | 4322-census |
| moveid:MOVE_UPROAR | 277 | 7 | 62 | 10 | 198 | 332 / 277 | 20211-ai-v1 |
| moveid:MOVE_VICE_GRIP | 120 | 13 | 21 | 4 | 82 | 165 / 120 | 20015-random-v1 |
| moveid:MOVE_VINE_WHIP | 24 | 0 | 2 | 0 | 22 | 25 / 24 | 577-census |
| moveid:MOVE_VITAL_THROW | 10 | 0 | 0 | 0 | 10 | 11 / 10 | stage-metro-chansey-157 |
| moveid:MOVE_VOLT_TACKLE | 19 | 0 | 1 | 0 | 18 | 20 / 19 | 6491-census |
| moveid:MOVE_WATERFALL | 20 | 1 | 0 | 0 | 19 | 20 / 20 | stage-metro-chansey-181 |
| moveid:MOVE_WATER_GUN | 311 | 59 | 62 | 41 | 149 | 449 / 311 | 20028-random-v1 |
| moveid:MOVE_WATER_PULSE | 883 | 203 | 255 | 67 | 358 | 1103 / 883 | 20001-random-v1 |
| moveid:MOVE_WATER_SPORT | 19 | 0 | 1 | 0 | 18 | 19 / 19 | 7869-census |
| moveid:MOVE_WATER_SPOUT | 75 | 11 | 34 | 1 | 29 | 86 / 75 | 20261-ai-v1 |
| moveid:MOVE_WEATHER_BALL | 18 | 0 | 0 | 0 | 18 | 19 / 18 | stage-metro-chansey-129 |
| moveid:MOVE_WHIRLPOOL | 247 | 37 | 43 | 23 | 144 | 460 / 247 | 20117-ai-v1 |
| moveid:MOVE_WHIRLWIND | 203 | 24 | 129 | 32 | 18 | 228 / 203 | 20001-random-v1 |
| moveid:MOVE_WILL_O_WISP | 295 | 39 | 105 | 28 | 123 | 462 / 295 | 20208-census |
| moveid:MOVE_WING_ATTACK | 24 | 0 | 2 | 0 | 22 | 25 / 24 | 20158-census |
| moveid:MOVE_WISH | 856 | 142 | 293 | 51 | 370 | 1049 / 856 | 20031-random-v1 |
| moveid:MOVE_WITHDRAW | 18 | 0 | 1 | 0 | 17 | 20 / 18 | 3784-census |
| moveid:MOVE_WRAP | 281 | 47 | 81 | 45 | 108 | 434 / 281 | 20019-random-v1 |
| moveid:MOVE_YAWN | 517 | 80 | 321 | 47 | 69 | 956 / 517 | 20034-random-v1 |
| moveid:MOVE_ZAP_CANNON | 15 | 6 | 5 | 0 | 4 | 51 / 15 | 20450-ai-v1 |
| set:110 | 30 | 10 | 12 | 8 | 0 |  | 20166-ai-v1 |
| set:111 | 19 | 6 | 9 | 4 | 0 |  | 20028-random-v1 |
| set:112 | 27 | 12 | 11 | 4 | 0 |  | 20206-ai-v1 |
| set:113 | 29 | 9 | 13 | 7 | 0 |  | 20010-random-v1 |
| set:114 | 24 | 12 | 6 | 5 | 1 |  | 20028-random-v1 |
| set:115 | 31 | 9 | 12 | 7 | 3 |  | 20001-random-v1 |
| set:116 | 35 | 9 | 18 | 8 | 0 |  | 20028-random-v1 |
| set:117 | 34 | 14 | 15 | 5 | 0 |  | 20019-random-v1 |
| set:118 | 34 | 16 | 11 | 7 | 0 |  | 20304-random-v1 |
| set:119 | 27 | 11 | 10 | 6 | 0 |  | 20001-random-v1 |
| set:120 | 15 | 7 | 6 | 2 | 0 |  | 20117-ai-v1 |
| set:121 | 21 | 8 | 8 | 5 | 0 |  | 20215-ai-v1 |
| set:122 | 28 | 15 | 9 | 3 | 1 |  | 20242-ai-v1 |
| set:123 | 30 | 12 | 13 | 4 | 1 |  | 20144-random-v1 |
| set:124 | 19 | 8 | 9 | 2 | 0 |  | 20340-ai-v1 |
| set:125 | 24 | 13 | 9 | 2 | 0 |  | 20188-census |
| set:127 | 27 | 12 | 9 | 6 | 0 |  | 20126-ai-v1 |
| set:128 | 24 | 9 | 13 | 2 | 0 |  | 20402-ai-v1 |
| set:129 | 32 | 16 | 9 | 4 | 3 |  | 20010-random-v1 |
| set:130 | 20 | 7 | 9 | 4 | 0 |  | 20344-random-v1 |
| set:131 | 20 | 9 | 6 | 5 | 0 |  | 20246-ai-v1 |
| set:132 | 26 | 10 | 11 | 5 | 0 |  | 20050-random-v1 |
| set:133 | 24 | 11 | 9 | 4 | 0 |  | 20041-random-v1 |
| set:134 | 18 | 6 | 11 | 1 | 0 |  | 20041-random-v1 |
| set:135 | 20 | 5 | 11 | 4 | 0 |  | 20117-ai-v1 |
| set:136 | 24 | 6 | 13 | 5 | 0 |  | 20126-ai-v1 |
| set:137 | 34 | 20 | 10 | 4 | 0 |  | 20010-random-v1 |
| set:138 | 25 | 9 | 11 | 5 | 0 |  | 20050-random-v1 |
| set:139 | 22 | 11 | 9 | 2 | 0 |  | 20001-random-v1 |
| set:140 | 26 | 11 | 12 | 3 | 0 |  | 20148-census |
| set:141 | 36 | 14 | 15 | 7 | 0 |  | 20028-random-v1 |
| set:142 | 38 | 7 | 24 | 7 | 0 |  | 20144-random-v1 |
| set:143 | 32 | 13 | 12 | 4 | 3 |  | 20144-random-v1 |
| set:144 | 20 | 6 | 8 | 6 | 0 |  | 20037-random-v1 |
| set:145 | 20 | 12 | 6 | 2 | 0 |  | 20144-random-v1 |
| set:146 | 30 | 13 | 10 | 7 | 0 |  | 20037-random-v1 |
| set:147 | 24 | 14 | 7 | 3 | 0 |  | 20246-ai-v1 |
| set:148 | 31 | 14 | 15 | 2 | 0 |  | 20108-census |
| set:149 | 29 | 12 | 12 | 5 | 0 |  | 20046-random-v1 |
| set:150 | 27 | 8 | 9 | 7 | 3 |  | 20028-random-v1 |
| set:151 | 19 | 8 | 9 | 2 | 0 |  | 20237-ai-v1 |
| set:152 | 31 | 12 | 10 | 9 | 0 |  | 20197-ai-v1 |
| set:153 | 50 | 17 | 27 | 6 | 0 |  | 20282-ai-v1 |
| set:154 | 24 | 7 | 9 | 8 | 0 |  | 20246-ai-v1 |
| set:155 | 16 | 6 | 10 | 0 | 0 |  | 20215-ai-v1 |
| set:156 | 19 | 9 | 7 | 3 | 0 |  | 20144-random-v1 |
| set:157 | 20 | 12 | 2 | 5 | 1 |  | 20001-random-v1 |
| set:158 | 46 | 9 | 30 | 7 | 0 |  | 20282-ai-v1 |
| set:159 | 18 | 11 | 5 | 2 | 0 |  | 20046-random-v1 |
| set:160 | 24 | 13 | 7 | 4 | 0 |  | 20050-random-v1 |
| set:161 | 19 | 5 | 10 | 4 | 0 |  | 20264-random-v1 |
| set:162 | 61 | 23 | 15 | 9 | 14 |  | 20104-random-v1 |
| set:163 | 72 | 16 | 13 | 8 | 35 |  | 20046-random-v1 |
| set:164 | 61 | 25 | 14 | 5 | 17 |  | 20002-random-v1 |
| set:165 | 68 | 14 | 16 | 11 | 27 |  | 20015-random-v1 |
| set:166 | 234 | 12 | 19 | 3 | 200 |  | 20304-random-v1 |
| set:167 | 66 | 23 | 13 | 8 | 22 |  | 20001-random-v1 |
| set:168 | 99 | 18 | 22 | 10 | 49 |  | 20037-random-v1 |
| set:169 | 71 | 13 | 15 | 11 | 32 |  | 20011-random-v1 |
| set:170 | 80 | 15 | 15 | 5 | 45 |  | 20011-random-v1 |
| set:171 | 78 | 14 | 21 | 5 | 38 |  | 20149-random-v1 |
| set:172 | 61 | 16 | 14 | 6 | 25 |  | 20002-random-v1 |
| set:173 | 75 | 20 | 23 | 9 | 23 |  | 20117-ai-v1 |
| set:174 | 62 | 12 | 15 | 10 | 25 |  | 20184-random-v1 |
| set:175 | 78 | 26 | 14 | 11 | 27 |  | 20015-random-v1 |
| set:176 | 64 | 15 | 16 | 5 | 28 |  | 20042-random-v1 |
| set:177 | 89 | 14 | 21 | 5 | 49 |  | 20135-ai-v1 |
| set:178 | 78 | 22 | 25 | 6 | 25 |  | 20126-ai-v1 |
| set:179 | 98 | 29 | 26 | 10 | 33 |  | 20028-random-v1 |
| set:180 | 81 | 23 | 23 | 9 | 26 |  | 20019-random-v1 |
| set:181 | 57 | 11 | 15 | 7 | 24 |  | 20033-random-v1 |
| set:182 | 75 | 17 | 17 | 6 | 35 |  | 20001-random-v1 |
| set:183 | 57 | 12 | 10 | 6 | 29 |  | 20157-ai-v1 |
| set:184 | 79 | 18 | 20 | 7 | 34 |  | 20010-random-v1 |
| set:185 | 75 | 15 | 26 | 9 | 25 |  | 20162-ai-v1 |
| set:186 | 64 | 24 | 8 | 6 | 26 |  | 20135-ai-v1 |
| set:187 | 91 | 12 | 47 | 10 | 22 |  | 20011-random-v1 |
| set:188 | 66 | 13 | 15 | 7 | 31 |  | 20041-random-v1 |
| set:189 | 60 | 15 | 13 | 9 | 23 |  | 20131-ai-v1 |
| set:190 | 68 | 26 | 13 | 7 | 22 |  | 20131-ai-v1 |
| set:191 | 80 | 25 | 19 | 8 | 28 |  | 20006-random-v1 |
| set:192 | 70 | 20 | 17 | 9 | 24 |  | 20011-random-v1 |
| set:193 | 81 | 25 | 16 | 8 | 32 |  | 20122-ai-v1 |
| set:194 | 69 | 17 | 20 | 9 | 23 |  | 20206-ai-v1 |
| set:195 | 80 | 11 | 25 | 13 | 31 |  | 20135-ai-v1 |
| set:196 | 78 | 18 | 25 | 9 | 26 |  | 20006-random-v1 |
| set:197 | 57 | 20 | 8 | 5 | 24 |  | 20206-ai-v1 |
| set:198 | 68 | 10 | 22 | 9 | 27 |  | 20104-random-v1 |
| set:199 | 64 | 18 | 14 | 11 | 21 |  | 20024-random-v1 |
| set:200 | 220 | 9 | 8 | 8 | 195 |  | 20202-ai-v1 |
| set:201 | 56 | 9 | 9 | 6 | 32 |  | 20015-random-v1 |
| set:202 | 23 | 8 | 13 | 2 | 0 |  | 20113-census |
| set:203 | 52 | 7 | 8 | 3 | 34 |  | 20153-census |
| set:204 | 52 | 9 | 10 | 7 | 26 |  | 20006-random-v1 |
| set:205 | 53 | 10 | 11 | 9 | 23 |  | 20158-census |
| set:206 | 48 | 8 | 7 | 5 | 28 |  | 20006-random-v1 |
| set:207 | 45 | 3 | 8 | 2 | 32 |  | 20042-random-v1 |
| set:208 | 41 | 5 | 6 | 6 | 24 |  | 20149-random-v1 |
| set:209 | 55 | 10 | 10 | 1 | 34 |  | 20238-census |
| set:210 | 48 | 13 | 8 | 1 | 26 |  | 20198-census |
| set:211 | 101 | 8 | 9 | 5 | 79 |  | 20452-ai-v1 |
| set:212 | 41 | 9 | 5 | 8 | 19 |  | 20158-census |
| set:213 | 33 | 8 | 8 | 5 | 12 |  | 20109-random-v1 |
| set:214 | 55 | 9 | 7 | 8 | 31 |  | 20002-random-v1 |
| set:215 | 49 | 12 | 9 | 3 | 25 |  | 20238-census |
| set:216 | 35 | 6 | 7 | 3 | 19 |  | 20697-ai-v1 |
| set:217 | 56 | 5 | 9 | 5 | 37 |  | 20002-random-v1 |
| set:218 | 53 | 10 | 12 | 6 | 25 |  | 20002-random-v1 |
| set:219 | 60 | 11 | 8 | 6 | 35 |  | 20256-ai-v1 |
| set:220 | 75 | 7 | 3 | 3 | 62 |  | 20113-census |
| set:221 | 57 | 8 | 20 | 2 | 27 |  | 20211-ai-v1 |
| set:222 | 35 | 10 | 4 | 7 | 14 |  | 20198-census |
| set:223 | 38 | 9 | 9 | 2 | 18 |  | 20033-random-v1 |
| set:224 | 54 | 9 | 10 | 2 | 33 |  | 20109-random-v1 |
| set:225 | 20 | 8 | 4 | 2 | 6 |  | 20140-ai-v1 |
| set:226 | 54 | 9 | 6 | 2 | 37 |  | 20345-ai-v1 |
| set:227 | 741 | 7 | 13 | 2 | 719 |  | 20024-random-v1 |
| set:228 | 32 | 13 | 6 | 3 | 10 |  | 20251-ai-v1 |
| set:229 | 37 | 10 | 9 | 6 | 12 |  | 20162-ai-v1 |
| set:230 | 62 | 10 | 13 | 3 | 36 |  | 20260-ai-v1 |
| set:231 | 42 | 2 | 8 | 2 | 30 |  | 20229-random-v1 |
| set:232 | 58 | 11 | 8 | 5 | 34 |  | 20011-random-v1 |
| set:233 | 60 | 12 | 11 | 5 | 32 |  | 20104-random-v1 |
| set:234 | 60 | 5 | 10 | 6 | 39 |  | 20015-random-v1 |
| set:235 | 49 | 5 | 8 | 5 | 31 |  | 20532-ai-v1 |
| set:236 | 44 | 11 | 4 | 5 | 24 |  | 20033-random-v1 |
| set:237 | 77 | 12 | 14 | 6 | 45 |  | 20122-ai-v1 |
| set:238 | 50 | 10 | 8 | 4 | 28 |  | 20024-random-v1 |
| set:239 | 56 | 12 | 9 | 1 | 34 |  | 20251-ai-v1 |
| set:240 | 16 | 9 | 5 | 2 | 0 |  | 20305-ai-v1 |
| set:241 | 42 | 12 | 10 | 2 | 18 |  | 20104-random-v1 |
| set:242 | 44 | 7 | 9 | 3 | 25 |  | 20247-ai-v1 |
| set:243 | 21 | 8 | 9 | 4 | 0 |  | 20024-random-v1 |
| set:244 | 39 | 4 | 6 | 3 | 26 |  | 20434-random-v1 |
| set:245 | 60 | 12 | 10 | 4 | 34 |  | 20140-ai-v1 |
| set:246 | 50 | 9 | 2 | 4 | 35 |  | 20296-ai-v1 |
| set:247 | 57 | 5 | 6 | 8 | 38 |  | 20033-random-v1 |
| set:248 | 32 | 6 | 6 | 4 | 16 |  | 20140-ai-v1 |
| set:249 | 48 | 4 | 9 | 3 | 32 |  | 20015-random-v1 |
| set:250 | 53 | 10 | 8 | 5 | 30 |  | 20109-random-v1 |
| set:251 | 51 | 6 | 8 | 5 | 32 |  | 20033-random-v1 |
| set:252 | 50 | 7 | 6 | 2 | 35 |  | 20612-ai-v1 |
| set:253 | 45 | 10 | 6 | 7 | 22 |  | 20104-random-v1 |
| set:254 | 46 | 13 | 4 | 6 | 23 |  | 20024-random-v1 |
| set:255 | 51 | 6 | 5 | 0 | 40 |  | 20278-census |
| set:256 | 80 | 8 | 5 | 7 | 60 |  | 20140-ai-v1 |
| set:257 | 39 | 8 | 7 | 2 | 22 |  | 20158-census |
| set:258 | 54 | 11 | 9 | 5 | 29 |  | 20483-census |
| set:259 | 50 | 9 | 16 | 2 | 23 |  | 20296-ai-v1 |
| set:260 | 50 | 12 | 6 | 6 | 26 |  | 20131-ai-v1 |
| set:261 | 40 | 6 | 11 | 1 | 22 |  | 20211-ai-v1 |
| set:262 | 46 | 12 | 6 | 2 | 26 |  | 20113-census |
| set:263 | 59 | 14 | 9 | 4 | 32 |  | 20278-census |
| set:264 | 42 | 9 | 5 | 6 | 22 |  | 20296-ai-v1 |
| set:265 | 44 | 11 | 7 | 4 | 22 |  | 20015-random-v1 |
| set:266 | 62 | 10 | 10 | 6 | 36 |  | 20011-random-v1 |
| set:267 | 26 | 8 | 15 | 3 | 0 |  | 20038-random-v1 |
| set:268 | 36 | 9 | 22 | 4 | 1 |  | 20029-random-v1 |
| set:269 | 35 | 3 | 24 | 7 | 1 |  | 20234-random-v1 |
| set:270 | 31 | 12 | 15 | 4 | 0 |  | 20421-ai-v1 |
| set:271 | 31 | 12 | 18 | 1 | 0 |  | 20136-ai-v1 |
| set:272 | 38 | 7 | 24 | 7 | 0 |  | 20020-random-v1 |
| set:273 | 38 | 8 | 27 | 3 | 0 |  | 20163-census |
| set:274 | 40 | 12 | 23 | 5 | 0 |  | 20319-random-v1 |
| set:275 | 37 | 7 | 25 | 5 | 0 |  | 20261-ai-v1 |
| set:276 | 31 | 7 | 18 | 5 | 1 |  | 20020-random-v1 |
| set:277 | 24 | 7 | 15 | 2 | 0 |  | 20145-ai-v1 |
| set:278 | 36 | 10 | 24 | 2 | 0 |  | 20261-ai-v1 |
| set:279 | 34 | 9 | 23 | 2 | 0 |  | 20185-ai-v1 |
| set:280 | 24 | 9 | 13 | 2 | 0 |  | 20136-ai-v1 |
| set:281 | 30 | 9 | 16 | 4 | 1 |  | 20145-ai-v1 |
| set:282 | 46 | 9 | 32 | 5 | 0 |  | 20038-random-v1 |
| set:283 | 39 | 12 | 20 | 3 | 4 |  | 20176-ai-v1 |
| set:284 | 27 | 6 | 20 | 1 | 0 |  | 20457-ai-v1 |
| set:285 | 40 | 11 | 25 | 4 | 0 |  | 20127-ai-v1 |
| set:286 | 35 | 16 | 15 | 4 | 0 |  | 20172-ai-v1 |
| set:287 | 35 | 7 | 26 | 2 | 0 |  | 20136-ai-v1 |
| set:288 | 29 | 3 | 24 | 2 | 0 |  | 20555-ai-v1 |
| set:289 | 42 | 9 | 30 | 3 | 0 |  | 20234-random-v1 |
| set:290 | 44 | 5 | 34 | 5 | 0 |  | 20020-random-v1 |
| set:291 | 33 | 11 | 18 | 4 | 0 |  | 20332-ai-v1 |
| set:292 | 36 | 11 | 22 | 3 | 0 |  | 20323-census |
| set:293 | 36 | 13 | 20 | 3 | 0 |  | 20194-random-v1 |
| set:294 | 34 | 12 | 20 | 2 | 0 |  | 20163-census |
| set:295 | 26 | 8 | 17 | 1 | 0 |  | 20221-ai-v1 |
| set:296 | 33 | 5 | 22 | 6 | 0 |  | 20203-census |
| set:297 | 40 | 12 | 20 | 7 | 1 |  | 20167-ai-v1 |
| set:298 | 25 | 4 | 17 | 4 | 0 |  | 20016-random-v1 |
| set:299 | 33 | 8 | 21 | 4 | 0 |  | 20025-random-v1 |
| set:300 | 32 | 4 | 22 | 6 | 0 |  | 20519-random-v1 |
| set:301 | 30 | 6 | 21 | 2 | 1 |  | 20243-census |
| set:302 | 31 | 7 | 21 | 3 | 0 |  | 20154-random-v1 |
| set:303 | 32 | 8 | 21 | 3 | 0 |  | 20047-random-v1 |
| set:304 | 53 | 12 | 36 | 5 | 0 |  | 20123-census |
| set:305 | 38 | 14 | 20 | 4 | 0 |  | 20118-census |
| set:306 | 37 | 8 | 23 | 4 | 2 |  | 20421-ai-v1 |
| set:307 | 47 | 10 | 30 | 7 | 0 |  | 20163-census |
| set:308 | 48 | 15 | 28 | 5 | 0 |  | 20127-ai-v1 |
| set:309 | 17 | 3 | 13 | 1 | 0 |  | 20167-ai-v1 |
| set:310 | 29 | 10 | 16 | 3 | 0 |  | 20372-ai-v1 |
| set:311 | 34 | 8 | 24 | 2 | 0 |  | 20114-random-v1 |
| set:312 | 46 | 9 | 30 | 6 | 1 |  | 20234-random-v1 |
| set:313 | 32 | 10 | 18 | 4 | 0 |  | 20016-random-v1 |
| set:314 | 28 | 7 | 14 | 7 | 0 |  | 20007-random-v1 |
| set:315 | 36 | 10 | 22 | 4 | 0 |  | 20221-ai-v1 |
| set:316 | 29 | 7 | 21 | 1 | 0 |  | 20118-census |
| set:317 | 39 | 7 | 26 | 6 | 0 |  | 20118-census |
| set:318 | 37 | 12 | 20 | 5 | 0 |  | 20029-random-v1 |
| set:319 | 31 | 8 | 20 | 3 | 0 |  | 20225-ai-v1 |
| set:320 | 36 | 10 | 24 | 2 | 0 |  | 20265-ai-v1 |
| set:321 | 33 | 7 | 25 | 1 | 0 |  | 20123-census |
| set:322 | 27 | 8 | 16 | 3 | 0 |  | 20016-random-v1 |
| set:323 | 31 | 11 | 19 | 1 | 0 |  | 20243-census |
| set:324 | 32 | 11 | 19 | 2 | 0 |  | 20252-ai-v1 |
| set:325 | 46 | 10 | 32 | 2 | 2 |  | 20154-random-v1 |
| set:326 | 37 | 10 | 24 | 3 | 0 |  | 20016-random-v1 |
| set:327 | 32 | 11 | 19 | 2 | 0 |  | 20025-random-v1 |
| set:328 | 35 | 9 | 19 | 7 | 0 |  | 20007-random-v1 |
| set:329 | 32 | 6 | 23 | 3 | 0 |  | 20274-random-v1 |
| set:330 | 43 | 6 | 34 | 3 | 0 |  | 20114-random-v1 |
| set:331 | 39 | 12 | 23 | 4 | 0 |  | 20292-ai-v1 |
| set:332 | 25 | 10 | 11 | 4 | 0 |  | 20221-ai-v1 |
| set:333 | 23 | 5 | 14 | 4 | 0 |  | 20216-ai-v1 |
| set:334 | 45 | 9 | 30 | 3 | 3 |  | 20038-random-v1 |
| set:335 | 36 | 10 | 22 | 4 | 0 |  | 20025-random-v1 |
| set:336 | 31 | 4 | 22 | 5 | 0 |  | 20212-ai-v1 |
| set:337 | 28 | 11 | 15 | 2 | 0 |  | 20194-random-v1 |
| set:338 | 38 | 8 | 21 | 8 | 1 |  | 20203-census |
| set:339 | 30 | 10 | 16 | 4 | 0 |  | 20114-random-v1 |
| set:340 | 36 | 9 | 22 | 5 | 0 |  | 20145-ai-v1 |
| set:341 | 35 | 12 | 20 | 3 | 0 |  | 20105-ai-v1 |
| set:342 | 28 | 5 | 19 | 1 | 3 |  | 20176-ai-v1 |
| set:343 | 28 | 10 | 13 | 5 | 0 |  | 20314-random-v1 |
| set:344 | 31 | 9 | 19 | 3 | 0 |  | 20265-ai-v1 |
| set:345 | 26 | 4 | 18 | 4 | 0 |  | 20016-random-v1 |
| set:346 | 32 | 8 | 21 | 3 | 0 |  | 20194-random-v1 |
| set:347 | 36 | 10 | 25 | 1 | 0 |  | 20007-random-v1 |
| set:348 | 35 | 7 | 25 | 3 | 0 |  | 20145-ai-v1 |
| set:349 | 25 | 9 | 13 | 3 | 0 |  | 20216-ai-v1 |
| set:350 | 26 | 3 | 17 | 6 | 0 |  | 20029-random-v1 |
| set:351 | 30 | 8 | 18 | 4 | 0 |  | 20047-random-v1 |
| set:352 | 37 | 6 | 28 | 3 | 0 |  | 20470-ai-v1 |
| set:353 | 24 | 5 | 16 | 3 | 0 |  | 20025-random-v1 |
| set:354 | 41 | 15 | 22 | 4 | 0 |  | 20047-random-v1 |
| set:355 | 26 | 9 | 16 | 1 | 0 |  | 20167-ai-v1 |
| set:356 | 27 | 10 | 17 | 0 | 0 |  | 20123-census |
| set:357 | 24 | 5 | 17 | 2 | 0 |  | 20038-random-v1 |
| set:358 | 32 | 11 | 16 | 5 | 0 |  | 20105-ai-v1 |
| set:359 | 40 | 5 | 27 | 8 | 0 |  | 20020-random-v1 |
| set:360 | 38 | 13 | 21 | 4 | 0 |  | 20167-ai-v1 |
| set:361 | 33 | 6 | 22 | 5 | 0 |  | 20118-census |
| set:362 | 27 | 7 | 16 | 4 | 0 |  | 20007-random-v1 |
| set:363 | 34 | 7 | 21 | 6 | 0 |  | 20025-random-v1 |
| set:364 | 38 | 11 | 24 | 3 | 0 |  | 20114-random-v1 |
| set:365 | 38 | 15 | 17 | 6 | 0 |  | 20007-random-v1 |
| set:366 | 24 | 6 | 14 | 4 | 0 |  | 20613-census |
| set:367 | 32 | 12 | 17 | 3 | 0 |  | 20172-ai-v1 |
| set:368 | 24 | 6 | 11 | 7 | 0 |  | 20154-random-v1 |
| set:369 | 30 | 9 | 19 | 2 | 0 |  | 20613-census |
| set:370 | 31 | 6 | 20 | 5 | 0 |  | 20145-ai-v1 |
| set:371 | 31 | 6 | 22 | 3 | 0 |  | 20105-ai-v1 |
| set:372 | 44 | 21 | 9 | 12 | 2 |  | 20043-random-v1 |
| set:373 | 51 | 20 | 20 | 4 | 7 |  | 20150-ai-v1 |
| set:374 | 37 | 14 | 13 | 5 | 5 |  | 20128-census |
| set:375 | 38 | 21 | 10 | 5 | 2 |  | 20190-ai-v1 |
| set:376 | 32 | 11 | 15 | 6 | 0 |  | 20030-random-v1 |
| set:377 | 46 | 13 | 13 | 11 | 9 |  | 20039-random-v1 |
| set:378 | 39 | 16 | 10 | 5 | 8 |  | 20315-ai-v1 |
| set:379 | 35 | 16 | 9 | 5 | 5 |  | 20235-ai-v1 |
| set:380 | 28 | 13 | 8 | 4 | 3 |  | 20141-ai-v1 |
| set:381 | 40 | 14 | 12 | 6 | 8 |  | 20101-ai-v1 |
| set:382 | 36 | 13 | 10 | 8 | 5 |  | 20226-ai-v1 |
| set:383 | 40 | 11 | 13 | 8 | 8 |  | 20030-random-v1 |
| set:384 | 40 | 15 | 17 | 5 | 3 |  | 20012-random-v1 |
| set:385 | 47 | 18 | 11 | 10 | 8 |  | 20235-ai-v1 |
| set:386 | 43 | 17 | 13 | 7 | 6 |  | 20003-random-v1 |
| set:387 | 48 | 24 | 15 | 4 | 5 |  | 20132-ai-v1 |
| set:388 | 28 | 11 | 10 | 5 | 2 |  | 20186-ai-v1 |
| set:389 | 150 | 10 | 25 | 3 | 112 |  | 20386-ai-v1 |
| set:390 | 38 | 16 | 10 | 7 | 5 |  | 20239-random-v1 |
| set:391 | 35 | 17 | 10 | 2 | 6 |  | 20119-random-v1 |
| set:392 | 49 | 16 | 17 | 6 | 10 |  | 20159-random-v1 |
| set:393 | 42 | 16 | 19 | 7 | 0 |  | 20110-ai-v1 |
| set:394 | 52 | 19 | 19 | 8 | 6 |  | 20034-random-v1 |
| set:395 | 42 | 14 | 17 | 3 | 8 |  | 20177-ai-v1 |
| set:396 | 48 | 20 | 21 | 0 | 7 |  | 20226-ai-v1 |
| set:397 | 34 | 11 | 12 | 5 | 6 |  | 20235-ai-v1 |
| set:398 | 34 | 13 | 9 | 8 | 4 |  | 20101-ai-v1 |
| set:399 | 41 | 18 | 10 | 7 | 6 |  | 20034-random-v1 |
| set:400 | 35 | 15 | 11 | 5 | 4 |  | 20288-census |
| set:401 | 43 | 18 | 9 | 7 | 9 |  | 20119-random-v1 |
| set:402 | 35 | 11 | 12 | 5 | 7 |  | 20306-ai-v1 |
| set:403 | 46 | 12 | 19 | 6 | 9 |  | 20444-random-v1 |
| set:404 | 36 | 14 | 9 | 8 | 5 |  | 20364-random-v1 |
| set:405 | 38 | 9 | 14 | 7 | 8 |  | 20003-random-v1 |
| set:406 | 40 | 16 | 17 | 2 | 5 |  | 20030-random-v1 |
| set:407 | 34 | 7 | 18 | 5 | 4 |  | 20248-census |
| set:408 | 46 | 15 | 16 | 7 | 8 |  | 20186-ai-v1 |
| set:409 | 41 | 17 | 7 | 7 | 10 |  | 20110-ai-v1 |
| set:410 | 26 | 10 | 10 | 3 | 3 |  | 20128-census |
| set:411 | 40 | 13 | 7 | 11 | 9 |  | 20012-random-v1 |
| set:412 | 45 | 21 | 15 | 3 | 6 |  | 20141-ai-v1 |
| set:413 | 39 | 13 | 16 | 5 | 5 |  | 20386-ai-v1 |
| set:414 | 31 | 11 | 9 | 5 | 6 |  | 20177-ai-v1 |
| set:415 | 42 | 16 | 13 | 6 | 7 |  | 20239-random-v1 |
| set:416 | 34 | 6 | 15 | 10 | 3 |  | 20012-random-v1 |
| set:417 | 28 | 10 | 10 | 2 | 6 |  | 20502-ai-v1 |
| set:418 | 44 | 19 | 15 | 7 | 3 |  | 20181-ai-v1 |
| set:419 | 49 | 17 | 19 | 7 | 6 |  | 20039-random-v1 |
| set:420 | 27 | 9 | 8 | 4 | 6 |  | 20413-census |
| set:421 | 46 | 10 | 23 | 11 | 2 |  | 20609-random-v1 |
| set:422 | 36 | 13 | 12 | 5 | 6 |  | 20043-random-v1 |
| set:423 | 43 | 17 | 12 | 4 | 10 |  | 20021-random-v1 |
| set:424 | 30 | 8 | 13 | 3 | 6 |  | 20110-ai-v1 |
| set:425 | 37 | 12 | 10 | 7 | 8 |  | 20039-random-v1 |
| set:426 | 33 | 10 | 13 | 6 | 4 |  | 20150-ai-v1 |
| set:427 | 34 | 13 | 9 | 6 | 6 |  | 20034-random-v1 |
| set:428 | 32 | 13 | 7 | 7 | 5 |  | 20137-ai-v1 |
| set:429 | 34 | 15 | 13 | 6 | 0 |  | 20230-ai-v1 |
| set:430 | 29 | 16 | 9 | 4 | 0 |  | 20275-ai-v1 |
| set:431 | 37 | 10 | 11 | 8 | 8 |  | 20021-random-v1 |
| set:432 | 30 | 5 | 14 | 5 | 6 |  | 20110-ai-v1 |
| set:433 | 35 | 14 | 16 | 5 | 0 |  | 20453-census |
| set:434 | 46 | 9 | 21 | 5 | 11 |  | 20364-random-v1 |
| set:435 | 41 | 21 | 12 | 8 | 0 |  | 20306-ai-v1 |
| set:436 | 36 | 16 | 15 | 4 | 1 |  | 20021-random-v1 |
| set:437 | 34 | 13 | 12 | 6 | 3 |  | 20110-ai-v1 |
| set:438 | 37 | 11 | 13 | 8 | 5 |  | 20003-random-v1 |
| set:439 | 49 | 24 | 14 | 6 | 5 |  | 20012-random-v1 |
| set:440 | 42 | 17 | 14 | 5 | 6 |  | 20150-ai-v1 |
| set:441 | 52 | 14 | 23 | 7 | 8 |  | 20003-random-v1 |
| set:442 | 38 | 13 | 12 | 13 | 0 |  | 20039-random-v1 |
| set:443 | 44 | 20 | 14 | 4 | 6 |  | 20288-census |
| set:444 | 34 | 15 | 15 | 4 | 0 |  | 20021-random-v1 |
| set:445 | 35 | 11 | 18 | 2 | 4 |  | 20275-ai-v1 |
| set:446 | 40 | 18 | 10 | 4 | 8 |  | 20128-census |
| set:447 | 41 | 11 | 15 | 9 | 6 |  | 20239-random-v1 |
| set:448 | 43 | 17 | 11 | 6 | 9 |  | 20030-random-v1 |
| set:449 | 32 | 12 | 12 | 8 | 0 |  | 20043-random-v1 |
| set:450 | 31 | 11 | 15 | 5 | 0 |  | 20208-census |
| set:451 | 27 | 10 | 12 | 5 | 0 |  | 20110-ai-v1 |
| set:452 | 52 | 14 | 28 | 5 | 5 |  | 20034-random-v1 |
| set:453 | 32 | 11 | 14 | 4 | 3 |  | 20137-ai-v1 |
| set:454 | 26 | 14 | 7 | 5 | 0 |  | 20529-random-v1 |
| set:455 | 28 | 11 | 12 | 5 | 0 |  | 20168-census |
| set:456 | 33 | 16 | 13 | 3 | 1 |  | 20279-random-v1 |
| set:457 | 39 | 21 | 10 | 3 | 5 |  | 20132-ai-v1 |
| set:458 | 39 | 13 | 9 | 9 | 8 |  | 20279-random-v1 |
| set:459 | 44 | 17 | 13 | 7 | 7 |  | 20239-random-v1 |
| set:460 | 34 | 10 | 15 | 5 | 4 |  | 20021-random-v1 |
| set:461 | 36 | 10 | 11 | 7 | 8 |  | 20404-random-v1 |
| set:462 | 40 | 14 | 17 | 2 | 7 |  | 20190-ai-v1 |
| set:463 | 44 | 9 | 16 | 9 | 10 |  | 20012-random-v1 |
| set:464 | 30 | 9 | 14 | 4 | 3 |  | 20141-ai-v1 |
| set:465 | 44 | 18 | 10 | 9 | 7 |  | 20012-random-v1 |
| set:466 | 34 | 13 | 11 | 6 | 4 |  | 20043-random-v1 |
| set:467 | 42 | 14 | 14 | 6 | 8 |  | 20150-ai-v1 |
| set:468 | 41 | 17 | 16 | 8 | 0 |  | 20173-census |
| set:469 | 41 | 16 | 16 | 9 | 0 |  | 20008-random-v1 |
| set:470 | 35 | 11 | 19 | 5 | 0 |  | 20338-census |
| set:471 | 43 | 14 | 24 | 5 | 0 |  | 20200-ai-v1 |
| set:472 | 33 | 15 | 15 | 3 | 0 |  | 20115-ai-v1 |
| set:473 | 37 | 16 | 13 | 8 | 0 |  | 20347-ai-v1 |
| set:474 | 37 | 14 | 19 | 4 | 0 |  | 20151-ai-v1 |
| set:475 | 36 | 15 | 13 | 8 | 0 |  | 20151-ai-v1 |
| set:476 | 32 | 11 | 17 | 4 | 0 |  | 20004-random-v1 |
| set:477 | 37 | 21 | 13 | 3 | 0 |  | 20115-ai-v1 |
| set:478 | 40 | 14 | 18 | 8 | 0 |  | 20133-census |
| set:479 | 41 | 15 | 19 | 7 | 0 |  | 20004-random-v1 |
| set:480 | 30 | 13 | 13 | 4 | 0 |  | 20146-ai-v1 |
| set:481 | 29 | 10 | 13 | 6 | 0 |  | 20289-random-v1 |
| set:482 | 29 | 13 | 14 | 2 | 0 |  | 20142-ai-v1 |
| set:483 | 57 | 19 | 30 | 8 | 0 |  | 20124-random-v1 |
| set:484 | 29 | 12 | 11 | 6 | 0 |  | 20044-random-v1 |
| set:485 | 33 | 13 | 14 | 6 | 0 |  | 20155-ai-v1 |
| set:486 | 36 | 11 | 20 | 5 | 0 |  | 20151-ai-v1 |
| set:487 | 34 | 16 | 13 | 5 | 0 |  | 20026-random-v1 |
| set:488 | 41 | 14 | 24 | 3 | 0 |  | 20342-ai-v1 |
| set:489 | 31 | 10 | 11 | 10 | 0 |  | 20008-random-v1 |
| set:490 | 30 | 14 | 14 | 2 | 0 |  | 20271-ai-v1 |
| set:491 | 27 | 10 | 11 | 6 | 0 |  | 20115-ai-v1 |
| set:492 | 39 | 19 | 15 | 5 | 0 |  | 20115-ai-v1 |
| set:493 | 40 | 17 | 18 | 5 | 0 |  | 20342-ai-v1 |
| set:494 | 40 | 12 | 18 | 10 | 0 |  | 20204-random-v1 |
| set:495 | 41 | 17 | 16 | 8 | 0 |  | 20146-ai-v1 |
| set:496 | 35 | 15 | 16 | 4 | 0 |  | 20106-ai-v1 |
| set:497 | 44 | 23 | 14 | 7 | 0 |  | 20106-ai-v1 |
| set:498 | 47 | 19 | 21 | 7 | 0 |  | 20048-random-v1 |
| set:499 | 34 | 19 | 8 | 7 | 0 |  | 20249-random-v1 |
| set:500 | 36 | 15 | 18 | 3 | 0 |  | 20151-ai-v1 |
| set:501 | 35 | 17 | 14 | 4 | 0 |  | 20240-ai-v1 |
| set:502 | 42 | 17 | 16 | 9 | 0 |  | 20271-ai-v1 |
| set:503 | 29 | 8 | 14 | 7 | 0 |  | 20289-random-v1 |
| set:504 | 33 | 8 | 16 | 9 | 0 |  | 20044-random-v1 |
| set:505 | 28 | 8 | 14 | 6 | 0 |  | 20298-census |
| set:506 | 27 | 9 | 14 | 4 | 0 |  | 20271-ai-v1 |
| set:507 | 37 | 18 | 12 | 7 | 0 |  | 20102-ai-v1 |
| set:508 | 32 | 11 | 15 | 6 | 0 |  | 20102-ai-v1 |
| set:509 | 27 | 15 | 7 | 5 | 0 |  | 20008-random-v1 |
| set:510 | 35 | 16 | 9 | 10 | 0 |  | 20017-random-v1 |
| set:511 | 39 | 17 | 18 | 4 | 0 |  | 20106-ai-v1 |
| set:512 | 42 | 15 | 17 | 10 | 0 |  | 20182-ai-v1 |
| set:513 | 30 | 16 | 8 | 6 | 0 |  | 20146-ai-v1 |
| set:514 | 37 | 19 | 10 | 8 | 0 |  | 20102-ai-v1 |
| set:515 | 24 | 9 | 11 | 4 | 0 |  | 20142-ai-v1 |
| set:516 | 35 | 13 | 17 | 5 | 0 |  | 20182-ai-v1 |
| set:517 | 33 | 14 | 14 | 5 | 0 |  | 20106-ai-v1 |
| set:518 | 30 | 13 | 9 | 8 | 0 |  | 20102-ai-v1 |
| set:519 | 31 | 13 | 12 | 6 | 0 |  | 20262-ai-v1 |
| set:520 | 25 | 12 | 8 | 5 | 0 |  | 20311-ai-v1 |
| set:521 | 29 | 12 | 11 | 6 | 0 |  | 20044-random-v1 |
| set:522 | 36 | 11 | 19 | 6 | 0 |  | 20133-census |
| set:523 | 38 | 12 | 21 | 5 | 0 |  | 20133-census |
| set:524 | 40 | 16 | 21 | 3 | 0 |  | 20240-ai-v1 |
| set:525 | 43 | 18 | 18 | 7 | 0 |  | 20146-ai-v1 |
| set:526 | 39 | 13 | 20 | 6 | 0 |  | 20017-random-v1 |
| set:527 | 26 | 10 | 11 | 5 | 0 |  | 20102-ai-v1 |
| set:528 | 26 | 8 | 14 | 4 | 0 |  | 20271-ai-v1 |
| set:529 | 24 | 10 | 8 | 6 | 0 |  | 20195-ai-v1 |
| set:530 | 30 | 11 | 16 | 3 | 0 |  | 20271-ai-v1 |
| set:531 | 58 | 10 | 39 | 9 | 0 |  | 20213-census |
| set:532 | 39 | 15 | 16 | 8 | 0 |  | 20124-random-v1 |
| set:533 | 47 | 14 | 23 | 10 | 0 |  | 20017-random-v1 |
| set:534 | 31 | 11 | 15 | 5 | 0 |  | 20636-ai-v1 |
| set:535 | 38 | 16 | 17 | 5 | 0 |  | 20115-ai-v1 |
| set:536 | 35 | 11 | 17 | 7 | 0 |  | 20311-ai-v1 |
| set:537 | 32 | 12 | 18 | 2 | 0 |  | 20182-ai-v1 |
| set:538 | 40 | 19 | 15 | 6 | 0 |  | 20142-ai-v1 |
| set:539 | 36 | 17 | 14 | 5 | 0 |  | 20133-census |
| set:540 | 31 | 11 | 11 | 9 | 0 |  | 20004-random-v1 |
| set:541 | 40 | 10 | 26 | 4 | 0 |  | 20004-random-v1 |
| set:542 | 35 | 14 | 14 | 7 | 0 |  | 20204-random-v1 |
| set:543 | 36 | 14 | 14 | 8 | 0 |  | 20048-random-v1 |
| set:544 | 40 | 15 | 18 | 7 | 0 |  | 20155-ai-v1 |
| set:545 | 18 | 5 | 9 | 4 | 0 |  | 20026-random-v1 |
| set:546 | 28 | 12 | 11 | 5 | 0 |  | 20044-random-v1 |
| set:547 | 31 | 14 | 12 | 5 | 0 |  | 20048-random-v1 |
| set:548 | 42 | 21 | 15 | 6 | 0 |  | 20204-random-v1 |
| set:549 | 33 | 11 | 18 | 4 | 0 |  | 20048-random-v1 |
| set:550 | 31 | 15 | 14 | 2 | 0 |  | 20008-random-v1 |
| set:551 | 38 | 16 | 13 | 9 | 0 |  | 20026-random-v1 |
| set:552 | 35 | 16 | 12 | 7 | 0 |  | 20298-census |
| set:553 | 29 | 9 | 14 | 6 | 0 |  | 20164-random-v1 |
| set:554 | 32 | 8 | 13 | 11 | 0 |  | 20008-random-v1 |
| set:555 | 42 | 20 | 18 | 4 | 0 |  | 20133-census |
| set:556 | 43 | 13 | 25 | 5 | 0 |  | 20244-random-v1 |
| set:557 | 30 | 13 | 11 | 6 | 0 |  | 20289-random-v1 |
| set:558 | 25 | 12 | 9 | 4 | 0 |  | 20231-ai-v1 |
| set:559 | 36 | 14 | 16 | 6 | 0 |  | 20017-random-v1 |
| set:560 | 26 | 11 | 10 | 5 | 0 |  | 20155-ai-v1 |
| set:561 | 25 | 7 | 11 | 7 | 0 |  | 20231-ai-v1 |
| set:562 | 27 | 13 | 5 | 9 | 0 |  | 20004-random-v1 |
| set:563 | 33 | 13 | 16 | 4 | 0 |  | 20044-random-v1 |
| set:564 | 34 | 12 | 13 | 9 | 0 |  | 20018-random-v1 |
| set:565 | 40 | 12 | 20 | 8 | 0 |  | 20031-random-v1 |
| set:566 | 50 | 14 | 29 | 7 | 0 |  | 20383-census |
| set:567 | 41 | 15 | 22 | 4 | 0 |  | 20111-ai-v1 |
| set:568 | 35 | 13 | 18 | 4 | 0 |  | 20049-random-v1 |
| set:569 | 37 | 14 | 19 | 4 | 0 |  | 20040-random-v1 |
| set:570 | 46 | 12 | 27 | 7 | 0 |  | 20049-random-v1 |
| set:571 | 34 | 12 | 19 | 3 | 0 |  | 20165-ai-v1-gold |
| set:572 | 51 | 12 | 34 | 5 | 0 |  | 20111-ai-v1 |
| set:573 | 45 | 18 | 21 | 6 | 0 |  | 20107-ai-v1 |
| set:574 | 42 | 12 | 25 | 5 | 0 |  | 20254-random-v1 |
| set:575 | 49 | 22 | 20 | 7 | 0 |  | 20111-ai-v1 |
| set:576 | 42 | 22 | 15 | 5 | 0 |  | 20178-census |
| set:577 | 46 | 16 | 26 | 4 | 0 |  | 20040-random-v1 |
| set:578 | 51 | 11 | 36 | 4 | 0 |  | 20031-random-v1 |
| set:579 | 51 | 18 | 28 | 5 | 0 |  | 20013-random-v1 |
| set:580 | 30 | 10 | 16 | 4 | 0 |  | 20013-random-v1 |
| set:581 | 39 | 14 | 22 | 3 | 0 |  | 20196-ai-v1 |
| set:582 | 40 | 19 | 16 | 5 | 0 |  | 20009-random-v1 |
| set:583 | 54 | 17 | 30 | 7 | 0 |  | 20009-random-v1 |
| set:584 | 44 | 17 | 22 | 5 | 0 |  | 20009-random-v1 |
| set:585 | 50 | 15 | 30 | 5 | 0 |  | 20138-census |
| set:586 | 48 | 18 | 25 | 5 | 0 |  | 20138-census |
| set:587 | 39 | 13 | 24 | 2 | 0 |  | 20392-ai-v1 |
| set:588 | 54 | 20 | 28 | 6 | 0 |  | 20285-ai-v1 |
| set:589 | 47 | 19 | 25 | 3 | 0 |  | 20169-random-v1 |
| set:590 | 40 | 15 | 22 | 3 | 0 |  | 20303-census |
| set:591 | 56 | 24 | 22 | 10 | 0 |  | 20022-random-v1 |
| set:592 | 44 | 13 | 29 | 2 | 0 |  | 20352-ai-v1 |
| set:593 | 32 | 9 | 20 | 3 | 0 |  | 20129-random-v1 |
| set:594 | 42 | 18 | 20 | 4 | 0 |  | 20205-ai-v1 |
| set:595 | 39 | 8 | 23 | 8 | 0 |  | 20013-random-v1 |
| set:596 | 80 | 19 | 51 | 10 | 0 |  | 20022-random-v1 |
| set:597 | 52 | 18 | 27 | 7 | 0 |  | 20013-random-v1 |
| set:598 | 40 | 14 | 17 | 9 | 0 |  | 20022-random-v1 |
| set:599 | 39 | 12 | 23 | 4 | 0 |  | 20196-ai-v1 |
| set:600 | 38 | 14 | 18 | 6 | 0 |  | 20120-ai-v1 |
| set:601 | 47 | 14 | 29 | 4 | 0 |  | 20138-census |
| set:602 | 45 | 18 | 23 | 4 | 0 |  | 20120-ai-v1 |
| set:603 | 43 | 12 | 26 | 5 | 0 |  | 20009-random-v1 |
| set:604 | 47 | 15 | 23 | 9 | 0 |  | 20009-random-v1 |
| set:605 | 43 | 17 | 21 | 5 | 0 |  | 20116-ai-v1-gold |
| set:606 | 55 | 17 | 27 | 11 | 0 |  | 20013-random-v1 |
| set:607 | 37 | 9 | 25 | 3 | 0 |  | 20040-random-v1 |
| set:608 | 43 | 14 | 21 | 8 | 0 |  | 20107-ai-v1 |
| set:609 | 36 | 9 | 19 | 8 | 0 |  | 20851-ai-v1-gold |
| set:610 | 47 | 15 | 23 | 9 | 0 |  | 20031-random-v1 |
| set:611 | 57 | 20 | 32 | 5 | 0 |  | 20138-census |
| set:612 | 53 | 23 | 24 | 6 | 0 |  | 20169-random-v1 |
| set:613 | 43 | 13 | 24 | 6 | 0 |  | 20178-census |
| set:614 | 44 | 14 | 23 | 7 | 0 |  | 20352-ai-v1 |
| set:615 | 50 | 15 | 31 | 4 | 0 |  | 20156-ai-v1 |
| set:616 | 42 | 12 | 25 | 5 | 0 |  | 20316-ai-v1 |
| set:617 | 33 | 14 | 15 | 4 | 0 |  | 20009-random-v1 |
| set:618 | 36 | 13 | 18 | 5 | 0 |  | 20022-random-v1 |
| set:619 | 37 | 13 | 23 | 1 | 0 |  | 20365-ai-v1 |
| set:620 | 48 | 18 | 28 | 2 | 0 |  | 20120-ai-v1 |
| set:621 | 44 | 15 | 27 | 2 | 0 |  | 20441-ai-v1 |
| set:622 | 53 | 19 | 26 | 8 | 0 |  | 20214-random-v1-gold |
| set:623 | 28 | 7 | 18 | 3 | 0 |  | 20116-ai-v1-gold |
| set:624 | 53 | 16 | 32 | 5 | 0 |  | 20129-random-v1 |
| set:625 | 36 | 11 | 22 | 3 | 0 |  | 20160-ai-v1 |
| set:626 | 40 | 15 | 22 | 3 | 0 |  | 20160-ai-v1 |
| set:627 | 44 | 12 | 28 | 4 | 0 |  | 20236-ai-v1 |
| set:628 | 53 | 17 | 31 | 5 | 0 |  | 20156-ai-v1 |
| set:629 | 32 | 13 | 14 | 5 | 0 |  | 20116-ai-v1-gold |
| set:630 | 35 | 14 | 21 | 0 | 0 |  | 20766-ai-v1 |
| set:631 | 47 | 17 | 26 | 4 | 0 |  | 20267-ai-v1 |
| set:632 | 50 | 19 | 22 | 9 | 0 |  | 20040-random-v1 |
| set:633 | 38 | 15 | 19 | 4 | 0 |  | 20312-ai-v1-gold |
| set:634 | 48 | 23 | 21 | 4 | 0 |  | 20156-ai-v1 |
| set:635 | 46 | 18 | 21 | 7 | 0 |  | 20013-random-v1 |
| set:636 | 32 | 11 | 16 | 5 | 0 |  | 20276-ai-v1 |
| set:637 | 48 | 17 | 25 | 6 | 0 |  | 20111-ai-v1 |
| set:638 | 44 | 12 | 27 | 5 | 0 |  | 20031-random-v1 |
| set:639 | 48 | 14 | 33 | 1 | 0 |  | 20325-ai-v1 |
| set:640 | 52 | 18 | 28 | 6 | 0 |  | 20018-random-v1 |
| set:641 | 44 | 17 | 22 | 5 | 0 |  | 20120-ai-v1 |
| set:642 | 58 | 19 | 35 | 4 | 0 |  | 20116-ai-v1-gold |
| set:643 | 54 | 18 | 31 | 5 | 0 |  | 20018-random-v1 |
| set:644 | 43 | 15 | 21 | 7 | 0 |  | 20138-census |
| set:645 | 40 | 16 | 19 | 5 | 0 |  | 20187-ai-v1 |
| set:646 | 41 | 14 | 22 | 5 | 0 |  | 20018-random-v1 |
| set:647 | 49 | 15 | 26 | 8 | 0 |  | 20405-ai-v1 |
| set:648 | 55 | 18 | 31 | 6 | 0 |  | 20107-ai-v1 |
| set:649 | 49 | 23 | 19 | 7 | 0 |  | 20218-census |
| set:650 | 56 | 14 | 37 | 5 | 0 |  | 20049-random-v1 |
| set:651 | 40 | 17 | 21 | 2 | 0 |  | 20022-random-v1 |
| set:652 | 42 | 19 | 20 | 3 | 0 |  | 20111-ai-v1 |
| set:653 | 39 | 8 | 24 | 7 | 0 |  | 20374-random-v1 |
| set:654 | 53 | 17 | 27 | 9 | 0 |  | 20022-random-v1 |
| set:655 | 49 | 14 | 28 | 7 | 0 |  | 20276-ai-v1 |
| set:656 | 43 | 14 | 25 | 4 | 0 |  | 20147-ai-v1 |
| set:657 | 38 | 10 | 23 | 5 | 0 |  | 20258-census |
| set:658 | 51 | 17 | 29 | 5 | 0 |  | 20111-ai-v1 |
| set:659 | 71 | 21 | 43 | 7 | 0 |  | 20049-random-v1 |
| set:660 | 37 | 20 | 12 | 5 | 0 |  | 20161-ai-v1 |
| set:661 | 36 | 23 | 10 | 2 | 1 |  | 20130-ai-v1 |
| set:662 | 34 | 15 | 15 | 4 | 0 |  | 20170-ai-v1 |
| set:663 | 30 | 16 | 10 | 3 | 1 |  | 20228-census |
| set:664 | 51 | 14 | 33 | 4 | 0 |  | 20103-census |
| set:665 | 28 | 13 | 8 | 7 | 0 |  | 20045-random-v1 |
| set:666 | 23 | 13 | 8 | 2 | 0 |  | 20152-ai-v1 |
| set:667 | 37 | 19 | 10 | 8 | 0 |  | 20014-random-v1 |
| set:668 | 33 | 19 | 9 | 4 | 1 |  | 20130-ai-v1 |
| set:669 | 34 | 15 | 15 | 4 | 0 |  | 20183-census |
| set:670 | 18 | 7 | 7 | 4 | 0 |  | 20005-random-v1 |
| set:671 | 32 | 11 | 15 | 6 | 0 |  | 20045-random-v1 |
| set:672 | 37 | 19 | 15 | 3 | 0 |  | 20299-random-v1 |
| set:673 | 27 | 15 | 10 | 2 | 0 |  | 20223-census |
| set:674 | 32 | 13 | 13 | 6 | 0 |  | 20326-ai-v1 |
| set:675 | 31 | 15 | 12 | 3 | 1 |  | 20250-ai-v1 |
| set:676 | 38 | 15 | 16 | 7 | 0 |  | 20112-ai-v1 |
| set:677 | 41 | 22 | 11 | 8 | 0 |  | 20201-ai-v1 |
| set:678 | 33 | 14 | 14 | 5 | 0 |  | 20014-random-v1 |
| set:679 | 18 | 5 | 10 | 3 | 0 |  | 20014-random-v1 |
| set:680 | 29 | 11 | 12 | 6 | 0 |  | 20219-random-v1 |
| set:681 | 23 | 8 | 11 | 4 | 0 |  | 20615-ai-v1 |
| set:682 | 24 | 12 | 10 | 1 | 1 |  | 20103-census |
| set:683 | 30 | 18 | 10 | 2 | 0 |  | 20152-ai-v1 |
| set:684 | 27 | 12 | 10 | 5 | 0 |  | 20103-census |
| set:685 | 27 | 15 | 4 | 8 | 0 |  | 20023-random-v1 |
| set:686 | 33 | 19 | 9 | 5 | 0 |  | 20134-random-v1 |
| set:687 | 29 | 15 | 8 | 6 | 0 |  | 20161-ai-v1 |
| set:688 | 36 | 13 | 18 | 5 | 0 |  | 20134-random-v1 |
| set:689 | 27 | 16 | 5 | 6 | 0 |  | 20446-ai-v1 |
| set:690 | 26 | 12 | 7 | 7 | 0 |  | 20023-random-v1 |
| set:691 | 32 | 20 | 7 | 5 | 0 |  | 20259-random-v1 |
| set:692 | 28 | 16 | 7 | 5 | 0 |  | 20023-random-v1 |
| set:693 | 29 | 15 | 11 | 3 | 0 |  | 20419-random-v1 |
| set:694 | 30 | 10 | 17 | 3 | 0 |  | 20045-random-v1 |
| set:695 | 35 | 18 | 12 | 5 | 0 |  | 20125-ai-v1 |
| set:696 | 27 | 12 | 12 | 3 | 0 |  | 20027-random-v1 |
| set:697 | 33 | 15 | 11 | 7 | 0 |  | 20112-ai-v1 |
| set:698 | 26 | 12 | 8 | 6 | 0 |  | 20161-ai-v1 |
| set:699 | 28 | 12 | 14 | 2 | 0 |  | 20161-ai-v1 |
| set:700 | 29 | 11 | 10 | 8 | 0 |  | 20339-random-v1 |
| set:701 | 32 | 16 | 9 | 7 | 0 |  | 20183-census |
| set:702 | 28 | 14 | 8 | 6 | 0 |  | 20317-ai-v1 |
| set:703 | 41 | 21 | 15 | 5 | 0 |  | 20277-ai-v1 |
| set:704 | 24 | 18 | 4 | 2 | 0 |  | 20027-random-v1 |
| set:705 | 48 | 20 | 22 | 6 | 0 |  | 20397-ai-v1 |
| set:706 | 27 | 13 | 7 | 7 | 0 |  | 20005-random-v1 |
| set:707 | 36 | 18 | 11 | 7 | 0 |  | 20170-ai-v1 |
| set:708 | 32 | 15 | 11 | 6 | 0 |  | 20210-ai-v1 |
| set:709 | 23 | 12 | 7 | 4 | 0 |  | 20112-ai-v1 |
| set:710 | 30 | 14 | 11 | 5 | 0 |  | 20023-random-v1 |
| set:711 | 27 | 14 | 7 | 6 | 0 |  | 20210-ai-v1 |
| set:712 | 32 | 14 | 16 | 2 | 0 |  | 20161-ai-v1 |
| set:713 | 35 | 14 | 16 | 5 | 0 |  | 20143-census |
| set:714 | 29 | 18 | 6 | 5 | 0 |  | 20317-ai-v1 |
| set:715 | 32 | 17 | 10 | 5 | 0 |  | 20375-ai-v1 |
| set:716 | 35 | 16 | 12 | 7 | 0 |  | 20032-random-v1 |
| set:717 | 37 | 16 | 16 | 5 | 0 |  | 20032-random-v1 |
| set:718 | 26 | 11 | 10 | 5 | 0 |  | 20259-random-v1 |
| set:719 | 30 | 18 | 10 | 2 | 0 |  | 20553-census |
| set:720 | 31 | 12 | 14 | 4 | 1 |  | 20130-ai-v1 |
| set:721 | 34 | 19 | 10 | 5 | 0 |  | 20112-ai-v1 |
| set:722 | 23 | 9 | 9 | 5 | 0 |  | 20036-random-v1 |
| set:723 | 41 | 21 | 12 | 8 | 0 |  | 20032-random-v1 |
| set:724 | 32 | 18 | 11 | 3 | 0 |  | 20125-ai-v1 |
| set:725 | 30 | 15 | 10 | 5 | 0 |  | 20228-census |
| set:726 | 28 | 14 | 8 | 6 | 0 |  | 20014-random-v1 |
| set:727 | 32 | 16 | 10 | 6 | 0 |  | 20103-census |
| set:728 | 37 | 14 | 17 | 6 | 0 |  | 20143-census |
| set:729 | 29 | 16 | 9 | 4 | 0 |  | 20339-random-v1 |
| set:730 | 36 | 15 | 18 | 3 | 0 |  | 20232-ai-v1 |
| set:731 | 34 | 20 | 12 | 2 | 0 |  | 20375-ai-v1 |
| set:732 | 19 | 10 | 7 | 2 | 0 |  | 20134-random-v1 |
| set:733 | 26 | 11 | 7 | 8 | 0 |  | 20103-census |
| set:734 | 35 | 22 | 10 | 3 | 0 |  | 20005-random-v1 |
| set:735 | 27 | 11 | 11 | 5 | 0 |  | 20517-ai-v1 |
| set:736 | 26 | 11 | 12 | 3 | 0 |  | 20014-random-v1 |
| set:737 | 40 | 20 | 11 | 9 | 0 |  | 20023-random-v1 |
| set:738 | 33 | 12 | 18 | 3 | 0 |  | 20045-random-v1 |
| set:739 | 37 | 13 | 17 | 7 | 0 |  | 20112-ai-v1 |
| set:740 | 33 | 17 | 11 | 5 | 0 |  | 20152-ai-v1 |
| set:741 | 25 | 10 | 9 | 6 | 0 |  | 20032-random-v1 |
| set:742 | 41 | 18 | 16 | 7 | 0 |  | 20121-ai-v1 |
| set:743 | 30 | 19 | 7 | 4 | 0 |  | 20192-ai-v1 |
| set:744 | 35 | 16 | 14 | 5 | 0 |  | 20290-ai-v1 |
| set:745 | 28 | 13 | 8 | 7 | 0 |  | 20290-ai-v1 |
| set:746 | 29 | 14 | 8 | 7 | 0 |  | 20036-random-v1 |
| set:747 | 35 | 20 | 13 | 2 | 0 |  | 20125-ai-v1 |
| set:748 | 27 | 11 | 10 | 6 | 0 |  | 20179-random-v1 |
| set:749 | 30 | 15 | 10 | 5 | 0 |  | 20232-ai-v1 |
| set:750 | 31 | 9 | 21 | 1 | 0 |  | 20183-census |
| set:751 | 33 | 16 | 12 | 5 | 0 |  | 20036-random-v1 |
| set:752 | 28 | 14 | 7 | 7 | 0 |  | 20005-random-v1 |
| set:753 | 28 | 11 | 14 | 3 | 0 |  | 20143-census |
| set:754 | 35 | 16 | 10 | 9 | 0 |  | 20174-random-v1 |
| set:755 | 28 | 11 | 13 | 4 | 0 |  | 20121-ai-v1 |
| set:756 | 6 | 5 | 1 | 0 | 0 |  | 22016-ai-v1-c7 |
| set:757 | 3 | 3 | 0 | 0 | 0 |  | 22587-ai-v1-c7 |
| set:758 | 9 | 5 | 3 | 1 | 0 |  | 22220-ai-v1-c7 |
| set:759 | 7 | 4 | 1 | 2 | 0 |  | 22091-ai-v1-c7 |
| set:760 | 9 | 6 | 1 | 2 | 0 |  | 22114-random-v1-c7 |
| set:761 | 11 | 8 | 1 | 2 | 0 |  | 22036-ai-v1-c7 |
| set:762 | 4 | 4 | 0 | 0 | 0 |  | 22035-ai-v1-c7 |
| set:763 | 11 | 8 | 2 | 1 | 0 |  | 22042-ai-v1-c7 |
| set:764 | 9 | 6 | 3 | 0 | 0 |  | 22038-census-c7 |
| set:765 | 10 | 5 | 2 | 3 | 0 |  | 22002-ai-v1-c7 |
| set:766 | 4 | 4 | 0 | 0 | 0 |  | 22001-ai-v1-c7 |
| set:767 | 7 | 3 | 3 | 1 | 0 |  | 22161-ai-v1-c7 |
| set:768 | 3 | 2 | 0 | 1 | 0 |  | 22517-ai-v1-c7 |
| set:769 | 8 | 5 | 2 | 1 | 0 |  | 22088-census-c7 |
| set:770 | 13 | 10 | 1 | 2 | 0 |  | 22016-ai-v1-c7 |
| set:771 | 8 | 4 | 2 | 2 | 0 |  | 22139-random-v1-c7 |
| set:772 | 9 | 6 | 3 | 0 | 0 |  | 22013-census-c7 |
| set:773 | 11 | 7 | 3 | 1 | 0 |  | 22036-ai-v1-c7 |
| set:774 | 10 | 4 | 6 | 0 | 0 |  | 22217-ai-v1-c7 |
| set:775 | 8 | 4 | 2 | 2 | 0 |  | 22063-census-c7 |
| set:776 | 12 | 7 | 3 | 2 | 0 |  | 22043-census-c7 |
| set:777 | 6 | 5 | 1 | 0 | 0 |  | 22278-census-c7 |
| set:778 | 6 | 4 | 1 | 1 | 0 |  | 22078-census-c7 |
| set:779 | 8 | 6 | 1 | 1 | 0 |  | 22057-ai-v1-c7 |
| set:780 | 5 | 5 | 0 | 0 | 0 |  | 22157-ai-v1-c7 |
| set:781 | 6 | 5 | 0 | 1 | 0 |  | 22194-random-v1-c7 |
| set:782 | 10 | 6 | 1 | 3 | 0 |  | 22024-random-v1-c7 |
| set:783 | 8 | 4 | 2 | 2 | 0 |  | 22137-ai-v1-c7 |
| set:784 | 14 | 12 | 1 | 1 | 0 |  | 22005-ai-v1-c7 |
| set:785 | 10 | 8 | 1 | 1 | 0 |  | 22049-random-v1-c7 |
| set:786 | 5 | 3 | 1 | 1 | 0 |  | 22302-ai-v1-c7 |
| set:787 | 6 | 5 | 0 | 1 | 0 |  | 22080-ai-v1-c7 |
| set:788 | 12 | 6 | 3 | 3 | 0 |  | 22074-random-v1-c7 |
| set:789 | 3 | 3 | 0 | 0 | 0 |  | 22042-ai-v1-c7 |
| set:790 | 8 | 7 | 1 | 0 | 0 |  | 22078-census-c7 |
| set:791 | 12 | 8 | 2 | 2 | 0 |  | 22004-random-v1-c7 |
| set:792 | 7 | 2 | 3 | 2 | 0 |  | 22064-random-v1-c7 |
| set:793 | 2 | 1 | 1 | 0 | 0 |  | 22303-census-c7 |
| set:794 | 12 | 9 | 1 | 2 | 0 |  | 22002-ai-v1-c7 |
| set:795 | 6 | 3 | 0 | 3 | 0 |  | 22181-ai-v1-c7 |
| set:796 | 4 | 3 | 0 | 1 | 0 |  | 22245-ai-v1-c7 |
| set:797 | 12 | 7 | 2 | 3 | 0 |  | 22022-ai-v1-c7 |
| set:798 | 10 | 6 | 3 | 1 | 0 |  | 22098-census-c7 |
| set:799 | 3 | 1 | 2 | 0 | 0 |  | 22393-census-c7 |
| set:800 | 14 | 10 | 3 | 1 | 0 |  | 22067-ai-v1-c7 |
| set:801 | 11 | 7 | 3 | 1 | 0 |  | 22028-census-c7 |
| set:802 | 8 | 6 | 1 | 1 | 0 |  | 22029-random-v1-c7 |
| set:803 | 10 | 6 | 2 | 2 | 0 |  | 22081-ai-v1-c7 |
| set:804 | 10 | 5 | 1 | 4 | 0 |  | 22071-ai-v1-c7 |
| set:805 | 7 | 5 | 2 | 0 | 0 |  | 22131-ai-v1-c7 |
| set:806 | 8 | 4 | 2 | 2 | 0 |  | 22054-random-v1-c7 |
| set:807 | 8 | 3 | 2 | 3 | 0 |  | 22162-ai-v1-c7 |
| set:808 | 6 | 3 | 3 | 0 | 0 |  | 22055-ai-v1-c7 |
| set:809 | 13 | 9 | 3 | 1 | 0 |  | 22058-census-c7 |
| set:810 | 8 | 5 | 1 | 2 | 0 |  | 22122-ai-v1-c7 |
| set:811 | 7 | 7 | 0 | 0 | 0 |  | 22016-ai-v1-c7 |
| set:812 | 8 | 2 | 4 | 2 | 0 |  | 22084-random-v1-c7 |
| set:813 | 10 | 7 | 0 | 3 | 0 |  | 22012-ai-v1-c7 |
| set:814 | 6 | 4 | 2 | 0 | 0 |  | 22072-ai-v1-c7 |
| set:815 | 6 | 5 | 0 | 1 | 0 |  | 22202-ai-v1-c7 |
| set:816 | 9 | 4 | 3 | 2 | 0 |  | 22008-census-c7 |
| set:817 | 7 | 5 | 2 | 0 | 0 |  | 22028-census-c7 |
| set:818 | 6 | 4 | 1 | 1 | 0 |  | 22092-ai-v1-c7 |
| set:819 | 15 | 6 | 6 | 3 | 0 |  | 22037-ai-v1-c7 |
| set:820 | 4 | 4 | 0 | 0 | 0 |  | 22150-ai-v1-c7 |
| set:821 | 12 | 10 | 0 | 2 | 0 |  | 22107-ai-v1-c7 |
| set:822 | 10 | 5 | 2 | 3 | 0 |  | 22068-census-c7 |
| set:823 | 8 | 5 | 0 | 3 | 0 |  | 22057-ai-v1-c7 |
| set:824 | 11 | 7 | 3 | 1 | 0 |  | 22002-ai-v1-c7 |
| set:825 | 13 | 8 | 2 | 3 | 0 |  | 22030-ai-v1-c7 |
| set:826 | 6 | 3 | 2 | 1 | 0 |  | 22132-ai-v1-c7 |
| set:827 | 10 | 7 | 3 | 0 | 0 |  | 22033-census-c7 |
| set:828 | 7 | 5 | 1 | 1 | 0 |  | 22022-ai-v1-c7 |
| set:829 | 8 | 2 | 4 | 2 | 0 |  | 22153-census-c7 |
| set:830 | 6 | 5 | 0 | 1 | 0 |  | 22047-ai-v1-c7 |
| set:831 | 8 | 5 | 2 | 1 | 0 |  | 22097-ai-v1-c7 |
| set:832 | 8 | 5 | 2 | 1 | 0 |  | 22017-ai-v1-c7 |
| set:833 | 6 | 4 | 0 | 2 | 0 |  | 22101-ai-v1-c7 |
| set:834 | 11 | 4 | 3 | 4 | 0 |  | 22040-ai-v1-c7 |
| set:835 | 5 | 5 | 0 | 0 | 0 |  | 22075-ai-v1-c7 |
| set:836 | 4 | 1 | 1 | 2 | 0 |  | 22073-census-c7 |
| set:837 | 6 | 3 | 1 | 2 | 0 |  | 22062-ai-v1-c7 |
| set:838 | 8 | 7 | 0 | 1 | 0 |  | 22007-ai-v1-c7 |
| set:839 | 5 | 4 | 1 | 0 | 0 |  | 22050-ai-v1-c7 |
| set:840 | 10 | 6 | 4 | 0 | 0 |  | 22052-ai-v1-c7 |
| set:841 | 12 | 7 | 3 | 2 | 0 |  | 22012-ai-v1-c7 |
| set:842 | 4 | 3 | 0 | 1 | 0 |  | 22027-ai-v1-c7 |
| set:843 | 8 | 2 | 5 | 1 | 0 |  | 22059-random-v1-c7 |
| set:844 | 7 | 3 | 2 | 2 | 0 |  | 22108-census-c7 |
| set:845 | 6 | 6 | 0 | 0 | 0 |  | 22102-ai-v1-c7 |
| set:846 | 7 | 5 | 0 | 2 | 0 |  | 22047-ai-v1-c7 |
| set:847 | 7 | 6 | 0 | 1 | 0 |  | 22025-ai-v1-c7 |
| set:848 | 10 | 5 | 4 | 1 | 0 |  | 22085-ai-v1-c7 |
| set:849 | 10 | 5 | 1 | 4 | 0 |  | 22014-random-v1-c7 |
| situation:entry:intimidate | 1260 | 356 | 475 | 253 | 176 |  | 20002-random-v1 |
| situation:entry:spikes-damage | 265 | 20 | 31 | 22 | 192 |  | 20199-random-v1 |
| situation:field:future-sight:hits | 339 | 81 | 86 | 27 | 145 |  | 20033-random-v1 |
| situation:field:future-sight:misses | 114 | 14 | 26 | 12 | 62 |  | 20042-random-v1 |
| situation:field:rapid-spin:clears | 6 | 0 | 0 | 0 | 6 |  | stage-rapid-spin |
| situation:field:wish:comes-true | 585 | 90 | 217 | 37 | 241 |  | 20031-random-v1 |
| situation:field:wish:full-hp | 227 | 41 | 63 | 9 | 114 |  | 20140-ai-v1 |
| situation:item:knocked-off | 272 | 28 | 78 | 22 | 144 |  | 20010-random-v1 |
| situation:item:stolen | 12 | 2 | 2 | 0 | 8 |  | 20572-ai-v1 |
| situation:move-refused:choice-band | 25 | 0 | 0 | 25 | 0 |  | 20022-random-v1 |
| situation:move-refused:disable | 8 | 0 | 0 | 2 | 6 |  | stage-disable-refused |
| situation:move-refused:imprison | 37 | 0 | 0 | 0 | 37 |  | stage-imprison |
| situation:move-refused:no-pp | 1998 | 0 | 0 | 115 | 1883 |  | 20021-random-v1 |
| situation:move-refused:taunt | 7 | 0 | 0 | 2 | 5 |  | 20389-random-v1 |
| situation:move-refused:torment | 36 | 0 | 0 | 21 | 15 |  | 20389-random-v1 |
| situation:move:critical-hit | 6784 | 1588 | 2574 | 729 | 1893 |  | 20001-random-v1 |
| situation:move:forced-encore | 360 | 27 | 219 | 27 | 87 |  | 20029-random-v1 |
| situation:move:forced-struggle | 20306 | 1001 | 13494 | 418 | 5393 |  | 20022-random-v1 |
| situation:move:multi-turn-forced-continuation | 10051 | 555 | 6968 | 230 | 2298 |  | 20022-random-v1 |
| situation:move:not-very-effective | 14785 | 3157 | 6213 | 1976 | 3439 |  | 20001-random-v1 |
| situation:move:super-effective | 15112 | 5281 | 5429 | 1747 | 2655 |  | 20001-random-v1 |
| situation:outcome:draw | 29 | 11 | 14 | 4 | 0 |  | 20103-census |
| situation:outcome:player-lost | 2923 | 624 | 1327 | 534 | 438 |  | 20002-random-v1 |
| situation:outcome:player-won | 2133 | 1008 | 601 | 118 | 406 |  | 20001-random-v1 |
| situation:screen:light-screen:ends | 834 | 133 | 353 | 90 | 258 |  | 20003-random-v1 |
| situation:screen:light-screen:halves-a-hit | 543 | 153 | 138 | 87 | 165 |  | 20019-random-v1 |
| situation:screen:mist:blocks-stat-drop | 6 | 0 | 0 | 0 | 6 |  | stage-metronome-lock-on |
| situation:screen:mist:ends | 15 | 0 | 0 | 0 | 15 |  | stage-metronome-lock-on |
| situation:screen:reflect:ends | 656 | 55 | 299 | 29 | 273 |  | 20036-random-v1 |
| situation:screen:reflect:halves-a-hit | 384 | 63 | 180 | 13 | 128 |  | 20036-random-v1 |
| situation:screen:safeguard:blocks-status | 81 | 8 | 31 | 6 | 36 |  | 20162-ai-v1 |
| situation:screen:safeguard:ends | 476 | 55 | 115 | 34 | 272 |  | 20019-random-v1 |
| situation:status:burn:end-turn-damage | 1456 | 234 | 462 | 152 | 608 |  | 20022-random-v1 |
| situation:status:burn:inflicted | 497 | 107 | 177 | 61 | 152 |  | 20022-random-v1 |
| situation:status:freeze:cannot-move | 475 | 67 | 326 | 49 | 33 |  | 20123-census |
| situation:status:freeze:inflicted | 187 | 41 | 105 | 24 | 17 |  | 20123-census |
| situation:status:freeze:thawed-by-fire-move | 7 | 3 | 4 | 0 | 0 |  | 20276-ai-v1 |
| situation:status:freeze:thaws | 107 | 14 | 64 | 13 | 16 |  | 20204-random-v1 |
| situation:status:paralysis:cannot-move | 6542 | 906 | 3069 | 435 | 2132 |  | 20001-random-v1 |
| situation:status:paralysis:inflicted | 2640 | 737 | 978 | 306 | 619 |  | 20001-random-v1 |
| situation:status:poison:end-turn-damage | 1429 | 231 | 412 | 189 | 597 |  | 20016-random-v1 |
| situation:status:poison:inflicted | 495 | 108 | 169 | 77 | 141 |  | 20016-random-v1 |
| situation:status:sleep:cannot-move | 8768 | 1551 | 5486 | 739 | 992 |  | 20003-random-v1 |
| situation:status:sleep:inflicted | 2146 | 459 | 1151 | 220 | 316 |  | 20003-random-v1 |
| situation:status:sleep:wakes | 3678 | 641 | 2320 | 309 | 408 |  | 20003-random-v1 |
| situation:status:toxic:end-turn-damage | 3128 | 729 | 1554 | 304 | 541 |  | 20004-random-v1 |
| situation:status:toxic:inflicted | 898 | 206 | 464 | 81 | 147 |  | 20004-random-v1 |
| situation:switch:baton-pass-passes-stages | 163 | 37 | 72 | 18 | 36 |  | 20013-random-v1 |
| situation:switch:forced-out-by-roar | 1490 | 234 | 770 | 274 | 212 |  | 20001-random-v1 |
| situation:switch:forced-replacement | 8813 | 2490 | 3612 | 1281 | 1430 |  | 20001-random-v1 |
| situation:switch:natural-cure-on-switch-out | 39 | 8 | 9 | 11 | 11 |  | 20030-random-v1 |
| situation:switch:pursuit-hits-the-switch | 5 | 0 | 0 | 1 | 4 |  | 20006-random-v1 |
| situation:switch:refused:arena-trap | 5 | 0 | 0 | 5 | 0 |  | 20334-random-v1 |
| situation:switch:refused:ingrain | 108 | 0 | 0 | 49 | 59 |  | 20794-random-v1 |
| situation:switch:refused:magnet-pull | 1 | 0 | 0 | 0 | 1 |  | stage-magnet-pull |
| situation:switch:refused:mean-look | 448 | 0 | 0 | 19 | 429 |  | 20050-random-v1 |
| situation:switch:refused:shadow-tag | 99 | 0 | 0 | 55 | 44 |  | 20029-random-v1 |
| situation:switch:refused:wrap | 74 | 0 | 0 | 35 | 39 |  | 20010-random-v1 |
| situation:switch:voluntary | 4433 | 73 | 0 | 1703 | 2657 |  | 20001-random-v1 |
| situation:volatile:bide:attacks | 8 | 0 | 1 | 0 | 7 |  | 9801-census |
| situation:volatile:bide:stores | 38 | 0 | 2 | 0 | 36 |  | 9801-census |
| situation:volatile:confusion:ends | 2387 | 427 | 973 | 259 | 728 |  | 20001-random-v1 |
| situation:volatile:confusion:hits-itself | 3727 | 726 | 1529 | 440 | 1032 |  | 20002-random-v1 |
| situation:volatile:confusion:inflicted | 3637 | 724 | 1498 | 472 | 943 |  | 20001-random-v1 |
| situation:volatile:confusion:turn | 7410 | 1430 | 3008 | 818 | 2154 |  | 20001-random-v1 |
| situation:volatile:curse:end-turn-damage | 28 | 14 | 8 | 6 | 0 |  | 20152-ai-v1 |
| situation:volatile:destiny-bond:takes-life | 49 | 16 | 27 | 6 | 0 |  | 20192-ai-v1 |
| situation:volatile:disable:blocks-chosen-move | 46 | 13 | 22 | 2 | 9 |  | 20022-random-v1 |
| situation:volatile:disable:ends | 148 | 23 | 68 | 12 | 45 |  | 20011-random-v1 |
| situation:volatile:encore:ends | 154 | 17 | 86 | 8 | 43 |  | 20011-random-v1 |
| situation:volatile:endure:holds | 60 | 12 | 29 | 12 | 7 |  | 20014-random-v1 |
| situation:volatile:flinch:cannot-move | 915 | 233 | 264 | 109 | 309 |  | 20012-random-v1 |
| situation:volatile:focus-punch:tightens | 753 | 260 | 409 | 84 | 0 |  | 20005-random-v1 |
| situation:volatile:grudge:takes-pp | 35 | 13 | 15 | 5 | 2 |  | 20436-ai-v1 |
| situation:volatile:imprison:blocks-chosen-move | 6 | 0 | 0 | 0 | 6 |  | stage-imprison |
| situation:volatile:infatuation:cannot-move | 2916 | 580 | 1612 | 214 | 510 |  | 20001-random-v1 |
| situation:volatile:infatuation:turn | 5882 | 1187 | 3238 | 468 | 989 |  | 20001-random-v1 |
| situation:volatile:ingrain:end-turn-heal | 1857 | 265 | 442 | 126 | 1024 |  | 20027-random-v1 |
| situation:volatile:leech-seed:end-turn-drain | 2939 | 607 | 1930 | 225 | 177 |  | 20004-random-v1 |
| situation:volatile:magic-coat:bounces | 57 | 2 | 6 | 2 | 47 |  | 20113-census |
| situation:volatile:magic-coat:bounces-under-pressure | 12 | 0 | 0 | 0 | 12 |  | stage-magic-coat-pressure |
| situation:volatile:nightmare:end-turn-damage | 77 | 19 | 57 | 1 | 0 |  | 20106-ai-v1 |
| situation:volatile:perish-song:count | 449 | 105 | 240 | 30 | 74 |  | 20102-ai-v1 |
| situation:volatile:perish-song:faint | 128 | 21 | 80 | 9 | 18 |  | 20213-census |
| situation:volatile:rage:builds | 4 | 0 | 0 | 0 | 4 |  | stage-rage-builds |
| situation:volatile:rampage:confuses | 302 | 48 | 57 | 25 | 172 |  | 20024-random-v1 |
| situation:volatile:recharge:turn | 84 | 5 | 18 | 4 | 57 |  | 20189-random-v1 |
| situation:volatile:snatch:steals | Snatch can never run: no Level 50 set has it, Metronome may not call it (sMovesForbiddenToCopy, battle_script_commands.c:725-747, used by Cmd_metronome :7898-7921), and no set has Mirror Move, Assist or Mimic; a move those could copy after a Metronome call is still never Snatch | 0 | 0 | 0 | 0 |  |  |
| situation:volatile:substitute:breaks | 384 | 74 | 255 | 42 | 13 |  | 20004-random-v1 |
| situation:volatile:taunt:blocks-chosen-move | 26 | 2 | 13 | 3 | 8 |  | 20010-random-v1 |
| situation:volatile:torment:blocks-chosen-move | dead script: no C code references BattleScript_MoveUsedIsTormented (only its declaration, battle_scripts.h:81); Torment acts at move selection only (battle_util.c:999-1012), which is the row move-refused:torment | 0 | 0 | 0 | 0 |  |  |
| situation:volatile:uproar:turn | 273 | 8 | 60 | 9 | 196 |  | 20211-ai-v1 |
| situation:volatile:uproar:wakes | 1 | 0 | 0 | 0 | 1 |  | stage-uproar-wakes |
| situation:volatile:uproar:wakes-at-move | 4 | 0 | 3 | 0 | 1 |  | 161-census |
| situation:volatile:wrap:end-turn-damage | 1638 | 207 | 383 | 184 | 864 |  | 20010-random-v1 |
| situation:volatile:wrap:ends | 289 | 38 | 74 | 35 | 142 |  | 20010-random-v1 |
| situation:volatile:wrap:inflicted | 670 | 82 | 156 | 77 | 355 |  | 20010-random-v1 |
| situation:volatile:yawn:sleep | 456 | 73 | 289 | 35 | 59 |  | 20034-random-v1 |
| situation:weather:hail:damage | 1091 | 260 | 437 | 85 | 309 |  | 20006-random-v1 |
| situation:weather:hail:started-by-move | 448 | 93 | 203 | 42 | 110 |  | 20006-random-v1 |
| situation:weather:rain:continues | 3447 | 1020 | 1489 | 411 | 527 |  | 20007-random-v1 |
| situation:weather:rain:ends | 695 | 197 | 300 | 84 | 114 |  | 20007-random-v1 |
| situation:weather:rain:started-by-move | 992 | 312 | 423 | 117 | 140 |  | 20007-random-v1 |
| situation:weather:sand-or-hail:ends | 956 | 197 | 377 | 111 | 271 |  | 20006-random-v1 |
| situation:weather:sandstorm:damage | 1649 | 357 | 544 | 216 | 532 |  | 20020-random-v1 |
| situation:weather:sandstorm:started-by-move | 726 | 166 | 264 | 94 | 202 |  | 20020-random-v1 |
| situation:weather:sun:continues | 2536 | 745 | 1169 | 307 | 315 |  | 20003-random-v1 |
| situation:weather:sun:ends | 531 | 150 | 246 | 62 | 73 |  | 20003-random-v1 |
| situation:weather:sun:started-by-move | 720 | 220 | 327 | 90 | 83 |  | 20003-random-v1 |
