/**
 * `B_SCR_OP_JUMPIFABILITYPRESENT` / `Cmd_jumpifabilitypresent`
 * (`battle_script_commands.c:3991-3997`):
 *
 * ```c
 * static void Cmd_jumpifabilitypresent(void)
 * {
 *     if (AbilityBattleEffects(ABILITYEFFECT_CHECK_ON_FIELD, 0, gBattlescriptCurrInstr[1], 0, 0))
 *         gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2);
 *     else
 *         gBattlescriptCurrInstr += 6;
 * }
 * ```
 *
 * `ABILITYEFFECT_CHECK_ON_FIELD` (`battle_util.c:3140-3148`) scans every
 * battler `0..gBattlersCount` and returns true if any living (`hp != 0`) mon
 * carries the ability -- structurally distinct from the already-registered
 * single-battler `JUMPIFABILITY`. `BattleScript_EffectSolarBeam`'s own two
 * calls (`data/battle_scripts_1.s:1904-1905`, Cloud Nine / Air Lock) are the
 * only concrete call sites in the committed program, and they are exactly
 * the two abilities `WEATHER_HAS_EFFECT` itself expands to
 * (`include/battle_util.h:47`: `ABILITY_ON_FIELD(abilityId)` is the same
 * `AbilityBattleEffects(ABILITYEFFECT_CHECK_ON_FIELD, ...)` call). So
 * `abilityPresentOnField` below is exported and reused by
 * `battleScriptRecoverbasedonsunlightOpcode.ts`'s own `WEATHER_HAS_EFFECT`
 * check rather than duplicated.
 *
 * The committed program is a fixed compiled asset (not an arbitrary user
 * script), and both concrete call sites' ability operands are known ahead of
 * time, so the operand domain is validated eagerly at registration --
 * mirroring `Cmd_clearstatusfromeffect`'s/the zero-operand semi-invulnerable
 * opcodes' own exact-shape checks (`battleScriptSemiInvulnerableOpcode.ts`)
 * -- rather than deferred to a runtime `(b)` barrier no fixture could ever
 * reach.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/abilities.h:17,81 -- BattleScript_EffectSolarBeam's own two concrete values. */
const ABILITY_CLOUD_NINE = 13;
const ABILITY_AIR_LOCK = 77;
const JUMPIFABILITYPRESENT_VALUES: ReadonlyMap<string, number> = new Map([
  ["ABILITY_CLOUD_NINE", ABILITY_CLOUD_NINE],
  ["ABILITY_AIR_LOCK", ABILITY_AIR_LOCK],
]);
/** Exported so tools/report/executable-frontier-census.ts's coverage check never drifts from what this opcode actually dispatches. */
export const JUMPIFABILITYPRESENT_SUPPORTED_ABILITY_NAMES: ReadonlySet<string> =
  new Set(JUMPIFABILITYPRESENT_VALUES.keys());

export function abilityPresentOnField(
  rulesContext: BattleScriptRulesContext,
  abilityId: number,
): boolean {
  const { battlersCount } = rulesContext.battleTopology;
  for (let battler = 0; battler < battlersCount; battler += 1) {
    const battlerState = rulesContext.battlers[battler];
    if (battlerState.ability === abilityId && battlerState.hp !== 0) return true;
  }
  return false;
}

/**
 * One shared handler installed under this opcode's single shared opcodeId
 * (both concrete call sites emit the same byte, `Cmd_jumpifabilitypresent`
 * itself); `context.instruction` is always whichever real instance is
 * currently executing, so the ability operand is read fresh each call. Safe
 * to assume it resolves -- `createBattleScriptJumpifabilitypresentOpcodeHandlers`
 * already validated every concrete committed instance up front.
 */
function createJumpifabilitypresentHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [abilityOperand, jumpOperand] = context.instruction.operands;
    const abilityId = JUMPIFABILITYPRESENT_VALUES.get(abilityOperand!.expression);
    if (abilityId === undefined) {
      throw new Error(`Cmd_jumpifabilitypresent: unvalidated ability operand ${abilityOperand!.expression}`);
    }
    const rulesContext = context.state.rulesContext;
    if (!abilityPresentOnField(rulesContext, abilityId)) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, jumpOperand!.expression);
    if (!target) {
      throw new Error(`Cmd_jumpifabilitypresent: unresolved jump target ${jumpOperand!.expression}`);
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

export function createBattleScriptJumpifabilitypresentOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (candidate) => candidate.opcodeName === "B_SCR_OP_JUMPIFABILITYPRESENT",
  );
  if (instructions.length !== 2) {
    throw new Error(`B_SCR_OP_JUMPIFABILITYPRESENT requires both concrete starts, got ${instructions.length}`);
  }
  for (const instruction of instructions) {
    const [abilityOperand, jumpOperand] = instruction.operands;
    if (
      instruction.operands.length !== 2
      || abilityOperand?.widthBytes !== 1
      || JUMPIFABILITYPRESENT_VALUES.get(abilityOperand.expression) === undefined
      || jumpOperand?.widthBytes !== 4
    ) {
      throw new Error(`invalid B_SCR_OP_JUMPIFABILITYPRESENT shape at program counter ${instruction.programCounter}`);
    }
  }
  return Object.freeze({ [instructions[0]!.opcodeId]: createJumpifabilitypresentHandler() });
}
