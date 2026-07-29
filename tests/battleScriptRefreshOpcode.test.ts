import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  BATTLE_SCRIPT_STATUS1_BURN,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS1_POISON,
  BATTLE_SCRIPT_STATUS1_REFRESH_CURE_MASK,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
} from "../src/engine/battleScriptSourceConstants.ts";

const REFRESH = 287;
const SLEEP_TALK = 214;
const FACTORY = (1 << 19) | (1 << 3);
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  ({ opcodeName }) =>
    opcodeName === "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? ([REFRESH, 0, 0, 0] as const),
    pp: changes.pp ?? ([20, 0, 0, 0] as const),
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
    statStages: changes.statStages
      ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 113,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 10,
    defense: changes.defense ?? 10,
    spAttack: changes.spAttack ?? 10,
    spDefense: changes.spDefense ?? 10,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(
  attacker: 0 | 1,
  status1: number,
  partyIndex = 2,
) {
  const sourceBattlers = [
    battler({ side: 0, status1: attacker === 0 ? status1 : 0, partyIndex }),
    battler({ side: 1, status1: attacker === 1 ? status1 : 0, partyIndex }),
    battler({ side: 0, hp: 0 }),
    battler({ side: 1, hp: 0 }),
  ];
  const party = {
    player: [{ status1: 0 }, { status1: 0 }, { species: 113, hp: 100, status1: attacker === 0 ? status1 : 0 }, {}, {}, {}],
    opponent: [{ status1: 0 }, { status1: 0 }, { species: 113, hp: 100, status1: attacker === 1 ? status1 : 0 }, {}, {}, {}],
  };
  return createBattleScriptRulesContext({
    battlers: sourceBattlers,
    selectorRoles: {
      attacker,
      target: attacker === 0 ? 1 : 0,
      effectBattler: attacker,
      fainted: null,
    },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: REFRESH,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  } satisfies BattleScriptRulesContextInput);
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
      operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
    resolveByteOperand: () => null,
  });
}

function stepAt(status1: number, attacker: 0 | 1 = 0) {
  const source = rules(attacker, status1);
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectRefresh",
    source,
    0x1234_5678,
    ports(),
  );
  const before = Object.freeze({
    ...execution.state,
    programCounter: instruction.programCounter,
  });
  const result = stepBattleScriptMachine(
    program,
    before,
    execution.handlers,
  );
  if (result.kind !== "advanced") {
    throw new Error(`Refresh opcode stopped at ${result.kind}`);
  }
  return { source, before, after: result.state, handlers: execution.handlers };
}

describe("source-complete B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED registration", () => {
  it("pins the sole five-byte 0xcd instruction and exact Refresh script order", () => {
    expect(program.instructions.filter(
      ({ opcodeName }) =>
        opcodeName === "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xcd,
      dispatcher: "Cmd_cureifburnedparalyzedorpoisoned",
      operands: [
        expect.objectContaining({
          widthBytes: 4,
          expression: "BattleScript_ButItFailed",
        }),
      ],
      source: { label: "BattleScript_EffectRefresh" },
    });
    expect(
      1 + instruction.operands.reduce(
        (sum, operand) => sum + operand.widthBytes,
        0,
      ),
    ).toBe(5);
    const entry = resolveBattleScriptLabel(
      program,
      "BattleScript_EffectRefresh",
    )!;
    expect(program.instructions.slice(
      entry.programCounter,
      entry.programCounter + 10,
    ).map(({ opcodeName }) => opcodeName)).toEqual([
      "B_SCR_OP_ATTACKCANCELER",
      "B_SCR_OP_ATTACKSTRING",
      "B_SCR_OP_PPREDUCE",
      "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED",
      "B_SCR_OP_ATTACKANIMATION",
      "B_SCR_OP_WAITANIMATION",
      "B_SCR_OP_PRINTSTRING",
      "B_SCR_OP_WAITMESSAGE",
      "B_SCR_OP_UPDATESTATUSICON",
      "B_SCR_OP_GOTO",
    ]);
  });

  it.each([
    ["poison", BATTLE_SCRIPT_STATUS1_POISON],
    ["toxic plus counter", BATTLE_SCRIPT_STATUS1_TOXIC_POISON | (5 << 8)],
    ["burn", BATTLE_SCRIPT_STATUS1_BURN],
    ["paralysis", BATTLE_SCRIPT_STATUS1_PARALYSIS],
  ])("clears accepted %s and only the active attacker plus its party slot", (_name, status1) => {
    const { source, before, after } = stepAt(status1);
    expect(BATTLE_SCRIPT_STATUS1_REFRESH_CURE_MASK).toBe(0xd8);
    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext.battlers[0].status1).toBe(0);
    expect(after.rulesContext.party.player[2].status1).toBe(0);
    expect(after.rulesContext.battlers[1]).toBe(source.battlers[1]);
    expect(after.rulesContext.party.opponent).toBe(source.party.opponent);
    expect(after.rulesContext.party.player[0]).toBe(source.party.player[0]);
    expect(after.rulesContext.party.player[1]).toBe(source.party.player[1]);
    expect(after.rulesContext.party.player[3]).toBe(source.party.player[3]);
    expect(after.rng).toBe(before.rng);
    expect(after.events.slice(before.events.length)).toMatchObject([
      { kind: "set-battler-status-data", battler: 0, status1: 0 },
    ]);
  });

  it.each([
    ["healthy", 0],
    ["sleep", BATTLE_SCRIPT_STATUS1_SLEEP],
    ["freeze", BATTLE_SCRIPT_STATUS1_FREEZE],
  ])("%s takes the pointer failure with exact immutability", (_name, status1) => {
    const { source, before, after } = stepAt(status1);
    expect(after.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_ButItFailed")!
        .programCounter,
    );
    expect(after.rulesContext).toBe(source);
    expect(after.scheduler).toBe(before.scheduler);
    expect(after.rng).toBe(before.rng);
    expect(after.events).toBe(before.events);
  });

  it("attacker role owns request, block, and acknowledgement without advancing or rewriting rules", () => {
    const { before, after, handlers } = stepAt(
      BATTLE_SCRIPT_STATUS1_TOXIC_POISON | (3 << 8),
      1,
    );
    expect(after.scheduler).toMatchObject({
      activeBattler: null,
      pendingControllerBattlers: [1],
    });
    expect(after.events.at(-1)).toMatchObject({
      kind: "set-battler-status-data",
      battler: 1,
      status1: 0,
    });

    const blocked = stepBattleScriptMachine(program, after, handlers);
    expect(blocked).toMatchObject({
      kind: "blocked",
      reason: {
        kind: "controller-busy",
        opcodeName: "B_SCR_OP_ATTACKANIMATION",
      },
    });
    expect(blocked.state).toBe(after);

    const acknowledged = acknowledgeBattleScriptMachineController(after, 1);
    expect(acknowledged.programCounter).toBe(after.programCounter);
    expect(acknowledged.rulesContext).toBe(after.rulesContext);
    expect(acknowledged.rng).toBe(before.rng);
    expect(acknowledged.events).toBe(after.events);
    expect(acknowledged.scheduler.pendingControllerBattlers).toEqual([]);
    const resumed = stepBattleScriptMachine(program, acknowledged, handlers);
    expect(resumed.kind).toBe("advanced");
  });
});

describe("accepted Battle Scene OFF Refresh full-turn receipt", () => {
  it("spends PP, clears Toxic active/party status, emits shared controller events, and draws zero Refresh-local RNG", () => {
    let state = createFactoryFullTurnBattleState({
      requestId: 1,
      rngSeed: 786_441_859,
      player: {
        species: 113,
        moveId: REFRESH,
        moves: [REFRESH, 0, 0, 0],
        pp: [19, 0, 0, 0],
        friendship: 0,
        attack: 10,
        defense: 10,
        spAttack: 10,
        spDefense: 10,
        speed: 100,
        hp: 305,
        maxHp: 325,
        status1: BATTLE_SCRIPT_STATUS1_TOXIC_POISON | (1 << 8),
      },
      trainer: {
        species: 373,
        moveId: SLEEP_TALK,
        moves: [SLEEP_TALK, 0, 0, 0],
        pp: [10, 0, 0, 0],
        attack: 10,
        defense: 10,
        spAttack: 10,
        spDefense: 10,
        speed: 10,
        hp: 100,
      },
    });
    const player = submitFactoryFullTurnDecision(state, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    state = player.state;
    const result = submitFactoryFullTurnDecision(state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    expect(result.kind).toBe("decision-required");
    expect(result.state.rng).toMatchObject({
      value: 1_300_148_282,
      calls: 1,
    });
    const rulesContext = result.state.rules.rulesContext;
    expect(rulesContext.battlers[0]).toMatchObject({
      hp: 305,
      status1: 0,
      pp: [18, 0, 0, 0],
    });
    expect(rulesContext.party.player[0].status1).toBe(0);
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        payload: {
          kind: "set-battler-status-data",
          battler: 0,
          status1: 0,
        },
      }),
      expect.objectContaining({
        payload: {
          kind: "status-icon-update",
          battler: 0,
          status1: 0,
          status2: 0,
        },
      }),
    ]));
  });
});
