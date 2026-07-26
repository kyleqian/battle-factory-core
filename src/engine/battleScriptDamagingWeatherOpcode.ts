/**
 * Screens/weather registration slice 5 (docs/screens-weather-ground-truth.md
 * §1c/§6 item 5) -- the six opcodes `BattleScript_DamagingWeatherContinues`'
 * inner per-battler damage loop needs beyond §0's already-registered set,
 * the doc's own correction to `docs/end-turn-ground-truth.md`'s F8/F10 rows
 * (which only checked the "continues" message shell, not the loop that
 * actually deals sandstorm/hail chip damage):
 *
 *   PLAYANIMATION_VAR, COPYARRAYWITHINDEX, WEATHERDAMAGE, ADDBYTE,
 *   JUMPIFARRAYNOTEQUAL (source mnemonic `jumpifbytenotequal`, a distinct
 *   opcode from the already-registered JUMPIFBYTE -- asm/macros/
 *   battle_script.inc:1406-1408), BICWORD.
 *
 * `Cmd_copyarraywithindex`/`Cmd_addbyte`/`Cmd_jumpifarraynotequal`/
 * `Cmd_bicword` are all generic array/scratch-field primitives with many
 * concrete call sites across the full committed program (most belonging to
 * OTHER move effects entirely, e.g. Triple Kick's own counter, Perish Song's
 * loop). `Cmd_copyarraywithindex`/`Cmd_bicword` model only the exact operand
 * triple `BattleScript_DamagingWeatherLoop`/`ContinuesEnd` use; every other
 * concrete call site's unmodeled pointer/value is a single named (b) barrier,
 * same policy as `battleScriptJumpifbyteOpcode.ts`.
 *
 * `Cmd_addbyte`/`Cmd_jumpifarraynotequal` were widened (runtime weather-form
 * loop, PROGRESS 460) off that same one-tuple special case onto the shared
 * byte-lvalue universe `battleScriptSetByte.ts` owns -- see each handler's own
 * doc comment for the exact spellings this now covers vs. still rejects.
 */
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { unsupportedBranch } from "./battleScriptHitChainOpcode.ts";
import type {
  BattleScriptControllerIdlePort,
  BattleScriptBattlerSelectorResolverPort,
} from "./battleScriptSourceCommands.ts";
import {
  BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS,
  readBattleScriptRulesByte,
  resolveBattleScriptSetByteValue,
  writeBattleScriptRulesByte,
} from "./battleScriptSetByte.ts";
import {
  BATTLE_SCRIPT_HITMARKER_GRUDGE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE,
  BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE,
  BATTLE_SCRIPT_STATUS3_UNDERGROUND,
  BATTLE_SCRIPT_STATUS3_UNDERWATER,
} from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:232-244. */
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
const B_WEATHER_HAIL = 1 << 7;
/** include/abilities.h. */
const ABILITY_CLOUD_NINE = 13;
const ABILITY_SAND_VEIL = 8;

function requireAttacker(rules: BattleScriptRulesContext): 0 | 1 | 2 | 3 {
  const attacker = rules.selectorRoles.attacker;
  if (attacker === null) throw new Error("Cmd_weatherdamage's damage loop requires an attacker role");
  return attacker;
}

/**
 * `Cmd_playanimation_var` (`battle_script_commands.c:4046-4076`). Both
 * concrete call sites (`BattleScript_DamagingWeatherContinues`,
 * `OverworldWeatherStarts`) share the exact shape `[BS_ATTACKER,
 * sB_ANIM_ARG1]` with the `arg` operand omitted (defaults to NULL per
 * `asm/macros/battle_script.inc:390-395`). Presentation is out of this main
 * lane's scope (Battle Scene OFF): this models only the controller-pending
 * shape shared with the already-registered PLAYANIMATION
 * (`battleScriptStatbuffchangeOpcode.ts`), not the real animation-id branch
 * dispatch -- Battle Scene OFF never inspects animation event contents.
 */
function createPlayanimationVarHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
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
    const [battlerOperand] = context.instruction.operands;
    const battler = resolveBattlerForBattleScript(context, battlerOperand!);
    if (battler === null) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: Object.freeze({
            kind: "source-context-unavailable",
            programCounter: context.state.programCounter,
            opcodeId: context.instruction.opcodeId,
            opcodeName: context.instruction.opcodeName,
            port: "resolve-battler-for-battle-script",
            operandExpression: battlerOperand!.expression,
          }),
        }),
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        scheduler: markBattleScriptControllerPending(context.state.scheduler, battler),
        events: Object.freeze([
          Object.freeze({
            kind: "animation" as const,
            animationId: "WEATHER_VAR",
            battler,
            arguments: Object.freeze([]),
          }),
        ]),
      },
    );
  };
}

/**
 * `Cmd_copyarraywithindex` (`battle_script_commands.c:3850-3861`), narrowed
 * to its one concrete call site: `copyarraywithindex gBattlerAttacker,
 * gBattlerByTurnOrder, gBattleCommunication, 1` --
 * `gBattlerAttacker = gBattlerByTurnOrder[gBattleCommunication]`, the loop's
 * own turn-order-indexed battler selection. Reassigns the `attacker`
 * selector role, the same modeling `enterTickBattlerContext`
 * (`battleEndTurnOrchestration.ts`) already uses for the battler-tick loop.
 */
function createCopyarraywithindexHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const index = rules.battleCommunication0;
    const battler = rules.battlerByTurnOrder[index];
    if (battler === undefined) {
      throw new Error(`Cmd_copyarraywithindex: gBattleCommunication index ${index} is out of gBattlerByTurnOrder's range`);
    }
    const nextRules = Object.freeze({
      ...rules,
      selectorRoles: Object.freeze({ ...rules.selectorRoles, attacker: battler as 0 | 1 | 2 | 3 }),
    });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRules });
  };
}

/**
 * `Cmd_weatherdamage` (`battle_script_commands.c:7602-7649`, zero `Random(`
 * call sites). `WEATHER_HAS_EFFECT` (`include/battle_util.h:47`) is modeled
 * as "no battler on the field carries Cloud Nine" -- Air Lock is
 * Rayquaza-only and confirmed absent from the Frontier catalog
 * (docs/screens-weather-ground-truth.md §2), so it is not checked here.
 * Sandstorm immunity: ROCK/GROUND/STEEL typing, ABILITY_SAND_VEIL, or
 * underground/underwater. Hail immunity: ICE typing or underground/
 * underwater (no ability exemption exists in Gen 3). Both branches floor
 * `maxHP/16`, minimum 1 -- doc §3b/§3e's live-verified formula.
 */
function battlerCarriesCloudNine(rules: BattleScriptRulesContext): boolean {
  const count = rules.battleTopology.battlersCount;
  for (let i = 0; i < count; i += 1) {
    if (rules.battlers[i]!.ability === ABILITY_CLOUD_NINE) return true;
  }
  return false;
}

function isSandstormImmune(battler: BattleScriptRulesContext["battlers"][number]): boolean {
  const rockGroundSteel = (type: string) => type === "TYPE_ROCK" || type === "TYPE_STEEL" || type === "TYPE_GROUND";
  return rockGroundSteel(battler.types[0]) || rockGroundSteel(battler.types[1])
    || battler.ability === ABILITY_SAND_VEIL
    || (battler.status3 & BATTLE_SCRIPT_STATUS3_UNDERGROUND) !== 0
    || (battler.status3 & BATTLE_SCRIPT_STATUS3_UNDERWATER) !== 0;
}

function isHailImmune(battler: BattleScriptRulesContext["battlers"][number]): boolean {
  return battler.types[0] === "TYPE_ICE" || battler.types[1] === "TYPE_ICE"
    || (battler.status3 & BATTLE_SCRIPT_STATUS3_UNDERGROUND) !== 0
    || (battler.status3 & BATTLE_SCRIPT_STATUS3_UNDERWATER) !== 0;
}

function createWeatherdamageHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireAttacker(rules);
    const battler = rules.battlers[attacker];
    const weatherHasEffect = !battlerCarriesCloudNine(rules);
    let damage = 0;
    if (weatherHasEffect) {
      if ((rules.weather & B_WEATHER_SANDSTORM) !== 0) {
        damage = isSandstormImmune(battler) ? 0 : Math.max(1, Math.floor(battler.maxHP / 16));
      }
      if ((rules.weather & B_WEATHER_HAIL) !== 0) {
        damage = isHailImmune(battler) ? 0 : Math.max(1, Math.floor(battler.maxHP / 16));
      }
    }
    if ((rules.absentBattlerFlags & (1 << attacker)) !== 0) damage = 0;
    const nextRules = Object.freeze({ ...rules, battleMoveDamage: damage });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRules });
  };
}

/**
 * `Cmd_addbyte` (`battle_script_commands.c:3823-3828`). The lvalue and delta
 * both resolve through the same shared byte universe `Cmd_setbyte`/
 * `Cmd_jumpifbyte` already use (`battleScriptSetByte.ts`'s pointer list plus
 * its literal-value resolver) -- a generic mechanism, not a special case
 * keyed to any one script. Widened this session (runtime weather-form loop,
 * PROGRESS 460) from a single hardcoded tuple to that shared universe: still
 * covers `gBattleCommunication, 1` (`BattleScript_DamagingWeatherLoopIncrement`)
 * and now also `sBATTLER, 1` (`BattleScript_WeatherFormChangesLoop`,
 * `BattleScript_PerishSongLoopIncrement`), `gBattlerTarget, 1`
 * (`BattleScript_TeeterDanceLoopIncrement`, `BattleScript_IntimidateActivates
 * LoopIncrement`), and `gBattleCommunication + 1, 1`
 * (`BattleScript_PalaceEndFlavorText`) -- every concrete addbyte call site
 * whose pointer is already SETBYTE-resolvable and whose delta is a
 * resolvable literal. Left rejected: `sMULTIHIT_STRING + 4`/
 * `sTRIPLE_KICK_POWER` (Triple Kick/multi-hit's own buffers -- the former's
 * pointer isn't in the shared universe at all, the latter's delta `10` isn't
 * a resolvable SETBYTE literal even though its pointer is) -- the single
 * named barrier below.
 */
function createAddbyteHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [ptrOperand, byteOperand] = context.instruction.operands;
    const rules = context.state.rulesContext;
    const pointer = ptrOperand!.expression;
    const delta = byteOperand ? resolveBattleScriptSetByteValue(byteOperand.expression) : null;
    const current = BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.includes(pointer as never)
      ? readBattleScriptRulesByte(rules, pointer)
      : null;
    if (current === null || delta === null) {
      return unsupportedBranch(
        context,
        `Cmd_addbyte's operand (${pointer}, ${byteOperand!.expression}) is not modeled`,
        "battle_script_commands.c",
        3823,
      );
    }
    const nextRules = writeBattleScriptRulesByte(rules, pointer, (current + delta) & 0xff);
    if (!nextRules) {
      throw new Error(`Cmd_addbyte: ${pointer} accepted a read but rejected the incremented value`);
    }
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRules });
  };
}

/**
 * `Cmd_bicword` (`battle_script_commands.c:3905-3912`). Only the loop's own
 * `bicword gHitMarker, HITMARKER_IGNORE_BIDE | HITMARKER_IGNORE_SUBSTITUTE |
 * HITMARKER_PASSIVE_HP_UPDATE | HITMARKER_GRUDGE`
 * (`BattleScript_DamagingWeatherContinuesEnd`) is modeled; the other two
 * concrete call sites (`HitsAllNoUndergroundBonus`'s single-bit clear,
 * `MoveUsedWokeUp`'s `HITMARKER_WAKE_UP_CLEAR`) are the single named barrier
 * below.
 */
const BICWORD_DAMAGING_WEATHER_VALUE =
  "HITMARKER_IGNORE_BIDE | HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE | HITMARKER_GRUDGE";
const BICWORD_DAMAGING_WEATHER_MASK =
  (BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE
    | BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE
    | BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE
    | BATTLE_SCRIPT_HITMARKER_GRUDGE) >>> 0;

function createBicwordHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [ptrOperand, valueOperand] = context.instruction.operands;
    const rules = context.state.rulesContext;
    if (ptrOperand!.expression !== "gHitMarker" || valueOperand!.expression !== BICWORD_DAMAGING_WEATHER_VALUE) {
      return unsupportedBranch(
        context,
        `Cmd_bicword's operand (${ptrOperand!.expression}, ${valueOperand!.expression}) is not modeled`,
        "battle_script_commands.c",
        3905,
      );
    }
    const nextRules = Object.freeze({
      ...rules,
      hitMarker: (rules.hitMarker & ~BICWORD_DAMAGING_WEATHER_MASK) >>> 0,
    });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRules });
  };
}

/**
 * `Cmd_jumpifarraynotequal` (`battle_script_commands.c:3793-3812`), reached
 * here only via the `jumpifbytenotequal` macro alias (size operand always
 * `1`, `asm/macros/battle_script.inc:1406-1408`). Both compared bytes resolve
 * through the same shared universe `Cmd_addbyte` above now uses: either
 * pointer may be any SETBYTE-resolvable expression, or the literal
 * `gBattlersCount` -- a read-only battle-topology fact (already how
 * `Cmd_weatherdamage`'s own loop bound reads it above), not a settable
 * scratch byte, so it is not part of the SETBYTE universe itself. Widened
 * this session (runtime weather-form loop, PROGRESS 460) from a single
 * hardcoded pair to that shared universe: still covers
 * `gBattleCommunication, gBattlersCount` (`BattleScript_DamagingWeatherLoop
 * Increment`) and now also `sBATTLER, gBattlersCount`
 * (`BattleScript_WeatherFormChangesLoop`, `BattleScript_PerishSongLoop
 * Increment`), `gBattlerTarget, gBattlersCount`
 * (`BattleScript_TeeterDanceLoopIncrement`), and `gBattleCommunication + 1,
 * gBattlersCount` (`BattleScript_PalaceEndFlavorText`). Left rejected:
 * Ghost Curse's `gBattlerAttacker, gBattlerTarget` and the link-battle
 * loop's `gBattlerFainted, gBattlersCount` -- `gBattlerAttacker`/
 * `gBattlerFainted` are selector roles this shared universe does not expose
 * as SETBYTE-resolvable pointers -- the single named barrier below.
 */
function readJumpifarraynotequalOperand(rules: BattleScriptRulesContext, expression: string): number | null {
  if (expression === "gBattlersCount") return rules.battleTopology.battlersCount;
  return BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.includes(expression as never)
    ? readBattleScriptRulesByte(rules, expression)
    : null;
}

function createJumpifarraynotequalHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [mem1Operand, mem2Operand, sizeOperand, ptrOperand] = context.instruction.operands;
    const rules = context.state.rulesContext;
    const mem1 = readJumpifarraynotequalOperand(rules, mem1Operand!.expression);
    const mem2 = readJumpifarraynotequalOperand(rules, mem2Operand!.expression);
    if (mem1 === null || mem2 === null || sizeOperand!.expression !== "0x1") {
      return unsupportedBranch(
        context,
        `Cmd_jumpifarraynotequal's operand (${mem1Operand!.expression}, ${mem2Operand!.expression}, size ${sizeOperand!.expression}) is not modeled`,
        "battle_script_commands.c",
        3793,
      );
    }
    if (mem1 === mem2) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (!target) {
      throw new Error(`Cmd_jumpifarraynotequal: unresolved jump target ${ptrOperand!.expression}`);
    }
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "jump", programCounter: target.programCounter }));
  };
}

function findInstructionOpcodeId(program: BattleScriptProgram, opcodeName: string): number {
  const instruction = program.instructions.find((candidate) => candidate.opcodeName === opcodeName);
  if (!instruction) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
  return instruction.opcodeId;
}

function registerSingleInstruction(
  program: BattleScriptProgram,
  opcodeName: string,
  expectedOperandCount: number,
  handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter((instruction) => instruction.opcodeName === opcodeName);
  if (starts.length !== 1) {
    throw new Error(`${opcodeName} requires exactly 1 concrete start, got ${starts.length}`);
  }
  const [instruction] = starts;
  if (instruction!.operands.length !== expectedOperandCount) {
    throw new Error(`invalid ${opcodeName} shape at program counter ${instruction!.programCounter}`);
  }
  return Object.freeze({ [instruction!.opcodeId]: handler });
}

export function createBattleScriptDamagingWeatherOpcodeHandlers(
  program: BattleScriptProgram,
  externalPorts: Readonly<{
    isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>;
    resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>;
  }>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const playanimationVarStarts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_PLAYANIMATION_VAR",
  );
  if (playanimationVarStarts.length !== 2) {
    throw new Error(`B_SCR_OP_PLAYANIMATION_VAR requires exactly 2 concrete starts, got ${playanimationVarStarts.length}`);
  }

  return Object.freeze({
    [playanimationVarStarts[0]!.opcodeId]: createPlayanimationVarHandler(
      externalPorts.isControllerIdle,
      externalPorts.resolveBattlerForBattleScript,
    ),
    ...registerSingleInstruction(program, "B_SCR_OP_COPYARRAYWITHINDEX", 4, createCopyarraywithindexHandler()),
    ...registerSingleInstruction(program, "B_SCR_OP_WEATHERDAMAGE", 0, createWeatherdamageHandler()),
    [findInstructionOpcodeId(program, "B_SCR_OP_ADDBYTE")]: createAddbyteHandler(),
    [findInstructionOpcodeId(program, "B_SCR_OP_BICWORD")]: createBicwordHandler(),
    [findInstructionOpcodeId(program, "B_SCR_OP_JUMPIFARRAYNOTEQUAL")]: createJumpifarraynotequalHandler(),
  });
}
