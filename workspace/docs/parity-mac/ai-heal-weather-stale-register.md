# AI: two move scripts read a leftover value as the weather when the weather is clear (Synthesis-type heals; Fly / Dig / Dive / Bounce)

Found by the first real-ROM replay of Frontier Brain battles (silver Noland, ROM seed 7922).

## Symptom

Seed 7922, turn 7. Noland's Tropius (29 / 166 HP, asleep, clear weather; Solar Beam, Sunny Day, Synthesis, Body Slam)
against Weepinbell.

- ROM: the AI picks Body Slam.
- Engine: the AI picked Synthesis (scores 98 / 99 / **102** / 100).

Both sides spend the same six draws (four set-up rolls, one heal roll, one tie draw), so the difference is a score.
From there the battles differ (the engine's Tropius heals to 112 HP).

## C source

`data/battle_ai_scripts.s:1315-1323`:

    AI_CV_HealWeather:
        get_weather
        if_equal AI_WEATHER_HAIL, AI_CV_HealWeather_ScoreDown2
        if_equal AI_WEATHER_RAIN, AI_CV_HealWeather_ScoreDown2
        if_equal AI_WEATHER_SANDSTORM, AI_CV_HealWeather_ScoreDown2
        goto AI_CV_Heal
    AI_CV_HealWeather_ScoreDown2:
        score -2
    AI_CV_Heal: ...

`Cmd_get_weather` (`battle_ai_script_commands.c:1644-1665`, the non-BUGFIX build) writes `funcResult` only when a
weather bit is set. In clear weather the three `if_equal` test whatever an earlier command left in `funcResult`.

The scripts run one after the other over all four moves (`ChooseMoveOrAction_Singles`,
`battle_ai_script_commands.c:405-415`): Check Bad Move, then Try To Faint, then Check Viability. Try To Faint ends each
damaging move with `get_how_powerful_move_is` (`data/battle_ai_scripts.s:2619`), which writes 2 (most powerful), 1 (not
most powerful) or 0 (other) (`battle_ai_script_commands.c:1228-1236`). Those numbers are also `AI_WEATHER_SANDSTORM`,
`AI_WEATHER_RAIN` and `AI_WEATHER_SUN` (`include/constants/battle_ai.h:27-30`).

Seed 7922: Body Slam is the last move and the most powerful one (Solar Beam is on the discouraged list and does not
count), so the register holds 2. Solar Beam's and Sunny Day's Check Viability scripts write nothing (Sunny Day leaves at
its HP gate, `:2061`, before its own `get_weather`). Synthesis then reads "sandstorm": -2, and the heal body adds +2
(target faster, HP below 70%, the roll is not below 20). Synthesis 100, Body Slam 100, the tie draw picks Body Slam.

## Engine

`src/engine/factoryAiCheckViability.ts`, `runCvHealWeather`. The register carry was already modelled
(`staleFuncResultFallback`, set from Try To Faint in `factoryAiDecisionPolicy.ts`) and returned as `funcResultAfter`,
but the -2 was computed from the real weather only:

    const weatherPenalty = input.attacker.currentWeather !== undefined && input.attacker.currentWeather !== AI_WEATHER_SUN ? -2 : 0;

`weatherSetterCvScore` (Sunny Day / Hail / Rain Dance) reads the register correctly; the heal script did not.

## Fix

The penalty tests the same value the script tests, `currentWeather ?? staleFuncResultFallback`:

    const weatherPenalty = funcResultAfter !== undefined && funcResultAfter !== AI_WEATHER_SUN ? -2 : 0;

An unknown carry (`undefined`) still gives no penalty, as in the weather-setter handler.

## What changes for the game

An opponent that runs all three AI scripts (Noland, and ordinary trainers from challenge 4 on) and has Synthesis,
Morning Sun or Moonlight now values that move 2 points lower in clear weather when its last damaging move is its
strongest (or another carried value reads as rain / sandstorm / hail). It heals a little less often, as in the game.

## Proof

- Test `tests/parityMacAiHealWeatherStaleRegister.test.ts` (fails without the fix: the three carried values gave +2).
- ROM seed 7922 re-driven on the fixed engine: see `STATUS.md`, Brain section.

---

# Second script with the same read: Fly / Dig / Dive / Bounce

Found by reading every `get_weather` in the AI scripts after the fix above. No replay seed shows it; proof is a
Mechanic Lab run on the real ROM.

## C source

`data/battle_ai_scripts.s:2197-2241`, `AI_CV_SemiInvulnerable`. After the status checks:

        get_weather
        if_equal AI_WEATHER_HAIL, AI_CV_SemiInvulnerable_CheckSandstormTypes      (non-BUGFIX: the two are swapped)
        if_equal AI_WEATHER_SANDSTORM, AI_CV_SemiInvulnerable_CheckIceType
        goto AI_CV_SemiInvulnerable5

`CheckIceType` sends an Ice-type user to `TryEncourage` (one `if_random_less_than 80`, then +1);
`CheckSandstormTypes` does the same for a Ground / Rock / Steel user. `SemiInvulnerable5` first leaves when the target
is faster. In clear weather the two `if_equal` test the carried `funcResult`, as above.

## Engine

`src/engine/factoryAiCheckViability.ts`, `runCvSemiInvulnerable`: it computed `weatherWrite = weather ?? carry` for the
exit value, but the two branches tested `weather`. A carried 2 or 3 never took them.

## Fix

Both branches test `weatherWrite`.

## ROM proof (Mechanic Lab, Scene OFF, `challengeNum 4` = all three AI scripts; base request of seed 1816 with `overrides.parties`)

Player lead Meganium (154, speed 100, four Splash). Opponent lead Lapras (131, Water / Ice, speed 80). Clear weather.
Read from the ROM after the opponent's first decision: the four AI scores, and the number of `Random()` calls of that
decision (counted back from the action-menu `gRngValue` to the `gRandomTurnNumber` draw; the four set-up rolls checked).

| Lapras's moves | register when the first Dive is scored | ROM scores | ROM draws |
|---|---|---|---|
| Dive, Dive, Dive, **Ice Beam** | 2 (Ice Beam is the most powerful move) | **100** / 99 / 99 / 100 | 8 = 2 switch checks, 4 set-up, **1 roll**, 1 tie draw |
| Dive, Dive, Dive, **Tackle** (control) | 1 (Tackle is not) | 100 / 99 / 99 / 99 | 5 = 4 set-up, 1 tie draw |

First row: every Dive has -1 from Try To Faint (not the most powerful move). The first Dive reads "sandstorm", Lapras's
second type is Ice, so it takes the `TryEncourage` roll and gets +1. The register then holds `TYPE_ICE`; the second and
third Dive read no weather, go to `SemiInvulnerable5` and leave at `if_target_faster`. The unfixed engine gave the first
Dive 99 and spent no roll (7 draws), so every later random number of the battle differed.

Control row: slot 0 is the most powerful Dive (its set-up roll is the highest), so it has no -1; no slot rolls.

## What changes for the game

With the full AI, an Ice-type opponent with Dive or Dig (Cloyster on silver Noland's list, for example) now makes that
roll in clear weather when its last move is its strongest, as the game does; so does a Ground / Rock / Steel user of
Dig or Fly when the leftover value reads "hail". The move gets +1 about two times in three.

## Other `get_weather` readers, checked

- `AI_CBM_RainDance` / `SunnyDay` / `Hail` / `Sandstorm` (`:452-523`) and `AI_CV_SunnyDay` / `AI_CV_Hail` (`:2060`, `:2261`):
  the engine already tests the register (`runCbmWeatherSetter`, `weatherSetterCvScore`).
- `AI_CV_RainDance` (`:2036-2048`): when the user is not faster, `get_ability AI_USER` has just written the user's
  ability id, so in clear weather the script would give +1 to a user whose ability id is 2 (Drizzle) or 3 (Speed
  Boost). The engine does not model that. Not reachable in the Factory: no Rain Dance set belongs to a species with
  either ability (checked against `battle-frontier-mons.json`: 35 Rain Dance sets, none Yanma / Ninjask / Kyogre).

## Proof

- Tests in `tests/parityMacAiHealWeatherStaleRegister.test.ts`, second block (three fail without the fix).
- The lab requests are the two rows above; any session can re-stage them with `soundEventProbe.py lab REQ --setup-out`.
