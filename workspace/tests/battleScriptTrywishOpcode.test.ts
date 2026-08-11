import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const WISH = 273;
const TACKLE = 33;
const FACTORY_TRAINER = (1 << 19) | (1 << 3);
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const program = loadBattleScriptProgram();
const setupInstruction = program.instructions.find(
  (instruction) =>
    instruction.opcodeName === "B_SCR_OP_TRYWISH"
    && instruction.source.label === "BattleScript_EffectWish",
)!;
const healInstruction = program.instructions.find(
  (instruction) =>
    instruction.opcodeName === "B_SCR_OP_TRYWISH"
    && instruction.source.label === "BattleScript_WishComesTrue",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? ([WISH, 0, 0, 0] as const),
    pp: changes.pp ?? ([10, 0, 0, 0] as const),
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
    types: changes.types ?? (["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const),
    species: changes.species ?? 196,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 75,
    defense: changes.defense ?? 80,
    spAttack: changes.spAttack ?? 130,
    spDefense: changes.spDefense ?? 95,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    speed: changes.speed ?? 110,
  });
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, hp: 70, maxHP: 140, partyIndex: 3 }),
      battler({ side: 1, species: 135, moves: [TACKLE, 0, 0, 0], pp: [35, 0, 0, 0] }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: WISH,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: {
      player: [{}, {}, {}, { species: 196, hp: 70, moves: [WISH, 0, 0, 0] }, {}, {}],
      opponent: [{ species: 135, hp: 100, moves: [TACKLE, 0, 0, 0] }, {}, {}, {}, {}, {}],
    },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: FACTORY_TRAINER,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    ...changes,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: ({ state }) => state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_context, operand) => operand.expression.startsWith("STRINGID_")
      ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
      : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: ({ state }) => state.rulesContext.selectorRoles.attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return 64;
      if (operand.expression === "B_WAIT_TIME_SHORT") return 32;
      return null;
    },
    resolveByteOperand: () => null,
  });
}

function executionAt(
  instruction: typeof setupInstruction,
  rulesContext: BattleScriptRulesContext,
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    instruction.source.label,
    rulesContext,
    1,
    ports(),
  );
  return Object.freeze({
    ...execution,
    state: Object.freeze({ ...execution.state, programCounter: instruction.programCounter }),
  });
}

function stepAt(
  instruction: typeof setupInstruction,
  rulesContext: BattleScriptRulesContext,
) {
  const execution = executionAt(instruction, rulesContext);
  const result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`trywish did not advance: ${result.kind}`);
  return result.state;
}

function acknowledgePending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runToTerminal(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, 1, ports());
  let state = execution.state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "halted") {
      if (result.state.haltReason?.kind === "terminal") return result.state;
      throw new Error(`unexpected halt ${JSON.stringify(result.state.haltReason)}`);
    }
    if (result.kind === "unsupported") throw new Error(`unexpected unsupported ${result.instruction.opcodeName}`);
    state = result.kind === "blocked" ? acknowledgePending(result.state) : result.state;
  }
  throw new Error(`${entryLabel} did not terminate`);
}

function messageIds(state: BattleScriptMachineState<BattleScriptRulesContext>): string[] {
  return state.events
    .filter((event) => event.kind === "message")
    .map((event) => event.messageId);
}

describe("B_SCR_OP_TRYWISH", () => {
  it("pins the exact two six-byte 0xd4 encodings", () => {
    const instructions = program.instructions.filter(
      (instruction) => instruction.opcodeName === "B_SCR_OP_TRYWISH",
    );
    expect(instructions).toEqual([setupInstruction, healInstruction]);
    expect(instructions.map((instruction) => ({
      opcodeId: instruction.opcodeId,
      dispatcher: instruction.dispatcher,
      operands: instruction.operands,
      length: 1 + instruction.operands.reduce((sum, operand) => sum + operand.widthBytes, 0),
    }))).toEqual([
      {
        opcodeId: 0xd4,
        dispatcher: "Cmd_trywish",
        operands: [
          expect.objectContaining({ widthBytes: 1, expression: "0" }),
          expect.objectContaining({ widthBytes: 4, expression: "BattleScript_ButItFailed" }),
        ],
        length: 6,
      },
      {
        opcodeId: 0xd4,
        dispatcher: "Cmd_trywish",
        operands: [
          expect.objectContaining({ widthBytes: 1, expression: "1" }),
          expect.objectContaining({ widthBytes: 4, expression: "BattleScript_WishButFullHp" }),
        ],
        length: 6,
      },
    ]);
  });

  it("setup owns the attacker-position counter and original party index, then branches while pending", () => {
    const installed = stepAt(setupInstruction, rules());
    expect(installed.programCounter).toBe(setupInstruction.programCounter + 1);
    expect(installed.rulesContext.wishCounter).toEqual([2, 0, 0, 0]);
    expect(installed.rulesContext.wishMonId).toEqual([3, 0, 0, 0]);

    const pending = stepAt(setupInstruction, rules({
      wishCounter: [1, 0, 0, 0],
      wishMonId: [4, 0, 0, 0],
    }));
    expect(program.instructions[pending.programCounter]!.source.label).toBe("BattleScript_ButItFailed");
    expect(pending.rulesContext.wishCounter).toEqual([1, 0, 0, 0]);
    expect(pending.rulesContext.wishMonId).toEqual([4, 0, 0, 0]);
  });

  it("heal prepares stored identity and negative floor(maxHP/2), including minimum one and full-HP branch", () => {
    const needsHp = stepAt(healInstruction, rules({ wishMonId: [5, 0, 0, 0] }));
    expect(needsHp.programCounter).toBe(healInstruction.programCounter + 1);
    expect(needsHp.rulesContext.battleMoveDamage).toBe(-70);
    expect(needsHp.rulesContext.battleTextBuff1MonNick).toEqual({ battler: 0, partyIndex: 5 });

    const oneHpMax = stepAt(healInstruction, rules({
      battlers: [
        battler({ side: 0, hp: 0, maxHP: 1 }),
        battler({ side: 1 }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    }));
    expect(oneHpMax.rulesContext.battleMoveDamage).toBe(-1);

    const fullHp = stepAt(healInstruction, rules({
      battlers: [
        battler({ side: 0, hp: 140, maxHP: 140 }),
        battler({ side: 1 }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
      wishMonId: [2, 0, 0, 0],
    }));
    expect(program.instructions[fullHp.programCounter]!.source.label).toBe("BattleScript_WishButFullHp");
    expect(fullHp.rulesContext.battleMoveDamage).toBe(-70);
    expect(fullHp.rulesContext.battleTextBuff1MonNick).toEqual({ battler: 0, partyIndex: 2 });
  });

  it("walks genuine setup, pending-failure, heal, and full-HP scripts to their own terminal", () => {
    const setup = runToTerminal("BattleScript_EffectWish", rules());
    expect(setup.rulesContext.wishCounter[0]).toBe(2);
    expect(setup.rulesContext.battlers[0].pp[0]).toBe(9);

    const pending = runToTerminal("BattleScript_EffectWish", rules({ wishCounter: [1, 0, 0, 0] }));
    expect(pending.rulesContext.battlers[0].pp[0]).toBe(9);
    expect(messageIds(pending)).toContain("STRINGID_BUTITFAILED");

    const healed = runToTerminal("BattleScript_WishComesTrue", rules({ wishMonId: [3, 0, 0, 0] }));
    expect(healed.rulesContext.battlers[0].hp).toBe(140);
    expect(healed.rulesContext.party.player[3]!.hp).toBe(140);
    expect(messageIds(healed)).toEqual([
      "STRINGID_PKMNWISHCAMETRUE",
      "STRINGID_PKMNREGAINEDHEALTH",
    ]);

    const full = runToTerminal("BattleScript_WishComesTrue", rules({
      battlers: [
        battler({ side: 0, hp: 140, maxHP: 140 }),
        battler({ side: 1 }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    }));
    expect(full.rulesContext.battlers[0].hp).toBe(140);
    expect(messageIds(full)).toEqual([
      "STRINGID_PKMNWISHCAMETRUE",
      "STRINGID_PKMNHPFULL",
    ]);
  });
});

describe("ENDTURN_WISH", () => {
  it("runs after Safeguard, follows battler turn order, decrements every counter, and suppresses a zeroing fainted slot", () => {
    const rc = rules({
      battlers: [
        battler({ side: 0, hp: 70, maxHP: 140 }),
        battler({ side: 1, hp: 50, maxHP: 100 }),
        battler({ side: 0, hp: 0, maxHP: 80 }),
        battler({ side: 1, hp: 0 }),
      ],
      wishCounter: [1, 1, 1, 0],
      wishMonId: [0, 0, 0, 0],
      battlerByTurnOrder: [1, 0, 2, 3],
      absentBattlerFlags: 0b1100,
      battleStructAbsentBattlerFlags: 0b1100,
      battleTopology: {
        battlersCount: 4,
        battleTypeFlags: FACTORY_TRAINER | 1,
        battlerPositions: [0, 1, 2, 3],
      },
      sideStatuses: [SIDE_STATUS_SAFEGUARD, 0],
      sideTimers: [{ safeguardTimer: 1, safeguardBattlerId: 0 }, {}],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, ports());
    const initial = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_HandleFaintedMon",
      rc,
      1,
      ports(),
    ).state;
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("non-terminal-barrier");
    if (result.kind !== "non-terminal-barrier") throw new Error("expected the later fainted-actions barrier");
    expect(result.instruction.opcodeName).toBe("B_SCR_OP_OPENPARTYSCREEN");
    expect(result.state.rulesContext.wishCounter).toEqual([0, 0, 0, 0]);
    expect(result.state.rulesContext.battlers.map(({ hp }) => hp)).toEqual([140, 100, 0, 0]);
    expect(messageIds(result.state)).toEqual([
      "STRINGID_PKMNSAFEGUARDEXPIRED",
      "STRINGID_PKMNWISHCAMETRUE",
      "STRINGID_PKMNREGAINEDHEALTH",
      "STRINGID_PKMNWISHCAMETRUE",
      "STRINGID_PKMNREGAINEDHEALTH",
    ]);
    const wishTargets = result.state.events
      .filter((event) => event.kind === "health-bar-update")
      .map((event) => event.battler);
    expect(wishTargets).toEqual([1, 0]);
  });
});

describe("Wish through the generic full-turn seam", () => {
  it("matches the OFF proof's two Tackle hits, PP 10→9→8, pending failure, and capped delayed heal", () => {
    let state = createFactoryFullTurnBattleState({
      requestId: 1,
      // The battle-lab seed-1 run consumes trainer-AI draws before damage;
      // the injected-decision seam has no AI draw phase, so seed 0 aligns
      // its first two damage rolls with the OFF proof's 17/17 ledger.
      rngSeed: 0,
      player: {
        species: 196,
        moveId: WISH,
        moves: [94, 44, WISH, 115],
        pp: [10, 25, 10, 20],
        attack: 75,
        defense: 80,
        spAttack: 130,
        spDefense: 95,
        speed: 178,
        hp: 140,
        types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
      },
      trainer: {
        species: 135,
        moveId: TACKLE,
        moves: [TACKLE, TACKLE, TACKLE, TACKLE],
        pp: [35, 35, 35, 35],
        attack: 85,
        defense: 60,
        spAttack: 110,
        spDefense: 95,
        speed: 182,
        hp: 140,
        types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
      },
    });
    const playerWish = { kind: "use-move" as const, moveSlot: 2 as const, targetBattler: 0 as const };
    const trainerTackle = { kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const };

    const t1p = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: playerWish });
    if (t1p.kind !== "decision-required") throw new Error("expected trainer command");
    const t1 = submitFactoryFullTurnDecision(t1p.state, { requestId: 2, side: "trainer", decision: trainerTackle });
    if (t1.kind !== "decision-required") throw new Error("expected turn-two command");
    state = t1.state;
    const rc1 = t1.state.rules.rulesContext;
    expect(rc1.battlers[0].hp).toBe(123);
    expect(rc1.battlers[0].pp[2]).toBe(9);
    expect(rc1.wishCounter[0]).toBe(1);

    const t2p = submitFactoryFullTurnDecision(state, { requestId: 3, side: "player", decision: playerWish });
    if (t2p.kind !== "decision-required") throw new Error("expected trainer command");
    const t2 = submitFactoryFullTurnDecision(t2p.state, { requestId: 4, side: "trainer", decision: trainerTackle });
    if (t2.kind !== "decision-required") throw new Error(`expected turn-three command, got ${t2.kind}`);
    const rc2 = t2.state.rules.rulesContext;
    expect(rc2.battlers[0].pp[2]).toBe(8);
    expect(rc2.wishCounter[0]).toBe(0);
    expect(rc2.battlers[0].hp).toBe(140);
    expect(t2.events.filter(({ payload }) => payload.kind === "hp-change").map(({ payload }) =>
      payload.kind === "hp-change" ? [payload.from, payload.to] : []
    )).toEqual([[123, 107], [107, 140]]);
    expect(t2.events.filter(({ payload }) =>
      payload.kind === "message" && payload.messageId === "STRINGID_BUTITFAILED"
    )).toHaveLength(1);
    expect(t2.events.filter(({ payload }) =>
      payload.kind === "message" && payload.messageId === "STRINGID_PKMNWISHCAMETRUE"
    )).toHaveLength(1);
  });
});
