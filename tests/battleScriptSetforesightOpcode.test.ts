import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import { BATTLE_SCRIPT_STATUS2_FORESIGHT } from "../src/engine/battleScriptSourceConstants.ts";

const FORESIGHT = 193;
const SPLASH = 150;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_SETFORESIGHT",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0, ability: changes.ability ?? 0,
    hp: changes.hp ?? 100, maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([FORESIGHT, 0, 0, 0] as const),
    pp: changes.pp ?? ([40, 0, 0, 0] as const),
    status1: changes.status1 ?? 0, status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0, substituteHP: changes.substituteHP ?? 0,
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
    statStages: changes.statStages ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 67, personality: changes.personality ?? 1,
    attack: changes.attack ?? 100, defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100, spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100, level: changes.level ?? 50,
    friendship: changes.friendship ?? 70, partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(target: 0 | 1, targetStatus2: number) {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, status2: target === 0 ? targetStatus2 : 0x11 }),
      battler({
        side: 1, species: 93, moves: [SPLASH, SPLASH, SPLASH, SPLASH],
        pp: [40, 40, 40, 40], status2: target === 1 ? targetStatus2 : 0x22,
        types: ["TYPE_GHOST", "TYPE_POISON"],
      }),
      battler({ side: 0, hp: 0, status2: 0x44 }),
      battler({ side: 1, hp: 0, status2: 0x88 }),
    ],
    selectorRoles: {
      attacker: target === 0 ? 1 : 0,
      target,
      effectBattler: target,
      fainted: null,
    },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: FORESIGHT, currentMovePosition: 0, moveResultFlags: 0,
    dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
    hitMarker: 0, multiHitCounter: 0,
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: () => null,
  resolveByteOperand: () => null,
});

function stepOpcode(source: ReturnType<typeof rules>) {
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectForesight", source, 0x1234_5678, ports,
  );
  const before = Object.freeze({
    ...execution.state,
    programCounter: instruction.programCounter,
  });
  const result = stepBattleScriptMachine(program, before, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`setforesight stopped at ${result.kind}`);
  return { before, after: result.state };
}

describe("source-complete B_SCR_OP_SETFORESIGHT registration", () => {
  it("pins the sole operand-free one-byte 0xb1 instruction and exact effect order", () => {
    expect(program.instructions.filter(
      (candidate) => candidate.opcodeName === "B_SCR_OP_SETFORESIGHT",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xb1, dispatcher: "Cmd_setforesight", operands: [],
      source: { label: "BattleScript_EffectForesight" },
    });
    expect(1 + instruction.operands.reduce(
      (sum, operand) => sum + operand.widthBytes, 0,
    )).toBe(1);
    const entry = resolveBattleScriptLabel(program, "BattleScript_EffectForesight")!;
    expect(program.instructions.slice(entry.programCounter, entry.programCounter + 10)
      .map(({ opcodeName }) => opcodeName)).toEqual([
        "B_SCR_OP_ATTACKCANCELER", "B_SCR_OP_ACCURACYCHECK",
        "B_SCR_OP_ATTACKSTRING", "B_SCR_OP_PPREDUCE",
        "B_SCR_OP_SETFORESIGHT", "B_SCR_OP_ATTACKANIMATION",
        "B_SCR_OP_WAITANIMATION", "B_SCR_OP_PRINTSTRING",
        "B_SCR_OP_WAITMESSAGE", "B_SCR_OP_GOTO",
      ]);
  });

  it.each([[1, 0], [0, 0x8000_0005]] as const)(
    "target %i receives an unconditional idempotent OR from initial status2=%i",
    (target, targetStatus2) => {
      const source = rules(target, targetStatus2);
      const { before, after } = stepOpcode(source);
      expect(after.programCounter).toBe(instruction.programCounter + 1);
      expect(after.rulesContext.battlers[target].status2).toBe(
        (targetStatus2 | BATTLE_SCRIPT_STATUS2_FORESIGHT) >>> 0,
      );
      for (const battlerId of [0, 1, 2, 3]) {
        if (battlerId !== target) {
          expect(after.rulesContext.battlers[battlerId])
            .toBe(source.battlers[battlerId]);
        }
      }
      expect(after.rulesContext.battlers[target]).toEqual({
        ...source.battlers[target],
        status2: (targetStatus2 | BATTLE_SCRIPT_STATUS2_FORESIGHT) >>> 0,
      });
      expect(after.rng).toBe(before.rng);
      expect(after.events).toBe(before.events);
      expect(after.scheduler).toBe(before.scheduler);
      expect(Object.isFrozen(after.rulesContext.battlers[target])).toBe(true);
    },
  );

  it("repeated use is the same successful one-byte fallthrough with no failure target", () => {
    const once = stepOpcode(rules(1, 0)).after;
    const twice = stepOpcode(once.rulesContext).after;
    expect(twice.programCounter).toBe(instruction.programCounter + 1);
    expect(twice.rulesContext).toEqual(once.rulesContext);
    expect(twice.rng.calls).toBe(0);
    expect(twice.events).toEqual([]);
    expect(twice.scheduler.pendingControllerBattlers).toEqual([]);
  });
});
