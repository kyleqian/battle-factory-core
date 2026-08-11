/**
 * `B_SCR_OP_TRYCASTFORMDATACHANGE` / `Cmd_trycastformdatachange`
 * (`battle_script_commands.c:9744-9755`) and
 * `B_SCR_OP_DOCASTFORMCHANGEANIMATION` / `Cmd_docastformchangeanimation`
 * (`battle_script_commands.c:9730-9740`) -- ROADMAP S10 gate-4's last
 * `unsupported-branch` retirement (the side lane's own step, reported to the
 * supervisor): a live Forecast Castform rental now actually CHANGES FORM AND
 * TYPE in weather instead of halting the battle-script machine.
 *
 * `Cmd_trycastformdatachange` advances one byte, computes
 * `CastformDataTypeChange(gBattleScripting.battler)` (`battle_util.c:
 * 2396-2429`) and, when that returns nonzero, pushes the real
 * `BattleScript_CastformChange` continuation (`BattleScriptPushCursorAndCallback`)
 * and writes `gBattleStruct->formToChangeInto = form - 1`. The machine models
 * that push exactly as a `call` (the pushed script cursor is the post-opcode
 * byte, so `BattleScript_CastformChange`'s `end3` pops back to the
 * WeatherFormChanges loop's `addbyte` -- the same script-flavor continuation
 * `docs/end3-design.md` §1.4(b) already documents).
 *
 * `CastformDataTypeChange` is ported here as a pure function of the rules
 * battler state (`computeCastformTypeChange`), and source's SET_BATTLER_TYPE
 * side effects are the caller's durable write via `withBattler`:
 *   - `:2399` -- not a live Forecast Castform (wrong species, wrong/no
 *     ability, or fainted) returns 0 unconditionally. True for every battler
 *     in every non-Castform matchup, so this registration's only behavior
 *     for them is "advance."
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
 * `Cmd_docastformchangeanimation` sets `gActiveBattler` to the scripting
 * battler, ORs `CASTFORM_SUBSTITUTE` into `formToChangeInto` when that
 * battler is behind a Substitute (`STATUS2_SUBSTITUTE`), emits the
 * `B_ANIM_CASTFORM_CHANGE` controller animation, and marks the battler for
 * controller exec. On the Battle Scene OFF profile the animation itself
 * draws nothing, so it is emitted as the same typed kernel `animation` event
 * the neighbouring opcodes already use for controller emissions.
 */
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { withBattler } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptControllerIdlePort } from "./battleScriptSourceCommands.ts";
import type {
  BattleScriptRulesBattlerState,
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_SUBSTITUTE } from "./battleScriptRulesContext.ts";

/** include/constants/species.h:391. */
const SPECIES_CASTFORM = 385;
/** include/constants/abilities.h:63. */
const ABILITY_FORECAST = 59;
/** include/constants/abilities.h -- battleScriptDamagingWeatherOpcode.ts's own WEATHER_HAS_EFFECT modeling. */
const ABILITY_CLOUD_NINE = 13;
/** include/constants/battle.h:333. */
const CASTFORM_SUBSTITUTE = 1 << 7;

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

/**
 * `Cmd_trycastformdatachange` (`battle_script_commands.c:9744-9755`). The
 * source advances the cursor first, so the pushed `BattleScript_CastformChange`
 * continuation returns to the post-opcode byte -- modeled as the machine's
 * `call` directive. The battler's two types are written durably here because
 * the pure `computeCastformTypeChange` port returns them instead of applying
 * source's `SET_BATTLER_TYPE` side effect.
 */
function createTrycastformdatachangeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const battlerId = rules.scriptingBattler;
    const battler = rules.battlers[battlerId];
    const change = computeCastformTypeChange(rules, battler);
    const withTypes = withBattler(rules, battlerId, { types: change.types });
    if (change.form === 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), {
        rulesContext: withTypes,
      });
    }
    const target = resolveBattleScriptLabel(context.program, "BattleScript_CastformChange");
    if (!target) {
      throw new Error("Cmd_trycastformdatachange: unresolved BattleScript_CastformChange label");
    }
    const nextRules = Object.freeze({
      ...withTypes,
      formToChangeInto: change.form - 1,
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "call", programCounter: target.programCounter }),
      { rulesContext: nextRules },
    );
  };
}

/**
 * `Cmd_docastformchangeanimation` (`battle_script_commands.c:9730-9740`):
 * `gActiveBattler = gBattleScripting.battler`, OR `CASTFORM_SUBSTITUTE` into
 * `formToChangeInto` behind a Substitute, then
 * `BtlController_EmitBattleAnimation(B_COMM_TO_CONTROLLER,
 * B_ANIM_CASTFORM_CHANGE, formToChangeInto)` + `MarkBattlerForControllerExec`.
 * Battle Scene OFF draws nothing, so the animation is the kernel's typed
 * `animation` event (same idiom as `battleScriptPlaystatchangeanimationOpcode.ts`),
 * carrying the source's raw argument (`formToChangeInto`).
 */
function createDocastformchangeanimationHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: Object.freeze({
            kind: "controller-busy",
            programCounter: context.state.programCounter,
            opcodeId: context.instruction.opcodeId,
            opcodeName: context.instruction.opcodeName,
          }),
        }),
      );
    }
    const rules = context.state.rulesContext;
    const activeBattler = rules.scriptingBattler;
    const formToChangeInto = (rules.battlers[activeBattler].status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0
      ? (rules.formToChangeInto | CASTFORM_SUBSTITUTE) >>> 0
      : rules.formToChangeInto;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        scheduler: markBattleScriptControllerPending(
          Object.freeze({ ...context.state.scheduler, activeBattler }),
          activeBattler,
        ),
        rulesContext: Object.freeze({ ...rules, formToChangeInto }),
        events: Object.freeze([
          Object.freeze({
            kind: "animation" as const,
            animationId: "CASTFORM_CHANGE",
            battler: activeBattler,
            arguments: Object.freeze([String(formToChangeInto)]),
          }),
        ]),
      },
    );
  };
}

export function createBattleScriptTryCastformDataChangeOpcodeHandlers(
  program: BattleScriptProgram,
  externalPorts: Readonly<{
    isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>;
  }>,
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
  const docastformchangeanimationStarts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_DOCASTFORMCHANGEANIMATION",
  );
  if (docastformchangeanimationStarts.length !== 1) {
    throw new Error(`B_SCR_OP_DOCASTFORMCHANGEANIMATION requires exactly 1 concrete start, got ${docastformchangeanimationStarts.length}`);
  }
  const [docastformchangeanimationInstruction] = docastformchangeanimationStarts;
  if (docastformchangeanimationInstruction!.operands.length !== 0) {
    throw new Error(
      `invalid B_SCR_OP_DOCASTFORMCHANGEANIMATION shape at program counter ${docastformchangeanimationInstruction!.programCounter}`,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: createTrycastformdatachangeHandler(),
    [docastformchangeanimationInstruction!.opcodeId]: createDocastformchangeanimationHandler(
      externalPorts.isControllerIdle,
    ),
  });
}
