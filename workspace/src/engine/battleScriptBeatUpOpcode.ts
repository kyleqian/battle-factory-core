/**
 * B_SCR_OP_TRYDOBEATUP / Cmd_trydobeatup
 * (battle_script_commands.c:8957-9007).
 *
 * This opcode owns only the six-party-member scan, nickname preparation, and
 * member-specific base damage. Beat Up's script owns the initial accuracy
 * roll and each hitter's critcalc/adjustnormaldamage rolls.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
  instructionsWithOpcodeName,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_PARTY_SIZE,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };

type SpeciesRow = Readonly<{
  id: number;
  baseAttack: number;
  baseDefense: number;
}>;

const SPECIES_BY_ID = new Map(
  (speciesStatsData.species as readonly SpeciesRow[]).map((row) => [row.id, row]),
);

/** The Level 50 Factory's party level, the default when a caller gives none (every Level 50 participant is level 50). */
const FACTORY_LEVEL_50_PARTY_MEMBER_LEVEL = 50;

/**
 * One Beat Up hit (`Cmd_trydobeatup`, battle_script_commands.c:8986-8994): the member's level is its own
 * `GetMonData(&party[i], MON_DATA_LEVEL)` (:8990), 100 for an Open Level party.
 */
export function calculateBeatUpMemberDamage(
  memberSpecies: number,
  targetSpecies: number,
  power: number,
  helpingHand: boolean,
  memberLevel: number = FACTORY_LEVEL_50_PARTY_MEMBER_LEVEL,
): number {
  const member = SPECIES_BY_ID.get(memberSpecies);
  const target = SPECIES_BY_ID.get(targetSpecies);
  if (!member || !target || target.baseDefense === 0) {
    throw new Error(
      `Cmd_trydobeatup requires valid member/target species, got ${memberSpecies}/${targetSpecies}`,
    );
  }

  // Exact source ordering/truncation. There are deliberately no /256 scales.
  let damage = member.baseAttack * power;
  damage *= Math.trunc((memberLevel * 2) / 5) + 2;
  damage = Math.trunc(damage / target.baseDefense);
  damage = Math.trunc(damage / 50) + 2;
  if (helpingHand) damage = Math.trunc((damage * 15) / 10);
  return damage;
}

function createHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [endPointer, initialFailurePointer] = context.instruction.operands;
    const end = endPointer?.widthBytes === 4
      ? resolveBattleScriptLabel(program, endPointer.expression)
      : undefined;
    const initialFailure = initialFailurePointer?.widthBytes === 4
      ? resolveBattleScriptLabel(program, initialFailurePointer.expression)
      : undefined;
    if (
      context.instruction.operands.length !== 2
      || !end
      || !initialFailure
    ) {
      throw new Error("Cmd_trydobeatup requires two resolved four-byte script pointers");
    }

    const rules = context.state.rulesContext;
    const attacker = rules.selectorRoles.attacker;
    const target = rules.selectorRoles.target;
    if (attacker === null || target === null) {
      throw new Error("Cmd_trydobeatup requires attacker and target roles");
    }
    if (rules.battlers[target].hp === 0) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: end.programCounter }),
      );
    }

    const beforeLoop = rules.battleCommunication0;
    const party = rules.party[rules.battlers[attacker].side === 0 ? "player" : "opponent"];
    let partyIndex = beforeLoop;
    while (partyIndex < BATTLE_SCRIPT_PARTY_SIZE) {
      const member = party[partyIndex]!;
      if (
        member.hp !== 0
        && member.species !== 0
        && !member.isEgg
        && member.status1 === 0
      ) {
        const damage = calculateBeatUpMemberDamage(
          member.species,
          rules.battlers[target].species,
          rules.currentMovePower,
          rules.battlers[attacker].helpingHand === 1,
          member.level,
        );
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "advance" }),
          {
            rulesContext: Object.freeze({
              ...rules,
              battleCommunication0: partyIndex + 1,
              battleMoveDamage: damage,
              battleTextBuff1MonNick: Object.freeze({
                battler: attacker,
                partyIndex,
              }),
            }),
          },
        );
      }
      partyIndex += 1;
    }

    return transitionBattleScriptCommand(
      context,
      Object.freeze({
        kind: "jump",
        programCounter: beforeLoop === 0
          ? initialFailure.programCounter
          : end.programCounter,
      }),
      {
        rulesContext: Object.freeze({
          ...rules,
          battleCommunication0: BATTLE_SCRIPT_PARTY_SIZE,
        }),
      },
    );
  };
}

export function createBattleScriptBeatUpOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = instructionsWithOpcodeName(program, "B_SCR_OP_TRYDOBEATUP");
  const instruction = instructions[0];
  if (
    instructions.length !== 1
    || !instruction
    || instruction.opcodeId !== 0xc4
    || instruction.dispatcher !== "Cmd_trydobeatup"
    || instruction.operands.length !== 2
    || instruction.operands.some(({ widthBytes }) => widthBytes !== 4)
  ) {
    throw new Error(
      `invalid B_SCR_OP_TRYDOBEATUP committed shape (${instructions.length})`,
    );
  }
  return Object.freeze({
    [instruction.opcodeId]: createHandler(program),
  });
}
