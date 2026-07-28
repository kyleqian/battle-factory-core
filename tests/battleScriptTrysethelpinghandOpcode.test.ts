import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  createBattleScriptRngState,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import movesData from "../src/data/gen/moves.json" with { type: "json" };

const HELPING_HAND = 270;
const TACKLE = 33;
const FACTORY_TRAINER = (1 << 19) | (1 << 3);
const EVIDENCE_ACTION_RNG_SEED = 1_996_693_384;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) =>
    candidate.opcodeName === "B_SCR_OP_TRYSETHELPINGHAND",
)!;
const damagecalc = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_DAMAGECALC",
)!;
const clearEffectsOnFaint = program.instructions.find(
  (candidate) =>
    candidate.opcodeName === "B_SCR_OP_CLEAREFFECTSONFAINT"
    && candidate.operands[0]?.expression === "BS_TARGET",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? ([HELPING_HAND, TACKLE, 0, 0] as const),
    pp: changes.pp ?? ([20, 35, 0, 0] as const),
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
    species: changes.species ?? 311,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    helpingHand: changes.helpingHand,
  });
}

function rules(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0 }),
      battler({ side: 1, species: 242 }),
      battler({ side: 0, species: 311 }),
      battler({ side: 1, species: 242 }),
    ],
    selectorRoles: {
      attacker: 0,
      target: 1,
      effectBattler: 1,
      fainted: null,
    },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: HELPING_HAND,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 4,
      battleTypeFlags:
        FACTORY_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
      battlerPositions: [0, 1, 2, 3],
    },
    ...changes,
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

function stepAt(
  rulesContext: BattleScriptRulesContext,
  at = instruction,
  seed = 0x1234_5678,
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectHelpingHand",
    rulesContext,
    seed,
    ports(),
  );
  const state = Object.freeze({
    ...execution.state,
    programCounter: at.programCounter,
  });
  const result = stepBattleScriptMachine(
    program,
    state,
    execution.handlers,
  );
  if (result.kind !== "advanced") {
    throw new Error(`opcode stopped at ${result.kind}`);
  }
  return { before: state, after: result.state };
}

function withHelpingHand(
  source: BattleScriptRulesContext,
  battlerId: 0 | 1 | 2 | 3,
  value: 0 | 1,
): BattleScriptRulesContext {
  return Object.freeze({
    ...source,
    battlers: Object.freeze(source.battlers.map((candidate, index) =>
      index === battlerId
        ? Object.freeze({ ...candidate, helpingHand: value })
        : candidate
    )) as BattleScriptRulesContext["battlers"],
  });
}

describe("source-complete B_SCR_OP_TRYSETHELPINGHAND registration", () => {
  it("pins the sole 0xd1 instruction, one four-byte failure pointer, and exact effect path", () => {
    expect(program.instructions.filter(
      (candidate) =>
        candidate.opcodeName === "B_SCR_OP_TRYSETHELPINGHAND",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xd1,
      dispatcher: "Cmd_trysethelpinghand",
      operands: [
        expect.objectContaining({
          widthBytes: 4,
          expression: "BattleScript_ButItFailed",
        }),
      ],
      source: { label: "BattleScript_EffectHelpingHand" },
    });
    expect(
      1 + instruction.operands.reduce(
        (sum, operand) => sum + operand.widthBytes,
        0,
      ),
    ).toBe(5);
    const entry = resolveBattleScriptLabel(
      program,
      "BattleScript_EffectHelpingHand",
    )!;
    expect(program.instructions.slice(
      entry.programCounter,
      entry.programCounter + 9,
    ).map(({ opcodeName }) => opcodeName)).toEqual([
      "B_SCR_OP_ATTACKCANCELER",
      "B_SCR_OP_ATTACKSTRING",
      "B_SCR_OP_PPREDUCE",
      "B_SCR_OP_TRYSETHELPINGHAND",
      "B_SCR_OP_ATTACKANIMATION",
      "B_SCR_OP_WAITANIMATION",
      "B_SCR_OP_PRINTSTRING",
      "B_SCR_OP_WAITMESSAGE",
      "B_SCR_OP_GOTO",
    ]);
  });

  it("proves every double guard combination for every attacker and both canonical and noncanonical position maps", () => {
    const failurePc = resolveBattleScriptLabel(
      program,
      "BattleScript_ButItFailed",
    )!.programCounter;
    for (const positions of [
      [0, 1, 2, 3],
      [3, 2, 1, 0],
    ] as const) {
      for (const attacker of [0, 1, 2, 3] as const) {
        const partnerPosition = positions[attacker]! ^ 2;
        const partner = positions.indexOf(
          partnerPosition as 0 | 1 | 2 | 3,
        );
        for (const absent of [false, true]) {
          for (const attackerMarked of [0, 1] as const) {
            for (const partnerMarked of [0, 1] as const) {
              let source = rules({
                selectorRoles: {
                  attacker,
                  target: attacker,
                  effectBattler: attacker,
                  fainted: null,
                },
                absentBattlerFlags: absent ? 1 << partner : 0,
                battleTopology: {
                  battlersCount: 4,
                  battleTypeFlags:
                    FACTORY_TRAINER
                    | BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
                  battlerPositions: positions,
                },
              });
              source = withHelpingHand(
                withHelpingHand(source, attacker, attackerMarked),
                partner as 0 | 1 | 2 | 3,
                partnerMarked,
              );
              const { before, after } = stepAt(source);
              const succeeds = (
                !absent
                && attackerMarked === 0
                && partnerMarked === 0
              );
              expect(
                after.programCounter,
                `${positions}/${attacker}/${absent}/${attackerMarked}/${partnerMarked}`,
              ).toBe(
                succeeds
                  ? instruction.programCounter + 1
                  : failurePc,
              );
              expect(after.rulesContext.selectorRoles.target).toBe(
                partner,
              );
              expect(after.rulesContext.battlers[partner]!.helpingHand)
                .toBe(succeeds ? 1 : partnerMarked);
              expect(after.rng).toBe(before.rng);
              expect(after.events).toBe(before.events);
            }
          }
        }
      }
    }
  });

  it("retargets to the source count sentinel before exact singles failure and otherwise changes nothing", () => {
    const source = rules({
      battleTopology: {
        battlersCount: 2,
        battleTypeFlags: FACTORY_TRAINER,
        battlerPositions: [0, 1, 0xff, 0xff],
      },
      selectorRoles: {
        attacker: 0,
        target: 1,
        effectBattler: 1,
        fainted: null,
      },
    });
    const { before, after } = stepAt(source);
    expect(after.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_ButItFailed")!
        .programCounter,
    );
    expect(after.rulesContext).toEqual({
      ...source,
      selectorRoles: { ...source.selectorRoles, target: 2 },
    });
    expect(after.rulesContext.battlers).toBe(source.battlers);
    expect(after.rng).toBe(before.rng);
    expect(after.events).toBe(before.events);
  });

  it("success writes only the partner bit with exact immutability and zero RNG/event ownership", () => {
    const source = rules({
      selectorRoles: {
        attacker: 3,
        target: 0,
        effectBattler: 1,
        fainted: null,
      },
      battleTopology: {
        battlersCount: 4,
        battleTypeFlags:
          FACTORY_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
        battlerPositions: [3, 0, 1, 2],
      },
    });
    const { before, after } = stepAt(source);
    expect(after.rulesContext).toEqual({
      ...source,
      selectorRoles: { ...source.selectorRoles, target: 1 },
      battlers: source.battlers.map((candidate, index) =>
        index === 1 ? { ...candidate, helpingHand: 1 } : candidate
      ),
    });
    expect(after.rulesContext.battlers[0]).toBe(source.battlers[0]);
    expect(after.rulesContext.battlers[2]).toBe(source.battlers[2]);
    expect(after.rulesContext.battlers[3]).toBe(source.battlers[3]);
    expect(after.rng).toBe(before.rng);
    expect(after.rng).toEqual(createBattleScriptRngState(0x1234_5678));
    expect(after.events).toBe(before.events);
    expect(Object.isFrozen(after.rulesContext)).toBe(true);
    expect(Object.isFrozen(after.rulesContext.selectorRoles)).toBe(true);
    expect(Object.isFrozen(after.rulesContext.battlers[1])).toBe(true);
  });

  it("the existing shared damage consumer applies partner Helping Hand's exact 15/10 multiplier", () => {
    const helper = 0;
    const attacker = 2;
    const target = 1;
    const base = rules({
      currentMove: TACKLE,
      selectorRoles: {
        attacker,
        target,
        effectBattler: target,
        fainted: null,
      },
    });
    expect(base.battlers[helper].side).toBe(base.battlers[attacker].side);
    const control = stepAt(
      withHelpingHand(base, attacker, 0),
      damagecalc,
    ).after.rulesContext.battleMoveDamage;
    const helped = stepAt(
      withHelpingHand(base, attacker, 1),
      damagecalc,
    ).after.rulesContext.battleMoveDamage;
    expect({ control, helped }).toEqual({
      control,
      helped: Math.trunc(control * 15 / 10),
    });
    expect(control).toBeGreaterThan(0);
  });

  it("pins priority +5 ordering data without widening the singles full-turn controller", () => {
    const rows = movesData.moves as Array<{
      id: number;
      move: string;
      priority: number;
    }>;
    expect(rows.find(({ id }) => id === HELPING_HAND)).toMatchObject({
      move: "MOVE_HELPING_HAND",
      priority: 5,
    });
    expect(rows.find(({ id }) => id === TACKLE)).toMatchObject({
      move: "MOVE_TACKLE",
      priority: 0,
    });
  });

  it("generic TurnValuesCleanUp(FALSE) and faint cleanup both clear the bit with zero RNG", () => {
    let source = rules();
    for (const id of [0, 1, 2, 3] as const) {
      source = withHelpingHand(source, id, 1);
    }
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_HandleFaintedMon",
      source,
      0x1234_5678,
      ports(),
    );
    const turn = runBattleEndTurnOrchestration(
      program,
      execution.handlers,
      execution.state,
    );
    expect(turn.kind).toBe("next-turn");
    expect(turn.state.rulesContext.battlers.map(
      ({ helpingHand }) => helpingHand,
    )).toEqual([0, 0, 0, 0]);
    expect(turn.state.rng.calls).toBe(0);

    const faintSource = withHelpingHand(rules({
      selectorRoles: {
        attacker: 0,
        target: 2,
        effectBattler: 2,
        fainted: 2,
      },
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1 }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1 }),
      ],
    }), 2, 1);
    const faint = stepAt(
      faintSource,
      clearEffectsOnFaint,
    );
    expect(faint.after.rulesContext.battlers[2].helpingHand).toBe(0);
    expect(faint.after.rng).toBe(faint.before.rng);
  });

  it("pins the accepted singles action seed: PP spends before failure with no success write/message", () => {
    const initial = createFactoryFullTurnBattleState({
      requestId: 1,
      rngSeed: EVIDENCE_ACTION_RNG_SEED,
      player: {
        species: 311,
        moveId: HELPING_HAND,
        moves: [209, 313, 98, HELPING_HAND],
        pp: [19, 20, 30, 20],
        ability: 31,
        item: 171,
        friendship: 70,
        attack: 95,
        defense: 85,
        spAttack: 110,
        spDefense: 85,
        speed: 105,
        hp: 138,
        types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
      },
      trainer: {
        species: 242,
        moveId: TACKLE,
        moves: [TACKLE, TACKLE, TACKLE, TACKLE],
        pp: [35, 35, 34, 35],
        ability: 30,
        attack: 30,
        defense: 230,
        spAttack: 30,
        spDefense: 230,
        speed: 5,
        hp: 349,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
    });
    const player = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: {
        kind: "use-move",
        moveSlot: 3,
        targetBattler: 0,
      },
    });
    if (player.kind !== "decision-required") {
      throw new Error("expected trainer decision");
    }
    const result = submitFactoryFullTurnDecision(player.state, {
      requestId: 2,
      side: "trainer",
      decision: {
        kind: "use-move",
        moveSlot: 2,
        targetBattler: 0,
      },
    });
    if (result.kind !== "decision-required") {
      throw new Error(`expected next-turn decision, got ${result.kind}`);
    }
    const context = result.state.rules.rulesContext;
    expect(initial.rng).toMatchObject({
      value: EVIDENCE_ACTION_RNG_SEED,
      calls: 0,
    });
    expect(context.battlers[0].pp).toEqual([19, 20, 30, 19]);
    expect(context.battlers[0].helpingHand ?? 0).toBe(0);
    expect(result.events.filter(({ payload }) =>
      payload.kind === "set-battler-pp-data"
    ).slice(0, 2).map(({ payload }) =>
      payload.kind === "set-battler-pp-data"
        ? payload.battler
        : null
    )).toEqual([0, 1]);
    expect(result.events.find(({ payload }) =>
      payload.kind === "set-battler-pp-data"
      && payload.battler === 0
    )?.provenance?.opcodeName).toBe("B_SCR_OP_PPREDUCE");
    expect(result.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_BUTITFAILED"
    )).toBe(true);
    expect(result.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_PKMNREADYTOHELP"
    )).toBe(false);
  });
});
