# Animation integration readiness — pinned baseline cbf8d2f65

## Verdict

All **267 accepted Level-50 Factory moves are exact animation acceptances and 0/267 are currently ready for ordinary playable battles**. The common live route never constructs a typed Scene-ON request, does not own completion/cleanup, and has no host provider for the accepted config union. In addition, **196** render branches reject arbitrary current species in favor of staged fixture pairs; **71** are identity-generic within the current typed art union. This is readiness accounting only: it changes no per-move acceptance.

Source basis: `ANIMATION_COVERAGE.json`, `src/animation/sceneOnPresentation.ts`, `src/engine/battleScene.ts`, accepted reducer modules/evidence links, `src/data/gen/moves.json`, and `src/data/gen/factory-animation-inventory.json` on audited tree `ce674160ebae2bed58dbc34363d247f0f60a1477`. Its production source is identical to pinned animation baseline `cbf8d2f65`; the intervening commit adds integration-lane docs only. The machine-readable inventory records every config field and source line. No oracle or runtime suite was used.

## Common gaps and adapter order

Every accepted move carries `B_DISPATCH`, `B_LIFECYCLE`, and `B_HOST`. The source-derived class counts are: H_BASIC 104, H_BUFFER 90, H_DERIVED 49, H_OUTCOME 16, H_RANDOM 7, H_VARIANT 14. Local termination is 144 cleanup/inactive reducers, 79 active/terminal reducers, and 44 fixed-age envelopes; none is surfaced as a production queue completion signal.

1. **A0 request/lifecycle owner (267):** preserve every live `MOVE_ANIMATION` payload, including status/no-hit events; start and clock the scene; finish, clean up, and resume text/HP/hit/faint/menu ordering.
2. **A1 common battler/field host (71 first):** build current species, both orientations, geometry, art/palette, healthbox and immutable field profile from live state.
3. **A2 fixture-art generalization (196):** replace pair guards and embedded fixture art/HUD with A1 while retaining each move's accepted bilateral fixture as its exact regression control.
4. **A3/A4:** centralize derived geometry/allocator values and translate controller-owned outcome/timing fields; animation must never own HP, status, RNG, damage, or turn order.
5. **A5 variants:** preserve charge/strike, multi-hit, branch and turn selectors from resolution.
6. **A6 graphics host:** provide persistent presentation-only allocator/OAM/affine/palette/BG/audio/task state for the typed live-input reducers. Do not import oracle rows or verifier fixture builders.
7. **A7 visual randomness:** supply deterministic presentation-only random words/personality without consuming gameplay RNG.

The highest-reuse generic reducer family is the typed `animationInputs`/`animationProfile` seam: one persistent graphics-state provider unlocks the recent bilateral reducers rather than adding move-specific capture adapters. The largest mechanical batch is A2: 190 render-guard sites cover 196 moves and share the same defect—embedded staged battler identity—not 196 different gameplay problems.

## First playable moves

- **Damaging: `MOVE_FOCUS_PUNCH`.** Its accepted renderer reads arbitrary current battler art and its config is only the common battlers/geometry/field profile. It avoids fixture identity, graphics-buffer, controller-outcome, variant, and visual-RNG adapters.
- **Status/no-hit: `MOVE_SCREECH`.** It has the same minimal generic host shape and forces A0 to fix the current omission of no-hit animation commands.
- **Strong control, not cheapest starter: `MOVE_EXTRASENSORY`.** It has recent 322-row bilateral actual-core proof and generic identity, but `ExtrasensoryLiveInputs` makes it an A6 validation target after the graphics host exists.

## Unaccepted Factory moves

These moves are not eligible for playable-exact claims. They remain separate acceptance units and must first land through the Factory animation lane; **Outrage is explicitly included**.

| Move | Tier | Factory sets | Exact/playable blocker |
| --- | --- | ---: | --- |
| MOVE_WILL_O_WISP | Level 50 | 10 | 4/10 source components still lack an exact representative; no exact per-move config/render acceptance exists. |
| MOVE_MEGAHORN | Level 50 | 8 | 4/21 source components still lack an exact representative; no exact per-move config/render acceptance exists. |
| MOVE_SUPERPOWER | Level 50 | 3 | 5/14 source components still lack an exact representative; no exact per-move config/render acceptance exists. |
| MOVE_REVENGE | Level 50 | 3 | 5/14 source components still lack an exact representative; no exact per-move config/render acceptance exists. |
| MOVE_SPIT_UP | Level 50 | 1 | 6/10 source components still lack an exact representative; no exact per-move config/render acceptance exists. |
| MOVE_FURY_CUTTER | Level 50 | 5 | 9/17 source components still lack an exact representative; no exact per-move config/render acceptance exists. |
| MOVE_CURSE | Level 50 | 18 | 10/16 source components still lack an exact representative; no exact per-move config/render acceptance exists. |
| MOVE_ICE_BALL | Level 50 | 2 | 15/20 source components still lack an exact representative; no exact per-move config/render acceptance exists. |
| MOVE_HELPING_HAND | Level 50 | 5 | The current MechanicLab profile is singles-only. Legal Helping Hand fails before its success animation; the clap body cannot be captured through this profile. |
| MOVE_OUTRAGE | Open-only | 1 | 2/6 source components still lack an exact representative; Open-only Dragonite geometry and exact bilateral acceptance are absent. |

Helping Hand additionally remains blocked on a legal doubles Scene-ON staging profile. Outrage is Open-only and needs its own Dragonite geometry/acceptance; neither is covered by another move's reducer.

## Complete accepted-move readiness index

Legend: `H_BASIC` common state only; `H_DERIVED` extra geometry/slots; `H_OUTCOME` controller results; `H_VARIANT` turn/body/multi-hit; `H_RANDOM` visual randomness; `H_BUFFER` allocator/GPU/OAM/palette/task state. `L1` local inactive/cleanup, `L2` local active/terminal, `L3` fixed source-age envelope. Full config field types, reducer paths, allowed fixture species, source locations, and blocker definitions are in [animation-integration-readiness.json](./animation-integration-readiness.json).

| Move | Kind | Config entry | Host class | Identity | Local end | Blockers |
| --- | --- | --- | --- | --- | --- | --- |
| MOVE_EXTRASENSORY | damaging | SceneOnExtrasensoryConfig:2847 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_PURSUIT | damaging | SceneOnPursuitConfig:2820 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_FORESIGHT | status/no-hit | SceneOnForesightConfig:3814 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_RAPID_SPIN | damaging | SceneOnRapidSpinConfig:3803 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_UPROAR | damaging | SceneOnUproarConfig:3793 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SUNNY_DAY | status/no-hit | SceneOnSunnyDayConfig:3784 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_DRAGON_DANCE | status/no-hit | SceneOnDragonDanceConfig:3530 | H_BUFFER | generic typed union | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_AMNESIA | status/no-hit | SceneOnAmnesiaConfig:3521 | H_DERIVED | generic typed union | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_DERIVED |
| MOVE_DIVE | damaging | SceneOnDiveConfig:3134 | H_BUFFER+H_VARIANT | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER,B_VARIANT |
| MOVE_TRI_ATTACK | damaging | SceneOnTriAttackConfig:2929 | H_BUFFER | generic typed union | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_ZAP_CANNON | damaging | SceneOnZapCannonConfig:2959 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_THUNDERBOLT | damaging | SceneOnThunderboltConfig:2949 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_HYPER_BEAM | damaging | SceneOnHyperBeamConfig:2939 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SEISMIC_TOSS | damaging | SceneOnSeismicTossConfig:3146 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_AURORA_BEAM | damaging | SceneOnAuroraBeamConfig:2914 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_RAZOR_WIND | damaging | SceneOnRazorWindConfig:2888 | H_BUFFER+H_VARIANT | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER,B_VARIANT |
| MOVE_HIDDEN_POWER | damaging | SceneOnHiddenPowerConfig:2279 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_GRUDGE | status/no-hit | SceneOnGrudgeConfig:2269 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_WATER_SPOUT | damaging | SceneOnWaterSpoutConfig:3919 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_ROCK_BLAST | damaging | SceneOnRockBlastConfig:3956 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SWIFT | damaging | SceneOnSwiftConfig:3964 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_TRICK | status/no-hit | SceneOnTrickConfig:3938 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_ICE_BEAM | damaging | SceneOnIceBeamConfig:3973 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_ERUPTION | damaging | SceneOnEruptionConfig:3905 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SAND_TOMB | damaging | SceneOnSandTombConfig:3928 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SAFEGUARD | status/no-hit | SceneOnSafeguardConfig:2259 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SCREECH | status/no-hit | SceneOnScreechConfig:2245 | H_BASIC | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST |
| MOVE_DEFENSE_CURL | status/no-hit | SceneOnDefenseCurlConfig:3440 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SWEET_SCENT | status/no-hit | SceneOnSweetScentConfig:3426 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_HAIL | status/no-hit | SceneOnHailConfig:2222 | H_BUFFER | generic typed union | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_OCTAZOOKA | damaging | SceneOnOctazookaConfig:2976 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_LOVELY_KISS | status/no-hit | SceneOnLovelyKissConfig:3471 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_RAIN_DANCE | status/no-hit | SceneOnRainDanceConfig:2213 | H_BUFFER | generic typed union | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SOFT_BOILED | status/no-hit | SceneOnSoftBoiledConfig:1889 | H_OUTCOME | fixture-only (CHANSEY/CHANSEY) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME |
| MOVE_ABSORB | damaging | SceneOnAbsorbConfig:1929 | H_BUFFER+H_OUTCOME | fixture-only (LOMBRE/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER,B_OUTCOME |
| MOVE_LEECH_SEED | status/no-hit | SceneOnLeechSeedConfig:1948 | H_BUFFER+H_VARIANT | fixture-only (EXEGGCUTE/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER,B_VARIANT |
| MOVE_MEGA_DRAIN | damaging | SceneOnMegaDrainConfig:1972 | H_BUFFER+H_OUTCOME | fixture-only (SKIPLOOM/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER,B_OUTCOME |
| MOVE_GIGA_DRAIN | damaging | SceneOnGigaDrainConfig:1986 | H_BUFFER+H_OUTCOME | fixture-only (ROSELIA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER,B_OUTCOME |
| MOVE_DREAM_EATER | damaging | SceneOnDreamEaterConfig:1997 | H_BUFFER+H_OUTCOME | fixture-only (WIGGLYTUFF/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER,B_OUTCOME |
| MOVE_ACID | damaging | SceneOnAcidConfig:2339 | H_DERIVED | fixture-only (EKANS/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_ACID_ARMOR | status/no-hit | SceneOnAcidArmorConfig:4034 | H_BASIC | fixture-only (GRIMER/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_AERIAL_ACE | damaging | SceneOnAerialAceConfig:1633 | H_OUTCOME | fixture-only (PIDGEOTTO/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME |
| MOVE_AGILITY | status/no-hit | SceneOnAgilityConfig:3624 | H_BASIC | fixture-only (LEDYBA/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_ANCIENT_POWER | damaging | SceneOnAncientPowerConfig:2148 | H_BASIC | fixture-only (BALTOY/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_AROMATHERAPY | status/no-hit | SceneOnAromatherapyConfig:2155 | H_BASIC | fixture-only (VILEPLUME/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_ASTONISH | damaging | SceneOnAstonishConfig:3691 | H_RANDOM | fixture-only (LOUDRED/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_RANDOM |
| MOVE_ATTRACT | status/no-hit | SceneOnAttractConfig:3479 | H_BASIC | fixture-only (EEVEE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_BIND | damaging | SceneOnBindConfig:1562 | H_BUFFER | fixture-only (ONIX/MURKROW) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_BITE | damaging | SceneOnBiteConfig:2596 | H_BASIC | fixture-only (MEOWTH/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_BLAZE_KICK | damaging | SceneOnBlazeKickConfig:1528 | H_BUFFER | fixture-only (ONIX/MURKROW) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_BATON_PASS | status/no-hit | SceneOnBatonPassConfig:2557 | H_BASIC | fixture-only (AIPOM/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_BARRIER | status/no-hit | SceneOnBarrierConfig:2047 | H_BUFFER | fixture-only (DROWZEE/SPOINK/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_BLOCK | status/no-hit | SceneOnBlockConfig:2632 | H_BASIC | fixture-only (SUDOWOODO/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_ROCK_TOMB | damaging | SceneOnRockTombConfig:2640 | H_DERIVED | fixture-only (GRIMER/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_BODY_SLAM | damaging | SceneOnBodySlamConfig:2653 | H_BASIC | fixture-only (LICKITUNG/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_BOUNCE | damaging | SceneOnBounceConfig:1444 | H_OUTCOME+H_VARIANT | fixture-only (SPOINK/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME,B_VARIANT |
| MOVE_BRICK_BREAK | damaging | SceneOnBrickBreakConfig:2028 | H_VARIANT | fixture-only (LOMBRE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_VARIANT |
| MOVE_BUBBLE_BEAM | damaging | SceneOnBubbleBeamConfig:3021 | H_DERIVED | fixture-only (SURSKIT/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_BULK_UP | status/no-hit | SceneOnBulkUpConfig:3155 | H_DERIVED | fixture-only (PRIMEAPE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_CALM_MIND | status/no-hit | SceneOnCalmMindConfig:4041 | H_BASIC | fixture-only (LUNATONE/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_CHARM | status/no-hit | SceneOnCharmConfig:3284 | H_BASIC | fixture-only (LINOONE/MINUN/SHUCKLE) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_CONFUSION | damaging | SceneOnConfusionConfig:4267 | H_BASIC | fixture-only (KADABRA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_CONFUSE_RAY | status/no-hit | SceneOnConfuseRayConfig:4061 | H_BASIC | fixture-only (CHINCHOU/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_COTTON_SPORE | status/no-hit | SceneOnCottonSporeConfig:3493 | H_BASIC | fixture-only (MAREEP/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_COUNTER | damaging | SceneOnCounterConfig:4134 | H_BASIC | fixture-only (HITMONTOP/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_CRABHAMMER | damaging | SceneOnCrabHammerConfig:4196 | H_DERIVED | fixture-only (KRABBY/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_COVET | damaging | SceneOnCovetConfig:3291 | H_BASIC | fixture-only (LINOONE/MINUN/SHUCKLE) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_CROSS_CHOP | damaging | SceneOnCrossChopConfig:3032 | H_DERIVED | fixture-only (MACHOKE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_LEAF_BLADE | damaging | SceneOnLeafBladeConfig:3041 | H_DERIVED | fixture-only (SCEPTILE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_CRUNCH | damaging | SceneOnCrunchConfig:4113 | H_BASIC | fixture-only (HOUNDOUR/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_CRUSH_CLAW | damaging | SceneOnCrushClawConfig:4099 | H_BASIC | fixture-only (GROVYLE/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_DIZZY_PUNCH | damaging | SceneOnDizzyPunchConfig:3659 | H_RANDOM | fixture-only (SPINDA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_RANDOM |
| MOVE_DOUBLE_EDGE | damaging | SceneOnDoubleEdgeConfig:4204 | H_BASIC | fixture-only (HITMONTOP/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_DOUBLE_KICK | damaging | SceneOnDoubleKickConfig:4159 | H_RANDOM | fixture-only (NIDORINA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_RANDOM |
| MOVE_DOUBLE_TEAM | status/no-hit | SceneOnDoubleTeamConfig:1784 | H_BUFFER | fixture-only (ONIX/GROVYLE) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_DRAGON_BREATH | damaging | SceneOnDragonBreathConfig:1507 | H_BUFFER | fixture-only (ONIX/MURKROW) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_DRAGON_CLAW | damaging | SceneOnDragonClawConfig:4075 | H_BASIC | fixture-only (ALTARIA/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_DRAGON_RAGE | damaging | SceneOnDragonRageConfig:1854 | H_DERIVED | fixture-only (CHARMELEON/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_DRILL_PECK | damaging | SceneOnDrillPeckConfig:2618 | H_BASIC | fixture-only (FEAROW/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_DYNAMIC_PUNCH | damaging | SceneOnDynamicPunchConfig:3652 | H_BASIC | fixture-only (HITMONCHAN/SHUCKLE) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_DETECT | status/no-hit | SceneOnDetectConfig:4247 | H_DERIVED | fixture-only (YANMA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_DISABLE | status/no-hit | SceneOnDisableConfig:2072 | H_BASIC | fixture-only (DROWZEE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_EARTHQUAKE | damaging | SceneOnEarthquakeConfig:3765 | H_DERIVED | fixture-only (DUGTRIO/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_EMBER | damaging | SceneOnEmberConfig:1834 | H_BUFFER | fixture-only (ONIX/MURKROW) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_ENCORE | status/no-hit | SceneOnEncoreConfig:4068 | H_BASIC | fixture-only (MINUN/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_ENDEAVOR | damaging | SceneOnEndeavorConfig:1824 | H_BUFFER | fixture-only (ONIX/GROVYLE) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_ENDURE | status/no-hit | SceneOnEndureConfig:3059 | H_DERIVED | fixture-only (EEVEE/TAILLOW/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_EXPLOSION | damaging | SceneOnExplosionConfig:3645 | H_BASIC | fixture-only (GLALIE/SHUCKLE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_EXTREME_SPEED | damaging | SceneOnExtremeSpeedConfig:1624 | H_DERIVED | fixture-only (ARCANINE/DUGTRIO) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_FAINT_ATTACK | damaging | SceneOnFaintAttackConfig:1748 | H_BUFFER | fixture-only (ONIX/GROVYLE) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_FACADE | damaging | SceneOnFacadeConfig:4016 | H_DERIVED | fixture-only (AZUMARILL/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_SMELLING_SALT | damaging | SceneOnSmellingSaltConfig:2295 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_FAKE_OUT | damaging | SceneOnFakeOutConfig:3705 | H_DERIVED | fixture-only (MAKUHITA/SHUCKLE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_FAKE_TEARS | status/no-hit | SceneOnFakeTearsConfig:3298 | H_OUTCOME | fixture-only (DELCATTY/SHUCKLE) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME |
| MOVE_FEATHER_DANCE | status/no-hit | SceneOnFeatherDanceConfig:1578 | H_OUTCOME | fixture-only (PIDGEOTTO/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME |
| MOVE_FIRE_PUNCH | damaging | SceneOnFirePunchConfig:1679 | H_OUTCOME | fixture-only (GROVYLE/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME |
| MOVE_FIRE_SPIN | damaging | SceneOnFireSpinConfig:4083 | H_BASIC | fixture-only (CHARMELEON/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_FLAMETHROWER | damaging | SceneOnFlamethrowerConfig:1519 | H_BUFFER | fixture-only (ONIX/MURKROW) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_FLAME_WHEEL | damaging | SceneOnFlameWheelConfig:1555 | H_BASIC | fixture-only (QUILAVA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_FLY | damaging | SceneOnFlyConfig:1481 | H_OUTCOME+H_VARIANT | fixture-only (MURKROW/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME,B_VARIANT |
| MOVE_FLAIL | damaging | SceneOnFlailConfig:3677 | H_RANDOM | fixture-only (KRABBY/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_RANDOM |
| MOVE_FOCUS_ENERGY | status/no-hit | SceneOnFocusEnergyConfig:3050 | H_DERIVED | fixture-only (EEVEE/TAILLOW/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_FOCUS_PUNCH | damaging | SceneOnFocusPunchConfig:2408 | H_BASIC | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST |
| MOVE_FURY_SWIPES | damaging | SceneOnFurySwipesConfig:3669 | H_BASIC | fixture-only (AIPOM/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_FOLLOW_ME | status/no-hit | SceneOnFollowMeConfig:3356 | H_DERIVED | fixture-only (TOGETIC/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_FUTURE_SIGHT | damaging | SceneOnFutureSightConfig:4260 | H_BASIC | fixture-only (KADABRA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_GRASS_WHISTLE | status/no-hit | SceneOnGrassWhistleConfig:4218 | H_BASIC | fixture-only (ROSELIA/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_GROWTH | status/no-hit | SceneOnGrowthConfig:1874 | H_BASIC | fixture-only (IVYSAUR/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_GLARE | status/no-hit | SceneOnGlareConfig:3207 | H_DERIVED | fixture-only (DUNSPARCE/SHUCKLE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_HAZE | status/no-hit | SceneOnHazeConfig:2079 | H_BASIC | fixture-only (KOFFING/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_HARDEN | status/no-hit | SceneOnHardenConfig:3991 | H_DERIVED | fixture-only (RELICANTH/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_HEADBUTT | damaging | SceneOnHeadbuttConfig:2603 | H_BASIC | fixture-only (ZIGZAGOON/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_HORN_DRILL | damaging | SceneOnHornDrillConfig:2904 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_HI_JUMP_KICK | damaging | SceneOnHiJumpKickConfig:2528 | H_BASIC | fixture-only (MEDICHAM/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_HOWL | status/no-hit | SceneOnHowlConfig:3395 | H_BASIC | fixture-only (LOUDRED/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_HYDRO_PUMP | damaging | SceneOnHydroPumpConfig:3004 | H_DERIVED | fixture-only (MASQUERAIN/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_HYPER_FANG | damaging | SceneOnHyperFangConfig:2372 | H_BASIC | fixture-only (RATICATE/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_HYPNOSIS | status/no-hit | SceneOnHypnosisConfig:3514 | H_BASIC | fixture-only (POLITOED/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_ICE_PUNCH | damaging | SceneOnIcePunchConfig:1693 | H_OUTCOME | fixture-only (GROVYLE/ONIX/GROVYLE/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME |
| MOVE_BLIZZARD | damaging | SceneOnBlizzardConfig:3267 | H_DERIVED | fixture-only (PELIPPER/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_ICY_WIND | damaging | SceneOnIcyWindConfig:3254 | H_DERIVED | fixture-only (SWINUB/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_IRON_DEFENSE | status/no-hit | SceneOnIronDefenseConfig:4000 | H_DERIVED | fixture-only (CLAMPERL/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_IRON_TAIL | damaging | SceneOnIronTailConfig:3737 | H_BASIC | fixture-only (AZUMARILL/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_KARATE_CHOP | damaging | SceneOnKarateChopConfig:2550 | H_BASIC | fixture-only (PRIMEAPE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_KNOCK_OFF | damaging | SceneOnKnockOffConfig:4281 | H_DERIVED | fixture-only (PLUSLE/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_LICK | damaging | SceneOnLickConfig:4127 | H_BASIC | fixture-only (LICKITUNG/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_MAGICAL_LEAF | damaging | SceneOnMagicalLeafConfig:3728 | H_DERIVED | fixture-only (ROSELIA/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_LIGHT_SCREEN | status/no-hit | SceneOnLightScreenConfig:2036 | H_BUFFER | fixture-only (EXEGGCUTE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_LOW_KICK | damaging | SceneOnLowKickConfig:2542 | H_BASIC | fixture-only (MACHOKE/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_LUSTER_PURGE | damaging | SceneOnLusterPurgeConfig:3591 | H_RANDOM | fixture-only (LATIOS/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_RANDOM |
| MOVE_MAGIC_COAT | status/no-hit | SceneOnMagicCoatConfig:2055 | H_BUFFER | fixture-only (DROWZEE/SPOINK/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_MEGA_PUNCH | damaging | SceneOnMegaPunchConfig:2386 | H_BASIC | fixture-only (CACTURNE/SUDOWOODO/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_MEGA_KICK | damaging | SceneOnMegaKickConfig:2393 | H_BASIC | fixture-only (CACTURNE/SUDOWOODO/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_METAL_CLAW | damaging | SceneOnMetalClawConfig:4090 | H_DERIVED | fixture-only (CHARMANDER/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_METAL_SOUND | status/no-hit | SceneOnMetalSoundConfig:2237 | H_BASIC | fixture-only (ARON/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_METEOR_MASH | damaging | SceneOnMeteorMashConfig:1538 | H_DERIVED | fixture-only (METANG/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_MEMENTO | status/no-hit | SceneOnMementoConfig:2094 | H_DERIVED | fixture-only (WEEZING/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_METRONOME | status/no-hit | SceneOnMetronomeConfig:3347 | H_DERIVED | fixture-only (CHANSEY/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_MILK_DRINK | status/no-hit | SceneOnMilkDrinkConfig:2171 | H_BASIC | fixture-only (MILTANK/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_MINIMIZE | status/no-hit | SceneOnMinimizeConfig:4025 | H_DERIVED | fixture-only (GRIMER/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_MIRROR_COAT | damaging | SceneOnMirrorCoatConfig:2115 | H_BUFFER | fixture-only (CORSOLA/EXEGGCUTE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_MOONLIGHT | status/no-hit | SceneOnMoonlightConfig:1911 | H_OUTCOME | fixture-only (GLOOM/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME |
| MOVE_MUDDY_WATER | damaging | SceneOnSurfConfig:3276 | H_BASIC | fixture-only (MARSHTOMP/WARTORTLE/ONIX/SHUCKLE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_MUD_SHOT | damaging | SceneOnMudShotConfig:2993 | H_DERIVED | fixture-only (KRABBY/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_MUD_SLAP | damaging | SceneOnMudSlapConfig:1669 | H_BUFFER | fixture-only (PIDGEOTTO/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_NEEDLE_ARM | damaging | SceneOnNeedleArmConfig:3562 | H_BASIC | fixture-only (CACNEA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_PERISH_SONG | status/no-hit | SceneOnPerishSongConfig:3555 | H_BASIC | fixture-only (MURKROW/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_HEAL_BELL | status/no-hit | SceneOnHealBellConfig:2186 | H_BASIC | fixture-only (CHIMECHO/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_PIN_MISSILE | damaging | SceneOnPinMissileConfig:2697 | H_BASIC | fixture-only (QWILFISH/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_POISON_FANG | damaging | SceneOnPoisonFangConfig:2365 | H_BASIC | fixture-only (ZUBAT/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_POISON_TAIL | damaging | SceneOnPoisonTailConfig:3744 | H_BASIC | fixture-only (SEVIPER/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_PRESENT | damaging | SceneOnPresentConfig:1920 | H_OUTCOME+H_VARIANT | fixture-only (DELIBIRD/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME,B_VARIANT |
| MOVE_PROTECT | status/no-hit | SceneOnProtectConfig:2063 | H_BUFFER | fixture-only (HOUNDOUR/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_PSYCHIC | damaging | SceneOnPsychicConfig:4274 | H_BASIC | fixture-only (KADABRA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_PSYBEAM | damaging | SceneOnPsybeamConfig:3539 | H_DERIVED | fixture-only (SPINDA/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_QUICK_ATTACK | damaging | SceneOnQuickAttackConfig:1596 | H_OUTCOME | fixture-only (PIDGEOTTO/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_OUTCOME |
| MOVE_RAZOR_LEAF | damaging | SceneOnRazorLeafConfig:3721 | H_BASIC | fixture-only (WEEPINBELL/SHUCKLE) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_RECOVER | status/no-hit | SceneOnRecoverConfig:1881 | H_BASIC | fixture-only (KADABRA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_REFLECT | status/no-hit | SceneOnReflectConfig:2017 | H_BUFFER | fixture-only (MINUN/SHUCKLE) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_REFRESH | status/no-hit | SceneOnRefreshConfig:2178 | H_BASIC | fixture-only (CHANSEY/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_REST | status/no-hit | SceneOnRestConfig:3376 | H_BASIC | fixture-only (TEDDIURSA/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SLEEP_TALK | status/no-hit | SceneOnSleepTalkConfig:3384 | H_BASIC | fixture-only (SEAKING/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_REVERSAL | damaging | SceneOnReversalConfig:3068 | H_DERIVED | fixture-only (VIGOROTH/DELCATTY) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_ROLE_PLAY | status/no-hit | SceneOnRolePlayConfig:2565 | H_BASIC | fixture-only (KADABRA/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_ROAR | status/no-hit | SceneOnRoarConfig:3410 | H_BASIC | fixture-only (HOUNDOUR/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_ROCK_SLIDE | damaging | SceneOnRockSlideConfig:1762 | H_BUFFER | fixture-only (GROVYLE/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_ROCK_THROW | damaging | SceneOnRockThrowConfig:1773 | H_BUFFER | fixture-only (GRAVELER/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_ROLLING_KICK | damaging | SceneOnRollingKickConfig:2535 | H_BASIC | fixture-only (HITMONLEE/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_HEAT_WAVE | damaging | SceneOnHeatWaveConfig:3576 | H_BASIC | fixture-only (NINETALES/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SANDSTORM | status/no-hit | SceneOnSandstormConfig:3569 | H_BASIC | fixture-only (PHANPY/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SAND_ATTACK | status/no-hit | SceneOnSandAttackConfig:1652 | H_BUFFER+H_OUTCOME | fixture-only (PIDGEOTTO/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER,B_OUTCOME |
| MOVE_SCARY_FACE | status/no-hit | SceneOnScaryFaceConfig:3198 | H_DERIVED | fixture-only (RHYHORN/SHUCKLE) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_SECRET_POWER | damaging | SceneOnSecretPowerConfig:2667 | H_BASIC | fixture-only (TEDDIURSA/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SELF_DESTRUCT | damaging | SceneOnSelfDestructConfig:3638 | H_BASIC | fixture-only (SUDOWOODO/SHUCKLE) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SHADOW_BALL | damaging | SceneOnShadowBallConfig:4054 | H_BASIC | fixture-only (SABLEYE/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SHADOW_PUNCH | damaging | SceneOnShadowPunchConfig:1862 | H_DERIVED | fixture-only (HAUNTER/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_SING | status/no-hit | SceneOnSingConfig:4211 | H_BASIC | fixture-only (AZURILL/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_TEETER_DANCE | status/no-hit | SceneOnTeeterDanceConfig:4226 | H_RANDOM | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_RANDOM |
| MOVE_SLASH | damaging | SceneOnSlashConfig:4120 | H_BASIC | fixture-only (CHARMELEON/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SLAM | damaging | SceneOnSlamConfig:2660 | H_BASIC | fixture-only (LICKITUNG/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SLUDGE | damaging | SceneOnSludgeConfig:2348 | H_DERIVED | fixture-only (GRIMER/WEEPINBELL/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_SLUDGE_BOMB | damaging | SceneOnSludgeBombConfig:2357 | H_DERIVED | fixture-only (GRIMER/WEEPINBELL/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_SMOKESCREEN | status/no-hit | SceneOnSmokescreenConfig:2968 | H_BASIC | fixture-only (KOFFING/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SONIC_BOOM | damaging | SceneOnSonicBoomConfig:2704 | H_BASIC | fixture-only (MAGNETON/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SPARK | damaging | SceneOnSparkConfig:3218 | H_DERIVED | fixture-only (MINUN/SHUCKLE) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_SPIKE_CANNON | damaging | SceneOnSpikeCannonConfig:2689 | H_BASIC | fixture-only (OMASTAR/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SPORE | status/no-hit | SceneOnSporeConfig:3486 | H_BASIC | fixture-only (PARASECT/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_NIGHT_SHADE | damaging | SceneOnNightShadeConfig:2102 | H_BASIC | fixture-only (ARIADOS/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SPITE | status/no-hit | SceneOnSpiteConfig:2086 | H_BASIC | fixture-only (HAUNTER/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_STEEL_WING | damaging | SceneOnSteelWingConfig:3751 | H_BASIC | fixture-only (WINGULL/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_STOMP | damaging | SceneOnStompConfig:2573 | H_BASIC | fixture-only (LOUDRED/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_STUN_SPORE | status/no-hit | SceneOnStunSporeConfig:3500 | H_BASIC | fixture-only (HOPPIP/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SLEEP_POWDER | status/no-hit | SceneOnSleepPowderConfig:3507 | H_BASIC | fixture-only (HOPPIP/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SUBMISSION | damaging | SceneOnSubmissionConfig:2611 | H_BASIC | fixture-only (POLIWRATH/LICKITUNG) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SUBSTITUTE | status/no-hit | SceneOnSubstituteConfig:3714 | H_BASIC | fixture-only (GOLEM/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SUPERSONIC | status/no-hit | SceneOnSupersonicConfig:2230 | H_BASIC | fixture-only (DUSTOX/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SUPER_FANG | damaging | SceneOnSuperFangConfig:2379 | H_BASIC | fixture-only (RATICATE/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SURF | damaging | SceneOnSurfConfig:3276 | H_BASIC | fixture-only (MARSHTOMP/WARTORTLE/ONIX/SHUCKLE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SWAGGER | status/no-hit | SceneOnSwaggerConfig:3109 | H_DERIVED | fixture-only (RATTATA/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_FRUSTRATION | damaging | SceneOnFrustrationConfig:3119 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_STOCKPILE | status/no-hit | SceneOnStockpileConfig:3096 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SWALLOW | status/no-hit | SceneOnSwallowConfig:3085 | H_DERIVED | fixture-only (PELIPPER/DELCATTY/SABLEYE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_SWEET_KISS | status/no-hit | SceneOnSweetKissConfig:3418 | H_BASIC | fixture-only (LUVDISC/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SWORDS_DANCE | status/no-hit | SceneOnSwordsDanceConfig:3631 | H_BASIC | fixture-only (LEDIAN/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_SYNTHESIS | status/no-hit | SceneOnSynthesisConfig:2126 | H_BASIC | fixture-only (SKIPLOOM/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_TAIL_GLOW | status/no-hit | SceneOnTailGlowConfig:3608 | H_DERIVED | fixture-only (VOLBEAT/SHUCKLE) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_TAIL_WHIP | status/no-hit | SceneOnTailWhipConfig:3617 | H_BASIC | fixture-only (PONYTA/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_TAKE_DOWN | damaging | SceneOnTakeDownConfig:4106 | H_BASIC | fixture-only (SWABLU/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_TAUNT | status/no-hit | SceneOnTauntConfig:3169 | H_DERIVED | fixture-only (MURKROW/SHUCKLE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_THRASH | damaging | SceneOnThrashConfig:4146 | H_RANDOM | fixture-only (TAUROS/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_RANDOM |
| MOVE_THUNDER | damaging | SceneOnThunderConfig:3245 | H_DERIVED | fixture-only (MAGNETON/SHUCKLE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_THUNDER_PUNCH | damaging | SceneOnThunderPunchConfig:1733 | H_BASIC | fixture-only (ONIX/MURKROW) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_THUNDER_WAVE | status/no-hit | SceneOnThunderWaveConfig:3236 | H_DERIVED | fixture-only (FLAAFFY/SHUCKLE) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_TICKLE | status/no-hit | SceneOnTickleConfig:3340 | H_BASIC | fixture-only (OMANYTE/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_TOXIC | status/no-hit | SceneOnToxicConfig:3758 | H_BASIC | fixture-only (CLAMPERL/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_TORMENT | status/no-hit | SceneOnTormentConfig:3178 | H_DERIVED | fixture-only (MURKROW/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_TRIPLE_KICK | damaging | SceneOnTripleKickConfig:4169 | H_VARIANT | fixture-only (HITMONTOP/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_VARIANT |
| MOVE_TWINEEDLE | damaging | SceneOnTwineedleConfig:2674 | H_BASIC | fixture-only (BEEDRILL/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_VICE_GRIP | damaging | SceneOnViceGripConfig:2581 | H_BASIC | fixture-only (CRAWDAUNT/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_WATER_GUN | damaging | SceneOnWaterGunConfig:2330 | H_DERIVED | fixture-only (HORSEA/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_WHIRLPOOL | damaging | SceneOnWhirlpoolConfig:3013 | H_VARIANT | fixture-only (WAILMER/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_VARIANT |
| MOVE_WHIRLWIND | status/no-hit | SceneOnWhirlwindConfig:2625 | H_BASIC | fixture-only (BUTTERFREE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_WISH | status/no-hit | SceneOnWishConfig:2162 | H_DERIVED | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_DERIVED |
| MOVE_WRAP | damaging | SceneOnWrapConfig:1570 | H_BUFFER | fixture-only (TENTACOOL/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_FLASH | status/no-hit | SceneOnFlashConfig:4009 | H_BASIC | fixture-only (MAREEP/ONIX) | L3 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_MIST_BALL | damaging | SceneOnMistBallConfig:3583 | H_BASIC | fixture-only (LATIAS/REGISTEEL) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_DOUBLE_SLAP | damaging | SceneOnDoubleSlapConfig:4178 | H_VARIANT | fixture-only (POLIWHIRL/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_VARIANT |
| MOVE_COMET_PUNCH | damaging | SceneOnCometPunchConfig:4187 | H_VARIANT | fixture-only (LEDIAN/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_VARIANT |
| MOVE_LEER | status/no-hit | SceneOnLeerConfig:2323 | H_BASIC | fixture-only (DRAGONAIR/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_GUILLOTINE | damaging | SceneOnGuillotineConfig:2589 | H_BASIC | fixture-only (GLIGAR/ONIX) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_FISSURE | damaging | SceneOnFissureConfig:3982 | H_DERIVED | fixture-only (DUGTRIO/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_DERIVED |
| MOVE_COSMIC_POWER | status/no-hit | SceneOnCosmicPowerConfig:2134 | H_BASIC | fixture-only (LUNATONE/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_PAIN_SPLIT | status/no-hit | SceneOnPainSplitConfig:2010 | H_BASIC | fixture-only (MISDREAVUS/GENGAR) | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_YAWN | status/no-hit | SceneOnYawnConfig:3403 | H_BASIC | fixture-only (TOGETIC/GENGAR) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY |
| MOVE_FIRE_BLAST | damaging | SceneOnFireBlastConfig:2194 | H_BUFFER | fixture-only (OCTILLERY/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_ROLLOUT | damaging | SceneOnRolloutConfig:2203 | H_BUFFER | fixture-only (VOLTORB/ONIX) | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_IDENTITY,B_BUFFER |
| MOVE_SPIKES | status/no-hit | SceneOnSpikesConfig:2985 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_BELLY_DRUM | status/no-hit | SceneOnBellyDrumConfig:4238 | H_DERIVED | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_DERIVED |
| MOVE_MEAN_LOOK | status/no-hit | SceneOnMeanLookConfig:3462 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_RECYCLE | status/no-hit | SceneOnRecycleConfig:2315 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_INGRAIN | status/no-hit | SceneOnIngrainConfig:3453 | H_BUFFER | generic typed union | L2 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SOLAR_BEAM | damaging | SceneOnSolarBeamConfig:2519 | H_VARIANT | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_VARIANT |
| MOVE_MAGNITUDE | damaging | SceneOnMagnitudeConfig:3775 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SPIDER_WEB | status/no-hit | SceneOnSpiderWebConfig:3824 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_PETAL_DANCE | damaging | SceneOnPetalDanceConfig:3835 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SKY_UPPERCUT | damaging | SceneOnSkyUppercutConfig:3847 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_DESTINY_BOND | status/no-hit | SceneOnDestinyBondConfig:3863 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_WATER_PULSE | damaging | SceneOnWaterPulseConfig:3878 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_DIG | damaging | SceneOnDigConfig:3893 | H_BUFFER+H_VARIANT | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER,B_VARIANT |
| MOVE_AIR_CUTTER | damaging | SceneOnAirCutterConfig:2716 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SHEER_COLD | damaging | SceneOnSheerColdConfig:2731 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SMOG | damaging | SceneOnSmogConfig:2746 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_BONEMERANG | damaging | SceneOnBonemerangConfig:2760 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_MACH_PUNCH | damaging | SceneOnMachPunchConfig:2416 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SIGNAL_BEAM | damaging | SceneOnSignalBeamConfig:2776 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_PSYCH_UP | status/no-hit | SceneOnPsychUpConfig:2426 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_HYPER_VOICE | damaging | SceneOnHyperVoiceConfig:2440 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SHOCK_WAVE | damaging | SceneOnShockWaveConfig:2455 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_NIGHTMARE | status/no-hit | SceneOnNightmareConfig:2790 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_OVERHEAT | damaging | SceneOnOverheatConfig:2470 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SILVER_WIND | damaging | SceneOnSilverWindConfig:2485 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SNORE | damaging | SceneOnSnoreConfig:2496 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_SKY_ATTACK | damaging | SceneOnSkyAttackConfig:2507 | H_BUFFER+H_VARIANT | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER,B_VARIANT |
| MOVE_SKILL_SWAP | status/no-hit | SceneOnSkillSwapConfig:2806 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_PSYWAVE | damaging | SceneOnPsywaveConfig:2835 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_RETURN | damaging | SceneOnReturnConfig:2862 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
| MOVE_FLATTER | status/no-hit | SceneOnFlatterConfig:2877 | H_BUFFER | generic typed union | L1 | B_DISPATCH,B_LIFECYCLE,B_HOST,B_BUFFER |
