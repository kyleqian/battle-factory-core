import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";

const TAUNT = 269;
const SPLASH = 150;
const TACKLE = 33;
const FACTORY = (1 << 19) | (1 << 3);
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_SETTAUNT",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? ([TAUNT, 0, 0, 0] as const),
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
    species: changes.species ?? 198,
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
        moves: [SPLASH, SPLASH, SPLASH, SPLASH],
        pp: [40, 40, 40, 40],
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
    currentMove: changes.currentMove ?? TAUNT,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0,
    multiHitCounter: changes.multiHitCounter ?? 0,
    moveHistory: changes.moveHistory ?? {
      lastMoves: [0, SPLASH, 0, 0],
    },
    party: changes.party ?? {
      player: [{ species: 198, hp: 100 }, {}, {}, {}, {}, {}],
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
    "BattleScript_EffectTaunt",
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
    throw new Error(`settaunt stopped at ${result.kind}`);
  }
  return { before, after: result.state };
}

describe("source-complete B_SCR_OP_SETTAUNT registration", () => {
  it("pins the sole five-byte 0xd0 pointer instruction and exact effect-script order", () => {
    expect(program.instructions.filter(
      (candidate) => candidate.opcodeName === "B_SCR_OP_SETTAUNT",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xd0,
      dispatcher: "Cmd_settaunt",
      operands: [
        expect.objectContaining({
          widthBytes: 4,
          expression: "BattleScript_ButItFailed",
        }),
      ],
      source: { label: "BattleScript_EffectTaunt" },
    });
    expect(
      1 + instruction.operands.reduce(
        (sum, operand) => sum + operand.widthBytes,
        0,
      ),
    ).toBe(5);
    const entry = resolveBattleScriptLabel(
      program,
      "BattleScript_EffectTaunt",
    )!;
    expect(program.instructions.slice(
      entry.programCounter,
      entry.programCounter + 10,
    ).map(({ opcodeName }) => opcodeName)).toEqual([
      "B_SCR_OP_ATTACKCANCELER",
      "B_SCR_OP_ATTACKSTRING",
      "B_SCR_OP_PPREDUCE",
      "B_SCR_OP_ACCURACYCHECK",
      "B_SCR_OP_SETTAUNT",
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
    "writes only target %i->%i tauntTimer=2 and falls through with zero local RNG/controller/message work",
    (attacker, target) => {
      const source = rules({
        selectorRoles: {
          attacker,
          target,
          effectBattler: target,
          fainted: null,
        },
        battlers: [
          battler({ side: 0, tauntTimer: 0, status2: 5 }),
          battler({
            side: 1,
            tauntTimer: 0,
            status2: 7,
            moves: [SPLASH, SPLASH, SPLASH, SPLASH],
            pp: [40, 40, 40, 40],
          }),
          battler({ side: 0, hp: 0, tauntTimer: 1 }),
          battler({ side: 1, hp: 0, tauntTimer: 3 }),
        ],
      });
      const { before, after } = stepAt(source);
      expect(after.programCounter).toBe(instruction.programCounter + 1);
      expect(after.rulesContext).toEqual({
        ...source,
        battlers: source.battlers.map((candidate, index) =>
          index === target
            ? { ...candidate, tauntTimer: 2 }
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
      expect(after.scheduler).toBe(before.scheduler);
      expect(Object.isFrozen(after.rulesContext.battlers[target])).toBe(true);
    },
  );

  it.each([
    [0, 1],
    [1, 15],
  ] as const)(
    "nonzero target %i timer=%i jumps to duplicate failure with exact immutability",
    (target, tauntTimer) => {
      const source = rules({
        selectorRoles: {
          attacker: target === 0 ? 1 : 0,
          target,
          effectBattler: target,
          fainted: null,
        },
        battlers: [
          battler({ side: 0, tauntTimer: target === 0 ? tauntTimer : 0 }),
          battler({
            side: 1,
            tauntTimer: target === 1 ? tauntTimer : 0,
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
      expect(after.scheduler).toBe(before.scheduler);
    },
  );

  it("keeps tauntTimer2 intentionally unrepresented because the pinned source never reads it", () => {
    const { after } = stepAt();
    expect(after.rulesContext.battlers[1]).not.toHaveProperty("tauntTimer2");
    expect(after.rulesContext.battlers[1].tauntTimer).toBe(2);
  });
});
