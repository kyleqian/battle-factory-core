import { describe, expect, it } from "vitest";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { advanceBattleScriptAttackCancelerConfused } from "../src/engine/battleScriptActionAdmission.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_ATTACK_CANCELER_PHASES } from "../src/engine/battleScriptSourceConstants.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";
import { chooseFactoryAiScoredDecision } from "../src/engine/factoryAiDecisionPolicy.ts";
import {
  createFactoryAiBattleHistory,
  createFactoryAiViewFromLiveRules,
  syncFactoryAiBattleHistory,
} from "../src/engine/factoryAiLiveDriver.ts";
import {
  runTryToFaint,
  type FactoryAiTryToFaintBattler,
  type FactoryAiTryToFaintTarget,
} from "../src/engine/factoryAiTryToFaint.ts";

// aiv267. Expected numbers are computed by hand from pokemon.c CalculateBaseDamage (level 50: 2 * 50 / 5 + 2 = 22):
//   damage = trunc(trunc(trunc(atk * power * 22) / def) / 50) [screen: / 2] + 2.

const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const MOVE_POUND = 1; // power 40, Normal, physical
const MOVE_TACKLE = 33; // power 35, Normal, physical
const MOVE_SURF = 57; // power 95, Water, special
const PIKACHU = 25;
const MAROWAK = 105;
const DITTO = 132;
const LATIAS = 407;
const ITEM_CHOICE_BAND = 186;
const ITEM_SOUL_DEW = 191;
const ITEM_LIGHT_BALL = 202;
const ITEM_SILK_SCARF = 217; // HOLD_EFFECT_NORMAL_POWER, param 10
const ITEM_METAL_POWDER = 223;
const ITEM_THICK_CLUB = 224;

const NEUTRAL_STAGES = Object.freeze({
  atk: DEFAULT_STAT_STAGE,
  def: DEFAULT_STAT_STAGE,
  spAtk: DEFAULT_STAT_STAGE,
  spDef: DEFAULT_STAT_STAGE,
});

const ATTACKER: FactoryAiTryToFaintBattler = Object.freeze({
  attack: 100,
  defense: 100,
  spAttack: 100,
  spDefense: 100,
  level: 50,
  types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
  statStages: NEUTRAL_STAGES,
});

function target(overrides: Partial<FactoryAiTryToFaintTarget>): FactoryAiTryToFaintTarget {
  return Object.freeze({
    ...ATTACKER,
    hp: 999,
    ability: "ABILITY_NONE",
    ...overrides,
  });
}

function sim(moveId: number, hp: number, overrides: Partial<FactoryAiTryToFaintTarget>) {
  return runTryToFaint({
    rng: { value: 0, calls: 0 },
    moveId,
    movesetIndex: 0,
    moveset: [moveId, 0, 0, 0],
    simulatedRng: [100, 100, 100, 100],
    attacker: ATTACKER,
    target: target({ hp, ...overrides }),
    drawOrdinalStart: 1,
    reasonPrefix: "aiv267",
  });
}

describe("fix A: AI damage sims pass the target side's screens (AI_CalcDmg, battle_script_commands.c:1306-1309)", () => {
  // Pound vs 100 / 100: 880 / 50 = 17, +2 = 19. Reflect: 17 / 2 = 8, +2 = 10.
  it("Reflect on the target side halves a physical estimate (can-faint boundary 19 -> 10)", () => {
    expect(sim(MOVE_POUND, 10, { targetSideReflectUp: true }).canFaint).toBe(true);
    expect(sim(MOVE_POUND, 11, { targetSideReflectUp: true }).canFaint).toBe(false); // fails unfixed (19 >= 11)
    expect(sim(MOVE_POUND, 19, {}).canFaint).toBe(true);
    expect(sim(MOVE_POUND, 20, {}).canFaint).toBe(false);
  });

  // Surf vs 100 / 100: 100 * 95 * 22 / 100 / 50 = 41, +2 = 43. Light Screen: 41 / 2 = 20, +2 = 22.
  it("Light Screen on the target side halves a special estimate (43 -> 22)", () => {
    expect(sim(MOVE_SURF, 22, { targetSideLightScreenUp: true }).canFaint).toBe(true);
    expect(sim(MOVE_SURF, 23, { targetSideLightScreenUp: true }).canFaint).toBe(false); // fails unfixed (43 >= 23)
    expect(sim(MOVE_SURF, 43, {}).canFaint).toBe(true);
    expect(sim(MOVE_SURF, 44, {}).canFaint).toBe(false);
  });

  it("the wrong screen does nothing: Light Screen leaves physical at 19, Reflect leaves special at 43", () => {
    expect(sim(MOVE_POUND, 19, { targetSideLightScreenUp: true }).canFaint).toBe(true);
    expect(sim(MOVE_POUND, 20, { targetSideLightScreenUp: true }).canFaint).toBe(false);
    expect(sim(MOVE_SURF, 43, { targetSideReflectUp: true }).canFaint).toBe(true);
    expect(sim(MOVE_SURF, 44, { targetSideReflectUp: true }).canFaint).toBe(false);
  });

  it("get_how_powerful_move_is ranks the moveset with the same screened estimates", () => {
    // Surf slot 0 at simulatedRNG 50: unscreened 43 * 50 / 100 = 21 > Pound 19 (most powerful);
    // behind Light Screen 22 * 50 / 100 = 11 < Pound 19 (not most powerful).
    const power = (overrides: Partial<FactoryAiTryToFaintTarget>) => runTryToFaint({
      rng: { value: 0, calls: 0 },
      moveId: MOVE_SURF,
      movesetIndex: 0,
      moveset: [MOVE_SURF, MOVE_POUND, 0, 0],
      simulatedRng: [50, 100, 100, 100],
      attacker: ATTACKER,
      target: target(overrides),
      drawOrdinalStart: 1,
      reasonPrefix: "aiv267",
    }).mostPowerful;
    expect(power({})).toBe("most-powerful");
    expect(power({ targetSideLightScreenUp: true })).toBe("not-most-powerful"); // fails unfixed
  });
});

const request = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: ([0, 1, 2, 3] as const).map((moveSlot) => ({
    kind: "use-move" as const,
    moveSlot,
    targetBattler: 0 as const,
  })),
});

function battler(side: 0 | 1, species: number, moves: readonly [number, number, number, number], extra: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return {
    side,
    species,
    ability: 0,
    moves,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    hp: 135,
    maxHP: 135,
    pp: [10, 10, 10, 10],
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    level: 50,
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    isFirstTurn: 2,
    partyIndex: 0,
    item: 0,
    ...extra,
  } as BattleScriptRulesBattler;
}

function rules(input: Readonly<{
  user?: Partial<BattleScriptRulesBattler>;
  target?: Partial<BattleScriptRulesBattler>;
  sideStatuses?: readonly [number, number];
  confusedUser?: boolean;
}> = {}): BattleScriptRulesContext {
  const empty = battler(0, 0, [0, 0, 0, 0]);
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, PIKACHU, [MOVE_TACKLE, 0, 0, 0], input.target ?? {}),
      battler(1, PIKACHU, [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE], {
        ...(input.confusedUser === true ? { status2: 5 } : {}),
        ...(input.user ?? {}),
      }),
      empty,
      { ...empty, side: 1 },
    ],
    selectorRoles: { attacker: 1, target: 0, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_CONFUSED,
    battleOutcome: 0,
    currentMove: MOVE_TACKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    moveHistory: {
      lastMoves: [0, 0, 0, 0],
      lastLandedMoves: [0, 0, 0, 0],
      lastHitBy: [0xff, 0xff, 0xff, 0xff],
    },
    party: {
      player: [{ species: 1, hp: 100, maxHP: 100, status1: 0 }, ...new Array(5).fill({})],
      opponent: [{ species: 1, hp: 100, maxHP: 100, status1: 0 }, ...new Array(5).fill({})],
    },
    ...(input.sideStatuses === undefined ? {} : { sideStatuses: input.sideStatuses }),
  } as never);
}

function liveView(context: BattleScriptRulesContext) {
  const history = syncFactoryAiBattleHistory(createFactoryAiBattleHistory(context), context);
  return createFactoryAiViewFromLiveRules({
    rulesContext: context,
    history,
    challenge: { factoryWinStreak: 28, trainerOpponentId: 222 },
  });
}

describe("fix A: the live view carries the target's own side screens", () => {
  it("targetSideLightScreenUp / targetSideReflectUp come from the PLAYER side (sideStatuses[0]) only", () => {
    const playerSide = liveView(rules({ sideStatuses: [SIDE_STATUS_REFLECT | SIDE_STATUS_LIGHTSCREEN, 0] }));
    expect(playerSide.target.targetSideLightScreenUp).toBe(true); // fails unfixed (field absent)
    expect(playerSide.target.targetSideReflectUp).toBe(true);
    const aiSide = liveView(rules({ sideStatuses: [0, SIDE_STATUS_REFLECT | SIDE_STATUS_LIGHTSCREEN] }));
    expect(aiSide.target.targetSideLightScreenUp).toBeUndefined();
    expect(aiSide.target.targetSideReflectUp).toBeUndefined();
    expect(aiSide.attacker.lightScreenUp).toBe(true);
    expect(aiSide.attacker.reflectUp).toBe(true);
  });

  it("end to end: Reflect on the player side stops Tackle from being scored as a faint", () => {
    // Tackle 35 vs 100 / 100: 770 / 50 = 15, +2 = 17; Reflect 15 / 2 = 7, +2 = 9. simulatedRng is 85..100, so a 12 HP target
    // always faints unscreened (17 * 85 / 100 = 14 >= 12) and never behind Reflect (9 <= 12 is false for 9 < 12).
    const score = (sideStatuses: readonly [number, number]) =>
      chooseFactoryAiScoredDecision({
        view: liveView(rules({ target: { hp: 12 }, sideStatuses })),
        request,
        rng: { value: 0x1234, calls: 0 } as never,
      }).trace.slotScores[0]!.tryToFaintDelta;
    expect(score([0, 0])).toBeGreaterThanOrEqual(4);
    expect(score([SIDE_STATUS_REFLECT, 0])).toBeLessThan(4); // fails unfixed (still can-faint)
    expect(score([0, SIDE_STATUS_REFLECT])).toBeGreaterThanOrEqual(4); // the AI's own Reflect is not the target's
  });
});

function selfHit(user: Partial<BattleScriptRulesBattler>, sideStatuses?: readonly [number, number]) {
  const context = rules({ user, confusedUser: true, ...(sideStatuses === undefined ? {} : { sideStatuses }) });
  // rng 0 -> advance -> Random() & 1 === 0 -> the self-hit branch (confused-continues would be lowBit 1).
  const result = advanceBattleScriptAttackCancelerConfused(context, 0x1234_5678, 0);
  if (result.kind === "not-at-source-phase") throw new Error("not at the confused canceler phase");
  expect(result.reason).toBe("confusion-self-hit");
  return result.rulesContext.battleMoveDamage;
}

describe("fix B: the confusion self-hit calc sees the confused battler's own hold item (battle_util.c:2157-2175)", () => {
  // Pound 40 vs 100 / 100: base 19.
  it("no item: 19 (control)", () => {
    expect(selfHit({})).toBe(19);
  });

  it("Choice Band: attack x1.5 -> 150 * 40 * 22 / 100 / 50 + 2 = 28", () => {
    expect(selfHit({ item: ITEM_CHOICE_BAND })).toBe(28); // fails unfixed (19)
  });

  it("Silk Scarf (Normal-power, param 10): power 44 -> 100 * 44 * 22 / 100 / 50 + 2 = 21", () => {
    expect(selfHit({ item: ITEM_SILK_SCARF })).toBe(21); // fails unfixed (19)
  });

  it("Thick Club on Marowak (attacker role): attack x2 -> 37; on a non-Cubone species it is inert (19)", () => {
    expect(selfHit({ item: ITEM_THICK_CLUB, species: MAROWAK })).toBe(37); // fails unfixed (19)
    expect(selfHit({ item: ITEM_THICK_CLUB, species: PIKACHU })).toBe(19);
  });

  it("Metal Powder on Ditto (DEFENDER role, same mon): defense x2 -> 100 * 40 * 22 / 200 / 50 + 2 = 10", () => {
    expect(selfHit({ item: ITEM_METAL_POWDER, species: DITTO })).toBe(10); // fails unfixed (19)
  });

  it("Light Ball only boosts special attack (Pound stays 19); Soul Dew is suppressed in a Frontier battle", () => {
    expect(selfHit({ item: ITEM_LIGHT_BALL, species: PIKACHU })).toBe(19);
    expect(selfHit({ item: ITEM_SOUL_DEW, species: LATIAS })).toBe(19);
  });

  it("a staged confusionDamage override keeps carrying no item (existing staged pins unchanged)", () => {
    const context = rules({ confusedUser: true, user: {
      item: ITEM_CHOICE_BAND,
      confusionDamage: { level: 50, attack: 100, defense: 100, attackStage: 6, defenseStage: 6, isBurned: false, hasGuts: false },
    } as never });
    const result = advanceBattleScriptAttackCancelerConfused(context, 0x1234_5678, 0);
    expect(result.rulesContext.battleMoveDamage).toBe(19);
  });
});

// parity-mac (docs/parity-mac/confusion-self-hit-explosion.md): pokemon.c:3229 halves the defender's Defense when the GLOBAL
// gBattleMoves[gCurrentMove].effect is EFFECT_EXPLOSION; the confusion call passes MOVE_POUND as `move` (battle_util.c:2173) but
// gCurrentMove is still the move the confused battler chose. ROM seed 218: Forretress, Explosion chosen, self-hit 31 (engine 16).
describe("confusion self-hit halves Defense when the chosen move is Explosion / Selfdestruct", () => {
  const selfHitWithChosenMove = (currentMove: number) => {
    const context = createBattleScriptRulesContext({ ...rules({ confusedUser: true }), currentMove });
    const result = advanceBattleScriptAttackCancelerConfused(context, 0x1234_5678, 0);
    if (result.kind === "not-at-source-phase") throw new Error("not at the confused canceler phase");
    expect(result.reason).toBe("confusion-self-hit");
    return result.rulesContext.battleMoveDamage;
  };

  it("Tackle chosen: Pound 40 vs 100 / 100 = 19 (control)", () => {
    expect(selfHitWithChosenMove(MOVE_TACKLE)).toBe(19);
  });

  it("Explosion (153) chosen: Defense 100 / 2 -> 100 * 40 * 22 / 50 / 50 + 2 = 37", () => {
    expect(selfHitWithChosenMove(153)).toBe(37); // fails unfixed (19)
  });

  it("Selfdestruct (120) chosen: the same EFFECT_EXPLOSION halving", () => {
    expect(selfHitWithChosenMove(120)).toBe(37); // fails unfixed (19)
  });
});
