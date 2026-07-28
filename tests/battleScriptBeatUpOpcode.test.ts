import { describe, expect, it } from "vitest";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { calculateBeatUpMemberDamage } from "../src/engine/battleScriptBeatUpOpcode.ts";

const BEAT_UP = 251;
const SNEASEL = 215;
const CROBAT = 169;
const ONIX = 95;
const ABRA = 64;
const BULBASAUR = 1;
const program = loadBattleScriptProgram();
const beatUpInstruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYDOBEATUP",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 39,
    hp: changes.hp ?? 160,
    maxHP: changes.maxHP ?? changes.hp ?? 160,
    moves: changes.moves ?? ([BEAT_UP, 33, 33, 33] as const),
    pp: changes.pp ?? ([10, 35, 35, 35] as const),
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
    types: changes.types ?? (["TYPE_DARK", "TYPE_ICE"] as const),
    species: changes.species ?? SNEASEL,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 115,
    defense: changes.defense ?? 75,
    spAttack: changes.spAttack ?? 55,
    spDefense: changes.spDefense ?? 95,
    speed: changes.speed ?? 120,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    helpingHand: changes.helpingHand ?? 0,
  });
}

/** Complete constructed Level-50 party records; no Factory-set carrier is invented. */
function member(
  species: number,
  changes: Partial<BattleScriptPartyMemberInput> = {},
): BattleScriptPartyMemberInput {
  return Object.freeze({
    species,
    isEgg: changes.isEgg ?? false,
    abilityNum: changes.abilityNum ?? 0,
    ivs: changes.ivs ?? { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
    personality: changes.personality ?? species,
    level: 50,
    friendship: changes.friendship ?? 70,
    maxHP: changes.maxHP ?? 100,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    speed: changes.speed ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    hp: changes.hp ?? 100,
    status1: changes.status1 ?? 0,
    item: changes.item ?? 0,
    moves: changes.moves ?? ([33, 33, 33, 33] as const),
    pp: changes.pp ?? ([35, 35, 35, 35] as const),
    ppBonuses: changes.ppBonuses ?? 0,
  });
}

const empty = () => member(0, { hp: 0 });

function rules(
  player: readonly BattleScriptPartyMemberInput[],
  changes: Partial<BattleScriptRulesContextInput> = {},
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, ...attackerChanges }),
      battler({
        side: 1,
        species: CROBAT,
        types: ["TYPE_POISON", "TYPE_FLYING"],
        defense: 100,
        ...targetChanges,
      }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: BEAT_UP,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    chosenMove: BEAT_UP,
    party: { player },
    ...changes,
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (_context, operand) => Object.freeze({
    kind: "message" as const,
    messageId: operand.expression,
    substitutions: Object.freeze([]),
  }),
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) => {
    if (operand.expression.startsWith("B_WAIT_TIME_")) return 1;
    const value = Number(operand.expression);
    return Number.isSafeInteger(value) ? value : null;
  },
  resolveByteOperand: () => null,
});

function execution(source: BattleScriptRulesContext, seed = 1) {
  return createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectBeatUp",
    source,
    seed,
    ports,
  );
}

function acknowledge(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function stepHandler(source: BattleScriptRulesContext) {
  const setup = execution(source);
  return stepBattleScriptMachine(
    program,
    Object.freeze({ ...setup.state, programCounter: beatUpInstruction.programCounter }),
    setup.handlers,
  );
}

function scanParty(source: BattleScriptRulesContext) {
  const hits: Array<{ index: number; damage: number }> = [];
  let current = source;
  for (let calls = 0; calls < 7; calls += 1) {
    const result = stepHandler(current);
    if (result.kind !== "advanced") throw new Error(`Beat Up handler: ${result.kind}`);
    current = result.state.rulesContext;
    if (result.state.programCounter !== beatUpInstruction.programCounter + 1) {
      return { hits, state: result.state };
    }
    hits.push({
      index: current.battleTextBuff1MonNick!.partyIndex,
      damage: current.battleMoveDamage,
    });
  }
  throw new Error("Beat Up scan did not terminate");
}

describe("source-complete B_SCR_OP_TRYDOBEATUP / EFFECT_BEAT_UP", () => {
  it("pins the exact two-pointer instruction shell", () => {
    expect(beatUpInstruction).toMatchObject({
      opcodeId: 0xc4,
      dispatcher: "Cmd_trydobeatup",
      operands: [
        { widthBytes: 4, expression: "BattleScript_BeatUpEnd" },
        { widthBytes: 4, expression: "BattleScript_ButItFailed" },
      ],
      source: { label: "BattleScript_BeatUpLoop", statementLine: 1949 },
    });
  });

  it("filters empty, Egg, statused, and fainted slots without excluding the healthy active attacker", () => {
    const result = scanParty(rules([
      member(SNEASEL),
      empty(),
      member(BULBASAUR, { isEgg: true }),
      member(ONIX, { status1: 0x80 }),
      member(ABRA, { hp: 0 }),
      empty(),
    ]));
    expect(result.hits).toEqual([
      { index: 0, damage: calculateBeatUpMemberDamage(SNEASEL, CROBAT, 10, false) },
    ]);
    expect(result.state.rulesContext.battleCommunication0).toBe(6);
    expect(result.state.rng.calls).toBe(0);
  });

  it("runs exact one-member and three-member scans with slot-specific formula, nickname, and Helping Hand ordering", () => {
    const one = scanParty(rules([
      empty(), member(ONIX), empty(), empty(), empty(), empty(),
    ], {}, { helpingHand: 1 }));
    expect(one.hits).toEqual([
      { index: 1, damage: 6 },
    ]);

    const three = scanParty(rules([
      member(SNEASEL), member(ONIX), member(ABRA), empty(), empty(), empty(),
    ]));
    expect(three.hits).toEqual([
      { index: 0, damage: 7 },
      { index: 1, damage: 4 },
      { index: 2, damage: 3 },
    ]);
  });

  it("chooses initial failure only from index zero; exhaustion after progress and an already-faint target choose the end pointer", () => {
    const failurePc = resolveBattleScriptLabel(program, "BattleScript_ButItFailed")!.programCounter;
    const endPc = resolveBattleScriptLabel(program, "BattleScript_BeatUpEnd")!.programCounter;
    const invalid = [empty(), member(ONIX, { status1: 1 }), empty(), empty(), empty(), empty()];

    const zero = stepHandler(rules(invalid));
    expect(zero.state.programCounter).toBe(failurePc);
    expect(zero.state.rulesContext.battleCommunication0).toBe(6);
    expect(zero.state.rng.calls).toBe(0);

    const resumed = stepHandler(rules(invalid, { battleCommunication0: 1 }));
    expect(resumed.state.programCounter).toBe(endPc);
    expect(resumed.state.rulesContext.battleCommunication0).toBe(6);

    const faintedTarget = stepHandler(rules(
      [member(SNEASEL), empty(), empty(), empty(), empty(), empty()],
      { battleCommunication0: 0 },
      {},
      { hp: 0, maxHP: 160 },
    ));
    expect(faintedTarget.state.programCounter).toBe(endPc);
    expect(faintedTarget.state.rulesContext.battleCommunication0).toBe(0);
  });

  it("reproduces the OFF receipt: statused slot 0 gives 0→2→3→6 and exactly accuracy + two crit/variance pairs", () => {
    const source = rules([
      member(SNEASEL, { status1: 0x80 }),
      member(ONIX),
      member(ABRA),
      empty(),
      empty(),
      empty(),
    ]);
    let state = execution(source, 2_989_935_341).state;
    const progression: Array<readonly [number, number]> = [];
    for (let steps = 0; steps < 1000; steps += 1) {
      const before = state;
      const result = stepBattleScriptMachine(program, acknowledge(state), execution(source).handlers);
      if (result.kind === "halted") {
        state = result.state;
        break;
      }
      state = result.state;
      if (before.programCounter === beatUpInstruction.programCounter) {
        progression.push([before.rulesContext.battleCommunication0, state.rulesContext.battleCommunication0]);
      }
    }
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(progression).toEqual([[0, 2], [2, 3], [3, 6]]);
    expect(state.rulesContext.battlers[1].hp).toBe(154);
    expect(state.rng.ledger.map(({ reason, randomValue }) => [reason, randomValue])).toEqual([
      ["accuracycheck", 45942],
      ["critcalc", 64516],
      ["adjustnormaldamage", 9709],
      ["critcalc", 19853],
      ["adjustnormaldamage", 40048],
    ]);
    expect(state.rng.calls).toBe(5);
  });
});
