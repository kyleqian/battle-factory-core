/**
 * ISSUES #102 -- `Cmd_switchhandleorder: battler 1 has no decided
 * monToSwitchIntoId -- openpartyscreen must run first`, staged without the
 * 976k-frame soak prefix that first produced it (`winning` policy, seed 138,
 * battle 5 turn 3).
 *
 * Mechanism (captured live from that repro): the player's active mon is
 * SABLEYE (TYPE_DARK/TYPE_GHOST) and every mon left on the opponent's bench
 * is pure TYPE_NORMAL carrying only Normal-type moves. So:
 *
 *  - `GetMostSuitableMonToSwitchInto` pass 1 (`battle_ai_switch_items.c:690-746`)
 *    scores each bench candidate by how much the *opposing* types would hurt
 *    it; GHOST -> NORMAL is `TYPE_MUL_NO_EFFECT`, so every candidate scores 0,
 *    the `bestDmg < typeDmg` comparison never fires, `bestMonId` stays -1 and
 *    the pass invalidates the whole party.
 *  - Pass 2 (`:748-789`) then looks for the bench mon that deals the most
 *    damage; `TypeCalc` zeroes every Normal move against a GHOST defender, so
 *    `bestDmg` never leaves 0 and the function returns its initial
 *    `bestMonId = PARTY_SIZE`.
 *
 * `PARTY_SIZE` is a real, documented return value of that function, and
 * source resolves it one layer above: `OpponentHandleChoosePokemon`
 * (`src/battle_controller_opponent.c`) is the caller, and when
 * `GetMostSuitableMonToSwitchInto()` hands back `PARTY_SIZE` it falls back to
 * a plain slot-order scan for the first party member with HP left that is not
 * an opposing-side battler's own active slot -- only *then* writing
 * `gBattleStruct->monToSwitchIntoId[battler]`. Without that fallback the port
 * wrote the PARTY_SIZE sentinel itself, and the very next opcode
 * (`switchhandleorder BS_FAINTED, 2`, `data/battle_scripts_1.s`
 * BattleScript_FaintedMonTryChoose) reads it back as "undecided" and throws.
 */
import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleScriptFaintedActionsOrchestration } from "../src/engine/battleScriptFaintedActionsOrchestration.ts";
import { getMostSuitableMonToSwitchInto } from "../src/engine/battleAiSwitchInto.ts";

const program = loadBattleScriptProgram();

/** The exact species/move cast the live seed-138 crash presented. */
const SPECIES_SABLEYE = 322;
const SPECIES_CHIMECHO = 411;
const SPECIES_CHANSEY = 113;
const SPECIES_ZANGOOSE = 380;
const MOVE_FAINT_ATTACK = 185;
const MOVE_POUND = 1;
const MOVE_TACKLE = 33;
const MOVE_HEADBUTT = 29;
const MOVE_SLASH = 163;
/** include/constants/pokemon.h PARTY_SIZE, the monToSwitchIntoId "undecided" sentinel. */
const PARTY_SIZE = 6;
/** include/constants/battle.h:78/... -- what production stages for a Factory battle. */
const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FACTORY = 1 << 19;
const BATTLE_TYPE_FACTORY_TRAINER = BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY;

/** Every bench mon in this scenario carries physical Normal moves only. */
const NORMAL_ONLY_MOVES = Object.freeze([MOVE_POUND, MOVE_TACKLE, MOVE_HEADBUTT, MOVE_SLASH]) as
  readonly [number, number, number, number];

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? NORMAL_ONLY_MOVES,
    pp: changes.pp ?? Object.freeze([35, 35, 35, 35]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    // Real, non-zero stats so pass 2's own `AI_CalcDmg` base damage is
    // genuinely non-zero: the selector must return PARTY_SIZE because of the
    // GHOST immunity, not because the fixture forgot to give anyone an attack.
    attack: changes.attack ?? 110,
    defense: changes.defense ?? 110,
    spAttack: changes.spAttack ?? 110,
    spDefense: changes.spDefense ?? 110,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function slot(species: number, hp: number): BattleScriptPartyMemberInput {
  return { species, isEgg: false, hp, moves: NORMAL_ONLY_MOVES };
}
const EMPTY_SLOT: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };

function party(...members: BattleScriptPartyMemberInput[]): BattleScriptPartyMemberInput[] {
  const slots = [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];
  members.forEach((member, index) => {
    slots[index] = member;
  });
  return slots;
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: (_context, operand) =>
      operand.expression === "B_POSITION_PLAYER_LEFT"
        ? 0
        : operand.expression === "B_POSITION_OPPONENT_LEFT" || operand.expression === "BS_ATTACKER" ? 1 : null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG"
        ? 64
        : operand.expression === "B_WAIT_TIME_SHORT" ? 32 : null,
    resolveByteOperand: () => null,
  });
}

const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts());

/**
 * Seed 138 battle 5 turn 3 exactly: the player's SABLEYE lands FAINT ATTACK,
 * the opponent's active CHIMECHO (party slot 0) faints, and the opponent's two
 * surviving bench mons are both pure-Normal with Normal-only movesets.
 */
function crashContext(changes: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, hp: 144, species: SPECIES_SABLEYE, partyIndex: 0, types: ["TYPE_DARK", "TYPE_GHOST"] }),
      battler({ side: 1, hp: 0, species: SPECIES_CHIMECHO, partyIndex: 0, types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_FAINT_ATTACK,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: {
      player: party(slot(SPECIES_SABLEYE, 144)),
      opponent: party(slot(SPECIES_CHIMECHO, 0), slot(SPECIES_CHANSEY, 311), slot(SPECIES_ZANGOOSE, 166)),
    },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_FACTORY_TRAINER,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    ...changes,
  });
}

function haltedAtOwnEnd(rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    919694434,
    externalPorts(),
  );
  return Object.freeze({
    ...execution.state,
    haltReason: Object.freeze({
      kind: "terminal" as const,
      programCounter: execution.state.programCounter,
      opcodeId: 0,
      opcodeName: "B_SCR_OP_END",
    }),
  });
}

describe("ISSUES #102 -- opponent forced switch when GetMostSuitableMonToSwitchInto returns PARTY_SIZE", () => {
  it(
    "GetMostSuitableMonToSwitchInto really returns PARTY_SIZE for an all-Normal bench facing a GHOST: "
      + "pass 1 scores every candidate 0 (GHOST -> NORMAL is TYPE_MUL_NO_EFFECT) and pass 2's TypeCalc "
      + "zeroes every Normal move, so bestMonId never leaves its initial PARTY_SIZE (battle_ai_switch_items.c:748-789)",
    () => {
      const bench = [
        { species: SPECIES_CHIMECHO, hp: 0, types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"], moves: NORMAL_ONLY_MOVES },
        { species: SPECIES_CHANSEY, hp: 311, types: ["TYPE_NORMAL", "TYPE_NORMAL"], moves: NORMAL_ONLY_MOVES },
        { species: SPECIES_ZANGOOSE, hp: 166, types: ["TYPE_NORMAL", "TYPE_NORMAL"], moves: NORMAL_ONLY_MOVES },
        { species: 0, hp: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], moves: [0, 0, 0, 0] },
        { species: 0, hp: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], moves: [0, 0, 0, 0] },
        { species: 0, hp: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], moves: [0, 0, 0, 0] },
      ] as never;
      const sableyeTypes = ["TYPE_DARK", "TYPE_GHOST"] as const;

      expect(getMostSuitableMonToSwitchInto(bench, 0, sableyeTypes)).toEqual({ kind: "damage-fallback-needed" });
      expect(
        getMostSuitableMonToSwitchInto(bench, 0, sableyeTypes, {
          baseDamage: 84,
          activeTypes: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
          opposingTypes: sableyeTypes,
          opposingAbility: 0,
          opposingStatus2: 0,
        }),
      ).toEqual({ kind: "resolved", partyIndex: PARTY_SIZE });
    },
  );

  it(
    "the opponent's forced switch still completes: OpponentHandleChoosePokemon's own PARTY_SIZE fallback "
      + "picks the first party slot with HP left that is not the fainted battler's active slot, so "
      + "switchhandleorder BS_FAINTED never sees the undecided sentinel",
    () => {
      const initial = haltedAtOwnEnd(crashContext());
      const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);

      expect(result.kind).toBe("resumed");
      if (result.kind !== "resumed") throw new Error("expected resumed");
      // Slot order, not AI scoring: slot 0 is the fainted active slot, slot 1 is the first with HP.
      expect(result.state.rulesContext.monToSwitchIntoId[1]).toBe(1);
      expect(result.state.rulesContext.battlers[1]).toMatchObject({
        species: SPECIES_CHANSEY,
        hp: 311,
        partyIndex: 1,
      });
      expect(result.state.rulesContext.battleOutcome).toBe(0);
      // OpponentHandleChoosePokemon is synchronous and RNG-free (docs/forced-switch-ground-truth.md §2b).
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    },
  );

  it(
    "the fallback is slot-order-first, skipping fainted slots: with the opponent's slot 1 already down, "
      + "the scan continues to slot 2 rather than stopping at the first non-active index",
    () => {
      const initial = haltedAtOwnEnd(crashContext({
        party: {
          player: party(slot(SPECIES_SABLEYE, 144)),
          opponent: party(slot(SPECIES_CHIMECHO, 0), slot(SPECIES_CHANSEY, 0), slot(SPECIES_ZANGOOSE, 166)),
        },
      }));
      const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);

      expect(result.kind).toBe("resumed");
      if (result.kind !== "resumed") throw new Error("expected resumed");
      expect(result.state.rulesContext.monToSwitchIntoId[1]).toBe(2);
      expect(result.state.rulesContext.battlers[1]).toMatchObject({ species: SPECIES_ZANGOOSE, partyIndex: 2 });
    },
  );

  it(
    "a bench that CAN damage the opposing active is untouched by the fallback: the AI selector's own "
      + "pick still wins even when it is not the first surviving slot",
    () => {
      // Same GHOST-walled scenario, except slot 2 carries FAINT ATTACK (DARK),
      // which pass 2's TypeCalc scores above zero against DARK/GHOST while slot
      // 1's Normal moves stay at zero. The selector therefore resolves to 2 on
      // its own -- the slot-order scan (which would answer 1) must not fire.
      const initial = haltedAtOwnEnd(crashContext({
        party: {
          player: party(slot(SPECIES_SABLEYE, 144)),
          opponent: party(
            slot(SPECIES_CHIMECHO, 0),
            slot(SPECIES_CHANSEY, 311),
            { species: SPECIES_ZANGOOSE, isEgg: false, hp: 166, moves: [MOVE_FAINT_ATTACK, 0, 0, 0] },
          ),
        },
      }));
      const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);

      expect(result.kind).toBe("resumed");
      if (result.kind !== "resumed") throw new Error("expected resumed");
      expect(result.state.rulesContext.monToSwitchIntoId[1]).toBe(2);
      expect(result.state.rulesContext.battlers[1]).toMatchObject({ species: SPECIES_ZANGOOSE, partyIndex: 2 });
    },
  );
});
