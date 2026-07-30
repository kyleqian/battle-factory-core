/**
 * `B_SCR_OP_TRYCASTFORMDATACHANGE` / `Cmd_trycastformdatachange`
 * (`battle_script_commands.c:9744-9755`), this session's supervisor-decided
 * (a)/(b) split (PROGRESS 458's own escalation, answered rather than
 * half-ported): the opcode itself just advances one byte, then computes
 * `CastformDataTypeChange(gBattleScripting.battler)` (`battle_util.c:
 * 2396-2429`) and only *diverts* into the unported form-change subsystem
 * (`BattleScriptPushCursorAndCallback(BattleScript_CastformChange)`) when
 * that call returns nonzero.
 *
 * `CastformDataTypeChange` is ported here exactly, as a pure function of the
 * rules battler state (no source line skipped, no mutation applied for the
 * barrier path -- applying only the type write without the animation/
 * species-data/message tail it comes with would be a half-port):
 *   - `:2399` -- not a live Forecast Castform (wrong species, wrong/no
 *     ability, or fainted) returns 0 unconditionally. This is the (a) path:
 *     true for every battler in every non-Castform matchup, so this
 *     registration's only behavior for them is "advance," a real weather
 *     effect (Sandstorm/Rain Dance/Sunny Day/Hail) has nothing left to gate
 *     it on this opcode.
 *   - `:2401-2404` -- a live Forecast Castform with weather nullified
 *     (`WEATHER_HAS_EFFECT` false) and not already `TYPE_NORMAL` reverts to
 *     Normal. `WEATHER_HAS_EFFECT` (`include/battle_util.h:47`) is modeled
 *     the same way `battleScriptDamagingWeatherOpcode.ts`'s
 *     `battlerCarriesCloudNine` already established: "no battler on the
 *     field carries Cloud Nine" -- Air Lock is Rayquaza-only and confirmed
 *     absent from the Frontier catalog (docs/screens-weather-ground-truth.md
 *     §2), so it is not checked here.
 *   - `:2406-2407` -- weather nullified and already Normal: 0, no change.
 *   - `:2408-2427` -- weather has effect: a cascading re-derivation against
 *     the active weather bit (none/Sandstorm -> Normal, Sun -> Fire,
 *     Rain -> Water, Hail -> Ice), each `if` only assigning when the
 *     battler is not already that type. Ported as the same unconditional
 *     cascade (not first-match-wins) -- harmless because `gBattleWeather`'s
 *     rain/sun/hail bits are mutually exclusive in practice (every setter
 *     opcode does a flat `=`, `battleScriptSetWeatherOpcode.ts`'s own
 *     load-bearing finding), so at most one of the four conditions is ever
 *     true for a real weather state.
 *
 * A nonzero form is the real (b) barrier: it is exactly the moment a live
 * Castform rental's type is stale for the weather that was just set (the
 * common case whenever Castform is drafted -- PROGRESS 458's own
 * reachability finding, `FRONTIER_MON_CASTFORM_1`/`_2`), and this engine has
 * not ported `BattleScript_CastformChange`/`SET_BATTLER_TYPE`/the four-form
 * table. A single named halt covers all four form targets: they are one
 * missing subsystem, not four independent gaps.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { unsupportedBranch } from "./battleScriptHitChainOpcode.ts";
import type {
  BattleScriptRulesBattlerState,
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

/** include/constants/species.h:391. */
const SPECIES_CASTFORM = 385;
/** include/constants/abilities.h:63. */
const ABILITY_FORECAST = 59;
/** include/constants/abilities.h -- battleScriptDamagingWeatherOpcode.ts's own WEATHER_HAS_EFFECT modeling. */
const ABILITY_CLOUD_NINE = 13;

/** include/constants/battle.h:232-244 -- same encoding as battleScriptSetWeatherOpcode.ts/battleScriptDamagingWeatherOpcode.ts. */
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_HAIL = 1 << 7;
const B_WEATHER_RAIN_SUN_HAIL = (B_WEATHER_RAIN | B_WEATHER_SUN | B_WEATHER_HAIL) >>> 0;

/** include/constants/battle.h:328-331. */
const CASTFORM_NORMAL_FORM = 0 + 1;
const CASTFORM_FIRE_FORM = 1 + 1;
const CASTFORM_WATER_FORM = 2 + 1;
const CASTFORM_ICE_FORM = 3 + 1;

const TYPE_NORMAL = "TYPE_NORMAL";
const TYPE_FIRE = "TYPE_FIRE";
const TYPE_WATER = "TYPE_WATER";
const TYPE_ICE = "TYPE_ICE";
const CASTFORM_NORMAL_TYPES = Object.freeze([TYPE_NORMAL, TYPE_NORMAL]) as readonly [string, string];
const CASTFORM_FIRE_TYPES = Object.freeze([TYPE_FIRE, TYPE_FIRE]) as readonly [string, string];
const CASTFORM_WATER_TYPES = Object.freeze([TYPE_WATER, TYPE_WATER]) as readonly [string, string];
const CASTFORM_ICE_TYPES = Object.freeze([TYPE_ICE, TYPE_ICE]) as readonly [string, string];

function isBattlerOfType(battler: BattleScriptRulesBattlerState, type: string): boolean {
  return battler.types[0] === type || battler.types[1] === type;
}

/** include/battle_util.h:47's WEATHER_HAS_EFFECT, negated (true == some battler nullifies weather). */
function weatherIsNullified(rules: BattleScriptRulesContext): boolean {
  const count = rules.battleTopology.battlersCount;
  for (let i = 0; i < count; i += 1) {
    if (rules.battlers[i]!.ability === ABILITY_CLOUD_NINE) return true;
  }
  return false;
}

export interface CastformTypeChange {
  form: number;
  types: readonly [string, string];
}

/**
 * Pure source-shaped result of CastformDataTypeChange (battle_util.c:2396-2429).
 * The caller owns durable mutation/controller presentation; this pins the exact
 * form and SET_BATTLER_TYPE pair selected at the ability pass.
 */
export function computeCastformTypeChange(
  rules: BattleScriptRulesContext,
  battler: BattleScriptRulesBattlerState,
): CastformTypeChange {
  if (battler.species !== SPECIES_CASTFORM || battler.ability !== ABILITY_FORECAST || battler.hp === 0) {
    return Object.freeze({ form: 0, types: battler.types }); // :2399-2400
  }
  if (weatherIsNullified(rules)) {
    return isBattlerOfType(battler, TYPE_NORMAL)
      ? Object.freeze({ form: 0, types: battler.types })
      : Object.freeze({ form: CASTFORM_NORMAL_FORM, types: CASTFORM_NORMAL_TYPES }); // :2401-2407
  }
  let form = 0;
  let types = battler.types;
  if ((rules.weather & B_WEATHER_RAIN_SUN_HAIL) === 0 && !isBattlerOfType(battler, TYPE_NORMAL)) {
    form = CASTFORM_NORMAL_FORM; // :2408-2412
    types = CASTFORM_NORMAL_TYPES;
  }
  if ((rules.weather & B_WEATHER_SUN) !== 0 && !isBattlerOfType(battler, TYPE_FIRE)) {
    form = CASTFORM_FIRE_FORM; // :2413-2417
    types = CASTFORM_FIRE_TYPES;
  }
  if ((rules.weather & B_WEATHER_RAIN) !== 0 && !isBattlerOfType(battler, TYPE_WATER)) {
    form = CASTFORM_WATER_FORM; // :2418-2422
    types = CASTFORM_WATER_TYPES;
  }
  if ((rules.weather & B_WEATHER_HAIL) !== 0 && !isBattlerOfType(battler, TYPE_ICE)) {
    form = CASTFORM_ICE_FORM; // :2423-2427
    types = CASTFORM_ICE_TYPES;
  }
  return Object.freeze({ form, types: Object.freeze(types) });
}

/** Compatibility projection used by existing switch-in scheduling. */
export function computeCastformForm(rules: BattleScriptRulesContext, battler: BattleScriptRulesBattlerState): number {
  return computeCastformTypeChange(rules, battler).form;
}

function createTrycastformdatachangeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const battlerId = rules.scriptingBattler;
    const battler = rules.battlers[battlerId];
    const form = computeCastformForm(rules, battler);
    if (form === 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    return unsupportedBranch(
      context,
      `CastformDataTypeChange: live Forecast Castform battler ${battlerId} would change to form ${form - 1} `
        + "(0=Normal, 1=Fire, 2=Water, 3=Ice) -- BattleScript_CastformChange's SET_BATTLER_TYPE/four-form "
        + "table is not ported",
      "battle_util.c",
      2396,
    );
  };
}

export function createBattleScriptTryCastformDataChangeOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_TRYCASTFORMDATACHANGE",
  );
  if (starts.length !== 1) {
    throw new Error(`B_SCR_OP_TRYCASTFORMDATACHANGE requires exactly 1 concrete start, got ${starts.length}`);
  }
  const [instruction] = starts;
  if (instruction!.operands.length !== 0) {
    throw new Error(`invalid B_SCR_OP_TRYCASTFORMDATACHANGE shape at program counter ${instruction!.programCounter}`);
  }
  return Object.freeze({ [instruction!.opcodeId]: createTrycastformdatachangeHandler() });
}
