import { describe, expect, it } from "vitest";
import {
  advanceBattleScriptAttackCancelerUnableToUseMove,
  type BattleScriptAttackCancelerLoopState,
} from "../src/engine/battleScriptAttackCanceler.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ABILITY_TRUANT,
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";

const PC = 0x0800_1234;
const TACKLE = 33;
const FLAME_WHEEL = 172;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
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
    confusionSelfDmg: changes.confusionSelfDmg ?? 0,
    prlzImmobility: changes.prlzImmobility ?? 0,
    loveImmobility: changes.loveImmobility ?? 0,
    confusionDamage: changes.confusionDamage,
  });
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [
      battler({ side: 0 }),
      battler({ side: 1 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: changes.selectorRoles ?? {
      attacker: 0,
      target: 1,
      effectBattler: 1,
    },
    scriptingBattler: changes.scriptingBattler ?? 3,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FLAGS,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? TACKLE,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0,
    multiHitCounter: changes.multiHitCounter ?? 0,
    multistringChooser: changes.multistringChooser ?? 9,
    battleMoveDamage: changes.battleMoveDamage ?? 777,
    bideDmg: changes.bideDmg ?? [0, 0, 0, 0],
    bideTarget: changes.bideTarget ?? [1, 0, 1, 0],
    scriptingBideDmg: changes.scriptingBideDmg ?? -99,
    absentBattlerFlags: changes.absentBattlerFlags ?? 0,
  });
}

function state(
  changes: Partial<BattleScriptAttackCancelerLoopState> = {},
): BattleScriptAttackCancelerLoopState {
  return Object.freeze({
    rulesContext: changes.rulesContext ?? rules(),
    rngValue: changes.rngValue ?? 1,
    rngCallsConsumed: changes.rngCallsConsumed ?? 0,
  });
}

function withSinglesAttacker(
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
) {
  const battlers = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({ side: attacker, ...attackerChanges });
  return rules({
    ...contextChanges,
    battlers,
    selectorRoles: contextChanges.selectorRoles ?? {
      attacker,
      target: (attacker ^ 1) as 0 | 1,
      effectBattler: (attacker ^ 1) as 0 | 1,
    },
  });
}

function phaseNames(
  result: ReturnType<typeof advanceBattleScriptAttackCancelerUnableToUseMove>,
) {
  return result.receipt.phases.map((phase) => phase.receipt.sourcePhase);
}

function expectDeepFrozen(value: unknown, seen = new Set<unknown>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value as Record<string, unknown>)) {
    expectDeepFrozen(child, seen);
  }
}

const ALL_PHASES = [
  "CANCELER_FLAGS",
  "CANCELER_ASLEEP",
  "CANCELER_FROZEN",
  "CANCELER_TRUANT",
  "CANCELER_RECHARGE",
  "CANCELER_FLINCH",
  "CANCELER_DISABLED",
  "CANCELER_TAUNTED",
  "CANCELER_IMPRISONED",
  "CANCELER_CONFUSED",
  "CANCELER_PARALYZED",
  "CANCELER_IN_LOVE",
  "CANCELER_BIDE",
  "CANCELER_THAW",
] as const;

describe("complete source-shaped AtkCanceler_UnableToUseMove composition", () => {
  it("traverses every phase in source order to END for both singles sides", () => {
    for (const attacker of [0, 1] as const) {
      const source = state({
        rulesContext: withSinglesAttacker(attacker),
        rngValue: 0xdead_beef,
        rngCallsConsumed: 12,
      });
      const result =
        advanceBattleScriptAttackCancelerUnableToUseMove(source, PC);
      expect(result).toMatchObject({
        kind: "end",
        effect: 0,
        rngValue: 0xdead_beef,
        rngCallsConsumed: 12,
        rulesContext: { atkCancelerTracker: 14 },
        receipt: {
          sourceFunction: "AtkCanceler_UnableToUseMove",
          tracker: { before: 0, after: 14 },
          effect: 0,
          programCounter: {
            kind: "preserve",
            sourceProgramCounter: PC,
          },
          rng: {
            before: 0xdead_beef,
            after: 0xdead_beef,
            callsBefore: 12,
            callsAfter: 12,
            callsConsumed: 0,
          },
          controllerSync: {
            kind: "none",
            sourceCondition: "effect != 2",
          },
        },
      });
      expect(phaseNames(result)).toEqual(ALL_PHASES);
      expect(result.rulesContext.battlers).toBe(source.rulesContext.battlers);
    }
  });

  it("stops at the first nonzero source effect before every later condition", () => {
    const asleepAndLater = state({
      rulesContext: withSinglesAttacker(0, {
        status1: 3,
        ability: BATTLE_SCRIPT_ABILITY_TRUANT,
        truantCounter: 1,
        status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
          | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED,
      }),
    });
    const asleep =
      advanceBattleScriptAttackCancelerUnableToUseMove(asleepAndLater, PC);
    expect(phaseNames(asleep)).toEqual(["CANCELER_FLAGS", "CANCELER_ASLEEP"]);
    expect(asleep).toMatchObject({
      effect: 2,
      rulesContext: { atkCancelerTracker: 2 },
      receipt: {
        programCounter: {
          kind: "handoff",
          targetLabel: "BattleScript_MoveUsedIsAsleep",
        },
      },
    });
    expect(
      asleep.rulesContext.battlers[0].status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE,
    ).not.toBe(0);
    expect(
      asleep.rulesContext.battlers[0].status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED,
    ).not.toBe(0);

    const truantAndLater = state({
      rulesContext: withSinglesAttacker(1, {
        ability: BATTLE_SCRIPT_ABILITY_TRUANT,
        truantCounter: 1,
        status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
          | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED,
      }),
    });
    const truant =
      advanceBattleScriptAttackCancelerUnableToUseMove(truantAndLater, PC);
    expect(phaseNames(truant).at(-1)).toBe("CANCELER_TRUANT");
    expect(truant).toMatchObject({
      effect: 1,
      rulesContext: { atkCancelerTracker: 4 },
      receipt: {
        programCounter: {
          kind: "handoff",
          targetLabel: "BattleScript_MoveUsedLoafingAround",
        },
      },
    });
    // Truant's own immediate CancelMultiTurnMoves clears the later recharge
    // and flinch bits, but their phase decisions were not executed.
    expect(phaseNames(truant)).not.toContain("CANCELER_RECHARGE");
    expect(phaseNames(truant)).not.toContain("CANCELER_FLINCH");
  });

  it("threads exact conditional RNG across FROZEN, PARALYZED, and IN_LOVE", () => {
    const source = state({
      rulesContext: withSinglesAttacker(0, {
        status1: BATTLE_SCRIPT_STATUS1_FREEZE
          | BATTLE_SCRIPT_STATUS1_PARALYSIS,
        status2: 1 << 17,
      }, {
        currentMove: FLAME_WHEEL,
      }),
      rngValue: 1,
      rngCallsConsumed: 7,
    });
    const result =
      advanceBattleScriptAttackCancelerUnableToUseMove(source, PC);
    expect(result).toMatchObject({
      kind: "effect",
      effect: 1,
      rngValue: 3538875722,
      rngCallsConsumed: 10,
      rulesContext: { atkCancelerTracker: 12 },
      receipt: {
        rng: {
          before: 1,
          after: 3538875722,
          callsBefore: 7,
          callsAfter: 10,
          callsConsumed: 3,
        },
        programCounter: {
          kind: "handoff",
          targetLabel: "BattleScript_MoveUsedIsInLove",
        },
      },
    });
    expect(phaseNames(result)).toEqual(ALL_PHASES.slice(0, 12));
    const frozen = result.receipt.phases[2]!;
    const paralyzed = result.receipt.phases[10]!;
    const inLove = result.receipt.phases[11]!;
    expect(frozen.receipt).toMatchObject({
      sourcePhase: "CANCELER_FROZEN",
      rng: {
        before: 1,
        after: 1103539936,
        remainder: 3,
      },
      effect: 0,
    });
    expect(paralyzed.receipt).toMatchObject({
      sourcePhase: "CANCELER_PARALYZED",
      rng: {
        before: 1103539936,
        after: 2887849427,
        modulo: 1,
      },
      effect: 0,
    });
    expect(inLove.receipt).toMatchObject({
      sourcePhase: "CANCELER_IN_LOVE",
      rng: {
        before: 2887849427,
        after: 3538875722,
        lowBit: 0,
      },
      effect: 1,
    });
    expect(phaseNames(result)).not.toContain("CANCELER_BIDE");
    expect(phaseNames(result)).not.toContain("CANCELER_THAW");
  });

  it("stops at CONFUSED and consumes no PARALYZED or IN_LOVE draw", () => {
    const source = state({
      rulesContext: withSinglesAttacker(0, {
        status1: BATTLE_SCRIPT_STATUS1_FREEZE
          | BATTLE_SCRIPT_STATUS1_PARALYSIS,
        status2: 3 | (1 << 17),
      }, {
        currentMove: FLAME_WHEEL,
      }),
      rngValue: 1,
    });
    const result =
      advanceBattleScriptAttackCancelerUnableToUseMove(source, PC);
    expect(result).toMatchObject({
      effect: 1,
      rngValue: 2887849427,
      rngCallsConsumed: 2,
      rulesContext: { atkCancelerTracker: 10 },
      receipt: {
        rng: { callsConsumed: 2 },
        programCounter: {
          kind: "handoff",
          targetLabel: "BattleScript_MoveUsedIsConfused",
        },
      },
    });
    expect(phaseNames(result).at(-1)).toBe("CANCELER_CONFUSED");
    expect(phaseNames(result)).not.toContain("CANCELER_PARALYZED");
    expect(phaseNames(result)).not.toContain("CANCELER_IN_LOVE");
  });

  it("normalizes the common effect-2 status sync for asleep and frozen paths", () => {
    for (const attacker of [0, 1] as const) {
      const asleep = advanceBattleScriptAttackCancelerUnableToUseMove(
        state({
          rulesContext: withSinglesAttacker(attacker, {
            status1: 0x8000 | 3,
          }),
        }),
        PC,
      );
      expect(asleep.receipt.controllerSync).toEqual({
        kind: "request-status1-write",
        sourceCondition: "effect == 2",
        sourceOwner: "AtkCanceler_UnableToUseMove",
        battler: attacker,
        sourceRequest: "REQUEST_STATUS_BATTLE",
        offset: 0,
        size: 4,
        value: 0x8002,
        markForControllerExecution: true,
      });

      const frozen = advanceBattleScriptAttackCancelerUnableToUseMove(
        state({
          rulesContext: withSinglesAttacker(attacker, {
            status1: 0x8000 | BATTLE_SCRIPT_STATUS1_FREEZE,
          }),
          rngValue: 1,
        }),
        PC,
      );
      expect(frozen).toMatchObject({
        effect: 2,
        rngValue: 1103539936,
        rngCallsConsumed: 1,
        rulesContext: { atkCancelerTracker: 3 },
        receipt: {
          programCounter: {
            kind: "handoff",
            targetLabel: "BattleScript_MoveUsedIsFrozen",
          },
          controllerSync: {
            kind: "request-status1-write",
            battler: attacker,
            value: 0x8020,
          },
        },
      });
      const frozenPhase = frozen.receipt.phases.at(-1)!;
      expect(frozenPhase.receipt).toMatchObject({
        sourcePhase: "CANCELER_FROZEN",
        statusController: { kind: "none" },
      });
    }
  });

  it("projects the asleep phase's source-owned MULTISTRING_CHOOSER write before its MoveUsedWokeUp handoff", () => {
    const ordinaryWake = advanceBattleScriptAttackCancelerUnableToUseMove(
      state({
        rulesContext: withSinglesAttacker(0, { status1: 1 }, {
          // An unrelated prior table selection must not leak through either
          // gWokeUpStringIds row.
          multistringChooser: 9,
        }),
      }),
      PC,
    );
    expect(ordinaryWake).toMatchObject({
      effect: 2,
      rngCallsConsumed: 0,
      rulesContext: { multistringChooser: 0 },
      receipt: {
        programCounter: { kind: "handoff", targetLabel: "BattleScript_MoveUsedWokeUp" },
      },
    });

    const uproarWake = advanceBattleScriptAttackCancelerUnableToUseMove(
      state({
        rulesContext: rules({
          battlers: [
            battler({ side: 0, status1: 1 }),
            // battle.h's three Uproar timer bits; any nonzero timer wakes
            // this attacker before the ordinary sleep decrement.
            battler({ side: 1, status2: 0x70 }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
          selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
          multistringChooser: 9,
        }),
      }),
      PC,
    );
    expect(uproarWake).toMatchObject({
      effect: 2,
      rngCallsConsumed: 0,
      rulesContext: { multistringChooser: 1 },
      receipt: {
        programCounter: { kind: "handoff", targetLabel: "BattleScript_MoveUsedWokeUp" },
      },
    });
  });

  it("resumes after effects 1 and 2 from the already advanced tracker", () => {
    const first = advanceBattleScriptAttackCancelerUnableToUseMove(
      state({
        rulesContext: withSinglesAttacker(0, {
          status1: BATTLE_SCRIPT_STATUS1_FREEZE
            | BATTLE_SCRIPT_STATUS1_PARALYSIS,
          status2: 1 << 17,
        }, {
          currentMove: FLAME_WHEEL,
        }),
        rngValue: 1,
        rngCallsConsumed: 7,
      }),
      PC,
    );
    expect(first.effect).toBe(1);
    expect(first.rulesContext.atkCancelerTracker).toBe(12);

    const second = advanceBattleScriptAttackCancelerUnableToUseMove(first, PC);
    expect(second).toMatchObject({
      effect: 2,
      rngValue: 3538875722,
      rngCallsConsumed: 10,
      rulesContext: { atkCancelerTracker: 14 },
      receipt: {
        tracker: { before: 12, after: 14 },
        rng: {
          callsBefore: 10,
          callsAfter: 10,
          callsConsumed: 0,
        },
        programCounter: {
          kind: "handoff",
          targetLabel: "BattleScript_MoveUsedUnfroze",
        },
        controllerSync: {
          kind: "request-status1-write",
          value: BATTLE_SCRIPT_STATUS1_PARALYSIS,
        },
      },
    });
    expect(phaseNames(second)).toEqual(["CANCELER_BIDE", "CANCELER_THAW"]);
    expect(
      second.rulesContext.battlers[0].status1
      & BATTLE_SCRIPT_STATUS1_FREEZE,
    ).toBe(0);

    const atEnd =
      advanceBattleScriptAttackCancelerUnableToUseMove(second, PC);
    expect(atEnd).toMatchObject({
      kind: "end",
      effect: 0,
      rngValue: second.rngValue,
      rngCallsConsumed: second.rngCallsConsumed,
      receipt: {
        tracker: { before: 14, after: 14 },
        phases: [],
        programCounter: {
          kind: "preserve",
          sourceProgramCounter: PC,
        },
      },
    });
  });

  it("resumes a Bide effect at THAW without replaying earlier phases", () => {
    const first = advanceBattleScriptAttackCancelerUnableToUseMove(
      state({
        rulesContext: withSinglesAttacker(1, {
          status2: 0x200,
        }),
        rngValue: 0xdead_beef,
      }),
      PC,
    );
    expect(first).toMatchObject({
      effect: 1,
      rulesContext: { atkCancelerTracker: 13 },
      receipt: {
        programCounter: {
          kind: "handoff",
          targetLabel: "BattleScript_BideStoringEnergy",
        },
      },
    });
    expect(phaseNames(first).at(-1)).toBe("CANCELER_BIDE");

    const resumed =
      advanceBattleScriptAttackCancelerUnableToUseMove(first, PC);
    expect(resumed).toMatchObject({
      kind: "end",
      effect: 0,
      rulesContext: { atkCancelerTracker: 14 },
      rngValue: 0xdead_beef,
      rngCallsConsumed: 0,
    });
    expect(phaseNames(resumed)).toEqual(["CANCELER_THAW"]);
  });

  it("is deterministic, input-immutable, and deeply freezes state and receipts", () => {
    const source = state({
      rulesContext: withSinglesAttacker(1, {
        status1: BATTLE_SCRIPT_STATUS1_PARALYSIS,
        status2: 1 << 16,
      }),
      rngValue: 4,
      rngCallsConsumed: 99,
    });
    const before = JSON.stringify(source);
    const first =
      advanceBattleScriptAttackCancelerUnableToUseMove(source, PC);
    const replay =
      advanceBattleScriptAttackCancelerUnableToUseMove(source, PC);
    expect(replay).toEqual(first);
    expect(JSON.stringify(source)).toBe(before);
    expectDeepFrozen(first);
  });

  it("rejects invalid state, source PC, RNG accounting, tracker, and active context", () => {
    expect(() => advanceBattleScriptAttackCancelerUnableToUseMove(
      null as never,
      PC,
    )).toThrow(/requires a state object/);
    expect(() => advanceBattleScriptAttackCancelerUnableToUseMove(
      { ...state(), rulesContext: null as never },
      PC,
    )).toThrow(/requires a typed rules context/);
    for (const rngValue of [-1, 1.5, 0x1_0000_0000, Number.NaN]) {
      expect(() => advanceBattleScriptAttackCancelerUnableToUseMove(
        { ...state(), rngValue },
        PC,
      )).toThrow(/RNG value must be a u32/);
    }
    for (const rngCallsConsumed of [-1, 1.5, Number.NaN]) {
      expect(() => advanceBattleScriptAttackCancelerUnableToUseMove(
        { ...state(), rngCallsConsumed },
        PC,
      )).toThrow(/RNG call count must be a nonnegative safe integer/);
    }
    for (const invalidPc of [-1, 1.5, 0x1_0000_0000, Number.NaN]) {
      expect(() => advanceBattleScriptAttackCancelerUnableToUseMove(
        state(),
        invalidPc,
      )).toThrow(/source program counter must be a u32/);
    }
    for (const tracker of [15, 255]) {
      expect(() => advanceBattleScriptAttackCancelerUnableToUseMove(
        state({ rulesContext: rules({ atkCancelerTracker: tracker }) }),
        PC,
      )).toThrow(/tracker must be CANCELER_FLAGS..CANCELER_END/);
    }
    expect(() => advanceBattleScriptAttackCancelerUnableToUseMove(
      state({
        rulesContext: rules({
          selectorRoles: {
            attacker: null,
            target: 1,
            effectBattler: 1,
          },
        }),
      }),
      PC,
    )).toThrow(/flags phase requires an attacker role/);

    const endWithoutRoles = advanceBattleScriptAttackCancelerUnableToUseMove(
      state({
        rulesContext: rules({
          atkCancelerTracker:
            BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_END,
          selectorRoles: {},
        }),
      }),
      PC,
    );
    expect(endWithoutRoles).toMatchObject({
      kind: "end",
      effect: 0,
      receipt: { phases: [] },
    });
  });
});
