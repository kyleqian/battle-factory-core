/**
 * `B_SCR_OP_WEIGHTDAMAGECALCULATION` /
 * `Cmd_weightdamagecalculation` (`battle_script_commands.c:9467-9482`).
 *
 * Low Kick reads the current target's species through the source-derived
 * Pokédex catalog, applies the source's strict upper-bound table, and writes
 * only `gDynamicBasePower`. The operand-free command consumes no RNG and
 * performs no controller or message work.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };

type SpeciesWeightRow = Readonly<{
  id: number;
  weightHectograms: number | null;
}>;

const WEIGHT_BY_SPECIES = new Map(
  (speciesStatsData.species as readonly SpeciesWeightRow[])
    .map(({ id, weightHectograms }) => [id, weightHectograms]),
);

export function lowKickPowerForWeight(weightHectograms: number): number {
  if (!Number.isSafeInteger(weightHectograms) || weightHectograms < 0) {
    throw new Error(
      `Pokédex weight must be a nonnegative integer hectogram value, got ${weightHectograms}`,
    );
  }
  if (weightHectograms < 100) return 20;
  if (weightHectograms < 250) return 40;
  if (weightHectograms < 500) return 60;
  if (weightHectograms < 1000) return 80;
  if (weightHectograms < 2000) return 100;
  return 120;
}

export function sourceSpeciesWeightHectograms(species: number): number {
  const weight = WEIGHT_BY_SPECIES.get(species);
  if (weight === undefined) {
    throw new Error(`species ${species} is outside the source species catalog`);
  }
  if (weight === null) {
    throw new Error(
      `species ${species} is a legacy compatibility id without a source Pokédex weight`,
    );
  }
  return weight;
}

const weightDamageHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const target = requireBattlerRole(context.state.rulesContext, "target");
  const dynamicBasePower = lowKickPowerForWeight(
    sourceSpeciesWeightHectograms(
      context.state.rulesContext.battlers[target].species,
    ),
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...context.state.rulesContext,
        dynamicBasePower,
      }),
    },
  );
};

export function createBattleScriptWeightDamageOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_WEIGHTDAMAGECALCULATION",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_WEIGHTDAMAGECALCULATION requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xdd
    || instruction!.dispatcher !== "Cmd_weightdamagecalculation"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      "invalid B_SCR_OP_WEIGHTDAMAGECALCULATION shape at program counter "
        + instruction!.programCounter,
    );
  }
  return Object.freeze({ [instruction!.opcodeId]: weightDamageHandler });
}
