import { describe, expect, it } from "vitest";
import {
  advanceBattleScriptInstruction,
  acknowledgeBattleScriptMachineController,
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
} from "../src/engine/battleScriptMachine.ts";
import { executeBattleScriptMoveEndControllerCase } from "../src/engine/battleScriptMoveEndControllers.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const moveEndLabel = resolveBattleScriptLabel(program, "BattleScript_MoveEnd")!;
const moveEnd = program.instructions[moveEndLabel.programCounter + 1]!;
const defrostScript = resolveBattleScriptLabel(
  program,
  "BattleScript_DefrostedViaFireMove",
)!;
const ZERO_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6] as const);

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: 0 as const,
    ability: 0,
    hp: 100,
    item: 0,
    moves: Object.freeze([7, 1, 0, 0] as const),
    pp: Object.freeze([15, 35, 0, 0] as const),
    statStages: ZERO_STAGES,
    status1: 0,
    status2: 0,
    status3: 0,
    specialStatus: Object.freeze({
      restoredBattlerSprite: 0 as const,
      physicalDmg: 0,
      specialDmg: 0,
    }),
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0 as const,
    rechargeTimer: 0,
    flinchImmobility: 0 as const,
    disabledMove: 0,
    usedDisabledMove: 0 as const,
    tauntTimer: 0,
    usedTauntedMove: 0 as const,
    usedImprisonedMove: 0 as const,
    chargingTurn: 0 as const,
    ...changes,
  });
}

function input(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContextInput {
  return {
    battlers: [
      battler(),
      battler({
        side: 1,
        status1: (0x8000_0000 | BATTLE_SCRIPT_STATUS1_FREEZE) >>> 0,
        specialStatus: {
          restoredBattlerSprite: 0,
          physicalDmg: 0,
          specialDmg: 42,
        },
      }),
      battler(),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 7, // MOVE_FIRE_PUNCH / TYPE_FIRE
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    moveendState: 1,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: 0,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    ...changes,
  };
}

function rules(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext(input(changes));
}

function machine(
  sourceRules: BattleScriptRulesContext,
  scheduler = createBattleScriptSchedulerState(),
): BattleScriptMachineState<BattleScriptRulesContext> {
  const initial = createBattleScriptMachine(
    program,
    "BattleScript_MoveEnd",
    sourceRules,
    0x1234_5678,
    scheduler,
  );
  return Object.freeze({ ...initial, programCounter: moveEnd.programCounter });
}

function handlers(): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const controls = createBattleScriptControlHandlers<BattleScriptRulesContext>(program);
  return Object.freeze({
    ...controls,
    // Test-local only: production opcode 73 remains unregistered.
    [program.instructions[moveEnd.programCounter]!.opcodeId]:
      executeBattleScriptMoveEndControllerCase,
    16: advanceBattleScriptInstruction,
    18: advanceBattleScriptInstruction,
    152: advanceBattleScriptInstruction,
  });
}

function acknowledgeOnlyScheduler(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
  battlerId: 0 | 1 | 2 | 3,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const acknowledged = acknowledgeBattleScriptMachineController(state, battlerId);
  expect(acknowledged).not.toBe(state);
  expect(acknowledged.scheduler.pendingControllerBattlers).toEqual([]);
  expect(acknowledged.programCounter).toBe(state.programCounter);
  expect(acknowledged.callStack).toBe(state.callStack);
  expect(acknowledged.rulesContext).toBe(state.rulesContext);
  expect(acknowledged.rng).toBe(state.rng);
  expect(acknowledged.events).toBe(state.events);
  expect(acknowledgeBattleScriptMachineController(acknowledged, battlerId))
    .toBe(acknowledged);
  return acknowledged;
}

function assertDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

describe("Cmd_moveend controller-owned states", () => {
  it("defrost-blocks-with-pc-and-rng-preserved", () => {
    const busyRules = rules({
      selectorRoles: { attacker: null, target: null, effectBattler: null },
    });
    const busy = machine(
      busyRules,
      createBattleScriptSchedulerState({
        activeBattler: 3,
        pendingControllerBattlers: [3],
      }),
    );
    const blocked = stepBattleScriptMachine(program, busy, handlers());
    expect(blocked.kind).toBe("blocked");
    if (blocked.kind !== "blocked") throw new Error("expected controller-busy block");
    expect(blocked.state).toBe(busy);
    expect(blocked.reason).toMatchObject({
      kind: "controller-busy",
      programCounter: moveEnd.programCounter,
      opcodeId: 73,
    });

    const initial = machine(rules());
    const initialRules = initial.rulesContext;
    const result = stepBattleScriptMachine(program, initial, handlers());
    expect(result.kind).toBe("advanced");
    expect(result.state.programCounter).toBe(defrostScript.programCounter);
    expect(result.state.callStack).toEqual([moveEnd.programCounter]);
    expect(result.state.rulesContext.moveendState).toBe(2);
    expect(result.state.rulesContext.battlers[1].status1).toBe(0x8000_0000);
    expect(result.state.rulesContext.battlers[0]).toBe(initialRules.battlers[0]);
    expect(result.state.rulesContext.battlers[2]).toBe(initialRules.battlers[2]);
    expect(result.state.rulesContext.battlers[3]).toBe(initialRules.battlers[3]);
    expect(result.state.rulesContext.moveHistory).toBe(initialRules.moveHistory);
    expect(result.state.rulesContext.battleTopology).toBe(initialRules.battleTopology);
    expect(result.state.scheduler).toMatchObject({
      activeBattler: 1,
      pendingControllerBattlers: [1],
    });
    expect(result.state.events).toMatchObject([{
      sequence: 1,
      kind: "set-battler-status-data",
      battler: 1,
      status1: 0x8000_0000,
      provenance: {
        programCounter: moveEnd.programCounter,
        opcodeId: 73,
        opcodeName: "B_SCR_OP_MOVEEND",
      },
    }]);
    expect(result.state.rng).toBe(initial.rng);
    assertDeepFrozen(result.state);

    let replay = acknowledgeOnlyScheduler(result.state, 1);
    expect(program.instructions.slice(
      replay.programCounter,
      replay.programCounter + 4,
    ).map(({ opcodeId }) => opcodeId)).toEqual([16, 18, 152, 60]);
    for (let index = 0; index < 4; index += 1) {
      const stepped = stepBattleScriptMachine(program, replay, handlers());
      expect(stepped.kind).toBe("advanced");
      replay = stepped.state;
    }
    expect(replay.programCounter).toBe(moveEnd.programCounter);
    expect(replay.callStack).toEqual([]);
    expect(replay.rulesContext).toBe(result.state.rulesContext);
    expect(replay.rng).toBe(initial.rng);
    expect(replay.events).toBe(result.state.events);
  });

  it("visibility-cases-return-and-resume-the-same-moveend-instruction", () => {
    const initial = machine(rules({
      moveendState: 8,
      moveResultFlags: BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
      hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
      battlers: [
        battler({ status3: BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE }),
        battler({ side: 1 }),
        battler(),
        battler({ side: 1 }),
      ],
    }));
    const first = stepBattleScriptMachine(program, initial, handlers());
    expect(first.kind).toBe("advanced");
    expect(first.state.programCounter).toBe(initial.programCounter);
    expect(first.state.callStack).toBe(initial.callStack);
    expect(first.state.rulesContext.moveendState).toBe(9);
    expect(first.state.rulesContext.battlers).toBe(initial.rulesContext.battlers);
    expect(first.state.rulesContext.moveHistory).toBe(initial.rulesContext.moveHistory);
    expect(first.state.rng).toBe(initial.rng);
    expect(first.state.scheduler).toMatchObject({
      activeBattler: 0,
      pendingControllerBattlers: [0],
    });
    expect(first.state.events).toMatchObject([{
      sequence: 1,
      kind: "set-battler-sprite-visibility",
      battler: 0,
      invisible: true,
    }]);

    const afterInvisible = acknowledgeOnlyScheduler(first.state, 0);
    const second = stepBattleScriptMachine(program, afterInvisible, handlers());
    expect(second.kind).toBe("advanced");
    expect(second.state.programCounter).toBe(initial.programCounter);
    expect(second.state.callStack).toBe(initial.callStack);
    expect(second.state.rulesContext.moveendState).toBe(10);
    expect(second.state.rulesContext.battlers[0]).toMatchObject({
      status3: 0,
      specialStatus: { restoredBattlerSprite: 1 },
    });
    expect(second.state.rulesContext.battlers[1]).toBe(
      first.state.rulesContext.battlers[1],
    );
    expect(second.state.rulesContext.moveHistory).toBe(initial.rulesContext.moveHistory);
    expect(second.state.rng).toBe(initial.rng);
    expect(second.state.events.map((event) => [
      event.sequence,
      event.kind,
      "invisible" in event ? event.invisible : null,
    ])).toEqual([
      [1, "set-battler-sprite-visibility", true],
      [2, "set-battler-sprite-visibility", false],
    ]);

    const afterVisible = acknowledgeOnlyScheduler(second.state, 0);
    const third = stepBattleScriptMachine(program, afterVisible, handlers());
    expect(third.kind).toBe("advanced");
    expect(third.state.programCounter).toBe(initial.programCounter);
    expect(third.state.callStack).toBe(initial.callStack);
    expect(third.state.rulesContext.moveendState).toBe(11);
    expect(third.state.rulesContext.battlers[0]).toBe(
      second.state.rulesContext.battlers[0],
    );
    expect(third.state.rulesContext.battlers[1].specialStatus.restoredBattlerSprite)
      .toBe(0);
    expect(third.state.scheduler).toMatchObject({
      activeBattler: 1,
      pendingControllerBattlers: [1],
    });
    expect(third.state.events.at(-1)).toMatchObject({
      sequence: 3,
      kind: "set-battler-sprite-visibility",
      battler: 1,
      invisible: false,
    });
    expect(third.state.rng).toBe(initial.rng);
    assertDeepFrozen(third.state);
    acknowledgeOnlyScheduler(third.state, 1);
  });

  it("pins-every-defrost-gate-without-controller-rng-or-unrelated-writes", () => {
    const base = input();
    const first = base.battlers[0]!;
    const target = base.battlers[1]!;
    const gated: readonly Partial<BattleScriptRulesContextInput>[] = [
      {
        battlers: [first, battler({ side: 1, status1: 0, specialStatus: target.specialStatus }), ...base.battlers.slice(2)],
      },
      {
        battlers: [first, battler({ side: 1, hp: 0, status1: target.status1, specialStatus: target.specialStatus }), ...base.battlers.slice(2)],
      },
      { selectorRoles: { attacker: 1, target: 1, effectBattler: 1 } },
      {
        battlers: [first, battler({ side: 1, status1: target.status1 }), ...base.battlers.slice(2)],
      },
      { moveResultFlags: BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT },
      { currentMove: 1 }, // MOVE_POUND / TYPE_NORMAL
    ];
    for (const changes of gated) {
      const initial = machine(rules(changes));
      const result = stepBattleScriptMachine(program, initial, handlers());
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(initial.programCounter);
      expect(result.state.rulesContext.moveendState).toBe(2);
      expect(result.state.rulesContext.battlers).toBe(initial.rulesContext.battlers);
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.events).toBe(initial.events);
      expect(result.state.rng).toBe(initial.rng);
    }
  });

  it("pins-visibility-suppression-gates-and-source-writes", () => {
    const cases: readonly Partial<BattleScriptRulesContextInput>[] = [
      {
        moveendState: 8,
        battlers: [battler(), battler({ side: 1 }), battler(), battler({ side: 1 })],
        hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
      },
      {
        moveendState: 8,
        battlers: [
          battler({ status3: BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE }),
          battler({ side: 1 }),
          battler(),
          battler({ side: 1 }),
        ],
        hitMarker: 0,
      },
      {
        moveendState: 9,
        battlers: [
          battler({ status3: BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE }),
          battler({ side: 1 }),
          battler(),
          battler({ side: 1 }),
        ],
      },
      {
        moveendState: 10,
        battlers: [
          battler(),
          battler({
            side: 1,
            specialStatus: {
              restoredBattlerSprite: 1,
              physicalDmg: 0,
              specialDmg: 0,
            },
          }),
          battler(),
          battler({ side: 1 }),
        ],
      },
      {
        moveendState: 10,
        battlers: [
          battler(),
          battler({ side: 1, status3: BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE }),
          battler(),
          battler({ side: 1 }),
        ],
      },
    ];
    for (const changes of cases) {
      const initial = machine(rules(changes));
      const result = stepBattleScriptMachine(program, initial, handlers());
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(initial.programCounter);
      expect(result.state.rulesContext.moveendState)
        .toBe(initial.rulesContext.moveendState + 1);
      expect(result.state.rulesContext.battlers).toBe(initial.rulesContext.battlers);
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.events).toBe(initial.events);
      expect(result.state.rng).toBe(initial.rng);
    }

    for (const attackerChanges of [
      { status3: 0 },
      {
        status3: BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
        targetNotAffected: 1 as const,
      },
    ]) {
      const initial = machine(rules({
        moveendState: 9,
        battlers: [
          battler(attackerChanges),
          battler({ side: 1 }),
          battler(),
          battler({ side: 1 }),
        ],
      }));
      const result = stepBattleScriptMachine(program, initial, handlers());
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.moveendState).toBe(10);
      expect(result.state.rulesContext.battlers[0]).toMatchObject({
        status3: 0,
        specialStatus: { restoredBattlerSprite: 1 },
      });
      expect(result.state.events).toMatchObject([{
        kind: "set-battler-sprite-visibility",
        battler: 0,
        invisible: false,
      }]);
      expect(result.state.rng).toBe(initial.rng);
    }

    const inactiveTarget = machine(rules({
      moveendState: 10,
      selectorRoles: { attacker: 0, target: 2, effectBattler: 2 },
    }));
    const inactive = stepBattleScriptMachine(program, inactiveTarget, handlers());
    expect(inactive.kind).toBe("advanced");
    expect(inactive.state.rulesContext.moveendState).toBe(11);
    expect(inactive.state.rulesContext.battlers).toBe(inactiveTarget.rulesContext.battlers);
    expect(inactive.state.events).toBe(inactiveTarget.events);
  });
});
