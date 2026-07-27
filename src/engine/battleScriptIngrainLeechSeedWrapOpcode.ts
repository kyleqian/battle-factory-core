/**
 * Ingrain/Leech Seed/Wrap-family SETTER-and-end-turn-body opcode slice
 * (docs/ingrain-leechseed-wrap-ground-truth.md §1a/§1b/§2b §5 slices 1/3):
 *
 *   TRYSETROOTS (Ingrain's own setter, `Cmd_trysetroots`,
 *   `battle_script_commands.c:9326-9336`), SETSEEDED (Leech Seed's own
 *   setter, `Cmd_setseeded:6718-6736`), plus three generic opcodes
 *   `BattleScript_LeechSeedTurnDrain` needs that this doc's own §0 opcode
 *   census found unregistered under the source mnemonics `copyword`/
 *   `jumpifability`/`manipulatedamage` -- COPYARRAY (`Cmd_copyarray:3837
 *   -3848`, the real opcode `copyword` expands to), JUMPIFABILITY
 *   (`Cmd_jumpifability:3105-3149`), MANIPULATEDAMAGE
 *   (`Cmd_manipulatedamage:6740-6759`).
 *
 * COPYARRAY/JUMPIFABILITY/MANIPULATEDAMAGE are generic multi-site opcodes
 * (16/18/4 concrete call sites across the whole committed program, one
 * shared opcodeId each) -- only the exact operand tuple this doc's own
 * scope needs is modeled; every other concrete call site (Triple Kick's
 * counter, Bide's damage store, Pain Split, the many other
 * jumpifability-gated ability preventions, Recoil/Beat Up's own damage
 * manipulation, ...) is a single named (b) barrier, the same policy
 * `battleScriptDamagingWeatherOpcode.ts`'s ADDBYTE/BICWORD/
 * JUMPIFARRAYNOTEQUAL handlers already established.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { isBattlerOfType, unsupportedBranch, withBattler } from "./battleScriptHitChainOpcode.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_STATUS3_LEECHSEED,
  BATTLE_SCRIPT_STATUS3_ROOTED,
} from "./battleScriptSourceConstants.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

/** battle_message.c:960-966 -- gLeechSeedStringIds' own MULTISTRING_CHOOSER indices. */
const B_MSG_LEECH_SEED_SET = 0;
const B_MSG_LEECH_SEED_MISS = 1;
const B_MSG_LEECH_SEED_FAIL = 2;

/**
 * `Cmd_trysetroots` (`battle_script_commands.c:9326-9336`). No accuracy
 * check anywhere in `BattleScript_EffectIngrain` -- the only failure mode is
 * "already rooted", a plain source-complete branch.
 */
function createTrysetrootsHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = rulesContext.selectorRoles.attacker;
    if (attacker === null) throw new Error("Cmd_trysetroots requires an attacker role");
    const battlerState = rulesContext.battlers[attacker];

    if ((battlerState.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) !== 0) {
      const failOperand = context.instruction.operands[0]!;
      const target = resolveBattleScriptLabel(context.program, failOperand.expression);
      if (!target) throw new Error(`Cmd_trysetroots: unresolved fail label ${failOperand.expression}`);
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "jump", programCounter: target.programCounter }));
    }

    const nextRulesContext = withBattler(rulesContext, attacker, {
      status3: (battlerState.status3 | BATTLE_SCRIPT_STATUS3_ROOTED) >>> 0,
    });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
  };
}

/**
 * `Cmd_setseeded` (`battle_script_commands.c:6718-6736`). Three real branches:
 * miss (either a genuine accuracy miss -- `MOVE_RESULT_NO_EFFECT`, already
 * set by the preceding `accuracycheck` -- or re-seeding an already-seeded
 * target), Grass-type immunity (type check, source-complete, cheap per the
 * doc's own scope note), and success (`gStatuses3[target] |= attacker |
 * STATUS3_LEECHSEED` -- the two bit ranges §1b's own gap analysis flagged).
 */
function createSetseededHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = rulesContext.selectorRoles.attacker;
    const target = rulesContext.selectorRoles.target;
    if (attacker === null || target === null) throw new Error("Cmd_setseeded requires attacker and target roles");
    const targetState = rulesContext.battlers[target];

    const alreadyMissedOrSeeded =
      (rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0
      || (targetState.status3 & BATTLE_SCRIPT_STATUS3_LEECHSEED) !== 0;
    if (alreadyMissedOrSeeded) {
      const nextRulesContext = Object.freeze({
        ...rulesContext,
        moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
        multistringChooser: B_MSG_LEECH_SEED_MISS,
      });
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
    }

    if (isBattlerOfType(targetState, "TYPE_GRASS")) {
      const nextRulesContext = Object.freeze({
        ...rulesContext,
        moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
        multistringChooser: B_MSG_LEECH_SEED_FAIL,
      });
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
    }

    const nextStatus3 = (targetState.status3 | attacker | BATTLE_SCRIPT_STATUS3_LEECHSEED) >>> 0;
    const withTarget = withBattler(rulesContext, target, { status3: nextStatus3 });
    const nextRulesContext = Object.freeze({ ...withTarget, multistringChooser: B_MSG_LEECH_SEED_SET });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
  };
}

/**
 * `Cmd_copyarray` (`battle_script_commands.c:3837-3848`), covers two
 * concrete 4-byte tuples: `BattleScript_LeechSeedTurnDrain`'s own
 * `copyword gBattleMoveDamage, gHpDealt` (the just-dealt drain amount copied
 * back into the damage register before the sign flip/Liquid Ooze branch) and
 * `BattleScript_EffectEndeavor`'s own reverse pair -- `copyword gHpDealt,
 * gBattleMoveDamage` right after `setdamagetohealthdifference`, then
 * `copyword gBattleMoveDamage, gHpDealt` again after typecalc/bicbyte.
 * Endeavor stashes its own just-computed set-damage into gHpDealt before
 * typecalc can multiply gBattleMoveDamage by STAB/type-effectiveness, then
 * restores it unmodified afterward -- the move's real damage is genuinely
 * immune to typecalc's own side effect, a real source mechanism this
 * widening surfaces, not a special case. Every other of this opcode's 16
 * concrete call sites (Triple Kick, Pain Split, Bide, Curse, ability-
 * immunity messages, ...) is the single named barrier below.
 */
function createCopyarrayHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [dstOperand, srcOperand, sizeOperand] = context.instruction.operands;
    const rulesContext = context.state.rulesContext;
    const dst = dstOperand?.expression;
    const src = srcOperand?.expression;
    const size = sizeOperand?.expression;

    if (size === "0x4" && dst === "gBattleMoveDamage" && src === "gHpDealt") {
      const nextRulesContext = Object.freeze({ ...rulesContext, battleMoveDamage: rulesContext.hpDealt });
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
    }
    if (size === "0x4" && dst === "gHpDealt" && src === "gBattleMoveDamage") {
      const nextRulesContext = Object.freeze({ ...rulesContext, hpDealt: rulesContext.battleMoveDamage });
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
    }
    return unsupportedBranch(
      context,
      `Cmd_copyarray's operand (${dst ?? "<missing>"}, ${src ?? "<missing>"}, ${size ?? "<missing>"}) `
        + "is not a registered gBattleMoveDamage<->gHpDealt, size 4 tuple",
      "battle_script_commands.c",
      3837,
    );
  };
}

/** include/abilities.h:68. */
const ABILITY_LIQUID_OOZE = 64;
/**
 * include/abilities.h -- widened per docs/status-cluster-ground-truth.md's
 * scout finding: EFFECT_TOXIC/EFFECT_POISON/EFFECT_PARALYZE/EFFECT_CONFUSE's
 * own script-level jumpifability calls (Immunity/Limber/Own Tempo) need
 * these three concrete values in addition to Leech Seed's Liquid Ooze check.
 */
const ABILITY_LIMBER = 7;
const ABILITY_IMMUNITY = 17;
const ABILITY_OWN_TEMPO = 20;
/**
 * include/abilities.h -- widened per docs/yawn-thrash-endturn-design.md §1b:
 * `BattleScript_EffectYawn`'s own two ability-immunity checks, both with real
 * Factory L50 carriers (Vital Spirit: MANKEY/PRIMEAPE, DELIBIRD, VIGOROTH;
 * Insomnia: DROWZEE/HYPNO, HOOTHOOT/NOCTOWL, SPINARAK/ARIADOS, MURKROW,
 * SHUPPET, BANETTE -- checked live against battle-frontier-mons.json).
 */
const ABILITY_VITAL_SPIRIT = 72;
const ABILITY_INSOMNIA = 15;
const JUMPIFABILITY_VALUES: ReadonlyMap<string, number> = new Map([
  ["ABILITY_LIQUID_OOZE", ABILITY_LIQUID_OOZE],
  ["ABILITY_LIMBER", ABILITY_LIMBER],
  ["ABILITY_IMMUNITY", ABILITY_IMMUNITY],
  ["ABILITY_OWN_TEMPO", ABILITY_OWN_TEMPO],
  ["ABILITY_VITAL_SPIRIT", ABILITY_VITAL_SPIRIT],
  ["ABILITY_INSOMNIA", ABILITY_INSOMNIA],
]);
/** Exported so tools/report/executable-frontier-census.ts's jumpifability value-coverage check never drifts from what this opcode actually dispatches (same live-import precedent as SET_MOVE_EFFECT_SUPPORTED_BYTES). */
export const JUMPIFABILITY_SUPPORTED_ABILITY_NAMES: ReadonlySet<string> = new Set(JUMPIFABILITY_VALUES.keys());

/**
 * `Cmd_jumpifability` (`battle_script_commands.c:3105-3149`), narrowed to the
 * plain `GetBattlerForBattleScript` selector branch (BS_TARGET/BS_ATTACKER --
 * every one of this opcode's concrete call sites this engine registers uses
 * one of those two, never the BS_ATTACKER_SIDE/BS_NOT_ATTACKER_SIDE
 * `AbilityBattleEffects` side-check branches) and, per
 * docs/status-cluster-ground-truth.md and docs/yawn-thrash-endturn-design.md
 * §1b, the six concrete ability ids this widening covers (Liquid Ooze for
 * Leech Seed, Immunity/Limber/Own Tempo for the primary status-move cluster,
 * Vital Spirit/Insomnia for Yawn). `RecordAbilityBattle`/
 * `gBattleScripting.battlerWithAbility` are the same untracked AI-history
 * bookkeeping `Cmd_cleareffectsonfaint`'s own doc comment already established
 * has no reader in this engine's scope.
 */
function createJumpifabilityHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [battlerOperand, abilityOperand, jumpOperand] = context.instruction.operands;
    const rulesContext = context.state.rulesContext;
    const battlerExpression = battlerOperand?.expression;
    const battler = battlerExpression === "BS_TARGET"
      ? rulesContext.selectorRoles.target
      : battlerExpression === "BS_ATTACKER"
        ? rulesContext.selectorRoles.attacker
        : null;
    const abilityId = abilityOperand === undefined ? undefined : JUMPIFABILITY_VALUES.get(abilityOperand.expression);
    if (battler === null || abilityId === undefined) {
      return unsupportedBranch(
        context,
        `Cmd_jumpifability's operand (${battlerExpression ?? "<missing>"}, ${abilityOperand?.expression ?? "<missing>"}) `
          + "is not a registered BS_TARGET/BS_ATTACKER, ABILITY_* tuple",
        "battle_script_commands.c",
        3105,
      );
    }
    const battlerState = rulesContext.battlers[battler];
    if (battlerState.ability !== abilityId) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, jumpOperand!.expression);
    if (!target) throw new Error(`Cmd_jumpifability: unresolved jump target ${jumpOperand!.expression}`);
    const nextRulesContext = Object.freeze({ ...rulesContext, lastUsedAbility: abilityId });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
      { rulesContext: nextRulesContext },
    );
  };
}

/**
 * `Cmd_manipulatedamage` (`battle_script_commands.c:6740-6759`), narrowed to
 * the `DMG_CHANGE_SIGN` case (`BattleScript_LeechSeedTurnDrain`'s own use,
 * and `BattleScript_AbsorbLiquidOoze`'s identical one) -- a two-line
 * arithmetic flip. `DMG_RECOIL_FROM_MISS`/`DMG_DOUBLED` (Struggle recoil,
 * Beat Up) are out of this slice's scope, the single named barrier below.
 */
function createManipulatedamageHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [modeOperand] = context.instruction.operands;
    const rulesContext = context.state.rulesContext;
    if (modeOperand?.expression !== "DMG_CHANGE_SIGN") {
      return unsupportedBranch(
        context,
        `Cmd_manipulatedamage's mode (${modeOperand?.expression ?? "<missing>"}) is not the registered DMG_CHANGE_SIGN case`,
        "battle_script_commands.c",
        6740,
      );
    }
    const nextRulesContext = Object.freeze({ ...rulesContext, battleMoveDamage: -rulesContext.battleMoveDamage });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
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

export function createBattleScriptIngrainLeechSeedWrapOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  return Object.freeze({
    ...registerSingleInstruction(program, "B_SCR_OP_TRYSETROOTS", 1, createTrysetrootsHandler()),
    ...registerSingleInstruction(program, "B_SCR_OP_SETSEEDED", 0, createSetseededHandler()),
    [findInstructionOpcodeId(program, "B_SCR_OP_COPYARRAY")]: createCopyarrayHandler(),
    [findInstructionOpcodeId(program, "B_SCR_OP_JUMPIFABILITY")]: createJumpifabilityHandler(),
    [findInstructionOpcodeId(program, "B_SCR_OP_MANIPULATEDAMAGE")]: createManipulatedamageHandler(),
  });
}
