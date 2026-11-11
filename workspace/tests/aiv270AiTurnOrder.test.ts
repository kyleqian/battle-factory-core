import { describe, expect, it } from "vitest";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import { chooseFactoryAiScoredDecision } from "../src/engine/factoryAiDecisionPolicy.ts";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";
import {
  createFactoryAiBattleHistory,
  createFactoryAiViewFromLiveRules,
  syncFactoryAiBattleHistory,
} from "../src/engine/factoryAiLiveDriver.ts";

// aiv270 cause B (ISSUES #204). `if_target_faster` / `if_user_faster` are GetWhoStrikesFirst(user, target, TRUE)
// (battle_ai_script_commands.c:Cmd_if_target_faster; battle_main.c:4605-4692): the effective speed of BOTH battlers
// includes Swift Swim / Chlorophyll weather doubling, the Speed stage, Macho Brace /2, paralysis /4 and Quick Claw
// (UINT_MAX when gRandomTurnNumber < 0xFFFF * param / 100). AI_CV_Paralyze draws its roll only when the target is faster.

const MOVE_THUNDER_WAVE = 86; // EFFECT_PARALYZE -> AI_CV_Paralyze (data/battle_ai_scripts.s:1524-1534)
const MOVE_TACKLE = 33;

const BASE = Object.freeze({
  speed: 100,
  speedStage: 6,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  isFirstTurn: 0,
  evasionStage: 6,
  accStage: 6,
  atkStage: 6,
  defStage: 6,
  spDefStage: 6,
  hp: 100,
  maxHp: 100,
  moves: [MOVE_THUNDER_WAVE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
});

function paralyze(attacker: Record<string, unknown>, target: Record<string, unknown>) {
  const result = runCheckViability({
    rng: { value: 1, calls: 0 },
    moveId: MOVE_THUNDER_WAVE,
    attacker: { ...BASE, ...attacker },
    target: { ...BASE, ...target },
    drawOrdinalStart: 1,
    reasonPrefix: "paralyze",
  });
  if (result.kind !== "scored") throw new Error("expected a scored result");
  return result;
}

const TARGET_FASTER = { scoreDelta: 3, kinds: ["paralyze-roll"] };
const TARGET_NOT_FASTER = { scoreDelta: 0, kinds: [] }; // own HP 100 > 70 JUMPs to End at zero

function expectOutcome(result: ReturnType<typeof paralyze>, expected: { scoreDelta: number; kinds: string[] }): void {
  expect(result.scoreDelta).toBe(expected.scoreDelta);
  expect(result.draws.map((d) => d.kind)).toEqual(expected.kinds);
}

describe("aiv270 B: AI if_target_faster sees the full GetWhoStrikesFirst speed of both battlers", () => {
  it("control: equal-ish plain speeds, target slower -> not faster", () => {
    expectOutcome(paralyze({ speed: 100 }, { speed: 50 }), TARGET_NOT_FASTER);
  });

  it("paralyzed ATTACKER (speed 100 -> 25) is slower than a speed-50 target", () => {
    expectOutcome(paralyze({ speed: 100, isParalyzed: true }, { speed: 50 }), TARGET_FASTER);
  });

  it("paralyzed TARGET (speed 100 -> 25) is slower than a speed-50 attacker", () => {
    expectOutcome(paralyze({ speed: 50 }, { speed: 100, isParalyzed: true }), TARGET_NOT_FASTER);
  });

  it("Macho Brace on the ATTACKER (100 -> 50) lets a speed-80 target outspeed it", () => {
    expectOutcome(paralyze({ speed: 100, turnOrderHoldEffect: "HOLD_EFFECT_MACHO_BRACE" }, { speed: 80 }), TARGET_FASTER);
  });

  it("Macho Brace on the TARGET (150 -> 75) no longer outspeeds a speed-100 attacker", () => {
    expectOutcome(paralyze({ speed: 100 }, { speed: 150, turnOrderHoldEffect: "HOLD_EFFECT_MACHO_BRACE" }), TARGET_NOT_FASTER);
  });

  it("Swift Swim target in rain (60 -> 120) outspeeds a speed-100 attacker; without weather it does not", () => {
    const target = { speed: 60, turnOrderAbility: "ABILITY_SWIFT_SWIM" };
    expectOutcome(paralyze({ speed: 100, turnOrderWeather: { isRaining: true } }, target), TARGET_FASTER);
    expectOutcome(paralyze({ speed: 100 }, target), TARGET_NOT_FASTER);
  });

  it("Chlorophyll ATTACKER in sun (60 -> 120) outspeeds a speed-100 target", () => {
    const attacker = { speed: 60, turnOrderAbility: "ABILITY_CHLOROPHYLL" };
    expectOutcome(paralyze({ ...attacker, turnOrderWeather: { isSunny: true } }, { speed: 100 }), TARGET_NOT_FASTER);
    expectOutcome(paralyze(attacker, { speed: 100 }), TARGET_FASTER);
  });

  it("Quick Claw target (param 20) procs when gRandomTurnNumber < trunc(0xFFFF * 20 / 100) = 13107 only", () => {
    const target = { speed: 1, turnOrderHoldEffect: "HOLD_EFFECT_QUICK_CLAW", turnOrderHoldEffectParam: 20 };
    expectOutcome(paralyze({ speed: 100, randomTurnNumber: 13106 }, target), TARGET_FASTER);
    expectOutcome(paralyze({ speed: 100, randomTurnNumber: 13107 }, target), TARGET_NOT_FASTER);
  });

  it("Speed stages still apply: target at +2 (x2) with speed 60 outspeeds a speed-100 attacker", () => {
    expectOutcome(paralyze({ speed: 100 }, { speed: 60, speedStage: 8 }), TARGET_FASTER);
  });

  it("a paralyzed attacker and a paralyzed target of equal speed tie: the shared tie draw is consumed", () => {
    const result = paralyze({ speed: 100, isParalyzed: true }, { speed: 100, isParalyzed: true });
    expect(result.draws[0]).toMatchObject({ kind: "target-faster-tie" });
  });
});

// ---- live view: the fields above must be carried from rulesContext (hand-computed expectations) ----

const ITEM_MACHO_BRACE = 181;
const ITEM_QUICK_CLAW = 183;
const ABILITY_SWIFT_SWIM = 33;
const ABILITY_CLOUD_NINE = 13;
const STATUS1_PARALYSIS = 1 << 6;
const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
const PIKACHU = 25;
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);

function liveBattler(side: 0 | 1, extra: Partial<BattleScriptRulesBattler> & { item?: number }): BattleScriptRulesBattler {
  return {
    side,
    species: PIKACHU,
    ability: 0,
    moves: [MOVE_THUNDER_WAVE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE],
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
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    partyIndex: 0,
    ...extra,
  } as BattleScriptRulesBattler;
}

function liveRules(
  user: Partial<BattleScriptRulesBattler> & { item?: number },
  target: Partial<BattleScriptRulesBattler> & { item?: number },
  extra: Readonly<{ weather?: number; randomTurnNumber?: number }> = {},
): BattleScriptRulesContext {
  const empty = liveBattler(0, { moves: [0, 0, 0, 0] });
  const mon = (species: number) => ({ species, hp: 100, maxHP: 100, status1: 0 });
  return createBattleScriptRulesContext({
    battlers: [liveBattler(0, target), liveBattler(1, user), empty, { ...empty, side: 1 }],
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
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
    moveHistory: { lastMoves: [0, 0, 0, 0], lastLandedMoves: [0, 0, 0, 0], lastHitBy: [0xff, 0xff, 0xff, 0xff] },
    party: {
      player: [mon(1), mon(2), mon(3), ...new Array(3).fill({})],
      opponent: [mon(1), mon(2), mon(3), ...new Array(3).fill({})],
    },
    ...(extra.weather === undefined ? {} : { weather: extra.weather }),
    ...(extra.randomTurnNumber === undefined ? {} : { randomTurnNumber: extra.randomTurnNumber }),
  } as never);
}

function liveView(context: BattleScriptRulesContext) {
  return createFactoryAiViewFromLiveRules({
    rulesContext: context,
    history: syncFactoryAiBattleHistory(createFactoryAiBattleHistory(context), context),
    challenge: { factoryWinStreak: 28, trainerOpponentId: 222 },
  });
}

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

function slot0Cv(context: BattleScriptRulesContext): number | null {
  return chooseFactoryAiScoredDecision({
    view: liveView(context),
    request,
    rng: { value: 1, calls: 0 } as never,
  }).trace.slotScores[0]!.checkViabilityDelta;
}

describe("aiv270 B: the live AI view carries both battlers' turn-order state from rulesContext", () => {
  it("fills paralysis, true abilities, true hold effects + param, weather and gRandomTurnNumber", () => {
    const v = liveView(liveRules(
      { status1: STATUS1_PARALYSIS, item: ITEM_MACHO_BRACE },
      { ability: ABILITY_SWIFT_SWIM, item: ITEM_QUICK_CLAW },
      { weather: B_WEATHER_RAIN_TEMPORARY, randomTurnNumber: 77 },
    ));
    expect(v.attacker.isParalyzed).toBe(true);
    expect(v.target.isParalyzed).toBeUndefined();
    expect(v.attacker.turnOrderHoldEffect).toBe("HOLD_EFFECT_MACHO_BRACE");
    expect(v.target.turnOrderHoldEffect).toBe("HOLD_EFFECT_QUICK_CLAW");
    expect(v.target.turnOrderHoldEffectParam).toBe(20);
    expect(v.target.turnOrderAbility).toBe("ABILITY_SWIFT_SWIM");
    expect(v.attacker.turnOrderWeather).toEqual({ isRaining: true, isSunny: false });
    expect(v.attacker.randomTurnNumber).toBe(77);
  });

  it("the TRUE target item is carried even though the AI has not observed it (holdEffect stays history-based)", () => {
    const v = liveView(liveRules({}, { item: ITEM_MACHO_BRACE }));
    expect(v.target.turnOrderHoldEffect).toBe("HOLD_EFFECT_MACHO_BRACE");
    expect(v.target.holdEffect ?? 0).toBe(0);
  });

  it("Cloud Nine on either battler suppresses the weather term (WEATHER_HAS_EFFECT)", () => {
    const v = liveView(liveRules({}, { ability: ABILITY_CLOUD_NINE }, { weather: B_WEATHER_RAIN_TEMPORARY }));
    expect(v.attacker.turnOrderWeather).toEqual({});
  });

  it("end to end: a paralyzed AI user makes a speed-50 target faster, so Thunder Wave reaches the +3 paralyze roll", () => {
    const base = slot0Cv(liveRules({ speed: 100 }, { speed: 50 }));
    const paralyzed = slot0Cv(liveRules({ speed: 100, status1: STATUS1_PARALYSIS }, { speed: 50 }));
    expect(base).toBe(0);
    expect(paralyzed).toBe(3);
  });

  it("end to end: Macho Brace on the AI user (100 -> 50) makes a speed-80 target faster", () => {
    expect(slot0Cv(liveRules({ speed: 100 }, { speed: 80 }))).toBe(0);
    expect(slot0Cv(liveRules({ speed: 100, item: ITEM_MACHO_BRACE }, { speed: 80 }))).toBe(3);
  });
});
