import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  acknowledgeBattleScriptController,
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  isBattleScriptBattlerId,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
  type BattleScriptSchedulerState,
} from "./battleScriptMachine.ts";
import type { BattleScriptOperand, BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  createBattleScriptMoveValuesCommandHandlers,
  type BattleScriptMoveValuesRulesContext,
} from "./battleScriptMoveValuesCommands.ts";
import {
  createBattleScriptRuleCommandHandlers,
  type BattleScriptByteResolverPort,
} from "./battleScriptRuleCommands.ts";
import {
  createBattleScriptSourceCommandHandlers,
  type BattleScriptSourceCommandPorts,
  type BattleScriptStatusAnimationPreparation,
  type BattleScriptStatusAnimationPreparationPort,
} from "./battleScriptSourceCommands.ts";
import {
  BATTLE_SCRIPT_BATTLER_SELECTORS,
  BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "./battleScriptSourceConstants.ts";

export type BattleScriptRulesBattler = Readonly<{
  status1: number;
  status2: number;
  status3: number;
  substituteHP: number;
}>;

export type BattleScriptRulesBattlers = readonly [
  BattleScriptRulesBattler,
  BattleScriptRulesBattler,
  BattleScriptRulesBattler,
  BattleScriptRulesBattler,
];

export type BattleScriptSelectorRoleBindings = Readonly<{
  attacker: BattleScriptBattlerId | null;
  effectBattler: BattleScriptBattlerId | null;
}>;

/**
 * First durable source-shaped Battle Script rules slice.
 *
 * The four indexed battlers mirror the source's MAX_BATTLERS_COUNT arrays.
 * The scalar move-value fields are exactly the u8/u32 globals mutated by
 * MoveValuesCleanUp. The selector bindings cover only roles observed at
 * opcodes 100-102. Null means the surrounding action has not supplied that
 * source role.
 */
export type BattleScriptRulesContext = Readonly<
  BattleScriptMoveValuesRulesContext & {
    battlers: BattleScriptRulesBattlers;
    selectorRoles: BattleScriptSelectorRoleBindings;
    multiHitCounter: number;
  }
>;

export type BattleScriptRulesContextInput = Readonly<{
  battlers: readonly BattleScriptRulesBattler[];
  selectorRoles?: Readonly<{
    attacker?: BattleScriptBattlerId | null;
    effectBattler?: BattleScriptBattlerId | null;
  }>;
  moveResultFlags: number;
  dmgMultiplier: number;
  critMultiplier: number;
  moveEffectByte: number;
  missType: number;
  hitMarker: number;
  multiHitCounter: number;
}>;

function requireUnsigned(value: number, maximum: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${field} must be an unsigned integer <= ${maximum}, got ${value}`);
  }
  return value;
}

function requireRole(
  value: BattleScriptBattlerId | null | undefined,
  field: string,
): BattleScriptBattlerId | null {
  if (value === undefined || value === null) return null;
  if (!isBattleScriptBattlerId(value)) {
    throw new Error(`${field} must be a battler id 0..3, null, or omitted, got ${value}`);
  }
  return value;
}

export function createBattleScriptRulesContext(
  input: BattleScriptRulesContextInput,
): BattleScriptRulesContext {
  if (!Array.isArray(input.battlers) || input.battlers.length !== 4) {
    throw new Error("Battle Script rules context must contain exactly four indexed battlers");
  }
  const battlers = input.battlers.map((battler, index) => Object.freeze({
    status1: requireUnsigned(battler.status1, 0xffff_ffff, `battlers[${index}].status1`) >>> 0,
    status2: requireUnsigned(battler.status2, 0xffff_ffff, `battlers[${index}].status2`) >>> 0,
    status3: requireUnsigned(battler.status3, 0xffff_ffff, `battlers[${index}].status3`) >>> 0,
    substituteHP: requireUnsigned(
      battler.substituteHP,
      0xff,
      `battlers[${index}].substituteHP`,
    ),
  })) as unknown as BattleScriptRulesBattlers;
  const selectorRoles = Object.freeze({
    attacker: requireRole(input.selectorRoles?.attacker, "selectorRoles.attacker"),
    effectBattler: requireRole(
      input.selectorRoles?.effectBattler,
      "selectorRoles.effectBattler",
    ),
  });
  return Object.freeze({
    battlers: Object.freeze(battlers),
    selectorRoles,
    moveResultFlags: requireUnsigned(input.moveResultFlags, 0xff, "moveResultFlags"),
    dmgMultiplier: requireUnsigned(input.dmgMultiplier, 0xff, "dmgMultiplier"),
    critMultiplier: requireUnsigned(input.critMultiplier, 0xff, "critMultiplier"),
    moveEffectByte: requireUnsigned(input.moveEffectByte, 0xff, "moveEffectByte"),
    missType: requireUnsigned(input.missType, 0xff, "missType"),
    hitMarker: requireUnsigned(input.hitMarker, 0xffff_ffff, "hitMarker") >>> 0,
    multiHitCounter: requireUnsigned(input.multiHitCounter, 0xff, "multiHitCounter"),
  });
}

function decodeSupportedBattlerSelector(operand: BattleScriptOperand): number | null {
  const named = BATTLE_SCRIPT_BATTLER_SELECTORS[
    operand.expression as keyof typeof BATTLE_SCRIPT_BATTLER_SELECTORS
  ];
  if (named !== undefined) return named;
  if (!/^(?:0[xX][0-9a-fA-F]+|[0-9]+)$/.test(operand.expression)) return null;
  const numeric = Number(operand.expression);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

/**
 * Source-exact GetBattlerForBattleScript mapping for the selector roles proven
 * reachable by statusanimation/status2animation/chosenstatusanimation.
 * Other source cases remain unavailable until their own context is explicit.
 */
export const resolveRulesBattlerForBattleScript: NonNullable<
  BattleScriptSourceCommandPorts<BattleScriptRulesContext>["resolveBattlerForBattleScript"]
> = (context, selectorOperand) => {
  const selector = decodeSupportedBattlerSelector(selectorOperand);
  if (selector === BATTLE_SCRIPT_BATTLER_SELECTORS.BS_ATTACKER) {
    return context.state.rulesContext.selectorRoles.attacker;
  }
  if (selector === BATTLE_SCRIPT_BATTLER_SELECTORS.BS_EFFECT_BATTLER) {
    return context.state.rulesContext.selectorRoles.effectBattler;
  }
  return null;
};

export const prepareRulesStatusAnimation: BattleScriptStatusAnimationPreparationPort<
  BattleScriptRulesContext
> = (context, battler, request): BattleScriptStatusAnimationPreparation => {
  const rules = context.state.rulesContext;
  const sourceBattler = rules.battlers[battler];
  if (
    (sourceBattler.status3 & BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) !== 0
    || sourceBattler.substituteHP !== 0
    || (rules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0
  ) {
    return Object.freeze({ kind: "suppress" });
  }

  let isStatus2: number;
  let status: number;
  switch (request.kind) {
    case "live-status1":
      isStatus2 = 0;
      status = sourceBattler.status1;
      break;
    case "masked-live-status2":
      isStatus2 = 1;
      status = (sourceBattler.status2 & request.wantedMask) >>> 0;
      break;
    case "explicit-status":
      isStatus2 = request.isStatus2;
      status = request.status;
      break;
  }
  return Object.freeze({
    kind: "emit",
    receipt: Object.freeze({
      kind: "status-animation",
      battler,
      isStatus2,
      status,
    }),
  });
};

export type BattleScriptStatusRulesExternalPorts = Readonly<
  Omit<
    BattleScriptSourceCommandPorts<BattleScriptRulesContext>,
    "resolveBattlerForBattleScript" | "prepareStatusAnimation"
  > & {
    resolveByteOperand: BattleScriptByteResolverPort<BattleScriptRulesContext>;
  }
>;

/**
 * Production handler composition for the currently explicit rules context.
 * The generic command factories remain injectable; this bundle replaces only
 * the two status-family ports whose live source data now has durable owners
 * and includes cleanup because all of its mutated fields are owned here.
 */
export function createBattleScriptStatusRulesHandlers(
  program: BattleScriptProgram,
  externalPorts: BattleScriptStatusRulesExternalPorts,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const { resolveByteOperand, ...sourceExternalPorts } = externalPorts;
  const sourcePorts: BattleScriptSourceCommandPorts<BattleScriptRulesContext> =
    Object.freeze({
      ...sourceExternalPorts,
      resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
      prepareStatusAnimation: prepareRulesStatusAnimation,
    });
  return Object.freeze({
    ...createBattleScriptControlHandlers<BattleScriptRulesContext>(program),
    ...createBattleScriptSourceCommandHandlers(program, sourcePorts),
    ...createBattleScriptRuleCommandHandlers(program, resolveByteOperand),
    ...createBattleScriptMoveValuesCommandHandlers<BattleScriptRulesContext>(
      program,
    ),
  });
}

export type BattleScriptStatusRulesExecution = Readonly<{
  state: BattleScriptMachineState<BattleScriptRulesContext>;
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>;
}>;

export function createBattleScriptStatusRulesExecution(
  program: BattleScriptProgram,
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
  externalPorts: BattleScriptStatusRulesExternalPorts,
  scheduler?: BattleScriptSchedulerState,
): BattleScriptStatusRulesExecution {
  return Object.freeze({
    state: createBattleScriptMachine(
      program,
      entryLabel,
      rulesContext,
      rngSeed,
      scheduler,
    ),
    handlers: createBattleScriptStatusRulesHandlers(program, externalPorts),
  });
}

/** Named acknowledgement seam retained beside the production execution bundle. */
export const acknowledgeBattleScriptStatusRulesController =
  acknowledgeBattleScriptController;
