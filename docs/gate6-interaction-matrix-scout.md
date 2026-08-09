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
`battleScriptHitChainOpcode.test.ts`,
`battleScriptMoveEndOpcode.test.ts`,
`battleScriptStatbuffchangeOpcode.test.ts`, and
`battleScriptSwitchinOpcode.test.ts`, plus the absorption consumer pin in
`damageCalc.test.ts`.  Thus it does not over-credit a grep hit in an
unreviewed test.

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
| weather x status | Sun prevents a new freeze; weather itself is not a major-status cure. `seteffect` checks sun before Ice type/Magma Armor (`battle_script_commands.c:2380-2393`). | `tests/battleScriptHitChainOpcode.test.ts` (freeze applies without weather and is blocked by active sun) | R1 receipts the RNG-gated Ice Beam pair on two freeze-producing seeds. |
| weather x volatile | Sand/hail chip skips underground and underwater; weather also changes Thunder's accuracy while semi-invulnerability is checked first (`battle_script_commands.c:1062-1094`, `7602-7640`). | `tests/battleScriptDamagingWeatherOpcode.test.ts` (underground weather chip); `tests/gate6WeatherVolatileInteractions.test.ts` (R2 full weather pass, damage/message order); `tests/gate6R2Receipt.test.ts` (compact OFF receipt) | R2 complete: Dig under Hail, then surface, paired with a grounded two-turn control. |
| weather x held-item | The only shared scheduling boundary is end-turn: abilities, normal items, then Leech Seed/poison are sequenced by `DoBattlerEndTurnEffects` (`battle_util.c:1494-1533`); weather damage is a separate script loop (`battle_scripts_1.s:3200-3222`). No weather-specific held-item branch exists. | `tests/gate6KernelInteractions.test.ts` (K1: sand chip precedes Leftovers/Sitrus activation, exact HP event sequences, Sitrus threshold crossing, no-weather controls) | K1 complete (kernel proof; event order matched source, no oracle promotion needed). |
| weather x ability | Cloud Nine/Air Lock suppress **all** `WEATHER_HAS_EFFECT`; Forecast changes Castform's type in rain/sun/hail; Rain Dish, Swift Swim and Chlorophyll read active weather; Sand Veil changes accuracy (`battle_util.h:47-48`; `battle_util.c:2396-2427,2955-2970`; `battle_script_commands.c:1152-1155`). Air Lock is UNREACHABLE; Cloud Nine/Forecast and the speed/end-turn abilities are legal. | `tests/battleScriptDamagingWeatherOpcode.test.ts` (Cloud Nine, Sand Veil); `tests/battleScriptSwitchinOpcode.test.ts` (weather entry scheduling); `tests/gate6WeatherAbilityInteractions.test.ts` (R4 Forecast form/type pairs, Weather Ball type/power under every weather, exact two-seed damage); `tests/gate6R3Receipt.test.ts` (legal removal/reactivation receipt) | R4 and R3 complete: same-turn Forecast/Weather Ball behavior is paired with the legal Golduck Cloud Nine → neutral Rattata switch; Castform stays Normal while Cloud Nine is present, then becomes Water and uses Weather Ball after the switch. |
| weather x stat-stage | Accuracy calculation applies accuracy/evasion stages before sun-Thunder and Sand Veil modifiers (`battle_script_commands.c:1128-1155`). | `tests/gate6KernelInteractions.test.ts` (K2: sun/rain/sand across stages -2/0/+2; sun boundaries 30/50/83, Sand Veil 33/56/92, rain Thunder zero-RNG guaranteed hit) | K2 complete — and it caught a real kernel defect: `battleScriptHitChainOpcode.ts` hardcoded weather inactive in accuracy checks (rain-Thunder bypass, sun-Thunder 50, Sand Veil all missing); fixed source-cited in `450cf532`. |
| weather x switching/entry | Entry weather abilities set permanent weather exactly on switch-in; subsequent same-weather entries are a no-op (`battle_util.c:2485-2558`). Drizzle/Sand Stream/Drought are **UNREACHABLE (3)** at L50; Cloud Nine is a legal entry suppression case. | `tests/battleScriptSwitchinOpcode.test.ts` (Drizzle/Sand Stream/Drought unit mechanics); `tests/gate6R3Receipt.test.ts` (ordinary party-menu switch and preserved weather timer) | R3 complete: Rain Dance sets the real field flag/timer, the player switch replaces Cloud Nine with neutral Rattata without clearing rain, and the post-switch Forecast/Weather Ball consumer sees active rain. |
| weather x immunity/absorb | Type immunity (Rock/Ground/Steel vs sand, Ice vs hail), Sand Veil, and underground/underwater suppress weather chip (`battle_script_commands.c:7606-7640`); Cloud Nine globally suppresses the predicate (`battle_util.h:47-48`). | `tests/battleScriptDamagingWeatherOpcode.test.ts`; `tests/gate6WeatherVolatileInteractions.test.ts` (R2); `tests/gate6R2Receipt.test.ts` (R2 compact receipt); `tests/gate6R3Receipt.test.ts` (Cloud Nine suppression/removal boundary) | R2/R3 complete: R2 receipts the concrete hail immunity/underground gate, while R3 receipts the global Cloud Nine suppression and its reactivation after switching. |
| status x volatile | Sleep clears Nightmare when cured; confusion, paralysis, and infatuation are independent ordered attack-canceler gates (`battle_util.c:2040-2054,2156-2218`). | `tests/gate6KernelInteractions.test.ts` (K3: Chesto/Lum clear sleep+Nightmare, preserve unrelated infatuation; confusion → paralysis → infatuation gate order; resumable RNG ledger with skipped draws pinned on early-outs) | K3 complete (kernel proof). |
| status x held-item | Chesto clears sleep and Nightmare; condition berries cure their matching major status; Lum clears any major status plus confusion (`battle_util.c:3499-3591`). | `tests/battleScriptMoveEndOpcode.test.ts` (Cheri/Lum move-end activation); `tests/gate6EntryItemInteractions.test.ts` (R5 Chesto sleep+Nightmare and Lum confusion specificity) | R5 receipts exact Chesto/Lum controller timing. |
| status x ability | Natural Cure clears major status on switch-out; Guts/Marvel Scale read status for stats; immunities reject sleep/poison/burn/freeze/paralysis and Own Tempo rejects confusion (`battle_script_commands.c:9590-9604,2360-2435,2531-2545`; `battle_util.c:2873-2945`). | `tests/battleScriptMoveEndOpcode.test.ts` (ability status cures/Own Tempo); `tests/gate6StatusAbilityInteractions.test.ts` (R7 complete burn/Guts/Facade scripts, arithmetic, and chip) | R6 complete; R7 complete with two-seed OFF-ROM receipts. |
| status x stat-stage | Burn's physical Attack modifier and paralysis speed modifier belong in stat calculation, while status application does not itself mutate stages; stage mutation is separately clamped (`battle_script_commands.c:7085-7089`). | `tests/gate6KernelInteractions.test.ts` (K4: burn Attack-halving and paralysis speed-quartering live in stat/damage calc with fixed stages; status application never mutates stages; burn + +2 Attack combined case in source order) | K4 complete (kernel proof, `8b63e15e`). |
| status x switching/entry | Ordinary switching rebuilds the incoming record; Natural Cure only clears the departing major status (`battle_script_commands.c:4621-4657,9590-9604`). | `tests/battleScriptSwitchinOpcode.test.ts` (rebuild semantics) | R6 oracle. |
| status x immunity/absorb | Type/ability gates prevent status before durable mutation: Fire blocks burn, Ice blocks freeze, Limber blocks paralysis, Immunity blocks poison (`battle_script_commands.c:2360-2425`). | `tests/battleScriptMoveEndOpcode.test.ts` (immunity cure pass); `tests/gate6StatusImmunityInteractions.test.ts` (R8 complete primary-effect scripts and ordinary controls) | R8 complete with paired two-seed OFF-ROM receipts. |
| volatile x held-item | Persim/Lum cure confusion; Mental Herb cures attraction; White Herb restores negative stages, including at move-end (`battle_util.c:3383-3398,3540-3601,3739-3755`). | `tests/battleScriptMoveEndOpcode.test.ts` (Lum confusion); `tests/gate6R9Receipt.test.ts` (legal Swagger/Lum versus White Herb receipt) | R9 complete: Lum cures confusion then consumes itself without undoing Swagger's +2 Attack, while White Herb has no negative stage to restore and remains held through confusion. |
| volatile x ability | Own Tempo blocks confusion, Oblivious blocks attraction, Soundproof blocks sound-based state effects; end-turn ability hooks run before item hooks (`battle_script_commands.c:2531-2545,7676-7695,8508-8533`; `battle_util.c:1494-1507`). | `tests/battleScriptTryinfatuatingOpcode.test.ts`; `tests/battleScriptTrysetperishsongOpcode.test.ts`; `tests/gate6VolatileAbilityInteractions.test.ts` | R10 complete: paired Attract/Oblivious receipt plus Soundproof partial-immunity receipt. |
| volatile x stat-stage | Swagger/Flatter-like effects combine a volatile application with a stat change; accuracy/evasion stages combine with Foresight's volatile exception (`battle_script_commands.c:1128-1142`; stat application `7085-7089`). | `tests/gate6KernelInteractions.test.ts` (K5: Swagger emits exactly one 6→8 Attack change + confusion; Own Tempo still receives +2 before rejecting confusion; Foresight ignores target evasion only, attacker accuracy stays active; `battle_scripts_1.s:1608-1629`) | K5 complete (kernel proof, `f368de69`). |
| volatile x switching/entry | Ordinary switch replaces state; Baton Pass preserves `status2` and all stat stages, then clear-set-data handles the remainder (`battle_script_commands.c:4621-4657`). | `tests/battleScriptSwitchinOpcode.test.ts` (ordinary clear/Baton Pass retain) | R11 oracle: Substitute/Focus Energy/Baton Pass versus ordinary switch. |
| volatile x immunity/absorb | Semi-invulnerable state blocks ordinary targeting; it also suppresses weather chip only underground/underwater (`battle_script_commands.c:1062-1085,7606-7635`). | `tests/battleScriptDamagingWeatherOpcode.test.ts`; `tests/gate6R2Receipt.test.ts` | R2 compact OFF receipt (shared with weather). |
| held-item x ability | Entry/fainted-action orchestration invokes Intimidate/Trace before normal item effects, so an Intimidate-created negative stage can feed White Herb (`battle_util.c:1959-1964,3305-3329`). Pinsir cannot demonstrate that interaction: its sole legal ability is Hyper Cutter, which prevents Intimidate's Attack drop before the item can activate (`species_info.h:3819-3843`). | `tests/battleScriptSwitchinOpcode.test.ts` (Intimidate/Trace); `tests/battleScriptMoveEndOpcode.test.ts` (item effects) | R12 is the Pinsir prevention control; R12b uses legal White Herb Machamp (Guts) for the activation/order/consumption proof. |
| held-item x stat-stage | White Herb restores every negative stage, and threshold berries raise a stage only below the cap (`battle_util.c:3383-3398,3431-3496`). | `tests/battleScriptMoveEndOpcode.test.ts` (item activation); `tests/gate6KernelInteractions.test.ts` (K6: Liechi/Salac/Petaya parameterized across stages 0/5/6/10/11/12 — activation only below the +6 cap; White Herb restores all negative stages exactly once and stays held when nothing is restorable; Ganlon/Apicot stay excluded as zero-carrier); `tests/gate6R9Receipt.test.ts` (positive-stage guard) | K6/R9/R12b complete: R9's +2 Swagger result proves that White Herb stays held when no negative stage exists. |
| held-item x switching/entry | White Herb has an explicit switch-in handler that normalizes negative stages (`battle_util.c:3305-3329`); a normal switch reconstructs the party item unless Knock Off recorded it (`battle_script_commands.c:4637-4646`). | `tests/battleScriptSwitchinOpcode.test.ts` (item reconstruction) | R12 oracle. |
| held-item x immunity/absorb | No held-item branch changes an ability/type absorb result in Gen III; item effects run only after damage/effect eligibility.  Absorb handler is ability-only (`battle_util.c:2676-2747`) and item dispatch is separate (`3257-3330`). | `tests/gate6EntryItemInteractions.test.ts` (K7: all three matching redirects preserve Sitrus before damage/item dispatch) | Closed by K7; no new ROM fixture needed. |
| ability x stat-stage | Clear Body/White Smoke block most preventable drops; Keen Eye blocks accuracy and Hyper Cutter Attack specifically; Intimidate creates an Attack drop (`battle_script_commands.c:6975-7038`; `battle_util.c:3003-3087`). | `tests/battleScriptStatbuffchangeOpcode.test.ts` (Clear Body/White Smoke/Keen Eye/Hyper Cutter specificity); `tests/battleScriptSwitchinOpcode.test.ts` (Intimidate blockers); `tests/gate6EntryItemInteractions.test.ts` (R13 Pidgeot pair) | R13 fixture receipts the paired Keen Eye-specific block and unrelated Intimidate Attack drop. |
| ability x switching/entry | Switch-in scan queues weather, Intimidate, Trace, and Forecast; Natural Cure is the distinct switch-out hook (`battle_util.c:1959-1964,2485-2596`; `battle_script_commands.c:9590-9604`). | `tests/battleScriptSwitchinOpcode.test.ts` | R6/R12/R13 cover legal ordered combinations. |
| ability x immunity/absorb | Volt/Water Absorb and Flash Fire use the absorbing handler; Levitate, Wonder Guard, Soundproof and status immunities gate effects elsewhere (`battle_util.c:2676-2747`; `battle_script_commands.c:1375-1496,2275-2425`). | `tests/battleScriptHitChainOpcode.test.ts` (all three matching/mismatched types, full/partial HP, Flash Fire state); `tests/damageCalc.test.ts` (Flash Fire damage consumer); `tests/battleScriptMoveEndOpcode.test.ts` (status immunity); `tests/battleScriptSwitchinOpcode.test.ts` (Levitate entry); `tests/battleScriptTrysetperishsongOpcode.test.ts` (Soundproof) | R14 already covered; Volt Absorb additionally has two-seed OFF-ROM receipts. R10 Soundproof is now independently receipted. |
| stat-stage x switching/entry | Normal switch discards stages because full incoming BattlePokemon overwrites the active record; Baton Pass copies all stages first (`battle_script_commands.c:4621-4657`). | `tests/battleScriptSwitchinOpcode.test.ts` | R11 oracle. |
| stat-stage x immunity/absorb | The stat-drop immunity family is the boundary: Clear Body/White Smoke/Keen Eye/Hyper Cutter and Shield Dust suppress eligible drops (`battle_script_commands.c:6975-7038`). | `tests/battleScriptStatbuffchangeOpcode.test.ts` | R13 oracle. |
| switching/entry x immunity/absorb | Spikes damages only a non-Flying, non-Levitate switch-in (`battle_script_commands.c:5219-5254`); switch-in also obtains the incoming ability from species/slot (`4637-4646`). | `tests/battleScriptSwitchinOpcode.test.ts` | R15 complete: three layers, real Flying/Levitate entries, and a grounded three-layer control. |

## Concrete staging cards for uncovered rows

All recipes use profile `battle-scene-off`, `mode: mechanicLab`, and the
README's complete-party schema.  `A/B` means player/opponent active; benches
are legal inert duplicates with `[Tackle,Tackle,Tackle,Tackle]`.

| ID | Parties and controller route | Assertion |
| --- | --- | --- |
| R1 | `gate6-r1-sun-off.json`: faster player Vileplume uses Sunny Day, then constrained Articuno uses Ice Beam. `gate6-r1-control-off.json`: the identical parties/turn use Growth, a legal non-weather move with the same zero-RNG setup shape. | On seeds selected because the control's Ice Beam secondary roll freezes, both scenarios consume the same move RNG states; only active sun prevents status `0x20`. |
| R2 | `gate6-r2-hail-off.json`: A: Dugtrio, Dig x4; B: Articuno, Hail x4. `gate6-r2-hail-control-off.json` replaces Dig with Growl x4. Hail is required here: Dugtrio's Ground type independently makes the suggested Sandstorm pairing permanently immune. | Compact OFF receipt: active underground ignores chip; surfacing re-enables exact `floor(maxHP/16)` chip; the grounded control takes it every end turn. |
| R3 | A: Golduck abilitySlot=1 (Cloud Nine), Rain Dance; B: Castform abilitySlot=0 (Forecast), Weather Ball x4. Switch Golduck out to the neutral Rattata bench after rain is live. | While Cloud Nine is active, rain remains `weather=1` but Forecast stays Normal; after the real switch, the timer remains live, Forecast changes Castform to Water, and a subsequent Weather Ball is selected under active rain. |
| R4 | `gate6-r4-off.json`: A: Castform Forecast, Weather Ball x4; B: Rain Dance x4. `gate6-r4-control-off.json` changes only the opponent move to Splash x4. | Rain Dance's same-turn form pass sets Water type/form before Weather Ball; the paired control stays Normal. The long rain fixture also receipts expiry and Normal reversion. |
| R5 | `gate6-r5-off.json`: Chesto Snorlax uses Rest twice versus Tackle x4 (the first full-HP failure stages real damage; the second Rest succeeds). `gate6-r5-lum-off.json`: Lum Machamp versus Duskull Confuse Ray x4. | Chesto clears Rest sleep/Nightmare and is consumed only after its wake message; Lum clears the RNG-duration confusion and is consumed after its distinct cure message. |
| R6 | A: Starmie Natural Cure, Recover; bench: neutral. B: Muk Toxic x4. Apply Toxic, voluntarily switch, then return. | Departing Starmie party status becomes clear; ordinary incoming state is rebuilt. |
| R7 | `gate6-r7-off.json`: Ursaring Guts/Facade versus Ninetales Will-O-Wisp x4. | Burn, exact Guts + Facade damage, and the independent end-turn chip are all receipted. |
| R8 | `gate6-r8-off.json`: Snorlax Immunity versus Roselia Toxic x4; `gate6-r8-control-off.json` changes only Snorlax to Thick Fat. `gate6-r8-paralysis-off.json`: Limber Persian versus Electrike Thunder Wave x4; `gate6-r8-paralysis-control-off.json` uses ordinary Thick Fat Snorlax. | No durable status on either immune target; exact ability-specific prevention message, PP loss, and normal control application. Muk was corrected because it has no Immunity slot. |
| R9 | `gate6-r9-off.json`: Lum Machamp takes the first Gengar Swagger, then the ordinary party picker switches to White Herb Machamp for the second. | Lum removes confusion but not the +2 Attack boost; White Herb has no negative stage to restore, so it remains held while both +2 Attack and confusion persist (`battle_util.c:3739-3755`). |
| R10 | `gate6-r10-attract-off.json`: male Oblivious Lickitung versus female Gardevoir Attract x4; `gate6-r10-attract-control-off.json` changes only Lickitung to Own Tempo. `gate6-r10-perish-song-off.json`: Soundproof Exploud versus Lapras Perish Song x4. | Attraction is rejected with its distinct ability message while the compatible control is affected; Perish Song skips only Soundproof and still marks its ordinary user. |
| R11 | A: Ninjask Substitute then Baton Pass; bench: recipient. B: passive Tackle x4. Repeat ordinary manual switch. | Baton Pass retains intended status2/stages; ordinary switch clears them. |
| R12 | A: White Herb Pinsir (sole ability Hyper Cutter); B: Granbull Intimidate x4; switch Granbull in after initial player action. | Prevention control: Hyper Cutter blocks the Attack cut, so White Herb does not activate or get consumed. |
| R12b | A: White Herb Machamp (sole ability Guts); B enters as Granbull Intimidate with Tackle x4 after an initial action. | Viable interaction: Attack 6→5, Intimidate message, White Herb restore 5→6, herb message, then item consumption. |
| R13 | A: Pidgeot Keen Eye with Tackle x4; B: Granbull Intimidate with Sand-Attack x4 (`gate6-r13-off.json`). | The entry hook lowers Attack 6→5; Sand-Attack then prints the Keen Eye-specific prevention message and leaves accuracy 6. Hyper Cutter×Intimidate and White Smoke×Intimidate are already kernel-pinned controls. |
| R14 | No new fixture: `docs/absorbing-abilities-ground-truth.md` already proves the source family and banks Volt Absorb OFF-ROM receipts; the kernel has matching/nonmatching typed controls for Volt/Water Absorb and Flash Fire. | Existing pins cover zero direct damage, exact quarter-heal/minimum/cap behavior, full-HP bypass, first/repeat Flash Fire state, and later Fire damage. K7 adds the previously missing held-item dispatch boundary. |
| R15 | `gate6-r15-off.json`: opponent Skarmory sets three layers; player Pidgeot, Levitate Lunatone, and grounded Rhydon make real party-menu switches. | Flying/Levitate avoid Spikes; grounded Rhydon takes `floor(maxHP/4)` in the source HP-update → message order. |

K1--K7 are deliberately Tier-1-first: they assert pure reducer/dispatcher
ordering, stage arithmetic, and zero-damage non-activation.  A successful
kernel proof is enough because the source citations specify no controller/UI
or ROM-only randomness at those boundaries; promote only a mismatch to a
mechanicLab trace.

## R7/R8 pre-ROM predictions (recorded before receipt runs)

The R7 fixture deliberately lowers Ursaring's Attack enough that an ordinary
Facade roll cannot faint the target before the burn pass.  The complete-party
builder should derive level-50 stats `HP 165 / Attack 121` for Bold, zero-
Attack-IV Ursaring and `HP 180 / Defense 127` for Ninetales.  Will-O-Wisp
should change Ursaring's durable status `0→STATUS1_BURN (0x10)` before its
action.  The ported damage kernel then takes Guts' status gate
`floor(121*150/100)=181`, Facade's script multiplier `2`, and Normal STAB:
base `45`, then `45*2*1.5 = 135` before the 85--100% roll, for noncritical
damage `114..135` (or `229..270` if the seed's crit roll succeeds).  The
source end-turn pass should then apply `floor(165/8)=20` burn damage,
`165→145`, without clearing `0x10`.  The exact per-seed damage prediction
will be selected from that source-derived branch by each receipt's recorded
crit/damage rolls; both Guts and Facade's own multiplier are load-bearing.

R8 corrects the staging card's suggested Muk: Emerald Muk has Stench/Sticky
Hold, not Immunity.  Legal Snorlax slot 0 supplies Immunity, with the same
species' slot-1 Thick Fat as the ordinary Toxic control.  Before any ROM run,
the predicted immune path is status `0→0` for the entire trace, Toxic PP
`10→9`, `gLastUsedAbility = ABILITY_IMMUNITY`, and the exact message
`SNORLAX's IMMUNITY prevents poisoning!`, never `But it failed!`.  The
control should first gain `STATUS1_TOXIC_POISON (0x80)`, then advance to
`0x180` while taking `floor(267/16)=16` first-turn poison damage.

For the second R8 pair, legal single-ability Persian supplies Limber and
same-profile Thick Fat Snorlax is the ordinary control.  The predicted immune
path is status `0→0` throughout, Thunder Wave PP `20→19`,
`gLastUsedAbility = ABILITY_LIMBER`, and
`PERSIAN's LIMBER prevents paralysis!`, never `But it failed!`; the control
should gain exactly `STATUS1_PARALYSIS (0x40)`.  These are the ability
branches at `battle_script_commands.c:2396-2417,2428-2449`, distinct from
Poison/Steel type gates and Electric damage immunity.

## Completed receipt notes

### R15 — Three-layer Spikes gates Flying and Levitate before the grounded fraction

`gate6-r15-off.json` was corrected from a trace that put the intended targets
on the AI side and never performed its claimed switches.  It now uses complete
legal parties: player Pidgeot (species 18, party index 0, Normal/Flying
`[0,2]`, Keen Eye 51), Lunatone (348, index 1, Rock/Psychic `[5,14]`,
Levitate 26), and Rhydon (111, index 2, Ground/Rock `[4,5]`); opponent
Skarmory has four real Spikes slots.  Pidgeot's legal Agility keeps the setup
RNG-free.  At frame 2202, the semantic snapshot has player-side Spikes = 3,
`sideStatuses[0] = 0x10`, and Skarmory PP `18,19,20,20` (three real uses),
with raw-RGB hash `56c3690272cc58f4172c84aff67ba8b3457d7c95af6693a7d04969c537bb9840`.

The ordinary picker first switches Pidgeot to Lunatone: frame 2602 has the
incoming party index 1, and frame 2603 has Lunatone with Levitate, HP
`177/177`, and hash `900d5221b53ae3aebf9eeac566d9be216694096299188a8e6261696227a1375d`.
The next real switch reaches Rhydon at frame 3586 (`187/187`, hash
`9eead40b87034e0b7db7d552ac85174d5219bf071deb98e12e579faebdc17e24`);
the fresh three-layer gate sets the transient side bit at frame 3773, then
persists both battle and party HP `187→141` at frame 3774 (`46 = floor(187/4)`,
hash `9c483a2e2d62a9a97aa33f669d5268167126ffeebe0ea0c895a05f7313ff73cf`).
The hurt-by-Spikes message visibly settles at frame 3802 (hash
`04e65d74aaddd51d435a99eab90586e98f882210e1e2fbda6ee617323810fb8e`),
matching `healthbarupdate`, `datahpupdate`, then `BattleScript_PrintHurtBySpikes`
in `battle_scripts_1.s:3403-3435`.  The final real return to Pidgeot changes
the active record at frame 4527 while retaining `190/190` (hash
`dbb438047d27dccb275f9209159dac5221f1bb0a486c2bb756e3187c5887ee55`);
neither immune entry emits the Spikes damage/message path.

Fresh Battle Scene OFF runs at seed `1` and a temporary scenario differing
only in `.seed = 324508639` agree on every committed capture's raw-RGB hash,
including baseline frame 0
`f83554b6e60736e5ef71b9c4568c711286e51b2d73529a333a5cff16aac7a41f`,
the two pre-switch records (2602
`8a6081e28319c37d5dd65d185ee2ff9f5b6e9b563322b979149b35bf89339840`,
3585 `2e8b280c4ef8d177eb4b98e7cff77c256ba3350c96a48f831c9fc87292197453`),
the Pidgeot pre-record at 4526
`b90b6b6b7e6e74d0e1a0c5bc8988bee986f753d277ace910bac502b0f8a32b95`,
and the settled frame 5068
`8d64991bb4520d19598f260ac90d486b384972eb563d3b65a2d4935dbf6d1bc4`.

### R6 — Natural Cure clears the departing Starmie before ordinary reconstruction

`gate6-r6-off.json` stages complete legal parties: Starmie at player party
index 0 uses ability slot 1 (Natural Cure, semantic ability `30`), its neutral
Rattata bench is party index 1, and Muk is constrained to four real Toxic
slots. Fresh Battle Scene OFF runs at seeds `1` and `324508639` agree on all
23 captured frame/hash pairs. Toxic first makes both active Starmie and
`state.parties.player[0]` `status1 = 0x80` at frame 258 (hash
`b4e4a7626d6f2f57ae6b6be8739dc4f76ed6dd6140c6b90375d417baaaabe930`);
the active toxic counter later reaches `0x180` at frame 367 while the durable
party value stays `0x80`.

The voluntary party-menu switch preserves the source order. At frame 1055 the
active Starmie is still `0x180` and its party record `0x80`; at frame 1096
Natural Cure has made both fields `0` (hash
`3f1a608bbf74d1c60bbd44acffd01426fe4205c973e087b9a4bc93d77e44ba84`).
Frame 1135 then reconstructs the independent Rattata record (`species 19`,
`partyIndex 1`, battle and party status `0`) with hash
`4b305eebb174b42f4d5247cd9e6802f0136e817fd6876a8b850571de4c8461e1`.
After Muk toxics that ordinary incoming mon, the return at frame 2077 rebuilds
clean Starmie (`partyIndex 0`, battle/party status `0`) while Rattata's party
status remains `0x80`; hash
`bb755d91704f58e9c495625524862619bab80c9660ca4b9bfe308eb97846dcd4`.

`BattleScript_EffectToxic` runs the real status route through
`setmoveeffect`/`seteffectprimary` (`data/battle_scripts_1.s:686-705`). On
switch-out, `Cmd_switchoutabilities` clears `gBattleMons.status1`, emits
`REQUEST_STATUS_BATTLE`, and the player controller writes that exact value to
the departing party slot (`battle_script_commands.c:9590-9604`,
`battle_controller_player.c:2102-2104`); only afterward does
`Cmd_switchindataupdate` copy the selected incoming BattlePokemon and derive
its type/ability (`battle_script_commands.c:4621-4657`). The checked-in
captures already hit each semantic boundary, so no fixture cadence or capture
was altered.

### R12b — Granbull Intimidate, Guts Machamp, and White Herb entry order

`gate6-r12b-off.json` uses complete legal parties and makes Machamp's
ability slot 0 (Guts, semantic ability id 62) hold White Herb (item 180).
After the initial action, Granbull enters from opponent party index 1 with
Intimidate (species 210, ability id 22). Fresh Battle Scene OFF runs on
seeds `1` and `324508639` have the same decisive semantic boundaries:
at frames `307→308`,
`state.battlers.player.statStages[1]` changes `6→5` while both
`state.battlers.player.item` and `state.parties.player[0].item` stay
`180` (raw-RGB SHA-256
`c2f20918319722dc38e2e6c58e0d2d3c35086a4b91f7184de2d1239ded711f82`).
Frame 435 visibly settles
`FOE GRANBULL's INTIMIDATE cuts MACHAMP's ATTACK!`
(hash `722096dd71bf82d3b35e65e811b350f0462bb357aa97f99e0c5e95102f4b8c06`).

Frames `505→506` then restore Attack `5→6` while both item fields remain
`180` (raw-RGB SHA-256
`722096dd71bf82d3b35e65e811b350f0462bb357aa97f99e0c5e95102f4b8c06`);
frame 582 visibly settles
`MACHAMP's WHITE HERB restored its status!`
(hash `54730cfd667a4e21130735583c1a9ee7378d4b5a6828d446a05a02d68ed0bd45`).
The semantic snapshots—not pixels alone—show both battle and persistent party
item copies still `180` at frame 647, then both `0` at frame 648; the
same raw-RGB SHA-256
`54730cfd667a4e21130735583c1a9ee7378d4b5a6828d446a05a02d68ed0bd45`
framebuffer persists across that final controller
write. This receipts the source order: Intimidate's stage cut/message,
then White Herb's normalization/message, then the shared item removal
(`battle_main.c:3869-3894`, `battle_util.c:3003-3073,3303-3329`,
`battle_script_commands.c:5901-5915`).

### R3 — Cloud Nine removal/reactivation and Forecast Weather Ball

`gate6-r3-off.json` now uses complete legal parties: player Golduck
(species 55, ability slot 1 = Cloud Nine) has Rain Dance, its party-index-1
bench is neutral Rattata, and the opponent is Castform (species 385, ability
slot 0 = Forecast) with four Weather Ball slots.  The ordinary controller
route performs Rain Dance and then the real party-menu switch; no weather,
timer, type, HP, or outcome state is injected.

The two fresh Battle Scene OFF runs are byte-identical: `manifest.json` has
SHA-256 `e0fdd5103205c6f3313d06574dd05a9e180613562f8919a51debf3007a4bab60`,
and the sorted capture-PNG basename tree has SHA-256
`143f651f2ba31a82a1a7319b60a98c6e7982e23577ac201463a3e0a9e0b5d2b6`.
Temporary output-directory prefixes are the only path normalization; no
nondeterministic artifact paths or semantic fields were excluded.  The
compact semantic/framebuffer receipt is committed at
`tools/probe/receipts/gate6-r3-off.json`, with a hermetic pin in
`tests/gate6R3Receipt.test.ts`.

At frame 258, Rain Dance has produced `weather = 1` and timer `5`, while
Golduck is active with Cloud Nine and Castform remains Normal/Normal
(`types = [0,0]`), demonstrating the global weather-effect suppression.  The
timer is `4` at frame 1150, where the ordinary switch has replaced Golduck
with Rattata (`partyIndex = 1`, neutral ability 50); Castform is still
Normal/Normal during the switch boundary.  At frame 1300 the same live rain
flag/timer remains and Forecast has changed Castform to Water/Water
(`[11,11]`).  Frame 1500 has Castform's Weather Ball (`currentMove = 311`)
selected with PP `[10,10,9,9]`, proving a subsequent consumer sees active
rain after Cloud Nine removal.  These are the source boundaries in
`battle_util.h:47-48`, `battle_util.c:2396-2427`, and
`battle_script_commands.c:9787-9805`.

### R9 — Swagger × Lum Berry versus White Herb's negative-stage guard

`gate6-r9-off.json` already supplied the needed legal single request: its
complete parties place Lum Berry Machamp (item 141) first, White Herb Machamp
(180) at party index 1, and a four-Swagger Gengar (207) opposite them.  The
ordinary controller route first completes Gengar's Swagger against Lum
Machamp, then opens the real party picker and switches to White Herb Machamp
before Gengar's next real Swagger.  No HP, status, stat-stage, item, weather,
or outcome state is injected.

Two fresh Battle Scene OFF `bin/oracle lab` outputs are byte-identical over
every generated file: `manifest.json` has SHA-256
`d9e731373bf44be85fc088f14db98478f74bd715989aa435affcbc42532bfc11`, and
the sorted `frame-*.png` basename/hash tree has SHA-256
`35bb8b2c46b8157bf1a4ab637b0ce3570193ccba9f3a82d5db596f96fe16a559`.
The read-only, every-frame mGBA receipt produced through
`tools/run-mgba-probe.py` is also byte-identical (`05fcbde6df91d4fec842783f902e816a3fa7464c18f77021e8f5d6777ac1cc04`).
Only temporary output-directory prefixes are normalized; no artifact paths
or semantic fields are excluded.  The compact committed receipt is
`tools/probe/receipts/gate6-r9-off.json`, regenerated by
`tools/probe/probe-gate6-r9-off.py` and pinned hermetically in
`tests/gate6R9Receipt.test.ts`.

The exact first-path message order is `Foe GENGAR used SWAGGER!` (frame 43),
`MACHAMP’s ATTACK sharply rose!` (200), `MACHAMP became confused!` (300),
then `MACHAMP’s LUM BERRY cured its confusion problem!` (429).  At frame 106
the active and persistent Lum item copies are both 141, Attack is `6→8`, and
confusion is already cleared; the cure message still sees both item copies at
141.  The shared removal occurs later at frame 544, changing Lum's battle and
party copies to 0 while retaining Attack 8 and no confusion.  The relevant
RNG checkpoints are the first Swagger move-state draws
`919694434→3690816045` (frame 42) and
`3690816045→983229340` (298); the cure and removal add no draw.

The real switch reaches party index 1 at frame 1135 with White Herb 180 and
the default Attack stage 6.  Its second real Swagger repeats the use/boost/
confusion message order at frames 1277/1434/1534.  Attack becomes 8 at frame
1340, then the confusion state is set at frame 1532 (`status2 = 2`, duration
2) with the White Herb still present in both battle and party records.  It is
still 180 at the confusion message and at the frame-1976 endpoint; no White
Herb restoration message occurs because nothing lowered a stat.  The matching
second-Swagger RNG checkpoints are `3031698222→530917129` (frame 1276) and
`530917129→1160559944` (1532).  This is the exact separation in
`battle_scripts_1.s:1608-1629` and `battle_util.c:3739-3755`: Swagger's
positive Attack stage and volatile confusion do not qualify White Herb's
negative-stage restoration branch.

### R11 — Ninjask Baton Pass versus ordinary-switch volatile/stage lifetime

`gate6-r11-off.json` uses complete legal parties and now names Ninjask by
Emerald's internal `SPECIES_NINJASK = 302` (not the nearby Nincada id).  Its
real Swords Dance, Substitute, and Speed Boost sequence establishes the
source record before the real Baton Pass party choice: on both fresh Battle
Scene OFF runs (seeds `1` and `324508639`), frame 3000 is active Ninjask at
party index 0 with `status2 = 0x01000000` (`STATUS2_SUBSTITUTE`),
`status3 = 0`, and stat-stage vector `[6,8,6,8,6,6,6,6]`; Baton Pass has
spent its PP `40→39`.  The real party picker then sends the intended bench
Bulbasaur (party index 1): frame 4000 retains that exact status2 value and
stage vector on Bulbasaur, with raw-RGB SHA-256
`5b03eec4d1ff2c77f836999f53db6b960b51be0b9e64631b0b4b40c4a30979ff`
on both seeds.

The same trace then chooses PKMN → Ninjask → SHIFT, rather than invoking a
staging shortcut.  At frame 7400 the ordinary incoming Ninjask record is
back at party index 0 with `status2 = 0`, `status3 = 0`, and every stage at
the default `[6,6,6,6,6,6,6,6]` (hash
`90cac917989d764920afa363c2490cfffb95759fdfccc6151a4021725d86c1e3`);
the settled frame 7600 repeats the cleared fields (hash
`4f0fa695bf4db9ab4bd0abe5996418660ee1d4c1cec3c00d7b82a647644a9983`).
Those semantic snapshots, not the party-screen pixels, distinguish the two
lifetimes; both hashes and every named state field are stable across the two
seeds despite their distinct RNG states.

This is the exact source boundary. `Cmd_switchindataupdate` overwrites the
incoming `BattlePokemon`, then copies stat stages and status2 only for
`EFFECT_BATON_PASS` (`battle_script_commands.c:4631-4657`).
`SwitchInClearSetData` otherwise resets all stages and zeros status2/status3
(`battle_main.c:3158-3172,3189-3193`); its Baton Pass branch masks status2
to the source-retained list, which includes Substitute
(`battle_main.c:3173-3176`).  The Tier-1 sibling now pins the corresponding
ordinary reset and Baton Pass stage/Substitute retention against the same
source split.

### R7 — burn, Guts Attack, Facade multiplier, and end-turn chip

`gate6-r7-off.json` uses complete legal parties: the corpus has both
Ursaring/Facade and Ninetales/Will-O-Wisp carriers, and both species' requested
ability slots are their real slots.  The deliberately low Attack IV keeps
Ninetales alive through an ordinary Facade roll.  Before either ROM run, the
ported builder/formula prediction was Ursaring `HP 165 / Attack 121`,
Ninetales `HP 180 / Defense 127`, durable burn `0→0x10`, noncritical damage
`114..135`, and end-turn burn chip `165→145` (`floor(165/8)=20`).  Both seeds
derived exactly those stats, the same status/chip deltas, and no critical hit.

On seed `1`, Will-O-Wisp's accuracy roll is `56317` and burn appears at frame
117; frame 200 displays `URSARING was burned!` with raw-RGB SHA-256
`1ed7bba83895816565b3d4553bfce1e4f35af1d909190193976647005a1005b7`.
Facade then consumes accuracy/crit/damage rolls `15002/52212/24745`; the last
is `91%`, so the pre-roll `135` becomes exactly `122`, and Ninetales changes
`180→58` at frame 447 (hash
`1f0282e123f5840c9d0997e2cf1658bad2a1765693b8c8a104aca9f1975c59db`).
Burn chip changes Ursaring `165→145` at frame 582 with the exact
`URSARING is hurt by its burn!` tail and hash
`710a428c1cf6501d8f90d29b01ffb796a11a50ec05c996241ea02d07480bde64`.

On seed `324508639`, the corresponding Will-O-Wisp roll is `55014` and the
Facade rolls are `57953/33692/28096`; the `100%` damage roll preserves exact
damage `135`, Ninetales `180→45` at frame 460 (hash
`4e14b08dd50b3864a16ed5cf54353ffefc235512a44b04fef0bba2c88011462a`),
and the same twenty-HP chip lands at frame 595 (hash
`3acb8ce34742047570686c1b0bb7332ff08ea1abac7fe0cdf311006721d80c34`).
Thus prediction versus observation is exact for both seeds, not merely
"Facade did more damage."

The paired Tier-1 pin runs Will-O-Wisp and Facade from their literal effect
entries through `END`, including PP, burn/status-icon message tail, and the
same two seeded damage results.  Its arithmetic separately proves the two
load-bearing source branches: Guts changes Attack
`floor(121*150/100)=181` and suppresses burn's physical halving
(`pokemon.c:3203-3213,3263-3264`), producing base damage `45` instead of
`16`; `BattleScript_FacadeDoubleDmg` supplies `sDMG_MULTIPLIER=2`
(`battle_scripts_1.s:2252-2258`), consumed by `Cmd_damagecalc`
(`battle_script_commands.c:1290-1297`) before STAB and the random multiplier
(`battle_script_commands.c:1639-1651`).  The durable chip is the independent
`ENDTURN_BURN` `maxHP/8` branch at `battle_util.c:1550-1560`, with
`BattleScript_BurnTurnDmg`'s exact message/update tail at
`battle_scripts_1.s:3750-3763`.

### R8 — Immunity/Limber prevention versus ordinary controls

The Toxic card corrects the original staging suggestion: Emerald Muk has
Stench/Sticky Hold and cannot legally carry Immunity.  Snorlax has real slot-0
Immunity and slot-1 Thick Fat, so the checked-in pair changes only the
same-species ability.  Roselia is a legal Toxic carrier.  Dense fresh probes
on seeds `1` and `324508639` sample every one of 734 trace frames: both
Immunity runs keep battle and party status exactly zero throughout, spend
exactly one Toxic PP (the Factory AI may choose a different one of four
identical slots), and record `gLastUsedAbility = 17` during the prevention
tail.  Frame 160 on both seeds displays exactly
`SNORLAX's IMMUNITY prevents poisoning!`, never `But it failed!`, with
raw-RGB SHA-256
`ff1719f9df728b5de286a5076af8010108c12d938a00112868695a62181f9c5f`.
The Thick Fat control gains battle/party `STATUS1_TOXIC_POISON = 0x80` at
frame 111, displays `SNORLAX is badly poisoned!` at frame 160 with shared
hash `7a64658972ba705c32e2b18b5aa571f946cc7fbfafd99f0c6202cf7a419c53f4`,
then advances battle status to `0x180` and takes the predicted
`floor(267/16)=16` chip (`267→251`).  The immune branch consumes zero
accuracy draws; the ordinary control consumes its real Toxic accuracy draw.

The paralysis pair uses legal single-ability Limber Persian and legal
Thunder-Wave Electrike.  On both seeds, all 734 dense frames keep Persian's
battle/party status zero, one Thunder Wave PP is spent, and
`gLastUsedAbility = 7` during the prevention tail.  Frame 320 displays exactly
`PERSIAN's LIMBER prevents paralysis!`, never `But it failed!`, with shared
hash `be920de334f14020616679d4cb92b552cc91655f91d7e063450c70ef2fd1c9c1`.
The ordinary Normal-type Thick Fat Snorlax control gains battle/party
`STATUS1_PARALYSIS = 0x40` at frame 119 on both seeds and displays the normal
application tail (frame-200 shared hash
`05bd819aa8168ac1c431c72048030d811aa0fa5a64199a7353117596ef0cca68`).
Again the ability branch runs before accuracy while the control consumes its
normal accuracy draw.

The full-script Tier-1 pairs pin status bytes, PP loss, zero draws on the
early ability branches, one accuracy draw on each ordinary success,
AI-observed ability identity, and the exact prevention/application message
IDs.  Toxic's Immunity gate is ahead of Poison/Steel type and accuracy checks
in `BattleScript_EffectToxic` (`battle_scripts_1.s:685-705`), while Thunder
Wave checks Limber before `typecalc` and accuracy
(`battle_scripts_1.s:1006-1026`).  The underlying primary/certain status
writer has distinct Immunity and Limber branches at
`battle_script_commands.c:2396-2417,2428-2449`; the prevention scripts select
their ability-specific tables at `battle_scripts_1.s:4128-4139`, whose exact
English templates live at `battle_message.c:270-272,1221-1234`.  Both targets
are Normal type, so neither receipt can accidentally prove a Poison/Steel or
Electric-type immunity instead.
### R4 — same-turn Forecast update, typed Weather Ball, and expiry revert

Castform has two concrete Frontier carriers, set IDs 204 and 309
(`FRONTIER_MON_CASTFORM_1`/`_2`, `battle_frontier_mons.h:1431-1437,
2166-2172`), matching the census's two Level-50-eligible Forecast carriers.
The mechanicLab base constructor still uses its legal challenge-2 band; the
complete party override installs source species 385, ability slot 0
(Forecast), and four Weather Ball slots before `CB2_InitBattle`.  Fast
Blissey (Speed 117 versus Castform's 75) carries four Rain Dance slots in
`gate6-r4-off.json`; the paired control changes only those four slots to
Splash.  Both retain three complete records per side and inert benches.

The prediction was written before the final two-seed receipts.  Rain Dance
must set rain and call `BattleScript_WeatherFormChanges` on the same move
(`battle_scripts_1.s:1744-1755,3999-4005`); `CastformDataTypeChange` must
write both types to Water and return `CASTFORM_WATER + 1` before the form
animation (`battle_util.c:2396-2427`; `battle_script_commands.c:9744-9755`).
Weather Ball is source base power 50/Normal
(`battle_moves.h:4046-4056`), but active rain makes its dynamic type Water
and sets `dmgMultiplier = 2` (`battle_script_commands.c:9787-9805`).  A
focused pre-receipt kernel calculation corrected the initial handwritten
control assumption: Normal is physical in Gen III, so clear Weather Ball
uses Attack 99/Defense 30, not the special stats.  The final predicted
pre-random values were therefore clear
`CalculateBaseDamage=74 -> STAB 111` (94--111 spread), and rain
`CalculateBaseDamage=15 -> Weather Ball 2x 30 -> STAB 45` (38--45 spread).
The rain calculation uses Sp. Atk 67/Sp. Def 155 and includes the source rain
Water boost (`pokemon.c:3287-3344,3371`); `Cmd_damagecalc` applies Weather
Ball's multiplier at `battle_script_commands.c:1290-1297`, and type/STAB and
the final 85--100% roll are at `1355-1373,1638-1651`.

Both seeds match that prediction and use the same damage draw within each
rain/control pair.  Seed `1` returns `52212` (`%16 = 4`): clear damage is
exactly `floor(111*96/100) = 106`, while rain damage is
`floor(45*96/100) = 43`.  The HP receipts are control frame 415,
`330 -> 224`, raw-RGB SHA-256
`5760dd058e588b3c3bb80177bb4005f2a853a67334a24b2c79ac1a442ee35c4e`,
and rain frame 564, `330 -> 287`, hash
`329c289c035ca2c0d8da3e24660e1812fb6a324256b1a9dceef63f064fc64499`.
Seed `324508639` returns `33692` (`%16 = 12`): clear is exactly `97`
(frame 406, `330 -> 233`, hash
`04a47a45812c4c4571a271c23d595c357a752e932498e038983de41bee6671f7`)
and rain is exactly `39` (frame 560, `330 -> 291`, hash
`e32b64d7373a190d1cb8fb154edde7998151094cbdd0534b4783628ba3d12ab0`).
The paired final damage RNG states are respectively `3421819359` and
`2208080798`; the weather change itself consumes no move RNG.

The Forecast timing is seed-independent.  Rain becomes active at frame 71;
Castform is still Normal there.  Its battle types become `[11,11]` at frame
194 while Rain Dance is still the current move (hash
`10fb4c591181e6e3bc28f859e75995e47ef75746dea36a1911876e76e05bc1a2`);
form index 2 becomes visible at frame 245 (hash
`bc791677d2827e8cc42dc8daf10762232252398ad331ecce4723271ad5f1e42b`).
Weather Ball does not become current until frame 409.  This is the source's
same-turn weather-script ability pass, not a deferred switch-in update.

The five-turn fixture also reaches the neutral boundary.  On seed `1`, rain
expires at frame 4105, types revert to `[0,0]` at frame 4192 (hash
`a43eff7ce84863916d692fe990f04dd948aae1320063a44a3663b0eb15ba812d`),
and form returns to 0 at frame 4244 (hash
`e2fda9aba12e7d769d2b1d788c4bc563ae3ce0e8576d62246476db5802196c44`).
Seed `324508639` gives the same ordered boundary at frames
4110/4197/4249; the Normal-type and Normal-form hashes are respectively
`0bf3388a118c4d1628bd48a88d0bea1b0af7cffd3924e7a868ee59250ab3400f`
and `2002ddfd619e46d795c47d31f5312079f901913a1ec61983e1d5a96bdbcd9d61`.
The Tier-1 sibling pins Forecast's clear/sun/rain/hail form/type results,
Weather Ball's Normal/Water/Rock/Fire/Ice type and 1x/2x multiplier, Cloud
Nine suppression, the two pre-random values, and both exact seed rolls.

### R10 — Oblivious Attract rejection and Soundproof partial immunity

The Attract pair uses complete, compatible-gender parties: male Lickitung
versus female Gardevoir, with Gardevoir constrained to four Attract slots.
The only target-side mechanic difference is Lickitung's legal ability slot:
slot 1 is Oblivious and slot 0 is Own Tempo.  On seeds `1` and `324508639`,
the Oblivious target remains at `status2 = 0`; the move spends one PP and
records `gLastUsedAbility = 12`.  Frames 160 and 200 display the specific
`LICKITUNG's OBLIVIOUS prevents romance!` message with raw-RGB SHA-256
`60083432b743e314d9c55e5e27e9c65c1f92aea4b94839dafa68b5d3937dc9d2`.
The Own Tempo control gains exactly `STATUS2_INFATUATED_WITH(1) = 0x20000`
at frame 71 on both seeds and displays `LICKITUNG fell in love!`.

This is the hardcoded Oblivious branch at
`battle_script_commands.c:7676-7681`, which precedes the same-gender,
already-infatuated, and genderless failure checks at 7684-7690.  Compatible
success writes only the attacker-indexed infatuation bit at 7692-7694.
`BattleScript_ObliviousPreventsAttraction` supplies the distinct
`STRINGID_PKMNPREVENTSROMANCEWITH` tail at
`battle_scripts_1.s:4140-4144`; it is not `BattleScript_ButItFailed`.
The Gate-6 Tier-1 pair runs the complete effect script and pins both message
tails, exact status2 mutation, PP loss, and the single accuracy draw.

The prior `perish-song-off-evidence.json` was not enough to skip the second
card: its own bounded remainder says it did not observe a Soundproof active
battler.  `gate6-r10-perish-song-off.json` closes that receipt gap with
Soundproof Exploud versus constrained Perish Song Lapras.  On both seeds,
frame 311 sets only Lapras to `STATUS3_PERISH_SONG = 0x20`, timer `3`;
Exploud remains at status3/timer zero.  The shared frame-311 hash is
`1ac6ee39d8403c4ba71110bfd968a9b508da53a1a9fe5bda716bd61e2d57389f`.
Lapras's timer then counts `3→2` at frame 580 while Exploud remains exempt.
The existing `tests/battleScriptTrysetperishsongOpcode.test.ts` pins the
source loop at `battle_script_commands.c:8508-8533`: Soundproof increments
the unaffected count, ordinary battlers receive the bit/timers, and partial
immunity is still overall success.

### R2 — Dig's underground weather window, surfacing, and grounded control

The card uses Hail rather than Sandstorm because Dugtrio's Ground typing is
itself permanently sand-immune; a Dugtrio × Tyranitar fixture could not
distinguish the volatile gate. Both checked-in requests are `mechanicLab`,
Battle Scene OFF, and complete legal three-mon parties with no transient
state injection. Articuno's four Hail slots constrain the Factory AI; the
sole staged difference is Dugtrio's four Dig slots versus four Growl slots,
selected by ordinary controller input.

The compact receipt is
`tools/probe/receipts/gate6-r2-off.json`; its regeneration probe is
`tools/probe/probe-gate6-r2-off.py`, run through `tools/run-mgba-probe.py`.
Each request was run twice fresh with `bin/oracle lab`, with every output file
byte-identical: Dig manifest `25925ff99b87e26cec4015d39cfa73cc3dd4a3471f444fb6b9c4cbade8d87aa2`,
Dig capture aggregate `4b5126094f080961b04f55348a73f3bb02481f86021d3d724b753b80b114690d`,
control manifest `944bf8344af23b31f4c97391141240946178548580b2b770d39d45b2c869a356`,
and control capture aggregate `34b4ad1a884be3f6f96fd9f2109f473ded3a944d6e87188b9c2485027a28bd44`.
Two fresh wrapper-validated compact probes were likewise byte-identical
(`78ced100a8cfdd09b8f8ca130aff4754da62d2c3593e88298966421cf217384b`).
No artifact paths are excluded; only fresh temporary-output directory prefixes
are normalized out of path names.

For Dig, the receipt records `STATUS3_UNDERGROUND` entry at frame 177, Hail
flag `0x80`/timer 5 at frame 213, then timer `5→4` at frame 352 with exact
`142/142` HP while underground. Dig clears the bit at frame 478. The next
pass is timer `4→3` at frame 811, followed by exact `floor(142/16) = 8`
damage at frame 1043 (`142→134`; raw-RGB SHA-256
`b313741f71d4f4cb40918136519441dfb99816ad185c7e20b60b5f5211a49c9c`).
The grounded Growl control records the same 8-HP chip twice: `142→134` at
frame 679 and `134→126` at frame 1508 (SHA-256
`513a143cb3905b19900ed3030046ce0c93558717e0969c788beecc7b8cc58bf7`).
The receipt pins ordered displayed messages paired to controller events and
the complete Random()-active ledger: Hail continues while Dig is underground
without a pelt message, then continues → pelt after surfacing; the grounded
control has both continues → pelt passes.

The exact immunity gate is not in `battle_util.c`: its field scheduler
selects `BattleScript_DamagingWeatherContinues` at
`battle_util.c:1412-1429`, while `Cmd_weatherdamage` performs the Hail
underground/underwater checks and `maxHP / 16` calculation at
`battle_script_commands.c:7627-7640`.  The script establishes continues
message → per-battler damage message → health update order at
`battle_scripts_1.s:3200-3224`.

### R13 — Keen Eye specificity plus unrelated-stat control

`tools/battle-lab/gate6-r13-off.json` uses complete legal parties and
constrains Granbull to four Sand-Attack slots.  Fresh Battle Scene OFF runs
with seeds `1` and `324508639` agree on every state assertion: at trace frame
0 the already-completed Intimidate entry hook has Pidgeot Attack stage `5`
while accuracy remains `6`; frame 320 displays `PIDGEOT's KEEN EYE prevents
accuracy loss!`; frame 734 still has Attack `5`, accuracy `6`, and
Sand-Attack PP `14`.  Both frame-320 receipts have raw-RGB SHA-256
`68ce297ee2838248d986a78e118156ffa92846b22bc4893c554972772a870489`.
The paired Tier-1 pin walks the primary `STATBUFFCHANGE` ability-message
branch and separately proves the same Keen Eye target accepts an Attack
decrease.  This is the source-specific control required by
`battle_script_commands.c:7009-7020`: Keen Eye tests only `STAT_ACC`;
Intimidate's entry script does not list it as an Attack blocker
(`battle_scripts_1.s:4027-4048`).

### R14 / K7 — banked absorption family, missing pair pin closed

No `gate6-r14-off.json` was added.  The earlier program documented in
`docs/absorbing-abilities-ground-truth.md` already has source/kernel parity
for Volt Absorb, Water Absorb, and Flash Fire.  Its tests cover matching and
mismatched types, the nonzero-power gate, exact quarter-max healing with the
one-HP minimum and max-HP cap, full-HP routing, and first/repeated Flash Fire
state; `tests/damageCalc.test.ts` covers later consumption of that state.
Volt Absorb's independent OFF-ROM receipts use seeds `610839776` and
`324508639` and show battle/party HP `170→172`, the exact ability message,
`MOVE_RESULT_DOESNT_AFFECT_FOE`, and no post-accuracy crit/damage RNG draws.

The genuinely missing K7 pairwise assertion is now in
`tests/gate6EntryItemInteractions.test.ts`: a full-HP target holding Sitrus
is redirected before damage/item dispatch for matching Electric, Water, and
Fire moves; HP and item remain unchanged, no item-removal event is emitted,
and Flash Fire still sets its persistent resource flag.  This is a pure
source-defined dispatch boundary, so the staging card's kernel-first rule
does not promote it to a duplicate ROM fixture.

### R5 — Chesto Rest wake and Lum confusion cure timing

Both complete-party fixtures were run fresh on Battle Scene OFF with seeds
`1` and `324508639`.  `gate6-r5-off.json` first lets Rest fail honestly at
full HP, then Duskull's constrained Tackle deals real damage (`267→258` or
`267→257` from the seed-dependent damage roll); the second Rest succeeds.
At frame 860 sleep is `3`, frame 1020 has restored HP with sleep still `3`,
frame 1120 has sleep and Nightmare cleared while Chesto is still held, frame
1160 displays `SNORLAX's CHESTO BERRY woke it from its sleep!`, and only
afterward is the item removed in both the battle and party records.  The two
frame-1160 receipts share raw-RGB SHA-256
`8be78feffbf9144beec61d94ad9b3e9330ce66fef632b043659051f9d49b059a`.

`gate6-r5-lum-off.json` lets Duskull's four identical Confuse Ray slots set
an RNG-duration confusion (`2` turns at seed `1`, `4` at seed `324508639`).
By frame 420 confusion is cleared while Lum remains held; frame 540 displays
`MACHAMP's LUM BERRY cured its confusion problem!` and both item copies are
then zero.  Both frame-540 receipts share raw-RGB SHA-256
`67631f6a11f55791a30a99d57fc35d3eaa90653190f09ab12a2cd7373aa70961`.
The Gate-6 Tier-1 pin confirms Chesto clears both sleep and Nightmare while
Lum reaches the distinct confusion cure branch.

### R1 — active sun prevents the same RNG-gated freeze rolls

`tools/probe/probe-gate6-r1-off.py`, run only through
`tools/run-mgba-probe.py`, records every `sRandCount` change and the stock
ROM state.  Seeds `17` and `22` were selected by a bounded control search
because Growth→Ice Beam genuinely freezes Vileplume; the sun fixture differs
only by using Sunny Day instead of Growth before the same constrained Ice
Beam.  Both player setup moves are legal, status-class, and consume no RNG.

For seed `17`, the four Ice Beam move-window states are
`274638845→4197121324→2574881839→4014262902→1665042609`; the last draw's
returned upper half is `25406` (`%100 = 6`).  Control frames are
`284/314/317/561`, and status becomes `0x20` on frame 561.  Under sun, the
identical states occur at frames `216/246/249/493`, weather is `0x20`, and
status remains zero.

For seed `22`, the matching ledger is
`162615947→1244192674→550958189→860727516→4155264543`; the last returned
upper half is `63404` (`%100 = 4`).  Control frames are
`284/314/317/554`, with status `0x20` on frame 554; sun frames are
`216/246/249/486`, with weather `0x20` and status zero.  The whole remaining
turn ledger also stays identical within each sun/control pair: final RNG is
`3419046873` for seed 17 and `3284998766` for seed 22.  Thus neither
fixture thins away or rerolls the secondary effect; the literal
`WEATHER_HAS_EFFECT && B_WEATHER_SUN` gate is the sole outcome difference.
The already-existing Tier-1 pair in
`tests/battleScriptHitChainOpcode.test.ts` pins both the no-weather freeze
dispatch and active-sun rejection.

## Ranked dispatch shortlist

Each line is one bounded worker slice, not an instruction to create all traces
at once.  Use a fresh `mktemp -d` output directory and retain only the checked
in scenario/evidence once accepted.

R2 now uses the compact deterministic semantic workflow used by R3 and R9.
R12 remains the separately named fixture-only prevention-control gap; it is
not silently classified as closed.

1. **R12 — Pinsir's Hyper Cutter prevention control remains fixture-only.** `bin/oracle lab tools/battle-lab/gate6-r12-off.json -o "$(mktemp -d)"; add a deterministic OFF receipt that proves the prevention branch without promoting R12b's separate White Herb activation proof.
2. **R11 — Baton Pass versus ordinary-switch volatile/stage retention.** `bin/oracle lab tools/battle-lab/gate6-r11-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptSwitchinOpcode.test.ts; npm run build`
3. **R6 — Toxic x Natural Cure switch-out persistence.** `bin/oracle lab tools/battle-lab/gate6-r6-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptSwitchinOpcode.test.ts tests/battleScriptMoveEndOpcode.test.ts; npm run build`
4. **R15 — CLOSED by the three-layer Flying/Levitate/grounded receipt above.**
5. **R3 — CLOSED by the legal Golduck → neutral Rattata switch and Castform Forecast/Weather Ball receipt.** See the completed receipt note above and `tools/probe/receipts/gate6-r3-off.json`.
6. **R9 — CLOSED by the legal Lum cure/consumption then White Herb held-confusion receipt.** See the completed receipt note above and `tools/probe/receipts/gate6-r9-off.json`.
7. **R13 — Intimidate x stat-drop prevention specificity.** `bin/oracle lab tools/battle-lab/gate6-r13-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptStatbuffchangeOpcode.test.ts tests/battleScriptSwitchinOpcode.test.ts; npm run build`
8. **R14 — CLOSED by the banked absorption program plus K7's Gate-6 pair pin.** See the completed receipt note above; intentionally no duplicate `gate6-r14-off.json`.
9. **R5 — sleep/confusion x Chesto/Lum exact cure timing.** `bin/oracle lab tools/battle-lab/gate6-r5-off.json -o "$(mktemp -d)"; npm test -- tests/battleScriptMoveEndOpcode.test.ts; npm run build`
10. **R1 — CLOSED by the paired sun/control fixtures, two freeze-producing seeds, exact RNG ledgers, and existing kernel pair.**

All seven kernel-first cards are now closed: K1 (end-turn item/weather
order), K2 (weather-stage accuracy — caught and fixed a real accuracy-check
weather defect, `450cf532`), K3 (major/volatile canceler ordering), K4
(status modifiers at fixed stages), K5 (Swagger/Foresight), and K6 (White
Herb cap/reset) all live in `tests/gate6KernelInteractions.test.ts`
(2026-07-30); K7 was closed above without inflated oracle work. With
R2/R3/R7/R8/R9 receipted and R4 already complete, the next acceptance unit is
R12's separately explicit fixture-only prevention-control gap.
