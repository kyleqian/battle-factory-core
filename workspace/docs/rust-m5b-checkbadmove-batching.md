# Rust M5b batching scout — `factoryAiCheckBadMove.ts` partition

Written 2026-08-11 by a bounded rust-lane docs-only worker, for the M5b
native-port session(s) `docs/rust-m5-scout.md` opens next. Docs-only step;
no code/test/ledger touched. Source: `src/engine/factoryAiCheckBadMove.ts`
(3657 lines) + `tests/factoryAiCheckBadMove.test.ts` (4692 lines), both
read in full. TS side is **109/109 table effects ported** — verified
directly, not from doc prose: `AI_CHECK_BAD_MOVE_TABLE_EFFECTS` is a
109-entry `Set` with zero dupes; `CHECK_BAD_MOVE_HANDLED_TABLE_EFFECTS`
has 131 raw entries but only 109 unique; `unportedCheckBadMoveTableEffects()`
run live returns `[]`. The dispatcher's trailing barrier (:2639-2647, §5)
is dead code today, kept for honesty against future table growth — the
Rust port's `NotYetPorted` variant is its analog *during* the port.

## 1. Module anatomy

- **Data heads** (123-316): `MOVES_BY_ID`/`SPECIES_BY_ID` (126-133) are
  thin re-projections of `moves.json`/`species-stats.json`, **superseded
  by M5a's `gen_tables::MOVES`/`SPECIES`** — no new data. `TYPE_EFFECTIVENESS`
  (135) **= M4b's `gen_tables::TYPE_EFFECTIVENESS_TABLE`**, already
  promoted. New, hand-portable (not codegen) sets: `AI_WEATHER_*`/
  `ABILITY_ID_IN_WEATHER_RANGE` (144-169, the `Cmd_get_weather` stale-
  `funcResult` bug's 4-entry collision table), `IGNORED_POWERFUL_MOVE_EFFECTS`
  (171-185, 12 effects), `TRAPPER_ABILITIES`/`NEGATING_ABILITIES`/
  `SOUNDPROOF_MOVES` (190-215). `AI_CHECK_BAD_MOVE_TABLE_EFFECTS`/
  `CHECK_BAD_MOVE_HANDLED_TABLE_EFFECTS`/`unportedCheckBadMoveTableEffects`
  (223-316) are the completeness-probe machinery, Rust analog in §3.
- **New representation decision**: TS compares `move.effect` (a string)
  to `"EFFECT_X"` literals; `gen_tables::MoveRow.effect` is already the
  numeric id M5a parsed from `battle_move_effects.h` (`gen_tables.rs:11493-11503`).
  M5b needs its own hand-written `EFFECT_*: u16` const block from that
  header's `#define`s (e.g. `EFFECT_SLEEP=1`, `EFFECT_COUNTER=89`,
  confirmed at `reference/pokeemerald/include/constants/battle_move_effects.h:5,93`)
  — ~90 named literals, same convention as `factory_ai_mask.rs`'s
  hand-written `FACTORY_LEVEL_MODE_*` consts, no codegen needed.
- **Input/result types**: `FactoryAiCheckBadMoveTarget` (342-487, 22
  fields, ~15 optional-with-documented-default) and `FactoryAiCheckBadMoveAttacker`
  (498-687, 27 fields, ~24 optional) thread through every handler — plain
  structs, `Option<T>` only where TS uses `?:`, one default per field
  exactly as documented. `FactoryAiCheckBadMoveRoarTarget` (2708-2711)
  adds one field for Roar/Explosion. `FactoryAiCheckBadMoveDraw`/`Result`
  (689-712) should mirror `factory_ai_mask.rs`'s fixed-array-plus-count
  receipt (no heap `Vec`); size the draws array to the worst case seen
  (Magnitude's 2).
- **RNG draw plumbing**, shared infra every batch needs, port once first:
  `nextGetAbilityDraw` (714-747, trapper short-circuit → `knownAbility`
  cache → single-ability species → genuine `advanceRngValue` draw; **never
  caches, redraws at every call site**, module's headline quirk file:1-12)
  and `checkAbilityAiTarget` (771-785, distinct zero-RNG sibling used only
  by SpeedDown's Speed Boost gate).
- **`runCheckBadMovePreamble`** (1259-2650, 1392 lines) is the entire
  per-slot entry point AND the full dispatch chain in one function, not a
  small preamble plus a switch: setup + global preamble (1259-1333, §5),
  then 87 `if (move.effect === ...)` blocks in source order covering all
  109 effects (script-verified, zero left over), then the trailing
  barrier/fallthrough (2639-2650, §5). Handler bodies live both before
  (787-1253) and after (2652-3657) — JS hoists declarations so TS
  ordering is arbitrary; Rust may order them however's convenient.

## 2. Effect-group partition (109 effects, 87 dispatch blocks)

No batch splits a shared-handler cluster (script-verified: no `||`-joined
or same-function-reuse block straddles a boundary below). Each entry:
`EFFECT(s)` (dispatch lines/handler lines).

### M5b-1 — damage-adjacent cluster + weather + zero-RNG singles (32 effects, small)

- **HighRiskForDamage cluster, one handler, do not split** (18):
  `COUNTER,FLAIL,MIRROR_COAT,FOCUS_PUNCH,LEVEL_DAMAGE,FRUSTRATION,RETURN,
  RECHARGE,ENDEAVOR,SUPERPOWER,RAZOR_WIND,PSYWAVE,LOW_KICK,SUPER_FANG,
  PRESENT,SONICBOOM,BIDE,SKULL_BASH` — dispatch 1338-1689 (18 near-identical
  ~16-line blocks), handler `runCbmHighRiskForDamage` 2681-2707.
- `TELEPORT` (1694-1701, bare -10, no handler fn).
- 8 zero-RNG single-flag effects (~10-line handlers, 3158-3255): `INGRAIN`
  (1707-1714), `PERISH_SONG`(1720-1727), `NIGHTMARE`(1733-1740, 2-branch),
  `FORESIGHT`(1746-1753), `SPIKES`(1759-1766), `FUTURE_SIGHT`(1772-1782,
  2-branch), `FOCUS_ENERGY`(1788-1795), `REFRESH`(1802-1809).
- Weather quartet (2076-2118): `RAIN_DANCE,SUNNY_DAY,HAIL` share
  `runCbmWeatherSetter` (1209-1230), `SANDSTORM` its own wrapper (1238-1240).
  **Cross-batch data dependency**: all four read `soundproofGuess`, a
  value the M5b-0 preamble already computed this pass (stale-`funcResult`
  bug, 1191-1207) — not a fresh draw, but not testable fully independent
  of M5b-0's output either.
- `MAGNITUDE` (2410-2419/3331-3361) — own Levitate draw then falls
  through to `runCbmHighRiskForDamage`; must ride with that cluster.
- Tests: `tests/factoryAiCheckBadMove.test.ts:30-931` (18 HighRisk
  describes), `:932-1208` (Teleport + 8 singles), `:3277-3498` (weather
  quartet, incl. stale-`funcResult` sub-describe `:3352-3443`), `:4012-4074`
  (Magnitude).

### M5b-2 — RNG-gated status/stat-DOWN family (33 effects, large — most complex handlers)

`OHKO`(2180-2196/2846-2868), `LEECH_SEED`(2200-2209/2886-2902, zero-RNG),
`FAKE_OUT`(2213-2220/2918-2920, zero-RNG), `WILL_O_WISP`(2224-2239/2942-2966),
`SLEEP`(2135-2144/2722-2742), `ROAR`(2122-2131/2976-2995, needs
`FactoryAiCheckBadMoveRoarTarget`), `PARALYZE`(2148-2157/2773-2797, needs
`computeAiEffectiveness` 2757-2765 — shared util, also used by WillOWisp/
OneHitKO/Explosion/SpitUpAndSwallow/DreamEater; port once, here),
`CONFUSE+SWAGGER+FLATTER`(2163-2176/2805-2825, 3→1), `TOXIC+POISON`
(2063-2072/1148-1172, 2→1). Stat-DOWN shared-tail sextet, all calling one
`runCbmStatDownViaSharedTail` (859-873, port once here): `SPEED_DOWN+_2`
(1813-1822/796-812), `ATTACK_DOWN+_2`(1826-1835/824-848, 2 ability
draws), `DEFENSE_DOWN+_2`(1839-1848/922-929), `SPECIAL_DEFENSE_DOWN+_2`
(1852-1861/931-938), `ACCURACY_DOWN+_2`(1867-1876/896-920), `EVASION_DOWN+_2`
(2050-2059/1123-1130), `SPECIAL_ATTACK_DOWN+_2`(2446-2455/3404-3411).
Plus `KNOCK_OFF+TRICK`(2244-2258/3006-3022), `ATTRACT`(2534-2543/3523-3547,
gender-pairing, the module's most branchy handler), `EXPLOSION`
(2287-2303/3056-3085), `DREAM_EATER`(2332-2339/3123-3131), `SPIT_UP+SWALLOW`
(2577-2584/3607-3616).
Tests: `:1209-1554` (OHKO/LeechSeed/FakeOut/WillOWisp), `:1716-2042`
(Sleep/Roar/Paralyze/Confuse/Toxic), `:2042-2484` (SpeedDown/AttackDown/
DefenseDown/SpDefDown), `:2912-3050` (AccDown), `:3175-3277` (EvasionDown),
`:4092-4150` (SpAtkDown), `:3498-3546` (KnockOff/Trick), `:4356-4438`
(Attract), `:3629-3694` (Explosion), `:3782-3821` (DreamEater), `:4520-4564`
(SpitUp/Swallow).

### M5b-3 — stat-UP family, screens, remaining zero-RNG singles (44 effects, cheapest despite highest count)

All zero-RNG (BellyDrum/Substitute do a deterministic hp%). `ATTACK_UP+_2`
(1881-1888/956-958), `DEFENSE_UP+_2+CURL`(1892-1903/969-971, 3→1),
`BULK_UP`(1907-1914/990-992) and `CURSE`(1920-1927, separate dispatch,
**reuses `runCbmBulkUp` unchanged**), `SPEED_UP+_2`(1931-1938/1001-1003),
`SPECIAL_ATTACK_UP+_2`(1942-1949/1011-1013), `SPECIAL_DEFENSE_UP+_2`
(1954-1961/2672-2674), `COSMIC_POWER`(1966-1976/1032-1034, composes
DefenseUp), `CALM_MIND`(1981-1991/1042-1044, composes SpAtkUp),
`DRAGON_DANCE`(1996-2006/1061-1063, composes AttackUp), `LIGHT_SCREEN`
(2011-2018/1079-1081), `REFLECT`(2023-2030/1089-1091), `EVASION_UP+_2+MINIMIZE`
(2035-2046/1111-1113, 3→1), `ACCURACY_UP+_2`(2429-2436/3380-3382,
**vestigial, zero Gen-3 moves carry it**, file:2425-2428), `SAFEGUARD`
(2263-2270/3031-3033), `SNORE+SLEEP_TALK`(2275-2282/3042-3044), `BATON_PASS`
(2308-2315/3093-3095), `SUBSTITUTE`(2320-2327/3105-3113), `MEAN_LOOK`
(2344-2351/3140-3142), `TORMENT`(2356-2363/3149-3151), `HELPING_HAND`
(2371-2378/3264-3266, **constant -10**, singles-only engine), `TICKLE`
(2384-2391/3311-3314), `BELLY_DRUM`(2397-2404/3286-3294, composes
AttackUp), `MEMENTO`(2549-2556/3568-3576, composes BatonPass), `STOCKPILE`
(2563-2570/3584-3586), `RECYCLE`(2591-2598/3625-3627), `IMPRISON`
(2604-2611/3635-3637), `MUD_SPORT`(2617-2624/3645-3647), `WATER_SPORT`
(2630-2637/3655-3657), `HAZE`(2464-2471/3435-3454, 14-comparison chain)
and `PSYCH_UP`(2477-2484, **reuses `runCbmHaze` unchanged**), `MIST`
(2491-2498/3463-3465), `DISABLE`(2505-2512/3473-3475), `ENCORE`
(2519-2526/3483-3485).
Tests: `:2484-2913` (AttackUp/DefenseUp/BulkUp, Curse, SpeedUp/SpAtkUp,
SpDefUp, CosmicPower/CalmMind, DragonDance), `:3050-3175` (LightScreen/
Reflect, EvasionUp), `:4074-4092` (AccUp), `:3546-3629` (Safeguard,
DamageDuringSleep), `:3694-4012` (BatonPass, Substitute, CantEscape,
Torment, HelpingHand, Tickle, BellyDrum), `:4150-4356` (Haze, PsychUp,
Mist, Disable, Encore), `:4438-4692` (Memento, Stockpile, Recycle,
Imprison, MudSport, WaterSport — SpitUp/Swallow already cited in M5b-2).

32 + 33 + 44 = 109, cross-checked against the live `Set` sizes above.

## 3. Partial-port contract for the Rust side

Mirror the TS `AI_CHECK_BAD_MOVE_TABLE_EFFECTS`/`CHECK_BAD_MOVE_HANDLED_
TABLE_EFFECTS`/`unportedCheckBadMoveTableEffects` precedent exactly: a
`CBM_TABLE_EFFECTS: [u16; 109]` const (ported once, M5b-1) plus one
`CBM_HANDLED_EFFECTS_M5B1/2/3: &[u16]` const per landed batch, unioned by
`cbm_handled_effects()` — grows by one const per batch, "add the effect
in the same commit as its handler" (TS doc comment :262-264). A
`fn unported_cbm_table_effects() -> Vec<u16>` sorted set-difference is the
direct port of `unportedCheckBadMoveTableEffects`. `CheckBadMoveResult`
needs a third variant, `NotYetPorted { effect: u16, move_id: u16 }`,
returned by the trailing barrier (Rust analog of TS :2639-2647) for any
table effect not yet dispatched, so a partial module stays runnable and
honest, not a stub. One completeness-probe native test per landed batch,
generic over `unported_cbm_table_effects()` — mirrors `assertGenericCbmBarrierFires`
(test:1495-1536): pick the first move id carrying an unported effect via
a `first_move_id_with_effect` helper (mirrors `firstMoveIdWithEffect`,
test:5/323-328) and assert `NotYetPorted`; empty vec flips the assertion
to "every table effect's first move now scores" (test:1522-1528).

## 4. Vector-sweep axes and TS quirks to preserve

- **Sweep axis**: one TS-generated vector block per effect/cluster, M4a's
  per-ability/hold-item convention — each effect's own `describe` block
  (§2) for directed cases, then a seeded random sweep over that handler's
  own fields only (stat stages 0..12, ability known/unknown/trapper, seed).
- **Never-caches** (file:1-12): `nextGetAbilityDraw` redraws fresh at
  every call site, even the two static preamble sites in one pass — sweep
  a 2+-draw case and assert RNG state advances each time (test:1582-1593).
- **`checkAbilityAiTarget`'s `abilityDummyVariable` collapse** (file:758-769):
  SpeedDown's Speed Boost gate is zero-RNG; a same-slot-ability species
  can never register a match — a genuine source quirk, port exactly.
- **Stale `funcResult` weather bug** (file:1191-1207): weatherless battles
  read the preceding AI script command's leftover value, which for CBM is
  always the same-pass soundproof guess — carry `ABILITY_ID_IN_WEATHER_
  RANGE` and the §2 cross-batch dependency.
- **`computeAiEffectiveness`'s no-effect-then-nonzero clamp** (file:2744-2756):
  Electric vs Ground/Flying resolves to 1, not 0 — preserve exactly, it
  changes OHKO/Paralyze/WillOWisp/Explosion/DreamEater/SpitUpAndSwallow
  outcomes. Distinct from `typeMultiplierTenths` (no such clamp) — two
  different type-effectiveness functions in this module, do not merge.
- **Vestigial dispatches, ported anyway** (file:1864-1866,2425-2428,
  3374-3400): `ACCURACY_DOWN_2`, `ACCURACY_UP(+_2)`, `SPECIAL_ATTACK_DOWN(+_2)`
  reach no real Gen-3 move, so native tests must call their handlers
  directly — TS exports `runCbmAccUp`/`runCbmSpAtkDown` for exactly this
  (file:3380,3404); keep the Rust equivalents `pub(crate)`.
- **Same-function, separate-dispatch pairs** (keep two match arms, one
  function — do not fold into `||`): `CURSE`→`runCbmBulkUp`,
  `PSYCH_UP`→`runCbmHaze`.

## 5. Preamble/global-checks: recommend its own M5b-0 step

`runCheckBadMovePreamble`'s non-effect-specific flow — setup +
`isMovePowerOther` classification (1259-1290), FISSURE/HORN_DRILL OHKO
short-circuit (1284-1286), type-immunity `Score_Minus10` (1290-1296), the
5 ability-negation branches (1297-1325), the Soundproof 9-move check
(1328-1333), and the trailing barrier/fallthrough (2639-2650) — deserves
its own first native-port step, before M5b-1: (a) `nextGetAbilityDraw`/
`checkAbilityAiTarget`/`typeMultiplierTenths` are shared infra every
later batch calls; (b) M5b-1's weather quartet has a real data dependency
on this preamble's `soundproofGuess` output (§2/§4); (c) it has its own
dedicated 162-line test block (`tests/factoryAiCheckBadMove.test.ts:1554-1716`,
"AI_CheckBadMove universal preamble") plus generic-barrier assertions
threaded through every other describe block — pins independent of which
effect batches have landed. Call it M5b-0; M5b-1/2/3 each depend on it,
not on each other.
