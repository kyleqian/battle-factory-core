# AI: Synthesis / Morning Sun / Moonlight lose 2 points in clear weather when the AI's register reads "bad weather"

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
