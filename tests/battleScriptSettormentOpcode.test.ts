import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  checkBattleScriptMoveLimitations,
} from "../src/engine/battleScriptActionAdmission.ts";
import {
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
  BATTLE_SCRIPT_MOVE_LIMITATIONS,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";

const TORMENT = 259;
const TACKLE = 33;
const STRUGGLE = 165;
const FACTORY = (1 << 19) | (1 << 3);
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_SETTORMENT",
)!;
const incrementGameStatInstruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_INCREMENTGAMESTAT",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? ([TORMENT, 0, 0, 0] as const),
    pp: changes.pp ?? ([15, 0, 0, 0] as const),
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
    species: changes.species ?? 109,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(
  changes: Partial<BattleScriptRulesContextInput> = {},
) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [
      battler({ side: 0 }),
      battler({
        side: 1,
        species: 242,
        moves: [TACKLE, TACKLE, TACKLE, TACKLE],
        pp: [35, 35, 35, 35],
      }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: changes.selectorRoles ?? {
      attacker: 0,
      target: 1,
      effectBattler: 1,
      fainted: null,
    },
    scriptingBattler: changes.scriptingBattler ?? 0,
    atkCancelerTracker: changes.atkCancelerTracker ?? 0,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? TORMENT,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0,
    multiHitCounter: changes.multiHitCounter ?? 0,
    moveHistory: changes.moveHistory ?? {
      lastMoves: [0, TACKLE, 0, 0],
    },
    party: changes.party ?? {
      player: [{ species: 109, hp: 100 }, {}, {}, {}, {}, {}],
      opponent: [{ species: 242, hp: 100 }, {}, {}, {}, {}, {}],
    },
    battleTopology: changes.battleTopology ?? {
      battlersCount: 2,
      battleTypeFlags: FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
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

function stepAt(source = rules(), seed = 0x1234_5678) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectTorment",
    source,
    seed,
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
    throw new Error(`settorment stopped at ${result.kind}`);
  }
  return { before, after: result.state };
}

describe("source-complete B_SCR_OP_SETTORMENT registration", () => {
  it("pins the sole five-byte 0xce instruction and exact effect-script order", () => {
    expect(program.instructions.filter(
      (candidate) => candidate.opcodeName === "B_SCR_OP_SETTORMENT",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xce,
      dispatcher: "Cmd_settorment",
      operands: [
        expect.objectContaining({
          widthBytes: 4,
          expression: "BattleScript_ButItFailed",
        }),
      ],
      source: { label: "BattleScript_EffectTorment" },
    });
    expect(
      1 + instruction.operands.reduce(
        (sum, operand) => sum + operand.widthBytes,
        0,
      ),
    ).toBe(5);
    const entry = resolveBattleScriptLabel(
      program,
      "BattleScript_EffectTorment",
    )!;
    expect(program.instructions.slice(
      entry.programCounter,
      entry.programCounter + 10,
    ).map(({ opcodeName }) => opcodeName)).toEqual([
      "B_SCR_OP_ATTACKCANCELER",
      "B_SCR_OP_ATTACKSTRING",
      "B_SCR_OP_PPREDUCE",
      "B_SCR_OP_ACCURACYCHECK",
      "B_SCR_OP_SETTORMENT",
      "B_SCR_OP_ATTACKANIMATION",
      "B_SCR_OP_WAITANIMATION",
      "B_SCR_OP_PRINTSTRING",
      "B_SCR_OP_WAITMESSAGE",
      "B_SCR_OP_GOTO",
    ]);
  });

  it.each([
    [0, 1],
    [1, 0],
  ] as const)(
    "writes only target %i->%i STATUS2_TORMENT with zero local RNG/events",
    (attacker, target) => {
      const source = rules({
        selectorRoles: {
          attacker,
          target,
          effectBattler: target,
          fainted: null,
        },
        battlers: [
          battler({ side: 0, status2: 0x4000_0005 }),
          battler({
            side: 1,
            status2: 0x4000_0005,
            moves: [TACKLE, TACKLE, TACKLE, TACKLE],
            pp: [35, 35, 35, 35],
          }),
          battler({ side: 0, hp: 0, status2: 7 }),
          battler({ side: 1, hp: 0, status2: 9 }),
        ],
      });
      const { before, after } = stepAt(source);
      expect(after.programCounter).toBe(instruction.programCounter + 1);
      expect(after.rulesContext).toEqual({
        ...source,
        battlers: source.battlers.map((candidate, index) =>
          index === target
            ? {
                ...candidate,
                status2: (
                  candidate.status2
                  | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT
                ) >>> 0,
              }
            : candidate
        ),
      });
      for (const id of [0, 1, 2, 3]) {
        if (id !== target) {
          expect(after.rulesContext.battlers[id])
            .toBe(source.battlers[id]);
        }
      }
      expect(after.rng).toBe(before.rng);
      expect(after.events).toBe(before.events);
      expect(Object.isFrozen(after.rulesContext.battlers[target])).toBe(true);
    },
  );

  it.each([0, 1] as const)(
    "already-tormented target %i takes the failure pointer with exact immutability",
    (target) => {
      const source = rules({
        selectorRoles: {
          attacker: target === 0 ? 1 : 0,
          target,
          effectBattler: target,
          fainted: null,
        },
        battlers: [
          battler({
            side: 0,
            status2: target === 0 ? 0x8000_0015 : 0x15,
          }),
          battler({
            side: 1,
            status2: target === 1 ? 0x8000_0015 : 0x15,
            moves: [TACKLE, TACKLE, TACKLE, TACKLE],
            pp: [35, 35, 35, 35],
          }),
          battler({ side: 0, hp: 0 }),
          battler({ side: 1, hp: 0 }),
        ],
      });
      const { before, after } = stepAt(source);
      expect(after.programCounter).toBe(
        resolveBattleScriptLabel(program, "BattleScript_ButItFailed")!
          .programCounter,
      );
      expect(after.rulesContext).toBe(source);
      expect(after.rng).toBe(before.rng);
      expect(after.events).toBe(before.events);
    },
  );
});

describe("CheckMoveLimitations Torment ownership", () => {
  it("marks every duplicate of the battler's last move and composes the caller mask", () => {
    const source = rules({
      battlers: [
        battler({ side: 0 }),
        battler({
          side: 1,
          moves: [TACKLE, 45, TACKLE, 98],
          pp: [35, 40, 34, 30],
          status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT,
        }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
      moveHistory: { lastMoves: [TORMENT, TACKLE, 0, 0] },
    });
    expect(checkBattleScriptMoveLimitations(source, 1)).toBe(0b0101);
    expect(checkBattleScriptMoveLimitations(
      source,
      1,
      0b0010,
      BATTLE_SCRIPT_MOVE_LIMITATIONS.MOVE_LIMITATION_TORMENTED,
    )).toBe(0b0111);
    expect(checkBattleScriptMoveLimitations(
      source,
      1,
      0,
      BATTLE_SCRIPT_MOVE_LIMITATIONS.MOVE_LIMITATION_PP,
    )).toBe(0);
    expect(source.battlers[1].status2).toBe(
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT,
    );
  });
});

describe("Torment through the generic Factory action-admission seam", () => {
  it("removes every repeated-move slot from the next public command request", () => {
    let state = createFactoryFullTurnBattleState({
      requestId: 1,
      rngSeed: 9,
      player: {
        species: 109,
        moveId: TORMENT,
        moves: [124, 108, TORMENT, 114],
        pp: [20, 20, 15, 30],
        ability: 26,
        item: 211,
        friendship: 70,
        attack: 95,
        defense: 120,
        spAttack: 80,
        spDefense: 85,
        speed: 120,
        hp: 147,
        maxHp: 147,
        types: ["TYPE_POISON", "TYPE_POISON"],
      },
      trainer: {
        species: 242,
        moveId: TACKLE,
        moves: [TACKLE, 45, TACKLE, 98],
        pp: [35, 40, 34, 30],
        ability: 30,
        item: 0,
        friendship: 70,
        attack: 30,
        defense: 230,
        spAttack: 30,
        spDefense: 230,
        speed: 5,
        hp: 362,
        maxHp: 362,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
    });
    const player = submitFactoryFullTurnDecision(state, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 2, targetBattler: 1 },
    });
    state = player.state;
    const resolved = submitFactoryFullTurnDecision(state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    state = resolved.state;
    const nextPlayer = submitFactoryFullTurnDecision(state, {
      requestId: 3,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    expect(nextPlayer.kind).toBe("decision-required");
    if (
      nextPlayer.kind !== "decision-required"
      || nextPlayer.nextRequest.kind !== "command"
    ) {
      throw new Error("expected the trainer's next public command request");
    }
    expect(nextPlayer.nextRequest.legalDecisions).toEqual([
      { kind: "use-move", moveSlot: 1, targetBattler: 0 },
      { kind: "use-move", moveSlot: 3, targetBattler: 0 },
    ]);
  });

  it("spends PP before duplicate failure and turns an all-duplicate moveset into Struggle", () => {
    let state = createFactoryFullTurnBattleState({
      requestId: 1,
      rngSeed: 1_996_693_384,
      player: {
        species: 109,
        moveId: TORMENT,
        moves: [124, 108, TORMENT, 114],
        pp: [20, 20, 15, 30],
        ability: 26,
        item: 211,
        friendship: 70,
        attack: 95,
        defense: 120,
        spAttack: 80,
        spDefense: 85,
        speed: 120,
        hp: 147,
        maxHp: 147,
        types: ["TYPE_POISON", "TYPE_POISON"],
      },
      trainer: {
        species: 242,
        moveId: TACKLE,
        moves: [TACKLE, TACKLE, TACKLE, TACKLE],
        pp: [35, 35, 35, 35],
        ability: 30,
        item: 0,
        friendship: 70,
        attack: 30,
        defense: 230,
        spAttack: 30,
        spDefense: 230,
        speed: 5,
        hp: 362,
        maxHp: 362,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
    });

    const submit = (
      side: "player" | "trainer",
      requestId: number,
      moveSlot: 0 | 1 | 2 | 3,
      targetBattler: 0 | 1,
    ) => {
      const result = submitFactoryFullTurnDecision(state, {
        requestId,
        side,
        decision: { kind: "use-move", moveSlot, targetBattler },
      });
      state = result.state;
      return result;
    };

    submit("player", 1, 2, 1);
    const first = submit("trainer", 2, 1, 0);
    expect(first.kind).toBe("decision-required");
    expect(state.rules.rulesContext.battlers[0].pp).toEqual([20, 20, 14, 30]);
    expect(state.rules.rulesContext.battlers[1].pp).toEqual([35, 34, 35, 35]);
    expect(state.rules.rulesContext.battlers[1].status2).toBe(
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT,
    );
    expect(state.rules.rulesContext.moveHistory.lastMoves[1]).toBe(TACKLE);

    const forced = submit("player", 3, 2, 1);
    expect(forced.kind).toBe("decision-required");
    if (
      forced.kind !== "decision-required"
      || forced.nextRequest.kind !== "command"
    ) {
      throw new Error("expected the trainer's forced command");
    }
    expect(forced.nextRequest.legalDecisions).toEqual([
      { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    ]);

    const barrier = submit("trainer", 4, 1, 0);
    expect(barrier).toMatchObject({
      kind: "machine-barrier",
      barrier: {
        entryLabel: incrementGameStatInstruction.source.label,
        programCounter: incrementGameStatInstruction.programCounter,
        opcodeId: 0x60,
        opcodeName: "B_SCR_OP_INCREMENTGAMESTAT",
      },
    });
    expect(state.rules.rulesContext.currentMove).toBe(STRUGGLE);
    expect(state.rules.rulesContext.battlers[0].pp).toEqual([20, 20, 13, 30]);
    expect(state.rules.rulesContext.battlers[1].pp).toEqual([35, 34, 35, 35]);
    expect(state.rules.rulesContext.battlers[1].status2).toBe(
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT,
    );
    expect(state.rules.rulesContext.moveHistory.lastMoves[1]).toBe(TACKLE);
    expect(barrier.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_BUTITFAILED"
    )).toBe(true);
    expect(barrier.events.some(({ payload }) =>
      payload.kind === "set-battler-pp-data"
      && payload.battler === 0
    )).toBe(true);
  });
});
