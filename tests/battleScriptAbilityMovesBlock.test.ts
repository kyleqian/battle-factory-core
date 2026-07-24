import { describe, expect, it } from "vitest";
import {
  advanceBattleScriptMovesBlockAbility,
  joinBattleScriptAttackCancelerMovesBlock,
  type BattleScriptMovesBlockState,
} from "../src/engine/battleScriptAbilityMovesBlock.ts";
import {
  advanceBattleScriptAttackCancelerUnableToUseMove,
} from "../src/engine/battleScriptAttackCanceler.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";
import movesData from "../src/data/gen/moves.json" with { type: "json" };

const PC = 0x0800_1234;
const TACKLE = 33;
const HYPER_VOICE = 304;
const SOURCE_SOUND_MOVES = [
  { move: "MOVE_GROWL", id: 45 },
  { move: "MOVE_ROAR", id: 46 },
  { move: "MOVE_SING", id: 47 },
  { move: "MOVE_SUPERSONIC", id: 48 },
  { move: "MOVE_SCREECH", id: 103 },
  { move: "MOVE_SNORE", id: 173 },
  { move: "MOVE_UPROAR", id: 253 },
  { move: "MOVE_METAL_SOUND", id: 319 },
  { move: "MOVE_GRASS_WHISTLE", id: 320 },
  { move: "MOVE_HYPER_VOICE", id: 304 },
] as const;

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
  });
}

function rules(
  attacker: 0 | 1,
  target: 0 | 1,
  changes: Partial<BattleScriptRulesContextInput> = {},
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
) {
  const battlers = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({ side: attacker, ...attackerChanges });
  battlers[target] = battler({ side: target, ...targetChanges });
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? battlers,
    selectorRoles: changes.selectorRoles ?? {
      attacker,
      target,
      effectBattler: target,
    },
    scriptingBattler: changes.scriptingBattler ?? 3,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_END,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? HYPER_VOICE,
    currentMovePosition: changes.currentMovePosition ?? 0,
    lastUsedAbility: changes.lastUsedAbility ?? 7,
    moveResultFlags: changes.moveResultFlags ?? 0x20,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0x40,
    multiHitCounter: changes.multiHitCounter ?? 0,
    multistringChooser: changes.multistringChooser ?? 9,
    battleMoveDamage: changes.battleMoveDamage ?? 777,
  });
}

function state(
  rulesContext = rules(
    0,
    1,
    {},
    {},
    { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
  ),
  changes: Partial<BattleScriptMovesBlockState> = {},
): BattleScriptMovesBlockState {
  return Object.freeze({
    rulesContext: changes.rulesContext ?? rulesContext,
    rngValue: changes.rngValue ?? 0xdead_beef,
    rngCallsConsumed: changes.rngCallsConsumed ?? 12,
  });
}

function expectDeepFrozen(value: unknown, seen = new Set<unknown>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value as Record<string, unknown>)) {
    expectDeepFrozen(child, seen);
  }
}

describe("post-canceler AbilityBattleEffects moves-block gate", () => {
  it("pins the exact generated source selectors and source constants", () => {
    expect(movesData.sourceTables.soundMoves).toEqual(SOURCE_SOUND_MOVES);
    expect(BATTLE_SCRIPT_ABILITY_SOUNDPROOF).toBe(43);
    expect(BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT).toBe(1 << 11);
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS).toBe(1 << 12);
  });

  it("blocks every and only source sound selector in both singles orientations", () => {
    for (const [index, selector] of SOURCE_SOUND_MOVES.entries()) {
      for (const [attacker, target] of [[0, 1], [1, 0]] as const) {
        const source = state(rules(
          attacker,
          target,
          {
            currentMove: selector.id,
            lastUsedAbility: 5,
          },
          {},
          { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
        ));
        const result = advanceBattleScriptMovesBlockAbility(source, PC);
        expect(result).toMatchObject({
          kind: "block",
          effect: 1,
          rngValue: source.rngValue,
          rngCallsConsumed: source.rngCallsConsumed,
          rulesContext: {
            currentMove: selector.id,
            lastUsedAbility: BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
            hitMarker: 0x40,
          },
          receipt: {
            arguments: {
              battler: { sourceArgument: "gBattlerTarget", value: target },
              ability: 0,
              special: 0,
              moveArg: 0,
            },
            targetAbility: {
              battler: target,
              value: BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
            },
            lastUsedAbility: {
              before: 5,
              after: BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
              isSoundproof: true,
            },
            move: { value: selector.id },
            soundMoveScan: {
              kind: "scanned",
              matchedIndex: index,
              isSoundMove: true,
              termination: {
                kind: "matching-move",
                index,
              },
            },
            attackerMultiTurn: {
              kind: "read",
              battler: attacker,
              isMultiTurn: false,
            },
            hitMarker: {
              before: 0x40,
              after: 0x40,
              addedMask: 0,
              clearedMask: 0,
            },
            programCounter: {
              kind: "handoff",
              sourceProgramCounter: PC,
              targetLabel: "BattleScript_SoundproofProtected",
            },
            rng: {
              callsConsumed: 0,
            },
          },
        });
        if (result.receipt.soundMoveScan.kind !== "scanned") {
          throw new Error("expected a source table scan");
        }
        expect(result.receipt.soundMoveScan.checked).toHaveLength(index + 1);
        expect(result.receipt.soundMoveScan.checked.at(-1)).toEqual({
          index,
          move: selector.id,
          sourceSymbol: selector.move,
          matches: true,
        });
      }
    }

    for (const move of [0, TACKLE, 49, 63, 303, 354]) {
      const result = advanceBattleScriptMovesBlockAbility(
        state(rules(
          0,
          1,
          { currentMove: move, lastUsedAbility: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
          {},
          { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
        )),
        PC,
      );
      expect(result.kind).toBe("continue");
      expect(result.effect).toBe(0);
      expect(result.receipt.soundMoveScan).toMatchObject({
        kind: "scanned",
        matchedIndex: null,
        isSoundMove: false,
        termination: {
          kind: "sentinel",
          sourceConstant: "SOUND_MOVES_END",
          value: 0xffff,
        },
      });
      if (result.receipt.soundMoveScan.kind !== "scanned") {
        throw new Error("expected a source table scan");
      }
      expect(result.receipt.soundMoveScan.checked).toHaveLength(10);
      expect(result.receipt.soundMoveScan.checked.every(({ matches }) => !matches))
        .toBe(true);
      expect(result.receipt.programCounter).toEqual({
        kind: "preserve",
        sourceProgramCounter: PC,
      });
    }
  });

  it("uses the target ability as gLastUsedAbility and scans only for Soundproof", () => {
    const sourceRules = rules(
      0,
      1,
      { currentMove: HYPER_VOICE, lastUsedAbility: 99 },
      {},
      { ability: 17 },
    );
    const result = advanceBattleScriptMovesBlockAbility(state(sourceRules), PC);
    expect(result).toMatchObject({
      kind: "continue",
      effect: 0,
      rulesContext: { lastUsedAbility: 17, hitMarker: 0x40 },
      receipt: {
        targetAbility: {
          sourceField: "gBattleMons[battler].ability",
          battler: 1,
          value: 17,
        },
        lastUsedAbility: {
          sourceField: "gLastUsedAbility",
          before: 99,
          after: 17,
          sourceResolution:
            "special == 0 ? gBattleMons[battler].ability : special",
          isSoundproof: false,
        },
        move: {
          sourceField: "gCurrentMove",
          sourceResolution: "moveArg == 0 ? gCurrentMove : moveArg",
          value: HYPER_VOICE,
        },
        soundMoveScan: {
          kind: "not-scanned",
          reason: "last-used-ability-is-not-soundproof",
        },
        attackerMultiTurn: {
          kind: "not-read",
          reason: "move-was-not-blocked",
        },
        programCounter: {
          kind: "preserve",
          sourceProgramCounter: PC,
        },
      },
    });
    expect(result.rulesContext).not.toBe(sourceRules);
    expect(result.rulesContext.battlers).toBe(sourceRules.battlers);

    const alreadyResolved = rules(
      1,
      0,
      {
        currentMove: TACKLE,
        lastUsedAbility: BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
      },
      {},
      { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
    );
    const preserved = advanceBattleScriptMovesBlockAbility(
      state(alreadyResolved),
      PC,
    );
    expect(preserved.kind).toBe("continue");
    expect(preserved.rulesContext).toBe(alreadyResolved);
  });

  it("adds NO_PPDEDUCT only when a blocked attack was already multi-turn", () => {
    for (const attacker of [0, 1] as const) {
      for (const isMultiTurn of [false, true]) {
        const target = (attacker ^ 1) as 0 | 1;
        const source = state(rules(
          attacker,
          target,
          {
            currentMove: HYPER_VOICE,
            hitMarker: 0x40,
          },
          {
            status2: isMultiTurn
              ? BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS | 7
              : 7,
          },
          { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
        ));
        const result = advanceBattleScriptMovesBlockAbility(source, PC);
        expect(result.kind).toBe("block");
        expect(result.rulesContext.hitMarker).toBe(
          isMultiTurn ? 0x840 : 0x40,
        );
        expect(result.receipt.hitMarker.addedMask).toBe(
          isMultiTurn ? BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT : 0,
        );
        expect(result.receipt.attackerMultiTurn).toMatchObject({
          kind: "read",
          battler: attacker,
          value: isMultiTurn ? 0x1007 : 7,
          mask: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
          isMultiTurn,
        });
      }
    }

    const nonBlockedMultiTurn = advanceBattleScriptMovesBlockAbility(
      state(rules(
        0,
        1,
        { currentMove: TACKLE },
        { status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS },
        { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
      )),
      PC,
    );
    expect(nonBlockedMultiTurn.rulesContext.hitMarker).toBe(0x40);
    expect(nonBlockedMultiTurn.receipt.attackerMultiTurn).toEqual({
      kind: "not-read",
      reason: "move-was-not-blocked",
    });
  });

  it("joins only after a zero-effect supplied canceler result", () => {
    const clearRules = rules(
      0,
      1,
      {
        atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_END,
        currentMove: HYPER_VOICE,
        lastUsedAbility: 5,
      },
      {},
      { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
    );
    const clearCanceler = advanceBattleScriptAttackCancelerUnableToUseMove(
      state(clearRules),
      PC,
    );
    const blocked = joinBattleScriptAttackCancelerMovesBlock(clearCanceler, PC);
    expect(blocked).toMatchObject({
      kind: "moves-block",
      effect: 1,
      rulesContext: { lastUsedAbility: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
      receipt: {
        sourceFunction: "Cmd_attackcanceler",
        sourceCondition: "AtkCanceler_UnableToUseMove() == 0",
        movesBlock: {
          sourceCase: "ABILITYEFFECT_MOVES_BLOCK",
          effect: 1,
        },
      },
    });
    expect(blocked.receipt.canceler).toBe(clearCanceler.receipt);
    expectDeepFrozen(blocked);

    const stoppedRules = rules(
      1,
      0,
      {
        atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_ASLEEP,
        currentMove: HYPER_VOICE,
        lastUsedAbility: 5,
      },
      { status1: 3 },
      { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
    );
    const stoppedCanceler = advanceBattleScriptAttackCancelerUnableToUseMove(
      state(stoppedRules),
      PC,
    );
    expect(stoppedCanceler.effect).toBe(2);
    const bypassed = joinBattleScriptAttackCancelerMovesBlock(
      stoppedCanceler,
      PC,
    );
    expect(bypassed).toMatchObject({
      kind: "canceler-effect",
      effect: 2,
      rulesContext: { lastUsedAbility: 5 },
      receipt: {
        sourceCondition: "AtkCanceler_UnableToUseMove() != 0",
        movesBlock: {
          kind: "not-called",
          reason: "canceler-effect-nonzero",
        },
      },
    });
    expect(bypassed.rulesContext).toBe(stoppedCanceler.rulesContext);
    expect(bypassed.rngValue).toBe(stoppedCanceler.rngValue);
    expect(bypassed.rngCallsConsumed).toBe(stoppedCanceler.rngCallsConsumed);
    expectDeepFrozen(bypassed);

    const effectOneRules = rules(
      0,
      1,
      {
        atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TRUANT,
        currentMove: HYPER_VOICE,
        lastUsedAbility: 5,
      },
      { ability: 54, truantCounter: 1 },
      { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
    );
    const effectOneCanceler = advanceBattleScriptAttackCancelerUnableToUseMove(
      state(effectOneRules),
      PC,
    );
    expect(effectOneCanceler.effect).toBe(1);
    expect(joinBattleScriptAttackCancelerMovesBlock(
      effectOneCanceler,
      PC,
    )).toMatchObject({
      kind: "canceler-effect",
      effect: 1,
      rulesContext: { lastUsedAbility: 5 },
      receipt: {
        movesBlock: { kind: "not-called" },
      },
    });
  });

  it("is deterministic, input-immutable, deeply frozen, and consumes zero RNG", () => {
    const source = state(
      rules(
        1,
        0,
        {
          currentMove: HYPER_VOICE,
          lastUsedAbility: 9,
          hitMarker: 0x8000_0040,
        },
        {
          status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
        },
        { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
      ),
      {
        rngValue: 0x1234_5678,
        rngCallsConsumed: 987,
      },
    );
    const before = JSON.stringify(source);
    const first = advanceBattleScriptMovesBlockAbility(source, PC);
    const replay = advanceBattleScriptMovesBlockAbility(source, PC);
    expect(replay).toEqual(first);
    expect(JSON.stringify(source)).toBe(before);
    expect(first.rngValue).toBe(0x1234_5678);
    expect(first.rngCallsConsumed).toBe(987);
    expect(first.receipt.rng).toEqual({
      kind: "preserve",
      before: 0x1234_5678,
      after: 0x1234_5678,
      callsBefore: 987,
      callsAfter: 987,
      callsConsumed: 0,
    });
    expectDeepFrozen(first);
  });

  it("rejects invalid state, PC, roles, RNG accounting, and rules context", () => {
    expect(() => advanceBattleScriptMovesBlockAbility(
      null as never,
      PC,
    )).toThrow(/requires a state object/);
    expect(() => advanceBattleScriptMovesBlockAbility(
      { ...state(), rulesContext: null as never },
      PC,
    )).toThrow(/requires a typed rules context/);
    expect(() => advanceBattleScriptMovesBlockAbility(
      state(rules(0, 1, { selectorRoles: { attacker: 0 } })),
      PC,
    )).toThrow(/requires a target role/);
    expect(() => advanceBattleScriptMovesBlockAbility(
      state(rules(
        0,
        1,
        {
          selectorRoles: { target: 1 },
          currentMove: HYPER_VOICE,
        },
        {},
        { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
      )),
      PC,
    )).toThrow(/requires an attacker role when Soundproof blocks/);

    const noAttackerRead = advanceBattleScriptMovesBlockAbility(
      state(rules(
        0,
        1,
        {
          selectorRoles: { target: 1 },
          currentMove: TACKLE,
        },
        {},
        { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
      )),
      PC,
    );
    expect(noAttackerRead.kind).toBe("continue");
    expect(noAttackerRead.receipt.attackerMultiTurn.kind).toBe("not-read");

    for (const invalidPc of [-1, 1.5, 0x1_0000_0000, Number.NaN]) {
      expect(() => advanceBattleScriptMovesBlockAbility(
        state(),
        invalidPc,
      )).toThrow(/source program counter must be a u32/);
    }
    for (const rngValue of [-1, 1.5, 0x1_0000_0000, Number.NaN]) {
      expect(() => advanceBattleScriptMovesBlockAbility(
        { ...state(), rngValue },
        PC,
      )).toThrow(/moves-block RNG value must be a u32/);
    }
    for (const rngCallsConsumed of [-1, 1.5, Number.NaN]) {
      expect(() => advanceBattleScriptMovesBlockAbility(
        { ...state(), rngCallsConsumed },
        PC,
      )).toThrow(/not a valid nonnegative RNG call count/);
    }
    expect(() => createBattleScriptRulesContext({
      ...rules(0, 1),
      lastUsedAbility: 256,
    })).toThrow(/lastUsedAbility/);
    expect(() => joinBattleScriptAttackCancelerMovesBlock(
      null as never,
      PC,
    )).toThrow(/requires a canceler result/);
  });
});
