# snd179: Scene ON forced PLAYER send-in ("X was dragged out!")

Evidence only (ISSUES #146 open item 1; `docs/plr162-player-forced-send-in.md`, "Not landed" item 1). No `src/` change.

## Result

Frames from the send-in start (fixture `txtStart - ball`) to the first "dragged out!" print frame:

    message = max(91, cry + 66, T_back + 70)            (+1 for CASTFORM, 385)

- `cry` = `SEND_IN_TAIL_OFF_CRY_FRAMES[species]` (compiled cry length, `src/data/sendInTailOff.ts`), the Scene OFF cry term unchanged.
- `T_back` = first tick at which the species' back-animation reducer reports callback `WaitAnimEnd`
  (`selectBackSendOutAnimation(species, natureId)` -> `BACK_SEND_OUT_REDUCERS[backAnimSet]`, `src/animation/sendOutDispatcher.ts`).
  It depends on the sent-in mon's species and nature only.
- 91 / 66 / 70 are the only constants. They were not tuned per species. 91 and 66 are the Scene OFF constants (plr162); 70 is
  one value fitted once over the whole sweep.
- The attacker's Roar cry does NOT matter. This refutes the plr162 hypothesis.

## Fit

`node --experimental-strip-types --no-warnings tools/integration/snd179Predict.ts` (receipt `fixtures/snd179/predictor-sweep.json`)

| check | exact |
| --- | --- |
| ON sweep (339 rows, nature 6), model | 338 / 339 |
| ON sweep, model + CASTFORM +1 | 339 / 339 |
| ON sweep, Scene OFF model `max(91, cry+66)` alone | 134 / 339 |
| by predicted bound | back-anim 205 (204 exact), cry 133 (133), slide 1 (1) |

Only miss: species 385 CASTFORM, back-anim bound, predicted 157, measured 158, residual +1. This is the CASTFORM +1 shift every
send-in model already carries (healthbox slide 66, OFF message +1). It is categorized, not tuned.

Fresh ROM probes (Scene ON, direct mGBA, twice each, r1 == r2 byte-identical sha256):

- `rom-rows-r{1,2}.json`: 23 cases, 23 / 23 with the CASTFORM shift (22 / 23 without), r1 == r2 23 / 23.
  - Slide-bound: PIDGEY (91).
  - Cry-bound: METAPOD (132), MANKEY (113).
  - Back-anim-bound: TORKOAL (198, the largest), WIGGLYTUFF, BUTTERFREE, CASTFORM, PIKACHU, CHARIZARD, PRIMEAPE.
  - Nature variants (6 / 0 / 10): BULBASAUR 132 vs 161, WIGGLYTUFF 135 vs 184, TORKOAL unchanged.
  - Whirlwind attacker BUTTERFREE with player slot 2, nature 0: PIDGEY 107, METAPOD 132, CHARIZARD 198, WIGGLYTUFF 135, TORKOAL 198.
  - Other Roar attackers (295, 157 TYPHLOSION): same result as HOUNDOUR.
- `rom-rows-attackers-r{1,2}.json`: 4 cases (attackers JYNX female and 329, PIDGEY and CHARIZARD), 4 / 4, r1 == r2 4 / 4.

Reproduce:

    node --experimental-strip-types --no-warnings tools/integration/snd179Predict.ts
    node --experimental-strip-types --no-warnings tools/integration/snd179Predict.ts --probes=tools/integration/fixtures/snd179/rom-rows-r1.json,tools/integration/fixtures/snd179/rom-rows-r2.json
    node --experimental-strip-types --no-warnings tools/integration/snd179Predict.ts --probes=tools/integration/fixtures/snd179/rom-rows-attackers-r1.json,tools/integration/fixtures/snd179/rom-rows-attackers-r2.json
    # fresh probes: PY=/srv/pokebench/vendor/mgba-venv/bin/python python3 tools/integration/snd179Probe.py <tag> <out.json> tools/integration/fixtures/snd179/cases.json

## Mechanism (source)

1. `HITMARKER_NO_ANIMATIONS` (Scene OFF, battle_main.c:3085) makes `BattleAnimateBackSprite` (pokemon.c:6886) set `SpriteCallbackDummy` at once.
   In Scene ON it calls `LaunchAnimationTaskForBackSprite` (pokemon_animation.c:956) and leaves `SpriteCallbackDummy_2`, which becomes
   `SpriteCallbackDummy` only when the back-animation task ends. `SpriteCB_PlayerMonFromBall` (battle_main.c:2988) starts it when the emerge
   affine animation ends.
2. `PlayerHandleSwitchInAnim` (battle_controller_player.c:2185) -> `SwitchIn_TryShinyAnimShowHealthbox` (:1098) -> `SwitchIn_CleanShinyAnimShowSubstitute`
   (:1065, waits for the battler sprite callback to be `SpriteCallbackDummy`: Scene ON waits for the back animation) ->
   `SwitchIn_HandleSoundAndEnd` (:1087, waits for `!IsCryPlayingOrClearCrySongs`) -> controller idle; the print starts about 2 frames later.
3. So the message is bound by the slide (91), the cry (cry + 66, as in OFF), or the back animation (`T_back + 70`), whichever is last.
   The back animation is chosen by `sSpeciesToBackAnimSet` (:213), `sBackAnimationIds` (:787), `sBackAnimNatureModTable` (nature mod), `GetSpeciesBackAnimSet` (:885).
4. Move_ROAR (data/battle_anim_scripts.s:4965) plays the attacker's double cry and ends with `SoundTask_WaitForCry`, so it finishes before the
   send-in starts; Move_WHIRLWIND (:2032) has no cry. The attacker's cry length is therefore irrelevant (the probes confirm this).

## Where the production change goes (not done here)

- `src/engine/switchInTail.ts`, next to `sceneOffPlayerForcedSwitchInDuration`: add a Scene ON duration
  `shift + max(91, cry + 66, backAnimWaitTick(species, nature) + 70)`. The slide stays 65 + shift and the visual delay needs no new constant
  (not verified for Scene ON). Fix the comment that says Scene ON waits for the attacker's Roar cry.
- `src/engine/battleResolutionPresentation.ts`:
  - `switchInTiming` (~1257): take the Scene ON branch for `battler === 0 && forcedPlayer && sceneOn`; minimumFrames = duration - `SWITCH_IN_WAITSTATE_HOLD_FRAMES`.
  - ~4314: `sceneOffDraggedOut` is only marked for Scene OFF removals (`sceneOffRemoval`); mark Scene ON forced removals too (`forcedRemoval` with `BS_TARGET`).
  - ~4461: `forcedPlayer = battler === 0 && !sceneOn && ...` loses `!sceneOn`.
- The nature must reach the timing call. `switchInIncomingSnapshot` returns a `BattleCommandFieldBattler`; I did not find a `nature` field on it.
  The party member / corpus party carries one (`factoryCorpusParty.ts`) and the renderer already passes `natureId` to the back-send-out reducers.
  Threading it is the main open work. Only 1 of the 4 census species (LAIRON) changes with nature.
- Caveat, not verified: the current Scene ON player value (91 min frames + 11 hold) was calibrated on other rows. Before changing, confirm that
  the sweep's `txtStart - ball` is the same frame the present 91 + 11 refers to.

## Census reach

`plr162Census.ts --seeds=0..99 --scene=on` (receipt `fixtures/snd179/census-on-forced-player.json`): 100 seeds, no errors, 359 switch-ins, of which
**4 are forced player switch-ins**, in 3 seeds (23, 68, 76 x2). All four currently carry `minimumFrames` 91 + hold 11.

| seed | species | model message (nature 0 / 1 / 2) | bound |
| --- | --- | --- | --- |
| 23 | 383 LAIRON | 125 / 147 / 125 | cry (nature 0, 2), back-anim (nature 1) |
| 68 | 322 SABLEYE | 111 | back-anim |
| 76 | 363 ROSELIA | 198 | back-anim |
| 76 | 137 PORYGON | 123 | cry |

All four would change. The nature is not in the census output, so the LAIRON value is open. Nothing here is a ROM comparison of those
exact battles; the evidence is the sweep and probes above.

## Not done

- Item 4 (player FAINT-replacement send-in, one ROM card per scene): not run. It uses the same controller chain, so the same terms plausibly apply, but
  there is no "dragged out!" print, so a different row would have to be measured. No claim is made.
- Full `npm test` was not run (the host is shared and the brief forbids it). `npm run test:smoke`, `npm run typecheck` and `npm run build` were run instead.
