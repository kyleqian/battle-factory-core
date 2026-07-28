import { describe, expect, it } from "vitest";
import {
  parseBattleState,
  serializeBattleState,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_B_MSG_BELL_SOUNDPROOF_ATTACKER,
  BATTLE_SCRIPT_B_MSG_BELL_SOUNDPROOF_PARTNER,
  BATTLE_SCRIPT_B_MSG_SOOTHING_AROMA,
  BATTLE_SCRIPT_MOVE_HEAL_BELL,
  BATTLE_SCRIPT_STATUS2_NIGHTMARE,
  battleScriptPartyMemberHasSoundproof,
} from "../src/engine/battleScriptHealpartystatusOpcode.ts";
import {
  createBattleScriptRngState,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const AROMATHERAPY = 312;
const SLEEP_TALK = 214;
const CHIMECHO = 411;
const EXPLOUD = 372;
const VOLTORB = 100;
const TRAINER_FLAGS = BATTLE_SCRIPT_BATTLE_TYPE_TRAINER
  | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY;
const SEED = 0x3467_8921;

const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_HEALPARTYSTATUS",
)!;

function config(
  changes: Partial<FactoryFullTurnConfig> = {},
): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: SEED,
    player: {
      species: CHIMECHO,
      moveId: BATTLE_SCRIPT_MOVE_HEAL_BELL,
      moves: [BATTLE_SCRIPT_MOVE_HEAL_BELL, 0, 0, 0],
      pp: [5, 0, 0, 0],
      ability: 26,
      friendship: 0,
      attack: 50,
      defense: 50,
      spAttack: 50,
      spDefense: 50,
      speed: 100,
      hp: 100,
    },
    trainer: {
      species: 242,
      moveId: SLEEP_TALK,
      moves: [SLEEP_TALK, 0, 0, 0],
      pp: [10, 0, 0, 0],
      ability: 30,
      attack: 10,
      defense: 200,
      spAttack: 10,
      spDefense: 200,
      speed: 10,
      hp: 300,
    },
    ...changes,
  };
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (context) =>
      context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze([]),
        })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: (context) =>
      context.state.rulesContext.selectorRoles.attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_SHORT" ? 32 : null,
    resolveByteOperand: () => null,
  });
}

function party(
  members: readonly BattleScriptPartyMemberInput[],
): readonly BattleScriptPartyMemberInput[] {
  return [
    ...members,
    ...Array.from(
      { length: 6 - members.length },
      () => ({ species: 0, isEgg: false, hp: 0 }),
    ),
  ];
}

function directRules(
  move: number,
  playerParty: readonly BattleScriptPartyMemberInput[],
  changes: Readonly<{
    attackerAbility?: number;
    attackerStatus1?: number;
    attackerStatus2?: number;
  }> = {},
): BattleScriptRulesContext {
  const base = createFactoryFullTurnBattleState(config()).rules.rulesContext;
  const battlers = base.battlers.map((battler, index) =>
    index === 0
      ? {
        ...battler,
        ability: changes.attackerAbility ?? battler.ability,
        status1: changes.attackerStatus1 ?? battler.status1,
        status2: changes.attackerStatus2 ?? battler.status2,
      }
      : battler
  );
  return createBattleScriptRulesContext({
    ...base,
    battlers,
    selectorRoles: {
      attacker: 0,
      target: 1,
      effectBattler: 1,
      fainted: null,
    },
    currentMove: move,
    chosenMove: move,
    party: {
      player: playerParty,
      opponent: base.party.opponent,
    },
  });
}

function stepOpcode(source: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectHealBell",
    source,
    SEED,
    ports(),
  );
  const before = Object.freeze({
    ...execution.state,
    programCounter: instruction.programCounter,
  });
  const result = stepBattleScriptMachine(program, before, execution.handlers);
  if (result.kind !== "advanced") {
    throw new Error(`healpartystatus stopped at ${result.kind}`);
  }
  return { before, after: result.state };
}

function submitTurn(initial = createFactoryFullTurnBattleState(config())) {
  const player = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  if (player.kind !== "decision-required") {
    throw new Error(`expected trainer decision, got ${player.kind}`);
  }
  const result = submitFactoryFullTurnDecision(player.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  if (result.kind === "machine-barrier") {
    throw new Error(`unexpected full-turn barrier: ${JSON.stringify(result.state.boundary)}`);
  }
  return result;
}

describe("source-complete B_SCR_OP_HEALPARTYSTATUS registration", () => {
  it("pins the one-byte 0xae instruction and exact committed effect-script order", () => {
    expect(program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_HEALPARTYSTATUS",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xae,
      dispatcher: "Cmd_healpartystatus",
      operands: [],
      source: { label: "BattleScript_EffectHealBell" },
    });
    const entry = resolveBattleScriptLabel(
      program,
      "BattleScript_EffectHealBell",
    )!;
    expect(program.instructions.slice(
      entry.programCounter,
      entry.programCounter + 10,
    ).map(({ opcodeName }) => opcodeName)).toEqual([
      "B_SCR_OP_ATTACKCANCELER",
      "B_SCR_OP_ATTACKSTRING",
      "B_SCR_OP_PPREDUCE",
      "B_SCR_OP_HEALPARTYSTATUS",
      "B_SCR_OP_WAITSTATE",
      "B_SCR_OP_ATTACKANIMATION",
      "B_SCR_OP_WAITANIMATION",
      "B_SCR_OP_PRINTFROMTABLE",
      "B_SCR_OP_WAITMESSAGE",
      "B_SCR_OP_JUMPIFHALFWORD",
    ]);
    expect(instruction.programCounter + 1).toBe(
      program.instructions[instruction.programCounter + 1]!.programCounter,
    );
  });

  it("validates and freezes the source ability-number cell on persistent party records", () => {
    const rules = directRules(BATTLE_SCRIPT_MOVE_HEAL_BELL, party([
      { species: CHIMECHO, hp: 100, abilityNum: 1 },
    ]));
    expect(rules.party.player[0].abilityNum).toBe(1);
    expect(Object.isFrozen(rules.party.player[0])).toBe(true);
    expect(() => directRules(BATTLE_SCRIPT_MOVE_HEAL_BELL, party([
      { species: CHIMECHO, hp: 100, abilityNum: 2 },
    ]))).toThrow(/abilityNum must be an unsigned integer <= 1/);
  });

  it("healthy use still emits one zero-status party-mask write and consumes no RNG", () => {
    const source = directRules(BATTLE_SCRIPT_MOVE_HEAL_BELL, party([
      { species: CHIMECHO, hp: 100, status1: 0 },
      { species: CHIMECHO, hp: 100, status1: 0 },
      { species: CHIMECHO, hp: 100, status1: 0 },
    ]));
    const { before, after } = stepOpcode(source);
    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext.party).toBe(source.party);
    expect(after.events.slice(before.events.length)).toMatchObject([
      {
        kind: "set-party-status-data",
        battler: 0,
        partyMask: 0b000111,
        status1: 0,
      },
    ]);
    expect(after.scheduler.pendingControllerBattlers).toEqual([0]);
    expect(after.rng).toBe(before.rng);
    expect(after.rng).toEqual(createBattleScriptRngState(SEED));
  });

  it("heals all six selected persistent records through the single masked controller event", () => {
    const source = directRules(BATTLE_SCRIPT_MOVE_HEAL_BELL, party(
      Array.from({ length: 6 }, (_, index) => ({
        species: CHIMECHO,
        hp: 100,
        status1: 1 << index,
      })),
    ), {
      attackerStatus1: 0x180,
      attackerStatus2: BATTLE_SCRIPT_STATUS2_NIGHTMARE | 0x20,
    });
    const { before, after } = stepOpcode(source);
    expect(after.rulesContext.battlers[0]).toMatchObject({
      status1: 0,
      status2: 0x20,
    });
    expect(after.rulesContext.party.player.map(({ status1 }) => status1))
      .toEqual([0, 0, 0, 0, 0, 0]);
    expect(after.events.slice(before.events.length)).toMatchObject([
      { kind: "set-party-status-data", partyMask: 0b111111, status1: 0 },
    ]);
    expect(after.rng).toBe(before.rng);
  });

  it("derives benched Soundproof from species plus abilityNum, while Aromatherapy selects all six bits", () => {
    const mixedParty = party([
      { species: CHIMECHO, hp: 100, status1: 1 },
      { species: EXPLOUD, hp: 100, abilityNum: 0, status1: 2 },
      { species: VOLTORB, hp: 100, abilityNum: 1, status1: 4 },
      { species: CHIMECHO, isEgg: true, hp: 100, status1: 8 },
      { species: 0, hp: 0, status1: 16 },
      { species: CHIMECHO, hp: 100, status1: 32 },
    ]);
    const bell = stepOpcode(
      directRules(BATTLE_SCRIPT_MOVE_HEAL_BELL, mixedParty),
    ).after;
    expect(bell.events.at(-1)).toMatchObject({
      kind: "set-party-status-data",
      partyMask: 0b100101,
    });
    expect(bell.rulesContext.party.player.map(({ status1 }) => status1))
      .toEqual([0, 2, 0, 8, 16, 0]);

    const aroma = stepOpcode(
      directRules(AROMATHERAPY, mixedParty),
    ).after;
    expect(aroma.rulesContext.multistringChooser)
      .toBe(BATTLE_SCRIPT_B_MSG_SOOTHING_AROMA);
    expect(aroma.events.at(-1)).toMatchObject({
      kind: "set-party-status-data",
      partyMask: 0b111111,
    });
    expect(aroma.rulesContext.party.player.map(({ status1 }) => status1))
      .toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("preserves a Soundproof attacker's live status/Nightmare, records the ability, and selects the attacker message bit", () => {
    const source = directRules(BATTLE_SCRIPT_MOVE_HEAL_BELL, party([
      { species: EXPLOUD, hp: 100, abilityNum: 1, status1: 0x80 },
      { species: CHIMECHO, hp: 100, status1: 0x40 },
    ]), {
      attackerAbility: BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
      attackerStatus1: 0x80,
      attackerStatus2: BATTLE_SCRIPT_STATUS2_NIGHTMARE | 0x20,
    });
    const { after } = stepOpcode(source);
    expect(after.rulesContext.battlers[0]).toMatchObject({
      status1: 0x80,
      status2: BATTLE_SCRIPT_STATUS2_NIGHTMARE | 0x20,
    });
    expect(after.rulesContext.party.player.map(({ status1 }) => status1))
      .toEqual([0x80, 0, 0, 0, 0, 0]);
    expect(after.rulesContext.multistringChooser)
      .toBe(BATTLE_SCRIPT_B_MSG_BELL_SOUNDPROOF_ATTACKER);
    expect(after.rulesContext.lastUsedAbility)
      .toBe(BATTLE_SCRIPT_ABILITY_SOUNDPROOF);
    expect(after.events.at(-1)).toMatchObject({ partyMask: 0b000010 });
  });

  it("evaluates the doubles partner branch structurally and ORs the partner Soundproof selector", () => {
    const singles = directRules(BATTLE_SCRIPT_MOVE_HEAL_BELL, party([
      { species: CHIMECHO, hp: 100 },
      { species: EXPLOUD, hp: 100, status1: 0x40 },
    ]));
    const battlers = singles.battlers.map((battler, index) =>
      index === 2
        ? {
          ...battler,
          side: 0 as const,
          hp: 100,
          ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
          partyIndex: 1,
          status1: 0x40,
          status2: BATTLE_SCRIPT_STATUS2_NIGHTMARE,
        }
        : battler
    );
    const doubles = createBattleScriptRulesContext({
      ...singles,
      battlers,
      battleTopology: {
        battlersCount: 4,
        battleTypeFlags: TRAINER_FLAGS | BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
        battlerPositions: [0, 1, 2, 3],
      },
    });
    const { after } = stepOpcode(doubles);
    expect(after.rulesContext.battlers[0].status1).toBe(0);
    expect(after.rulesContext.battlers[2].status1).toBe(0x40);
    expect(after.rulesContext.battlers[2].status2)
      .toBe(BATTLE_SCRIPT_STATUS2_NIGHTMARE);
    expect(after.rulesContext.scriptingBattler).toBe(2);
    expect(after.rulesContext.multistringChooser)
      .toBe(BATTLE_SCRIPT_B_MSG_BELL_SOUNDPROOF_PARTNER);
    expect(after.rulesContext.lastUsedAbility)
      .toBe(BATTLE_SCRIPT_ABILITY_SOUNDPROOF);
  });

  it("recognizes real source Soundproof carriers without a move-specific species list", () => {
    const source = directRules(BATTLE_SCRIPT_MOVE_HEAL_BELL, party([
      { species: EXPLOUD, abilityNum: 0, hp: 100 },
      { species: VOLTORB, abilityNum: 1, hp: 100 },
    ]));
    expect(battleScriptPartyMemberHasSoundproof(source.party.player[0]))
      .toBe(true);
    expect(battleScriptPartyMemberHasSoundproof(source.party.player[1]))
      .toBe(false);
  });
});

describe("EFFECT_HEAL_BELL committed-script full-turn integration", () => {
  it("executes healthy Heal Bell from attackcanceler through move end, spends PP 5→4, and reaches the next request", () => {
    const result = submitTurn();
    expect(result.kind).toBe("decision-required");
    const rules = result.state.rules.rulesContext;
    expect(rules.battlers[0].pp[0]).toBe(4);
    expect(rules.party.player[0].status1).toBe(0);
    expect(result.state.rng).toMatchObject({ value: SEED, calls: 0 });
    expect(result.events.map(({ payload }) => payload.kind))
      .toEqual(expect.arrayContaining([
        "set-battler-pp-data",
        "set-party-status-data",
        "animation",
        "message",
        "status-icon-update",
      ]));
    expect(result.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_BELLCHIMED"
    )).toBe(true);
  });

  it("synchronizes active plus persistent party statuses to zero and canonically replays both submissions", () => {
    const initial = createFactoryFullTurnBattleState(config({
      player: {
        ...config().player,
        status1: 0x180,
        status2: BATTLE_SCRIPT_STATUS2_NIGHTMARE,
      },
      playerBenchHp: [100, 100],
      playerBenchOverride: [
        { species: CHIMECHO, status1: 0x40 },
        { species: CHIMECHO, status1: 0x20 },
      ],
    }));
    const result = submitTurn(initial);
    expect(result.kind).toBe("decision-required");
    expect(result.state.rules.rulesContext.battlers[0].status1).toBe(0);
    expect(
      result.state.rules.rulesContext.party.player
        .slice(0, 3)
        .map(({ status1 }) => status1),
    ).toEqual([0, 0, 0]);
    expect(result.events.filter(
      ({ payload }) => payload.kind === "set-party-status-data",
    )).toHaveLength(1);

    const restored = parseBattleState(
      serializeBattleState(initial),
    ) as BattleState<FactoryFullTurnDecisionRules>;
    const replay = submitTurn(restored);
    expect(serializeBattleState(replay.state))
      .toBe(serializeBattleState(result.state));
    expect(replay.events).toEqual(result.events);
  });
});
