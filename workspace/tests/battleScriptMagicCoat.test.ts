import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
  joinBattleScriptAttackCancelerFactoryObedience,
  joinBattleScriptAttackCancelerMovesBlock,
  joinBattleScriptAttackCancelerSelectedMovePp,
  type BattleScriptAttackCancelerFactoryObedienceResult,
  type BattleScriptMovesBlockState,
} from "../src/engine/battleScriptAbilityMovesBlock.ts";
import {
  advanceBattleScriptAttackCancelerUnableToUseMove,
} from "../src/engine/battleScriptAttackCanceler.ts";
import {
  joinBattleScriptAttackCancelerMagicCoat,
} from "../src/engine/battleScriptMagicCoat.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_ABILITY_TRUANT,
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_OBEYS,
} from "../src/engine/battleScriptSourceConstants.ts";
import frontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };

const PC = 0x0800_1234;
const PRIOR_STACK = Object.freeze([0x0800_0020, 0x0800_0400]);
const TAIL_WHIP = 39;
const TACKLE = 33;
const MAGIC_COAT = 277;
const HYPER_VOICE = 304;
const LEGAL_MAGIC_COAT_SET_IDS = [121, 220, 251] as const;

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
    bounceMove: changes.bounceMove ?? 0,
    confusionSelfDmg: changes.confusionSelfDmg ?? 0,
    prlzImmobility: changes.prlzImmobility ?? 0,
    loveImmobility: changes.loveImmobility ?? 0,
  });
}

function rules(
  attacker: 0 | 1,
  changes: Partial<BattleScriptRulesContextInput> = {},
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const target = (attacker ^ 1) as 0 | 1;
  const indexed = [
    battler({ side: 0, bounceMove: 1 }),
    battler({ side: 1, bounceMove: 1 }),
    battler({ side: 0, bounceMove: 1 }),
    battler({ side: 1, bounceMove: 0 }),
  ];
  indexed[attacker] = battler({
    side: attacker,
    moves: [changes.currentMove ?? TAIL_WHIP, 0, 0, 0],
    pp: [30, 0, 0, 0],
    bounceMove: 1,
    ...attackerChanges,
  });
  indexed[target] = battler({
    side: target,
    moves: [MAGIC_COAT, 60, 92, 109],
    pp: [14, 7, 8, 9],
    bounceMove: 1,
    ...targetChanges,
  });
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? indexed,
    selectorRoles: changes.selectorRoles ?? {
      attacker,
      target,
      effectBattler: target,
    },
    scriptingBattler: changes.scriptingBattler ?? 3,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_END,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? TAIL_WHIP,
    currentMovePosition: changes.currentMovePosition ?? 0,
    lastUsedAbility: changes.lastUsedAbility ?? 17,
    moveResultFlags: changes.moveResultFlags ?? 0x20,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 4,
    hitMarker: changes.hitMarker ?? 0x0080_0240,
    multiHitCounter: changes.multiHitCounter ?? 2,
    multistringChooser: changes.multistringChooser ?? 9,
    battleMoveDamage: changes.battleMoveDamage ?? 777,
  });
}

function state(rulesContext: BattleScriptRulesContext): BattleScriptMovesBlockState {
  return Object.freeze({
    rulesContext,
    rngValue: 0x1234_5678,
    rngCallsConsumed: 91,
  });
}

function throughObedience(
  rulesContext: BattleScriptRulesContext,
): BattleScriptAttackCancelerFactoryObedienceResult {
  const canceler = advanceBattleScriptAttackCancelerUnableToUseMove(
    state(rulesContext),
    PC,
  );
  const movesBlock = joinBattleScriptAttackCancelerMovesBlock(canceler, PC);
  const pp = joinBattleScriptAttackCancelerSelectedMovePp(movesBlock, PC);
  return joinBattleScriptAttackCancelerFactoryObedience(
    pp,
    BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
    PC,
  );
}

function expectDeepFrozen(value: unknown, seen = new Set<unknown>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value as Record<string, unknown>)) {
    expectDeepFrozen(child, seen);
  }
}

describe("Cmd_attackcanceler post-obedience Magic Coat intercept", () => {
  it("intercepts on both singles sides for every legal Level-50 Magic Coat set", () => {
    expect(
      frontierMons.entries
        .filter((entry) =>
          entry.index < 850 && entry.moves.includes("MOVE_MAGIC_COAT")
        )
        .map((entry) => entry.index),
    ).toEqual(LEGAL_MAGIC_COAT_SET_IDS);

    for (const attacker of [0, 1] as const) {
      for (const setId of LEGAL_MAGIC_COAT_SET_IDS) {
        const source = rules(attacker);
        const upstream = throughObedience(source);
        const result = joinBattleScriptAttackCancelerMagicCoat(
          upstream,
          PRIOR_STACK,
          PC,
        );
        const target = (attacker ^ 1) as 0 | 1;
        expect(frontierMons.entries[setId]!.moves).toContain("MOVE_MAGIC_COAT");
        expect(result).toMatchObject({
          kind: "magic-coat",
          effect: 0,
          rngValue: upstream.rngValue,
          rngCallsConsumed: upstream.rngCallsConsumed,
          scriptCallStack: [...PRIOR_STACK, PC],
          pressurePpLossRequests: [{
            kind: "delegate",
            sourceFunction: "PressurePPLose",
            arguments: {
              pressureAbilityBattler: {
                sourceArgument: "gBattlerAttacker",
                value: attacker,
              },
              moveOwnerBattler: {
                sourceArgument: "gBattlerTarget",
                value: target,
              },
              move: {
                sourceArgument: "MOVE_MAGIC_COAT",
                value: MAGIC_COAT,
              },
            },
            ownership: "delegated-without-PP-or-controller-mutation",
          }],
          receipt: {
            sourceFunction: "Cmd_attackcanceler",
            sourceCondition: "Factory obedience continued",
            attacker,
            target,
            protect: {
              sourceField: "gProtectStructs[gBattlerTarget].bounceMove",
              battler: target,
              before: 1,
              after: 0,
              cleared: true,
            },
            move: {
              sourceField: "gBattleMoves[gCurrentMove].flags",
              move: TAIL_WHIP,
              sourceSymbol: "MOVE_TAIL_WHIP",
              testedFlag: "FLAG_MAGIC_COAT_AFFECTED",
              affected: true,
            },
            pressurePpLoss: {
              kind: "delegate",
              sourceFunction: "PressurePPLose",
            },
            programCounter: {
              kind: "handoff",
              sourceProgramCounter: PC,
              targetLabel: "BattleScript_MagicCoatBounce",
              stack: {
                kind: "push-cursor",
                sourceStruct: "BattleScriptsStack",
                sourceFunction: "BattleScriptPushCursor",
                before: PRIOR_STACK,
                pushedProgramCounter: PC,
                after: [...PRIOR_STACK, PC],
                resume: {
                  sourceFunction: "BattleScriptPop",
                  programCounter: PC,
                  continuation: "resume-Cmd_attackcanceler",
                },
              },
            },
            rng: {
              before: upstream.rngValue,
              after: upstream.rngValue,
              callsBefore: upstream.rngCallsConsumed,
              callsAfter: upstream.rngCallsConsumed,
              callsConsumed: 0,
            },
          },
        });
        expect(result.receipt.factoryObedience).toBe(upstream.receipt);
        expect(result.rulesContext.hitMarker).toBe(
          upstream.rulesContext.hitMarker,
        );
        expect(
          result.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_OBEYS,
        ).toBe(BATTLE_SCRIPT_HITMARKER_OBEYS);
        expect(result.rulesContext.battlers[target]!.bounceMove).toBe(0);
        expect(result.rulesContext.battlers[target]!.pp).toBe(
          upstream.rulesContext.battlers[target]!.pp,
        );
        for (const battlerId of [0, 1, 2, 3] as const) {
          if (battlerId === target) continue;
          expect(result.rulesContext.battlers[battlerId]).toBe(
            upstream.rulesContext.battlers[battlerId],
          );
        }
      }
    }
  });

  it("uses the generated FLAG_MAGIC_COAT_AFFECTED membership for all 355 moves", () => {
    expect(movesData.moves).toHaveLength(355);
    let affectedCount = 0;
    let unaffectedCount = 0;
    for (const move of movesData.moves) {
      const affected = (move.flags as readonly string[]).includes(
        "FLAG_MAGIC_COAT_AFFECTED",
      );
      affected ? affectedCount++ : unaffectedCount++;
      const upstream = throughObedience(rules(
        0,
        { currentMove: move.id },
        { moves: [move.id, 0, 0, 0], pp: [5, 0, 0, 0] },
      ));
      const result = joinBattleScriptAttackCancelerMagicCoat(
        upstream,
        [],
        PC,
      );
      expect(result.kind, move.move).toBe(affected ? "magic-coat" : "continue");
      if (
        result.kind === "magic-coat"
        || result.kind === "continue"
      ) {
        expect(result.receipt.move).toEqual({
          sourceField: "gBattleMoves[gCurrentMove].flags",
          move: move.id,
          sourceSymbol: move.move,
          sourceFlags: move.flags,
          testedFlag: "FLAG_MAGIC_COAT_AFFECTED",
          affected,
        });
      }
    }
    expect(affectedCount).toBeGreaterThan(0);
    expect(unaffectedCount).toBeGreaterThan(0);
  });

  it("continues before Snatch without state, stack, PC, pressure, or RNG changes when unarmed", () => {
    const upstream = throughObedience(rules(
      1,
      {},
      {},
      { bounceMove: 0 },
    ));
    const result = joinBattleScriptAttackCancelerMagicCoat(
      upstream,
      PRIOR_STACK,
      PC,
    );
    expect(result).toMatchObject({
      kind: "continue",
      effect: 0,
      scriptCallStack: PRIOR_STACK,
      pressurePpLossRequests: [],
      receipt: {
        protect: { before: 0, after: 0, cleared: false },
        move: { affected: true },
        pressurePpLoss: {
          kind: "not-requested",
          reason: "target-bounceMove-not-armed",
        },
        programCounter: {
          kind: "preserve",
          sourceProgramCounter: PC,
          continuation: "before-Snatch",
          stack: {
            kind: "preserve",
            before: PRIOR_STACK,
            after: PRIOR_STACK,
          },
        },
        rng: { callsConsumed: 0 },
      },
    });
    expect(result.rulesContext).toBe(upstream.rulesContext);
    expect(result.receipt.factoryObedience).toBe(upstream.receipt);
    expect(result.rngValue).toBe(upstream.rngValue);
    expect(result.rngCallsConsumed).toBe(upstream.rngCallsConsumed);
  });

  it("bypasses Magic Coat after canceler effects 1/2, Soundproof, and no PP", () => {
    const cases = [
      {
        upstream: throughObedience(rules(
          0,
          { atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TRUANT },
          { ability: BATTLE_SCRIPT_ABILITY_TRUANT, truantCounter: 1 },
        )),
        kind: "canceler-effect",
        effect: 1,
        reason: "canceler-effect-nonzero",
      },
      {
        upstream: throughObedience(rules(
          1,
          { atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_ASLEEP },
          { status1: 3 },
        )),
        kind: "canceler-effect",
        effect: 2,
        reason: "canceler-effect-nonzero",
      },
      {
        upstream: throughObedience(rules(
          0,
          { currentMove: HYPER_VOICE },
          { moves: [HYPER_VOICE, 0, 0, 0] },
          { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
        )),
        kind: "moves-block",
        effect: 1,
        reason: "moves-block-effect-nonzero",
      },
      {
        upstream: throughObedience(rules(
          1,
          { hitMarker: 0x40 },
          { pp: [0, 0, 0, 0] },
        )),
        kind: "selected-move-no-pp",
        effect: 0,
        reason: "selected-move-has-no-pp",
      },
    ] as const;

    for (const { upstream, kind, effect, reason } of cases) {
      const result = joinBattleScriptAttackCancelerMagicCoat(
        upstream,
        PRIOR_STACK,
        PC,
      );
      expect(result).toMatchObject({
        kind,
        effect,
        rulesContext: upstream.rulesContext,
        scriptCallStack: PRIOR_STACK,
        pressurePpLossRequests: [],
        receipt: {
          factoryObedience: upstream.receipt,
          magicCoat: { kind: "not-checked", reason },
          programCounter: {
            kind: "preserve-upstream",
            sourceProgramCounter: PC,
            stack: {
              kind: "preserve",
              before: PRIOR_STACK,
              after: PRIOR_STACK,
            },
          },
          rng: { callsConsumed: 0 },
        },
      });
      expect(result.rulesContext).toBe(upstream.rulesContext);
      expect(result.receipt.factoryObedience).toBe(upstream.receipt);
      expect(result.rngValue).toBe(upstream.rngValue);
      expect(result.rngCallsConsumed).toBe(upstream.rngCallsConsumed);
    }
  });

  it("is deterministic, immutable, recursively frozen, and changes only target bounceMove", () => {
    const upstream = throughObedience(rules(0));
    const before = JSON.stringify({ upstream, stack: PRIOR_STACK });
    const first = joinBattleScriptAttackCancelerMagicCoat(
      upstream,
      PRIOR_STACK,
      PC,
    );
    const replay = joinBattleScriptAttackCancelerMagicCoat(
      upstream,
      PRIOR_STACK,
      PC,
    );
    expect(replay).toEqual(first);
    expect(JSON.stringify({ upstream, stack: PRIOR_STACK })).toBe(before);
    expect(first.rulesContext).toEqual({
      ...upstream.rulesContext,
      battlers: upstream.rulesContext.battlers.map((sourceBattler, index) =>
        index === 1 ? { ...sourceBattler, bounceMove: 0 } : sourceBattler
      ),
    });
    expect(first.rngValue).toBe(upstream.rngValue);
    expect(first.rngCallsConsumed).toBe(upstream.rngCallsConsumed);
    expectDeepFrozen(first);
  });

  it("rejects invalid roles, protect input, PC/stack, and composition", () => {
    const validRules = rules(0);
    const valid = throughObedience(validRules);
    const invalidBattlers = [...validRules.battlers];
    invalidBattlers[1] = {
      ...invalidBattlers[1]!,
      bounceMove: 2,
    } as never;
    for (const invalid of [-1, 1.5, 2, Number.NaN]) {
      const indexed = [...validRules.battlers];
      indexed[1] = { ...indexed[1]!, bounceMove: invalid } as never;
      expect(() => createBattleScriptRulesContext({
        ...validRules,
        battlers: indexed,
      })).toThrow(/battlers\[1\]\.bounceMove must be an unsigned integer <= 1/);
    }
    expect(() => joinBattleScriptAttackCancelerMagicCoat(
      {
        ...valid,
        rulesContext: Object.freeze({
          ...valid.rulesContext,
          battlers: Object.freeze(invalidBattlers),
        }),
      } as never,
      [],
      PC,
    )).toThrow(/bounceMove to be 0 or 1/);

    for (const role of ["attacker", "target"] as const) {
      expect(() => joinBattleScriptAttackCancelerMagicCoat(
        {
          ...valid,
          rulesContext: Object.freeze({
            ...valid.rulesContext,
            selectorRoles: Object.freeze({
              ...valid.rulesContext.selectorRoles,
              [role]: null,
            }),
          }),
        } as never,
        [],
        PC,
      )).toThrow(/requires attacker and target roles/);
    }
    expect(() => joinBattleScriptAttackCancelerMagicCoat(
      null as never,
      [],
      PC,
    )).toThrow(/requires a Factory-obedience result/);
    for (const invalidPc of [-1, 1.5, 0x1_0000_0000, Number.NaN]) {
      expect(() => joinBattleScriptAttackCancelerMagicCoat(
        valid,
        [],
        invalidPc,
      )).toThrow(/source program counter must be a u32/);
    }
    for (const invalidStack of [
      null,
      [-1],
      [1.5],
      [0x1_0000_0000],
      Array(9).fill(PC),
    ]) {
      expect(() => joinBattleScriptAttackCancelerMagicCoat(
        valid,
        invalidStack as never,
        PC,
      )).toThrow(/BattleScriptsStack/);
    }
    expect(() => joinBattleScriptAttackCancelerMagicCoat(
      valid,
      Array(8).fill(PC),
      PC,
    )).toThrow(/cannot push a full BattleScriptsStack/);
    expect(() => joinBattleScriptAttackCancelerMagicCoat(
      valid,
      [],
      PC + 1,
    )).toThrow(/requires the continuing Factory-obedience cursor and marker/);
    for (const invalid of [
      { ...valid, kind: "continue", effect: 1 },
      { ...valid, kind: "moves-block", effect: 0 },
      { ...valid, receipt: null },
      {
        ...valid,
        rulesContext: Object.freeze({
          ...valid.rulesContext,
          hitMarker:
            valid.rulesContext.hitMarker & ~BATTLE_SCRIPT_HITMARKER_OBEYS,
        }),
      },
    ]) {
      expect(() => joinBattleScriptAttackCancelerMagicCoat(
        invalid as never,
        [],
        PC,
      )).toThrow(/consistent Factory-obedience result|continuing Factory-obedience cursor and marker/);
    }
  });
});
