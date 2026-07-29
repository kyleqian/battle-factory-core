/**
 * `B_SCR_OP_HEALPARTYSTATUS` / `Cmd_healpartystatus`
 * (`battle_script_commands.c:8370-8464`).
 *
 * Heal Bell excludes Soundproof active battlers and party records;
 * Aromatherapy selects all six party records. The selected party mask is
 * carried by one REQUEST_STATUS_BATTLE semantic controller event.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import { recordBattleScriptAbilityReveal } from "./battleScriptAiReveal.ts";
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
  type BattleScriptSchedulerState,
} from "./battleScriptMachine.ts";
import type {
  BattleScriptInstruction,
  BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_PARTY_SIZE,
  resolveBattleScriptBattlerPartner,
  withBattleScriptPartyMemberStatus1,
  type BattleScriptPartyMemberState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  requireBattlerRole,
  withBattler,
} from "./battleScriptHitChainOpcode.ts";
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };

export const BATTLE_SCRIPT_MOVE_HEAL_BELL = 215;
export const BATTLE_SCRIPT_ABILITY_SOUNDPROOF = 43;
export const BATTLE_SCRIPT_STATUS2_NIGHTMARE = 1 << 27;
export const BATTLE_SCRIPT_B_MSG_BELL = 0;
export const BATTLE_SCRIPT_B_MSG_BELL_SOUNDPROOF_ATTACKER = 1;
export const BATTLE_SCRIPT_B_MSG_BELL_SOUNDPROOF_PARTNER = 2;
export const BATTLE_SCRIPT_B_MSG_SOOTHING_AROMA = 4;

type SpeciesAbilityRow = Readonly<{
  id: number;
  abilities: readonly [string, string];
}>;

const ABILITIES_BY_SPECIES = new Map(
  (speciesStatsData.species as unknown as readonly SpeciesAbilityRow[])
    .map(({ id, abilities }) => [id, abilities]),
);

function requireInstruction(instruction: BattleScriptInstruction): void {
  if (
    instruction.opcodeId !== 0xae
    || instruction.dispatcher !== "Cmd_healpartystatus"
    || instruction.operands.length !== 0
  ) {
    throw new Error(
      "invalid B_SCR_OP_HEALPARTYSTATUS shape at program counter "
        + instruction.programCounter,
    );
  }
}

export function battleScriptPartyMemberHasSoundproof(
  member: BattleScriptPartyMemberState,
): boolean {
  const abilities = ABILITIES_BY_SPECIES.get(member.species);
  if (!abilities) {
    throw new Error(
      `Cmd_healpartystatus: party species ${member.species} is outside the source species catalog`,
    );
  }
  return abilities[member.abilityNum] === "ABILITY_SOUNDPROOF";
}

function clearLiveStatus(
  rules: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
): BattleScriptRulesContext {
  const state = rules.battlers[battler];
  return withBattler(rules, battler, {
    status1: 0,
    status2: (state.status2 & ~BATTLE_SCRIPT_STATUS2_NIGHTMARE) >>> 0,
  });
}

function withPartyMaskStatus(
  rules: BattleScriptRulesContext,
  side: 0 | 1,
  partyMask: number,
): BattleScriptRulesContext {
  let party = rules.party;
  for (let index = 0; index < BATTLE_SCRIPT_PARTY_SIZE; index += 1) {
    if ((partyMask & (1 << index)) !== 0) {
      party = withBattleScriptPartyMemberStatus1(party, side, index, 0);
    }
  }
  return party === rules.party ? rules : Object.freeze({ ...rules, party });
}

const healpartystatusHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  requireInstruction(context.instruction);
  const source = context.state.rulesContext;
  const attacker = requireBattlerRole(source, "attacker");
  const attackerState = source.battlers[attacker];
  const partnerValue = resolveBattleScriptBattlerPartner(
    source.battleTopology,
    attacker,
  );
  const partner = partnerValue as BattleScriptBattlerId;
  const isDouble = (
    source.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE
  ) !== 0;
  const partnerPresent = (
    isDouble
    && partnerValue < source.battleTopology.battlersCount
    && (source.absentBattlerFlags & (1 << partnerValue)) === 0
  );

  let rules = source;
  let partyMask = 0;
  let scheduler: BattleScriptSchedulerState = Object.freeze({
    ...context.state.scheduler,
    activeBattler: partner,
  });

  if (source.currentMove === BATTLE_SCRIPT_MOVE_HEAL_BELL) {
    let chooser = BATTLE_SCRIPT_B_MSG_BELL;
    if (attackerState.ability === BATTLE_SCRIPT_ABILITY_SOUNDPROOF) {
      chooser |= BATTLE_SCRIPT_B_MSG_BELL_SOUNDPROOF_ATTACKER;
      rules = recordBattleScriptAbilityReveal(
        rules,
        attacker,
        BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
      );
    } else {
      rules = clearLiveStatus(rules, attacker);
    }

    if (partnerPresent) {
      if (
        source.battlers[partner].ability
        === BATTLE_SCRIPT_ABILITY_SOUNDPROOF
      ) {
        chooser |= BATTLE_SCRIPT_B_MSG_BELL_SOUNDPROOF_PARTNER;
        // As above, RecordAbilityBattle has no gLastUsedAbility side effect.
      } else {
        rules = clearLiveStatus(rules, partner);
      }
    }

    const party = source.party[
      attackerState.side === 0 ? "player" : "opponent"
    ];
    for (let index = 0; index < BATTLE_SCRIPT_PARTY_SIZE; index += 1) {
      const member = party[index];
      if (member.species === 0 || member.isEgg) continue;
      let isSoundproof: boolean;
      if (attackerState.partyIndex === index) {
        isSoundproof = attackerState.ability === BATTLE_SCRIPT_ABILITY_SOUNDPROOF;
      } else if (
        partnerPresent
        && source.battlers[partner].partyIndex === index
      ) {
        isSoundproof = (
          source.battlers[partner].ability
          === BATTLE_SCRIPT_ABILITY_SOUNDPROOF
        );
      } else {
        isSoundproof = battleScriptPartyMemberHasSoundproof(member);
      }
      if (!isSoundproof) partyMask |= 1 << index;
    }
    rules = Object.freeze({
      ...rules,
      multistringChooser: chooser,
      scriptingBattler: partner,
    });
  } else {
    partyMask = (1 << BATTLE_SCRIPT_PARTY_SIZE) - 1;
    rules = clearLiveStatus(rules, attacker);
    if (partnerPresent) rules = clearLiveStatus(rules, partner);
    rules = Object.freeze({
      ...rules,
      multistringChooser: BATTLE_SCRIPT_B_MSG_SOOTHING_AROMA,
    });
  }

  rules = withPartyMaskStatus(rules, attackerState.side, partyMask);
  if (partyMask === 0) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: rules, scheduler },
    );
  }

  scheduler = markBattleScriptControllerPending(
    Object.freeze({ ...scheduler, activeBattler: attacker }),
    attacker,
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: rules,
      scheduler,
      events: Object.freeze([
        Object.freeze({
          kind: "set-party-status-data" as const,
          battler: attacker,
          partyMask,
          status1: 0,
        }),
      ]),
    },
  );
};

export function createBattleScriptHealpartystatusOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_HEALPARTYSTATUS",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_HEALPARTYSTATUS requires exactly 1 concrete start, got "
        + instructions.length,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({ [instructions[0]!.opcodeId]: healpartystatusHandler });
}
