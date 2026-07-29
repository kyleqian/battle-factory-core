import { describe, expect, it } from "vitest";
import {
  createBattleCommandRequest,
  createBattleState,
  type BattleCommandRequest,
  type BattleDecisionReducer,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS1_SLEEP } from "../src/engine/battleScriptSourceConstants.ts";
import {
  createFactoryAiBattleHistory,
  recordFactoryAiKnownAbility,
  recordFactoryAiKnownItemEffect,
  submitLiveFactoryAiDecision,
  syncFactoryAiBattleHistory,
  type FactoryAiBattleHistory,
  type FactoryAiChallengePolicy,
  type FactoryAiLiveRules,
} from "../src/engine/factoryAiLiveDriver.ts";
import { TRAINER_FRONTIER_BRAIN } from "../src/engine/factoryAiMaskSelection.ts";
import { evaluateFactoryAiSwitchPolicy } from "../src/engine/factoryAiSwitchPolicy.ts";

const TRAINER_FACTORY =
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY;
const ORDINARY_TRAINER = 222;
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);
const EMPTY: BattleScriptPartyMemberInput = Object.freeze({
  species: 0,
  isEgg: false,
  hp: 0,
});

const MOVE_WATER_GUN = 55;
const MOVE_SURF = 57;
const MOVE_ICE_BEAM = 58;
const MOVE_TOXIC = 92;
const MOVE_SMOKESCREEN = 108;
const MOVE_SWIFT = 129;
const MOVE_SPLASH = 150;
const MOVE_PROTECT = 182;
const MOVE_TACKLE = 33;
const MOVE_GROWL = 45;
const MOVE_FLAMETHROWER = 53;

type ActiveSpec = Readonly<{
  species: number;
  ability: number;
  types: readonly [string, string];
  moves: readonly [number, number, number, number];
  hp?: number;
  maxHP?: number;
  status1?: number;
  partyIndex?: number;
}>;

type BenchSpec = Readonly<{
  species: number;
  moves: readonly [number, number, number, number];
  abilityNum?: 0 | 1;
}>;

type FixtureSpec = Readonly<{
  player: ActiveSpec;
  trainer: ActiveSpec;
  bench: readonly [BenchSpec, BenchSpec];
  lastPlayerMove?: number;
  lastLandedMove?: number;
  lastHitBy?: number;
  legalMoveSlots?: readonly (0 | 1 | 2 | 3)[];
}>;

function battler(side: 0 | 1, spec: ActiveSpec): BattleScriptRulesBattler {
  return {
    side,
    species: spec.species,
    ability: spec.ability,
    types: spec.types,
    moves: spec.moves,
    pp: [10, 10, 10, 10],
    hp: spec.hp ?? 100,
    maxHP: spec.maxHP ?? 100,
    status1: spec.status1 ?? 0,
    status2: 0,
    status3: 0,
    statStages: NEUTRAL_STAGES,
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
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    partyIndex: spec.partyIndex ?? 0,
    perishSongTimer: 0,
    isFirstTurn: 2,
  };
}

function partyMember(spec: ActiveSpec | BenchSpec): BattleScriptPartyMemberInput {
  return {
    species: spec.species,
    isEgg: false,
    abilityNum: "abilityNum" in spec ? (spec.abilityNum ?? 0) : 0,
    hp: "hp" in spec ? (spec.hp ?? 100) : 100,
    maxHP: "maxHP" in spec ? (spec.maxHP ?? 100) : 100,
    status1: "status1" in spec ? (spec.status1 ?? 0) : 0,
    moves: spec.moves,
  };
}

function fixture(spec: FixtureSpec): {
  rules: BattleScriptRulesContext;
  request: BattleCommandRequest;
} {
  const emptyBattler = battler(0, {
    species: 0,
    ability: 0,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    moves: [0, 0, 0, 0],
    hp: 0,
    maxHP: 0,
  });
  const rules = createBattleScriptRulesContext({
    battlers: [
      battler(0, spec.player),
      battler(1, spec.trainer),
      emptyBattler,
      { ...emptyBattler, side: 1 },
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
    party: {
      player: [partyMember(spec.player), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      opponent: [
        partyMember(spec.trainer),
        partyMember(spec.bench[0]),
        partyMember(spec.bench[1]),
        EMPTY,
        EMPTY,
        EMPTY,
      ],
    },
    moveHistory: {
      lastMoves: [spec.lastPlayerMove ?? 0, 0, 0, 0],
      lastLandedMoves: [0, spec.lastLandedMove ?? 0, 0, 0],
      lastHitBy: [0xff, spec.lastHitBy ?? 0xff, 0xff, 0xff],
    },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: TRAINER_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
  const legalMoveSlots = spec.legalMoveSlots ?? [0, 1, 2, 3];
  return {
    rules,
    request: createBattleCommandRequest({
      kind: "command",
      requestId: 13,
      side: "trainer",
      battler: 1,
      legalDecisions: [
        ...legalMoveSlots.map((moveSlot) => ({
          kind: "use-move" as const,
          moveSlot,
          targetBattler: 0 as const,
        })),
        { kind: "switch", partyIndex: 1 },
        { kind: "switch", partyIndex: 2 },
      ],
    }),
  };
}

function terminalReducer(): BattleDecisionReducer<FactoryAiLiveRules> {
  return (context) => ({
    rules: context.rules,
    events: [],
    boundary: { kind: "terminal", outcome: "player-win" },
  });
}

function drive(
  staged: ReturnType<typeof fixture>,
  rngValue: number,
  challenge: FactoryAiChallengePolicy,
  history: FactoryAiBattleHistory = createFactoryAiBattleHistory(staged.rules),
) {
  const state: BattleState<FactoryAiLiveRules> = createBattleState({
    rules: { rulesContext: staged.rules },
    rngSeed: rngValue,
    request: staged.request,
  });
  return submitLiveFactoryAiDecision(state, history, challenge, terminalReducer());
}

function commandDraws(result: ReturnType<typeof drive>) {
  return result.phase === "switch"
    ? result.switchPolicy.draws
    : [...result.switchPolicy.draws, ...result.trace.draws];
}

const POLICIES = Object.freeze([
  { name: "ordinary mask 0", challenge: { factoryWinStreak: 0, trainerOpponentId: ORDINARY_TRAINER } },
  { name: "ordinary mask 1", challenge: { factoryWinStreak: 14, trainerOpponentId: ORDINARY_TRAINER } },
  { name: "ordinary mask 7", challenge: { factoryWinStreak: 28, trainerOpponentId: ORDINARY_TRAINER } },
  { name: "Frontier Brain override", challenge: { factoryWinStreak: 0, trainerOpponentId: TRAINER_FRONTIER_BRAIN } },
] as const);

function absorberFixture(legalMoveSlots?: readonly (0 | 1 | 2 | 3)[]) {
  return fixture({
    player: {
      species: 9,
      ability: 67,
      types: ["TYPE_WATER", "TYPE_WATER"],
      moves: [MOVE_WATER_GUN, MOVE_WATER_GUN, MOVE_WATER_GUN, MOVE_WATER_GUN],
    },
    trainer: {
      species: 26,
      ability: 9,
      types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
      moves: [MOVE_SWIFT, MOVE_SWIFT, MOVE_SWIFT, MOVE_SWIFT],
    },
    bench: [
      { species: 134, moves: [MOVE_SWIFT, MOVE_SWIFT, MOVE_SWIFT, MOVE_SWIFT] },
      { species: 132, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] },
    ],
    lastLandedMove: MOVE_WATER_GUN,
    lastHitBy: 0,
    legalMoveSlots,
  });
}

function wonderGuardFixture(
  legalMoveSlots?: readonly (0 | 1 | 2 | 3)[],
) {
  return fixture({
    player: {
      species: 303,
      ability: 25,
      types: ["TYPE_BUG", "TYPE_GHOST"],
      moves: [MOVE_PROTECT, MOVE_PROTECT, MOVE_PROTECT, MOVE_PROTECT],
    },
    trainer: {
      species: 134,
      ability: 11,
      types: ["TYPE_WATER", "TYPE_WATER"],
      moves: [MOVE_SURF, MOVE_ICE_BEAM, MOVE_TOXIC, MOVE_PROTECT],
    },
    bench: [
      {
        species: 4,
        moves: [MOVE_TACKLE, MOVE_GROWL, MOVE_SMOKESCREEN, MOVE_FLAMETHROWER],
      },
      { species: 132, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] },
    ],
    legalMoveSlots,
  });
}

function naturalCureFixture() {
  return fixture({
    player: {
      species: 47,
      ability: 27,
      types: ["TYPE_BUG", "TYPE_GRASS"],
      moves: [147, 147, 147, 147],
    },
    trainer: {
      species: 358,
      ability: 30,
      types: ["TYPE_NORMAL", "TYPE_FLYING"],
      moves: [44, 44, 44, 44],
      status1: BATTLE_SCRIPT_STATUS1_SLEEP,
    },
    bench: [
      { species: 134, moves: [44, 44, 44, 44] },
      { species: 135, moves: [44, 44, 44, 44] },
    ],
    lastLandedMove: 147,
    lastHitBy: 0,
  });
}

describe("R13-D mask/history breadth", () => {
  it("keeps the successful-switch ledger identical at masks 0/1/7 and the Brain override", () => {
    const results = POLICIES.map(({ challenge }) =>
      drive(absorberFixture(), 0xf69f_135c, challenge)
    );
    expect(results.map((result) => ({
      phase: result.phase,
      decision: result.phase === "switch" ? result.submission.decision : null,
      draws: commandDraws(result).map((draw) => ({
        reason: draw.reason,
        randomValue: draw.randomValue,
      })),
      rng: result.phase === "switch" ? result.rng : result.rng,
    }))).toEqual(new Array(POLICIES.length).fill({
      phase: "switch",
      decision: { kind: "switch", partyIndex: 1 },
      draws: [{ reason: "absorber-party-1", randomValue: 52937 }],
      rng: { value: 0xcec9_a69f, calls: 1 },
    }));
  });

  it("keeps a failed prefix identical while legal limitations, equal-score ties, and only the mask suffix vary", () => {
    const results = POLICIES.map(({ challenge }) =>
      drive(absorberFixture([1, 3]), 0xde17_efe2, challenge)
    );
    for (const result of results) {
      expect(result.phase).toBe("move");
      if (result.phase !== "move") throw new Error("expected move");
      expect(result.switchPolicy.draws.map(({ randomValue, reason }) => ({ randomValue, reason })))
        .toEqual([{ randomValue: 50708, reason: "absorber-party-1" }]);
      expect([1, 3]).toContain(result.submission.decision.kind === "use-move"
        ? result.submission.decision.moveSlot
        : -1);
      const legalScores = result.trace.slotScores.filter(({ legal }) => legal);
      expect(legalScores.map(({ moveSlot }) => moveSlot)).toEqual([1, 3]);
      if (result.trace.mask === 0) {
        expect(new Set(legalScores.map(({ finalScore }) => finalScore)).size).toBe(1);
        expect(result.trace.bestMoveSlots).toEqual([1, 3]);
      }
    }
    expect(results.map((result) => result.phase === "move" ? result.trace.mask : null))
      .toEqual([0, 1, 7, 7]);
    expect(results[2]!.phase === "move" && results[3]!.phase === "move"
      ? results[2]!.trace.draws.map(({ reason }) => reason)
      : null)
      .toEqual(results[3]!.phase === "move"
        ? results[3]!.trace.draws.map(({ reason }) => reason)
        : null);
  });

  it("keeps party-major/move-major helper ties mask-independent", () => {
    const staged = fixture({
      player: {
        species: 303,
        ability: 25,
        types: ["TYPE_BUG", "TYPE_GHOST"],
        moves: [MOVE_PROTECT, MOVE_PROTECT, MOVE_PROTECT, MOVE_PROTECT],
      },
      trainer: {
        species: 134,
        ability: 11,
        types: ["TYPE_WATER", "TYPE_WATER"],
        moves: [MOVE_SURF, MOVE_ICE_BEAM, MOVE_TOXIC, MOVE_PROTECT],
      },
      bench: [
        { species: 4, moves: [MOVE_FLAMETHROWER, MOVE_FLAMETHROWER, 0, 0] },
        { species: 4, moves: [MOVE_FLAMETHROWER, MOVE_FLAMETHROWER, 0, 0] },
      ],
    });
    // 4280 % 3 == 2 fails party 1/move 0; 20125 % 3 == 1 selects
    // party 1/move 1 before party 2 is considered.
    const results = POLICIES.map(({ challenge }) => drive(staged, 0x5457_c42e, challenge));
    for (const result of results) {
      expect(result.phase).toBe("switch");
      if (result.phase !== "switch") throw new Error("expected switch");
      expect(result.submission.decision).toEqual({ kind: "switch", partyIndex: 1 });
      expect(result.switchPolicy.draws.map(({ partyIndex, moveSlot, remainder }) =>
        ({ partyIndex, moveSlot, remainder }))).toEqual([
        { partyIndex: 1, moveSlot: 0, remainder: 2 },
        { partyIndex: 1, moveSlot: 1, remainder: 1 },
      ]);
    }
  });

  it("clears move/ability history on a player switch before the helper and subsequent scoring command", () => {
    const beforeRules = absorberFixture().rules;
    let history = syncFactoryAiBattleHistory(
      createFactoryAiBattleHistory(beforeRules),
      beforeRules,
    );
    history = recordFactoryAiKnownAbility(history, 0, "ABILITY_TORRENT");
    history = recordFactoryAiKnownItemEffect(history, 0, 29);

    const switched = absorberFixture();
    const switchedRules = createBattleScriptRulesContext({
      ...switched.rules,
      battlers: [
        { ...switched.rules.battlers[0], partyIndex: 1 },
        switched.rules.battlers[1],
        switched.rules.battlers[2],
        switched.rules.battlers[3],
      ],
      moveHistory: {
        ...switched.rules.moveHistory,
        lastMoves: [MOVE_PROTECT, 0, 0, 0],
      },
    });
    const helper = drive(
      { rules: switchedRules, request: switched.request },
      0xf69f_135c,
      POLICIES[2].challenge,
      history,
    );
    expect(helper.phase).toBe("switch");
    expect(helper.history.usedMoves[0]).toEqual([MOVE_PROTECT]);
    expect(helper.history.knownAbilities[0]).toBeNull();
    expect(helper.history.knownItemEffects[0]).toBe(29);

    const next = absorberFixture([1, 3]);
    const nextRules = createBattleScriptRulesContext({
      ...next.rules,
      battlers: [
        { ...next.rules.battlers[0], partyIndex: 1 },
        next.rules.battlers[1],
        next.rules.battlers[2],
        next.rules.battlers[3],
      ],
      moveHistory: {
        ...next.rules.moveHistory,
        lastMoves: [MOVE_WATER_GUN, 0, 0, 0],
      },
    });
    const scored = drive(
      { rules: nextRules, request: next.request },
      0xde17_efe2,
      POLICIES[2].challenge,
      helper.history,
    );
    expect(scored.phase).toBe("move");
    expect(scored.history.usedMoves[0]).toEqual([MOVE_PROTECT, MOVE_WATER_GUN]);
    expect(scored.view.target.knownAbility).toBeNull();
    expect(scored.view.target.knownItemEffect).toBe(29);
  });
});

describe("R13-D banked OFF receipt equivalence through the live driver", () => {
  it("matches receipt A success (docs/factory-ai-switch-receipts.md)", () => {
    const result = drive(absorberFixture(), 0xf69f_135c, POLICIES[1].challenge);
    expect(result.phase).toBe("switch");
    expect(result.phase === "switch" ? result.submission.decision : null)
      .toEqual({ kind: "switch", partyIndex: 1 });
    expect(commandDraws(result).map(({ randomValue }) => randomValue)).toEqual([52937]);
    expect(result.rng).toEqual({ value: 0xcec9_a69f, calls: 1 });
  });

  it("matches receipt A even control (docs/factory-ai-switch-receipts.md)", () => {
    const result = drive(absorberFixture(), 0xde17_efe2, POLICIES[1].challenge);
    expect(result.phase).toBe("move");
    expect(commandDraws(result).map(({ randomValue }) => randomValue))
      .toEqual([50708, 30881, 3809, 35988, 34960, 30418]);
    expect(result.rng).toEqual({ value: 0x76d2_c6c0, calls: 6 });
  });

  it("matches receipt B success (docs/factory-ai-switch-receipts-bc.md)", () => {
    const result = drive(wonderGuardFixture(), 0xcb7b_c739, POLICIES[1].challenge);
    expect(result.phase).toBe("switch");
    expect(result.phase === "switch" ? result.submission.decision : null)
      .toEqual({ kind: "switch", partyIndex: 1 });
    expect(commandDraws(result).map(({ randomValue }) => randomValue)).toEqual([59773]);
    expect(result.rng).toEqual({ value: 0xe97d_91b8, calls: 1 });
  });

  it("bounds receipt B result-2 control at the existing Toxic scoring barrier (docs/factory-ai-switch-receipts-bc.md)", () => {
    const staged = wonderGuardFixture();
    const precheck = evaluateFactoryAiSwitchPolicy({
      rules: staged.rules,
      rng: { value: 0x5457_c42e, calls: 0 },
    });
    expect(precheck.choice).toEqual({ kind: "no-switch" });
    expect(precheck.draws.map(({ reason, randomValue, remainder }) =>
      ({ reason, randomValue, remainder }))).toEqual([{
      reason: "wonder-guard-party-1-move-3",
      randomValue: 4280,
      remainder: 2,
    }]);
    expect(precheck.rng).toEqual({ value: 0x10b8_ec09, calls: 1 });
    expect(() => drive(staged, 0x5457_c42e, POLICIES[2].challenge))
      .toThrow("Factory AI check-bad-move barrier: slot 2 move 92 effect EFFECT_TOXIC");
  });

  it("matches receipt C Natural Cure success (docs/factory-ai-switch-receipts-c.md)", () => {
    const result = drive(naturalCureFixture(), 0xf69f_135c, POLICIES[1].challenge);
    expect(result.phase).toBe("switch");
    expect(result.phase === "switch" ? result.submission.decision : null)
      .toEqual({ kind: "switch", partyIndex: 1 });
    expect(commandDraws(result).map(({ randomValue }) => randomValue)).toEqual([52937]);
    expect(result.rng).toEqual({ value: 0xcec9_a69f, calls: 1 });
  });

  it("matches receipt C even/final-odd control (docs/factory-ai-switch-receipts-c.md)", () => {
    const result = drive(naturalCureFixture(), 0xde17_efe2, POLICIES[1].challenge);
    expect(result.phase).toBe("switch");
    expect(result.phase === "switch" ? result.submission.decision : null)
      .toEqual({ kind: "switch", partyIndex: 1 });
    expect(commandDraws(result).map(({ randomValue }) => randomValue)).toEqual([50708, 30881]);
    expect(result.rng).toEqual({ value: 0x78a1_d31c, calls: 2 });
  });
});
