/**
 * Gen III's type-changing setters:
 * - Conversion / Cmd_tryconversiontypechange (battle_script_commands.c:7389-7447)
 * - Conversion 2 / Cmd_settypetorandomresistance (battle_script_commands.c:8074-8132)
 * - Camouflage / Cmd_settypetoenvironment (battle_script_commands.c:9831-9845)
 */
import {
  drawBattleScriptRng,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import {
  resolveBattleScriptMoveType,
  resolveBattleScriptCurrentMoveEffect,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import typeEffectivenessData from "../data/gen/type-effectiveness.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };

const TYPE_NAMES = Object.freeze([
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY",
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC",
  "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK",
]);
type TypeRow = Readonly<{
  attackingType: string;
  defendingType: string;
  multiplierTenths: number;
}>;
const TYPE_EFFECTIVENESS = typeEffectivenessData.typeEffectiveness as readonly TypeRow[];
const EFFECT_NAME_BY_ID = new Map(
  (topologyData.effects as readonly Readonly<{ id: number; effect: string }>[]).map(
    ({ id, effect }) => [id, effect],
  ),
);
const TWO_TURN_EFFECTS = new Set([
  "EFFECT_SKULL_BASH", "EFFECT_RAZOR_WIND", "EFFECT_SKY_ATTACK",
  "EFFECT_SOLAR_BEAM", "EFFECT_SEMI_INVULNERABLE", "EFFECT_BIDE",
]);
export const BATTLE_SCRIPT_ENVIRONMENT_TYPES = Object.freeze([
  "TYPE_GRASS", "TYPE_GRASS", "TYPE_GROUND", "TYPE_WATER", "TYPE_WATER",
  "TYPE_WATER", "TYPE_ROCK", "TYPE_ROCK", "TYPE_NORMAL", "TYPE_NORMAL",
]);

function jumpToFailure(
  context: Parameters<BattleScriptOpcodeHandler<BattleScriptRulesContext>>[0],
) {
  const target = context.instruction.operands[0]
    ? resolveBattleScriptLabel(context.program, context.instruction.operands[0]!.expression)
    : undefined;
  if (!target) throw new Error(`unresolved type-change failure target`);
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "jump", programCounter: target.programCounter }),
  );
}

function moveType(rules: BattleScriptRulesContext, move: number): string {
  let type = TYPE_NAMES[resolveBattleScriptMoveType(move, rules.dynamicMoveType)];
  if (type === "TYPE_MYSTERY") {
    type = rules.battlers[requireBattlerRole(rules, "attacker")].types.includes("TYPE_GHOST")
      ? "TYPE_GHOST"
      : "TYPE_NORMAL";
  }
  if (!type) throw new Error(`unknown move type for move ${move}`);
  return type;
}

function createConversionHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const battler = rules.battlers[attacker];
    let validMoves = 0;
    while (validMoves < 4 && battler.moves[validMoves] !== 0) validMoves += 1;
    const hasLegalType = battler.moves.slice(0, validMoves).some((move) => {
      const type = moveType(rules, move);
      return type !== battler.types[0] && type !== battler.types[1];
    });
    if (!hasLegalType) return jumpToFailure(context);

    let rng = context.state.rng;
    let selectedType: string;
    for (;;) {
      const draw = drawBattleScriptRng(rng, context.instruction, "conversion-move-slot");
      rng = draw.rng;
      const slot = draw.randomValue % 4;
      if (slot >= validMoves) continue;
      selectedType = moveType(rules, battler.moves[slot]!);
      if (selectedType === battler.types[0] || selectedType === battler.types[1]) continue;
      break;
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...withBattler(rules, attacker, {
            types: Object.freeze([selectedType, selectedType]),
          }),
          battleTextBuff1Type: selectedType,
        }),
        rng,
      },
    );
  };
}

export function conversion2FallbackTypeWithStaleIndexBug(
  attackType: string,
  heldTypes: readonly string[],
  staleRandomIndex: number,
): string | null {
  const staleDefendingType = TYPE_EFFECTIVENESS[staleRandomIndex]?.defendingType;
  for (const row of TYPE_EFFECTIVENESS) {
    if (
      row.attackingType !== "TYPE_FORESIGHT"
      && row.attackingType === attackType
      && row.multiplierTenths <= 5
      // BUG: Emerald reads TYPE_EFFECT_DEF_TYPE(i), not the scanned row.
      && !heldTypes.includes(staleDefendingType ?? "")
    ) {
      return row.defendingType;
    }
  }
  return null;
}

function createConversion2Handler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const battler = rules.battlers[attacker];
    const lastMove = rules.moveHistory.lastLandedMoves[attacker]!;
    if (lastMove === 0 || lastMove === 0xffff) return jumpToFailure(context);
    const source = rules.moveHistory.lastHitBy[attacker]!;
    if (
      TWO_TURN_EFFECTS.has(EFFECT_NAME_BY_ID.get(resolveBattleScriptCurrentMoveEffect(lastMove)) ?? "")
      && (rules.battlers[source]!.status2 & (1 << 12)) !== 0
    ) {
      return jumpToFailure(context);
    }

    const attackType = TYPE_NAMES[rules.moveHistory.lastHitByType[attacker]!];
    let rng = context.state.rng;
    let staleIndex = 0;
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      do {
        const draw = drawBattleScriptRng(rng, context.instruction, "conversion2-resistance-row");
        rng = draw.rng;
        staleIndex = draw.randomValue % 128;
      } while (staleIndex > 336 / 3);
      const row = TYPE_EFFECTIVENESS[staleIndex];
      if (
        row
        && row.attackingType === attackType
        && row.multiplierTenths <= 5
        && !battler.types.includes(row.defendingType)
      ) {
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "advance" }),
          {
            rulesContext: Object.freeze({
              ...withBattler(rules, attacker, {
                types: Object.freeze([row.defendingType, row.defendingType]),
              }),
              battleTextBuff1Type: row.defendingType,
            }),
            rng,
          },
        );
      }
    }
    const selected = attackType
      ? conversion2FallbackTypeWithStaleIndexBug(attackType, battler.types, staleIndex)
      : null;
    if (!selected) {
      return jumpToFailure(Object.freeze({
        ...context,
        state: Object.freeze({ ...context.state, rng }),
      }));
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...withBattler(rules, attacker, { types: Object.freeze([selected, selected]) }),
          battleTextBuff1Type: selected,
        }),
        rng,
      },
    );
  };
}

function createCamouflageHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const type = BATTLE_SCRIPT_ENVIRONMENT_TYPES[rules.gBattleEnvironment];
    if (!type) throw new Error(`unsupported gBattleEnvironment ${rules.gBattleEnvironment}`);
    if (rules.battlers[attacker].types.includes(type)) return jumpToFailure(context);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...withBattler(rules, attacker, { types: Object.freeze([type, type]) }),
          battleTextBuff1Type: type,
        }),
      },
    );
  };
}

export function createBattleScriptTypeChangeOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const conversion = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYCONVERSIONTYPECHANGE",
  );
  if (
    conversion.length !== 1
    || conversion[0]!.opcodeId !== 0x90
    || conversion[0]!.dispatcher !== "Cmd_tryconversiontypechange"
    || conversion[0]!.operands.length !== 1
    || conversion[0]!.operands[0]?.widthBytes !== 4
  ) {
    throw new Error(`invalid B_SCR_OP_TRYCONVERSIONTYPECHANGE shape (${conversion.length})`);
  }
  const conversion2 = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETTYPETORANDOMRESISTANCE",
  );
  const camouflage = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_SETTYPETOENVIRONMENT",
  );
  for (const [instructions, opcodeId, dispatcher] of [
    [conversion2, 0xa6, "Cmd_settypetorandomresistance"],
    [camouflage, 0xeb, "Cmd_settypetoenvironment"],
  ] as const) {
    if (
      instructions.length !== 1
      || instructions[0]!.opcodeId !== opcodeId
      || instructions[0]!.dispatcher !== dispatcher
      || instructions[0]!.operands.length !== 1
      || instructions[0]!.operands[0]?.widthBytes !== 4
    ) {
      throw new Error(`invalid ${dispatcher} committed shape (${instructions.length})`);
    }
  }
  return Object.freeze({
    [conversion[0]!.opcodeId]: createConversionHandler(),
    [conversion2[0]!.opcodeId]: createConversion2Handler(),
    [camouflage[0]!.opcodeId]: createCamouflageHandler(),
  });
}
