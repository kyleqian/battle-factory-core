import { describe, expect, it } from "vitest";
import {
  advanceBattleScriptAttackCancelerImprisoned,
} from "../src/engine/battleScriptActionAdmission.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const MOVE_NONE = 0;
const MOVE_TACKLE = 33;
const MOVE_GROWL = 45;
const MOVE_IMPRISON = 286;
const ABILITY_PRESSURE = 46;
const SPECIES_RALTS = 280;
const SPECIES_DUSCLOPS = 356;
const BATTLE_TYPE_DOUBLE = 1 << 0;
const BATTLE_TYPE_FACTORY = 1 << 19;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([MOVE_TACKLE, MOVE_NONE, MOVE_NONE, MOVE_NONE] as const),
    pp: changes.pp ?? ([35, 0, 0, 0] as const),
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
    species: changes.species ?? SPECIES_RALTS,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    attack: changes.attack ?? 60,
    defense: changes.defense ?? 60,
    spAttack: changes.spAttack ?? 90,
    spDefense: changes.spDefense ?? 80,
    speed: changes.speed ?? 70,
    types: changes.types ?? (["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const),
    partyIndex: changes.partyIndex ?? 0,
  });
}

/** Complete constructed Level-50 records; FRONTIER_MON_RALTS is the lower-data Imprison reference. */
function legalMember(
  species: number,
  moves: readonly [number, number, number, number],
  pp: readonly [number, number, number, number],
): BattleScriptPartyMemberInput {
  return Object.freeze({
    species,
    level: 50,
    abilityNum: 0,
    ivs: { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
    personality: 0x1234_5678,
    friendship: 70,
    hp: 100,
    maxHP: 100,
    attack: 60,
    defense: 60,
    speed: 70,
    spAttack: 90,
    spDefense: 80,
    status1: 0,
    item: 0,
    moves,
    pp,
    ppBonuses: 0,
  });
}

function party(
  species: number,
  moves: readonly [number, number, number, number],
  pp: readonly [number, number, number, number],
): readonly BattleScriptPartyMemberInput[] {
  return Object.freeze([
    legalMember(species, moves, pp),
    legalMember(species, [MOVE_TACKLE, MOVE_NONE, MOVE_NONE, MOVE_NONE], [35, 0, 0, 0]),
    legalMember(species, [MOVE_GROWL, MOVE_NONE, MOVE_NONE, MOVE_NONE], [40, 0, 0, 0]),
    {}, {}, {},
  ]);
}

function rules(options: {
  pressure?: 0 | 1 | 2;
  overlap?: boolean;
  alreadySet?: boolean;
} = {}): BattleScriptRulesContext {
  const pressure = options.pressure ?? 0;
  const overlap = options.overlap ?? true;
  const attackerMoves = [MOVE_IMPRISON, MOVE_GROWL, MOVE_NONE, MOVE_NONE] as const;
  const attackerPp = [10, 40, 0, 0] as const;
  const opponentMoves = [
    overlap ? MOVE_GROWL : MOVE_TACKLE,
    MOVE_NONE,
    MOVE_NONE,
    MOVE_NONE,
  ] as const;
  const doubles = pressure === 2;
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        moves: attackerMoves,
        pp: attackerPp,
        status3: options.alreadySet ? BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS : 0,
      }),
      battler({
        side: 1,
        ability: pressure >= 1 ? ABILITY_PRESSURE : 0,
        species: SPECIES_DUSCLOPS,
        moves: opponentMoves,
        pp: [40, 0, 0, 0],
      }),
      battler({ side: 0, partyIndex: 1, hp: doubles ? 100 : 0 }),
      battler({
        side: 1,
        partyIndex: 1,
        hp: doubles ? 100 : 0,
        ability: pressure === 2 ? ABILITY_PRESSURE : 0,
        species: SPECIES_DUSCLOPS,
        moves: opponentMoves,
        pp: [40, 0, 0, 0],
      }),
    ],
    selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_IMPRISON,
    currentMovePosition: 0,
    chosenMove: MOVE_IMPRISON,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: doubles ? 4 : 2,
      battleTypeFlags: BATTLE_TYPE_FACTORY | (doubles ? BATTLE_TYPE_DOUBLE : 0),
      battlerPositions: doubles ? [0, 1, 2, 3] : [0, 1, 0xff, 0xff],
    },
    party: {
      player: party(SPECIES_RALTS, attackerMoves, attackerPp),
      opponent: party(SPECIES_DUSCLOPS, opponentMoves, [40, 0, 0, 0]),
    },
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: ({ state }) => state.scheduler.pendingControllerBattlers.length === 0,
  prepareMessage: (_context, operand) => Object.freeze({
    kind: "message" as const,
    messageId: operand.expression,
    substitutions: Object.freeze([]),
  }),
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => 0 as const,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
  resolveByteOperand: () => null,
});

function acknowledge(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

function run(source: BattleScriptRulesContext, seed = 0xa160_0022) {
  const machine = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectImprison",
    source,
    seed,
    ports,
  );
  let state = machine.state;
  for (let guard = 0; guard < 500; guard += 1) {
    const result = stepBattleScriptMachine(program, state, machine.handlers);
    if (result.kind === "halted") return result.state;
    expect(result.kind).not.toBe("unsupported");
    state = result.kind === "blocked" ? acknowledge(result.state) : result.state;
  }
  throw new Error("BattleScript_EffectImprison did not halt");
}

function ppEvents(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  return state.events.filter((event) => event.kind === "set-battler-pp-data");
}

describe("source-complete B_SCR_OP_TRYIMPRISON", () => {
  it("pins the committed shape and the OFF one-Pressure 10→9→8 receipt with zero draws", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_TRYIMPRISON"))
      .toMatchObject([{
        opcodeId: 0xdb,
        dispatcher: "Cmd_tryimprison",
        operands: [{ expression: "BattleScript_ButItFailed", widthBytes: 4 }],
      }]);
    const state = run(rules({ pressure: 1 }));
    expect(state.rulesContext.battlers[0]).toMatchObject({
      pp: [8, 40, 0, 0],
      status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
    });
    expect(state.rulesContext.party.player[0].pp).toEqual([8, 40, 0, 0]);
    expect(ppEvents(state)).toMatchObject([
      { battler: 0, movePosition: 0, pp: 9 },
      { battler: 0, movePosition: 0, pp: 8 },
    ]);
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("handles zero and multiple opposing Pressure battlers with one special update after the loop", () => {
    const zero = run(rules({ pressure: 0 }));
    expect(zero.rulesContext.battlers[0].pp[0]).toBe(9);
    expect(ppEvents(zero)).toMatchObject([{ pp: 9 }]);

    const multiple = run(rules({ pressure: 2 }));
    expect(multiple.rulesContext.battlers[0].pp[0]).toBe(7);
    expect(multiple.rulesContext.party.player[0].pp[0]).toBe(7);
    expect(ppEvents(multiple)).toMatchObject([{ pp: 9 }, { pp: 7 }]);
    expect(multiple.rng.calls).toBe(0);
  });

  it("applies Pressure before a no-overlap failure, while already-set fails before Pressure", () => {
    const noOverlap = run(rules({ pressure: 1, overlap: false }));
    expect(noOverlap.rulesContext.battlers[0]).toMatchObject({ pp: [8, 40, 0, 0], status3: 0 });
    expect(ppEvents(noOverlap)).toMatchObject([{ pp: 9 }, { pp: 8 }]);

    const alreadySet = run(rules({ pressure: 1, alreadySet: true }));
    expect(alreadySet.rulesContext.battlers[0]).toMatchObject({
      pp: [9, 40, 0, 0],
      status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
    });
    expect(ppEvents(alreadySet)).toMatchObject([{ pp: 9 }]);
  });

  it("feeds the newly-set bit into the existing source-exact action-admission denial", () => {
    const state = run(rules());
    const opponentTurn = Object.freeze({
      ...state.rulesContext,
      selectorRoles: Object.freeze({
        ...state.rulesContext.selectorRoles,
        attacker: 1 as const,
        target: 0 as const,
      }),
      currentMove: MOVE_GROWL,
      atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IMPRISONED,
    });
    const denied = advanceBattleScriptAttackCancelerImprisoned(opponentTurn, 0x1234);
    expect(denied).toMatchObject({
      kind: "advance",
      reason: "imprisoned-move",
      rulesContext: { battlers: { 1: { usedImprisonedMove: 1 } } },
      receipt: { imprisonedMoves: { isImprisoned: true } },
    });
  });
});
