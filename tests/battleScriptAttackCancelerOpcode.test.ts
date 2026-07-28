import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import {
  BATTLE_SCRIPT_ABILITY_TRUANT,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const ENTRY_LABEL = "BattleScript_HitFromAtkCanceler";
const TACKLE = 33;
const GROWL = 45;
const FLAME_WHEEL = 172;
const TAIL_WHIP = 39; // FLAG_MAGIC_COAT_AFFECTED
const SWORDS_DANCE = 14; // FLAG_SNATCH_AFFECTED

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
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
    bounceMove: changes.bounceMove,
    stealMove: changes.stealMove,
    lightningRodRedirected: changes.lightningRodRedirected,
    protected: changes.protected,
    ppNotAffectedByPressure: changes.ppNotAffectedByPressure,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
  });
}

function withSinglesAttacker(
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const target = (attacker ^ 1) as 0 | 1;
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({ side: attacker, ...attackerChanges });
  battlers[target] = battler({ side: target, ...targetChanges });
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker, target, effectBattler: target },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: TACKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    ...contextChanges,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

function stepOpcodeZero(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    ENTRY_LABEL,
    rulesContext,
    rngSeed,
    externalPorts(),
  );
  return stepBattleScriptMachine(program, execution.state, execution.handlers);
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

describe("production opcode 0 (Cmd_attackcanceler) dispatch", () => {
  it("registers B_SCR_OP_ATTACKCANCELER at the real opcode id", () => {
    const instruction = program.instructions.find(
      (candidate) => candidate.opcodeName === "B_SCR_OP_ATTACKCANCELER",
    )!;
    expect(instruction.opcodeId).toBe(0);
  });

  const jumpCases: ReadonlyArray<readonly [string, () => {
    rulesContext: BattleScriptRulesContext;
    rngSeed?: number;
    targetLabel: string;
    expectCallCurrent?: boolean;
    expectStatusSync?: boolean;
  }]> = [
    ["asleep", () => ({
      rulesContext: withSinglesAttacker(0, { status1: 3 }),
      targetLabel: "BattleScript_MoveUsedIsAsleep",
      expectStatusSync: true,
    })],
    ["frozen (stays frozen)", () => ({
      rulesContext: withSinglesAttacker(0, { status1: BATTLE_SCRIPT_STATUS1_FREEZE }),
      rngSeed: 1,
      targetLabel: "BattleScript_MoveUsedIsFrozen",
      expectStatusSync: true,
    })],
    ["truant", () => ({
      rulesContext: withSinglesAttacker(0, {
        ability: BATTLE_SCRIPT_ABILITY_TRUANT,
        truantCounter: 1,
      }),
      targetLabel: "BattleScript_MoveUsedLoafingAround",
    })],
    ["recharge", () => ({
      rulesContext: withSinglesAttacker(0, {
        status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE,
      }),
      targetLabel: "BattleScript_MoveUsedMustRecharge",
    })],
    ["flinch", () => ({
      rulesContext: withSinglesAttacker(0, {
        status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED,
      }),
      targetLabel: "BattleScript_MoveUsedFlinched",
    })],
    ["disabled", () => ({
      rulesContext: withSinglesAttacker(0, { disabledMove: TACKLE }),
      targetLabel: "BattleScript_MoveUsedIsDisabled",
    })],
    ["taunted", () => ({
      rulesContext: withSinglesAttacker(0, { tauntTimer: 1 }, { currentMove: GROWL }),
      targetLabel: "BattleScript_MoveUsedIsTaunted",
    })],
    ["imprisoned", () => ({
      rulesContext: withSinglesAttacker(
        0,
        {},
        { currentMove: GROWL },
        { moves: [GROWL, 0, 0, 0], status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS },
      ),
      targetLabel: "BattleScript_MoveUsedIsImprisoned",
    })],
    ["confused", () => ({
      rulesContext: withSinglesAttacker(0, { status2: 3 }),
      rngSeed: 3,
      targetLabel: "BattleScript_MoveUsedIsConfused",
      expectCallCurrent: true,
    })],
    ["paralyzed", () => ({
      rulesContext: withSinglesAttacker(0, { status1: BATTLE_SCRIPT_STATUS1_PARALYSIS }),
      rngSeed: 0,
      targetLabel: "BattleScript_MoveUsedIsParalyzed",
    })],
    ["in love (love check passed)", () => ({
      rulesContext: withSinglesAttacker(0, { status2: 0x0008_0000 }),
      rngSeed: 53158,
      targetLabel: "BattleScript_MoveUsedIsInLove",
      expectCallCurrent: true,
    })],
    ["bide (no energy to attack)", () => ({
      rulesContext: withSinglesAttacker(0, { status2: 0x100 }),
      targetLabel: "BattleScript_BideNoEnergyToAttack",
    })],
    ["thaw (defrosted by move)", () => ({
      rulesContext: withSinglesAttacker(
        0,
        { status1: BATTLE_SCRIPT_STATUS1_FREEZE },
        { currentMove: FLAME_WHEEL },
      ),
      rngSeed: 1,
      targetLabel: "BattleScript_MoveUsedUnfroze",
      expectCallCurrent: true,
      expectStatusSync: true,
    })],
    ["no PP", () => ({
      rulesContext: withSinglesAttacker(0, { pp: [0, 0, 0, 0] }),
      targetLabel: "BattleScript_NoPPForMove",
    })],
  ];

  for (const [name, build] of jumpCases) {
    it(`transfers ${name} through the registered opcode`, () => {
      const { rulesContext, rngSeed, targetLabel, expectCallCurrent, expectStatusSync } = build();
      const result = stepOpcodeZero(rulesContext, rngSeed);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(labelPc(targetLabel));
      expect(result.state.callStack.length).toBe(expectCallCurrent ? 1 : 0);
      if (expectStatusSync) {
        expect(result.state.events.some((event) => event.kind === "set-battler-status-data")).toBe(true);
        expect(result.state.scheduler.pendingControllerBattlers).toContain(0);
      }
    });
  }

  it("proves the fifteenth (flags) phase always runs first with zero effect of its own", () => {
    // CANCELER_FLAGS never intercepts by itself (it only clears Destiny
    // Bond/Grudge), so an otherwise clean attacker reaches CANCELER_END and
    // the join chain proceeds all the way through the tail's
    // DEFENDER_IS_PROTECTED check (false: target.protected defaults to 0) to
    // a plain advance into the next hit-chain opcode.
    const result = stepOpcodeZero(withSinglesAttacker(0, {}));
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    const next = program.instructions[result.state.programCounter];
    expect(next?.opcodeName).toBe("B_SCR_OP_ACCURACYCHECK");
  });

  describe("(b) unsupported-branch barriers", () => {
    it("halts on gBattleOutcome != 0 (round controller, out of scope)", () => {
      const result = stepOpcodeZero(
        withSinglesAttacker(0, {}, { battleOutcome: 1 }),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "unsupported-branch",
        sourceFile: "battle_script_commands.c",
        sourceLine: 919,
      });
    });

    it("halts on CANCELER_IN_LOVE's immobilized-by-love explicit-label push", () => {
      const result = stepOpcodeZero(withSinglesAttacker(0, { status2: 0x0008_0000 }), 0);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "unsupported-branch",
        sourceFile: "battle_util.c",
        sourceLine: 2210,
      });
    });

    it("hands Magic Coat bounce to the shared script and clears the target-owned arm", () => {
      const result = stepOpcodeZero(
        withSinglesAttacker(0, {}, { currentMove: TAIL_WHIP }, { bounceMove: 1 }),
      );
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_MagicCoatBounce"));
      expect(result.state.callStack).toEqual([labelPc(ENTRY_LABEL)]);
      expect(result.state.rulesContext.battlers[1].bounceMove).toBe(0);
    });

    it("delegates PressurePPLose to the Magic Coat owner's matching permanent slot", () => {
      const result = stepOpcodeZero(
        withSinglesAttacker(
          0,
          { ability: 46 },
          { currentMove: TAIL_WHIP },
          { bounceMove: 1, moves: [277, TACKLE, 0, 0], pp: [14, 35, 0, 0] },
        ),
      );
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.battlers[1].pp).toEqual([13, 35, 0, 0]);
      expect(result.state.events.at(-1)).toMatchObject({
        kind: "set-battler-pp-data", battler: 1, movePosition: 0, pp: 13,
      });
      expect(result.state.scheduler.pendingControllerBattlers).toContain(1);
    });

    it("selects the first armed Snatcher by action order, not battler id, and clears only the winner", () => {
      const result = stepOpcodeZero(
        createBattleScriptRulesContext({
          battlers: [
            battler({ side: 0, stealMove: 1, moves: [289, 0, 0, 0], pp: [9, 0, 0, 0] }),
            battler({ side: 1, stealMove: 1, moves: [289, 0, 0, 0], pp: [8, 0, 0, 0] }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
          selectorRoles: { attacker: 0, target: 0, effectBattler: 0 },
          scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
          currentMove: SWORDS_DANCE, currentMovePosition: 0, moveResultFlags: 0,
          dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
          hitMarker: 0, multiHitCounter: 0, battlerByTurnOrder: [1, 0, 2, 3],
        }),
      );
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(labelPc("BattleScript_SnatchedMove"));
      expect(result.state.callStack).toEqual([labelPc(ENTRY_LABEL)]);
      expect(result.state.rulesContext.scriptingBattler).toBe(1);
      expect(result.state.rulesContext.battlers.map(({ stealMove }) => stealMove ?? 0))
        .toEqual([1, 0, 0, 0]);
      expect(result.state.rng.calls).toBe(0);
    });

    it("Pressure charges only the winning Snatcher's Snatch slot and emits one permanent update", () => {
      const result = stepOpcodeZero(
        withSinglesAttacker(
          0,
          { ability: 46 },
          { currentMove: SWORDS_DANCE, battlerByTurnOrder: [1, 0, 2, 3] },
          { stealMove: 1, moves: [TACKLE, 289, 0, 0], pp: [35, 7, 0, 0] },
        ),
      );
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.battlers[1].pp).toEqual([35, 6, 0, 0]);
      expect(result.state.events.at(-1)).toMatchObject({
        kind: "set-battler-pp-data", battler: 1, movePosition: 1, pp: 6,
      });
      expect(result.state.scheduler.pendingControllerBattlers).toContain(1);
    });

    it("halts on Lightning Rod redirection (Tier-1-constructed; unreachable in Level-50 singles)", () => {
      const result = stepOpcodeZero(
        withSinglesAttacker(0, {}, {}, { lightningRodRedirected: 1 }),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "unsupported-branch",
        sourceFile: "battle_script_commands.c",
        sourceLine: 984,
      });
    });

    it("applies the real DEFENDER_IS_PROTECTED effect and advances (Protect success)", () => {
      const result = stepOpcodeZero(
        withSinglesAttacker(
          0,
          {
            furyCutterCounter: 4,
            rolloutTimer: 3,
            status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
          },
          {},
          { protected: 1 },
        ),
      );
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      const next = program.instructions[result.state.programCounter];
      expect(next?.opcodeName).toBe("B_SCR_OP_ACCURACYCHECK");
      expect(result.state.rulesContext.moveResultFlags & 1).toBe(1); // MOVE_RESULT_MISSED
      expect(result.state.rulesContext.missType).toBe(1); // B_MSG_PROTECTED
      expect(result.state.rulesContext.battlers[0]).toMatchObject({
        furyCutterCounter: 0,
        rolloutTimer: 0,
      });
      expect(
        result.state.rulesContext.battlers[0].status2
        & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
      ).toBe(0);
    });

    it("does not trigger Protect for a move without FLAG_PROTECT_AFFECTED", () => {
      const result = stepOpcodeZero(
        withSinglesAttacker(0, {}, { currentMove: SWORDS_DANCE }, { protected: 1 }),
      );
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.moveResultFlags & 1).toBe(0);
    });
  });
});
