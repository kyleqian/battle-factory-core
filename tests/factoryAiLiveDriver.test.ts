import { describe, expect, it } from "vitest";
import {
  createBattleCommandRequest,
  createBattleState,
  type BattleDecisionReducer,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import {
  createFactoryAiBattleHistory,
  createFactoryAiViewFromLiveRules,
  FACTORY_AI_ACTION_GATE,
  recordFactoryAiKnownAbility,
  recordFactoryAiKnownItemEffect,
  submitLiveFactoryAiDecision,
  syncFactoryAiBattleHistory,
  type FactoryAiLiveRules,
} from "../src/engine/factoryAiLiveDriver.ts";

const SURF = 57;
const ROCK_SLIDE = 157;
const BODY_SLAM = 34;
const THUNDERBOLT = 85;
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);

function battler(input: Readonly<{
  side: 0 | 1;
  species: number;
  ability: number;
  moves: readonly [number, number, number, number];
  types: readonly [string, string];
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  hp: number;
  maxHP: number;
  partyIndex?: number;
}>): BattleScriptRulesBattler {
  return {
    ...input,
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
    partyIndex: input.partyIndex ?? 0,
  };
}

function liveRules(
  lastPlayerMove = 0,
  playerPartyIndex = 0,
  observations: Readonly<{
    abilityIds?: readonly number[];
    itemEffects?: readonly number[];
  }> = {},
  scenario: Readonly<{
    trainerMoves?: readonly [number, number, number, number];
    lastLandedMove?: number;
    lastHitBy?: number;
    opponentBench?: readonly Readonly<{
      species: number;
      abilityNum?: 0 | 1;
      moves: readonly [number, number, number, number];
    }>[];
  }> = {},
): BattleScriptRulesContext {
  const empty = battler({
    side: 0,
    species: 0,
    ability: 0,
    moves: [0, 0, 0, 0],
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    speed: 0,
    hp: 0,
    maxHP: 0,
  });
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        species: 105,
        ability: 69,
        moves: [70, 0, 0, 0],
        types: ["TYPE_GROUND", "TYPE_GROUND"],
        attack: 130,
        defense: 130,
        spAttack: 55,
        spDefense: 70,
        speed: 65,
        hp: 135,
        maxHP: 135,
        partyIndex: playerPartyIndex,
      }),
      battler({
        side: 1,
        species: 65,
        ability: 0,
        moves: scenario.trainerMoves ?? [SURF, ROCK_SLIDE, BODY_SLAM, THUNDERBOLT],
        types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
        attack: 55,
        defense: 65,
        spAttack: 135,
        spDefense: 105,
        speed: 140,
        hp: 135,
        maxHP: 135,
      }),
      empty,
      { ...empty, side: 1 },
    ],
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
      battleTypeFlags:
        BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    aiObservedAbilityIds: observations.abilityIds,
    aiObservedItemEffects: observations.itemEffects,
    moveHistory: {
      lastMoves: [lastPlayerMove, 0, 0, 0],
      lastLandedMoves: [0, scenario.lastLandedMove ?? 0, 0, 0],
      lastHitBy: [0xff, scenario.lastHitBy ?? 0xff, 0xff, 0xff],
    },
    ...(scenario.opponentBench === undefined
      ? {}
      : {
        party: {
          player: [
            { species: 105, hp: 135, maxHP: 135, moves: [70, 0, 0, 0] },
            {}, {}, {}, {}, {},
          ],
          opponent: [
            {
              species: 65,
              hp: 135,
              maxHP: 135,
              moves: scenario.trainerMoves ?? [SURF, ROCK_SLIDE, BODY_SLAM, THUNDERBOLT],
            },
            ...scenario.opponentBench.map((member) => ({
              ...member,
              hp: 100,
              maxHP: 100,
            })),
            ...new Array(5 - scenario.opponentBench.length).fill({}),
          ],
        },
      }),
  });
}

const request = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: [
    { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    { kind: "use-move", moveSlot: 2, targetBattler: 0 },
    { kind: "use-move", moveSlot: 3, targetBattler: 0 },
  ],
});

const requestWithSwitch = createBattleCommandRequest({
  ...request,
  legalDecisions: [...request.legalDecisions, { kind: "switch", partyIndex: 1 }],
});

function liveState(
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
): BattleState<FactoryAiLiveRules> {
  return createBattleState({
    rules: { rulesContext } as FactoryAiLiveRules,
    rngSeed,
    request: requestWithSwitch,
  });
}

function terminalReducer(
  observedRequests: Array<unknown> = [],
): BattleDecisionReducer<FactoryAiLiveRules> {
  return (context) => {
    observedRequests.push(context.request);
    return {
      rules: context.rules,
      events: [],
      boundary: { kind: "terminal", outcome: "player-win" },
    };
  };
}

describe("live Factory AI rules adapter (Gate-5 rung 6)", () => {
  it("runs ShouldSwitch first and submits its successful switch through the original request/reducer", () => {
    const rulesContext = liveRules(0, 0, {}, {
      trainerMoves: [BODY_SLAM, 0, 0, 0],
      lastLandedMove: SURF,
      lastHitBy: 0,
      opponentBench: [{ species: 134, moves: [SURF, 0, 0, 0] }],
    });
    const observedRequests: unknown[] = [];
    const result = submitLiveFactoryAiDecision(
      liveState(rulesContext, 3),
      createFactoryAiBattleHistory(rulesContext),
      { factoryWinStreak: 28, trainerOpponentId: 222 },
      terminalReducer(observedRequests),
    );

    expect(result.phase).toBe("switch");
    expect(result.submission.decision).toEqual({ kind: "switch", partyIndex: 1 });
    expect(result.switchPolicy.draws.map(({ reason }) => reason))
      .toEqual(["absorber-party-1"]);
    expect(result.rng.calls).toBe(1);
    expect(result.transition.state.rng).toEqual(result.rng);
    expect(observedRequests).toEqual([requestWithSwitch]);
    expect(result.actionGate).toBe(FACTORY_AI_ACTION_GATE);
  });

  it("passes the failed precheck cursor into the unchanged 11-draw move policy", () => {
    const rulesContext = liveRules(0, 0, {}, {
      opponentBench: [{ species: 132, moves: [BODY_SLAM, 0, 0, 0] }],
    });
    const history = createFactoryAiBattleHistory(rulesContext);
    const state = liveState(rulesContext, 919694434);
    const result = submitLiveFactoryAiDecision(
      state,
      history,
      { factoryWinStreak: 28, trainerOpponentId: 222 },
      terminalReducer(),
    );
    expect(result.phase).toBe("move");
    if (result.phase !== "move") throw new Error("expected move phase");

    const expectedSuffix = chooseFactoryAiScoredDecision({
      view: result.view,
      request,
      rng: result.switchPolicy.rng,
    });
    expect(result.switchPolicy.draws.map(({ reason }) => reason)).toEqual([
      "absorber-active-super-effective-reluctance",
      "active-super-effective-move-0",
    ]);
    expect(result.trace.draws).toEqual(expectedSuffix.trace.draws);
    expect(result.trace.draws).toHaveLength(11);
    expect(result.rng).toEqual(expectedSuffix.rng);
    expect(result.rng.calls).toBe(result.switchPolicy.draws.length + 11);
    expect(result.transition.state.rng).toEqual(result.rng);
  });

  it("preserves the 13-draw all-Surf scoring carrier after the failed precheck prefix", () => {
    const rulesContext = liveRules(0, 0, {}, {
      trainerMoves: [SURF, SURF, SURF, SURF],
      opponentBench: [{ species: 132, moves: [BODY_SLAM, 0, 0, 0] }],
    });
    const result = submitLiveFactoryAiDecision(
      liveState(rulesContext, 919694434),
      createFactoryAiBattleHistory(rulesContext),
      { factoryWinStreak: 28, trainerOpponentId: 222 },
      terminalReducer(),
    );
    expect(result.phase).toBe("move");
    if (result.phase !== "move") throw new Error("expected move phase");

    const allSurfRequest = createBattleCommandRequest({
      ...request,
      legalDecisions: request.legalDecisions.map((decision) => ({
        ...decision,
      })),
    });
    const expectedSuffix = chooseFactoryAiScoredDecision({
      view: result.view,
      request: allSurfRequest,
      rng: result.switchPolicy.rng,
    });
    expect(result.trace.draws).toEqual(expectedSuffix.trace.draws);
    expect(result.trace.draws).toHaveLength(13);
    expect(result.rng.calls).toBe(result.switchPolicy.draws.length + 13);
    expect(result.rng).toEqual(expectedSuffix.rng);
  });

  it("reproduces the banked Alakazam-vs-Marowak mask-7 decision and 11-draw ledger", () => {
    const rulesContext = liveRules();
    const history = createFactoryAiBattleHistory(rulesContext);
    const liveView = createFactoryAiViewFromLiveRules({
      rulesContext,
      history,
      challenge: { factoryWinStreak: 28, trainerOpponentId: 222 },
    });
    const stagedView: FactoryAiScoredView = {
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: { aiBattler: 1, targetBattler: 0 },
      factory: {
        levelMode: 0,
        battleMode: 0,
        factoryWinStreak: 28,
        trainerOpponentId: 222,
      },
      moves: [SURF, ROCK_SLIDE, BODY_SLAM, THUNDERBOLT],
      attacker: {
        types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
        attack: 55,
        defense: 65,
        spAttack: 135,
        spDefense: 105,
        speed: 140,
        level: 50,
        statStages: { atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6 },
        isFirstTurn: 2,
        hp: 135,
        maxHp: 135,
        ability: "ABILITY_NONE",
        lightScreenUp: false,
        reflectUp: false,
        isRooted: false,
      },
      target: {
        species: 105,
        types: ["TYPE_GROUND", "TYPE_GROUND"],
        attack: 130,
        defense: 130,
        spAttack: 55,
        spDefense: 70,
        speed: 65,
        level: 50,
        statStages: { atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6 },
        isFirstTurn: 2,
        hp: 135,
        maxHp: 135,
        lastUsedMoveId: 0,
        isToxicPoisoned: false,
        isLeechSeeded: false,
        isCursed: false,
        ability: "ABILITY_ROCK_HEAD",
        knownAbility: null,
        knownItemEffect: 0,
      },
    };

    expect(liveView).toEqual(stagedView);
    const live = chooseFactoryAiScoredDecision({
      view: liveView,
      request,
      rng: { value: 919694434, calls: 0 },
    });
    const staged = chooseFactoryAiScoredDecision({
      view: stagedView,
      request,
      rng: { value: 919694434, calls: 0 },
    });
    expect(live).toEqual(staged);
    expect(live.trace.draws).toHaveLength(11);
    expect(live.submission.decision).toEqual({
      kind: "use-move",
      moveSlot: 0,
      targetBattler: 0,
    });
  });

  it("accumulates target moves, persists observed facts, and clears move/ability history on switch", () => {
    const initialRules = liveRules(70);
    let history = syncFactoryAiBattleHistory(
      createFactoryAiBattleHistory(initialRules),
      initialRules,
    );
    history = recordFactoryAiKnownAbility(history, 0, "ABILITY_ROCK_HEAD");
    history = recordFactoryAiKnownItemEffect(history, 0, 29);
    history = syncFactoryAiBattleHistory(history, liveRules(89));
    expect(history.usedMoves[0]).toEqual([70, 89]);
    expect(history.knownAbilities[0]).toBe("ABILITY_ROCK_HEAD");
    expect(history.knownItemEffects[0]).toBe(29);

    history = syncFactoryAiBattleHistory(history, liveRules(0, 1));
    expect(history.usedMoves[0]).toEqual([]);
    expect(history.knownAbilities[0]).toBeNull();
    // Source switch/faint setup clears move+ability history, not itemEffects.
    expect(history.knownItemEffects[0]).toBe(29);
  });

  it("sync consumes production reveal handoffs and projects known ability/item facts into the trainer view", () => {
    const rules = liveRules(0, 0, {
      abilityIds: [9, 0, 0, 0],
      itemEffects: [29, 0, 0, 0],
    });
    const history = syncFactoryAiBattleHistory(createFactoryAiBattleHistory(rules), rules);
    expect(history.knownAbilities[0]).toBe("ABILITY_STATIC");
    expect(history.knownItemEffects[0]).toBe(29);
    const view = createFactoryAiViewFromLiveRules({
      rulesContext: rules,
      history,
      challenge: { factoryWinStreak: 28, trainerOpponentId: 222 },
    });
    expect(view.target.knownAbility).toBe("ABILITY_STATIC");
    expect(view.target.knownItemEffect).toBe(29);
  });
});
