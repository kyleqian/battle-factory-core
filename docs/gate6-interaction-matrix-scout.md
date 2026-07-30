# Gate 6 interaction-matrix scout (Battle Scene OFF)

## Scope and reading rule

This is a dispatch matrix, not a cross-product claim.  It enumerates the
source-level couplings between the eight Gate-6 axes that can change a
Level-50 Factory singles outcome or ordering.  `status` means major status;
`volatile` includes status2/status3 and side-state that changes a battler's
turn or switch lifecycle; `immunity/absorb` means type, ability, and
semi-invulnerable gates that make an attempted effect fail.  A row marked
`NONE` has no reviewed Tier-1 *pairwise* proof, even if the constituent hook
is covered elsewhere.

The coverage column is deliberately limited to test files opened for this
scout: `battleScriptDamagingWeatherOpcode.test.ts`,
`battleScriptMoveEndOpcode.test.ts`,
`battleScriptStatbuffchangeOpcode.test.ts`, and
`battleScriptSwitchinOpcode.test.ts`.  Thus it does not over-credit a grep
hit in an unreviewed test.

The recipe shorthand is a complete `mechanicLab.overrides.parties` battle:
all mons are level 50, legal ability slots for their species, six ordinary
IV/EV fields, and two inert bench mons per side.  Put the listed opponent move
in all four slots to constrain Factory AI to its one legal choice; the player
selects its named move.  This is the preferred builder because it preserves
all three party records and entry hooks (see `tools/battle-lab/README.md`).

## Legal closures

The ability/item census's Level-50 carrier table is the Factory-corpus
legality check used here.  It closes the following source mechanisms, rather
than silently omitting them:

* **UNREACHABLE (3 entry-weather setters):** Drizzle, Sand Stream, and
  Drought each have zero Level-50 carriers.  Their source branches are real
  (`reference/pokeemerald/src/battle_util.c:2490-2558`), but they cannot occur
  in a legal Level-50 Factory party; `docs/ability-item-parity-census.md`,
  ability worklist, records each as `zero-carrier`.
* **UNREACHABLE (1 weather suppressor):** Air Lock likewise has zero
  Level-50 carriers, although it shares the global weather predicate with
  Cloud Nine (`reference/pokeemerald/include/battle_util.h:47-48`);
  the same census records it `zero-carrier`.
* **UNREACHABLE (16 carrierless combat hold-effect rows):** Figy, Wiki, Mago,
  Aguav, Iapapa, Ganlon, Apicot, Lansat, Starf, Macho Brace, Double Prize,
  Soul Dew, DeepSeaTooth, Spell Tag, Dragon Fang, and Lucky Punch are not new
  interaction slices.  The precise closure is the census's hold-effect
  worklist (each row `zero-carrier`); this scout retains only carrier-backed
  generic item mechanisms below.  Their handler family is still source-real
  (`reference/pokeemerald/src/battle_util.c:3303-3330,3331-3605`), so this is
  a **16-effect negative closure**, not a claim that the source has none.

`Shed Shell` is not a Gen-III item/effect, so it is not an unreachable
Factory case and must not be added as one.  The only switch-time held-item
handler relevant here is the source's `ITEMEFFECT_ON_SWITCH_IN`
(`reference/pokeemerald/src/battle_util.c:3303-3329`).

## Enumerated pair matrix

The source citation on every row is the mechanism evidence.  Recipe IDs refer
to the concrete staging cards in the next section; a `K` prefix means a pure
kernel test is the appropriate first proof and no oracle is needed to discover
the state transition.

| Axis pair | Distinct source mechanism(s) | Existing Tier-1 coverage | Gap / first proof |
| --- | --- | --- | --- |
| weather x status | Sun prevents a new freeze; weather itself is not a major-status cure. `seteffect` checks sun before Ice type/Magma Armor (`battle_script_commands.c:2380-2393`). | NONE | R1 oracle: Sunny Day then Ice Beam freeze attempt; compare sun/no-sun. |
| weather x volatile | Sand/hail chip skips underground and underwater; weather also changes Thunder's accuracy while semi-invulnerability is checked first (`battle_script_commands.c:1062-1094`, `7602-7635`). | `tests/battleScriptDamagingWeatherOpcode.test.ts` (underground weather chip) | R2 oracle: Dig on sand/hail turn, then surface. |
| weather x held-item | The only shared scheduling boundary is end-turn: abilities, normal items, then Leech Seed/poison are sequenced by `DoBattlerEndTurnEffects` (`battle_util.c:1494-1533`); weather damage is a separate script loop (`battle_scripts_1.s:3200-3222`). No weather-specific held-item branch exists. | NONE | K1: ordering property (weather chip vs Leftovers/Sitrus) in the end-turn orchestrator; oracle only if event order differs. |
| weather x ability | Cloud Nine/Air Lock suppress **all** `WEATHER_HAS_EFFECT`; Forecast changes Castform's type in rain/sun/hail; Rain Dish, Swift Swim and Chlorophyll read active weather; Sand Veil changes accuracy (`battle_util.h:47-48`; `battle_util.c:2396-2427,2601-2648`; `battle_script_commands.c:1152-1155`). Air Lock is UNREACHABLE; Cloud Nine/Forecast and the speed/end-turn abilities are legal. | `tests/battleScriptDamagingWeatherOpcode.test.ts` (Cloud Nine, Sand Veil); `tests/battleScriptSwitchinOpcode.test.ts` (weather entry scheduling) | R3, R4: Cloud Nine removal restores weather, then Forecast/type and speed timing. |
| weather x stat-stage | Accuracy calculation applies accuracy/evasion stages before sun-Thunder and Sand Veil modifiers (`battle_script_commands.c:1128-1155`). | NONE | K2: parameterized accuracy stage x sun/rain/sand property. |
| weather x switching/entry | Entry weather abilities set permanent weather exactly on switch-in; subsequent same-weather entries are a no-op (`battle_util.c:2485-2558`). Drizzle/Sand Stream/Drought are **UNREACHABLE (3)** at L50; Cloud Nine is a legal entry suppression case. | `tests/battleScriptSwitchinOpcode.test.ts` (Drizzle/Sand Stream/Drought unit mechanics) | R3 oracle uses legal Golduck Cloud Nine against manually created Rain Dance, not unreachable setter staging. |
| weather x immunity/absorb | Type immunity (Rock/Ground/Steel vs sand, Ice vs hail), Sand Veil, and underground/underwater suppress weather chip (`battle_script_commands.c:7606-7635`); Cloud Nine globally suppresses the predicate (`battle_util.h:47-48`). | `tests/battleScriptDamagingWeatherOpcode.test.ts` | Covered single-axis; R2/R3 make the pairwise boundary explicit. |
| status x volatile | Sleep clears Nightmare when cured; confusion, paralysis, and infatuation are independent ordered attack-canceler gates (`battle_util.c:2040-2054,2156-2218`). | NONE | K3: sleep+Nightmare then Chesto/Lum, and paralysis+confusion RNG ledger property. |
| status x held-item | Chesto clears sleep and Nightmare; condition berries cure their matching major status; Lum clears any major status plus confusion (`battle_util.c:3499-3591`). | `tests/battleScriptMoveEndOpcode.test.ts` (Cheri/Lum move-end activation) | R5 oracle: Hypnosis/Confuse Ray into Chesto vs Lum timing. |
| status x ability | Natural Cure clears major status on switch-out; Guts/Marvel Scale read status for stats; immunities reject sleep/poison/burn/freeze/paralysis and Own Tempo rejects confusion (`battle_script_commands.c:9590-9604,2360-2435,2531-2545`; `battle_util.c:2873-2945`). | `tests/battleScriptMoveEndOpcode.test.ts` (ability status cures/Own Tempo) | R6: poisoned Natural Cure switch; R7: burn Guts damage/stat. |
| status x stat-stage | Burn's physical Attack modifier and paralysis speed modifier belong in stat calculation, while status application does not itself mutate stages; stage mutation is separately clamped (`battle_script_commands.c:7085-7089`). | NONE | K4: damage/speed property with fixed stages, status on/off. |
| status x switching/entry | Ordinary switching rebuilds the incoming record; Natural Cure only clears the departing major status (`battle_script_commands.c:4621-4657,9590-9604`). | `tests/battleScriptSwitchinOpcode.test.ts` (rebuild semantics) | R6 oracle. |
| status x immunity/absorb | Type/ability gates prevent status before durable mutation: Fire blocks burn, Ice blocks freeze, Limber blocks paralysis, Immunity blocks poison (`battle_script_commands.c:2360-2425`). | `tests/battleScriptMoveEndOpcode.test.ts` (immunity cure pass) | R8: Toxic/Thunder Wave versus Immunity/Limber with an ordinary control target. |
| volatile x held-item | Persim/Lum cure confusion; Mental Herb cures attraction; White Herb restores negative stages, including at move-end (`battle_util.c:3383-3398,3540-3601,3739-3755`). | `tests/battleScriptMoveEndOpcode.test.ts` (Lum confusion) | R9: Swagger into Lum/White Herb distinguishes volatile cure from stage restore. |
| volatile x ability | Own Tempo blocks confusion, Oblivious blocks attraction, Soundproof blocks sound-based state effects; end-turn ability hooks run before item hooks (`battle_script_commands.c:2531-2545,7676-7689,8387-8516`; `battle_util.c:1494-1507`). | `tests/battleScriptMoveEndOpcode.test.ts` (Own Tempo) | R10: Attract into Oblivious and Uproar/Perish Song into Soundproof. |
| volatile x stat-stage | Swagger/Flatter-like effects combine a volatile application with a stat change; accuracy/evasion stages combine with Foresight's volatile exception (`battle_script_commands.c:1128-1142`; stat application `7085-7089`). | NONE | K5: Swagger should set confusion and +2 Attack exactly once; Foresight ignores target evasion only. |
| volatile x switching/entry | Ordinary switch replaces state; Baton Pass preserves `status2` and all stat stages, then clear-set-data handles the remainder (`battle_script_commands.c:4621-4657`). | `tests/battleScriptSwitchinOpcode.test.ts` (ordinary clear/Baton Pass retain) | R11 oracle: Substitute/Focus Energy/Baton Pass versus ordinary switch. |
| volatile x immunity/absorb | Semi-invulnerable state blocks ordinary targeting; it also suppresses weather chip only underground/underwater (`battle_script_commands.c:1062-1085,7606-7635`). | `tests/battleScriptDamagingWeatherOpcode.test.ts` | R2 oracle (shared with weather). |
| held-item x ability | Entry/fainted-action orchestration invokes Intimidate/Trace before normal item effects, so an Intimidate-created negative stage can feed White Herb (`battle_util.c:1959-1964,3305-3329`). | `tests/battleScriptSwitchinOpcode.test.ts` (Intimidate/Trace); `tests/battleScriptMoveEndOpcode.test.ts` (item effects) | R12 oracle: Granbull Intimidate into White Herb recipient; assert message/order/item consumption. |
| held-item x stat-stage | White Herb restores every negative stage, and threshold berries raise a stage only below the cap (`battle_util.c:3383-3398,3431-3496`). | `tests/battleScriptMoveEndOpcode.test.ts` (item activation) | R9 oracle plus K6 cap/reset parameter test. |
| held-item x switching/entry | White Herb has an explicit switch-in handler that normalizes negative stages (`battle_util.c:3305-3329`); a normal switch reconstructs the party item unless Knock Off recorded it (`battle_script_commands.c:4637-4646`). | `tests/battleScriptSwitchinOpcode.test.ts` (item reconstruction) | R12 oracle. |
| held-item x immunity/absorb | No held-item branch changes an ability/type absorb result in Gen III; item effects run only after damage/effect eligibility.  Absorb handler is ability-only (`battle_util.c:2676-2747`) and item dispatch is separate (`3257-3330`). | NONE | K7: dispatch property—Volt/Water Absorb and Flash Fire consume no berry/Leftovers path on zero damage. |
| ability x stat-stage | Clear Body/White Smoke block most preventable drops; Keen Eye blocks accuracy and Hyper Cutter Attack specifically; Intimidate creates an Attack drop (`battle_script_commands.c:6975-7038`; `battle_util.c:3003-3087`). | `tests/battleScriptStatbuffchangeOpcode.test.ts` (Clear Body); `tests/battleScriptSwitchinOpcode.test.ts` (Intimidate blockers) | R13: Intimidate × each specificity class, source message/order. |
| ability x switching/entry | Switch-in scan queues weather, Intimidate, Trace, and Forecast; Natural Cure is the distinct switch-out hook (`battle_util.c:1959-1964,2485-2596`; `battle_script_commands.c:9590-9604`). | `tests/battleScriptSwitchinOpcode.test.ts` | R6/R12/R13 cover legal ordered combinations. |
| ability x immunity/absorb | Volts/Water Absorb and Flash Fire use the absorbing handler; Levitate, Wonder Guard, Soundproof and status immunities gate effects elsewhere (`battle_util.c:2676-2747`; `battle_script_commands.c:1375-1496,2275-2425`). | `tests/battleScriptMoveEndOpcode.test.ts` (status immunity); `tests/battleScriptSwitchinOpcode.test.ts` (Levitate entry) | R14: flash/water/electric absorb versus type control, then R10 Soundproof. |
| stat-stage x switching/entry | Normal switch discards stages because full incoming BattlePokemon overwrites the active record; Baton Pass copies all stages first (`battle_script_commands.c:4621-4657`). | `tests/battleScriptSwitchinOpcode.test.ts` | R11 oracle. |
| stat-stage x immunity/absorb | The stat-drop immunity family is the boundary: Clear Body/White Smoke/Keen Eye/Hyper Cutter and Shield Dust suppress eligible drops (`battle_script_commands.c:6975-7038`). | `tests/battleScriptStatbuffchangeOpcode.test.ts` | R13 oracle. |
| switching/entry x immunity/absorb | Spikes damages only a non-Flying, non-Levitate switch-in (`battle_script_commands.c:5219-5254`); switch-in also obtains the incoming ability from species/slot (`4637-4646`). | `tests/battleScriptSwitchinOpcode.test.ts` | R15 oracle: three Spikes layers, Flying/Levitate/type control. |

## Concrete staging cards for uncovered rows

All recipes use profile `battle-scene-off`, `mode: mechanicLab`, and the
README's complete-party schema.  `A/B` means player/opponent active; benches
are legal inert duplicates with `[Tackle,Tackle,Tackle,Tackle]`.

| ID | Parties and controller route | Assertion |
| --- | --- | --- |
| R1 | A: Articuno, Ice Beam; B: Vileplume, Sunny Day, then repeat without Sun. Opponent four Sunny Day slots for its one choice. | Freeze status never appears under Sun; control can freeze. |
| R2 | A: Dugtrio, Dig; B: Tyranitar, Sandstorm x4 (or Hail user/Hail x4). | Active underground ignores chip; surfacing re-enables it. |
| R3 | A: Golduck abilitySlot=1 (Cloud Nine), Rain Dance; B: neutral Tackle x4. Switch Golduck out after rain is live. | Weather flag remains but chip/accuracy resumes only after Cloud Nine leaves. |
| R4 | A: Castform Forecast, Weather Ball; B: Rain Dance x4. | Entry/form/update gives Water type and Weather Ball changes; this is the Forecast boundary. |
| R5 | A: Chesto Snorlax, Rest; B: Gengar Hypnosis x4; repeat Lum holder with Confuse Ray source. | Chesto clears sleep and Nightmare; Lum clears the selected status/confusion path. |
| R6 | A: Starmie Natural Cure, Recover; bench: neutral. B: Muk Toxic x4. Apply Toxic, voluntarily switch, then return. | Departing Starmie party status becomes clear; ordinary incoming state is rebuilt. |
| R7 | A: Ursaring Guts, Facade; B: Ninetales Will-O-Wisp x4. | Burn appears and Facade damage/stat result is the Guts branch. |
| R8 | A: Muk Immunity (or Lanturn); B: Toxic x4; repeat B Thunder Wave x4 versus Limber Persian. | No durable status or incorrect cure message; control target is affected. |
| R9 | A: Lum/White Herb Machamp; B: Gengar Swagger x4. | Lum removes confusion but not Attack boost; White Herb restores stage but leaves confusion. |
| R10 | A: Lickitung Oblivious; B: compatible-gender Attract x4; second card A: Exploud Soundproof, B: Perish Song x4. | Attraction/sound volatile is rejected through its ability branch. |
| R11 | A: Ninjask Substitute then Baton Pass; bench: recipient. B: passive Tackle x4. Repeat ordinary manual switch. | Baton Pass retains intended status2/stages; ordinary switch clears them. |
| R12 | A: White Herb Pinsir; B: Granbull Intimidate x4; switch Granbull in after initial player action. | Attack cut then White Herb restore, ordered messages and consumed item. |
| R13 | A: Pinsir Hyper Cutter / Torkoal White Smoke / Pidgeot Keen Eye; B: Granbull Intimidate x4 or Sand-Attack x4. | Correct protected stat and prevention message; unrelated stat can still fall. |
| R14 | A: Lanturn Volt Absorb, Lombre Water Absorb, Houndoom Flash Fire; B has Thunder/Water Gun/Ember respectively x4. | Zero direct damage and correct heal/Flash Fire state against type controls. |
| R15 | A: Spikes user sets three layers; B bench switches to Pidgeot then Levitate Lunatone and a grounded control. Opponent uses Tackle x4. | Flying/Levitate avoid Spikes, grounded mon takes source fraction. |

K1--K7 are deliberately Tier-1-first: they assert pure reducer/dispatcher
ordering, stage arithmetic, and zero-damage non-activation.  A successful
kernel proof is enough because the source citations specify no controller/UI
or ROM-only randomness at those boundaries; promote only a mismatch to a
mechanicLab trace.

## Ranked dispatch shortlist

Each line is one bounded worker slice, not an instruction to create all traces
at once.  Use a fresh `mktemp -d` output directory and retain only the checked
in scenario/evidence once accepted.

1. **R12 — Intimidate x White Herb x entry ordering.** Highest risk because it crosses three dispatch loops and item consumption.  `bin/oracle lab tools/battle-lab/gate6-r12-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptSwitchinOpcode.test.ts tests/battleScriptMoveEndOpcode.test.ts; npm run build`
2. **R11 — Baton Pass versus ordinary-switch volatile/stage retention.** `bin/oracle lab tools/battle-lab/gate6-r11-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptSwitchinOpcode.test.ts; npm run build`
3. **R6 — Toxic x Natural Cure switch-out persistence.** `bin/oracle lab tools/battle-lab/gate6-r6-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptSwitchinOpcode.test.ts tests/battleScriptMoveEndOpcode.test.ts; npm run build`
4. **R15 — Spikes switch-in x Flying/Levitate.** `bin/oracle lab tools/battle-lab/gate6-r15-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptSwitchinOpcode.test.ts; npm run build`
5. **R3 — Cloud Nine removal/reactivation.** `bin/oracle lab tools/battle-lab/gate6-r3-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptDamagingWeatherOpcode.test.ts; npm run build`
6. **R9 — Swagger x Lum versus White Herb.** `bin/oracle lab tools/battle-lab/gate6-r9-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptMoveEndOpcode.test.ts; npm run build`
7. **R13 — Intimidate x stat-drop prevention specificity.** `bin/oracle lab tools/battle-lab/gate6-r13-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptStatbuffchangeOpcode.test.ts tests/battleScriptSwitchinOpcode.test.ts; npm run build`
8. **R14 — absorb ability x typed attack.** `bin/oracle lab tools/battle-lab/gate6-r14-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptMoveEndOpcode.test.ts; npm run build`
9. **R5 — sleep/confusion x Chesto/Lum exact cure timing.** `bin/oracle lab tools/battle-lab/gate6-r5-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptMoveEndOpcode.test.ts; npm run build`
10. **R1 — sun x freeze prevention.** `bin/oracle lab tools/battle-lab/gate6-r1-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptDamagingWeatherOpcode.test.ts; npm run build`

The remaining lower-risk kernel-first cards are K1 (end-turn item/weather
order), K2 (weather-stage accuracy), K3 (major/volatile canceler ordering),
K4 (status modifiers at fixed stages), K5 (Swagger/Foresight), K6 (White Herb
cap/reset), and K7 (absorb bypasses item activation).  They are intentionally
not inflated into oracle work until their pure contract fails.
