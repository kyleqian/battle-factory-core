/**
 * EFFECT_ROAR registration (docs/roar-multihit-registration-scout.md §4
 * rungs 10-12, §2a/§2c): `B_SCR_OP_FORCERANDOMSWITCH`
 * (`Cmd_forcerandomswitch`/`TryDoForceSwitchOut`,
 * `battle_script_commands.c:7164-7386`, trainer-battle branch only -- the
 * only branch Factory ever takes), `B_SCR_OP_SWITCHOUTABILITIES`
 * (`Cmd_switchoutabilities:9590-9607`), `B_SCR_OP_RETURNTOBALL`
 * (`Cmd_returntoball:5346-5352`), and `B_SCR_OP_FINISHACTION`
 * (`Cmd_finishaction:10308-10311`) as a permanent (b) barrier.
 *
 * FORCERANDOMSWITCH's replacement pick is a pure RNG reducer inside this
 * opcode's own handler -- it does NOT route through the
 * `openpartyscreen`/AI-switch-decision boundary
 * (`docs/forced-switch-ground-truth.md`): that machinery exists for the
 * fainted-mon-replacement fork, where the incoming choice is a real
 * decision. Roar's outgoing battler is healthy and gets no say. This
 * handler writes `monToSwitchIntoId[target]` directly (the same plain-
 * reducer pattern `battleScriptOpenPartyScreenOpcode.ts`'s AI branch
 * already uses) then jumps straight to the hardcoded, bytecode-invisible
 * `BattleScript_SuccessForceOut` label -- a third dynamic-dispatch category
 * beyond the census's one documented case (`JUMPTOCALLEDMOVE`'s runtime-
 * computed target): a compile-time-fixed target with zero bytecode
 * representation, because the C command writes `gBattlescriptCurrInstr`
 * directly rather than reading an operand. The reused switch-in tail
 * (`getswitchedmondata`/`switchindataupdate`/`switchinanim`/
 * `switchineffects`, already registered in `battleScriptSwitchinOpcode.ts`)
 * composes unmodified: all four already key off `rules.monToSwitchIntoId`,
 * not the caller that populated it.
 *
 * `B_SCR_OP_FINISHACTION` is registered here as an unconditional (b)
 * barrier, never modeling `Cmd_finishaction`'s real semantics
 * (`gCurrentActionFuncId = B_ACTION_FINISHED`) -- per
 * docs/script-terminal-gate3-evidence.md's own explicit recommendation to
 * defer: a correct implementation needs a typed `action-finished` terminal
 * receipt owned by an action scheduler this engine does not have yet, and
 * must not be silently mapped onto the existing generic `terminal` halt.
 * It is also structurally unreachable in Factory-legal battles twice over:
 * `BattleScript_SuccessForceOut`'s own `jumpifbattletype BATTLE_TYPE_TRAINER`
 * fork always takes the trainer branch (Factory sets
 * `BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER` unconditionally), and even on
 * a synthetic non-trainer rules context the preceding `setoutcomeonteleport`
 * (`various BS_ATTACKER, VARIOUS_SET_TELEPORT_OUTCOME`) already barriers
 * first via the existing generic VARIOUS dispatcher
 * (`battleScriptSwitchinOpcode.ts`) -- this handler's own barrier is
 * therefore doubly dead code, registered only so a direct call never
 * degrades to the machine's generic `unsupported-opcode` halt.
 */
import {
  drawBattleScriptRng,
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { unsupportedBranch } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptControllerIdlePort } from "./battleScriptSourceCommands.ts";
import {
  BATTLE_SCRIPT_PARTY_SIZE,
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

/** include/abilities.h. */
const ABILITY_NATURAL_CURE = 30;

function requireBattlerRole(
  rules: BattleScriptRulesContext,
  role: "attacker" | "target",
): 0 | 1 | 2 | 3 {
  const value = rules.selectorRoles[role];
  if (value === null) throw new Error(`Cmd_forcerandomswitch requires a ${role} role`);
  return value;
}

function resolveSwitchBattler(
  rules: BattleScriptRulesContext,
  selectorExpression: string,
): 0 | 1 | 2 | 3 {
  if (selectorExpression === "BS_TARGET") return requireBattlerRole(rules, "target");
  if (selectorExpression === "BS_ATTACKER") return requireBattlerRole(rules, "attacker");
  throw new Error(`unresolved battler selector ${selectorExpression}`);
}

/**
 * `TryDoForceSwitchOut` (`:7164-7183`) inlined into `Cmd_forcerandomswitch`
 * (`:7185-7386`), Level-50-singles Factory branch: `firstMonId = 0`,
 * `lastMonId = monsCount = PARTY_SIZE (6)`, `minNeeded = 1`,
 * `battler1PartyId = battler2PartyId = gBattlerPartyIndexes[target]` (the
 * target's own current active slot -- both the rejection loop's reject
 * conditions coincide in singles). The unconditional-success branch
 * (attacker level >= target level) draws zero `Random()` calls; only the
 * target-out-levels-attacker branch draws the level-check roll.
 */
function createForcerandomswitchHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [ptrOperand] = context.instruction.operands;
    if (context.instruction.operands.length !== 1 || ptrOperand?.widthBytes !== 4) {
      throw new Error(`invalid B_SCR_OP_FORCERANDOMSWITCH shape at program counter ${context.state.programCounter}`);
    }
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = requireBattlerRole(rules, "target");
    const attackerLevel = rules.battlers[attacker].level;
    const targetLevel = rules.battlers[target].level;
    const side = rules.battlers[target].side === 0 ? "player" : "opponent";
    const party = rules.party[side];
    const activePartyIndex = rules.battlers[target].partyIndex;

    const failTarget = resolveBattleScriptLabel(context.program, ptrOperand.expression);
    if (!failTarget) throw new Error(`Cmd_forcerandomswitch: unresolved jump target ${ptrOperand.expression}`);
    const jumpToFail = () => transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump" as const, programCounter: failTarget.programCounter }),
    );

    let validMons = 0;
    for (const member of party) {
      if (member.species !== 0 && !member.isEgg && member.hp !== 0) validMons += 1;
    }
    if (validMons <= 1) return jumpToFail();

    let rng = context.state.rng;
    if (targetLevel > attackerLevel) {
      const drawn = drawBattleScriptRng(rng, context.instruction, "forcerandomswitch:level-check");
      rng = drawn.rng;
      const randomByte = drawn.randomValue & 0xff;
      const roll = Math.floor((randomByte * (attackerLevel + targetLevel)) / 256) + 1;
      if (roll <= Math.floor(targetLevel / 4)) {
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "jump", programCounter: failTarget.programCounter }),
          { rng },
        );
      }
    }

    let picked = -1;
    do {
      const drawn = drawBattleScriptRng(rng, context.instruction, "forcerandomswitch:pick");
      rng = drawn.rng;
      picked = drawn.randomValue % BATTLE_SCRIPT_PARTY_SIZE;
    } while (
      picked === activePartyIndex
      || party[picked]!.species === 0
      || party[picked]!.isEgg
      || party[picked]!.hp === 0
    );

    const monToSwitchIntoId = Object.freeze(
      rules.monToSwitchIntoId.map((value, index) => (index === target ? picked : value)),
    ) as unknown as BattleScriptRulesContext["monToSwitchIntoId"];

    const successTarget = resolveBattleScriptLabel(context.program, "BattleScript_SuccessForceOut");
    if (!successTarget) throw new Error("Cmd_forcerandomswitch: BattleScript_SuccessForceOut has no committed label");

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: successTarget.programCounter }),
      { rulesContext: Object.freeze({ ...rules, monToSwitchIntoId }), rng },
    );
  };
}

/**
 * `Cmd_switchoutabilities` (`:9590-9607`): a single-case switch. Only
 * Natural Cure fires (clears the outgoing battler's `status1` and
 * acknowledges a controller round trip); every other ability is a no-op
 * advance -- source-complete, not narrowed.
 */
function createSwitchoutabilitiesHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [selectorOperand] = context.instruction.operands;
    if (context.instruction.operands.length !== 1 || selectorOperand?.widthBytes !== 1) {
      throw new Error(`invalid B_SCR_OP_SWITCHOUTABILITIES shape at program counter ${context.state.programCounter}`);
    }
    const rules = context.state.rulesContext;
    const battler = resolveSwitchBattler(rules, selectorOperand.expression);
    if (rules.battlers[battler].ability !== ABILITY_NATURAL_CURE) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
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
    const battlers = rules.battlers.map((candidate, index) =>
      index === battler ? Object.freeze({ ...candidate, status1: 0 }) : candidate
    ) as unknown as BattleScriptRulesBattlers;
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, battlers: Object.freeze(battlers) }), scheduler },
    );
  };
}

/**
 * `Cmd_returntoball` (`:5346-5352`): unconditional controller acknowledgement
 * (`BtlController_EmitReturnMonToBall`), zero logical state change -- the
 * same "acknowledge controller ownership" shape as `attackanimation`/
 * `switchinanim`.
 */
function createReturntoballHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [selectorOperand] = context.instruction.operands;
    if (context.instruction.operands.length !== 1 || selectorOperand?.widthBytes !== 1) {
      throw new Error(`invalid B_SCR_OP_RETURNTOBALL shape at program counter ${context.state.programCounter}`);
    }
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
    const battler = resolveSwitchBattler(rules, selectorOperand.expression);
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { scheduler });
  };
}

function createFinishactionBarrierHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => unsupportedBranch(
    context,
    "Cmd_finishaction's gCurrentActionFuncId = B_ACTION_FINISHED action-scheduler handoff has no typed "
      + "receipt in this engine yet (docs/script-terminal-gate3-evidence.md's own deferral) -- structurally "
      + "unreachable for Factory besides (BattleScript_SuccessForceOut's jumpifbattletype BATTLE_TYPE_TRAINER "
      + "fork always taken; even the counterfactual non-trainer arm barriers first on the preceding "
      + "setoutcomeonteleport/VARIOUS_SET_TELEPORT_OUTCOME)",
    "battle_script_commands.c",
    10308,
  );
}

export function createBattleScriptForceSwitchOpcodeHandlers(
  program: BattleScriptProgram,
  ports: Readonly<{ isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext> }>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>> = Object.create(null) as Record<
    number,
    BattleScriptOpcodeHandler<BattleScriptRulesContext>
  >;
  const install = (opcodeName: string, handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>) => {
    const instruction = program.instructions.find((candidate) => candidate.opcodeName === opcodeName);
    if (!instruction) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
    handlers[instruction.opcodeId] = handler;
  };
  install("B_SCR_OP_FORCERANDOMSWITCH", createForcerandomswitchHandler());
  install("B_SCR_OP_SWITCHOUTABILITIES", createSwitchoutabilitiesHandler(ports.isControllerIdle));
  install("B_SCR_OP_RETURNTOBALL", createReturntoballHandler(ports.isControllerIdle));
  install("B_SCR_OP_FINISHACTION", createFinishactionBarrierHandler());
  return Object.freeze(handlers);
}
