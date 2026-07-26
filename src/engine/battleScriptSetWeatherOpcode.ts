/**
 * Screens/weather registration slice 3 (docs/screens-weather-ground-truth.md
 * §1b/§2/§6 item 3): `B_SCR_OP_SETRAIN` / `SETSUNNY` / `SETSANDSTORM` /
 * `SETHAIL` -- `Cmd_setrain:6681` / `Cmd_setsunny:8767` /
 * `Cmd_setsandstorm:7586` / `Cmd_sethail:9055`. Same shape as the screen/mist
 * setters (`battleScriptSetSideStatusOpcode.ts`) but writing the single
 * shared `gBattleWeather`/`gWishFutureKnock.weatherDuration` pair instead of
 * a per-side status: fail if the *same* weather bit is already up, else a
 * flat `=` assignment (not `|=` -- clobbers any other weather's bits, doc §2's
 * load-bearing finding) plus `weatherDuration = 5`. Source-complete (a): no
 * unmodeled sub-case, so no `unsupported-branch` barrier.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { BATTLE_SCRIPT_MOVE_RESULT_MISSED } from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:232-244 -- the four TEMPORARY bits this engine's raw `weather` u32 field carries at Factory L50 (no PERMANENT setter exists). */
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_SUN_TEMPORARY = 1 << 5;
const B_WEATHER_HAIL = 1 << 7;
const B_WEATHER_HAIL_TEMPORARY = 1 << 7;

/** battle_message.c:908-911 -- gMoveWeatherChangeStringIds' MULTISTRING_CHOOSER indices. */
const B_MSG_STARTED_RAIN = 0;
const B_MSG_WEATHER_FAILED = 2;
const B_MSG_STARTED_SANDSTORM = 3;
const B_MSG_STARTED_SUNLIGHT = 4;
const B_MSG_STARTED_HAIL = 5;

type SetWeatherConfig = Readonly<{
  activeMask: number;
  temporaryBit: number;
  successChooser: number;
}>;

function createSetWeatherHandler(
  config: SetWeatherConfig,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const nextRules = (rules.weather & config.activeMask) !== 0
      ? Object.freeze({
        ...rules,
        moveResultFlags: (rules.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
        multistringChooser: B_MSG_WEATHER_FAILED,
      })
      : Object.freeze({
        ...rules,
        weather: config.temporaryBit,
        weatherTimer: 5,
        multistringChooser: config.successChooser,
      });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRules });
  };
}

const RAIN_CONFIG: SetWeatherConfig = Object.freeze({
  activeMask: B_WEATHER_RAIN,
  temporaryBit: B_WEATHER_RAIN_TEMPORARY,
  successChooser: B_MSG_STARTED_RAIN,
});
const SUNNY_CONFIG: SetWeatherConfig = Object.freeze({
  activeMask: B_WEATHER_SUN,
  temporaryBit: B_WEATHER_SUN_TEMPORARY,
  successChooser: B_MSG_STARTED_SUNLIGHT,
});
const SANDSTORM_CONFIG: SetWeatherConfig = Object.freeze({
  activeMask: B_WEATHER_SANDSTORM,
  temporaryBit: B_WEATHER_SANDSTORM_TEMPORARY,
  successChooser: B_MSG_STARTED_SANDSTORM,
});
const HAIL_CONFIG: SetWeatherConfig = Object.freeze({
  activeMask: B_WEATHER_HAIL,
  temporaryBit: B_WEATHER_HAIL_TEMPORARY,
  successChooser: B_MSG_STARTED_HAIL,
});

function registerSingleInstruction(
  program: BattleScriptProgram,
  opcodeName: string,
  handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter((instruction) => instruction.opcodeName === opcodeName);
  if (starts.length !== 1) {
    throw new Error(`${opcodeName} requires exactly 1 concrete start, got ${starts.length}`);
  }
  const [instruction] = starts;
  if (instruction!.operands.length !== 0) {
    throw new Error(`invalid ${opcodeName} shape at program counter ${instruction!.programCounter}`);
  }
  return Object.freeze({ [instruction!.opcodeId]: handler });
}

export function createBattleScriptSetWeatherOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  return Object.freeze({
    ...registerSingleInstruction(program, "B_SCR_OP_SETRAIN", createSetWeatherHandler(RAIN_CONFIG)),
    ...registerSingleInstruction(program, "B_SCR_OP_SETSUNNY", createSetWeatherHandler(SUNNY_CONFIG)),
    ...registerSingleInstruction(program, "B_SCR_OP_SETSANDSTORM", createSetWeatherHandler(SANDSTORM_CONFIG)),
    ...registerSingleInstruction(program, "B_SCR_OP_SETHAIL", createSetWeatherHandler(HAIL_CONFIG)),
  });
}
