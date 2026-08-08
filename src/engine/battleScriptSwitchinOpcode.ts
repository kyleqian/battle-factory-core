/**
 * Forced-switch ground truth §4 slices 1/2/3 tail: the opcodes between
 * `openpartyscreen`'s AI pick (already registered) and `cancelallactions`
 * (`data/battle_scripts_1.s:2843-2897`, walked in full in
 * `docs/forced-switch-ground-truth.md` §1a). Per §5c, `SWITCHHANDLEORDER`'s
 * `SwitchPartyOrder` permutation table is proven presentation-only (RAM +
 * source), so it is NOT modeled here -- this file's `monToSwitchIntoId`
 * remains a raw party-array index throughout, exactly as this engine's
 * `party.opponent[i]`/`party.player[i]` already index.
 *
 * `getswitchedmondata`/`switchindataupdate` rebuild the source BattlePokemon
 * wholesale from the party/controller record at the newly-decided raw index:
 * ability is re-derived from species + abilityNum, and IVs, personality,
 * level, friendship, max HP, and every battle stat replace the outgoing
 * values. Types resolve from the species table; stat stages/status2/status3/the modeled
 * DisableStruct-shaped fields reset to `SwitchInClearSetData`'s neutral
 * values (`battle_main.c:3152-3262`). The same source routine clears the
 * incoming battler's last-move/result fields and Battle History move/ability
 * records while preserving item-effect history. Party moves/PP and held item are now
 * rebuilt too; the item is forced to NONE when the side/party-slot bit in
 * `knockedOffMons` is set.
 */
import {
  drawBattleScriptRng,
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptBlockReason,
  type BattleScriptCommandTransition,
  type BattleScriptHaltReason,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptBattlerId, BattleScriptSemanticEventPayload } from "./battleScriptEvents.ts";
import { recordBattleScriptAbilityReveal } from "./battleScriptAiReveal.ts";
import type { BattleScriptControllerIdlePort } from "./battleScriptSourceCommands.ts";
import {
  resolveRulesBattlerForBattleScript,
  BATTLE_SCRIPT_BATTLE_TYPE_ARENA,
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  BATTLE_SCRIPT_EFFECT_BATON_PASS,
  BATTLE_SCRIPT_PARTY_SIZE,
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
  type BattleScriptStatStages,
} from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_WRAPPED_MASK } from "./battleScriptSourceConstants.ts";
import { cancelBattleScriptMultiTurnMoves } from "./battleScriptMultiTurnCancellation.ts";
import { computeCastformForm } from "./battleScriptTryCastformDataChangeOpcode.ts";
import speciesTypesData from "../data/gen/species-types.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };

/** include/constants/battle.h:60. */
const BATTLE_TYPE_LINK = 1 << 1;
/** include/constants/battle.h:190,199,205. */
const HITMARKER_PLAYER_FAINTED = 1 << 22;
const DEFAULT_STAT_STAGE = 6;
const DEFAULT_STAT_STAGES = Object.freeze([
  DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE,
  DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE,
]) as unknown as BattleScriptStatStages;
/** include/constants/battle.h:213/217. */
const SIDE_STATUS_SPIKES = 1 << 4;
const SIDE_STATUS_SPIKES_DAMAGED = 1 << 9;
const STATUS2_DESTINY_BOND = 1 << 25;
const HITMARKER_DESTINYBOND = 1 << 6;
const ABILITY_LEVITATE = 26;
/** include/constants/battle.h:150/160 -- cross-battler identity status bits. */
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const STATUS3_ALWAYS_HITS = (1 << 3) | (1 << 4);
/** battle_main.c:3175-3176 -- the exact volatile masks SwitchInClearSetData carries through Baton Pass. */
const BATON_PASS_STATUS2 =
  ((1 << 0) | (1 << 1) | (1 << 2) | (1 << 20) | (1 << 24)
    | STATUS2_ESCAPE_PREVENTION | (1 << 28)) >>> 0;
const BATON_PASS_STATUS3 =
  ((1 << 0) | (1 << 1) | (1 << 2) | STATUS3_ALWAYS_HITS | (1 << 5)
    | (1 << 10) | (1 << 16) | (1 << 17)) >>> 0;
/** include/constants/battle.h:161 -- reset when Baton Pass changes a sure-hit target. */
const STATUS3_ALWAYS_HITS_TURN_2 = (2 << 3) & STATUS3_ALWAYS_HITS;
/** include/constants/abilities.h -- battle_util.c:2488-2599's ABILITYEFFECT_ON_SWITCHIN switch cases. */
const ABILITY_DRIZZLE = 2;
const ABILITY_CLOUD_NINE = 13;
const ABILITY_INTIMIDATE = 22;
const ABILITY_TRACE = 36;
const ABILITY_SAND_STREAM = 45;
const ABILITY_FORECAST = 59;
const ABILITY_TRUANT = 54;
const ABILITY_DROUGHT = 70;
const ABILITY_AIR_LOCK = 77;
const STATUS3_INTIMIDATE_POKES = 1 << 19;
const STATUS3_TRACE = 1 << 20;
const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
const B_WEATHER_RAIN_PERMANENT = 1 << 2;
const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;
const B_WEATHER_SANDSTORM_PERMANENT = 1 << 4;
const B_WEATHER_SUN_TEMPORARY = 1 << 5;
const B_WEATHER_SUN_PERMANENT = 1 << 6;

type SpeciesTypesRow = Readonly<{ name: string; types: readonly [string, string] }>;
const SPECIES_TYPES_ROWS = speciesTypesData.species as unknown as readonly SpeciesTypesRow[];
type SpeciesStatsRow = Readonly<{ id: number; abilities: readonly [string, string] }>;
const SPECIES_STATS_BY_ID = new Map(
  (speciesStatsData.species as unknown as readonly SpeciesStatsRow[]).map((row) => [row.id, row]),
);
/** include/constants/abilities.h: source symbols in exact numeric-id order. */
export const ABILITY_SYMBOLS = Object.freeze([
  "ABILITY_NONE", "ABILITY_STENCH", "ABILITY_DRIZZLE", "ABILITY_SPEED_BOOST",
  "ABILITY_BATTLE_ARMOR", "ABILITY_STURDY", "ABILITY_DAMP", "ABILITY_LIMBER",
  "ABILITY_SAND_VEIL", "ABILITY_STATIC", "ABILITY_VOLT_ABSORB", "ABILITY_WATER_ABSORB",
  "ABILITY_OBLIVIOUS", "ABILITY_CLOUD_NINE", "ABILITY_COMPOUND_EYES", "ABILITY_INSOMNIA",
  "ABILITY_COLOR_CHANGE", "ABILITY_IMMUNITY", "ABILITY_FLASH_FIRE", "ABILITY_SHIELD_DUST",
  "ABILITY_OWN_TEMPO", "ABILITY_SUCTION_CUPS", "ABILITY_INTIMIDATE", "ABILITY_SHADOW_TAG",
  "ABILITY_ROUGH_SKIN", "ABILITY_WONDER_GUARD", "ABILITY_LEVITATE", "ABILITY_EFFECT_SPORE",
  "ABILITY_SYNCHRONIZE", "ABILITY_CLEAR_BODY", "ABILITY_NATURAL_CURE", "ABILITY_LIGHTNING_ROD",
  "ABILITY_SERENE_GRACE", "ABILITY_SWIFT_SWIM", "ABILITY_CHLOROPHYLL", "ABILITY_ILLUMINATE",
  "ABILITY_TRACE", "ABILITY_HUGE_POWER", "ABILITY_POISON_POINT", "ABILITY_INNER_FOCUS",
  "ABILITY_MAGMA_ARMOR", "ABILITY_WATER_VEIL", "ABILITY_MAGNET_PULL", "ABILITY_SOUNDPROOF",
  "ABILITY_RAIN_DISH", "ABILITY_SAND_STREAM", "ABILITY_PRESSURE", "ABILITY_THICK_FAT",
  "ABILITY_EARLY_BIRD", "ABILITY_FLAME_BODY", "ABILITY_RUN_AWAY", "ABILITY_KEEN_EYE",
  "ABILITY_HYPER_CUTTER", "ABILITY_PICKUP", "ABILITY_TRUANT", "ABILITY_HUSTLE",
  "ABILITY_CUTE_CHARM", "ABILITY_PLUS", "ABILITY_MINUS", "ABILITY_FORECAST",
  "ABILITY_STICKY_HOLD", "ABILITY_SHED_SKIN", "ABILITY_GUTS", "ABILITY_MARVEL_SCALE",
  "ABILITY_LIQUID_OOZE", "ABILITY_OVERGROW", "ABILITY_BLAZE", "ABILITY_TORRENT",
  "ABILITY_SWARM", "ABILITY_ROCK_HEAD", "ABILITY_DROUGHT", "ABILITY_ARENA_TRAP",
  "ABILITY_VITAL_SPIRIT", "ABILITY_WHITE_SMOKE", "ABILITY_PURE_POWER", "ABILITY_SHELL_ARMOR",
  "ABILITY_CACOPHONY", "ABILITY_AIR_LOCK",
]);
const ABILITY_ID_BY_SYMBOL = new Map(ABILITY_SYMBOLS.map((symbol, id) => [symbol, id]));

/** gSpeciesInfo[species].types -- species-types.json is indexed by (speciesId - 1). */
function resolveSpeciesTypes(species: number): readonly [string, string] | null {
  const row = SPECIES_TYPES_ROWS[species - 1];
  return row ? row.types : null;
}

function resolveSpeciesAbility(species: number, abilityNum: number): number | null {
  const symbol = SPECIES_STATS_BY_ID.get(species)?.abilities[abilityNum];
  return symbol === undefined ? null : (ABILITY_ID_BY_SYMBOL.get(symbol) ?? null);
}

function statusInfatuatedWithBit(battler: number): number {
  return (1 << (16 + battler)) >>> 0;
}

function haltTransition<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  reason: BattleScriptHaltReason,
): BattleScriptCommandTransition<RulesContext> {
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "halt", reason }));
}

function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  sourceConstruct: string,
  sourceLine: number,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return haltTransition(context, Object.freeze({
    kind: "unsupported-branch",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    sourceConstruct,
    sourceFile: "battle_script_commands.c",
    sourceLine,
  }));
}

function controllerBusyBlock(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const reason: BattleScriptBlockReason = Object.freeze({
    kind: "controller-busy",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
  });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
}

function callSwitchinScript(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  label: string,
  rulesContext: BattleScriptRulesContext,
  events: readonly BattleScriptSemanticEventPayload[] = Object.freeze([]),
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const script = resolveBattleScriptLabel(context.program, label);
  if (!script) throw new Error(`committed Battle Script program has no ${label}`);
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "call-current", programCounter: script.programCounter }),
    { rulesContext, events },
  );
}

/**
 * include/constants/battle_script_commands.h -- the `various` ids this
 * file resolves; every other case name stays unrecognized (barriers).
 * VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT (23, battle_script_commands.c:
 * 6480-6482) widens this existing barrier's modeled operand set --
 * BattleScript_RestIsAlreadyAsleep's own `setalreadystatusedmoveattempt
 * BS_ATTACKER` (a `various` macro expansion) reaches it. The write
 * (`gBattleStruct->alreadyStatusedMoveAttempt |= gBitTable[gActiveBattler]`)
 * is only ever read by Battle Arena (battle_arena.c:594), unmodeled here --
 * tracked purely so this reachable script doesn't halt on an avoidable
 * barrier.
 */
const VARIOUS_CANCEL_MULTI_TURN_MOVES = 0;
const VARIOUS_SET_MAGIC_COAT_TARGET = 1;
const VARIOUS_GET_MOVE_TARGET = 3;
const VARIOUS_GET_BATTLER_FAINTED = 4;
const VARIOUS_RESET_PLAYER_FAINTED = 7;
const VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT = 23;
/**
 * `battle_script_commands.c:6455-6470` -- terminal-seam increment (i) LOSS
 * half (`docs/terminal-seam-loss-path-ground-truth.md` §5 item 1). Both
 * cases hardcode their own target battler (`gActiveBattler = 1` / `= 3`)
 * immediately inside the case body, discarding whatever `Cmd_various`'s own
 * generic `GetBattlerForBattleScript(gBattlescriptCurrInstr[1])` pre-resolve
 * produced -- the `BS_ATTACKER` selector both call sites pass is a dummy
 * operand, same class of value-collision `battleScriptBattlerPositions.ts`
 * already documents for `trainerslidein`. So neither case reads this file's
 * generic `resolveSwitchBattler`/battler-role machinery at all.
 */
const VARIOUS_RETURN_OPPONENT_MON1 = 19;
const VARIOUS_RETURN_OPPONENT_MON2 = 20;
const NAMED_BYTE_CONSTANTS = new Map<string, number>([
  ["VARIOUS_CANCEL_MULTI_TURN_MOVES", VARIOUS_CANCEL_MULTI_TURN_MOVES],
  ["VARIOUS_SET_MAGIC_COAT_TARGET", VARIOUS_SET_MAGIC_COAT_TARGET],
  ["VARIOUS_GET_MOVE_TARGET", VARIOUS_GET_MOVE_TARGET],
  ["VARIOUS_GET_BATTLER_FAINTED", VARIOUS_GET_BATTLER_FAINTED],
  ["VARIOUS_RETURN_OPPONENT_MON1", VARIOUS_RETURN_OPPONENT_MON1],
  ["VARIOUS_RETURN_OPPONENT_MON2", VARIOUS_RETURN_OPPONENT_MON2],
  ["VARIOUS_RESET_PLAYER_FAINTED", VARIOUS_RESET_PLAYER_FAINTED],
  ["VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT", VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT],
]);

function resolveByteLiteral(expression: string): number | null {
  const named = NAMED_BYTE_CONSTANTS.get(expression);
  if (named !== undefined) return named;
  if (!/^(?:0[xX][0-9a-fA-F]+|[0-9]+)$/.test(expression)) return null;
  const value = Number(expression);
  return Number.isSafeInteger(value) ? value : null;
}

function resolveSwitchBattler(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): number | null {
  const selector = context.instruction.operands[0];
  if (!selector || selector.widthBytes !== 1) return null;
  return resolveRulesBattlerForBattleScript(context, selector);
}

/**
 * `Cmd_switchhandleorder` (`battle_script_commands.c:5152-5217`), cases 1/2/3
 * (the forced-switch script emits `switchhandleorder BS_FAINTED, 2`,
 * which falls through into case 3's body; case 3 alone is the same body
 * minus the untracked `RecordedBattle`/`field_93` bookkeeping, so both are
 * handled identically). Voluntary `BattleScript_ActionSwitch` emits case 1:
 * its sole `SwitchPartyOrder` call is presentation/order-only by the same
 * docs/forced-switch-ground-truth.md §5c proof, while the already-selected
 * `monToSwitchIntoId` remains authoritative. Case 0 (multi-battler collection
 * loop) retains the named barrier.
 */
function createSwitchhandleorderOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const [selectorOperand, caseOperand] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 2
      || selectorOperand?.widthBytes !== 1
      || caseOperand?.widthBytes !== 1
    ) {
      throw new Error(
        `invalid B_SCR_OP_SWITCHHANDLEORDER shape at program counter ${context.state.programCounter}`,
      );
    }
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_switchhandleorder: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const caseValue = resolveByteLiteral(caseOperand.expression);
    if (caseValue !== 1 && caseValue !== 2 && caseValue !== 3) {
      return unsupportedBranch(
        context,
        `Cmd_switchhandleorder case ${caseOperand.expression} (multi-battler collection/order-only) is not modeled`,
        5162,
      );
    }
    const rules = context.state.rulesContext;
    const decided = rules.monToSwitchIntoId[battler];
    if (decided === BATTLE_SCRIPT_PARTY_SIZE) {
      throw new Error(
        `Cmd_switchhandleorder: battler ${battler} has no decided monToSwitchIntoId `
          + "-- openpartyscreen must run first",
      );
    }
    if (caseValue === 1) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, battleCommunication0: decided }) },
    );
  };
}

/**
 * `Cmd_getswitchedmondata` (`battle_script_commands.c:4606-4619`): commits
 * `gBattlerPartyIndexes[battler] = monToSwitchIntoId[battler]` (this
 * engine's `battlers[battler].partyIndex`) and issues the controller round
 * trip `switchindataupdate` waits on.
 */
function createGetswitchedmondataOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_getswitchedmondata: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    const decided = rules.monToSwitchIntoId[battler];
    if (decided === BATTLE_SCRIPT_PARTY_SIZE) {
      throw new Error(
        `Cmd_getswitchedmondata: battler ${battler} has no decided monToSwitchIntoId `
          + "-- openpartyscreen must run first",
      );
    }
    const fromPartyIndex = rules.battlers[battler as 0 | 1 | 2 | 3].partyIndex;
    const battlers = rules.battlers.map((candidate, index) =>
      index === battler ? Object.freeze({ ...candidate, partyIndex: decided }) : candidate
    ) as unknown as BattleScriptRulesBattlers;
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler as 0 | 1 | 2 | 3);
    const events = fromPartyIndex === decided
      ? Object.freeze([])
      : Object.freeze([Object.freeze({
        kind: "switch" as const,
        side: rules.battlers[battler as 0 | 1 | 2 | 3].side === 0
          ? "player" as const
          : "opponent" as const,
        fromPartyIndex,
        toPartyIndex: decided,
      })]);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({ ...rules, battlers: Object.freeze(battlers) }),
        scheduler,
        events,
      },
    );
  };
}

/**
 * `Cmd_switchindataupdate` (`battle_script_commands.c:4621-4671`) plus
 * `SwitchInClearSetData` (`battle_main.c:3152-3258`). The ordinary switch
 * branch resets stages/status2/status3; Baton Pass instead preserves stages,
 * masks status2/status3 to the source's transferable bits, and retains the
 * carried Substitute HP.
 * Rebuilds species/hp/status1/types from the party record at the
 * already-updated `partyIndex`; resets stat stages/status2/status3/the
 * modeled DisableStruct-shaped fields to their neutral values (while the
 * existing Baton Pass branch carries both Perish Song timer fields); clears the
 * `STATUS2_INFATUATED_WITH(battler)` bit on every other battler exactly like
 * `cleareffectsonfaint`'s own precedent (`battleScriptHitChainOpcode.ts`).
 * Cross-battler escape-prevention and sure-hit cleanup compare their durable
 * DisableStruct owner identities; Baton Pass carries the incoming identities
 * and refreshes an opposing lock owned by the departing battler.
 * The party item is restored unless this party slot's durable Knock Off bit
 * suppresses it; moves/PP are rebuilt from the same controller payload.
 * The source's final reset clears only this battler's AI move/ability history
 * (not item-effect history or any opposing battler's history), along with its
 * last-move/result cells and the cross-indexed last-taken-move buffers.
 */
function createSwitchindataupdateOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_switchindataupdate: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    const active = rules.battlers[battler as 0 | 1 | 2 | 3];
    const { battlersCount } = rules.battleTopology;
    const isBatonPass =
      rules.currentMoveEffect === BATTLE_SCRIPT_EFFECT_BATON_PASS;

    for (let i = 0; i < battlersCount; i += 1) {
      if (i === battler) continue;
      const other = rules.battlers[i as 0 | 1 | 2 | 3];
      if (
        battlersCount !== 2
        && (other.status2 & BATTLE_SCRIPT_STATUS2_WRAPPED_MASK) !== 0
      ) {
        return unsupportedBranch(
          context,
          `SwitchInClearSetData's STATUS2_WRAPPED cross-battler clear (battler ${i}) needs `
            + "gBattleStruct->wrappedBy identity outside singles",
          3199,
        );
      }
    }

    const side = active.side === 0 ? "player" : "opponent";
    const partyMember = rules.party[side][active.partyIndex];
    const item = (
      rules.knockedOffMons[active.side] & (1 << active.partyIndex)
    ) !== 0
      ? 0
      : partyMember.item;
    const types = resolveSpeciesTypes(partyMember.species);
    if (!types) {
      throw new Error(
        `Cmd_switchindataupdate: species ${partyMember.species} has no gSpeciesInfo types row`,
      );
    }
    const ability = resolveSpeciesAbility(partyMember.species, partyMember.abilityNum);
    if (ability === null) {
      throw new Error(
        `Cmd_switchindataupdate: species ${partyMember.species} ability slot ${partyMember.abilityNum} is unresolved`,
      );
    }

    const infatuationBit = statusInfatuatedWithBit(battler);
    const battlers = rules.battlers.map((candidate, index) => {
      if (index === battler) {
        return Object.freeze({
          ...candidate,
          species: partyMember.species,
          ability,
          ivs: partyMember.ivs,
          isEgg: partyMember.isEgg,
          abilityNum: partyMember.abilityNum as 0 | 1,
          unknown: 0,
          personality: partyMember.personality,
          experience: partyMember.experience,
          transformedMonPersonality: 0,
          hp: partyMember.hp,
          maxHP: partyMember.maxHP,
          attack: partyMember.attack,
          defense: partyMember.defense,
          speed: partyMember.speed,
          spAttack: partyMember.spAttack,
          spDefense: partyMember.spDefense,
          level: partyMember.level,
          friendship: partyMember.friendship,
          status1: partyMember.status1,
          item,
          moves: partyMember.moves,
          pp: partyMember.pp,
          ppBonuses: partyMember.ppBonuses,
          types,
          statStages: isBatonPass ? candidate.statStages : DEFAULT_STAT_STAGES,
          status2: isBatonPass ? (candidate.status2 & BATON_PASS_STATUS2) >>> 0 : 0,
          status3: isBatonPass ? (candidate.status3 & BATON_PASS_STATUS3) >>> 0 : 0,
          substituteHP: isBatonPass ? candidate.substituteHP : 0,
          rolloutTimer: 0,
          furyCutterCounter: 0,
          mimickedMoves: 0,
          stockpileCounter: 0,
          truantCounter: 0 as const,
          rechargeTimer: 0,
          chargeTimer: 0,
          chargeTimerStartValue: 0,
          disabledMove: 0,
          disableTimer: 0,
          disableTimerStartValue: 0,
          encoredMove: 0,
          encoredMovePos: 0,
          encoreTimer: 0,
          encoreTimerStartValue: 0,
          perishSongTimer: isBatonPass ? candidate.perishSongTimer : 0,
          perishSongTimerStartValue: isBatonPass ? candidate.perishSongTimerStartValue : 0,
          usedDisabledMove: 0 as const,
          tauntTimer: 0,
          usedTauntedMove: 0 as const,
          usedImprisonedMove: 0 as const,
          battlerPreventingEscape: isBatonPass ? candidate.battlerPreventingEscape : 0,
          battlerWithSureHit: isBatonPass ? candidate.battlerWithSureHit : 0,
          isFirstTurn: 2,
          notFirstStrike: 0,
          flashFireBoosted: 0,
        });
      }
      const clearsWrapped =
        battlersCount === 2
        && (candidate.status2 & BATTLE_SCRIPT_STATUS2_WRAPPED_MASK) !== 0;
      const clearsEscapePrevention =
        !isBatonPass
        && (candidate.status2 & STATUS2_ESCAPE_PREVENTION) !== 0
        && candidate.battlerPreventingEscape === battler;
      const status2 = (
        candidate.status2
        & ~infatuationBit
        & (clearsWrapped ? ~BATTLE_SCRIPT_STATUS2_WRAPPED_MASK : ~0)
        & (clearsEscapePrevention ? ~STATUS2_ESCAPE_PREVENTION : ~0)
      ) >>> 0;
      const refreshesSureHit =
        isBatonPass
        && candidate.side !== active.side
        && (candidate.status3 & STATUS3_ALWAYS_HITS) !== 0
        && candidate.battlerWithSureHit === battler;
      const clearsSureHit =
        !isBatonPass
        && (candidate.status3 & STATUS3_ALWAYS_HITS) !== 0
        && candidate.battlerWithSureHit === battler;
      const status3 = refreshesSureHit
        ? (
          (candidate.status3 & ~STATUS3_ALWAYS_HITS)
          | STATUS3_ALWAYS_HITS_TURN_2
        ) >>> 0
        : clearsSureHit
          ? (candidate.status3 & ~STATUS3_ALWAYS_HITS) >>> 0
          : candidate.status3;
      return status2 === candidate.status2 && status3 === candidate.status3
        ? candidate
        : Object.freeze({
            ...candidate,
            status2,
            status3,
            ...(clearsEscapePrevention ? { battlerPreventingEscape: 0 as BattleScriptBattlerId } : {}),
            ...(clearsSureHit ? { battlerWithSureHit: 0 as BattleScriptBattlerId } : {}),
          });
    }) as unknown as BattleScriptRulesBattlers;

    let {
      lastMoves, lastLandedMoves, lastHitByType, lastResultingMoves,
      lastPrintedMoves, lastHitBy, lastTakenMove, lastTakenMoveFrom,
    } = rules.moveHistory;
    const replaceBattlerValue = <T>(
      values: readonly T[],
      value: T,
    ): readonly T[] => Object.freeze(
      values.map((candidate, index) => index === battler ? value : candidate),
    );
    lastMoves = replaceBattlerValue(lastMoves, 0) as typeof lastMoves;
    lastLandedMoves = replaceBattlerValue(lastLandedMoves, 0) as typeof lastLandedMoves;
    lastHitByType = replaceBattlerValue(lastHitByType, 0) as typeof lastHitByType;
    lastResultingMoves = replaceBattlerValue(lastResultingMoves, 0) as typeof lastResultingMoves;
    lastPrintedMoves = replaceBattlerValue(lastPrintedMoves, 0) as typeof lastPrintedMoves;
    lastHitBy = replaceBattlerValue(lastHitBy, 0xff) as typeof lastHitBy;

    const nextLastTakenMove = [...lastTakenMove];
    nextLastTakenMove[battler * 2] = 0;
    nextLastTakenMove[battler * 2 + 1] = 0;
    for (let i = 0; i < battlersCount; i += 1) {
      if (i !== battler && rules.battlers[i as BattleScriptBattlerId].side !== active.side) {
        nextLastTakenMove[i * 2] = 0;
        nextLastTakenMove[i * 2 + 1] = 0;
      }
    }

    const nextLastTakenMoveFrom = [...lastTakenMoveFrom];
    for (let sourceBattler = 0; sourceBattler < 4; sourceBattler += 1) {
      nextLastTakenMoveFrom[battler * 8 + sourceBattler * 2] = 0;
      nextLastTakenMoveFrom[battler * 8 + sourceBattler * 2 + 1] = 0;
    }
    for (let destinationBattler = 0; destinationBattler < battlersCount; destinationBattler += 1) {
      nextLastTakenMoveFrom[destinationBattler * 8 + battler * 2] = 0;
      nextLastTakenMoveFrom[destinationBattler * 8 + battler * 2 + 1] = 0;
    }

    const aiObservedAbilityIds = Object.freeze(
      rules.aiObservedAbilityIds.map((abilityId, index) =>
        index === battler ? 0 : abilityId
      ),
    ) as BattleScriptRulesContext["aiObservedAbilityIds"];
    const choicedMove = Object.freeze(
      rules.choicedMove.map((move, index) => index === battler ? 0 : move),
    ) as BattleScriptRulesContext["choicedMove"];
    const nextRules = Object.freeze({
      ...rules,
      battlers: Object.freeze(battlers),
      moveResultFlags: 0,
      currentMove: 0,
      choicedMove,
      aiObservedAbilityIds,
      moveHistory: Object.freeze({
        ...rules.moveHistory,
        lastMoves,
        lastLandedMoves,
        lastHitByType,
        lastResultingMoves,
        lastPrintedMoves,
        lastHitBy,
        lastTakenMove: Object.freeze(nextLastTakenMove),
        lastTakenMoveFrom: Object.freeze(nextLastTakenMoveFrom),
      }),
    }) as BattleScriptRulesContext;

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRules },
    );
  };
}

/**
 * `Cmd_switchinanim` (`battle_script_commands.c:4674-4698`). The Pokédex-seen
 * branch is always skipped for Factory (`BATTLE_TYPE_FRONTIER`, `:4681-4686`);
 * `BATTLE_TYPE_ARENA`'s point-init call is a named barrier (never set for
 * Factory). Clears the switched-in battler's `gAbsentBattlerFlags` bit and
 * issues the controller round trip the script's own `waitstate` absorbs.
 */
function createSwitchinanimOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const operands = context.instruction.operands;
    if (
      operands.length !== 2
      || operands[0]?.widthBytes !== 1
      || operands[1]?.widthBytes !== 1
    ) {
      throw new Error(
        `invalid B_SCR_OP_SWITCHINANIM shape at program counter ${context.state.programCounter}`,
      );
    }
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_switchinanim: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    if ((rules.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_ARENA) !== 0) {
      return unsupportedBranch(
        context,
        "Cmd_switchinanim's BATTLE_TYPE_ARENA BattleArena_InitPoints call is not modeled",
        4696,
      );
    }
    const absentBattlerFlags = (rules.absentBattlerFlags & ~(1 << battler)) >>> 0;
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler as 0 | 1 | 2 | 3);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({ ...rules, absentBattlerFlags }),
        scheduler,
        events: Object.freeze([Object.freeze({
          kind: "switch-in-animation" as const,
          battler: battler as 0 | 1 | 2 | 3,
          partyIndex: rules.battlers[battler as 0 | 1 | 2 | 3].partyIndex,
        })]),
      },
    );
  };
}

/** `Cmd_hpthresholds` (`battle_script_commands.c:6258-6283`): writes only the untracked `gBattleStruct->hpScale`, so this is a pure no-op advance on every reachable path (singles or doubles alike). */
function hpthresholdsOpcodeHandler(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const operand = context.instruction.operands[0];
  if (context.instruction.operands.length !== 1 || operand?.widthBytes !== 1) {
    throw new Error(`invalid B_SCR_OP_HPTHRESHOLDS shape at program counter ${context.state.programCounter}`);
  }
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
}

/** `Cmd_cancelallactions` (`battle_script_commands.c:5850-5858`): writes only the untracked `gActionsByTurnOrder`, no reader anywhere in this engine's modeled scope. */
function cancelallactionsOpcodeHandler(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  if (context.instruction.operands.length !== 0) {
    throw new Error(`invalid B_SCR_OP_CANCELALLACTIONS shape at program counter ${context.state.programCounter}`);
  }
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
}

/**
 * `Cmd_various` cases `VARIOUS_CANCEL_MULTI_TURN_MOVES` (0),
 * `VARIOUS_GET_MOVE_TARGET` (3),
 * `VARIOUS_GET_BATTLER_FAINTED` (4),
 * `VARIOUS_RESET_PLAYER_FAINTED` (7),
 * `VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT` (23), and
 * `VARIOUS_RETURN_OPPONENT_MON1`/`MON2` (19/20, terminal-seam increment (i)
 * LOSS half). GET_MOVE_TARGET's `MOVE_TARGET_SELECTED` branch is
 * source-complete for singles: it repeats `Random() % gBattlersCount` until
 * it finds a present opposing battler. Doubles still use the handler's
 * existing generic barrier because Follow Me and Lightning Rod target
 * redirection require state this context does not own. CANCEL_MULTI_TURN_MOVES
 * is the direct `CancelMultiTurnMoves(gActiveBattler)` call at
 * battle_script_commands.c:6327-6329; the shared helper ports its exact
 * status2/status3/timer clears from battle_util.c:877-888.
 * GET_BATTLER_FAINTED (`:6344-6349`) is the `getbattlerfainted` macro
 * (`asm/macros/battle_script.inc:1273-1275`, expanding to `various \battler,
 * VARIOUS_GET_BATTLER_FAINTED`) -- `BattleScript_PursuitDmgOnSwitchOut`
 * (data/battle_scripts_1.s:3144) calls it right after `tryfaintmon BS_TARGET`
 * and reads the written `gBattleCommunication[0]` from the immediately
 * following `jumpifbyte CMP_EQUAL, gBattleCommunication, FALSE, ...`; it
 * writes TRUE when the active battler's `HITMARKER_FAINTED(battler)` bit is
 * set, FALSE otherwise. VARIOUS_IS_RUNNING_IMPOSSIBLE (2) stays behind the
 * generic barrier (bucket B, Teleport).
 * RETURN_OPPONENT_MON1 (`:6455-6461`) unconditionally targets battler 1 and,
 * if it is still alive (`gBattleMons[1].hp != 0`), emits the return-to-ball
 * controller receipt (recall sprite, hide healthbox --
 * `docs/terminal-seam-loss-path-ground-truth.md` §2's frame 2951-2996
 * recall-sparkle-then-gone observation). RETURN_OPPONENT_MON2 (`:6463-6472`)
 * is the same shape gated on `gBattlersCount > 3` (battler 3) -- always false
 * for Factory L50 singles (2 battlers), confirmed a source no-op rather than
 * inferred from behavior, matching the ground-truth doc's own leftover
 * "needs a source read to confirm" item. Unlike every other case this
 * handler models, RETURN_OPPONENT_MON1/2 genuinely dispatch to the
 * controller when the battler is alive (`MarkBattlerForControllerExec`), so
 * -- alone among this file's `various` cases -- they gate on
 * `isControllerIdle` and mark the scheduler pending, the same idiom
 * `createGetswitchedmondataOpcodeHandler` above already uses; the LOSS
 * script's own immediately-following `waitstate` genuinely blocks on that
 * pending flag until the caller acknowledges it. Every other `id` is that
 * same named barrier.
 */
function createVariousOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [selectorOperand, idOperand] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 2
      || selectorOperand?.widthBytes !== 1
      || idOperand?.widthBytes !== 1
    ) {
      throw new Error(`invalid B_SCR_OP_VARIOUS shape at program counter ${context.state.programCounter}`);
    }
    const id = resolveByteLiteral(idOperand.expression);
    const rules = context.state.rulesContext;
    const getMoveTargetSupported = id === VARIOUS_GET_MOVE_TARGET
      && rules.battleTopology.battlersCount === 2;
    if (
      id !== VARIOUS_SET_MAGIC_COAT_TARGET
      &&
      id !== VARIOUS_CANCEL_MULTI_TURN_MOVES
      && id !== VARIOUS_GET_BATTLER_FAINTED
      && id !== VARIOUS_RESET_PLAYER_FAINTED
      && id !== VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT
      && id !== VARIOUS_RETURN_OPPONENT_MON1
      && id !== VARIOUS_RETURN_OPPONENT_MON2
      && !getMoveTargetSupported
    ) {
      return unsupportedBranch(
        context,
        `Cmd_various case ${idOperand.expression} is not modeled`,
        6326,
      );
    }
    // Both cases hardcode their own target battler in the C switch body,
    // discarding whatever the generic selector above resolved -- see this
    // handler's own header comment and the VARIOUS_RETURN_OPPONENT_MON1/2
    // const declarations. Handled before the generic battler requirement
    // below so a stale/unset BS_ATTACKER role can't spuriously barrier a
    // script position that source itself never reads it at.
    if (id === VARIOUS_RETURN_OPPONENT_MON1 || id === VARIOUS_RETURN_OPPONENT_MON2) {
      if (id === VARIOUS_RETURN_OPPONENT_MON2 && rules.battleTopology.battlersCount <= 3) {
        return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
      }
      const target = (id === VARIOUS_RETURN_OPPONENT_MON1 ? 1 : 3) as BattleScriptBattlerId;
      const alive = rules.battlers[target].hp !== 0;
      if (!alive) {
        return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
      }
      if (!isControllerIdle(context)) return controllerBusyBlock(context);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          scheduler: markBattleScriptControllerPending(context.state.scheduler, target),
          events: Object.freeze([
            Object.freeze({ kind: "set-battler-sprite-visibility", battler: target, invisible: true }),
          ]),
        },
      );
    }
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_various: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    if (id === VARIOUS_GET_BATTLER_FAINTED) {
      const fainted = (rules.hitMarker & (1 << (28 + battler))) !== 0;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({ ...rules, battleCommunication0: fainted ? 1 : 0 }),
        },
      );
    }
    if (id === VARIOUS_GET_MOVE_TARGET) {
      const attackerState = rules.battlers[battler];
      let rng = context.state.rng;
      let target: 0 | 1 | 2 | 3;
      do {
        const draw = drawBattleScriptRng(rng, context.instruction, "GetMoveTarget(MOVE_TARGET_SELECTED)");
        rng = draw.rng;
        target = (draw.randomValue % rules.battleTopology.battlersCount) as 0 | 1 | 2 | 3;
      } while (
        target === battler
        || rules.battlers[target].side === attackerState.side
        || (rules.absentBattlerFlags & (1 << target)) !== 0
      );
      const nextRules = Object.freeze({
        ...rules,
        selectorRoles: Object.freeze({ ...rules.selectorRoles, target }),
      });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: nextRules, rng },
      );
    }

    if (id === VARIOUS_CANCEL_MULTI_TURN_MOVES) {
      const cancelled = cancelBattleScriptMultiTurnMoves(
        rules,
        battler as BattleScriptBattlerId,
      );
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: cancelled.rulesContext },
      );
    }

    if (id === VARIOUS_SET_MAGIC_COAT_TARGET) {
      const currentTarget = rules.selectorRoles.target;
      if (currentTarget === null) {
        throw new Error("Cmd_various VARIOUS_SET_MAGIC_COAT_TARGET requires a target role");
      }
      const attacker = currentTarget;
      const oppositeSide = rules.battlers[attacker].side === 0 ? 1 : 0;
      const sideTimer = rules.sideTimers[oppositeSide];
      const target: BattleScriptBattlerId = sideTimer.followmeTimer !== 0
        && rules.battlers[sideTimer.followmeTarget].hp !== 0
        ? sideTimer.followmeTarget
        : battler as BattleScriptBattlerId;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({
            ...rules,
            selectorRoles: Object.freeze({
              ...rules.selectorRoles,
              attacker,
              target,
            }),
          }),
        },
      );
    }

    if (id === VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT) {
      const alreadyStatusedMoveAttempt = (rules.alreadyStatusedMoveAttempt | (1 << battler)) >>> 0;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: Object.freeze({ ...rules, alreadyStatusedMoveAttempt }) },
      );
    }
    const { battleTypeFlags, battlersCount } = rules.battleTopology;
    const bothAlive = battlersCount > 1
      && rules.battlers[0].hp !== 0
      && rules.battlers[1].hp !== 0;
    const resets = (battleTypeFlags & (BATTLE_TYPE_LINK | BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE)) === 0
      && (battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_TRAINER) !== 0
      && bothAlive;
    if (!resets) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const hitMarker = (rules.hitMarker & ~HITMARKER_PLAYER_FAINTED) >>> 0;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, hitMarker }) },
    );
  };
}

/**
 * `Cmd_switchineffects` (`battle_script_commands.c:5219-5299`). Spikes runs
 * through the source's shared BattleScript_SpikesOn* scripts. The transient
 * SPIKES_DAMAGED bit makes the pushed-cursor re-entry a no-damage pass that
 * clears the guard before normal switch-in hooks. The Truant switch-in hack
 * and grouped `AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN)` dispatch are
 * source-ported here; callbacks return to this opcode before its item/tail
 * seam. `ItemBattleEffects
 * (ITEMEFFECT_ON_SWITCH_IN)` needs no barrier at all -- its only two cases
 * are `HOLD_EFFECT_RESTORE_STATS` (unreachable: stat stages are always reset
 * to the neutral default by `switchindataupdate` just before this opcode
 * runs) and `HOLD_EFFECT_DOUBLE_PRIZE` (writes the untracked, unread
 * `gBattleStruct->moneyMultiplier`).
 */
function createSwitchineffectsOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const operand = context.instruction.operands[0];
    if (context.instruction.operands.length !== 1 || operand?.widthBytes !== 1) {
      throw new Error(`invalid B_SCR_OP_SWITCHINEFFECTS shape at program counter ${context.state.programCounter}`);
    }
    const battler = resolveSwitchBattler(context);
    if (battler === null) {
      throw new Error(
        `Cmd_switchineffects: unresolved battler selector at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    const active = rules.battlers[battler as 0 | 1 | 2 | 3];
    const side = active.side;
    const faintedMask = (1 << (28 + battler)) >>> 0;
    const hitMarkerWithoutFainted = (rules.hitMarker & ~faintedMask) >>> 0;
    const isFlying = active.types.includes("TYPE_FLYING");
    const shouldDamage = (rules.sideStatuses[side] & SIDE_STATUS_SPIKES_DAMAGED) === 0
      && (rules.sideStatuses[side] & SIDE_STATUS_SPIKES) !== 0
      && !isFlying
      && active.ability !== ABILITY_LEVITATE;
    if (shouldDamage) {
      const layers = rules.sideTimers[side].spikesAmount;
      if (layers < 1 || layers > 3) {
        throw new Error(`Cmd_switchineffects requires a source-valid Spikes layer count 1..3, got ${layers}`);
      }
      const scriptName = operand.expression === "BS_TARGET"
        ? "BattleScript_SpikesOnTarget"
        : operand.expression === "BS_ATTACKER"
        ? "BattleScript_SpikesOnAttacker"
        : "BattleScript_SpikesOnFaintedBattler";
      const script = resolveBattleScriptLabel(context.program, scriptName);
      if (!script) throw new Error(`committed Battle Script program has no ${scriptName}`);
      const sideStatuses = [...rules.sideStatuses] as [number, number];
      sideStatuses[side] = (sideStatuses[side] | SIDE_STATUS_SPIKES_DAMAGED) >>> 0;
      const battlers = rules.battlers.map((candidate, index) =>
        index === battler
          ? Object.freeze({ ...candidate, status2: (candidate.status2 & ~STATUS2_DESTINY_BOND) >>> 0 })
          : candidate
      ) as unknown as BattleScriptRulesBattlers;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call-current", programCounter: script.programCounter }),
        {
          rulesContext: Object.freeze({
            ...rules,
            battlers: Object.freeze(battlers),
            scriptingBattler: battler as BattleScriptBattlerId,
            battleMoveDamage: Math.max(1, Math.trunc(active.maxHP / ((5 - layers) * 2))),
            hitMarker: (hitMarkerWithoutFainted & ~HITMARKER_DESTINYBOND) >>> 0,
            sideStatuses: Object.freeze(sideStatuses),
          }),
        },
      );
    }
    let nextRules = rules;
    if (active.ability === ABILITY_TRUANT && active.truantCounter !== 1) {
      const battlers = rules.battlers.map((candidate, index) =>
        index === battler ? Object.freeze({ ...candidate, truantCounter: 1 as const }) : candidate
      ) as unknown as BattleScriptRulesBattlers;
      nextRules = Object.freeze({ ...rules, battlers: Object.freeze(battlers) });
    }
    const nextActive = nextRules.battlers[battler as BattleScriptBattlerId];
    const abilityRules = Object.freeze({
      ...nextRules,
      scriptingBattler: battler as BattleScriptBattlerId,
      lastUsedAbility: nextActive.ability,
    });
    if (nextActive.ability === ABILITY_DRIZZLE && !(nextRules.weather & B_WEATHER_RAIN_PERMANENT)) {
      return callSwitchinScript(
        context,
        "BattleScript_DrizzleActivates",
        recordBattleScriptAbilityReveal(Object.freeze({
          ...abilityRules,
          weather: B_WEATHER_RAIN_TEMPORARY | B_WEATHER_RAIN_PERMANENT,
        }), battler as BattleScriptBattlerId, nextActive.ability),
      );
    }
    if (nextActive.ability === ABILITY_SAND_STREAM && !(nextRules.weather & B_WEATHER_SANDSTORM_PERMANENT)) {
      return callSwitchinScript(
        context,
        "BattleScript_SandstreamActivates",
        recordBattleScriptAbilityReveal(Object.freeze({
          ...abilityRules,
          weather: B_WEATHER_SANDSTORM_TEMPORARY | B_WEATHER_SANDSTORM_PERMANENT,
        }), battler as BattleScriptBattlerId, nextActive.ability),
      );
    }
    if (nextActive.ability === ABILITY_DROUGHT && !(nextRules.weather & B_WEATHER_SUN_PERMANENT)) {
      return callSwitchinScript(
        context,
        "BattleScript_DroughtActivates",
        recordBattleScriptAbilityReveal(Object.freeze({
          ...abilityRules,
          weather: B_WEATHER_SUN_TEMPORARY | B_WEATHER_SUN_PERMANENT,
        }), battler as BattleScriptBattlerId, nextActive.ability),
      );
    }
    if (nextActive.ability === ABILITY_INTIMIDATE && !(nextActive.status3 & STATUS3_INTIMIDATE_POKES)) {
      const battlers = nextRules.battlers.map((candidate, index) =>
        index === battler
          ? Object.freeze({ ...candidate, status3: (candidate.status3 | STATUS3_INTIMIDATE_POKES) >>> 0 })
          : candidate
      ) as unknown as BattleScriptRulesBattlers;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: Object.freeze({ ...nextRules, battlers: Object.freeze(battlers) }) },
      );
    }
    if (nextActive.ability === ABILITY_TRACE && !(nextActive.status3 & STATUS3_TRACE)) {
      const battlers = nextRules.battlers.map((candidate, index) =>
        index === battler
          ? Object.freeze({ ...candidate, status3: (candidate.status3 | STATUS3_TRACE) >>> 0 })
          : candidate
      ) as unknown as BattleScriptRulesBattlers;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: Object.freeze({ ...nextRules, battlers: Object.freeze(battlers) }) },
      );
    }
    if (
      nextActive.ability === ABILITY_FORECAST
      || nextActive.ability === ABILITY_CLOUD_NINE
      || nextActive.ability === ABILITY_AIR_LOCK
    ) {
      const wouldChange = nextActive.ability === ABILITY_FORECAST
        ? computeCastformForm(nextRules, nextActive) !== 0
        : nextRules.battlers
          .slice(0, nextRules.battleTopology.battlersCount)
          .some((candidate) => computeCastformForm(nextRules, candidate) !== 0);
      if (wouldChange) {
        return callSwitchinScript(
          context,
          "BattleScript_WeatherFormChanges",
          recordBattleScriptAbilityReveal(
            abilityRules,
            battler as BattleScriptBattlerId,
            nextActive.ability,
          ),
        );
      }
    }
    const sideStatuses = [...nextRules.sideStatuses] as [number, number];
    sideStatuses[side] = (sideStatuses[side] & ~SIDE_STATUS_SPIKES_DAMAGED) >>> 0;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...nextRules,
          hitMarker: hitMarkerWithoutFainted,
          sideStatuses: Object.freeze(sideStatuses),
        }),
      },
    );
  };
}

/** `Cmd_trygetintimidatetarget` (`battle_script_commands.c:9567-9590`). */
function createTrygetintimidatetargetOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const jump = resolveBattleScriptLabel(context.program, context.instruction.operands[0]!.expression);
    if (!jump) throw new Error("Cmd_trygetintimidatetarget has an unresolved return label");
    const rules = context.state.rulesContext;
    const source = rules.scriptingBattler;
    let target = rules.selectorRoles.target ?? 0;
    while (
      target < rules.battleTopology.battlersCount
      && (
        rules.battlers[target].side === rules.battlers[source].side
        || (rules.absentBattlerFlags & (1 << target)) !== 0
      )
    ) target += 1;
    if (target >= rules.battleTopology.battlersCount) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: jump.programCounter }),
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rules,
          selectorRoles: Object.freeze({ ...rules.selectorRoles, target: target as BattleScriptBattlerId }),
        }),
      },
    );
  };
}

export type BattleScriptSwitchinPorts = Readonly<{
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>;
}>;

export function createBattleScriptSwitchinOpcodeHandlers(
  program: BattleScriptProgram,
  ports: BattleScriptSwitchinPorts,
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
  install("B_SCR_OP_SWITCHHANDLEORDER", createSwitchhandleorderOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_GETSWITCHEDMONDATA", createGetswitchedmondataOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_SWITCHINDATAUPDATE", createSwitchindataupdateOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_SWITCHINANIM", createSwitchinanimOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_HPTHRESHOLDS", hpthresholdsOpcodeHandler);
  install("B_SCR_OP_CANCELALLACTIONS", cancelallactionsOpcodeHandler);
  install("B_SCR_OP_VARIOUS", createVariousOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_SWITCHINEFFECTS", createSwitchineffectsOpcodeHandler());
  install("B_SCR_OP_TRYGETINTIMIDATETARGET", createTrygetintimidatetargetOpcodeHandler());
  return Object.freeze(handlers);
}
