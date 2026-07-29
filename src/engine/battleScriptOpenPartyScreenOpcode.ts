/**
 * Forced-switch ground truth §4 slice 2: `B_SCR_OP_OPENPARTYSCREEN` /
 * `Cmd_openpartyscreen` (`battle_script_commands.c:5094-5149`), plain-
 * battler `else` branch only (`gSpecialStatuses[battler].faintedHasReplacement`
 * is never set true anywhere this engine models, and `HasNoMonsToSwitch`
 * is false by construction on the non-terminal fork -- the doc's own §4
 * slice 2 scope). This is the single opcode that owns the controller
 * round-trip and the player-vs-AI choice fork
 * (`docs/forced-switch-ground-truth.md` §1b):
 *
 *  - AI/trainer side: `OpponentHandleChoosePokemon` resolves synchronously
 *    via `GetMostSuitableMonToSwitchInto` (ported in `battleAiSwitchInto.ts`)
 *    -- zero extra ticks, zero `Random()` calls (§2b). Modeled here as an
 *    immediate write + advance.
 *  - Player side: `PlayerHandleChoosePokemon` hands off to the interactive
 *    party-menu UI (`docs/forced-switch-ground-truth.md` §3) -- a real,
 *    human-timescale decision this opcode-machine layer cannot resolve
 *    synchronously. Modeled as a genuine `"player-choice-required"` halt
 *    (`battleScriptMachine.ts`) naming the legal replacement slots (alive,
 *    non-egg, not the fainted slot itself -- exactly what
 *    `OpenPartyMenuToChooseMon` permits, §3/§4 slice 10); the party-menu
 *    UI's own cursor/submenu presentation stays out of scope. A caller
 *    resumes by writing the chosen index into `monToSwitchIntoId[battler]`
 *    and re-stepping from the same program counter
 *    (`battleScriptFaintedActionsOrchestration.ts`'s
 *    `resumeBattleScriptFaintedActionsAfterPlayerChoice`) -- this handler's
 *    own player branch then takes the "already decided" path below and
 *    advances, exactly like the AI branch's own tail.
 */
import speciesTypesData from "../data/gen/species-types.json" with { type: "json" };
import {
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  resolveBattleScriptBattlerAtPosition,
  resolveBattleScriptBattlerPosition,
  resolveRulesBattlerForBattleScript,
  BATTLE_SCRIPT_PARTY_SIZE,
  type BattleScriptPartyState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  getMostSuitableMonToSwitchInto,
  type BattleAiSwitchBench,
  type BattleAiSwitchTypes,
} from "./battleAiSwitchInto.ts";

/** include/constants/battle.h:55 -- BATTLE_OPPOSITE(id) = id ^ BIT_SIDE. */
const BIT_SIDE = 1;
/** Opponent/trainer-controlled side (this engine's established 0=player/1=opponent convention). */
const SIDE_OPPONENT = 1;

type SpeciesTypesRow = Readonly<{ name: string; types: readonly [string, string] }>;
const SPECIES_TYPES_ROWS = speciesTypesData.species as unknown as readonly SpeciesTypesRow[];

/** gSpeciesInfo[species].types -- species-types.json is indexed by (speciesId - 1), SPECIES_NONE has no row. */
function resolveSpeciesTypes(species: number): BattleAiSwitchTypes | null {
  const row = SPECIES_TYPES_ROWS[species - 1];
  return row ? row.types : null;
}

function partyStateToBench(party: BattleScriptPartyState): BattleAiSwitchBench | null {
  const bench: Array<{ species: number; hp: number; types: BattleAiSwitchTypes; moves: readonly [number, number, number, number] }> = [];
  for (const member of party) {
    if (member.species === 0) {
      bench.push({ species: 0, hp: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], moves: [0, 0, 0, 0] });
      continue;
    }
    const types = resolveSpeciesTypes(member.species);
    if (!types) return null;
    bench.push({ species: member.species, hp: member.hp, types, moves: member.moves });
  }
  return bench as unknown as BattleAiSwitchBench;
}

/**
 * `OpenPartyMenuToChooseMon`'s own switch-in legality gate (`docs/forced-
 * switch-ground-truth.md` §3/§4 slice 10): alive (hp>0), non-egg, and not
 * the fainted battler's own (now-vacated) slot. Presentation (cursor
 * navigation, the SEND OUT/SUMMARY/CANCEL submenu) is out of scope here --
 * only which slots are legal targets.
 */
function legalSwitchPartyIndexes(
  party: BattleScriptPartyState,
  activePartyIndex: number,
): readonly number[] {
  const legal: number[] = [];
  for (let index = 0; index < party.length; index += 1) {
    const member = party[index]!;
    if (member.species !== 0 && !member.isEgg && member.hp !== 0 && index !== activePartyIndex) {
      legal.push(index);
    }
  }
  return Object.freeze(legal);
}

function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  sourceConstruct: string,
  sourceLine: number,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: Object.freeze({
        kind: "unsupported-branch",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        sourceConstruct,
        sourceFile: "battle_script_commands.c",
        sourceLine,
      }),
    }),
  );
}

function createOpenPartyScreenOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [selectorOperand, jumpOperand] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 2
      || selectorOperand?.widthBytes !== 1
      || jumpOperand?.widthBytes !== 4
    ) {
      throw new Error(
        `invalid B_SCR_OP_OPENPARTYSCREEN shape at program counter ${context.state.programCounter}`,
      );
    }

    const rules = context.state.rulesContext;
    const battler = resolveRulesBattlerForBattleScript(context, selectorOperand);
    if (battler === null) {
      throw new Error(
        `Cmd_openpartyscreen: unresolved battler selector ${selectorOperand.expression} `
          + `at program counter ${context.state.programCounter}`,
      );
    }

    if (rules.battleTopology.battlersCount !== 2) {
      return unsupportedBranch(
        context,
        "Cmd_openpartyscreen's doubles/multi-battle branches (BATTLE_TYPE_MULTI link-standby fan-out, "
          + "GetMostSuitableMonToSwitchInto's own BATTLE_TYPE_DOUBLE opposingBattler Random()&BIT_FLANK pick) "
          + "are not modeled -- Factory singles only",
        5124,
      );
    }

    const side = rules.battlers[battler].side;
    const activePartyIndex = rules.battlers[battler].partyIndex;

    if (side !== SIDE_OPPONENT) {
      const pendingChoice = rules.monToSwitchIntoId[battler];
      if (pendingChoice === BATTLE_SCRIPT_PARTY_SIZE) {
        const legalPartyIndexes = legalSwitchPartyIndexes(rules.party.player, activePartyIndex);
        return transitionBattleScriptCommand(
          context,
          Object.freeze({
            kind: "halt",
            reason: Object.freeze({
              kind: "player-choice-required",
              programCounter: context.state.programCounter,
              opcodeId: context.instruction.opcodeId,
              opcodeName: context.instruction.opcodeName,
              battler,
              faintedPartyIndex: activePartyIndex,
              legalPartyIndexes,
            }),
          }),
        );
      }
      // The player's choice was already resolved externally (monToSwitchIntoId
      // pre-seeded by a resume) -- advance exactly like the AI branch's own tail.
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }

    const opposingPosition = resolveBattleScriptBattlerPosition(rules.battleTopology, battler) ^ BIT_SIDE;
    const opposingBattler = resolveBattleScriptBattlerAtPosition(rules.battleTopology, opposingPosition);
    if (opposingBattler >= rules.battleTopology.battlersCount) {
      throw new Error(`Cmd_openpartyscreen: no battler occupies opposing position ${opposingPosition}`);
    }
    const opposingTypes = rules.battlers[opposingBattler as 0 | 1 | 2 | 3].types;

    // side is narrowed to SIDE_OPPONENT (1) here -- the player branch already returned above.
    const bench = partyStateToBench(rules.party.opponent);
    if (!bench) {
      throw new Error(
        `Cmd_openpartyscreen: party slot has a species with no gSpeciesInfo types row (battler ${battler})`,
      );
    }

    const legalBenchIndexes = legalSwitchPartyIndexes(rules.party.opponent, activePartyIndex);
    const scored = legalBenchIndexes.length === 1
      ? Object.freeze({ kind: "selected" as const, partyIndex: legalBenchIndexes[0]! })
      : getMostSuitableMonToSwitchInto(bench, activePartyIndex, opposingTypes);
    if (scored.kind === "damage-fallback-needed") {
      return unsupportedBranch(
        context,
        "GetMostSuitableMonToSwitchInto's pass-2 AI_CalcDmg raw-damage fallback "
          + "(battle_ai_switch_items.c:748-789) is not modeled -- no fixture on this rung reaches it",
        748,
      );
    }

    const monToSwitchIntoId = Object.freeze(
      rules.monToSwitchIntoId.map((value, index) => (index === battler ? scored.partyIndex : value)),
    ) as unknown as BattleScriptRulesContext["monToSwitchIntoId"];

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, monToSwitchIntoId }) },
    );
  };
}

export function createBattleScriptOpenPartyScreenOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_OPENPARTYSCREEN",
  );
  if (!instruction) throw new Error("committed Battle Script program does not emit B_SCR_OP_OPENPARTYSCREEN");
  return Object.freeze({ [instruction.opcodeId]: createOpenPartyScreenOpcodeHandler() });
}
